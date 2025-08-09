import React, { useState, useCallback } from "react";
import styles from "./Panels.module.css";
import PanelToggle from "./PanelToggle";
import {
  getProblemParams,
  getProblemCities,
  getProblemDemands,
} from "../../store/problemStore";
import { emit } from "../../lib/eventBus";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// palette for trucks
const COLORS = ["#ff6b6b","#34d399","#60a5fa","#fbbf24","#c084fc","#f472b6","#f59e0b","#10b981"];

// helpers
function normalizeToStartAtOne(nums) {
  if (!nums?.length) return [];
  const i = nums.indexOf(1);
  let r = i >= 0 ? [...nums.slice(i), ...nums.slice(0, i)] : nums.slice();
  if (r[r.length - 1] !== 1) r.push(1);
  return r;
}
function parseTruckLine(line) {
  // "Truck #3: 20 → 14 → 1 → 17"
  const m = line.match(/Truck\s*#(\d+):\s*(.+)$/);
  if (!m) return null;
  const id = Number(m[1]);
  const nodes = m[2]
    .split("→")
    .map((s) => parseInt(s.trim(), 10))
    .filter(Number.isFinite);
  return { id, nodes };
}
const fmt2 = (v) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RightPanel({ open, onToggle }) {
  const [distance, setDistance] = useState("—");
  const [time, setTime] = useState("—");
  const [isLoading, setIsLoading] = useState(false);

  // status + output
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [solverSummary, setSolverSummary] = useState({});
  const [solverTrucks, setSolverTrucks] = useState([]); // [{id,label,color,visible,nodes}]

  const toggleTruck = (id) => {
    setSolverTrucks((ts) => {
      const next = ts.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t));
      const t = next.find((x) => x.id === id);
      emit("route:toggle", { id, visible: !!t?.visible });
      return next;
    });
  };

  const onRun = useCallback(async () => {
    const params = getProblemParams();  // { depots, capacity, fleet }
    const cities = getProblemCities();  // chosen during Generate Problem

    if (!cities.length) {
      setMessage("Please click the gear button → Generate Problem first.");
      setIsError(true);
      return;
    }

    const n = Number(params.depots) || 0;
    const allDemands = getProblemDemands();
    const selected   = cities.slice(0, n);
    const selectedIds = new Set(selected.map((c) => String(c.id)));
    const demands = Object.fromEntries(
      Object.entries(allDemands).filter(([id]) => selectedIds.has(id))
    );

    const payload = {
      depots: n,
      capacity: Number(params.capacity),
      fleet: Number(params.fleet),
      cities: selected,
      demands,
    };

    try {
      setIsLoading(true);
      setIsError(false);
      setMessage("");
      setSolverSummary({});
      setSolverTrucks([]);

      const res = await fetch(`${API_BASE}/run_quantum_solver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Expect JSON: { ok, message, paths, summary, ... }
      const data = await res.json().catch(async () => {
        const txt = await res.text();
        return { ok: res.ok, message: txt, paths: [], summary: {} };
      });

      setIsError(!data.ok);
      setMessage(data.message || (res.ok ? "Solver complete." : "Solver failed."));
      setSolverSummary(data.summary || {});

      // ✅ pull totals into the top fields
      const td = (data.summary && (data.summary["Total distance"] ?? data.summary.total_distance)) ?? null;
      const tr = (data.summary && (data.summary["Total runtime"]  ?? data.summary.total_runtime))  ?? null;
      setDistance(fmt2(td));
      setTime(fmt2(tr));

      // Build trucks (normalized) from solver paths, emit to map
      const trucks = (Array.isArray(data.paths) ? data.paths : [])
        .map((line, i) => {
          const parsed = parseTruckLine(line);
          if (!parsed) return null;
          const nodes = normalizeToStartAtOne(parsed.nodes); // start/end at 1
          return {
            id: parsed.id,
            label: `Truck #${parsed.id}`,
            nodes,
            color: COLORS[i % COLORS.length],
            visible: true,
          };
        })
        .filter(Boolean);

      setSolverTrucks(trucks);
      emit("routes:set", trucks); // MapView listens and draws colored polylines + arrows
    } catch (e) {
      console.error("POST /run_quantum_solver failed:", e);
      setIsError(true);
      setMessage("❌ Failed to reach the API. Is FastAPI running?");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className={`${styles.panel} ${styles.right} ${!open ? styles.closed : ""}`}>
      <div className={styles.content} style={{ display: open ? "block" : "none" }}>
        <div className={styles.section}>
          <div className={styles.kicker}>Quantum Solver</div>
          <div className={styles.subtitle}>
            Parsing the problem parameters into<br />the Icing machine
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.statRow}>
            <label className={styles.statLabel}>Total Distance</label>
            <input
              className={`${styles.statValue} mono`}
              value={distance}
              readOnly
              title="Total distance from solver"
            />
          </div>
          <div className={styles.statRow}>
            <label className={styles.statLabel}>Total Time</label>
            <input
              className={`${styles.statValue} mono`}
              value={time}
              readOnly
              title="Total runtime from solver (seconds)"
            />
          </div>

          <button className={styles.primaryBtn} onClick={onRun} disabled={isLoading}>
            {isLoading ? "RUNNING…" : "RUN QUANTUM SOLVER"}
          </button>

          {isLoading && (
            <div className={styles.loaderRow}>
              <div className={styles.spinner} aria-hidden="true"></div>
              <div>Running solver & parsing results…</div>
            </div>
          )}

          {!isLoading && !!message && (
            <div className={isError ? styles.msgError : styles.msgSuccess}>
              {message}
            </div>
          )}
        </div>

        {/* Toggleable truck paths + normalized text */}
        {!!solverTrucks.length && (
          <div className={styles.section}>
            <div className={styles.pathHeader}>Paths (toggle to show/hide)</div>
            <div className={styles.pathList}>
              {solverTrucks.map((t) => (
                <label key={t.id} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={t.visible}
                    onChange={() => toggleTruck(t.id)}
                    aria-label={`${t.label} visible`}
                  />
                  <div className={styles.routeLine}>
                    <div style={{ fontWeight: 700, color: t.color }}>{t.label}</div>
                    <div className="mono">{t.nodes.join(" → ")}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Summary block */}
        {!!Object.keys(solverSummary).length && (
          <div className={`${styles.section}`}>
            <div className={`${styles.card} ${styles.summaryCard}`}>
              {Object.entries(solverSummary).map(([k, v]) => (
                <div key={k} className={styles.summaryRow}>
                  <div className={styles.summaryKey}>{k}</div>
                  <div className={`${styles.summaryVal} mono`}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <PanelToggle side="right" open={open} onClick={onToggle} />
    </div>
  );
}
