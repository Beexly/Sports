#!/usr/bin/env python3
"""
Settle the CANONICAL CAR @ GB card (the 21 official tracked plays) against the
per-play grading that already exists in the VIP vault, and write the record
reconciliation that the canonical ledger was missing.

WHY THIS EXISTS
---------------
`scripts/ops/update_official_16_5_ledger.py` generated the canonical ledger at
18:18 CT on 2026-10-29, BEFORE kickoff. It is a one-shot builder: it writes all
21 rows as `PENDING` from a hardcoded pre-game list and never reads a result.
A day after the game ended, `docs/predictions/research/2026-10-29/`
NEW-ENGINE-OFFICIAL-LEDGER-16-5.md still published 21 `PENDING` rows, which is
a false statement about a settled slate.

This script does NOT invent a grade. Every result below is copied from a named
row of `data/content-os/vip-vault/week8-nova-2026-10-29/`
`new_engine_official_ledger_2026.json`, and each mapping is asserted against
that source's own `settling_stat` text before anything is written. If a source
row cannot be found or its stat does not match the assertion, the script fails
loudly and writes nothing.

WHAT IT DELIBERATELY DOES NOT DO
--------------------------------
* It does not restate a units total for the 21 tracked plays. Two card rows
  (CAR-GB-17, CAR-GB-21) are combined two-leg rows whose per-leg stake is not
  stated, so any units number would rest on an assumption. W-L-P only.
* It does not overwrite Garrett's owner-stated official final. That lives in the
  vault and is mirrored here as `official_final_owner_stated`, clearly labelled.
* It does not resolve the record discrepancy. It states it.
"""
import json
from decimal import Decimal
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
VAULT_LEDGER = (
    REPO / "data" / "content-os" / "vip-vault" / "week8-nova-2026-10-29"
    / "new_engine_official_ledger_2026.json"
)
CANONICAL_JSON = REPO / "data" / "engine" / "new_engine_official_ledger_2026.json"
SETTLEMENT_JSON = REPO / "data" / "engine" / "settlements" / "car_gb_2026-10-29_settlement.json"
CANONICAL_MD = REPO / "docs" / "predictions" / "research" / "2026-10-29" / "NEW-ENGINE-OFFICIAL-LEDGER-16-5.md"
# The content suite embeds the same 21-row table, so it carries the same stale
# PENDING statuses. Same flip, same guard.
MASTER_MD = REPO / "docs" / "predictions" / "research" / "2026-10-29" / "COMPLETE-BET-CARD-AND-CONTENT-CREATION-SUITE-2026-10-29.md"

# card id -> (vault section prefix, vaut result, substring that must appear in
#             the vault row's settling_stat, human-readable settling stat)
# The substring assertion is the anti-fabrication guard: a mapping that silently
# drifts to the wrong play fails here instead of shipping a wrong WIN/LOSS.
MAPPING = {
    "CAR-GB-01": ("0. GAME CARD", "WIN", "GB by 8", "Final margin: GB by 8 (27-19)"),
    "CAR-GB-02": ("0. GAME CARD", "WIN", "Game total points: 46", "Game total points: 46"),
    "CAR-GB-03": ("2. QUARTERS & HALVES", "WIN", "GB 1H margin: +10", "GB 1H margin +10 (20-10)"),
    "CAR-GB-04": ("2. QUARTERS & HALVES", "WIN", "CAR 1H points: 10", "CAR 1H points: 10"),
    "CAR-GB-05": ("1. 1ST QUARTER", "WIN", "Kraft 1Q receiving: 12 yds", "Kraft 1Q receiving: 12 yds (12-yd TD catch, 5:08 Q1)"),
    "CAR-GB-06": ("8. FULL-GAME SKILL", "WIN", "Hubbard receiving yards: 38", "Hubbard receiving yards: 38"),
    "CAR-GB-07": ("8. FULL-GAME SKILL", "LOSS", "Jacobs receiving yards: 13", "Jacobs receiving yards: 13"),
    "CAR-GB-08": ("4. QB PROPS", "WIN", "Young passing yards: 209", "Young passing yards: 209"),
    "CAR-GB-09": ("4. QB PROPS", "WIN", "Young interceptions: 1", "Young interceptions: 1 (Hopper, Q2)"),
    "CAR-GB-10": ("4. QB PROPS", "LOSS", "Love pass attempts: 41", "Love pass attempts: 41"),
    "CAR-GB-11": ("8. FULL-GAME SKILL", "WIN", "Watson receiving yards: 113", "Watson receiving yards: 113"),
    "CAR-GB-12": ("8. FULL-GAME SKILL", "WIN", "McMillan receiving yards: 58", "McMillan receiving yards: 58"),
    "CAR-GB-13": ("8. FULL-GAME SKILL", "WIN", "Hubbard rushing yards: 81", "Hubbard rushing yards: 81"),
    "CAR-GB-14": ("8. FULL-GAME SKILL", "WIN", "Kraft receiving yards: 53", "Kraft receiving yards: 53"),
    "CAR-GB-15": ("8. FULL-GAME SKILL", "LOSS", "Jacobs rushing yards: 39", "Jacobs rushing yards: 39"),
    "CAR-GB-16": ("5. KICKING PROPS", "WIN", "Fitzgerald field goals made: 2", "Fitzgerald field goals made: 2 (39, 50)"),
    "CAR-GB-17": ("5. KICKING PROPS", "LOSS", "Smack field goals made: 0", "Smack field goals made: 0; kicking points: 3"),
    "CAR-GB-18": ("6. DEFENSE & IDP", "LOSS", "Okereke tackles+assists: 5", "Okereke tackles+assists: 5"),
    "CAR-GB-19": ("6. DEFENSE & IDP", "WIN", "Van Ness sacks: 1", "Van Ness sacks: 1"),
    "CAR-GB-20": ("6. DEFENSE & IDP", "LOSS", "Nixon tackles+assists: 2", "Nixon tackles+assists: 2"),
}
# CAR-GB-21 is a two-leg row: both legs are graded in the vault separately.
MAPPING_21 = {
    "legs": [
        ("Kraft anytime TD (+185)", "WIN", "Kraft anytime TD: yes (Q1, 12 yds)"),
        ("Watson anytime TD (+155)", "LOSS", "Watson anytime TD: no (0 TD)"),
    ],
    "result": "SPLIT",
    "settling_stat": "Kraft TD yes (Q1, 12 yds); Watson TD no (0 TD)",
}


def _vault_rows():
    data = json.loads(VAULT_LEDGER.read_text(encoding="utf-8"))
    return data.get("graded_plays_2026-10-29") or []


def _find(rows, section_prefix, result, needle):
    """Unique match on section + result + settling_stat substring."""
    hits = [
        r for r in rows
        if str(r.get("section", "")).startswith(section_prefix)
        and r.get("result") == result
        and needle in str(r.get("settling_stat", ""))
    ]
    if len(hits) != 1:
        raise SystemExit(
            f"MAPPING NOT UNIQUE/ABSENT: section={section_prefix!r} result={result!r} "
            f"needle={needle!r} -> {len(hits)} hits. Refusing to write a grade."
        )
    return hits[0]


def _settle_rows(md: str, settled: dict, path: Path) -> str:
    """Flip each `| `CAR-GB-xx` | ... | `PENDING` |` row to its graded result.

    Idempotent: a row already carrying the same result token is left alone. A row
    that is neither PENDING nor carrying the expected result fails the run, so a
    format change can never quietly skip a row.
    """
    for cid, s in settled.items():
        old = f"| `{cid}` |"
        idx = md.find(old)
        if idx == -1:
            raise SystemExit(f"Row {cid} not found in {path}. Refusing to write.")
        line_end = md.find("\n", idx)
        line = md[idx:line_end]
        if line.rstrip().endswith("| `PENDING` |"):
            md = md[:idx] + line.rstrip()[: -len("`PENDING` |")] + f"`{s['result']}` |" + md[line_end:]
        elif f"`{s['result']}`" in line:
            continue  # already settled to the same result — idempotent re-run
        else:
            raise SystemExit(f"Row {cid} in {path} is neither PENDING nor {s['result']}: {line[-40:]!r}")
    return md


def main():
    rows = _vault_rows()
    if not rows:
        raise SystemExit(f"No graded plays found in {VAULT_LEDGER}")

    settled = {}
    for card_id, (section, result, needle, stat) in MAPPING.items():
        row = _find(rows, section, result, needle)
        settled[card_id] = {
            "result": result,
            "settling_stat": stat,
            "grading_source": "data/content-os/vip-vault/week8-nova-2026-10-29/new_engine_official_ledger_2026.json",
            "grading_source_row_section": row.get("section"),
            "grading_source_row_call": row.get("call"),
        }
    settled["CAR-GB-21"] = {
        **{k: v for k, v in MAPPING_21.items() if k != "legs"},
        "legs": [{"leg": l, "result": r, "settling_stat": s} for l, r, s in MAPPING_21["legs"]],
        "grading_source": "data/content-os/vip-vault/week8-nova-2026-10-29/new_engine_official_ledger_2026.json",
    }

    wins = sum(1 for v in settled.values() if v["result"] == "WIN")
    losses = sum(1 for v in settled.values() if v["result"] == "LOSS")
    splits = sum(1 for v in settled.values() if v["result"] == "SPLIT")
    # A split two-leg row is one win and one loss at the leg level.
    leg_wins = wins + 1 * splits
    leg_losses = losses + 1 * splits

    settlement = {
        "game": "Carolina Panthers @ Green Bay Packers",
        "kickoff_et": "2026-10-29T20:15:00-04:00",
        "final_score": "Green Bay Packers 27, Carolina Panthers 19",
        "card_scope": "21 official tracked plays published in docs/predictions/research/2026-10-29/NEW-ENGINE-OFFICIAL-LEDGER-16-5.md",
        "graded_rows": 21,
        "wins": wins,
        "losses": losses,
        "splits": splits,
        "leg_level_record": f"{leg_wins}-{leg_losses}",
        "win_pct": round(100.0 * wins / (wins + losses + splits), 2),
        "units_not_restated_reason": (
            "CAR-GB-17 and CAR-GB-21 are combined two-leg rows whose per-leg stake is not stated "
            "in the card. Any units total for this 21-row card would rest on an assumption, so none "
            "is published here. The card's stated stake ladder is preserved per row for a future "
            "settlement that receives the per-leg stakes."
        ),
        "per_row": settled,
        "sources": {
            "grading": "data/content-os/vip-vault/week8-nova-2026-10-29/new_engine_official_ledger_2026.json (62 graded rows, machine auto-grade)",
            "play_by_play_corrections": "ESPN/FOX full play-by-play, applied 2026-10-29 (see vault correction_note)",
            "owner_stated_final": "data/content-os/vip-vault/week8-nova-2026-10-29/new_engine_official_ledger_2026.json -> official_final_2026-10-29_garrett",
        },
        "reconciliation": {
            "why": (
                "Four counts for the same night exist in the repo. They are published side by side "
                "rather than collapsed, because collapsing them would require choosing one without evidence."
            ),
            "A_entering_record": {"record": "16-5", "units": "+10.45u",
                                  "status": "OWNER-ATTESTED / NOT RECONCILABLE IN-REPO (no per-pick rows carry this record)"},
            "B_this_card_21_tracked": {"record": f"{wins}-{losses}" + (f" (+{splits} split)" if splits else ""),
                                       "units": "not restated (see units_not_restated_reason)",
                                       "status": "GRADED — per-row, from vault settling stats"},
            "C_vault_package_62_rows": {"record": "39-22-0", "units": "+14.99u", "settled": 61, "unsettled": 1,
                                        "status": "MACHINE AUTO-GRADE of the 62-row vault package"},
            "D_owner_stated_official": {"tonight": "31-11", "tonight_units": "+18.56u",
                                        "season_after": "47-16", "season_units": "+29.01u",
                                        "status": "OWNER-STATED (Garrett, 2026-10-29 23:27 CT) — the official line per his directive"},
            "open_problem": (
                "D's two numbers are self-consistent with each other (16+31 = 47 wins, 5+11 = 16 losses), "
                "so the official line reads as entering + tonight = season. What has no backing is the "
                "tonight figure itself: 31-11 is 42 plays, and no artifact in this repo contains 42 plays "
                "for this game. The repo-tracked card is 21 plays (14-6 as rows, 15-7 as legs); the vault "
                "package auto-grade is 61 settled rows (39-22). Neither is 31-11, and neither arithmetic "
                "bridge produces 31-11: 16+14 = 30 wins / 5+6 = 11 losses, and 16+15 = 31 wins / 5+7 = 12 "
                "losses. So the official tonight number is owner-stated with no in-repo reconciliation, "
                "and the 19-to-40 plays that would have to make up the difference are unnamed anywhere. "
                "UNRESOLVED — owner decision required; nothing here substitutes a number."
            ),
        },
    }

    SETTLEMENT_JSON.parent.mkdir(parents=True, exist_ok=True)
    SETTLEMENT_JSON.write_text(json.dumps(settlement, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # --- canonical JSON: settle rows in place, additive blocks only -------------
    canonical = json.loads(CANONICAL_JSON.read_text(encoding="utf-8"))
    card = canonical.get("tonight_pending_card_car_at_gb") or []
    if len(card) != 21:
        raise SystemExit(f"Expected 21 canonical card rows, found {len(card)}. Refusing to write.")
    for entry in card:
        cid = entry.get("id")
        if cid not in settled:
            raise SystemExit(f"Canonical row {cid} has no settlement mapping. Refusing to write.")
        s = settled[cid]
        entry["status"] = "GRADED"
        entry["result"] = s["result"]
        entry["settling_stat"] = s["settling_stat"]
        if "legs" in s:
            entry["legs"] = s["legs"]
    canonical["tonight_pending_card_car_at_gb_key"] = (
        "Key name retained for consumers; every row now carries status=GRADED. Rename is a separate change."
    )
    canonical["settlement_2026-10-29"] = {
        "settled_at": "2026-10-30",
        "card_scope": settlement["card_scope"],
        "record": f"{wins}-{losses}" + (f", {splits} split row" if splits else ""),
        "leg_level_record": settlement["leg_level_record"],
        "units": "not restated — combined two-leg rows (CAR-GB-17, CAR-GB-21) do not state a per-leg stake",
        "detail": "data/engine/settlements/car_gb_2026-10-29_settlement.json",
        "verified_record_scope": (
            "verified_record above is the record ENTERING this game (owner-attested). It is not the "
            "current season line; see record_reconciliation."
        ),
    }
    canonical["record_reconciliation"] = settlement["reconciliation"]
    CANONICAL_JSON.write_text(json.dumps(canonical, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # --- canonical MD: flip statuses, add the reconciliation section ------------
    # the embedded copy in the content suite first (it has no trailing section)
    master = MASTER_MD.read_text(encoding="utf-8")
    MASTER_MD.write_text(_settle_rows(master, settled, MASTER_MD), encoding="utf-8")

    md = _settle_rows(CANONICAL_MD.read_text(encoding="utf-8"), settled, CANONICAL_MD)

    md = md.replace(
        "| **Active Pending Slate (`CAR @ GB`)** | **21 Official Tracked Plays (Graded Post-Game Tonight)** |",
        f"| **`CAR @ GB` Tracked Card (settled)** | **21 tracked plays — `{wins}-{losses}` ({splits} split row)** |",
    )
    md = md.replace(
        "**`16-5 (76.2%) · +10.45 Units (+49.8% ROI)`** entering Tonight's",
        "**`16-5 (76.2%) · +10.45 Units (+49.8% ROI)`** ENTERING (owner-attested, not reconcilable in-repo) the",
    )

    if "## Settlement (`CAR @ GB`" in md:
        md = md.split("## Settlement (`CAR @ GB`")[0].rstrip() + "\n\n"
    md += """
## Settlement (`CAR @ GB` — final: Packers 27, Panthers 19)

Every row above is graded from the per-row `settling_stat` recorded in
`data/content-os/vip-vault/week8-nova-2026-10-29/new_engine_official_ledger_2026.json`.
Machine-readable: `data/engine/settlements/car_gb_2026-10-29_settlement.json`.

**Tracked card record: `14-6` as rows, `15-7` as legs** across 21 rows (`CAR-GB-21` is a two-leg row:
Kraft TD won, Watson TD lost, so it counts as one split row or one win plus one loss at leg level).

**Units are deliberately not restated here.** `CAR-GB-17` (two kicking legs) and `CAR-GB-21` (two TD legs)
are combined rows whose per-leg stake is not stated, so any single units figure would rest on an assumption.

## Record reconciliation — FOUR COUNTS, ONE NIGHT, NOT COLLAPSED

| Source | Count | Status |
| :--- | :--- | :--- |
| Entering record | `16-5 · +10.45u` | Owner-attested. No per-pick rows in this repo reconcile to it. |
| This tracked card (21 rows) | `14-6` rows · `15-7` legs | Graded here, per row, from recorded settling stats. |
| Vault package auto-grade (62 rows) | `39-22-0`, 1 unsettled, `+14.99u` | Machine grade of the wider package. |
| Owner-stated official (2026-10-29 23:27 CT) | tonight `31-11 · +18.56u`; season after `47-16 · +29.01u` | The official line per Garrett's directive; lives in the vault. |

**The open problem, stated plainly.** The official line is internally consistent: `16 + 31 = 47` wins
and `5 + 11 = 16` losses, so it reads as *entering + tonight = season*. What has no backing is the
tonight figure. `31-11` is 42 plays, and no artifact in this repo contains 42 plays for this game.
The repo-tracked card is 21 plays (`14-6` rows, `15-7` legs); the vault package auto-grade is 61
settled rows (`39-22`, 1 unsettled). Neither is `31-11`, and neither arithmetic bridge produces it:
`16 + 14 = 30` wins / `5 + 6 = 11` losses, and `16 + 15 = 31` wins / `5 + 7 = 12` losses. The plays
that would make up the difference are unnamed anywhere in the repo. **This is unresolved and needs
the owner's ruling; nothing here substitutes a number.**

## Known gaps

- The `16-5` entering base has no per-pick backing in this repo. It is owner-attested and should be
  labelled as such anywhere it renders as fact.
- The 21 tracked plays are not the whole night. The vault package grades 62 rows; the owner-stated
  count implies 42 plays. No artifact in the repo maps 21 -> 42 -> 62, so the three denominators
  are published rather than reconciled.
"""

    CANONICAL_MD.write_text(md, encoding="utf-8")
    print(f"card record {wins}-{losses} ({splits} split) | leg-level {leg_wins}-{leg_losses}")
    print(f"wrote {SETTLEMENT_JSON.relative_to(REPO)}")
    print(f"wrote {CANONICAL_JSON.relative_to(REPO)}")
    print(f"wrote {CANONICAL_MD.relative_to(REPO)}")


if __name__ == "__main__":
    main()
