import { supabase } from './supabase';
import type { Database } from '../types/database.types';

export type AttachmentRecord = Database['public']['Tables']['attachments']['Row'] & {
  signedUrl?: string;
};

const MAX_FILE_SIZE = 1048576; // 1 MB
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export async function uploadAttachment(params: {
  file: File;
  ticketId: string;
  commentId?: string | null;
  description?: string;
}): Promise<{ success: boolean; attachment?: AttachmentRecord; error?: string }> {
  const { file, ticketId, commentId, description = '' } = params;

  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `O arquivo "${file.name}" excede o tamanho limite de 1 MB (${(file.size / 1024 / 1024).toFixed(2)} MB).`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `Formato de arquivo não suportado (${file.type}). Tipos aceitos: Imagens (PNG, JPG), PDF, TXT, Word e Excel.`,
    };
  }

  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  // Sanitiza nome do arquivo
  const sanitizedName = file.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');

  const uniqueId = crypto.randomUUID();
  const storagePath = `${ticketId}/${uniqueId}-${sanitizedName}`;

  // Upload para o bucket privado
  const { error: uploadError } = await supabase.storage
    .from('ticket-attachments')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: `Falha no upload: ${uploadError.message}` };
  }

  // Registrar na tabela attachments
  const { data: record, error: insertError } = await supabase
    .from('attachments')
    .insert({
      ticket_id: ticketId,
      comment_id: commentId || null,
      uploaded_by: userId,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      description: description.substring(0, 200),
      storage_path: storagePath,
    })
    .select('*')
    .single();

  if (insertError || !record) {
    // Rollback no storage
    await supabase.storage.from('ticket-attachments').remove([storagePath]);
    return { success: false, error: `Falha ao registrar anexo: ${insertError?.message}` };
  }

  // Gera URL assinada com expiração de 1 hora para visualização/download
  const { data: signedData } = await supabase.storage
    .from('ticket-attachments')
    .createSignedUrl(storagePath, 3600);

  return {
    success: true,
    attachment: {
      ...record,
      signedUrl: signedData?.signedUrl,
    },
  };
}

export async function fetchTicketAttachments(ticketId: string): Promise<AttachmentRecord[]> {
  const { data: records, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });

  if (error || !records) {
    console.error('[attachmentService] Erro ao buscar anexos:', error);
    return [];
  }

  // Gerar URLs assinadas em lote
  const results: AttachmentRecord[] = [];
  for (const item of records) {
    const { data: signed } = await supabase.storage
      .from('ticket-attachments')
      .createSignedUrl(item.storage_path, 3600);

    results.push({
      ...item,
      signedUrl: signed?.signedUrl,
    });
  }

  return results;
}

export async function deleteAttachment(attachmentId: string, storagePath: string): Promise<{ success: boolean; error?: string }> {
  // 1. Remove da tabela
  const { error: dbError } = await supabase.from('attachments').delete().eq('id', attachmentId);
  if (dbError) {
    return { success: false, error: dbError.message };
  }

  // 2. Remove do storage
  const { error: storageError } = await supabase.storage.from('ticket-attachments').remove([storagePath]);
  if (storageError) {
    console.warn('[attachmentService] Aviso ao remover arquivo físico do storage:', storageError);
  }

  return { success: true };
}
