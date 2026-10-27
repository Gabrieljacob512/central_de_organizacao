import {
  AlertCircle,
  ArrowUpDown,
  Eye,
  EyeOff,
  Search,
  Tag,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PRIORITIES, STATUSES } from '../../constants/config';
import type { Priority, Status, Ticket, UserProfile } from '../../types/ticket';
import { formatDateTime } from '../../utils/format';
import { isClosedStatus } from '../../utils/sla';
import { PriorityBadge, StatusBadge } from '../ui/Badges';
import { EmptyState } from '../ui/EmptyState';
import { SlaIndicator } from '../ui/SlaIndicator';

interface MyTicketsViewProps {
  tickets: Ticket[];
  currentUser: UserProfile | null;
  now: number;
  onSelectTicket: (id: string) => void;
  onNewTicket?: () => void;
}

type TabType = 'assigned' | 'requested';
type SortOption = 'sla' | 'recent' | 'priority';

/**
 * Página dedicada "Meus Chamados" (Seção 9).
 * Controle segmentado com abas "Atribuídos a mim" e "Abertos por mim",
 * contadores em tempo real, busca, filtros de status/prioridade,
 * ordenação por SLA, badges e toggle "Mostrar fechados".
 */
export function MyTicketsView({
  tickets,
  currentUser,
  now,
  onSelectTicket,
  onNewTicket,
}: MyTicketsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('assigned');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('sla');
  const [showClosed, setShowClosed] = useState(false);

  // 1. Filtrar chamados atribuídos ao usuário logado
  const assignedToMe = useMemo(() => {
    if (!currentUser) return [];
    return tickets.filter((t) => {
      if (t.assigneeId && currentUser.id) {
        return t.assigneeId === currentUser.id;
      }
      return t.assignee === currentUser.name;
    });
  }, [tickets, currentUser]);

  // 2. Filtrar chamados abertos pelo usuário logado
  const openedByMe = useMemo(() => {
    if (!currentUser) return [];
    return tickets.filter((t) => {
      if (t.requesterId && currentUser.id) {
        return t.requesterId === currentUser.id;
      }
      return (
        t.requester === currentUser.name ||
        t.email.toLowerCase() === currentUser.email.toLowerCase()
      );
    });
  }, [tickets, currentUser]);

  // Chamados da aba selecionada
  const currentTabTickets = activeTab === 'assigned' ? assignedToMe : openedByMe;

  // Filtragem e ordenação
  const processedTickets = useMemo(() => {
    let list = currentTabTickets;

    // Toggle "Mostrar fechados" (desligado por padrão)
    if (!showClosed) {
      list = list.filter((t) => !isClosedStatus(t.status));
    }

    // Busca por texto
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.requester.toLowerCase().includes(q)
      );
    }

    // Filtro por Status
    if (statusFilter !== 'all') {
      list = list.filter((t) => t.status === statusFilter);
    }

    // Filtro por Prioridade
    if (priorityFilter !== 'all') {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    // Ordenação
    return [...list].sort((a, b) => {
      if (sortBy === 'sla') {
        return new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime();
      }
      if (sortBy === 'priority') {
        const weights: Record<Priority, number> = { Crítica: 4, Alta: 3, Média: 2, Baixa: 1 };
        return weights[b.priority] - weights[a.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [currentTabTickets, showClosed, search, statusFilter, priorityFilter, sortBy]);

  return (
    <div className="space-y-4">
      {/* Subtítulo / Contexto */}
      <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
        Acompanhe suas atribuições de atendimento e os chamados abertos por você.
      </p>

      {/* Controle Segmentado de Abas com Contadores */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
        <div
          className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800"
          role="tablist"
          aria-label="Abas de Meus Chamados"
        >
          <button
            id="tab-assigned-to-me"
            type="button"
            role="tab"
            aria-selected={activeTab === 'assigned'}
            onClick={() => setActiveTab('assigned')}
            className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === 'assigned'
                ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Atribuídos a mim</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === 'assigned'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {assignedToMe.length}
            </span>
          </button>

          <button
            id="tab-opened-by-me"
            type="button"
            role="tab"
            aria-selected={activeTab === 'requested'}
            onClick={() => setActiveTab('requested')}
            className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === 'requested'
                ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Abertos por mim</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === 'requested'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {openedByMe.length}
            </span>
          </button>
        </div>

        {/* Toggle switch: Mostrar fechados (desligado por padrão) */}
        <label
          htmlFor="toggle-show-closed"
          className="flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 select-none dark:text-slate-300"
        >
          <input
            id="toggle-show-closed"
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer dark:border-slate-700 dark:bg-slate-800"
          />
          {showClosed ? (
            <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <EyeOff className="h-4 w-4 text-slate-400" />
          )}
          <span>Mostrar chamados fechados</span>
        </label>
      </div>

      {/* Barra de Filtros, Busca e Ordenação */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Campo de Busca */}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            id="my-tickets-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID, título..."
            className="w-full min-h-[44px] sm:min-h-[38px] rounded-xl border border-slate-200 bg-white py-2 pr-8 pl-9 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtro de Status */}
        <div className="relative">
          <Tag className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            id="my-tickets-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Status | 'all')}
            className="w-full min-h-[44px] sm:min-h-[38px] rounded-xl border border-slate-200 bg-white py-2 pr-8 pl-9 text-xs sm:text-sm text-slate-700 outline-none focus:border-blue-500 shadow-2xs cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">Status: Todos</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                Status: {st}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Prioridade */}
        <div className="relative">
          <AlertCircle className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            id="my-tickets-priority-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
            className="w-full min-h-[44px] sm:min-h-[38px] rounded-xl border border-slate-200 bg-white py-2 pr-8 pl-9 text-xs sm:text-sm text-slate-700 outline-none focus:border-blue-500 shadow-2xs cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">Prioridade: Todas</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                Prioridade: {p}
              </option>
            ))}
          </select>
        </div>

        {/* Ordenação por SLA / Recentes / Prioridade */}
        <div className="relative">
          <ArrowUpDown className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            id="my-tickets-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full min-h-[44px] sm:min-h-[38px] rounded-xl border border-slate-200 bg-white py-2 pr-8 pl-9 text-xs sm:text-sm text-slate-700 outline-none focus:border-blue-500 shadow-2xs cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="sla">Ordenar por: Prazo SLA</option>
            <option value="recent">Ordenar por: Mais Recentes</option>
            <option value="priority">Ordenar por: Maior Prioridade</option>
          </select>
        </div>
      </div>

      {/* Lista de Chamados / Tabela Amigável */}
      {processedTickets.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'assigned'
              ? 'Nenhum chamado atribuído a você'
              : 'Nenhum chamado aberto por você'
          }
          description={
            activeTab === 'assigned'
              ? 'Você não possui demandas sob sua responsabilidade direta no momento.'
              : 'Você ainda não registrou chamados de suporte no sistema.'
          }
          action={
            activeTab === 'requested' && onNewTicket ? (
              <button
                type="button"
                className="btn-primary min-h-[44px]"
                onClick={onNewTicket}
              >
                Abrir novo chamado
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {processedTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTicket(t.id)}
                className="group flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between cursor-pointer dark:hover:bg-slate-800/60"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {t.id}
                    </span>
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {t.category}
                    </span>
                  </div>

                  <h3 className="truncate text-sm font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {t.title}
                  </h3>

                  <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                    {t.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                    <span>
                      Solicitante: <strong className="text-slate-700 dark:text-slate-300">{t.requester}</strong> ({t.department})
                    </span>
                    {t.assignee && (
                      <span>
                        Responsável: <strong className="text-slate-700 dark:text-slate-300">{t.assignee}</strong>
                      </span>
                    )}
                    <span>Criado em: {formatDateTime(t.createdAt)}</span>
                  </div>
                </div>

                {/* SLA Indicator */}
                <div className="shrink-0 self-start sm:self-center">
                  <SlaIndicator
                    ticket={t}
                    now={now}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
