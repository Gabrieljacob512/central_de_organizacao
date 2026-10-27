import { useCallback, useState } from 'react';
import { loadAuditLogs, recordAuditLog, saveAuditLogs } from '../services/storage';
import type { AuditLog } from '../types/ticket';

/**
 * Hook de gerenciamento da trilha de auditoria global da Tecno System.
 * Persiste 'auditLogs' no LocalStorage.
 */
export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>(loadAuditLogs);

  const addAuditLog = useCallback((data: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog => {
    const created = recordAuditLog(data);
    setLogs((prev) => [created, ...prev]);
    return created;
  }, []);

  const clearLogs = useCallback(() => {
    saveAuditLogs([]);
    setLogs([]);
  }, []);

  const refreshLogs = useCallback(() => {
    setLogs(loadAuditLogs());
  }, []);

  return {
    logs,
    addAuditLog,
    clearLogs,
    refreshLogs,
  };
}
