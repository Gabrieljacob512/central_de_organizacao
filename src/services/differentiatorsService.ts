import { supabase } from './supabase';
import type { Database } from '../types/database.types';

export type Project = Database['public']['Tables']['projects']['Row'];
export type KnowledgeArticle = Database['public']['Tables']['knowledge_base_articles']['Row'];

/**
 * Busca todos os projetos ativos da empresa júnior
 */
export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').select('*').order('name');
  if (error) {
    console.warn('[differentiatorsService] Erro ao buscar projetos:', error);
    return [];
  }
  return data || [];
}

/**
 * Busca artigos da base de conhecimento com busca por texto ou tags
 */
export async function fetchKnowledgeBaseArticles(query?: string): Promise<KnowledgeArticle[]> {
  let req = supabase.from('knowledge_base_articles').select('*').order('category');

  if (query && query.trim()) {
    const q = query.trim();
    req = req.or(`title.ilike.%${q}%,content.ilike.%${q}%,category.ilike.%${q}%`);
  }

  const { data, error } = await req;
  if (error) {
    console.warn('[differentiatorsService] Erro ao buscar artigos da base:', error);
    return [];
  }
  return data || [];
}

/**
 * Avaliação CSAT (1 a 5 estrelas) enviada pelo solicitante
 */
export async function submitCsat(
  ticketId: string,
  rating: number,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('submit_csat_feedback', {
    p_ticket_id: ticketId,
    p_rating: rating,
    p_comment: comment || undefined,
  });

  if (error) return { success: false, error: error.message };
  const res = data as any;
  if (!res.success) return { success: false, error: res.error || 'Falha ao registrar avaliação.' };

  return { success: true };
}

/**
 * Reabertura controlada de chamado (até 7 dias após resolução)
 */
export async function reopenTicket(
  ticketId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('reopen_ticket', {
    p_ticket_id: ticketId,
    p_reason: reason,
  });

  if (error) return { success: false, error: error.message };
  const res = data as any;
  if (!res.success) return { success: false, error: res.error || 'Falha ao reabrir chamado.' };

  return { success: true };
}

/**
 * Anonimização de dados do usuário (LGPD - Direito ao Esquecimento)
 */
export async function anonymizeUserData(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('anonymize_user_data', {
    p_user_id: userId,
  });

  if (error) return { success: false, error: error.message };
  const res = data as any;
  if (!res.success) return { success: false, error: res.error || 'Falha ao anonimizar dados.' };

  return { success: true };
}

/**
 * Gera o conteúdo do arquivo .ICS em formato RFC 5545 compatível com Outlook, Apple Calendar e Google Calendar
 */
export function generateIcsContent(events: any[]): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const formatIcsDate = (dateStr: string, timeStr?: string) => {
    const d = new Date(dateStr);
    const year = d.getUTCFullYear();
    const month = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());

    if (timeStr && timeStr.includes(':')) {
      const [h, m] = timeStr.split(':');
      return `${year}${month}${day}T${pad(parseInt(h, 10))}${pad(parseInt(m, 10))}00Z`;
    }
    return `${year}${month}${day}`;
  };

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tecno System//Service Desk Calendar//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Tecno System Service Desk',
  ];

  events.forEach((ev) => {
    const dtstart = formatIcsDate(ev.date, ev.time);
    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@tecnosystem.org.br`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${dtstart}`,
      `SUMMARY:${(ev.title || 'Evento').replace(/,/g, '\\,')}`,
      `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n')}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

/**
 * Dispara download do arquivo .ICS no navegador
 */
export function exportCalendarToIcs(events: any[]) {
  if (typeof document === 'undefined') return;
  const content = generateIcsContent(events);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tecnosystem-calendario-${new Date().toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

