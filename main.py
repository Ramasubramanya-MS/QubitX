from pathlib import Path
from typing import Dict, List, Optional, Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import subprocess, sys, re

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173","*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Models ----------
class City(BaseModel):
    name: str
    lat: float
    lng: float
    demand: Optional[int] = 0

class ProblemRequest(BaseModel):
    depots: int
    capacity: int
    fleet: int
    cities: List[City]
    demands: Dict[Union[int,str], int] = {}

# ---------- Utils ----------
BASE_DIR = Path(__file__).resolve().parent
MAP_DIR  = BASE_DIR / "Map_Datasets"
MAP_DIR.mkdir(parents=True, exist_ok=True)

SOLVER_PATH = Path(r"C:\Users\USER\Documents\Quantum UI Ordered\CVRP_Solver.py")
CLASSICAL_SOLVER_PATH = Path(r"C:\Users\USER\Documents\Quantum UI Ordered\classical_OR_2.py")
SOLUTION_PATH = BASE_DIR / "CVRP_solution.txt"  # your solver writes here

def write_problem_file(req: ProblemRequest) -> Path:
    # normalize demands keys to int
    demand_map: Dict[int, int] = {
        int(k): int(v) for k, v in (req.demands or {}).items()
        if str(k).strip().lstrip("-").isdigit()
    }

    name = f"E-n{req.depots}-k{req.fleet}"
    out_path = MAP_DIR / f"{name}.txt"

    lines: List[str] = []
    lines.append(f"NAME : {name}")
    lines.append("TYPE : CVRP")
    lines.append(f"DIMENSION : {req.depots}")
    lines.append(f"CAPACITY : {req.capacity}")
    lines.append("EDGE_WEIGHT_TYPE : EUC_2D")
    lines.append("NODE_COORD_SECTION")
    for idx, city in enumerate(req.cities[: req.depots], start=1):
        lines.append(f"{idx} {city.lat:.4f} {city.lng:.4f}")

    lines.append("DEMAND_SECTION")
    for idx in range(1, req.depots + 1):
        fallback_city_demand = req.cities[idx-1].demand if idx-1 < len(req.cities) else 0
        d = demand_map.get(idx, fallback_city_demand or 0)
        # If your depot must be zero demand, uncomment:
        # if idx == 1: d = 0
        lines.append(f"{idx} {int(d)}")

    lines.append("DEPOT_SECTION")
    lines.append("1")
    lines.append("-1")
    lines.append("EOF")

    out_path.write_text("\n".join(lines), encoding="utf-8")
    return out_path

def execute_classical_solver(problem_path: Path, timeout_sec: int = 300) -> Dict[str, str]:
    """
    Calls: python CVRP_Solver.py <problem_path>
    Returns captured stdout/stderr for debugging in UI if needed.
    """
    if not CLASSICAL_SOLVER_PATH.exists():
        return {"stdout": "", "stderr": f"Solver not found: {CLASSICAL_SOLVER_PATH}"}

    # Use the same interpreter that runs FastAPI (good for venvs)
    cmd = [sys.executable, str(CLASSICAL_SOLVER_PATH), str(problem_path)]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_sec)
    return {"stdout": proc.stdout, "stderr": proc.stderr}

def execute_quantum_solver(problem_path: Path, timeout_sec: int = 300) -> Dict[str, str]:
    """
    Calls: python CVRP_Solver.py <problem_path>
    Returns captured stdout/stderr for debugging in UI if needed.
    """
    if not SOLVER_PATH.exists():
        return {"stdout": "", "stderr": f"Solver not found: {SOLVER_PATH}"}

    # Use the same interpreter that runs FastAPI (good for venvs)
    cmd = [sys.executable, str(SOLVER_PATH), str(problem_path)]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_sec)
    return {"stdout": proc.stdout, "stderr": proc.stderr}

def parse_solution(solution_path: Path):
    """
    Expects a file similar to your sample:
      Problem: ./Map_Datasets/E-n22-k4.txt
      ...
      Cluster N:
      Path: [1, 15, 22, ...]
      Length: 93.57
      ...
      SUMMARY
      Total distance: 205.94
      Total runtime: 13.66 seconds
    """
    if not solution_path.exists():
        return {"paths": [], "summary": {}, "raw": ""}

    text = solution_path.read_text(encoding="utf-8", errors="ignore")

    # Extract all "Path: [ ... ]"
    path_strs = re.findall(r"Path:\s*\[(.*?)\]", text)
    # Turn into nice display strings ("Truck #1: 1 → 15 → 22 → ...")
    paths = [f"Truck #{i+1}: " + " \u2192 ".join(s.strip() for s in p.split(","))
             for i, p in enumerate(path_strs)]

    # Summary
    def grab(rx):
        m = re.search(rx, text)
        return m.group(1).strip() if m else None

    summary = {}
    td = grab(r"Total distance:\s*([\d.]+)")
    tr = grab(r"Total runtime:\s*([\d.]+)")
    ar = grab(r"Average runtime:\s*([\d.]+)")
    if td: summary["Total distance"] = td
    if tr: summary["Total runtime"]  = tr
    if ar: summary["Average runtime"] = ar

    return {"paths": paths, "summary": summary, "raw": text}

# ---------- Endpoint ----------
@app.post("/run_quantum_solver")
def run_quantum_solver(req: ProblemRequest):
    # 1) write problem file
    problem_path = write_problem_file(req)
    print(problem_path)
    # 2) run solver
    try:
        run_out = execute_quantum_solver(problem_path, timeout_sec=600)
    except subprocess.TimeoutExpired:
        return JSONResponse(
            status_code=504,
            content={
                "ok": False,
                "message": "Solver timed out.",
                "problemFile": problem_path.name,
            },
        )
    except subprocess.CalledProcessError as e:
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "message": "Solver crashed.",
                "problemFile": problem_path.name,
                "stderr": getattr(e, "stderr", ""),
            },
        )

    # 3) parse solution file (your solver writes CVRP_solution.txt in project root)
    parsed = parse_solution(SOLUTION_PATH)

    return JSONResponse({
        "ok": True,
        "message": f"Saved {problem_path.name} and ran solver.",
        "problemFile": problem_path.name,
        "solverStdout": run_out.get("stdout", ""),
        "solverStderr": run_out.get("stderr", ""),
        "paths": parsed["paths"],
        "summary": parsed["summary"],
    })

@app.post("/run_or_solver")
def run_or_solver(req: ProblemRequest):
    # 1) write problem file
    problem_path = write_problem_file(req)
    print(problem_path)
    # 2) run solver
    try:
        run_out = execute_classical_solver(problem_path, timeout_sec=600)
    except subprocess.TimeoutExpired:
        return JSONResponse(
            status_code=504,
            content={
                "ok": False,
                "message": "Solver timed out.",
                "problemFile": problem_path.name,
            },
        )
    except subprocess.CalledProcessError as e:
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "message": "Solver crashed.",
                "problemFile": problem_path.name,
                "stderr": getattr(e, "stderr", ""),
            },
        )
    # 3) parse solution file if your classical solver writes one
    # parsed = parse_solution(SOLUTION_PATH)

    # 4) respond (mirror /run_quantum_solver shape)
    return JSONResponse({
        "ok": True,
        "message": f"Saved {problem_path.name} and ran classical OR solver.",
        "problemFile": problem_path.name,
        "solverStdout": run_out.get("stdout", ""),
        "solverStderr": run_out.get("stderr", ""),
        # "paths": parsed["paths"],
        # "summary": parsed["summary"],
    })