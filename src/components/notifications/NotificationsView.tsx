import {
  Activity,
  AlertTriangle,
  AtSign,
  CheckCheck,
  Clock,
  ExternalLink,
  Flame,
  Inbox,
  UserCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
  fetchUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToUserNotifications,
  type NotificationRecord,
} from '../../services/notificationService';
import { formatDateTime } from '../../utils/format';
import { EmptyState } from '../ui/EmptyState';

interface NotificationsViewProps {
  onSelectTicket?: (ticketId: string) => void;
}

export function NotificationsView({ onSelectTicket }: NotificationsViewProps) {
  const { currentUser } = useCurrentUser();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await fetchUserNotifications();
      setNotifications(data);
    } catch (err) {
      console.warn('[NotificationsView] Falha ao carregar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    loadNotifications();

    const unsubscribe = subscribeToUserNotifications(currentUser.id, () => {
      loadNotifications();
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'mention':
        return <AtSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'status':
        return <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'assign':
        return <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'breach':
        return <Flame className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <Inbox className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ações & Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 dark:border-slate-800 -mt-2">
        <div className="flex items-center gap-2">
          {/* Alternador Todas / Não lidas */}
          <div
            className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800"
            role="tablist"
            aria-label="Filtro de notificações"
          >
            <button
              id="notif-filter-all"
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              onClick={() => setFilter('all')}
              className={`flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>Todas</span>
              <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] dark:bg-slate-800">
                {notifications.length}
              </span>
            </button>

            <button
              id="notif-filter-unread"
              type="button"
              role="tab"
              aria-selected={filter === 'unread'}
              onClick={() => setFilter('unread')}
              className={`flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                filter === 'unread'
                  ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>Não lidas</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 text-red-700 px-1.5 py-0.2 text-[10px] font-bold dark:bg-red-950/80 dark:text-red-300">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            id="btn-mark-all-notifications-read"
            type="button"
            onClick={handleMarkAllAsRead}
            className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
          >
            <CheckCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Marcar todas como lidas</span>
          </button>
        )}
      </div>

      {/* Lista de Notificações */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-xs text-slate-400">Carregando notificações...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          title="Nenhuma notificação encontrada"
          description={
            filter === 'unread'
              ? 'Você leu todas as notificações recentes.'
              : 'Não há avisos ou atualizações para você no momento.'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((notif) => {
            const isUnread = !notif.read;

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (isUnread) handleMarkAsRead(notif.id);
                  if (notif.link && onSelectTicket) {
                    onSelectTicket(notif.link);
                  }
                }}
                className={`group flex items-start gap-3.5 rounded-2xl border p-4 transition-all cursor-pointer ${
                  isUnread
                    ? 'border-blue-200 bg-blue-50/40 shadow-xs dark:border-blue-900/60 dark:bg-blue-950/30'
                    : 'border-slate-200/90 bg-white hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-850'
                }`}
              >
                {/* Ícone com fundo temático */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    isUnread
                      ? 'bg-blue-100 dark:bg-blue-900/50'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {getCategoryIcon(notif.type)}
                </div>

                {/* Conteúdo */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-sm ${
                        isUnread
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'font-medium text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {notif.title}
                    </h4>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{formatDateTime(notif.created_at)}</span>
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="mt-2.5 flex items-center gap-3">
                    {notif.link && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 group-hover:underline dark:text-blue-400">
                        <span>Ver chamado associado</span>
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    )}

                    {isUnread && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                        <span>Não lida</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
