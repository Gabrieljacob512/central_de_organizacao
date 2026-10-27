-- ==============================================================================
-- Tecno System Service Desk - Adiciona sender_id e ajusta RLS de notificações
-- ==============================================================================

alter table public.notifications 
add column if not exists sender_id uuid references public.profiles(id) default auth.uid();

drop policy if exists "Usuário visualiza apenas suas próprias notificações" on public.notifications;
create policy "Usuário visualiza notificações destinadas a ele ou enviadas por ele"
on public.notifications for select
to authenticated
using (user_id = auth.uid() or sender_id = auth.uid() or public.has_permission('ticket.view_all'));
