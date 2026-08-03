import { useEffect, useRef, type ReactNode } from "react";
import { IconX } from "../icons";
import styles from "./Modal.module.css";

interface ModalProps {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: string;
}

export function Modal({ abierto, titulo, descripcion, onCerrar, children, ancho }: ModalProps) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    if (abierto && !elemento.open) elemento.showModal();
    if (!abierto && elemento.open) elemento.close();
  }, [abierto]);

  if (!abierto) return null;

  return (
    <dialog
      ref={dialogo}
      className={styles.dialogo}
      style={ancho ? { maxWidth: ancho } : undefined}
      onCancel={(evento) => {
        evento.preventDefault();
        onCerrar();
      }}
    >
      <header className={styles.head}>
        <div>
          <h3 className={styles.titulo}>{titulo}</h3>
          {descripcion ? <p className={styles.desc}>{descripcion}</p> : null}
        </div>
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
          <IconX />
        </button>
      </header>
      <div className={styles.cuerpo}>{children}</div>
    </dialog>
  );
}
