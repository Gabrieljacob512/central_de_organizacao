import { CalendarClock, FilePlus2, Send, UserX } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { CATEGORIES_BY_DEPARTMENT } from '../../constants/config';
import { useToast } from '../../hooks/useToast';
import type { TicketFormData, TicketFormErrors, UserProfile } from '../../types/ticket';
import { formatDateTime } from '../../utils/format';
import { computeSlaDueAt, describeSlaHours } from '../../utils/sla';
import { clearFieldErrors, hasErrors, validateTicketForm } from '../../utils/validation';
import { Modal } from '../ui/Modal';
import { TicketFields } from './TicketFields';

interface TicketFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TicketFormData) => void;
  currentUser: UserProfile | null;
  onOpenUserModal: () => void;
}

/** Modal de abertura de chamado com identificação automática do solicitante e prévia do SLA. */
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

  // Atualiza dados do solicitante quando o usuário ativo mudar
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!currentUser) {
      toast.error('Identificação necessária', 'Selecione ou cadastre seu perfil de colaborador antes de abrir o chamado.');
      onOpenUserModal();
      return;
    }

    const targetDept = form.assignedDepartment || form.department;
    const defaultCat = CATEGORIES_BY_DEPARTMENT[targetDept]?.[0] || 'Hardware';
    const payload: TicketFormData = {
      ...form,
      category: form.category || defaultCat,
    };

    const validation = validateTicketForm(payload);
    setErrors(validation);
    if (hasErrors(validation)) {
      const count = Object.keys(validation).length;
      toast.error('Não foi possível abrir o chamado', `Corrija ${count} campo(s) destacado(s) em vermelho.`);
      const firstField = Object.keys(validation)[0];
      document.getElementById(`new-ticket-${firstField}`)?.focus();
      return;
    }
    onSubmit(payload);
  };

  if (!currentUser) {
    return (
      <Modal
        open
        onClose={onClose}
        size="sm"
        title="Identificação de Colaborador Obrigatória"
        description="Para abrir um chamado, você deve estar identificado como colaborador da Tecno System."
        icon={
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-4 ring-amber-50/50">
            <UserX className="h-5 w-5" />
          </span>
        }
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onClose();
                onOpenUserModal();
              }}
            >
              Identificar-se agora
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Nenhum colaborador ativo foi detectado na sua sessão. Clique abaixo para selecionar seu perfil corporativo ou cadastrar seus dados de solicitante.
        </p>
      </Modal>
    );
  }

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
          <button id="new-ticket-cancel" type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button id="new-ticket-submit" type="submit" form="new-ticket-form" className="btn-primary">
            <Send className="h-4 w-4" />
            Abrir chamado
          </button>
        </>
      }
    >
      <form id="new-ticket-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <TicketFields
          idPrefix="new-ticket"
          value={form}
          errors={errors}
          onChange={handleChange}
          isCreateMode={true}
        />

        <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="text-sm">
            <p className="font-semibold text-blue-950">
              Prazo estimado de SLA: <span className="text-blue-700 font-bold">{describeSlaHours(form.priority)}</span>
            </p>
            <p className="text-xs text-slate-600">
              Atendimento previsto até <span className="font-medium text-slate-900">{formatDateTime(computeSlaDueAt(openedAt, form.priority))}</span>, calculado
              automaticamente para a prioridade <span className="font-medium text-slate-900">{form.priority}</span>.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
