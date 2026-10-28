import { z } from 'zod';
import { readCollection, StoredAuditSchema } from '../data/storage';
import type { AuditAction, AuditLog } from '../types/ticket';

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  try {
    const logs = readCollection('audit', z.array(StoredAuditSchema), []);

    return logs.map((log) => ({
      id: log.id,
      ticketId: log.ticketId || undefined,
      ticketTitle: log.ticketSnapshotTitle || undefined,
      action: log.action as AuditAction,
      performedBy: log.performedBy,
      details: log.details,
      timestamp: log.createdAt,
    }));
  } catch (err) {
    console.error('[auditService] Erro ao buscar logs de auditoria:', err);
    return [];
  }
}
