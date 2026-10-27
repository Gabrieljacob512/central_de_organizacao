import { SLA_HOURS } from '../constants/config';
import type { Priority, Status, Ticket } from '../types/ticket';
import { formatDuration } from './format';

/**
 * Regras de cálculo e classificação do SLA (Service Level Agreement).
 */

const HOUR = 3_600_000;

/** Percentual restante do prazo abaixo do qual o chamado é considerado "em risco". */
const AT_RISK_THRESHOLD = 0.25;

export type SlaState = 'on_track' | 'at_risk' | 'breached' | 'met' | 'missed';

export interface SlaInfo {
  state: SlaState;
  label: string;
  detail: string;
  /** Percentual do prazo consumido (0–100). */
  consumed: number;
  /** Tempo restante em ms (negativo = atrasado). */
  remainingMs: number;
}

export const isClosedStatus = (status: Status): boolean => status === 'Resolvido' || status === 'Fechado';

/** Calcula a data-limite do SLA a partir da data de abertura e prioridade. */
export function computeSlaDueAt(createdAtIso: string, priority: Priority): string {
  return new Date(new Date(createdAtIso).getTime() + SLA_HOURS[priority] * HOUR).toISOString();
}

/** Descrição textual do prazo. Ex.: "4 horas", "3 dias". */
export function describeSlaHours(priority: Priority): string {
  const hours = SLA_HOURS[priority];
  if (hours % 24 === 0) {
    const days = hours / 24;
    return days === 1 ? '24 horas (1 dia útil)' : `${days} dias`;
  }
  return `${hours} horas`;
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/** Classifica o SLA do chamado no instante `now`. */
export function getSlaInfo(ticket: Ticket, now: number): SlaInfo {
  const created = new Date(ticket.createdAt).getTime();
  const due = new Date(ticket.slaDueAt).getTime();
  const total = Math.max(due - created, 1);

  if (isClosedStatus(ticket.status)) {
    const end = new Date(ticket.resolvedAt ?? ticket.updatedAt).getTime();
    const met = end <= due;
    return {
      state: met ? 'met' : 'missed',
      label: met ? 'SLA cumprido' : 'SLA violado',
      detail: `Concluído em ${formatDuration(end - created)}`,
      consumed: clamp(((end - created) / total) * 100),
      remainingMs: due - end,
    };
  }

  const remaining = due - now;
  const consumed = clamp(((now - created) / total) * 100);

  if (ticket.status === 'Pendente') {
    return {
      state: 'on_track',
      label: 'Relógio Pausado',
      detail: 'SLA congelado (status Pendente)',
      consumed,
      remainingMs: remaining,
    };
  }

  const TWO_HOURS = 2 * HOUR;

  if (remaining <= 0) {
    return { state: 'breached', label: 'Atrasado', detail: `Vencido há ${formatDuration(remaining)}`, consumed: 100, remainingMs: remaining };
  }
  if (remaining < TWO_HOURS || remaining <= total * AT_RISK_THRESHOLD) {
    return { state: 'at_risk', label: 'Próximo do Estouro (< 2h)', detail: `Restam ${formatDuration(remaining)}`, consumed, remainingMs: remaining };
  }
  return { state: 'on_track', label: 'No prazo', detail: `Restam ${formatDuration(remaining)}`, consumed, remainingMs: remaining };
}

export const SLA_STATE_STYLES: Record<SlaState, { text: string; bar: string; chip: string }> = {
  on_track: { text: 'text-emerald-700 dark:text-emerald-400', bar: 'from-emerald-500 to-teal-500', chip: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300' },
  at_risk: { text: 'text-amber-700 dark:text-amber-400', bar: 'from-amber-400 to-orange-500', chip: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300' },
  breached: { text: 'text-rose-700 dark:text-rose-400 font-semibold', bar: 'from-rose-500 to-red-600', chip: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300' },
  met: { text: 'text-emerald-700 dark:text-emerald-400', bar: 'from-emerald-500 to-teal-500', chip: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300' },
  missed: { text: 'text-rose-700 dark:text-rose-400', bar: 'from-rose-500 to-red-600', chip: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300' },
};
