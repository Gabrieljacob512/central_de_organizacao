/**
 * Tipos de domínio do Service Desk da Tecno System.
 */

export type Department = 'Administração' | 'Financeiro' | 'RH' | 'Marketing' | 'Projetos';

export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';

export type Status = 'Aberto' | 'Em Andamento' | 'Pendente' | 'Resolvido' | 'Fechado';

/** Cargos e hierarquia do sistema de chamados. */
export type UserRole =
  | 'Presidente'
  | 'Vice-presidente'
  | 'Diretor'
  | 'Diretor de RH'
  | 'Diretor Financeiro'
  | 'Diretor de Marketing'
  | 'Diretor de Projetos'
  | 'Membro'
  | 'Cliente'
  | string;

export interface DepartmentMembership {
  departmentId: string;
  departmentCode: Department;
  departmentName: string;
  isDirector: boolean;
}

/** Permissões granulares de Pessoas (RH) */
export type PeoplePermission =
  | 'people.view_all'
  | 'people.create_member'
  | 'people.create_leadership'
  | 'people.create_executive'
  | 'people.edit_members_other_depts'
  | 'people.edit_all'
  | 'people.deactivate'
  | 'people.view_activity';

/** Permissões granulares do Financeiro */
export type FinancePermission =
  | 'finance.view'
  | 'finance.manage'
  | 'finance.close_month';

/** Perfil de colaborador / usuário para identificação, controle de acesso e auditoria. */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  departmentEmail?: string;
  password?: string;
  department: Department;
  secondaryDepartment?: Department;
  role: string;
  createdAt: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  avatarUrl?: string | null;
  theme?: 'light' | 'dark' | 'system';
  permissions?: string[];
  isExecutive?: boolean;
  departmentMemberships?: DepartmentMembership[];
}

/** Tipos de ações registradas na trilha de auditoria global. */
export type AuditAction =
  | 'CRIACAO'
  | 'ALTERACAO_STATUS'
  | 'ALTERACAO_PRIORIDADE'
  | 'ATRIBUICAO_DEPARTAMENTO'
  | 'ATRIBUICAO_RESPONSAVEL'
  | 'ALTERACAO_PERFIL'
  | 'RESOLUCAO'
  | 'EXCLUSAO'
  | 'COMENTARIO'
  | 'CADASTRO_COLABORADOR'
  | 'EXCLUSAO_COLABORADOR';

export interface AuditLog {
  id: string;
  ticketId?: string;
  ticketTitle?: string;
  departmentId?: string;
  action: AuditAction;
  performedBy: string; // Nome e e-mail do usuário ativo no momento da ação
  details: string;     // Ex: "Status alterado de EM_ANDAMENTO para RESOLVIDO"
  timestamp: string;   // Data e hora ISO formatada
}

/** Tipo de evento registrado no histórico do chamado. */
export type EventType = 'created' | 'comment' | 'status' | 'assignment' | 'update';

/** Papel de quem gerou o evento. */
export type AuthorRole = 'solicitante' | 'atendente' | 'sistema';

export interface CommentAttachment {
  id: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  storagePath: string;
  signedUrl?: string;
  description?: string | null;
}

export interface TicketEvent {
  id: string;
  type: EventType;
  author: string;
  authorId?: string;
  role: AuthorRole;
  message: string;
  visibility?: 'public' | 'internal';
  editedAt?: string | null;
  deletedAt?: string | null;
  attachments?: CommentAttachment[];
  createdAt: string;
}

export interface Ticket {
  /** Identificador legível, ex.: TS-1001 */
  id: string;
  title: string;
  requester: string;
  requesterId?: string | null;
  email: string;
  /** Departamento de Origem do solicitante */
  department: Department;
  /** Departamento Responsável pelo atendimento da demanda */
  assignedDepartment?: Department;
  category: string;
  priority: Priority;
  description: string;
  status: Status;
  /** Atendente responsável (null = sem responsável). */
  assignee: string | null;
  assigneeId?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Data-limite do SLA calculada a partir da prioridade. */
  slaDueAt: string;
  /** Momento em que o chamado foi resolvido/fechado (null se ativo). */
  resolvedAt: string | null;
  projectId?: string | null;
  csatRating?: number | null;
  history: TicketEvent[];
}

export interface PendingAttachmentFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  description: string;
  previewUrl?: string;
}

/** Dados editáveis em formulário (assignee vazio = sem responsável). */
export interface TicketFormData {
  title: string;
  requester: string;
  requesterId?: string;
  email: string;
  department: Department;
  assignedDepartment: Department;
  category: string;
  priority: Priority;
  description: string;
  assignee: string;
  assigneeId?: string;
  projectId?: string;
  initialAttachments?: PendingAttachmentFile[];
}

export type TicketFormErrors = Partial<Record<keyof TicketFormData, string>>;

export type ViewMode =
  | 'overview'
  | 'tickets'
  | 'my-tickets'
  | 'notifications'
  | 'metrics'
  | 'finance'
  | 'people'
  | 'workspace'
  | 'calendar'
  | 'audit'
  | 'settings'
  | 'table'
  | 'kanban';

export type SortOption = 'recent' | 'oldest' | 'priority' | 'sla';

export interface TicketFilters {
  search: string;
  department: Department | 'all';
  assignedDepartment?: Department | 'all';
  status: Status | 'all';
  priority: Priority | 'all';
  sort: SortOption;
}

/** Resultado padronizado das ações de domínio (usado para feedback via toast). */
export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface FinanceMonth {
  id: string;
  competence: string; // 'YYYY-MM'
  isClosed: boolean;
  closedAt?: string | null;
  closedBy?: string | null;
  reopenedAt?: string | null;
  reopenedBy?: string | null;
  totalRevenueCents: number;
  totalExpenseCents: number;
  balanceCents: number;
}

export interface FinanceEntry {
  id: string;
  monthId: string;
  type: 'gain' | 'expense';
  category: string;
  amountCents: number;
  description: string;
  projectId?: string | null;
  projectName?: string | null;
  createdAt: string;
  createdBy?: string | null;
}

export interface FinanceMonthProject {
  id: string;
  monthId: string;
  projectId?: string | null;
  projectName: string;
  revenueCents: number;
  notes?: string | null;
  createdAt?: string;
}

export interface FinanceAttachment {
  id: string;
  entityType: 'entry' | 'project';
  entityId: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  storagePath: string;
  signedUrl?: string;
  createdAt?: string;
}

export interface ResponderStat {
  profile_id: string;
  name: string;
  email: string;
  department_name: string;
  role_name: string;
  assigned_count: number;
  comments_count: number;
  resolved_count: number;
  last_activity_at: string | null;
}
