import React, { useState, useCallback } from "react";
import styles from "./FloatingParams.module.css";
import useDraggable from "../../hooks/useDraggable";
import { loadCities } from "../../data/loadCities";
import { setProblemParams, setProblemCities, setProblemDemands } from "../../store/problemStore";
/**
 * Draggable black gear button + expandable sheet.
 * On "Generate Problem": updates the global store with {capacity, fleet, depots, cities}.
 * Also calls onGenerate({capacity, fleet, depots}) so MapView can plot the same cities.
 */
// Exact demands for 22 depots (1-based rows -> index 0..21)
const DEMANDS_22 = [
  0,   // 1
  1100,// 2
  700, // 3
  800, // 4
  1400,// 5
  2100,// 6
  400, // 7
  800, // 8
  100, // 9
  500, // 10
  600, // 11
  1200,// 12
  1300,// 13
  1300,// 14
  300, // 15
  900, // 16
  2100,// 17
  1000,// 18
  900, // 19
  2500,// 20
  1800,// 21
  700, // 22
];
const DEMANDS_33 = [
  0,    // 1
  700,  // 2
  400,  // 3
  400,  // 4
  1200, // 5
  40,   // 6
  80,   // 7
  2000, // 8
  900,  // 9
  600,  // 10
  750,  // 11
  1500, // 12
  150,  // 13
  250,  // 14
  1600, // 15
  450,  // 16
  700,  // 17
  550,  // 18
  650,  // 19
  200,  // 20
  400,  // 21
  300,  // 22
  1300, // 23
  700,  // 24
  750,  // 25
  1400, // 26
  4000, // 27
  600,  // 28
  1000, // 29
  500,  // 30
  2500, // 31
  1700, // 32
  1100  // 33
];
const DEMANDS_76 = [
  0,  // 1
  18, // 2
  26, // 3
  11, // 4
  30, // 5
  21, // 6
  19, // 7
  15, // 8
  16, // 9
  29, // 10
  26, // 11
  37, // 12
  16, // 13
  12, // 14
  31, // 15
  8,  // 16
  19, // 17
  20, // 18
  13, // 19
  15, // 20
  22, // 21
  28, // 22
  12, // 23
  6,  // 24
  27, // 25
  14, // 26
  18, // 27
  17, // 28
  29, // 29
  13, // 30
  22, // 31
  25, // 32
  28, // 33
  27, // 34
  19, // 35
  10, // 36
  12, // 37
  14, // 38
  24, // 39
  16, // 40
  33, // 41
  15, // 42
  11, // 43
  18, // 44
  17, // 45
  21, // 46
  27, // 47
  19, // 48
  20, // 49
  5,  // 50
  22, // 51
  12, // 52
  19, // 53
  22, // 54
  16, // 55
  7,  // 56
  26, // 57
  14, // 58
  21, // 59
  24, // 60
  13, // 61
  15, // 62
  18, // 63
  11, // 64
  28, // 65
  9,  // 66
  37, // 67
  30, // 68
  10, // 69
  8,  // 70
  11, // 71
  3,  // 72
  1,  // 73
  6,  // 74
  10, // 75
  20  // 76
];


export default function FloatingParams({ parentRef, onGenerate }) {
  const { pos, startDrag } = useDraggable(parentRef, { x: 24, y: 24 });
  const [open, setOpen] = useState(false);

  // keep strings so user can type freely; we will parse on Generate
  const [capacityStr, setCapacityStr] = useState("4000");
  const [fleetStr, setFleetStr] = useState("4");
  const [depots, setDepots] = useState(22);

  const toInt = (s, def = 0) => {
    const n = parseInt(String(s).replace(/\D/g, "") || `${def}`, 10);
    return Number.isFinite(n) ? n : def;
  };
  const bump = (setter, curStr, delta) =>
    setter(String(Math.max(0, (parseInt(curStr || "0", 10) || 0) + delta)));

  const handleGenerate = useCallback(async () => {
    // 1) parse local fields
    const capacity = toInt(capacityStr, 500);
    const fleet    = toInt(fleetStr, 4);
    const n        = Number(depots) || 0;

    // 2) load cities & select first n
    const all    = await loadCities();
    const chosen = all.slice(0, n);

    // 3) attach DEMANDS
    let withDemands;
    if (n === 22) {
      withDemands = chosen.map((c, idx) => ({
        id: Number(c.id),
        name: c.name,
        lat: c.lat,
        lng: c.lon,
        demand: DEMANDS_22[idx] ?? 0,
      }));
    } else if (n === 33) {
      withDemands = chosen.map((c, idx) => ({
        id: Number(c.id),
        name: c.name,
        lat: c.lat,
        lng: c.lon,
        demand: DEMANDS_33[idx] ?? 0,
      }));
    } else if (n === 76) {
      withDemands = chosen.map((c, idx) => ({
        id: Number(c.id),
        name: c.name,
        lat: c.lat,
        lng: c.lon,
        demand: DEMANDS_76[idx] ?? 0,
      }));
    } else {
      // fallback: random or 0 demand
      withDemands = chosen.map((c) => ({
        id: Number(c.id),
        name: c.name,
        lat: c.lat,
        lng: c.lon,
        demand: Math.floor(Math.random() * 500) + 1,
      }));
    }

    // 4) build a { id: demand } map for FastAPI payload
    const demandMap = Object.fromEntries(withDemands.map(c => [String(c.id), c.demand]));

    // 5) update global store
    setProblemParams({ depots: n, capacity, fleet });
    setProblemCities(withDemands);
    setProblemDemands(demandMap);

    // 6) notify map to re-read and plot (tooltips will show demand)
    onGenerate?.({ capacity, fleet, depots: n });
  }, [capacityStr, fleetStr, depots, onGenerate]);



  return (
    <div className={styles.fabWrap} style={{ left: pos.x, top: pos.y }}>
      {/* Draggable black gear */}
      <div
        className={styles.fab}
        onMouseDown={startDrag}
        onClick={() => setOpen(v => !v)}
        title="Problem Parameters"
      >
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.14 12.94a7.14 7.14 0 0 0 .05-.94 7.14 7.14 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.15 7.15 0 0 0-1.63-.94l-.36-2.55A.5.5 0 0 0 13.4 1h-3.8a.5.5 0 0 0-.49.42l-.36 2.55a7.15 7.15 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L1.2 7.01a.5.5 0 0 0 .12.64L3.35 9.23c-.03.31-.05.62-.05.94s.02.63.05.94L1.32 12.7a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.33.64.22l2.39-.96c.5.39 1.04.71 1.63.94l.36 2.55c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.55c.59-.23 1.13-.55 1.63-.94l2.39.96c.24.11.51.01.64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/>
        </svg>
      </div>

      {open && (
        <div className={styles.sheet}>
          <div className={styles.header}>
            <span>Problem Parameters</span>
            <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          <div className={styles.field}>
            <div className={styles.label}>Vehicle Capacity</div>
            <div className={styles.numInput}>
              <input
                type="text"
                inputMode="numeric"
                value={capacityStr}
                onChange={(e) => setCapacityStr(e.target.value)}
              />
              <div className={styles.stepper}>
                <button onClick={() => bump(setCapacityStr, capacityStr, +10)}>▲</button>
                <button onClick={() => bump(setCapacityStr, capacityStr, -10)}>▼</button>
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.label}>Fleet Size</div>
            <div className={styles.numInput}>
              <input
                type="text"
                inputMode="numeric"
                value={fleetStr}
                onChange={(e) => setFleetStr(e.target.value)}
              />
              <div className={styles.stepper}>
                <button onClick={() => bump(setFleetStr, fleetStr, +1)}>▲</button>
                <button onClick={() => bump(setFleetStr, fleetStr, -1)}>▼</button>
              </div>
            </div>
          </div>

          <div className={styles.field} style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className={styles.label}>Number of Depots</div>
            <div className={styles.radioGroup}>
              {[22, 33, 76].map(n => (
                <label key={n}>
                  <input
                    type="radio"
                    name="depots"
                    checked={depots === n}
                    onChange={() => setDepots(n)}
                  /> {n}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.primaryBtn} onClick={handleGenerate}>
              Generate Problem
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
