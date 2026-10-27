import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Wrapper de campo de formulário com label, indicação de obrigatório e mensagem de erro visual. */
export function FormField({ label, htmlFor, required, error, hint, className = '', children }: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500 font-bold">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 flex animate-fade-in items-center gap-1.5 text-xs font-medium text-rose-600" role="alert">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && <div className="mt-1.5 text-xs text-slate-500">{hint}</div>
      )}
    </div>
  );
}
