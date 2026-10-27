import { CircleCheckBig, FolderOpen, Siren, Ticket as TicketIcon, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { DEPARTMENTS } from '../../constants/config';
import type { Ticket } from '../../types/ticket';
import { getSlaInfo, isClosedStatus } from '../../utils/sla';

interface MetricsCardsProps {
  tickets: Ticket[];
  now: number;
}

interface Metric {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

const DAY = 86_400_000;

/** Cards de indicadores gerais (volume, backlog, SLA e resolução) + distribuição por departamento. */
export function MetricsCards({ tickets, now }: MetricsCardsProps) {
  const { metrics, byDepartment } = useMemo(() => {
    const active = tickets.filter((ticket) => !isClosedStatus(ticket.status));
    const closed = tickets.filter((ticket) => isClosedStatus(ticket.status));
    const slaStates = tickets.map((ticket) => getSlaInfo(ticket, now).state);
    const breached = slaStates.filter((state) => state === 'breached').length;
    const atRisk = slaStates.filter((state) => state === 'at_risk').length;
    const met = slaStates.filter((state) => state === 'met').length;
    const unassigned = active.filter((ticket) => !ticket.assignee).length;
    const today = tickets.filter((ticket) => now - new Date(ticket.createdAt).getTime() < DAY).length;
    const compliance = closed.length > 0 ? Math.round((met / closed.length) * 100) : 100;

    const list: Metric[] = [
      {
        id: 'total',
        label: 'Total de Chamados',
        value: String(tickets.length),
        hint: `${today} aberto(s) nas últimas 24h`,
        icon: TicketIcon,
        iconBg: 'bg-blue-50 border border-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        id: 'active',
        label: 'Em Aberto',
        value: String(active.length),
        hint: unassigned > 0 ? `${unassigned} sem responsável` : 'Todos com responsável',
        icon: FolderOpen,
        iconBg: 'bg-indigo-50 border border-indigo-100',
        iconColor: 'text-indigo-600',
      },
      {
        id: 'sla',
        label: 'SLA Atrasado',
        value: String(breached),
        hint: atRisk > 0 ? `${atRisk} em risco iminente` : 'Nenhum em risco de atraso',
        icon: Siren,
        iconBg: 'bg-rose-50 border border-rose-100',
        iconColor: 'text-rose-600',
      },
      {
        id: 'resolved',
        label: 'Resolvidos',
        value: String(closed.length),
        hint: `${compliance}% concluídos no prazo`,
        icon: CircleCheckBig,
        iconBg: 'bg-emerald-50 border border-emerald-100',
        iconColor: 'text-emerald-600',
      },
    ];

    const distribution = DEPARTMENTS.map((department) => ({
      department,
      count: active.filter((ticket) => ticket.department === department).length,
    }));

    return { metrics: list, byDepartment: { items: distribution, total: Math.max(active.length, 1) } };
  }, [tickets, now]);

  return (
    <section aria-label="Indicadores executivos" className="grid gap-4 lg:grid-cols-[1fr_auto]">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.id}
              className="group relative animate-slide-up rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500 sm:text-sm dark:text-slate-400">{metric.label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-2xs ${metric.iconBg} ${metric.iconColor}`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{metric.value}</p>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{metric.hint}</p>
            </article>
          );
        })}
      </div>

      <article className="animate-slide-up rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-2xs lg:w-72 dark:border-slate-800 dark:bg-slate-900" style={{ animationDelay: '200ms' }}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Backlog por Departamento</p>
        <ul className="mt-3 space-y-2.5">
          {byDepartment.items.map(({ department, count }) => (
            <li key={department}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">{department}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-700"
                  style={{ width: `${(count / byDepartment.total) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
