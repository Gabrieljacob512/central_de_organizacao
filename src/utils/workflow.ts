import { STATUS_TRANSITIONS } from '../constants/config';
import type { ActionResult, Status, Ticket } from '../types/ticket';

/**
 * Valida se um chamado pode transitar para o status desejado
 * segundo o fluxo controlado definido em STATUS_TRANSITIONS.
 */
export function validateTransition(ticket: Ticket, to: Status): ActionResult {
  if (ticket.status === to) {
    return { ok: false, message: `O chamado ${ticket.id} já está em "${to}".` };
  }

  const allowed = STATUS_TRANSITIONS[ticket.status];
  if (!allowed.some((transition) => transition.to === to)) {
    const options = allowed.map((transition) => `"${transition.to}"`).join(' ou ');
    return {
      ok: false,
      message: `Transição não permitida: "${ticket.status}" → "${to}". A partir de "${ticket.status}" é possível ir para ${options}.`,
    };
  }

  if (to === 'Em Andamento' && !ticket.assignee) {
    return { ok: false, message: `Atribua um responsável ao chamado ${ticket.id} antes de iniciar o atendimento.` };
  }

  return { ok: true, message: '' };
}

/** Lista de status de destino permitidos a partir do status atual. */
export function getAllowedTargets(status: Status): Status[] {
  return STATUS_TRANSITIONS[status].map((transition) => transition.to);
}
