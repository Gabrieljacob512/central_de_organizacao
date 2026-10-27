import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Mail,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { DEPARTMENTS } from '../../constants/config';
import type { AuthResult, RegisterUserData } from '../../hooks/useCurrentUser';
import { useToast } from '../../hooks/useToast';
import type { Department, UserProfile } from '../../types/ticket';
import { canManageUsers, getUserRoleBadgeInfo } from '../../utils/rbac';
import { Avatar } from '../ui/Avatar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';

interface UserManagementModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  usersList: UserProfile[];
  onAddUser: (data: RegisterUserData) => AuthResult;
  onDeleteUser: (userId: string) => Promise<AuthResult> | AuthResult;
}

const COMMON_ROLES = [
  'Membro',
  'Diretor',
  'Presidente',
];

export function UserManagementModal({
  open,
  onClose,
  currentUser,
  usersList,
  onAddUser,
  onDeleteUser,
}: UserManagementModalProps) {
  const toast = useToast();
  const [tab, setTab] = useState<'list' | 'new'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);

  // Form de Novo Usuário (6 Campos Obrigatórios)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [departmentEmail, setDepartmentEmail] = useState('');
  const [department, setDepartment] = useState<Department>('Projetos');
  const [role, setRole] = useState('Membro');
  const [customRole, setCustomRole] = useState('');
  const [password, setPassword] = useState('123');
  const [formError, setFormError] = useState<string | null>(null);

  // Automação: ao selecionar departamento, sugere o e-mail do departamento correspondente
  const handleDeptChange = (newDept: Department) => {
    setDepartment(newDept);
    if (!departmentEmail || departmentEmail.endsWith('@tecnosystem.com')) {
      setDepartmentEmail(`${newDept.toLowerCase()}@tecnosystem.com`);
    }
  };

  const handleRoleSelect = (selectedRole: string) => {
    setRole(selectedRole);
    if (selectedRole !== 'Outro') {
      setCustomRole('');
    }
  };

  const finalRole = role === 'Outro' ? customRole.trim() : role;

  const handleCreateUser = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!canManageUsers(currentUser)) {
      setFormError('Você não possui permissão para cadastrar colaboradores.');
      return;
    }

    if (!name.trim()) {
      setFormError('Informe o nome completo do usuário.');
      return;
    }

    if (!email.trim()) {
      setFormError('Informe o e-mail corporativo do usuário.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormError('O e-mail do usuário informado não é válido.');
      return;
    }

    if (!departmentEmail.trim() || !emailRegex.test(departmentEmail.trim())) {
      setFormError('Informe um e-mail válido para o departamento correspondente.');
      return;
    }

    if (!finalRole) {
      setFormError('Defina o cargo do usuário.');
      return;
    }

    if (!password.trim()) {
      setFormError('Defina a senha inicial de acesso.');
      return;
    }

    const result = onAddUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      departmentEmail: departmentEmail.trim().toLowerCase(),
      role: finalRole,
      department,
      password: password.trim(),
    });

    if (!result.success) {
      setFormError(result.error ?? 'Erro ao cadastrar colaborador.');
      return;
    }

    toast.success('Colaborador cadastrado', `${name} foi adicionado(a) com sucesso como ${finalRole}.`);
    // Limpa o formulário e retorna à listagem
    setName('');
    setEmail('');
    setDepartmentEmail('');
    setRole('Membro');
    setCustomRole('');
    setPassword('123');
    setFormError(null);
    setTab('list');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const result = await onDeleteUser(deleteTarget.id);
    if (!result.success) {
      toast.error('Não foi possível desativar', result.error ?? 'Falha ao desativar colaborador.');
    } else {
      toast.success('Colaborador desativado', `${deleteTarget.name} foi desativado(a) no sistema.`);
    }
    setDeleteTarget(null);
  };

  // Filtragem de busca
  const filteredUsers = usersList.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.departmentEmail && u.departmentEmail.toLowerCase().includes(term)) ||
      u.role.toLowerCase().includes(term) ||
      u.department.toLowerCase().includes(term)
    );
  });

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="xl"
        title="Gerenciamento de Colaboradores"
        description="Painel exclusivo da Diretoria e RH para controle de acesso, novos cadastros e desligamento de usuários."
        icon={
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 ring-4 ring-purple-50/50 dark:bg-purple-950/60 dark:text-purple-300">
            <Users className="h-5 w-5" />
          </span>
        }
        footer={
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            Fechar Painel
          </button>
        }
      >
        <div className="space-y-4">
          {/* Abas Alternáveis */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800/80">
            <button
              id="tab-user-list"
              type="button"
              onClick={() => {
                setTab('list');
                setFormError(null);
              }}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                tab === 'list'
                  ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-900 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Colaboradores Cadastrados ({usersList.length})</span>
            </button>
            <button
              id="tab-user-new"
              type="button"
              onClick={() => {
                setTab('new');
                setFormError(null);
                if (!departmentEmail) setDepartmentEmail('ti@tecnosystem.com');
              }}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                tab === 'new'
                  ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-900 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Novo Colaborador</span>
            </button>
          </div>

          {/* ==================================================================== */}
          {/* ABA 1: LISTAGEM DE COLABORADORES */}
          {/* ==================================================================== */}
          {tab === 'list' && (
            <div className="space-y-3">
              {/* Busca de colaboradores */}
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="search-collaborator"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, e-mail, cargo ou departamento..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pr-4 pl-9 text-xs sm:text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-800"
                />
              </div>

              {/* Lista com scroll */}
              <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
                {filteredUsers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Nenhum colaborador encontrado com os termos pesquisados.
                  </div>
                ) : (
                  filteredUsers.map((user, idx) => {
                    const isSelf = currentUser?.id === user.id;
                    const isRoot =
                      user.email.toLowerCase() === 'presidente@gmail.com' ||
                      user.email.toLowerCase() === 'presidente@tecnosystem.com';
                    const roleBadge = getUserRoleBadgeInfo(user);

                    return (
                      <div
                        key={`${user.id}-${user.email}-${idx}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-850 dark:hover:border-slate-700"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar name={user.name} size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                {user.name}
                              </p>
                              {isSelf && (
                                <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                  Você (Ativo)
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${roleBadge.badgeClass}`}
                              >
                                <span>{roleBadge.icon}</span>
                                <span>{roleBadge.label}</span>
                              </span>
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {user.department}
                              </span>
                            </div>

                            <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {user.email}
                              {user.departmentEmail && (
                                <span className="ml-2 text-[11px] text-slate-400 dark:text-slate-500">
                                  · Depto: {user.departmentEmail}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Botão de Excluir */}
                        <div className="shrink-0">
                          {isSelf || isRoot ? (
                            <span
                              className="inline-block p-2 text-slate-300 dark:text-slate-600"
                              title={isRoot ? 'Conta raiz do Presidente' : 'Sua própria conta ativa'}
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </span>
                          ) : (
                            <button
                              id={`delete-user-${user.id}`}
                              type="button"
                              onClick={() => setDeleteTarget(user)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 cursor-pointer"
                              title={`Excluir colaborador ${user.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* ABA 2: NOVO CADASTRO DE COLABORADOR (6 CAMPOS OBRIGATÓRIOS) */}
          {/* ==================================================================== */}
          {tab === 'new' && (
            <form onSubmit={handleCreateUser} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Nome do Usuário */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="new-user-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Nome do Usuário *
                  </label>
                  <div className="relative">
                    <User className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                    <input
                      id="new-user-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Carlos Drummond de Andrade"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800"
                    />
                  </div>
                </div>

                {/* 2. E-mail do Usuário */}
                <div>
                  <label
                    htmlFor="new-user-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    E-mail do Usuário *
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                    <input
                      id="new-user-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ex: colaborador@tecnosystem.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800"
                    />
                  </div>
                </div>

                {/* 3. E-mail do Departamento Correspondente */}
                <div>
                  <label
                    htmlFor="new-user-dept-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    E-mail do Departamento *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                    <input
                      id="new-user-dept-email"
                      type="email"
                      required
                      value={departmentEmail}
                      onChange={(e) => setDepartmentEmail(e.target.value)}
                      placeholder="ex: ti@tecnosystem.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800"
                    />
                  </div>
                </div>

                {/* 4. Departamento ao qual pertence */}
                <div>
                  <label
                    htmlFor="new-user-department"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Departamento ao qual pertence *
                  </label>
                  <select
                    id="new-user-department"
                    value={department}
                    onChange={(e) => handleDeptChange(e.target.value as Department)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800 cursor-pointer"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Cargo (Hierarquia RBAC) */}
                <div>
                  <label
                    htmlFor="new-user-role"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Cargo (Hierarquia) *
                  </label>
                  <select
                    id="new-user-role"
                    value={role}
                    onChange={(e) => handleRoleSelect(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800 cursor-pointer"
                  >
                    {COMMON_ROLES.map((r) => (
                      <option key={r} value={r} className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                        {r}
                      </option>
                    ))}
                    <option value="Outro" className="bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">Outro cargo personalizado...</option>
                  </select>
                </div>

                {/* Campo extra se cargo for 'Outro' */}
                {role === 'Outro' && (
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="new-user-custom-role"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Especifique o Cargo *
                    </label>
                    <input
                      id="new-user-custom-role"
                      type="text"
                      required
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder="Ex: Coordenador de Infraestrutura"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800"
                    />
                  </div>
                )}

                {/* 6. Senha Inicial de Acesso */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="new-user-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Senha Inicial de Acesso *
                  </label>
                  <input
                    id="new-user-password"
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha temporária (ex: 123)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800 font-mono"
                  />
                </div>

              </div>

              {/* Informação sobre permissões aplicadas */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                <p className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Permissões concedidas para este perfil:</span>
                </p>
                <p className="mt-1 text-[11px] text-blue-800 dark:text-blue-300">
                  {finalRole.toLowerCase().includes('presidente')
                    ? '👑 Presidente: acesso irrestrito para visualizar todos os chamados da empresa, excluir chamados e gerenciar colaboradores.'
                    : finalRole.toLowerCase().includes('diretor') && (department === 'RH' || finalRole.toLowerCase().includes('rh'))
                    ? '👔 Diretor de RH: visualiza chamados de RH, exclui chamados e pode cadastrar/excluir colaboradores.'
                    : finalRole.toLowerCase().includes('diretor')
                    ? `👔 Diretor de Setor (${department}): visualiza chamados enviados para ${department} e tem permissão para excluir chamados do setor.`
                    : `👤 Membro (${department}): visualização restrita estritamente aos chamados de ${department}. NÃO pode excluir chamados nem gerenciar usuários.`}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTab('list')}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-new-collaborator"
                  type="submit"
                  className="btn-primary"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Cadastrar Colaborador</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Confirmação de exclusão de usuário */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir Colaborador"
        message={`Tem certeza de que deseja excluir ${deleteTarget?.name} (${deleteTarget?.email})? Este colaborador perderá o acesso ao sistema imediatamente.`}
        confirmLabel="Sim, excluir colaborador"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
