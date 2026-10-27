import type { AuthorRole, Department, EventType, Priority, Status, Ticket, TicketEvent } from '../types/ticket';
import { computeSlaDueAt } from '../utils/sla';

/**
 * Seed Data: chamados realistas carregados automaticamente no primeiro acesso
 * (quando o LocalStorage está vazio). As datas são relativas ao momento da
 * carga para que os indicadores de SLA fiquem coerentes na demonstração.
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
    title: 'Notebook não liga após atualização do Windows',
    requester: 'Mariana Souza',
    email: 'mariana.souza@tecnosystem.com.br',
    department: 'TI',
    assignedDepartment: 'TI',
    category: 'Hardware',
    priority: 'Alta',
    status: 'Em Andamento',
    assignee: 'Carlos Mendes',
    description:
      'Após a atualização automática do Windows ontem à noite, meu notebook (Dell Latitude 5420, patrimônio TS-0457) não passa da tela de logo. Já tentei reiniciar e desconectar da dock. Tenho apresentação para cliente amanhã às 10h.',
    createdHoursAgo: 3,
    events: [
      { type: 'created', author: 'Mariana Souza', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 3 },
      { type: 'assignment', author: 'Service Desk', role: 'sistema', message: 'Chamado atribuído a Carlos Mendes.', hoursAgo: 2.8 },
      { type: 'status', author: 'Carlos Mendes', role: 'sistema', message: 'Status alterado: Aberto → Em Andamento.', hoursAgo: 2.7 },
      {
        type: 'comment',
        author: 'Carlos Mendes',
        role: 'atendente',
        message: 'Olá, Mariana! Vou tentar a recuperação pelo modo de segurança. Consegue trazer o equipamento até a sala de TI (2º andar)?',
        hoursAgo: 2.6,
      },
      {
        type: 'comment',
        author: 'Mariana Souza',
        role: 'solicitante',
        message: 'Claro, já estou levando. Obrigada pelo retorno rápido!',
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
      'Solicito reembolso das despesas do Congresso Nacional de Tecnologia (hospedagem, alimentação e táxi) no valor total de R$ 1.842,30. Os comprovantes foram enviados por e-mail ao setor financeiro.',
    createdHoursAgo: 20,
    events: [
      { type: 'created', author: 'Bruno Carvalho', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 20 },
      { type: 'assignment', author: 'Service Desk', role: 'sistema', message: 'Chamado atribuído a Beatriz Santos.', hoursAgo: 19 },
      { type: 'status', author: 'Beatriz Santos', role: 'sistema', message: 'Status alterado: Aberto → Em Andamento.', hoursAgo: 18 },
      {
        type: 'comment',
        author: 'Beatriz Santos',
        role: 'atendente',
        message: 'Bruno, faltou a nota fiscal do hotel (recebemos apenas o extrato do cartão). Pode encaminhar o documento fiscal?',
        hoursAgo: 17.5,
      },
      { type: 'status', author: 'Beatriz Santos', role: 'sistema', message: 'Status alterado: Em Andamento → Pendente.', hoursAgo: 17.4 },
    ],
  },
  {
    id: 'TS-1003',
    title: 'Inclusão de dependente no plano de saúde',
    requester: 'Camila Ribeiro',
    email: 'camila.ribeiro@tecnosystem.com.br',
    department: 'RH',
    assignedDepartment: 'RH',
    category: 'Benefícios',
    priority: 'Baixa',
    status: 'Aberto',
    assignee: null,
    description:
      'Gostaria de incluir minha filha recém-nascida como dependente no plano de saúde corporativo. Tenho a certidão de nascimento digitalizada e posso enviar quando necessário.',
    createdHoursAgo: 5,
    events: [{ type: 'created', author: 'Camila Ribeiro', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 5 }],
  },
  {
    id: 'TS-1004',
    title: 'Ar-condicionado da sala de reuniões 2 vazando água',
    requester: 'Diego Nascimento',
    email: 'diego.nascimento@tecnosystem.com.br',
    department: 'Operações',
    assignedDepartment: 'Operações',
    category: 'Manutenção',
    priority: 'Média',
    status: 'Resolvido',
    assignee: 'Eduardo Ferreira',
    description:
      'O ar-condicionado da sala de reuniões 2 está pingando água sobre a mesa, próximo à tomada do projetor. Coloquei um balde provisoriamente, mas há risco elétrico.',
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
        message: 'Dreno desobstruído e bandeja limpa. Técnico da empresa terceirizada fez a higienização completa do equipamento.',
        hoursAgo: 12.2,
      },
      { type: 'status', author: 'Eduardo Ferreira', role: 'sistema', message: 'Status alterado: Em Andamento → Resolvido.', hoursAgo: 12 },
    ],
  },
  {
    id: 'TS-1005',
    title: 'Servidor de arquivos inacessível para a equipe Comercial',
    requester: 'Ricardo Teixeira',
    email: 'ricardo.teixeira@tecnosystem.com.br',
    department: 'Operações',
    assignedDepartment: 'TI',
    category: 'Rede e Internet',
    priority: 'Crítica',
    status: 'Aberto',
    assignee: null,
    description:
      'Desde as 9h nenhum colaborador da equipe Comercial (12 pessoas) consegue acessar a unidade de rede \\\\fs01\\comercial. Aparece a mensagem "caminho de rede não encontrado". Propostas com prazo hoje estão paradas.',
    createdHoursAgo: 3.4,
    events: [{ type: 'created', author: 'Ricardo Teixeira', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 3.4 }],
  },
  {
    id: 'TS-1006',
    title: 'Solicitação de férias para dezembro',
    requester: 'Larissa Moreira',
    email: 'larissa.moreira@tecnosystem.com.br',
    department: 'TI',
    assignedDepartment: 'RH',
    category: 'Férias',
    priority: 'Baixa',
    status: 'Fechado',
    assignee: 'Fernanda Costa',
    description:
      'Solicito o agendamento de 20 dias de férias a partir de 15/12, com abono pecuniário de 10 dias. O período já foi alinhado com meu gestor imediato.',
    createdHoursAgo: 96,
    resolvedHoursAgo: 60,
    events: [
      { type: 'created', author: 'Larissa Moreira', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 96 },
      { type: 'assignment', author: 'Service Desk', role: 'sistema', message: 'Chamado atribuído a Fernanda Costa.', hoursAgo: 90 },
      { type: 'status', author: 'Fernanda Costa', role: 'sistema', message: 'Status alterado: Aberto → Em Andamento.', hoursAgo: 88 },
      {
        type: 'comment',
        author: 'Fernanda Costa',
        role: 'atendente',
        message: 'Férias programadas no sistema de folha. O aviso será enviado para assinatura digital em até 30 dias antes do início.',
        hoursAgo: 62,
      },
      { type: 'status', author: 'Fernanda Costa', role: 'sistema', message: 'Status alterado: Em Andamento → Resolvido.', hoursAgo: 61 },
      { type: 'comment', author: 'Larissa Moreira', role: 'solicitante', message: 'Perfeito, muito obrigada!', hoursAgo: 60.5 },
      { type: 'status', author: 'Fernanda Costa', role: 'sistema', message: 'Status alterado: Resolvido → Fechado.', hoursAgo: 60 },
    ],
  },
  {
    id: 'TS-1007',
    title: 'Divergência no holerite de setembro (horas extras)',
    requester: 'Thiago Almeida',
    email: 'thiago.almeida@tecnosystem.com.br',
    department: 'Financeiro',
    assignedDepartment: 'RH',
    category: 'Folha de Pagamento',
    priority: 'Alta',
    status: 'Em Andamento',
    assignee: 'Marcos Oliveira',
    description:
      'No holerite de setembro constam 8 horas extras, porém o espelho de ponto registra 14 horas extras aprovadas pelo gestor. Peço a conferência e o ajuste da diferença.',
    createdHoursAgo: 10,
    events: [
      { type: 'created', author: 'Thiago Almeida', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 10 },
      { type: 'assignment', author: 'Service Desk', role: 'sistema', message: 'Chamado atribuído a Marcos Oliveira.', hoursAgo: 9 },
      { type: 'status', author: 'Marcos Oliveira', role: 'sistema', message: 'Status alterado: Aberto → Em Andamento.', hoursAgo: 8.5 },
      {
        type: 'comment',
        author: 'Marcos Oliveira',
        role: 'atendente',
        message: 'Estou conferindo com o RH o fechamento do ponto. Retorno assim que validar as horas aprovadas.',
        hoursAgo: 8,
      },
    ],
  },
  {
    id: 'TS-1008',
    title: 'Compra de cadeiras ergonômicas para o time de Suporte',
    requester: 'Aline Barbosa',
    email: 'aline.barbosa@tecnosystem.com.br',
    department: 'TI',
    assignedDepartment: 'Operações',
    category: 'Compras',
    priority: 'Média',
    status: 'Aberto',
    assignee: 'Lucas Martins',
    description:
      'Solicito a aquisição de 6 cadeiras ergonômicas (NR-17) para as novas posições do time de Suporte N1, que começa a operar no dia 01/11. Orçamento aprovado pela diretoria.',
    createdHoursAgo: 2,
    events: [
      { type: 'created', author: 'Aline Barbosa', role: 'solicitante', message: 'Chamado aberto pelo solicitante.', hoursAgo: 2 },
      { type: 'assignment', author: 'Service Desk', role: 'sistema', message: 'Chamado atribuído a Lucas Martins.', hoursAgo: 1.5 },
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
    const lastEventAgo = Math.min(...seed.events.map((event) => event.hoursAgo));

    return {
      id: seed.id,
      title: seed.title,
      requester: seed.requester,
      email: seed.email,
      department: seed.department,
      assignedDepartment: seed.assignedDepartment,
      category: seed.category,
      priority: seed.priority,
      description: seed.description,
      status: seed.status,
      assignee: seed.assignee,
      createdAt,
      updatedAt: at(lastEventAgo),
      slaDueAt: computeSlaDueAt(createdAt, seed.priority),
      resolvedAt: seed.resolvedHoursAgo !== undefined ? at(seed.resolvedHoursAgo) : null,
      history,
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
