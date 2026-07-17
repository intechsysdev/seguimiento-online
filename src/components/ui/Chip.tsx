import type { ReactNode } from "react";
import styles from "./Chip.module.css";

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function Chip({ selected, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[styles.chip, selected ? styles.selected : ""].join(" ")}
      aria-pressed={selected}
    >
      {children}
    </button>
  );
}
