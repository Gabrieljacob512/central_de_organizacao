import { useContext } from 'react';
import { ToastContext, type ToastContextValue } from '../context/toast-context';

/** Acesso às notificações toast (success, error, warning, info). */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de <ToastProvider>.');
  return context;
}
