import React, { useMemo } from "react";
import styles from "./AppLayout.module.css";
import usePanelState from "../../hooks/usePanelState";
import LeftPanel from "../Panels/LeftPanel";
import RightPanel from "../Panels/RightPanel";
import MapView from "../Map/MapView";
import MiniQubitX from "./MiniQubitX"; // <-- add this

export default function AppLayout() {
  const { isLeftOpen, isRightOpen, toggleLeft, toggleRight } = usePanelState();

  const cssVars = useMemo(
    () => ({
      "--left-col": isLeftOpen ? "380px" : "0px",
      "--right-col": isRightOpen ? "380px" : "0px",
    }),
    [isLeftOpen, isRightOpen]
  );

  return (
    <div className={styles.wrapper} style={cssVars}>
      <div className={styles.cardContainer}>
        <header className={styles.header}>
          <MiniQubitX /> {/* 👈 replaces <strong>QubitX</strong> */}
        </header>

        <div className={styles.shell}>
          <LeftPanel open={isLeftOpen} onToggle={toggleLeft} />
          <main className={styles.center}>
            <MapView />
          </main>
          <RightPanel open={isRightOpen} onToggle={toggleRight} />
        </div>
      </div>
    </div>
  );
}
