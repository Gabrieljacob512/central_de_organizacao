import {
  BookOpen,
  Calendar,
  Columns3,
  Download,
  History,
  KeyRound,
  Lock,
  LogOut,
  RotateCcw,
  Rows3,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { UserProfile, ViewMode } from '../../types/ticket';
import { canManageUsers, getUserRoleBadgeInfo } from '../../utils/rbac';
import { Avatar } from '../ui/Avatar';
import { ThemeToggle } from '../ui/ThemeToggle';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenAuditLogs: () => void;
  onResetData: () => void;
  onOpenChangePassword: () => void;
  onOpenUserManagement?: () => void;
  onOpenKnowledgeBase?: () => void;
  onExportCalendarIcs?: () => void;
  onOpenLgpdModal?: () => void;
  onLogout: () => void;
}


/**
 * Menu Lateral Expansível (Slide Drawer) com Seção de Configurações (Requisito 4).
 * Contém EXCLUSIVAMENTE:
 * 1. Bloco de Identificação do Usuário (Nome, E-mail, Depto e Cargo);
 * 2. Navegação da Aplicação (Lista/Kanban, Gestão de Colaboradores [se Presidente/RH], Auditoria, Restaurar Demo);
 * 3. Bloco Configurações (Mudar Senha, Modo Claro/Escuro);
 * 4. Botão Sair da Conta (Logout).
 */
export function Sidebar({
  open,
  onClose,
  currentUser,
  view,
  onViewChange,
  onOpenAuditLogs,
  onResetData,
  onOpenChangePassword,
  onOpenUserManagement,
  onOpenKnowledgeBase,
  onExportCalendarIcs,
  onOpenLgpdModal,
  onLogout,
}: SidebarProps) {
  const roleBadge = getUserRoleBadgeInfo(currentUser);
  const hasUserManagementAccess = canManageUsers(currentUser);


  return (
    <div
      className={`fixed inset-0 z-50 transition-all ${
        open ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Menu lateral de navegação e configurações"
    >
      {/* Backdrop escurecido com blur suave */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Painel lateral que desliza suavemente da esquerda para a direita */}
      <aside
        id="slide-drawer-panel"
        className={`fixed inset-y-0 left-0 z-10 flex h-full w-80 max-w-[85vw] flex-col justify-between border-r border-slate-200/90 bg-white p-5 shadow-2xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6 overflow-y-auto">
          {/* Cabeçalho do Drawer com Logo e Botão Fechar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
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
              className="icon-btn min-h-[40px] min-w-[40px] text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              aria-label="Fechar menu lateral"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ==================================================================== */}
          {/* 1. BLOCO DE IDENTIFICAÇÃO DO USUÁRIO LOGADO */}
          {/* ==================================================================== */}
          {currentUser && (
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/60 shadow-2xs">
              <div className="flex items-start gap-3">
                <Avatar name={currentUser.name} size="md" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {currentUser.name}
                  </h3>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {currentUser.email}
                  </p>

                  {/* Badges de Departamento e Cargo */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300">
                      Depto: {currentUser.department}
                    </span>

                    {/* Cargo Destacado */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${roleBadge.badgeClass}`}
                    >
                      <span>{roleBadge.icon}</span>
                      <span>{roleBadge.label}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 2. NAVEGAÇÃO DA APLICAÇÃO */}
          {/* ==================================================================== */}
          <div className="space-y-1.5">
            <p className="px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              Navegação
            </p>

            {/* Alternar Visualização: Lista */}
            <button
              id="nav-view-table"
              type="button"
              onClick={() => {
                onViewChange('table');
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                view === 'table'
                  ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Rows3 className="h-4 w-4" />
              <span>Chamados em Lista</span>
            </button>

            {/* Alternar Visualização: Kanban */}
            <button
              id="nav-view-kanban"
              type="button"
              onClick={() => {
                onViewChange('kanban');
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                view === 'kanban'
                  ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Columns3 className="h-4 w-4" />
              <span>Quadro Kanban</span>
            </button>

            {/* Navegação: Calendário */}
            <button
              id="nav-view-calendar"
              type="button"
              onClick={() => {
                onViewChange('calendar');
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                view === 'calendar'
                  ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Calendário</span>
            </button>

            {/* Navegação: Espaço Privado */}
            <button
              id="nav-view-workspace"
              type="button"
              onClick={() => {
                onViewChange('workspace');
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                view === 'workspace'
                  ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Lock className="h-4 w-4" />
              <span>Espaço Privado</span>
            </button>

            {/* Base de Conhecimento & FAQs */}
            {onOpenKnowledgeBase && (
              <button
                id="nav-knowledge-base"
                type="button"
                onClick={() => {
                  onOpenKnowledgeBase();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Base de Conhecimento</span>
              </button>
            )}

            {/* Exportar Calendário .ICS */}
            {onExportCalendarIcs && (
              <button
                id="nav-export-ics"
                type="button"
                onClick={() => {
                  onExportCalendarIcs();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Exportar Calendário (.ICS)</span>
              </button>
            )}

            {/* Gestão de Colaboradores (Exclusivo para Presidente e Diretor de RH) */}
            {hasUserManagementAccess && onOpenUserManagement && (
              <button
                id="nav-user-management"
                type="button"
                onClick={() => {
                  onOpenUserManagement();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <Users className="h-4 w-4" />
                <span>Gerenciar Colaboradores</span>
              </button>
            )}

            {/* Central de Auditoria / Histórico de Eventos */}
            <button
              id="nav-audit-logs"
              type="button"
              onClick={() => {
                onOpenAuditLogs();
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <History className="h-4 w-4" />
              <span>Central de Auditoria</span>
            </button>

            {/* Restaurar Dados Demo (Exclusivo para ambiente de desenvolvimento) */}
            {import.meta.env.DEV && (
              <button
                id="nav-reset-data"
                type="button"
                onClick={() => {
                  onResetData();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 text-slate-500" />
                <span>Restaurar Dados Demo</span>
              </button>
            )}
          </div>

          {/* ==================================================================== */}
          {/* 3. BLOCO "CONFIGURAÇÕES" */}
          {/* ==================================================================== */}
          <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="px-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              Configurações
            </p>

            {/* Mudar Senha */}
            <button
              id="btn-change-password-sidebar"
              type="button"
              onClick={() => {
                onOpenChangePassword();
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 dark:hover:border-slate-750 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
            >
              <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Mudar Minha Senha</span>
            </button>

            {/* Privacidade & LGPD */}
            {onOpenLgpdModal && (
              <button
                id="btn-lgpd-sidebar"
                type="button"
                onClick={() => {
                  onOpenLgpdModal();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 dark:hover:border-slate-750 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Privacidade & LGPD</span>
              </button>
            )}

            {/* Modo Claro / Modo Escuro */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-850">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Tema do Sistema
                </span>
              </div>
              <ThemeToggle variant="full" />
            </div>
          </div>

        </div>

        {/* Rodapé: Botão "Sair da Conta" (Logout) */}
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
