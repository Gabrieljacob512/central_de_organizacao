import { Building2, CalendarPlus, Check, FolderTree, History, Info, Mail, Pencil, RefreshCw, Save, Trash2, User, UserCog, Users, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AGENTS_BY_DEPARTMENT, DEPARTMENTS, STATUS_TRANSITIONS, STATUSES } from '../../constants/config';
import { STATUS_STYLES, TRANSITION_TONE_STYLES } from '../../constants/styles';
import { useBodyScrollLock, useEscapeKey } from '../../hooks/useUi';
import { useToast } from '../../hooks/useToast';
import type { AuthorRole, Department, Status, Ticket, TicketFormData, TicketFormErrors } from '../../types/ticket';
import { formatDateTime, formatRelative } from '../../utils/format';
import { clearFieldErrors, hasErrors, validateTicketForm } from '../../utils/validation';
import { Avatar } from '../ui/Avatar';
import { PriorityBadge, StatusBadge } from '../ui/Badges';
import { inputClass } from '../ui/formStyles';
import { SlaIndicator } from '../ui/SlaIndicator';
import { TicketFields } from './TicketFields';
import { TicketHistory } from './TicketHistory';

interface TicketDetailsDrawerProps {
  ticket: Ticket | null;
  now: number;
  /** Desabilita o fechamento por ESC (ex.: quando há um modal de confirmação por cima). */
  escapeDisabled?: boolean;
  onClose: () => void;
  onChangeStatus: (id: string, to: Status) => void;
  onAssign: (id: string, assignee: string | null, assignedDepartment?: Department) => void;
  onUpdate: (id: string, data: TicketFormData) => boolean;
  onComment: (id: string, author: string, role: AuthorRole, message: string) => boolean;
  onRequestDelete: (ticket: Ticket) => void;
  canDelete?: boolean;
}

type Tab = 'details' | 'history';

/** Painel lateral de detalhes: transições de status, edição, reatribuição e histórico/comentários. */
export function TicketDetailsDrawer(props: TicketDetailsDrawerProps) {
  if (!props.ticket) return null;
  return <DrawerContent key={props.ticket.id} {...props} ticket={props.ticket} />;
}

const toFormData = (ticket: Ticket): TicketFormData => ({
  title: ticket.title,
  requester: ticket.requester,
  email: ticket.email,
  department: ticket.department,
  assignedDepartment: ticket.assignedDepartment ?? ticket.department,
  category: ticket.category,
  priority: ticket.priority,
  description: ticket.description,
  assignee: ticket.assignee ?? '',
});

function DrawerContent({
  ticket,
  now,
  escapeDisabled,
  onClose,
  onChangeStatus,
  onAssign,
  onUpdate,
  onComment,
  onRequestDelete,
  canDelete = false,
}: TicketDetailsDrawerProps & { ticket: Ticket }) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('details');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TicketFormData>(() => toFormData(ticket));
  const [errors, setErrors] = useState<TicketFormErrors>({});

  useBodyScrollLock(true);
  useEscapeKey(() => (editing ? setEditing(false) : onClose()), !escapeDisabled);

  const transitions = STATUS_TRANSITIONS[ticket.status];
  const currentIndex = STATUSES.indexOf(ticket.status);
  const commentCount = ticket.history.filter((event) => event.type === 'comment').length;
  const currentAssignedDept = ticket.assignedDepartment ?? ticket.department;

  const startEditing = () => {
    setForm(toFormData(ticket));
    setErrors({});
    setTab('details');
    setEditing(true);
  };

  const saveEditing = () => {
    const validation = validateTicketForm(form);
    setErrors(validation);
    if (hasErrors(validation)) {
      toast.error('Não foi possível salvar', `Corrija ${Object.keys(validation).length} campo(s) destacado(s).`);
      return;
    }
    if (onUpdate(ticket.id, form)) setEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="ticket-drawer-title">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-xs dark:bg-slate-950/80" onClick={onClose} />

      <aside className="relative flex h-full w-full animate-slide-in-right flex-col border-l border-slate-200 bg-white shadow-2xl sm:max-w-xl lg:max-w-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Cabeçalho */}
        <header className="border-b border-slate-100 bg-slate-50/50 px-5 pt-5 pb-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
                {ticket.id}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
                Resp: {currentAssignedDept}
              </span>
            </div>
            <button
              id="close-ticket-drawer"
              type="button"
              onClick={onClose}
              className="icon-btn -mt-1 -mr-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              aria-label="Fechar detalhes"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <h2 id="ticket-drawer-title" className="mt-2.5 text-lg leading-snug font-bold text-slate-900 sm:text-xl dark:text-white">
            {ticket.title}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Aberto por <span className="font-semibold text-slate-700 dark:text-slate-300">{ticket.requester}</span> ({ticket.department}) {formatRelative(ticket.createdAt, now)} · atualizado{' '}
            {formatRelative(ticket.updatedAt, now)}
          </p>

          {/* Stepper do fluxo de status */}
          <ol className="mt-4 flex items-center gap-1 overflow-x-auto pb-1" aria-label="Fluxo de status">
            {STATUSES.map((status, index) => {
              const isCurrent = index === currentIndex;
              return (
                <li key={status} className="flex shrink-0 items-center gap-1">
                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition ${
                      isCurrent ? `${STATUS_STYLES[status].badge} border shadow-2xs` : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isCurrent ? STATUS_STYLES[status].dot : 'bg-slate-400'}`} />
                    {status}
                  </span>
                  {index < STATUSES.length - 1 && <span className="h-px w-3 bg-slate-200" />}
                </li>
              );
            })}
          </ol>

          {/* Ações rápidas de transição de status */}
          <div className="mt-3 flex flex-wrap gap-2">
            {transitions.map((transition) => (
              <button
                key={transition.to}
                id={`transition-${transition.to.replace(/\s+/g, '-').toLowerCase()}`}
                type="button"
                onClick={() => onChangeStatus(ticket.id, transition.to)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 ${TRANSITION_TONE_STYLES[transition.tone]}`}
              >
                {transition.tone === 'danger' ? <RefreshCw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {transition.label}
              </button>
            ))}
          </div>
          {ticket.status === 'Aberto' && !ticket.assignee && (
            <p className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
              <Info className="h-4 w-4 shrink-0 text-amber-600" /> Defina um responsável para poder iniciar o atendimento.
            </p>
          )}
        </header>

        {/* Abas */}
        <nav className="flex gap-1 border-b border-slate-200 bg-white px-5 sm:px-6 dark:border-slate-800 dark:bg-slate-900" role="tablist">
          {(
            [
              { id: 'details', label: 'Detalhes & Edição', icon: Info, badge: null },
              { id: 'history', label: 'Histórico & Mensagens', icon: History, badge: commentCount },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(item.id)}
                className={`relative flex min-h-[44px] cursor-pointer items-center gap-1.5 px-3 py-3 text-sm font-medium transition ${
                  selected
                    ? 'font-semibold text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.badge !== null && item.badge > 0 && (
                  <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {item.badge}
                  </span>
                )}
                {selected && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
              </button>
            );
          })}
        </nav>

        {/* Conteúdo */}
        <div className="min-h-0 flex-1 bg-slate-50/40 dark:bg-slate-950/40">
          {tab === 'history' ? (
            <TicketHistory ticket={ticket} now={now} onComment={(author, role, message) => onComment(ticket.id, author, role, message)} />
          ) : (
            <div className="h-full overflow-y-auto px-5 py-5 sm:px-6">
              {editing ? (
                <div className="animate-fade-in">
                  <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                    <Pencil className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" /> Modo de edição — altere informações, departamento responsável ou prioridade.
                  </p>
                  <TicketFields
                    idPrefix="edit-ticket"
                    value={form}
                    errors={errors}
                    onChange={(patch) => {
                      setForm((prev) => ({ ...prev, ...patch }));
                      setErrors((prev) => clearFieldErrors(prev, patch));
                    }}
                    isCreateMode={false}
                  />
                </div>
              ) : (
                <div className="animate-fade-in space-y-5">
                  <SlaIndicator ticket={ticket} now={now} variant="full" />

                  {/* Atribuição de Departamento e Atendente */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 dark:border-slate-800 dark:bg-slate-850">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label htmlFor="reassign-dept" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Departamento Responsável
                        </label>
                        <select
                          id="reassign-dept"
                          value={currentAssignedDept}
                          onChange={(event) => onAssign(ticket.id, ticket.assignee, event.target.value as Department)}
                          className={`${inputClass()} cursor-pointer font-semibold text-blue-700 bg-blue-50/40 dark:text-blue-300 dark:bg-blue-950/30`}
                        >
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              Equipe de {dept}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1">
                        <label htmlFor="reassign-ticket" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                          <UserCog className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Atendente Específico
                        </label>
                        <div className="flex items-center gap-2">
                          <Avatar name={ticket.assignee} size="sm" />
                          <select
                            id="reassign-ticket"
                            value={ticket.assignee ?? ''}
                            onChange={(event) => onAssign(ticket.id, event.target.value || null, ticket.assignedDepartment)}
                            className={`${inputClass()} cursor-pointer`}
                          >
                            <option value="">Sem atendente (Fila geral)</option>
                            {DEPARTMENTS.map((department) => (
                              <optgroup key={department} label={`Equipe ${department}${department === currentAssignedDept ? ' (Recomendado)' : ''}`}>
                                {AGENTS_BY_DEPARTMENT[department].map((agent) => (
                                  <option key={agent} value={agent}>
                                    {agent}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoItem icon={<User className="h-4 w-4" />} label="Solicitante" value={ticket.requester} />
                    <InfoItem
                      icon={<Mail className="h-4 w-4" />}
                      label="E-mail"
                      value={
                        <a href={`mailto:${ticket.email}`} className="break-all font-medium text-blue-600 hover:underline">
                          {ticket.email}
                        </a>
                      }
                    />
                    <InfoItem icon={<Building2 className="h-4 w-4" />} label="Departamento de Origem" value={ticket.department} />
                    <InfoItem
                      icon={<Users className="h-4 w-4 text-indigo-600" />}
                      label="Departamento Responsável"
                      value={
                        <span className="font-bold text-indigo-700">
                          {currentAssignedDept}
                        </span>
                      }
                    />
                    <InfoItem icon={<FolderTree className="h-4 w-4" />} label="Categoria" value={ticket.category} />
                    <InfoItem icon={<CalendarPlus className="h-4 w-4" />} label="Aberto em" value={formatDateTime(ticket.createdAt)} />
                    <InfoItem icon={<RefreshCw className="h-4 w-4" />} label="Última atualização" value={formatDateTime(ticket.updatedAt)} />
                  </dl>

                  <section>
                    <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">Descrição da Solicitação</h3>
                    <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200">
                      {ticket.description}
                    </p>
                  </section>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <footer className="flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-5 py-3.5 sm:px-6 dark:border-slate-800 dark:bg-slate-900 shrink-0">
          {canDelete ? (
            <button
              id="delete-ticket-drawer"
              type="button"
              onClick={() => onRequestDelete(ticket)}
              className="btn-ghost-danger px-3"
              title="Excluir Chamado (Apenas Diretores)"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Excluir</span>
            </button>
          ) : (
            <div />
          )}
          {editing ? (
            <div className="flex gap-2">
              <button id="cancel-edit-ticket" type="button" onClick={() => setEditing(false)} className="btn-secondary">
                Cancelar
              </button>
              <button id="save-edit-ticket" type="button" onClick={saveEditing} className="btn-primary">
                <Save className="h-4 w-4" />
                Salvar alterações
              </button>
            </div>
          ) : (
            <button id="edit-ticket" type="button" onClick={startEditing} className="btn-secondary">
              <Pencil className="h-4 w-4" />
              Editar informações
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-850">
      <span className="mt-0.5 text-slate-400 dark:text-slate-500">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">{value}</dd>
      </div>
    </div>
  );
}
