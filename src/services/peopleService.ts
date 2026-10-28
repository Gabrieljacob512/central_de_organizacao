import { z } from 'zod';
import {
  mutate,
  readCollection,
  StoredCommentSchema,
  StoredDepartmentSchema,
  StoredMembershipSchema,
  StoredNotificationSchema,
  StoredTicketSchema,
  StoredUserSchema,
  writeCollection,
  type StoredMembership,
  type StoredUser,
} from '../data/storage';
import type { Department, ResponderStat, UserProfile } from '../types/ticket';
import { getCurrentUser } from './authService';

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
 * Gera uma senha temporária segura de 10 caracteres alfanuméricos com símbolos.
 */
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let password = '';
  const array = new Uint32Array(10);
  crypto.getRandomValues(array);
  for (let i = 0; i < 10; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

/**
 * Busca a lista completa de colaboradores e seus papéis / associações.
 */
export async function fetchPeopleList(): Promise<UserProfile[]> {
  try {
    const users = readCollection('users', z.array(StoredUserSchema), []);
    const memberships = readCollection('memberships', z.array(StoredMembershipSchema), []);
    const departments = readCollection('departments', z.array(StoredDepartmentSchema), []);

    return users.map((u) => {
      const userMemberships = memberships.filter((m) => m.userId === u.id);
      const isExec = u.role === 'Presidente' || u.role === 'Vice-presidente';

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        department: u.department,
        secondaryDepartment: u.secondaryDepartment,
        role: u.role,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        isExecutive: isExec,
        departmentMemberships: userMemberships.map((m) => {
          const dept = departments.find((d) => d.id === m.departmentId || d.code === m.departmentCode);
          return {
            departmentId: m.departmentId,
            departmentCode: m.departmentCode,
            departmentName: dept?.name || m.departmentCode,
            isDirector: m.isDirector,
          };
        }),
      };
    });
  } catch (err) {
    console.warn('[peopleService] Erro ao buscar colaboradores:', err);
    return [];
  }
}

/**
 * Consulta estatísticas agregadas de resposta a chamados a partir dos dados do storage.
 */
export async function fetchRespondersStats(periodDays: number = 30): Promise<ResponderStat[]> {
  try {
    const users = readCollection('users', z.array(StoredUserSchema), []);
    const tickets = readCollection('tickets', z.array(StoredTicketSchema), []);
    const comments = readCollection('comments', z.array(StoredCommentSchema), []);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    return users.map((u) => {
      const userTickets = tickets.filter(
        (t) => t.assignee === u.name || t.email.toLowerCase() === u.email.toLowerCase()
      );
      const userComments = comments.filter((c) => c.authorId === u.id);

      const assignedCount = userTickets.filter((t) => t.assignee === u.name).length;
      const resolvedCount = userTickets.filter(
        (t) => t.assignee === u.name && (t.status === 'Resolvido' || t.status === 'Fechado')
      ).length;

      // Calcular última atividade
      const dates = [
        ...userComments.map((c) => new Date(c.createdAt).getTime()),
        ...userTickets.map((t) => new Date(t.updatedAt).getTime()),
      ].filter((d) => !isNaN(d));

      const lastActivityAt = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

      return {
        profile_id: u.id,
        name: u.name,
        email: u.email,
        department_name: u.department,
        role_name: u.role,
        assigned_count: assignedCount,
        comments_count: userComments.length,
        resolved_count: resolvedCount,
        last_activity_at: lastActivityAt,
      };
    });
  } catch (err) {
    console.error('[peopleService] Erro ao carregar estatísticas:', err);
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
    const currentUser = getCurrentUser();
    const users = readCollection('users', z.array(StoredUserSchema), []);
    const target = users.find((u) => u.id === userId);

    if (!target) {
      return { success: false, message: 'Colaborador não encontrado.' };
    }

    if (target.email === 'presidente@gmail.com') {
      return { success: false, message: 'A conta raiz do Presidente não pode ser inativada.' };
    }

    mutate({
      user: currentUser,
      action: () => {
        const updated = users.map((u) => (u.id === userId ? { ...u, isActive } : u));
        writeCollection('users', updated);
      },
      audit: {
        action: isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
        details: `Colaborador ${target.name} (${target.email}) foi ${isActive ? 'ativado' : 'inativado'}.`,
      },
    });

    return {
      success: true,
      message: isActive ? 'Colaborador ativado com sucesso.' : 'Colaborador inativado com sucesso.',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro inesperado ao alterar status.' };
  }
}

/**
 * Criação de novo colaborador com papéis condicionados, validação de permissões e senha temporária de 10 caracteres.
 */
export async function createPerson(
  input: CreatePersonInput
): Promise<{ success: boolean; message: string; user?: UserProfile; temporaryPassword?: string }> {
  try {
    const cleanName = input.name.trim();
    const cleanEmail = input.email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return { success: false, message: 'Por favor, preencha todos os campos obrigatórios.' };
    }

    const users = readCollection('users', z.array(StoredUserSchema), []);
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'Este e-mail já está cadastrado para outro colaborador.' };
    }

    const currentUser = getCurrentUser();

    // Validação estrita de permissões conforme cargo de quem está logado:
    // - Presidente: pode cadastrar qualquer cargo em qualquer departamento.
    // - Vice-presidente: pode cadastrar diretores/membros apenas no departamento operacional que dirige.
    // - Diretor de RH: pode cadastrar membros apenas no RH.
    if (currentUser) {
      if (currentUser.role === 'Presidente') {
        // Permitido tudo
      } else if (currentUser.role === 'Vice-presidente') {
        const allowedDept = currentUser.secondaryDepartment || 'Projetos';
        if (input.department !== allowedDept) {
          return {
            success: false,
            message: `Acesso negado. Como Vice-presidente, você só pode cadastrar no departamento ${allowedDept}.`,
          };
        }
        if (input.role === 'Presidente' || input.role === 'Vice-presidente') {
          return {
            success: false,
            message: 'Acesso negado. Apenas o Presidente pode criar novos cargos executivos.',
          };
        }
      } else if (currentUser.role === 'Diretor' && currentUser.department === 'RH') {
        if (input.department !== 'RH' || input.role !== 'Membro') {
          return {
            success: false,
            message: 'Acesso negado. O Diretor de RH só pode cadastrar membros no departamento de RH.',
          };
        }
      } else {
        return {
          success: false,
          message: 'Acesso negado. Você não possui permissão para cadastrar novos colaboradores.',
        };
      }
    }

    const newId = `user-${crypto.randomUUID().slice(0, 8)}`;
    const tempPassword = input.password || generateTemporaryPassword();
    const now = new Date().toISOString();

    const newUser: StoredUser = {
      id: newId,
      name: cleanName,
      email: cleanEmail,
      password: tempPassword,
      department: input.department,
      secondaryDepartment: input.secondaryDepartment,
      departmentEmail: `${input.department.toLowerCase()}@tecnosystem.com`,
      role: input.role,
      isActive: true,
      mustChangePassword: true,
      createdAt: now,
    };

    // Obter ou mapear departamento
    const departments = readCollection('departments', z.array(StoredDepartmentSchema), []);
    const deptRecord = departments.find((d) => d.code === input.department);
    const deptId = deptRecord?.id || `dept-${input.department.toLowerCase()}`;

    const isDirector = input.role.includes('Diretor') || input.role === 'Presidente';
    const newMemberships: StoredMembership[] = [
      {
        userId: newId,
        departmentId: deptId,
        departmentCode: input.department,
        isDirector,
      },
    ];

    if (input.role === 'Vice-presidente' && input.secondaryDepartment) {
      const secDeptRecord = departments.find((d) => d.code === input.secondaryDepartment);
      const secDeptId = secDeptRecord?.id || `dept-${input.secondaryDepartment.toLowerCase()}`;
      newMemberships.push({
        userId: newId,
        departmentId: secDeptId,
        departmentCode: input.secondaryDepartment,
        isDirector: true,
      });
    }

    mutate({
      user: currentUser,
      action: () => {
        const currentUsers = readCollection('users', z.array(StoredUserSchema), []);
        writeCollection('users', [newUser, ...currentUsers]);

        const currentMemberships = readCollection('memberships', z.array(StoredMembershipSchema), []);
        writeCollection('memberships', [...newMemberships, ...currentMemberships]);
      },
      audit: {
        action: 'USER_CREATE',
        details: `Novo colaborador cadastrado: ${cleanName} (${input.role} em ${input.department})`,
      },
    });

    const createdProfile: UserProfile = {
      id: newId,
      name: cleanName,
      email: cleanEmail,
      department: input.department,
      secondaryDepartment: input.secondaryDepartment,
      role: input.role,
      isActive: true,
      mustChangePassword: true,
      createdAt: now,
    };

    return {
      success: true,
      message: 'Colaborador cadastrado com sucesso!',
      user: createdProfile,
      temporaryPassword: tempPassword,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Falha ao registrar colaborador.' };
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
    const currentUser = getCurrentUser();

    mutate({
      user: currentUser,
      action: () => {
        const notifications = readCollection('notifications', z.array(StoredNotificationSchema), []);
        const newNotif = {
          id: crypto.randomUUID(),
          userId: targetUserId,
          title: 'Lembrete de Atendimento e Chamados',
          message: `Olá, ${targetName}! O RH identificou que você não possui respostas registradas a chamados no período recente. Por favor, verifique a fila do seu departamento.`,
          type: 'warning',
          read: false,
          senderId: currentUser?.id,
          createdAt: new Date().toISOString(),
        };
        writeCollection('notifications', [newNotif, ...notifications]);
      },
      audit: {
        action: 'NOTIFICATION_SEND',
        details: `Alerta de atividade enviado para ${targetName}`,
      },
    });

    return { success: true, message: `Alerta enviado com sucesso para ${targetName}.` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao enviar alerta.' };
  }
}
