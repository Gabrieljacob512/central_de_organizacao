import {
  ArrowRightLeft,
  Check,
  Headset,
  Lock,
  MessageSquare,
  Paperclip,
  Pencil,
  PencilLine,
  SendHorizontal,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { SERVICE_DESK_NAME } from '../../constants/config';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
  createTicketComment,
  deleteTicketComment,
  fetchTicketComments,
  subscribeToComments,
  updateTicketComment,
} from '../../services/commentService';
import type { AuthorRole, EventType, Ticket, TicketEvent } from '../../types/ticket';
import { formatDateTime, formatRelative } from '../../utils/format';
import { canViewAudit } from '../../utils/rbac';
import { Avatar } from '../ui/Avatar';
import { AttachmentCard, type PendingFileItem } from './AttachmentCard';
import { AttachmentUploader } from './AttachmentUploader';

const EVENT_ICONS: Record<Exclude<EventType, 'comment'>, { icon: LucideIcon; className: string }> = {
  created: { icon: Sparkles, className: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
  status: { icon: ArrowRightLeft, className: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' },
  assignment: { icon: UserCheck, className: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400' },
  assigned: { icon: UserCheck, className: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400' },
  update: { icon: PencilLine, className: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
  attachment: { icon: Paperclip, className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
  reopened: { icon: ArrowRightLeft, className: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
};

type CommentRole = Extract<AuthorRole, 'solicitante' | 'atendente'>;

interface TicketHistoryProps {
  ticket: Ticket;
  now: number;
  onComment: (author: string, role: CommentRole, message: string) => boolean;
}

/** Destaca menções @Nome com badge estilizado */
function renderMessageWithMentions(text: string) {
  const parts = text.split(/(@[a-zA-Z0-9._-]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={index}
          className="rounded-md bg-blue-100/80 px-1 py-0.5 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export function TicketHistory({ ticket, now, onComment }: TicketHistoryProps) {
  const { currentUser } = useCurrentUser();
  const [role, setRole] = useState<CommentRole>('atendente');
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public');
  const [message, setMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Histórico em tempo real
  const [liveEvents, setLiveEvents] = useState<TicketEvent[]>(ticket.history);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const endRef = useRef<HTMLDivElement>(null);
  const authorName = role === 'atendente' ? (ticket.assignee ?? SERVICE_DESK_NAME) : ticket.requester;

  const canInternalNotes =
    currentUser?.role?.includes('Presidente') ||
    currentUser?.role?.includes('Diretor') ||
    currentUser?.permissions?.includes('internal_notes.view') ||
    currentUser?.permissions?.includes('ticket.view_all');

  // Recarregar comentários ao abrir ou quando houver mudança no ticket
  const reloadComments = async () => {
    try {
      const dbComments = await fetchTicketComments(ticket.id);
      if (dbComments.length > 0) {
        // Mesclar eventos de sistema que não são comentários (status, atribuição, etc.) com os comentários reais do banco
        const systemEvents = ticket.history.filter((e) => e.type !== 'comment');
        const combined = [...systemEvents, ...dbComments].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setLiveEvents(combined);
      } else {
        setLiveEvents(ticket.history);
      }
    } catch {
      setLiveEvents(ticket.history);
    }
  };

  useEffect(() => {
    reloadComments();
    const unsubscribe = subscribeToComments(ticket.id, () => {
      reloadComments();
    });
    return () => unsubscribe();
  }, [ticket.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [liveEvents.length]);

  // Captura de Ctrl+V / paste de imagens e arquivos
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToAttach: PendingFileItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          if (file.size > 1048576) {
            setUploadError(`Arquivo colado excede 1 MB (${(file.size / 1024 / 1024).toFixed(2)} MB).`);
            continue;
          }
          filesToAttach.push({
            id: crypto.randomUUID(),
            file,
            description: 'Colado da área de transferência',
          });
        }
      }
    }

    if (filesToAttach.length > 0) {
      setPendingFiles((prev) => [...prev, ...filesToAttach].slice(0, 5));
      setShowUploader(true);
    }
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!message.trim() && pendingFiles.length === 0) return;

    setIsSubmitting(true);
    setUploadError(null);

    try {
      // Criação persistida no Supabase com suporte a anexos e visibilidade
      const res = await createTicketComment({
        ticketId: ticket.id,
        body: message,
        visibility,
        files: pendingFiles.map((p) => ({ file: p.file, description: p.description })),
      });

      if (res.success && res.event) {
        setLiveEvents((prev) => [...prev, res.event!]);
        setMessage('');
        setPendingFiles([]);
        setShowUploader(false);
      } else {
        // Fallback local caso RPC esteja offline
        onComment(authorName, role, message);
        setMessage('');
        setPendingFiles([]);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao enviar comentário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit();
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editingText.trim()) return;
    const res = await updateTicketComment(commentId, editingText);
    if (res.success) {
      setLiveEvents((prev) =>
        prev.map((e) => (e.id === commentId ? { ...e, message: editingText, editedAt: new Date().toISOString() } : e))
      );
      setEditingCommentId(null);
      setEditingText('');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (confirm('Deseja excluir este comentário?')) {
      const res = await deleteTicketComment(commentId);
      if (res.success) {
        setLiveEvents((prev) => prev.filter((e) => e.id !== commentId));
      }
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Lista de Mensagens / Timeline */}
      <ol className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
        {liveEvents.map((event) => {
          // Filtrar eventos técnicos se o usuário não tiver permissão audit.view (Seção 5)
          if (event.type !== 'comment' && !canViewAudit(currentUser)) {
            return null;
          }

          // Filtrar notas internas para quem não tem permissão
          if (event.visibility === 'internal' && !canInternalNotes) {
            return null;
          }

          const isAuthor = event.authorId === currentUser?.id || event.author === currentUser?.name;
          const isEditing = editingCommentId === event.id;

          return (
            <HistoryItem
              key={event.id}
              event={event}
              now={now}
              isAuthor={isAuthor}
              isEditing={isEditing}
              editingText={editingText}
              onChangeEditingText={setEditingText}
              onStartEdit={() => {
                setEditingCommentId(event.id);
                setEditingText(event.message);
              }}
              onCancelEdit={() => setEditingCommentId(null)}
              onSaveEdit={() => handleSaveEdit(event.id)}
              onDelete={() => handleDeleteComment(event.id)}
            />
          );
        })}
        <div ref={endRef} />
      </ol>

      {/* Formulário de Envio de Mensagem e Anexos */}
      <form
        onSubmit={submit}
        className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        {uploadError && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            <span>{uploadError}</span>
            <button type="button" onClick={() => setUploadError(null)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          {/* Seletor de Papel (Atendente / Solicitante) */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs dark:border-slate-800 dark:bg-slate-800"
              role="radiogroup"
              aria-label="Responder como"
            >
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
                      selected
                        ? 'bg-white font-semibold text-blue-700 shadow-2xs dark:bg-slate-900 dark:text-blue-400'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            {/* Alternância de Visibilidade: Público vs Nota Interna */}
            {canInternalNotes && (
              <div
                className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs dark:border-slate-800 dark:bg-slate-800"
                role="radiogroup"
                aria-label="Visibilidade do comentário"
              >
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
                    visibility === 'public'
                      ? 'bg-white font-semibold text-slate-800 shadow-2xs dark:bg-slate-900 dark:text-slate-200'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                  title="Visível para o solicitante e equipe"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  Público
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('internal')}
                  className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
                    visibility === 'internal'
                      ? 'bg-amber-100 font-semibold text-amber-800 shadow-2xs dark:bg-amber-950 dark:text-amber-300'
                      : 'text-slate-500 hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-400'
                  }`}
                  title="Apenas membros da equipe interna podem visualizar"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  Nota Interna
                </button>
              </div>
            )}
          </div>

          <span className="truncate text-xs text-slate-500 dark:text-slate-400">
            respondendo como <span className="font-semibold text-slate-800 dark:text-slate-200">{authorName}</span>
          </span>
        </div>

        {/* Uploader colapsável */}
        {showUploader && (
          <div className="mb-2.5">
            <AttachmentUploader
              files={pendingFiles}
              onChangeFiles={setPendingFiles}
              onError={(err) => setUploadError(err)}
            />
          </div>
        )}

        {/* Textarea e Ações */}
        <div className="flex items-end gap-2">
          <label htmlFor="comment-message" className="sr-only">
            Mensagem
          </label>
          <div className="relative flex-1">
            <textarea
              id="comment-message"
              rows={2}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                visibility === 'internal'
                  ? 'Escreva uma nota interna (apenas visível à equipe)... Cole imagens com Ctrl+V'
                  : role === 'atendente'
                  ? 'Responder ao solicitante... Use @Nome para mencionar. Cole imagens com Ctrl+V'
                  : 'Enviar mensagem à equipe de atendimento... Cole anexos com Ctrl+V'
              }
              className={`max-h-40 min-h-[2.75rem] w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm transition outline-none shadow-2xs ${
                visibility === 'internal'
                  ? 'border-amber-300 bg-amber-50/40 text-amber-950 placeholder:text-amber-600/70 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100 dark:placeholder:text-amber-400/60'
                  : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-750 dark:bg-slate-850 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400'
              }`}
            />
          </div>

          {/* Botão de Anexos */}
          <button
            type="button"
            onClick={() => setShowUploader((prev) => !prev)}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
              showUploader || pendingFiles.length > 0
                ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400'
            }`}
            title="Anexar arquivos (máx 5 de 1 MB)"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Botão de Enviar */}
          <button
            id="send-comment"
            type="submit"
            disabled={isSubmitting || (!message.trim() && pendingFiles.length === 0)}
            className={`h-11 w-11 shrink-0 p-0 ${
              visibility === 'internal'
                ? 'inline-flex items-center justify-center rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50'
                : 'btn-primary'
            }`}
            aria-label="Enviar mensagem"
            title="Enviar (Ctrl + Enter)"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <p className="hidden sm:block">Pressione Ctrl + Enter para enviar • Cole prints com Ctrl+V</p>
          {pendingFiles.length > 0 && (
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {pendingFiles.length} anexo(s) selecionado(s)
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

interface HistoryItemProps {
  event: TicketEvent;
  now: number;
  isAuthor: boolean;
  isEditing: boolean;
  editingText: string;
  onChangeEditingText: (text: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}

function HistoryItem({
  event,
  now,
  isAuthor,
  isEditing,
  editingText,
  onChangeEditingText,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: HistoryItemProps) {
  if (event.type === 'comment') {
    const isAgent = event.role === 'atendente';
    const isInternal = event.visibility === 'internal';

    return (
      <li className={`flex animate-slide-up gap-2.5 ${isAgent ? 'flex-row-reverse' : ''}`}>
        <Avatar name={event.author} size="sm" />
        <div className={`max-w-[85%] ${isAgent ? 'items-end text-right' : ''} flex flex-col`}>
          {/* Cabeçalho do Comentário */}
          <div className={`mb-1 flex items-center gap-1.5 text-xs ${isAgent ? 'flex-row-reverse' : ''}`}>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{event.author}</span>

            {isInternal ? (
              <span className="flex items-center gap-1 rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 uppercase dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Lock className="h-2.5 w-2.5" />
                Nota Interna
              </span>
            ) : (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                  isAgent
                    ? 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/80 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {isAgent ? 'Atendente' : 'Solicitante'}
              </span>
            )}

            <time className="text-[11px] text-slate-400" dateTime={event.createdAt} title={formatDateTime(event.createdAt)}>
              {formatRelative(event.createdAt, now)}
            </time>

            {event.editedAt && (
              <span className="text-[10px] text-slate-400 italic" title={`Editado em ${formatDateTime(event.editedAt)}`}>
                (editado)
              </span>
            )}

            {/* Ações de Edição e Exclusão */}
            {isAuthor && !isEditing && (
              <div className="flex items-center gap-1 ml-1 opacity-60 hover:opacity-100 transition">
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="rounded p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Editar mensagem"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                  title="Excluir mensagem"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Corpo do Comentário ou Modo de Edição */}
          {isEditing ? (
            <div className="w-full space-y-2 rounded-xl border border-blue-300 bg-white p-3 shadow-md dark:border-blue-700 dark:bg-slate-850">
              <textarea
                value={editingText}
                onChange={(e) => onChangeEditingText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                rows={3}
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  <X className="h-3 w-3" /> Cancelar
                </button>
                <button
                  type="button"
                  onClick={onSaveEdit}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Check className="h-3 w-3" /> Salvar
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed whitespace-pre-wrap ${
                isInternal
                  ? 'border border-amber-300 bg-amber-50/70 text-amber-950 shadow-2xs dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100'
                  : isAgent
                  ? 'rounded-tr-xs bg-blue-600 text-white shadow-xs'
                  : 'rounded-tl-xs border border-slate-200 bg-white text-slate-800 shadow-2xs dark:border-slate-750 dark:bg-slate-850 dark:text-slate-100'
              }`}
            >
              {renderMessageWithMentions(event.message)}
            </div>
          )}

          {/* Anexos vinculados ao comentário */}
          {event.attachments && event.attachments.length > 0 && (
            <div className="mt-2 w-full space-y-1.5">
              {event.attachments.map((att) => (
                <AttachmentCard key={att.id} attachment={att} readOnly />
              ))}
            </div>
          )}
        </div>
      </li>
    );
  }

  // Evento de Sistema (Criação, Atualização, Atribuição, Mudança de Status)
  const meta = EVENT_ICONS[event.type];
  const Icon = meta?.icon || Sparkles;
  const iconClass = meta?.className || 'bg-slate-100 text-slate-600';

  return (
    <li className="flex animate-fade-in items-start gap-2.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200/80 ${iconClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 pt-0.5 text-xs">
        <p className="font-medium text-slate-700 dark:text-slate-300">{event.message}</p>
        <time className="text-[11px] text-slate-400" dateTime={event.createdAt} title={formatDateTime(event.createdAt)}>
          {formatRelative(event.createdAt, now)} · {event.author}
        </time>
      </div>
    </li>
  );
}
