import { X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useBodyScrollLock, useEscapeKey } from '../../hooks/useUi';

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZES;
}

/** Modal acessível moderno e minimalista. */
export function Modal({ open, onClose, title, description, icon, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId();
  useBodyScrollLock(open);
  useEscapeKey(onClose, open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-xs dark:bg-slate-950/80"
        onClick={onClose}
      />
      <div
        className={`relative flex h-full sm:h-auto max-h-[100dvh] sm:max-h-[92vh] w-full animate-scale-in flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${SIZES[size]}`}
      >
        <header className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-3.5 sm:px-6 dark:border-slate-800 dark:bg-slate-900 shrink-0">
          {icon}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn -mr-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 dark:text-slate-200">{children}</div>
        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6 dark:border-slate-800 dark:bg-slate-900/90 shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
