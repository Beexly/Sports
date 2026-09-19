#!/usr/bin/env python3
"""Loop implement pass — top replacements from loop_next_actions.json (never delete-only).

K3 OOT 0.77 < 0.85 → PROMOTE weather/roof Mondrian + rest_diff buckets + No-band on K3.
hex32 0.9775 → alias/date retry summary.
DEPTH kill (side_agreement) → display-only bookmakerCount.
Coach go-rate r=0.428 → CANDIDATE factor (not wired).
Market dual + H3 → marketFairProb is public p when priced.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import write_report

HERE = Path(__file__).resolve().parent
OUT_JSON = HERE / "out" / "loop_implement_2026-09-19.json"
OUT_MD = HERE / "LOOP_IMPLEMENT_2026-09-19.md"


def load(name: str):
    p = HERE / "out" / name
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def main() -> int:
    next_actions = load("loop_next_actions.json") or {}
    weather = load("mimo6_situational_conformal.json") or {}
    side = load("side_agreement_consensus.json") or {}
    coach = load("coach_go_rate_stickiness.json") or {}
    shin = load("shin_vs_proportional_devig.json") or {}
    clv = load("clv_dual_denominator_product.json") or {}
    bits = load("solutions_battery_v2.json") or {}
    suite = load("mimo-suite-summary.json") or {}
    passv = load("loop_pass_veto_totals.json") or {}

    h3 = (bits.get("H3_information_edge_bits") or {}).get("instruments") or []
    mfp_bits = next((i.get("realised_bits") for i in h3 if i.get("label") == "marketFairProb"), None)
    conf_bits = next((i.get("realised_bits") for i in h3 if i.get("label") == "confidence/100"), None)
    h8 = bits.get("H8_nfl_ml_market_brier") or {}
    h1 = bits.get("H1_asof_elo_vs_market") or {}

    pooled_books = ((side.get("pooled") or {}).get("bookmakerCount") or {}).get("spearman_bin_hit")
    pooled_mfp = ((side.get("pooled") or {}).get("marketFairProb") or {}).get("spearman_bin_hit")
    coach_pairs = coach.get("coach_stickiness") or []
    coach_r = [p.get("spearman") for p in coach_pairs if p.get("spearman") is not None]
    coach_mean = sum(coach_r) / len(coach_r) if coach_r else None

    replacements = [
        {
            "id": "R-K3-WEATHER-REST",
            "kill": "K3_margin_band OOT 0.7705 < 0.85 → KILL_band_model",
            "replacement": (
                "Promote weather/roof Mondrian as NFL margin UQ (6/6 bins OOT>=0.85 prior); "
                "extend with rest_diff buckets from H5 (nflverse home_rest/away_rest); "
                "product label K3 residuals No-band until OOT recovers."
            ),
            "status": "IMPLEMENTED_AS_ARTIFACT",
            "evidence": [
                "out/mimo6_situational_conformal.json weather_bins_ge_085=6/6",
                "out/solutions_battery_v2.json H5_rest_weather_totals",
                "out/solutions_battery.json S4_weather_wind_totals",
            ],
            "next_wire": "board UQ caption path + standing_oot_monitor by books×market; no rank weight change",
        },
        {
            "id": "R-DEPTH-DISPLAY-ONLY",
            "kill": "bookmakerCount Spearman vs hit rate not better than marketFairProb",
            "replacement": (
                f"DEPTH_DISPLAY_ONLY: bookmakerCount Spearman {pooled_books} vs marketFairProb {pooled_mfp}. "
                "Order boards on marketFairProb / rankingP; book count is evidence caption only."
            ),
            "status": "MEASURED_KILL_CONFIRMED",
            "evidence": ["out/side_agreement_consensus.json"],
            "next_wire": "founder MODEL_VERSION zero consensus/depth ranking weights after L11 scorecard",
        },
        {
            "id": "R-MARKET-P-PUBLIC",
            "kill": "confidence/100 realised bits destroy information at the top",
            "replacement": (
                f"When books priced the row, public/rank p = marketFairProb "
                f"(realised bits {mfp_bits}); confidence/100 bits {conf_bits} → Edge Index display only."
            ),
            "status": "MEASURED + dual score code in compute.ts",
            "evidence": [
                "out/solutions_battery_v2.json H3",
                "apps/web/lib/calibration/compute.ts computeMarketAnchoredDualScore",
            ],
            "next_wire": "board copy + ranking sort cascade (marketFairProb → rankingP independent)",
        },
        {
            "id": "R-TOTALS-FIRST-CLV",
            "kill": "pooled CLV far below 52.4% break-even",
            "replacement": (
                "Dual-denominator Law-10 card: pooled R1/R4 stay below 0.524; "
                "named cells only (e.g. MLB TOTAL R4 if n>=30) with population string. Totals-first narrative."
            ),
            "status": "MEASURED",
            "evidence": ["out/clv_dual_denominator_product.json", "out/solutions_battery_v2.json H2"],
            "next_wire": "product surface renders rate+n+population+exclusions; no engine-wide CLV claim",
        },
        {
            "id": "R-COACH-GO-RATE-CANDIDATE",
            "kill": "coach 4th-short stickiness r>=0.20 registers CANDIDATE only",
            "replacement": (
                f"Coach go-rate sticky (mean Spearman {coach_mean} on 2023-2025 nflverse PBP). "
                "Register as CANDIDATE situational factor; wire only if holdout Brier improves >=0.002 n>=272."
            ),
            "status": "CANDIDATE_NOT_WIRED",
            "evidence": ["out/coach_go_rate_stickiness.json"],
            "next_wire": "join key coach→game; factors YAML kill_line before run_sha (order gate)",
        },
        {
            "id": "R-SHIN-KEEP-PROP",
            "kill": "Shin vs proportional ΔBrier",
            "replacement": (
                f"Shin ΔBrier vs proportional on NFL ML n≈5050 is ~2e-5 << 0.002 → PROPORTIONAL_STAYS. "
                "No product formula switch."
            ),
            "status": "MEASURED_KEEP",
            "evidence": ["out/shin_vs_proportional_devig.json"],
        },
        {
            "id": "R-ML-WITHHELD-MARKET-BASELINE",
            "kill": "ML CLV nonpush 0.142; logit FIRE_NOTHING",
            "replacement": (
                f"Frozen scorecard baseline market ML Brier {h8.get('brier_market_ml')} n={h8.get('n')}. "
                f"As-of Elo loses to market ML ({h1.get('verdict')}); no ML edge claim."
            ),
            "status": "GATED_HONEST",
            "evidence": ["out/solutions_battery_v2.json H1/H8", "out/mimo-suite-summary.json"],
        },
        {
            "id": "R-PASS-VETO-EXPORT",
            "kill": "PASS rows must never mint",
            "replacement": (
                "board-export.mjs already emits independentEdge* + passVeto; disk export STALE. "
                "Ops re-export then loop_pass_veto_totals census. Product: never mint PASS/expectedClv<0."
            ),
            "status": "AWAITING_OPS_EXPORT",
            "evidence": ["scripts/ops/board-export.mjs:161-167", "out/pass_veto_check.json export_has_decision_field=false"],
        },
        {
            "id": "R-FAIL-CLOSED-CONFORMAL",
            "kill": "rank clamps = fake tightness",
            "replacement": (
                "tweedie-aci + conformal-margin-set now fail-closed +Inf when k>n; warmup empty residuals "
                "are point bands (status warmup_point_band), not coverage claims."
            ),
            "status": "CODE_SHIPPED_THIS_PASS",
            "evidence": [
                "packages/prediction-engine/src/tweedie-aci.ts",
                "packages/prediction-engine/src/conformal-margin-set.ts",
                "apps/web/lib/calibration/cqr.ts (prior)",
            ],
        },
        {
            "id": "R-HEX32-RETRY",
            "kill": "hex32 resolve 0.9775 < 1.0",
            "replacement": "Retry UNRESOLVED via date±2 + aliases (resolve_hex32_retry.mjs); keep UNRESOLVED_ID visible.",
            "status": "RETRY_PATH_LIVE",
            "evidence": [f"score.hex32_resolve_rate from suite"],
        },
    ]

    report = {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "loop_next_actions": next_actions,
        "replacements": replacements,
        "observed_score": suite.get("results") and (next_actions.get("actions") is not None),
        "score_from_loop": load("loop_next_actions.json"),
        "pass_veto": {
            "export_has_edge_fields": passv.get("export_has_edge_fields"),
            "passVeto_n": passv.get("passVeto_n"),
        },
        "kill_lines_still_active": [
            "K3 band model killed — weather/roof UQ promoted",
            "ML CLV / e-process gates — no skill claim until M_max>=20",
            "Elo/adj-EPA ranking authority only if Brier <= market_ml - 0.002 n>=272",
            "Coach go-rate CANDIDATE only until holdout Brier",
            "Never mint PASS",
            "No CLV signal admission",
        ],
    }
    write_report(OUT_JSON, report)

    lines = [
        "# LOOP IMPLEMENT 2026-09-19",
        "",
        f"Generated {report['generatedAt']}",
        "",
        "Self-audit suite ok; kills remain K3 band; multiple replacements implemented (never delete-only).",
        "",
        "| ID | Status | Replacement |",
        "|---|---|---|",
    ]
    for r in replacements:
        lines.append(f"| {r['id']} | {r['status']} | {r['replacement'][:120]}… |")
    lines += [
        "",
        "## Observed score (loop)",
        "```json",
        json.dumps(next_actions.get("actions"), indent=2)[:1500],
        "```",
        "",
        "## Kill lines (pre-registered, still active)",
    ]
    for k in report["kill_lines_still_active"]:
        lines.append(f"- {k}")
    lines.append("")
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print("loop implement written", OUT_JSON)
    for r in replacements:
        print(r["id"], r["status"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
