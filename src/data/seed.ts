import { clearAllFiles } from './indexedDb';
import {
  readCollection,
  writeCollection,
  StoredUserSchema,
  type StoredUser,
  type StoredDepartment,
  type StoredMembership,
  type StoredTicket,
  type StoredComment,
  type StoredAudit,
  type StoredNotification,
  type StoredEvent,
  type StoredFinanceEntry,
  type StoredFinanceMonth,
  type StoredFinanceProject,
} from './storage';
import { z } from 'zod';

export const OFFICIAL_DEMO_USERS: StoredUser[] = [
  {
    id: 'user-pres-001',
    name: 'Presidente (Admin)',
    email: 'presidente@gmail.com',
    password: 'presidente123',
    department: 'Administração',
    departmentEmail: 'contato@tecnosystem.com',
    role: 'Presidente',
    phone: '(11) 98765-4321',
    startDate: '2025-01-15',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2025-01-15T09:00:00.000Z',
  },
  {
    id: 'user-vp-002',
    name: 'Vice-presidente',
    email: 'vicepresidente@gmail.com',
    password: 'vicepresidente123',
    department: 'Administração',
    secondaryDepartment: 'Projetos',
    departmentEmail: 'projetos@tecnosystem.com',
    role: 'Vice-presidente',
    phone: '(11) 98765-4322',
    startDate: '2025-02-01',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2025-02-01T09:00:00.000Z',
  },
  {
    id: 'user-dir-fin-003',
    name: 'Diretor Financeiro',
    email: 'diretor@gmail.com',
    password: 'diretor123',
    department: 'Financeiro',
    departmentEmail: 'financeiro@tecnosystem.com',
    role: 'Diretor',
    phone: '(11) 98765-4323',
    startDate: '2025-03-01',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2025-03-01T09:00:00.000Z',
  },
  {
    id: 'user-mem-rh-004',
    name: 'Membro do RH',
    email: 'membro@gmail.com',
    password: 'membro123',
    department: 'RH',
    departmentEmail: 'rh@tecnosystem.com',
    role: 'Membro',
    phone: '(11) 98765-4324',
    startDate: '2025-04-01',
    isActive: true,
    mustChangePassword: false,
    createdAt: '2025-04-01T09:00:00.000Z',
  },
];

export const OFFICIAL_DEPARTMENTS: StoredDepartment[] = [
  { id: 'dept-adm', code: 'Administração', name: 'Administração Executiva' },
  { id: 'dept-fin', code: 'Financeiro', name: 'Controladoria & Finanças' },
  { id: 'dept-rh', code: 'RH', name: 'Recursos Humanos & Pessoas' },
  { id: 'dept-mkt', code: 'Marketing', name: 'Comunicação & Marketing' },
  { id: 'dept-prj', code: 'Projetos', name: 'Engenharia & Projetos' },
];

export const OFFICIAL_MEMBERSHIPS: StoredMembership[] = [
  { userId: 'user-pres-001', departmentId: 'dept-adm', departmentCode: 'Administração', isDirector: true },
  { userId: 'user-vp-002', departmentId: 'dept-adm', departmentCode: 'Administração', isDirector: false },
  { userId: 'user-vp-002', departmentId: 'dept-prj', departmentCode: 'Projetos', isDirector: true },
  { userId: 'user-dir-fin-003', departmentId: 'dept-fin', departmentCode: 'Financeiro', isDirector: true },
  { userId: 'user-mem-rh-004', departmentId: 'dept-rh', departmentCode: 'RH', isDirector: false },
];

export function seedDemoData(force: boolean = false): void {
  const existingUsers = readCollection('users', z.array(StoredUserSchema), []);
  if (existingUsers.length > 0 && !force) {
    return; // Já existem dados populados
  }

  console.log('[Seed] Populando dados de demonstração em localStorage...');

  // 1. Usuários oficiais (apenas as 4 contas)
  writeCollection('users', OFFICIAL_DEMO_USERS);

  // 2. Departamentos oficiais (5 departamentos)
  writeCollection('departments', OFFICIAL_DEPARTMENTS);

  // 3. Vínculos e memberships
  writeCollection('memberships', OFFICIAL_MEMBERSHIPS);

  // 4. Chamados de demonstração (~12 chamados balanceados)
  const now = new Date();
  const subHours = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();
  const addHours = (h: number) => new Date(now.getTime() + h * 3600 * 1000).toISOString();

  const seedTickets: StoredTicket[] = [
    // --- FINANCEIRO (3 chamados) ---
    {
      id: crypto.randomUUID(),
      code: '#0001',
      title: 'Reembolso de despesas com transporte para visita técnica',
      description: 'Solicito a conferência dos comprovantes e estorno referente ao deslocamento da equipe para a fábrica do cliente.',
      department: 'Projetos',
      assignedDepartment: 'Financeiro',
      category: 'Reembolso',
      priority: 'Média',
      status: 'Em Andamento',
      requester: 'Vice-presidente',
      email: 'vicepresidente@gmail.com',
      assignee: 'Diretor Financeiro',
      slaDueAt: addHours(18),
      createdAt: subHours(6),
      updatedAt: subHours(2),
      history: [
        { id: crypto.randomUUID(), type: 'created', author: 'Vice-presidente', role: 'solicitante', message: 'Chamado aberto no sistema.', createdAt: subHours(6) },
        { id: crypto.randomUUID(), type: 'assigned', author: 'Diretor Financeiro', role: 'atendente', message: 'Chamado atribuído a Diretor Financeiro.', createdAt: subHours(4) },
        { id: crypto.randomUUID(), type: 'status', author: 'Diretor Financeiro', role: 'sistema', message: 'Status alterado para Em Andamento.', createdAt: subHours(2) },
      ],
    },
    {
      id: crypto.randomUUID(),
      code: '#0002',
      title: 'Emissão de Nota Fiscal referente à sprint 2 do cliente Alpha',
      description: 'Marco contratual concluído com aceite assinado. Necessário emitir a NF-e para faturamento.',
      department: 'Projetos',
      assignedDepartment: 'Financeiro',
      category: 'Notas Fiscais',
      priority: 'Alta',
      status: 'Aberto',
      requester: 'Vice-presidente',
      email: 'vicepresidente@gmail.com',
      assignee: null,
      slaDueAt: addHours(6),
      createdAt: subHours(2),
      updatedAt: subHours(2),
      history: [
        { id: crypto.randomUUID(), type: 'created', author: 'Vice-presidente', role: 'solicitante', message: 'Chamado aberto no sistema.', createdAt: subHours(2) },
      ],
    },
    {
      id: crypto.randomUUID(),
      code: '#0003',
      title: 'Aquisição de licenças da ferramenta de diagramação',
      description: 'Necessidade de renovação anual do plano corporativo para os novos membros.',
      department: 'Marketing',
      assignedDepartment: 'Financeiro',
      category: 'Contas a Pagar',
      priority: 'Baixa',
      status: 'Resolvido',
      requester: 'Presidente (Admin)',
      email: 'presidente@gmail.com',
      assignee: 'Diretor Financeiro',
      slaDueAt: subHours(10),
      resolvedAt: subHours(1),
      createdAt: subHours(48),
      updatedAt: subHours(1),
      history: [
        { id: crypto.randomUUID(), type: 'created', author: 'Presidente (Admin)', role: 'solicitante', message: 'Chamado aberto no sistema.', createdAt: subHours(48) },
        { id: crypto.randomUUID(), type: 'status', author: 'Diretor Financeiro', role: 'sistema', message: 'Status alterado para Resolvido.', createdAt: subHours(1) },
      ],
    },

    // --- RH & PESSOAS (3 chamados) ---
    {
      id: crypto.randomUUID(),
      code: '#0004',
      title: 'Abertura de processo seletivo para novos trainees de Projetos',
      description: 'Elaboração do edital e cronograma das dinâmicas em grupo para o primeiro semestre.',
      department: 'Projetos',
      assignedDepartment: 'RH',
      category: 'Admissão',
      priority: 'Alta',
      status: 'Em Andamento',
      requester: 'Vice-presidente',
      email: 'vicepresidente@gmail.com',
      assignee: 'Membro do RH',
      slaDueAt: addHours(4),
      createdAt: subHours(12),
      updatedAt: subHours(3),
      history: [
        { id: crypto.randomUUID(), type: 'created', author: 'Vice-presidente', role: 'solicitante', message: 'Chamado aberto no sistema.', createdAt: subHours(12) },
        { id: crypto.randomUUID(), type: 'status', author: 'Membro do RH', role: 'sistema', message: 'Status alterado para Em Andamento.', createdAt: subHours(3) },
      ],
    },
    {
      id: crypto.randomUUID(),
      code: '#0005',
      title: 'Agendamento de avaliação de desempenho 360 do mês',
      description: 'Formulários prontos para disparo aos diretores e membros da equipe operacional.',
      department: 'Administração',
      assignedDepartment: 'RH',
      category: 'Treinamento',
      priority: 'Média',
      status: 'Pendente',
      requester: 'Presidente (Admin)',
      email: 'presidente@gmail.com',
      assignee: 'Membro do RH',
      slaDueAt: addHours(20),
      createdAt: subHours(24),
      updatedAt: subHours(5),
      history: [
        { id: crypto.randomUUID(), type: 'created', author: 'Presidente (Admin)', role: 'solicitante', message: 'Chamado aberto no sistema.', createdAt: subHours(24) },
        { id: crypto.randomUUID(), type: 'status', author: 'Membro do RH', role: 'sistema', message: 'Aguardando validação da diretoria executiva.', createdAt: subHours(5) },
      ],
    },
    {
      id: crypto.randomUUID(),
      code: '#0006',
      title: 'Solicitação de férias e recesso acadêmico do Financeiro',
      description: 'Período solicitado para janeiro de acordo com o calendário universitário.',
      department: 'Financeiro',
      assignedDepartment: 'RH',
      category: 'Férias',
      priority: 'Baixa',
      status: 'Fechado',
      requester: 'Diretor Financeiro',
      email: 'diretor@gmail.com',
      assignee: 'Membro do RH',
      slaDueAt: subHours(50),
      resolvedAt: subHours(12),
      createdAt: subHours(72),
      updatedAt: subHours(12),
      history: [
        { id: crypto.randomUUID(), type: 'created', author: 'Diretor Financeiro', role: 'solicitante', message: 'Chamado aberto no sistema.', createdAt: subHours(72) },
        { id: crypto.randomUUID(), type: 'status', author: 'Membro do RH', role: 'sistema', message: 'Status alterado para Fechado.', createdAt: subHours(12) },
      ],
    },

    // --- MARKETING (3 chamados) ---
    {
      id: crypto.randomUUID(),
      code: '#0007',
      title: 'Criação de identidade visual e postagens para campanha de captação',
      description: 'Desenvolvimento das artes para Instagram e LinkedIn divulgando o portfólio da Tecno System.',
      department: 'Administração',
      assignedDepartment: 'Marketing',
      category: 'Redes Sociais',
      priority: 'Média',
      status: 'Aberto',
      requester: 'Presidente (Admin)',
      email: 'presidente@gmail.com',
      assignee: null,
      slaDueAt: addHours(22),
      createdAt: subHours(4),
      updatedAt: subHours(4),
      history: [
        { id: crypto.randomUUID(), type: 'created', author: 'Presidente (Admin)', role: 'solicitante', message: 'Chamado aberto no sistema.', createdAt: subHours(4) },
      ],
    },
    {
      id: crypto.randomUUID(),
      code: '#0008',
      title: 'Reformulação das lâminas de apresentação comercial',
      description: 'Atualização dos cases de sucesso recentes de Projetos para apresentação a novos prospects.',
      department: 'Projetos',
      assignedDepartment: 'Marketing',
      category: 'Material Gráfico',
      priority: 'Alta',
      status: 'Em Andamento',
      requester: 'Vice-presidente',
      email: 'vicepresidente@gmail.com',
      assignee: null,
      slaDueAt: addHours(5),
      createdAt: subHours(8),
      updatedAt: subHours(1),
      history: [
        { id: crypto.randomUUID(), type: 'created', author: 'Vice-presidente', role: 'solicitante', message: 'Chamado aberto no sistema.', createdAt: subHours(8) },
      ],
    },
    {
      id: crypto.randomUUID(),
      code: '#0009',
      title: 'Atualização do banner de boas-vindas do site institucional',
      description: 'Substituição das fotos institucionais da nova gestão executiva.',
      department: 'Administração',
      assignedDepartment: 'Marketing',
      category: 'Site Institucional',
      priority: 'Baixa',
      status: 'Resolvido',
      requester: 'Presidente (Admin)',
      email: 'presidente@gmail.com',
      assignee: null,
      slaDueAt: subHours(15),
      resolvedAt: subHours(2),
      createdAt: subHours(36),
      updatedAt: subHours(2),
      history: [
        { id: crypto.randomUUID(), type: 'created', author: 'Presidente (Admin)', role: 'solicitante', message: 'Chamado aberto no sistema.', createdAt: subHours(36) },
      ],
    },

    // --- PROJETOS (3 chamados) ---
    {
      id: crypto.randomUUID(),
      code: '#0010',
      title: 'Revisão da arquitetura do sistema web para cliente Beta',
      description: 'Análise de performance e escolha da stack de mensageria para o pipeline de processamento.',
      department: 'Administração',
      assignedDepartment: 'Projetos',
      category: 'Planejamento',
      priority: 'Crítica',
      status: 'Em Andamento',
      requester: 'Presidente (Admin)',
      email: 'presidente@gmail.com',
      assignee: 'Vice-presidente',
      slaDueAt: addHours(2),
      createdAt: subHours(2),
      updatedAt: subHours(1),
      history: [
        { id: crypto.randomUUID(), type: 'created', author: 'Presidente (Admin)', role: 'solicitante', message: 'Chamado aberto no sistema.', createdAt: subHours(2) },
        { id: crypto.randomUUID(), type: 'status', author: 'Vice-presidente', role: 'sistema', message: 'Status alterado para Em Andamento.', createdAt: subHours(1) },
      ],
    },
    {
      id: crypto.randomUUID(),
      code: '#0011',
      title: 'Alocação de novos monitores para bancada de testes de protótipos',
      description: 'Equipe de hardware precisa de espaço físico e equipamentos adicionais para validação.',
      department: 'Financeiro',
      assignedDepartment: 'Projetos',
      category: 'Recursos',
      priority: 'Média',
      status: 'Aberto',
      requester: 'Diretor Financeiro',
      email: 'diretor@gmail.com',
      assignee: null,
      slaDueAt: addHours(24),
      createdAt: subHours(5),
      updatedAt: subHours(5),
      history: [
        { id: crypto.randomUUID(), type: 'created', author: 'Diretor Financeiro', role: 'solicitante', message: 'Chamado aberto no sistema.', createdAt: subHours(5) },
      ],
    },
    {
      id: crypto.randomUUID(),
      code: '#0012',
      title: 'Entrega final da documentação técnica e código-fonte Projeto Ômega',
      description: 'Repositório limpo, documentação de deploy aprovada e termo de encerramento emitido.',
      department: 'Projetos',
      assignedDepartment: 'Projetos',
      category: 'Entregas',
      priority: 'Alta',
      status: 'Resolvido',
      requester: 'Vice-presidente',
      email: 'vicepresidente@gmail.com',
      assignee: 'Vice-presidente',
      slaDueAt: subHours(5),
      resolvedAt: subHours(1),
      createdAt: subHours(30),
      updatedAt: subHours(1),
      history: [
        { id: crypto.randomUUID(), type: 'created', author: 'Vice-presidente', role: 'solicitante', message: 'Chamado aberto no sistema.', createdAt: subHours(30) },
      ],
    },
  ];

  writeCollection('tickets', seedTickets);
  writeCollection('counters', { ticket: 12 });

  // 5. Comentários de demonstração
  const seedComments: StoredComment[] = [
    {
      id: crypto.randomUUID(),
      ticketId: seedTickets[0].id,
      authorId: 'user-dir-fin-003',
      authorName: 'Diretor Financeiro',
      authorRole: 'Diretor',
      content: 'Comprovantes recebidos e em análise pela controladoria. Pagamento programado para sexta-feira.',
      isInternal: false,
      createdAt: subHours(3),
    },
    {
      id: crypto.randomUUID(),
      ticketId: seedTickets[3].id,
      authorId: 'user-mem-rh-004',
      authorName: 'Membro do RH',
      authorRole: 'Membro',
      content: 'Edital de abertura pronto para publicação. Alinhando com Marketing os banners de divulgação.',
      isInternal: false,
      createdAt: subHours(2),
    },
    {
      id: crypto.randomUUID(),
      ticketId: seedTickets[9].id,
      authorId: 'user-vp-002',
      authorName: 'Vice-presidente',
      authorRole: 'Vice-presidente',
      content: 'Benchmarking de ferramentas concluído. Reunião de alinhamento com a diretoria técnica agendada.',
      isInternal: true,
      createdAt: subHours(1),
    },
  ];
  writeCollection('comments', seedComments);

  // 6. Auditoria append-only inicial
  const seedAudit: StoredAudit[] = [
    {
      id: crypto.randomUUID(),
      action: 'SISTEMA_INICIALIZADO',
      performedBy: 'Sistema Tecno Desk',
      details: 'Carga inicial do banco de dados local com as 4 contas oficiais e 5 departamentos concluída.',
      createdAt: subHours(72),
    },
    {
      id: crypto.randomUUID(),
      action: 'CRIACAO_CHAMADO',
      ticketId: seedTickets[0].id,
      ticketSnapshotTitle: seedTickets[0].title,
      performedBy: 'Vice-presidente [Vice-presidente] (vicepresidente@gmail.com)',
      performedById: 'user-vp-002',
      details: 'Abertura do chamado #0001 para o setor Financeiro.',
      createdAt: subHours(6),
    },
  ];
  writeCollection('audit', seedAudit);

  // 7. Notificações iniciais
  const seedNotifications: StoredNotification[] = [
    {
      id: crypto.randomUUID(),
      userId: 'user-dir-fin-003',
      title: 'Novo chamado setorial',
      message: 'O Vice-presidente abriu o chamado #0001 (Reembolso) para o Financeiro.',
      type: 'ticket',
      read: false,
      senderId: 'user-vp-002',
      createdAt: subHours(6),
    },
    {
      id: crypto.randomUUID(),
      userId: 'user-pres-001',
      title: 'Atenção ao SLA',
      message: 'O chamado crítico #0010 de Projetos vence em 2 horas.',
      type: 'sla',
      read: false,
      senderId: 'system',
      createdAt: subHours(1),
    },
    {
      id: crypto.randomUUID(),
      userId: 'user-mem-rh-004',
      title: 'Novo chamado para o RH',
      message: 'O Vice-presidente solicitou abertura de processo seletivo (#0004).',
      type: 'ticket',
      read: true,
      senderId: 'user-vp-002',
      createdAt: subHours(12),
    },
  ];
  writeCollection('notifications', seedNotifications);

  // 8. Eventos de calendário corporativo
  const seedEvents: StoredEvent[] = [
    {
      id: crypto.randomUUID(),
      title: 'Reunião Geral da Diretoria Executiva',
      description: 'Acompanhamento de metas estratégicas e fechamento mensal.',
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 14, 0).toISOString(),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 16, 0).toISOString(),
      allDay: false,
      isGlobal: true,
      createdBy: 'user-pres-001',
      department: 'Administração',
      createdAt: subHours(24),
    },
    {
      id: crypto.randomUUID(),
      title: 'Treinamento de Onboarding Novos Membros',
      description: 'Apresentação da cultura organizacional e ferramentas.',
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 9, 0).toISOString(),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 12, 0).toISOString(),
      allDay: false,
      isGlobal: false,
      createdBy: 'user-mem-rh-004',
      department: 'RH',
      createdAt: subHours(10),
    },
  ];
  writeCollection('events', seedEvents);

  // 9. Financeiro dos últimos 6 meses (2026-05 até 2026-10)
  const seedMonths: StoredFinanceMonth[] = [
    { id: 'month-2026-10', competence: '2026-10', isClosed: false, createdAt: '2026-10-01T00:00:00.000Z' },
    { id: 'month-2026-09', competence: '2026-09', isClosed: true, closedBy: 'user-dir-fin-003', closedAt: '2026-10-02T10:00:00.000Z', createdAt: '2026-09-01T00:00:00.000Z' },
    { id: 'month-2026-08', competence: '2026-08', isClosed: true, closedBy: 'user-dir-fin-003', closedAt: '2026-09-02T10:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z' },
    { id: 'month-2026-07', competence: '2026-07', isClosed: true, closedBy: 'user-dir-fin-003', closedAt: '2026-08-02T10:00:00.000Z', createdAt: '2026-07-01T00:00:00.000Z' },
    { id: 'month-2026-06', competence: '2026-06', isClosed: true, closedBy: 'user-dir-fin-003', closedAt: '2026-07-02T10:00:00.000Z', createdAt: '2026-06-01T00:00:00.000Z' },
    { id: 'month-2026-05', competence: '2026-05', isClosed: true, closedBy: 'user-dir-fin-003', closedAt: '2026-06-02T10:00:00.000Z', createdAt: '2026-05-01T00:00:00.000Z' },
  ];
  writeCollection('financeMonths', seedMonths);

  const seedEntries: StoredFinanceEntry[] = [
    // Outubro 2026 (aberto)
    { id: crypto.randomUUID(), monthId: 'month-2026-10', competence: '2026-10', type: 'gain', category: 'Projetos', amountCents: 4500000, description: 'Faturamento 1ª parcela Projeto Ômega', entryDate: '2026-10-10', projectName: 'Projeto Ômega', createdBy: 'user-dir-fin-003', createdAt: '2026-10-10T14:00:00.000Z' },
    { id: crypto.randomUUID(), monthId: 'month-2026-10', competence: '2026-10', type: 'gain', category: 'Projetos', amountCents: 2800000, description: 'Consultoria técnica Cliente Beta', entryDate: '2026-10-15', projectName: 'Consultoria Beta', createdBy: 'user-dir-fin-003', createdAt: '2026-10-15T10:00:00.000Z' },
    { id: crypto.randomUUID(), monthId: 'month-2026-10', competence: '2026-10', type: 'expense', category: 'Ferramentas', amountCents: 85000, description: 'Assinatura software de CAD e modelagem', entryDate: '2026-10-05', createdBy: 'user-dir-fin-003', createdAt: '2026-10-05T09:00:00.000Z' },
    { id: crypto.randomUUID(), monthId: 'month-2026-10', competence: '2026-10', type: 'expense', category: 'Marketing', amountCents: 123456, description: 'Tráfego pago e campanhas de captação', entryDate: '2026-10-12', createdBy: 'user-dir-fin-003', createdAt: '2026-10-12T11:00:00.000Z' },

    // Setembro 2026 (fechado)
    { id: crypto.randomUUID(), monthId: 'month-2026-09', competence: '2026-09', type: 'gain', category: 'Projetos', amountCents: 5200000, description: 'Entrega final Projeto Alpha', entryDate: '2026-09-20', projectName: 'Projeto Alpha', createdBy: 'user-dir-fin-003', createdAt: '2026-09-20T16:00:00.000Z' },
    { id: crypto.randomUUID(), monthId: 'month-2026-09', competence: '2026-09', type: 'expense', category: 'Eventos', amountCents: 94000, description: 'Coffee break e recepção dos trainees', entryDate: '2026-09-18', createdBy: 'user-dir-fin-003', createdAt: '2026-09-18T10:00:00.000Z' },

    // Agosto 2026 (fechado)
    { id: crypto.randomUUID(), monthId: 'month-2026-08', competence: '2026-08', type: 'gain', category: 'Projetos', amountCents: 4100000, description: 'Sprints 1 e 2 Projeto Gama', entryDate: '2026-08-15', projectName: 'Projeto Gama', createdBy: 'user-dir-fin-003', createdAt: '2026-08-15T11:00:00.000Z' },
    { id: crypto.randomUUID(), monthId: 'month-2026-08', competence: '2026-08', type: 'expense', category: 'Impostos e taxas', amountCents: 320000, description: 'Tributação e emissão de notas fiscais', entryDate: '2026-08-25', createdBy: 'user-dir-fin-003', createdAt: '2026-08-25T15:00:00.000Z' },

    // Julho 2026 (fechado)
    { id: crypto.randomUUID(), monthId: 'month-2026-07', competence: '2026-07', type: 'gain', category: 'Projetos', amountCents: 3900000, description: 'Serviço de análise de viabilidade', entryDate: '2026-07-22', projectName: 'Viabilidade Delta', createdBy: 'user-dir-fin-003', createdAt: '2026-07-22T14:00:00.000Z' },
    { id: crypto.randomUUID(), monthId: 'month-2026-07', competence: '2026-07', type: 'expense', category: 'Ferramentas', amountCents: 68000, description: 'Hospedagem e servidores em nuvem', entryDate: '2026-07-08', createdBy: 'user-dir-fin-003', createdAt: '2026-07-08T09:00:00.000Z' },

    // Junho 2026 (fechado)
    { id: crypto.randomUUID(), monthId: 'month-2026-06', competence: '2026-06', type: 'gain', category: 'Projetos', amountCents: 4800000, description: 'Projeto Epsilon - Primeira Fase', entryDate: '2026-06-18', projectName: 'Projeto Epsilon', createdBy: 'user-dir-fin-003', createdAt: '2026-06-18T16:00:00.000Z' },
    { id: crypto.randomUUID(), monthId: 'month-2026-06', competence: '2026-06', type: 'expense', category: 'Outros', amountCents: 45000, description: 'Material de escritório e papelaria', entryDate: '2026-06-10', createdBy: 'user-dir-fin-003', createdAt: '2026-06-10T10:00:00.000Z' },

    // Maio 2026 (fechado)
    { id: crypto.randomUUID(), monthId: 'month-2026-05', competence: '2026-05', type: 'gain', category: 'Projetos', amountCents: 3500000, description: 'Assessoria de Engenharia Júnior', entryDate: '2026-05-20', projectName: 'Assessoria Zeta', createdBy: 'user-dir-fin-003', createdAt: '2026-05-20T11:00:00.000Z' },
    { id: crypto.randomUUID(), monthId: 'month-2026-05', competence: '2026-05', type: 'expense', category: 'Marketing', amountCents: 89000, description: 'Impressão de folders para feira acadêmica', entryDate: '2026-05-12', createdBy: 'user-dir-fin-003', createdAt: '2026-05-12T14:00:00.000Z' },
  ];
  writeCollection('financeEntries', seedEntries);

  const seedProjects: StoredFinanceProject[] = [
    { id: crypto.randomUUID(), monthId: 'month-2026-10', competence: '2026-10', name: 'Projeto Ômega', clientName: 'Indústria Metalúrgica', revenueCents: 4500000, description: 'Otimização de processos produtivos', createdAt: '2026-10-01T00:00:00.000Z' },
    { id: crypto.randomUUID(), monthId: 'month-2026-10', competence: '2026-10', name: 'Consultoria Beta', clientName: 'Varejo Digital', revenueCents: 2800000, description: 'Reestruturação de infraestrutura', createdAt: '2026-10-01T00:00:00.000Z' },
    { id: crypto.randomUUID(), monthId: 'month-2026-09', competence: '2026-09', name: 'Projeto Alpha', clientName: 'Construtora Horizonte', revenueCents: 5200000, description: 'Projeto elétrico e hidrossanitário', createdAt: '2026-09-01T00:00:00.000Z' },
  ];
  writeCollection('financeProjects', seedProjects);

  console.log('[Seed] População concluída com sucesso!');
}

/** Reseta completamente o armazenamento local e recria o seed inicial */
export async function resetDemoData(): Promise<void> {
  console.log('[Seed] Resetando todos os dados locais do aplicativo...');
  if (typeof window !== 'undefined') {
    // 1. Limpar todas as chaves tecno.v1.* do localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('tecno.v1.')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));

    // 2. Limpar arquivos do IndexedDB
    try {
      await clearAllFiles();
    } catch (e) {
      console.warn('[Seed] Falha ao limpar IndexedDB:', e);
    }

    // 3. Re-executar o seed limpo
    seedDemoData();

    // 4. Recarregar a página para atualizar todo o estado
    window.location.reload();
  }
}

// Expõe window.__resetDemo() estritamente em ambiente de desenvolvimento (DEV)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).__resetDemo = resetDemoData;
}
