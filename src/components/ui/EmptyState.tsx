import { SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/** Estado vazio amigável para listas sem resultados. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="glass-panel flex animate-fade-in flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 dark:bg-blue-950/70 dark:text-blue-400 dark:ring-blue-900/40">
        <SearchX className="h-7 w-7" />
      </span>
      <h3 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
