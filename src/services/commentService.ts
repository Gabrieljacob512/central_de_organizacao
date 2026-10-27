import { supabase } from './supabase';
import { uploadAttachment } from './attachmentService';
import type { CommentAttachment, TicketEvent } from '../types/ticket';

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
  const { data: comments, error } = await supabase
    .from('ticket_comments')
    .select(`
      id,
      ticket_id,
      author_id,
      body,
      visibility,
      created_at,
      edited_at,
      deleted_at,
      profiles (
        id,
        name,
        email,
        roles ( name )
      )
    `)
    .eq('ticket_id', ticketId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error || !comments) {
    console.error('[commentService] Erro ao buscar comentários:', error);
    return [];
  }

  // Buscar anexos relacionados ao chamado
  const { data: attachmentsData } = await supabase
    .from('attachments')
    .select('*')
    .eq('ticket_id', ticketId);

  // Mapear anexos por comment_id
  const attachmentsByComment = new Map<string, CommentAttachment[]>();

  if (attachmentsData && attachmentsData.length > 0) {
    for (const att of attachmentsData) {
      if (!att.comment_id) continue;
      const { data: signed } = await supabase.storage
        .from('ticket-attachments')
        .createSignedUrl(att.storage_path, 3600);

      const list = attachmentsByComment.get(att.comment_id) || [];
      list.push({
        id: att.id,
        fileName: att.file_name,
        sizeBytes: att.size_bytes,
        mimeType: att.mime_type,
        storagePath: att.storage_path,
        signedUrl: signed?.signedUrl,
        description: att.description,
      });
      attachmentsByComment.set(att.comment_id, list);
    }
  }

  return comments.map((c) => {
    const prof = c.profiles as any;
    const authorName = prof?.name || 'Membro';
    const roleName = prof?.roles?.name || '';
    const isAgent = roleName.includes('Diretor') || roleName === 'Presidente' || roleName.includes('Membro');

    return {
      id: c.id,
      type: 'comment',
      author: authorName,
      authorId: c.author_id,
      role: isAgent ? 'atendente' : 'solicitante',
      message: c.body,
      visibility: (c.visibility as 'public' | 'internal') || 'public',
      editedAt: c.edited_at,
      deletedAt: c.deleted_at,
      attachments: attachmentsByComment.get(c.id) || [],
      createdAt: c.created_at,
    };
  });
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

  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  // 1. Inserir o comentário
  const { data: created, error: commentError } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticketId,
      author_id: userId,
      body: body.trim(),
      visibility,
    })
    .select('*, profiles(name, email, roles(name))')
    .single();

  if (commentError || !created) {
    return { success: false, error: commentError?.message || 'Falha ao gravar comentário.' };
  }

  // 2. Upload de anexos se fornecidos
  const uploadedAttachments: CommentAttachment[] = [];
  if (files.length > 0) {
    for (const fileItem of files) {
      const uploadRes = await uploadAttachment({
        file: fileItem.file,
        ticketId,
        commentId: created.id,
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

  // 3. Processar menções (@Nome) para disparo de notificações in-app
  try {
    const mentions = body.match(/@([a-zA-Z0-9._-]+)/g);
    if (mentions && mentions.length > 0) {
      const cleanMentions = mentions.map((m) => m.substring(1).toLowerCase());
      const { data: mentionedUsers } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('is_active', [true]);

      if (mentionedUsers) {
        for (const user of mentionedUsers) {
          const match = cleanMentions.some(
            (term) => user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)
          );
          if (match && user.id !== userId) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              title: `Você foi mencionado no chamado ${ticketId}`,
              message: `${(created.profiles as any)?.name || 'Um colaborador'} mencionou você: "${body.substring(0, 100)}..."`,
              type: 'mention',
              link: ticketId,
            });
          }
        }
      }
    }
  } catch (mentionErr) {
    console.warn('[commentService] Erro não-crítico ao processar menções:', mentionErr);
  }

  const prof = created.profiles as any;
  const authorName = prof?.name || 'Membro';
  const roleName = prof?.roles?.name || '';
  const isAgent = roleName.includes('Diretor') || roleName === 'Presidente' || roleName.includes('Membro');

  const newEvent: TicketEvent = {
    id: created.id,
    type: 'comment',
    author: authorName,
    authorId: created.author_id,
    role: isAgent ? 'atendente' : 'solicitante',
    message: created.body,
    visibility: (created.visibility as 'public' | 'internal') || 'public',
    attachments: uploadedAttachments,
    createdAt: created.created_at,
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

  const { error } = await supabase
    .from('ticket_comments')
    .update({
      body: newBody.trim(),
      edited_at: new Date().toISOString(),
    })
    .eq('id', commentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Exclusão suave (soft delete) de comentário
 */
export async function deleteTicketComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('ticket_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Assina canal em tempo real para ouvir novos comentários e atualizações no chamado
 */
export function subscribeToComments(ticketId: string, onChange: () => void) {
  const channel = supabase
    .channel(`comments-${ticketId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ticket_comments',
        filter: `ticket_id=eq.${ticketId}`,
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
