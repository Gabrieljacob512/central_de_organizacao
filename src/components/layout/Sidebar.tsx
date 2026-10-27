import {
  BarChart3,
  Bell,
  Calendar,
  DollarSign,
  History,
  Inbox,
  LayoutDashboard,
  Lock,
  LogOut,
  Settings,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type { UserProfile, ViewMode } from '../../types/ticket';
import {
  canViewAudit,
  canViewFinance,
  canViewPeople,
  getUserRoleBadgeInfo,
  getUserSubtitle,
} from '../../utils/rbac';
import { Avatar } from '../ui/Avatar';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onLogout: () => void;
  unreadNotificationsCount?: number;
}

/**
 * Menu Lateral Retrátil (Slide Drawer - Mobile First).
 * Estrutura rigorosa de 13 itens:
 * 1. Perfil do usuário no topo
 * 2. Visão Geral das Solicitações (overview)
 * 3. Chamados (tickets)
 * 4. Meus Chamados (my-tickets)
 * 5. Notificações (notifications) com ponto vermelho indicador dinâmico
 * 6. Painel Executivo & Métricas (metrics)
 * 7. Financeiro (finance - condicionado a finance.view)
 * 8. Pessoas (people - condicionado a people.view_all)
 * 9. Espaço Privado (workspace)
 * 10. Calendário (calendar)
 * 11. Auditoria (audit - condicionado a audit.view)
 * 12. Configurações (settings)
 * 13. Sair da Conta (logout no rodapé)
 */
export function Sidebar({
  open,
  onClose,
  currentUser,
  view,
  onViewChange,
  onLogout,
  unreadNotificationsCount = 0,
}: SidebarProps) {
  const roleBadge = getUserRoleBadgeInfo(currentUser);
  const hasAuditAccess = canViewAudit(currentUser);
  const hasFinanceAccess = canViewFinance(currentUser);
  const hasPeopleAccess = canViewPeople(currentUser);

  const isCurrentView = (itemKey: ViewMode) => {
    if (itemKey === 'tickets') {
      return view === 'tickets' || view === 'table' || view === 'kanban';
    }
    return view === itemKey;
  };

  const navItems = [
    {
      id: 'nav-overview',
      key: 'overview' as ViewMode,
      label: 'Visão Geral das Solicitações',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: 'nav-tickets',
      key: 'tickets' as ViewMode,
      label: 'Chamados',
      icon: Inbox,
      visible: true,
    },
    {
      id: 'nav-my-tickets',
      key: 'my-tickets' as ViewMode,
      label: 'Meus Chamados',
      icon: UserCheck,
      visible: true,
    },
    {
      id: 'nav-notifications',
      key: 'notifications' as ViewMode,
      label: 'Notificações',
      icon: Bell,
      visible: true,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null,
    },
    {
      id: 'nav-metrics',
      key: 'metrics' as ViewMode,
      label: 'Painel Executivo & Métricas',
      icon: BarChart3,
      visible: true,
    },
    {
      id: 'nav-finance',
      key: 'finance' as ViewMode,
      label: 'Financeiro',
      icon: DollarSign,
      visible: hasFinanceAccess,
    },
    {
      id: 'nav-people',
      key: 'people' as ViewMode,
      label: 'Pessoas',
      icon: Users,
      visible: hasPeopleAccess,
    },
    {
      id: 'nav-workspace',
      key: 'workspace' as ViewMode,
      label: 'Espaço Privado',
      icon: Lock,
      visible: true,
    },
    {
      id: 'nav-calendar',
      key: 'calendar' as ViewMode,
      label: 'Calendário',
      icon: Calendar,
      visible: true,
    },
    {
      id: 'nav-audit',
      key: 'audit' as ViewMode,
      label: 'Auditoria',
      icon: History,
      visible: hasAuditAccess,
    },
    {
      id: 'nav-settings',
      key: 'settings' as ViewMode,
      label: 'Configurações',
      icon: Settings,
      visible: true,
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 transition-all ${
        open ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Menu lateral de navegação"
    >
      {/* Backdrop com desfoque suave */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Painel lateral deslizante */}
      <aside
        id="slide-drawer-panel"
        className={`fixed inset-y-0 left-0 z-10 flex h-full w-80 max-w-[85vw] flex-col justify-between border-r border-slate-200/90 bg-white p-5 shadow-2xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Cabeçalho do Menu com Logo e Botão Fechar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo-tecnosystem.png"
                alt="Logo Tecno System"
                className="h-8 w-8 object-contain rounded-xl shadow-xs"
                onError={(e) => {
                  e.currentTarget.src = '/logo-tecnosystem.svg';
                }}
              />
              <div>
                <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Tecno<span className="text-red-600 dark:text-red-500">System</span>
                </span>
                <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  Service Desk
                </span>
              </div>
            </div>

            <button
              id="close-sidebar-btn"
              type="button"
              onClick={onClose}
              className="icon-btn min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              aria-label="Fechar menu lateral"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ==================================================================== */}
          {/* 1. PERFIL DO USUÁRIO NO TOPO: FOTO/INICIAIS, NOME, CARGO E DEPTO */}
          {/* ==================================================================== */}
          {currentUser && (
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/60 shadow-2xs">
              <div className="flex items-center gap-3">
                <Avatar
                  name={currentUser.name}
                  avatarUrl={currentUser.avatarUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {currentUser.name}
                  </h3>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {currentUser.email}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${roleBadge.badgeClass}`}
                    >
                      <span>{roleBadge.icon}</span>
                      <span>{getUserSubtitle(currentUser)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* NAVEGAÇÃO COMPLETA RIGOROSAMENTE NA ORDEM DEFINIDA (2 A 12) */}
          {/* ==================================================================== */}
          <nav className="space-y-1" aria-label="Menu principal">
            {navItems
              .filter((item) => item.visible)
              .map((item) => {
                const Icon = item.icon;
                const active = isCurrentView(item.key);

                return (
                  <button
                    key={item.id}
                    id={item.id}
                    type="button"
                    onClick={() => {
                      onViewChange(item.key);
                      onClose();
                    }}
                    className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.key === 'notifications' && item.badge ? (
                      <span
                        className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs"
                        aria-label={`${item.badge} notificações não lidas`}
                      >
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
          </nav>
        </div>

        {/* ==================================================================== */}
        {/* 13. SAIR DA CONTA (LOGOUT) NO RODAPÉ */}
        {/* ==================================================================== */}
        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            id="btn-logout"
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 hover:border-rose-300 active:scale-98 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair da Conta (Logout)</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
