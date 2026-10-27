import { ArrowRight, GripVertical, MoveRight, Trash2, Users } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { STATUS_TRANSITIONS, STATUSES } from '../../constants/config';
import { STATUS_STYLES } from '../../constants/styles';
import type { Status, Ticket } from '../../types/ticket';
import { formatRelative } from '../../utils/format';
import { getAllowedTargets } from '../../utils/workflow';
import { Avatar } from '../ui/Avatar';
import { PriorityBadge } from '../ui/Badges';
import { SlaIndicator } from '../ui/SlaIndicator';

interface KanbanBoardProps {
  tickets: Ticket[];
  now: number;
  onOpen: (ticket: Ticket) => void;
  onChangeStatus: (id: string, to: Status) => void;
  onDelete?: (ticket: Ticket) => void;
  canDelete?: boolean;
}

const DRAG_MIME = 'text/plain';

/**
 * Quadro Kanban interativo com arrastar-e-soltar e destaque para departamento responsável.
 */
export function KanbanBoard({ tickets, now, onOpen, onChangeStatus, onDelete, canDelete = false }: KanbanBoardProps) {
  const [dragging, setDragging] = useState<Ticket | null>(null);
  const [overColumn, setOverColumn] = useState<Status | null>(null);

  const allowedTargets = dragging ? getAllowedTargets(dragging.status) : [];

  const handleDrop = (event: DragEvent, status: Status) => {
    event.preventDefault();
    const id = event.dataTransfer.getData(DRAG_MIME);
    setOverColumn(null);
    setDragging(null);
    const ticket = tickets.find((item) => item.id === id);
    if (ticket && ticket.status !== status) onChangeStatus(id, status);
  };

  return (
    <div className="-mx-4 animate-fade-in overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      <div className="grid snap-x snap-mandatory auto-cols-[minmax(17.5rem,85vw)] grid-flow-col gap-4 sm:auto-cols-[19rem] 2xl:auto-cols-fr">
        {STATUSES.map((status) => {
          const style = STATUS_STYLES[status];
          const Icon = style.icon;
          const columnTickets = tickets.filter((ticket) => ticket.status === status);
          const isAllowed = !dragging || dragging.status === status || allowedTargets.includes(status);
          const isOver = overColumn === status && dragging && dragging.status !== status;

          return (
            <section
              key={status}
              aria-label={`Coluna ${status}`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (overColumn !== status) setOverColumn(status);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverColumn(null);
              }}
              onDrop={(event) => handleDrop(event, status)}
              className={`flex max-h-[calc(100vh-14rem)] min-h-[26rem] snap-start flex-col rounded-xl border bg-slate-100/60 dark:bg-slate-900/60 p-2.5 transition-all duration-200 ${
                isOver
                  ? isAllowed
                    ? `ring-2 ${style.columnGlow} border-blue-400 bg-blue-50/40 dark:bg-blue-950/40`
                    : 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/40'
                  : 'border-slate-200/90 dark:border-slate-800'
              } ${dragging && !isAllowed ? 'opacity-50' : ''}`}
            >
              <header className="flex items-center justify-between gap-2 px-2.5 pt-2 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-slate-700 shadow-2xs border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">{status}</h3>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {columnTickets.length}
                </span>
              </header>

              <div className="flex-1 space-y-2.5 overflow-y-auto px-1 py-1">
                {columnTickets.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-xs font-medium text-slate-400 dark:text-slate-500">
                    {dragging && isAllowed && dragging.status !== status ? 'Solte para mover aqui' : 'Nenhum chamado'}
                  </div>
                ) : (
                  columnTickets.map((ticket) => (
                    <KanbanCard
                      key={ticket.id}
                      ticket={ticket}
                      now={now}
                      isDragging={dragging?.id === ticket.id}
                      onOpen={onOpen}
                      onChangeStatus={onChangeStatus}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(DRAG_MIME, ticket.id);
                        event.dataTransfer.effectAllowed = 'move';
                        setDragging(ticket);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setOverColumn(null);
                      }}
                      onDelete={onDelete}
                      canDelete={canDelete}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  ticket: Ticket;
  now: number;
  isDragging: boolean;
  onOpen: (ticket: Ticket) => void;
  onChangeStatus: (id: string, to: Status) => void;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
  onDelete?: (ticket: Ticket) => void;
  canDelete?: boolean;
}

function KanbanCard({ ticket, now, isDragging, onOpen, onChangeStatus, onDragStart, onDragEnd, onDelete, canDelete = false }: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const transitions = STATUS_TRANSITIONS[ticket.status];
  const assignedDept = ticket.assignedDepartment ?? ticket.department;

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(ticket)}
      onKeyDown={(event) => event.key === 'Enter' && onOpen(ticket)}
      tabIndex={0}
      role="button"
      aria-label={`${ticket.id}: ${ticket.title}`}
      className={`group relative cursor-grab rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none active:cursor-grabbing dark:border-slate-800 dark:bg-slate-850 dark:hover:border-slate-700 ${
        isDragging ? 'scale-95 opacity-50' : ''
      } ${menuOpen ? 'z-30 ring-2 ring-blue-500/20' : ''}`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {ticket.id}
          </span>
          <span className="inline-flex items-center gap-0.5 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-900/70 dark:bg-indigo-950/70 dark:text-indigo-300">
            <Users className="h-2.5 w-2.5 text-indigo-500 dark:text-indigo-400" />
            {assignedDept}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <PriorityBadge priority={ticket.priority} />
          <GripVertical className="hidden h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 md:block" />
        </div>
      </div>

      <h4 className="mt-2 line-clamp-2 font-sans text-sm leading-snug font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {ticket.title}
      </h4>
      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
        De {ticket.requester} ({ticket.department}) · {ticket.category}
      </p>

      <div className="mt-2.5">
        <SlaIndicator ticket={ticket} now={now} />
      </div>

      <footer className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Avatar name={ticket.assignee} size="xs" />
          <span className="truncate text-xs text-slate-600 dark:text-slate-300">{ticket.assignee ?? 'Fila geral'}</span>
        </div>
        <div
          className="relative"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMenuOpen(false);
          }}
        >
          <button
            id={`move-ticket-${ticket.id}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
            className="flex min-h-[36px] cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            Mover <MoveRight className="h-3 w-3" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute top-full right-0 z-30 mt-1 w-52 animate-scale-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                {formatRelative(ticket.updatedAt, now)} em {ticket.status}
              </p>
              {transitions.map((transition) => (
                <button
                  key={transition.to}
                  type="button"
                  role="menuitem"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onChangeStatus(ticket.id, transition.to);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <span>{transition.label}</span>
                  <span className="flex items-center gap-1 text-slate-400 dark:text-slate-400">
                    <ArrowRight className="h-3 w-3" />
                    <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[transition.to].dot}`} />
                  </span>
                </button>
              ))}
              {canDelete && onDelete && (
                <button
                  id={`kanban-delete-ticket-${ticket.id}`}
                  type="button"
                  role="menuitem"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onDelete(ticket);
                  }}
                  className="mt-1 flex w-full cursor-pointer items-center justify-between gap-2 border-t border-slate-100 pt-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  title="Excluir Chamado (Apenas Diretores)"
                >
                  <span>Excluir chamado</span>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </footer>
    </article>
  );
}
