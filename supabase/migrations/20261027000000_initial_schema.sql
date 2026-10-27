-- ==============================================================================
-- Tecno System Service Desk - Migration Inicial
-- Tabelas, RLS, Funções Security Definer, Triggers de Auditoria e SLA
-- ==============================================================================

-- 1. Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Departamentos
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  email text,
  created_at timestamptz not null default now()
);

-- 3. Cargos e Permissões Dinâmicas
-- Permissões suportadas:
-- ticket.view_all, ticket.view_own, ticket.create, ticket.update, ticket.delete,
-- user.manage, event.create_global, comment.create, comment.edit, comment.delete,
-- internal_notes.view, internal_notes.create, attachment.upload, attachment.delete,
-- audit.view_all, settings.manage
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  permissions text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- 4. Perfis de Usuário (vinculados ao auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  department_id uuid references public.departments(id),
  role_id uuid not null references public.roles(id),
  avatar_url text,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Políticas de SLA por Prioridade
create table public.sla_policies (
  id uuid primary key default gen_random_uuid(),
  priority text unique not null,
  response_hours numeric not null default 4,
  resolution_hours numeric not null,
  business_hours_only boolean not null default false,
  created_at timestamptz not null default now()
);

-- 6. Chamados (Tickets)
create sequence if not exists ticket_seq start with 1000;

create table public.tickets (
  id text primary key default ('TS-' || nextval('ticket_seq')::text),
  title text not null,
  description text not null default '',
  department_id uuid not null references public.departments(id),
  assigned_department_id uuid references public.departments(id),
  category text not null,
  priority text not null references public.sla_policies(priority),
  status text not null default 'Aberto' check (status in ('Aberto', 'Em Andamento', 'Pendente', 'Resolvido', 'Fechado')),
  requester_id uuid references public.profiles(id),
  requester_name text not null,
  requester_email text not null,
  assignee_id uuid references public.profiles(id),
  sla_due_at timestamptz not null,
  paused_at timestamptz,
  total_paused_seconds bigint not null default 0,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Comentários de Chamados
create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  visibility text not null default 'public' check (visibility in ('public', 'internal')),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

-- 8. Anexos
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null references public.tickets(id) on delete cascade,
  comment_id uuid references public.ticket_comments(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes <= 1048576), -- Máx 1 MB
  description varchar(200),
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- 9. Auditoria (Imutável e Preserva chamados apagados)
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  ticket_id text, -- Sem FK cascade para reter histórico de chamados deletados
  ticket_title text,
  action text not null,
  performed_by text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  details text not null,
  created_at timestamptz not null default now()
);

-- Trigger para bloquear qualquer UPDATE ou DELETE na tabela de auditoria
create or replace function public.prevent_audit_log_modification()
returns trigger as $$
begin
  raise exception 'audit_logs é estritamente imutável (apenas INSERT é permitido). Operação % rejeitada.', tg_op;
end;
$$ language plpgsql;

create trigger trg_audit_logs_immutable
before update or delete on public.audit_logs
for each row execute function public.prevent_audit_log_modification();

-- 10. Notificações e Preferências
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  notify_ticket_assigned boolean not null default true,
  notify_new_comment boolean not null default true,
  notify_mention boolean not null default true,
  notify_status_change boolean not null default true,
  notify_sla_warning boolean not null default true,
  notify_sla_breached boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 11. Calendário e Espaço Pessoal
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date date not null,
  time text,
  scope text not null check (scope in ('global', 'private')),
  category text not null default 'outro',
  created_by_id uuid not null references public.profiles(id) on delete cascade,
  created_by_name text not null,
  created_by_email text not null,
  department_id uuid references public.departments(id),
  created_at timestamptz not null default now()
);

create table public.private_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- Funções SECURITY DEFINER Auxiliares (evitam recursão de RLS)
-- ==============================================================================

create or replace function public.current_profile()
returns public.profiles as $$
  select * from public.profiles where id = auth.uid() and is_active = true limit 1;
$$ language sql stable security definer;

create or replace function public.current_department_id()
returns uuid as $$
  select department_id from public.profiles where id = auth.uid() and is_active = true limit 1;
$$ language sql stable security definer;

create or replace function public.has_permission(p_permission text)
returns boolean as $$
declare
  v_perms text[];
begin
  select r.permissions into v_perms
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid() and p.is_active = true;

  if v_perms is null then
    return false;
  end if;

  if 'ticket.view_all' = any(v_perms) then
    return true;
  end if;

  return p_permission = any(v_perms);
end;
$$ language plpgsql stable security definer;

-- ==============================================================================
-- Cálculo de SLA e Triggers de SLA
-- ==============================================================================

create or replace function public.calculate_sla_due_at(
  p_priority text,
  p_from_time timestamptz default now()
)
returns timestamptz as $$
declare
  v_hours numeric;
  v_biz boolean;
  v_cur timestamptz;
  v_hours_left numeric;
  v_day_of_week int;
  v_hour_of_day numeric;
begin
  select resolution_hours, business_hours_only
  into v_hours, v_biz
  from public.sla_policies
  where priority = p_priority;

  if v_hours is null then
    v_hours := 24;
    v_biz := false;
  end if;

  if not v_biz then
    return p_from_time + (v_hours || ' hours')::interval;
  end if;

  v_cur := p_from_time;
  v_hours_left := v_hours;

  while v_hours_left > 0 loop
    v_day_of_week := extract(isodow from v_cur);
    if v_day_of_week in (6, 7) then
      v_cur := date_trunc('day', v_cur + interval '1 day') + interval '8 hours';
    else
      v_hour_of_day := extract(hour from v_cur) + extract(minute from v_cur) / 60.0;
      if v_hour_of_day < 8 then
        v_cur := date_trunc('day', v_cur) + interval '8 hours';
      elsif v_hour_of_day >= 18 then
        v_cur := date_trunc('day', v_cur + interval '1 day') + interval '8 hours';
      else
        if (18 - v_hour_of_day) <= v_hours_left then
          v_hours_left := v_hours_left - (18 - v_hour_of_day);
          v_cur := date_trunc('day', v_cur + interval '1 day') + interval '8 hours';
        else
          v_cur := v_cur + (v_hours_left || ' hours')::interval;
          v_hours_left := 0;
        end if;
      end if;
    end if;
  end loop;

  return v_cur;
end;
$$ language plpgsql stable;

create or replace function public.handle_ticket_sla_and_timestamps()
returns trigger as $$
declare
  v_paused_delta bigint;
begin
  if tg_op = 'INSERT' then
    if new.sla_due_at is null then
      new.sla_due_at := public.calculate_sla_due_at(new.priority, coalesce(new.created_at, now()));
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();

    -- Entrou em 'Pendente' -> pausa o relógio
    if new.status = 'Pendente' and old.status <> 'Pendente' then
      new.paused_at := now();
    end if;

    -- Saiu de 'Pendente' -> despausa e compensa o SLA acumulado
    if old.status = 'Pendente' and new.status <> 'Pendente' then
      if old.paused_at is not null then
        v_paused_delta := extract(epoch from (now() - old.paused_at))::bigint;
        new.total_paused_seconds := coalesce(old.total_paused_seconds, 0) + v_paused_delta;
        new.sla_due_at := old.sla_due_at + (v_paused_delta || ' seconds')::interval;
        new.paused_at := null;
      end if;
    end if;

    -- Resolução
    if new.status = 'Resolvido' and old.status <> 'Resolvido' then
      new.resolved_at := coalesce(new.resolved_at, now());
    end if;

    -- Fechamento
    if new.status = 'Fechado' and old.status <> 'Fechado' then
      new.closed_at := coalesce(new.closed_at, now());
    end if;

    -- Reabertura
    if old.status in ('Resolvido', 'Fechado') and new.status in ('Aberto', 'Em Andamento') then
      new.resolved_at := null;
      new.closed_at := null;
    end if;

    return new;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_ticket_sla_and_timestamps
before insert or update on public.tickets
for each row execute function public.handle_ticket_sla_and_timestamps();

-- ==============================================================================
-- Triggers Automáticos de Auditoria
-- ==============================================================================

create or replace function public.audit_ticket_changes()
returns trigger as $$
declare
  v_actor_name text;
  v_actor_id uuid;
begin
  v_actor_id := auth.uid();
  select coalesce(name || ' (' || email || ')', 'Sistema')
  into v_actor_name
  from public.profiles
  where id = v_actor_id;

  if v_actor_name is null then
    v_actor_name := 'Sistema';
  end if;

  if tg_op = 'INSERT' then
    insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
    values (new.id, new.title, 'CRIACAO', v_actor_name, v_actor_id, 'Chamado criado no sistema');
    return new;
  elsif tg_op = 'UPDATE' then
    if old.status <> new.status then
      insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
      values (new.id, new.title, 'ALTERACAO_STATUS', v_actor_name, v_actor_id, 'Status alterado de "' || old.status || '" para "' || new.status || '"');
    end if;

    if old.priority <> new.priority then
      insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
      values (new.id, new.title, 'ALTERACAO_PRIORIDADE', v_actor_name, v_actor_id, 'Prioridade alterada de "' || old.priority || '" para "' || new.priority || '"');
    end if;

    if old.department_id is distinct from new.department_id then
      insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
      values (new.id, new.title, 'ATRIBUICAO_DEPARTAMENTO', v_actor_name, v_actor_id, 'Departamento de origem alterado');
    end if;

    if old.assigned_department_id is distinct from new.assigned_department_id then
      insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
      values (new.id, new.title, 'ATRIBUICAO_DEPARTAMENTO', v_actor_name, v_actor_id, 'Departamento responsável alterado');
    end if;

    if old.assignee_id is distinct from new.assignee_id then
      insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
      values (new.id, new.title, 'ATRIBUICAO_RESPONSAVEL', v_actor_name, v_actor_id, 'Responsável pelo atendimento alterado');
    end if;

    if old.status <> 'Resolvido' and new.status = 'Resolvido' then
      insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
      values (new.id, new.title, 'RESOLUCAO', v_actor_name, v_actor_id, 'Chamado marcado como resolvido');
    end if;

    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
    values (old.id, old.title, 'EXCLUSAO', v_actor_name, v_actor_id, 'Chamado "' || old.title || '" foi excluído');
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_audit_tickets
after insert or update or delete on public.tickets
for each row execute function public.audit_ticket_changes();

create or replace function public.audit_comment_changes()
returns trigger as $$
declare
  v_ticket_title text;
  v_actor_name text;
begin
  select title into v_ticket_title from public.tickets where id = coalesce(new.ticket_id, old.ticket_id);
  select coalesce(name || ' (' || email || ')', 'Sistema') into v_actor_name from public.profiles where id = auth.uid();
  if v_actor_name is null then v_actor_name := 'Sistema'; end if;

  if tg_op = 'INSERT' then
    insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
    values (new.ticket_id, coalesce(v_ticket_title, 'Chamado'), 'COMENTARIO', v_actor_name, auth.uid(), 
            case when new.visibility = 'internal' then 'Nota interna adicionada' else 'Comentário público adicionado' end);
    return new;
  elsif tg_op = 'UPDATE' and old.deleted_at is null and new.deleted_at is not null then
    insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
    values (new.ticket_id, coalesce(v_ticket_title, 'Chamado'), 'EXCLUSAO_COMENTARIO', v_actor_name, auth.uid(), 'Comentário removido (soft delete)');
    return new;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_audit_comments
after insert or update on public.ticket_comments
for each row execute function public.audit_comment_changes();

create or replace function public.audit_attachment_changes()
returns trigger as $$
declare
  v_ticket_title text;
  v_actor_name text;
begin
  select title into v_ticket_title from public.tickets where id = coalesce(new.ticket_id, old.ticket_id);
  select coalesce(name || ' (' || email || ')', 'Sistema') into v_actor_name from public.profiles where id = auth.uid();
  if v_actor_name is null then v_actor_name := 'Sistema'; end if;

  if tg_op = 'INSERT' then
    insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
    values (new.ticket_id, coalesce(v_ticket_title, 'Chamado'), 'ANEXO_ADICIONADO', v_actor_name, auth.uid(), 'Arquivo anexado: ' || new.file_name || ' (' || round(new.size_bytes / 1024.0, 1) || ' KB)');
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (ticket_id, ticket_title, action, performed_by, actor_id, details)
    values (old.ticket_id, coalesce(v_ticket_title, 'Chamado'), 'ANEXO_REMOVIDO', v_actor_name, auth.uid(), 'Arquivo removido: ' || old.file_name);
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_audit_attachments
after insert or delete on public.attachments
for each row execute function public.audit_attachment_changes();

-- ==============================================================================
-- Row Level Security (RLS) em 100% das Tabelas
-- ==============================================================================

alter table public.departments enable row level security;
alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.sla_policies enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.calendar_events enable row level security;
alter table public.private_notes enable row level security;

-- Departamentos: leitura livre para usuários ativos autenticados
create policy "Departamentos visíveis por todos os usuários autenticados"
on public.departments for select
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and is_active = true));

-- Cargos: leitura livre para usuários ativos autenticados
create policy "Cargos visíveis por todos os usuários autenticados"
on public.roles for select
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and is_active = true));

-- SLA Policies: leitura livre para usuários autenticados
create policy "Políticas de SLA visíveis por usuários autenticados"
on public.sla_policies for select
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and is_active = true));

-- Profiles:
-- 1. Leitura por todos os usuários ativos
create policy "Perfis visíveis por usuários ativos"
on public.profiles for select
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and is_active = true));

-- 2. Atualização pelo próprio usuário (ex: alterar senha/avatar) ou por quem tem 'user.manage'
create policy "Perfis atualizáveis pelo próprio usuário ou por gestor de usuários"
on public.profiles for update
to authenticated
using (
  auth.uid() = id or public.has_permission('user.manage')
);

-- 3. Inserção permitida por gestor de usuários ou service role
create policy "Perfis inseríveis por gestor de usuários"
on public.profiles for insert
to authenticated
with check (
  auth.uid() = id or public.has_permission('user.manage')
);

-- Tickets:
-- 1. SELECT: Presidente vê tudo (ticket.view_all); Diretor/Membro vê seu setor; Cliente vê os próprios chamados
create policy "Leitura de chamados por setor ou permissão global"
on public.tickets for select
to authenticated
using (
  public.has_permission('ticket.view_all')
  or (public.has_permission('ticket.view_own') and requester_id = auth.uid())
  or department_id = public.current_department_id()
  or assigned_department_id = public.current_department_id()
);

-- 2. INSERT: Qualquer usuário ativo com 'ticket.create'
create policy "Abertura de chamados por usuários autorizados"
on public.tickets for insert
to authenticated
with check (
  public.has_permission('ticket.create')
);

-- 3. UPDATE: Presidente (global) ou Membros/Diretores no próprio setor
create policy "Edição de chamados por setor ou permissão global"
on public.tickets for update
to authenticated
using (
  public.has_permission('ticket.view_all')
  or (
    public.has_permission('ticket.update')
    and (department_id = public.current_department_id() or assigned_department_id = public.current_department_id())
  )
);

-- 4. DELETE: Exclusão restrita a quem tem 'ticket.delete' (Diretor no setor ou Presidente global)
create policy "Exclusão de chamados restrita por permissão ticket.delete"
on public.tickets for delete
to authenticated
using (
  public.has_permission('ticket.delete')
  and (
    public.has_permission('ticket.view_all')
    or department_id = public.current_department_id()
    or assigned_department_id = public.current_department_id()
  )
);

-- Comentários:
-- 1. SELECT: deve poder ver o chamado pai. Se visibility = 'internal', deve ter permissão 'internal_notes.view'
create policy "Leitura de comentários permitida conforme visibilidade"
on public.ticket_comments for select
to authenticated
using (
  exists (select 1 from public.tickets t where t.id = ticket_comments.ticket_id)
  and (
    visibility = 'public'
    or public.has_permission('internal_notes.view')
  )
);

-- 2. INSERT: usuário com acesso ao chamado e 'comment.create'
create policy "Criação de comentários permitida por membros autorizados"
on public.ticket_comments for insert
to authenticated
with check (
  exists (select 1 from public.tickets t where t.id = ticket_comments.ticket_id)
  and public.has_permission('comment.create')
  and (
    visibility = 'public'
    or public.has_permission('internal_notes.create')
  )
);

-- 3. UPDATE: apenas o autor pode editar
create policy "Edição de comentário pelo próprio autor"
on public.ticket_comments for update
to authenticated
using (author_id = auth.uid() or public.has_permission('comment.delete'));

-- Anexos:
create policy "Leitura de anexos para quem tem acesso ao chamado"
on public.attachments for select
to authenticated
using (exists (select 1 from public.tickets t where t.id = attachments.ticket_id));

create policy "Upload de anexos para quem tem permissão attachment.upload"
on public.attachments for insert
to authenticated
with check (
  exists (select 1 from public.tickets t where t.id = attachments.ticket_id)
  and public.has_permission('attachment.upload')
);

create policy "Remoção de anexos pelo autor ou permissão ticket.delete"
on public.attachments for delete
to authenticated
using (
  uploaded_by = auth.uid() or public.has_permission('ticket.delete')
);

-- Auditoria:
create policy "Leitura de logs de auditoria"
on public.audit_logs for select
to authenticated
using (
  public.has_permission('audit.view_all')
  or exists (select 1 from public.tickets t where t.id = audit_logs.ticket_id)
  or ticket_id is null
);

create policy "Inserção de auditoria permitida para usuários autenticados"
on public.audit_logs for insert
to authenticated
with check (true);

-- Notificações:
create policy "Usuário gerencia apenas suas próprias notificações"
on public.notifications for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Usuário gerencia suas próprias preferências de notificação"
on public.notification_preferences for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Calendário:
create policy "Leitura de eventos globais ou privados do próprio autor"
on public.calendar_events for select
to authenticated
using (
  scope = 'global' or created_by_id = auth.uid()
);

create policy "Criação de eventos no calendário"
on public.calendar_events for insert
to authenticated
with check (
  (scope = 'global' and public.has_permission('event.create_global'))
  or (scope = 'private' and created_by_id = auth.uid())
);

create policy "Edição e exclusão de eventos do calendário"
on public.calendar_events for all
to authenticated
using (
  created_by_id = auth.uid()
  or (scope = 'global' and public.has_permission('event.create_global'))
);

-- Espaço Pessoal (private_notes):
create policy "Espaço privado isolado para o próprio usuário"
on public.private_notes for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ==============================================================================
-- Carga Inicial das Tabelas Estruturais (Departamentos, Cargos, SLAs)
-- ==============================================================================

insert into public.departments (id, code, name, email) values
  ('d1000000-0000-0000-0000-000000000001', 'TI', 'Tecnologia da Informação', 'ti@tecnosystem.com'),
  ('d1000000-0000-0000-0000-000000000002', 'RH', 'Recursos Humanos', 'rh@tecnosystem.com'),
  ('d1000000-0000-0000-0000-000000000003', 'Financeiro', 'Financeiro', 'financeiro@tecnosystem.com'),
  ('d1000000-0000-0000-0000-000000000004', 'Operações', 'Operações', 'operacoes@tecnosystem.com'),
  ('d1000000-0000-0000-0000-000000000005', 'Diretoria', 'Diretoria Executiva', 'diretoria@tecnosystem.com')
on conflict (code) do nothing;

insert into public.roles (id, name, description, permissions) values
  ('b1000000-0000-0000-0000-000000000001', 'Presidente', 'Acesso global irrestrito a todos os departamentos e configurações', array[
    'ticket.view_all', 'ticket.create', 'ticket.update', 'ticket.delete',
    'user.manage', 'event.create_global', 'comment.create', 'comment.edit', 'comment.delete',
    'internal_notes.view', 'internal_notes.create', 'attachment.upload', 'attachment.delete',
    'audit.view_all', 'settings.manage'
  ]),
  ('b1000000-0000-0000-0000-000000000002', 'Diretor', 'Gestão departamental, exclusão de chamados do setor e gestão de usuários', array[
    'ticket.create', 'ticket.update', 'ticket.delete',
    'user.manage', 'event.create_global', 'comment.create', 'comment.edit', 'comment.delete',
    'internal_notes.view', 'internal_notes.create', 'attachment.upload', 'attachment.delete'
  ]),
  ('b1000000-0000-0000-0000-000000000003', 'Gerente de Projetos', 'Acompanhamento e liderança operacional de chamados e eventos', array[
    'ticket.create', 'ticket.update', 'event.create_global',
    'comment.create', 'comment.edit', 'internal_notes.view', 'internal_notes.create', 'attachment.upload'
  ]),
  ('b1000000-0000-0000-0000-000000000004', 'Membro', 'Abertura e atendimento operacional de chamados do seu departamento', array[
    'ticket.create', 'ticket.update', 'comment.create', 'comment.edit',
    'internal_notes.view', 'internal_notes.create', 'attachment.upload'
  ]),
  ('b1000000-0000-0000-0000-000000000005', 'Cliente', 'Acesso restrito para abertura e acompanhamento dos próprios chamados', array[
    'ticket.create', 'ticket.view_own', 'comment.create'
  ])
on conflict (name) do nothing;

insert into public.sla_policies (priority, response_hours, resolution_hours, business_hours_only) values
  ('Crítica', 1, 4, false),
  ('Alta', 2, 8, false),
  ('Média', 4, 24, false),
  ('Baixa', 8, 72, false)
on conflict (priority) do nothing;
