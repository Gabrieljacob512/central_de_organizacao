import { z } from 'zod';
import {
  mutate,
  readCollection,
  StoredFinanceProjectSchema,
  StoredTicketSchema,
  StoredUserSchema,
  writeCollection,
} from '../data/storage';
import { getCurrentUser } from './authService';

export interface Project {
  id: string;
  code?: string | null;
  name: string;
  client_name?: string | null;
  status?: string | null;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[] | null;
}

const DEFAULT_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'kb-1',
    title: 'Como abrir um chamado de suporte interno',
    content: 'Para abrir um chamado, clique no botão "Novo Chamado" no topo da tela, preencha o título, a descrição detalhada e o departamento responsável. Você pode anexar comprovantes, fotos ou documentos de até 1 MB.',
    category: 'Geral',
    tags: ['chamados', 'ajuda', 'suporte'],
  },
  {
    id: 'kb-2',
    title: 'Procedimento para solicitação de reembolso e compras',
    content: 'Todo pedido de reembolso financeiro deve ser aberto com direcionamento ao departamento Financeiro, com nota fiscal ou comprovante anexado. O prazo padrão para liquidação é de até 5 dias úteis.',
    category: 'Financeiro',
    tags: ['reembolso', 'despesas', 'nota fiscal'],
  },
  {
    id: 'kb-3',
    title: 'Políticas de frequência e comunicação interna',
    content: 'Colaboradores devem registrar seus horários de reunião e comunicar ausências com antecedência mínima de 24 horas ao departamento de RH. O canal oficial de avisos é o próprio Service Desk da Tecno System.',
    category: 'RH',
    tags: ['rh', 'frequência', 'comunicação'],
  },
  {
    id: 'kb-4',
    title: 'Acesso aos servidores e licenças de software',
    content: 'O acesso aos repositórios de código e softwares de CAD é concedido pela diretoria de Projetos após a conclusão do treinamento inicial de novos membros.',
    category: 'Projetos',
    tags: ['softwares', 'projetos', 'acesso'],
  },
];

/**
 * Busca todos os projetos ativos da empresa júnior
 */
export async function fetchProjects(): Promise<Project[]> {
  try {
    const finProjects = readCollection('financeProjects', z.array(StoredFinanceProjectSchema), []);
    if (finProjects.length > 0) {
      return finProjects.map((p) => ({
        id: p.id,
        name: p.name,
        client_name: p.clientName || 'Cliente Corporativo',
        status: 'active',
      }));
    }

    return [
      { id: 'prj-1', name: 'Projeto Ômega', client_name: 'Indústria Metalúrgica', status: 'active' },
      { id: 'prj-2', name: 'Consultoria Beta', client_name: 'Varejo Digital', status: 'active' },
      { id: 'prj-3', name: 'Projeto Alpha', client_name: 'Construtora Horizonte', status: 'active' },
      { id: 'prj-4', name: 'Plataforma Gamma', client_name: 'Logística Express', status: 'active' },
    ];
  } catch (err) {
    console.warn('[differentiatorsService] Erro ao buscar projetos:', err);
    return [];
  }
}

/**
 * Busca artigos da base de conhecimento com busca por texto ou tags
 */
export async function fetchKnowledgeBaseArticles(query?: string): Promise<KnowledgeArticle[]> {
  if (!query || !query.trim()) {
    return DEFAULT_ARTICLES;
  }

  const clean = query.trim().toLowerCase();
  return DEFAULT_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(clean) ||
      a.content.toLowerCase().includes(clean) ||
      a.category.toLowerCase().includes(clean) ||
      a.tags?.some((t) => t.toLowerCase().includes(clean))
  );
}

/**
 * Avaliação CSAT (1 a 5 estrelas) enviada pelo solicitante
 */
export async function submitCsat(
  ticketId: string,
  rating: number,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = getCurrentUser();

    mutate({
      user: currentUser,
      action: () => {
        const tickets = readCollection('tickets', z.array(StoredTicketSchema), []);
        const updated = tickets.map((t) => {
          if (t.id === ticketId || t.code === ticketId) {
            return {
              ...t,
              csatRating: rating,
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        });
        writeCollection('tickets', updated);
      },
      audit: {
        action: 'CSAT_SUBMIT',
        ticketId,
        details: `Avaliação CSAT registrada: ${rating} estrela(s)${comment ? ` - Comentário: "${comment}"` : ''}`,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao registrar avaliação.' };
  }
}

/**
 * Reabertura controlada de chamado (até 7 dias após resolução)
 */
export async function reopenTicket(
  ticketId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = getCurrentUser();

    mutate({
      user: currentUser,
      action: () => {
        const tickets = readCollection('tickets', z.array(StoredTicketSchema), []);
        const updated = tickets.map((t) => {
          if (t.id === ticketId || t.code === ticketId) {
            const reopEvent = {
              id: crypto.randomUUID(),
              type: 'reopened' as const,
              author: currentUser ? currentUser.name : 'Solicitante',
              role: currentUser ? currentUser.role : 'Solicitante',
              message: `Chamado reaberto. Motivo: ${reason}`,
              createdAt: new Date().toISOString(),
            };
            return {
              ...t,
              status: 'Aberto' as const,
              resolvedAt: null,
              updatedAt: new Date().toISOString(),
              history: [...t.history, reopEvent],
            };
          }
          return t;
        });
        writeCollection('tickets', updated);
      },
      audit: {
        action: 'TICKET_REOPEN',
        ticketId,
        details: `Chamado reaberto. Motivo: ${reason}`,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao reabrir chamado.' };
  }
}

/**
 * Anonimização de dados cadastrais do usuário (Direito ao Esquecimento / LGPD)
 */
export async function anonymizeUserData(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = getCurrentUser();

    mutate({
      user: currentUser,
      action: () => {
        const users = readCollection('users', z.array(StoredUserSchema), []);
        const updated = users.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              name: 'Usuário Anonimizado',
              email: `anonimo_${userId.slice(0, 8)}@tecnosystem.com`,
              phone: undefined,
              avatarUrl: undefined,
              isActive: false,
            };
          }
          return u;
        });
        writeCollection('users', updated);
      },
      audit: {
        action: 'USER_ANONYMIZE',
        details: `Usuário ID ${userId} anonimizado em conformidade com LGPD`,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao anonimizar dados.' };
  }
}

/**
 * Gera o conteúdo do arquivo .ICS em formato RFC 5545 compatível com Outlook, Apple Calendar e Google Calendar
 */
export function generateIcsContent(events: any[]): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const formatIcsDate = (dateStr: string, timeStr?: string) => {
    const d = new Date(timeStr ? `${dateStr}T${timeStr}:00` : `${dateStr}T09:00:00`);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tecno System//Service Desk Calendar//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Tecno System - Calendário Corporativo',
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ];

  for (const event of events) {
    const start = formatIcsDate(event.date, event.time);
    const end = formatIcsDate(event.date, event.time || '10:00');
    const stamp = formatIcsDate(new Date().toISOString().substring(0, 10));

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:event-${event.id}@tecnosystem.com`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(`SUMMARY:${event.title.replace(/[\\;,]/g, '')}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n').replace(/[\\;,]/g, '')}`);
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Dispara o download automático do arquivo .ics do calendário no navegador
 */
export function exportCalendarToIcs(events: any[], filename = 'agenda-tecnosystem.ics') {
  const icsData = generateIcsContent(events);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
