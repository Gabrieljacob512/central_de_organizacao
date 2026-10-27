import { Clock, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { reopenTicket } from '../../services/differentiatorsService';
import { useToast } from '../../hooks/useToast';

interface ReopenTicketModalProps {
  open: boolean;
  ticketId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReopenTicketModal({ open, ticketId, onClose, onSuccess }: ReopenTicketModalProps) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleReopen = async () => {
    if (!reason.trim()) {
      toast.error('Motivo obrigatório', 'Informe o motivo da reabertura para histórico do chamado.');
      return;
    }

    setIsSubmitting(true);
    const res = await reopenTicket(ticketId, reason.trim());
    setIsSubmitting(false);

    if (res.success) {
      toast.success('Chamado reaberto', `O chamado ${ticketId} foi reaberto com sucesso e retornou para Em Andamento.`);
      onSuccess();
      onClose();
    } else {
      toast.error('Não foi possível reabrir', res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs dark:bg-slate-950/80" onClick={onClose} />

      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-scale-in"
        role="dialog"
        aria-labelledby="reopen-modal-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 id="reopen-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Reabrir Chamado {ticketId}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Regra de reabertura em até 7 dias da resolução
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
            <Clock className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <span>
              A reabertura é permitida apenas em até 7 dias corridos após a conclusão. O chamado voltará ao status <strong>Em Andamento</strong>.
            </span>
          </div>

          <div>
            <label htmlFor="reopen-reason" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Motivo da Reabertura *
            </label>
            <textarea
              id="reopen-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva detalhadamente o que ainda precisa de atenção..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleReopen}
            disabled={isSubmitting || !reason.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition"
          >
            <RefreshCw className="h-4 w-4" />
            {isSubmitting ? 'Reabrindo...' : 'Confirmar Reabertura'}
          </button>
        </div>
      </div>
    </div>
  );
}
