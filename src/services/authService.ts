import { z } from 'zod';
import {
  readCollection,
  writeCollection,
  StoredUserSchema,
  StoredSessionSchema,
  type StoredUser,
  type StoredSession,
} from '../data/storage';
import { seedDemoData } from '../data/seed';
import type { UserProfile } from '../types/ticket';

export const LoginSchema = z.object({
  email: z.string().email('E-mail corporativo em formato inválido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

export const ChangePasswordSchema = z.object({
  newPassword: z.string().min(8, 'A senha deve conter no mínimo 8 caracteres.'),
});

export interface AuthProfileResult {
  success: boolean;
  error?: string;
  message?: string;
  user?: UserProfile;
  mustChangePassword?: boolean;
}

export function mapStoredUserToUserProfile(user: StoredUser): UserProfile {
  const roleName = user.role;
  const isExec = roleName.toLowerCase().includes('presidente');

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department,
    secondaryDepartment: user.secondaryDepartment,
    departmentEmail: user.departmentEmail,
    role: roleName,
    phone: user.phone,
    startDate: user.startDate,
    isExecutive: isExec,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    permissions: [],
    departmentMemberships: [
      {
        departmentId: `dept-${user.department.toLowerCase()}`,
        departmentCode: user.department,
        departmentName: user.department,
        isDirector: roleName.toLowerCase().includes('diretor') || roleName.toLowerCase() === 'presidente',
      },
      ...(user.secondaryDepartment
        ? [
            {
              departmentId: `dept-${user.secondaryDepartment.toLowerCase()}`,
              departmentCode: user.secondaryDepartment,
              departmentName: user.secondaryDepartment,
              isDirector: true,
            },
          ]
        : []),
    ],
  };
}

/**
 * Autentica o usuário simuladamente contra a coleção users no LocalStorage.
 */
export async function signIn(email: string, pass: string): Promise<AuthProfileResult> {
  // Garante que o seed inicial foi carregado se estiver vazio
  seedDemoData();

  const validation = LoginSchema.safeParse({ email, password: pass });
  if (!validation.success) {
    const msg = validation.error.issues[0]?.message || 'Dados inválidos.';
    return { success: false, error: msg, message: msg };
  }

  const cleanEmail = validation.data.email.trim().toLowerCase();
  const cleanPass = validation.data.password.trim();

  const users = readCollection('users', z.array(StoredUserSchema), []);
  const found = users.find((u) => u.email.trim().toLowerCase() === cleanEmail);

  if (!found || found.password !== cleanPass) {
    const msg = !found ? 'Usuário não encontrado no sistema.' : 'E-mail ou senha incorretos.';
    return { success: false, error: msg, message: msg };
  }

  if (!found.isActive) {
    const msg = 'Esta conta de usuário foi desativada. Entre em contato com a administração.';
    return { success: false, error: msg, message: msg };
  }

  // Grava a sessão simulada: { userId, startedAt }
  const session: StoredSession = {
    userId: found.id,
    startedAt: new Date().toISOString(),
  };
  writeCollection('session', session);

  const userProfile = mapStoredUserToUserProfile(found);
  return {
    success: true,
    message: 'Login realizado com sucesso.',
    user: userProfile,
    mustChangePassword: found.mustChangePassword,
  };
}

/** Finaliza a sessão ativa */
export async function signOut(): Promise<void> {
  writeCollection('session', null);
}

/** Obtém o perfil do usuário atualmente autenticado pela sessão ativa (síncrono) */
export function getCurrentUser(): UserProfile | null {
  const session = readCollection('session', StoredSessionSchema, null);
  if (!session || !session.userId) return null;

  const users = readCollection('users', z.array(StoredUserSchema), []);
  const found = users.find((u) => u.id === session.userId);

  if (!found || !found.isActive) {
    return null;
  }

  return mapStoredUserToUserProfile(found);
}

/** Obtém o perfil do usuário atualmente autenticado pela sessão ativa */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  seedDemoData();
  return getCurrentUser();
}

/** Simulação de envio de redefinição de senha para demonstração */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const users = readCollection('users', z.array(StoredUserSchema), []);
  const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!found) {
    return { success: false, error: 'E-mail não encontrado no sistema.' };
  }
  return { success: true };
}

/** Altera a senha do usuário conectado e remove a flag must_change_password */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const validation = ChangePasswordSchema.safeParse({ newPassword });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message };
  }

  const session = readCollection('session', StoredSessionSchema, null);
  if (!session?.userId) {
    return { success: false, error: 'Nenhuma sessão ativa encontrada.' };
  }

  const users = readCollection('users', z.array(StoredUserSchema), []);
  const updated = users.map((u) => {
    if (u.id === session.userId) {
      return {
        ...u,
        password: validation.data.newPassword,
        mustChangePassword: false,
      };
    }
    return u;
  });

  writeCollection('users', updated);
  return { success: true };
}

/** Altera a senha reautenticando com a senha atual */
export async function changeUserPasswordWithReauth(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const session = readCollection('session', StoredSessionSchema, null);
  if (!session?.userId) {
    return { success: false, error: 'Sessão inválida. Faça login novamente.' };
  }

  const users = readCollection('users', z.array(StoredUserSchema), []);
  const currentUser = users.find((u) => u.id === session.userId);

  if (!currentUser || currentUser.password !== currentPassword.trim()) {
    return { success: false, error: 'A senha atual informada está incorreta.' };
  }

  return updatePassword(newPassword);
}

/** Lista todos os usuários cadastrados */
export async function listAllUsers(): Promise<UserProfile[]> {
  seedDemoData();
  const users = readCollection('users', z.array(StoredUserSchema), []);
  return users.map(mapStoredUserToUserProfile).sort((a, b) => a.name.localeCompare(b.name));
}

/** Desativa um colaborador (isActive = false) */
export async function deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const users = readCollection('users', z.array(StoredUserSchema), []);
  const updated = users.map((u) => (u.id === userId ? { ...u, isActive: false } : u));
  writeCollection('users', updated);
  return { success: true };
}

/** Reativa um colaborador (isActive = true) */
export async function activateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const users = readCollection('users', z.array(StoredUserSchema), []);
  const updated = users.map((u) => (u.id === userId ? { ...u, isActive: true } : u));
  writeCollection('users', updated);
  return { success: true };
}

/** Função legado mantida para compatibilidade de tipos se necessário */
export function mapDatabaseProfileToUserProfile(p: any): UserProfile {
  return mapStoredUserToUserProfile(p);
}
