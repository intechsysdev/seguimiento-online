import type { ReactNode } from "react";
import styles from "./Field.module.css";

interface FieldProps {
  label: string;
  optional?: boolean;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, optional, hint, htmlFor, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label} {optional && <span className={styles.optional}>(opcional)</span>}
      </label>
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
