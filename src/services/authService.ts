import { z } from 'zod';
import { supabase } from './supabase';
import type { Department, UserProfile } from '../types/ticket';

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
  user?: UserProfile;
  mustChangePassword?: boolean;
}

/** Converte o registro da tabela profiles do Supabase para a interface UserProfile do front */
export function mapDatabaseProfileToUserProfile(
  profile: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    is_active: boolean;
    must_change_password: boolean;
    created_at: string;
    departments?: { code: string; name: string } | null;
    roles?: { name: string; permissions: string[] } | null;
  }
): UserProfile {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    department: (profile.departments?.code as Department) || 'TI',
    role: profile.roles?.name || 'Membro',
    createdAt: profile.created_at,
    isActive: profile.is_active,
    mustChangePassword: profile.must_change_password,
    permissions: profile.roles?.permissions || [],
  };
}

/**
 * Autentica o usuário com Supabase Auth e carrega seu perfil correspondente.
 * Se o usuário estiver inativo (is_active = false), o acesso é bloqueado imediatamente.
 */
export async function signIn(email: string, pass: string): Promise<AuthProfileResult> {
  const validation = LoginSchema.safeParse({ email, password: pass });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || 'Dados inválidos.' };
  }

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (authErr || !authData.user) {
    return { success: false, error: 'Credenciais inválidas. Verifique seu e-mail e senha.' };
  }

  // Buscar perfil com departamento e permissões
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select(`
      id,
      name,
      email,
      avatar_url,
      is_active,
      must_change_password,
      created_at,
      departments ( code, name ),
      roles ( name, permissions )
    `)
    .eq('id', authData.user.id)
    .single();

  if (profileErr || !profile) {
    await supabase.auth.signOut();
    return { success: false, error: 'Perfil de usuário não encontrado no sistema.' };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { success: false, error: 'Esta conta de usuário foi desativada. Entre em contato com a administração.' };
  }

  const userProfile = mapDatabaseProfileToUserProfile(profile as never);

  return {
    success: true,
    user: userProfile,
    mustChangePassword: profile.must_change_password,
  };
}

/** Finaliza a sessão ativa */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Obtém o perfil do usuário atualmente autenticado pela sessão ativa */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      name,
      email,
      avatar_url,
      is_active,
      must_change_password,
      created_at,
      departments ( code, name ),
      roles ( name, permissions )
    `)
    .eq('id', userId)
    .single();

  if (!profile || !profile.is_active) {
    return null;
  }

  return mapDatabaseProfileToUserProfile(profile as never);
}

/** Altera a senha do usuário conectado e remove a flag must_change_password */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const validation = ChangePasswordSchema.safeParse({ newPassword });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message };
  }

  const { error } = await supabase.auth.updateUser({
    password: validation.data.newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Limpa must_change_password
  const { data: session } = await supabase.auth.getSession();
  if (session?.session?.user?.id) {
    await supabase
      .from('profiles')
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', session.session.user.id);
  }

  return { success: true };
}

/** Envia e-mail de recuperação de senha pelo Supabase Auth */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const emailValidation = z.string().email('E-mail inválido.').safeParse(email);
  if (!emailValidation.success) {
    return { success: false, error: emailValidation.error.issues[0]?.message };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(emailValidation.data, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/** Lista todos os usuários cadastrados com seus departamentos e papéis */
export async function listAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      name,
      email,
      avatar_url,
      is_active,
      must_change_password,
      created_at,
      departments ( code, name ),
      roles ( name, permissions )
    `)
    .order('name');

  if (error || !data) {
    console.error('[authService] Erro ao listar usuários:', error);
    return [];
  }

  return data.map((p) => mapDatabaseProfileToUserProfile(p as never));
}

/** Desativa um colaborador (soft-delete / is_active = false) sem excluir o registro para integridade da auditoria */
export async function deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/** Reativa um colaborador */
export async function activateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
