import { z } from 'zod';
import { seedDemoData } from '../data/seed';
import {
  readCollection,
  StoredAuditSchema,
  StoredSessionSchema,
  StoredTicketSchema,
  StoredUserSchema,
  writeCollection,
  type StoredAudit,
  type StoredUser,
} from '../data/storage';
import type { AuditAction, AuditLog, Ticket, UserProfile, ViewMode } from '../types/ticket';
import { generateId } from '../utils/id';

const VIEW_STORAGE_KEY = 'tecno.v1.view';
const CHAMADOS_VIEW_KEY = 'tecno.v1.chamados_view';

/* ----------------------------- Tickets ----------------------------- */

export function saveTickets(tickets: Ticket[]): void {
  try {
    writeCollection('tickets', tickets);
  } catch (error) {
    console.error('[Service Desk] Falha ao salvar chamados no LocalStorage.', error);
  }
}

export function loadTickets(): Ticket[] {
  try {
    seedDemoData();
    const stored = readCollection('tickets', z.array(StoredTicketSchema), []);
    if (stored.length > 0) {
      return stored as Ticket[];
    }
  } catch (error) {
    console.warn('[Service Desk] Falha ao carregar chamados.', error);
  }

  return [];
}

export function loadViewMode(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (
      saved &&
      [
        'overview',
        'tickets',
        'my-tickets',
        'metrics',
        'workspace',
        'calendar',
        'audit',
        'settings',
        'table',
        'kanban',
      ].includes(saved)
    ) {
      return saved as ViewMode;
    }
  } catch {}
  return 'overview';
}

export function saveViewMode(view: ViewMode): void {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {}
}

export function loadChamadosViewPreference(): 'table' | 'kanban' {
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return 'table'; // No celular o padrão é Lista
  }
  try {
    const saved = localStorage.getItem(CHAMADOS_VIEW_KEY);
    return saved === 'kanban' ? 'kanban' : 'table';
  } catch {
    return 'table';
  }
}

export function saveChamadosViewPreference(view: 'table' | 'kanban'): void {
  try {
    localStorage.setItem(CHAMADOS_VIEW_KEY, view);
  } catch {}
}

/* --------------------------- Usuários (Sessão) --------------------------- */

export function saveUsersList(users: UserProfile[]): void {
  try {
    const currentUsers = readCollection('users', z.array(StoredUserSchema), []);
    // Mesclar preservando senhas
    const passwordMap = new Map(currentUsers.map((u) => [u.id, u.password]));

    const storedUsers: StoredUser[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password: passwordMap.get(u.id) || 'demo123',
      department: u.department,
      secondaryDepartment: u.secondaryDepartment,
      departmentEmail: u.departmentEmail,
      role: u.role,
      phone: u.phone,
      startDate: u.startDate,
      isActive: u.isActive ?? true,
      mustChangePassword: u.mustChangePassword ?? false,
      avatarUrl: u.avatarUrl || undefined,
      createdAt: u.createdAt || new Date().toISOString(),
    }));

    writeCollection('users', storedUsers);
  } catch (error) {
    console.error('[Service Desk] Falha ao salvar lista de usuários.', error);
  }
}

export function loadUsersList(): UserProfile[] {
  try {
    seedDemoData();
    const stored = readCollection('users', z.array(StoredUserSchema), []);
    return stored.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      department: u.department,
      secondaryDepartment: u.secondaryDepartment,
      departmentEmail: u.departmentEmail || `${u.department.toLowerCase()}@tecnosystem.com`,
      role: u.role,
      phone: u.phone,
      startDate: u.startDate,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
    }));
  } catch (error) {
    console.warn('[Service Desk] Erro ao carregar usuários.', error);
    return [];
  }
}

export function saveCurrentUser(user: UserProfile | null): void {
  try {
    if (user) {
      writeCollection('session', {
        userId: user.id,
        startedAt: new Date().toISOString(),
      });
    } else {
      writeCollection('session', null);
    }
  } catch (error) {
    console.error('[Service Desk] Falha ao salvar usuário ativo.', error);
  }
}

export function loadCurrentUser(): UserProfile | null {
  try {
    seedDemoData();
    const session = readCollection('session', StoredSessionSchema, null);
    if (!session?.userId) return null;

    const users = readCollection('users', z.array(StoredUserSchema), []);
    const found = users.find((u) => u.id === session.userId);
    if (!found) return null;

    return {
      id: found.id,
      name: found.name,
      email: found.email,
      department: found.department,
      secondaryDepartment: found.secondaryDepartment,
      departmentEmail: found.departmentEmail || `${found.department.toLowerCase()}@tecnosystem.com`,
      role: found.role,
      phone: found.phone,
      startDate: found.startDate,
      isActive: found.isActive,
      mustChangePassword: found.mustChangePassword,
      avatarUrl: found.avatarUrl,
      createdAt: found.createdAt,
    };
  } catch (error) {
    console.warn('[Service Desk] Erro ao carregar usuário ativo.', error);
    return null;
  }
}

/* ----------------------- Trilha de Auditoria ----------------------- */

export function saveAuditLogs(logs: AuditLog[]): void {
  try {
    const stored: StoredAudit[] = logs.map((l) => ({
      id: l.id,
      action: l.action,
      ticketId: l.ticketId || null,
      ticketSnapshotTitle: l.ticketTitle || null,
      performedBy: l.performedBy,
      details: l.details,
      createdAt: l.timestamp,
    }));
    writeCollection('audit', stored);
  } catch (error) {
    console.error('[Service Desk] Falha ao salvar logs de auditoria.', error);
  }
}

export function loadAuditLogs(): AuditLog[] {
  try {
    seedDemoData();
    const stored = readCollection('audit', z.array(StoredAuditSchema), []);
    return stored.map((l) => ({
      id: l.id,
      ticketId: l.ticketId || undefined,
      ticketTitle: l.ticketSnapshotTitle || undefined,
      action: l.action as AuditAction,
      performedBy: l.performedBy,
      details: l.details,
      timestamp: l.createdAt,
    }));
  } catch (error) {
    console.warn('[Service Desk] Erro ao carregar logs de auditoria.', error);
    return [];
  }
}

export function recordAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
  const newLog: AuditLog = {
    id: `audit-${generateId()}`,
    ...log,
    timestamp: new Date().toISOString(),
  };

  const logs = loadAuditLogs();
  const updated = [newLog, ...logs].slice(0, 500);
  saveAuditLogs(updated);
  return newLog;
}
