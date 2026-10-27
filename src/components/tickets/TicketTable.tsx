import { Eye, Trash2, Users } from 'lucide-react';
import type { Ticket } from '../../types/ticket';
import { formatRelative, formatShortDateTime } from '../../utils/format';
import { Avatar } from '../ui/Avatar';
import { PriorityBadge, StatusBadge } from '../ui/Badges';
import { SlaIndicator } from '../ui/SlaIndicator';

interface TicketTableProps {
  tickets: Ticket[];
  now: number;
  onOpen: (ticket: Ticket) => void;
  onDelete: (ticket: Ticket) => void;
  canDelete?: boolean;
}

/** Visualização em tabela profissional e cartões empilhados verticais para celular com suporte total a modo escuro. */
export function TicketTable({ tickets, now, onOpen, onDelete, canDelete = false }: TicketTableProps) {
  return (
    <>
      {/* Visualização Desktop / Tablet (Tabela Responsiva) */}
      <div className="hidden animate-fade-in overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs md:block dark:border-slate-800 dark:bg-slate-900 transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <th scope="col" className="px-5 py-3.5">Chamado</th>
                <th scope="col" className="px-3 py-3.5">Solicitante (Origem)</th>
                <th scope="col" className="px-3 py-3.5">Setor Responsável</th>
                <th scope="col" className="px-3 py-3.5">Prioridade</th>
                <th scope="col" className="px-3 py-3.5">Status</th>
                <th scope="col" className="px-3 py-3.5">Atendente</th>
                <th scope="col" className="px-3 py-3.5">SLA</th>
                <th scope="col" className="px-3 py-3.5">Aberto em</th>
                <th scope="col" className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tickets.map((ticket) => {
                const assignedDept = ticket.assignedDepartment ?? ticket.department;
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => onOpen(ticket)}
                    className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
                  >
                    <td className="max-w-[300px] px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                          {ticket.id}
                        </span>
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300">
                          {ticket.category}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-medium text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors">
                        {ticket.title}
                      </p>
                    </td>

                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={ticket.requester} size="xs" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{ticket.requester}</p>
                          <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                            {ticket.email} · <span className="font-medium text-slate-600 dark:text-slate-400">{ticket.department}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50/80 px-2 py-0.5 text-xs font-bold text-indigo-700 shadow-2xs dark:border-indigo-900/70 dark:bg-indigo-950/70 dark:text-indigo-300">
                        <Users className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                        {assignedDept}
                      </span>
                    </td>

                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <PriorityBadge priority={ticket.priority} />
                    </td>

                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <StatusBadge status={ticket.status} />
                    </td>

                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Avatar name={ticket.assignee} size="xs" />
                        <span className={`truncate text-xs ${ticket.assignee ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                          {ticket.assignee ?? 'Fila geral'}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <SlaIndicator ticket={ticket} now={now} />
                    </td>

                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{formatShortDateTime(ticket.createdAt)}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{formatRelative(ticket.createdAt, now)}</p>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        <button
                          id={`view-ticket-${ticket.id}`}
                          type="button"
                          className="icon-btn hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpen(ticket);
                          }}
                          aria-label={`Ver detalhes de ${ticket.id}`}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canDelete && (
                          <button
                            id={`delete-ticket-${ticket.id}`}
                            type="button"
                            className="icon-btn hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDelete(ticket);
                            }}
                            aria-label={`Excluir ${ticket.id}`}
                            title="Excluir Chamado (Apenas Diretores)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visualização Mobile: Cartões Empilhados Verticais com Touch Targets Confortáveis */}
      <ul className="space-y-3 md:hidden" aria-label="Lista de chamados mobile">
        {tickets.map((ticket, index) => {
          const assignedDept = ticket.assignedDepartment ?? ticket.department;
          return (
            <li key={ticket.id} className="animate-slide-up" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
              <article
                onClick={() => onOpen(ticket)}
                className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs cursor-pointer transition active:scale-[0.99] hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                role="button"
                tabIndex={0}
                onKeyDown={(event) => event.key === 'Enter' && onOpen(ticket)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                      {ticket.id}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-900/70 dark:bg-indigo-950/70 dark:text-indigo-300">
                      <Users className="h-2.5 w-2.5 text-indigo-500 dark:text-indigo-400" />
                      Resp: {assignedDept}
                    </span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      className="icon-btn -mt-1 -mr-1 min-h-[44px] min-w-[44px] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(ticket);
                      }}
                      aria-label={`Excluir ${ticket.id}`}
                      title="Excluir Chamado (Apenas Diretores)"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <h3 className="mt-2 font-sans text-sm leading-snug font-semibold text-slate-900 dark:text-white">
                  {ticket.title}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Por {ticket.requester} ({ticket.department}) · {formatRelative(ticket.createdAt, now)}
                </p>

                <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex flex-col gap-2">
                    <PriorityBadge priority={ticket.priority} />
                    <div className="flex items-center gap-1.5">
                      <Avatar name={ticket.assignee} size="xs" />
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {ticket.assignee ?? 'Fila geral'}
                      </span>
                    </div>
                  </div>
                  <SlaIndicator ticket={ticket} now={now} />
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}
