import { z } from 'zod';
import {
  mutate,
  readCollection,
  StoredCommentSchema,
  StoredTicketSchema,
  StoredUserSchema,
  subscribeStorage,
  writeCollection,
  type StoredComment,
} from '../data/storage';
import type { CommentAttachment, TicketEvent } from '../types/ticket';
import { fetchTicketAttachments, uploadAttachment } from './attachmentService';
import { getCurrentUser } from './authService';

export interface CreateCommentParams {
  ticketId: string;
  body: string;
  visibility?: 'public' | 'internal';
  files?: { file: File; description?: string }[];
}

/**
 * Busca comentários de um chamado formatados como TicketEvent, incluindo anexos e suporte a notas internas
 */
export async function fetchTicketComments(ticketId: string): Promise<TicketEvent[]> {
  try {
    const comments = readCollection('comments', z.array(StoredCommentSchema), []);
    const ticketComments = comments
      .filter((c) => c.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Buscar anexos relacionados ao chamado
    const allAttachments = await fetchTicketAttachments(ticketId);
    const attachmentsByComment = new Map<string, CommentAttachment[]>();

    for (const att of allAttachments) {
      if (!att.comment_id) continue;
      const list = attachmentsByComment.get(att.comment_id) || [];
      list.push({
        id: att.id,
        fileName: att.file_name,
        sizeBytes: att.size_bytes,
        mimeType: att.mime_type,
        storagePath: att.storage_path,
        signedUrl: att.signedUrl,
        description: att.description,
      });
      attachmentsByComment.set(att.comment_id, list);
    }

    return ticketComments.map((c) => {
      const isAgent =
        c.authorRole.includes('Diretor') ||
        c.authorRole.includes('Presidente') ||
        c.authorRole.includes('Membro');

      return {
        id: c.id,
        type: 'comment',
        author: c.authorName,
        authorId: c.authorId,
        role: isAgent ? 'atendente' : 'solicitante',
        message: c.content,
        visibility: c.isInternal ? 'internal' : 'public',
        editedAt: c.updatedAt,
        attachments: attachmentsByComment.get(c.id) || [],
        createdAt: c.createdAt,
      };
    });
  } catch (err) {
    console.error('[commentService] Erro ao buscar comentários:', err);
    return [];
  }
}

/**
 * Criação de comentário com suporte a notas internas, múltiplos anexos e menções (@)
 */
export async function createTicketComment(
  params: CreateCommentParams
): Promise<{ success: boolean; event?: TicketEvent; error?: string }> {
  const { ticketId, body, visibility = 'public', files = [] } = params;

  if (!body.trim() && files.length === 0) {
    return { success: false, error: 'O comentário deve conter mensagem ou ao menos um anexo.' };
  }

  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  const commentId = crypto.randomUUID();
  const isInternal = visibility === 'internal';
  const now = new Date().toISOString();

  // 1. Upload de anexos se fornecidos
  const uploadedAttachments: CommentAttachment[] = [];
  if (files.length > 0) {
    for (const fileItem of files) {
      const uploadRes = await uploadAttachment({
        file: fileItem.file,
        ticketId,
        commentId,
        description: fileItem.description,
      });

      if (uploadRes.success && uploadRes.attachment) {
        uploadedAttachments.push({
          id: uploadRes.attachment.id,
          fileName: uploadRes.attachment.file_name,
          sizeBytes: uploadRes.attachment.size_bytes,
          mimeType: uploadRes.attachment.mime_type,
          storagePath: uploadRes.attachment.storage_path,
          signedUrl: uploadRes.attachment.signedUrl,
          description: uploadRes.attachment.description,
        });
      }
    }
  }

  // 2. Criar novo comentário na coleção
  const newStoredComment: StoredComment = {
    id: commentId,
    ticketId,
    authorId: currentUser.id,
    authorName: currentUser.name,
    authorRole: currentUser.role,
    content: body.trim(),
    isInternal,
    createdAt: now,
  };

  // 3. Processar menções (@) para notificações
  const notificationsToSend: Array<{
    userId: string;
    title: string;
    message: string;
    type?: string;
    link?: string;
  }> = [];

  const mentions = body.match(/@([a-zA-Z0-9._-]+)/g);
  if (mentions && mentions.length > 0) {
    const cleanMentions = mentions.map((m) => m.substring(1).toLowerCase());
    const users = readCollection('users', z.array(StoredUserSchema), []);

    for (const u of users) {
      if (u.id === currentUser.id || !u.isActive) continue;
      const match = cleanMentions.some(
        (term) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
      );
      if (match) {
        notificationsToSend.push({
          userId: u.id,
          title: `Você foi mencionado no chamado ${ticketId}`,
          message: `${currentUser.name} mencionou você: "${body.substring(0, 100)}..."`,
          type: 'mention',
          link: ticketId,
        });
      }
    }
  }

  // 4. Gravar usando mutate()
  mutate({
    user: currentUser,
    action: () => {
      // Salva comentário na coleção
      const comments = readCollection('comments', z.array(StoredCommentSchema), []);
      writeCollection('comments', [...comments, newStoredComment]);

      // Também sincroniza com o histórico do chamado
      const tickets = readCollection('tickets', z.array(StoredTicketSchema), []);
      const updatedTickets = tickets.map((t) => {
        if (t.id !== ticketId) return t;
        const newHistEvent = {
          id: commentId,
          type: 'comment' as const,
          author: currentUser.name,
          role: currentUser.role,
          message: body.trim(),
          createdAt: now,
        };
        return {
          ...t,
          history: [...t.history, newHistEvent],
          updatedAt: now,
        };
      });
      writeCollection('tickets', updatedTickets);
    },
    audit: {
      action: isInternal ? 'INTERNAL_NOTE_ADD' : 'COMMENT_ADD',
      ticketId,
      details: isInternal ? 'Nota interna adicionada' : 'Novo comentário adicionado',
    },
    notify: notificationsToSend,
  });

  const isAgent =
    currentUser.role.includes('Diretor') ||
    currentUser.role.includes('Presidente') ||
    currentUser.role.includes('Membro');

  const newEvent: TicketEvent = {
    id: commentId,
    type: 'comment',
    author: currentUser.name,
    authorId: currentUser.id,
    role: isAgent ? 'atendente' : 'solicitante',
    message: body.trim(),
    visibility,
    attachments: uploadedAttachments,
    createdAt: now,
  };

  return { success: true, event: newEvent };
}

/**
 * Edição de comentário pelo autor
 */
export async function updateTicketComment(
  commentId: string,
  newBody: string
): Promise<{ success: boolean; error?: string }> {
  if (!newBody.trim()) {
    return { success: false, error: 'A mensagem não pode ficar vazia.' };
  }

  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  try {
    mutate({
      user: currentUser,
      action: () => {
        const comments = readCollection('comments', z.array(StoredCommentSchema), []);
        const target = comments.find((c) => c.id === commentId);
        if (!target) {
          throw new Error('Comentário não encontrado.');
        }

        const updated = comments.map((c) =>
          c.id === commentId
            ? { ...c, content: newBody.trim(), updatedAt: new Date().toISOString() }
            : c
        );
        writeCollection('comments', updated);
      },
      audit: {
        action: 'COMMENT_EDIT',
        details: 'Comentário editado',
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao atualizar comentário.' };
  }
}

/**
 * Exclusão suave (soft delete) ou remoção de comentário
 */
export async function deleteTicketComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  try {
    mutate({
      user: currentUser,
      action: () => {
        const comments = readCollection('comments', z.array(StoredCommentSchema), []);
        const remaining = comments.filter((c) => c.id !== commentId);
        writeCollection('comments', remaining);
      },
      audit: {
        action: 'COMMENT_DELETE',
        details: 'Comentário excluído',
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao excluir comentário.' };
  }
}

/**
 * Assina canal em tempo real para ouvir novos comentários e atualizações no chamado
 */
export function subscribeToComments(_ticketId: string, onChange: () => void) {
  return subscribeStorage((key) => {
    if (!key || key === 'comments' || key === 'tickets' || key === 'attachments') {
      onChange();
    }
  });
}
