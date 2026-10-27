import type { Ticket } from '../types/ticket';

/** Gera um identificador único para eventos internos. */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Gera o próximo ID legível de chamado (TS-1001, TS-1002, ...). */
export function generateTicketId(tickets: Ticket[]): string {
  const highest = tickets.reduce((max, ticket) => {
    const value = Number.parseInt(ticket.id.replace(/\D/g, ''), 10);
    return Number.isFinite(value) && value > max ? value : max;
  }, 1000);
  return `TS-${highest + 1}`;
}
