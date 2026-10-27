import type { Department, Priority, Status, UserProfile } from '../types/ticket';

/**
 * Configurações de negócio do Service Desk da Tecno System:
 * Departamentos exclusivos: Financeiro, RH, Marketing e Projetos.
 */

export const OPERATIONAL_DEPARTMENTS: Department[] = ['Financeiro', 'RH', 'Marketing', 'Projetos'];

export const EXECUTIVE_DEPARTMENTS: Department[] = ['Administração'];

export const ALL_DEPARTMENTS: Department[] = ['Administração', 'Financeiro', 'RH', 'Marketing', 'Projetos'];

export const DEPARTMENTS: Department[] = ['Financeiro', 'RH', 'Marketing', 'Projetos'];

export const PRIORITIES: Priority[] = ['Baixa', 'Média', 'Alta', 'Crítica'];

export const STATUSES: Status[] = ['Aberto', 'Em Andamento', 'Pendente', 'Resolvido', 'Fechado'];

/** Categorias disponíveis por departamento. */
export const CATEGORIES_BY_DEPARTMENT: Record<Department, string[]> = {
  Administração: ['Gestão Estratégica', 'Governança', 'Parcerias Institucionais', 'Diretoria Executiva', 'Outros'],
  Financeiro: ['Reembolso', 'Folha de Pagamento', 'Notas Fiscais', 'Contas a Pagar', 'Orçamento', 'Outros'],
  RH: ['Admissão', 'Desligamento', 'Férias', 'Benefícios', 'Treinamento', 'Outros'],
  Marketing: ['Redes Sociais', 'Design & Branding', 'Campanhas', 'Material Gráfico', 'Site Institucional', 'Outros'],
  Projetos: ['Planejamento', 'Cronograma', 'Entregas', 'Recursos', 'Escopo & Mudanças', 'Outros'],
};

/** Prazo de atendimento (em horas) conforme a prioridade. */
export const SLA_HOURS: Record<Priority, number> = {
  Baixa: 72,
  Média: 24,
  Alta: 8,
  Crítica: 4,
};

/** Peso numérico usado na ordenação por prioridade. */
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  Baixa: 1,
  Média: 2,
  Alta: 3,
  Crítica: 4,
};

/** Equipe de atendimento agrupada por departamento. */
export const AGENTS_BY_DEPARTMENT: Record<Department, string[]> = {
  Administração: ['Presidente (Admin)', 'Vice-presidente'],
  Financeiro: ['Marcos Oliveira', 'Beatriz Santos', 'Bruno Carvalho'],
  RH: ['Helena Rocha', 'Patrícia Alves', 'Fernanda Costa', 'Camila Ribeiro'],
  Marketing: ['Diego Nascimento', 'Eduardo Ferreira', 'Larissa Mendes'],
  Projetos: ['Lucas Silva', 'Carlos Mendes', 'Mariana Souza', 'Rafael Lima'],
};

export type TransitionTone = 'primary' | 'success' | 'warning' | 'neutral' | 'danger';

export interface StatusTransition {
  to: Status;
  label: string;
  tone: TransitionTone;
}

/**
 * Fluxo controlado de status: define quais transições são permitidas a partir
 * de cada estado. Qualquer transição fora desta tabela é bloqueada.
 */
export const STATUS_TRANSITIONS: Record<Status, StatusTransition[]> = {
  Aberto: [
    { to: 'Em Andamento', label: 'Iniciar atendimento', tone: 'primary' },
    { to: 'Fechado', label: 'Cancelar / Fechar', tone: 'neutral' },
  ],
  'Em Andamento': [
    { to: 'Pendente', label: 'Aguardar retorno', tone: 'warning' },
    { to: 'Resolvido', label: 'Marcar como resolvido', tone: 'success' },
  ],
  Pendente: [
    { to: 'Em Andamento', label: 'Retomar atendimento', tone: 'primary' },
    { to: 'Resolvido', label: 'Marcar como resolvido', tone: 'success' },
  ],
  Resolvido: [
    { to: 'Fechado', label: 'Fechar chamado', tone: 'neutral' },
    { to: 'Em Andamento', label: 'Reabrir', tone: 'danger' },
  ],
  Fechado: [{ to: 'Aberto', label: 'Reabrir chamado', tone: 'danger' }],
};

/** Nome exibido para ações realizadas pela central quando não há responsável. */
export const SERVICE_DESK_NAME = 'Service Desk';

export const STORAGE_KEYS = {
  tickets: 'tecnosystem.servicedesk.tickets.v1',
  view: 'tecnosystem.servicedesk.view.v1',
  chamadosView: 'tecnosystem.servicedesk.chamados_view.v1',
  currentUser: 'currentUser',
  usersList: 'usersList',
  auditLogs: 'auditLogs',
  theme: 'tecnosystem.servicedesk.theme',
} as const;

/** Lista inicial de colaboradores da Tecno System com credenciais e papéis nos departamentos. */
export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user-presidente',
    name: 'Presidente (Admin)',
    email: 'presidente@gmail.com',
    departmentEmail: 'contato@tecnosystem.com',
    department: 'Administração',
    role: 'Presidente',
    isExecutive: true,
    mustChangePassword: true,
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'user-vice-presidente',
    name: 'Vice-presidente',
    email: 'vicepresidente@tecnosystem.com',
    departmentEmail: 'contato@tecnosystem.com',
    department: 'Administração',
    secondaryDepartment: 'Projetos',
    role: 'Vice-presidente',
    isExecutive: true,
    mustChangePassword: true,
    createdAt: '2026-01-01T08:15:00.000Z',
  },
  {
    id: 'user-rh',
    name: 'Helena Rocha',
    email: 'rh@tecnosystem.com',
    departmentEmail: 'rh@tecnosystem.com',
    department: 'RH',
    role: 'Diretor',
    createdAt: '2026-01-01T08:30:00.000Z',
  },
  {
    id: 'user-rh-membro',
    name: 'Camila Ribeiro',
    email: 'camila.ribeiro@tecnosystem.com.br',
    departmentEmail: 'rh@tecnosystem.com',
    department: 'RH',
    role: 'Membro',
    createdAt: '2026-02-12T08:30:00.000Z',
  },
  {
    id: 'user-fin-dir',
    name: 'Bruno Carvalho',
    email: 'financeiro@tecnosystem.com',
    departmentEmail: 'financeiro@tecnosystem.com',
    department: 'Financeiro',
    role: 'Diretor',
    createdAt: '2026-02-05T11:00:00.000Z',
  },
  {
    id: 'user-fin-membro',
    name: 'Beatriz Santos',
    email: 'beatriz.santos@tecnosystem.com.br',
    departmentEmail: 'financeiro@tecnosystem.com',
    department: 'Financeiro',
    role: 'Membro',
    createdAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'user-mkt-dir',
    name: 'Eduardo Ferreira',
    email: 'marketing@tecnosystem.com',
    departmentEmail: 'marketing@tecnosystem.com',
    department: 'Marketing',
    role: 'Diretor',
    createdAt: '2026-03-05T15:30:00.000Z',
  },
  {
    id: 'user-mkt-membro',
    name: 'Diego Nascimento',
    email: 'diego.nascimento@tecnosystem.com.br',
    departmentEmail: 'marketing@tecnosystem.com',
    department: 'Marketing',
    role: 'Membro',
    createdAt: '2026-03-01T14:00:00.000Z',
  },
  {
    id: 'user-proj-dir',
    name: 'Carlos Mendes',
    email: 'projetos@tecnosystem.com',
    departmentEmail: 'projetos@tecnosystem.com',
    department: 'Projetos',
    role: 'Diretor',
    createdAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'user-proj-membro',
    name: 'Mariana Souza',
    email: 'mariana.souza@tecnosystem.com.br',
    departmentEmail: 'projetos@tecnosystem.com',
    department: 'Projetos',
    role: 'Membro',
    createdAt: '2026-01-10T08:00:00.000Z',
  },
];
