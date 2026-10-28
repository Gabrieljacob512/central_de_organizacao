import { z } from 'zod';
import { assertCan, type Permission } from '../auth/permissions';
import type { Department, Ticket, UserProfile } from '../types/ticket';

export const STORAGE_PREFIX = 'tecno.v1.';
export const CURRENT_SCHEMA_VERSION = 1;

/* -------------------------------------------------------------------------- */
/* 1. Detectar Disponibilidade do Armazenamento                               */
/* -------------------------------------------------------------------------- */

export function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = `${STORAGE_PREFIX}__test__`;
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

let quotaExceededAlertShown = false;
function handleStorageError(err: unknown) {
  if (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014)
  ) {
    if (!quotaExceededAlertShown) {
      quotaExceededAlertShown = true;
      console.error('[Storage] Armazenamento do navegador cheio.');
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Armazenamento do navegador cheio. Libere espaço ou remova anexos antigos.');
      }
    }
  } else {
    console.error('[Storage] Erro ao acessar localStorage:', err);
  }
}

/* -------------------------------------------------------------------------- */
/* 2. Zod Schemas para as Coleções                                           */
/* -------------------------------------------------------------------------- */

export const StoredUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string(),
  department: z.enum(['Administração', 'Financeiro', 'RH', 'Marketing', 'Projetos']),
  secondaryDepartment: z.enum(['Administração', 'Financeiro', 'RH', 'Marketing', 'Projetos']).optional(),
  departmentEmail: z.string().optional(),
  role: z.string(),
  phone: z.string().optional(),
  startDate: z.string().optional(),
  isActive: z.boolean().default(true),
  mustChangePassword: z.boolean().default(false),
  avatarUrl: z.string().optional(),
  createdAt: z.string(),
});

export const StoredDepartmentSchema = z.object({
  id: z.string(),
  code: z.enum(['Administração', 'Financeiro', 'RH', 'Marketing', 'Projetos']),
  name: z.string(),
});

export const StoredMembershipSchema = z.object({
  userId: z.string(),
  departmentId: z.string(),
  departmentCode: z.enum(['Administração', 'Financeiro', 'RH', 'Marketing', 'Projetos']),
  isDirector: z.boolean().default(false),
});

export const TicketEventSchema = z.object({
  id: z.string(),
  type: z.enum(['created', 'status', 'comment', 'assigned', 'attachment', 'reopened']),
  author: z.string(),
  role: z.string(),
  message: z.string(),
  createdAt: z.string(),
});

export const StoredTicketSchema = z.object({
  id: z.string(),
  code: z.string(), // ex: #0001
  title: z.string().min(3),
  description: z.string().min(10),
  department: z.enum(['Administração', 'Financeiro', 'RH', 'Marketing', 'Projetos']),
  assignedDepartment: z.enum(['Financeiro', 'RH', 'Marketing', 'Projetos']),
  category: z.string(),
  priority: z.enum(['Baixa', 'Média', 'Alta', 'Crítica']),
  status: z.enum(['Aberto', 'Em Andamento', 'Pendente', 'Resolvido', 'Fechado']),
  requester: z.string(),
  email: z.string().email(),
  assignee: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  csatRating: z.number().nullable().optional(),
  slaDueAt: z.string(),
  resolvedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  history: z.array(TicketEventSchema).default([]),
});

export const StoredCommentSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  authorRole: z.string(),
  content: z.string(),
  isInternal: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const StoredAttachmentMetaSchema = z.object({
  id: z.string(),
  ticketId: z.string().optional().nullable(),
  commentId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  monthId: z.string().optional().nullable(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  description: z.string().default(''),
  storageKey: z.string(), // ID no IndexedDB
  uploadedBy: z.string(),
  createdAt: z.string(),
});

export const StoredAuditSchema = z.object({
  id: z.string(),
  action: z.string(),
  ticketId: z.string().optional().nullable(),
  ticketSnapshotTitle: z.string().optional().nullable(),
  performedBy: z.string(),
  performedById: z.string().optional(),
  details: z.string(),
  createdAt: z.string(),
});

export const StoredNotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.string().default('info'),
  link: z.string().optional(),
  read: z.boolean().default(false),
  senderId: z.string().optional(),
  createdAt: z.string(),
});

export const StoredEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  allDay: z.boolean().default(false),
  isGlobal: z.boolean().default(false),
  createdBy: z.string(),
  department: z.string().optional(),
  createdAt: z.string(),
});

export const StoredFinanceEntrySchema = z.object({
  id: z.string(),
  monthId: z.string(),
  competence: z.string(), // "AAAA-MM"
  type: z.enum(['gain', 'expense']),
  category: z.string(),
  amountCents: z.number().int().positive(),
  description: z.string(),
  entryDate: z.string(), // "AAAA-MM-DD"
  projectId: z.string().optional().nullable(),
  projectName: z.string().optional().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const StoredFinanceMonthSchema = z.object({
  id: z.string(),
  competence: z.string(), // "AAAA-MM"
  isClosed: z.boolean().default(false),
  closedBy: z.string().optional().nullable(),
  closedAt: z.string().optional().nullable(),
  reopenReason: z.string().optional().nullable(),
  createdAt: z.string(),
});

export const StoredFinanceProjectSchema = z.object({
  id: z.string(),
  monthId: z.string(),
  competence: z.string(),
  name: z.string(),
  clientName: z.string().optional(),
  revenueCents: z.number().int().default(0),
  description: z.string().optional(),
  createdAt: z.string(),
});

export const StoredSettingsSchema = z.record(z.string(), z.unknown());

export const StoredCountersSchema = z.object({
  ticket: z.number().int().default(0),
});

export const StoredSessionSchema = z
  .object({
    userId: z.string(),
    startedAt: z.string(),
  })
  .nullable();

export type StoredUser = z.infer<typeof StoredUserSchema>;
export type StoredDepartment = z.infer<typeof StoredDepartmentSchema>;
export type StoredMembership = z.infer<typeof StoredMembershipSchema>;
export type StoredTicket = z.infer<typeof StoredTicketSchema>;
export type StoredComment = z.infer<typeof StoredCommentSchema>;
export type StoredAttachmentMeta = z.infer<typeof StoredAttachmentMetaSchema>;
export type StoredAudit = z.infer<typeof StoredAuditSchema>;
export type StoredNotification = z.infer<typeof StoredNotificationSchema>;
export type StoredEvent = z.infer<typeof StoredEventSchema>;
export type StoredFinanceEntry = z.infer<typeof StoredFinanceEntrySchema>;
export type StoredFinanceMonth = z.infer<typeof StoredFinanceMonthSchema>;
export type StoredFinanceProject = z.infer<typeof StoredFinanceProjectSchema>;
export type StoredCounters = z.infer<typeof StoredCountersSchema>;
export type StoredSession = z.infer<typeof StoredSessionSchema>;

/* -------------------------------------------------------------------------- */
/* 3. Leitura e Escrita de Coleções com Isolamento Seguro                     */
/* -------------------------------------------------------------------------- */

export function readCollection<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    if (!isLocalStorageAvailable()) return fallback;
    const fullKey = `${STORAGE_PREFIX}${key}`;
    const raw = window.localStorage.getItem(fullKey);
    if (raw === null) return fallback;

    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }

    console.warn(`[Storage] Coleção "${key}" corrompida ou incompatível:`, result.error);
    // Isola os dados antigos renomeando a chave corrompida para inspeção
    try {
      window.localStorage.setItem(`${fullKey}.corrupted.${Date.now()}`, raw);
      window.localStorage.removeItem(fullKey);
    } catch {}
    return fallback;
  } catch (err) {
    console.warn(`[Storage] Falha ao ler coleção "${key}":`, err);
    return fallback;
  }
}

export function writeCollection<T>(key: string, data: T): void {
  try {
    if (!isLocalStorageAvailable()) return;
    const fullKey = `${STORAGE_PREFIX}${key}`;
    window.localStorage.setItem(fullKey, JSON.stringify(data));
    notifyStorageUpdate(key);
  } catch (err) {
    handleStorageError(err);
  }
}

/* -------------------------------------------------------------------------- */
/* 4. Event Bus Reativo e Sincronização entre Abas                            */
/* -------------------------------------------------------------------------- */

const STORAGE_EVENT_NAME = 'tecno:storage-update';

export function notifyStorageUpdate(key?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME, { detail: { key } }));
  }
}

export function subscribeStorage(callback: (key?: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    callback(detail?.key);
  };

  const handleStorageNative = (e: StorageEvent) => {
    if (e.key && e.key.startsWith(STORAGE_PREFIX)) {
      const strippedKey = e.key.replace(STORAGE_PREFIX, '');
      callback(strippedKey);
    }
  };

  window.addEventListener(STORAGE_EVENT_NAME, handleCustom);
  window.addEventListener('storage', handleStorageNative);

  return () => {
    window.removeEventListener(STORAGE_EVENT_NAME, handleCustom);
    window.removeEventListener('storage', handleStorageNative);
  };
}

/* -------------------------------------------------------------------------- */
/* 5. Utilitários: Dinheiro BRL, Datas, Códigos Legíveis                      */
/* -------------------------------------------------------------------------- */

/** Converte valor formatado (ex: "1.234,56" ou 1234.56) em centavos inteiros */
export function parseBRL(input: string | number): number {
  if (typeof input === 'number') return Math.round(input * 100);
  if (!input) return 0;

  const cleaned = input.trim().replace(/[^0-9,.-]/g, '');
  if (cleaned.includes(',')) {
    const standardized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(standardized);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

/** Formata centavos inteiros para exibição em Real (R$ 1.234,56) */
export function formatBRL(cents: number): string {
  const value = (cents || 0) / 100;
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Deriva a competência "AAAA-MM" a partir de uma data local no formato "AAAA-MM-DD"
 * SEM instanciar new Date('AAAA-MM-DD') para evitar distorção de fuso horário.
 */
export function getCompetenceFromDate(dateStr: string): string {
  if (!dateStr) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const clean = dateStr.trim();
  const match = clean.match(/^(\d{4})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return clean.substring(0, 7);
}

/** Gera o próximo código legível (#0001, #0002...) a partir do contador */
export function generateTicketCode(): string {
  const counters = readCollection('counters', StoredCountersSchema, { ticket: 0 });
  const next = counters.ticket + 1;
  writeCollection('counters', { ...counters, ticket: next });
  return `#${String(next).padStart(4, '0')}`;
}

/* -------------------------------------------------------------------------- */
/* 6. Função Central de Mutação (mutate)                                      */
/* -------------------------------------------------------------------------- */

export interface MutateParams<T> {
  user: UserProfile | null | undefined;
  permission?: Permission;
  permissionContext?: { department?: Department; ticket?: Ticket };
  validate?: () => void;
  action: () => T;
  audit?: {
    action: string;
    ticketId?: string;
    ticketSnapshotTitle?: string;
    details: string;
  };
  notify?: Array<{
    userId: string;
    title: string;
    message: string;
    type?: string;
    link?: string;
  }>;
}

export function mutate<T>(params: MutateParams<T>): T {
  // 1. Checa a permissão
  if (params.permission) {
    assertCan(params.user, params.permission, params.permissionContext);
  }

  // 2. Valida com Zod / regras adicionais
  if (params.validate) {
    params.validate();
  }

  // 3. Executa a ação
  const result = params.action();

  // 4. Registra a auditoria (APPEND-ONLY, imutável)
  if (params.audit) {
    const auditLogs = readCollection('audit', z.array(StoredAuditSchema), []);
    const performer = params.user
      ? `${params.user.name} [${params.user.role}] (${params.user.email})`
      : 'Sistema';

    const newAudit: StoredAudit = {
      id: crypto.randomUUID(),
      action: params.audit.action,
      ticketId: params.audit.ticketId || null,
      ticketSnapshotTitle: params.audit.ticketSnapshotTitle || null,
      performedBy: performer,
      performedById: params.user?.id,
      details: params.audit.details,
      createdAt: new Date().toISOString(),
    };

    writeCollection('audit', [newAudit, ...auditLogs]);
  }

  // 5. Gera as notificações
  if (params.notify && params.notify.length > 0) {
    const notifications = readCollection('notifications', z.array(StoredNotificationSchema), []);
    const newNotifications: StoredNotification[] = params.notify.map((n) => ({
      id: crypto.randomUUID(),
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type || 'info',
      link: n.link,
      read: false,
      senderId: params.user?.id,
      createdAt: new Date().toISOString(),
    }));

    writeCollection('notifications', [...newNotifications, ...notifications]);
  }

  // 6. Notifica as telas para atualizar
  notifyStorageUpdate();

  return result;
}

/* -------------------------------------------------------------------------- */
/* 7. Migração de Versão do Schema                                           */
/* -------------------------------------------------------------------------- */

export function migrateSchemaIfNeeded(): void {
  try {
    if (!isLocalStorageAvailable()) return;
    const versionKey = `${STORAGE_PREFIX}schemaVersion`;
    const savedVersion = parseInt(window.localStorage.getItem(versionKey) || '0', 10);

    if (savedVersion < CURRENT_SCHEMA_VERSION) {
      console.log(`[Storage] Migrando schema de v${savedVersion} para v${CURRENT_SCHEMA_VERSION}...`);
      window.localStorage.setItem(versionKey, String(CURRENT_SCHEMA_VERSION));
    }
  } catch (err) {
    console.warn('[Storage] Erro na migração de schema:', err);
  }
}
