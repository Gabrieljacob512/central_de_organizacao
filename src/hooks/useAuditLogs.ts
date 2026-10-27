import { useCallback, useEffect, useState } from 'react';
import { fetchAuditLogs } from '../services/auditService';
import { loadAuditLogs, recordAuditLog, saveAuditLogs } from '../services/storage';
import type { AuditLog } from '../types/ticket';

/**
 * Hook de gerenciamento da trilha de auditoria global da Tecno System.
 * Sincroniza com a tabela audit_logs imutável do Postgres (Supabase).
 */
export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>(loadAuditLogs);

  useEffect(() => {
    let mounted = true;
    fetchAuditLogs()
      .then((dbLogs) => {
        if (!mounted) return;
        if (dbLogs.length > 0) {
          setLogs(dbLogs);
          saveAuditLogs(dbLogs);
        }
      })
      .catch((err) => {
        console.warn('[useAuditLogs] Erro ao carregar logs do Supabase:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

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
    fetchAuditLogs()
      .then((dbLogs) => {
        if (dbLogs.length > 0) {
          setLogs(dbLogs);
          saveAuditLogs(dbLogs);
        } else {
          setLogs(loadAuditLogs());
        }
      })
      .catch(() => {
        setLogs(loadAuditLogs());
      });
  }, []);

  return {
    logs,
    addAuditLog,
    clearLogs,
    refreshLogs,
  };
}
