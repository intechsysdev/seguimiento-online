import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconGift, IconMoon, IconSun } from "../icons";
import { useTheme } from "./useTheme";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <span className={styles.brandMark}>
              <IconGift />
            </span>
            <span className={styles.brandText}>
              <h1>Bonificados</h1>
              <span>Trade Marketing · RECAMIER</span>
            </span>
          </Link>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggle}
            aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          >
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
