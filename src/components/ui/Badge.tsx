import type { ReactNode } from "react";
import styles from "./Badge.module.css";

interface BadgeProps {
  tone?: "neutral" | "accent" | "tier" | "success" | "warning" | "critical";
  dot?: boolean;
  children: ReactNode;
}

export function Badge({ tone = "neutral", dot = false, children }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[tone]].join(" ")}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}
