-- ==============================================================================
-- Migration: 20261027000005_update_departments_and_sidebar_rbac.sql
-- 1. Departamentos exclusivos: Financeiro, RH, Marketing, Projetos
-- 2. Permissões: audit.view, ticket.assign, profile.change_department
-- 3. RLS em audit_logs (Presidente vê tudo; Diretor apenas seu setor; Membro nada)
-- 4. Proteção de departamento em profiles (apenas quem tem profile.change_department)
-- 5. Bucket 'avatars' no Storage com RLS estrito ({user_id}/*)
-- 6. Índice em tickets(assignee_id) e tickets(requester_id)
-- ==============================================================================

-- 1. Inserir ou garantir os 4 novos departamentos
insert into public.departments (id, code, name, email) values
  ('d1000000-0000-0000-0000-000000000003', 'Financeiro', 'Financeiro', 'financeiro@tecnosystem.com'),
  ('d1000000-0000-0000-0000-000000000002', 'RH', 'Recursos Humanos', 'rh@tecnosystem.com'),
  ('d1000000-0000-0000-0000-000000000006', 'Marketing', 'Marketing & Comunicação', 'marketing@tecnosystem.com'),
  ('d1000000-0000-0000-0000-000000000007', 'Projetos', 'Gestão de Projetos & Soluções', 'projetos@tecnosystem.com')
on conflict (code) do update set
  name = excluded.name,
  email = excluded.email;

-- Migrar dados associados e remover departamentos obsoletos
do $$
declare
  v_proj_id uuid;
  v_fin_id uuid;
  v_rh_id uuid;
  v_mkt_id uuid;
  v_ti_id uuid;
  v_ops_id uuid;
  v_dir_id uuid;
begin
  select id into v_proj_id from public.departments where code = 'Projetos';
  select id into v_fin_id from public.departments where code = 'Financeiro';
  select id into v_rh_id from public.departments where code = 'RH';
  select id into v_mkt_id from public.departments where code = 'Marketing';
  select id into v_ti_id from public.departments where code = 'TI';
  select id into v_ops_id from public.departments where code = 'Operações';
  select id into v_dir_id from public.departments where code = 'Diretoria';

  -- Migrar perfis, chamados, eventos e projetos antigos
  if v_ti_id is not null then
    update public.projects set department_id = v_proj_id where department_id = v_ti_id;
    update public.profiles set department_id = v_proj_id where department_id = v_ti_id;
    update public.tickets set department_id = v_proj_id where department_id = v_ti_id;
    update public.tickets set assigned_department_id = v_proj_id where assigned_department_id = v_ti_id;
    update public.calendar_events set department_id = v_proj_id where department_id = v_ti_id;
  end if;

  if v_ops_id is not null then
    update public.projects set department_id = v_mkt_id where department_id = v_ops_id;
    update public.profiles set department_id = v_mkt_id where department_id = v_ops_id;
    update public.tickets set department_id = v_mkt_id where department_id = v_ops_id;
    update public.tickets set assigned_department_id = v_mkt_id where assigned_department_id = v_ops_id;
    update public.calendar_events set department_id = v_mkt_id where department_id = v_ops_id;
  end if;

  if v_dir_id is not null then
    update public.projects set department_id = v_proj_id where department_id = v_dir_id;
    update public.profiles set department_id = v_proj_id where department_id = v_dir_id;
    update public.tickets set department_id = v_proj_id where department_id = v_dir_id;
    update public.tickets set assigned_department_id = v_proj_id where assigned_department_id = v_dir_id;
    update public.calendar_events set department_id = v_proj_id where department_id = v_dir_id;
  end if;

  -- Remover departamentos antigos
  delete from public.departments where code in ('TI', 'Operações', 'Diretoria');
end $$;

-- 2. Atualizar campo theme em profiles
alter table public.profiles add column if not exists theme text not null default 'system';

-- 3. Adicionar department_id à tabela audit_logs para filtragem departamental
alter table public.audit_logs add column if not exists department_id uuid references public.departments(id);
create index if not exists idx_audit_logs_department_id on public.audit_logs(department_id);
create index if not exists idx_tickets_assignee_id on public.tickets(assignee_id);
create index if not exists idx_tickets_requester_id on public.tickets(requester_id);

-- Backfill seguro desabilitando temporariamente a trava de imutabilidade
alter table public.audit_logs disable trigger trg_audit_logs_immutable;

update public.audit_logs a
set department_id = coalesce(
  (select t.department_id from public.tickets t where t.id = a.ticket_id limit 1),
  (select p.department_id from public.profiles p where p.id = a.actor_id limit 1),
  (select id from public.departments where code = 'Projetos' limit 1)
)
where a.department_id is null;

alter table public.audit_logs enable trigger trg_audit_logs_immutable;

-- Trigger para auto-preencher department_id em novas inserções de audit_logs se nulo
create or replace function public.trg_auto_fill_audit_department()
returns trigger as $$
begin
  if NEW.department_id is null then
    if NEW.ticket_id is not null then
      select t.department_id into NEW.department_id
      from public.tickets t where t.id = NEW.ticket_id limit 1;
    end if;

    if NEW.department_id is null and NEW.actor_id is not null then
      select p.department_id into NEW.department_id
      from public.profiles p where p.id = NEW.actor_id limit 1;
    end if;

    if NEW.department_id is null and auth.uid() is not null then
      select p.department_id into NEW.department_id
      from public.profiles p where p.id = auth.uid() limit 1;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_audit_fill_department on public.audit_logs;
create trigger trg_audit_fill_department
before insert on public.audit_logs
for each row execute function public.trg_auto_fill_audit_department();

-- 4. Atualizar Permissões nas Roles
-- Presidente: ganha audit.view, ticket.assign, profile.change_department
update public.roles
set permissions = array[
  'ticket.view_all', 'ticket.create', 'ticket.update', 'ticket.delete',
  'user.manage', 'event.create_global', 'comment.create', 'comment.edit', 'comment.delete',
  'internal_notes.view', 'internal_notes.create', 'attachment.upload', 'attachment.delete',
  'audit.view_all', 'audit.view', 'ticket.assign', 'profile.change_department', 'settings.manage'
]
where name = 'Presidente';

-- Diretor: ganha audit.view, ticket.assign (mas NÃO profile.change_department nem ticket.view_all)
update public.roles
set permissions = array[
  'ticket.create', 'ticket.update', 'ticket.delete',
  'user.manage', 'event.create_global', 'comment.create', 'comment.edit', 'comment.delete',
  'internal_notes.view', 'internal_notes.create', 'attachment.upload', 'attachment.delete',
  'audit.view', 'ticket.assign'
]
where name = 'Diretor';

-- Gerente de Projetos:
update public.roles
set permissions = array[
  'ticket.create', 'ticket.update', 'event.create_global',
  'comment.create', 'comment.edit', 'internal_notes.view', 'internal_notes.create', 'attachment.upload',
  'ticket.assign'
]
where name = 'Gerente de Projetos';

-- Membro: NÃO tem audit.view, ticket.assign, nem profile.change_department
update public.roles
set permissions = array[
  'ticket.create', 'ticket.update', 'comment.create', 'comment.edit',
  'internal_notes.view', 'internal_notes.create', 'attachment.upload'
]
where name = 'Membro';

-- 5. RLS em audit_logs (SELECT)
-- Presidente lê tudo ('ticket.view_all');
-- Diretor lê apenas os registros do seu departamento ('audit.view');
-- Membro não lê nada.
drop policy if exists "Leitura de logs de auditoria para administradores e interessados" on public.audit_logs;
drop policy if exists "audit_logs_select_policy" on public.audit_logs;

create policy "audit_logs_select_policy"
on public.audit_logs for select
to authenticated
using (
  public.has_permission('audit.view')
  and (
    public.has_permission('ticket.view_all')
    or department_id = public.current_department_id()
    or exists (
      select 1 from public.tickets t
      where t.id = audit_logs.ticket_id
      and (t.department_id = public.current_department_id() or t.assigned_department_id = public.current_department_id())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = audit_logs.actor_id
      and p.department_id = public.current_department_id()
    )
  )
);

-- 6. Impedir alteração de departamento em profiles sem a permissão profile.change_department
create or replace function public.check_profile_department_change()
returns trigger as $$
begin
  if NEW.department_id is distinct from OLD.department_id then
    if not (public.has_permission('profile.change_department') or auth.role() = 'service_role' or auth.uid() is null) then
      raise exception 'Apenas a presidência altera o departamento.';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_check_profile_department_change on public.profiles;
create trigger trg_check_profile_department_change
before update on public.profiles
for each row execute function public.check_profile_department_change();

-- 7. Bucket 'avatars' no Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  1048576, -- 1 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

-- Storage Policies para avatars
drop policy if exists "Avatars leitura publica" on storage.objects;
create policy "Avatars leitura publica"
on storage.objects for select
to authenticated, anon
using (bucket_id = 'avatars');

drop policy if exists "Avatars upload apenas pelo dono" on storage.objects;
create policy "Avatars upload apenas pelo dono"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (
    (auth.uid())::text = (storage.foldername(name))[1]
    or name like (auth.uid())::text || '/%'
    or name like (auth.uid())::text || '.%'
  )
);

drop policy if exists "Avatars atualizacao apenas pelo dono" on storage.objects;
create policy "Avatars atualizacao apenas pelo dono"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (auth.uid())::text = (storage.foldername(name))[1]
    or name like (auth.uid())::text || '/%'
    or name like (auth.uid())::text || '.%'
  )
);

drop policy if exists "Avatars exclusao apenas pelo dono" on storage.objects;
create policy "Avatars exclusao apenas pelo dono"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (auth.uid())::text = (storage.foldername(name))[1]
    or name like (auth.uid())::text || '/%'
    or name like (auth.uid())::text || '.%'
  )
);
