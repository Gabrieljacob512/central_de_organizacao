import { useCallback, useEffect, useState } from 'react';
import { SERVICE_DESK_NAME } from '../constants/config';
import { buildSeedTickets } from '../data/seed';
import { loadTickets, saveTickets } from '../services/storage';
import {
  fetchTickets,
  createTicket as createTicketInDb,
  updateTicket as updateTicketInDb,
  deleteTicket as deleteTicketInDb,
} from '../services/ticketService';
import type {
  ActionResult,
  AuditLog,
  AuthorRole,
  Department,
  EventType,
  Status,
  Ticket,
  TicketEvent,
  TicketFormData,
  UserProfile,
} from '../types/ticket';
import { generateId, generateTicketId } from '../utils/id';
import { computeSlaDueAt, isClosedStatus } from '../utils/sla';
import { validateTransition } from '../utils/workflow';

/**
 * Hook central de estado dos chamados (CRUD + histórico + trilha de auditoria).
 * Toda alteração é sincronizada com o Supabase e persistida no LocalStorage como cache.
 */

const FIELD_LABELS: Record<keyof TicketFormData, string> = {
  title: 'Título',
  requester: 'Solicitante',
  email: 'E-mail',
  department: 'Departamento de Origem',
  assignedDepartment: 'Departamento Responsável',
  category: 'Categoria',
  priority: 'Prioridade',
  description: 'Descrição',
  assignee: 'Responsável',
  projectId: 'Projeto Associado',
};


type EditableFields = Pick<
  Ticket,
  'title' | 'requester' | 'email' | 'department' | 'assignedDepartment' | 'category' | 'priority' | 'description' | 'assignee'
>;

function makeEvent(type: EventType, author: string, role: AuthorRole, message: string): TicketEvent {
  return { id: generateId(), type, author, role, message, createdAt: new Date().toISOString() };
}

/** Normaliza os dados do formulário para o formato persistido. */
function normalizeForm(data: TicketFormData): EditableFields {
  return {
    title: data.title.trim(),
    requester: data.requester.trim(),
    email: data.email.trim().toLowerCase(),
    department: data.department,
    assignedDepartment: data.assignedDepartment,
    category: data.category,
    priority: data.priority,
    description: data.description.trim(),
    assignee: data.assignee.trim() || null,
  };
}

export function useTickets(
  currentUser?: UserProfile | null,
  onAudit?: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void,
) {
  const [tickets, setTickets] = useState<Ticket[]>(loadTickets);

  // Sincroniza os chamados do banco de dados (respeitando o RLS do usuário ativo)
  useEffect(() => {
    let mounted = true;
    fetchTickets()
      .then((dbTickets) => {
        if (!mounted) return;
        if (dbTickets.length > 0) {
          setTickets(dbTickets);
          saveTickets(dbTickets);
        }
      })
      .catch((err) => {
        console.warn('[useTickets] Erro ao carregar chamados do Supabase:', err);
      });

    return () => {
      mounted = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    saveTickets(tickets);
  }, [tickets]);

  const performer = currentUser
    ? `${currentUser.name} [${currentUser.role}] (${currentUser.email})`
    : 'Sistema (Service Desk)';

  const replaceTicket = useCallback((updated: Ticket) => {
    setTickets((prev) => prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
  }, []);

  /** CREATE — abre um novo chamado com SLA calculado automaticamente. */
  const createTicket = useCallback(
    (data: TicketFormData): Ticket => {
      const fields = normalizeForm(data);
      const nowIso = new Date().toISOString();
      const history: TicketEvent[] = [
        makeEvent('created', fields.requester, 'solicitante', 'Chamado aberto pelo solicitante.'),
      ];
      if (fields.assignee) {
        history.push(makeEvent('assignment', SERVICE_DESK_NAME, 'sistema', `Chamado atribuído a ${fields.assignee}.`));
      }

      const tempId = generateTicketId(tickets);
      const ticket: Ticket = {
        id: tempId,
        ...fields,
        status: 'Aberto',
        createdAt: nowIso,
        updatedAt: nowIso,
        slaDueAt: computeSlaDueAt(nowIso, fields.priority),
        resolvedAt: null,
        history,
      };

      setTickets((prev) => [ticket, ...prev]);

      // Persiste no Supabase
      createTicketInDb(data)
        .then((res) => {
          if (res.success && res.ticket) {
            setTickets((prev) => prev.map((t) => (t.id === tempId ? res.ticket! : t)));
          }
        })
        .catch((err) => {
          console.error('[useTickets] Erro ao salvar chamado no Supabase:', err);
        });

      onAudit?.({
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        action: 'CRIACAO',
        performedBy: performer,
        details: `Chamado ${ticket.id} aberto para a equipe de ${ticket.assignedDepartment ?? ticket.department} com prioridade ${ticket.priority}.`,
      });

      return ticket;
    },
    [tickets, performer, onAudit],
  );

  /** UPDATE — edita informações do chamado e registra as alterações no histórico. */
  const updateTicket = useCallback(
    (id: string, data: TicketFormData): ActionResult => {
      const current = tickets.find((ticket) => ticket.id === id);
      if (!current) return { ok: false, message: 'Chamado não encontrado.' };

      const next = normalizeForm(data);
      const changed = (Object.keys(next) as (keyof EditableFields)[]).filter(
        (key) => (current[key] ?? '') !== (next[key] ?? ''),
      );
      if (changed.length === 0) return { ok: false, message: 'Nenhuma alteração foi detectada.' };

      const author = current.assignee ?? SERVICE_DESK_NAME;
      const events: TicketEvent[] = [];
      const fieldChanges = changed
        .filter((key) => key !== 'assignee')
        .map((key) => (key === 'priority' ? `Prioridade (${current.priority} → ${next.priority}, SLA recalculado)` : FIELD_LABELS[key]));

      if (fieldChanges.length > 0) {
        events.push(makeEvent('update', author, 'sistema', `Informações atualizadas: ${fieldChanges.join(', ')}.`));
      }
      if (changed.includes('assignee')) {
        events.push(
          makeEvent(
            'assignment',
            SERVICE_DESK_NAME,
            'sistema',
            next.assignee ? `Chamado atribuído a ${next.assignee}.` : 'Responsável removido do chamado.',
          ),
        );
      }

      replaceTicket({
        ...current,
        ...next,
        slaDueAt: changed.includes('priority') ? computeSlaDueAt(current.createdAt, next.priority) : current.slaDueAt,
        updatedAt: new Date().toISOString(),
        history: [...current.history, ...events],
      });

      // Sincroniza atualização no Supabase
      updateTicketInDb(id, {
        title: next.title,
        description: next.description,
        priority: next.priority,
        department: next.department,
        assignedDepartment: next.assignedDepartment,
        assignee: next.assignee,
      }).catch((err) => {
        console.error('[useTickets] Erro ao atualizar chamado no Supabase:', err);
      });

      // Auditoria de mudanças específicas
      if (changed.includes('priority')) {
        onAudit?.({
          ticketId: current.id,
          ticketTitle: current.title,
          action: 'ALTERACAO_PRIORIDADE',
          performedBy: performer,
          details: `Prioridade alterada de ${current.priority} para ${next.priority} (SLA recalculado).`,
        });
      }
      if (changed.includes('assignedDepartment')) {
        onAudit?.({
          ticketId: current.id,
          ticketTitle: current.title,
          action: 'ATRIBUICAO_DEPARTAMENTO',
          performedBy: performer,
          details: `Departamento responsável alterado para ${next.assignedDepartment}.`,
        });
      }
      if (changed.includes('assignee')) {
        onAudit?.({
          ticketId: current.id,
          ticketTitle: current.title,
          action: 'ATRIBUICAO_DEPARTAMENTO',
          performedBy: performer,
          details: next.assignee ? `Responsável alterado para ${next.assignee}.` : 'Responsável desatribuído.',
        });
      }

      return { ok: true, message: `Chamado ${id} atualizado com sucesso.` };
    },
    [tickets, replaceTicket, performer, onAudit],
  );

  /** UPDATE — transição de status respeitando o fluxo controlado. */
  const changeStatus = useCallback(
    (id: string, to: Status): ActionResult => {
      const current = tickets.find((ticket) => ticket.id === id);
      if (!current) return { ok: false, message: 'Chamado não encontrado.' };

      const validation = validateTransition(current, to);
      if (!validation.ok) return validation;

      const nowIso = new Date().toISOString();
      const reopening = isClosedStatus(current.status) && !isClosedStatus(to);
      const isResolving = isClosedStatus(to);
      const message = reopening ? `Chamado reaberto: ${current.status} → ${to}.` : `Status alterado: ${current.status} → ${to}.`;

      replaceTicket({
        ...current,
        status: to,
        resolvedAt: isClosedStatus(to) ? (current.resolvedAt ?? nowIso) : null,
        updatedAt: nowIso,
        history: [...current.history, makeEvent('status', current.assignee ?? SERVICE_DESK_NAME, 'sistema', message)],
      });

      // Sincroniza no Supabase (triggers cuidam da auditoria e recalculo de SLA)
      updateTicketInDb(id, { status: to }).catch((err) => {
        console.error('[useTickets] Erro ao sincronizar status no Supabase:', err);
      });

      if (isResolving) {
        onAudit?.({
          ticketId: current.id,
          ticketTitle: current.title,
          action: 'RESOLUCAO',
          performedBy: performer,
          details: `Chamado ${current.id} marcado como ${to}.`,
        });
      } else {
        onAudit?.({
          ticketId: current.id,
          ticketTitle: current.title,
          action: 'ALTERACAO_STATUS',
          performedBy: performer,
          details: `Status alterado de ${current.status} para ${to}.`,
        });
      }

      return { ok: true, message: reopening ? `Chamado ${id} reaberto como "${to}".` : `Chamado ${id} movido para "${to}".` };
    },
    [tickets, replaceTicket, performer, onAudit],
  );

  /** UPDATE — reatribuição de responsável ou departamento. */
  const assignTicket = useCallback(
    (id: string, assignee: string | null, assignedDepartment?: Department): ActionResult => {
      const current = tickets.find((ticket) => ticket.id === id);
      if (!current) return { ok: false, message: 'Chamado não encontrado.' };

      const deptChanged = assignedDepartment && assignedDepartment !== current.assignedDepartment;
      const assigneeChanged = current.assignee !== assignee;

      if (!deptChanged && !assigneeChanged) {
        return { ok: false, message: 'Nenhuma alteração de atribuição foi realizada.' };
      }

      let message = '';
      if (assigneeChanged) {
        message = assignee
          ? current.assignee
            ? `Chamado reatribuído de ${current.assignee} para ${assignee}.`
            : `Chamado atribuído a ${assignee}.`
          : `Responsável ${current.assignee} removido do chamado.`;
      }
      if (deptChanged) {
        message += (message ? ' ' : '') + `Departamento responsável definido como ${assignedDepartment}.`;
      }

      replaceTicket({
        ...current,
        assignee,
        assignedDepartment: assignedDepartment ?? current.assignedDepartment,
        updatedAt: new Date().toISOString(),
        history: [...current.history, makeEvent('assignment', SERVICE_DESK_NAME, 'sistema', message)],
      });

      updateTicketInDb(id, { assignee, assignedDepartment }).catch((err) => {
        console.error('[useTickets] Erro ao sincronizar atribuição no Supabase:', err);
      });

      onAudit?.({
        ticketId: current.id,
        ticketTitle: current.title,
        action: 'ATRIBUICAO_DEPARTAMENTO',
        performedBy: performer,
        details: message,
      });

      return { ok: true, message: `Atribuição atualizada para o chamado ${id}.` };
    },
    [tickets, replaceTicket, performer, onAudit],
  );

  /** UPDATE — comentário de solicitante ou atendente no histórico. */
  const addComment = useCallback(
    (id: string, author: string, role: AuthorRole, message: string): ActionResult => {
      const current = tickets.find((ticket) => ticket.id === id);
      if (!current) return { ok: false, message: 'Chamado não encontrado.' };
      const text = message.trim();
      if (!text) return { ok: false, message: 'Escreva uma mensagem antes de enviar.' };

      replaceTicket({
        ...current,
        updatedAt: new Date().toISOString(),
        history: [...current.history, makeEvent('comment', author, role, text)],
      });

      onAudit?.({
        ticketId: current.id,
        ticketTitle: current.title,
        action: 'COMENTARIO',
        performedBy: performer,
        details: `Novo comentário de ${author} (${role}): "${text.length > 50 ? text.slice(0, 47) + '...' : text}"`,
      });

      return { ok: true, message: 'Mensagem adicionada ao histórico.' };
    },
    [tickets, replaceTicket, performer, onAudit],
  );

  /** DELETE — remove definitivamente o chamado. */
  const deleteTicket = useCallback(
    (id: string): ActionResult => {
      const target = tickets.find((ticket) => ticket.id === id);
      if (!target) return { ok: false, message: 'Chamado não encontrado.' };

      setTickets((prev) => prev.filter((ticket) => ticket.id !== id));

      deleteTicketInDb(id).catch((err) => {
        console.error('[useTickets] Erro ao excluir chamado no Supabase:', err);
      });

      onAudit?.({
        ticketId: target.id,
        ticketTitle: target.title,
        action: 'EXCLUSAO',
        performedBy: performer,
        details: `Chamado ${target.id} ("${target.title}") foi excluído permanentemente.`,
      });

      return { ok: true, message: `Chamado ${id} excluído permanentemente.` };
    },
    [tickets, performer, onAudit],
  );

  /** Restaura os dados de demonstração (Seed Data). */
  const resetData = useCallback(() => {
    fetchTickets().then((dbTickets) => {
      if (dbTickets.length > 0) {
        setTickets(dbTickets);
        saveTickets(dbTickets);
      } else {
        const seed = buildSeedTickets();
        setTickets(seed);
        saveTickets(seed);
      }
    });
  }, []);

  return { tickets, createTicket, updateTicket, changeStatus, assignTicket, addComment, deleteTicket, resetData };
}
