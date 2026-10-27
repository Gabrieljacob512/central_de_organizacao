import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import type { Database } from '../src/types/database.types';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('[Seed Error] Variável SUPABASE_SERVICE_ROLE_KEY não configurada no .env');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedUserDef {
  name: string;
  email: string;
  departmentCode: string;
  roleName: string;
  isPresident?: boolean;
}

const INITIAL_USERS_DATA: SeedUserDef[] = [
  {
    name: 'Presidente (Admin)',
    email: 'presidente@gmail.com',
    departmentCode: 'Diretoria',
    roleName: 'Presidente',
    isPresident: true,
  },
  {
    name: 'Diretor de RH',
    email: 'rh@tecnosystem.com',
    departmentCode: 'RH',
    roleName: 'Diretor',
  },
  {
    name: 'Membro de TI',
    email: 'ti@tecnosystem.com',
    departmentCode: 'TI',
    roleName: 'Membro',
  },
  {
    name: 'Mariana Souza',
    email: 'mariana.souza@tecnosystem.com.br',
    departmentCode: 'TI',
    roleName: 'Membro',
  },
  {
    name: 'Carlos Mendes',
    email: 'carlos.mendes@tecnosystem.com.br',
    departmentCode: 'TI',
    roleName: 'Diretor',
  },
  {
    name: 'Beatriz Santos',
    email: 'beatriz.santos@tecnosystem.com.br',
    departmentCode: 'Financeiro',
    roleName: 'Membro',
  },
  {
    name: 'Bruno Carvalho',
    email: 'bruno.carvalho@tecnosystem.com.br',
    departmentCode: 'Financeiro',
    roleName: 'Diretor',
  },
  {
    name: 'Camila Ribeiro',
    email: 'camila.ribeiro@tecnosystem.com.br',
    departmentCode: 'RH',
    roleName: 'Membro',
  },
  {
    name: 'Fernanda Costa',
    email: 'fernanda.costa@tecnosystem.com.br',
    departmentCode: 'RH',
    roleName: 'Membro',
  },
  {
    name: 'Diego Nascimento',
    email: 'diego.nascimento@tecnosystem.com.br',
    departmentCode: 'Operações',
    roleName: 'Membro',
  },
  {
    name: 'Eduardo Ferreira',
    email: 'eduardo.ferreira@tecnosystem.com.br',
    departmentCode: 'Operações',
    roleName: 'Diretor',
  },
];

async function main() {
  console.log('--- Iniciando Seed de Desenvolvimento Tecno System ---');

  // 1. Obter Departamentos
  const { data: departments, error: depError } = await supabase.from('departments').select('id, code, name');
  if (depError || !departments) {
    throw new Error(`Falha ao buscar departamentos: ${depError?.message}`);
  }
  const depMap = new Map<string, string>();
  departments.forEach((d) => depMap.set(d.code, d.id));

  // 2. Obter Cargos (Roles)
  const { data: roles, error: roleError } = await supabase.from('roles').select('id, name');
  if (roleError || !roles) {
    throw new Error(`Falha ao buscar cargos: ${roleError?.message}`);
  }
  const roleMap = new Map<string, string>();
  roles.forEach((r) => roleMap.set(r.name, r.id));

  const presidentPassword = process.env.SEED_PRESIDENT_PASSWORD || 'Presidente@2026';
  const defaultMemberPassword = 'Tecno@2026!';

  const userProfileMap = new Map<string, string>(); // email -> profile.id

  // 3. Criar / Atualizar Usuários no Supabase Auth e Profiles
  for (const userDef of INITIAL_USERS_DATA) {
    const depId = depMap.get(userDef.departmentCode);
    const roleId = roleMap.get(userDef.roleName);

    if (!depId || !roleId) {
      console.warn(`[Aviso] Departamento (${userDef.departmentCode}) ou Cargo (${userDef.roleName}) não encontrado para ${userDef.email}`);
      continue;
    }

    const password = userDef.isPresident ? presidentPassword : defaultMemberPassword;

    // Verificar se já existe no Auth
    const { data: existingList } = await supabase.auth.admin.listUsers();
    let authUser = existingList?.users.find((u) => u.email?.toLowerCase() === userDef.email.toLowerCase());

    if (!authUser) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: userDef.email,
        password,
        email_confirm: true,
        user_metadata: { name: userDef.name },
      });
      if (createErr || !created.user) {
        console.error(`Erro ao criar usuário Auth ${userDef.email}:`, createErr?.message);
        continue;
      }
      authUser = created.user;
      console.log(`[Auth] Usuário criado: ${userDef.email}`);
    } else {
      // Atualizar senha em ambiente dev
      await supabase.auth.admin.updateUserById(authUser.id, { password });
      console.log(`[Auth] Usuário existente atualizado: ${userDef.email}`);
    }

    userProfileMap.set(userDef.email.toLowerCase(), authUser.id);
    userProfileMap.set(userDef.name.toLowerCase(), authUser.id);

    // Upsert no perfil
    const { error: profileErr } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        name: userDef.name,
        email: userDef.email,
        department_id: depId,
        role_id: roleId,
        is_active: true,
        must_change_password: Boolean(userDef.isPresident),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileErr) {
      console.error(`Erro ao criar perfil para ${userDef.email}:`, profileErr.message);
    }
  }

  // 4. Limpar dados demo anteriores para recriação limpa em DEV
  console.log('Limpando chamados e eventos anteriores...');
  await supabase.from('attachments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('tickets').delete().neq('id', '');
  await supabase.from('calendar_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 5. Inserir Chamados de Demonstração
  console.log('Inserindo chamados realistas...');
  const now = Date.now();
  const HOUR = 3_600_000;
  const at = (hoursAgo: number) => new Date(now - hoursAgo * HOUR).toISOString();

  const demoTickets = [
    {
      id: 'TS-1001',
      title: 'Notebook não liga após atualização do Windows',
      requester_name: 'Mariana Souza',
      requester_email: 'mariana.souza@tecnosystem.com.br',
      departmentCode: 'TI',
      assignedDepartmentCode: 'TI',
      category: 'Hardware',
      priority: 'Alta',
      status: 'Em Andamento',
      assignee_name: 'Carlos Mendes',
      description:
        'Após a atualização automática do Windows ontem à noite, meu notebook (Dell Latitude 5420, patrimônio TS-0457) não passa da tela de logo. Já tentei reiniciar e desconectar da dock. Tenho apresentação para cliente amanhã às 10h.',
      createdHoursAgo: 3,
      slaHours: 8,
      comments: [
        {
          authorEmail: 'carlos.mendes@tecnosystem.com.br',
          body: 'Olá, Mariana! Vou tentar a recuperação pelo modo de segurança. Consegue trazer o equipamento até a sala de TI (2º andar)?',
          visibility: 'public',
          hoursAgo: 2.6,
        },
        {
          authorEmail: 'mariana.souza@tecnosystem.com.br',
          body: 'Claro, já estou levando. Obrigada pelo retorno rápido!',
          visibility: 'public',
          hoursAgo: 2.4,
        },
      ],
    },
    {
      id: 'TS-1002',
      title: 'Reembolso de despesas de viagem — Congresso em São Paulo',
      requester_name: 'Bruno Carvalho',
      requester_email: 'bruno.carvalho@tecnosystem.com.br',
      departmentCode: 'Financeiro',
      assignedDepartmentCode: 'Financeiro',
      category: 'Reembolso',
      priority: 'Média',
      status: 'Pendente',
      assignee_name: 'Beatriz Santos',
      description:
        'Solicito reembolso das despesas do Congresso Nacional de Tecnologia (hospedagem, alimentação e táxi) no valor total de R$ 1.842,30. Os comprovantes foram enviados por e-mail ao setor financeiro.',
      createdHoursAgo: 20,
      slaHours: 24,
      comments: [
        {
          authorEmail: 'beatriz.santos@tecnosystem.com.br',
          body: 'Bruno, faltou a nota fiscal do hotel (recebemos apenas o extrato do cartão). Pode encaminhar o documento fiscal?',
          visibility: 'public',
          hoursAgo: 17.5,
        },
      ],
    },
    {
      id: 'TS-1003',
      title: 'Inclusão de dependente no plano de saúde',
      requester_name: 'Camila Ribeiro',
      requester_email: 'camila.ribeiro@tecnosystem.com.br',
      departmentCode: 'RH',
      assignedDepartmentCode: 'RH',
      category: 'Benefícios',
      priority: 'Baixa',
      status: 'Aberto',
      assignee_name: null,
      description:
        'Gostaria de incluir minha filha recém-nascida como dependente no plano de saúde corporativo. Tenho a certidão de nascimento digitalizada e posso enviar quando necessário.',
      createdHoursAgo: 5,
      slaHours: 72,
      comments: [],
    },
    {
      id: 'TS-1004',
      title: 'Ar-condicionado da sala de reuniões 2 vazando água',
      requester_name: 'Diego Nascimento',
      requester_email: 'diego.nascimento@tecnosystem.com.br',
      departmentCode: 'Operações',
      assignedDepartmentCode: 'Operações',
      category: 'Manutenção',
      priority: 'Média',
      status: 'Resolvido',
      assignee_name: 'Eduardo Ferreira',
      description:
        'O ar-condicionado da sala de reuniões 2 está pingando água sobre a mesa, próximo à tomada do projetor. Coloquei um balde provisoriamente, mas há risco elétrico.',
      createdHoursAgo: 30,
      resolvedHoursAgo: 12,
      slaHours: 24,
      comments: [
        {
          authorEmail: 'eduardo.ferreira@tecnosystem.com.br',
          body: 'Dreno desobstruído e bandeja limpa. Técnico da empresa terceirizada fez a higienização completa do equipamento.',
          visibility: 'public',
          hoursAgo: 12.2,
        },
      ],
    },
    {
      id: 'TS-1005',
      title: 'Servidor de arquivos inacessível para a equipe Comercial',
      requester_name: 'Ricardo Teixeira',
      requester_email: 'diego.nascimento@tecnosystem.com.br',
      departmentCode: 'Operações',
      assignedDepartmentCode: 'TI',
      category: 'Rede e Internet',
      priority: 'Crítica',
      status: 'Aberto',
      assignee_name: null,
      description:
        'Desde as 9h nenhum colaborador da equipe Comercial (12 pessoas) consegue acessar a unidade de rede \\\\fs01\\comercial. Aparece a mensagem "caminho de rede não encontrado". Propostas com prazo hoje estão paradas.',
      createdHoursAgo: 3.4,
      slaHours: 4,
      comments: [],
    },
  ];

  for (const t of demoTickets) {
    const depId = depMap.get(t.departmentCode) || depMap.get('TI')!;
    const assignedDepId = depMap.get(t.assignedDepartmentCode) || depId;
    const reqId = userProfileMap.get(t.requester_email.toLowerCase()) || null;
    const assId = t.assignee_name ? userProfileMap.get(t.assignee_name.toLowerCase()) || null : null;

    const createdAt = at(t.createdHoursAgo);
    const slaDueAt = new Date(new Date(createdAt).getTime() + t.slaHours * HOUR).toISOString();
    const resolvedAt = t.resolvedHoursAgo ? at(t.resolvedHoursAgo) : null;

    const { error: ticketErr } = await supabase.from('tickets').upsert({
      id: t.id,
      title: t.title,
      description: t.description,
      department_id: depId,
      assigned_department_id: assignedDepId,
      category: t.category,
      priority: t.priority,
      status: t.status,
      requester_id: reqId,
      requester_name: t.requester_name,
      requester_email: t.requester_email,
      assignee_id: assId,
      sla_due_at: slaDueAt,
      resolved_at: resolvedAt,
      created_at: createdAt,
      updated_at: createdAt,
    });

    if (ticketErr) {
      console.error(`Erro ao inserir chamado ${t.id}:`, ticketErr.message);
      continue;
    }

    // Inserir comentários do chamado
    for (const c of t.comments) {
      const authorId = userProfileMap.get(c.authorEmail.toLowerCase()) || reqId;
      if (authorId) {
        await supabase.from('ticket_comments').insert({
          ticket_id: t.id,
          author_id: authorId,
          body: c.body,
          visibility: c.visibility,
          created_at: at(c.hoursAgo),
        });
      }
    }
  }

  // 6. Inserir Eventos no Calendário
  console.log('Inserindo eventos no calendário...');
  const presidentId = userProfileMap.get('presidente@gmail.com');
  if (presidentId) {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * HOUR).toISOString().slice(0, 10);

    await supabase.from('calendar_events').insert([
      {
        title: 'Reunião Geral da Diretoria',
        description: 'Alinhamento estratégico trimestral e revisão dos chamados pendentes.',
        date: today,
        time: '14:00',
        scope: 'global',
        category: 'reuniao',
        created_by_id: presidentId,
        created_by_name: 'Presidente (Admin)',
        created_by_email: 'presidente@gmail.com',
      },
      {
        title: 'Entrega de Relatórios Departamentais',
        description: 'Fechamento dos indicadores de SLA e volumetria.',
        date: nextWeek,
        time: '18:00',
        scope: 'global',
        category: 'projeto',
        created_by_id: presidentId,
        created_by_name: 'Presidente (Admin)',
        created_by_email: 'presidente@gmail.com',
      },
    ]);
  }

  console.log('✅ Seed executado com sucesso no Supabase!');
  console.log(`- Conta do Presidente: presidente@gmail.com`);
  console.log(`- Senha configurada: ${presidentPassword} (must_change_password = true)`);
  console.log(`- Demais usuários demo possuem senha padrão: ${defaultMemberPassword}`);
}

main().catch((err) => {
  console.error('Erro fatal no seed:', err);
  process.exit(1);
});
