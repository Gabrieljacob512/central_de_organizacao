import { z } from 'zod';
import {
  getFile,
  MAX_FILE_SIZE,
  saveFile,
  validateMagicBytes,
} from '../data/indexedDb';
import {
  formatBRL,
  mutate,
  parseBRL,
  readCollection,
  StoredAttachmentMetaSchema,
  StoredFinanceEntrySchema,
  StoredFinanceMonthSchema,
  StoredFinanceProjectSchema,
  writeCollection,
  type StoredAttachmentMeta,
  type StoredFinanceEntry,
  type StoredFinanceMonth,
  type StoredFinanceProject,
} from '../data/storage';
import type {
  FinanceAttachment,
  FinanceEntry,
  FinanceMonth,
  FinanceMonthProject,
} from '../types/ticket';
import { getCurrentUser } from './authService';

export const MAX_FINANCE_FILE_SIZE = MAX_FILE_SIZE; // 1 MB estrito

export function formatCentsToBRL(cents: number): string {
  return formatBRL(cents);
}

export function parseBRLToCents(input: string | number): number {
  return parseBRL(input);
}

export async function validateFinanceFileMagicBytes(file: File): Promise<{ valid: boolean; error?: string }> {
  return validateMagicBytes(file);
}

/**
 * Busca todas as competências cadastradas com seus totais calculados a partir dos lançamentos.
 */
export async function fetchFinanceMonths(): Promise<FinanceMonth[]> {
  try {
    const months = readCollection('financeMonths', z.array(StoredFinanceMonthSchema), []);
    const entries = readCollection('financeEntries', z.array(StoredFinanceEntrySchema), []);

    // Ordenar decrescente por competência
    const sortedMonths = [...months].sort((a, b) => b.competence.localeCompare(a.competence));

    return sortedMonths.map((m) => {
      const monthEntries = entries.filter((e) => e.monthId === m.id || e.competence === m.competence);
      const totalRevenueCents = monthEntries
        .filter((e) => e.type === 'gain')
        .reduce((sum, e) => sum + e.amountCents, 0);

      const totalExpenseCents = monthEntries
        .filter((e) => e.type === 'expense')
        .reduce((sum, e) => sum + e.amountCents, 0);

      return {
        id: m.id,
        competence: m.competence,
        isClosed: m.isClosed,
        closedAt: m.closedAt || undefined,
        closedBy: m.closedBy || undefined,
        totalRevenueCents,
        totalExpenseCents,
        balanceCents: totalRevenueCents - totalExpenseCents,
      };
    });
  } catch (err) {
    console.warn('[financeService] Erro ao buscar competências:', err);
    return [];
  }
}

/**
 * Busca detalhes completos de uma competência (lançamentos, projetos e anexos).
 */
export async function fetchMonthDetails(competence: string): Promise<{
  month: FinanceMonth | null;
  entries: FinanceEntry[];
  projects: FinanceMonthProject[];
  attachments: FinanceAttachment[];
}> {
  try {
    const months = readCollection('financeMonths', z.array(StoredFinanceMonthSchema), []);
    let month = months.find((m) => m.competence === competence);

    // Se o mês ainda não existe no storage, cria um novo mês aberto
    if (!month) {
      const newMonth: StoredFinanceMonth = {
        id: `month-${competence}`,
        competence,
        isClosed: false,
        createdAt: new Date().toISOString(),
      };
      writeCollection('financeMonths', [newMonth, ...months]);
      month = newMonth;
    }

    const allEntries = readCollection('financeEntries', z.array(StoredFinanceEntrySchema), []);
    const monthEntries = allEntries.filter(
      (e) => e.monthId === month!.id || e.competence === month!.competence
    );

    const allProjects = readCollection('financeProjects', z.array(StoredFinanceProjectSchema), []);
    const monthProjects = allProjects.filter(
      (p) => p.monthId === month!.id || p.competence === month!.competence
    );

    const allAttachments = readCollection('attachments', z.array(StoredAttachmentMetaSchema), []);
    const monthAttachments = allAttachments.filter((a) => a.monthId === month!.id);

    // Enriquecer anexos com URLs locais
    const attachmentsWithUrls: FinanceAttachment[] = [];
    for (const a of monthAttachments) {
      let signedUrl: string | undefined;
      try {
        const fileResult = await getFile(a.storageKey);
        signedUrl = fileResult?.url;
      } catch {}

      attachmentsWithUrls.push({
        id: a.id,
        entityType: a.projectId ? 'project' : 'entry',
        entityId: a.projectId || a.id,
        fileName: a.fileName,
        sizeBytes: a.sizeBytes,
        mimeType: a.mimeType,
        storagePath: a.storageKey,
        signedUrl,
        createdAt: a.createdAt,
      });
    }

    const totalRev = monthEntries
      .filter((e) => e.type === 'gain')
      .reduce((sum, e) => sum + e.amountCents, 0);

    const totalExp = monthEntries
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + e.amountCents, 0);

    return {
      month: {
        id: month.id,
        competence: month.competence,
        isClosed: month.isClosed,
        closedAt: month.closedAt || undefined,
        closedBy: month.closedBy || undefined,
        totalRevenueCents: totalRev,
        totalExpenseCents: totalExp,
        balanceCents: totalRev - totalExp,
      },
      entries: monthEntries.map((e) => ({
        id: e.id,
        monthId: e.monthId,
        type: e.type,
        category: e.category,
        amountCents: e.amountCents,
        description: e.description,
        projectId: e.projectId || undefined,
        projectName: e.projectName || undefined,
        createdAt: e.createdAt,
        createdBy: e.createdBy,
      })),
      projects: monthProjects.map((p) => ({
        id: p.id,
        monthId: p.monthId,
        projectId: p.id,
        projectName: p.name,
        revenueCents: p.revenueCents,
        notes: p.description,
        createdAt: p.createdAt,
      })),
      attachments: attachmentsWithUrls,
    };
  } catch (err) {
    console.error('[financeService] Erro ao carregar detalhes do mês:', err);
    return { month: null, entries: [], projects: [], attachments: [] };
  }
}

/**
 * Criação de lançamento de ganho ou despesa.
 */
export async function createFinanceEntry(input: {
  monthId: string;
  type: 'gain' | 'expense';
  category: string;
  amountCents: number;
  description: string;
  entryDate?: string;
  projectId?: string;
  projectName?: string;
}): Promise<{ success: boolean; message: string; entry?: FinanceEntry }> {
  try {
    const months = readCollection('financeMonths', z.array(StoredFinanceMonthSchema), []);
    const targetMonth = months.find((m) => m.id === input.monthId);

    if (targetMonth && targetMonth.isClosed) {
      return {
        success: false,
        message: 'Esta competência está fechada para novos lançamentos. Reabra o mês para editar.',
      };
    }

    const currentUser = getCurrentUser();
    const entryId = crypto.randomUUID();
    const entryDate = input.entryDate || new Date().toISOString().substring(0, 10);
    const competence = targetMonth ? targetMonth.competence : entryDate.substring(0, 7);

    const newEntry: StoredFinanceEntry = {
      id: entryId,
      monthId: input.monthId,
      competence,
      type: input.type,
      category: input.category,
      amountCents: input.amountCents,
      description: input.description,
      entryDate,
      projectId: input.projectId || null,
      projectName: input.projectName || null,
      createdBy: currentUser ? currentUser.id : 'demo-user',
      createdAt: new Date().toISOString(),
    };

    mutate({
      user: currentUser,
      action: () => {
        const entries = readCollection('financeEntries', z.array(StoredFinanceEntrySchema), []);
        writeCollection('financeEntries', [newEntry, ...entries]);
      },
      audit: {
        action: 'FINANCE_ENTRY_CREATE',
        details: `Lançamento criado: [${input.type === 'gain' ? 'RECEITA' : 'DESPESA'}] ${input.category} - ${formatBRL(input.amountCents)} (${input.description})`,
      },
    });

    return {
      success: true,
      message: 'Lançamento financeiro registrado com sucesso.',
      entry: {
        id: newEntry.id,
        monthId: newEntry.monthId,
        type: newEntry.type,
        category: newEntry.category,
        amountCents: newEntry.amountCents,
        description: newEntry.description,
        projectId: newEntry.projectId || undefined,
        projectName: newEntry.projectName || undefined,
        createdAt: newEntry.createdAt,
        createdBy: newEntry.createdBy,
      },
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao salvar lançamento.' };
  }
}

/**
 * Exclusão de lançamento financeiro.
 */
export async function deleteFinanceEntry(entryId: string): Promise<{ success: boolean; message: string }> {
  try {
    const entries = readCollection('financeEntries', z.array(StoredFinanceEntrySchema), []);
    const target = entries.find((e) => e.id === entryId);

    if (!target) {
      return { success: false, message: 'Lançamento não encontrado.' };
    }

    const months = readCollection('financeMonths', z.array(StoredFinanceMonthSchema), []);
    const targetMonth = months.find((m) => m.id === target.monthId || m.competence === target.competence);

    if (targetMonth && targetMonth.isClosed) {
      return {
        success: false,
        message: 'Não é possível excluir lançamentos de uma competência fechada.',
      };
    }

    const currentUser = getCurrentUser();
    mutate({
      user: currentUser,
      action: () => {
        const remaining = entries.filter((e) => e.id !== entryId);
        writeCollection('financeEntries', remaining);
      },
      audit: {
        action: 'FINANCE_ENTRY_DELETE',
        details: `Lançamento removido: ${target.category} - ${formatBRL(target.amountCents)} (${target.description})`,
      },
    });

    return { success: true, message: 'Lançamento excluído com sucesso.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao excluir lançamento.' };
  }
}

/**
 * Cadastro de projeto faturado no mês.
 */
export async function createMonthProject(input: {
  monthId: string;
  projectName: string;
  revenueCents: number;
  notes?: string;
}): Promise<{ success: boolean; message: string; project?: FinanceMonthProject }> {
  try {
    const months = readCollection('financeMonths', z.array(StoredFinanceMonthSchema), []);
    const targetMonth = months.find((m) => m.id === input.monthId);

    if (targetMonth && targetMonth.isClosed) {
      return {
        success: false,
        message: 'Esta competência está fechada para novos projetos.',
      };
    }

    const currentUser = getCurrentUser();
    const projectId = crypto.randomUUID();
    const competence = targetMonth ? targetMonth.competence : new Date().toISOString().substring(0, 7);

    const newProject: StoredFinanceProject = {
      id: projectId,
      monthId: input.monthId,
      competence,
      name: input.projectName,
      revenueCents: input.revenueCents,
      description: input.notes,
      createdAt: new Date().toISOString(),
    };

    // Também cria lançamento de receita correspondente
    const newEntry: StoredFinanceEntry = {
      id: crypto.randomUUID(),
      monthId: input.monthId,
      competence,
      type: 'gain',
      category: 'Projetos',
      amountCents: input.revenueCents,
      description: `Faturamento: ${input.projectName}`,
      entryDate: new Date().toISOString().substring(0, 10),
      projectId,
      projectName: input.projectName,
      createdBy: currentUser ? currentUser.id : 'demo-user',
      createdAt: new Date().toISOString(),
    };

    mutate({
      user: currentUser,
      action: () => {
        const projects = readCollection('financeProjects', z.array(StoredFinanceProjectSchema), []);
        writeCollection('financeProjects', [newProject, ...projects]);

        const entries = readCollection('financeEntries', z.array(StoredFinanceEntrySchema), []);
        writeCollection('financeEntries', [newEntry, ...entries]);
      },
      audit: {
        action: 'FINANCE_PROJECT_CREATE',
        details: `Projeto faturado: ${input.projectName} - ${formatBRL(input.revenueCents)}`,
      },
    });

    return {
      success: true,
      message: 'Projeto registrado com sucesso no mês!',
      project: {
        id: newProject.id,
        monthId: newProject.monthId,
        projectName: newProject.name,
        revenueCents: newProject.revenueCents,
        notes: newProject.description,
        createdAt: newProject.createdAt,
      },
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao registrar projeto.' };
  }
}

/**
 * Fechamento ou reabertura do mês contábil com auditoria.
 */
export async function toggleMonthClosure(
  monthIdOrCompetence: string,
  isClosed: boolean,
  competence?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const currentUser = getCurrentUser();

    mutate({
      user: currentUser,
      action: () => {
        const months = readCollection('financeMonths', z.array(StoredFinanceMonthSchema), []);
        const updated = months.map((m) => {
          if (
            m.id === monthIdOrCompetence ||
            m.competence === monthIdOrCompetence ||
            (competence && (m.id === competence || m.competence === competence))
          ) {
            return {
              ...m,
              isClosed,
              closedAt: isClosed ? new Date().toISOString() : null,
              closedBy: isClosed ? (currentUser?.id || null) : null,
              reopenReason: !isClosed ? 'Reabertura autorizada pela Diretoria Financeira' : null,
            };
          }
          return m;
        });
        writeCollection('financeMonths', updated);
      },
      audit: {
        action: isClosed ? 'FINANCE_MONTH_CLOSE' : 'FINANCE_MONTH_REOPEN',
        details: isClosed
          ? `Competência contábil ${competence} foi FECHADA (somente-leitura).`
          : `Competência contábil ${competence} foi REABERTA para ajustes.`,
      },
    });

    return {
      success: true,
      message: isClosed
        ? `Mês ${competence} fechado com sucesso! Agora está em modo somente-leitura.`
        : `Mês ${competence} reaberto com sucesso.`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro ao alterar fechamento do mês.' };
  }
}

/**
 * Upload de comprovante financeiro no IndexedDB.
 */
export async function uploadFinanceAttachment(
  file: File,
  meta: {
    monthId: string;
    entryId?: string;
    projectId?: string;
  }
): Promise<{ success: boolean; message: string; attachment?: FinanceAttachment }> {
  const check = await validateFinanceFileMagicBytes(file);
  if (!check.valid) {
    return { success: false, message: check.error || 'Arquivo inválido.' };
  }

  try {
    const currentUser = getCurrentUser();
    const attachmentId = crypto.randomUUID();
    const storageKey = attachmentId;

    // 1. Salva blob no IndexedDB
    await saveFile(storageKey, file, file.name);

    // 2. Registra metadados na coleção
    const newAttachmentMeta: StoredAttachmentMeta = {
      id: attachmentId,
      ticketId: null,
      commentId: null,
      projectId: meta.projectId || null,
      monthId: meta.monthId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      description: 'Comprovante financeiro',
      storageKey,
      uploadedBy: currentUser?.id || 'demo-user',
      createdAt: new Date().toISOString(),
    };

    mutate({
      user: currentUser,
      action: () => {
        const metas = readCollection('attachments', z.array(StoredAttachmentMetaSchema), []);
        writeCollection('attachments', [newAttachmentMeta, ...metas]);
      },
      audit: {
        action: 'FINANCE_ATTACHMENT_UPLOAD',
        details: `Comprovante anexado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      },
    });

    const fileResult = await getFile(storageKey);

    return {
      success: true,
      message: 'Comprovante anexado com sucesso!',
      attachment: {
        id: newAttachmentMeta.id,
        entityType: meta.projectId ? 'project' : 'entry',
        entityId: meta.projectId || meta.entryId || meta.monthId,
        fileName: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        storagePath: storageKey,
        signedUrl: fileResult?.url,
        createdAt: newAttachmentMeta.createdAt,
      },
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Falha no upload do comprovante.' };
  }
}

/**
 * Gera métricas financeiras consolidadas a partir dos dados do LocalStorage para os 4 gráficos do Painel Executivo:
 * 1. Barras comparativas de Receita x Despesa
 * 2. Linha de Saldo Acumulado
 * 3. Barras horizontais de Receita por Projeto (top do ano)
 * 4. Donut de Despesas por Categoria
 */
export async function fetchExecutiveFinancialChartData() {
  try {
    const months = readCollection('financeMonths', z.array(StoredFinanceMonthSchema), []);
    const entries = readCollection('financeEntries', z.array(StoredFinanceEntrySchema), []);
    const projects = readCollection('financeProjects', z.array(StoredFinanceProjectSchema), []);

    // 1. Comparativo mensal de receita x despesa dos meses cadastrados (ordenados cronologicamente)
    const sortedMonths = [...months].sort((a, b) => a.competence.localeCompare(b.competence));

    const monthlyComparison = sortedMonths.map((m) => {
      const monthEntries = entries.filter((e) => e.monthId === m.id || e.competence === m.competence);
      const rev = monthEntries
        .filter((e) => e.type === 'gain')
        .reduce((sum, e) => sum + e.amountCents, 0) / 100;
      const exp = monthEntries
        .filter((e) => e.type === 'expense')
        .reduce((sum, e) => sum + e.amountCents, 0) / 100;

      // Nome amigável para o mês: "2026-10" -> "Out/26"
      const [year, monthNum] = m.competence.split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthLabel = `${monthNames[parseInt(monthNum, 10) - 1]}/${year.slice(2)}`;

      return {
        month: monthLabel,
        revenue: rev,
        expense: exp,
        balance: rev - exp,
      };
    });

    // 2. Saldo Acumulado
    let runningBalance = 0;
    const accumulatedBalance = monthlyComparison.map((m) => {
      runningBalance += m.balance;
      return {
        month: m.month,
        saldoMes: m.balance,
        saldoAcumulado: runningBalance,
      };
    });

    // 3. Receita por Projeto
    const projectRevenueMap = new Map<string, number>();
    for (const p of projects) {
      const current = projectRevenueMap.get(p.name) || 0;
      projectRevenueMap.set(p.name, current + p.revenueCents / 100);
    }
    const revenueByProject = Array.from(projectRevenueMap.entries())
      .map(([project, revenue]) => ({ project, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 4. Despesas por Categoria
    const expenseCategoryMap = new Map<string, number>();
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'];
    for (const e of entries) {
      if (e.type === 'expense') {
        const cat = e.category || 'Outros';
        const current = expenseCategoryMap.get(cat) || 0;
        expenseCategoryMap.set(cat, current + e.amountCents / 100);
      }
    }
    let colorIdx = 0;
    const expensesByCategory = Array.from(expenseCategoryMap.entries()).map(([name, value]) => ({
      name,
      value,
      color: colors[colorIdx++ % colors.length],
    }));

    return {
      monthlyComparison,
      accumulatedBalance,
      revenueByProject,
      expensesByCategory,
    };
  } catch (err) {
    console.error('[financeService] Erro ao carregar dados de gráficos:', err);
    return null;
  }
}
