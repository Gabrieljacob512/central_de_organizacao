import { Building2, Lock, UserCheck } from 'lucide-react';
import { AGENTS_BY_DEPARTMENT, CATEGORIES_BY_DEPARTMENT, DEPARTMENTS, PRIORITIES, SLA_HOURS } from '../../constants/config';
import { PRIORITY_STYLES } from '../../constants/styles';
import type { Department, Priority, TicketFormData, TicketFormErrors } from '../../types/ticket';
import { FIELD_LIMITS } from '../../utils/validation';
import { FormField } from '../ui/FormField';
import { inputClass } from '../ui/formStyles';

interface TicketFieldsProps {
  idPrefix: string;
  value: TicketFormData;
  errors: TicketFormErrors;
  onChange: (patch: Partial<TicketFormData>) => void;
  isCreateMode?: boolean;
}

/** Conjunto de campos do chamado, compartilhado entre criação e edição. */
export function TicketFields({ idPrefix, value, errors, onChange, isCreateMode = false }: TicketFieldsProps) {
  const fieldId = (name: keyof TicketFormData) => `${idPrefix}-${name}`;
  const aria = (name: keyof TicketFormData) => ({
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${fieldId(name)}-error` : undefined,
  });

  const targetDept = value.assignedDepartment || value.department;
  const categories = CATEGORIES_BY_DEPARTMENT[targetDept] ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Bloco de Identificação Automática do Solicitante (em modo de criação) */}
      {isCreateMode ? (
        <div className="sm:col-span-2 rounded-xl border border-blue-200/80 bg-blue-50/60 p-3.5 shadow-2xs dark:border-blue-900/60 dark:bg-blue-950/40">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs dark:bg-blue-500">
                <UserCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-blue-950 dark:text-blue-200">Solicitante Identificado Automaticamente</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  Os dados foram vinculados à sua sessão ativa de colaborador.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:bg-blue-900/70 dark:text-blue-200">
              <Lock className="h-3 w-3" /> Bloqueado
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-blue-100 dark:border-blue-900/50 pt-2.5 sm:grid-cols-3 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Nome</span>
              <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{value.requester || 'Não identificado'}</p>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">E-mail</span>
              <p className="font-semibold text-slate-800 dark:text-slate-100 break-all">{value.email || 'Não informado'}</p>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Departamento de Origem</span>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{value.department}</p>
            </div>
          </div>
        </div>
      ) : null}

      <FormField label="Título do chamado" htmlFor={fieldId('title')} required error={errors.title} className="sm:col-span-2">
        <input
          id={fieldId('title')}
          type="text"
          value={value.title}
          maxLength={FIELD_LIMITS.titleMax}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="Ex.: Servidor de arquivos inacessível na rede local"
          className={inputClass(Boolean(errors.title))}
          {...aria('title')}
        />
      </FormField>

      {/* Em modo de edição, exibe campos de solicitante caso precise consultar */}
      {!isCreateMode && (
        <>
          <FormField label="Solicitante" htmlFor={fieldId('requester')} required error={errors.requester}>
            <input
              id={fieldId('requester')}
              type="text"
              autoComplete="name"
              value={value.requester}
              onChange={(event) => onChange({ requester: event.target.value })}
              placeholder="Nome e sobrenome"
              className={inputClass(Boolean(errors.requester))}
              {...aria('requester')}
            />
          </FormField>

          <FormField label="E-mail" htmlFor={fieldId('email')} required error={errors.email}>
            <input
              id={fieldId('email')}
              type="email"
              autoComplete="email"
              value={value.email}
              onChange={(event) => onChange({ email: event.target.value })}
              placeholder="nome@tecnosystem.com.br"
              className={inputClass(Boolean(errors.email))}
              {...aria('email')}
            />
          </FormField>

          <FormField label="Departamento de Origem" htmlFor={fieldId('department')} required error={errors.department}>
            <select
              id={fieldId('department')}
              value={value.department}
              onChange={(event) => onChange({ department: event.target.value as Department })}
              className={`${inputClass(Boolean(errors.department))} cursor-pointer`}
              {...aria('department')}
            >
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </FormField>
        </>
      )}

      {/* Departamento Responsável */}
      <FormField
        label="Departamento Responsável pelo Atendimento"
        htmlFor={fieldId('assignedDepartment')}
        required
        error={errors.assignedDepartment}
        hint="Setor da Tecno System encarregado de solucionar o chamado."
        className={isCreateMode ? 'sm:col-span-1' : 'sm:col-span-1'}
      >
        <div className="relative">
          <Building2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-blue-600" />
          <select
            id={fieldId('assignedDepartment')}
            value={value.assignedDepartment}
            onChange={(event) => {
              const nextDept = event.target.value as Department;
              const nextCategories = CATEGORIES_BY_DEPARTMENT[nextDept] ?? [];
              onChange({
                assignedDepartment: nextDept,
                category: nextCategories[0] ?? '',
              });
            }}
            className={`${inputClass(Boolean(errors.assignedDepartment))} pl-9 cursor-pointer font-medium text-slate-900`}
            {...aria('assignedDepartment')}
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                Equipe de {dept}
              </option>
            ))}
          </select>
        </div>
      </FormField>

      <FormField
        label="Categoria do Chamado"
        htmlFor={fieldId('category')}
        required
        error={errors.category}
        hint={`Opções vinculadas ao setor de ${targetDept}.`}
      >
        <select
          id={fieldId('category')}
          value={value.category || categories[0] || ''}
          onChange={(event) => onChange({ category: event.target.value })}
          className={`${inputClass(Boolean(errors.category))} cursor-pointer`}
          {...aria('category')}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </FormField>

      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
          Prioridade <span className="text-rose-500 font-bold">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
          {PRIORITIES.map((priority: Priority) => {
            const style = PRIORITY_STYLES[priority];
            const Icon = style.icon;
            const selected = value.priority === priority;
            return (
              <button
                key={priority}
                id={`${fieldId('priority')}-${priority}`}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ priority })}
                className={`flex cursor-pointer flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${
                  selected ? style.selected : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Icon className="h-4 w-4" />
                  {priority}
                </span>
                <span className="mt-0.5 text-[11px] opacity-80">SLA {SLA_HOURS[priority]}h</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <FormField
        label="Atendente Responsável"
        htmlFor={fieldId('assignee')}
        hint={`Pode ser deixado na fila geral do setor de ${targetDept}.`}
        className="sm:col-span-2"
      >
        <select
          id={fieldId('assignee')}
          value={value.assignee}
          onChange={(event) => onChange({ assignee: event.target.value })}
          className={`${inputClass()} cursor-pointer`}
        >
          <option value="">Sem atendente específico (Fila da equipe de {targetDept})</option>
          {DEPARTMENTS.map((dept) => (
            <optgroup key={dept} label={`Equipe ${dept}${dept === targetDept ? ' (Recomendado)' : ''}`}>
              {AGENTS_BY_DEPARTMENT[dept].map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </FormField>

      <FormField
        label="Descrição detalhada"
        htmlFor={fieldId('description')}
        required
        error={errors.description}
        className="sm:col-span-2"
        hint={
          <span className="flex justify-between gap-2 text-slate-500">
            <span>Inclua o que aconteceu, quando começou e o impacto no trabalho.</span>
            <span className="shrink-0 tabular-nums">
              {value.description.length}/{FIELD_LIMITS.descriptionMax}
            </span>
          </span>
        }
      >
        <textarea
          id={fieldId('description')}
          rows={4}
          value={value.description}
          maxLength={FIELD_LIMITS.descriptionMax}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Descreva o problema ou solicitação com o máximo de detalhes possível..."
          className={`${inputClass(Boolean(errors.description))} resize-y`}
          {...aria('description')}
        />
      </FormField>
    </div>
  );
}
