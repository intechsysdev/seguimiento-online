import type { ReactNode } from "react";
import styles from "./Alert.module.css";

interface AlertProps {
  tone?: "info" | "success" | "warning" | "critical";
  children: ReactNode;
}

export function Alert({ tone = "info", children }: AlertProps) {
  return (
    <p className={[styles.alert, styles[tone]].join(" ")} role="alert">
      {children}
    </p>
  );
}
