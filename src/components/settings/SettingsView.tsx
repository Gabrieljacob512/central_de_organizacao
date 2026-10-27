import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Moon,
  Paintbrush,
  Shield,
  Sun,
  Trash2,
  User,
} from 'lucide-react';
import { useId, useState } from 'react';
import { DEPARTMENTS } from '../../constants/config';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import {
  removeAvatar,
  requestEmailChange,
  updateProfileData,
  uploadAvatar,
  validateImageMagicBytes,
} from '../../services/profileService';
import type { Department, UserProfile } from '../../types/ticket';
import { canChangeDepartment } from '../../utils/rbac';
import { Avatar } from '../ui/Avatar';

interface SettingsViewProps {
  currentUser: UserProfile | null;
  onProfileUpdated?: (updated: UserProfile) => void;
  onPasswordChanged?: () => void;
}

type SettingsTab = 'appearance' | 'profile' | 'security';

export function SettingsView({
  currentUser,
  onProfileUpdated,
  onPasswordChanged,
}: SettingsViewProps) {
  const toast = useToast();
  const { isDark, setTheme } = useTheme();
  const { changePassword } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  // ----------------- Perfil State -----------------
  const [name, setName] = useState(currentUser?.name || '');
  const [newEmail, setNewEmail] = useState('');
  const [emailPending, setEmailPending] = useState(false);
  const [pendingEmailAddress, setPendingEmailAddress] = useState('');
  const [department, setDepartment] = useState<Department>(
    currentUser?.department || 'Projetos'
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // ----------------- Segurança State -----------------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fileInputId = useId();
  const hasDepartmentChangePerm = canChangeDepartment(currentUser);

  // Cálculo de Força da Senha
  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (pwd.length >= 12) score += 15;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 20;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
    return Math.min(score, 100);
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  // Manipulador de Seleção de Avatar com Validação de Magic Bytes
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1048576) {
      toast.error('Arquivo muito grande', 'A foto de perfil deve ter no máximo 1 MB (1.048.576 bytes).');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido', 'Selecione uma imagem PNG, JPG ou WebP.');
      return;
    }

    const isValidMagic = await validateImageMagicBytes(file);
    if (!isValidMagic) {
      toast.error('Arquivo corrompido ou inválido', 'O conteúdo binário não corresponde a uma imagem válida.');
      return;
    }

    setSelectedAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Salvar Alterações de Perfil
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (name.trim().length < 2 || name.trim().length > 80) {
      toast.error('Nome inválido', 'O nome deve ter entre 2 e 80 caracteres.');
      return;
    }

    setIsSavingProfile(true);

    try {
      let updatedAvatarUrl = currentUser.avatarUrl;

      // 1. Upload de nova foto se selecionada
      if (selectedAvatarFile) {
        const uploadRes = await uploadAvatar(currentUser.id, selectedAvatarFile);
        if (!uploadRes.success) {
          toast.error('Falha no upload da foto', uploadRes.error || 'Erro desconhecido');
          setIsSavingProfile(false);
          return;
        }
        updatedAvatarUrl = uploadRes.avatarUrl;
      }

      // 2. Atualizar dados cadastrais
      const updateRes = await updateProfileData(currentUser.id, {
        name: name.trim(),
        department: hasDepartmentChangePerm ? department : undefined,
      });

      if (!updateRes.success) {
        toast.error('Erro ao salvar perfil', updateRes.error || 'Não foi possível atualizar os dados.');
        setIsSavingProfile(false);
        return;
      }

      // 3. Solicitar troca de e-mail se fornecido novo e-mail
      if (newEmail.trim() && newEmail.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
        const emailRes = await requestEmailChange(newEmail.trim().toLowerCase());
        if (!emailRes.success) {
          toast.error('Erro na alteração de e-mail', emailRes.error || 'E-mail inválido ou já em uso.');
          setIsSavingProfile(false);
          return;
        }
        setEmailPending(true);
        setPendingEmailAddress(newEmail.trim().toLowerCase());
        toast.info(
          'Confirmação enviada',
          `Um link de validação foi enviado para ${newEmail.trim()}. O novo e-mail só será ativado após confirmação.`
        );
      }

      toast.success('Perfil atualizado', 'Suas informações cadastrais foram salvas com sucesso.');
      setSelectedAvatarFile(null);

      if (onProfileUpdated) {
        onProfileUpdated({
          ...currentUser,
          name: name.trim(),
          department: hasDepartmentChangePerm ? department : currentUser.department,
          avatarUrl: updatedAvatarUrl,
        });
      }
    } catch (err: any) {
      toast.error('Erro inesperado', err.message || 'Falha ao processar atualização.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Remover Foto de Perfil
  const handleRemoveAvatar = async () => {
    if (!currentUser) return;
    setIsSavingProfile(true);
    const res = await removeAvatar(currentUser.id);
    setIsSavingProfile(false);

    if (res.success) {
      setAvatarPreview(null);
      setSelectedAvatarFile(null);
      toast.success('Foto removida', 'Sua foto de perfil foi excluída. Suas iniciais serão exibidas.');
      if (onProfileUpdated) {
        onProfileUpdated({
          ...currentUser,
          avatarUrl: null,
        });
      }
    } else {
      toast.error('Erro ao remover foto', res.error || 'Não foi possível apagar a foto.');
    }
  };

  // Alterar Senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (failedAttempts >= 5) {
      toast.error('Muitas tentativas', 'Limite de tentativas incorretas excedido. Aguarde alguns minutos.');
      return;
    }

    if (!currentPassword) {
      toast.error('Senha atual obrigatória', 'Informe sua senha de acesso atual para confirmar sua identidade.');
      return;
    }

    if (newPassword.length < 8 || !/[0-9]/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      toast.error(
        'Nova senha fraca',
        'A nova senha deve possuir ao menos 8 caracteres, combinando letras e números.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Senhas não coincidem', 'A confirmação deve ser exatamente igual à nova senha.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        toast.success('Senha alterada com sucesso', 'Suas novas credenciais de segurança já estão ativas.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setFailedAttempts(0);
        if (onPasswordChanged) onPasswordChanged();
      } else {
        setFailedAttempts((prev) => prev + 1);
        toast.error('Senha atual incorreta', result.error || 'A senha atual informada está incorreta.');
      }
    } catch (err: any) {
      toast.error('Falha ao alterar senha', err.message || 'Erro inesperado.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Título */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
          Configurações da Conta
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Personalize sua aparência, dados do perfil profissional e credenciais de segurança.
        </p>
      </div>

      {/* Controle de Abas (Responsivo no celular) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800" role="tablist">
        <button
          type="button"
          role="tab"
          id="tab-appearance"
          aria-selected={activeTab === 'appearance'}
          onClick={() => setActiveTab('appearance')}
          className={`flex min-h-[44px] cursor-pointer items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'appearance'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Paintbrush className="h-4 w-4" />
          <span>Aparência</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-profile"
          aria-selected={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
          className={`flex min-h-[44px] cursor-pointer items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Perfil</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-security"
          aria-selected={activeTab === 'security'}
          onClick={() => setActiveTab('security')}
          className={`flex min-h-[44px] cursor-pointer items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Segurança</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 1. SEÇÃO APARÊNCIA */}
      {/* ==================================================================== */}
      {activeTab === 'appearance' && (
        <section aria-labelledby="heading-appearance" className="space-y-6 animate-fade-in">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h3 id="heading-appearance" className="text-sm font-bold text-slate-900 dark:text-white">
              Tema da Interface
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Escolha como deseja visualizar a Central de Service Desk. No primeiro acesso, o sistema segue a preferência do seu dispositivo.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Opção Modo Claro */}
              <div
                onClick={() => setTheme('light')}
                className={`flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                  !isDark
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 dark:bg-blue-950/40'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sun className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Modo Claro</span>
                  </div>
                  {!isDark && <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Visual clássico limpo com fundo branco e contraste suave para ambientes iluminados.
                </p>
              </div>

              {/* Opção Modo Escuro */}
              <div
                onClick={() => setTheme('dark')}
                className={`flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                  isDark
                    ? 'border-blue-600 bg-blue-950/40 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Moon className="h-5 w-5 text-blue-400" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Modo Escuro</span>
                  </div>
                  {isDark && <CheckCircle2 className="h-5 w-5 text-blue-400" />}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Interface escurecida (Slate 900) para menor cansaço visual em jornadas prolongadas.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* 2. SEÇÃO PERFIL */}
      {/* ==================================================================== */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6 animate-fade-in">
          {/* Foto de Perfil */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Foto de Perfil</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Envie uma foto quadrada (PNG, JPG ou WebP) de até 1 MB. Ela será exibida na sidebar, chamados e comentários.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group shrink-0">
                <Avatar
                  name={name || currentUser?.name || 'Usuário'}
                  avatarUrl={avatarPreview || currentUser?.avatarUrl}
                  size="xl"
                />
              </div>

              <div className="space-y-2.5 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <label
                    htmlFor={fileInputId}
                    className="btn-secondary min-h-[44px] sm:min-h-[38px] text-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Selecionar Foto</span>
                  </label>
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />

                  {(avatarPreview || currentUser?.avatarUrl) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="btn-ghost-danger min-h-[44px] sm:min-h-[38px] text-xs inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Remover Foto</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  Sem foto, o sistema exibirá automaticamente suas iniciais sobre um gradiente exclusivo.
                </p>
              </div>
            </div>
          </div>

          {/* Dados Cadastrais */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Informações Pessoais</h3>

            {/* Nome */}
            <div>
              <label htmlFor="settings-profile-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Nome Completo <span className="text-rose-500">*</span>
              </label>
              <input
                id="settings-profile-name"
                type="text"
                value={name}
                minLength={2}
                maxLength={80}
                required
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* E-mail Atual e Troca */}
            <div>
              <label htmlFor="settings-profile-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                E-mail de Acesso
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="settings-profile-email"
                  type="email"
                  disabled
                  value={currentUser?.email || ''}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-500 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                />
              </div>

              {emailPending && (
                <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Aguardando confirmação enviada para <strong>{pendingEmailAddress}</strong>. Até confirmar, seu e-mail atual continuará valendo.
                  </span>
                </div>
              )}

              <div className="mt-3">
                <label htmlFor="settings-new-email" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Alterar para novo endereço de e-mail:
                </label>
                <input
                  id="settings-new-email"
                  type="email"
                  placeholder="novo.email@tecnosystem.com.br"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Departamento */}
            <div>
              <label htmlFor="settings-department" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Departamento
              </label>
              <div className="mt-1.5">
                <select
                  id="settings-department"
                  value={department}
                  disabled={!hasDepartmentChangePerm}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                  className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2 text-sm outline-none transition ${
                    hasDepartmentChangePerm
                      ? 'border-slate-200 bg-white text-slate-800 focus:border-blue-500 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                {!hasDepartmentChangePerm && (
                  <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Apenas a presidência altera o departamento.
                  </p>
                )}
              </div>
            </div>

            {/* Botão Salvar Perfil */}
            <div className="pt-2">
              <button
                id="btn-save-profile-settings"
                type="submit"
                disabled={isSavingProfile}
                className="btn-primary min-h-[44px] text-xs px-5 py-2.5"
              >
                {isSavingProfile ? 'Salvando...' : 'Salvar Alterações de Perfil'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ==================================================================== */}
      {/* 3. SEÇÃO SEGURANÇA (ALTERAR SENHA) */}
      {/* ==================================================================== */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="space-y-6 animate-fade-in">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Alteração de Senha</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Para sua segurança, reautentique com sua senha atual antes de definir a nova combinação de acesso.
            </p>

            {/* Senha Atual */}
            <div>
              <label htmlFor="settings-current-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Senha Atual <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  id="settings-current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pr-10 pl-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Nova Senha */}
            <div>
              <label htmlFor="settings-new-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Nova Senha <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  id="settings-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pr-10 pl-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Indicador de Força */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength < 40
                          ? 'bg-rose-500 w-1/4'
                          : passwordStrength < 75
                          ? 'bg-amber-500 w-2/4'
                          : 'bg-emerald-500 w-full'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Força da senha: {passwordStrength < 40 ? 'Fraca' : passwordStrength < 75 ? 'Média' : 'Forte'} (mín. 8 caracteres, números e letras)
                  </span>
                </div>
              )}
            </div>

            {/* Confirmação da Nova Senha */}
            <div>
              <label htmlFor="settings-confirm-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Confirmar Nova Senha <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  id="settings-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pr-10 pl-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Botão Atualizar Senha */}
            <div className="pt-2">
              <button
                id="btn-update-password-settings"
                type="submit"
                disabled={isChangingPassword}
                className="btn-primary min-h-[44px] text-xs px-5 py-2.5"
              >
                {isChangingPassword ? 'Atualizando...' : 'Atualizar Minha Senha'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
