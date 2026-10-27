import { supabase } from './supabase';
import type { AuditAction, AuditLog } from '../types/ticket';

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, ticket_id, ticket_title, action, performed_by, details, created_at')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('[auditService] Erro ao buscar logs de auditoria:', error);
    return [];
  }

  return data.map((log) => ({
    id: log.id,
    ticketId: log.ticket_id || undefined,
    ticketTitle: log.ticket_title || undefined,
    action: log.action as AuditAction,
    performedBy: log.performed_by,
    details: log.details,
    timestamp: log.created_at,
  }));
}
