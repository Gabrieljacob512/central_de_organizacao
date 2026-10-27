import {
  Calendar,
  Clock,
  Globe,
  Lock,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import type { CalendarEvent } from '../../types/calendar';
import type { UserProfile } from '../../types/ticket';
import { CATEGORY_LABELS, formatFullEventDate, getEventScopeBadge } from '../../utils/calendar';
import { canManageGlobalEvents } from '../../utils/rbac';
import { Modal } from '../ui/Modal';

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  currentUser: UserProfile | null;
  open: boolean;
  onClose: () => void;
  onDelete: (eventId: string) => void;
}

export function EventDetailsModal({
  event,
  currentUser,
  open,
  onClose,
  onDelete,
}: EventDetailsModalProps) {
  if (!open || !event) return null;

  const isGlobal = event.scope === 'global';
  const canDelete = isGlobal
    ? canManageGlobalEvents(currentUser)
    : event.createdByEmail.toLowerCase() === (currentUser?.email ?? '').toLowerCase() || !event.createdByEmail;

  const scopeBadge = getEventScopeBadge(event.scope);

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o compromisso "${event.title}"?`)) {
      onDelete(event.id);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalhes do Compromisso"
      description="Visualização de informações e visibilidade do evento"
      size="md"
    >
      <div className="space-y-5">
        {/* Header com badges de escopo e categoria */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${scopeBadge.badgeClass}`}
            >
              {isGlobal ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {scopeBadge.label}
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              <Tag className="w-3 h-3 text-slate-500" />
              {CATEGORY_LABELS[event.category] || event.category}
            </span>
          </div>

          <span className="text-xs text-slate-400">
            ID: <span className="font-mono">{event.id.slice(0, 10)}</span>
          </span>
        </div>

        {/* Título do evento */}
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
            {event.title}
          </h3>
        </div>

        {/* Informações de Data, Horário e Criador */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5 text-sm text-slate-700">
            <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Data</p>
              <p className="font-semibold text-slate-800">{formatFullEventDate(event.date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-sm text-slate-700">
            <div className="w-8 h-8 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Horário</p>
              <p className="font-semibold text-slate-800">
                {event.time ? `${event.time}h` : 'Dia inteiro'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-sm text-slate-700 sm:col-span-2 pt-2 border-t border-slate-200/60">
            <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400">Organizador / Criado por</p>
              <p className="font-medium text-slate-800 truncate">
                {event.createdByName || 'Sistema'}{' '}
                <span className="text-xs text-slate-500 font-normal">
                  ({event.createdByEmail || 'corporativo'})
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Descrição */}
        {event.description ? (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Observações & Detalhes
            </h4>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-xs">
              {event.description}
            </div>
          </div>
        ) : (
          <p className="text-xs italic text-slate-400">Nenhuma observação informada.</p>
        )}

        {/* Nota informativa de permissão caso não possa excluir */}
        {isGlobal && !canDelete && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 flex items-start gap-2">
            <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Este é um compromisso corporativo global compartilhado com toda a empresa. Apenas
              Diretores ou o Presidente têm permissão para excluí-lo.
            </span>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Compromisso
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="btn-primary min-h-[40px] px-4 py-2 text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
