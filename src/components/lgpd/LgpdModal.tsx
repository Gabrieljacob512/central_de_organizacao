import { AlertTriangle, CheckCircle, ShieldCheck, UserX, X } from 'lucide-react';
import { useState } from 'react';
import { anonymizeUserData } from '../../services/differentiatorsService';
import { useToast } from '../../hooks/useToast';
import type { UserProfile } from '../../types/ticket';

interface LgpdModalProps {
  open: boolean;
  currentUser: UserProfile | null;
  onClose: () => void;
  onLoggedOut?: () => void;
}

export function LgpdModal({ open, currentUser, onClose, onLoggedOut }: LgpdModalProps) {
  const toast = useToast();
  const [confirmText, setConfirmText] = useState('');
  const targetUserId = currentUser?.id || '';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);


  if (!open) return null;

  const isSelf = targetUserId === currentUser?.id;
  const canProceed = confirmText.trim().toUpperCase() === 'ANONIMIZAR';

  const handleAnonymize = async () => {
    if (!canProceed) {
      toast.error('Confirmação necessária', 'Digite a palavra ANONIMIZAR para confirmar.');
      return;
    }

    if (!targetUserId) {
      toast.error('Usuário inválido', 'ID do usuário não especificado.');
      return;
    }

    setIsSubmitting(true);
    const res = await anonymizeUserData(targetUserId);
    setIsSubmitting(false);

    if (res.success) {
      setSuccess(true);
      toast.success(
        'Dados Anonimizados com Sucesso',
        'Os registros pessoais foram pseudonimizados em conformidade com a LGPD.'
      );
      if (isSelf) {
        setTimeout(() => {
          onClose();
          onLoggedOut?.();
        }, 2000);
      }
    } else {
      toast.error('Erro ao anonimizar', res.error || 'Não foi possível completar a anonimização.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs dark:bg-slate-950/80" onClick={onClose} />

      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-scale-in"
        role="dialog"
        aria-labelledby="lgpd-modal-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="lgpd-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Privacidade & Proteção de Dados (LGPD)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direito ao Esquecimento e Anonimização de Dados Pessoais
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

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Anonimização Concluída com Sucesso!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
              Os dados foram removidos da visualização pública e substituídos por identificadores neutros.
              {isSelf && ' Sua sessão será encerrada.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Fechar Janela
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <strong className="block font-semibold">Ação Definitiva e Irreversível</strong>
                Conforme o Art. 18 da Lei 13.709/2018 (LGPD), esta operação remove nome, e-mail e dados identificáveis do usuário. O histórico operacional dos chamados permanece preservado sob identificador anônimo para manter as métricas da empresa júnior.
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-850">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Usuário a ser anonimizado:</span>
              <p className="mt-1 font-bold text-slate-900 dark:text-white">
                {currentUser?.name} ({currentUser?.email})
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">ID: {targetUserId}</p>
            </div>

            <div>
              <label htmlFor="confirm-anon" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Para confirmar, digite <span className="font-mono text-red-600 font-bold">ANONIMIZAR</span> abaixo:
              </label>
              <input
                id="confirm-anon"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digite ANONIMIZAR..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-850 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!canProceed || isSubmitting}
                onClick={handleAnonymize}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition ${
                  canProceed && !isSubmitting
                    ? 'bg-red-600 hover:bg-red-700 shadow-xs cursor-pointer'
                    : 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500'
                }`}
              >
                <UserX className="h-4 w-4" />
                {isSubmitting ? 'Anonimizando...' : 'Confirmar Anonimização'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
