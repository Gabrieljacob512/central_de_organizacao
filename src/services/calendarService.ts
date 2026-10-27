import { z } from 'zod';
import { supabase } from './supabase';
import type { CalendarEvent, EventCategory, EventScope } from '../types/calendar';

export const CalendarEventSchema = z.object({
  title: z.string().min(2, 'O título deve ter no mínimo 2 caracteres.'),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD).'),
  time: z.string().optional(),
  scope: z.enum(['global', 'private']),
  category: z.enum(['reuniao', 'projeto', 'pessoal', 'lembrete', 'feriado', 'outro']),
});

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('date', { ascending: true });

  if (error || !data) {
    console.error('[calendarService] Erro ao buscar eventos:', error);
    return [];
  }

  return data.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description || undefined,
    date: e.date,
    time: e.time || undefined,
    scope: e.scope as EventScope,
    category: e.category as EventCategory,
    createdById: e.created_by_id,
    createdByName: e.created_by_name,
    createdByEmail: e.created_by_email,
    createdAt: e.created_at,
  }));
}

export async function createCalendarEvent(
  eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'createdById' | 'createdByName' | 'createdByEmail'>
): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
  const validation = CalendarEventSchema.safeParse(eventData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message };
  }

  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const { data: profile } = await supabase.from('profiles').select('name, email').eq('id', userId).single();
  const creatorName = profile?.name || 'Colaborador';
  const creatorEmail = profile?.email || session?.session?.user?.email || '';

  const { data: created, error } = await supabase
    .from('calendar_events')
    .insert({
      title: validation.data.title,
      description: validation.data.description,
      date: validation.data.date,
      time: validation.data.time,
      scope: validation.data.scope,
      category: validation.data.category,
      created_by_id: userId,
      created_by_name: creatorName,
      created_by_email: creatorEmail,
    })
    .select()
    .single();

  if (error || !created) {
    return { success: false, error: error?.message || 'Falha ao salvar evento.' };
  }

  return {
    success: true,
    event: {
      id: created.id,
      title: created.title,
      description: created.description || undefined,
      date: created.date,
      time: created.time || undefined,
      scope: created.scope as EventScope,
      category: created.category as EventCategory,
      createdById: created.created_by_id,
      createdByName: created.created_by_name,
      createdByEmail: created.created_by_email,
      createdAt: created.created_at,
    },
  };
}

export async function deleteCalendarEvent(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
