import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm" | "icon";
  children?: ReactNode;
}

export function Button({ variant = "secondary", size = "md", className, children, ...rest }: ButtonProps) {
  const sizeClass = size === "sm" ? styles.sm : size === "icon" ? styles.icon : "";
  return (
    <button className={[styles.btn, styles[variant], sizeClass, className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </button>
  );
}
