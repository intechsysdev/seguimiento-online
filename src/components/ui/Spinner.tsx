import styles from "./Spinner.module.css";

export function Spinner({ mensaje }: { mensaje?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={styles.dot} />
      {mensaje ? <span className={styles.texto}>{mensaje}</span> : null}
    </div>
  );
}
