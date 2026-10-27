-- ==============================================================================
-- Tecno System Service Desk - Diferenciais Empresa Júnior (Fase 6)
-- Projetos, CSAT, Base de Conhecimento, Reabertura Controlada e LGPD
-- ==============================================================================

-- 1. Cargo "Cliente" com isolamento estrito
insert into public.roles (name, description, permissions)
values (
  'Cliente',
  'Acesso restrito ao Portal do Cliente: abre chamados próprios, acompanha timeline e avalia atendimento',
  array['ticket.view_own', 'ticket.create', 'comment.create']
)
on conflict (name) do update set
  permissions = array['ticket.view_own', 'ticket.create', 'comment.create'];

-- 2. Tabela de Projetos da Empresa Júnior
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  client_name text not null,
  department_id uuid references public.departments(id),
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
drop policy if exists "Projetos visíveis para todos os usuários autenticados" on public.projects;
create policy "Projetos visíveis para todos os usuários autenticados"
on public.projects for select
to authenticated
using (true);

-- 3. Adiciona vínculo de projeto e campos de CSAT na tabela tickets
alter table public.tickets
add column if not exists project_id uuid references public.projects(id),
add column if not exists csat_rating int check (csat_rating between 1 and 5),
add column if not exists csat_comment text,
add column if not exists csat_rated_at timestamptz;

-- 4. Tabela de Artigos da Base de Conhecimento (Knowledge Base)
create table if not exists public.knowledge_base_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null,
  tags text[] not null default '{}',
  department_id uuid references public.departments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_base_articles enable row level security;
drop policy if exists "Artigos da base visíveis para usuários autenticados" on public.knowledge_base_articles;
create policy "Artigos da base visíveis para usuários autenticados"
on public.knowledge_base_articles for select
to authenticated
using (true);

-- 5. RPC: Reabertura Controlada de Chamados (até 7 dias após resolução)
create or replace function public.reopen_ticket(
  p_ticket_id text,
  p_reason text
)
returns jsonb as $$
declare
  v_ticket public.tickets%rowtype;
  v_actor_id uuid;
  v_actor_name text;
  v_reference_date timestamptz;
  v_diff_days numeric;
begin
  v_actor_id := auth.uid();
  select coalesce(name, 'Solicitante') into v_actor_name from public.profiles where id = v_actor_id;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Chamado não encontrado.');
  end if;

  if v_ticket.status not in ('Resolvido', 'Fechado') then
    return jsonb_build_object('success', false, 'error', 'Apenas chamados Resolvidos ou Fechados podem ser reabertos.');
  end if;

  -- Valida permissão: Service role, Solicitante original ou quem tem ticket.update / view_all
  if not (
    auth.role() = 'service_role'
    or v_actor_id is null
    or v_ticket.requester_id = v_actor_id
    or public.has_permission('ticket.update')
    or public.has_permission('ticket.view_all')
  ) then
    return jsonb_build_object('success', false, 'error', 'Apenas o solicitante original ou gestores do setor podem reabrir o chamado.');
  end if;

  -- Validação de prazo: limite máximo de 7 dias
  v_reference_date := coalesce(v_ticket.resolved_at, v_ticket.closed_at, v_ticket.updated_at);
  v_diff_days := extract(epoch from (now() - v_reference_date)) / 86400.0;

  if v_diff_days > 7 then
    return jsonb_build_object(
      'success', false,
      'error', 'O prazo limite de 7 dias para reabertura deste chamado expirou. Abra um novo chamado.'
    );
  end if;

  -- Reabre o chamado
  update public.tickets
  set
    status = 'Em Andamento',
    resolved_at = null,
    closed_at = null,
    updated_at = now()
  where id = p_ticket_id;

  -- Registra na auditoria
  insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
  values (
    p_ticket_id,
    v_ticket.title,
    'ALTERACAO_STATUS',
    coalesce(v_actor_name, 'Sistema'),
    v_actor_id,
    'Chamado reaberto pelo solicitante. Motivo: ' || coalesce(p_reason, 'Necessidade de revisão.')
  );

  -- Adiciona comentário automático se houver perfil correspondente
  if v_actor_id is not null then
    insert into public.ticket_comments (ticket_id, author_id, body, visibility)
    values (
      p_ticket_id,
      v_actor_id,
      'Chamado reaberto pelo solicitante. Motivo: ' || coalesce(p_reason, 'Necessidade de revisão.'),
      'public'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'ticket_id', p_ticket_id,
    'status', 'Em Andamento'
  );
end;
$$ language plpgsql security definer;

-- 6. RPC: Avaliação CSAT pelo Solicitante
create or replace function public.submit_csat_feedback(
  p_ticket_id text,
  p_rating int,
  p_comment text default null
)
returns jsonb as $$
declare
  v_ticket public.tickets%rowtype;
begin
  if p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('success', false, 'error', 'A nota de CSAT deve ser entre 1 e 5 estrelas.');
  end if;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Chamado não encontrado.');
  end if;

  if v_ticket.status not in ('Resolvido', 'Fechado') then
    return jsonb_build_object('success', false, 'error', 'A avaliação só pode ser realizada após a resolução do chamado.');
  end if;

  if auth.role() <> 'service_role' and auth.uid() is not null then
    if v_ticket.requester_id is not null and v_ticket.requester_id <> auth.uid() and not public.has_permission('ticket.view_all') then
      return jsonb_build_object('success', false, 'error', 'Apenas o solicitante pode avaliar este atendimento.');
    end if;
  end if;

  update public.tickets
  set
    csat_rating = p_rating,
    csat_comment = p_comment,
    csat_rated_at = now()
  where id = p_ticket_id;

  return jsonb_build_object('success', true, 'rating', p_rating);
end;
$$ language plpgsql security definer;

-- 7. RPC: Anonimização de Dados Pessoais (LGPD - Direito ao Esquecimento)
create or replace function public.anonymize_user_data(
  p_user_id uuid
)
returns jsonb as $$
declare
  v_profile public.profiles%rowtype;
  v_anon_email text;
begin
  -- Exige permissão user.manage, ser presidente, ser service_role ou o próprio usuário
  if not (
    auth.role() = 'service_role'
    or auth.uid() is null
    or auth.uid() = p_user_id
    or public.has_permission('user.manage')
    or public.has_permission('ticket.view_all')
  ) then
    return jsonb_build_object('success', false, 'error', 'Permissão negada para anonimizar dados de usuários (LGPD).');
  end if;

  select * into v_profile from public.profiles where id = p_user_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Usuário não encontrado.');
  end if;

  v_anon_email := 'anonimo-' || substr(p_user_id::text, 1, 8) || '@anonimizado.local';

  -- 1. Anonimiza perfil
  update public.profiles
  set
    name = 'Usuário Anonimizado (LGPD)',
    email = v_anon_email,
    avatar_url = null,
    is_active = false,
    updated_at = now()
  where id = p_user_id;

  -- 2. Anonimiza dados pessoais em chamados abertos
  update public.tickets
  set
    requester_name = 'Usuário Anonimizado (LGPD)',
    requester_email = v_anon_email
  where requester_id = p_user_id;

  -- 3. Limpa notas privadas
  delete from public.private_notes where user_id = p_user_id;

  -- 4. Registra na auditoria
  insert into public.audit_logs (action, performed_by, actor_id, details)
  values (
    'LGPD_ANONYMIZE',
    coalesce((select name from public.profiles where id = auth.uid()), 'Administrador'),
    auth.uid(),
    'Direito ao Esquecimento LGPD exercido para o ID: ' || p_user_id::text
  );

  return jsonb_build_object('success', true, 'anonymized_id', p_user_id);
end;
$$ language plpgsql security definer;


-- 8. Seed de Projetos e Artigos de Exemplo da Empresa Júnior
insert into public.projects (code, name, client_name, department_id)
select 'PRJ-ERP-01', 'Implantação ERP Alpha', 'Alpha Soluções Industriais', id
from public.departments where code = 'TI'
on conflict (code) do nothing;

insert into public.projects (code, name, client_name, department_id)
select 'PRJ-MKT-02', 'Campanha Tráfego Pago e Branding', 'Beta Cosméticos', id
from public.departments where code = 'Operações'
on conflict (code) do nothing;

insert into public.projects (code, name, client_name, department_id)
select 'PRJ-FIN-03', 'Consultoria de Precificação & Valuation', 'Gamma Logística', id
from public.departments where code = 'Financeiro'
on conflict (code) do nothing;

insert into public.knowledge_base_articles (title, content, category, tags)
values
  (
    'Como resetar sua senha ou ativar duplo fator de autenticação',
    'Para alterar sua senha, acesse o menu lateral e clique em "Alterar Senha". Utilize no mínimo 8 caracteres com letras maiúsculas, minúsculas, números e símbolos.',
    'Acesso e Segurança',
    array['senha', 'login', 'acesso', 'segurança']
  ),
  (
    'Políticas de SLA e prazos de resposta por prioridade',
    'Chamados com prioridade Crítica têm SLA de resolução de 4 horas com monitoramento 24/7. Chamados de prioridade Alta possuem 8 horas úteis, Média 24 horas e Baixa 72 horas.',
    'Atendimento',
    array['sla', 'prazo', 'prioridade', 'urgencia']
  ),
  (
    'Procedimento para solicitar reembolsos e adiantamentos',
    'Notas fiscais e comprovantes de despesas de projetos devem ser anexados em formato PDF na categoria Financeiro em até 5 dias após a despesa.',
    'Financeiro',
    array['reembolso', 'despesa', 'financeiro', 'nota fiscal']
  )
on conflict do nothing;
