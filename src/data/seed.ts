import type { AuthorRole, Department, EventType, Priority, Status, Ticket, TicketEvent } from '../types/ticket';
import { computeSlaDueAt } from '../utils/sla';

/**
 * Seed Data: chamados realistas carregados automaticamente no primeiro acesso.
 * Departamentos exclusivos: Financeiro, RH, Marketing e Projetos.
 */

const HOUR = 3_600_000;

interface SeedEvent {
  type: EventType;
  author: string;
  role: AuthorRole;
  message: string;
  hoursAgo: number;
}

interface SeedTicket {
  id: string;
  title: string;
  requester: string;
  email: string;
  department: Department;
  assignedDepartment: Department;
  category: string;
  priority: Priority;
  status: Status;
  assignee: string | null;
  description: string;
  createdHoursAgo: number;
  resolvedHoursAgo?: number;
  events: SeedEvent[];
}

const SEED: SeedTicket[] = [
  {
    id: 'TS-1001',
    title: 'Ajuste de cronograma para a entrega do projeto Alpha',
    requester: 'Mariana Souza',
    email: 'mariana.souza@tecnosystem.com.br',
    department: 'Projetos',
    assignedDepartment: 'Projetos',
    category: 'Cronograma',
    priority: 'Alta',
    status: 'Em Andamento',
    assignee: 'Carlos Mendes',
    description:
      'Necessário revisar os marcos de entrega da sprint 4 do Projeto Alpha devido à inclusão de novas especificações técnicas pelo cliente.',
    createdHoursAgo: 3,
    events: [
      { type: 'created', author: 'Mariana Souza', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 3 },
      { type: 'assignment', author: 'Service Desk', role: 'sistema', message: 'Chamado atribuído a Carlos Mendes.', hoursAgo: 2.8 },
      { type: 'status', author: 'Carlos Mendes', role: 'sistema', message: 'Status alterado: Aberto → Em Andamento.', hoursAgo: 2.7 },
      {
        type: 'comment',
        author: 'Carlos Mendes',
        role: 'atendente',
        message: 'Revisão iniciada. Alinhando com a equipe de desenvolvimento a viabilidade dos novos prazos.',
        hoursAgo: 2.6,
      },
      {
        type: 'comment',
        author: 'Mariana Souza',
        role: 'solicitante',
        message: 'Perfeito, aguardo retorno para consolidar o relatório executivo.',
        hoursAgo: 2.4,
      },
    ],
  },
  {
    id: 'TS-1002',
    title: 'Reembolso de despesas de viagem — Congresso em São Paulo',
    requester: 'Bruno Carvalho',
    email: 'bruno.carvalho@tecnosystem.com.br',
    department: 'Financeiro',
    assignedDepartment: 'Financeiro',
    category: 'Reembolso',
    priority: 'Média',
    status: 'Pendente',
    assignee: 'Beatriz Santos',
    description:
      'Solicito reembolso das despesas do Congresso Nacional (hospedagem, alimentação e transporte) no valor total de R$ 1.842,30 com notas fiscais anexadas.',
    createdHoursAgo: 20,
    events: [
      { type: 'created', author: 'Bruno Carvalho', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 20 },
      { type: 'assignment', author: 'Service Desk', role: 'sistema', message: 'Chamado atribuído a Beatriz Santos.', hoursAgo: 19 },
      { type: 'status', author: 'Beatriz Santos', role: 'sistema', message: 'Status alterado: Aberto → Em Andamento.', hoursAgo: 18 },
      {
        type: 'comment',
        author: 'Beatriz Santos',
        role: 'atendente',
        message: 'Bruno, faltou o comprovante de hospedagem. Pode anexar o documento fiscal para validação?',
        hoursAgo: 17.5,
      },
      { type: 'status', author: 'Beatriz Santos', role: 'sistema', message: 'Status alterado: Em Andamento → Pendente.', hoursAgo: 17.4 },
    ],
  },
  {
    id: 'TS-1003',
    title: 'Inclusão de dependente no plano de saúde corporativo',
    requester: 'Camila Ribeiro',
    email: 'camila.ribeiro@tecnosystem.com.br',
    department: 'RH',
    assignedDepartment: 'RH',
    category: 'Benefícios',
    priority: 'Baixa',
    status: 'Aberto',
    assignee: null,
    description:
      'Gostaria de solicitar a inclusão de dependente no plano de saúde corporativo. Já possuo a documentação completa digitalizada.',
    createdHoursAgo: 5,
    events: [{ type: 'created', author: 'Camila Ribeiro', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 5 }],
  },
  {
    id: 'TS-1004',
    title: 'Campanha de lançamento da nova identidade visual nas redes',
    requester: 'Diego Nascimento',
    email: 'diego.nascimento@tecnosystem.com.br',
    department: 'Marketing',
    assignedDepartment: 'Marketing',
    category: 'Campanhas',
    priority: 'Média',
    status: 'Resolvido',
    assignee: 'Eduardo Ferreira',
    description:
      'Criação do pacote de posts e banners digitais para o lançamento da nova identidade institucional da Tecno System.',
    createdHoursAgo: 30,
    resolvedHoursAgo: 12,
    events: [
      { type: 'created', author: 'Diego Nascimento', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 30 },
      { type: 'assignment', author: 'Service Desk', role: 'sistema', message: 'Chamado atribuído a Eduardo Ferreira.', hoursAgo: 29 },
      { type: 'status', author: 'Eduardo Ferreira', role: 'sistema', message: 'Status alterado: Aberto → Em Andamento.', hoursAgo: 28 },
      {
        type: 'comment',
        author: 'Eduardo Ferreira',
        role: 'atendente',
        message: 'Criativos aprovados pela diretoria e programados na ferramenta de automação.',
        hoursAgo: 12.2,
      },
      { type: 'status', author: 'Eduardo Ferreira', role: 'sistema', message: 'Status alterado: Em Andamento → Resolvido.', hoursAgo: 12 },
    ],
  },
  {
    id: 'TS-1005',
    title: 'Alinhamento de escopo para nova proposta comercial',
    requester: 'Diego Nascimento',
    email: 'diego.nascimento@tecnosystem.com.br',
    department: 'Marketing',
    assignedDepartment: 'Projetos',
    category: 'Escopo & Mudanças',
    priority: 'Crítica',
    status: 'Aberto',
    assignee: null,
    description:
      'Precisamos de suporte técnico de Projetos para precificar e dimensionar a arquitetura técnica da proposta de consultoria institucional com prazo até o fim do dia.',
    createdHoursAgo: 3.4,
    events: [{ type: 'created', author: 'Diego Nascimento', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 3.4 }],
  },
  {
    id: 'TS-1006',
    title: 'Solicitação de férias para dezembro',
    requester: 'Mariana Souza',
    email: 'mariana.souza@tecnosystem.com.br',
    department: 'Projetos',
    assignedDepartment: 'RH',
    category: 'Férias',
    priority: 'Baixa',
    status: 'Fechado',
    assignee: 'Fernanda Costa',
    description:
      'Solicito o agendamento de 20 dias de férias a partir de 15/12. O período já foi alinhado com o gestor de projetos.',
    createdHoursAgo: 96,
    resolvedHoursAgo: 60,
    events: [
      { type: 'created', author: 'Mariana Souza', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 96 },
      { type: 'assignment', author: 'Service Desk', role: 'sistema', message: 'Chamado atribuído a Fernanda Costa.', hoursAgo: 90 },
      { type: 'status', author: 'Fernanda Costa', role: 'sistema', message: 'Status alterado: Aberto → Em Andamento.', hoursAgo: 88 },
      {
        type: 'comment',
        author: 'Fernanda Costa',
        role: 'atendente',
        message: 'Férias programadas e registradas no sistema.',
        hoursAgo: 62,
      },
      { type: 'status', author: 'Fernanda Costa', role: 'sistema', message: 'Status alterado: Em Andamento → Resolvido.', hoursAgo: 61 },
      { type: 'status', author: 'Fernanda Costa', role: 'sistema', message: 'Status alterado: Resolvido → Fechado.', hoursAgo: 60 },
    ],
  },
  {
    id: 'TS-1007',
    title: 'Ajuste no fechamento orçamentário do trimestre',
    requester: 'Bruno Carvalho',
    email: 'bruno.carvalho@tecnosystem.com.br',
    department: 'Financeiro',
    assignedDepartment: 'Financeiro',
    category: 'Orçamento',
    priority: 'Alta',
    status: 'Em Andamento',
    assignee: 'Beatriz Santos',
    description:
      'Divergência identificada nas despesas de software do trimestre. Necessária conferência junto aos extratos de pagamentos.',
    createdHoursAgo: 10,
    events: [
      { type: 'created', author: 'Bruno Carvalho', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 10 },
      { type: 'assignment', author: 'Service Desk', role: 'sistema', message: 'Chamado atribuído a Beatriz Santos.', hoursAgo: 9 },
      { type: 'status', author: 'Beatriz Santos', role: 'sistema', message: 'Status alterado: Aberto → Em Andamento.', hoursAgo: 8.5 },
      {
        type: 'comment',
        author: 'Beatriz Santos',
        role: 'atendente',
        message: 'Conferência em andamento. Já solicitamos os comprovantes de débito.',
        hoursAgo: 8,
      },
    ],
  },
];

/** Constrói a lista de chamados de demonstração com datas relativas a `now`. */
export function buildSeedTickets(now: number = Date.now()): Ticket[] {
  const at = (hoursAgo: number) => new Date(now - hoursAgo * HOUR).toISOString();

  return SEED.map((seed) => {
    const history: TicketEvent[] = seed.events.map((event, index) => ({
      id: `${seed.id}-ev-${index + 1}`,
      type: event.type,
      author: event.author,
      role: event.role,
      message: event.message,
      createdAt: at(event.hoursAgo),
    }));

    const createdAt = at(seed.createdHoursAgo);
    const slaDueAt = computeSlaDueAt(createdAt, seed.priority);
    const resolvedAt = seed.resolvedHoursAgo !== undefined ? at(seed.resolvedHoursAgo) : null;

    return {
      id: seed.id,
      title: seed.title,
      requester: seed.requester,
      email: seed.email,
      department: seed.department,
      assignedDepartment: seed.assignedDepartment,
      category: seed.category,
      priority: seed.priority,
      status: seed.status,
      assignee: seed.assignee,
      description: seed.description,
      createdAt,
      updatedAt: history[history.length - 1]?.createdAt ?? createdAt,
      slaDueAt,
      resolvedAt,
      history,
    };
  });
}
