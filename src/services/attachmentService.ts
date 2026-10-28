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
  StoredAttachmentMetaSchema,
  writeCollection,
  type StoredAttachmentMeta,
} from '../data/storage';
import { getCurrentUser } from './authService';

export interface AttachmentRecord {
  id: string;
  ticket_id?: string | null;
  comment_id?: string | null;
  project_id?: string | null;
  month_id?: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  description?: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  signedUrl?: string;
}

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export async function uploadAttachment(params: {
  file: File;
  ticketId: string;
  commentId?: string | null;
  description?: string;
}): Promise<{ success: boolean; attachment?: AttachmentRecord; error?: string }> {
  const { file, ticketId, commentId, description = '' } = params;

  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `O arquivo "${file.name}" excede o tamanho limite de 1 MB (${(file.size / 1024 / 1024).toFixed(2)} MB).`,
    };
  }

  // Validação preliminar de MIME type
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `Formato de arquivo não suportado (${file.type}). Tipos aceitos: Imagens (PNG, JPG), PDF, TXT, Word e Excel.`,
    };
  }

  // Validação rigorosa por Magic Bytes
  const magicValidation = await validateMagicBytes(file);
  if (!magicValidation.valid) {
    return {
      success: false,
      error: magicValidation.error || 'Arquivo inválido ou bloqueado por segurança.',
    };
  }

  const currentUser = getCurrentUser();
  const userId = currentUser?.id || 'demo-user';

  const attachmentId = crypto.randomUUID();
  const storageKey = attachmentId;

  try {
    // 1. Salvar blob binário no IndexedDB (banco tecno-files)
    await saveFile(storageKey, file, file.name);

    // 2. Criar registro de metadados
    const newMeta: StoredAttachmentMeta = {
      id: attachmentId,
      ticketId,
      commentId: commentId || null,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      description: description.substring(0, 200),
      storageKey,
      uploadedBy: userId,
      createdAt: new Date().toISOString(),
    };

    mutate({
      user: currentUser,
      action: () => {
        const metas = readCollection('attachments', z.array(StoredAttachmentMetaSchema), []);
        writeCollection('attachments', [newMeta, ...metas]);
      },
      audit: {
        action: 'ATTACHMENT_UPLOAD',
        ticketId,
        details: `Anexo adicionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      },
    });

    // 3. Obter URL temporária para visualização
    const fileResult = await getFile(storageKey);

    const record: AttachmentRecord = {
      id: newMeta.id,
      ticket_id: newMeta.ticketId,
      comment_id: newMeta.commentId,
      file_name: newMeta.fileName,
      mime_type: newMeta.mimeType,
      size_bytes: newMeta.sizeBytes,
      description: newMeta.description,
      storage_path: newMeta.storageKey,
      uploaded_by: newMeta.uploadedBy,
      created_at: newMeta.createdAt,
      signedUrl: fileResult?.url,
    };

    return { success: true, attachment: record };
  } catch (err: any) {
    console.error('[attachmentService] Falha no upload do anexo:', err);
    return {
      success: false,
      error: err?.message || 'Falha ao gravar arquivo no armazenamento do navegador.',
    };
  }
}

export async function fetchTicketAttachments(ticketId: string): Promise<AttachmentRecord[]> {
  try {
    const metas = readCollection('attachments', z.array(StoredAttachmentMetaSchema), []);
    const ticketMetas = metas.filter((m) => m.ticketId === ticketId);

    const results: AttachmentRecord[] = [];
    for (const m of ticketMetas) {
      let signedUrl: string | undefined;
      try {
        const fileResult = await getFile(m.storageKey);
        signedUrl = fileResult?.url;
      } catch (err) {
        console.warn(`[attachmentService] Arquivo binário não encontrado para ${m.fileName}:`, err);
      }

      results.push({
        id: m.id,
        ticket_id: m.ticketId,
        comment_id: m.commentId,
        project_id: m.projectId,
        month_id: m.monthId,
        file_name: m.fileName,
        mime_type: m.mimeType,
        size_bytes: m.sizeBytes,
        description: m.description,
        storage_path: m.storageKey,
        uploaded_by: m.uploadedBy,
        created_at: m.createdAt,
        signedUrl,
      });
    }

    return results;
  } catch (err) {
    console.error('[attachmentService] Erro ao buscar anexos:', err);
    return [];
  }
}

export async function deleteAttachment(
  attachmentId: string,
  _storagePath?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const metas = readCollection('attachments', z.array(StoredAttachmentMetaSchema), []);
    const target = metas.find((m) => m.id === attachmentId);

    if (target) {
      // 1. Remove do IndexedDB
      await deleteFile(target.storageKey);

      // 2. Remove dos metadados
      const currentUser = getCurrentUser();
      mutate({
        user: currentUser,
        action: () => {
          const remaining = metas.filter((m) => m.id !== attachmentId);
          writeCollection('attachments', remaining);
        },
        audit: {
          action: 'ATTACHMENT_DELETE',
          ticketId: target.ticketId || undefined,
          details: `Anexo excluído: ${target.fileName}`,
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('[attachmentService] Falha ao excluir anexo:', err);
    return { success: false, error: err?.message || 'Erro ao excluir anexo.' };
  }
}
