import { IconAlert } from "../icons";
import { Button } from "./Button";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Eliminar", onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className={styles.iconWrap}>
          <IconAlert />
        </div>
        <div>
          <p className={styles.title}>{title}</p>
          <p className={styles.message}>{message}</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
