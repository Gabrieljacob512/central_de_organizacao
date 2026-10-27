import {
  Archive,
  ArrowDown,
  ChevronsUp,
  CircleCheck,
  Equal,
  Flame,
  Hourglass,
  Inbox,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { Priority, Status } from '../types/ticket';
import type { TransitionTone } from './config';

/**
 * Tokens visuais (classes Tailwind) associados a status, prioridades e ações.
 * Estilo visual limpo, moderno e minimalista (SaaS corporativo claro).
 */

interface StatusStyle {
  badge: string;
  dot: string;
  accent: string;
  columnGlow: string;
  columnBg: string;
  headerBorder: string;
  icon: LucideIcon;
}

export const STATUS_STYLES: Record<Status, StatusStyle> = {
  Aberto: {
    badge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/80 dark:bg-blue-950/60 dark:text-blue-300',
    dot: 'bg-blue-600 dark:bg-blue-400',
    accent: 'from-blue-500 to-indigo-600',
    columnGlow: 'ring-blue-500/20 bg-blue-50/60 dark:ring-blue-500/30 dark:bg-blue-950/20',
    columnBg: 'bg-blue-50/30 dark:bg-slate-900/40',
    headerBorder: 'border-blue-500 dark:border-blue-400',
    icon: Inbox,
  },
  'Em Andamento': {
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:text-indigo-300',
    dot: 'bg-indigo-600 dark:bg-indigo-400',
    accent: 'from-indigo-500 to-purple-600',
    columnGlow: 'ring-indigo-500/20 bg-indigo-50/60 dark:ring-indigo-500/30 dark:bg-indigo-950/20',
    columnBg: 'bg-indigo-50/30 dark:bg-slate-900/40',
    headerBorder: 'border-indigo-500 dark:border-indigo-400',
    icon: Wrench,
  },
  Pendente: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300',
    dot: 'bg-amber-500 dark:bg-amber-400',
    accent: 'from-amber-400 to-orange-500',
    columnGlow: 'ring-amber-500/20 bg-amber-50/60 dark:ring-amber-500/30 dark:bg-amber-950/20',
    columnBg: 'bg-amber-50/30 dark:bg-slate-900/40',
    headerBorder: 'border-amber-500 dark:border-amber-400',
    icon: Hourglass,
  },
  Resolvido: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    accent: 'from-emerald-500 to-teal-600',
    columnGlow: 'ring-emerald-500/20 bg-emerald-50/60 dark:ring-emerald-500/30 dark:bg-emerald-950/20',
    columnBg: 'bg-emerald-50/30 dark:bg-slate-900/40',
    headerBorder: 'border-emerald-500 dark:border-emerald-400',
    icon: CircleCheck,
  },
  Fechado: {
    badge: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300',
    dot: 'bg-slate-500 dark:bg-slate-400',
    accent: 'from-slate-400 to-slate-600',
    columnGlow: 'ring-slate-400/20 bg-slate-100/60 dark:ring-slate-700/30 dark:bg-slate-800/20',
    columnBg: 'bg-slate-50 dark:bg-slate-900/40',
    headerBorder: 'border-slate-400 dark:border-slate-600',
    icon: Archive,
  },
};

interface PriorityStyle {
  badge: string;
  icon: LucideIcon;
  selected: string;
}

export const PRIORITY_STYLES: Record<Priority, PriorityStyle> = {
  Baixa: {
    badge: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300',
    icon: ArrowDown,
    selected: 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20 shadow-xs dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-200 dark:ring-blue-400/30',
  },
  Média: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300',
    icon: Equal,
    selected: 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20 shadow-xs dark:border-amber-400 dark:bg-amber-950/70 dark:text-amber-200 dark:ring-amber-400/30',
  },
  Alta: {
    badge: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/80 dark:bg-orange-950/60 dark:text-orange-300',
    icon: ChevronsUp,
    selected: 'border-orange-500 bg-orange-50 text-orange-800 ring-2 ring-orange-500/20 shadow-xs dark:border-orange-400 dark:bg-orange-950/70 dark:text-orange-200 dark:ring-orange-400/30',
  },
  Crítica: {
    badge: 'border-rose-200 bg-rose-50 text-rose-700 font-semibold dark:border-rose-800/80 dark:bg-rose-950/60 dark:text-rose-300',
    icon: Flame,
    selected: 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20 shadow-xs dark:border-rose-400 dark:bg-rose-950/70 dark:text-rose-200 dark:ring-rose-400/30',
  },
};

export const TRANSITION_TONE_STYLES: Record<TransitionTone, string> = {
  primary: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 shadow-2xs dark:border-blue-800/80 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 shadow-2xs dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 shadow-2xs dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:border-slate-300 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 shadow-2xs dark:border-rose-800/80 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60',
};
