import { ALL_DEPARTMENTS, CATEGORIES_BY_DEPARTMENT, PRIORITIES } from '../constants/config';
import type { TicketFormData, TicketFormErrors } from '../types/ticket';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const FIELD_LIMITS = {
  titleMin: 5,
  titleMax: 120,
  descriptionMin: 15,
  descriptionMax: 2000,
} as const;

/** Valida os campos do formulário de chamado e retorna as mensagens de erro por campo. */
export function validateTicketForm(data: TicketFormData): TicketFormErrors {
  const errors: TicketFormErrors = {};
  const title = data.title.trim();
  const requester = data.requester.trim();
  const email = data.email.trim();
  const description = data.description.trim();

  if (!title) errors.title = 'Informe um título para o chamado.';
  else if (title.length < FIELD_LIMITS.titleMin) errors.title = `O título deve ter pelo menos ${FIELD_LIMITS.titleMin} caracteres.`;
  else if (title.length > FIELD_LIMITS.titleMax) errors.title = `O título deve ter no máximo ${FIELD_LIMITS.titleMax} caracteres.`;

  if (!requester) errors.requester = 'Informe o nome do solicitante.';
  else if (requester.split(/\s+/).length < 2) errors.requester = 'Informe nome e sobrenome.';

  if (!email) errors.email = 'Informe o e-mail do solicitante.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Informe um e-mail válido (ex.: nome@tecnosystem.com.br).';

  if (!ALL_DEPARTMENTS.includes(data.department)) errors.department = 'Selecione o departamento de origem.';

  if (!ALL_DEPARTMENTS.includes(data.assignedDepartment)) {
    errors.assignedDepartment = 'Selecione o departamento responsável pelo atendimento.';
  }

  const targetDept = data.assignedDepartment || data.department;
  if (!data.category) {
    errors.category = 'Selecione uma categoria.';
  } else if (ALL_DEPARTMENTS.includes(targetDept) && !CATEGORIES_BY_DEPARTMENT[targetDept]?.includes(data.category)) {
    errors.category = 'Categoria inválida para o departamento responsável selecionado.';
  }

  if (!PRIORITIES.includes(data.priority)) errors.priority = 'Selecione uma prioridade.';

  if (!description) errors.description = 'Descreva detalhadamente a solicitação.';
  else if (description.length < FIELD_LIMITS.descriptionMin) {
    errors.description = `A descrição deve ter pelo menos ${FIELD_LIMITS.descriptionMin} caracteres.`;
  } else if (description.length > FIELD_LIMITS.descriptionMax) {
    errors.description = `A descrição deve ter no máximo ${FIELD_LIMITS.descriptionMax} caracteres.`;
  }

  return errors;
}

export const hasErrors = (errors: TicketFormErrors): boolean => Object.keys(errors).length > 0;

/** Remove erros dos campos alterados (feedback imediato ao corrigir). */
export function clearFieldErrors(errors: TicketFormErrors, patch: Partial<TicketFormData>): TicketFormErrors {
  const next = { ...errors };
  (Object.keys(patch) as (keyof TicketFormData)[]).forEach((key) => {
    delete next[key];
  });
  return next;
}
