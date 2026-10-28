import { z } from 'zod';
import {
  deleteFile,
  getFile,
  MAX_FILE_SIZE,
  saveFile,
  validateMagicBytes,
} from '../data/indexedDb';
import {
  mutate,
  readCollection,
  StoredDepartmentSchema,
  StoredMembershipSchema,
  StoredUserSchema,
  writeCollection,
} from '../data/storage';
import type { Department } from '../types/ticket';
import { getCurrentUser } from './authService';

export async function validateImageMagicBytes(file: File): Promise<boolean> {
  const check = await validateMagicBytes(file);
  return check.valid;
}

/**
 * Upload de avatar com armazenamento no IndexedDB e atualização do perfil na coleção users
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'A foto deve ter no máximo 1 MB (1.048.576 bytes).' };
  }

  const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: 'Formato não suportado. Use PNG, JPG ou WebP.' };
  }

  const isValidMagic = await validateImageMagicBytes(file);
  if (!isValidMagic) {
    return { success: false, error: 'Arquivo inválido. O conteúdo binário não corresponde a uma imagem autêntica.' };
  }

  try {
    const avatarKey = `avatar_${userId}`;
    // 1. Salvar no IndexedDB
    await saveFile(avatarKey, file, file.name);

    // 2. Obter URL
    const fileResult = await getFile(avatarKey);
    const avatarUrl = fileResult?.url || '';

    // 3. Atualizar usuário na coleção
    const currentUser = getCurrentUser();
    mutate({
      user: currentUser,
      action: () => {
        const users = readCollection('users', z.array(StoredUserSchema), []);
        const updated = users.map((u) => (u.id === userId ? { ...u, avatarUrl } : u));
        writeCollection('users', updated);
      },
      audit: {
        action: 'AVATAR_UPDATE',
        details: 'Foto de perfil atualizada',
      },
    });

    return { success: true, avatarUrl };
  } catch (err: any) {
    console.error('[profileService] Erro no upload de avatar:', err);
    return { success: false, error: err?.message || 'Falha ao salvar avatar no navegador.' };
  }
}

/**
 * Remove a foto de perfil do usuário e limpa o campo avatarUrl.
 */
export async function removeAvatar(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const avatarKey = `avatar_${userId}`;
    try {
      await deleteFile(avatarKey);
    } catch {}

    const currentUser = getCurrentUser();
    mutate({
      user: currentUser,
      action: () => {
        const users = readCollection('users', z.array(StoredUserSchema), []);
        const updated = users.map((u) => (u.id === userId ? { ...u, avatarUrl: undefined } : u));
        writeCollection('users', updated);
      },
      audit: {
        action: 'AVATAR_REMOVE',
        details: 'Foto de perfil removida',
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao remover avatar.' };
  }
}

/**
 * Atualiza o nome e opcionalmente o departamento do perfil.
 */
export async function updateProfileData(
  userId: string,
  updates: {
    name?: string;
    department?: Department;
    theme?: 'light' | 'dark' | 'system';
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = getCurrentUser();

    mutate({
      user: currentUser,
      action: () => {
        const users = readCollection('users', z.array(StoredUserSchema), []);
        const updated = users.map((u) => {
          if (u.id !== userId) return u;
          return {
            ...u,
            name: updates.name ? updates.name.trim() : u.name,
            department: updates.department || u.department,
          };
        });
        writeCollection('users', updated);

        // Se o departamento mudou, atualizar memberships
        if (updates.department) {
          const departments = readCollection('departments', z.array(StoredDepartmentSchema), []);
          const dept = departments.find((d) => d.code === updates.department);
          const deptId = dept?.id || `dept-${updates.department.toLowerCase()}`;

          const memberships = readCollection('memberships', z.array(StoredMembershipSchema), []);
          const updatedMemberships = memberships.map((m) =>
            m.userId === userId
              ? { ...m, departmentId: deptId, departmentCode: updates.department! }
              : m
          );
          writeCollection('memberships', updatedMemberships);
        }
      },
      audit: {
        action: 'PROFILE_UPDATE',
        details: `Perfil atualizado: ${updates.name || ''} ${updates.department ? `(${updates.department})` : ''}`,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao atualizar perfil.' };
  }
}

/**
 * Atualização simulada de e-mail corporativo.
 */
export async function requestEmailChange(newEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = newEmail.trim().toLowerCase();
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, error: 'Usuário não conectado.' };

    const users = readCollection('users', z.array(StoredUserSchema), []);
    if (users.some((u) => u.id !== currentUser.id && u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Este e-mail já está em uso.' };
    }

    mutate({
      user: currentUser,
      action: () => {
        const updated = users.map((u) => (u.id === currentUser.id ? { ...u, email: cleanEmail } : u));
        writeCollection('users', updated);
      },
      audit: {
        action: 'EMAIL_CHANGE',
        details: `E-mail alterado para ${cleanEmail}`,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao alterar e-mail.' };
  }
}
