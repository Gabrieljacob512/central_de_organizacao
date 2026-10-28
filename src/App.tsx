import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuditLogsModal } from './components/audit/AuditLogsModal';
import { AuditView } from './components/audit/AuditView';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { CalendarView } from './components/calendar/CalendarView';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ExecutiveDashboardView } from './components/metrics/ExecutiveDashboardView';
import { OverviewView } from './components/overview/OverviewView';
import { SettingsView } from './components/settings/SettingsView';
import { MyTicketsView } from './components/tickets/MyTicketsView';
import { TicketDetailsDrawer } from './components/tickets/TicketDetailsDrawer';
import { TicketFormModal } from './components/tickets/TicketFormModal';
import { UnifiedTicketsView } from './components/tickets/UnifiedTicketsView';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { KnowledgeBaseModal } from './components/knowledge/KnowledgeBaseModal';
import { NotificationPreferencesModal } from './components/notifications/NotificationPreferencesModal';
import { FinanceView } from './components/finance/FinanceView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { PeopleView } from './components/people/PeopleView';
import { UserManagementModal } from './components/users/UserManagementModal';
import { PersonalWorkspaceView } from './components/workspace/PersonalWorkspaceView';
import { exportCalendarToIcs } from './services/differentiatorsService';

import { useAuditLogs } from './hooks/useAuditLogs';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { useCurrentUser } from './hooks/useCurrentUser';
import { useNotifications } from './hooks/useNotifications';
import { usePersonalWorkspace } from './hooks/usePersonalWorkspace';
import { useTicketFilters } from './hooks/useTicketFilters';
import { useTickets } from './hooks/useTickets';
import { useToast } from './hooks/useToast';
import { useNow } from './hooks/useUi';
import { loadViewMode, saveViewMode } from './services/storage';
import type { AuthorRole, Department, Status, Ticket, TicketFormData, ViewMode } from './types/ticket';
import { formatDateTime, formatLongDate } from './utils/format';
import { canDeleteTicket, canManageUsers, canViewAudit, filterTicketsForUser, getUserRoleBadgeInfo, getUserSubtitle } from './utils/rbac';

const VIEW_TITLES: Record<ViewMode, string> = {
  overview: 'Visão Geral das Solicitações',
  tickets: 'Central de Chamados',
  'my-tickets': 'Meus Chamados',
  notifications: 'Notificações',
  metrics: 'Painel Executivo & Métricas',
  finance: 'Gestão Financeira',
  people: 'Gestão de Pessoas & RH',
  workspace: 'Espaço Privado de Organização',
  calendar: 'Calendário Corporativo & Pessoal',
  audit: 'Trilha de Auditoria & Governança',
  settings: 'Configurações do Sistema',
  table: 'Central de Chamados',
  kanban: 'Central de Chamados',
};

/**
 * Componente raiz: orquestra autenticação (Auth Guard), hierarquia de permissões (RBAC),
 * isolamento setorial nos 4 departamentos (Financeiro, RH, Marketing e Projetos),
 * e alternância fluida entre as 10 telas e módulos da plataforma.
 */
export default function App() {
  const toast = useToast();
  const now = useNow();

  // Autenticação e Gestão de Usuário Ativo
  const {
    currentUser,
    usersList,
    login,
    addUser,
    deleteUser,
    resetPassword,
    changePassword,
    updateCurrentUser,
    logout,
  } = useCurrentUser();

  const { unreadCount } = useNotifications(currentUser?.id);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);

  // Força a troca de senha no primeiro acesso caso mustChangePassword esteja ativo
  useEffect(() => {
    if (currentUser?.mustChangePassword) {
      setChangePasswordOpen(true);
      toast.info('Troca obrigatória de senha', 'Por razões de segurança, defina uma nova senha no primeiro acesso.');
    }
  }, [currentUser?.mustChangePassword, toast]);

  // Trilha de Auditoria
  const { logs: auditLogs, addAuditLog, clearLogs: clearAuditLogs } = useAuditLogs();
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  // Chamados brutos
  const { tickets, createTicket, updateTicket, changeStatus, assignTicket, addComment, deleteTicket } =
    useTickets(currentUser, addAuditLog);

  // ISOLAMENTO DE CHAMADOS POR DEPARTAMENTO
  // Membros e Diretores só visualizam chamados do seu próprio departamento.
  // Presidente tem permissão irrestrita para ver TODOS os chamados.
  const visibleTickets = useMemo(() => {
    return filterTicketsForUser(tickets, currentUser);
  }, [tickets, currentUser]);

  const { filters, updateFilter, resetFilters, activeFilterCount } = useTicketFilters(visibleTickets);

  const [view, setView] = useState<ViewMode>(loadViewMode);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifPreferencesOpen, setNotifPreferencesOpen] = useState(false);
  const [kbModalOpen, setKbModalOpen] = useState(false);

  // Espaço Privado e Calendário do Usuário
  const {
    notes,
    tasks,
    privateEvents,
    updatedAt: workspaceUpdatedAt,
    updateNotes,
    addTask,
    toggleTask,
    deleteTask,
    addPrivateEvent,
    deletePrivateEvent,
  } = usePersonalWorkspace(currentUser);

  const {
    allEvents,
    canCreateGlobal,
    createEvent,
    deleteEvent,
  } = useCalendarEvents({
    currentUser,
    privateEvents,
    onAddPrivateEvent: addPrivateEvent,
    onDeletePrivateEvent: deletePrivateEvent,
  });

  const canDelete = canDeleteTicket(currentUser);
  const roleBadge = getUserRoleBadgeInfo(currentUser);

  const selectedTicket = useMemo(
    () => visibleTickets.find((ticket) => ticket.id === selectedId) ?? null,
    [visibleTickets, selectedId],
  );

  useEffect(() => {
    saveViewMode(view);
  }, [view]);

  // Proteção da tela de auditoria contra acessos indevidos
  useEffect(() => {
    if (view === 'audit' && !canViewAudit(currentUser)) {
      toast.error('Acesso negado', 'Apenas Diretores e o Presidente possuem permissão para visualizar auditoria.');
    }
  }, [view, currentUser, toast]);

  /* ----------------------------- Handlers ----------------------------- */

  const handleCreate = useCallback(
    (data: TicketFormData): Ticket => {
      const ticket = createTicket(data);
      toast.success(
        `Chamado ${ticket.id} aberto com sucesso`,
        `Atribuído ao setor de ${ticket.assignedDepartment ?? ticket.department} com SLA até ${formatDateTime(ticket.slaDueAt)}.`,
      );
      return ticket;
    },
    [createTicket, toast],
  );

  const handleChangeStatus = useCallback(
    (id: string, to: Status) => {
      const result = changeStatus(id, to);
      if (result.ok) toast.success('Status atualizado', result.message);
      else toast.warning('Ação não permitida', result.message);
    },
    [changeStatus, toast],
  );

  const handleAssign = useCallback(
    (id: string, assignee: string | null, assignedDepartment?: Department) => {
      const result = assignTicket(id, assignee, assignedDepartment);
      if (result.ok) toast.success('Atribuição salva', result.message);
      else toast.error('Falha ao atribuir', result.message);
    },
    [assignTicket, toast],
  );

  const handleUpdate = useCallback(
    (id: string, data: TicketFormData): boolean => {
      const result = updateTicket(id, data);
      if (result.ok) {
        toast.success('Chamado atualizado', result.message);
        return true;
      }
      toast.error('Não foi possível salvar', result.message);
      return false;
    },
    [updateTicket, toast],
  );

  const handleComment = useCallback(
    (id: string, author: string, role: AuthorRole, message: string): boolean => {
      const result = addComment(id, author, role, message);
      if (result.ok) {
        toast.success('Comentário enviado', result.message);
        return true;
      }
      toast.error('Erro ao comentar', result.message);
      return false;
    },
    [addComment, toast],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;

    if (!canDelete) {
      toast.error('Acesso restrito', 'Apenas Diretores e o Presidente possuem permissão para excluir chamados.');
      setDeleteTarget(null);
      return;
    }

    const result = deleteTicket(deleteTarget.id);
    if (result.ok) {
      toast.success('Chamado excluído', result.message);
      if (selectedId === deleteTarget.id) setSelectedId(null);
    } else {
      toast.error('Falha ao excluir', result.message);
    }
    setDeleteTarget(null);
  }, [deleteTarget, canDelete, deleteTicket, selectedId, toast]);

  const handleViewChange = useCallback(
    (targetView: ViewMode) => {
      if (targetView === 'audit' && !canViewAudit(currentUser)) {
        toast.error('Acesso negado', 'Apenas Diretores e o Presidente possuem permissão para visualizar auditoria.');
        return;
      }
      setView(targetView);
    },
    [currentUser, toast],
  );

  /* ---------------------- AUTH GUARD ---------------------- */

  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={login}
        onSuccess={() => {}}
        showToast={toast}
      />
    );
  }

  /* ------------------------------ Render ------------------------------ */

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-800 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* Menu Lateral Retrátil (13 Itens Obrigatórios) */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
        view={view}
        onViewChange={handleViewChange}
        onLogout={logout}
        unreadNotificationsCount={unreadCount}
      />

      {/* Cabeçalho com Sino de Notificações em Tempo Real */}
      <Header
        onToggleSidebar={() => setSidebarOpen(true)}
        onNewTicket={() => setCreateOpen(true)}
        onSelectTicket={(ticketId) => {
          const t = visibleTickets.find((item) => item.id === ticketId) || tickets.find((item) => item.id === ticketId);
          if (t) setSelectedId(t.id);
        }}
        onOpenPreferences={() => setNotifPreferencesOpen(true)}
        onNavigate={handleViewChange}
        onLogout={logout}
      />

      {/* Conteúdo Principal de Trabalho */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* Saudação, Contexto e Badges de Hierarquia RBAC */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
            {formatLongDate(new Date(now))}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 mt-0.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              {VIEW_TITLES[view] ?? 'Central de Chamados'}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-2xs ${roleBadge.badgeClass}`}
            >
              <span>{roleBadge.icon}</span>
              <span>{getUserSubtitle(currentUser)}</span>
            </span>
          </div>
        </div>

        {/* 1. Visão Geral das Solicitações */}
        {view === 'overview' && (
          <OverviewView
            tickets={visibleTickets}
            currentUser={currentUser}
            now={now}
            onNavigate={handleViewChange}
            onSelectTicket={(id) => setSelectedId(id)}
            onNewTicket={() => setCreateOpen(true)}
            onOpenKnowledgeBase={() => setKbModalOpen(true)}
            onExportCalendarIcs={() => {
              exportCalendarToIcs(allEvents);
              toast.success('Calendário Exportado', 'O arquivo .ics foi gerado com sucesso.');
            }}
          />
        )}

        {/* 2. Chamados Unificado (Lista ou Kanban) */}
        {(view === 'tickets' || view === 'table' || view === 'kanban') && (
          <UnifiedTicketsView
            tickets={visibleTickets}
            currentUser={currentUser}
            now={now}
            filters={filters}
            onFilterChange={updateFilter}
            onResetFilters={resetFilters}
            activeFilterCount={activeFilterCount}
            onSelectTicket={(id) => setSelectedId(id)}
            onRequestDelete={setDeleteTarget}
            onChangeStatus={handleChangeStatus}
            onNewTicket={() => setCreateOpen(true)}
            initialViewMode={view === 'kanban' ? 'kanban' : 'table'}
          />
        )}

        {/* 3. Meus Chamados */}
        {view === 'my-tickets' && (
          <MyTicketsView
            tickets={visibleTickets}
            currentUser={currentUser}
            now={now}
            onSelectTicket={(id) => setSelectedId(id)}
            onNewTicket={() => setCreateOpen(true)}
          />
        )}

        {/* Notificações */}
        {view === 'notifications' && (
          <NotificationsView
            onSelectTicket={(id) => setSelectedId(id)}
          />
        )}

        {/* 4. Painel Executivo & Métricas */}
        {view === 'metrics' && (
          <ExecutiveDashboardView
            tickets={visibleTickets}
            currentUser={currentUser}
            now={now}
          />
        )}

        {/* Gestão Financeira */}
        {view === 'finance' && (
          <FinanceView currentUser={currentUser} />
        )}

        {/* Gestão de Pessoas & RH */}
        {view === 'people' && (
          <PeopleView currentUser={currentUser} />
        )}

        {/* 5. Espaço Privado do Usuário */}
        {view === 'workspace' && (
          <PersonalWorkspaceView
            currentUser={currentUser}
            notes={notes}
            tasks={tasks}
            privateEvents={privateEvents}
            updatedAt={workspaceUpdatedAt}
            onUpdateNotes={updateNotes}
            onAddTask={addTask}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onNavigateToCalendar={() => setView('calendar')}
          />
        )}

        {/* 6. Módulo de Calendário */}
        {view === 'calendar' && (
          <CalendarView
            currentUser={currentUser}
            events={allEvents}
            canCreateGlobal={canCreateGlobal}
            onCreateEvent={(input) => {
              const res = createEvent(input);
              if (res.success) {
                toast.success(
                  res.event?.scope === 'global' ? 'Evento corporativo criado' : 'Evento pessoal agendado',
                  res.event?.title,
                );
              } else {
                toast.error('Erro ao agendar evento', res.error);
              }
              return res;
            }}
            onDeleteEvent={(id) => {
              const res = deleteEvent(id);
              if (res.success) {
                toast.success('Compromisso excluído');
              } else {
                toast.error('Falha ao excluir', res.error);
              }
              return res;
            }}
          />
        )}

        {/* 7. Trilha de Auditoria */}
        {view === 'audit' && (
          <AuditView
            currentUser={currentUser}
            logs={auditLogs}
            onClearLogs={clearAuditLogs}
            onNavigateHome={() => setView('overview')}
          />
        )}

        {/* 8. Configurações do Sistema */}
        {view === 'settings' && (
          <SettingsView
            currentUser={currentUser}
            onProfileUpdated={(updated) => {
              updateCurrentUser(updated);
              addAuditLog({
                action: 'ALTERACAO_PERFIL',
                performedBy: `${updated.name} [${updated.role}] (${updated.email})`,
                details: `Perfil de ${updated.name} atualizado.`,
              });
            }}
            onPasswordChanged={() => {
              addAuditLog({
                action: 'ALTERACAO_PERFIL',
                performedBy: `${currentUser.name} [${currentUser.role}] (${currentUser.email})`,
                details: 'Senha de acesso alterada.',
              });
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500 transition-colors duration-200 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Tecno System · Sistema de Service Desk & Gestão de Incidentes · PostgreSQL, Supabase RLS & Edge Functions
      </footer>

      {/* Modais e Painéis Auxiliares */}
      <TicketFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        currentUser={currentUser}
        onOpenUserModal={() => setUserManagementOpen(true)}
      />

      <TicketDetailsDrawer
        ticket={selectedTicket}
        now={now}
        escapeDisabled={Boolean(deleteTarget)}
        onClose={() => setSelectedId(null)}
        onChangeStatus={handleChangeStatus}
        onAssign={handleAssign}
        onUpdate={handleUpdate}
        onComment={handleComment}
        onRequestDelete={setDeleteTarget}
        canDelete={canDelete}
      />

      {/* Modal de Confirmação de Exclusão (Apenas Diretores e Presidente) */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir chamado definitivamente"
        message="Como Diretor ou Presidente, você está prestes a excluir este chamado permanentemente. Esta ação não poderá ser desfeita."
        confirmLabel="Sim, excluir"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        {deleteTarget && (
          <div className="mt-3.5 rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/60 dark:bg-rose-950/40">
            <p className="font-mono text-xs font-semibold text-rose-700 dark:text-rose-400">{deleteTarget.id}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{deleteTarget.title}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {deleteTarget.requester} · Setor Responsável: {deleteTarget.assignedDepartment ?? deleteTarget.department} · {deleteTarget.history.length} registro(s) no histórico
            </p>
          </div>
        )}
      </ConfirmDialog>

      {/* Modal de Alteração de Senha */}
      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        currentUser={currentUser}
        onChangePassword={changePassword}
        onSuccessToast={toast.success}
      />

      {/* Modal de Gerenciamento de Colaboradores (Exclusivo para Presidente e Diretor de RH) */}
      {canManageUsers(currentUser) && (
        <UserManagementModal
          open={userManagementOpen}
          onClose={() => setUserManagementOpen(false)}
          currentUser={currentUser}
          usersList={usersList}
          onAddUser={(data) => {
            const res = addUser(data);
            if (res.success && res.user) {
              addAuditLog({
                action: 'CADASTRO_COLABORADOR',
                performedBy: `${currentUser.name} [${currentUser.role}] (${currentUser.email})`,
                details: `Novo colaborador cadastrado: ${res.user.name} (${res.user.email}) com cargo ${res.user.role} e departamento ${res.user.department}.`,
              });
            }
            return res;
          }}
          onDeleteUser={async (userId) => {
            const res = await deleteUser(userId);
            if (res.success && res.user) {
              addAuditLog({
                action: 'EXCLUSAO_COLABORADOR',
                performedBy: `${currentUser.name} [${currentUser.role}] (${currentUser.email})`,
                details: `Colaborador desativado: ${res.user.name} (${res.user.email}).`,
              });
            }
            return res;
          }}
        />
      )}

      {/* Modal de Trilha de Auditoria (Acesso rápido opcional) */}
      <AuditLogsModal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        logs={auditLogs}
        onClearLogs={clearAuditLogs}
      />

      {/* Modal de Preferências de Notificação */}
      <NotificationPreferencesModal
        open={notifPreferencesOpen}
        onClose={() => setNotifPreferencesOpen(false)}
      />

      {/* Modal da Base de Conhecimento */}
      <KnowledgeBaseModal
        open={kbModalOpen}
        onClose={() => setKbModalOpen(false)}
      />
    </div>
  );
}
