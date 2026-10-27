import {
  Activity,
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  Info,
  Search,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ALL_DEPARTMENTS, OPERATIONAL_DEPARTMENTS } from '../../constants/config';
import { useToast } from '../../hooks/useToast';
import {
  createPerson,
  fetchPeopleList,
  fetchRespondersStats,
  sendActivityAlert,
  togglePersonStatus,
} from '../../services/peopleService';
import type { Department, ResponderStat, UserProfile } from '../../types/ticket';
import { formatDateTime } from '../../utils/format';
import {
  getUserRoleBadgeInfo,
  getUserSubtitle,
  isExecutive,
  isHrDirector,
} from '../../utils/rbac';
import { Avatar } from '../ui/Avatar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';

interface PeopleViewProps {
  currentUser: UserProfile | null;
}

export function PeopleView({ currentUser }: PeopleViewProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'employees' | 'activity'>('employees');

  // Estado dos Colaboradores
  const [people, setPeople] = useState<UserProfile[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState<Department | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Estado do Modal de Criação
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState<Department>('Projetos');
  const [newRole, setNewRole] = useState('Membro');
  const [newSecondaryDepartment, setNewSecondaryDepartment] = useState<Department>('Projetos');
  const [creating, setCreating] = useState(false);

  // Estado de Confirmação de Inativação
  const [toggleTarget, setToggleTarget] = useState<UserProfile | null>(null);

  // Estado da Aba de Atividade
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [activityDeptFilter, setActivityDeptFilter] = useState<string>('all');
  const [stats, setStats] = useState<ResponderStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [alertingUser, setAlertingUser] = useState<string | null>(null);

  const isExecutiveUser = isExecutive(currentUser);
  const isHrDirectorUser = isHrDirector(currentUser);

  // Carregar lista de colaboradores
  const loadPeople = async () => {
    try {
      setLoadingPeople(true);
      const data = await fetchPeopleList();
      setPeople(data);
    } finally {
      setLoadingPeople(false);
    }
  };

  // Carregar estatísticas agregadas de atividade
  const loadStats = async (days: number) => {
    try {
      setLoadingStats(true);
      const data = await fetchRespondersStats(days);
      setStats(data);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadPeople();
  }, []);

  useEffect(() => {
    if (activeTab === 'activity') {
      loadStats(periodDays);
    }
  }, [activeTab, periodDays]);

  // Lista filtrada de colaboradores
  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      if (deptFilter !== 'all' && p.department !== deptFilter && p.secondaryDepartment !== deptFilter) {
        return false;
      }
      if (statusFilter === 'active' && p.isActive === false) return false;
      if (statusFilter === 'inactive' && p.isActive !== false) return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query) ||
          (p.role || '').toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [people, deptFilter, statusFilter, searchTerm]);

  // Permissões de criação de cargos
  const availableRoles = useMemo(() => {
    if (isExecutiveUser) {
      return ['Membro', 'Diretor', 'Vice-presidente', 'Presidente'];
    }
    if (isHrDirectorUser) {
      return ['Membro', 'Diretor', 'Vice-presidente', 'Presidente'];
    }
    // Membro comum do RH só pode cadastrar Membro
    return ['Membro'];
  }, [isExecutiveUser, isHrDirectorUser]);

  // Reset do modal ao abrir
  const handleOpenCreateModal = () => {
    setNewName('');
    setNewEmail('');
    setNewDepartment(isExecutiveUser || isHrDirectorUser ? 'Projetos' : 'Projetos');
    setNewRole(availableRoles[0]);
    setNewSecondaryDepartment('Projetos');
    setCreateModalOpen(true);
  };

  // Submissão do novo colaborador
  const handleCreateCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setCreating(true);
    const res = await createPerson({
      name: newName.trim(),
      email: newEmail.trim(),
      department: newRole === 'Presidente' || newRole === 'Vice-presidente' ? 'Administração' : newDepartment,
      secondaryDepartment: newRole === 'Vice-presidente' ? newSecondaryDepartment : undefined,
      role: newRole,
    });
    setCreating(false);

    if (res.success) {
      toast.success('Sucesso', res.message);
      setCreateModalOpen(false);
      loadPeople();
    } else {
      toast.error('Erro ao cadastrar', res.message);
    }
  };

  // Alternar status ativo/inativo
  const handleConfirmToggleStatus = async () => {
    if (!toggleTarget) return;
    const newStatus = !toggleTarget.isActive;
    const res = await togglePersonStatus(toggleTarget.id, newStatus);

    if (res.success) {
      toast.success(res.message);
      setPeople((prev) =>
        prev.map((p) => (p.id === toggleTarget.id ? { ...p, isActive: newStatus } : p))
      );
    } else {
      toast.error('Operação bloqueada', res.message);
    }
    setToggleTarget(null);
  };

  // Enviar alerta in-app para usuário sem atividade
  const handleSendAlert = async (stat: ResponderStat) => {
    setAlertingUser(stat.profile_id);
    const res = await sendActivityAlert(stat.profile_id, stat.name);
    setAlertingUser(null);

    if (res.success) {
      toast.success('Alerta enviado', res.message);
    } else {
      toast.error('Falha ao enviar', res.message);
    }
  };

  // Resumo estatístico
  const activeMembers = useMemo(() => stats, [stats]);
  const activeResponders = useMemo(
    () => stats.filter((s) => s.assigned_count > 0 || s.comments_count > 0 || s.resolved_count > 0),
    [stats]
  );
  const nonResponders = useMemo(
    () => stats.filter((s) => s.assigned_count === 0 && s.comments_count === 0 && s.resolved_count === 0),
    [stats]
  );

  return (
    <div className="space-y-5">
      {/* Abas Superiores do Módulo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 dark:border-slate-800 -mt-2">
        <div
          className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800"
          role="tablist"
          aria-label="Abas de Gestão de Pessoas"
        >
          <button
            id="tab-people-employees"
            type="button"
            role="tab"
            aria-selected={activeTab === 'employees'}
            onClick={() => setActiveTab('employees')}
            className={`flex min-h-[38px] cursor-pointer items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'employees'
                ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Funcionários</span>
            <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] dark:bg-slate-800 font-bold">
              {people.length}
            </span>
          </button>

          <button
            id="tab-people-activity"
            type="button"
            role="tab"
            aria-selected={activeTab === 'activity'}
            onClick={() => setActiveTab('activity')}
            className={`flex min-h-[38px] cursor-pointer items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'activity'
                ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Atividade nos chamados</span>
          </button>
        </div>

        {activeTab === 'employees' && (
          <button
            id="btn-add-collaborator"
            type="button"
            onClick={handleOpenCreateModal}
            className="btn-primary min-h-[40px] px-3.5 py-2 text-xs font-bold shadow-md shadow-blue-600/20"
          >
            <UserPlus className="h-4 w-4" />
            <span>Novo Colaborador</span>
          </button>
        )}
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: FUNCIONÁRIOS */}
      {/* ==================================================================== */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Filtros de Busca, Departamento e Status */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="search-collaborators"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar colaborador por nome, e-mail ou cargo..."
                className="w-full min-h-[40px] rounded-xl border border-slate-200 bg-white py-2 pr-4 pl-9 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="relative">
              <select
                id="filter-people-dept"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value as Department | 'all')}
                className="w-full min-h-[40px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer shadow-2xs"
              >
                <option value="all">Todos os departamentos</option>
                {ALL_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                id="filter-people-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full min-h-[40px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer shadow-2xs"
              >
                <option value="all">Status: Todos</option>
                <option value="active">Apenas Ativos</option>
                <option value="inactive">Apenas Inativos</option>
              </select>
            </div>
          </div>

          {/* Tabela de Colaboradores */}
          {loadingPeople ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-xs text-slate-400">Carregando colaboradores...</p>
            </div>
          ) : filteredPeople.length === 0 ? (
            <EmptyState
              title="Nenhum colaborador encontrado"
              description="Ajuste os filtros de busca para visualizar colaboradores."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Hierarquia & Subtítulo</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPeople.map((person) => {
                    const badge = getUserRoleBadgeInfo(person);
                    const isCurrentUser = currentUser?.id === person.id;
                    const isActive = person.isActive !== false;

                    return (
                      <tr
                        key={person.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={person.name} avatarUrl={person.avatarUrl} size="sm" />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {person.name}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {person.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.badgeClass}`}
                            >
                              <span>{badge.icon}</span>
                              <span>{badge.label}</span>
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {getUserSubtitle(person)}
                            </p>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isActive ? 'bg-emerald-600' : 'bg-slate-500'
                              }`}
                            />
                            <span>{isActive ? 'Ativo' : 'Inativo'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={isCurrentUser}
                            onClick={() => setToggleTarget(person)}
                            className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                              isCurrentUser
                                ? 'opacity-40 cursor-not-allowed text-slate-400'
                                : isActive
                                ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                            title={
                              isCurrentUser
                                ? 'Você não pode inativar a si mesmo'
                                : isActive
                                ? 'Inativar colaborador'
                                : 'Reativar colaborador'
                            }
                          >
                            {isActive ? 'Inativar' : 'Reativar'}
                          </button>
                        </td>
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
      {/* ABA 2: ATIVIDADE NOS CHAMADOS */}
      {/* ==================================================================== */}
      {activeTab === 'activity' && (
        <div className="space-y-5">
          {/* Controles de Período e Departamento */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Período analisado:
              </span>
              <div
                className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800"
                role="tablist"
              >
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setPeriodDays(days)}
                    className={`flex min-h-[34px] cursor-pointer items-center rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      periodDays === days
                        ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {days} dias
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <select
                id="filter-activity-dept"
                value={activityDeptFilter}
                onChange={(e) => setActivityDeptFilter(e.target.value)}
                className="min-h-[38px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer shadow-2xs"
              >
                <option value="all">Todos os departamentos</option>
                {ALL_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Card de Resumo de Engajamento */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-200/90 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/40">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                Engajamento em Chamados
              </p>
              <h3 className="mt-1 text-2xl font-bold text-blue-950 dark:text-blue-100">
                {activeResponders.length} de {activeMembers.length}
              </h3>
              <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300">
                colaboradores responderam chamados nos últimos {periodDays} dias.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Total de Resoluções
              </p>
              <h3 className="mt-1 text-2xl font-bold text-emerald-950 dark:text-emerald-100">
                {stats.reduce((acc, s) => acc + s.resolved_count, 0)}
              </h3>
              <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                chamados concluídos pela equipe no período.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200/90 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Sem Atividade Recente
              </p>
              <h3 className="mt-1 text-2xl font-bold text-amber-950 dark:text-amber-100">
                {nonResponders.length}
              </h3>
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                colaboradores sem interações registradas.
              </p>
            </div>
          </div>

          {/* Seção 1: Responderam a chamados */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Colaboradores com Atividade no Período</span>
            </h3>

            {loadingStats ? (
              <p className="text-xs text-slate-400">Carregando métricas...</p>
            ) : activeResponders.length === 0 ? (
              <EmptyState
                title="Nenhum colaborador com atividade"
                description={`Não há respostas registradas nos últimos ${periodDays} dias.`}
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                      <th className="py-3 px-4">Colaborador</th>
                      <th className="py-3 px-4">Departamento</th>
                      <th className="py-3 px-4 text-center">Atribuídos</th>
                      <th className="py-3 px-4 text-center">Comentários</th>
                      <th className="py-3 px-4 text-center">Resolvidos</th>
                      <th className="py-3 px-4">Última Atividade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeResponders.map((stat) => (
                      <tr key={stat.profile_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          <p>{stat.name}</p>
                          <p className="text-[11px] text-slate-400 font-normal">{stat.email}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {stat.department_name} ({stat.role_name})
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {stat.assigned_count}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                          {stat.comments_count}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {stat.resolved_count}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          {stat.last_activity_at ? formatDateTime(stat.last_activity_at) : 'Sem registro'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Seção 2: NÃO responderam no período */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span>Colaboradores Sem Atividade no Período</span>
            </h3>

            {nonResponders.length === 0 ? (
              <p className="text-xs text-slate-500">Todos os colaboradores ativos responderam chamados no período!</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                      <th className="py-3 px-4">Colaborador</th>
                      <th className="py-3 px-4">Departamento</th>
                      <th className="py-3 px-4">Cargo</th>
                      <th className="py-3 px-4 text-right">Ação do RH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {nonResponders.map((stat) => (
                      <tr key={stat.profile_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          <p>{stat.name}</p>
                          <p className="text-[11px] text-slate-400 font-normal">{stat.email}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {stat.department_name}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {stat.role_name}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={alertingUser === stat.profile_id}
                            onClick={() => handleSendAlert(stat)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 transition cursor-pointer"
                          >
                            <Bell className="h-3.5 w-3.5" />
                            <span>{alertingUser === stat.profile_id ? 'Enviando...' : 'Enviar Alerta'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: NOVO COLABORADOR COM PAPÉIS CONDICIONADOS */}
      {/* ==================================================================== */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Cadastrar Novo Colaborador"
      >
        <form onSubmit={handleCreateCollaborator} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex.: Lucas Silveira"
              className="w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              E-mail Corporativo *
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Ex.: lucas.silveira@tecnosystem.com.br"
              className="w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          {/* Cargo Condicionado */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Cargo na Empresa</span>
              {!isExecutiveUser && !isHrDirectorUser && (
                <span
                  title="Membros do RH só possuem permissão para criar outros membros"
                  className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1"
                >
                  <Info className="h-3 w-3" />
                  <span>Apenas Membro permitido</span>
                </span>
              )}
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full min-h-[40px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Departamento Operacional Principal (Se não for Presidente / Vice) */}
          {newRole !== 'Presidente' && newRole !== 'Vice-presidente' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Departamento Operacional
              </label>
              <select
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value as Department)}
                className="w-full min-h-[40px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
              >
                {OPERATIONAL_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Exigência Estrita para Vice-presidente: Seleção do depto onde é Diretor */}
          {newRole === 'Vice-presidente' && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/40 space-y-2">
              <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Diretoria Operacional Vinculada (Exigência Estatutária)</span>
              </p>
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                O Vice-presidente pertence à Administração e deve assumir a diretoria de exatamente um departamento operacional.
              </p>
              <select
                value={newSecondaryDepartment}
                onChange={(e) => setNewSecondaryDepartment(e.target.value as Department)}
                className="w-full min-h-[40px] appearance-none rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold outline-none focus:border-indigo-500 dark:border-indigo-800 dark:bg-slate-900 cursor-pointer"
              >
                {OPERATIONAL_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    Diretor de {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary"
            >
              {creating ? 'Salvando...' : 'Cadastrar Colaborador'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Inativação / Reativação */}
      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.isActive ? 'Inativar Colaborador' : 'Reativar Colaborador'}
        message={
          toggleTarget?.isActive
            ? `Deseja realmente inativar o colaborador ${toggleTarget?.name}? Ele perderá o acesso ao sistema até ser reativado.`
            : `Deseja reativar o colaborador ${toggleTarget?.name}?`
        }
        confirmLabel={toggleTarget?.isActive ? 'Confirmar Inativação' : 'Confirmar Reativação'}
        variant={toggleTarget?.isActive ? 'danger' : 'warning'}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
