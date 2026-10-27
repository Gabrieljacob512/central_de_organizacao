import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Chamada executada via Cron ou agendador interno com Service Role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Busca chamados em aberto ou em andamento
    const { data: tickets, error: ticketsError } = await adminClient
      .from('tickets')
      .select('id, title, status, priority, sla_due_at, requester_id, assignee_id, department_id, assigned_department_id')
      .in('status', ['Aberto', 'Em Andamento']);

    if (ticketsError) {
      return new Response(JSON.stringify({ error: ticketsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Busca diretores e presidente para alertas de estouro de SLA
    const { data: directorsAndPres } = await adminClient
      .from('profiles')
      .select('id, department_id, roles!inner(name)')
      .in('roles.name', ['Presidente', 'Diretor Geral', 'Diretor de Projetos', 'Diretor de Marketing', 'Diretor Comercial', 'Diretor de Recursos Humanos']);

    let nearBreachCount = 0;
    let breachedCount = 0;

    for (const ticket of tickets || []) {
      const slaDueDate = new Date(ticket.sla_due_at);
      const isBreached = slaDueDate <= now;
      const isNearBreach = !isBreached && slaDueDate <= twoHoursFromNow;

      if (isBreached) {
        breachedCount++;

        // Checa se já existe notificação recente (últimas 2 horas) de sla_breached para este chamado
        const { count } = await adminClient
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('type', 'sla_breached')
          .eq('link', ticket.id)
          .gte('created_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString());

        if ((count ?? 0) === 0) {
          // Destinatários: Responsável + Diretor do departamento + Presidente
          const recipientIds = new Set<string>();
          if (ticket.assignee_id) recipientIds.add(ticket.assignee_id);

          directorsAndPres?.forEach((p: any) => {
            if (p.roles?.name === 'Presidente' || p.department_id === ticket.department_id || p.department_id === ticket.assigned_department_id) {
              recipientIds.add(p.id);
            }
          });

          for (const recipientId of recipientIds) {
            await adminClient.from('notifications').insert({
              user_id: recipientId,
              title: `ALERTA DE SLA ESTOURADO: ${ticket.id}`,
              message: `O chamado "${ticket.title}" (${ticket.priority}) ultrapassou o limite máximo de SLA em ${slaDueDate.toLocaleTimeString('pt-BR')}. Ação imediata requerida.`,
              type: 'sla_breached',
              link: ticket.id,
            });
          }

          // Registra na auditoria
          await adminClient.from('audit_logs').insert({
            ticket_id: ticket.id,
            ticket_title: ticket.title,
            action: 'sla.breached',
            performed_by: 'Monitor de SLA (Sistema)',
            details: `Chamado ultrapassou o tempo limite de resolução previsto (${ticket.sla_due_at}). Notificações enviadas aos gestores.`,
          });
        }
      } else if (isNearBreach) {
        nearBreachCount++;

        const { count } = await adminClient
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('type', 'sla_warning')
          .eq('link', ticket.id)
          .gte('created_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString());

        if ((count ?? 0) === 0) {
          if (ticket.assignee_id) {
            await adminClient.from('notifications').insert({
              user_id: ticket.assignee_id,
              title: `Aviso de SLA Próximo: ${ticket.id}`,
              message: `O chamado "${ticket.title}" vence em menos de 2 horas (${slaDueDate.toLocaleTimeString('pt-BR')}).`,
              type: 'sla_warning',
              link: ticket.id,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned_tickets: tickets?.length ?? 0,
        near_breach: nearBreachCount,
        breached: breachedCount,
        timestamp: now.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erro interno na checagem de SLA' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
