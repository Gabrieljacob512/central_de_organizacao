import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant?: 'danger' | 'warning';
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo de confirmação para ações destrutivas ou irreversíveis. */
export function ConfirmDialog({ open, title, message, confirmLabel, variant = 'danger', children, onConfirm, onCancel }: ConfirmDialogProps) {
  const iconStyle =
    variant === 'danger'
      ? 'bg-rose-50 text-rose-600 ring-4 ring-rose-100 dark:bg-rose-950/60 dark:text-rose-400 dark:ring-rose-900/40'
      : 'bg-amber-50 text-amber-600 ring-4 ring-amber-100 dark:bg-amber-950/60 dark:text-amber-400 dark:ring-amber-900/40';

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      icon={
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
          <TriangleAlert className="h-5 w-5" />
        </span>
      }
      footer={
        <>
          <button id="confirm-dialog-cancel" type="button" className="btn-secondary" onClick={onCancel} autoFocus>
            Cancelar
          </button>
          <button id="confirm-dialog-confirm" type="button" className={variant === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
      {children}
    </Modal>
  );
}
