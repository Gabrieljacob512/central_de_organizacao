import type { Ticket, UserProfile } from '../types/ticket';

/**
 * Utilitários de Controle de Acesso Baseado em Papéis (RBAC) e Isolamento Setorial.
 * Define com precisão as permissões para:
 * 1. Presidente (Admin geral: visualiza tudo, gerencia usuários, exclui chamados)
 * 2. Diretor de RH (visualiza RH, gerencia usuários, exclui chamados de RH)
 * 3. Diretores de Setor (visualizam seu próprio departamento, excluem chamados do setor)
 * 4. Membros / Funcionários comuns (visualizam seu próprio departamento, NÃO excluem chamados, NÃO gerenciam usuários)
 */

/**
 * Verifica se o usuário é o Presidente (Admin Geral).
 * O Presidente possui acesso irrestrito a todos os chamados e pode cadastrar/excluir colaboradores.
 */
export function isPresident(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return (
    role.includes('presidente') ||
    dept === 'diretoria' ||
    email === 'presidente@gmail.com' ||
    email === 'presidente@tecnosystem.com'
  );
}

/**
 * Verifica se o usuário é o Diretor de RH.
 */
export function isHrDirector(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const dept = (user.department || '').toUpperCase();
  const email = (user.email || '').toLowerCase();
  return (
    (role.includes('diretor') && (dept === 'RH' || role.includes('rh'))) ||
    email === 'rh@tecnosystem.com'
  );
}

/**
 * SOMENTE o Presidente e o Diretor de RH possuem permissão para cadastrar
 * novos usuários ou excluí-los do sistema.
 */
export function canManageUsers(user: UserProfile | null | undefined): boolean {
  return isPresident(user) || isHrDirector(user);
}

/**
 * Apenas Diretores e o Presidente podem excluir chamados.
 * Funcionários comuns e membros NÃO PODEM apagar chamados.
 */
export function canDeleteTicket(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return isPresident(user) || role.includes('diretor');
}

/**
 * Permissão audit.view: Concedida a Presidente e Diretor.
 * Controla: item Auditoria da sidebar, aba Histórico/Eventos do detalhe do chamado e endpoints de log.
 * Membro NÃO tem permissão.
 */
export function canViewAudit(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (user.permissions?.includes('audit.view') || user.permissions?.includes('audit.view_all')) return true;
  const role = (user.role || '').toLowerCase();
  return isPresident(user) || role.includes('diretor');
}

/**
 * Permissão profile.change_department: Por padrão, APENAS o Presidente.
 */
export function canChangeDepartment(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (user.permissions?.includes('profile.change_department')) return true;
  return isPresident(user);
}

/**
 * Permissão ticket.assign: Quem atribui responsável ao chamado.
 * Por padrão, Presidente e Diretor.
 */
export function canAssignTicket(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (user.permissions?.includes('ticket.assign')) return true;
  const role = (user.role || '').toLowerCase();
  return isPresident(user) || role.includes('diretor');
}

/**
 * Filtro por departamento: EXCLUSIVO do Presidente.
 * Membros e Diretores têm seus dados restritos automaticamente pelo banco/servidor.
 */
export function canUseDepartmentFilter(user: UserProfile | null | undefined): boolean {
  return isPresident(user);
}

/**
 * Regra de Permissão de Eventos Globais do Calendário:
 * Apenas Diretores e o Presidente podem criar ou apagar eventos corporativos globais.
 * Funcionários comuns e membros podem apenas visualizá-los.
 */
export function canManageGlobalEvents(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return isPresident(user) || role.includes('diretor');
}

/**
 * Regra de Isolamento de Chamados por Departamento:
 * - Membros e Diretores de Setor: Só podem visualizar e interagir com os chamados
 *   enviados estritamente para o seu próprio departamento.
 * - Presidente (Admin): É o único perfil com permissão irrestrita para visualizar,
 *   filtrar e gerenciar TODOS os chamados de todos os departamentos da empresa.
 */
export function canViewTicket(ticket: Ticket, user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (isPresident(user)) return true;
  const targetDept = ticket.assignedDepartment ?? ticket.department;
  return targetDept === user.department;
}

/**
 * Filtra a lista de chamados de acordo com a regra de isolamento do usuário ativo.
 */
export function filterTicketsForUser(tickets: Ticket[], user: UserProfile | null | undefined): Ticket[] {
  if (!user) return [];
  if (isPresident(user)) return tickets;
  return tickets.filter((ticket) => canViewTicket(ticket, user));
}

/**
 * Retorna uma formatação legível e com ícone do cargo do colaborador.
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
      label: user.role || 'Presidente',
      badgeClass: 'border-amber-300 bg-amber-100/90 text-amber-900 shadow-2xs dark:border-amber-700/80 dark:bg-amber-950/80 dark:text-amber-300',
      icon: '👑',
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
