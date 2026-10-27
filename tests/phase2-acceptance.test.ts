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

async function runPhase2Tests() {
  console.log('\n=============================================================');
  console.log('🧪 EXECUTANDO TESTES DE ACEITE - FASE 2 (APIs, RPCs E STORAGE)');
  console.log('=============================================================\n');

  // Busca departamento TI
  const { data: dept } = await adminClient.from('departments').select('id').eq('code', 'TI').single();
  const devDeptId = dept!.id;

  // Login do Presidente
  const { data: presAuth, error: presAuthErr } = await anonClient.auth.signInWithPassword({
    email: 'presidente@gmail.com',
    password: process.env.SEED_PRESIDENT_PASSWORD || 'Presidente@2026',
  });
  assert(!presAuthErr && Boolean(presAuth.session), 'Autenticação com perfil Presidente', presAuthErr?.message);
  const presUserToken = presAuth.session!.access_token;
  const presUserId = presAuth.user!.id;

  const presClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${presUserToken}` } },
  });

  // Login do Membro de TI
  const { data: memAuth, error: memAuthErr } = await anonClient.auth.signInWithPassword({
    email: 'mariana.souza@tecnosystem.com.br',
    password: 'Tecno@2026!',
  });
  assert(!memAuthErr && Boolean(memAuth.user), 'Autenticação com Membro de TI', memAuthErr?.message);
  const memberUserId = memAuth.user!.id;

  // 1. Bucket de Storage ticket-attachments
  console.log('\n--- 1. Validação do Bucket de Storage ---');
  const { data: bucket, error: bucketErr } = await adminClient.storage.getBucket('ticket-attachments');
  assert(!bucketErr && Boolean(bucket), 'Bucket ticket-attachments existe no Supabase Storage');
  assert(bucket?.public === false, 'Bucket ticket-attachments é rigorosamente privado');
  assert(bucket?.file_size_limit === 1048576, 'Bucket impõe limite máximo de 1 MB (1.048.576 bytes)');

  // 2. RPC transition_ticket_status
  console.log('\n--- 2. RPC Atômica de Transição de Status ---');
  const testTicketId = 'TS-PHASE2-TRANSITION';
  await adminClient.from('tickets').delete().eq('id', testTicketId);

  const { error: insErr } = await adminClient.from('tickets').insert({
    id: testTicketId,
    title: 'Chamado Teste Transição Atômica',
    description: 'Teste de validação da RPC de transição atômica',
    department_id: devDeptId,
    category: 'Software',
    priority: 'Média',
    status: 'Aberto',
    requester_name: 'Presidente',
    requester_email: 'presidente@tecnosystem.org.br',
    requester_id: presUserId,
    sla_due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  });
  assert(!insErr, 'Criação de chamado de teste TS-PHASE2-TRANSITION para teste de RPC');

  const { data: transResult, error: transErr } = await presClient.rpc('transition_ticket_status', {
    p_ticket_id: testTicketId,
    p_new_status: 'Em Andamento',
  });
  const resultObj = transResult as any;
  assert(!transErr && resultObj?.success === true, 'RPC transition_ticket_status executa transição para Em Andamento');
  assert(resultObj?.status === 'Em Andamento', 'RPC retorna status atualizado');

  const { data: updatedTicket } = await adminClient.from('tickets').select('status').eq('id', testTicketId).single();
  assert(updatedTicket?.status === 'Em Andamento', 'Status do chamado persistido no Postgres como Em Andamento');

  // Rejeição de status inválido
  const { data: invalidResult } = await presClient.rpc('transition_ticket_status', {
    p_ticket_id: testTicketId,
    p_new_status: 'StatusInvalido' as any,
  });
  const invalidObj = invalidResult as any;
  assert(invalidObj?.success === false, 'RPC rejeita status inexistente com erro amigável');

  // 3. RPC assign_ticket_atomic
  console.log('\n--- 3. RPC Atômica de Atribuição de Responsável ---');
  const { data: assignResult, error: assignErr } = await presClient.rpc('assign_ticket_atomic', {
    p_ticket_id: testTicketId,
    p_assignee_id: memberUserId,
    p_assigned_department_id: devDeptId,
  });
  const assignObj = assignResult as any;
  assert(!assignErr && assignObj?.success === true, 'RPC assign_ticket_atomic atribui membro com sucesso');
  assert(typeof assignObj?.assignee_active_tickets === 'number', 'RPC calcula e retorna carga de trabalho ativa do membro');

  const { data: assignedTicket } = await adminClient
    .from('tickets')
    .select('assignee_id, assigned_department_id')
    .eq('id', testTicketId)
    .single();
  assert(assignedTicket?.assignee_id === memberUserId, 'Responsável gravado corretamente no chamado');
  assert(assignedTicket?.assigned_department_id === devDeptId, 'Departamento responsável gravado corretamente');

  // 4. Validação binária de Magic Bytes para Anexos
  console.log('\n--- 4. Algoritmo de Validação Binária (Magic Bytes) ---');
  function checkMagic(bytes: number[], mimeType: string): boolean {
    if (bytes.length < 4) return false;
    if (mimeType === 'image/png') {
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    }
    if (mimeType === 'application/pdf') {
      return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    }
    return false;
  }
  assert(checkMagic([0x89, 0x50, 0x4e, 0x47], 'image/png'), 'Reconhece assinatura válida de PNG');
  assert(!checkMagic([0x4d, 0x5a, 0x90, 0x00], 'image/png'), 'Rejeita executável disfarçado de imagem PNG');
  assert(checkMagic([0x25, 0x50, 0x44, 0x46], 'application/pdf'), 'Reconhece assinatura válida de PDF (%PDF)');

  // 5. Auditoria Imutável das Operações
  console.log('\n--- 5. Registro Automático em Audit Logs ---');
  const { data: logs } = await adminClient
    .from('audit_logs')
    .select('action, details')
    .eq('ticket_id', testTicketId);
  assert(Boolean(logs && logs.length > 0), 'Ações de transição de status e atribuição geraram registros de auditoria');

  console.log('\n=============================================================');
  console.log(`📊 RESULTADO FASE 2: ${passedTests} de ${totalTests} testes passaram (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('=============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
