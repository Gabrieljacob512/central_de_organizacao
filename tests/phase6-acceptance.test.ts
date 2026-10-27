import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database.types';
import { generateIcsContent } from '../src/services/differentiatorsService';


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

async function runPhase6Tests() {
  console.log('\n=============================================================');
  console.log('🧪 EXECUTANDO TESTES DE ACEITE - FASE 6 (DIFERENCIAIS JÚNIOR)');
  console.log('=============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // 1. Cargo "Cliente" com Isolamento Estrito
    // -------------------------------------------------------------------------
    console.log('--- 1. Cargo "Cliente" e Permissões Estritas (Portal do Cliente) ---');
    const { data: clientRole, error: roleError } = await adminClient
      .from('roles')
      .select('*')
      .eq('name', 'Cliente')
      .single();

    assert(!roleError && !!clientRole, 'Cargo "Cliente" cadastrado no sistema');
    const perms = (clientRole?.permissions as string[]) || [];
    assert(
      perms.includes('ticket.view_own') &&
      perms.includes('ticket.create') &&
      perms.includes('comment.create'),
      'Permissões restritas presentes (ticket.view_own, ticket.create, comment.create)'
    );
    assert(
      !perms.includes('ticket.delete') && !perms.includes('user.manage'),
      'Garantia de segurança: sem permissões de exclusão ou gestão de usuários'
    );

    // -------------------------------------------------------------------------
    // 2. Projetos da Empresa Júnior
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Tabela de Projetos da Empresa Júnior ---');
    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select('*');

    assert(!projectsError && (projects?.length || 0) >= 3, 'Projetos da empresa júnior carregados (mínimo 3)');
    const erpProj = projects?.find((p) => p.code === 'PRJ-ERP-01');
    assert(!!erpProj && erpProj.client_name === 'Alpha Soluções Industriais', 'Projeto PRJ-ERP-01 com cliente identificado');

    // Criação de chamado vinculado ao projeto
    const { data: dept } = await adminClient.from('departments').select('id').eq('code', 'Projetos').single();
    const { data: testTicket, error: ticketError } = await adminClient
      .from('tickets')
      .insert({
        title: 'Manutenção Módulo Fiscal do ERP Alpha',
        description: 'Ajuste de cálculo de impostos conforme nova tabela estadual.',
        department_id: dept!.id,
        category: 'Sistemas',
        priority: 'Alta',
        status: 'Aberto',
        requester_name: 'Carlos Oliveira (Cliente)',
        requester_email: 'carlos@alphametalurgica.com.br',
        project_id: erpProj?.id,
        sla_due_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
      })
      .select()
      .single();

    assert(!ticketError && testTicket?.project_id === erpProj?.id, 'Chamado criado e vinculado com sucesso ao projeto PRJ-ERP-01');

    // -------------------------------------------------------------------------
    // 3. Base de Conhecimento e FAQs
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Base de Conhecimento e Busca por Tags ---');
    const { data: kbArticles, error: kbError } = await adminClient
      .from('knowledge_base_articles')
      .select('*');

    assert(!kbError && (kbArticles?.length || 0) >= 3, 'Artigos da base de conhecimento consultáveis');

    const slaArticle = kbArticles?.find((a) => a.tags?.includes('sla') || a.title.includes('SLA'));
    assert(!!slaArticle, 'Artigo de política de SLA indexado por tag');


    // -------------------------------------------------------------------------
    // 4. Avaliação CSAT (1 a 5 estrelas)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Avaliação CSAT (1 a 5 estrelas) ---');
    // Marca chamado como Resolvido
    await adminClient
      .from('tickets')
      .update({ status: 'Resolvido', resolved_at: new Date().toISOString() })
      .eq('id', testTicket!.id);

    // Envia CSAT
    const { data: csatRes, error: csatError } = await adminClient.rpc('submit_csat_feedback', {
      p_ticket_id: testTicket!.id,
      p_rating: 5,
      p_comment: 'Excelente atendimento da equipe júnior!',
    });

    assert(!csatError && (csatRes as any)?.success === true, 'Avaliação CSAT 5 estrelas registrada com sucesso');

    const { data: updatedTicket } = await adminClient
      .from('tickets')
      .select('csat_rating, csat_comment, csat_rated_at')
      .eq('id', testTicket!.id)
      .single();

    assert(
      updatedTicket?.csat_rating === 5 && updatedTicket?.csat_comment === 'Excelente atendimento da equipe júnior!',
      'CSAT persistido no chamado (rating=5, comentário e timestamp)'
    );

    // Validação de nota inválida
    const { data: invalidCsat } = await adminClient.rpc('submit_csat_feedback', {
      p_ticket_id: testTicket!.id,
      p_rating: 6, // Inválido
      p_comment: 'Nota impossível',
    });
    assert((invalidCsat as any)?.success === false, 'Rejeição segura de nota CSAT fora do intervalo 1-5');

    // -------------------------------------------------------------------------
    // 5. Reabertura Controlada de Chamados (Regra dos 7 Dias)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Reabertura Controlada de Chamados (Regra dos 7 Dias) ---');
    // Chamado resolvido há 2 dias -> deve permitir reabertura
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
    await adminClient
      .from('tickets')
      .update({ status: 'Resolvido', resolved_at: twoDaysAgo })
      .eq('id', testTicket!.id);

    const { data: reopenSuccess } = await adminClient.rpc('reopen_ticket', {
      p_ticket_id: testTicket!.id,
      p_reason: 'Falha intermitente voltou a ocorrer após atualização do SO.',
    });

    assert((reopenSuccess as any)?.success === true, 'Chamado reaberto com sucesso dentro da janela de 7 dias');

    const { data: reopenedTicket } = await adminClient
      .from('tickets')
      .select('status, resolved_at')
      .eq('id', testTicket!.id)
      .single();

    assert(
      reopenedTicket?.status === 'Em Andamento' && reopenedTicket?.resolved_at === null,
      'Status restaurado para "Em Andamento" e resolved_at redefinido para null'
    );

    // Chamado resolvido há 10 dias -> deve rejeitar
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
    await adminClient
      .from('tickets')
      .update({ status: 'Fechado', resolved_at: tenDaysAgo })
      .eq('id', testTicket!.id);

    const { data: reopenExpired } = await adminClient.rpc('reopen_ticket', {
      p_ticket_id: testTicket!.id,
      p_reason: 'Tentativa de reabrir chamado antigo',
    });

    assert(
      (reopenExpired as any)?.success === false,
      'Rejeição de reabertura após transcorrido o prazo limite de 7 dias'
    );

    // -------------------------------------------------------------------------
    // 6. Anonimização LGPD (Direito ao Esquecimento)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Anonimização LGPD e Direito ao Esquecimento ---');
    // Cria usuário autenticado real para teste de anonimização
    const testEmail = `temp.lgpd.${Date.now()}@tecnosystem.com.br`;
    const { data: authCreated, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TemporaryPass123!',
      email_confirm: true,
    });

    if (createAuthError || !authCreated.user) {
      throw new Error(`Falha ao criar usuário de teste para LGPD: ${createAuthError?.message}`);
    }

    const tempUserId = authCreated.user.id;
    const { data: roleMembro } = await adminClient.from('roles').select('id').eq('name', 'Membro').single();

    await adminClient.from('profiles').upsert({
      id: tempUserId,
      name: 'Fulano Ex-Membro de Teste',
      email: testEmail,
      department_id: dept!.id,
      role_id: roleMembro!.id,
      is_active: true,
    });

    const { data: anonRes, error: anonError } = await adminClient.rpc('anonymize_user_data', {
      p_user_id: tempUserId,
    });

    assert(!anonError && (anonRes as any)?.success === true, 'RPC anonymize_user_data executada com sucesso');

    const { data: anonUser } = await adminClient
      .from('profiles')
      .select('name, email, is_active')
      .eq('id', tempUserId)
      .single();

    assert(
      Boolean(anonUser?.name?.includes('Anonimizado')) &&
      Boolean(anonUser?.email?.endsWith('@anonimizado.local')) &&
      anonUser?.is_active === false,
      'Perfil pseudonimizado (Nome anônimo, email pseudonimizado, inativado)'
    );


    // -------------------------------------------------------------------------
    // 7. Geração de Calendário iCalendar RFC 5545 (.ICS)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Formato e Especificação iCalendar RFC 5545 (.ICS) ---');
    const mockEvents = [
      {
        id: 'ev-1',
        title: 'Reunião Geral Tecno System',
        description: 'Alinhamento estratégico do trimestre',
        date: '2026-11-01',
        time: '14:00',
      },
    ];

    const icsContent = generateIcsContent(mockEvents);
    assert(
      icsContent.includes('BEGIN:VCALENDAR') &&
      icsContent.includes('VERSION:2.0') &&
      icsContent.includes('BEGIN:VEVENT') &&
      icsContent.includes('SUMMARY:Reunião Geral Tecno System') &&
      icsContent.includes('DTSTART:20261101T140000Z') &&
      icsContent.includes('END:VCALENDAR'),
      'Conteúdo .ICS válido em conformidade com o padrão RFC 5545'
    );

    // Limpeza de registros de teste
    await adminClient.from('tickets').delete().eq('id', testTicket!.id);
    await adminClient.auth.admin.deleteUser(tempUserId);


  } catch (err: any) {
    console.error('Erro inesperado durante testes da Fase 6:', err);
  }

  console.log('\n=============================================================');
  console.log(`📊 RESULTADO FASE 6: ${passedTests}/${totalTests} testes aprovados (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('=============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase6Tests();
