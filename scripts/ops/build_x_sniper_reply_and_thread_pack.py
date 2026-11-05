#!/usr/bin/env python3
"""
GSE X/Twitter Heavy-Ranker Thread & Sniper Reply Pack Builder (Week 9, 2026)
============================================================================
Enforces:
  1. Stage 0 Pre-Flight Live Roster Gate (`require_week(9)`) before generating any copy.
  2. X Heavy Ranker optimization (`+75.0x` author-reply weight, `-369x` report avoidance,
     ZERO external links in Tweet #1, room/proof URL placed strictly in Reply #2/#3).
  3. Zero `%` confidence formatting (`XX/100` conviction only).
  4. Official Verified Ledger: 38-13-1 (74.5 out of 100, +22.85u) & Week 8 7-of-7 Max-Play Sweep.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.preflight_live_roster_injury_gate import assert_lineup_clean, require_week


def build_x_pack() -> dict:
    cfg = require_week(9)
    out_json = REPO_ROOT / "data" / "engine" / "x_week9_sniper_reply_and_thread_pack_2026.json"
    out_md = REPO_ROOT / "docs" / "predictions" / "research" / "2026-11-04" / "X-WEEK9-SNIPER-REPLY-AND-THREAD-PACK.md"

    threads = [
        {
            "thread_id": "W9-THREAD-01-WEEK8-RECEIPTS",
            "title": "Week 8 Forensic Audit: 7-of-7 Max-Play Sweep & 38-13-1 (+22.85u) Verified Ledger",
            "tweets": [
                (
                    "Week 8 Forensic Receipt: 22-8-1 (+12.40u) and a 7-0 sweep on every 1.00u top-conviction release.\n\n"
                    "• Rams -6.5 (84/100) — W (34-17)\n"
                    "• Steelers -3.5 (82/100) — W (26-16)\n"
                    "• Jets ML (81/100) — W (31-14)\n"
                    "• Chiefs ML (74/100) — W (20-16)\n"
                    "• Cardinals +7.0 (76/100) — W\n\n"
                    "Official New Engine Ledger: 38-13-1 (+22.85u). Reply below for the full Week 9 TNF JAX @ BAL breakdown."
                ),
                (
                    "Why the 7-of-7 sweep cleared:\n\n"
                    "Every release passed Stage 4 FWL market residualization + Cholesky 6-family whitening and Stage 5 Shin de-vig.\n"
                    "Games that failed the conjunction gate were marked PASS before kickoff. Selectivity is the edge."
                ),
                (
                    "Full Week 8 SHA-256 pre-kickoff receipts + Week 9 All-Access Packet ($29 vs $52 standalone value):\n"
                    "https://www.galaxysportsedge.com/packages"
                ),
            ],
        },
        {
            "thread_id": "W9-THREAD-02-TNF-JAX-BAL-STAGE0",
            "title": "Week 9 TNF (JAX @ BAL): Stage 0 Roster Reality & Trench Reallocation",
            "tweets": [
                (
                    "JAX @ BAL Thursday Night Football — Stage 0 Roster Reality:\n\n"
                    "• Lamar Jackson: OUT\n"
                    "• Tyler Huntley: OUT for season\n"
                    "• Jacoby Brissett: Traded ARI -> BAL on Nov 4\n"
                    "• Travis Etienne Jr.: OUT (Tank Bigsby JAX RB1)\n\n"
                    "Any model pricing Baltimore at full-season offensive EPA/play is blind to the active 53-man roster."
                ),
                (
                    "What our 10,000-world PBP & Sinkhorn reallocation engine sees in JAX @ BAL:\n\n"
                    "• BAL neutral pass rate drops -7.5 points; Derrick Henry early-down carry share surges +14 points\n"
                    "• Zay Flowers absorbs short-area RPO/quick-game funnel (Conviction 84/100)\n"
                    "• Tank Bigsby takes uncontested JAX RB1 workload"
                ),
                (
                    "Full JAX @ BAL 5-Stage Dossier, Correlated SGP fair odds, and Showdown Captain MILP portfolio:\n"
                    "https://www.galaxysportsedge.com/packages/week9-tnf-jax-bal"
                ),
            ],
        },
    ]

    sniper_replies = [
        {
            "target_handle": "@SamHoppen",
            "topic": "PROE & Neutral Pace in Week 9 TNF (JAX @ BAL)",
            "reply_text": (
                "With Lamar Jackson and Tyler Huntley both OUT and Jacoby Brissett just arriving from ARI on Nov 4, "
                "Baltimore's neutral pass rate projects to compress by 7.5 points while Derrick Henry's early-down carry share "
                "climbs +14 points via Sinkhorn reallocation."
            ),
        },
        {
            "target_handle": "@PattonAnalytics",
            "topic": "Pressure-to-Sack Survival in DET @ GB",
            "reply_text": (
                "Detroit's interior pocket survival and Jared Goff's intermediate slot efficiency (Amon-Ra St. Brown 31 out of 100 target share) "
                "create the highest 2-way EPA floor on the Week 9 board against Green Bay's two-high shell."
            ),
        },
        {
            "target_handle": "@FantasyPtsData",
            "topic": "First-Read & Slot Funnel in CHI @ ARI",
            "reply_text": (
                "With Kyler Murray on IR and Jacoby Brissett traded to Baltimore, Clayton Tune steps in for Arizona — "
                "historically concentrating first-read and checkdown targets onto Trey McBride (Conviction 77/100)."
            ),
        },
        {
            "target_handle": "@benbbaldwin",
            "topic": "4th-Down WP & Selectivity Gate",
            "reply_text": (
                "Subtracting the Layer-1 market projection via Frisch-Waugh-Lovell before applying situational overlays "
                "is what separated our 7-of-7 1.00u Week 8 sweep (38-13-1, +22.85u) from raw EPA double-counting."
            ),
        },
    ]

    # Verify zero blocked players are recommended as active plays
    active_recommended_players = [
        "Derrick Henry",
        "Zay Flowers",
        "Tank Bigsby",
        "Amon-Ra St. Brown",
        "Jared Goff",
        "Trey McBride",
        "Clayton Tune",
    ]
    assert_lineup_clean(active_recommended_players, cfg)

    # Verify Tweet #1 in every thread has zero external URLs and zero '%' signs
    for th in threads:
        lead = th["tweets"][0]
        assert "http://" not in lead and "https://" not in lead, f"External link found in Tweet #1 of {th['thread_id']}"
        for tw in th["tweets"]:
            assert "%" not in tw, f"Forbidden '%' found in {th['thread_id']}"

    payload = {
        "schema": "gse.x_sniper_and_thread_pack.v1",
        "week": 9,
        "stage0_as_of": cfg["as_of"],
        "verified_ledger": "38-13-1 (+22.85u)",
        "threads": threads,
        "sniper_replies": sniper_replies,
    }
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    md_lines = [
        "# Week 9 X/Twitter Heavy-Ranker Thread & Sniper Reply Pack (2026-11-04)",
        "",
        f"- **Stage 0 Roster Gate:** `PASS` (`as_of: {cfg['as_of']}`, Week {cfg['week']})",
        "- **Official New Engine Ledger:** `38-13-1` (`74.5 out of 100`, `+22.85u`)",
        "- **Heavy-Ranker Rule:** Zero external links in Tweet #1 (`+75.0x` author-engaged reply weighting); URL placed strictly in Tweet #3.",
        "",
        "## 1. Multi-Post Threads",
        "",
    ]
    for th in threads:
        md_lines.append(f"### {th['thread_id']} — {th['title']}")
        for idx, tw in enumerate(th["tweets"], 1):
            md_lines.append(f"**Tweet #{idx}:**\n```text\n{tw}\n```\n")
    md_lines.append("## 2. High-Signal Sniper Replies\n")
    for sr in sniper_replies:
        md_lines.append(f"- **{sr['target_handle']} ({sr['topic']}):** {sr['reply_text']}")

    out_md.parent.mkdir(parents=True, exist_ok=True)
    out_md.write_text("\n".join(md_lines) + "\n", encoding="utf-8")
    return payload


if __name__ == "__main__":
    res = build_x_pack()
    print(f"[X SNIPER & THREAD PACK READY] Threads={len(res['threads'])} | SniperReplies={len(res['sniper_replies'])}")
