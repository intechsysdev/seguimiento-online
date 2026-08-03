import type { ReactNode } from "react";
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
      <main className={styles.card}>
        <header className={styles.head}>
          <p className={styles.marca}>Seguimiento Online</p>
          <h1 className={styles.titulo}>{titulo}</h1>
          {descripcion ? <p className={styles.desc}>{descripcion}</p> : null}
        </header>
        {children}
        {pie ? <footer className={styles.pie}>{pie}</footer> : null}
      </main>
    </div>
  );
}
