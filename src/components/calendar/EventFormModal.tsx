import {
  AlertCircle,
  Calendar,
  Clock,
  FolderTree,
  Globe,
  Lock,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { CreateEventInput } from '../../hooks/useCalendarEvents';
import { useToast } from '../../hooks/useToast';
import type { EventCategory, EventScope } from '../../types/calendar';
import { CATEGORY_LABELS } from '../../utils/calendar';
import { Modal } from '../ui/Modal';

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateEventInput) => { success: boolean; error?: string };
  initialDate?: string;
  canCreateGlobal: boolean;
}

export function EventFormModal({
  open,
  onClose,
  onSubmit,
  initialDate,
  canCreateGlobal,
}: EventFormModalProps) {
  const toast = useToast();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDate || todayStr);
  const [time, setTime] = useState('');
  const [scope, setScope] = useState<EventScope>(canCreateGlobal ? 'global' : 'private');
  const [category, setCategory] = useState<EventCategory>('reuniao');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Informe o título do compromisso.');
      return;
    }
    if (!date) {
      setErrorMsg('Selecione a data do compromisso.');
      return;
    }

    if (scope === 'global' && !canCreateGlobal) {
      setErrorMsg('Apenas Diretores e o Presidente podem criar eventos corporativos globais.');
      return;
    }

    const res = onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      time: time || undefined,
      scope,
      category,
    });

    if (!res.success) {
      setErrorMsg(res.error ?? 'Erro ao adicionar compromisso.');
      return;
    }

    toast.success(
      scope === 'global' ? 'Evento Global Publicado' : 'Compromisso Privado Criado',
      scope === 'global'
        ? `"${title}" está visível no calendário de toda a Tecno System.`
        : `"${title}" foi salvo exclusivamente no seu espaço privado.`,
    );

    setTitle('');
    setDescription('');
    setTime('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Novo Evento / Compromisso"
      description="Agende uma reunião corporativa para a equipe ou registre um compromisso no seu calendário particular."
      icon={
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-4 ring-blue-50/50 dark:bg-blue-950/60 dark:text-blue-400">
          <Calendar className="h-5 w-5" />
        </span>
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            id="btn-save-event"
            type="submit"
            form="event-form"
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            <span>Salvar no Calendário</span>
          </button>
        </div>
      }
    >
      <form id="event-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Título */}
        <div>
          <label htmlFor="event-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Título do Compromisso *
          </label>
          <input
            id="event-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Reunião de Alinhamento Semanal ou Foco em Relatório"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
          />
        </div>

        {/* SELETOR DE ESCOPO: GLOBAL VS. PRIVADO (Requisito 3) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Visibilidade / Escopo do Evento *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Opção 1: Global Corporativo */}
            <button
              type="button"
              disabled={!canCreateGlobal}
              onClick={() => setScope('global')}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition cursor-pointer ${
                scope === 'global'
                  ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/50'
                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800'
              } ${!canCreateGlobal ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                <Globe className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    🌐 Evento Global
                  </span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Corporativo
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Visível para todos os colaboradores no calendário geral.
                </p>
              </div>
            </button>

            {/* Opção 2: Privado Pessoal */}
            <button
              type="button"
              onClick={() => setScope('private')}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition cursor-pointer ${
                scope === 'private'
                  ? 'border-purple-500 bg-purple-50/80 ring-2 ring-purple-500/20 dark:border-purple-500 dark:bg-purple-950/50'
                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    🔒 Evento Privado
                  </span>
                  <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    Pessoal
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Visível exclusivamente para você no seu espaço privado.
                </p>
              </div>
            </button>
          </div>

          {!canCreateGlobal && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Apenas Diretores e o Presidente podem publicar eventos globais corporativos.</span>
            </p>
          )}
        </div>

        {/* Data e Horário */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="event-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Data do Compromisso *
            </label>
            <div className="relative">
              <Calendar className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
              <input
                id="event-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-3 pl-10 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-time" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Horário (Opcional)
            </label>
            <div className="relative">
              <Clock className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
              <input
                id="event-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-3 pl-10 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Categoria */}
        <div>
          <label htmlFor="event-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Categoria
          </label>
          <div className="relative">
            <FolderTree className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
            <select
              id="event-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-3 pl-10 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 cursor-pointer"
            >
              {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label htmlFor="event-desc" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Descrição ou Pauta (Opcional)
          </label>
          <textarea
            id="event-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes, link da sala virtual ou anotações relevantes..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}
