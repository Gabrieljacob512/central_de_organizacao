import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Download,
  FileText,
  FolderKanban,
  Lock,
  Plus,
  Search,
  Trash2,
  Unlock,
  UploadCloud,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import {
  createFinanceEntry,
  createMonthProject,
  deleteFinanceEntry,
  fetchFinanceMonths,
  fetchMonthDetails,
  formatCentsToBRL,
  parseBRLToCents,
  toggleMonthClosure,
  uploadFinanceAttachment,
  validateFinanceFileMagicBytes,
} from '../../services/financeService';
import type {
  FinanceAttachment,
  FinanceEntry,
  FinanceMonth,
  FinanceMonthProject,
  UserProfile,
} from '../../types/ticket';
import { formatDateTime } from '../../utils/format';
import { canCloseFinanceMonth, canManageFinance } from '../../utils/rbac';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';

interface FinanceViewProps {
  currentUser: UserProfile | null;
}

const COMMON_EXPENSE_CATEGORIES = [
  'Operacional & Nuvem',
  'Capacitação & Cursos',
  'Marketing & Tráfego',
  'Infraestrutura & Sedes',
  'Benefícios & Reembolsos',
  'Material de Escritório',
  'Outros',
];

const COMMON_GAIN_CATEGORIES = [
  'Projetos',
  'Consultoria',
  'Treinamentos Externos',
  'Parcerias',
  'Outros',
];

export function FinanceView({ currentUser }: FinanceViewProps) {
  const toast = useToast();
  const [months, setMonths] = useState<FinanceMonth[]>([]);
  const [selectedCompetence, setSelectedCompetence] = useState<string>('2026-10');
  const [loading, setLoading] = useState(true);

  // Detalhes do mês selecionado
  const [monthData, setMonthData] = useState<FinanceMonth | null>(null);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [projects, setProjects] = useState<FinanceMonthProject[]>([]);
  const [attachments, setAttachments] = useState<FinanceAttachment[]>([]);

  // Abas internas
  const [tab, setTab] = useState<'entries' | 'projects'>('entries');
  const [entryTypeFilter, setEntryTypeFilter] = useState<'all' | 'gain' | 'expense'>('all');
  const [searchEntry, setSearchEntry] = useState('');

  // Modais
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [entryType, setEntryType] = useState<'gain' | 'expense'>('expense');
  const [entryCategory, setEntryCategory] = useState(COMMON_EXPENSE_CATEGORIES[0]);
  const [entryAmountInput, setEntryAmountInput] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [entryProjectName, setEntryProjectName] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projName, setProjName] = useState('');
  const [projRevenueInput, setProjRevenueInput] = useState('');
  const [projNotes, setProjNotes] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // Confirmação de fechamento / reabertura
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<FinanceEntry | null>(null);

  // Upload de comprovante
  const [uploading, setUploading] = useState(false);

  const canCloseMonth = canCloseFinanceMonth(currentUser);
  const canManage = canManageFinance(currentUser);
  const isMonthClosed = Boolean(monthData?.isClosed);

  // Carregar lista de competências
  const loadMonths = async () => {
    const list = await fetchFinanceMonths();
    setMonths(list);
    if (list.length > 0 && !selectedCompetence) {
      setSelectedCompetence(list[0].competence);
    }
  };

  // Carregar dados da competência ativa
  const loadActiveMonth = async (competence: string) => {
    try {
      setLoading(true);
      const res = await fetchMonthDetails(competence);
      setMonthData(res.month);
      setEntries(res.entries);
      setProjects(res.projects);
      setAttachments(res.attachments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonths();
  }, []);

  useEffect(() => {
    if (selectedCompetence) {
      loadActiveMonth(selectedCompetence);
    }
  }, [selectedCompetence]);

  // Filtro de lançamentos
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (entryTypeFilter !== 'all' && e.type !== entryTypeFilter) return false;
      if (searchEntry) {
        const q = searchEntry.toLowerCase();
        return (
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.projectName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, entryTypeFilter, searchEntry]);

  // Criação de lançamento
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthData?.id) return;
    const cents = parseBRLToCents(entryAmountInput);
    if (cents <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }
    if (!entryDescription.trim()) {
      toast.error('Informe a descrição do lançamento.');
      return;
    }

    setSavingEntry(true);
    const res = await createFinanceEntry({
      monthId: monthData.id,
      type: entryType,
      category: entryCategory,
      amountCents: cents,
      description: entryDescription.trim(),
      projectName: entryProjectName.trim() || undefined,
    });
    setSavingEntry(false);

    if (res.success && res.entry) {
      toast.success(res.message);
      setEntries((prev) => [res.entry!, ...prev]);
      setNewEntryOpen(false);
      setEntryAmountInput('');
      setEntryDescription('');
      setEntryProjectName('');
      loadActiveMonth(selectedCompetence);
    } else {
      toast.error('Erro ao salvar', res.message);
    }
  };

  // Exclusão de lançamento
  const handleConfirmDeleteEntry = async () => {
    if (!deleteEntryTarget) return;
    const res = await deleteFinanceEntry(deleteEntryTarget.id);
    if (res.success) {
      toast.success(res.message);
      setEntries((prev) => prev.filter((e) => e.id !== deleteEntryTarget.id));
      loadActiveMonth(selectedCompetence);
    } else {
      toast.error('Erro ao excluir', res.message);
    }
    setDeleteEntryTarget(null);
  };

  // Faturamento de novo projeto no mês
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthData?.id) return;
    const cents = parseBRLToCents(projRevenueInput);
    if (cents <= 0) {
      toast.error('Informe o valor de faturamento do projeto.');
      return;
    }
    if (!projName.trim()) {
      toast.error('Informe o nome do projeto.');
      return;
    }

    setSavingProject(true);
    const res = await createMonthProject({
      monthId: monthData.id,
      projectName: projName.trim(),
      revenueCents: cents,
      notes: projNotes.trim(),
    });
    setSavingProject(false);

    if (res.success) {
      toast.success(res.message);
      setNewProjectOpen(false);
      setProjName('');
      setProjRevenueInput('');
      setProjNotes('');
      loadActiveMonth(selectedCompetence);
    } else {
      toast.error('Erro ao salvar projeto', res.message);
    }
  };

  // Fechamento / Reabertura do Mês
  const handleToggleMonthClosure = async () => {
    if (!monthData?.id) return;
    const targetStatus = !monthData.isClosed;
    const res = await toggleMonthClosure(monthData.id, targetStatus, selectedCompetence);

    if (res.success) {
      toast.success(res.message);
      setMonthData((prev) => (prev ? { ...prev, isClosed: targetStatus } : null));
      loadMonths();
    } else {
      toast.error('Operação bloqueada', res.message);
    }
    setCloseConfirmOpen(false);
  };

  // Upload de Comprovante Financeiro
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !monthData?.id) return;

    const check = await validateFinanceFileMagicBytes(file);
    if (!check.valid) {
      toast.error('Arquivo rejeitado', check.error || 'Formato inválido.');
      return;
    }

    setUploading(true);
    const res = await uploadFinanceAttachment(file, { monthId: monthData.id });
    setUploading(false);

    if (res.success && res.attachment) {
      toast.success(res.message);
      setAttachments((prev) => [res.attachment!, ...prev]);
    } else {
      toast.error('Falha no upload', res.message);
    }
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Barra de Competência e Ação de Fechamento */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800 -mt-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Competência:
          </span>
          <select
            id="select-competence-month"
            value={selectedCompetence}
            onChange={(e) => setSelectedCompetence(e.target.value)}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-blue-500 shadow-2xs cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {months.map((m) => (
              <option key={m.competence} value={m.competence}>
                {m.competence} {m.isClosed ? '🔒 (Fechado)' : '🟢 (Aberto)'}
              </option>
            ))}
          </select>
        </div>

        {/* Botão de Fechar / Reabrir Mês */}
        {canCloseMonth && monthData && (
          <button
            id="btn-toggle-month-closure"
            type="button"
            onClick={() => setCloseConfirmOpen(true)}
            className={`flex min-h-[40px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition shadow-2xs cursor-pointer ${
              monthData.isClosed
                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {monthData.isClosed ? (
              <>
                <Unlock className="h-4 w-4 text-amber-600" />
                <span>Reabrir Mês Contábil</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span>Fechar Mês (Somente-leitura)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Alerta de Mês Fechado */}
      {isMonthClosed && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Esta competência foi encerrada e está em <strong>modo somente-leitura</strong>. Lançamentos e alterações de projetos estão bloqueados.
          </span>
        </div>
      )}

      {/* Cards de Resumo Mensal */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Receita Total */}
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Receita Total
            </span>
            <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100">
            {formatCentsToBRL(monthData?.totalRevenueCents || 0)}
          </h3>
          <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
            Faturamento de projetos e entradas
          </p>
        </div>

        {/* Despesa Total */}
        <div className="rounded-2xl border border-rose-200/90 bg-rose-50/60 p-4 dark:border-rose-900/60 dark:bg-rose-950/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
              Despesas Totais
            </span>
            <ArrowDownRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-rose-950 dark:text-rose-100">
            {formatCentsToBRL(monthData?.totalExpenseCents || 0)}
          </h3>
          <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
            Custos operacionais e ferramentas
          </p>
        </div>

        {/* Saldo Líquido */}
        <div className="rounded-2xl border border-blue-200/90 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
              Saldo da Competência
            </span>
            <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3
            className={`mt-2 text-2xl font-bold tracking-tight ${
              (monthData?.balanceCents || 0) >= 0
                ? 'text-blue-950 dark:text-blue-100'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {formatCentsToBRL(monthData?.balanceCents || 0)}
          </h3>
          <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300">
            Resultado financeiro do período
          </p>
        </div>

        {/* Status da Competência */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Status Contábil
            </span>
            {isMonthClosed ? (
              <Lock className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
          </div>
          <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {isMonthClosed ? 'Encerrado' : 'Aberto'}
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">
            {isMonthClosed ? 'Registros congelados' : 'Lançamentos permitidos'}
          </p>
        </div>
      </div>

      {/* Controle de Abas: Lançamentos vs Projetos do Mês */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
        <div
          className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800"
          role="tablist"
        >
          <button
            id="tab-finance-entries"
            type="button"
            role="tab"
            aria-selected={tab === 'entries'}
            onClick={() => setTab('entries')}
            className={`flex min-h-[36px] cursor-pointer items-center gap-2 rounded-lg px-3.5 py-1 text-xs font-semibold transition ${
              tab === 'entries'
                ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>Lançamentos ({entries.length})</span>
          </button>

          <button
            id="tab-finance-projects"
            type="button"
            role="tab"
            aria-selected={tab === 'projects'}
            onClick={() => setTab('projects')}
            className={`flex min-h-[36px] cursor-pointer items-center gap-2 rounded-lg px-3.5 py-1 text-xs font-semibold transition ${
              tab === 'projects'
                ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <FolderKanban className="h-4 w-4" />
            <span>Projetos do Mês & Comprovantes ({projects.length})</span>
          </button>
        </div>

        {/* Botão de Ação Direta na Aba */}
        {!isMonthClosed && canManage && (
          <div className="flex items-center gap-2">
            {tab === 'entries' ? (
              <button
                id="btn-new-finance-entry"
                type="button"
                onClick={() => setNewEntryOpen(true)}
                className="btn-primary min-h-[38px] px-3 py-1.5 text-xs font-bold shadow-md shadow-blue-600/20"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Lançamento</span>
              </button>
            ) : (
              <button
                id="btn-new-month-project"
                type="button"
                onClick={() => setNewProjectOpen(true)}
                className="btn-primary min-h-[38px] px-3 py-1.5 text-xs font-bold shadow-md shadow-blue-600/20"
              >
                <Plus className="h-4 w-4" />
                <span>Faturar Projeto</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: LANÇAMENTOS (RECEITAS & DESPESAS) */}
      {/* ==================================================================== */}
      {tab === 'entries' && (
        <div className="space-y-4">
          {/* Filtros de Tipo e Busca */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchEntry}
                onChange={(e) => setSearchEntry(e.target.value)}
                placeholder="Buscar por descrição, categoria ou projeto..."
                className="w-full min-h-[38px] rounded-xl border border-slate-200 bg-white py-1.5 pr-4 pl-9 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={entryTypeFilter}
                onChange={(e) => setEntryTypeFilter(e.target.value as any)}
                className="min-h-[38px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer shadow-2xs"
              >
                <option value="all">Tipo: Todos</option>
                <option value="gain">Apenas Receitas (+)</option>
                <option value="expense">Apenas Despesas (-)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400">Carregando lançamentos...</p>
          ) : filteredEntries.length === 0 ? (
            <EmptyState
              title="Nenhum lançamento registrado nesta competência"
              description="Clique em 'Novo Lançamento' para registrar uma receita ou despesa."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descrição & Projeto</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-right">Valor (R$)</th>
                    <th className="py-3 px-4">Data</th>
                    {!isMonthClosed && canManage && <th className="py-3 px-4 text-right">Ação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEntries.map((entry) => {
                    const isGain = entry.type === 'gain';
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isGain
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                            }`}
                          >
                            {isGain ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            <span>{isGain ? 'Receita' : 'Despesa'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white">{entry.description}</p>
                          {entry.projectName && (
                            <p className="text-[11px] text-blue-600 dark:text-blue-400">
                              Projeto: {entry.projectName}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium dark:bg-slate-800">
                            {entry.category}
                          </span>
                        </td>

                        <td
                          className={`py-3 px-4 text-right font-bold text-sm ${
                            isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isGain ? '+' : '-'} {formatCentsToBRL(entry.amountCents)}
                        </td>

                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {formatDateTime(entry.createdAt)}
                        </td>

                        {!isMonthClosed && canManage && (
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setDeleteEntryTarget(entry)}
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer"
                              title="Excluir lançamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: PROJETOS DO MÊS & COMPROVANTES */}
      {/* ==================================================================== */}
      {tab === 'projects' && (
        <div className="space-y-6">
          {/* Seção de Projetos Faturados */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-blue-600" />
              <span>Projetos Faturados nesta Competência</span>
            </h3>

            {projects.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum projeto faturado nesta competência.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {proj.projectName}
                      </h4>
                      <span className="font-bold text-emerald-600 text-sm">
                        {formatCentsToBRL(proj.revenueCents)}
                      </span>
                    </div>
                    {proj.notes && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {proj.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção de Comprovantes Anexados (Bucket finance-files) */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span>Comprovantes & Notas Fiscais (Bucket Seguro)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload validado por magic bytes (PDF, PNG ou JPEG) · Limite máximo de 1 MB.
                </p>
              </div>

              {!isMonthClosed && canManage && (
                <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer text-xs font-bold py-1.5 px-3 min-h-[38px]">
                  <UploadCloud className="h-4 w-4 text-blue-600" />
                  <span>{uploading ? 'Enviando...' : 'Anexar Comprovante'}</span>
                  <input
                    type="file"
                    disabled={uploading}
                    onChange={handleFileUpload}
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            {attachments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400 dark:border-slate-700">
                Nenhum comprovante anexado para esta competência contábil.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {att.fileName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {(att.sizeBytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    {att.signedUrl && (
                      <a
                        href={att.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 p-1 cursor-pointer"
                        title="Baixar comprovante"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: NOVO LANÇAMENTO */}
      {/* ==================================================================== */}
      <Modal
        open={newEntryOpen}
        onClose={() => setNewEntryOpen(false)}
        title="Novo Lançamento Financeiro"
      >
        <form onSubmit={handleSaveEntry} className="space-y-4">
          {/* Tipo de Lançamento */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Operação *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEntryType('gain');
                  setEntryCategory(COMMON_GAIN_CATEGORIES[0]);
                }}
                className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold cursor-pointer transition ${
                  entryType === 'gain'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800'
                }`}
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>Receita (+)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryType('expense');
                  setEntryCategory(COMMON_EXPENSE_CATEGORIES[0]);
                }}
                className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold cursor-pointer transition ${
                  entryType === 'expense'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                    : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-800'
                }`}
              >
                <ArrowDownRight className="h-4 w-4" />
                <span>Despesa (-)</span>
              </button>
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Categoria *
            </label>
            <select
              value={entryCategory}
              onChange={(e) => setEntryCategory(e.target.value)}
              className="w-full min-h-[40px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
            >
              {(entryType === 'gain' ? COMMON_GAIN_CATEGORIES : COMMON_EXPENSE_CATEGORIES).map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Valor em R$ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Valor (R$) *
            </label>
            <input
              type="text"
              required
              value={entryAmountInput}
              onChange={(e) => setEntryAmountInput(e.target.value)}
              placeholder="Ex.: 1.842,30 ou 1842.30"
              className="w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descrição do Lançamento *
            </label>
            <input
              type="text"
              required
              value={entryDescription}
              onChange={(e) => setEntryDescription(e.target.value)}
              placeholder="Ex.: Assinatura de servidores de nuvem AWS"
              className="w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          {/* Vínculo opcional de Projeto */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Projeto Vinculado (Opcional)
            </label>
            <input
              type="text"
              value={entryProjectName}
              onChange={(e) => setEntryProjectName(e.target.value)}
              placeholder="Ex.: Plataforma Gamma"
              className="w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setNewEntryOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" disabled={savingEntry} className="btn-primary">
              {savingEntry ? 'Salvando...' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL: NOVO PROJETO DO MÊS */}
      {/* ==================================================================== */}
      <Modal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        title="Faturar Projeto nesta Competência"
      >
        <form onSubmit={handleSaveProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome do Projeto *
            </label>
            <input
              type="text"
              required
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              placeholder="Ex.: Projeto E-commerce Alpha"
              className="w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Faturamento no Mês (R$) *
            </label>
            <input
              type="text"
              required
              value={projRevenueInput}
              onChange={(e) => setProjRevenueInput(e.target.value)}
              placeholder="Ex.: 35.000,00"
              className="w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observações / Entregáveis
            </label>
            <textarea
              rows={3}
              value={projNotes}
              onChange={(e) => setProjNotes(e.target.value)}
              placeholder="Ex.: Conclusão da Sprint 3 com entrega de protótipo de alta fidelidade."
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs sm:text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setNewProjectOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" disabled={savingProject} className="btn-primary">
              {savingProject ? 'Salvando...' : 'Registrar Faturamento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Fechamento / Reabertura */}
      <ConfirmDialog
        open={closeConfirmOpen}
        title={monthData?.isClosed ? 'Reabrir Mês Contábil' : 'Fechar Mês Contábil'}
        message={
          monthData?.isClosed
            ? `Deseja realmente reabrir a competência ${selectedCompetence}? Esta ação será registrada na trilha de auditoria global.`
            : `Deseja fechar a competência ${selectedCompetence}? Uma vez fechada, todos os lançamentos e projetos ficam congelados em modo somente-leitura.`
        }
        confirmLabel={monthData?.isClosed ? 'Confirmar Reabertura' : 'Confirmar Fechamento'}
        variant={monthData?.isClosed ? 'warning' : 'danger'}
        onConfirm={handleToggleMonthClosure}
        onCancel={() => setCloseConfirmOpen(false)}
      />

      {/* Confirmação de Exclusão de Lançamento */}
      <ConfirmDialog
        open={Boolean(deleteEntryTarget)}
        title="Excluir Lançamento Financeiro"
        message={`Deseja excluir o lançamento "${deleteEntryTarget?.description}" no valor de ${formatCentsToBRL(
          deleteEntryTarget?.amountCents || 0
        )}?`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={handleConfirmDeleteEntry}
        onCancel={() => setDeleteEntryTarget(null)}
      />
    </div>
  );
}
