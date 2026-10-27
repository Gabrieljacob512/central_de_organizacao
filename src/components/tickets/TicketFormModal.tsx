import {
  CalendarClock,
  FilePlus2,
  Paperclip,
  RefreshCw,
  Send,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import { CATEGORIES_BY_DEPARTMENT } from '../../constants/config';
import { useToast } from '../../hooks/useToast';
import { uploadAttachment } from '../../services/attachmentService';
import type { Ticket, TicketFormData, TicketFormErrors, UserProfile } from '../../types/ticket';
import { formatDateTime } from '../../utils/format';
import { computeSlaDueAt, describeSlaHours } from '../../utils/sla';
import { clearFieldErrors, hasErrors, validateTicketForm } from '../../utils/validation';
import { Modal } from '../ui/Modal';
import { AttachmentCard, type PendingFileItem } from './AttachmentCard';
import { TicketFields } from './TicketFields';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 1048576; // 1 MB (1.048.576 bytes)
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.txt', '.docx', '.xlsx'];
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.bin', '.dll', '.com', '.vbs', '.js', '.scr'];

interface TicketFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TicketFormData) => Promise<Ticket | null> | Ticket | null | void;
  currentUser: UserProfile | null;
  onOpenUserModal: () => void;
}

export function TicketFormModal({ open, onClose, onSubmit, currentUser, onOpenUserModal }: TicketFormModalProps) {
  return open ? (
    <TicketFormContent
      onClose={onClose}
      onSubmit={onSubmit}
      currentUser={currentUser}
      onOpenUserModal={onOpenUserModal}
    />
  ) : null;
}

function TicketFormContent({
  onClose,
  onSubmit,
  currentUser,
  onOpenUserModal,
}: Omit<TicketFormModalProps, 'open'>) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<TicketFormData>(() => ({
    title: '',
    requester: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
    department: currentUser?.department ?? 'Projetos',
    assignedDepartment: 'Projetos',
    category: CATEGORIES_BY_DEPARTMENT['Projetos'][0],
    priority: 'Média',
    description: '',
    assignee: '',
  }));

  const [errors, setErrors] = useState<TicketFormErrors>({});
  const [openedAt] = useState(() => new Date().toISOString());

  // Anexos
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Estado de envio em fases (Seção 11)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'pending' | 'uploading' | 'success' | 'error'>>({});

  useEffect(() => {
    if (currentUser) {
      setForm((prev) => ({
        ...prev,
        requester: currentUser.name,
        email: currentUser.email,
        department: currentUser.department,
      }));
    }
  }, [currentUser]);

  const handleChange = (patch: Partial<TicketFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => clearFieldErrors(prev, patch));
  };

  // Validação e processamento de arquivos adicionados
  const processFiles = (newFiles: FileList | File[]) => {
    setAttachmentError(null);
    const list = Array.from(newFiles);

    if (pendingFiles.length + list.length > MAX_FILES) {
      setAttachmentError(`Máximo de ${MAX_FILES} arquivos por chamado.`);
      return;
    }

    const accepted: PendingFileItem[] = [];

    for (const file of list) {
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;

      // Bloquear executáveis e extensões proibidas
      if (BLOCKED_EXTENSIONS.includes(ext)) {
        setAttachmentError(`Tipo não permitido para "${file.name}". Arquivos executáveis são estritamente bloqueados.`);
        return;
      }

      // Validar tipos permitidos
      if (!ALLOWED_EXTENSIONS.includes(ext) && !file.type.startsWith('image/')) {
        setAttachmentError(`Tipo não permitido para "${file.name}". Tipos aceitos: PNG, JPG, PDF, TXT, DOCX e XLSX.`);
        return;
      }

      // Validar tamanho máximo de 1 MB
      if (file.size > MAX_FILE_SIZE) {
        setAttachmentError(`O arquivo "${file.name}" é maior que 1 MB (${(file.size / 1024 / 1024).toFixed(2)} MB).`);
        return;
      }

      accepted.push({
        id: crypto.randomUUID(),
        file,
        description: '',
      });
    }

    if (accepted.length > 0) {
      setPendingFiles((prev) => [...prev, ...accepted]);
    }
  };

  // Captura de Ctrl+V / Paste de prints
  const handlePaste = (e: ClipboardEvent<any>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToProcess: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) filesToProcess.push(file);
      }
    }

    if (filesToProcess.length > 0) {
      processFiles(filesToProcess);
      toast.info('Print capturado', 'Imagem colada da área de transferência com sucesso.');
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
      processFiles(e.dataTransfer.files);
    }
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const updateFileDescription = (id: string, desc: string) => {
    setPendingFiles((prev) => prev.map((item) => (item.id === id ? { ...item, description: desc } : item)));
  };

  // Envio de Anexos com rastreio de progresso individual (Fluxo da Seção 11)
  const uploadPendingAttachments = async (ticketId: string, filesToUpload: PendingFileItem[]) => {
    const progress: Record<string, 'pending' | 'uploading' | 'success' | 'error'> = {};
    filesToUpload.forEach((f) => (progress[f.id] = 'uploading'));
    setUploadProgress(progress);

    let failedCount = 0;

    for (const item of filesToUpload) {
      const res = await uploadAttachment({
        file: item.file,
        ticketId,
        description: item.description,
      });

      if (res.success) {
        setUploadProgress((prev) => ({ ...prev, [item.id]: 'success' }));
      } else {
        failedCount++;
        setUploadProgress((prev) => ({ ...prev, [item.id]: 'error' }));
        console.error(`[uploadAttachment] Falha no upload de ${item.file.name}:`, res.error);
      }
    }

    return failedCount;
  };

  // Submissão do Formulário
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!currentUser) {
      toast.error('Identificação necessária', 'Selecione ou cadastre seu perfil de colaborador.');
      onOpenUserModal();
      return;
    }

    const targetDept = form.assignedDepartment || form.department;
    const defaultCat = CATEGORIES_BY_DEPARTMENT[targetDept]?.[0] || 'Outros';
    const payload: TicketFormData = {
      ...form,
      category: form.category || defaultCat,
    };

    const validation = validateTicketForm(payload);
    setErrors(validation);
    if (hasErrors(validation)) {
      toast.error('Não foi possível abrir o chamado', 'Corrija os campos destacados.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Cria primeiro o chamado (Seção 11)
      let ticketId = createdTicketId;
      if (!ticketId) {
        const createdTicket = await onSubmit(payload);
        ticketId = (createdTicket as Ticket)?.id || null;
        if (ticketId) {
          setCreatedTicketId(ticketId);
        }
      }

      // 2. Se não houver anexos ou se falhou a criação do ticket
      if (!ticketId) {
        setIsSubmitting(false);
        return;
      }

      if (pendingFiles.length === 0) {
        setIsSubmitting(false);
        onClose();
        return;
      }

      // 3. Envia os arquivos já vinculados ao ticketId
      const failed = await uploadPendingAttachments(ticketId, pendingFiles);

      if (failed === 0) {
        toast.success(`Chamado ${ticketId} concluído`, `${pendingFiles.length} anexo(s) enviado(s) com sucesso.`);
        setIsSubmitting(false);
        onClose();
      } else {
        toast.warning(
          'Upload parcial de anexos',
          `O chamado ${ticketId} foi criado, mas ${failed} arquivo(s) falharam no envio. Você pode tentar novamente.`
        );
        setIsSubmitting(false);
      }
    } catch (err: any) {
      toast.error('Erro na submissão', err.message || 'Falha inesperada ao processar o chamado.');
      setIsSubmitting(false);
    }
  };

  // Tentar novamente apenas os arquivos que falharam
  const handleRetryFailedUploads = async () => {
    if (!createdTicketId) return;
    const failedFiles = pendingFiles.filter((f) => uploadProgress[f.id] === 'error');
    if (failedFiles.length === 0) return;

    setIsSubmitting(true);
    const failed = await uploadPendingAttachments(createdTicketId, failedFiles);
    setIsSubmitting(false);

    if (failed === 0) {
      toast.success('Anexos reenviados', 'Todos os arquivos foram anexados ao chamado com sucesso.');
      onClose();
    } else {
      toast.error('Falha persistente', `${failed} arquivo(s) ainda não puderam ser enviados.`);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Abrir novo chamado"
      description="Preencha as informações da solicitação. Campos marcados com * são obrigatórios."
      icon={
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-4 ring-blue-50/50">
          <FilePlus2 className="h-5 w-5" />
        </span>
      }
      footer={
        <>
          <button
            id="new-ticket-cancel"
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {createdTicketId ? 'Fechar' : 'Cancelar'}
          </button>

          {createdTicketId && Object.values(uploadProgress).includes('error') ? (
            <button
              id="new-ticket-retry-upload"
              type="button"
              onClick={handleRetryFailedUploads}
              disabled={isSubmitting}
              className="btn-primary"
            >
              <RefreshCw className={`h-4 w-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              Reenviar anexos que falharam
            </button>
          ) : (
            <button
              id="new-ticket-submit"
              type="submit"
              form="new-ticket-form"
              disabled={isSubmitting}
              className="btn-primary"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Enviando...' : 'Abrir chamado'}
            </button>
          )}
        </>
      }
    >
      <form id="new-ticket-form" onSubmit={handleSubmit} noValidate className="space-y-5" onPaste={handlePaste}>
        {/* Banner de chamado já criado se houver falha de anexo */}
        {createdTicketId && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
            Chamado <strong>{createdTicketId}</strong> registrado no sistema. Finalize o envio dos arquivos abaixo.
          </div>
        )}

        <TicketFields
          idPrefix="new-ticket"
          value={form}
          errors={errors}
          onChange={handleChange}
          isCreateMode={true}
        />

        {/* ==================================================================== */}
        {/* ÁREA DE ANEXOS ABAIXO DA DESCRIÇÃO DETALHADA (SEÇÃO 11) */}
        {/* ==================================================================== */}
        <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-850/50">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-700 uppercase dark:text-slate-300">
              <Paperclip className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Anexos da Solicitação ({pendingFiles.length}/{MAX_FILES})</span>
            </label>
            <span className="text-[11px] text-slate-400">
              Máx. 1 MB por arquivo (PNG, JPG, PDF, TXT, DOCX, XLSX)
            </span>
          </div>

          {attachmentError && (
            <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <span>{attachmentError}</span>
              <button type="button" onClick={() => setAttachmentError(null)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Zona de Drop, Upload e Colar Print (Ctrl+V) */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex min-h-[90px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
              isDragging
                ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  processFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              accept="image/png,image/jpeg,application/pdf,text/plain,.docx,.xlsx"
            />
            <UploadCloud className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-1" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              <span className="text-blue-600 hover:underline dark:text-blue-400">Clique para anexar</span>, arraste arquivos aqui ou cole um print com <kbd className="rounded border px-1 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-700">Ctrl+V</kbd>
            </p>
          </div>

          {/* Cards dos Arquivos Selecionados */}
          {pendingFiles.length > 0 && (
            <div className="space-y-2 pt-1">
              {pendingFiles.map((item) => {
                const status = uploadProgress[item.id];
                return (
                  <div key={item.id} className="relative">
                    <AttachmentCard
                      pendingItem={item}
                      onUpdateDescription={(desc) => updateFileDescription(item.id, desc)}
                      onRemove={() => removePendingFile(item.id)}
                      readOnly={isSubmitting}
                    />
                    {status && (
                      <div className="mt-1 flex items-center gap-1.5 px-2 text-[11px] font-semibold">
                        {status === 'uploading' && (
                          <span className="text-blue-600 animate-pulse">Enviando anexo...</span>
                        )}
                        {status === 'success' && (
                          <span className="text-emerald-600 dark:text-emerald-400">Enviado com sucesso ✓</span>
                        )}
                        {status === 'error' && (
                          <span className="text-rose-600 dark:text-rose-400">Falha no envio ✕</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SLA Card */}
        <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/40">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="text-sm">
            <p className="font-semibold text-blue-950 dark:text-blue-100">
              Prazo estimado de SLA: <span className="text-blue-700 font-bold dark:text-blue-300">{describeSlaHours(form.priority)}</span>
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Atendimento previsto até <span className="font-medium text-slate-900 dark:text-white">{formatDateTime(computeSlaDueAt(openedAt, form.priority))}</span>.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
