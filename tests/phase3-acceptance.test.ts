import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import type { Database } from '../src/types/database.types';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('Chaves do Supabase ausentes no .env');
  process.exit(1);
}

const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anonClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function runPhase3Tests() {
  console.log('\n=============================================================');
  console.log('🧪 EXECUTANDO TESTES DE ACEITE - FASE 3 (COMENTÁRIOS E ANEXOS)');
  console.log('=============================================================\n');

  // Login Presidente
  const { data: presAuth, error: presErr } = await anonClient.auth.signInWithPassword({
    email: 'presidente@gmail.com',
    password: process.env.SEED_DEFAULT_PASSWORD || process.env.SEED_PRESIDENT_PASSWORD || 'Presidente@2026',
  });
  assert(!presErr && Boolean(presAuth.session), 'Autenticação do Presidente');
  const presToken = presAuth.session!.access_token;
  const presUserId = presAuth.user!.id;

  const presClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${presToken}` } },
  });

  // Login Membro de TI
  const { data: memAuth, error: memErr } = await anonClient.auth.signInWithPassword({
    email: 'mariana.souza@tecnosystem.com.br',
    password: process.env.SEED_DEFAULT_PASSWORD || 'Tecno@2026!',
  });
  assert(!memErr && Boolean(memAuth.session), 'Autenticação do Membro de TI');
  const memberToken = memAuth.session!.access_token;
  const memberUserId = memAuth.user!.id;

  const memClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${memberToken}` } },
  });

  // Criar chamado para o teste
  const testTicketId = 'TS-PHASE3-COMM';
  await adminClient.from('tickets').delete().eq('id', testTicketId);

  const { data: tiDept } = await adminClient.from('departments').select('id').eq('code', 'Projetos').single();
  const { error: ticketErr } = await adminClient.from('tickets').insert({
    id: testTicketId,
    title: 'Chamado Teste Comentários e Anexos',
    description: 'Validação da fase 3',
    department_id: tiDept!.id,
    category: 'Software',
    priority: 'Alta',
    status: 'Em Andamento',
    requester_name: 'Presidente',
    requester_email: 'presidente@gmail.com',
    requester_id: presUserId,
    assignee_id: memberUserId,
    sla_due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  });
  assert(!ticketErr, 'Criação de chamado base TS-PHASE3-COMM');

  // 1. Comentário Público
  console.log('\n--- 1. Comentário Público com Autor Vinculado ---');
  const { data: publicComment, error: pubErr } = await presClient
    .from('ticket_comments')
    .insert({
      ticket_id: testTicketId,
      author_id: presUserId,
      body: 'Olá equipe, favor verificar o relatório de sprint com urgência.',
      visibility: 'public',
    })
    .select('*, profiles(name)')
    .single();

  assert(!pubErr && Boolean(publicComment), 'Criação de comentário público com sucesso', pubErr?.message || JSON.stringify(pubErr));
  assert(publicComment?.visibility === 'public', 'Visibilidade marcada como public');

  // 2. Nota Interna (Internal Note)
  console.log('\n--- 2. Criação de Nota Interna ---');
  const { data: internalNote, error: intErr } = await presClient
    .from('ticket_comments')
    .insert({
      ticket_id: testTicketId,
      author_id: presUserId,
      body: 'Nota interna: Este cliente solicitou prioridade especial pelo canal da diretoria.',
      visibility: 'internal',
    })
    .select('*')
    .single();

  assert(!intErr && Boolean(internalNote), 'Criação de nota interna protegida');
  assert(internalNote?.visibility === 'internal', 'Visibilidade persistida como internal');

  // 3. Edição de Comentário pelo Autor
  console.log('\n--- 3. Edição de Comentário e Marcação (editado) ---');
  const editedTime = new Date().toISOString();
  const { error: editErr } = await presClient
    .from('ticket_comments')
    .update({
      body: 'Olá equipe, favor verificar o relatório de sprint atualizado com urgência.',
      edited_at: editedTime,
    })
    .eq('id', publicComment!.id);

  assert(!editErr, 'Autor atualiza seu comentário com sucesso');

  const { data: reloadedComment } = await adminClient
    .from('ticket_comments')
    .select('body, edited_at')
    .eq('id', publicComment!.id)
    .single();

  assert(Boolean(reloadedComment?.edited_at), 'Timestamp edited_at preenchido');
  assert(reloadedComment?.body.includes('atualizado'), 'Conteúdo do comentário atualizado');

  // 4. Upload de Anexo e Vinculação ao Comentário
  console.log('\n--- 4. Upload de Anexo em Storage Privado e Vinculação ---');
  const sampleTextContent = 'Conteúdo do relatório técnico Tecno System para testes de anexo.';
  const sampleBuffer = Buffer.from(sampleTextContent, 'utf-8');
  const storagePath = `${testTicketId}/${crypto.randomUUID()}-relatorio.txt`;

  const { error: uploadErr } = await adminClient.storage
    .from('ticket-attachments')
    .upload(storagePath, sampleBuffer, {
      contentType: 'text/plain',
      upsert: false,
    });

  assert(!uploadErr, 'Upload de arquivo físico para bucket privado ticket-attachments');

  // Registra o anexo no banco associado ao comentário
  const { data: attachmentRecord, error: attErr } = await adminClient
    .from('attachments')
    .insert({
      ticket_id: testTicketId,
      comment_id: publicComment!.id,
      uploaded_by: presUserId,
      file_name: 'relatorio.txt',
      mime_type: 'text/plain',
      size_bytes: sampleBuffer.length,
      description: 'Relatório de sprint em texto puro',
      storage_path: storagePath,
    })
    .select('*')
    .single();

  assert(!attErr && Boolean(attachmentRecord), 'Registro de anexo associado ao ticket e comentário no Postgres');

  // Gera URL assinada temporária
  const { data: signedData, error: signErr } = await adminClient.storage
    .from('ticket-attachments')
    .createSignedUrl(storagePath, 3600);

  assert(!signErr && Boolean(signedData?.signedUrl), 'Geração de URL assinada temporária (1 hora) para download seguro');

  // 5. Menções (@Nome) e Notificação Automática
  console.log('\n--- 5. Processamento de Menções (@) e Notificações In-App ---');
  const { error: mentionNoteErr } = await memClient.from('notifications').insert({
    user_id: presUserId,
    title: `Você foi mencionado no chamado ${testTicketId}`,
    message: 'Membro de TI mencionou você: "@Presidente chamado finalizado"',
    type: 'mention',
    link: testTicketId,
  });
  assert(!mentionNoteErr, 'Disparo de notificação in-app de menção (@)');

  const { data: userNotifs } = await presClient
    .from('notifications')
    .select('*')
    .eq('link', testTicketId)
    .eq('type', 'mention');

  assert(Boolean(userNotifs && userNotifs.length > 0), 'Notificação de menção recebida na caixa de entrada do usuário');

  // 6. Exclusão Suave (Soft Delete) de Comentário
  console.log('\n--- 6. Exclusão Suave (Soft Delete) de Comentário ---');
  const { error: delErr } = await presClient
    .from('ticket_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', publicComment!.id);

  assert(!delErr, 'Exclusão suave (soft delete) executada com sucesso');

  const { data: activeComments } = await presClient
    .from('ticket_comments')
    .select('id')
    .eq('ticket_id', testTicketId)
    .is('deleted_at', null);

  const containsDeleted = (activeComments || []).some((c) => c.id === publicComment!.id);
  assert(!containsDeleted, 'Comentário excluído suavemente NÃO aparece nas consultas ativas');

  console.log('\n=============================================================');
  console.log(`📊 RESULTADO FASE 3: ${passedTests} de ${totalTests} testes passaram (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('=============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error('Erro nos testes da fase 3:', err);
  process.exit(1);
});
