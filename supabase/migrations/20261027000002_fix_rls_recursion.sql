-- ==============================================================================
-- Tecno System Service Desk - Correção de Recursão em Políticas de Perfis e Notificações
-- ==============================================================================

-- 1. Desfaz e recria políticas de profiles para eliminar recursão infinita
drop policy if exists "Perfis visíveis por usuários ativos" on public.profiles;
create policy "Perfis visíveis por usuários ativos"
on public.profiles for select
to authenticated
using (true);

-- 2. Departamentos, Cargos e SLA Policies: leitura direta para autenticados
drop policy if exists "Departamentos visíveis por todos os usuários autenticados" on public.departments;
create policy "Departamentos visíveis por todos os usuários autenticados"
on public.departments for select
to authenticated
using (true);

drop policy if exists "Cargos visíveis por todos os usuários autenticados" on public.roles;
create policy "Cargos visíveis por todos os usuários autenticados"
on public.roles for select
to authenticated
using (true);

drop policy if exists "Políticas de SLA visíveis por usuários autenticados" on public.sla_policies;
create policy "Políticas de SLA visíveis por usuários autenticados"
on public.sla_policies for select
to authenticated
using (true);

-- 3. Notificações: permitir INSERT por outros usuários autenticados (menções, status, atribuições)
-- e restringir SELECT, UPDATE e DELETE estritamente ao proprietário (user_id = auth.uid())
drop policy if exists "Usuário gerencia apenas suas próprias notificações" on public.notifications;

create policy "Usuário visualiza apenas suas próprias notificações"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

create policy "Usuários autenticados podem enviar notificações"
on public.notifications for insert
to authenticated
with check (true);

create policy "Usuário atualiza apenas suas próprias notificações"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Usuário exclui apenas suas próprias notificações"
on public.notifications for delete
to authenticated
using (user_id = auth.uid());
