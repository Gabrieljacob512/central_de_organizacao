import { Download, File as FileIcon, FileSpreadsheet, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import type { CommentAttachment } from '../../types/ticket';

export interface PendingFileItem {
  id: string;
  file: File;
  description: string;
}

function getFileIcon(mimeType: string, fileName: string) {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('sheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.csv')) return FileSpreadsheet;
  if (mimeType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.txt')) return FileText;
  return FileIcon;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface AttachmentCardProps {
  attachment?: CommentAttachment;
  pendingItem?: PendingFileItem;
  onUpdateDescription?: (newDesc: string) => void;
  onRemove?: () => void;
  readOnly?: boolean;
}

export function AttachmentCard({
  attachment,
  pendingItem,
  onUpdateDescription,
  onRemove,
  readOnly = false,
}: AttachmentCardProps) {
  const isPending = Boolean(pendingItem);
  const name = isPending ? pendingItem!.file.name : attachment!.fileName;
  const size = isPending ? pendingItem!.file.size : attachment!.sizeBytes;
  const mime = isPending ? pendingItem!.file.type : attachment!.mimeType;
  const desc = isPending ? pendingItem!.description : attachment?.description;
  const downloadUrl = attachment?.signedUrl;

  const Icon = getFileIcon(mime, name);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-2xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-850">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200" title={name}>
              {name}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{formatBytes(size)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isPending && downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={name}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-950/50 dark:hover:text-blue-300"
              title="Baixar anexo"
            >
              <Download className="h-4 w-4" />
            </a>
          )}

          {isPending && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              title="Remover anexo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isPending && onUpdateDescription && !readOnly && (
        <div className="mt-2">
          <input
            type="text"
            value={desc || ''}
            onChange={(e) => onUpdateDescription(e.target.value.substring(0, 200))}
            placeholder="Descrição do anexo (opcional, máx 200 caracteres)..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-750 dark:bg-slate-900 dark:text-slate-200"
            maxLength={200}
          />
        </div>
      )}

      {!isPending && desc && (
        <p className="mt-1.5 text-xs text-slate-500 italic dark:text-slate-400">
          "{desc}"
        </p>
      )}
    </div>
  );
}
