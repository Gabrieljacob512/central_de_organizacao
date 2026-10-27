-- ==============================================================================
-- Tecno System Service Desk - RPCs Atômicas e Bucket de Storage
-- ==============================================================================

-- 1. Criação do Bucket de Storage Privado para Anexos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments',
  'ticket-attachments',
  false,
  1048576, -- Máximo de 1 MB por arquivo (1.048.576 bytes)
  array[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

-- Políticas de RLS para o Storage
drop policy if exists "Acesso a anexos concedido se tiver acesso ao chamado" on storage.objects;
create policy "Acesso a anexos concedido se tiver acesso ao chamado"
on storage.objects for select
to authenticated
using (
  bucket_id = 'ticket-attachments'
  and (
    public.has_permission('ticket.view_all')
    or exists (
      select 1 from public.attachments a
      join public.tickets t on t.id = a.ticket_id
      where a.storage_path = storage.objects.name
      and (
        t.requester_id = auth.uid()
        or t.assignee_id = auth.uid()
        or t.department_id = public.current_department_id()
        or t.assigned_department_id = public.current_department_id()
      )
    )
  )
);

drop policy if exists "Upload de anexos para usuários autorizados" on storage.objects;
create policy "Upload de anexos para usuários autorizados"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'ticket-attachments'
  and public.has_permission('attachment.upload')
);

drop policy if exists "Exclusão de anexos pelo autor ou quem tem ticket.delete" on storage.objects;
create policy "Exclusão de anexos pelo autor ou quem tem ticket.delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'ticket-attachments'
  and (
    owner = auth.uid()
    or public.has_permission('ticket.delete')
  )
);

-- 2. RPC: Transição de Status Atômica
-- Valida as regras de negócio, recalcula SLA, atualiza timestamps, registra auditoria e emite notificações atomicamente
create or replace function public.transition_ticket_status(
  p_ticket_id text,
  p_new_status text
)
returns jsonb as $$
declare
  v_ticket public.tickets%rowtype;
  v_actor_id uuid;
  v_actor_name text;
  v_old_status text;
  v_now timestamptz := now();
  v_is_valid_transition boolean := false;
begin
  v_actor_id := auth.uid();
  select coalesce(name, 'Usuário') into v_actor_name from public.profiles where id = v_actor_id;

  -- Busca e trava a linha do chamado
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Chamado não encontrado.');
  end if;

  v_old_status := v_ticket.status;

  -- Valida permissão: Presidente (global) ou setor responsável/solicitante
  if not (
    public.has_permission('ticket.view_all')
    or (
      public.has_permission('ticket.update')
      and (
        v_ticket.department_id = public.current_department_id()
        or v_ticket.assigned_department_id = public.current_department_id()
        or v_ticket.assignee_id = v_actor_id
      )
    )
  ) then
    return jsonb_build_object('success', false, 'error', 'Permissão negada para alterar o status deste chamado.');
  end if;

  -- Validação de status permitido
  if p_new_status not in ('Aberto', 'Em Andamento', 'Pendente', 'Resolvido', 'Fechado') then
    return jsonb_build_object('success', false, 'error', 'Status de destino inválido: ' || p_new_status);
  end if;

  if v_old_status = p_new_status then
    return jsonb_build_object('success', true, 'message', 'O chamado já se encontra neste status.', 'status', p_new_status);
  end if;

  -- Máquina de estados: validação de transição
  if v_old_status = 'Aberto' and p_new_status in ('Em Andamento', 'Pendente', 'Resolvido', 'Fechado') then
    v_is_valid_transition := true;
  elsif v_old_status = 'Em Andamento' and p_new_status in ('Pendente', 'Resolvido', 'Fechado', 'Aberto') then
    v_is_valid_transition := true;
  elsif v_old_status = 'Pendente' and p_new_status in ('Em Andamento', 'Resolvido', 'Fechado') then
    v_is_valid_transition := true;
  elsif v_old_status = 'Resolvido' and p_new_status in ('Fechado', 'Em Andamento', 'Aberto') then
    v_is_valid_transition := true;
  elsif v_old_status = 'Fechado' and p_new_status in ('Aberto', 'Em Andamento') then
    -- Reabertura após fechamento permitida para quem tem ticket.update
    v_is_valid_transition := true;
  end if;

  if not v_is_valid_transition then
    return jsonb_build_object('success', false, 'error', 'Transição de status não permitida de ' || v_old_status || ' para ' || p_new_status);
  end if;

  -- Atualização do status (trg_ticket_sla_and_timestamps cuidará do SLA e trg_audit_tickets da auditoria)
  update public.tickets
  set
    status = p_new_status,
    updated_at = v_now
  where id = p_ticket_id;

  -- Disparo atômico de notificações in-app
  -- Notifica solicitante se for usuário do sistema e diferente de quem alterou
  if v_ticket.requester_id is not null and v_ticket.requester_id <> coalesce(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid) then
    insert into public.notifications (user_id, title, message, type, link)
    values (
      v_ticket.requester_id,
      'Status alterado: ' || v_ticket.id,
      'O status do chamado "' || v_ticket.title || '" foi alterado de ' || v_old_status || ' para ' || p_new_status || ' por ' || v_actor_name || '.',
      'status_change',
      v_ticket.id
    );
  end if;

  -- Notifica responsável se houver e for diferente do autor da ação
  if v_ticket.assignee_id is not null and v_ticket.assignee_id <> coalesce(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid) and v_ticket.assignee_id <> coalesce(v_ticket.requester_id, '00000000-0000-0000-0000-000000000000'::uuid) then
    insert into public.notifications (user_id, title, message, type, link)
    values (
      v_ticket.assignee_id,
      'Status alterado: ' || v_ticket.id,
      'O status do chamado "' || v_ticket.title || '" sob sua responsabilidade mudou para ' || p_new_status || '.',
      'status_change',
      v_ticket.id
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'ticket_id', p_ticket_id,
    'previous_status', v_old_status,
    'status', p_new_status
  );
end;
$$ language plpgsql security definer;

-- 3. RPC: Atribuição Atômica de Responsável e Departamento
create or replace function public.assign_ticket_atomic(
  p_ticket_id text,
  p_assignee_id uuid default null,
  p_assigned_department_id uuid default null
)
returns jsonb as $$
declare
  v_ticket public.tickets%rowtype;
  v_assignee public.profiles%rowtype;
  v_actor_id uuid;
  v_actor_name text;
  v_workload bigint := 0;
begin
  v_actor_id := auth.uid();
  select coalesce(name, 'Usuário') into v_actor_name from public.profiles where id = v_actor_id;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Chamado não encontrado.');
  end if;

  if not (
    public.has_permission('ticket.view_all')
    or (
      public.has_permission('ticket.update')
      and (
        v_ticket.department_id = public.current_department_id()
        or v_ticket.assigned_department_id = public.current_department_id()
      )
    )
  ) then
    return jsonb_build_object('success', false, 'error', 'Permissão negada para reatribuir este chamado.');
  end if;

  -- Se foi informado novo responsável, valida existência e carga de trabalho
  if p_assignee_id is not null then
    select * into v_assignee from public.profiles where id = p_assignee_id and is_active = true;
    if not found then
      return jsonb_build_object('success', false, 'error', 'Membro responsável não encontrado ou inativo.');
    end if;

    -- Calcula chamados ativos em andamento pelo membro
    select count(*) into v_workload
    from public.tickets
    where assignee_id = p_assignee_id
    and status in ('Aberto', 'Em Andamento', 'Pendente');
  end if;

  -- Atualiza o chamado
  update public.tickets
  set
    assignee_id = case when p_assignee_id is not null then p_assignee_id else assignee_id end,
    assigned_department_id = case when p_assigned_department_id is not null then p_assigned_department_id else assigned_department_id end,
    updated_at = now()
  where id = p_ticket_id;

  -- Notifica novo responsável se houver
  if p_assignee_id is not null and p_assignee_id <> coalesce(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid) then
    insert into public.notifications (user_id, title, message, type, link)
    values (
      p_assignee_id,
      'Novo chamado atribuído: ' || v_ticket.id,
      'Você foi atribuído como responsável pelo chamado "' || v_ticket.title || '" por ' || v_actor_name || '.',
      'ticket_assigned',
      v_ticket.id
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'ticket_id', p_ticket_id,
    'assignee_id', p_assignee_id,
    'assigned_department_id', p_assigned_department_id,
    'assignee_active_tickets', v_workload
  );
end;
$$ language plpgsql security definer;
