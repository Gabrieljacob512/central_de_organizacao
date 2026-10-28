import { z } from 'zod';
import {
  mutate,
  readCollection,
  StoredNotificationSchema,
  StoredSettingsSchema,
  subscribeStorage,
  writeCollection,
} from '../data/storage';
import { getCurrentUser } from './authService';

export interface NotificationRecord {
  id: string;
  user_id: string;
  userId?: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read: boolean;
  sender_id?: string | null;
  created_at: string;
  createdAt?: string;
}

export interface NotificationPreferences {
  id?: string;
  user_id?: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  notify_ticket_assigned: boolean;
  notify_new_comment: boolean;
  notify_mention: boolean;
  notify_status_change: boolean;
  notify_sla_warning: boolean;
  notify_sla_breached: boolean;
  updated_at?: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email_enabled: true,
  in_app_enabled: true,
  notify_ticket_assigned: true,
  notify_new_comment: true,
  notify_mention: true,
  notify_status_change: true,
  notify_sla_warning: true,
  notify_sla_breached: true,
};

/**
 * Busca todas as notificações do usuário logado
 */
export async function fetchUserNotifications(): Promise<NotificationRecord[]> {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];

  try {
    const notifications = readCollection('notifications', z.array(StoredNotificationSchema), []);
    const userNotifications = notifications
      .filter((n) => n.userId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return userNotifications.map((n) => ({
      id: n.id,
      user_id: n.userId,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      link: n.link || null,
      read: n.read,
      sender_id: n.senderId || null,
      created_at: n.createdAt,
      createdAt: n.createdAt,
    }));
  } catch (err) {
    console.error('[notificationService] Erro ao buscar notificações:', err);
    return [];
  }
}

/**
 * Marca uma notificação individual como lida
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  try {
    mutate({
      user: currentUser,
      action: () => {
        const notifications = readCollection('notifications', z.array(StoredNotificationSchema), []);
        const updated = notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
        writeCollection('notifications', updated);
      },
    });
    return true;
  } catch (err) {
    console.error('[notificationService] Erro ao marcar notificação:', err);
    return false;
  }
}

/**
 * Marca todas as notificações do usuário como lidas
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  try {
    mutate({
      user: currentUser,
      action: () => {
        const notifications = readCollection('notifications', z.array(StoredNotificationSchema), []);
        const updated = notifications.map((n) =>
          n.userId === currentUser.id ? { ...n, read: true } : n
        );
        writeCollection('notifications', updated);
      },
    });
    return true;
  } catch (err) {
    console.error('[notificationService] Erro ao marcar todas notificações:', err);
    return false;
  }
}

/**
 * Obtém as preferências de notificação do usuário
 */
export async function fetchNotificationPreferences(): Promise<NotificationPreferences | null> {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  try {
    const settings = readCollection('settings', StoredSettingsSchema, {});
    const key = `notif_prefs_${currentUser.id}`;
    const saved = settings[key] as NotificationPreferences | undefined;

    return saved || { ...DEFAULT_PREFERENCES, user_id: currentUser.id };
  } catch (err) {
    console.error('[notificationService] Erro ao buscar preferências:', err);
    return null;
  }
}

/**
 * Atualiza preferências de notificação do usuário
 */
export async function updateNotificationPreferences(
  prefs: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'updated_at'>>
): Promise<boolean> {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  try {
    const settings = readCollection('settings', StoredSettingsSchema, {});
    const key = `notif_prefs_${currentUser.id}`;
    const current = (settings[key] as NotificationPreferences | undefined) || DEFAULT_PREFERENCES;

    const updated = {
      ...current,
      ...prefs,
      user_id: currentUser.id,
      updated_at: new Date().toISOString(),
    };

    writeCollection('settings', {
      ...settings,
      [key]: updated,
    });

    return true;
  } catch (err) {
    console.error('[notificationService] Erro ao salvar preferências:', err);
    return false;
  }
}

/**
 * Assina atualizações em tempo real para o usuário
 */
export function subscribeToUserNotifications(_userId: string, onUpdate: () => void) {
  return subscribeStorage((key) => {
    if (!key || key === 'notifications') {
      onUpdate();
    }
  });
}
