import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  value: number;
  max: number;
  tone?: "accent" | "tier" | "success" | "warning";
}

export function ProgressBar({ value, max, tone = "accent" }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={[styles.track, styles[tone]].join(" ")} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={styles.fill} style={{ width: `${pct}%` }} />
    </div>
  );
}
