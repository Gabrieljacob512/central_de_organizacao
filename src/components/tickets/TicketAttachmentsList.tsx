import { Download, Paperclip } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchTicketAttachments, type AttachmentRecord } from '../../services/attachmentService';

interface TicketAttachmentsListProps {
  ticketId: string;
}

export function TicketAttachmentsList({ ticketId }: TicketAttachmentsListProps) {
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchTicketAttachments(ticketId)
      .then((records) => {
        if (active) {
          setAttachments(records);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[TicketAttachmentsList] Erro ao buscar anexos:', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ticketId]);

  if (loading) {
    return (
      <div className="py-2 text-xs text-slate-400 animate-pulse">
        Carregando anexos vinculados...
      </div>
    );
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
        <Paperclip className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <span>Anexos do Chamado ({attachments.length})</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {attachments.map((att) => {
          const isImage = att.mime_type.startsWith('image/') && att.signedUrl;

          return (
            <div
              key={att.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-850"
            >
              {/* Se for imagem, exibe preview */}
              {isImage && (
                <div className="mb-2 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <img
                    src={att.signedUrl}
                    alt={att.file_name}
                    className="h-28 w-full object-cover transition-transform hover:scale-105"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200" title={att.file_name}>
                    {att.file_name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {(att.size_bytes / 1024).toFixed(1)} KB
                  </p>
                </div>

                {att.signedUrl && (
                  <a
                    href={att.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={att.file_name}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-950 dark:hover:text-blue-300"
                    title="Baixar anexo"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </div>

              {att.description && (
                <p className="mt-1.5 text-xs text-slate-500 italic dark:text-slate-400">
                  "{att.description}"
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
