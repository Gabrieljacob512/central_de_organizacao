import type { Priority, Status } from '../../types/ticket';
import { PRIORITY_STYLES, STATUS_STYLES } from '../../constants/styles';

/** Badge colorido de status do chamado. */
export function StatusBadge({ status }: { status: Status }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${style.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${status === 'Em Andamento' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}

/** Badge de prioridade com ícone indicativo. */
export function PriorityBadge({ priority }: { priority: Priority }) {
  const style = PRIORITY_STYLES[priority];
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${style.badge}`}>
      <Icon className="h-3.5 w-3.5" />
      {priority}
    </span>
  );
}
