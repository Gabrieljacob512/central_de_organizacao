import type { CalendarEvent, EventCategory, EventScope } from '../types/calendar';

export interface CalendarDayCell {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function getMonthName(monthIndex: number): string {
  return MONTH_NAMES[monthIndex] ?? '';
}

export function getWeekdayNamesShort(): string[] {
  return WEEKDAY_NAMES_SHORT;
}

/** Formata data para YYYY-MM-DD em fuso local */
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Retorna texto descritivo por extenso, ex: "Outubro de 2026" */
export function formatMonthYearHeader(year: number, monthIndex: number): string {
  return `${getMonthName(monthIndex)} de ${year}`;
}

/** Retorna data formatada por extenso, ex: "26 de Outubro de 2026" */
export function formatFullEventDate(dateString: string): string {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  if (!y || !m || !d) return dateString;
  const date = new Date(y, m - 1, d);
  return `${date.getDate()} de ${getMonthName(date.getMonth())} de ${date.getFullYear()}`;
}

/**
 * Constrói a matriz mensal de células do calendário (incluindo dias precursores do mês anterior
 * e dias sucessores do próximo mês para completar semanas inteiras de 7 dias).
 */
export function buildMonthMatrix(
  year: number,
  monthIndex: number,
  allEvents: CalendarEvent[],
): CalendarDayCell[] {
  const todayStr = toDateString(new Date());

  // Primeiro dia do mês corrente
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Domingo, 6 = Sábado

  // Total de dias no mês corrente
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Dias no mês anterior
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

  const cells: CalendarDayCell[] = [];

  // 1. Dias do mês anterior para preencher a primeira semana
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i;
    const date = new Date(year, monthIndex - 1, dayNumber);
    const dateString = toDateString(date);
    const dayEvents = allEvents.filter((e) => e.date === dateString);

    cells.push({
      date,
      dateString,
      dayNumber,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      events: dayEvents,
    });
  }

  // 2. Dias do mês corrente
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    const dateString = toDateString(date);
    const dayEvents = allEvents.filter((e) => e.date === dateString);

    cells.push({
      date,
      dateString,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateString === todayStr,
      events: dayEvents,
    });
  }

  // 3. Dias do próximo mês para completar a grade em múltiplos de 7 (35 ou 42 células)
  const remainingCells = (7 - (cells.length % 7)) % 7;
  for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
    const date = new Date(year, monthIndex + 1, nextDay);
    const dateString = toDateString(date);
    const dayEvents = allEvents.filter((e) => e.date === dateString);

    cells.push({
      date,
      dateString,
      dayNumber: nextDay,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      events: dayEvents,
    });
  }

  return cells;
}

/** Estilos visuais distintos para escopo Global vs. Privado */
export function getEventScopeBadge(scope: EventScope): {
  label: string;
  badgeClass: string;
  dotClass: string;
  iconName: 'globe' | 'lock';
} {
  if (scope === 'global') {
    return {
      label: 'Global (Corporativo)',
      badgeClass:
        'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/70 dark:text-blue-300',
      dotClass: 'bg-blue-600 dark:bg-blue-400',
      iconName: 'globe',
    };
  }

  return {
    label: 'Privado (Pessoal)',
    badgeClass:
      'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/70 dark:text-purple-300',
    dotClass: 'bg-purple-600 dark:bg-purple-400',
    iconName: 'lock',
  };
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  reuniao: 'Reunião',
  projeto: 'Projeto / Entrega',
  pessoal: 'Pessoal / Foco',
  lembrete: 'Lembrete',
  feriado: 'Feriado / Recesso',
  outro: 'Outro',
};
