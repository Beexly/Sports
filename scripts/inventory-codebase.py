#!/usr/bin/env python3
"""
inventory-codebase.py — exhaustive machine-generated inventory of every item
in the repository that must be wired into the prediction engine.

Scans:
  A. Every source file under apps/, packages/, gse-ml-service/, services/,
     scripts/, tools/, workers/, jobs/
  B. Every database table/view via DATABASE_URL (information_schema)
  C. Every environment variable referenced in code
  D. Every external API client / SDK import
  E. Every exported function producing signals/projections/scores/etc.
  F. Every JSON/CSV/Parquet fixture read by code

Output: inventory.json — one entry per item.
"""
import hashlib
import json
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SCAN_DIRS = ["apps", "packages", "gse-ml-service", "services", "scripts", "tools", "workers", "jobs"]
SRC_EXTS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".sql", ".prisma", ".sh"}
ARTIFACT_EXTS = {".json", ".csv", ".tsv", ".parquet", ".jsonl", ".db", ".sqlite"}
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", "coverage", "__pycache__", ".venv", "venv", ".turbo"}

SIGNAL_PATTERNS = re.compile(
    r"(observation|signal|probabilit|score|projection|feature|edge|rating|weight|predict|recommend|tier|grade|value|rank|insight|forecast|calibrat|winProb|expectedPoint)",
    re.I,
)
ENV_PATTERN = re.compile(r"(?:process\.env\.|os\.environ\[|os\.environ\.get\(|os\.getenv\(|env\(\")([A-Z][A-Z0-9_]{2,})")
EXPORT_PATTERN = re.compile(r"export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+(\w+)")
PY_DEF_PATTERN = re.compile(r"^(?:async\s+)?def\s+(\w+)\s*\(", re.M)
API_IMPORT_PATTERN = re.compile(r"""(?:from|import)\s+['"]([^'"]+)['"]""")

def stable_id(path: str, symbol: str) -> str:
    return hashlib.sha256(f"{path}:{symbol}".encode()).hexdigest()[:16]

def signal_family(path: str, symbol: str) -> str:
    s = f"{path} {symbol}".lower()
    if any(k in s for k in ["injury", "avail", "depth"]): return "INJURY_AVAILABILITY"
    if any(k in s for k in ["weather", "travel", "venue", "rest"]): return "WEATHER_TRAVEL"
    if any(k in s for k in ["odds", "line", "market", "book", "spread", "total", "consensus", "clv"]): return "MARKET"
    if any(k in s for k in ["fantasy", "dfs", "salary", "slate", "draft", "adp", "ownership"]): return "FANTASY_DFS"
    if any(k in s for k in ["calib", "brier", "ece", "grade", "score", "weight"]): return "CALIBRATION_HISTORY"
    if any(k in s for k in ["charting", "ftn", "tracking", "coverage", "film", "highlight", "ngs"]): return "PLAY_CHARTING"
    if any(k in s for k in ["news", "social", "narrative", "memory", "jarvis"]): return "NARRATIVE_SOCIAL"
    if any(k in s for k in ["source", "rights", "registry", "atlas", "fresh"]): return "SOURCE_TRUST"
    if any(k in s for k in ["schedule", "density", "pace"]): return "SCHEDULE_DENSITY"
    if any(k in s for k in ["scheme", "play", "formation", "blitz", "pressure"]): return "SCHEME_TENDENCY"
    return "GENERAL"

def main():
    entries = []
    seen = set()

    def add(path, kind, symbol, family=None):
        eid = stable_id(path, symbol)
        if eid in seen:
            return
        seen.add(eid)
        entries.append({
            "id": eid,
            "path": path,
            "kind": kind,
            "symbol": symbol,
            "signal_family": family or signal_family(path, symbol),
            "wired": False,
            "wired_via": None,
        })

    # A + E + F: scan source files
    for scan_dir in SCAN_DIRS:
        root = REPO / scan_dir
        if not root.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                fp = Path(dirpath) / fn
                rel = str(fp.relative_to(REPO)).replace("\\", "/")
                ext = fp.suffix.lower()

                # A: every source file
                if ext in SRC_EXTS:
                    add(rel, "source", fn)
                    try:
                        text = fp.read_text(encoding="utf-8", errors="replace")
                    except Exception:
                        continue
                    # E: exported functions
                    if ext in {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}:
                        for m in EXPORT_PATTERN.finditer(text):
                            sym = m.group(1)
                            if SIGNAL_PATTERNS.search(sym) or SIGNAL_PATTERNS.search(text[max(0,m.start()-200):m.start()]):
                                add(rel, "export", sym)
                    elif ext == ".py":
                        for m in PY_DEF_PATTERN.finditer(text):
                            sym = m.group(1)
                            if SIGNAL_PATTERNS.search(sym):
                                add(rel, "export", sym)
                    # C: env vars
                    for m in ENV_PATTERN.finditer(text):
                        add(rel, "env", m.group(1), "ENV")
                    # D: API imports
                    for m in API_IMPORT_PATTERN.finditer(text):
                        imp = m.group(1)
                        if any(k in imp for k in ["fetch", "axios", "request", "http", "api", "client", "sdk", "stripe", "prisma", "redis", "pg"]):
                            if not imp.startswith(".") and not imp.startswith("@/"):
                                add(rel, "api", imp, "API_CLIENT")

                # F: artifacts
                elif ext in ARTIFACT_EXTS:
                    add(rel, "artifact", fn)

    # B: database tables
    db_url = os.environ.get("DATABASE_URL", "")
    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            cur.execute("""
                SELECT table_name, table_type FROM information_schema.tables
                WHERE table_schema = 'public' ORDER BY table_name
            """)
            for tname, ttype in cur.fetchall():
                add(f"db://public/{tname}", "table", tname, "DB_TABLE")
            cur.close()
            conn.close()
        except Exception as e:
            print(f"DB scan skipped: {e}", file=sys.stderr)
    else:
        # Try node pg
        try:
            import subprocess
            result = subprocess.run(
                ["node", "-e", """
                const {Client}=require('pg');
                const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
                c.connect().then(()=>c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
                .then(r=>{console.log(JSON.stringify(r.rows.map(x=>x.table_name)));c.end();})
                .catch(e=>{console.error(e.message);process.exit(1);});
                """],
                capture_output=True, text=True, env={**os.environ}, cwd=str(REPO),
            )
            if result.returncode == 0:
                tables = json.loads(result.stdout.strip().split("\n")[-1])
                for t in tables:
                    add(f"db://public/{t}", "table", t, "DB_TABLE")
            else:
                print(f"DB scan via node failed: {result.stderr}", file=sys.stderr)
        except Exception as e:
            print(f"DB scan skipped: {e}", file=sys.stderr)

    output = {
        "generatedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "total": len(entries),
        "entries": entries,
    }
    out_path = REPO / "packages" / "prediction-engine" / "src" / "engine" / "inventory.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"inventory.json: {len(entries)} items written to {out_path}")

    # gaps
    gaps = [e for e in entries if not e["wired"]]
    gaps_path = REPO / "packages" / "prediction-engine" / "src" / "engine" / "gaps.json"
    gaps_path.write_text(json.dumps({"total": len(gaps), "entries": gaps}, indent=2), encoding="utf-8")
    print(f"gaps.json: {len(gaps)} unwired items")

    if "--verify" in sys.argv:
        print(f"VERIFY: total={len(entries)} wired={sum(1 for e in entries if e['wired'])} gaps={len(gaps)}")
        if gaps:
            sys.exit(1)

if __name__ == "__main__":
    main()
