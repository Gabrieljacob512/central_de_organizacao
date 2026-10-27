import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const MAX_FILE_SIZE = 1048576; // 1 MB

function validateMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (bytes.length < 4) return false;

  // PNG: 89 50 4E 47
  if (mimeType === 'image/png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  }

  // JPEG: FF D8 FF
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  }

  // PDF: 25 50 44 46 (%PDF)
  if (mimeType === 'application/pdf') {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }

  // DOCX / XLSX / ZIP: 50 4B 03 04 (PK..)
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/zip'
  ) {
    return bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;
  }

  // Plain Text: printable ASCII or UTF-8
  if (mimeType === 'text/plain') {
    for (let i = 0; i < Math.min(bytes.length, 512); i++) {
      if (bytes[i] === 0) return false; // NUL byte usually indicates binary
    }
    return true;
  }

  return false;
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token de autorização não fornecido.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente com credenciais do chamador
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processa multipart/form-data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const ticketId = formData.get('ticket_id') as string | null;
    const commentId = formData.get('comment_id') as string | null;
    const description = (formData.get('description') as string | null) || '';

    if (!file || !ticketId) {
      return new Response(JSON.stringify({ error: 'Arquivo e ID do chamado são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `O arquivo excede o limite máximo de 1 MB (${(file.size / 1024 / 1024).toFixed(2)} MB fornecido).` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(fileBuffer);

    // Validação de magic bytes
    if (!validateMagicBytes(bytes, file.type)) {
      return new Response(
        JSON.stringify({ error: `Tipo de arquivo inválido ou conteúdo inconsistente com o cabeçalho (${file.type}).` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanName = sanitizeFileName(file.name);
    const storagePath = `${ticketId}/${crypto.randomUUID()}-${cleanName}`;

    // Admin client para gravar no storage e registrar
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { error: uploadError } = await adminClient.storage
      .from('ticket-attachments')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Falha no upload do arquivo: ' + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registra na tabela attachments
    const { data: attachmentRecord, error: dbError } = await adminClient
      .from('attachments')
      .insert({
        ticket_id: ticketId,
        comment_id: commentId || null,
        uploaded_by: user.id,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        description: description.substring(0, 200),
        storage_path: storagePath,
      })
      .select('*')
      .single();

    if (dbError) {
      // Rollback do arquivo no bucket
      await adminClient.storage.from('ticket-attachments').remove([storagePath]);
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar anexo no banco: ' + dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gera URL assinada com expiração de 1 hora
    const { data: signedData } = await adminClient.storage
      .from('ticket-attachments')
      .createSignedUrl(storagePath, 3600);

    // Registra na auditoria
    const { data: actorProfile } = await adminClient
      .from('profiles')
      .select('name, email')
      .where('id', 'eq', user.id)
      .maybeSingle();

    const actorName = actorProfile ? `${actorProfile.name} (${actorProfile.email})` : user.email;

    await adminClient.from('audit_logs').insert({
      ticket_id: ticketId,
      action: 'ticket.attachment_added',
      performed_by: actorName,
      actor_id: user.id,
      details: `Anexo adicionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB) - ${description || 'Sem descrição'}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        attachment: attachmentRecord,
        signed_url: signedData?.signedUrl ?? null,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erro interno no servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
