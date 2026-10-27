import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuditLogsModal } from './components/audit/AuditLogsModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { CalendarView } from './components/calendar/CalendarView';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MetricsCards } from './components/metrics/MetricsCards';
import { KanbanBoard } from './components/tickets/KanbanBoard';
import { TicketDetailsDrawer } from './components/tickets/TicketDetailsDrawer';
import { TicketFormModal } from './components/tickets/TicketFormModal';
import { TicketTable } from './components/tickets/TicketTable';
import { Toolbar } from './components/tickets/Toolbar';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { EmptyState } from './components/ui/EmptyState';
import { UserManagementModal } from './components/users/UserManagementModal';
import { PersonalWorkspaceView } from './components/workspace/PersonalWorkspaceView';
import { useAuditLogs } from './hooks/useAuditLogs';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { useCurrentUser } from './hooks/useCurrentUser';
import { usePersonalWorkspace } from './hooks/usePersonalWorkspace';
import { useTicketFilters } from './hooks/useTicketFilters';
import { useTickets } from './hooks/useTickets';
import { useToast } from './hooks/useToast';
import { useNow } from './hooks/useUi';
import { loadViewMode, saveViewMode } from './services/storage';
import type { AuthorRole, Department, Status, Ticket, TicketFormData, ViewMode } from './types/ticket';
import { formatDateTime, formatLongDate } from './utils/format';
import { canDeleteTicket, canManageUsers, filterTicketsForUser, getUserRoleBadgeInfo, isPresident } from './utils/rbac';

/**
 * Componente raiz: orquestra autenticação (Auth Guard), hierarquia de permissões (RBAC),
 * isolamento setorial de chamados por departamento, drawer lateral de navegação e configurações.
 */
export default function App() {
  const toast = useToast();
  const now = useNow();

  // Autenticação e Gestão de Usuário Ativo (Requisito 1 & 2)
  const {
    currentUser,
    usersList,
    login,
    addUser,
    deleteUser,
    resetPassword,
    changePassword,
    logout,
  } = useCurrentUser();

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);

  // Força a troca de senha no primeiro acesso caso mustChangePassword esteja ativo
  useEffect(() => {
    if (currentUser?.mustChangePassword) {
      setChangePasswordOpen(true);
      toast.info('Troca obrigatória de senha', 'Por razões de segurança, defina uma nova senha no primeiro acesso.');
    }
  }, [currentUser?.mustChangePassword, toast]);

  // Trilha de Auditoria (Requisito 2 & 4)
  const { logs: auditLogs, addAuditLog, clearLogs: clearAuditLogs } = useAuditLogs();
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  // Chamados brutos
  const { tickets, createTicket, updateTicket, changeStatus, assignTicket, addComment, deleteTicket, resetData } =
    useTickets(currentUser, addAuditLog);

  // 3. ISOLAMENTO DE CHAMADOS POR DEPARTAMENTO (Requisito 3)
  // Membros e Diretores só visualizam chamados do seu próprio departamento.
  // Presidente (Admin) tem permissão irrestrita para ver TODOS os chamados de todos os setores.
  const visibleTickets = useMemo(() => {
    return filterTicketsForUser(tickets, currentUser);
  }, [tickets, currentUser]);

  const { filters, updateFilter, resetFilters, filtered, activeFilterCount } = useTicketFilters(visibleTickets);

  const [view, setView] = useState<ViewMode>(loadViewMode);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 5. Espaço Privado e Calendário do Usuário (Requisitos 1, 2 e 3)
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
  const isPresidentUser = isPresident(currentUser);
  const roleBadge = getUserRoleBadgeInfo(currentUser);

  const selectedTicket = useMemo(
    () => visibleTickets.find((ticket) => ticket.id === selectedId) ?? null,
    [visibleTickets, selectedId],
  );

  useEffect(() => {
    saveViewMode(view);
  }, [view]);

  /* ----------------------------- Handlers ----------------------------- */

  const handleCreate = useCallback(
    (data: TicketFormData) => {
      const ticket = createTicket(data);
      setCreateOpen(false);
      toast.success(
        `Chamado ${ticket.id} aberto com sucesso`,
        `Atribuído ao setor de ${ticket.assignedDepartment ?? ticket.department} com SLA até ${formatDateTime(ticket.slaDueAt)}.`,
      );
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

  const handleConfirmReset = useCallback(() => {
    resetData();
    resetFilters();
    setSelectedId(null);
    setResetOpen(false);
    toast.info('Dados de demonstração restaurados', 'Os chamados de exemplo foram recarregados com sucesso.');
  }, [resetData, resetFilters, toast]);

  const openTicket = useCallback((ticket: Ticket) => setSelectedId(ticket.id), []);

  /* ---------------------- AUTH GUARD (Requisito 1) ---------------------- */

  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={login}
        onResetPassword={resetPassword}
        onSuccess={() => {}}
        showToast={toast}
      />
    );
  }

  /* ------------------------------ Render ------------------------------ */

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-800 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* 4. Menu Lateral Expansível (Slide Drawer) com Seção de Configurações */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
        view={view}
        onViewChange={setView}
        onOpenAuditLogs={() => setAuditModalOpen(true)}
        onResetData={() => setResetOpen(true)}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onOpenUserManagement={() => setUserManagementOpen(true)}
        onLogout={logout}
      />

      {/* 4. Cabeçalho Minimalista com Botão de 3 Traços */}
      <Header
        onToggleSidebar={() => setSidebarOpen(true)}
        onNewTicket={() => setCreateOpen(true)}
      />

      {/* Conteúdo Principal de Trabalho (100% de largura) */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* Saudação, Contexto e Badges de Hierarquia RBAC */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
            {formatLongDate(new Date(now))}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 mt-0.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              {view === 'calendar'
                ? 'Calendário Corporativo & Pessoal'
                : view === 'workspace'
                ? 'Espaço Privado de Organização'
                : 'Visão Geral das Solicitações'}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shadow-2xs ${roleBadge.badgeClass}`}
            >
              <span>{roleBadge.icon}</span>
              <span>
                {isPresidentUser
                  ? 'Presidente (Visão Irrestrita Global)'
                  : `${roleBadge.label} · Setor ${currentUser.department} (Isolamento Ativo)`}
              </span>
            </span>
          </div>
        </div>

        {/* 1. MÓDULO DE CALENDÁRIO (Requisito 2 e 3) */}
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

        {/* 2. ESPAÇO PRIVADO DO USUÁRIO (Requisito 1) */}
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

        {/* 3. MÓDULO DE CHAMADOS (LISTA OU KANBAN) */}
        {(view === 'table' || view === 'kanban') && (
          <>
            {/* Filtros Ativos Indicadores */}
            {filters.status !== 'all' ||
            filters.department !== 'all' ||
            (isPresidentUser && filters.assignedDepartment && filters.assignedDepartment !== 'all') ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Filtrando por:</span>
                {filters.status !== 'all' && (
                  <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                    Status: {filters.status}
                  </span>
                )}
                {isPresidentUser && filters.assignedDepartment && filters.assignedDepartment !== 'all' && (
                  <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
                    Setor Resp: {filters.assignedDepartment}
                  </span>
                )}
                {filters.department !== 'all' && (
                  <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                    Origem: {filters.department}
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-medium text-blue-600 hover:underline ml-1 dark:text-blue-400 cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            ) : null}

            {/* Cards de Métricas (Calculados com base nos chamados visíveis do setor / empresa) */}
            <MetricsCards tickets={visibleTickets} now={now} />

            {/* Barra de Busca e Filtros com Isolamento de Setor */}
            <Toolbar
              filters={filters}
              onFilterChange={updateFilter}
              onReset={resetFilters}
              activeFilterCount={activeFilterCount}
              view={view}
              onViewChange={setView}
              resultCount={filtered.length}
              totalCount={visibleTickets.length}
              currentUser={currentUser}
            />

            {/* Exibição Tabela ou Kanban com Controle de Permissão de Exclusão (Requisito 2 & 3) */}
            {filtered.length === 0 ? (
              visibleTickets.length === 0 ? (
                <EmptyState
                  title={`Nenhum chamado no setor de ${currentUser.department}`}
                  description={
                    isPresidentUser
                      ? 'Abra o primeiro chamado de suporte ou restaure os dados de demonstração pelo menu lateral.'
                      : `Seu departamento de ${currentUser.department} não possui nenhum chamado atribuído no momento.`
                  }
                  action={
                    <button type="button" className="btn-primary min-h-[44px]" onClick={() => setCreateOpen(true)}>
                      <Plus className="h-4 w-4" /> Abrir novo chamado
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  title="Nenhum chamado encontrado"
                  description="Nenhum resultado corresponde à busca e aos filtros selecionados. Ajuste os critérios ou limpe os filtros."
                  action={
                    <button type="button" className="btn-secondary min-h-[44px]" onClick={resetFilters}>
                      Limpar filtros aplicados
                    </button>
                  }
                />
              )
            ) : view === 'table' ? (
              <TicketTable
                tickets={filtered}
                now={now}
                onOpen={openTicket}
                onDelete={setDeleteTarget}
                canDelete={canDelete}
              />
            ) : (
              <KanbanBoard
                tickets={filtered}
                now={now}
                onOpen={openTicket}
                onChangeStatus={handleChangeStatus}
                onDelete={setDeleteTarget}
                canDelete={canDelete}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500 transition-colors duration-200 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Tecno System · Sistema de Service Desk & Gestão de Incidentes · RBAC & Isolamento Setorial por LocalStorage
      </footer>

      {/* Modais e Painéis */}
      <TicketFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        currentUser={currentUser}
        onOpenUserModal={() => {}}
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

      <ConfirmDialog
        open={resetOpen}
        variant="warning"
        title="Restaurar dados de demonstração"
        message="Todos os chamados atuais serão substituídos pelos chamados de exemplo. Esta ação não pode ser desfeita."
        confirmLabel="Restaurar"
        onConfirm={handleConfirmReset}
        onCancel={() => setResetOpen(false)}
      />

      {/* Modal de Alteração de Senha (Requisito 4) */}
      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        currentUser={currentUser}
        onChangePassword={changePassword}
        onSuccessToast={toast.success}
      />

      {/* Modal de Gerenciamento de Colaboradores (Exclusivo para Presidente e Diretor de RH - Requisito 2) */}
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

      {/* Modal de Trilha de Auditoria (Requisito 4) */}
      <AuditLogsModal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        logs={auditLogs}
        onClearLogs={clearAuditLogs}
      />
    </div>
  );
}
