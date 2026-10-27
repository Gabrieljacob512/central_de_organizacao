import {
  AlertCircle,
  AlertTriangle,
  AtSign,
  Bell,
  CheckCheck,
  Clock,
  RefreshCw,
  Settings,
  UserCheck,
  X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { NotificationRecord } from '../../services/notificationService';
import { formatRelative } from '../../utils/format';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationRecord[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectTicket: (ticketId: string) => void;
  onOpenPreferences: () => void;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'mention':
      return { icon: AtSign, bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' };
    case 'status_change':
      return { icon: RefreshCw, bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' };
    case 'ticket_assigned':
      return { icon: UserCheck, bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' };
    case 'sla_warning':
      return { icon: AlertTriangle, bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' };
    case 'sla_breached':
      return { icon: AlertCircle, bg: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' };
    default:
      return { icon: Bell, bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
  }
}

export function NotificationPanel({
  open,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectTicket,
  onOpenPreferences,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white/95 p-0 shadow-2xl backdrop-blur-md transition-all dark:border-slate-800 dark:bg-slate-900/95 animate-slide-up"
      role="dialog"
      aria-label="Painel de Notificações"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notificações</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {unreadCount} nova{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/60 transition"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Lidas
            </button>
          )}

          <button
            type="button"
            onClick={onOpenPreferences}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            title="Preferências de notificação"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Lista de Notificações */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
              <Bell className="h-6 w-6" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300">Nenhuma notificação</p>
            <p className="mt-1 text-[11px] text-slate-400">Você está em dia com todas as suas tarefas!</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const { icon: Icon, bg } = getNotificationIcon(notif.type);
            const isUnread = !notif.read;

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (isUnread) onMarkAsRead(notif.id);
                  if (notif.link) {
                    onSelectTicket(notif.link);
                    onClose();
                  }
                }}
                className={`flex cursor-pointer items-start gap-3 p-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-850 ${
                  isUnread ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs ${isUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                      {notif.title}
                    </p>
                    {isUnread && <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />}
                  </div>

                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {notif.message}
                  </p>

                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelative(notif.created_at, Date.now())}</span>
                    {notif.link && (
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {notif.link}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
