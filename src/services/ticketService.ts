import { z } from 'zod';
import {
  readCollection,
  writeCollection,
  mutate,
  generateTicketCode,
  StoredTicketSchema,
  StoredCommentSchema,
  StoredAttachmentMetaSchema,
  StoredUserSchema,
  type StoredTicket,
} from '../data/storage';
import { seedDemoData } from '../data/seed';
import { deleteFiles } from '../data/indexedDb';
import type { AuthorRole, Priority, Status, Ticket, TicketFormData, UserProfile } from '../types/ticket';
import { computeSlaDueAt } from '../utils/sla';

export const TicketFormSchema = z.object({
  title: z.string().min(3, 'O título deve ter ao menos 3 caracteres.'),
  requester: z.string().min(1, 'O solicitante é obrigatório.'),
  email: z.string().email('E-mail corporativo inválido.'),
  department: z.enum(['Administração', 'Financeiro', 'RH', 'Marketing', 'Projetos']),
  assignedDepartment: z.enum(['Financeiro', 'RH', 'Marketing', 'Projetos']),
  category: z.string().min(1, 'A categoria é obrigatória.'),
  priority: z.enum(['Baixa', 'Média', 'Alta', 'Crítica']),
  description: z.string().min(10, 'A descrição deve ter ao menos 10 caracteres.'),
  assignee: z.string().optional().default(''),
});

export function mapStoredTicketToTicket(t: StoredTicket): Ticket {
  return {
    id: t.id,
    code: t.code,
    title: t.title,
    requester: t.requester,
    email: t.email,
    department: t.department,
    assignedDepartment: t.assignedDepartment,
    category: t.category,
    priority: t.priority as Priority,
    status: t.status as Status,
    assignee: t.assignee || null,
    description: t.description,
    projectId: t.projectId || undefined,
    csatRating: t.csatRating ?? undefined,
    slaDueAt: t.slaDueAt,
    resolvedAt: t.resolvedAt || null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    history: (t.history || []).map((h) => ({
      ...h,
      type: h.type === 'assigned' ? ('assignment' as const) : h.type,
      role: (['solicitante', 'atendente', 'sistema'].includes(h.role) ? h.role : 'sistema') as AuthorRole,
    })),
  };
}

/** Carrega todos os chamados da coleção LocalStorage */
export async function fetchTickets(): Promise<Ticket[]> {
  seedDemoData();
  const tickets = readCollection('tickets', z.array(StoredTicketSchema), []);
  return tickets.map(mapStoredTicketToTicket);
}

/** Criação de chamado com validação Zod, código legível (#0001) e auditoria */
export async function createTicket(
  formData: TicketFormData,
  currentUser?: UserProfile | null
): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
  const validation = TicketFormSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message };
  }

  const data = validation.data;
  const now = new Date().toISOString();
  const code = generateTicketCode();
  const ticketId = crypto.randomUUID();

  // Buscar diretores do setor de destino para notificar
  const allUsers = readCollection('users', z.array(StoredUserSchema), []);
  const directors = allUsers.filter(
    (u) =>
      u.isActive &&
      (u.department === data.assignedDepartment || u.secondaryDepartment === data.assignedDepartment) &&
      (u.role.toLowerCase().includes('diretor') || u.role.toLowerCase().includes('presidente'))
  );

  const notificationsToSend = directors.map((dir) => ({
    userId: dir.id,
    title: `Novo chamado ${code}`,
    message: `${data.requester} abriu um chamado para o setor ${data.assignedDepartment}: "${data.title}"`,
    type: 'ticket',
    link: ticketId,
  }));

  try {
    const newStoredTicket: StoredTicket = {
      id: ticketId,
      code,
      title: data.title,
      description: data.description,
      department: data.department,
      assignedDepartment: data.assignedDepartment,
      category: data.category,
      priority: data.priority,
      status: 'Aberto',
      requester: data.requester,
      email: data.email,
      assignee: data.assignee || null,
      projectId: formData.projectId || null,
      csatRating: null,
      slaDueAt: computeSlaDueAt(now, data.priority),
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          id: crypto.randomUUID(),
          type: 'created',
          author: data.requester,
          role: 'solicitante',
          message: 'Chamado aberto no sistema.',
          createdAt: now,
        },
      ],
    };

    mutate({
      user: currentUser,
      action: () => {
        const tickets = readCollection('tickets', z.array(StoredTicketSchema), []);
        writeCollection('tickets', [newStoredTicket, ...tickets]);
      },
      audit: {
        action: 'CRIACAO_CHAMADO',
        ticketId,
        ticketSnapshotTitle: data.title,
        details: `Chamado ${code} criado para o setor ${data.assignedDepartment} com prioridade ${data.priority}.`,
      },
      notify: notificationsToSend,
    });

    return { success: true, ticket: mapStoredTicketToTicket(newStoredTicket) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao salvar chamado.' };
  }
}

/** Transição de status do chamado */
export async function transitionTicketStatus(
  ticketId: string,
  newStatus: Status,
  reason: string = '',
  currentUser?: UserProfile | null
): Promise<{ success: boolean; error?: string; ticket?: Ticket }> {
  try {
    let updatedTicket: StoredTicket | null = null;

    mutate({
      user: currentUser,
      action: () => {
        const tickets = readCollection('tickets', z.array(StoredTicketSchema), []);
        const target = tickets.find((t) => t.id === ticketId);
        if (!target) throw new Error('Chamado não encontrado.');

        const now = new Date().toISOString();
        const oldStatus = target.status;
        target.status = newStatus;
        target.updatedAt = now;

        if (newStatus === 'Resolvido' || newStatus === 'Fechado') {
          target.resolvedAt = now;
        } else if (newStatus === 'Aberto' || newStatus === 'Em Andamento') {
          target.resolvedAt = null;
        }

        const authorName = currentUser?.name || 'Sistema';
        const role = currentUser?.role.toLowerCase().includes('solicitante') ? 'solicitante' : 'atendente';

        target.history = [
          ...(target.history || []),
          {
            id: crypto.randomUUID(),
            type: 'status',
            author: authorName,
            role,
            message: reason ? `Status: ${oldStatus} → ${newStatus}. Motivo: ${reason}` : `Status alterado: ${oldStatus} → ${newStatus}.`,
            createdAt: now,
          },
        ];

        updatedTicket = target;
        writeCollection('tickets', [...tickets]);
      },
      audit: {
        action: 'ALTERACAO_STATUS',
        ticketId,
        details: `Status alterado para "${newStatus}". ${reason ? `Motivo: ${reason}` : ''}`,
      },
    });

    return { success: true, ticket: updatedTicket ? mapStoredTicketToTicket(updatedTicket) : undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao atualizar status.' };
  }
}

/** Atribuição de responsável ao chamado */
export async function assignTicket(
  ticketId: string,
  assigneeName: string | null,
  currentUser?: UserProfile | null
): Promise<{ success: boolean; error?: string; ticket?: Ticket }> {
  try {
    const tickets = readCollection('tickets', z.array(StoredTicketSchema), []);
    const target = tickets.find((t) => t.id === ticketId);
    if (!target) throw new Error('Chamado não encontrado.');

    let notifyAssigneeId: string | undefined;

    const allUsers = readCollection('users', z.array(StoredUserSchema), []);
    if (assigneeName) {
      const found = allUsers.find((u) => u.name.toLowerCase() === assigneeName.toLowerCase());
      notifyAssigneeId = found?.id;
    }

    let updatedTicket: StoredTicket = target;

    mutate({
      user: currentUser,
      action: () => {
        const now = new Date().toISOString();
        target.assignee = assigneeName;
        target.updatedAt = now;

        target.history = [
          ...(target.history || []),
          {
            id: crypto.randomUUID(),
            type: 'assigned',
            author: currentUser?.name || 'Sistema',
            role: 'atendente',
            message: assigneeName ? `Chamado atribuído a ${assigneeName}.` : 'Chamado desatribuído.',
            createdAt: now,
          },
        ];

        updatedTicket = target;
        writeCollection('tickets', [...tickets]);
      },
      audit: {
        action: 'ATRIBUICAO_CHAMADO',
        ticketId,
        details: assigneeName ? `Atribuído a ${assigneeName}.` : 'Responsável removido.',
      },
      notify: notifyAssigneeId
        ? [
            {
              userId: notifyAssigneeId,
              title: 'Chamado atribuído a você',
              message: `Você foi definido como responsável pelo chamado "${target.title}".`,
              type: 'assignment',
              link: ticketId,
            },
          ]
        : undefined,
    });

    return { success: true, ticket: mapStoredTicketToTicket(updatedTicket) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao atribuir chamado.' };
  }
}

/** Atualização genérica de chamado */
export async function updateTicket(
  ticketId: string,
  patch: Partial<Ticket>,
  currentUser?: UserProfile | null
): Promise<{ success: boolean; error?: string; ticket?: Ticket }> {
  try {
    let updatedTicket: StoredTicket | null = null;

    mutate({
      user: currentUser,
      action: () => {
        const tickets = readCollection('tickets', z.array(StoredTicketSchema), []);
        const target = tickets.find((t) => t.id === ticketId);
        if (!target) throw new Error('Chamado não encontrado.');

        Object.assign(target, patch, { updatedAt: new Date().toISOString() });
        updatedTicket = target;
        writeCollection('tickets', [...tickets]);
      },
      audit: {
        action: 'EDICAO_CHAMADO',
        ticketId,
        details: 'Campos do chamado atualizados.',
      },
    });

    return { success: true, ticket: updatedTicket ? mapStoredTicketToTicket(updatedTicket) : undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha ao editar chamado.' };
  }
}

/** Exclusão de chamado com remoção de arquivos e auditoria com snapshot do título */
export async function deleteTicket(
  ticketId: string,
  currentUser?: UserProfile | null
): Promise<{ ok: boolean; message: string }> {
  try {
    let snapshotTitle = '';

    mutate({
      user: currentUser,
      permission: 'ticket.delete',
      permissionContext: {
        ticket: (() => {
          const tickets = readCollection('tickets', z.array(StoredTicketSchema), []);
          const t = tickets.find((item) => item.id === ticketId);
          return t ? mapStoredTicketToTicket(t) : undefined;
        })(),
      },
      action: () => {
        const tickets = readCollection('tickets', z.array(StoredTicketSchema), []);
        const target = tickets.find((t) => t.id === ticketId);
        if (!target) throw new Error('Chamado não encontrado.');
        snapshotTitle = target.title;

        // Remover anexos associados do IndexedDB
        const attachments = readCollection('attachments', z.array(StoredAttachmentMetaSchema), []);
        const toDeleteFiles = attachments.filter((a) => a.ticketId === ticketId);
        const fileIds = toDeleteFiles.map((a) => a.storageKey);
        deleteFiles(fileIds).catch((e) => console.warn('[ticketService] Erro ao excluir arquivos:', e));

        // Limpar comentários e anexos do LocalStorage
        const remainingAttachments = attachments.filter((a) => a.ticketId !== ticketId);
        writeCollection('attachments', remainingAttachments);

        const comments = readCollection('comments', z.array(StoredCommentSchema), []);
        const remainingComments = comments.filter((c) => c.ticketId !== ticketId);
        writeCollection('comments', remainingComments);

        // Remover chamado
        const remainingTickets = tickets.filter((t) => t.id !== ticketId);
        writeCollection('tickets', remainingTickets);
      },
      audit: {
        action: 'EXCLUSAO_CHAMADO',
        ticketId,
        ticketSnapshotTitle: snapshotTitle,
        details: `Chamado "${snapshotTitle}" excluído com sucesso.`,
      },
    });

    return { ok: true, message: `Chamado "${snapshotTitle}" excluído com sucesso.` };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Falha ao excluir chamado.' };
  }
}

/** Reabertura controlada de chamados (Regra dos 7 dias) */
export async function reopenTicket(
  ticketId: string,
  reason: string,
  currentUser?: UserProfile | null
): Promise<{ success: boolean; error?: string }> {
  const tickets = readCollection('tickets', z.array(StoredTicketSchema), []);
  const target = tickets.find((t) => t.id === ticketId);
  if (!target) return { success: false, error: 'Chamado não encontrado.' };

  if (target.status !== 'Resolvido') {
    return { success: false, error: 'Apenas chamados no status "Resolvido" podem ser reabertos.' };
  }

  if (target.resolvedAt) {
    const resolvedTime = new Date(target.resolvedAt).getTime();
    const diffDays = (Date.now() - resolvedTime) / (1000 * 3600 * 24);
    if (diffDays > 7) {
      return { success: false, error: 'O prazo de 7 dias para reabertura deste chamado expirou.' };
    }
  }

  const res = await transitionTicketStatus(ticketId, 'Em Andamento', `Reaberto pelo usuário: ${reason}`, currentUser);
  return { success: res.success, error: res.error };
}
