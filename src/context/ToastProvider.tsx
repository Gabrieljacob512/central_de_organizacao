import { CircleAlert, CircleCheck, CircleX, Info, X, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { generateId } from '../utils/id';
import { ToastContext, type ToastContextValue, type ToastItem, type ToastType } from './toast-context';

const DURATION: Record<ToastType, number> = { success: 4000, info: 4000, warning: 5500, error: 6000 };
const EXIT_MS = 200;
const MAX_TOASTS = 4;

const TOAST_STYLES: Record<ToastType, { icon: LucideIcon; iconClass: string; bar: string; border: string }> = {
  success: { icon: CircleCheck, iconClass: 'text-emerald-600 bg-emerald-50 ring-4 ring-emerald-50/50', bar: 'bg-emerald-500', border: 'border-emerald-200' },
  error: { icon: CircleX, iconClass: 'text-rose-600 bg-rose-50 ring-4 ring-rose-50/50', bar: 'bg-rose-500', border: 'border-rose-200' },
  warning: { icon: CircleAlert, iconClass: 'text-amber-600 bg-amber-50 ring-4 ring-amber-50/50', bar: 'bg-amber-500', border: 'border-amber-200' },
  info: { icon: Info, iconClass: 'text-blue-600 bg-blue-50 ring-4 ring-blue-50/50', bar: 'bg-blue-500', border: 'border-blue-200' },
};

/** Provedor global de notificações toast limpo e elegante. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), EXIT_MS);
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = generateId();
      const duration = DURATION[type];
      setToasts((prev) => [...prev, { id, type, title, message, duration, leaving: false }].slice(-MAX_TOASTS));
      timers.current.set(id, window.setTimeout(() => remove(id), duration));
    },
    [remove],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => activeTimers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (title, message) => notify('success', title, message),
      error: (title, message) => notify('error', title, message),
      warning: (title, message) => notify('warning', title, message),
      info: (title, message) => notify('info', title, message),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] flex flex-col items-stretch gap-2.5 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96"
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];
          const Icon = style.icon;
          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto relative overflow-hidden rounded-xl border ${style.border} bg-white shadow-xl shadow-slate-900/10 ${
                toast.leaving ? 'animate-toast-out' : 'animate-toast-in'
              }`}
            >
              <div className="flex items-start gap-3 p-4 pr-10">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.iconClass}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                  {toast.message && <p className="mt-0.5 text-xs leading-snug text-slate-600">{toast.message}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="absolute top-3 right-3 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar notificação"
              >
                <X className="h-4 w-4" />
              </button>
              <span
                className={`absolute bottom-0 left-0 h-1 w-full origin-left animate-shrink ${style.bar}`}
                style={{ animationDuration: `${toast.duration}ms` }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
