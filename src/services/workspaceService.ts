import { supabase } from './supabase';
import type { PersonalTask, PersonalWorkspaceData } from '../types/calendar';

export async function fetchPrivateWorkspace(): Promise<PersonalWorkspaceData> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) {
    return {
      notes: '',
      tasks: [],
      privateEvents: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const { data: noteRow } = await supabase
    .from('private_notes')
    .select('title, content, tasks, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  // Buscar eventos privados do usuário
  const { data: eventsData } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('scope', 'private')
    .eq('created_by_id', userId)
    .order('date');

  const privateEvents = (eventsData || []).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description || undefined,
    date: e.date,
    time: e.time || undefined,
    scope: 'private' as const,
    category: e.category as never,
    createdById: e.created_by_id,
    createdByName: e.created_by_name,
    createdByEmail: e.created_by_email,
    createdAt: e.created_at,
  }));

  const tasks = Array.isArray(noteRow?.tasks) ? (noteRow.tasks as unknown as PersonalTask[]) : [];

  return {
    notes: noteRow?.content || '',
    tasks,
    privateEvents,
    updatedAt: noteRow?.updated_at || new Date().toISOString(),
  };
}

export async function savePrivateNotesAndTasks(
  notes: string,
  tasks: PersonalTask[]
): Promise<{ success: boolean; error?: string }> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  const { error } = await supabase
    .from('private_notes')
    .upsert({
      user_id: userId,
      title: 'Anotações Pessoais',
      content: notes,
      tasks: tasks as never,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
