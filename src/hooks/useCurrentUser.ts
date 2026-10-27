import { useCallback, useState } from 'react';
import { loadCurrentUser, loadUsersList, saveCurrentUser, saveUsersList } from '../services/storage';
import type { Department, UserProfile } from '../types/ticket';
import { generateId } from '../utils/id';
import { canManageUsers } from '../utils/rbac';

export interface RegisterUserData {
  name: string;
  email: string;
  departmentEmail?: string;
  password: string;
  department: Department;
  role: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserProfile;
}

/**
 * Hook central de autenticação, sessão do colaborador e lista de usuários cadastrados.
 * Persiste 'currentUser' e 'usersList' no LocalStorage com controle estrito de RBAC.
 */
export function useCurrentUser() {
  const [usersList, setUsersList] = useState<UserProfile[]>(loadUsersList);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(loadCurrentUser);

  /** Realiza o login validando e-mail e senha */
  const login = useCallback(
    (email: string, password: string): AuthResult => {
      const cleanEmail = email.trim().toLowerCase();
      const user = usersList.find((u) => u.email.toLowerCase() === cleanEmail);

      if (!user) {
        return { success: false, error: 'E-mail corporativo não encontrado no sistema.' };
      }

      const userPassword = user.password ?? '123';
      if (userPassword !== password) {
        return { success: false, error: 'Senha incorreta. Tente novamente ou use a recuperação de senha.' };
      }

      setCurrentUserState(user);
      saveCurrentUser(user);
      return { success: true, user };
    },
    [usersList],
  );

  /**
   * Cadastro de Colaborador (Exclusivo para Presidente e Diretor de RH).
   * Contém obrigatoriamente os 6 campos: Nome, E-mail, E-mail do Depto, Cargo, Depto e Senha.
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
      const cleanPassword = data.password.trim();

      if (!cleanName || !cleanEmail || !cleanDeptEmail || !cleanRole || !cleanPassword) {
        return { success: false, error: 'Por favor, preencha todos os campos obrigatórios do colaborador.' };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return { success: false, error: 'O e-mail do usuário informado é inválido.' };
      }
      if (!emailRegex.test(cleanDeptEmail)) {
        return { success: false, error: 'O e-mail do departamento informado é inválido.' };
      }

      const existing = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        return { success: false, error: 'Este e-mail já está cadastrado para outro colaborador.' };
      }

      const newUser: UserProfile = {
        id: `user-${generateId()}`,
        name: cleanName,
        email: cleanEmail,
        departmentEmail: cleanDeptEmail,
        password: cleanPassword,
        department: data.department,
        role: cleanRole,
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
   * Exclusão de Colaborador (Exclusivo para Presidente e Diretor de RH).
   */
  const deleteUser = useCallback(
    (userId: string): AuthResult => {
      if (!canManageUsers(currentUser)) {
        return {
          success: false,
          error: 'Acesso negado. Apenas o Presidente e o Diretor de RH possuem permissão para excluir colaboradores.',
        };
      }

      const targetUser = usersList.find((u) => u.id === userId);
      if (!targetUser) {
        return { success: false, error: 'Colaborador não encontrado.' };
      }

      // Impede auto-exclusão
      if (currentUser?.id === userId) {
        return { success: false, error: 'Você não pode excluir sua própria conta de acesso.' };
      }

      // Impede exclusão do presidente raiz
      if (
        targetUser.email.toLowerCase() === 'presidente@gmail.com' ||
        targetUser.email.toLowerCase() === 'presidente@tecnosystem.com'
      ) {
        return { success: false, error: 'A conta raiz do Presidente não pode ser excluída.' };
      }

      const updatedList = usersList.filter((u) => u.id !== userId);
      setUsersList(updatedList);
      saveUsersList(updatedList);

      return { success: true, user: targetUser };
    },
    [currentUser, usersList],
  );

  /** Redefine a senha de um usuário pelo e-mail cadastrado */
  const resetPassword = useCallback(
    (email: string, newPassword: string): AuthResult => {
      const cleanEmail = email.trim().toLowerCase();
      const userIndex = usersList.findIndex((u) => u.email.toLowerCase() === cleanEmail);

      if (userIndex === -1) {
        return { success: false, error: 'Nenhum usuário cadastrado com este e-mail corporativo.' };
      }

      if (!newPassword.trim()) {
        return { success: false, error: 'Por favor, informe a nova senha.' };
      }

      const updatedUser: UserProfile = {
        ...usersList[userIndex],
        password: newPassword.trim(),
      };

      const updatedList = [...usersList];
      updatedList[userIndex] = updatedUser;

      setUsersList(updatedList);
      saveUsersList(updatedList);

      if (currentUser?.email.toLowerCase() === cleanEmail) {
        setCurrentUserState(updatedUser);
        saveCurrentUser(updatedUser);
      }

      return { success: true, user: updatedUser };
    },
    [usersList, currentUser],
  );

  /** Atualiza a senha do usuário atualmente conectado */
  const changePassword = useCallback(
    (newPassword: string): AuthResult => {
      if (!currentUser) {
        return { success: false, error: 'Nenhum usuário autenticado no momento.' };
      }

      return resetPassword(currentUser.email, newPassword);
    },
    [currentUser, resetPassword],
  );

  /** Encerra a sessão ativa do usuário (Logout) */
  const logout = useCallback(() => {
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
