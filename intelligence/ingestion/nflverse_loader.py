"""nflverse play-by-play loader (historical PBP) with honest dependency handling.

Fulfils the external agent's nflverse_loader.py spec:
  - loads play-by-play via nfl_data_py when installed
  - returns structured PlayRow records (EPA, WPA, success, player ids)
  - writes a team-level EPA/success summary
  - HONESTY: if nfl_data_py is absent, returns an empty result and says so
    (pip install nfl_data_py) — never fabricates rows. Verified 2026-10-14:
    nfl_data_py is ABSENT on this host, so the empty path is the live path
    here until installed.

Structured rows land under docs/data-sources/research/<date>/nflverse/.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUTROOT = REPO / "docs" / "data-sources" / "research"


@dataclass(frozen=True)
class PlayRow:
    game_id: str | None
    play_id: int | None
    season: int | None
    week: int | None
    posteam: str | None
    play_type: str | None
    epa: float | None
    wpa: float | None
    success: int | None
    passer_player_id: str | None
    receiver_player_id: str | None
    rusher_player_id: str | None


def _require_pandas():
    try:
        import pandas as pd  # noqa: F401
        return pd
    except Exception as exc:
        raise RuntimeError(f"pandas unavailable: {exc}") from exc


def _require_nfl_data_py():
    """Import nfl_data_py or raise an HONEST dependency error."""
    try:
        import nfl_data_py as nfl
        return nfl
    except Exception as exc:
        raise RuntimeError(
            "nfl_data_py is not installed - this loader returns an empty result "
            f"rather than fabricating rows. Install with: pip install nfl_data_py "
            f"(import error: {type(exc).__name__}: {exc})"
        ) from exc


def load_pbp(seasons: list[int], weeks: list[int] | None = None) -> tuple[list[PlayRow], list[str]]:
    """Load play rows for the given seasons. Returns (rows, honesty_notes)."""
    notes: list[str] = []
    try:
        nfl = _require_nfl_data_py()
    except RuntimeError as exc:
        notes.append(str(exc))
        return [], notes
    pd = _require_pandas()
    try:
        df = nfl.import_pbp_data(seasons, downcast=True, cache=False)
    except Exception as exc:
        notes.append(f"nfl_data_py import_pbp_data failed: {type(exc).__name__}: {exc}")
        return [], notes
    if weeks:
        df = df[df["week"].isin(weeks)]
    cols = ["game_id", "play_id", "season", "week", "posteam", "play_type",
            "epa", "wpa", "success", "passer_player_id", "receiver_player_id", "rusher_player_id"]
    have = [c for c in cols if c in df.columns]
    missing = [c for c in cols if c not in df.columns]
    if missing:
        notes.append(f"columns absent from this nfl_data_py release: {missing}")
    sub = df[have].copy()
    def _f(v):
        try:
            if v is None or pd.isna(v):
                return None
            return round(float(v), 6)
        except (TypeError, ValueError):
            return None
    rows: list[PlayRow] = []
    for r in sub.itertuples(index=False):
        d = r._asdict() if hasattr(r, "_asdict") else dict(zip(sub.columns, r))
        rows.append(PlayRow(
            game_id=d.get("game_id"), play_id=int(d["play_id"]) if d.get("play_id") is not None and not pd.isna(d.get("play_id")) else None,
            season=int(d["season"]) if d.get("season") is not None and not pd.isna(d.get("season")) else None,
            week=int(d["week"]) if d.get("week") is not None and not pd.isna(d.get("week")) else None,
            posteam=d.get("posteam"), play_type=d.get("play_type"),
            epa=_f(d.get("epa")), wpa=_f(d.get("wpa")),
            success=int(d["success"]) if d.get("success") is not None and not pd.isna(d.get("success")) else None,
            passer_player_id=d.get("passer_player_id"),
            receiver_player_id=d.get("receiver_player_id"),
            rusher_player_id=d.get("rusher_player_id"),
        ))
    notes.append(f"loaded {len(rows)} play rows for seasons {seasons}"
                 + (f", weeks {weeks}" if weeks else ""))
    return rows, notes


def team_summary(rows: list[PlayRow]) -> dict:
    """Team-level EPA/play and success rate over non-null rows."""
    agg: dict[str, dict] = {}
    for r in rows:
        if not r.posteam or r.epa is None:
            continue
        a = agg.setdefault(r.posteam, {"plays": 0, "epa_sum": 0.0, "success_n": 0})
        a["plays"] += 1
        a["epa_sum"] += r.epa
        if r.success is not None:
            a["success_n"] += 1
    out = {}
    for team, a in sorted(agg.items()):
        out[team] = {
            "plays": a["plays"],
            "epa_per_play": round(a["epa_sum"] / a["plays"], 6) if a["plays"] else None,
            "success_rate": round(a["success_n"] / a["plays"], 6) if a["plays"] else None,
        }
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--seasons", default="2024,2025", help="comma-separated seasons")
    ap.add_argument("--weeks", default="", help="optional comma-separated weeks filter")
    ap.add_argument("--max-rows", type=int, default=5000, help="cap on landed row sample (full summary unaffected)")
    ap.add_argument("--no-write", action="store_true")
    args = ap.parse_args()

    seasons = [int(s) for s in args.seasons.split(",") if s.strip()]
    weeks = [int(w) for w in args.weeks.split(",") if w.strip()] or None
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        rows, notes = load_pbp(seasons, weeks)
    except RuntimeError as exc:
        # HONEST EMPTY PATH (the live path on this host as of 2026-10-14)
        result = {
            "generated_utc": now_iso, "seasons": seasons, "weeks": weeks,
            "rows": 0, "honesty": [str(exc)], "team_summary": {},
            "status": "empty - dependency missing",
        }
        print(json.dumps(result, indent=1))
        if not args.no_write:
            outdir = OUTROOT / datetime.now(timezone.utc).date().isoformat() / "nflverse"
            outdir.mkdir(parents=True, exist_ok=True)
            p = outdir / f"pbp_empty_{stamp}.json"
            p.write_text(json.dumps(result, indent=1), encoding="utf-8")
            print(f"landed: {p.name} -> {outdir}")
        return 0

    summary = team_summary(rows)
    result = {
        "generated_utc": now_iso, "seasons": seasons, "weeks": weeks,
        "rows": len(rows), "honesty": notes,
        "team_summary": summary,
        "sample": [asdict(r) for r in rows[: min(args.max_rows, len(rows))]],
    }
    print(json.dumps({"rows": len(rows), "teams": len(summary),
                      "honesty": notes}, indent=1))
    if not args.no_write:
        outdir = OUTROOT / datetime.now(timezone.utc).date().isoformat() / "nflverse"
        outdir.mkdir(parents=True, exist_ok=True)
        p = outdir / f"pbp_summary_{stamp}.json"
        p.write_text(json.dumps(result, indent=1), encoding="utf-8")
        print(f"landed: {p.name} ({p.stat().st_size} B) -> {outdir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
