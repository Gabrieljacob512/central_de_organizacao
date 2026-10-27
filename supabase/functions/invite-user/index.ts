import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token de autorização não fornecido.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente autenticado com o token do chamador para verificar permissão
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica permissão user.manage
    const { data: hasManagePerm, error: permError } = await userClient.rpc('has_permission', {
      p_permission: 'user.manage',
    });

    if (permError || !hasManagePerm) {
      return new Response(JSON.stringify({ error: 'Acesso negado: permissão user.manage necessária.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, email, department_id, role_id, temporary_password } = await req.json();

    if (!name || !email || !role_id) {
      return new Response(JSON.stringify({ error: 'Nome, e-mail e cargo são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente com service role para operações administrativas
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Cria o usuário no Auth
    const tempPassword = temporary_password || ('Tecno@' + Math.random().toString(36).substring(2, 8) + '!');
    const { data: createdAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, department_id, role_id },
    });

    if (createError || !createdAuthUser.user) {
      return new Response(JSON.stringify({ error: createError?.message || 'Falha ao criar usuário no auth.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = createdAuthUser.user.id;

    // Cria perfil no banco
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: newUserId,
      name,
      email,
      department_id: department_id || null,
      role_id,
      is_active: true,
      must_change_password: true,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      return new Response(JSON.stringify({ error: 'Erro ao criar perfil: ' + profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Audit Log
    const { data: actorProfile } = await adminClient
      .from('profiles')
      .select('name, email')
      .where('id', 'eq', user.id)
      .maybeSingle();

    const actorName = actorProfile ? `${actorProfile.name} (${actorProfile.email})` : user.email;

    await adminClient.from('audit_logs').insert({
      action: 'user.invite',
      performed_by: actorName,
      actor_id: user.id,
      details: `Novo membro convidado: ${name} (${email}) com cargo ID ${role_id}. Senha temporária gerada.`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUserId,
          name,
          email,
          department_id,
          role_id,
          temporary_password: tempPassword,
        },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erro interno no servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
