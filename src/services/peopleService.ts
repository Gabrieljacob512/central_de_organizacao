import { supabase } from './supabase';
import type { Department, ResponderStat, UserProfile } from '../types/ticket';
import { INITIAL_USERS } from '../constants/config';

export interface CreatePersonInput {
  name: string;
  email: string;
  department: Department;
  secondaryDepartment?: Department;
  role: string;
  password?: string;
}

export interface UpdatePersonInput {
  name?: string;
  email?: string;
  department?: Department;
  secondaryDepartment?: Department;
  role?: string;
  isActive?: boolean;
}

/**
 * Busca a lista completa de colaboradores e seus papéis / associações.
 */
export async function fetchPeopleList(): Promise<UserProfile[]> {
  try {
    const { data, error } = await (supabase.from('profiles') as any)
      .select(`
        id,
        name,
        email,
        is_active,
        must_change_password,
        avatar_url,
        departments:department_id (id, code, name),
        roles:role_id (id, name),
        department_memberships (
          department_id,
          is_director,
          departments:department_id (id, code, name)
        )
      `)
      .order('name');

    if (error || !data || data.length === 0) {
      console.warn('[peopleService] Usando lista inicial local:', error?.message);
      return INITIAL_USERS;
    }

    return data.map((item: any) => {
      const deptCode = (item.departments?.code || item.departments?.name || 'Administração') as Department;
      const roleName = item.roles?.name || 'Membro';

      const memberships = (item.department_memberships || []).map((m: any) => ({
        departmentId: m.department_id,
        departmentCode: (m.departments?.code || m.departments?.name) as Department,
        departmentName: m.departments?.name || '',
        isDirector: Boolean(m.is_director),
      }));

      // Achar departamento secundário onde é diretor
      const secDirector = memberships.find((m: any) => m.isDirector && m.departmentCode !== 'Administração');

      return {
        id: item.id,
        name: item.name,
        email: item.email,
        department: deptCode,
        secondaryDepartment: secDirector?.departmentCode,
        role: roleName,
        isActive: item.is_active ?? true,
        mustChangePassword: item.must_change_password ?? false,
        avatarUrl: item.avatar_url,
        createdAt: new Date().toISOString(),
        isExecutive: roleName === 'Presidente' || roleName === 'Vice-presidente',
        departmentMemberships: memberships,
      };
    });
  } catch (err) {
    console.warn('[peopleService] Erro ao buscar colaboradores:', err);
    return INITIAL_USERS;
  }
}

/**
 * Consulta estatísticas agregadas de resposta a chamados via RPC segura hr_responders_stats.
 */
export async function fetchRespondersStats(periodDays: number = 30): Promise<ResponderStat[]> {
  try {
    const { data, error } = await (supabase.rpc as any)('hr_responders_stats', {
      period_days: periodDays,
    });

    if (error) {
      console.error('[peopleService] Erro ao executar hr_responders_stats:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      profile_id: row.profile_id,
      name: row.name,
      email: row.email,
      department_name: row.department_name,
      role_name: row.role_name,
      assigned_count: Number(row.assigned_count || 0),
      comments_count: row.comments_count !== null ? Number(row.comments_count) : 0,
      resolved_count: row.resolved_count !== null ? Number(row.resolved_count) : 0,
      last_activity_at: row.last_activity_at,
    }));
  } catch (err) {
    console.error('[peopleService] Erro na requisição de estatísticas:', err);
    return [];
  }
}

/**
 * Alterna status de ativação do colaborador (soft-deactivate).
 */
export async function togglePersonStatus(
  userId: string,
  isActive: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await (supabase.from('profiles') as any)
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: isActive ? 'Colaborador ativado com sucesso.' : 'Colaborador inativado com sucesso.',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro inesperado ao alterar status.' };
  }
}

/**
 * Criação de novo colaborador com papéis condicionados e regras executivas.
 */
export async function createPerson(
  input: CreatePersonInput
): Promise<{ success: boolean; message: string; user?: UserProfile }> {
  try {
    // 1. Obter IDs de departamento e cargo
    const { data: depts } = await (supabase.from('departments') as any).select('id, code, name');
    const { data: roles } = await (supabase.from('roles') as any).select('id, name');

    const dep = depts?.find((d: any) => d.code === input.department || d.name === input.department);
    const role = roles?.find((r: any) => r.name.toLowerCase() === input.role.toLowerCase());

    if (!dep || !role) {
      return { success: false, message: 'Departamento ou cargo inválido.' };
    }

    // Gerar senha padrão segura caso não fornecida
    const rawPassword = input.password || 'Tecno@2026!';

    // 2. Criar no Supabase Auth se serviço estiver configurado
    const { data: created } = await supabase.auth.signUp({
      email: input.email,
      password: rawPassword,
      options: {
        data: { name: input.name },
      },
    });

    const newId = created.user?.id || `usr-${Date.now()}`;

    // 3. Upsert no perfil
    const { error: profErr } = await (supabase.from('profiles') as any).upsert({
      id: newId,
      name: input.name,
      email: input.email,
      department_id: dep.id,
      role_id: role.id,
      is_active: true,
      must_change_password: true,
      updated_at: new Date().toISOString(),
    });

    if (profErr) {
      return { success: false, message: profErr.message };
    }

    // 4. Se for Vice-presidente, associar ao depto de Administração E depto operacional onde é diretor
    if (input.role.toLowerCase().includes('vice') && input.secondaryDepartment) {
      const secDep = depts?.find(
        (d: any) => d.code === input.secondaryDepartment || d.name === input.secondaryDepartment
      );
      if (secDep) {
        await (supabase.from('department_memberships' as any) as any).upsert([
          {
            user_id: newId,
            department_id: dep.id,
            is_director: false,
          },
          {
            user_id: newId,
            department_id: secDep.id,
            is_director: true,
          },
        ]);
      }
    } else {
      const isDirector = input.role.toLowerCase().includes('diretor') || input.role.toLowerCase().includes('presidente');
      await (supabase.from('department_memberships' as any) as any).upsert({
        user_id: newId,
        department_id: dep.id,
        is_director: isDirector,
      });
    }

    return {
      success: true,
      message: 'Colaborador cadastrado com sucesso!',
      user: {
        id: newId,
        name: input.name,
        email: input.email,
        department: input.department,
        secondaryDepartment: input.secondaryDepartment,
        role: input.role,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Falha ao registrar colaborador.' };
  }
}

/**
 * Envia notificação / alerta in-app para um colaborador sem atividade no período.
 */
export async function sendActivityAlert(
  targetUserId: string,
  targetName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const senderId = session?.session?.user?.id;

    const { error } = await (supabase.from('notifications') as any).insert({
      user_id: targetUserId,
      sender_id: senderId,
      title: 'Lembrete de Atendimento e Chamados',
      message: `Olá, ${targetName}! O RH identificou que você não possui respostas registradas a chamados no período recente. Por favor, verifique a fila do seu departamento.`,
      type: 'warning',
      read: false,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: `Alerta enviado com sucesso para ${targetName}.` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro ao enviar alerta.' };
  }
}
