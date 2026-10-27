import { Columns3, Plus, Rows3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { loadChamadosViewPreference, saveChamadosViewPreference } from '../../services/storage';
import type { Status, Ticket, TicketFilters, UserProfile } from '../../types/ticket';
import { canDeleteTicket } from '../../utils/rbac';
import { EmptyState } from '../ui/EmptyState';
import { KanbanBoard } from './KanbanBoard';
import { TicketTable } from './TicketTable';
import { Toolbar } from './Toolbar';

interface UnifiedTicketsViewProps {
  tickets: Ticket[];
  currentUser: UserProfile | null;
  now: number;
  filters: TicketFilters;
  onFilterChange: <K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => void;
  onResetFilters: () => void;
  activeFilterCount: number;
  onSelectTicket: (id: string) => void;
  onRequestDelete: (ticket: Ticket) => void;
  onChangeStatus: (id: string, to: Status) => void;
  onNewTicket: () => void;
  initialViewMode?: 'table' | 'kanban';
}

/**
 * Página unificada de Chamados (Seção 10).
 * Substitui os itens separados "Quadro Kanban" e "Chamados em lista".
 * Controle Lista | Kanban no topo, compartilhando os mesmos filtros e dados.
 */
export function UnifiedTicketsView({
  tickets,
  currentUser,
  now,
  filters,
  onFilterChange,
  onResetFilters,
  activeFilterCount,
  onSelectTicket,
  onRequestDelete,
  onChangeStatus,
  onNewTicket,
  initialViewMode,
}: UnifiedTicketsViewProps) {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(() => {
    if (initialViewMode) return initialViewMode;
    return loadChamadosViewPreference();
  });

  const canDelete = canDeleteTicket(currentUser);

  // Lembrar a última visualização escolhida pelo usuário
  const handleViewModeChange = (mode: 'table' | 'kanban') => {
    setViewMode(mode);
    saveChamadosViewPreference(mode);
  };

  // No celular, o padrão é Lista
  useEffect(() => {
    if (window.innerWidth < 640 && !initialViewMode) {
      setViewMode('table');
    }
  }, [initialViewMode]);

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Página com Alternador Lista | Kanban e Botão Novo Chamado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            Chamados
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gerencie e acompanhe as solicitações em visualização de tabela ou fluxo Kanban.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Alternador Lista | Kanban */}
          <div
            className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800"
            role="tablist"
            aria-label="Alternar visualização de chamados"
          >
            <button
              id="unified-view-table-btn"
              type="button"
              role="tab"
              aria-selected={viewMode === 'table'}
              onClick={() => handleViewModeChange('table')}
              className={`flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Rows3 className="h-4 w-4" />
              <span>Lista</span>
            </button>

            <button
              id="unified-view-kanban-btn"
              type="button"
              role="tab"
              aria-selected={viewMode === 'kanban'}
              onClick={() => handleViewModeChange('kanban')}
              className={`flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Columns3 className="h-4 w-4" />
              <span>Kanban</span>
            </button>
          </div>

          {/* Botão Novo Chamado */}
          <button
            id="unified-new-ticket-btn"
            type="button"
            onClick={onNewTicket}
            className="btn-primary min-h-[40px] text-xs px-3.5 py-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Chamado</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Compartilhada */}
      <Toolbar
        filters={filters}
        onFilterChange={onFilterChange}
        onReset={onResetFilters}
        activeFilterCount={activeFilterCount}
        view={viewMode}
        onViewChange={(v) => handleViewModeChange(v === 'kanban' ? 'kanban' : 'table')}
        resultCount={tickets.length}
        totalCount={tickets.length}
        currentUser={currentUser}
      />

      {/* Exibição: Tabela ou Kanban */}
      {tickets.length === 0 ? (
        <EmptyState
          title="Nenhum chamado encontrado"
          description="Nenhum registro corresponde aos filtros ou à busca aplicada. Experimente ajustar os critérios."
          action={
            <div className="flex gap-2">
              <button type="button" className="btn-secondary min-h-[44px]" onClick={onResetFilters}>
                Limpar filtros
              </button>
              <button type="button" className="btn-primary min-h-[44px]" onClick={onNewTicket}>
                <Plus className="h-4 w-4" /> Abrir chamado
              </button>
            </div>
          }
        />
      ) : viewMode === 'table' ? (
        <TicketTable
          tickets={tickets}
          now={now}
          onOpen={(t) => onSelectTicket(t.id)}
          onDelete={onRequestDelete}
          canDelete={canDelete}
        />
      ) : (
        <KanbanBoard
          tickets={tickets}
          now={now}
          onOpen={(t) => onSelectTicket(t.id)}
          onChangeStatus={onChangeStatus}
          onDelete={onRequestDelete}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}
