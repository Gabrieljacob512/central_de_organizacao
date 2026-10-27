import { CircleCheck, Clock, PauseCircle, Siren, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { Ticket } from '../../types/ticket';
import { formatDateTime } from '../../utils/format';
import { getSlaInfo, SLA_STATE_STYLES, type SlaState } from '../../utils/sla';

const SLA_ICONS: Record<SlaState, LucideIcon> = {
  on_track: Clock,
  at_risk: TriangleAlert,
  breached: Siren,
  met: CircleCheck,
  missed: TriangleAlert,
};

interface SlaIndicatorProps {
  ticket: Ticket;
  now: number;
  variant?: 'compact' | 'full';
}

/** Indicador visual do SLA (tempo restante/vencido + barra de consumo do prazo). */
export function SlaIndicator({ ticket, now, variant = 'compact' }: SlaIndicatorProps) {
  const info = getSlaInfo(ticket, now);
  const isPaused = ticket.status === 'Pendente';
  const style = SLA_STATE_STYLES[info.state];
  const Icon = isPaused ? PauseCircle : SLA_ICONS[info.state];

  if (variant === 'compact') {
    return (
      <div className="min-w-[8.5rem]" title={`Prazo de SLA: ${formatDateTime(ticket.slaDueAt)}`}>
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${isPaused ? 'text-amber-600 dark:text-amber-400' : style.text}`}>
          <Icon className={`h-3.5 w-3.5 ${info.state === 'breached' ? 'animate-pulse text-red-600' : info.state === 'at_risk' ? 'animate-pulse text-amber-500' : ''}`} />
          {info.label}
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className={`h-full rounded-full bg-linear-to-r ${isPaused ? 'from-amber-400 to-amber-500' : style.bar} transition-all duration-700`} style={{ width: `${info.consumed}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{info.detail}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-2xs ${style.chip}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-2xs ${style.text}`}>
            <Icon className={`h-5 w-5 ${info.state === 'breached' ? 'animate-pulse' : ''}`} />
          </span>
          <div>
            <p className={`text-sm font-semibold ${style.text}`}>{info.label}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{info.detail}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">Prazo</p>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{formatDateTime(ticket.slaDueAt)}</p>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
        <div className={`h-full rounded-full bg-linear-to-r ${style.bar} transition-all duration-700`} style={{ width: `${info.consumed}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">{Math.round(info.consumed)}% do prazo consumido</p>
    </div>
  );
}
