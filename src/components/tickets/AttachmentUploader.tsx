import { UploadCloud } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AttachmentCard, type PendingFileItem } from './AttachmentCard';

const MAX_FILES = 5;
const MAX_SIZE_BYTES = 1048576; // 1 MB

interface AttachmentUploaderProps {
  files: PendingFileItem[];
  onChangeFiles: (files: PendingFileItem[]) => void;
  onError: (msg: string) => void;
}

export function AttachmentUploader({ files, onChangeFiles, onError }: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFileList = (newFiles: FileList | File[]) => {
    const list = Array.from(newFiles);
    if (files.length + list.length > MAX_FILES) {
      onError(`Máximo de ${MAX_FILES} anexos por comentário.`);
      return;
    }

    const validNewItems: PendingFileItem[] = [];
    for (const f of list) {
      if (f.size > MAX_SIZE_BYTES) {
        onError(`O arquivo "${f.name}" excede 1 MB (${(f.size / 1024 / 1024).toFixed(2)} MB).`);
        continue;
      }
      validNewItems.push({
        id: crypto.randomUUID(),
        file: f,
        description: '',
      });
    }

    if (validNewItems.length > 0) {
      onChangeFiles([...files, ...validNewItems]);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFileList(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (id: string) => {
    onChangeFiles(files.filter((f) => f.id !== id));
  };

  const updateDescription = (id: string, desc: string) => {
    onChangeFiles(files.map((f) => (f.id === id ? { ...f, description: desc } : f)));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      processFileList(e.clipboardData.files);
    }
  };

  return (
    <div className="space-y-2.5" onPaste={handlePaste}>
      {/* Zona de Drop e Seleção */}
      <div
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 text-center transition focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          accept="image/*,application/pdf,text/plain,.docx,.xlsx"
        />
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <UploadCloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Clique para anexar</span> ou arraste arquivos aqui
        </div>
        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
          Até {MAX_FILES} arquivos (imagens, PDFs, documentos, planilhas) • Máx. 1 MB cada
        </p>
      </div>

      {/* Lista de Arquivos Selecionados */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {files.map((item) => (
            <AttachmentCard
              key={item.id}
              pendingItem={item}
              onUpdateDescription={(desc) => updateDescription(item.id, desc)}
              onRemove={() => removeFile(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
