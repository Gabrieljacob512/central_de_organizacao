import { Plus } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNewTicket: () => void;
}

/**
 * Cabeçalho ultra-limpo e focado da tela principal (Requisito 3):
 * 1. Botão de 3 traços horizontais minimalistas (hambúrguer idêntico);
 * 2. Logo e nome da Tecno System;
 * 3. Botão "+ Novo Chamado".
 * Todos os outros controles foram movidos integralmente para a gaveta lateral (Drawer).
 */
export function Header({ onToggleSidebar, onNewTicket }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3.5 sm:gap-4">
          {/* 1. Botão com ESTRITAMENTE 3 traços horizontais minimalistas */}
          <button
            id="menu-hamburger-btn"
            type="button"
            onClick={onToggleSidebar}
            className="group flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-xl border border-slate-200/90 bg-slate-50/80 transition-all hover:border-blue-400 hover:bg-blue-50/60 active:scale-95 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-blue-500/80 dark:hover:bg-slate-800 shadow-2xs"
            aria-label="Abrir menu de navegação"
            title="Abrir menu lateral"
          >
            <span className="block h-[2.5px] w-5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-600 dark:bg-slate-200 dark:group-hover:bg-blue-400" />
            <span className="block h-[2.5px] w-5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-600 dark:bg-slate-200 dark:group-hover:bg-blue-400" />
            <span className="block h-[2.5px] w-5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-600 dark:bg-slate-200 dark:group-hover:bg-blue-400" />
          </button>

          {/* 2. Logo e Nome da Tecno System */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/logo-tecnosystem.png"
              alt="Logo Tecno System"
              className="h-9 w-9 object-contain rounded-xl shadow-xs"
              onError={(e) => {
                e.currentTarget.src = '/logo-tecnosystem.svg';
              }}
            />
            <div>
              <h1 className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  Tecno<span className="text-red-600 dark:text-red-500">System</span>
                </span>
                <span className="hidden sm:inline-block rounded-full bg-red-50 dark:bg-red-950/70 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60">
                  Service Desk
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block leading-tight">
                Central Corporativa de Chamados & Suporte
              </p>
            </div>
          </div>
        </div>

        {/* 3. Botão "+ Novo Chamado" */}
        <div className="flex items-center gap-2">
          <button
            id="open-new-ticket"
            type="button"
            onClick={onNewTicket}
            className="btn-primary min-h-[44px] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Chamado</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>
    </header>
  );
}
