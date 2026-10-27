import { useCallback, useEffect, useState } from 'react';
import {
  deactivateUser,
  getCurrentUserProfile,
  listAllUsers,
  signIn,
  signOut,
  updatePassword,
  sendPasswordResetEmail,
} from '../services/authService';
import { loadCurrentUser, loadUsersList, saveCurrentUser, saveUsersList } from '../services/storage';
import type { Department, UserProfile } from '../types/ticket';
import { generateId } from '../utils/id';
import { canManageUsers } from '../utils/rbac';

export interface RegisterUserData {
  name: string;
  email: string;
  departmentEmail?: string;
  password?: string;
  department: Department;
  role: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserProfile;
}

/**
 * Hook central de autenticação e sessão do colaborador integrado ao Supabase Auth e Postgres.
 * Persiste cache sincronizado e valida permissões de acesso com segurança.
 */
export function useCurrentUser() {
  const [usersList, setUsersList] = useState<UserProfile[]>(loadUsersList);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(loadCurrentUser);

  // Sincroniza sessão ativa e lista de colaboradores com o Supabase ao iniciar
  useEffect(() => {
    let mounted = true;

    getCurrentUserProfile()
      .then((profile) => {
        if (!mounted) return;
        if (profile) {
          setCurrentUserState(profile);
          saveCurrentUser(profile);
        } else {
          // Se não há sessão ativa no Supabase, limpa o cache local
          setCurrentUserState(null);
          saveCurrentUser(null);
        }
      })
      .catch((err) => {
        console.warn('[useCurrentUser] Não foi possível restaurar sessão do Supabase:', err);
      });

    listAllUsers()
      .then((users) => {
        if (!mounted) return;
        if (users.length > 0) {
          setUsersList(users);
          saveUsersList(users);
        }
      })
      .catch((err) => {
        console.warn('[useCurrentUser] Erro ao sincronizar colaboradores com Supabase:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  /** Realiza o login corporativo com Supabase Auth */
  const login = useCallback(
    async (email: string, pass: string): Promise<AuthResult> => {
      const res = await signIn(email, pass);
      if (!res.success || !res.user) {
        return { success: false, error: res.error || 'Credenciais inválidas.' };
      }

      setCurrentUserState(res.user);
      saveCurrentUser(res.user);

      // Atualiza a lista em background
      listAllUsers().then((users) => {
        if (users.length > 0) {
          setUsersList(users);
          saveUsersList(users);
        }
      });

      return { success: true, user: res.user };
    },
    [],
  );

  /**
   * Cadastro de Colaborador (Exclusivo para Presidente e Diretor de RH).
   */
  const addUser = useCallback(
    (data: RegisterUserData): AuthResult => {
      if (!canManageUsers(currentUser)) {
        return {
          success: false,
          error: 'Acesso negado. Apenas o Presidente e o Diretor de RH possuem permissão para cadastrar colaboradores.',
        };
      }

      const cleanName = data.name.trim();
      const cleanEmail = data.email.trim().toLowerCase();
      const cleanDeptEmail = (data.departmentEmail || '').trim().toLowerCase();
      const cleanRole = data.role.trim();

      if (!cleanName || !cleanEmail || !cleanRole) {
        return { success: false, error: 'Por favor, preencha todos os campos obrigatórios do colaborador.' };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return { success: false, error: 'O e-mail do usuário informado é inválido.' };
      }

      const existing = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        return { success: false, error: 'Este e-mail já está cadastrado para outro colaborador.' };
      }

      const newUser: UserProfile = {
        id: `user-${generateId()}`,
        name: cleanName,
        email: cleanEmail,
        departmentEmail: cleanDeptEmail || `${data.department.toLowerCase()}@tecnosystem.com`,
        department: data.department,
        role: cleanRole,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const updatedList = [newUser, ...usersList];
      setUsersList(updatedList);
      saveUsersList(updatedList);

      return { success: true, user: newUser };
    },
    [currentUser, usersList],
  );

  /**
   * Desativação de Colaborador (Exclusivo para Presidente e Diretor de RH).
   * Usuários são desativados (is_active = false) e nunca excluídos, garantindo a auditoria.
   */
  const deleteUser = useCallback(
    async (userId: string): Promise<AuthResult> => {
      if (!canManageUsers(currentUser)) {
        return {
          success: false,
          error: 'Acesso negado. Apenas o Presidente e o Diretor de RH possuem permissão para desativar colaboradores.',
        };
      }

      const targetUser = usersList.find((u) => u.id === userId);
      if (!targetUser) {
        return { success: false, error: 'Colaborador não encontrado.' };
      }

      // Impede auto-desativação
      if (currentUser?.id === userId) {
        return { success: false, error: 'Você não pode desativar sua própria conta de acesso.' };
      }

      // Impede desativação da conta do presidente raiz
      if (
        targetUser.email.toLowerCase() === 'presidente@gmail.com' ||
        targetUser.email.toLowerCase() === 'presidente@tecnosystem.com'
      ) {
        return { success: false, error: 'A conta raiz do Presidente não pode ser desativada.' };
      }

      const res = await deactivateUser(userId);
      if (!res.success) {
        return { success: false, error: res.error || 'Falha ao desativar usuário no banco de dados.' };
      }

      const updatedList = usersList.map((u) => (u.id === userId ? { ...u, isActive: false } : u));
      setUsersList(updatedList);
      saveUsersList(updatedList);

      return { success: true, user: targetUser };
    },
    [currentUser, usersList],
  );

  /** Solicita redefinição de senha por e-mail corporativo via Supabase Auth */
  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      const cleanEmail = email.trim().toLowerCase();
      const res = await sendPasswordResetEmail(cleanEmail);
      if (!res.success) {
        return { success: false, error: res.error || 'Falha ao enviar e-mail de redefinição.' };
      }
      return { success: true };
    },
    [],
  );

  /** Atualiza a senha do usuário atualmente conectado via Supabase Auth */
  const changePassword = useCallback(
    async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
      if (!currentUser) {
        return { success: false, error: 'Nenhum usuário autenticado no momento.' };
      }

      const res = await updatePassword(newPassword);
      if (res.success) {
        const updated = { ...currentUser, mustChangePassword: false };
        setCurrentUserState(updated);
        saveCurrentUser(updated);
      }
      return res;
    },
    [currentUser],
  );

  /** Encerra a sessão ativa do usuário (Logout com Supabase Auth) */
  const logout = useCallback(async () => {
    await signOut();
    setCurrentUserState(null);
    saveCurrentUser(null);
  }, []);

  return {
    currentUser,
    usersList,
    login,
    addUser,
    deleteUser,
    resetPassword,
    changePassword,
    logout,
  };
}
