import { z } from 'zod';
import {
  mutate,
  readCollection,
  StoredEventSchema,
  writeCollection,
  type StoredEvent,
} from '../data/storage';
import type { CalendarEvent, EventCategory, EventScope } from '../types/calendar';
import { getCurrentUser } from './authService';

export const CalendarEventSchema = z.object({
  title: z.string().min(2, 'O título deve ter no mínimo 2 caracteres.'),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD).'),
  time: z.string().optional(),
  scope: z.enum(['global', 'private']),
  category: z.enum(['reuniao', 'projeto', 'pessoal', 'lembrete', 'feriado', 'outro']),
});

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const events = readCollection('events', z.array(StoredEventSchema), []);

    return events.map((e) => {
      const datePart = e.startDate.substring(0, 10);
      const timePart = e.startDate.length > 10 ? e.startDate.substring(11, 16) : undefined;

      return {
        id: e.id,
        title: e.title,
        description: e.description,
        date: datePart,
        time: timePart,
        scope: (e.isGlobal ? 'global' : 'private') as EventScope,
        category: 'reuniao' as EventCategory,
        createdById: e.createdBy,
        createdByName: 'Colaborador',
        createdByEmail: '',
        createdAt: e.createdAt,
      };
    });
  } catch (err) {
    console.error('[calendarService] Erro ao buscar eventos:', err);
    return [];
  }
}

export async function createCalendarEvent(
  eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'createdById' | 'createdByName' | 'createdByEmail'>
): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
  const validation = CalendarEventSchema.safeParse(eventData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message };
  }

  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const eventId = crypto.randomUUID();
  const dateStr = validation.data.date;
  const timeStr = validation.data.time || '09:00';
  const startIso = new Date(`${dateStr}T${timeStr}:00`).toISOString();
  const endIso = new Date(`${dateStr}T${timeStr}:00`).toISOString();

  const newStoredEvent: StoredEvent = {
    id: eventId,
    title: validation.data.title,
    description: validation.data.description,
    startDate: startIso,
    endDate: endIso,
    allDay: !validation.data.time,
    isGlobal: validation.data.scope === 'global',
    createdBy: currentUser.id,
    department: currentUser.department,
    createdAt: new Date().toISOString(),
  };

  mutate({
    user: currentUser,
    action: () => {
      const events = readCollection('events', z.array(StoredEventSchema), []);
      writeCollection('events', [newStoredEvent, ...events]);
    },
    audit: {
      action: 'CALENDAR_EVENT_CREATE',
      details: `Evento criado no calendário: ${validation.data.title} (${validation.data.date})`,
    },
  });

  return {
    success: true,
    event: {
      id: eventId,
      title: validation.data.title,
      description: validation.data.description,
      date: validation.data.date,
      time: validation.data.time,
      scope: validation.data.scope,
      category: validation.data.category,
      createdById: currentUser.id,
      createdByName: currentUser.name,
      createdByEmail: currentUser.email,
      createdAt: newStoredEvent.createdAt,
    },
  };
}

export async function deleteCalendarEvent(id: string): Promise<{ success: boolean; error?: string }> {
  const currentUser = getCurrentUser();
  try {
    mutate({
      user: currentUser,
      action: () => {
        const events = readCollection('events', z.array(StoredEventSchema), []);
        const remaining = events.filter((e) => e.id !== id);
        writeCollection('events', remaining);
      },
      audit: {
        action: 'CALENDAR_EVENT_DELETE',
        details: `Evento removido do calendário (ID: ${id})`,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao remover evento.' };
  }
}
