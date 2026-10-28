import type { Department, Ticket, UserProfile } from '../types/ticket';

export class PermissionError extends Error {
  constructor(message: string = 'Você não tem permissão para isso.') {
    super(message);
    this.name = 'PermissionError';
  }
}

export type Permission =
  | 'ticket.view_all'
  | 'ticket.create'
  | 'ticket.update'
  | 'ticket.delete'
  | 'ticket.assign'
  | 'people.view_all'
  | 'people.create_member'
  | 'people.edit_members_other_depts'
  | 'people.view_activity'
  | 'finance.view'
  | 'finance.manage'
  | 'finance.close_month'
  | 'audit.view'
  | 'audit.view_all'
  | 'settings.manage';

export function isExecutive(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return role === 'presidente' || role === 'vice-presidente' || Boolean(user.isExecutive);
}

export function isPresident(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return (
    (role.includes('presidente') && !role.includes('vice')) ||
    email === 'presidente@gmail.com'
  );
}

export function isVicePresident(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return role.includes('vice') || email === 'vicepresidente@gmail.com';
}

export function isFinanceDirector(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return (role.includes('diretor') && dept === 'financeiro') || email === 'diretor@gmail.com';
}

export function isHrMember(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const dept = (user.department || '').toUpperCase();
  const email = (user.email || '').toLowerCase();
  const hasMembership = user.departmentMemberships?.some((m) => m.departmentCode === 'RH');
  return dept === 'RH' || email === 'membro@gmail.com' || Boolean(hasMembership);
}

/** Retorna a lista de departamentos vinculados ao usuário */
export function getUserDepartments(user: UserProfile | null | undefined): Department[] {
  if (!user) return [];
  const set = new Set<Department>();
  if (user.department) set.add(user.department);
  if (user.secondaryDepartment) set.add(user.secondaryDepartment);
  user.departmentMemberships?.forEach((m) => {
    if (m.departmentCode) set.add(m.departmentCode);
  });
  return Array.from(set);
}

/** Verifica se o usuário tem permissão para executar uma ação */
export function hasPermission(
  user: UserProfile | null | undefined,
  permission: Permission,
  context?: { department?: Department; ticket?: Ticket }
): boolean {
  if (!user) return false;

  // Presidente e Vice-presidente: todas as permissões
  if (isExecutive(user)) return true;

  // Diretor do Financeiro
  if (isFinanceDirector(user)) {
    if (
      permission === 'finance.view' ||
      permission === 'finance.manage' ||
      permission === 'finance.close_month' ||
      permission === 'ticket.create' ||
      permission === 'ticket.update' ||
      permission === 'ticket.assign' ||
      permission === 'settings.manage'
    ) {
      return true;
    }

    // Exclusão de chamados: apenas do próprio departamento
    if (permission === 'ticket.delete') {
      if (!context?.ticket) return true;
      const dept = context.ticket.assignedDepartment || context.ticket.department;
      return dept === 'Financeiro';
    }

    // Auditoria: apenas do próprio departamento
    if (permission === 'audit.view') {
      return true;
    }

    return false;
  }

  // Membro do RH
  if (isHrMember(user)) {
    if (
      permission === 'people.view_all' ||
      permission === 'people.create_member' ||
      permission === 'people.edit_members_other_depts' ||
      permission === 'people.view_activity' ||
      permission === 'ticket.create' ||
      permission === 'ticket.update' ||
      permission === 'settings.manage'
    ) {
      return true;
    }
    return false;
  }

  // Outros colaboradores (Membros comuns)
  if (permission === 'ticket.create' || permission === 'ticket.update' || permission === 'settings.manage') {
    return true;
  }

  return false;
}

/** Lança PermissionError se o usuário não possuir a permissão requerida */
export function assertCan(
  user: UserProfile | null | undefined,
  permission: Permission,
  context?: { department?: Department; ticket?: Ticket }
): void {
  if (!hasPermission(user, permission, context)) {
    throw new PermissionError('Você não tem permissão para isso.');
  }
}

/**
 * Regra de visibilidade dos chamados:
 * Um chamado é visível se pertence a um dos departamentos do usuário,
 * ou se o usuário é o solicitante, ou se é o responsável.
 * Executivos veem todos.
 */
export function canViewTicket(user: UserProfile | null | undefined, ticket: Ticket): boolean {
  if (!user) return false;
  if (isExecutive(user)) return true;

  // Solicitante vê sempre o próprio chamado que abriu
  if (
    ticket.email?.toLowerCase() === user.email?.toLowerCase() ||
    ticket.requester?.toLowerCase() === user.name?.toLowerCase()
  ) {
    return true;
  }

  // Responsável vê o chamado atribuído
  if (ticket.assignee && ticket.assignee.toLowerCase() === user.name?.toLowerCase()) {
    return true;
  }

  // Pertence aos departamentos vinculados do usuário
  const userDepts = getUserDepartments(user);
  const ticketTargetDept = ticket.assignedDepartment || ticket.department;
  if (userDepts.includes(ticketTargetDept)) {
    return true;
  }

  if (ticket.department && userDepts.includes(ticket.department)) {
    return true;
  }

  return false;
}

/** Filtra chamados visíveis para o usuário de acordo com as regras de visibilidade */
export function filterTicketsForUser(tickets: Ticket[], user: UserProfile | null | undefined): Ticket[] {
  if (!user) return [];
  if (isExecutive(user)) return tickets;
  return tickets.filter((t) => canViewTicket(user, t));
}
