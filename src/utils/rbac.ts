import type { Department, Ticket, UserProfile } from '../types/ticket';

/**
 * Utilitários de Controle de Acesso Baseado em Papéis (RBAC) e Isolamento Setorial.
 * Define a hierarquia da Tecno System:
 * Presidente > Vice-presidente > Diretor > Membro
 *
 * - Presidente e Vice-presidente são executivos com acesso irrestrito global.
 * - Diretores e Membros têm acesso aos seus respectivos departamentos.
 * - Permissões granulares para Pessoas (RH) e Financeiro.
 */

/**
 * Verifica se o usuário é o Presidente.
 */
export function isPresident(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return (
    role === 'presidente' ||
    role.includes('presidente') && !role.includes('vice') ||
    email === 'presidente@gmail.com' ||
    email === 'presidente@tecnosystem.com'
  );
}

/**
 * Verifica se o usuário é o Vice-presidente.
 */
export function isVicePresident(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return (
    role === 'vice-presidente' ||
    role.includes('vice') ||
    email === 'vicepresidente@tecnosystem.com'
  );
}

/**
 * Verifica se o usuário faz parte do corpo executivo (Presidente ou Vice-presidente).
 * Ambos possuem permissões completas equivalentes na plataforma.
 */
export function isExecutive(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (user.isExecutive) return true;
  return isPresident(user) || isVicePresident(user);
}

/**
 * Verifica se o usuário é Diretor (qualquer departamento).
 */
export function isDirector(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return role.includes('diretor');
}

/**
 * Verifica se o usuário pertence ao departamento de RH.
 */
export function isHr(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const dept = (user.department || '').toUpperCase();
  const email = (user.email || '').toLowerCase();
  const hasMembership = user.departmentMemberships?.some((m) => m.departmentCode === 'RH');
  return dept === 'RH' || email === 'rh@tecnosystem.com' || Boolean(hasMembership);
}

/**
 * Verifica se o usuário é o Diretor de RH.
 */
export function isHrDirector(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return (isHr(user) && role.includes('diretor')) || (user.email || '').toLowerCase() === 'rh@tecnosystem.com';
}

/**
 * Verifica se o usuário pertence ao departamento Financeiro.
 */
export function isFinance(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const dept = (user.department || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  const hasMembership = user.departmentMemberships?.some((m) => m.departmentCode === 'Financeiro');
  return dept === 'financeiro' || email === 'financeiro@tecnosystem.com' || Boolean(hasMembership);
}

/**
 * Verifica se o usuário é o Diretor Financeiro.
 */
export function isFinanceDirector(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return (isFinance(user) && role.includes('diretor')) || (user.email || '').toLowerCase() === 'financeiro@tecnosystem.com';
}

/**
 * Verifica permissão para gerenciar usuários (Pessoas).
 * Executivos, Diretor de RH ou usuários com permissão explícita.
 */
export function canManageUsers(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return (
    isExecutive(user) ||
    isHrDirector(user) ||
    Boolean(user.permissions?.includes('people.create_member')) ||
    Boolean(user.permissions?.includes('people.edit_all'))
  );
}

/**
 * Permissões granulares do módulo Pessoas (RH).
 */
export function canViewPeople(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return (
    isExecutive(user) ||
    isHr(user) ||
    Boolean(user.permissions?.includes('people.view_all'))
  );
}

export function canViewPeopleActivity(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return (
    isExecutive(user) ||
    isHr(user) ||
    Boolean(user.permissions?.includes('people.view_activity'))
  );
}

/**
 * Permissões granulares do módulo Financeiro.
 */
export function canViewFinance(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return (
    isExecutive(user) ||
    isFinance(user) ||
    Boolean(user.permissions?.includes('finance.view'))
  );
}

export function canManageFinance(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return (
    isExecutive(user) ||
    (isFinance(user) && isDirector(user)) ||
    Boolean(user.permissions?.includes('finance.manage'))
  );
}

export function canCloseFinanceMonth(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return (
    isExecutive(user) ||
    (isFinance(user) && isDirector(user)) ||
    Boolean(user.permissions?.includes('finance.close_month'))
  );
}

/**
 * Apenas Executivos e Diretores podem excluir chamados.
 */
export function canDeleteTicket(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return isExecutive(user) || isDirector(user);
}

/**
 * Permissão audit.view: Concedida a Executivos e Diretores.
 */
export function canViewAudit(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (user.permissions?.includes('audit.view') || user.permissions?.includes('audit.view_all')) return true;
  return isExecutive(user) || isDirector(user);
}

/**
 * Permissão profile.change_department: Por padrão, Executivos.
 */
export function canChangeDepartment(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (user.permissions?.includes('profile.change_department')) return true;
  return isExecutive(user);
}

/**
 * Permissão ticket.assign: Quem atribui responsável ao chamado.
 * Executivos e Diretores.
 */
export function canAssignTicket(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (user.permissions?.includes('ticket.assign')) return true;
  return isExecutive(user) || isDirector(user);
}

/**
 * Filtro global por departamento na Toolbar: Exclusivo de Executivos (Presidente e Vice-presidente).
 */
export function canUseDepartmentFilter(user: UserProfile | null | undefined): boolean {
  return isExecutive(user);
}

export const canFilterByDepartment = canUseDepartmentFilter;

/**
 * Regra de Permissão de Eventos Globais do Calendário:
 * Executivos e Diretores.
 */
export function canManageGlobalEvents(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return isExecutive(user) || isDirector(user);
}

/**
 * Regra de Isolamento de Chamados por Departamento:
 * - Executivos (Presidente e Vice-presidente): Acesso irrestrito a TODOS os chamados.
 * - Membros e Diretores: Visualizam chamados pertencentes a QUALQUER um dos seus departamentos associados.
 */
export function canViewTicket(ticket: Ticket, user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (isExecutive(user)) return true;

  const targetDept = ticket.assignedDepartment ?? ticket.department;

  // Checar departamento principal
  if (user.department && targetDept === user.department) {
    return true;
  }

  // Checar departamento secundário (ex.: Vice-presidente ou membro com múltiplos setores)
  if (user.secondaryDepartment && targetDept === user.secondaryDepartment) {
    return true;
  }

  // Checar associações via departmentMemberships
  if (user.departmentMemberships && user.departmentMemberships.length > 0) {
    return user.departmentMemberships.some((m) => m.departmentCode === targetDept);
  }

  return false;
}

/**
 * Filtra a lista de chamados de acordo com a regra de isolamento do usuário ativo.
 */
export function filterTicketsForUser(tickets: Ticket[], user: UserProfile | null | undefined): Ticket[] {
  if (!user) return [];
  if (isExecutive(user)) return tickets;
  return tickets.filter((ticket) => canViewTicket(ticket, user));
}

/**
 * Formata o subtítulo oficial do perfil para cabeçalho, perfil e sidebar.
 * Padrões exigidos:
 * - Presidente: "Presidente · Administração"
 * - Vice-presidente: "Vice-presidente · Administração e Diretor de [Departamento]"
 * - Diretor: "Diretor · [Departamento]"
 * - Membro: "Membro · [Departamento]"
 */
export function getUserSubtitle(user: UserProfile | null | undefined): string {
  if (!user) return 'Desconectado';

  if (isPresident(user)) {
    return 'Presidente · Administração';
  }

  if (isVicePresident(user)) {
    // Obter departamento operacional onde é diretor
    let opDept: Department | string = user.secondaryDepartment || '';
    if (!opDept && user.departmentMemberships) {
      const dirMembership = user.departmentMemberships.find(
        (m) => m.isDirector && m.departmentCode !== 'Administração'
      );
      if (dirMembership) opDept = dirMembership.departmentCode;
    }
    if (!opDept) opDept = 'Projetos';
    return `Vice-presidente · Administração e Diretor de ${opDept}`;
  }

  const role = user.role || 'Membro';
  const dept = user.department || 'Geral';
  return `${role} · ${dept}`;
}

/**
 * Retorna formatação legível e ícone do cargo do colaborador (sem uso de emoji de coroa).
 */
export function getUserRoleBadgeInfo(user: UserProfile | null | undefined): {
  label: string;
  badgeClass: string;
  icon: string;
} {
  if (!user) {
    return {
      label: 'Desconectado',
      badgeClass: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400',
      icon: '👤',
    };
  }

  if (isPresident(user)) {
    return {
      label: 'Presidente',
      badgeClass: 'border-amber-300 bg-amber-100/90 text-amber-900 shadow-2xs dark:border-amber-700/80 dark:bg-amber-950/80 dark:text-amber-300',
      icon: '🛡️',
    };
  }

  if (isVicePresident(user)) {
    return {
      label: 'Vice-presidente',
      badgeClass: 'border-indigo-300 bg-indigo-100/90 text-indigo-900 shadow-2xs dark:border-indigo-700/80 dark:bg-indigo-950/80 dark:text-indigo-300',
      icon: '🛡️',
    };
  }

  if (isHrDirector(user)) {
    return {
      label: user.role || 'Diretor de RH',
      badgeClass: 'border-purple-300 bg-purple-100/90 text-purple-900 shadow-2xs dark:border-purple-800/80 dark:bg-purple-950/80 dark:text-purple-300',
      icon: '👔',
    };
  }

  const role = (user.role || '').toLowerCase();
  if (role.includes('diretor')) {
    return {
      label: user.role,
      badgeClass: 'border-blue-300 bg-blue-100/90 text-blue-900 shadow-2xs dark:border-blue-800/80 dark:bg-blue-950/80 dark:text-blue-300',
      icon: '👔',
    };
  }

  return {
    label: user.role || 'Membro',
    badgeClass: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    icon: '👤',
  };
}
