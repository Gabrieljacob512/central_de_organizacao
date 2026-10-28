import { z } from 'zod';
import {
  readCollection,
  StoredEventSchema,
  StoredSettingsSchema,
  writeCollection,
} from '../data/storage';
import type { PersonalTask, PersonalWorkspaceData } from '../types/calendar';
import { getCurrentUser } from './authService';

export async function fetchPrivateWorkspace(): Promise<PersonalWorkspaceData> {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return {
      notes: '',
      tasks: [],
      privateEvents: [],
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const settings = readCollection('settings', StoredSettingsSchema, {});
    const workspaceKey = `workspace_${currentUser.id}`;
    const workspaceData = settings[workspaceKey] as
      | { notes?: string; tasks?: PersonalTask[]; updatedAt?: string }
      | undefined;

    // Buscar eventos privados do usuário
    const allEvents = readCollection('events', z.array(StoredEventSchema), []);
    const userEvents = allEvents.filter((e) => e.createdBy === currentUser.id && !e.isGlobal);

    const privateEvents = userEvents.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description || undefined,
      date: e.startDate.substring(0, 10),
      time: e.startDate.length > 10 ? e.startDate.substring(11, 16) : undefined,
      scope: 'private' as const,
      category: 'outros' as never,
      createdById: e.createdBy,
      createdByName: currentUser.name,
      createdByEmail: currentUser.email,
      createdAt: e.createdAt,
    }));

    return {
      notes: workspaceData?.notes || '',
      tasks: workspaceData?.tasks || [],
      privateEvents,
      updatedAt: workspaceData?.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.error('[workspaceService] Erro ao buscar workspace privado:', err);
    return {
      notes: '',
      tasks: [],
      privateEvents: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function savePrivateNotesAndTasks(
  notes: string,
  tasks: PersonalTask[]
): Promise<{ success: boolean; error?: string }> {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  try {
    const settings = readCollection('settings', StoredSettingsSchema, {});
    const workspaceKey = `workspace_${currentUser.id}`;

    const updated = {
      notes,
      tasks,
      updatedAt: new Date().toISOString(),
    };

    writeCollection('settings', {
      ...settings,
      [workspaceKey]: updated,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao salvar notas e tarefas.' };
  }
}
