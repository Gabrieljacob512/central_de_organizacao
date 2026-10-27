import { useCallback, useEffect, useState } from 'react';
import { loadPrivateWorkspace, savePrivateWorkspace } from '../services/calendarStorage';
import type { CalendarEvent, PersonalTask, PersonalWorkspaceData, TaskPriority } from '../types/calendar';
import type { UserProfile } from '../types/ticket';
import { generateId } from '../utils/id';

/**
 * Hook do Espaço Privado do Usuário (Requisito 1).
 * Carrega e persiste notas pessoais, checklist de tarefas e compromissos privados
 * vinculados estritamente à chave 'private_workspace_<userEmail>'.
 */
export function usePersonalWorkspace(currentUser: UserProfile | null) {
  const email = currentUser?.email ?? '';

  const [workspace, setWorkspace] = useState<PersonalWorkspaceData>(() =>
    loadPrivateWorkspace(email),
  );

  // Recarrega sempre que o usuário ativo mudar
  useEffect(() => {
    if (email) {
      setWorkspace(loadPrivateWorkspace(email));
    }
  }, [email]);

  // Salva no localStorage isolado do usuário
  const persist = useCallback(
    (updater: (prev: PersonalWorkspaceData) => PersonalWorkspaceData) => {
      setWorkspace((prev) => {
        const next = updater(prev);
        savePrivateWorkspace(email, next);
        return next;
      });
    },
    [email],
  );

  /** Atualiza o bloco de notas pessoal */
  const updateNotes = useCallback(
    (notes: string) => {
      persist((prev) => ({
        ...prev,
        notes,
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist],
  );

  /** Adiciona uma nova tarefa individual */
  const addTask = useCallback(
    (text: string, priority: TaskPriority = 'media', dueDate?: string) => {
      if (!text.trim()) return;
      const newTask: PersonalTask = {
        id: `task-${generateId()}`,
        text: text.trim(),
        completed: false,
        priority,
        dueDate: dueDate || undefined,
        createdAt: new Date().toISOString(),
      };
      persist((prev) => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist],
  );

  /** Alterna o status de conclusão de uma tarefa */
  const toggleTask = useCallback(
    (taskId: string) => {
      persist((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t,
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist],
  );

  /** Exclui uma tarefa pessoal */
  const deleteTask = useCallback(
    (taskId: string) => {
      persist((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== taskId),
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist],
  );

  /** Adiciona um evento privado ao espaço pessoal */
  const addPrivateEvent = useCallback(
    (
      eventData: Omit<
        CalendarEvent,
        'id' | 'createdAt' | 'scope' | 'createdById' | 'createdByEmail' | 'createdByName'
      >,
    ): CalendarEvent => {
      const newEvent: CalendarEvent = {
        id: `pvt-${generateId()}`,
        ...eventData,
        scope: 'private',
        createdById: currentUser?.id ?? 'me',
        createdByEmail: email.toLowerCase(),
        createdByName: currentUser?.name ?? 'Você',
        createdAt: new Date().toISOString(),
      };

      persist((prev) => ({
        ...prev,
        privateEvents: [newEvent, ...prev.privateEvents],
        updatedAt: new Date().toISOString(),
      }));

      return newEvent;
    },
    [currentUser, email, persist],
  );

  /** Exclui um evento privado */
  const deletePrivateEvent = useCallback(
    (eventId: string) => {
      persist((prev) => ({
        ...prev,
        privateEvents: prev.privateEvents.filter((e) => e.id !== eventId),
        updatedAt: new Date().toISOString(),
      }));
    },
    [persist],
  );

  return {
    notes: workspace.notes,
    tasks: workspace.tasks,
    privateEvents: workspace.privateEvents,
    updatedAt: workspace.updatedAt,
    updateNotes,
    addTask,
    toggleTask,
    deleteTask,
    addPrivateEvent,
    deletePrivateEvent,
  };
}
