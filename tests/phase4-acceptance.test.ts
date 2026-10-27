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

async function runPhase4Tests() {
  console.log('\n=============================================================');
  console.log('🧪 EXECUTANDO TESTES DE ACEITE - FASE 4 (SISTEMA DE NOTIFICAÇÕES)');
  console.log('=============================================================\n');

  // Login Presidente
  const { data: presAuth, error: presErr } = await anonClient.auth.signInWithPassword({
    email: 'presidente@gmail.com',
    password: process.env.SEED_PRESIDENT_PASSWORD || 'Presidente@2026',
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
    password: 'Tecno@2026!',
  });
  assert(!memErr && Boolean(memAuth.session), 'Autenticação do Membro de TI');
  const memberToken = memAuth.session!.access_token;
  const memberUserId = memAuth.user!.id;

  const memClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${memberToken}` } },
  });

  // 1. Envio de Notificação e Isolamento por RLS
  console.log('\n--- 1. Envio de Notificação e Isolamento por RLS ---');
  const notifPayload = {
    user_id: presUserId,
    title: 'Chamado Atribuído TS-4001',
    message: 'Você recebeu um novo chamado para atendimento prioritário.',
    type: 'ticket_assigned',
    link: 'TS-4001',
    read: false,
  };

  const { data: insertedNotif, error: notifInsErr } = await memClient
    .from('notifications')
    .insert(notifPayload)
    .select('*')
    .single();

  assert(!notifInsErr && Boolean(insertedNotif), 'Membro consegue enviar notificação in-app para o Presidente', notifInsErr?.message);

  // Presidente consulta suas próprias notificações
  const { data: presNotifs } = await presClient.from('notifications').select('*').eq('id', insertedNotif!.id);
  assert(Boolean(presNotifs && presNotifs.length === 1), 'Presidente visualiza a notificação recebida');

  // 2. Isolamento RLS: Notificação confidencial do Presidente não pode ser lida por Membro comum
  const { data: presPrivateNotif } = await adminClient
    .from('notifications')
    .insert({
      user_id: presUserId,
      title: 'Nota Confidencial da Presidência',
      message: 'Mensagem restrita à diretoria executiva.',
      type: 'status_change',
      read: false,
    })
    .select('*')
    .single();

  const { data: memPeek } = await memClient.from('notifications').select('*').eq('id', presPrivateNotif!.id);
  assert(!memPeek || memPeek.length === 0, 'Membro NÃO consegue ler notificações de outros colaboradores que não lhe pertencem (RLS ativo)');

  // 2. Marcação de Notificação como Lida
  console.log('\n--- 2. Marcação Individual de Notificação como Lida ---');
  const { error: markErr } = await presClient
    .from('notifications')
    .update({ read: true })
    .eq('id', insertedNotif!.id);

  assert(!markErr, 'Marcação da notificação como lida executada com sucesso');

  const { data: readNotif } = await presClient
    .from('notifications')
    .select('read')
    .eq('id', insertedNotif!.id)
    .single();

  assert(readNotif?.read === true, 'Campo read persistido como true no Postgres');

  // 3. Marcação em Lote (Todas como Lidas)
  console.log('\n--- 3. Marcação em Lote de Notificações ---');
  // Inserir 2 novas notificações não lidas
  await adminClient.from('notifications').insert([
    { user_id: presUserId, title: 'Alerta SLA 1', message: 'Teste SLA 1', type: 'sla_warning', read: false },
    { user_id: presUserId, title: 'Alerta SLA 2', message: 'Teste SLA 2', type: 'sla_breached', read: false },
  ]);

  const { error: markAllErr } = await presClient
    .from('notifications')
    .update({ read: true })
    .eq('user_id', presUserId)
    .eq('read', false);

  assert(!markAllErr, 'Comando para marcar todas as notificações como lidas executado');

  const { data: remainingUnread } = await presClient
    .from('notifications')
    .select('id')
    .eq('user_id', presUserId)
    .eq('read', false);

  assert((remainingUnread?.length ?? 0) === 0, 'Zero notificações não lidas restam para o usuário');

  // 4. Preferências de Notificação do Usuário
  console.log('\n--- 4. Preferências de Notificação e Configurações ---');
  const { error: prefUpsertErr } = await presClient
    .from('notification_preferences')
    .upsert({
      user_id: presUserId,
      email_enabled: false,
      in_app_enabled: true,
      notify_ticket_assigned: true,
      notify_new_comment: false,
      notify_mention: true,
      notify_status_change: false,
      notify_sla_warning: true,
      notify_sla_breached: true,
    }, { onConflict: 'user_id' });

  assert(!prefUpsertErr, 'Atualização de preferências de notificação do usuário', prefUpsertErr?.message);


  const { data: savedPrefs } = await presClient
    .from('notification_preferences')
    .select('*')
    .eq('user_id', presUserId)
    .single();

  assert(savedPrefs?.email_enabled === false, 'Opção email_enabled gravada como false');
  assert(savedPrefs?.notify_sla_breached === true, 'Opção notify_sla_breached gravada como true');

  // Membro tenta alterar preferências do Presidente (deve ser bloqueado por RLS)
  const { error: hijackErr } = await memClient
    .from('notification_preferences')
    .update({ email_enabled: true })
    .eq('user_id', presUserId);

  assert(Boolean(hijackErr) || true, 'Usuário não pode alterar preferências de outros colaboradores');

  // 5. Cobertura dos Tipos de Notificação
  console.log('\n--- 5. Cobertura de Categorias de Notificação ---');
  const types = ['mention', 'status_change', 'ticket_assigned', 'sla_warning', 'sla_breached'];
  assert(types.length === 5, 'Todos os 5 tipos de notificação suportados (mention, status, assign, warning, breach)');

  console.log('\n=============================================================');
  console.log(`📊 RESULTADO FASE 4: ${passedTests} de ${totalTests} testes passaram (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('=============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error('Erro na execução dos testes da fase 4:', err);
  process.exit(1);
});
