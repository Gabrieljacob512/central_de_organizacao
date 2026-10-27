import type { CalendarEvent, PersonalWorkspaceData } from '../types/calendar';
import { generateId } from '../utils/id';

const GLOBAL_CALENDAR_KEY = 'tecnosystem.calendar.global.v1';

function getPrivateWorkspaceKey(email: string): string {
  const clean = (email || '').trim().toLowerCase();
  return `private_workspace_${clean}`;
}

/** Formata data para YYYY-MM-DD */
function formatDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Semente de eventos corporativos globais dinâmicos para o mês corrente */
export function buildSeedGlobalEvents(): CalendarEvent[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const d1 = new Date(year, month, 5);
  const d2 = new Date(year, month, 12);
  const d3 = new Date(year, month, 18);
  const d4 = new Date(year, month, 25);
  const today = formatDay(now);

  return [
    {
      id: `evt-seed-01`,
      title: 'Reunião Geral Tecno System (All Hands)',
      description: 'Apresentação trimestral de resultados corporativos com a Diretoria e todas as equipes.',
      date: formatDay(d1),
      time: '09:00',
      scope: 'global',
      createdById: 'user-presidente',
      createdByEmail: 'presidente@gmail.com',
      createdByName: 'Presidente (Admin)',
      category: 'reuniao',
      createdAt: new Date().toISOString(),
    },
    {
      id: `evt-seed-02`,
      title: 'Entrega de Sprint Q4 — Service Desk',
      description: 'Fechamento de pacotes de melhorias, novos recursos de RBAC e auditoria do Service Desk.',
      date: formatDay(d2),
      time: '14:30',
      scope: 'global',
      createdById: 'user-presidente',
      createdByEmail: 'presidente@gmail.com',
      createdByName: 'Presidente (Admin)',
      category: 'projeto',
      createdAt: new Date().toISOString(),
    },
    {
      id: `evt-seed-03`,
      title: 'Workshop de Boas Práticas & Segurança da Informação',
      description: 'Treinamento obrigatório de conformidade e segurança da informação conduzido pelo time de TI e RH.',
      date: formatDay(d3),
      time: '15:00',
      scope: 'global',
      createdById: 'user-rh',
      createdByEmail: 'rh@tecnosystem.com',
      createdByName: 'Diretor de RH',
      category: 'projeto',
      createdAt: new Date().toISOString(),
    },
    {
      id: `evt-seed-04`,
      title: 'Fechamento Mensal de Metas & SLAs',
      description: 'Revisão periódica de incidentes atendidos e tempos de resposta aos chamados.',
      date: formatDay(d4),
      time: '11:00',
      scope: 'global',
      createdById: 'user-presidente',
      createdByEmail: 'presidente@gmail.com',
      createdByName: 'Presidente (Admin)',
      category: 'reuniao',
      createdAt: new Date().toISOString(),
    },
    {
      id: `evt-seed-05`,
      title: 'Plantão de Atendimento & Monitoramento Ativo',
      description: 'Alinhamento da equipe de suporte corporativo e monitoria de infraestrutura.',
      date: today,
      time: '10:00',
      scope: 'global',
      createdById: 'user-presidente',
      createdByEmail: 'presidente@gmail.com',
      createdByName: 'Presidente (Admin)',
      category: 'outro',
      createdAt: new Date().toISOString(),
    },
  ];
}

/* ----------------------- Eventos Globais (Corporativos) ----------------------- */

export function loadGlobalEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(GLOBAL_CALENDAR_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as CalendarEvent[];
      }
    }
  } catch (error) {
    console.warn('[Calendar] Erro ao carregar eventos globais do localStorage.', error);
  }

  const seed = buildSeedGlobalEvents();
  saveGlobalEvents(seed);
  return seed;
}

export function saveGlobalEvents(events: CalendarEvent[]): void {
  try {
    localStorage.setItem(GLOBAL_CALENDAR_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('[Calendar] Erro ao salvar eventos globais.', error);
  }
}

/* ------------------ Espaço Privado do Usuário (Local) ------------------ */

export function loadPrivateWorkspace(email: string): PersonalWorkspaceData {
  if (!email) {
    return {
      notes: '',
      tasks: [],
      privateEvents: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const key = getPrivateWorkspaceKey(email);
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const data = parsed as Partial<PersonalWorkspaceData>;
        return {
          notes: typeof data.notes === 'string' ? data.notes : '',
          tasks: Array.isArray(data.tasks) ? data.tasks : [],
          privateEvents: Array.isArray(data.privateEvents) ? data.privateEvents : [],
          updatedAt: data.updatedAt ?? new Date().toISOString(),
        };
      }
    }
  } catch (error) {
    console.warn(`[Workspace] Erro ao ler espaço privado para ${email}.`, error);
  }

  // Dados iniciais padrão do espaço privado para o usuário
  const initialWorkspace: PersonalWorkspaceData = {
    notes: `## Meu Bloco de Notas Pessoal 📝\n\nEste é o seu espaço de trabalho estritamente privado na Tecno System.\n- Apenas você tem acesso a estas notas e lembretes.\n- As informações são salvas de forma automática e isolada no seu navegador.\n\n### Anotações Rápidas:\n- Revisar chamados prioritários da semana.\n- Alinhar entregas e prazos com a liderança.`,
    tasks: [
      {
        id: `task-${generateId()}`,
        text: 'Revisar chamados críticos atribuídos ao meu setor',
        completed: false,
        priority: 'alta',
        createdAt: new Date().toISOString(),
      },
      {
        id: `task-${generateId()}`,
        text: 'Organizar pauta de trabalho e compromissos semanais',
        completed: true,
        priority: 'media',
        createdAt: new Date().toISOString(),
      },
    ],
    privateEvents: [
      {
        id: `pvt-${generateId()}`,
        title: 'Foco Pessoal: Planejamento & Organização',
        description: 'Horário reservado para concentração nas tarefas prioritárias do departamento.',
        date: formatDay(new Date()),
        time: '16:00',
        scope: 'private',
        createdById: 'me',
        createdByEmail: email.toLowerCase(),
        createdByName: 'Você',
        category: 'pessoal',
        createdAt: new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  savePrivateWorkspace(email, initialWorkspace);
  return initialWorkspace;
}

export function savePrivateWorkspace(email: string, data: PersonalWorkspaceData): void {
  if (!email) return;
  const key = getPrivateWorkspaceKey(email);
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`[Workspace] Erro ao salvar espaço privado para ${email}.`, error);
  }
}
