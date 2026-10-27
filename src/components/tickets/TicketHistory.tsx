import { ArrowRightLeft, Headset, PencilLine, SendHorizontal, Sparkles, User, UserCheck, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { SERVICE_DESK_NAME } from '../../constants/config';
import type { AuthorRole, EventType, Ticket, TicketEvent } from '../../types/ticket';
import { formatDateTime, formatRelative } from '../../utils/format';
import { Avatar } from '../ui/Avatar';

const EVENT_ICONS: Record<Exclude<EventType, 'comment'>, { icon: LucideIcon; className: string }> = {
  created: { icon: Sparkles, className: 'bg-blue-50 text-blue-600' },
  status: { icon: ArrowRightLeft, className: 'bg-indigo-50 text-indigo-600' },
  assignment: { icon: UserCheck, className: 'bg-sky-50 text-sky-600' },
  update: { icon: PencilLine, className: 'bg-amber-50 text-amber-600' },
};

type CommentRole = Extract<AuthorRole, 'solicitante' | 'atendente'>;

interface TicketHistoryProps {
  ticket: Ticket;
  now: number;
  onComment: (author: string, role: CommentRole, message: string) => boolean;
}

/** Linha do tempo do chamado com conversa entre solicitante e atendente (estilo Front/Linear). */
export function TicketHistory({ ticket, now, onComment }: TicketHistoryProps) {
  const [role, setRole] = useState<CommentRole>('atendente');
  const [message, setMessage] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const authorName = role === 'atendente' ? (ticket.assignee ?? SERVICE_DESK_NAME) : ticket.requester;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [ticket.history.length]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (onComment(authorName, role, message)) setMessage('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit();
  };

  return (
    <div className="flex h-full flex-col">
      <ol className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
        {ticket.history.map((event) => (
          <HistoryItem key={event.id} event={event} now={now} />
        ))}
        <div ref={endRef} />
      </ol>

      <form onSubmit={submit} className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs dark:border-slate-800 dark:bg-slate-800" role="radiogroup" aria-label="Responder como">
            {(
              [
                { id: 'atendente', label: 'Atendente', icon: Headset },
                { id: 'solicitante', label: 'Solicitante', icon: User },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              const selected = role === option.id;
              return (
                <button
                  key={option.id}
                  id={`comment-role-${option.id}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(option.id)}
                  className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
                    selected ? 'bg-white font-semibold text-blue-700 shadow-2xs dark:bg-slate-900 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>
          <span className="truncate text-xs text-slate-500 dark:text-slate-400">
            respondendo como <span className="font-semibold text-slate-800 dark:text-slate-200">{authorName}</span>
          </span>
        </div>
        <div className="flex items-end gap-2">
          <label htmlFor="comment-message" className="sr-only">
            Mensagem
          </label>
          <textarea
            id="comment-message"
            rows={2}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={role === 'atendente' ? 'Responder ao solicitante...' : 'Enviar mensagem à equipe de atendimento...'}
            className="max-h-40 min-h-[2.75rem] flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-2xs dark:border-slate-750 dark:bg-slate-850 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400"
          />
          <button id="send-comment" type="submit" className="btn-primary h-11 w-11 shrink-0 p-0" aria-label="Enviar mensagem" title="Enviar (Ctrl + Enter)">
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 hidden text-[11px] text-slate-400 dark:text-slate-500 sm:block">Pressione Ctrl + Enter para enviar</p>
      </form>
    </div>
  );
}

function HistoryItem({ event, now }: { event: TicketEvent; now: number }) {
  if (event.type === 'comment') {
    const isAgent = event.role === 'atendente';
    return (
      <li className={`flex animate-slide-up gap-2.5 ${isAgent ? 'flex-row-reverse' : ''}`}>
        <Avatar name={event.author} size="sm" />
        <div className={`max-w-[85%] ${isAgent ? 'items-end text-right' : ''} flex flex-col`}>
          <div className={`mb-1 flex items-center gap-1.5 text-xs ${isAgent ? 'flex-row-reverse' : ''}`}>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{event.author}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                isAgent ? 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/80 dark:bg-blue-950/60 dark:text-blue-300' : 'border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {isAgent ? 'Atendente' : 'Solicitante'}
            </span>
            <time className="text-slate-400 text-[11px]" dateTime={event.createdAt} title={formatDateTime(event.createdAt)}>
              {formatRelative(event.createdAt, now)}
            </time>
          </div>
          <p
            className={`rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed whitespace-pre-wrap ${
              isAgent
                ? 'rounded-tr-xs bg-blue-600 text-white shadow-xs'
                : 'rounded-tl-xs border border-slate-200 bg-white text-slate-800 shadow-2xs dark:border-slate-750 dark:bg-slate-850 dark:text-slate-100'
            }`}
          >
            {event.message}
          </p>
        </div>
      </li>
    );
  }

  const meta = EVENT_ICONS[event.type];
  const Icon = meta.icon;
  return (
    <li className="flex animate-fade-in items-start gap-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200/80 ${meta.className}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 pt-0.5 text-xs">
        <p className="font-medium text-slate-700">{event.message}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {event.author} · <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
        </p>
      </div>
    </li>
  );
}
