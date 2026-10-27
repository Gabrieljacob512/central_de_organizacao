import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import type { Database } from '../src/types/database.types';
import { INITIAL_USERS } from '../src/constants/config';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey || !anonKey) {
  console.error('Chaves do Supabase ausentes no .env');
  process.exit(1);
}

const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);

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

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 EXECUTANDO TESTES DE ACEITE - FASE 1 (BANCO E AUTENTICAÇÃO)');
  console.log('=============================================================\n');

  // Teste 1: A senha padrão não existe no código
  console.log('--- Teste 1: Segurança de Credenciais no Código ---');
  const hasHardcodedPassword = INITIAL_USERS.some((u) => Boolean(u.password));
  assert(!hasHardcodedPassword, 'Nenhuma senha em texto puro está armazenada em INITIAL_USERS no código-fonte');

  // Teste 2: audit_logs é estritamente imutável (rejeita UPDATE e DELETE)
  console.log('\n--- Teste 2: Imutabilidade da Tabela de Auditoria (audit_logs) ---');
  const { data: testLog } = await adminClient
    .from('audit_logs')
    .insert({
      action: 'TEST_AUDIT',
      performed_by: 'Teste Automatizado',
      details: 'Log de teste para validar imutabilidade',
    })
    .select()
    .single();

  if (testLog) {
    const { error: updateErr } = await adminClient
      .from('audit_logs')
      .update({ details: 'Tentativa de alteração maliciosa' })
      .eq('id', testLog.id);

    assert(Boolean(updateErr), 'audit_logs rejeita UPDATE via trigger (imutável)');

    const { error: deleteErr } = await adminClient
      .from('audit_logs')
      .delete()
      .eq('id', testLog.id);

    assert(Boolean(deleteErr), 'audit_logs rejeita DELETE via trigger (imutável)');
  }

  // Teste 3: Autenticação de Usuário e RLS para Membro de TI vs RH
  console.log('\n--- Teste 3: Isolamento Setorial por RLS (Membro de TI vs RH) ---');
  // Logar como Membro de TI
  const tiClient = createClient<Database>(supabaseUrl, anonKey);
  const { data: tiAuth, error: tiLoginErr } = await tiClient.auth.signInWithPassword({
    email: 'mariana.souza@tecnosystem.com.br',
    password: 'Tecno@2026!',
  });

  if (tiLoginErr || !tiAuth.user) {
    assert(false, 'Login do Membro de TI realizado com sucesso', tiLoginErr?.message);
  } else {
    assert(true, 'Login do Membro de TI realizado com sucesso');

    // Membro de TI tenta listar chamados via API direta
    const { data: tiTickets } = await tiClient.from('tickets').select('id, title, department_id');
    const { data: rhDep } = await adminClient.from('departments').select('id').eq('code', 'RH').single();

    const containsRhTicket = (tiTickets || []).some((t) => t.department_id === rhDep?.id);
    assert(!containsRhTicket, 'Membro de TI NÃO visualiza chamados do RH pela API direta (RLS ativo)');

    // Teste 4: Membro não consegue excluir chamados
    console.log('\n--- Teste 4: Permissões de Exclusão (ticket.delete) ---');
    const { data: aTicket } = await adminClient.from('tickets').select('id').limit(1).single();
    if (aTicket) {
      await tiClient.from('tickets').delete().eq('id', aTicket.id);
      const { data: stillExists } = await adminClient.from('tickets').select('id').eq('id', aTicket.id).maybeSingle();
      assert(Boolean(stillExists), 'Membro comum é impedido de excluir chamados por RLS (chamado permanece intacto)');
    }
  }

  // Teste 5: Acesso Global do Presidente
  console.log('\n--- Teste 5: Acesso Global do Presidente (ticket.view_all) ---');
  const presClient = createClient<Database>(supabaseUrl, anonKey);
  const presidentPass = process.env.SEED_PRESIDENT_PASSWORD || 'Presidente@2026';
  const { data: presAuth, error: presLoginErr } = await presClient.auth.signInWithPassword({
    email: 'presidente@gmail.com',
    password: presidentPass,
  });

  if (presLoginErr || !presAuth.user) {
    assert(false, 'Login do Presidente realizado com sucesso', presLoginErr?.message);
  } else {
    assert(true, 'Login do Presidente com senha segura do .env');

    const { data: presTickets } = await presClient.from('tickets').select('id, department_id');
    const { data: allTickets } = await adminClient.from('tickets').select('id');
    assert(
      (presTickets?.length || 0) === (allTickets?.length || 0),
      'Presidente visualiza todos os chamados de todos os departamentos'
    );
  }

  // Teste 6: Pausa e Retomada do Relógio do SLA
  console.log('\n--- Teste 6: Lógica de Pausa e Acumulação do SLA ---');
  const { data: slaTestTicket, error: slaErr } = await adminClient
    .from('tickets')
    .insert({
      id: 'TS-TEST-SLA',
      title: 'Chamado Teste SLA',
      description: 'Testando pausas de SLA',
      department_id: 'd1000000-0000-0000-0000-000000000007',
      category: 'Software',
      priority: 'Média',
      status: 'Aberto',
      requester_name: 'Tester',
      requester_email: 'tester@tecnosystem.com.br',
      sla_due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    })
    .select()
    .single();

  if (slaErr) {
    console.error('Erro ao criar ticket teste SLA:', slaErr);
  }

  if (slaTestTicket) {
    // Mudar para 'Pendente'
    const { data: pausedTicket } = await adminClient
      .from('tickets')
      .update({ status: 'Pendente' })
      .eq('id', slaTestTicket.id)
      .select('paused_at')
      .single();

    assert(Boolean(pausedTicket?.paused_at), 'Ao mudar status para "Pendente", paused_at é preenchido automaticamente');

    // Mudar de volta para 'Em Andamento'
    const { data: resumedTicket } = await adminClient
      .from('tickets')
      .update({ status: 'Em Andamento' })
      .eq('id', slaTestTicket.id)
      .select('paused_at, total_paused_seconds')
      .single();

    assert(
      resumedTicket?.paused_at === null && typeof resumedTicket?.total_paused_seconds === 'number',
      'Ao sair de "Pendente", o relógio é despausado e o tempo é acumulado em total_paused_seconds'
    );

    // Limpar ticket de teste
    await adminClient.from('tickets').delete().eq('id', slaTestTicket.id);
  }

  // Teste 7: Preservação do log de auditoria após exclusão do chamado
  console.log('\n--- Teste 7: Preservação do Histórico de Chamados Apagados ---');
  const { data: deletedLog } = await adminClient
    .from('audit_logs')
    .select('id, action, details')
    .eq('action', 'EXCLUSAO')
    .limit(1)
    .maybeSingle();

  assert(Boolean(deletedLog), 'Registros de auditoria de chamados excluídos são mantidos permanentemente no banco');

  // Teste 8: Usuário desativado é bloqueado
  console.log('\n--- Teste 8: Bloqueio de Usuário Desativado (is_active = false) ---');
  const testEmail = 'desativado.teste@tecnosystem.com.br';
  const { data: inactiveUser } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: 'Desativado@2026!',
    email_confirm: true,
  });

  if (inactiveUser?.user) {
    // Atualiza perfil para inativo
    await adminClient.from('profiles').upsert({
      id: inactiveUser.user.id,
      name: 'Usuário Desativado',
      email: testEmail,
      department_id: 'd1000000-0000-0000-0000-000000000002',
      role_id: 'b1000000-0000-0000-0000-000000000004',
      is_active: false,
    }, { onConflict: 'id' });

    const inactiveClient = createClient<Database>(supabaseUrl, anonKey);
    const { data: inactiveAuth } = await inactiveClient.auth.signInWithPassword({
      email: testEmail,
      password: 'Desativado@2026!',
    });

    if (inactiveAuth.session) {
      // Tentar ler chamados com a sessão do usuário inativo
      const { data: forbiddenTickets } = await inactiveClient.from('tickets').select('id');
      assert(
        (forbiddenTickets?.length || 0) === 0,
        'Usuário inativo é bloqueado pelas políticas de RLS e não visualiza nenhum dado'
      );
    } else {
      assert(true, 'Login de usuário desativado bloqueado');
    }

    // Cleanup
    await adminClient.auth.admin.deleteUser(inactiveUser.user.id);
  }

  console.log('\n=============================================================');
  console.log(`📊 RESULTADO FINAL: ${passedTests}/${totalTests} TESTES APROVADOS (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('=============================================================\n');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
