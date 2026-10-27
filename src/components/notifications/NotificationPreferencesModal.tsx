import { Bell, Check, Mail, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../../services/notificationService';
import { useToast } from '../../hooks/useToast';

interface NotificationPreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPreferencesModal({ open, onClose }: NotificationPreferencesModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Partial<NotificationPreferences>>({
    email_enabled: true,
    in_app_enabled: true,
    notify_ticket_assigned: true,
    notify_new_comment: true,
    notify_mention: true,
    notify_status_change: true,
    notify_sla_warning: true,
    notify_sla_breached: true,
  });

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchNotificationPreferences()
        .then((data) => {
          if (data) setPrefs(data);
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  if (!open) return null;

  const toggle = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await updateNotificationPreferences(prefs);
    setSaving(false);
    if (ok) {
      toast.success('Preferências salvas', 'Suas opções de notificação foram atualizadas com sucesso.');
      onClose();
    } else {
      toast.error('Erro ao salvar', 'Não foi possível salvar as preferências.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs dark:bg-slate-950/80" onClick={onClose} />

      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-scale-in"
        role="dialog"
        aria-labelledby="pref-modal-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 id="pref-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Preferências de Notificação
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Escolha os canais e alertas que deseja receber
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

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Carregando preferências...</div>
        ) : (
          <div className="space-y-5 py-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Canais Principais */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-850">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Canais de Notificação
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Alertas por E-mail</p>
                      <p className="text-[11px] text-slate-400">Receba notificações importantes no seu e-mail corporativo</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.email_enabled)}
                    onChange={() => toggle('email_enabled')}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Alertas In-App</p>
                      <p className="text-[11px] text-slate-400">Exibir badge e sino de notificações no topo da plataforma</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.in_app_enabled)}
                    onChange={() => toggle('in_app_enabled')}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            {/* Eventos Específicos */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Eventos e Alertas
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Chamado Atribuído</p>
                    <p className="text-[11px] text-slate-400">Quando um chamado for atribuído à sua responsabilidade</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.notify_ticket_assigned)}
                    onChange={() => toggle('notify_ticket_assigned')}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Novos Comentários</p>
                    <p className="text-[11px] text-slate-400">Respostas em chamados abertos por você ou sob sua fila</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.notify_new_comment)}
                    onChange={() => toggle('notify_new_comment')}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Menções (@Você)</p>
                    <p className="text-[11px] text-slate-400">Sempre que alguém mencionar seu nome em uma mensagem</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.notify_mention)}
                    onChange={() => toggle('notify_mention')}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Alteração de Status</p>
                    <p className="text-[11px] text-slate-400">Transições para Em Andamento, Pendente ou Resolvido</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.notify_status_change)}
                    onChange={() => toggle('notify_status_change')}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850">
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Aviso de SLA Próximo (&lt; 2h)</p>
                    <p className="text-[11px] text-slate-400">Alerta preventivo antes que o prazo limite seja atingido</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.notify_sla_warning)}
                    onChange={() => toggle('notify_sla_warning')}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850">
                  <div>
                    <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">Alerta de SLA Estourado</p>
                    <p className="text-[11px] text-slate-400">Notificação imediata quando o chamado ultrapassar o SLA</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.notify_sla_breached)}
                    onChange={() => toggle('notify_sla_breached')}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary min-h-[38px] px-4 py-2 text-xs font-bold"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Preferências'}
          </button>
        </div>
      </div>
    </div>
  );
}
