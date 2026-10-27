import { CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import type { UserProfile } from '../../types/ticket';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onChangePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onSuccessToast: (title: string, message?: string) => void;
}

export function ChangePasswordModal({
  open,
  onClose,
  currentUser,
  onChangePassword,
  onSuccessToast,
}: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open || !currentUser) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newPassword.trim()) {
      setErrorMsg('Digite a nova senha.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('A nova senha deve possuir ao menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas não coincidem. Digite novamente.');
      return;
    }

    setLoading(true);
    try {
      const result = await onChangePassword(newPassword);
      if (!result.success) {
        setErrorMsg(result.error ?? 'Erro ao alterar senha.');
      } else {
        onSuccessToast('Senha alterada com sucesso!', 'Sua nova senha de acesso foi salva.');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alterar Minha Senha"
      description={`Atualize a senha de acesso para ${currentUser.name} (${currentUser.email}).`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <div>
          <label htmlFor="new-pass-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nova Senha *
          </label>
          <div className="relative">
            <KeyRound className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
            <input
              id="new-pass-input"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Digite a nova senha"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirm-pass-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Confirme a Nova Senha *
          </label>
          <div className="relative">
            <Lock className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
            <input
              id="confirm-pass-input"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800"
            />

          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button id="btn-save-new-password" type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" />
            {loading ? 'Salvando...' : 'Salvar Nova Senha'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
