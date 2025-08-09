import React from "react";
import styles from "./Panels.module.css";

export default function PanelToggle({ side = "left", open, onClick }) {
  // rotate when (left && open) OR (right && !open)
  const shouldRotate = side === "left" ? open : !open;
  const sideClass = side === "left" ? styles.leftToggle : styles.rightToggle;

  return (
    <button
      aria-label={`Toggle ${side} panel`}
      className={`${styles.toggle} ${sideClass} ${shouldRotate ? styles.rotate : ""}`}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
        <path d="M9.29 6.71a1 1 0 0 0 0 1.41L12.17 11l-2.88 2.88a1 1 0 1 0 1.42 1.41l3.59-3.59a1 1 0 0 0 0-1.41L10.71 6.7a1 1 0 0 0-1.42 0z"/>
      </svg>
    </button>
  );
}

