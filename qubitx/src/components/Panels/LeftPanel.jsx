import React, { useState, useCallback } from "react";
import styles from "./Panels.module.css";
import PanelToggle from "./PanelToggle";
import {
  getProblemParams,
  getProblemCities,
  getProblemDemands,
} from "../../store/problemStore";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const fmt2 = (v) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

// --- helpers: parse OR-Tools stdout (text) ---
function parseOrToolsStdout(stdout) {
  if (!stdout || typeof stdout !== "string") {
    return { routes: [], summary: {}, totals: { distance: null, timeSec: null } };
  }

  // 1) Grab “Route N: [ ... ] - Distance: ...”
  const routeRegex =
    /^Route\s+(\d+):\s*\[([^\]]+)\][^\n]*?-+\s*Distance:\s*([\d.]+)/gim;

  const routes = [];
  let m;
  while ((m = routeRegex.exec(stdout)) !== null) {
    const id = Number(m[1]);
    const nodesRaw = m[2]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // ✅ convert 0 → 1 only (no reordering, no normalization)
    const nodes = nodesRaw.map((s) => {
      const n = parseInt(s, 10);
      if (Number.isFinite(n)) return n === 0 ? 1 : n;
      return s === "0" ? 1 : s; // fallback if any stray text
    });

    routes.push({
      id,
      label: `Route ${id}`,
      pathText: nodes.join(" → "),
      checked: true,
    });
  }

  // 2) Totals + runtime
  const totalDistMatch =
    stdout.match(/Total distance:\s*([0-9]+\.[0-9]+|[0-9]+)/i);
  const runtimeMatch =
    stdout.match(/Actual Runtime:\s*([\d.]+)\s*s?/i) ||
    stdout.match(/Total runtime:\s*([\d.]+)\s*(seconds|s)?/i);

  const totals = {
    distance: totalDistMatch ? totalDistMatch[1] : null,
    timeSec: runtimeMatch ? runtimeMatch[1] : null,
  };

  // 3) Optional summary fields (Status, Objective, etc.)
  const summary = {};
  const status = stdout.match(/Status:\s*([A-Z_]+)/i);
  const objective = stdout.match(/Objective value:\s*([\d.]+)/i);
  const usedEdges = stdout.match(/Used edges:\s*([0-9]+)/i);
  if (status) summary["Status"] = status[1];
  if (objective) summary["Objective value"] = objective[1];
  if (usedEdges) summary["Used edges"] = usedEdges[1];
  if (totals.distance != null) summary["Total distance"] = totals.distance;
  if (totals.timeSec != null) summary["Total runtime"] = totals.timeSec;

  return { routes, summary, totals };
}

export default function LeftPanel({ open, onToggle }) {
  const [distance, setDistance] = useState("—");
  const [time, setTime] = useState("—");
  const [routes, setRoutes] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [solverSummary, setSolverSummary] = useState({});

  const toggleRoute = (id) =>
    setRoutes((rs) =>
      rs.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r))
    );

  const onRun = useCallback(async () => {
    const params = getProblemParams(); // { depots, capacity, fleet }
    const cities = getProblemCities(); // selected during "Generate Problem"
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
      setRoutes([]);
      setSolverSummary({});

      const res = await fetch(`${API_BASE}/run_or_solver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const txt = await res.text();
        // If backend returned raw text, treat it as stdout
        data = { ok: res.ok, message: txt, solverStdout: txt };
      }

      // Prefer solverStdout; if absent but message looks like output, use message
      const stdout =
        typeof data?.solverStdout === "string" && data.solverStdout.trim()
          ? data.solverStdout
          : typeof data?.message === "string"
          ? data.message
          : "";

      console.log("Solver stdout:", stdout);

      const { routes: parsedRoutes, summary, totals } = parseOrToolsStdout(stdout);

      // top stats
      if (totals.distance != null) setDistance(fmt2(totals.distance));
      if (totals.timeSec != null) setTime(fmt2(totals.timeSec));

      // checkbox list
      setRoutes(parsedRoutes);

      // summary card
      setSolverSummary(Object.keys(summary).length ? summary : data.summary || {});

      setIsError(!data?.ok && !parsedRoutes.length);
      setMessage(
        data?.message ||
          (res.ok ? "Solver complete." : "Solver failed or returned no output.")
      );
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
            Parsing the problem parameters into
            <br />
            the Google OR-Tools solver
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
            {isLoading ? "RUNNING…" : "RUN OR SOLVER"}
          </button>

          {isLoading && (
            <div className={styles.loaderRow}>
              <div className={styles.spinner} aria-hidden="true"></div>
              <div>Running solver & parsing results…</div>
            </div>
          )}

          {!isLoading && !!message && (
            <div className={isError ? styles.msgError : styles.msgSuccess}>{message}</div>
          )}
        </div>

        {/* Routes list (checkbox UI like RightPanel), showing nodes with 0→1 conversion */}
        {!!routes.length && (
          <div className={`${styles.section} ${styles.card}`}>
            <div className={styles.pathHeader}>Paths (toggle to show/hide)</div>
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
                    <div className="mono">{r.pathText}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Optional summary like RightPanel */}
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

      <PanelToggle side="left" open={open} onClick={onToggle} />
    </div>
  );
}
