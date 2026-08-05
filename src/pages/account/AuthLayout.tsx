import type { ReactNode } from "react";
import { LogoMarca } from "../../components/Logo";
import { APP_COPYRIGHT, APP_NOMBRE, APP_VERSION } from "../../config/app";
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
      {/*
        Sustituye a la ilustracion signin.svg de la plantilla Volt por un fondo
        propio: una malla de rutas y paradas dibujada en SVG. Al ir en linea no
        depende de descargas ni de los assets de la plantilla original.
      */}
      <svg className={styles.fondo} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="rejilla" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0v48" fill="none" stroke="currentColor" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#rejilla)" opacity="0.5" />
        <g className={styles.rutas} fill="none" strokeWidth="2.5" strokeLinecap="round">
          <path d="M-40 220 C 160 120, 260 320, 460 210 S 760 90, 980 200" />
          <path d="M-40 420 C 200 340, 300 520, 540 430 S 820 320, 1080 400" />
        </g>
        <g className={styles.paradas}>
          <circle cx="160" cy="168" r="6" />
          <circle cx="460" cy="210" r="6" />
          <circle cx="760" cy="140" r="6" />
          <circle cx="300" cy="470" r="6" />
          <circle cx="640" cy="378" r="6" />
        </g>
      </svg>

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

      <p className={styles.legal}>
        {APP_COPYRIGHT}
        <span>Versión: {APP_VERSION}</span>
      </p>
    </div>
  );
}
