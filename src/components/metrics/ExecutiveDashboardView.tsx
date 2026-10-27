import { Building2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ALL_DEPARTMENTS } from '../../constants/config';
import type { Department, Ticket, UserProfile } from '../../types/ticket';
import { canViewFinance, isExecutive } from '../../utils/rbac';
import { ExecutiveFinanceCharts } from './ExecutiveFinanceCharts';
import { MetricsCards } from './MetricsCards';
import { MetricsDashboard } from './MetricsDashboard';

interface ExecutiveDashboardViewProps {
  tickets: Ticket[];
  currentUser: UserProfile | null;
  now: number;
}

/**
 * Página dedicada "Painel Executivo & Métricas" (Seção 8).
 * Contém os cards executivos e painel analítico com Recharts.
 * Respeita o isolamento: Executivos (Presidente e Vice-presidente) possuem filtro setorial e visão global;
 * Diretores e Membros visualizam exclusivamente as métricas do seu próprio departamento.
 */
export function ExecutiveDashboardView({
  tickets,
  currentUser,
  now,
}: ExecutiveDashboardViewProps) {
  const isExecutiveUser = isExecutive(currentUser);
  const [selectedDept, setSelectedDept] = useState<Department | 'all'>('all');

  // Filtragem setorial: se executivo, aplica o filtro escolhido; se diretor/membro, os dados já chegam restritos ao setor
  const scopedTickets = useMemo(() => {
    if (!isExecutiveUser) return tickets;
    if (selectedDept === 'all') return tickets;
    return tickets.filter(
      (t) => (t.assignedDepartment ?? t.department) === selectedDept || t.department === selectedDept
    );
  }, [tickets, isExecutiveUser, selectedDept]);

  return (
    <div className="space-y-6">
      {/* Controles e Contexto do Painel Executivo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between -mt-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isExecutiveUser
            ? 'Métricas consolidadas de desempenho, compliance de SLA e volumetria de toda a Tecno System.'
            : `Indicadores de performance e cumprimento de SLA do setor de ${currentUser?.department}.`}
        </p>

        {/* Filtro Setorial: EXCLUSIVO para Executivos */}
        {isExecutiveUser && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <select
              id="executive-dept-filter"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value as Department | 'all')}
              className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 shadow-2xs cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Todos os departamentos</option>
              {ALL_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Cards de Métricas Principais */}
      <MetricsCards tickets={scopedTickets} now={now} />

      {/* Painel Gráfico Executivo com Gráficos Recharts e Exportação CSV */}
      <MetricsDashboard tickets={scopedTickets} now={now} />

      {/* Seção Financeira Executiva com 4 Gráficos Recharts (apenas com finance.view) */}
      {canViewFinance(currentUser) && <ExecutiveFinanceCharts />}
    </div>
  );
}
