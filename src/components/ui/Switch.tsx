import styles from "./Switch.module.css";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  hint?: string;
}

export function Switch({ checked, onChange, label, hint }: SwitchProps) {
  return (
    <label className={styles.wrap}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={[styles.track, checked ? styles.checked : ""].join(" ")}>
        <span className={styles.knob} />
      </span>
      {label && (
        <span>
          <span className={styles.label}>{label}</span>
          {hint && <span className={styles.hint}>{hint}</span>}
        </span>
      )}
    </label>
  );
}
