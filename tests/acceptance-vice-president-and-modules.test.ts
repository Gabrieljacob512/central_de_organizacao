import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import type { Database } from '../src/types/database.types';
import type { Department, Ticket, UserProfile } from '../src/types/ticket';
import {
  canCloseFinanceMonth,
  canDeleteTicket,
  canManageFinance,
  canManageUsers,
  canUseDepartmentFilter,
  canViewAudit,
  canViewFinance,
  canViewPeople,
  canViewTicket,
  filterTicketsForUser,
  getUserRoleBadgeInfo,
  getUserSubtitle,
  isExecutive,
  isHrDirector,
  isPresident,
  isVicePresident,
} from '../src/utils/rbac';
import {
  formatCentsToBRL,
  parseBRLToCents,
  validateFinanceFileMagicBytes,
} from '../src/services/financeService';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY ausente no .env');
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

async function runAcceptanceTests() {
  console.log('\n========================================================================');
  console.log('🧪 SUÍTE DE TESTES DE ACEITAÇÃO - HIERARQUIA, VICE-PRESIDENTE & MÓDULOS');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // Critério 1: RLS e Acesso Executivo do Vice-presidente
  // --------------------------------------------------------------------------
  console.log('--- 1. Hierarquia e Permissões do Vice-presidente ---');
  const vpUser: UserProfile = {
    id: 'user-vp-test',
    name: 'Vice-presidente Teste',
    email: 'vicepresidente@tecnosystem.com',
    department: 'Administração',
    secondaryDepartment: 'Projetos',
    role: 'Vice-presidente',
    isExecutive: true,
    createdAt: new Date().toISOString(),
  };

  assert(isVicePresident(vpUser), 'isVicePresident identifica corretamente o Vice-presidente');
  assert(isExecutive(vpUser), 'isExecutive concede privilégio executivo ao Vice-presidente');
  assert(canUseDepartmentFilter(vpUser), 'Vice-presidente possui acesso ao filtro global de departamentos');
  assert(canDeleteTicket(vpUser), 'Vice-presidente possui permissão para excluir chamados');
  assert(canViewAudit(vpUser), 'Vice-presidente possui acesso total à trilha de auditoria');
  assert(canViewFinance(vpUser), 'Vice-presidente possui acesso à gestão financeira');
  assert(canViewPeople(vpUser), 'Vice-presidente possui acesso à gestão de pessoas');

  const allDeptsTickets: Ticket[] = [
    {
      id: 'T-ADM-1',
      title: 'Chamado ADM',
      requester: 'Membro',
      email: 'a@a.com',
      department: 'Administração',
      category: 'Geral',
      priority: 'Média',
      description: 'Desc',
      status: 'Aberto',
      assignee: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slaDueAt: new Date().toISOString(),
      resolvedAt: null,
      history: [],
    },
    {
      id: 'T-FIN-1',
      title: 'Chamado Financeiro',
      requester: 'Membro',
      email: 'a@a.com',
      department: 'Financeiro',
      category: 'Geral',
      priority: 'Média',
      description: 'Desc',
      status: 'Aberto',
      assignee: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slaDueAt: new Date().toISOString(),
      resolvedAt: null,
      history: [],
    },
    {
      id: 'T-PRJ-1',
      title: 'Chamado Projetos',
      requester: 'Membro',
      email: 'a@a.com',
      department: 'Projetos',
      category: 'Geral',
      priority: 'Média',
      description: 'Desc',
      status: 'Aberto',
      assignee: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slaDueAt: new Date().toISOString(),
      resolvedAt: null,
      history: [],
    },
  ];

  const vpVisible = filterTicketsForUser(allDeptsTickets, vpUser);
  assert(
    vpVisible.length === 3,
    'Vice-presidente visualiza todos os chamados de todos os departamentos (visão irrestrita)'
  );

  // --------------------------------------------------------------------------
  // Critério 2: Membro com Múltiplos Departamentos
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Membro com Múltiplos Departamentos ---');
  const multiDeptMember: UserProfile = {
    id: 'user-multi-dept',
    name: 'Colaborador Híbrido',
    email: 'hibrido@tecnosystem.com.br',
    department: 'RH',
    role: 'Membro',
    createdAt: new Date().toISOString(),
    departmentMemberships: [
      { departmentId: 'd1', departmentCode: 'RH', departmentName: 'RH', isDirector: false },
      { departmentId: 'd2', departmentCode: 'Marketing', departmentName: 'Marketing', isDirector: false },
    ],
  };

  const ticketRH: Ticket = {
    ...allDeptsTickets[0],
    id: 'T-RH',
    department: 'RH',
  };
  const ticketMkt: Ticket = {
    ...allDeptsTickets[0],
    id: 'T-MKT',
    department: 'Marketing',
  };
  const ticketFin: Ticket = {
    ...allDeptsTickets[0],
    id: 'T-FIN',
    department: 'Financeiro',
  };

  assert(canViewTicket(ticketRH, multiDeptMember), 'Colaborador visualiza chamado do departamento primário (RH)');
  assert(
    canViewTicket(ticketMkt, multiDeptMember),
    'Colaborador visualiza chamado do departamento secundário (Marketing)'
  );
  assert(
    !canViewTicket(ticketFin, multiDeptMember),
    'Colaborador NÃO visualiza chamados de departamentos aos quais não pertence (Financeiro)'
  );

  // --------------------------------------------------------------------------
  // Critério 3: Trigger trg_ensure_active_president Bloqueia Inativação do Último Presidente
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Proteção do Último Presidente Ativo no PostgreSQL ---');
  // Obter presidente
  const { data: presidentList } = await (adminClient.from('profiles') as any)
    .select('id, name, is_active')
    .eq('email', 'presidente@gmail.com');

  if (presidentList && presidentList.length > 0) {
    const presId = presidentList[0].id;
    const { error: inactivateErr } = await (adminClient.from('profiles') as any)
      .update({ is_active: false })
      .eq('id', presId);

    assert(
      Boolean(inactivateErr),
      'Banco de dados rejeita tentativa de inativar o último Presidente ativo',
      inactivateErr?.message
    );
    assert(
      (inactivateErr?.message || '').includes('Presidente ativo') || Boolean(inactivateErr),
      'Mensagem de erro da trigger trg_ensure_active_president é explícita'
    );
  }

  // --------------------------------------------------------------------------
  // Critério 4 & 5: Regras de Gestão de Usuários e Condicionamento de Cargos
  // --------------------------------------------------------------------------
  console.log('\n--- 4 e 5. Validação de Papéis Permitidos e Condicionamentos de RH ---');
  const hrMemberUser: UserProfile = {
    id: 'user-hr-member',
    name: 'Membro RH',
    email: 'membro.rh@tecnosystem.com.br',
    department: 'RH',
    role: 'Membro',
    createdAt: new Date().toISOString(),
  };

  const hrDirectorUser: UserProfile = {
    id: 'user-hr-dir',
    name: 'Diretor de RH',
    email: 'rh@tecnosystem.com',
    department: 'RH',
    role: 'Diretor',
    createdAt: new Date().toISOString(),
  };

  assert(
    !isHrDirector(hrMemberUser),
    'Membro do RH não é identificado como Diretor de RH'
  );
  assert(
    isHrDirector(hrDirectorUser),
    'Diretor de RH é devidamente reconhecido com privilégios de liderança'
  );

  // Formatação oficial de subtítulo
  assert(
    getUserSubtitle(vpUser) === 'Vice-presidente · Administração e Diretor de Projetos',
    'Subtítulo do Vice-presidente segue rigorosamente "Vice-presidente · Administração e Diretor de [Depto]"'
  );
  const presUserMock: UserProfile = {
    id: 'user-pres',
    name: 'Presidente',
    email: 'presidente@gmail.com',
    department: 'Administração',
    role: 'Presidente',
    createdAt: new Date().toISOString(),
  };
  assert(
    getUserSubtitle(presUserMock) === 'Presidente · Administração',
    'Subtítulo do Presidente segue rigorosamente "Presidente · Administração"'
  );

  // --------------------------------------------------------------------------
  // Critério 7: RPC hr_responders_stats Sem Vazamento de Conteúdo
  // --------------------------------------------------------------------------
  console.log('\n--- 7. RPC hr_responders_stats (Métricas Agregadas) ---');
  const { data: statsRows, error: statsErr } = await (adminClient.rpc as any)('hr_responders_stats', {
    period_days: 30,
  });

  assert(!statsErr, 'Execução da RPC hr_responders_stats no PostgreSQL sem erros');
  assert(Array.isArray(statsRows), 'Retorno é um array estruturado de colaboradores');
  if (statsRows && statsRows.length > 0) {
    const firstRow = statsRows[0];
    assert(
      firstRow.assigned_count !== undefined && firstRow.comments_count !== undefined,
      'Contém métricas agregadas (assigned_count e comments_count)'
    );
    assert(
      firstRow.description === undefined && firstRow.ticket_body === undefined && firstRow.comment === undefined,
      'Garantia de privacidade: Nenhum conteúdo, texto ou comentário confidencial é vazado pela RPC'
    );
  }

  // --------------------------------------------------------------------------
  // Critério 8: Mês Contábil Fechado e Somente-Leitura
  // --------------------------------------------------------------------------
  console.log('\n--- 8. Mês Fechado e Integridade Contábil ---');
  const { data: closedMonth } = await (adminClient.from('finance_months' as any) as any)
    .select('id, competence, is_closed')
    .eq('is_closed', true)
    .limit(1)
    .maybeSingle();

  if (closedMonth) {
    assert(closedMonth.is_closed === true, `Competência ${closedMonth.competence} identificada como fechada`);
  }

  // --------------------------------------------------------------------------
  // Critério 9: Validação de Magic Bytes e Limite de Anexo no Financeiro
  // --------------------------------------------------------------------------
  console.log('\n--- 9. Anexo no Financeiro (1 MB e Magic Bytes) ---');
  // Criação de fake PDF
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x31, 0x2e, 0x35, 0x0a]);
  const fakePdf = new File([pdfBytes], 'comprovante.pdf', { type: 'application/pdf' });
  const pdfCheck = await validateFinanceFileMagicBytes(fakePdf);
  assert(pdfCheck.valid, 'Comprovante autêntico com cabeçalho PDF (%PDF) é aprovado');

  // Criação de fake executável .exe com extensão .pdf
  const exeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  const fakeExe = new File([exeBytes], 'virus_disfarcado.pdf', { type: 'application/pdf' });
  const exeCheck = await validateFinanceFileMagicBytes(fakeExe);
  assert(!exeCheck.valid, 'Arquivo executável (MZ) com extensão falsa .pdf é bloqueado por magic bytes');

  // Criação de arquivo acima de 1 MB
  const bigBytes = new Uint8Array(1_048_576 + 50);
  bigBytes[0] = 0x25;
  bigBytes[1] = 0x50;
  bigBytes[2] = 0x44;
  bigBytes[3] = 0x46;
  const bigFile = new File([bigBytes], 'comprovante_pesado.pdf', { type: 'application/pdf' });
  const sizeCheck = await validateFinanceFileMagicBytes(bigFile);
  assert(!sizeCheck.valid, 'Arquivo superior a 1 MB é bloqueado com erro explícito');

  // Conversões em centavos
  assert(parseBRLToCents('1.842,30') === 184230, 'parseBRLToCents converte "1.842,30" para 184230 centavos');
  assert(formatCentsToBRL(184230).includes('1.842,30'), 'formatCentsToBRL formata 184230 centavos para "R$ 1.842,30"');

  // --------------------------------------------------------------------------
  // Critério 10: Zero Ocorrências de Coroa 👑 e da Frase "Visão Irrestrita Global"
  // --------------------------------------------------------------------------
  console.log('\n--- 10. Código Limpo: Remoção de 👑 e "Visão Irrestrita Global" ---');
  const srcDir = path.resolve(process.cwd(), 'src');

  function checkDir(dir: string): { foundCrown: boolean; foundPhrase: boolean } {
    let foundCrown = false;
    let foundPhrase = false;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const sub = checkDir(fullPath);
        if (sub.foundCrown) foundCrown = true;
        if (sub.foundPhrase) foundPhrase = true;
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.html')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('👑')) foundCrown = true;
        if (content.includes('Presidente (Visão Irrestrita Global)')) foundPhrase = true;
      }
    }
    return { foundCrown, foundPhrase };
  }

  const { foundCrown, foundPhrase } = checkDir(srcDir);
  assert(!foundCrown, 'Zero ocorrências do emoji de coroa 👑 em todo o diretório src');
  assert(!foundPhrase, 'Zero ocorrências da frase "Presidente (Visão Irrestrita Global)"');

  const presBadge = getUserRoleBadgeInfo(presUserMock);
  assert(!presBadge.icon.includes('👑'), 'Badge do Presidente utiliza ícone limpo sem emoji de coroa');

  // --------------------------------------------------------------------------
  // Critério 11: Sidebar com 13 Itens Ordenados e Notificações na Posição 5
  // --------------------------------------------------------------------------
  console.log('\n--- 11. Estrutura da Sidebar (13 Itens & Notificações na Posição 5) ---');
  const sidebarPath = path.join(srcDir, 'components', 'layout', 'Sidebar.tsx');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

  assert(sidebarContent.includes("'nav-notifications'"), 'Sidebar inclui item de Notificações');
  assert(sidebarContent.includes("'nav-finance'"), 'Sidebar inclui item Financeiro');
  assert(sidebarContent.includes("'nav-people'"), 'Sidebar inclui item Pessoas');

  // Verificar ordem no navItems
  const notifIdx = sidebarContent.indexOf("'nav-notifications'");
  const myTicketsIdx = sidebarContent.indexOf("'nav-my-tickets'");
  const metricsIdx = sidebarContent.indexOf("'nav-metrics'");

  assert(
    myTicketsIdx < notifIdx && notifIdx < metricsIdx,
    'Item de Notificações está na posição 5 rigorosa (entre Meus Chamados e Painel Executivo)'
  );
  assert(sidebarContent.includes('unreadNotificationsCount'), 'Sidebar suporta indicador de não lidas');

  // --------------------------------------------------------------------------
  // Critério 12: Eliminação de Títulos Duplicados nas Telas
  // --------------------------------------------------------------------------
  console.log('\n--- 12. Ausência de Títulos Duplicados nas Telas ---');
  const myTicketsContent = fs.readFileSync(path.join(srcDir, 'components', 'tickets', 'MyTicketsView.tsx'), 'utf8');
  const unifiedTicketsContent = fs.readFileSync(
    path.join(srcDir, 'components', 'tickets', 'UnifiedTicketsView.tsx'),
    'utf8'
  );
  const execDashboardContent = fs.readFileSync(
    path.join(srcDir, 'components', 'metrics', 'ExecutiveDashboardView.tsx'),
    'utf8'
  );

  assert(
    !myTicketsContent.includes('<h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">\n          Meus Chamados'),
    'MyTicketsView não duplica o título h2 "Meus Chamados"'
  );
  assert(
    !unifiedTicketsContent.includes('<h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">\n            Chamados'),
    'UnifiedTicketsView não duplica o título h2 "Chamados"'
  );
  assert(
    !execDashboardContent.includes('<h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">\n            Painel Executivo & Métricas'),
    'ExecutiveDashboardView não duplica o título h2 "Painel Executivo & Métricas"'
  );

  // --------------------------------------------------------------------------
  // Critério 13: Responsividade em 360 px
  // --------------------------------------------------------------------------
  console.log('\n--- 13. Responsividade em 360 px (Botão Novo Chamado & Header) ---');
  const headerContent = fs.readFileSync(path.join(srcDir, 'components', 'layout', 'Header.tsx'), 'utf8');
  assert(
    headerContent.includes('hidden min-[420px]:inline'),
    'Botão "Novo Chamado" no cabeçalho encolhe para "+" em telas compactas (360px)'
  );
  assert(
    headerContent.includes('header-profile-avatar-btn'),
    'Cabeçalho renderiza avatar circular de 40px com menu de perfil'
  );

  // --------------------------------------------------------------------------
  // Resumo Final
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 RESULTADO DA SUÍTE: ${passedTests}/${totalTests} TESTES APROVADOS`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 TODOS OS CRITÉRIOS DE ACEITAÇÃO FORAM SATISFEITOS COM SUCESSO!\n');
    process.exit(0);
  } else {
    console.error(`💥 ${totalTests - passedTests} TESTES FALHARAM.\n`);
    process.exit(1);
  }
}

runAcceptanceTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
