import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Flame,
  Inbox,
  LayoutDashboard,
  Plus,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { Ticket, UserProfile, ViewMode } from '../../types/ticket';
import { formatDateTime } from '../../utils/format';
import { isClosedStatus, isSlaBreached } from '../../utils/sla';
import { PriorityBadge, StatusBadge } from '../ui/Badges';
import { EmptyState } from '../ui/EmptyState';

interface OverviewViewProps {
  tickets: Ticket[];
  currentUser: UserProfile | null;
  now: number;
  onNavigate: (view: ViewMode) => void;
  onSelectTicket: (id: string) => void;
  onNewTicket: () => void;
  onOpenKnowledgeBase?: () => void;
  onExportCalendarIcs?: () => void;
}

/**
 * Visão Geral das Solicitações (Página Inicial).
 * Proporciona uma visão rápida da fila operacional, chamados recentes e atalhos de navegação,
 * sem duplicações do Painel Executivo ou de Meus Chamados.
 */
export function OverviewView({
  tickets,
  currentUser,
  now,
  onNavigate,
  onSelectTicket,
  onNewTicket,
  onOpenKnowledgeBase,
  onExportCalendarIcs,
}: OverviewViewProps) {
  // Métricas rápidas de fila
  const activeTickets = tickets.filter((t) => !isClosedStatus(t.status));
  const openCount = tickets.filter((t) => t.status === 'Aberto').length;
  const inProgressCount = tickets.filter((t) => t.status === 'Em Andamento').length;
  const criticalCount = activeTickets.filter(
    (t) => t.priority === 'Crítica' || isSlaBreached(t, now)
  ).length;
  const resolvedCount = tickets.filter((t) => isClosedStatus(t.status)).length;

  // Chamados recentes (últimos 6 ordenados por data decrescente)
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Mensagem de Boas-vindas */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bem-vindo(a), {currentUser?.name || 'Colaborador'}!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Setor {currentUser?.department || 'Tecno System'} · Central de atendimento e gestão de solicitações em tempo real.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewTicket}
            className="btn-primary min-h-[44px] self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            Abrir novo chamado
          </button>
        </div>
      </div>
      {/* Cards de Resumo da Fila Operacional */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Fila Aberta */}
        <div
          onClick={() => onNavigate('tickets')}
          className="rounded-2xl border border-blue-200/80 bg-white p-4 shadow-2xs transition hover:border-blue-400 hover:shadow-xs cursor-pointer dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Aguardando</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{openCount}</p>
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Fila inicial de chamados</span>
        </div>

        {/* Em Andamento */}
        <div
          onClick={() => onNavigate('tickets')}
          className="rounded-2xl border border-indigo-200/80 bg-white p-4 shadow-2xs transition hover:border-indigo-400 hover:shadow-xs cursor-pointer dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Em Atendimento</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{inProgressCount}</p>
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Demandas ativas</span>
        </div>

        {/* Alertas Críticos / SLA */}
        <div
          onClick={() => onNavigate('tickets')}
          className={`rounded-2xl border p-4 shadow-2xs transition hover:shadow-xs cursor-pointer ${
            criticalCount > 0
              ? 'border-rose-300 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/30'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Atenção Crítica</span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                criticalCount > 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className={`mt-2 text-2xl font-black ${criticalCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>
            {criticalCount}
          </p>
          <span className={`text-[11px] font-semibold ${criticalCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
            Prioridade Crítica ou SLA
          </span>
        </div>

        {/* Concluídos */}
        <div
          onClick={() => onNavigate('tickets')}
          className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-2xs transition hover:border-emerald-400 hover:shadow-xs cursor-pointer dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Resolvidos</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{resolvedCount}</p>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Total solucionados</span>
        </div>
      </div>

      {/* Grade Principal de 2 Colunas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna Esquerda (2 cols): Solicitações Recentes */}
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Inbox className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Solicitações Recentes</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('tickets')}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 dark:text-blue-400 cursor-pointer"
            >
              <span>Ver todas</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          {recentTickets.length === 0 ? (
            <EmptyState
              title="Fila operacional limpa"
              description="Nenhum chamado aberto registrado para o seu departamento."
              action={
                <button type="button" className="btn-primary min-h-[44px]" onClick={onNewTicket}>
                  <Plus className="h-4 w-4" /> Abrir primeiro chamado
                </button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {recentTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-3.5 transition-colors hover:bg-slate-50/80 cursor-pointer dark:hover:bg-slate-800/60"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {t.id}
                      </span>
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <h4 className="truncate text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                      {t.title}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Por <strong>{t.requester}</strong> ({t.department}) · {formatDateTime(t.createdAt)}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-semibold text-slate-500 rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800 dark:text-slate-300">
                    {t.assignedDepartment ?? t.department}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna Direita (1 col): Atalhos & Central da Empresa Júnior */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Central & Ações Rápidas</span>
          </h3>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-2.5">
            <button
              id="overview-new-ticket-btn"
              type="button"
              onClick={onNewTicket}
              className="flex w-full items-center justify-between rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-blue-700 active:scale-98 shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Plus className="h-4 w-4" />
                <span>Abrir Novo Chamado</span>
              </div>
              <span className="text-[10px] opacity-80">Rápido</span>
            </button>

            <button
              id="overview-my-tickets-btn"
              type="button"
              onClick={() => onNavigate('my-tickets')}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Meus Chamados</span>
              </div>
              <span className="text-slate-400">→</span>
            </button>

            <button
              id="overview-metrics-btn"
              type="button"
              onClick={() => onNavigate('metrics')}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Painel Executivo & Métricas</span>
              </div>
              <span className="text-slate-400">→</span>
            </button>

            {onOpenKnowledgeBase && (
              <button
                id="overview-kb-btn"
                type="button"
                onClick={onOpenKnowledgeBase}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Base de Conhecimento</span>
                </div>
                <span className="text-slate-400">→</span>
              </button>
            )}

            {onExportCalendarIcs && (
              <button
                id="overview-calendar-ics-btn"
                type="button"
                onClick={onExportCalendarIcs}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span>Exportar Calendário (.ICS)</span>
                </div>
                <span className="text-slate-400">.ics</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
