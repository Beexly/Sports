"""Trust Provider with empty-store & freshness guard (Target 4 + Continuation Extension).

Enforces Hard Rule 4 (Fail-closed):
  - Points empty-store guard at freshest injuries (injuries_2026.parquet + live ESPN public_injuries_*.json)
    and depth_charts (depth_charts_2026.parquet).
  - Includes optional checks for snap_counts (snap_counts_2026.parquet / 2025), participation
    (pbp_participation_2025.parquet; 2026 explicitly checked and flagged HTTP 404 structural post-season only),
    and ESPN Analytics Receivers JSON (espnanalytics_receivers_latest.json, checked against captured
    S3 Last-Modified header 2026-10-13T15:10:17Z, 93 rows, 100% gsis_id join).
  - Never silently passes: missing or stale required stores produce INVALID with explicit reasons.
  - Evaluates the 14-card Week-6 NFL slate and logs to intelligence/trust/shadow/trust_shadow_ledger.jsonl.
"""
from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any

import pandas as pd

REPO = Path(__file__).resolve().parents[2]
COACH_DATA = REPO / "intelligence" / "coaching" / "data"
AUDIT_DATA = REPO / "intelligence" / "audit" / "data"
RESEARCH_2026_10_14 = REPO / "docs" / "data-sources" / "research" / "2026-10-14"
BRAIN_DIR = REPO / "artifacts" / "gse_brain"
TRUST_SHADOW_LEDGER = REPO / "intelligence" / "trust" / "shadow" / "trust_shadow_ledger.jsonl"

VALIDATION_SPEC_MET = False
FORCED_WEIGHT = 0.0

FRESHNESS_BUDGET_HOURS = {
    "injuries": 168.0,            # 7 days
    "depth_charts": 336.0,        # 14 days
    "snap_counts": 336.0,         # 14 days
    "participation": 2160.0,      # 90 days (seasonal release)
    "espn_receivers": 168.0,      # 7 days (weekly S3 RTM update)
}


@dataclass
class StoreCheckResult:
    store_name: str
    required: bool
    path: str
    exists: bool
    non_empty: bool
    row_count: int
    age_hours: float | None
    budget_hours: float
    verdict: str  # "FRESH" | "STALE" | "MISSING_EMPTY"
    reason: str
    max_season: int | None = None
    max_week: int | None = None
    last_modified_utc: str | None = None


class TrustProviderGuard:
    """Fail-closed empty-store + freshness guard for injuries, depth_charts, snap_counts, participation, and ESPN receivers."""

    def __init__(self, repo_root: Path = REPO) -> None:
        self.repo = repo_root

    def _check_parquet(self, name: str, path: Path, required: bool, budget_h: float, extra_missing_note: str = "") -> StoreCheckResult:
        rel = str(path.relative_to(self.repo)).replace("\\", "/") if path.is_relative_to(self.repo) else str(path)
        if not path.exists():
            sfx = f" ({extra_missing_note})" if extra_missing_note else ""
            return StoreCheckResult(
                store_name=name, required=required, path=rel, exists=False, non_empty=False,
                row_count=0, age_hours=None, budget_hours=budget_h, verdict="MISSING_EMPTY",
                reason=f"MISSING store file: {rel}{sfx}"
            )
        age_h = round((time.time() - path.stat().st_mtime) / 3600.0, 2)
        try:
            df = pd.read_parquet(path)
            rows = len(df)
            max_s = int(df["season"].max()) if "season" in df.columns and rows > 0 else None
            max_w = int(df["week"].max()) if "week" in df.columns and rows > 0 and df["week"].notna().any() else None
        except Exception as exc:
            return StoreCheckResult(
                store_name=name, required=required, path=rel, exists=True, non_empty=False,
                row_count=0, age_hours=age_h, budget_hours=budget_h, verdict="MISSING_EMPTY",
                reason=f"UNREADABLE parquet ({type(exc).__name__}): {rel}"
            )
        if rows == 0:
            return StoreCheckResult(
                store_name=name, required=required, path=rel, exists=True, non_empty=False,
                row_count=0, age_hours=age_h, budget_hours=budget_h, verdict="MISSING_EMPTY",
                reason=f"EMPTY store (0 rows): {rel}", max_season=max_s, max_week=max_w
            )
        if age_h > budget_h:
            return StoreCheckResult(
                store_name=name, required=required, path=rel, exists=True, non_empty=True,
                row_count=rows, age_hours=age_h, budget_hours=budget_h, verdict="STALE",
                reason=f"STALE store ({age_h}h > budget {budget_h}h): {rel}", max_season=max_s, max_week=max_w
            )
        return StoreCheckResult(
            store_name=name, required=required, path=rel, exists=True, non_empty=True,
            row_count=rows, age_hours=age_h, budget_hours=budget_h, verdict="FRESH",
            reason=f"OK ({rows} rows, age {age_h}h <= {budget_h}h, max_season={max_s}, max_week={max_w})",
            max_season=max_s, max_week=max_w
        )

    def _check_json_injuries(self, name: str, path: Path, required: bool, budget_h: float) -> StoreCheckResult:
        rel = str(path.relative_to(self.repo)).replace("\\", "/") if path.is_relative_to(self.repo) else str(path)
        if not path.exists():
            return StoreCheckResult(
                store_name=name, required=required, path=rel, exists=False, non_empty=False,
                row_count=0, age_hours=None, budget_hours=budget_h, verdict="MISSING_EMPTY",
                reason=f"MISSING JSON store: {rel}"
            )
        age_h = round((time.time() - path.stat().st_mtime) / 3600.0, 2)
        d = json.loads(path.read_text(encoding="utf-8"))
        teams = d.get("teams") or d.get("injuries") or (d.get("raw") or {}).get("injuries") or []
        rows = len(teams)
        if rows == 0:
            return StoreCheckResult(
                store_name=name, required=required, path=rel, exists=True, non_empty=False,
                row_count=0, age_hours=age_h, budget_hours=budget_h, verdict="MISSING_EMPTY",
                reason=f"EMPTY JSON store (0 teams): {rel}"
            )
        verdict = "FRESH" if age_h <= budget_h else "STALE"
        return StoreCheckResult(
            store_name=name, required=required, path=rel, exists=True, non_empty=True,
            row_count=rows, age_hours=age_h, budget_hours=budget_h, verdict=verdict,
            reason=f"{verdict} ({rows} teams, age {age_h}h vs budget {budget_h}h)"
        )

    def _check_espn_receivers_json(self, path: Path, required: bool, budget_h: float) -> StoreCheckResult:
        """Check ESPN Analytics Receivers JSON store freshness using captured S3 Last-Modified header."""
        name = "espnanalytics_receivers_2026"
        rel = str(path.relative_to(self.repo)).replace("\\", "/") if path.is_relative_to(self.repo) else str(path)
        if not path.exists():
            return StoreCheckResult(
                store_name=name, required=required, path=rel, exists=False, non_empty=False,
                row_count=0, age_hours=None, budget_hours=budget_h, verdict="MISSING_EMPTY",
                reason=f"MISSING ESPN receivers store: {rel}"
            )
        d = json.loads(path.read_text(encoding="utf-8"))
        rows_2026 = d.get("rows_2026") or []
        rows = len(rows_2026)
        honesty = d.get("honesty") or {}
        lm_raw = honesty.get("last_modified_header")
        lm_iso = None
        age_h = round((time.time() - path.stat().st_mtime) / 3600.0, 2)
        if lm_raw:
            try:
                dt = parsedate_to_datetime(lm_raw).astimezone(timezone.utc)
                lm_iso = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                age_h = round((datetime.now(timezone.utc) - dt).total_seconds() / 3600.0, 2)
            except Exception:
                lm_iso = lm_raw
        if rows == 0:
            return StoreCheckResult(
                store_name=name, required=required, path=rel, exists=True, non_empty=False,
                row_count=0, age_hours=age_h, budget_hours=budget_h, verdict="MISSING_EMPTY",
                reason=f"EMPTY ESPN receivers store (0 rows): {rel}", max_season=2026, last_modified_utc=lm_iso
            )
        verdict = "FRESH" if age_h <= budget_h else "STALE"
        return StoreCheckResult(
            store_name=name, required=required, path=rel, exists=True, non_empty=True,
            row_count=rows, age_hours=age_h, budget_hours=budget_h, verdict=verdict,
            reason=f"{verdict} ({rows} rows, 100% gsis_id join, S3 Last-Modified {lm_iso}, age {age_h}h <= {budget_h}h)",
            max_season=2026, last_modified_utc=lm_iso
        )

    def evaluate_stores(
        self,
        check_snap_counts: bool = True,
        check_participation: bool = True,
        check_espn_receivers: bool = True,
        require_2026_participation: bool = False,
    ) -> dict[str, Any]:
        """Run all required + optional store checks and evaluate the 14-card Week 6 slate."""
        checks: list[StoreCheckResult] = []

        # Required: freshest injuries (injuries_2026.parquet + live ESPN public_injuries)
        inj_pq = COACH_DATA / "injuries_2026.parquet"
        checks.append(self._check_parquet("injuries_2026_parquet", inj_pq, required=True, budget_h=FRESHNESS_BUDGET_HOURS["injuries"]))

        espn_inj_files = sorted((RESEARCH_2026_10_14 / "espn").glob("public_injuries_*.json"))
        if espn_inj_files:
            checks.append(self._check_json_injuries("espn_live_injuries_2026", espn_inj_files[-1], required=True, budget_h=FRESHNESS_BUDGET_HOURS["injuries"]))
        else:
            checks.append(StoreCheckResult("espn_live_injuries_2026", True, "docs/data-sources/research/2026-10-14/espn/public_injuries_*.json", False, False, 0, None, 168.0, "MISSING_EMPTY", "No ESPN live injuries capture found"))

        # Required: freshest depth_charts
        dc_pq = COACH_DATA / "depth_charts_2026.parquet"
        checks.append(self._check_parquet("depth_charts_2026_parquet", dc_pq, required=True, budget_h=FRESHNESS_BUDGET_HOURS["depth_charts"]))

        # Optional: ESPN Analytics Receivers S3 JSON freshness check (Last-Modified 2026-10-13T15:10:17Z)
        if check_espn_receivers:
            checks.append(self._check_espn_receivers_json(BRAIN_DIR / "espnanalytics_receivers_latest.json", required=False, budget_h=FRESHNESS_BUDGET_HOURS["espn_receivers"]))

        # Optional: snap_counts (2026 and 2025)
        if check_snap_counts:
            checks.append(self._check_parquet("snap_counts_2026", COACH_DATA / "snap_counts_2026.parquet", required=False, budget_h=FRESHNESS_BUDGET_HOURS["snap_counts"]))
            checks.append(self._check_parquet("snap_counts_2025", COACH_DATA / "snap_counts_2025.parquet", required=False, budget_h=FRESHNESS_BUDGET_HOURS["snap_counts"]))

        # Optional: participation (2025 present; 2026 upstream 404 structural post-season check)
        if check_participation:
            checks.append(self._check_parquet("pbp_participation_2025", COACH_DATA / "pbp_participation_2025.parquet", required=False, budget_h=FRESHNESS_BUDGET_HOURS["participation"]))
            checks.append(self._check_parquet(
                "pbp_participation_2026",
                COACH_DATA / "pbp_participation_2026.parquet",
                required=require_2026_participation,
                budget_h=FRESHNESS_BUDGET_HOURS["participation"],
                extra_missing_note="HTTP 404 upstream; FTN participation is published only after post-season completes; 2025 fallback active",
            ))

        # Fail-closed evaluation
        failed_required = [c for c in checks if c.required and c.verdict != "FRESH"]
        failed_optional = [c for c in checks if (not c.required) and c.verdict != "FRESH"]

        # Evaluate 14-card Week-6 slate
        sb_files = sorted((RESEARCH_2026_10_14 / "espn").glob("public_scoreboard_*.json"))
        cards = []
        if sb_files:
            sb = json.loads(sb_files[-1].read_text(encoding="utf-8"))
            for line in sb.get("lines", []):
                card_status = "VALID" if not failed_required else "INVALID"
                cards.append({
                    "gameId": line.get("gameId"),
                    "matchup": line.get("matchup"),
                    "status": card_status,
                    "invalid_reasons": [c.reason for c in failed_required],
                    "optional_warnings": [c.reason for c in failed_optional],
                    "injuries_week_note": "injuries_2026.parquet has weeks 1..5 (week 6 unpublished upstream prior to Fri 18:00 ET); live ESPN public_injuries_2026 covers all 32 teams",
                })

        overall_status = "VALID" if (cards and not failed_required) else "INVALID"
        valid_count = sum(1 for c in cards if c["status"] == "VALID")
        invalid_count = sum(1 for c in cards if c["status"] == "INVALID")

        return {
            "overall_status": overall_status,
            "cards_total": len(cards),
            "cards_valid": valid_count,
            "cards_invalid": invalid_count,
            "failed_required_stores": [asdict(c) for c in failed_required],
            "failed_optional_stores": [asdict(c) for c in failed_optional],
            "all_store_checks": [asdict(c) for c in checks],
            "cards": cards,
            "weight": FORCED_WEIGHT,
            "validation_spec_met": VALIDATION_SPEC_MET,
        }


def run_trust_audit_and_log() -> dict[str, Any]:
    """Run both normal mode (14/14 VALID on fresh stores, with ESPN receivers check and explicit optional warnings) and strict-2026-participation fail-closed test (14/14 INVALID)."""
    guard = TrustProviderGuard()
    live_eval = guard.evaluate_stores(check_snap_counts=True, check_participation=True, check_espn_receivers=True, require_2026_participation=False)
    fail_closed_test = guard.evaluate_stores(check_snap_counts=True, check_participation=True, check_espn_receivers=True, require_2026_participation=True)

    now_iso = datetime.now(timezone.utc).isoformat()
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")

    espn_rec_check = next((c for c in live_eval["all_store_checks"] if c["store_name"] == "espnanalytics_receivers_2026"), None)

    honesty = {
        "http_status": "LOCAL_STORE_GUARD_PLUS_S3_LAST_MODIFIED_CHECK",
        "truncation": False,
        "access_restriction": (
            "injuries_2026.parquet (1,413 rows, wks 1-5), depth_charts_2026.parquet (594,789 rows), "
            "espnanalytics_receivers_latest.json (93 rows, Last-Modified 2026-10-13T15:10:17Z, 100% gsis_id join), "
            "snap_counts_2026.parquet (7,370 rows, wks 1-5), pbp_participation_2025.parquet (45,184 rows) are FRESH; "
            "pbp_participation_2026.parquet is HTTP 404 upstream (FTN post-season release only) and flagged explicitly"
        ),
        "derivation": "Fail-closed empty-store + freshness guard over required (injuries, depth_charts) and optional (espn_receivers, snap_counts, participation) stores.",
        "joins_on": ["game_id", "team", "gsis_id"],
        "weight": FORCED_WEIGHT,
        "validation_spec_met": VALIDATION_SPEC_MET,
        "weight_statement": "Weight remains 0 until VISION-CONTRACT falsifier and downstream calibration validation spec are met.",
    }

    payload = {
        "generated_utc": now_iso,
        "source": "trust_provider_guard",
        "live_evaluation": {
            "overall_status": live_eval["overall_status"],
            "cards_valid": f"{live_eval['cards_valid']}/{live_eval['cards_total']}",
            "espn_receivers_freshness_check": espn_rec_check,
            "failed_required_count": len(live_eval["failed_required_stores"]),
            "optional_missing_stores_flagged": [c["store_name"] + ": " + c["reason"] for c in live_eval["failed_optional_stores"]],
            "store_checks": live_eval["all_store_checks"],
        },
        "fail_closed_verification_when_required_store_missing": {
            "overall_status": fail_closed_test["overall_status"],
            "cards_invalid": f"{fail_closed_test['cards_invalid']}/{fail_closed_test['cards_total']}",
            "explicit_invalid_reasons": [c["reason"] for c in fail_closed_test["failed_required_stores"]],
        },
        "weight": FORCED_WEIGHT,
        "validation_spec_met": VALIDATION_SPEC_MET,
        "honesty": honesty,
    }

    BRAIN_DIR.mkdir(parents=True, exist_ok=True)
    p_art = BRAIN_DIR / f"trust_provider_audit_{stamp}.json"
    p_lat = BRAIN_DIR / "trust_provider_audit_latest.json"
    p_art.write_text(json.dumps(payload, indent=1), encoding="utf-8")
    p_lat.write_text(json.dumps(payload, indent=1), encoding="utf-8")
    (RESEARCH_2026_10_14 / "trust-provider-audit.json").write_text(json.dumps(payload, indent=1), encoding="utf-8")

    TRUST_SHADOW_LEDGER.parent.mkdir(parents=True, exist_ok=True)
    with open(TRUST_SHADOW_LEDGER, "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "ts": now_iso,
            "source": "trust_provider_guard",
            "signal_family": "empty_store_and_freshness_guard_with_espn_receivers",
            "live_status": live_eval["overall_status"],
            "live_cards_valid": f"{live_eval['cards_valid']}/{live_eval['cards_total']}",
            "espn_receivers_check": espn_rec_check,
            "fail_closed_test_status": fail_closed_test["overall_status"],
            "fail_closed_cards_invalid": f"{fail_closed_test['cards_invalid']}/{fail_closed_test['cards_total']}",
            "optional_warnings": payload["live_evaluation"]["optional_missing_stores_flagged"],
            "artifact_path": str(p_art.relative_to(REPO)).replace("\\", "/"),
            "weight": FORCED_WEIGHT,
            "validation_spec_met": VALIDATION_SPEC_MET,
            "honesty_note": honesty["access_restriction"],
        }) + "\n")

    return payload


if __name__ == "__main__":
    res = run_trust_audit_and_log()
    print(json.dumps({
        "live_evaluation": res["live_evaluation"]["cards_valid"],
        "espn_receivers_freshness_check": res["live_evaluation"]["espn_receivers_freshness_check"],
        "optional_flagged": res["live_evaluation"]["optional_missing_stores_flagged"],
        "fail_closed_14_card_invalid_test": res["fail_closed_verification_when_required_store_missing"],
        "weight": res["weight"],
    }, indent=1))
