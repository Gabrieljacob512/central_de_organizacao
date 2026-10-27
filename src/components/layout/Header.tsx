import { Bell, LogOut, Plus, Settings, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
  fetchUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToUserNotifications,
  type NotificationRecord,
} from '../../services/notificationService';
import type { ViewMode } from '../../types/ticket';
import { getUserSubtitle } from '../../utils/rbac';
import { NotificationPanel } from '../notifications/NotificationPanel';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNewTicket: () => void;
  onSelectTicket?: (ticketId: string) => void;
  onOpenPreferences?: () => void;
  onNavigate?: (view: ViewMode) => void;
  onLogout?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Cabeçalho corporativo com sino de notificações em tempo real,
 * botão de abertura de chamados responsivo e avatar do usuário com menu rápido.
 */
export function Header({
  onToggleSidebar,
  onNewTicket,
  onSelectTicket = () => {},
  onOpenPreferences = () => {},
  onNavigate,
  onLogout,
}: HeaderProps) {
  const { currentUser } = useCurrentUser();
  const [panelOpen, setPanelOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

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
      <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          {/* 1. Botão Menu Lateral (com ponto indicador vermelho se houver não lidas) */}
          <button
            id="menu-hamburger-btn"
            type="button"
            onClick={onToggleSidebar}
            className="relative group flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 flex-col items-center justify-center gap-[5px] rounded-xl border border-slate-200/90 bg-slate-50/80 transition-all hover:border-blue-400 hover:bg-blue-50/60 active:scale-95 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-blue-500/80 dark:hover:bg-slate-800 shadow-2xs cursor-pointer"
            aria-label="Abrir menu de navegação"
            title="Abrir menu lateral"
          >
            <span className="block h-[2.5px] w-4 sm:w-5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-600 dark:bg-slate-200 dark:group-hover:bg-blue-400" />
            <span className="block h-[2.5px] w-4 sm:w-5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-600 dark:bg-slate-200 dark:group-hover:bg-blue-400" />
            <span className="block h-[2.5px] w-4 sm:w-5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-600 dark:bg-slate-200 dark:group-hover:bg-blue-400" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white dark:ring-slate-900"
                aria-label="Há notificações não lidas"
              />
            )}
          </button>

          {/* 2. Logo e Nome da Tecno System */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/logo-tecnosystem.png"
              alt="Logo Tecno System"
              className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 object-contain rounded-xl shadow-xs"
              onError={(e) => {
                e.currentTarget.src = '/logo-tecnosystem.svg';
              }}
            />
            <div className="min-w-0">
              <h1 className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <span>
                  Tecno<span className="text-red-600 dark:text-red-500">System</span>
                </span>
                <span className="hidden md:inline-block rounded-full bg-red-50 dark:bg-red-950/70 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60">
                  Service Desk
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 hidden md:block leading-tight truncate">
                Central Corporativa de Chamados & Suporte
              </p>
            </div>
          </div>
        </div>

        {/* 3. Ações: Notificações, Novo Chamado e Avatar do Usuário */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Sino de Notificações com Badge */}
          <div className="relative">
            <button
              id="notification-bell-btn"
              type="button"
              onClick={() => setPanelOpen((prev) => !prev)}
              className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50/80 text-slate-600 transition hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-slate-800 dark:hover:text-blue-400 shadow-2xs cursor-pointer"
              title="Notificações"
              aria-label="Abrir notificações"
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] sm:h-5 sm:min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] sm:text-[10px] font-bold text-white shadow-xs animate-pulse">
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

          {/* Botão "+ Novo Chamado" (responsivo até 360px: encolhe para '+' sem quebrar) */}
          <button
            id="open-new-ticket"
            type="button"
            onClick={onNewTicket}
            className="btn-primary min-h-[38px] sm:min-h-[44px] px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5"
            title="Abrir novo chamado"
            aria-label="Novo chamado"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="hidden min-[420px]:inline">Novo Chamado</span>
          </button>

          {/* 4. Avatar Circular (40px) com Dropdown à direita */}
          {currentUser && (
            <div className="relative" ref={profileMenuRef}>
              <button
                id="header-profile-avatar-btn"
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 transition hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 cursor-pointer overflow-hidden"
                aria-label="Menu do perfil"
                title={currentUser.name}
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{getInitials(currentUser.name)}</span>
                )}
              </button>

              {/* Menu suspenso do usuário */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-scale-in">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {getUserSubtitle(currentUser)}
                    </p>
                  </div>

                  <button
                    id="header-menu-item-profile"
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onNavigate?.('settings');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer transition"
                  >
                    <User className="h-4 w-4 text-slate-500" />
                    <span>Meu perfil</span>
                  </button>

                  <button
                    id="header-menu-item-settings"
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onNavigate?.('settings');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer transition"
                  >
                    <Settings className="h-4 w-4 text-slate-500" />
                    <span>Configurações</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  <button
                    id="header-menu-item-logout"
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onLogout?.();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer transition"
                  >
                    <LogOut className="h-4 w-4 text-rose-500" />
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
