/**
 * Utilitários de formatação (datas, durações e nomes) no padrão pt-BR.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const shortDateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Ex.: 20/10/2026, 13:45 */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** Ex.: 20 de out., 13:45 */
export function formatShortDateTime(iso: string): string {
  return shortDateTimeFormatter.format(new Date(iso));
}

/** Ex.: terça-feira, 20 de outubro de 2026 */
export function formatLongDate(date: Date): string {
  return longDateFormatter.format(date);
}

/** Converte milissegundos em uma duração legível. Ex.: "2h 15min", "3d 4h". */
export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < MINUTE) return 'menos de 1min';
  if (abs < HOUR) return `${Math.floor(abs / MINUTE)}min`;
  if (abs < DAY) {
    const hours = Math.floor(abs / HOUR);
    const minutes = Math.floor((abs % HOUR) / MINUTE);
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
  const days = Math.floor(abs / DAY);
  const hours = Math.floor((abs % DAY) / HOUR);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

/** Tempo relativo. Ex.: "agora mesmo", "há 5 min", "há 3h", "há 2 dias". */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  if (diff < MINUTE) return 'agora mesmo';
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `há ${Math.floor(diff / HOUR)}h`;
  const days = Math.floor(diff / DAY);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

/** Iniciais de um nome. Ex.: "Mariana Souza" → "MS". */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Remove acentos e normaliza caixa para buscas. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
