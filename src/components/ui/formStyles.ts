/** Classes padrão para inputs, selects e textareas, com estado de erro e suporte a modo escuro. */
export function inputClass(hasError?: boolean): string {
  return [
    'w-full min-h-[44px] sm:min-h-[38px] rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400',
    'outline-none transition duration-150 shadow-2xs focus:ring-4',
    'dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
    hasError
      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 text-rose-900 bg-rose-50/20 dark:border-rose-500/50 dark:bg-rose-950/20 dark:text-rose-200'
      : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-700/80 dark:hover:border-slate-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20',
  ].join(' ');
}
