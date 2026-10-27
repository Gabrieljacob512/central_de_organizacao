import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  variant?: 'icon' | 'full';
  className?: string;
}

/** Botão alternador elegante para Modo Claro / Modo Escuro com micro-animação. */
export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex w-full min-h-[42px] cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all select-none ${
          isDark
            ? 'bg-slate-900 text-slate-200 hover:bg-slate-950 hover:text-white border border-slate-750 shadow-inner'
            : 'bg-white text-slate-700 hover:bg-slate-100/80 border border-slate-200 shadow-2xs'
        } ${className}`}
        title={`Tema atual: ${isDark ? 'Escuro' : 'Claro'}. Clique para alternar.`}
        aria-label="Alternar tema de cor"
      >
        <span className="flex items-center gap-2">
          {isDark ? (
            <Moon className="h-4 w-4 text-blue-400 transition-transform duration-300 rotate-0" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500 transition-transform duration-300 rotate-0" />
          )}
          <span>Modo {isDark ? 'Escuro' : 'Claro'}</span>
        </span>
        <span
          className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
            isDark ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
          }`}
        >
          <span className="h-4 w-4 rounded-full bg-white shadow-xs" />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      id="theme-toggle"
      className={`relative inline-flex min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95 focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-amber-300 ${className}`}
      title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
      aria-label={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-slate-600 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
