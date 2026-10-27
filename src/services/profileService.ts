import { supabase } from './supabase';
import type { Department } from '../types/ticket';

/**
 * Validação segura de cabeçalho binário (magic bytes) para imagens PNG, JPEG e WebP.
 * Garante que extensões falsas sejam bloqueadas antes do upload.
 */
export async function validateImageMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return true;
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true;
  }

  // WebP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }

  return false;
}

/**
 * Upload de avatar no bucket privado 'avatars' sob o caminho {user_id}/{filename}.
 * Limite de 1 MB, tipos png, jpg, webp com validação de magic bytes.
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  if (file.size > 1048576) {
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

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
  const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

  // 1. Upload para o Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error('[profileService] Erro no upload:', uploadError);
    return { success: false, error: uploadError.message };
  }

  // 2. Obter URL pública
  const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const avatarUrl = publicUrlData.publicUrl;

  // 3. Atualizar tabela profiles
  const { error: dbError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (dbError) {
    return { success: false, error: dbError.message };
  }

  return { success: true, avatarUrl };
}

/**
 * Remove a foto de perfil do usuário e limpa o campo avatar_url.
 */
export async function removeAvatar(userId: string): Promise<{ success: boolean; error?: string }> {
  const { error: dbError } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId);

  if (dbError) {
    return { success: false, error: dbError.message };
  }

  return { success: true };
}

/**
 * Atualiza o nome, tema e opcionalmente o departamento do perfil.
 * A alteração de departamento é bloqueada no banco se o usuário não possuir profile.change_department.
 */
export async function updateProfileData(
  userId: string,
  updates: {
    name?: string;
    department?: Department;
    theme?: 'light' | 'dark' | 'system';
  }
): Promise<{ success: boolean; error?: string }> {
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.theme !== undefined) payload.theme = updates.theme;

  if (updates.department) {
    const { data: dept } = await supabase
      .from('departments')
      .select('id')
      .eq('code', updates.department)
      .maybeSingle();

    if (dept) {
      payload.department_id = dept.id;
    }
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Solicita a alteração de e-mail no Supabase Auth.
 * Dispara e-mail de confirmação para o novo endereço.
 */
export async function requestEmailChange(newEmail: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
