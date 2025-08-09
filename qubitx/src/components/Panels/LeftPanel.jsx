import React, { useState, useCallback } from "react";
import styles from "./Panels.module.css";
import PanelToggle from "./PanelToggle";
import {
  getProblemParams,
  getProblemCities,
  getProblemDemands,
} from "../../store/problemStore";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const DEFAULT_ROUTES = [
  { id: 1, label: "Truck #1", path: "6 → 3 → 11 → 1 → 13 → 10 → 8", checked: true },
  { id: 2, label: "Truck #2", path: "12 → 5 → 4 → 2 → 7 → 9 → 1", checked: true },
  { id: 3, label: "Truck #3", path: "20 → 14 → 1 → 17", checked: true },
  { id: 4, label: "Truck #4", path: "15 → 18 → 22 → 21 → 19 → 16 → 1", checked: true },
];

const fmt2 = (v) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function LeftPanel({ open, onToggle }) {
  const [distance, setDistance] = useState("—");
  const [time, setTime] = useState("—");
  const [routes, setRoutes] = useState(DEFAULT_ROUTES);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const toggleRoute = (id) =>
    setRoutes((rs) => rs.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r)));

  const onRun = useCallback(async () => {
    const params  = getProblemParams();   // { depots, capacity, fleet }
    const cities  = getProblemCities();   // selected during "Generate Problem"
    const demandsAll = getProblemDemands();

    if (!cities.length) {
      setIsError(true);
      setMessage("Please click the gear button → Generate Problem first.");
      return;
    }

    const n = Number(params.depots) || 0;
    const selected = cities.slice(0, n);
    const selectedIds = new Set(selected.map((c) => String(c.id)));
    const demands = Object.fromEntries(
      Object.entries(demandsAll).filter(([id]) => selectedIds.has(id))
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

      const res = await fetch(`${API_BASE}/run_or_solver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(async () => {
        const txt = await res.text();
        return { ok: res.ok, message: txt, summary: {} };
      });

      setIsError(!data.ok);
      setMessage(data.message || (res.ok ? "OR request sent." : "OR request failed."));

      // If backend returns a summary, show it up top
      const td = (data.summary && (data.summary["Total distance"] ?? data.summary.total_distance)) ?? null;
      const tr = (data.summary && (data.summary["Total runtime"]  ?? data.summary.total_runtime))  ?? null;
      if (td != null) setDistance(fmt2(td));
      if (tr != null) setTime(fmt2(tr));
    } catch (e) {
      console.error("POST /run_or_solver failed:", e);
      setIsError(true);
      setMessage("❌ Failed to reach the API. Is FastAPI running?");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className={`${styles.panel} ${styles.left} ${!open ? styles.closed : ""}`}>
      <div className={styles.content} style={{ display: open ? "block" : "none" }}>
        <div className={styles.section}>
          <div className={styles.kicker}>OR Solver</div>
          <div className={styles.subtitle}>
            Parsing the problem parameters into<br />the Google OR Solver
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.statRow}>
            <label className={styles.statLabel}>Total Distance</label>
            <input className={`${styles.statValue} mono`} value={distance} readOnly />
          </div>
          <div className={styles.statRow}>
            <label className={styles.statLabel}>Total Time</label>
            <input className={`${styles.statValue} mono`} value={time} readOnly />
          </div>

          <button className={styles.primaryBtn} onClick={onRun} disabled={isLoading}>
            {isLoading ? "SENDING…" : "RUN OR SOLVER"}
          </button>

          {isLoading && (
            <div className={styles.loaderRow}>
              <div className={styles.spinner} aria-hidden="true"></div>
              <div>Posting to FastAPI…</div>
            </div>
          )}

          {!isLoading && !!message && (
            <div className={isError ? styles.msgError : styles.msgSuccess}>{message}</div>
          )}
        </div>

        <div className={`${styles.section} ${styles.card}`}>
          <div className={styles.pathHeader}>Path</div>
          <div className={styles.pathList}>
            {routes.map((r) => (
              <label key={r.id} className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={r.checked}
                  onChange={() => toggleRoute(r.id)}
                  aria-label={`${r.label} visible`}
                />
                <div className={styles.routeLine}>
                  <div style={{ fontWeight: 700 }}>{r.label}</div>
                  <div className="mono">{r.path}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <PanelToggle side="left" open={open} onClick={onToggle} />
    </div>
  );
}
