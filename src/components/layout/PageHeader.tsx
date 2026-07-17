import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconArrowLeft } from "../icons";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, backTo, backLabel, actions }: PageHeaderProps) {
  return (
    <div className={styles.wrap}>
      <div>
        {backTo && (
          <Link to={backTo} className={styles.back}>
            <IconArrowLeft width={16} height={16} />
            {backLabel ?? "Volver"}
          </Link>
        )}
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
