#!/usr/bin/env python3
"""
scripts/ops/xai_omniscience_coaching_beat_medical_books_and_frontier_harvester.py

Executes Waves 13A..14C via live xAI Grok (`grok-4.7` & `grok-4.20-0309-reasoning`)
with `x_search` + `web_search`:
  - Wave 13A: All 32 NFL Teams' Beat-Writer Handles, Open-Locker-Room / Practice-Period Tells & Coach-Speak Translation Matrix
  - Wave 13B: All 32 NFL Teams' HC/OC/DC Coaching Tree Lineage, Terminology (West Coast, Shanahan/McVay, Erhardt-Perkins, Air Coryell) & Defensive System DNA (Fangio, Macdonald, Spagnuolo, Flores, Saleh, Schwartz)
  - Wave 13C: Underground & Classic Football Books, Playbooks, Coaching Clinic Manuals (Walsh, Homer Smith, Maddox R4, Scarnecchia, McNally, Saban/Belichick Rip-Liz, MatchQuarters) & Big Data Bowl Winning Papers
  - Wave 14A (X-AI-MEDICAL): NFL Sports Medicine Accounts (@ProFootballDoc, @DrJesseMorse, @JeffMuellerFF, @GameInjuryDoc, @EdwinPorrasPT) & Exact Orthopedic Return-to-Play Degradation Curves (High-Ankle Syndesmotic, Grade 1/2 Hamstring Re-Injury Hazard, Turf Toe, QB Rib/AC-Joint Velocity Loss, ACL Year-1 Deceleration Asymmetry)
  - Wave 14B (X-AI-FRONTIER): Where No Human or Machine Has Gone — Silent-Count Guard-Tap Acoustic Latency (0.22s Edge Get-Off Advantage), Helmet-Orientation Scan Vectors, OODA-Loop Cognitive Overload & VPIN Order-Flow Toxicity
  - Wave 14C (X-AI-STARTUPS & INFRA): High-Leverage AI/Quant/Biotech Startup Grants, Open-Weight Tracking Datasets & Frontier Compute Arbitrage
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
from typing import Any
import urllib.request

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = REPO_ROOT / ".env.local"
OUT_JSON = REPO_ROOT / "data" / "audits" / "xai_omniscience_beat_coaching_medical_books_frontier_2026_11_06.json"
OUT_MD = REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "XAI_OMNISCIENCE_BEAT_COACHING_MEDICAL_BOOKS_AND_FRONTIER_BIBLE.md"


def load_xai_api_key() -> str:
    if os.environ.get("XAI_API_KEY"):
        return os.environ["XAI_API_KEY"].strip().strip('"')
    for candidate in [
        ENV_PATH,
        Path(r"C:\c\wt-week8-forensic\.env.local"),
        Path(r"C:\Users\Garrett\Sports\.env.local"),
    ]:
        if candidate.exists():
            for line in candidate.read_text(encoding="utf-8").splitlines():
                if line.startswith("XAI_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"')
    raise RuntimeError("XAI_API_KEY not found in environment or .env.local")


OMNISCIENCE_WAVES: list[dict[str, str]] = [
    {
        "wave_id": "WAVE_13A_32_TEAM_BEAT_WRITERS_AND_PRACTICE_TELLS",
        "model": "grok-4.7",
        "title": "All 32 NFL Teams' Sharpest Beat Writers, Practice-Window Rep Tracking & Coach-Speak Tells",
        "prompt": (
            "Search X/Twitter and the web to compile a complete, team-by-team directory of the sharpest NFL beat writers "
            "and local practice insiders across all 32 NFL teams (ARI, ATL, BAL, BUF, CAR, CHI, CIN, CLE, DAL, DEN, DET, "
            "GB, HOU, IND, JAX, KC, LAC, LAR, LV, MIA, MIN, NE, NO, NYG, NYJ, PHI, PIT, SEA, SF, TB, TEN, WAS) with their "
            "exact @handles on X. Then detail how sharp bettors extract alpha from beat-writer reports before the market "
            "moves: (1) Wednesday/Thursday/Friday open-media stretching & individual-period velocity tells (helmet-in-hand, "
            "rehab-field side-work vs full team 11-on-11 reps); (2) First-team offensive line shuffle order during walkthroughs; "
            "(3) Goal-line and 3rd-down back rotation tells; (4) Head coach press-conference deception vs honest tells "
            "(e.g., 'day-to-day', 'we will see how he responds Friday', 'pitch count / snap count' admission). "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_13B_32_TEAM_COACHING_TREES_SCHEMES_TERMINOLOGY",
        "model": "grok-4.7",
        "title": "Complete NFL Coaching Tree Taxonomy, Offensive Playbook Terminology & Defensive Scheme DNA",
        "prompt": (
            "Search X/Twitter and the web for a complete structural breakdown of every offensive and defensive scheme "
            "in the NFL: (1) Offensive families: Shanahan/McVay/LaFleur/O'Connell/McDaniel/Kubiak Wide-Zone + Play-Action "
            "Boot/Keeper + Condensed Bunch + Jet/Orbit Motion; Ben Johnson/Todd Monken Gap-Scheme Duo/Trap/Counter + "
            "Multi-TE Shift + Layered Crossers; Andy Reid/Doug Pederson West Coast RPO/Screen/ Bunch Red-Zone Picks; "
            "Erhardt-Perkins single-word concept numbering vs Air Coryell vertical digit tree (9-route, 8-post, 7-corner, "
            "6-dig) vs West Coast rhythm timing; (2) Defensive families: Vic Fangio Split-Safety Two-High (Quarters, "
            "Cover-6 Quarter-Quarter-Half, Palms/2-Read, Penny 5-1 front); Mike Macdonald / Jesse Minter / Dennard Wilson "
            "Simulated Creepers + Post-Snap Safety Spin Disguise; Steve Spagnuolo Exotic Slot Blitzes + Bear/5-0 Fronts; "
            "Brian Flores Cover-0 Double-A-Gap Mug Chaos; Saleh/Ryans/Schwartz Wide-9 4-Man Rush + Cover-3 Match; "
            "Saban/Belichick Rip-Liz Pattern-Match Cover-3. Explain how each offensive family performs against each "
            "defensive family. Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_13C_FOOTBALL_BOOKS_PLAYBOOKS_CLINIC_PDFS_SLOAN_BDB",
        "model": "grok-4.20-0309-reasoning",
        "title": "Master Bibliography of Football Books, Coaching Manuals, Clinic PDFs, Sloan Papers & Big Data Bowl Winners",
        "prompt": (
            "Search X/Twitter and the web for the definitive bibliography of NFL coaching textbooks, underground position "
            "manuals, clinic PDFs, MIT Sloan Sports Analytics papers, and NFL Big Data Bowl winning papers: "
            "(1) Coaching & Film Bibles: Bill Walsh 'Finding the Winning Edge', Homer Smith 'Complete Handbook of Coaching "
            "Offense', Dub Maddox 'Adapt or Die' & 'R4 System' (Read, Recognize, React, Release progression timing), "
            "Cody Alexander MatchQuarters books ('Cautious Aggression', 'Hybrids', 'MatchQuarters'), Chris Brown "
            "('The Essential Smart Football', 'The Art of Smart Football'), Ron Jaworski ('The Games That Changed the Game'), "
            "Paul Zimmerman ('The New Thinking Man's Guide to Pro Football'), Dante Scarnecchia & Jim McNally Offensive Line "
            "Pass-Set & Run-Block Manuals, Nick Saban Rip/Liz Pattern-Match Clinic Notes; "
            "(2) Quantitative & Tracking Papers: Every NFL Big Data Bowl winning methodology (2019-2026: The Zoo 1D-CNN "
            "RYOE, Dani Chu & Lucas Wu continuous-time field control & EP spatial value surfaces, Strain Rate in pass rush, "
            "Pre-Snap Motion causal uplift, Tackling probability fields) and MIT Sloan NFL papers. Extract the exact "
            "core equations and tactical rules from each work. Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_14A_XAI_MEDICAL_BIOMECHANICS_INJURY_DEGRADATION_CURVES",
        "model": "grok-4.7",
        "title": "X-AI-MEDICAL: NFL Orthopedic & Biomechanical Injury Degradation Curves & Re-Injury Hazards",
        "prompt": (
            "Search X/Twitter (@ProFootballDoc David Chao, @SportsDocMatt Matthew Provencher, @DrJesseMorse, "
            "@JeffMuellerFF, @GameInjuryDoc Mario Pilato, @EdwinPorrasPT, @FBInjuryDoc, @Stephania_ESPN) and sports "
            "medicine literature (AJSM, JOSPT, NFL Physician Society studies) for exact, position-specific quantitative "
            "performance degradation and in-game re-injury hazard curves when NFL players return to action: "
            "(1) High-Ankle Sprain (Syndesmosis): exact week-by-week loss in lateral cutting deceleration (BRK+), "
            "Yards After Contact, and route-break separation in Weeks 1-4 post-return; "
            "(2) Hamstring Strain (Grade 1 vs Grade 2 biceps femoris): top-speed GPS sprinting (>20 mph) deficit and "
            "the 25-35% in-game re-aggravation probability in the first 10 quarters back (creating extreme left-tail "
            "0-yard risk on player Over props); "
            "(3) Turf Toe (1st MTP joint plantar capsule): push-off force loss for RBs, WRs, and Edge rushers; "
            "(4) Quarterback Throwing/Non-Throwing Shoulder (AC Joint, Labrum), Rib Cartilage, thumb/finger ligament, "
            "and Calf/Ankle injuries (loss of rotational hip-to-shoulder torque, 55+ mph deep-out velocity drop, "
            "pocket mobility collapse); "
            "(5) Concussion Protocol 5-phase clearance probabilities by day-of-week practice status (DNP Wed -> LP Thu -> FP Fri vs TNF short week); "
            "(6) Post-ACL / Achilles / Lisfranc Year-1 Return-to-Play asymmetric deceleration deficit. "
            "Provide mathematical decay and hazard formulas for each injury class. Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_14B_WHERE_NO_HUMAN_OR_MACHINE_HAS_GONE_FRONTIER_ALPHA",
        "model": "grok-4.20-0309-reasoning",
        "title": "X-AI-FRONTIER: Uncharted Physics, Acoustic Cadence Latency, OODA-Loop Overload & Phase-Space Football",
        "prompt": (
            "Go beyond every standard football model on earth and synthesize uncharted, first-principles physical, "
            "neuro-cognitive, and game-theoretic mechanisms in NFL football that neither traditional scouts nor public "
            "ML models quantify: "
            "(1) Acoustic Silent-Count Guard-Tap Latency vs Hard-Count Rhythm: when a road offense plays in a >105 dB "
            "stadium (Arrowhead, Lumen, Superdome, U.S. Bank, Ford Field), the center and tackles must wait for the "
            "guard's visual leg-lift + center head-bob while defensive ends key the football directly — creating a "
            "measured 0.18s to 0.26s pass-rush get-off time advantage and neutralizing hard-count offsides traps; "
            "(2) Quarterback OODA-Loop (Observe-Orient-Decide-Act) Cognitive Bandwidth Overload: modeling the QB's "
            "working-memory bit-rate capacity (Shannon channel capacity C = B log2(1 + SNR)) when simultaneously "
            "processing pre-snap motion shifts, play-clock <4s urgency, post-snap two-high-to-single-high safety spin, "
            "and interior A-gap creeper pressure; "
            "(3) Coupled Multi-Body Phase-Space Attractors on the 53.3x120-yard pitch: modeling the 22 players as an "
            "anisotropic Voronoi tessellation + Navier-Stokes compressible fluid with repulsive defensive potential "
            "barriers and attractive passing-window sinks; "
            "(4) Cross-Market Order-Flow Toxicity (VPIN) & Prop-Derivative Lead-Lag Arbitrage. "
            "Provide explicit mathematical equations for each mechanism. Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_14C_XAI_STARTUPS_OPEN_DATASETS_AND_RESEARCH_REPOS",
        "model": "grok-4.7",
        "title": "X-AI-STARTUPS & DATA: Complete NFL Open Datasets, R/Python Packages, Scraping APIs & AI Compute Programs",
        "prompt": (
            "Search X/Twitter and GitHub for every open-source NFL data repository, R/Python package, hidden API endpoint, "
            "and AI/quant research dataset known to the sports analytics community: "
            "(1) Complete nflverse ecosystem (nflfastR, nflreadr, nflplotR, nflseedR, nfl4th, nflfastr-roster, "
            "ftn_charting, nextgen_stats, pfr_advstats, espn_qbr, participation, contracts, injuries, snap_counts, "
            "combine, draft_picks, officials, trades, depth_charts); "
            "(2) Python sports analytics packages (nfl_data_py, sportsdataverse,espn-api, py_ball, mplsoccer/sportypy "
            "pitch plotting,kloppy tracking data standardization, penaltyblog, shin de-vigging); "
            "(3) Kaggle NFL Big Data Bowl tracking datasets (2019-2026 10Hz NGS tracking CSVs), PFF college/NFL public "
            "samples, Pro-Football-Reference Stathead schemas, SumerSports public tables, RBSDM, rbsdm.com/stats, "
            "nfeloapp.com (@reinhard_nfl nfelo ratings, market-implied EPA, coaching grades), and gridironai. "
            "List exact dataset schemas, join keys (gsis_id, pfr_id, espn_id, pff_id, sportradar_id, old_game_id, game_id), "
            "and update frequencies (Tuesday morning vs Wednesday vs Thursday 90-minute pre-kickoff inactives). "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
]


def call_xai_omniscience(wave: dict[str, str], api_key: str) -> dict[str, Any]:
    payload = {
        "model": wave["model"],
        "input": [{"role": "user", "content": wave["prompt"]}],
        "tools": [{"type": "x_search"}, {"type": "web_search"}],
    }
    req = urllib.request.Request(
        "https://api.x.ai/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "GSE-OmniscienceHarvester/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=210) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    texts: list[str] = []
    for item in raw.get("output", []):
        if item.get("type") == "message":
            for part in item.get("content", []):
                if part.get("type") in ("output_text", "text") and part.get("text"):
                    texts.append(part["text"])
    combined_text = "\n\n".join(texts).replace("etc.", "and associated signals").replace("ETC.", "AND ASSOCIATED SIGNALS")
    usage = raw.get("usage", {})
    cost_usd = float(usage.get("cost_in_usd_ticks", 0)) / 1e10
    return {
        "wave_id": wave["wave_id"],
        "title": wave["title"],
        "model": wave["model"],
        "cost_usd": round(cost_usd, 6),
        "usage": usage,
        "content": combined_text,
    }


def main() -> None:
    api_key = load_xai_api_key()
    results: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futs = {pool.submit(call_xai_omniscience, w, api_key): w["wave_id"] for w in OMNISCIENCE_WAVES}
        for fut in as_completed(futs):
            wid = futs[fut]
            res = fut.result()
            results.append(res)
            print(f"[xAI Omniscience] Completed {wid} ({len(res['content'])} chars, cost=${res['cost_usd']:.4f})")

    results.sort(key=lambda r: r["wave_id"])
    total_cost = round(sum(r["cost_usd"] for r in results), 4)
    total_chars = sum(len(r["content"]) for r in results)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)

    payload_out = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "waves_executed": len(results),
        "total_characters_harvested": total_chars,
        "total_cost_usd": total_cost,
        "waves": results,
    }
    OUT_JSON.write_text(json.dumps(payload_out, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        "# X-AI Omniscience Bible: 32-Team Beat Writers, Coaching Trees, Football Books/Manuals, X-AI-Medical Injury Curves & Uncharted Frontier Physics (Waves 13–14)",
        "",
        f"- **Generated At (UTC):** `{payload_out['generated_at_utc']}`",
        f"- **Waves Executed:** `{len(results)}` (`grok-4.7` & `grok-4.20-0309-reasoning` with live `x_search` + `web_search`)",
        f"- **Total Characters Harvested:** `{total_chars:,}`",
        f"- **Total xAI API Spend (Waves 13–14):** `${total_cost:.4f}`",
        "",
        "---",
        "",
    ]
    for r in results:
        md_lines.append(f"## {r['wave_id']} — {r['title']} (`{r['model']}`)")
        md_lines.append("")
        md_lines.append(r["content"])
        md_lines.append("")
        md_lines.append("---")
        md_lines.append("")

    OUT_MD.write_text("\n".join(md_lines), encoding="utf-8")

    sports_root = Path(r"C:\Users\Garrett\Sports")
    if sports_root.exists() and sports_root.resolve() != REPO_ROOT.resolve():
        for rel in [
            Path("scripts/ops/xai_omniscience_coaching_beat_medical_books_and_frontier_harvester.py"),
            Path("data/audits/xai_omniscience_beat_coaching_medical_books_frontier_2026_11_06.json"),
            Path("docs/engine/research/2026-11-06/XAI_OMNISCIENCE_BEAT_COACHING_MEDICAL_BOOKS_AND_FRONTIER_BIBLE.md"),
        ]:
            dst = sports_root / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(REPO_ROOT / rel, dst)

    print(f"[xAI Omniscience] ALL 6 OMNISCIENCE WAVES (13A..14C) COMPLETE: {total_chars:,} chars, cost=${total_cost:.4f}")


if __name__ == "__main__":
    main()
