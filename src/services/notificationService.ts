import { supabase } from './supabase';
import type { Database } from '../types/database.types';

export type NotificationRecord = Database['public']['Tables']['notifications']['Row'];
export type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row'];

/**
 * Busca todas as notificações do usuário logado
 */
export async function fetchUserNotifications(): Promise<NotificationRecord[]> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[notificationService] Erro ao buscar notificações:', error);
    return [];
  }

  return data || [];
}

/**
 * Marca uma notificação individual como lida
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  return !error;
}

/**
 * Marca todas as notificações do usuário como lidas
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) return false;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  return !error;
}

/**
 * Obtém as preferências de notificação do usuário (cria se ainda não existir)
 */
export async function fetchNotificationPreferences(): Promise<NotificationPreferences | null> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[notificationService] Erro ao buscar preferências:', error);
    return null;
  }

  if (data) return data;

  // Criar preferências padrão caso ainda não existam
  const { data: created, error: createError } = await supabase
    .from('notification_preferences')
    .insert({
      user_id: userId,
      email_enabled: true,
      in_app_enabled: true,
      notify_ticket_assigned: true,
      notify_new_comment: true,
      notify_mention: true,
      notify_status_change: true,
      notify_sla_warning: true,
      notify_sla_breached: true,
    })
    .select('*')
    .single();

  if (createError) {
    console.error('[notificationService] Erro ao criar preferências padrão:', createError);
    return null;
  }

  return created;
}

/**
 * Atualiza preferências de notificação do usuário
 */
export async function updateNotificationPreferences(
  prefs: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'updated_at'>>
): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) return false;

  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      ...prefs,
      updated_at: new Date().toISOString(),
    });

  return !error;
}

/**
 * Assina canal em tempo real para receber notificações instantâneas
 */
export function subscribeToUserNotifications(userId: string, onUpdate: () => void) {
  const channelName = `notifications-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
