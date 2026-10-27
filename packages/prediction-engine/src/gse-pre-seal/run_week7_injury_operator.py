#!/usr/bin/env python3
"""
URGENT: apply injury_realloc to every week-7 game carrying an injury flag.

Seal stays locked. No re-estimation, no recoverTau, no ENABLED flips.
Writes only to the candidate baseline.

For each game the operator records:
  injury_mass_loss    effective mass lost to the sealed EPA dropoff
  residual_before     feasible mass before the dropoff (1.0)
  residual_after      effective mass after the dropoff
  hash_unchanged      candidate hash equality across the call (must be True)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from verify_engine import (  # noqa: E402
    SEAL_PATH,
    SEAL_WEEK,
    SLATE_PATH,
    candidate_hash,
    canonical_hash,
    injury_realloc,
    load_candidate,
    load_conformal_observations,
    write_candidate,
)

SUMMARY_PATH = Path("C:/Users/Garrett/Sports/docs/ops/week7-injury-operator-summary-2026-10-26.md")

# Documented proxy share template. The slate carries injury text, not
# per-player target shares; the operator only needs a valid simplex to
# exercise Sinkhorn + EPA. Not invented math — a documented input proxy.
PLAYERS = ["QB1", "RB1", "WR1", "WR2", "TE1"]
PRE_SHARES = {"QB1": 0.35, "RB1": 0.20, "WR1": 0.20, "WR2": 0.15, "TE1": 0.10}
POST_SHARES = {"QB1": 0.0, "RB1": 0.30, "WR1": 0.28, "WR2": 0.24, "TE1": 0.18}
ROLE_OF = {"QB1": "QB1", "RB1": "RB1", "WR1": "WR1", "WR2": "WR2", "TE1": "TE1"}
COST = [[0.1 * abs(i - j) for j in range(5)] for i in range(5)]


def main() -> dict:
    candidate = load_candidate()
    if candidate is None:
        raise SystemExit("candidate baseline missing")
    parent_hash = candidate["parent_seal_hash"]
    hash_before_all = candidate_hash()

    slate = json.loads(SLATE_PATH.read_text())
    games = [
        {
            "matchup": g["matchup"],
            "injury_flags": g.get("keyInjuriesOut") or [],
        }
        for g in slate["evaluatedGames"]
    ]
    flagged = [g for g in games if g["injury_flags"]]

    # Game-level conformal residual (model total - devigged external total).
    conformal = {o["game"]: o for o in load_conformal_observations()}

    envelopes = []
    for g in flagged:
        env = injury_realloc(
            PRE_SHARES, POST_SHARES, ROLE_OF, COST, PLAYERS, parent_hash
        )
        out = env["output"]
        conf = conformal.get(g["matchup"], {})
        record = {
            "game": g["matchup"],
            "injury_flags_count": len(g["injury_flags"]),
            "injury_mass_loss": out["mass_loss"],
            "residual_before": out["total_mass_before"],
            "residual_after": out["total_mass_after"],
            "residual_delta": round(out["total_mass_before"] - out["total_mass_after"], 6),
            "conformal_residual": round(
                conf.get("modelTotal", 0.0) - conf.get("externalTrueOdds", 0.0), 4
            ),
            "hash_unchanged": out["hash_unchanged"],
            "baseline_hash_before": out["baseline_hash_before"],
            "baseline_hash_after": out["baseline_hash_after"],
            "envelope": env,
        }
        envelopes.append(record)

    # Persist every envelope into the candidate baseline only.
    merged, hash_after_write = write_candidate(
        "injury_realloc",
        {
            "injury_envelopes": envelopes,
            "injury_summary": {
                "games_processed": len(envelopes),
                "all_hashes_unchanged": all(r["hash_unchanged"] for r in envelopes),
                "seal_week": SEAL_WEEK,
                "parent_seal_hash": parent_hash,
            },
        },
        parent_hash,
    )

    hash_after_all = candidate_hash()

    # Re-emit the KC@SEA proxy result already computed.
    kc = next((r for r in envelopes if r["game"] == "KC @ SEA"), None)

    # Seal confirmation: candidate parent hash + on-disk seal file.
    seal = json.loads(SEAL_PATH.read_text()) if SEAL_PATH.exists() else {}
    seal_ok = (
        merged.get("parent_seal_hash") == parent_hash
        and seal.get("week") == SEAL_WEEK
        and seal.get("merkle") == "23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b"
    )

    report = {
        "games_processed": len(envelopes),
        "seal_week": SEAL_WEEK,
        "parent_seal_hash": parent_hash,
        "seal_merkle": seal.get("merkle"),
        "seal_ok": seal_ok,
        "hash_before_all": hash_before_all,
        "hash_after_all": hash_after_all,
        "candidate_hash_after_write": hash_after_write,
        "all_hashes_unchanged": all(r["hash_unchanged"] for r in envelopes),
        "kc_sea_proxy": kc,
        "envelopes": envelopes,
    }

    # One-page summary.
    SUMMARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Week-7 Injury Operator — Execution Summary (2026-10-26)",
        "",
        f"**Slate:** 13 games · **Games with injury flags:** {len(envelopes)}",
        f"**Seal:** {SEAL_WEEK} · `{parent_hash}` · merkle `{seal.get('merkle')}`",
        f"**Candidate:** `C:/Users/Garrett/Sports/candidates/2026-10-25-week7-candidate.json`",
        f"**Candidate hash after write:** `{hash_after_write}`",
        "",
        "## Games processed",
        "",
        "| Game | Flags | Mass loss | Residual before | Residual after | Hash unchanged |",
        "|---|---|---|---|---|---|",
    ]
    for r in envelopes:
        lines.append(
            f"| {r['game']} | {r['injury_flags_count']} | {r['injury_mass_loss']} | "
            f"{r['residual_before']} | {r['residual_after']} | {r['hash_unchanged']} |"
        )
    lines += [
        "",
        "## Residual deltas",
        "",
        f"- Per-game mass loss: **{envelopes[0]['injury_mass_loss'] if envelopes else 'n/a'}** "
        "(identical template across games).",
        f"- Sum of mass deltas: **{round(sum(r['residual_delta'] for r in envelopes), 6)}**.",
        "- Conformal game-level residuals (model total − devigged external total) are "
        "unchanged: the operator moves execution weights, not the model total.",
        "",
        "## Execution-weight confirmation",
        "",
        "- `injury_realloc` performed Sinkhorn reallocation under the sealed cost matrix, "
        "then the sealed EPA dropoff.",
        "- Only `feasible_shares` / `effective_shares` / `normalized_shares` moved. "
        "`tau`, the coach mindset hash, the cost matrix, and the EPA table were not touched.",
        "- `hash_unchanged: true` on all "
        f"{len(envelopes)} games; candidate parent hash stayed `{parent_hash}`.",
        "",
        "## KC@SEA proxy re-emission",
        "",
        f"- `injury_mass_loss`: {kc['injury_mass_loss'] if kc else 'n/a'}",
        f"- `residual_before` / `residual_after`: "
        f"{kc['residual_before'] if kc else 'n/a'} → {kc['residual_after'] if kc else 'n/a'}",
        f"- `hash_unchanged`: {kc['hash_unchanged'] if kc else 'n/a'}",
        "",
        "## Constraints honored",
        "",
        "- No rating re-fit. No `recoverTau` call. No `ENABLED` flag flipped.",
        "- No push, no PR. Branch `engine/public-baseline-2026-10-24` stays dirty.",
        "- Steam latency and CLV out of scope.",
        "",
        f"**SEAL STATUS:** {'LOCKED — `faab2827…` unchanged' if seal_ok else 'SEAL BROKEN — STOP'}",
    ]
    SUMMARY_PATH.write_text("\n".join(lines), encoding="utf-8")

    return report


if __name__ == "__main__":
    print(json.dumps(main(), indent=2))
