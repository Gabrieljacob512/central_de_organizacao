import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ChevronDown, ChevronUp, Download, Printer, TrendingUp, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DEPARTMENTS, PRIORITIES } from '../../constants/config';
import type { Priority, Ticket } from '../../types/ticket';
import { getSlaInfo, isClosedStatus } from '../../utils/sla';

interface MetricsDashboardProps {
  tickets: Ticket[];
  now: number;
}

const STATUS_COLORS: Record<string, string> = {
  Aberto: '#3b82f6',
  'Em Andamento': '#6366f1',
  Pendente: '#f59e0b',
  Resolvido: '#10b981',
  Fechado: '#64748b',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  Baixa: '#10b981',
  Média: '#3b82f6',
  Alta: '#f97316',
  Crítica: '#ef4444',
};

/**
 * Exporta lista completa de chamados para arquivo CSV com formatação brasileira e UTF-8 BOM
 */
export function exportTicketsToCSV(tickets: Ticket[]) {
  const headers = [
    'ID',
    'Título',
    'Solicitante',
    'E-mail',
    'Departamento de Origem',
    'Setor Responsável',
    'Responsável Atendimento',
    'Categoria',
    'Prioridade',
    'Status',
    'Prazo Limite SLA',
    'Data de Abertura',
    'Data de Resolução',
  ];

  const rows = tickets.map((t) => [
    t.id,
    `"${(t.title || '').replace(/"/g, '""')}"`,
    `"${(t.requester || '').replace(/"/g, '""')}"`,
    t.email || '',
    t.department,
    t.assignedDepartment || t.department,
    t.assignee ? `"${t.assignee}"` : 'Não atribuído',
    t.category,
    t.priority,
    t.status,
    t.slaDueAt,
    t.createdAt,
    t.resolvedAt || 'Em aberto',
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `tecnosystem-relatorio-chamados-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function MetricsDashboard({ tickets, now }: MetricsDashboardProps) {
  const [expanded, setExpanded] = useState(false);

  // 1. Dados por Departamento
  const departmentData = useMemo(() => {
    return DEPARTMENTS.map((dept) => {
      const deptTickets = tickets.filter((t) => (t.assignedDepartment ?? t.department) === dept);
      const active = deptTickets.filter((t) => !isClosedStatus(t.status)).length;
      const resolved = deptTickets.filter((t) => isClosedStatus(t.status)).length;
      return {
        name: dept,
        Ativos: active,
        Resolvidos: resolved,
        Total: deptTickets.length,
      };
    });
  }, [tickets]);

  // 2. Dados por Status
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      Aberto: 0,
      'Em Andamento': 0,
      Pendente: 0,
      Resolvido: 0,
      Fechado: 0,
    };
    tickets.forEach((t) => {
      if (counts[t.status] !== undefined) counts[t.status]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  // 3. Tempo Médio de Resolução (MTTR) em Horas por Prioridade
  const mttrData = useMemo(() => {
    return PRIORITIES.map((priority) => {
      const resolvedList = tickets.filter(
        (t) => t.priority === priority && isClosedStatus(t.status) && t.resolvedAt
      );

      if (resolvedList.length === 0) {
        return { priority, mttrHoras: 0, count: 0 };
      }

      const totalMs = resolvedList.reduce((acc, t) => {
        const start = new Date(t.createdAt).getTime();
        const end = new Date(t.resolvedAt!).getTime();
        return acc + Math.max(end - start, 0);
      }, 0);

      const avgHours = totalMs / resolvedList.length / (1000 * 60 * 60);
      return {
        priority,
        mttrHoras: Number(avgHours.toFixed(1)),
        count: resolvedList.length,
      };
    });
  }, [tickets]);

  // 4. Taxa de Cumprimento de SLA (%)
  const slaCompliance = useMemo(() => {
    const closed = tickets.filter((t) => isClosedStatus(t.status));
    if (closed.length === 0) return 100;
    const metCount = closed.filter((t) => getSlaInfo(t, now).state === 'met').length;
    return Math.round((metCount / closed.length) * 100);
  }, [tickets, now]);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 transition-colors duration-200">
      {/* Barra de Título e Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Painel Executivo & Métricas</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
                SLA: {slaCompliance}% de Cumprimento
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Análise gráfica de SLA, tempo médio de resolução e volume setorial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Exportação CSV */}
          <button
            id="export-csv-btn"
            type="button"
            onClick={() => exportTicketsToCSV(tickets)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition"
            title="Baixar planilha CSV com todos os chamados"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {/* Botão de Impressão / PDF */}
          <button
            id="print-report-btn"
            type="button"
            onClick={() => window.print()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition"
            title="Imprimir relatório gerencial em PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Imprimir Relatório</span>
          </button>

          {/* Alternador de Gráficos */}
          <button
            id="toggle-charts-btn"
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 transition"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>Ocultar Gráficos</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span>Ver Gráficos</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Conteúdo Gráfico Expansível */}
      {expanded && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2 pt-4 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
          {/* Gráfico 1: Volume por Departamento */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-850">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Volume de Chamados por Setor (Ativos vs Resolvidos)
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Ativos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Resolvidos" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Distribuição por Status */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-850">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
              Distribuição Geral por Status
            </h4>
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 3: Tempo Médio de Resolução (MTTR) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-850 lg:col-span-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              Tempo Médio de Resolução (MTTR em Horas) por Prioridade
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mttrData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" unit="h" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="priority" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} horas`, 'Tempo Médio']}
                  />
                  <Bar dataKey="mttrHoras" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    {mttrData.map((entry) => (
                      <Cell key={`cell-mttr-${entry.priority}`} fill={PRIORITY_COLORS[entry.priority as Priority] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
