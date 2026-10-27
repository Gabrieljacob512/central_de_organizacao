import { INITIAL_USERS, STORAGE_KEYS } from '../constants/config';
import { buildSeedTickets } from '../data/seed';
import type { AuditLog, Ticket, UserProfile, ViewMode } from '../types/ticket';
import { generateId } from '../utils/id';

/**
 * Camada de persistência baseada em LocalStorage.
 * Gerencia chamados, usuário ativo, lista de colaboradores e trilha de auditoria.
 */

function isTicketArray(value: unknown): value is Ticket[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Ticket).id === 'string' &&
        typeof (item as Ticket).title === 'string' &&
        Array.isArray((item as Ticket).history),
    )
  );
}

/* ----------------------------- Tickets ----------------------------- */

export function saveTickets(tickets: Ticket[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.tickets, JSON.stringify(tickets));
  } catch (error) {
    console.error('[Service Desk] Falha ao salvar chamados no LocalStorage.', error);
  }
}

export function loadTickets(): Ticket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tickets);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (isTicketArray(parsed)) return parsed;
    }
  } catch (error) {
    console.warn('[Service Desk] Dados inválidos no LocalStorage. Recarregando dados de demonstração.', error);
  }

  const seed = buildSeedTickets();
  saveTickets(seed);
  return seed;
}

export function loadViewMode(): ViewMode {
  const saved = localStorage.getItem(STORAGE_KEYS.view);
  if (
    saved &&
    ['overview', 'tickets', 'my-tickets', 'metrics', 'workspace', 'calendar', 'audit', 'settings', 'table', 'kanban'].includes(saved)
  ) {
    return saved as ViewMode;
  }
  return 'overview';
}

export function saveViewMode(view: ViewMode): void {
  localStorage.setItem(STORAGE_KEYS.view, view);
}

export function loadChamadosViewPreference(): 'table' | 'kanban' {
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return 'table'; // No celular o padrão é Lista
  }
  const saved = localStorage.getItem(STORAGE_KEYS.chamadosView);
  return saved === 'kanban' ? 'kanban' : 'table';
}

export function saveChamadosViewPreference(view: 'table' | 'kanban'): void {
  localStorage.setItem(STORAGE_KEYS.chamadosView, view);
}

/* --------------------------- Usuários (Sessão) --------------------------- */

export function saveUsersList(users: UserProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.usersList, JSON.stringify(users));
  } catch (error) {
    console.error('[Service Desk] Falha ao salvar lista de usuários.', error);
  }
}

export function loadUsersList(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.usersList);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Normaliza para garantir propriedades obrigatórias role, password e departmentEmail
        const users = (parsed as UserProfile[]).map((u) => ({
          ...u,
          departmentEmail:
            u.departmentEmail ??
            (u.email ? `${(u.department || 'Projetos').toLowerCase()}@tecnosystem.com` : 'contato@tecnosystem.com'),
          role:
            u.role ??
            (u.email === 'presidente@gmail.com' || u.email === 'presidente@tecnosystem.com'
              ? 'Presidente'
              : 'Membro'),
        }));

        // Garante a existência dos três seed users obrigatórios (Presidente, Diretor de RH, Membro de Projetos)
        const requiredSeeds = INITIAL_USERS.slice(0, 3);
        const additions: UserProfile[] = [];

        for (const seed of requiredSeeds) {
          const exists = users.some((u) => u.email.toLowerCase() === seed.email.toLowerCase());
          if (!exists) {
            additions.push(seed);
          }
        }

        const finalList = [...additions, ...users];
        saveUsersList(finalList);
        return finalList;
      }
    }
  } catch (error) {
    console.warn('[Service Desk] Erro ao carregar usuários salvos.', error);
  }

  saveUsersList(INITIAL_USERS);
  return INITIAL_USERS;
}

export function saveCurrentUser(user: UserProfile | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.currentUser);
    }
  } catch (error) {
    console.error('[Service Desk] Falha ao salvar usuário ativo.', error);
  }
}

export function loadCurrentUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof (parsed as UserProfile).id === 'string') {
        const u = parsed as UserProfile;
        return {
          ...u,
          departmentEmail:
            u.departmentEmail ?? `${(u.department || 'Projetos').toLowerCase()}@tecnosystem.com`,
          role: u.role ?? 'Membro',
        };
      }
    }
  } catch (error) {
    console.warn('[Service Desk] Erro ao carregar usuário ativo.', error);
  }

  // Auth Guard: se não houver login ativo salvo, retorna null para exibir a tela de autenticação
  return null;
}

/* ----------------------- Trilha de Auditoria ----------------------- */

export function saveAuditLogs(logs: AuditLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.auditLogs, JSON.stringify(logs));
  } catch (error) {
    console.error('[Service Desk] Falha ao salvar logs de auditoria.', error);
  }
}

export function loadAuditLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.auditLogs);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as AuditLog[];
    }
  } catch (error) {
    console.warn('[Service Desk] Erro ao carregar logs de auditoria.', error);
  }

  // Logs iniciais baseados nos chamados de demonstração
  const initialLogs: AuditLog[] = [
    {
      id: 'log-seed-01',
      ticketId: 'TS-1001',
      ticketTitle: 'Notebook não liga após atualização do Windows',
      action: 'CRIACAO',
      performedBy: 'Mariana Souza (mariana.souza@tecnosystem.com.br)',
      details: 'Chamado TS-1001 aberto para o departamento TI com prioridade Alta',
      timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    },
    {
      id: 'log-seed-02',
      ticketId: 'TS-1001',
      ticketTitle: 'Notebook não liga após atualização do Windows',
      action: 'ATRIBUICAO_DEPARTAMENTO',
      performedBy: 'Service Desk (sistema@tecnosystem.com.br)',
      details: 'Chamado atribuído a Carlos Mendes da equipe TI',
      timestamp: new Date(Date.now() - 2.8 * 3600000).toISOString(),
    },
    {
      id: 'log-seed-03',
      ticketId: 'TS-1001',
      ticketTitle: 'Notebook não liga após atualização do Windows',
      action: 'ALTERACAO_STATUS',
      performedBy: 'Carlos Mendes (carlos.mendes@tecnosystem.com.br)',
      details: 'Status alterado de Aberto para Em Andamento',
      timestamp: new Date(Date.now() - 2.7 * 3600000).toISOString(),
    },
    {
      id: 'log-seed-04',
      ticketId: 'TS-1002',
      ticketTitle: 'Reembolso de despesas de viagem — Congresso em São Paulo',
      action: 'CRIACAO',
      performedBy: 'Bruno Carvalho (bruno.carvalho@tecnosystem.com.br)',
      details: 'Chamado TS-1002 aberto para o departamento Financeiro com prioridade Média',
      timestamp: new Date(Date.now() - 20 * 3600000).toISOString(),
    },
    {
      id: 'log-seed-05',
      ticketId: 'TS-1004',
      ticketTitle: 'Ar-condicionado da sala de reuniões 2 vazando água',
      action: 'RESOLUCAO',
      performedBy: 'Eduardo Ferreira (eduardo.ferreira@tecnosystem.com.br)',
      details: 'Chamado TS-1004 marcado como Resolvido',
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
    },
  ];

  saveAuditLogs(initialLogs);
  return initialLogs;
}

export function recordAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
  const newLog: AuditLog = {
    id: `audit-${generateId()}`,
    ...log,
    timestamp: new Date().toISOString(),
  };

  const logs = loadAuditLogs();
  const updated = [newLog, ...logs].slice(0, 500); // mantém os últimos 500 logs
  saveAuditLogs(updated);
  return newLog;
}
