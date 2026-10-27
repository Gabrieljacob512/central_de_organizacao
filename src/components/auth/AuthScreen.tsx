import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import type { AuthResult } from '../../hooks/useCurrentUser';
import type { UserProfile } from '../../types/ticket';
import { ThemeToggle } from '../ui/ThemeToggle';

type AuthMode = 'login' | 'forgot';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<AuthResult> | AuthResult;
  onResetPassword: (email: string, newPassword: string) => Promise<AuthResult> | AuthResult;
  onSuccess: (user: UserProfile) => void;
  showToast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

/**
 * Tela de Autenticação Obrigatória (Requisito 1).
 * Não permite auto-cadastro (cadastro livre removido).
 * Apenas:
 * 1. Formulário de Login (E-mail e Senha);
 * 2. Fluxo "Esqueci minha senha / Redefinir";
 * 3. Acesso rápido com os 3 seed users obrigatórios (Presidente, Diretor de RH e Membro de TI).
 */
export function AuthScreen({
  onLogin,
  onResetPassword,
  onSuccess,
  showToast,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulário de Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Formulário de Redefinição
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  /* ------------------------------- Handlers ------------------------------- */

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMsg('Por favor, preencha o e-mail corporativo e a senha.');
      return;
    }

    setLoading(true);
    try {
      const result = await onLogin(loginEmail, loginPassword);
      if (!result.success) {
        setErrorMsg(result.error ?? 'Credenciais inválidas. Verifique seu e-mail e senha.');
      } else if (result.user) {
        showToast.success('Acesso autorizado', `Bem-vindo(a), ${result.user.name}!`);
        onSuccess(result.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!resetEmail.trim() || !resetNewPassword.trim()) {
      setErrorMsg('Informe o e-mail cadastrado e a nova senha.');
      return;
    }

    setLoading(true);
    try {
      const result = await onResetPassword(resetEmail, resetNewPassword);
      if (!result.success) {
        setErrorMsg(result.error ?? 'Falha ao redefinir a senha.');
      } else {
        showToast.success(
          'Solicitação enviada!',
          'Se o e-mail estiver cadastrado, as instruções foram enviadas para sua caixa de entrada.',
        );
        setLoginEmail(resetEmail);
        setMode('login');
        setErrorMsg(null);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Acesso rápido para contas de demonstração (somente DEV).
   * Preenche apenas o e-mail: a senha NÃO fica no código. Ela vem de SEED_DEFAULT_PASSWORD
   * (definida no .env e aplicada por `npm run dev:reset-users`).
   */
  const handleQuickSeed = (email: string) => {
    setErrorMsg(null);
    setLoginEmail(email);
    setLoginPassword('');
    requestAnimationFrame(() => passwordInputRef.current?.focus());
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 dark:bg-slate-950 transition-colors duration-200">
      {/* Botão de alternância de tema no topo direito */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle variant="icon" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Identidade Corporativa Tecno System */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <img
              src="/logo-tecnosystem.png"
              alt="Logo Tecno System"
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.src = '/logo-tecnosystem.svg';
              }}
            />
          </div>

          <h1 className="font-display text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Tecno<span className="text-red-600 dark:text-red-500">System</span>
          </h1>
          <p className="mt-1 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Central Corporativa de Service Desk
          </p>
        </div>

        {/* Card Principal de Autenticação */}
        <div className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900 transition-all">
          {/* Navegação Simplificada (Apenas Entrar e Redefinir) */}
          <div className="mb-6 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
            <button
              id="tab-login"
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Entrar na Plataforma
            </button>
            <button
              id="tab-forgot"
              type="button"
              onClick={() => {
                setMode('forgot');
                setErrorMsg(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                mode === 'forgot'
                  ? 'bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Esqueci Minha Senha
            </button>
          </div>

          {/* Alerta Visual de Erro */}
          {errorMsg && (
            <div
              id="auth-error-alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 animate-shake"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ==================================================================== */}
          {/* MODO 1: ENTRAR (LOGIN OBRIGATÓRIO) */}
          {/* ==================================================================== */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="ex: presidente@gmail.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                  >
                    Esqueci minha senha / Redefinir
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    id="login-password"
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-10 pl-10 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-2.5 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5 text-sm font-bold shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                <span>{loading ? 'Acessando...' : 'Acessar Plataforma'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* Botões Rápidos para Contas de Demonstração (Exclusivo para Ambiente de Desenvolvimento) */}
              {import.meta.env.DEV && (
                <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <p className="text-center text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500 mb-2.5">
                    Acesso rápido para testes (Seed Dev)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* 1. Presidente */}
                    <button
                      type="button"
                      id="quick-login-presidente"
                      onClick={() => handleQuickSeed('presidente@gmail.com')}
                      className="flex min-h-[46px] flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50/80 p-2 text-center transition hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200">Presidente</span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400">Administração</span>
                    </button>

                    {/* 2. Vice-presidente */}
                    <button
                      type="button"
                      id="quick-login-vp"
                      onClick={() => handleQuickSeed('vicepresidente@tecnosystem.com')}
                      className="flex min-h-[46px] flex-col items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50/80 p-2 text-center transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Vice-pres.</span>
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-400">Adm & Projetos</span>
                    </button>

                    {/* 3. Diretor de RH */}
                    <button
                      type="button"
                      id="quick-login-rh"
                      onClick={() => handleQuickSeed('rh@tecnosystem.com')}
                      className="flex min-h-[46px] flex-col items-center justify-center rounded-xl border border-purple-200 bg-purple-50/80 p-2 text-center transition hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-purple-900 dark:text-purple-200">Diretor RH</span>
                      <span className="text-[10px] text-purple-700 dark:text-purple-400">RH & Pessoas</span>
                    </button>

                    {/* 4. Membro de Projetos */}
                    <button
                      type="button"
                      id="quick-login-projetos"
                      onClick={() => handleQuickSeed('projetos@tecnosystem.com')}
                      className="flex min-h-[46px] flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50/80 p-2 text-center transition hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-200">Projetos</span>
                      <span className="text-[10px] text-blue-700 dark:text-blue-400">Membro</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Informação sobre cadastro */}
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                <span className="flex items-center justify-center gap-1.5 font-medium">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>Cadastros de novos colaboradores são realizados exclusivamente pela Diretoria e RH.</span>
                </span>
              </div>
            </form>
          )}

          {/* ==================================================================== */}
          {/* MODO 2: REDEFINIR SENHA (ESQUECI A SENHA) */}
          {/* ==================================================================== */}
          {mode === 'forgot' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                <p className="font-semibold">Recuperação de Credenciais</p>
                <p className="mt-0.5 text-[11px] text-blue-700 dark:text-blue-400">
                  Informe o e-mail corporativo cadastrado e defina imediatamente sua nova senha de acesso.
                </p>
              </div>

              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  E-mail Corporativo Cadastrado *
                </label>
                <div className="relative">
                  <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="ex: ti@tecnosystem.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reset-new-password"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Nova Senha de Acesso *
                </label>
                <div className="relative">
                  <KeyRound className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-10 pl-10 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-2.5 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-reset-submit"
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5 text-sm font-bold shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{loading ? 'Enviando...' : 'Salvar Nova Senha'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer py-1"
              >
                Voltar para o Login
              </button>
            </form>
          )}
        </div>

        {/* Rodapé institucional */}
        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Tecno System · Sistema de Service Desk & Gestão de Incidentes
        </p>
      </div>
    </div>
  );
}
