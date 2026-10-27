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
  isVicePresident?: boolean;
  memberships: { departmentCode: string; isDirector: boolean }[];
}

const INITIAL_USERS_DATA: SeedUserDef[] = [
  {
    name: 'Presidente (Admin)',
    email: 'presidente@gmail.com',
    departmentCode: 'Administração',
    roleName: 'Presidente',
    isPresident: true,
    memberships: [{ departmentCode: 'Administração', isDirector: true }],
  },
  {
    name: 'Vice-presidente',
    email: 'vicepresidente@tecnosystem.com',
    departmentCode: 'Administração',
    roleName: 'Vice-presidente',
    isVicePresident: true,
    memberships: [
      { departmentCode: 'Administração', isDirector: false },
      { departmentCode: 'Projetos', isDirector: true },
    ],
  },
  {
    name: 'Helena Rocha',
    email: 'rh@tecnosystem.com',
    departmentCode: 'RH',
    roleName: 'Diretor',
    memberships: [{ departmentCode: 'RH', isDirector: true }],
  },
  {
    name: 'Camila Ribeiro',
    email: 'camila.ribeiro@tecnosystem.com.br',
    departmentCode: 'RH',
    roleName: 'Membro',
    memberships: [{ departmentCode: 'RH', isDirector: false }],
  },
  {
    name: 'Bruno Carvalho',
    email: 'financeiro@tecnosystem.com',
    departmentCode: 'Financeiro',
    roleName: 'Diretor',
    memberships: [{ departmentCode: 'Financeiro', isDirector: true }],
  },
  {
    name: 'Beatriz Santos',
    email: 'beatriz.santos@tecnosystem.com.br',
    departmentCode: 'Financeiro',
    roleName: 'Membro',
    memberships: [{ departmentCode: 'Financeiro', isDirector: false }],
  },
  {
    name: 'Eduardo Ferreira',
    email: 'marketing@tecnosystem.com',
    departmentCode: 'Marketing',
    roleName: 'Diretor',
    memberships: [{ departmentCode: 'Marketing', isDirector: true }],
  },
  {
    name: 'Diego Nascimento',
    email: 'diego.nascimento@tecnosystem.com.br',
    departmentCode: 'Marketing',
    roleName: 'Membro',
    memberships: [{ departmentCode: 'Marketing', isDirector: false }],
  },
  {
    name: 'Carlos Mendes',
    email: 'projetos@tecnosystem.com',
    departmentCode: 'Projetos',
    roleName: 'Diretor',
    memberships: [{ departmentCode: 'Projetos', isDirector: true }],
  },
  {
    name: 'Mariana Souza',
    email: 'mariana.souza@tecnosystem.com.br',
    departmentCode: 'Projetos',
    roleName: 'Membro',
    memberships: [{ departmentCode: 'Projetos', isDirector: false }],
  },
];

async function main() {
  console.log('--- Iniciando Seed de Desenvolvimento Tecno System (Hierarquia & Módulos) ---');

  // 1. Obter Departamentos
  const { data: departments, error: depError } = await supabase
    .from('departments')
    .select('id, code, name');
  if (depError || !departments) {
    throw new Error(`Falha ao buscar departamentos: ${depError?.message}`);
  }
  const depMap = new Map<string, string>();
  departments.forEach((d) => {
    depMap.set(d.code, d.id);
    depMap.set(d.name, d.id);
  });

  // 2. Obter Cargos (Roles)
  const { data: roles, error: roleError } = await supabase.from('roles').select('id, name');
  if (roleError || !roles) {
    throw new Error(`Falha ao buscar cargos: ${roleError?.message}`);
  }
  const roleMap = new Map<string, string>();
  roles.forEach((r) => roleMap.set(r.name, r.id));

  // SEED_DEFAULT_PASSWORD é a fonte única (mesma usada por `npm run dev:reset-users`).
  const presidentPassword =
    process.env.SEED_DEFAULT_PASSWORD || process.env.SEED_PRESIDENT_PASSWORD || 'Presidente@2026';
  const defaultMemberPassword = process.env.SEED_DEFAULT_PASSWORD || 'Tecno@2026!';

  const userProfileMap = new Map<string, string>(); // email -> profile.id

  // 3. Criar / Atualizar Usuários no Supabase Auth e Profiles
  for (const userDef of INITIAL_USERS_DATA) {
    const depId = depMap.get(userDef.departmentCode);
    const roleId = roleMap.get(userDef.roleName);

    if (!depId || !roleId) {
      console.warn(
        `[Aviso] Departamento (${userDef.departmentCode}) ou Cargo (${userDef.roleName}) não encontrado para ${userDef.email}`
      );
      continue;
    }

    const password = userDef.isPresident || userDef.isVicePresident ? presidentPassword : defaultMemberPassword;

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
      await supabase.auth.admin.updateUserById(authUser.id, { password });
      console.log(`[Auth] Usuário existente atualizado: ${userDef.email}`);
    }

    userProfileMap.set(userDef.email.toLowerCase(), authUser.id);
    userProfileMap.set(userDef.name.toLowerCase(), authUser.id);

    // Upsert no perfil
    const { error: profileErr } = await (supabase.from('profiles') as any).upsert(
      {
        id: authUser.id,
        name: userDef.name,
        email: userDef.email,
        department_id: depId,
        role_id: roleId,
        is_active: true,
        must_change_password: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileErr) {
      console.error(`Erro ao criar perfil para ${userDef.email}:`, profileErr.message);
    }

    // Upsert nas associações departamentais (department_memberships)
    for (const mem of userDef.memberships) {
      const memDepId = depMap.get(mem.departmentCode);
      if (memDepId) {
        await (supabase.from('department_memberships') as any).upsert(
          {
            user_id: authUser.id,
            department_id: memDepId,
            is_director: mem.isDirector,
          },
          { onConflict: 'user_id,department_id' }
        );
      }
    }
  }

  // 4. Limpar dados demo anteriores para recriação limpa em DEV
  console.log('Limpando chamados, eventos e registros financeiros anteriores...');
  await (supabase.from('finance_attachments') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await (supabase.from('finance_entries') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await (supabase.from('finance_month_projects') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await (supabase.from('finance_months') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');

  await (supabase.from('attachments') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await (supabase.from('ticket_comments') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await (supabase.from('tickets') as any).delete().neq('id', '');
  await (supabase.from('calendar_events') as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 5. Inserir Chamados de Demonstração (4 departamentos operacionais)
  console.log('Inserindo chamados realistas...');
  const now = Date.now();
  const HOUR = 3_600_000;
  const at = (hoursAgo: number) => new Date(now - hoursAgo * HOUR).toISOString();

  const demoTickets = [
    {
      id: 'TS-1001',
      title: 'Ajuste de cronograma para a entrega do projeto Alpha',
      requester_name: 'Mariana Souza',
      requester_email: 'mariana.souza@tecnosystem.com.br',
      departmentCode: 'Projetos',
      assignedDepartmentCode: 'Projetos',
      category: 'Cronograma',
      priority: 'Alta',
      status: 'Em Andamento',
      assignee_name: 'Carlos Mendes',
      description:
        'Necessário revisar os marcos de entrega da sprint 4 do Projeto Alpha devido à inclusão de novas especificações técnicas pelo cliente.',
      createdHoursAgo: 3,
      slaHours: 8,
      comments: [
        {
          authorEmail: 'carlos.mendes@tecnosystem.com.br',
          body: 'Revisão iniciada. Alinhando com a equipe de desenvolvimento a viabilidade dos novos prazos.',
          visibility: 'public',
          hoursAgo: 2.6,
        },
        {
          authorEmail: 'mariana.souza@tecnosystem.com.br',
          body: 'Perfeito, aguardo retorno para consolidar o relatório executivo.',
          visibility: 'public',
          hoursAgo: 2.4,
        },
      ],
    },
    {
      id: 'TS-1002',
      title: 'Reembolso de despesas de viagem — Congresso em São Paulo',
      requester_name: 'Bruno Carvalho',
      requester_email: 'financeiro@tecnosystem.com',
      departmentCode: 'Financeiro',
      assignedDepartmentCode: 'Financeiro',
      category: 'Reembolso',
      priority: 'Média',
      status: 'Pendente',
      assignee_name: 'Beatriz Santos',
      description:
        'Solicito reembolso das despesas do Congresso Nacional (hospedagem, alimentação e transporte) no valor total de R$ 1.842,30 com notas fiscais anexadas.',
      createdHoursAgo: 20,
      slaHours: 24,
      comments: [
        {
          authorEmail: 'beatriz.santos@tecnosystem.com.br',
          body: 'Bruno, faltou o comprovante de hospedagem. Pode anexar o documento fiscal para validação?',
          visibility: 'public',
          hoursAgo: 17.5,
        },
      ],
    },
    {
      id: 'TS-1003',
      title: 'Abertura de processo seletivo para estágio em Marketing',
      requester_name: 'Eduardo Ferreira',
      requester_email: 'marketing@tecnosystem.com',
      departmentCode: 'Marketing',
      assignedDepartmentCode: 'RH',
      category: 'Admissão',
      priority: 'Baixa',
      status: 'Aberto',
      assignee_name: null,
      description:
        'Precisamos iniciar o processo de recrutamento de 2 estagiários para reforçar as frentes de social media e design institucional.',
      createdHoursAgo: 5,
      slaHours: 72,
      comments: [],
    },
    {
      id: 'TS-1004',
      title: 'Campanha de divulgação institucional para captação de projetos',
      requester_name: 'Diego Nascimento',
      requester_email: 'diego.nascimento@tecnosystem.com.br',
      departmentCode: 'Marketing',
      assignedDepartmentCode: 'Marketing',
      category: 'Campanhas',
      priority: 'Média',
      status: 'Resolvido',
      assignee_name: 'Eduardo Ferreira',
      description:
        'Planejamento e disparo dos criativos de inbound marketing para captação de clientes do setor corporativo no próximo trimestre.',
      createdHoursAgo: 30,
      resolvedHoursAgo: 12,
      slaHours: 24,
      comments: [
        {
          authorEmail: 'marketing@tecnosystem.com',
          body: 'Campanha disparada no LinkedIn e Instagram com alcance orgânico de 4.500 contas.',
          visibility: 'public',
          hoursAgo: 12.2,
        },
      ],
    },
    {
      id: 'TS-1005',
      title: 'Renovação do plano de saúde corporativo e inclusão de novos membros',
      requester_name: 'Camila Ribeiro',
      requester_email: 'camila.ribeiro@tecnosystem.com.br',
      departmentCode: 'RH',
      assignedDepartmentCode: 'RH',
      category: 'Benefícios',
      priority: 'Alta',
      status: 'Em Andamento',
      assignee_name: 'Helena Rocha',
      description:
        'Concluir o levantamento de dependentes para reajuste da apólice anual e cadastro dos novos membros da equipe júnior.',
      createdHoursAgo: 6,
      slaHours: 8,
      comments: [
        {
          authorEmail: 'rh@tecnosystem.com',
          body: 'Documentação reunida e encaminhada para a corretora.',
          visibility: 'public',
          hoursAgo: 2.1,
        },
      ],
    },
  ];

  for (const t of demoTickets) {
    const depId = depMap.get(t.departmentCode) || depMap.get('Projetos')!;
    const assignedDepId = depMap.get(t.assignedDepartmentCode) || depId;
    const reqId = userProfileMap.get(t.requester_email.toLowerCase()) || null;
    const assId = t.assignee_name ? userProfileMap.get(t.assignee_name.toLowerCase()) || null : null;

    const createdAt = at(t.createdHoursAgo);
    const slaDueAt = new Date(new Date(createdAt).getTime() + t.slaHours * HOUR).toISOString();
    const resolvedAt = t.resolvedHoursAgo ? at(t.resolvedHoursAgo) : null;

    const { error: ticketErr } = await (supabase.from('tickets') as any).upsert({
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

    for (const c of t.comments) {
      const authorId = userProfileMap.get(c.authorEmail.toLowerCase()) || reqId;
      if (authorId) {
        await (supabase.from('ticket_comments') as any).insert({
          ticket_id: t.id,
          author_id: authorId,
          body: c.body,
          visibility: c.visibility,
          created_at: at(c.hoursAgo),
        });
      }
    }
  }

  // 6. Inserir Dados Financeiros de Demonstração
  console.log('Inserindo registros financeiros...');
  const finDirId = userProfileMap.get('financeiro@tecnosystem.com');

  // Mês 2026-09 (Fechado)
  const { data: monthSep } = await (supabase.from('finance_months') as any)
    .insert({
      competence: '2026-09',
      is_closed: true,
      closed_at: '2026-10-01T10:00:00.000Z',
      closed_by: finDirId,
    })
    .select('id')
    .single();

  if (monthSep?.id) {
    await (supabase.from('finance_entries') as any).insert([
      {
        month_id: monthSep.id,
        type: 'gain',
        category: 'Projetos',
        amount_cents: 3500000, // R$ 35.000,00
        description: 'Faturamento Projeto E-commerce Alpha',
        created_by: finDirId,
      },
      {
        month_id: monthSep.id,
        type: 'gain',
        category: 'Consultoria',
        amount_cents: 1200000, // R$ 12.000,00
        description: 'Consultoria de Processos Beta',
        created_by: finDirId,
      },
      {
        month_id: monthSep.id,
        type: 'expense',
        category: 'Operacional',
        amount_cents: 480000, // R$ 4.800,00
        description: 'Licenças de softwares e ferramentas de nuvem',
        created_by: finDirId,
      },
      {
        month_id: monthSep.id,
        type: 'expense',
        category: 'Marketing',
        amount_cents: 250000, // R$ 2.500,00
        description: 'Anúncios patrocinados e material gráfico',
        created_by: finDirId,
      },
    ]);

    await (supabase.from('finance_month_projects') as any).insert([
      {
        month_id: monthSep.id,
        project_name: 'Projeto E-commerce Alpha',
        revenue_cents: 3500000,
        notes: 'Entregue com sucesso dentro do prazo previsto',
      },
      {
        month_id: monthSep.id,
        project_name: 'Consultoria de Processos Beta',
        revenue_cents: 1200000,
        notes: 'Primeira fase concluída',
      },
    ]);
  }

  // Mês 2026-10 (Aberto)
  const { data: monthOct } = await (supabase.from('finance_months') as any)
    .insert({
      competence: '2026-10',
      is_closed: false,
    })
    .select('id')
    .single();

  if (monthOct?.id) {
    await (supabase.from('finance_entries') as any).insert([
      {
        month_id: monthOct.id,
        type: 'gain',
        category: 'Projetos',
        amount_cents: 4200000, // R$ 42.000,00
        description: 'Entrada Sprint 1 Plataforma Gamma',
        created_by: finDirId,
      },
      {
        month_id: monthOct.id,
        type: 'expense',
        category: 'Capacitação',
        amount_cents: 320000, // R$ 3.200,00
        description: 'Treinamento de liderança e metodologia ágil',
        created_by: finDirId,
      },
      {
        month_id: monthOct.id,
        type: 'expense',
        category: 'Infraestrutura',
        amount_cents: 185000, // R$ 1.850,00
        description: 'Servidores dedicados e domínios corporativos',
        created_by: finDirId,
      },
    ]);

    await (supabase.from('finance_month_projects') as any).insert([
      {
        month_id: monthOct.id,
        project_name: 'Plataforma Gamma',
        revenue_cents: 4200000,
        notes: 'Desenvolvimento em andamento',
      },
    ]);
  }

  // 7. Inserir Eventos no Calendário
  console.log('Inserindo eventos no calendário...');
  const presidentId = userProfileMap.get('presidente@gmail.com');
  if (presidentId) {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * HOUR).toISOString().slice(0, 10);

    await (supabase.from('calendar_events') as any).insert([
      {
        title: 'Reunião Executiva da Diretoria',
        description: 'Alinhamento estratégico entre Presidente, Vice-presidente e Diretores.',
        date: today,
        time: '14:00',
        scope: 'global',
        category: 'reuniao',
        created_by_id: presidentId,
        created_by_name: 'Presidente (Admin)',
        created_by_email: 'presidente@gmail.com',
      },
      {
        title: 'Fechamento Contábil Mensal',
        description: 'Conferência dos faturamentos de projetos e despesas operacionais.',
        date: nextWeek,
        time: '17:00',
        scope: 'global',
        category: 'projeto',
        created_by_id: presidentId,
        created_by_name: 'Presidente (Admin)',
        created_by_email: 'presidente@gmail.com',
      },
    ]);
  }

  console.log('✅ Seed executado com sucesso no Supabase!');
  console.log(`- Conta do Presidente: presidente@gmail.com (Administração)`);
  console.log(`- Conta do Vice-presidente: vicepresidente@tecnosystem.com (Administração & Projetos)`);
  console.log(`- Senha configurada: ${presidentPassword} (must_change_password = true)`);
  console.log(`- Demais usuários demo possuem senha padrão: ${defaultMemberPassword}`);
}

main().catch((err) => {
  console.error('Erro fatal no seed:', err);
  process.exit(1);
});
