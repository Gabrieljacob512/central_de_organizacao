/**
 * Tipos do Módulo de Calendário e Organização Pessoal da Tecno System.
 */

export type EventScope = 'global' | 'private';

export type EventCategory = 'reuniao' | 'projeto' | 'pessoal' | 'lembrete' | 'feriado' | 'outro';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // Formato YYYY-MM-DD
  time?: string; // Formato HH:mm
  scope: EventScope;
  createdById: string;
  createdByEmail: string;
  createdByName: string;
  category: EventCategory;
  createdAt: string;
}

export type TaskPriority = 'baixa' | 'media' | 'alta';

export interface PersonalTask {
  id: string;
  text: string;
  completed: boolean;
  priority: TaskPriority;
  dueDate?: string; // Formato YYYY-MM-DD
  createdAt: string;
}

export interface PersonalWorkspaceData {
  notes: string;
  tasks: PersonalTask[];
  privateEvents: CalendarEvent[];
  updatedAt: string;
}
