import { z } from 'zod';
import { supabase } from './supabase';
import type { Database } from '../types/database.types';
import type { Department, Priority, Status, Ticket, TicketEvent, TicketFormData } from '../types/ticket';
import { computeSlaDueAt } from '../utils/sla';

export const TicketFormSchema = z.object({
  title: z.string().min(3, 'O título deve ter ao menos 3 caracteres.'),
  requester: z.string().min(1, 'O solicitante é obrigatório.'),
  email: z.string().email('E-mail corporativo inválido.'),
  department: z.enum(['Financeiro', 'RH', 'Marketing', 'Projetos']),
  assignedDepartment: z.enum(['Financeiro', 'RH', 'Marketing', 'Projetos']),
  category: z.string().min(1, 'A categoria é obrigatória.'),
  priority: z.enum(['Baixa', 'Média', 'Alta', 'Crítica']),
  description: z.string().min(10, 'A descrição deve ter ao menos 10 caracteres.'),
  assignee: z.string().optional().default(''),
});

// Cache auxiliar de departamentos e perfis
let departmentCache: { id: string; code: Department; name: string }[] | null = null;

async function getDepartments() {
  if (departmentCache) return departmentCache;
  const { data } = await supabase.from('departments').select('id, code, name');
  if (data) {
    departmentCache = data as { id: string; code: Department; name: string }[];
  }
  return departmentCache || [];
}

/** Carrega todos os chamados acessíveis pelo usuário atual de acordo com as regras de RLS */
export async function fetchTickets(): Promise<Ticket[]> {
  const departments = await getDepartments();
  const depMap = new Map(departments.map((d) => [d.id, d.code]));

  // Buscar chamados
  const { data: ticketsData, error } = await supabase
    .from('tickets')
    .select(`
      id,
      title,
      description,
      department_id,
      assigned_department_id,
      category,
      priority,
      status,
      requester_id,
      requester_name,
      requester_email,
      assignee_id,
      project_id,
      csat_rating,
      sla_due_at,
      resolved_at,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false });

  if (error || !ticketsData) {
    console.error('[ticketService] Erro ao buscar chamados:', error);
    return [];
  }

  // Buscar nomes de responsáveis se houver
  const assigneeIds = Array.from(new Set(ticketsData.map((t) => t.assignee_id).filter(Boolean))) as string[];
  const assigneeMap = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', assigneeIds);
    profiles?.forEach((p) => assigneeMap.set(p.id, p.name));
  }

  // Buscar histórico de auditoria associado aos chamados
  const ticketIds = ticketsData.map((t) => t.id);
  const { data: auditData } = await supabase
    .from('audit_logs')
    .select('id, ticket_id, action, performed_by, details, created_at')
    .in('ticket_id', ticketIds)
    .order('created_at', { ascending: true });

  const historyByTicket = new Map<string, TicketEvent[]>();
  auditData?.forEach((log) => {
    if (!log.ticket_id) return;
    const list = historyByTicket.get(log.ticket_id) || [];
    list.push({
      id: log.id,
      type: log.action === 'CRIACAO' ? 'created' : log.action === 'COMENTARIO' ? 'comment' : 'status',
      author: log.performed_by.split(' (')[0] || log.performed_by,
      role: log.performed_by.includes('Sistema') ? 'sistema' : 'atendente',
      message: log.details,
      createdAt: log.created_at,
    });
    historyByTicket.set(log.ticket_id, list);
  });

  return ticketsData.map((t) => {
    const deptCode = (depMap.get(t.department_id) || 'Projetos') as Department;
    const assignedDeptCode = (t.assigned_department_id ? depMap.get(t.assigned_department_id) : deptCode) as Department;
    const assigneeName = t.assignee_id ? assigneeMap.get(t.assignee_id) || null : null;

    return {
      id: t.id,
      title: t.title,
      requester: t.requester_name,
      requesterId: t.requester_id,
      email: t.requester_email,
      department: deptCode,
      assignedDepartment: assignedDeptCode,
      category: t.category,
      priority: t.priority as Priority,
      description: t.description,
      status: t.status as Status,
      assignee: assigneeName,
      assigneeId: t.assignee_id,
      projectId: (t as any).project_id || null,
      csatRating: (t as any).csat_rating || null,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      slaDueAt: t.sla_due_at,
      resolvedAt: t.resolved_at,
      history: historyByTicket.get(t.id) || [
        {
          id: `ev-${t.id}-init`,
          type: 'created',
          author: t.requester_name,
          role: 'solicitante',
          message: 'Chamado aberto no sistema.',
          createdAt: t.created_at,
        },
      ],
    };
  });
}

/** Criação de chamado com validação Zod e associação automática com departamento e SLA */
export async function createTicket(formData: TicketFormData): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
  const validation = TicketFormSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message };
  }

  const data = validation.data;
  const departments = await getDepartments();
  const dep = departments.find((d) => d.code === data.department);
  const assignedDep = departments.find((d) => d.code === data.assignedDepartment) || dep;

  if (!dep || !assignedDep) {
    return { success: false, error: 'Departamento informado inválido.' };
  }

  // Buscar ID do responsável se fornecido
  let assigneeId: string | null = null;
  if (data.assignee.trim()) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id')
      .ilike('name', data.assignee.trim())
      .limit(1)
      .maybeSingle();
    assigneeId = prof?.id || null;
  }

  // Obter usuário autenticado
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id || null;

  const { data: created, error } = await supabase
    .from('tickets')
    .insert({
      title: data.title,
      description: data.description,
      department_id: dep.id,
      assigned_department_id: assignedDep.id,
      category: data.category,
      priority: data.priority,
      status: 'Aberto',
      requester_id: userId,
      requester_name: data.requester,
      requester_email: data.email,
      assignee_id: assigneeId,
      project_id: formData.projectId || null,
      sla_due_at: computeSlaDueAt(new Date().toISOString(), data.priority),
    })
    .select()
    .single();

  if (error || !created) {
    return { success: false, error: error?.message || 'Falha ao registrar chamado.' };
  }

  const newTicket: Ticket = {
    id: created.id,
    title: created.title,
    requester: created.requester_name,
    email: created.requester_email,
    department: data.department,
    assignedDepartment: data.assignedDepartment,
    category: created.category,
    priority: created.priority as Priority,
    description: created.description,
    status: created.status as Status,
    assignee: data.assignee.trim() || null,
    createdAt: created.created_at,
    updatedAt: created.updated_at,
    slaDueAt: created.sla_due_at,
    resolvedAt: created.resolved_at,
    history: [
      {
        id: `ev-${created.id}-create`,
        type: 'created',
        author: created.requester_name,
        role: 'solicitante',
        message: 'Chamado aberto pelo solicitante.',
        createdAt: created.created_at,
      },
    ],
  };

  return { success: true, ticket: newTicket };
}

/**
 * Transição de status atômica via RPC Postgres (validação, SLA, auditoria e notificações)
 */
export async function transitionTicketStatus(
  ticketId: string,
  newStatus: Status
): Promise<{ success: boolean; error?: string; status?: string }> {
  const { data, error } = await supabase.rpc('transition_ticket_status', {
    p_ticket_id: ticketId,
    p_new_status: newStatus,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const res = data as { success: boolean; error?: string; status?: string };
  if (!res.success) {
    return { success: false, error: res.error || 'Falha ao transicionar status.' };
  }

  return { success: true, status: res.status };
}

/**
 * Atribuição atômica de responsável e departamento via RPC Postgres
 */
export async function assignTicketAtomic(
  ticketId: string,
  assigneeId?: string | null,
  assignedDepartmentId?: string | null
): Promise<{ success: boolean; error?: string; activeTickets?: number }> {
  const { data, error } = await supabase.rpc('assign_ticket_atomic', {
    p_ticket_id: ticketId,
    p_assignee_id: assigneeId || undefined,
    p_assigned_department_id: assignedDepartmentId || undefined,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const res = data as { success: boolean; error?: string; assignee_active_tickets?: number };
  if (!res.success) {
    return { success: false, error: res.error || 'Falha ao reatribuir chamado.' };
  }

  return { success: true, activeTickets: res.assignee_active_tickets };
}

/** Atualização de chamado (status, prioridade, responsável, etc.) */
export async function updateTicket(
  ticketId: string,
  updates: Partial<{
    title: string;
    description: string;
    status: Status;
    priority: Priority;
    department: Department;
    assignedDepartment: Department;
    assignee: string | null;
  }>
): Promise<{ success: boolean; error?: string }> {
  // Se for apenas alteração de status, utiliza a RPC atômica
  if (
    updates.status !== undefined &&
    updates.title === undefined &&
    updates.description === undefined &&
    updates.priority === undefined &&
    updates.department === undefined &&
    updates.assignedDepartment === undefined &&
    updates.assignee === undefined
  ) {
    return transitionTicketStatus(ticketId, updates.status);
  }

  const departments = await getDepartments();
  const payload: Database['public']['Tables']['tickets']['Update'] = {};

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.priority !== undefined) payload.priority = updates.priority;

  if (updates.department) {
    const dep = departments.find((d) => d.code === updates.department);
    if (dep) payload.department_id = dep.id;
  }
  if (updates.assignedDepartment) {
    const dep = departments.find((d) => d.code === updates.assignedDepartment);
    if (dep) payload.assigned_department_id = dep.id;
  }

  if (updates.assignee !== undefined) {
    if (!updates.assignee) {
      payload.assignee_id = null;
    } else {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .ilike('name', updates.assignee)
        .limit(1)
        .maybeSingle();
      if (prof) payload.assignee_id = prof.id;
    }
  }

  const { error } = await supabase.from('tickets').update(payload).eq('id', ticketId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/** Exclusão de chamado (protegido por RLS com a permissão ticket.delete) */
export async function deleteTicket(ticketId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

