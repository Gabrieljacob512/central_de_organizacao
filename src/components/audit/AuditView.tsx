import {
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  FilePlus2,
  Filter,
  History,
  MessageSquare,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AuditAction, AuditLog, UserProfile } from '../../types/ticket';
import { formatDateTime, normalizeText } from '../../utils/format';
import { canViewAudit } from '../../utils/rbac';

interface AuditViewProps {
  currentUser: UserProfile;
  logs: AuditLog[];
  onClearLogs?: () => void;
  onNavigateHome: () => void;
}

const ACTION_CONFIG: Record<AuditAction, { label: string; badge: string; icon: LucideIcon }> = {
  CRIACAO: {
    label: 'Criação',
    badge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/80 dark:bg-blue-950/60 dark:text-blue-300',
    icon: FilePlus2,
  },
  ALTERACAO_STATUS: {
    label: 'Status',
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:text-indigo-300',
    icon: ArrowRightLeft,
  },
  ALTERACAO_PRIORIDADE: {
    label: 'Prioridade',
    badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300',
    icon: AlertCircle,
  },
  ATRIBUICAO_DEPARTAMENTO: {
    label: 'Atribuição',
    badge: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/80 dark:bg-purple-950/60 dark:text-purple-300',
    icon: UserCheck,
  },
  RESOLUCAO: {
    label: 'Resolução',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  EXCLUSAO: {
    label: 'Exclusão',
    badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/80 dark:bg-rose-950/60 dark:text-rose-300',
    icon: Trash2,
  },
  COMENTARIO: {
    label: 'Comentário',
    badge: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/80 dark:bg-sky-950/60 dark:text-sky-300',
    icon: MessageSquare,
  },
  CADASTRO_COLABORADOR: {
    label: 'Novo Colaborador',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300',
    icon: UserCheck,
  },
  EXCLUSAO_COLABORADOR: {
    label: 'Colaborador Removido',
    badge: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/80 dark:bg-rose-950/60 dark:text-rose-300',
    icon: Trash2,
  },
  ATRIBUICAO_RESPONSAVEL: {
    label: 'Responsável',
    badge: 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800/80 dark:bg-cyan-950/60 dark:text-cyan-300',
    icon: UserCheck,
  },
  ALTERACAO_PERFIL: {
    label: 'Perfil',
    badge: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800/80 dark:bg-violet-950/60 dark:text-violet-300',
    icon: UserCheck,
  },
};

export function AuditView({
  currentUser,
  logs,
  onClearLogs,
  onNavigateHome,
}: AuditViewProps) {
  const hasAccess = canViewAudit(currentUser);

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<AuditAction | 'ALL'>('ALL');

  // Filtragem de logs de acordo com cargo
  // Se Diretor: apenas logs vinculados ao setor dele (se o backend já não filtrou via RLS)
  const accessibleLogs = useMemo(() => {
    if (currentUser.role === 'Presidente') return logs;
    if (currentUser.role === 'Diretor') {
      const dept = currentUser.department;
      return logs.filter((l) => {
        // Se log possui ticketTitle ou details mencionando o depto
        return (
          l.details.toLowerCase().includes(dept.toLowerCase()) ||
          l.performedBy.toLowerCase().includes(dept.toLowerCase())
        );
      });
    }
    return [];
  }, [logs, currentUser]);

  const filteredLogs = useMemo(() => {
    const term = normalizeText(search);
    return accessibleLogs.filter((log) => {
      if (filterAction !== 'ALL' && log.action !== filterAction) return false;
      if (!term) return true;
      return (
        (log.ticketId && normalizeText(log.ticketId).includes(term)) ||
        (log.ticketTitle && normalizeText(log.ticketTitle).includes(term)) ||
        normalizeText(log.performedBy).includes(term) ||
        normalizeText(log.details).includes(term)
      );
    });
  }, [accessibleLogs, search, filterAction]);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-white p-12 text-center shadow-xs dark:border-rose-900/60 dark:bg-slate-900">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50 dark:bg-rose-950/60 dark:text-rose-400 dark:ring-rose-950/30">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
          403 - Acesso Negado
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Você não possui permissão para visualizar a trilha de auditoria. Este recurso é restrito aos Diretores e ao Presidente da Tecno System.
        </p>
        <button
          type="button"
          onClick={onNavigateHome}
          className="btn-primary mt-6 min-h-[44px]"
        >
          Voltar para a Visão Geral
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Trilha de Auditoria & Histórico de Eventos
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {currentUser.role === 'Presidente'
              ? 'Registro cronológico global de todas as ações no sistema.'
              : `Registros de auditoria do setor ${currentUser.department}.`}
          </p>
        </div>

        {onClearLogs && accessibleLogs.length > 0 && currentUser.role === 'Presidente' && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Deseja realmente limpar os registros de auditoria locais?')) {
                onClearLogs();
              }
            }}
            className="btn-ghost-danger text-xs px-3 py-2 min-h-[44px]"
          >
            <Trash2 className="h-4 w-4" />
            Limpar Logs Locais
          </button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por chamado (ID/título), autor ou detalhes..."
            className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-9 text-xs sm:text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as AuditAction | 'ALL')}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 outline-none focus:border-blue-500 shadow-2xs cursor-pointer dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-400"
          >
            <option value="ALL">Todas as Ações ({accessibleLogs.length})</option>
            {(Object.keys(ACTION_CONFIG) as AuditAction[]).map((action) => (
              <option key={action} value={action}>
                {ACTION_CONFIG[action].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-500">
            <History className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
              Nenhum evento de auditoria encontrado
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Ajuste os filtros de busca para visualizar mais eventos.
            </p>
          </div>
        ) : (
          <ol className="relative border-l border-slate-200 dark:border-slate-800 ml-4 space-y-4 py-2">
            {filteredLogs.map((log) => {
              const conf = ACTION_CONFIG[log.action] ?? {
                label: log.action,
                badge: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300',
                icon: History,
              };
              const Icon = conf.icon;

              return (
                <li key={log.id} className="relative pl-6">
                  <span className="absolute -left-3 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-2xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Icon className="h-3 w-3" />
                  </span>

                  <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-slate-300 dark:border-slate-800/90 dark:bg-slate-850 dark:hover:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${conf.badge}`}>
                          {conf.label}
                        </span>
                        {log.ticketId && (
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/60 dark:text-blue-300">
                            {log.ticketId}
                          </span>
                        )}
                        {log.ticketTitle && (
                          <span className="truncate max-w-[280px] text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {log.ticketTitle}
                          </span>
                        )}
                      </div>

                      <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                        <Calendar className="h-3 w-3" />
                        <time dateTime={log.timestamp}>{formatDateTime(log.timestamp)}</time>
                      </span>
                    </div>

                    <div className="pt-2 text-xs">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{log.details}</p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Realizado por: <strong className="text-slate-700 dark:text-slate-300">{log.performedBy}</strong>
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400 text-right dark:border-slate-800">
          Exibindo {filteredLogs.length} de {accessibleLogs.length} registro(s) de auditoria
        </div>
      </div>
    </div>
  );
}
