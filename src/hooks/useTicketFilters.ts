import { useCallback, useMemo, useState } from 'react';
import { PRIORITY_WEIGHT } from '../constants/config';
import type { SortOption, Ticket, TicketFilters } from '../types/ticket';
import { normalizeText } from '../utils/format';
import { isClosedStatus } from '../utils/sla';

export const DEFAULT_FILTERS: TicketFilters = {
  search: '',
  department: 'all',
  assignedDepartment: 'all',
  status: 'all',
  priority: 'all',
  sort: 'recent',
};

export const SORT_LABELS: Record<SortOption, string> = {
  recent: 'Mais recentes',
  oldest: 'Mais antigos',
  priority: 'Maior prioridade',
  sla: 'Prazo de SLA',
};

const comparators: Record<SortOption, (a: Ticket, b: Ticket) => number> = {
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  priority: (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || a.createdAt.localeCompare(b.createdAt),
  // Chamados ativos com prazo mais próximo primeiro; concluídos vão para o final.
  sla: (a, b) => {
    const closedA = isClosedStatus(a.status);
    const closedB = isClosedStatus(b.status);
    if (closedA !== closedB) return closedA ? 1 : -1;
    return a.slaDueAt.localeCompare(b.slaDueAt);
  },
};

/** Busca textual, filtros combinados e ordenação dinâmica dos chamados. */
export function useTicketFilters(tickets: Ticket[]) {
  const [filters, setFilters] = useState<TicketFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback(<K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const filtered = useMemo(() => {
    const term = normalizeText(filters.search);
    const result = tickets.filter((ticket) => {
      if (filters.department !== 'all' && ticket.department !== filters.department) return false;
      if (
        filters.assignedDepartment &&
        filters.assignedDepartment !== 'all' &&
        (ticket.assignedDepartment ?? ticket.department) !== filters.assignedDepartment
      ) {
        return false;
      }
      if (filters.status !== 'all' && ticket.status !== filters.status) return false;
      if (filters.priority !== 'all' && ticket.priority !== filters.priority) return false;
      if (!term) return true;
      return [ticket.id, ticket.title, ticket.requester, ticket.email, ticket.category].some((value) =>
        normalizeText(value).includes(term),
      );
    });
    return [...result].sort(comparators[filters.sort]);
  }, [tickets, filters]);

  const activeFilterCount =
    [filters.department, filters.assignedDepartment, filters.status, filters.priority].filter(
      (value) => value && value !== 'all',
    ).length + (filters.search.trim() ? 1 : 0);

  return { filters, updateFilter, resetFilters, filtered, activeFilterCount };
}
