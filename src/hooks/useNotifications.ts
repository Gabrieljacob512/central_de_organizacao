import { useEffect, useState } from 'react';
import {
  fetchUserNotifications,
  subscribeToUserNotifications,
} from '../services/notificationService';

export function useNotifications(userId?: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);

  const reload = async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    try {
      const data = await fetchUserNotifications();
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {
      // Falha silenciosa
    }
  };

  useEffect(() => {
    if (!userId) return;
    reload();

    const unsub = subscribeToUserNotifications(userId, () => {
      reload();
    });

    return () => {
      unsub();
    };
  }, [userId]);

  return { unreadCount, reload };
}
