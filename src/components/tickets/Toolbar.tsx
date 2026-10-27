import { ArrowUpDown, Building2, Columns3, Filter, Flag, Rows3, Search, Tag, UserCheck, Users, X, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { DEPARTMENTS, PRIORITIES, STATUSES } from '../../constants/config';
import { SORT_LABELS } from '../../hooks/useTicketFilters';
import type { Department, SortOption, TicketFilters, UserProfile, ViewMode } from '../../types/ticket';
import { isPresident } from '../../utils/rbac';

interface ToolbarProps {
  filters: TicketFilters;
  onFilterChange: <K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => void;
  onReset: () => void;
  activeFilterCount: number;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  resultCount: number;
  totalCount: number;
  currentUser?: UserProfile | null;
  myTicketsOnly?: boolean;
  onToggleMyTickets?: () => void;
}

interface FilterSelectProps {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  active?: boolean;
}

function FilterSelect({ id, label, icon: Icon, value, onChange, children, active }: FilterSelectProps) {
  return (
    <label htmlFor={id} className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <Icon
        className={`pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 ${
          active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
        }`}
      />
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full min-h-[44px] sm:min-h-[38px] cursor-pointer appearance-none rounded-xl border py-2 pr-8 pl-9 text-xs sm:text-sm transition outline-none focus:ring-4 focus:ring-blue-500/10 ${
          active
            ? 'border-blue-300 bg-blue-50/70 text-blue-900 font-semibold shadow-2xs dark:border-blue-500/60 dark:bg-blue-950/60 dark:text-blue-200'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600'
        }`}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </label>
  );
}

/** Barra de busca, filtros combinados (incluindo Setor Responsável), ordenação e alternância de visualização. */
export function Toolbar({
  filters,
  onFilterChange,
  onReset,
  activeFilterCount,
  view,
  onViewChange,
  resultCount,
  totalCount,
  currentUser,
  myTicketsOnly = false,
  onToggleMyTickets,
}: ToolbarProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isPresidentUser = isPresident(currentUser);

  return (
    <section
      aria-label="Busca e filtros"
      className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs sm:p-4 dark:border-slate-800/90 dark:bg-slate-900 transition-colors duration-200"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Campo de Busca Principal */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            id="ticket-search"
            type="search"
            value={filters.search}
            onChange={(event) => onFilterChange('search', event.target.value)}
            placeholder="Buscar por título, ID (ex.: TS-1001), solicitante ou categoria..."
            className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm text-slate-800 transition outline-none placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-400 [&::-webkit-search-cancel-button]:hidden"
            aria-label="Buscar chamados"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange('search', '')}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botão retrátil de Filtros para Mobile/Tablet */}
          <button
            id="toggle-mobile-filters"
            type="button"
            onClick={() => setMobileFiltersOpen((open) => !open)}
            className="btn-secondary flex-1 lg:hidden text-xs py-2 min-h-[44px]"
            aria-expanded={mobileFiltersOpen}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filtros e Busca</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Filtro Rápido: Meus Chamados */}
          {onToggleMyTickets && (
            <button
              id="toggle-my-tickets-btn"
              type="button"
              onClick={onToggleMyTickets}
              className={`flex min-h-[38px] sm:min-h-[34px] cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all ${
                myTicketsOnly
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-2xs dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400'
              }`}
              title="Filtrar chamados atribuídos a você ou abertos por você"
            >
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Meus Chamados</span>
              <span className="sm:hidden">Meus</span>
            </button>
          )}

          {/* Alternador de Modo de Visualização: Tabela / Kanban */}
          <div
            className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800"
            role="tablist"
            aria-label="Modo de visualização"
          >
            {(
              [
                { id: 'table', label: 'Tabela', icon: Rows3 },
                { id: 'kanban', label: 'Kanban', icon: Columns3 },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              const selected = view === option.id;
              return (
                <button
                  key={option.id}
                  id={`view-${option.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onViewChange(option.id)}
                  className={`flex min-h-[38px] sm:min-h-[34px] cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                    selected
                      ? 'bg-white font-semibold text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grade de Filtros (retrátil no celular, visível por padrão no desktop) */}
      <div
        className={`${
          mobileFiltersOpen ? 'grid' : 'hidden'
        } mt-3 animate-fade-in grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid lg:grid-cols-5`}
      >
        {/* Setor Responsável (Isolamento por Departamento) */}
        {isPresidentUser ? (
          <FilterSelect
            id="filter-assigned-department"
            label="Setor Responsável"
            icon={Users}
            value={filters.assignedDepartment ?? 'all'}
            active={Boolean(filters.assignedDepartment && filters.assignedDepartment !== 'all')}
            onChange={(value) => onFilterChange('assignedDepartment', value as Department | 'all')}
          >
            <option value="all">Setor Responsável: Todos</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                Resp: {dept}
              </option>
            ))}
          </FilterSelect>
        ) : (
          <div className="relative block min-w-0">
            <Users className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-indigo-600 dark:text-indigo-400" />
            <div
              className="flex w-full min-h-[44px] sm:min-h-[38px] items-center rounded-xl border border-indigo-200 bg-indigo-50/70 py-2 pr-3 pl-9 text-xs sm:text-sm font-semibold text-indigo-900 shadow-2xs dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-200"
              title="Isolamento de Departamento ativo: Você visualiza apenas os chamados enviados para seu setor."
            >
              <span className="truncate">Setor: {currentUser?.department} (Isolado)</span>
            </div>
          </div>
        )}

        {/* Departamento de Origem */}
        <FilterSelect
          id="filter-department"
          label="Origem do Solicitante"
          icon={Building2}
          value={filters.department}
          active={filters.department !== 'all'}
          onChange={(value) => onFilterChange('department', value as TicketFilters['department'])}
        >
          <option value="all">Origem: Todos</option>
          {DEPARTMENTS.map((department) => (
            <option key={department} value={department}>
              Origem: {department}
            </option>
          ))}
        </FilterSelect>

        {/* Status */}
        <FilterSelect
          id="filter-status"
          label="Status"
          icon={Tag}
          value={filters.status}
          active={filters.status !== 'all'}
          onChange={(value) => onFilterChange('status', value as TicketFilters['status'])}
        >
          <option value="all">Status: Todos</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </FilterSelect>

        {/* Prioridade */}
        <FilterSelect
          id="filter-priority"
          label="Prioridade"
          icon={Flag}
          value={filters.priority}
          active={filters.priority !== 'all'}
          onChange={(value) => onFilterChange('priority', value as TicketFilters['priority'])}
        >
          <option value="all">Prioridade: Todas</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </FilterSelect>

        {/* Ordenação */}
        <FilterSelect
          id="filter-sort"
          label="Ordenação"
          icon={ArrowUpDown}
          value={filters.sort}
          onChange={(value) => onFilterChange('sort', value as SortOption)}
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </FilterSelect>
      </div>

      {/* Contagem de resultados e botão para limpar filtros */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p>
          Exibindo <strong className="text-slate-800 dark:text-slate-200">{resultCount}</strong> de{' '}
          <strong className="text-slate-800 dark:text-slate-200">{totalCount}</strong> chamado(s)
          {activeFilterCount > 0 && <span className="text-blue-600 dark:text-blue-400"> · {activeFilterCount} filtro(s) ativo(s)</span>}
        </p>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="font-medium text-rose-600 hover:underline dark:text-rose-400 min-h-[36px] flex items-center"
          >
            Limpar todos os filtros
          </button>
        )}
      </div>
    </section>
  );
}
