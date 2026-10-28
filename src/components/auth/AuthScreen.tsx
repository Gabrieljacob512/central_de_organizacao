import {
  AlertCircle,
  ArrowRight,
  Database,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import type { AuthResult } from '../../hooks/useCurrentUser';
import type { UserProfile } from '../../types/ticket';
import { ThemeToggle } from '../ui/ThemeToggle';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<AuthResult> | AuthResult;
  onSuccess: (user: UserProfile) => void;
  showToast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

interface DemoAccount {
  name: string;
  role: string;
  department: string;
  email: string;
  pass: string;
  badgeClass: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: 'Presidente',
    role: 'Presidente',
    department: 'Administração',
    email: 'presidente@gmail.com',
    pass: 'presidente123',
    badgeClass: 'border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-200',
  },
  {
    name: 'Vice-pres.',
    role: 'Vice-presidente',
    department: 'Adm & Projetos',
    email: 'vicepresidente@gmail.com',
    pass: 'vicepresidente123',
    badgeClass: 'border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-200',
  },
  {
    name: 'Diretor',
    role: 'Diretor',
    department: 'Financeiro',
    email: 'diretor@gmail.com',
    pass: 'diretor123',
    badgeClass: 'border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-200',
  },
  {
    name: 'Membro',
    role: 'Membro',
    department: 'RH & Pessoas',
    email: 'membro@gmail.com',
    pass: 'membro123',
    badgeClass: 'border-purple-200 bg-purple-50/80 hover:bg-purple-100 text-purple-900 dark:border-purple-900/60 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 dark:text-purple-200',
  },
];

export function AuthScreen({
  onLogin,
  onSuccess,
  showToast,
}: AuthScreenProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulário de Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  /* ------------------------------- Handlers ------------------------------- */

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const email = loginEmail.trim().toLowerCase();
    const pass = loginPassword.trim();

    if (!email || !pass) {
      setErrorMsg('Por favor, preencha o e-mail corporativo e a senha.');
      return;
    }

    setLoading(true);
    try {
      const result = await onLogin(email, pass);
      if (!result.success) {
        setErrorMsg(result.error ?? 'E-mail ou senha incorretos.');
      } else if (result.user) {
        showToast.success('Acesso autorizado', `Bem-vindo(a), ${result.user.name}!`);
        onSuccess(result.user);
      }
    } finally {
      setLoading(false);
    }
  };

  /** Preenche e-mail e senha ao clicar em uma conta de demonstração */
  const handleSelectDemoAccount = (acc: DemoAccount) => {
    setErrorMsg(null);
    setLoginEmail(acc.email);
    setLoginPassword(acc.pass);
    passwordInputRef.current?.focus();
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

          {/* Aviso fixo e discreto de modo demonstração */}
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
            <Database className="h-3 w-3 text-blue-500" />
            <span>Modo demonstração: os dados ficam salvos neste navegador</span>
          </div>
        </div>

        {/* Card Principal de Autenticação */}
        <div className="mt-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900 transition-all">
          <div className="mb-5 border-b border-slate-100 pb-4 dark:border-slate-800 text-center">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Entrar na Plataforma</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Informe suas credenciais para acessar os chamados e serviços
            </p>
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

          {/* Formulário de Login */}
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
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Senha de Acesso
              </label>
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
              className="btn-primary w-full justify-center py-2.5 text-sm font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Acessando...' : 'Acessar Plataforma'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Painel: Contas de Demonstração (4 contas oficiais) */}
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
              <p className="text-center text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500 mb-2.5">
                Contas de demonstração (clique para preencher)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    id={`quick-login-${acc.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => handleSelectDemoAccount(acc)}
                    className={`flex min-h-[50px] flex-col items-center justify-center rounded-xl border p-2 text-center transition cursor-pointer ${acc.badgeClass}`}
                    title={`Preencher credenciais de ${acc.name} (${acc.role})`}
                  >
                    <span className="text-xs font-bold leading-tight">{acc.name}</span>
                    <span className="text-[10px] opacity-80 leading-tight mt-0.5">{acc.department}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Informação sobre cadastro */}
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
              <span className="flex items-center justify-center gap-1.5 font-medium">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>Cadastros de novos colaboradores são realizados exclusivamente pela Diretoria e RH.</span>
              </span>
            </div>
          </form>
        </div>

        {/* Rodapé institucional */}
        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Tecno System · Sistema de Service Desk & Gestão de Incidentes
        </p>
      </div>
    </div>
  );
}
