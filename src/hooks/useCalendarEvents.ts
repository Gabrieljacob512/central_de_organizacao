import { useCallback, useMemo, useState } from 'react';
import { loadGlobalEvents, saveGlobalEvents } from '../services/calendarStorage';
import type { CalendarEvent, EventCategory, EventScope } from '../types/calendar';
import type { UserProfile } from '../types/ticket';
import { generateId } from '../utils/id';
import { canManageGlobalEvents } from '../utils/rbac';

export interface CreateEventInput {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  scope: EventScope;
  category: EventCategory;
}

export interface EventActionResult {
  success: boolean;
  error?: string;
  event?: CalendarEvent;
}

interface UseCalendarEventsProps {
  currentUser: UserProfile | null;
  privateEvents: CalendarEvent[];
  onAddPrivateEvent: (
    data: Omit<CalendarEvent, 'id' | 'createdAt' | 'scope' | 'createdById' | 'createdByEmail' | 'createdByName'>,
  ) => CalendarEvent;
  onDeletePrivateEvent: (eventId: string) => void;
}

export function useCalendarEvents({
  currentUser,
  privateEvents,
  onAddPrivateEvent,
  onDeletePrivateEvent,
}: UseCalendarEventsProps) {
  const [globalEvents, setGlobalEvents] = useState<CalendarEvent[]>(loadGlobalEvents);

  const canCreateGlobal = canManageGlobalEvents(currentUser);

  // Combina eventos globais corporativos com os eventos particulares do usuário
  const allEvents = useMemo(() => {
    return [...globalEvents, ...privateEvents].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
  }, [globalEvents, privateEvents]);

  /** Criação de Novo Evento (Global ou Privado) */
  const createEvent = useCallback(
    (input: CreateEventInput): EventActionResult => {
      const cleanTitle = input.title.trim();
      if (!cleanTitle) {
        return { success: false, error: 'O título do compromisso é obrigatório.' };
      }
      if (!input.date) {
        return { success: false, error: 'A data do compromisso é obrigatória.' };
      }

      // Regra de Permissão RBAC para Eventos Globais
      if (input.scope === 'global') {
        if (!canCreateGlobal) {
          return {
            success: false,
            error: 'Permissão negada. Apenas Diretores e o Presidente podem criar eventos corporativos globais.',
          };
        }

        const newGlobalEvent: CalendarEvent = {
          id: `global-${generateId()}`,
          title: cleanTitle,
          description: input.description?.trim() || undefined,
          date: input.date,
          time: input.time || undefined,
          scope: 'global',
          category: input.category,
          createdById: currentUser?.id ?? 'admin',
          createdByEmail: currentUser?.email ?? 'corporativo@tecnosystem.com',
          createdByName: currentUser?.name ?? 'Diretoria Tecno System',
          createdAt: new Date().toISOString(),
        };

        const updated = [newGlobalEvent, ...globalEvents];
        setGlobalEvents(updated);
        saveGlobalEvents(updated);

        return { success: true, event: newGlobalEvent };
      }

      // Evento Privado (Pessoal)
      const createdPrivate = onAddPrivateEvent({
        title: cleanTitle,
        description: input.description?.trim() || undefined,
        date: input.date,
        time: input.time || undefined,
        category: input.category,
      });

      return { success: true, event: createdPrivate };
    },
    [canCreateGlobal, currentUser, globalEvents, onAddPrivateEvent],
  );

  /** Exclusão de Evento com Validação RBAC */
  const deleteEvent = useCallback(
    (eventId: string): EventActionResult => {
      // 1. Verifica se é um evento global
      const isGlobal = globalEvents.some((e) => e.id === eventId);
      if (isGlobal) {
        if (!canCreateGlobal) {
          return {
            success: false,
            error: 'Acesso restrito. Apenas Diretores e o Presidente podem excluir eventos corporativos globais.',
          };
        }

        const updated = globalEvents.filter((e) => e.id !== eventId);
        setGlobalEvents(updated);
        saveGlobalEvents(updated);
        return { success: true };
      }

      // 2. Se for privado, remove do espaço seguro do usuário
      onDeletePrivateEvent(eventId);
      return { success: true };
    },
    [canCreateGlobal, globalEvents, onDeletePrivateEvent],
  );

  return {
    allEvents,
    globalEvents,
    privateEvents,
    canCreateGlobal,
    createEvent,
    deleteEvent,
  };
}
