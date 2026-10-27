/**
 * Tipos de domínio do Service Desk da Tecno System.
 */

export type Department = 'TI' | 'RH' | 'Financeiro' | 'Operações' | 'Diretoria';

export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';

export type Status = 'Aberto' | 'Em Andamento' | 'Pendente' | 'Resolvido' | 'Fechado';

/** Cargos e hierarquia do sistema de chamados. */
export type UserRole =
  | 'Presidente'
  | 'Diretor de RH'
  | 'Diretor de TI'
  | 'Diretor Financeiro'
  | 'Diretor de Operações'
  | 'Diretor'
  | 'Membro'
  | 'DIRETOR'
  | 'FUNCIONARIO'
  | string;

/** Perfil de colaborador / usuário para identificação, controle de acesso e auditoria. */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  departmentEmail?: string;
  password?: string;
  department: Department;
  role: string;
  createdAt: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  permissions?: string[];
}

/** Tipos de ações registradas na trilha de auditoria global. */
export type AuditAction =
  | 'CRIACAO'
  | 'ALTERACAO_STATUS'
  | 'ALTERACAO_PRIORIDADE'
  | 'ATRIBUICAO_DEPARTAMENTO'
  | 'RESOLUCAO'
  | 'EXCLUSAO'
  | 'COMENTARIO'
  | 'CADASTRO_COLABORADOR'
  | 'EXCLUSAO_COLABORADOR';

export interface AuditLog {
  id: string;
  ticketId?: string;
  ticketTitle?: string;
  action: AuditAction;
  performedBy: string; // Nome e e-mail do usuário ativo no momento da ação
  details: string;     // Ex: "Status alterado de EM_ANDAMENTO para RESOLVIDO"
  timestamp: string;   // Data e hora ISO formatada
}

/** Tipo de evento registrado no histórico do chamado. */
export type EventType = 'created' | 'comment' | 'status' | 'assignment' | 'update';

/** Papel de quem gerou o evento. */
export type AuthorRole = 'solicitante' | 'atendente' | 'sistema';

export interface TicketEvent {
  id: string;
  type: EventType;
  author: string;
  role: AuthorRole;
  message: string;
  createdAt: string;
}

export interface Ticket {
  /** Identificador legível, ex.: TS-1001 */
  id: string;
  title: string;
  requester: string;
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
  createdAt: string;
  updatedAt: string;
  /** Data-limite do SLA calculada a partir da prioridade. */
  slaDueAt: string;
  /** Momento em que o chamado foi resolvido/fechado (null se ativo). */
  resolvedAt: string | null;
  history: TicketEvent[];
}

/** Dados editáveis em formulário (assignee vazio = sem responsável). */
export interface TicketFormData {
  title: string;
  requester: string;
  email: string;
  department: Department;
  assignedDepartment: Department;
  category: string;
  priority: Priority;
  description: string;
  assignee: string;
}

export type TicketFormErrors = Partial<Record<keyof TicketFormData, string>>;

export type ViewMode = 'table' | 'kanban' | 'calendar' | 'workspace';

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
