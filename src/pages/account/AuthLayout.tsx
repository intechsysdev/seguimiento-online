import type { ReactNode } from "react";
import { LogoMarca } from "../../components/Logo";
import { PieLegal } from "../../components/PieLegal";
import { APP_NOMBRE } from "../../config/app";
import { AuthBackdrop } from "./AuthBackdrop";
import styles from "./AuthLayout.module.css";

interface AuthLayoutProps {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  pie?: ReactNode;
}

/** Reemplaza a las vistas de Account que en el MVC usaban `Layout = null`. */
export function AuthLayout({ titulo, descripcion, children, pie }: AuthLayoutProps) {
  return (
    <div className={styles.wrap}>
      <AuthBackdrop />

      <main className={styles.card}>
        <header className={styles.head}>
          <span className={styles.logo}>
            <LogoMarca size={44} />
          </span>
          <p className={styles.marca}>{APP_NOMBRE}</p>
          <h1 className={styles.titulo}>{titulo}</h1>
          {descripcion ? <p className={styles.desc}>{descripcion}</p> : null}
        </header>
        {children}
        {pie ? <footer className={styles.pie}>{pie}</footer> : null}
      </main>

      <div className={styles.legal}>
        <PieLegal />
      </div>
    </div>
  );
}
