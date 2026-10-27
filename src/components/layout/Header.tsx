import { Bell, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
  fetchUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToUserNotifications,
  type NotificationRecord,
} from '../../services/notificationService';
import { NotificationPanel } from '../notifications/NotificationPanel';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNewTicket: () => void;
  onSelectTicket?: (ticketId: string) => void;
  onOpenPreferences?: () => void;
}

/**
 * Cabeçalho corporativo com sino de notificações em tempo real e botão de abertura de chamados
 */
export function Header({
  onToggleSidebar,
  onNewTicket,
  onSelectTicket = () => {},
  onOpenPreferences = () => {},
}: HeaderProps) {
  const { currentUser } = useCurrentUser();
  const [panelOpen, setPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  const loadNotifications = async () => {
    try {
      const data = await fetchUserNotifications();
      setNotifications(data);
    } catch (err) {
      console.warn('[Header] Falha ao carregar notificações:', err);
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3.5 sm:gap-4">
          {/* 1. Botão Menu Lateral */}
          <button
            id="menu-hamburger-btn"
            type="button"
            onClick={onToggleSidebar}
            className="group flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-xl border border-slate-200/90 bg-slate-50/80 transition-all hover:border-blue-400 hover:bg-blue-50/60 active:scale-95 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-blue-500/80 dark:hover:bg-slate-800 shadow-2xs cursor-pointer"
            aria-label="Abrir menu de navegação"
            title="Abrir menu lateral"
          >
            <span className="block h-[2.5px] w-5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-600 dark:bg-slate-200 dark:group-hover:bg-blue-400" />
            <span className="block h-[2.5px] w-5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-600 dark:bg-slate-200 dark:group-hover:bg-blue-400" />
            <span className="block h-[2.5px] w-5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-600 dark:bg-slate-200 dark:group-hover:bg-blue-400" />
          </button>

          {/* 2. Logo e Nome da Tecno System */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/logo-tecnosystem.png"
              alt="Logo Tecno System"
              className="h-9 w-9 object-contain rounded-xl shadow-xs"
              onError={(e) => {
                e.currentTarget.src = '/logo-tecnosystem.svg';
              }}
            />
            <div>
              <h1 className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  Tecno<span className="text-red-600 dark:text-red-500">System</span>
                </span>
                <span className="hidden sm:inline-block rounded-full bg-red-50 dark:bg-red-950/70 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60">
                  Service Desk
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block leading-tight">
                Central Corporativa de Chamados & Suporte
              </p>
            </div>
          </div>
        </div>

        {/* 3. Ações: Notificações e Novo Chamado */}
        <div className="flex items-center gap-2.5">
          {/* Sino de Notificações com Badge */}
          <div className="relative">
            <button
              id="notification-bell-btn"
              type="button"
              onClick={() => setPanelOpen((prev) => !prev)}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50/80 text-slate-600 transition hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-slate-800 dark:hover:text-blue-400 shadow-2xs cursor-pointer"
              title="Notificações"
              aria-label="Abrir notificações"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Painel Dropdown */}
            <NotificationPanel
              open={panelOpen}
              onClose={() => setPanelOpen(false)}
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onSelectTicket={onSelectTicket}
              onOpenPreferences={onOpenPreferences}
            />
          </div>

          {/* Botão "+ Novo Chamado" */}
          <button
            id="open-new-ticket"
            type="button"
            onClick={onNewTicket}
            className="btn-primary min-h-[44px] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Chamado</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>
    </header>
  );
}
