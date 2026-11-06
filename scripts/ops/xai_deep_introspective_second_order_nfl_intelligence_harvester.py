#!/usr/bin/env python3
"""
scripts/ops/xai_deep_introspective_second_order_nfl_intelligence_harvester.py

Executes 12 Deep Introspective, Second- & Third-Order, Dynamic & Adversarial
NFL Intelligence Waves via xAI Grok (`grok-4.20-multi-agent-0309`,
`grok-4.20-0309-reasoning`, and `grok-4.7`) with live `x_search` + `web_search`:

  - Wave 9A: Why Public Metrics Lie — Causal Confounding in EPA, CPOE, YPRR, RYOE, PBWR & PROE
  - Wave 9B: QB Cognitive Processing, Post-Hit Trauma Hysteresis, Phantom Pressure & Eye-Manipulation
  - Wave 9C: Weakest-Link Trench Topology (Minimum-Operator vs Mean OL), Adjacent Communication Breakdown & Stunt Baiting
  - Wave 10A: Coordinator Script-Exhaustion Cliff (First-15 Scripted vs Drive 3+ Adaptation) & Play-Call Serial Correlation
  - Wave 10B: Defensive 3-Snap Tendency Traps, Simulated Creeper Baiting & Post-Snap Safety Spin Information Entropy
  - Wave 10C: Anaerobic Time-Under-Tension (TUT) Drive Fatigue, Scramble-Drill DL Exhaustion & Tempo Weaponization
  - Wave 11A: WR/TE Micro-Route Biomechanics — Hip-Sink Deceleration, Blind-Spot Cushion Attack & Sight-Adjustment Sync
  - Wave 11B: RB Pass-Pro Blitz-Pickup Liability (The Hidden 3rd-Down Snap Killer) & Contact-Angle Physics
  - Wave 11C: Special Teams Hidden Yardage — Directional Kickoff Hang-Time/Landing-Zone Pinning, Punt Gunner Vise & Wind-Shear Field Goals
  - Wave 12A: Dynamic Officiating Reflexivity — Trailing Catch-Up Flags, Makeup-Call Autocorrelation & Primetime Holding Suppression
  - Wave 12B: Syndicate Market Manipulation vs True Steam — Head-Fake Buybacks, Key-Number Gamma & Derivative Mispricing
  - Wave 12C: Cross-Player Zero-Sum Simplex Conservation & Higher-Order Tail Dependence in Same-Game Parlays
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
OUT_JSON = REPO_ROOT / "data" / "audits" / "xai_deep_introspective_second_order_nfl_intelligence_2026_11_06.json"
OUT_MD = REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "XAI_DEEP_INTROSPECTIVE_SECOND_ORDER_NFL_INTELLIGENCE_BIBLE.md"


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


DEEP_WAVES: list[dict[str, str]] = [
    {
        "wave_id": "WAVE_9A_WHY_PUBLIC_METRICS_LIE_CAUSAL_DECONFOUNDING",
        "model": "grok-4.20-0309-reasoning",
        "title": "Why Standard NFL Analytics Lie: Causal Confounders in EPA, CPOE, YPRR, RYOE & PBWR",
        "prompt": (
            "Search X/Twitter and advanced football analytics research for the deepest critiques, failure modes, and "
            "causal confounders of standard public NFL metrics (EPA/play, CPOE, YPRR, RYOE, PBWR, PRWR, PROE). "
            "Provide a rigorous, mathematically introspective breakdown of: "
            "(1) How RPOs, screens, motion-at-snap free releases, and condensed bunch formations artificially inflate "
            "QB CPOE/EPA and WR YPRR while masking inability to win isolated 1-on-1 boundary routes on 3rd-and-7; "
            "(2) How QB mobility and read-option mesh-point conflict freeze backside edge defenders for 0.35-0.60 seconds, "
            "inflating RB RYOE and YBC/Att even when the RB has mediocre vision; "
            "(3) Why ESPN's 2.5-second PBWR/PRWR threshold fails on 3-step quick game vs 7-step play-action and how "
            "block sustain hazard functions h(t) over continuous time t in [1.5s, 4.5s] solve this; "
            "(4) Exact Frisch-Waugh-Lovell / propensity-score residualization equations to strip scheme layups from true player skill. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_9B_QB_TRAUMA_HYSTERESIS_AND_COGNITIVE_DISGUISE_DECAY",
        "model": "grok-4.7",
        "title": "QB Post-Hit Trauma Hysteresis, Phantom Pressure Drift & Post-Snap Disguise Processing",
        "prompt": (
            "Search X/Twitter and NFL film/analytics research (@danorlovsky7, @Nate_Tice, @Kurt13Warner, @TedNguyen, "
            "@PattonAnalytics, @PFF_Moo, @BenjaminSolak) for how quarterbacks dynamically degrade WITHIN a single game "
            "under physical and cognitive stress: "
            "(1) Post-Hit / Post-Sack Trauma Hysteresis: how taking early interior A/B-gap hits or strip-sacks causes "
            "a QB's internal clock to speed up on SUBSEQUENT clean-pocket snaps (dropping eyes to the rush, drifting "
            "backwards-laterally at 110-130 degrees out of the tackle box instead of climbing the A-gap, bailing to "
            "checkdowns 0.3s early); "
            "(2) Cognitive Breakdown under Post-Snap Safety Rotation: how QBs who lock onto pre-snap single-high/two-high "
            "indicators fail when defenses spin at the snap (e.g., 2-High spinning to Cover-1 Robber or Cover-3 Buzz "
            "cutting the dig/crosser), and how to formulate a Hawkes self-exciting point process for intra-game QB trauma "
            "and turnover-worthy-play hazard. Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_9C_WEAKEST_LINK_TRENCH_TOPOLOGY_AND_STUNT_EXPLOITATION",
        "model": "grok-4.20-0309-reasoning",
        "title": "Weakest-Link Trench Topology, Adjacent OL Synergy Breakdown & Targeted Stunt Exploitation",
        "prompt": (
            "Search X/Twitter and trench film analysis (@BrandonThornNFL, @DukeManyweather, @BaldyNFL, @MatchQuarters, "
            "@SamHoppen) for why offensive line performance is a non-linear weakest-link + adjacent-pair coupling problem, "
            "NOT an average of 5 linemen: "
            "(1) How defensive coordinators (Spagnuolo, Flores, Macdonald, Fangio, Saleh, Schwartz) immediately target a "
            "single backup Guard, Center, or Tackle with T-E / E-T twists, A-gap mugged linebackers, and overload 5-0 "
            "fronts to force late pass-off switches between two linemen who have <50 career snaps together; "
            "(2) How a Center injury breaks pre-snap MIKE identification and slide-protection calls across the entire line; "
            "(3) Mathematical formulation of OL pass protection as a coupled minimum-operator + Ising/Potts adjacency "
            "interaction tensor across (LT, LG, C, RG, RT, TE/RB chip). Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_10A_COORDINATOR_SCRIPT_CLIFF_AND_PLAYCALL_MARKOV_TILT",
        "model": "grok-4.7",
        "title": "The Opening-15 Script Cliff, Drive-3 Coordinator Adaptation & Play-Calling Tilt",
        "prompt": (
            "Search X/Twitter and NFL analytics research for non-stationary coaching tendencies within a game: "
            "(1) The Opening-15 Scripted Plays vs Unscripted Plays 16-65 Cliff: which NFL head coaches and offensive "
            "coordinators generate high EPA on their Tuesday-scripted opening 15 plays but suffer a massive EPA drop-off "
            "on Drives 3-8 once the opposing DC diagnoses their formation/motion tells and adjusts coverage rules; "
            "(2) Play-Calling Tilt & Serial Correlation: how coordinators react on the snap immediately following a "
            "stuffed run, a sack, an offensive holding penalty (1st-and-20), or a dropped pass; "
            "(3) 2nd-Half Halftime Adjustment Delta (Q3 Drive 1-2 EPA vs 1st Half EPA) by coaching staff. "
            "Formulate a non-homogeneous Markov transition kernel for play-calling under coordinator tilt. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_10B_DEFENSIVE_TENDENCY_TRAPS_AND_SIMULATED_CREEPER_BAITING",
        "model": "grok-4.20-0309-reasoning",
        "title": "Defensive 3-Snap Tendency Traps, Simulated Creeper Baiting & Hot-Read Interception Traps",
        "prompt": (
            "Search X/Twitter and advanced defensive film study (@MatchQuarters, @TedNguyen, @CoachDanCasey, "
            "@BrettKollmann, @Nate_Tice) for how elite defensive coordinators set multi-snap game-theoretic traps: "
            "(1) Showing the exact same pre-snap mugged A-gap or 2-high shell on early downs to condition the QB's "
            "sight-adjustment / hot-throw rule, then on 3rd-and-medium dropping the defensive end into the exact "
            "hot-read slant/flat throwing lane while bringing a simulated slot/safety creeper; "
            "(2) How pre-snap motion is used by offenses to force defenders to reveal man vs zone, and how modern "
            "defenses counter with 'Motion-Bump / Lock-and-Roll / Buzz-Match' to fake man on motion and play zone at the snap; "
            "(3) Game-theoretic Kullback-Leibler divergence and counterfactual regret minimization (CFR) equations for "
            "offensive motion tells vs defensive shell deception. Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_10C_ANAEROBIC_TIME_UNDER_TENSION_TRENCH_FATIGUE",
        "model": "grok-4.7",
        "title": "Anaerobic Time-Under-Tension (TUT) Drive Fatigue, Scramble Exhaustion & Tempo Weaponization",
        "prompt": (
            "Search X/Twitter and sports science / NFL tracking research for how intra-drive and intra-game fatigue "
            "actually accumulates in 300-pound linemen and defensive backs: "
            "(1) Why snap count alone is a flawed fatigue metric: a 6.5-second scramble-drill play where DL rushers "
            "chase a mobile QB 25 yards laterally and DBs plaster in coverage expends 3x the anaerobic phosphocreatine "
            "and lactate load of a 2.0-second quick out; "
            "(2) How no-huddle tempo weaponization (trapping heavy base 3-4/4-3 defensive personnel on the field in "
            "11-personnel for 8+ consecutive snaps without substitution) degrades Pass Rush Win Rate and tackling "
            "angles on snaps 7-12 of a sustained drive; "
            "(3) Differential equation for anaerobic Time-Under-Tension (TUT) accumulation and between-drive recovery "
            "as a function of offensive TOP, stadium temperature/humidity/altitude, and defensive rotation depth. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_11A_WR_MICRO_ROUTE_BIOMECHANICS_AND_BLINDSPOT_LEVERAGE",
        "model": "grok-4.7",
        "title": "WR/TE Micro-Route Biomechanics, Hip-Sink Deceleration, Blind-Spot Attack & Sight Adjustments",
        "prompt": (
            "Search X/Twitter and receiver charting/tracking research (@MattHarmon_BYB Reception Perception, "
            "@FantasyPtsData ASS/SEP, @NextGenStats, NFL Big Data Bowl tracking papers) for micro-mechanical route "
            "engineering beyond simple YPRR: "
            "(1) Braking Efficiency (BRK+) and hip-sink deceleration impulse (m/s^2 over the final 3 steps before the "
            "break point) that separates elite route runners on curls, comebacks, digs, and outs; "
            "(2) Attacking the defensive back's blind spot and leverage hip in off-man and quarters coverage to force "
            "a false speed-turn before snapping off the route; "
            "(3) Post-snap option-route / choice-route sight-adjustment synchronization between slot WRs/TEs and the QB "
            "when reading middle-of-field-open (MOFO -> bender/post) vs middle-of-field-closed (MOFC -> dig/out), and "
            "why backup QBs or newly traded WRs fail these sight adjustments. Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_11B_RB_PASS_PRO_LIABILITY_AND_CONTACT_ANGLE_PHYSICS",
        "model": "grok-4.20-0309-reasoning",
        "title": "RB Pass-Protection Blitz-Pickup Liability (The Hidden Snap-Share Gate) & Contact-Angle Physics",
        "prompt": (
            "Search X/Twitter and NFL film/analytics research for the hidden determinants of running back snap share, "
            "receiving ceiling, and rushing efficiency: "
            "(1) Why RB Pass-Protection Grade & Blitz-Pickup Scan Reliability is the #1 hidden gatekeeper of 3rd-down, "
            "two-minute drill, and trailing-script snap share (why explosive rookie/secondary RBs get benched in negative "
            "game scripts if they bust A-gap blitz pickups); "
            "(2) Contact-Angle Physics in Rushing: using 10Hz tracking vectors (relative velocity v_rel and collision "
            "impact angle theta between ball-carrier and tackler) to separate true contact balance (surviving <35-degree "
            "glancing blows via lateral cut momentum) from short-yardage pile pushes; "
            "(3) How to model RB prop bimodal distributions when game script flips from positive clock-kill to trailing "
            "hurry-up. Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_11C_SPECIAL_TEAMS_DYNAMIC_KICKOFF_FIELD_POSITION_WIND_SHEAR",
        "model": "grok-4.7",
        "title": "Dynamic Kickoff Landing-Zone Pinning, Hidden Field-Position EPA & Stadium Wind-Shear Kicking Physics",
        "prompt": (
            "Search X/Twitter and NFL special teams analytics (@SethWalder, @PFF, @FTNFantasy, @SharpFootball) for "
            "how modern NFL special teams directly swing game totals, 1Q/1H scoring, and kicking props: "
            "(1) Dynamic Kickoff rule mechanics: mortar/directional kick hang-time and landing-zone (0 to 20 yard line) "
            "pinning vs touchback penalties (30-yard line / 40-yard line out-of-bounds), starting field-position EPA delta "
            "(starting at own 22 vs own 34 shifts drive TD probability by +11%), and how short fields inflate Total Points "
            "and Kicker FG/PAT volume; "
            "(2) Punt hang-time vs net punt coverage vise and muffed-punt wind hazard; "
            "(3) Aerodynamic wind-shear, air-density (temperature + barometric pressure + humidity), and crosswind "
            "vortex physics on 50+ yard Field Goal make probabilities across specific NFL stadiums. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_12A_DYNAMIC_OFFICIATING_REFLEXIVITY_AND_MAKEUP_CALL_HAZARD",
        "model": "grok-4.20-0309-reasoning",
        "title": "Dynamic Officiating Crew Reflexivity, Trailing Catch-Up Bias & Makeup-Call Autocorrelation",
        "prompt": (
            "Search X/Twitter and sports economics / NFL officiating analytics (Moskowitz & Wertheim Scorecasting, "
            "nflpenalties.com, @SharpFootball, academic NFL referee bias papers) for dynamic, state-dependent referee "
            "behavior: (1) Score-Differential & Trailing Catch-Up Flag Bias: how officiating crews unconsciously "
            "increase Defensive Holding / DPI call rates on the leading defense and suppress Offensive Holding on the "
            "trailing offense in the 3rd/4th quarter of 7-to-14 point games (inflating backdoor covers and 2H Overs); "
            "(2) Makeup-Call Negative Autocorrelation: elevated probability that a crew calls an offsetting or balance "
            "penalty against Team A within 3-6 snaps of a controversial 3rd-down penalty against Team B; "
            "(3) Primetime Island Game officiating patterns and how crew-specific flag tempo alters total plays per game. "
            "Provide an exact state-dependent intensity formula. Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_12B_SYNDICATE_STEAM_MANIPULATION_VS_TRUE_INFORMATION_FLOW",
        "model": "grok-4.7",
        "title": "Syndicate Market Manipulation (Head-Fake Buybacks) vs True Information Steam & Key-Number Gamma",
        "prompt": (
            "Search X/Twitter and sharp sports betting microstructure literature (@Spanky, @CaptainJack2000, "
            "@UnabatedSports, @TheHammerHQ, @PlusEVAnalytics, Rufus Peabody, Billy Walters) for how syndicate groups "
            "and market-makers actually interact: "
            "(1) Distinguishing True Information Steam (coordinated multi-book limit hits at Pinnacle/Circa/BookMaker "
            "driven by unannounced injury/Practice-DNP/weather shifts) from Head-Fake / Manipulation Steam (hitting "
            "low-limit screen books at -2.5 or -3 to trigger automated copycat movers, then hammering +3.5 at max limits "
            "on crisper books); "
            "(2) Key-Number Gamma and Push/Win derivative value around 3, 7, 6, 10, 4, 14 under modern NFL 4th-down and "
            "2-point conversion decision charts; "
            "(3) Stale-Line Hunting & Prop-vs-Main-Line Arbitrage Latency (when a game total moves 2.5 points on wind/injury "
            "news while derivative 1H totals, Kicker points, and RB/WR yardage ladders lag by 4-15 minutes). "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_12C_ZERO_SUM_SIMPLEX_CONSERVATION_AND_SGP_TAIL_DEPENDENCE",
        "model": "grok-4.20-0309-reasoning",
        "title": "Cross-Player Zero-Sum Simplex Conservation & Asymmetric Tail Dependence in Same-Game Parlays",
        "prompt": (
            "Search X/Twitter and quantitative sports modeling research for the deepest mathematical flaws in how "
            "retail sportsbooks and public models price player props and Same-Game Parlays (SGPs): "
            "(1) Zero-Sum Simplex Conservation Violation: why summing independent player prop medians on a team "
            "frequently exceeds or under-shoots the team's implied passing/rushing yards and TDs, and how Dirichlet / "
            "Sinkhorn-Knopp optimal transport enforces exact snap, target, air-yard, carry, and TD conservation across "
            "all active players; "
            "(2) Asymmetric Tail Dependence (Clayton / Gumbel / Vine Copulas vs Gaussian Copula): why Gaussian copulas "
            "drastically underprice extreme upper-tail shootouts (QB 300+ pass yds + WR1 100+ rec yds + Bring-back WR1 "
            "90+ rec yds) and extreme lower-tail trench blowouts (Favorite RB 22+ carries + Underdog QB 38+ pass attempts "
            "+ Favorite Edge 1+ Sack). Provide exact mathematical equations. Never use the abbreviation 'e-t-c' with a period."
        ),
    },
]


def call_xai_deep_wave(wave: dict[str, str], api_key: str) -> dict[str, Any]:
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
            "User-Agent": "GSE-DeepIntrospectiveHarvester/1.0",
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
    combined_text = "\n\n".join(texts).replace("etc.", "and higher-order terms").replace("ETC.", "AND HIGHER-ORDER TERMS")
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
        futs = {pool.submit(call_xai_deep_wave, w, api_key): w["wave_id"] for w in DEEP_WAVES}
        for fut in as_completed(futs):
            wid = futs[fut]
            res = fut.result()
            results.append(res)
            print(f"[xAI Deep Harvester] Completed {wid} ({len(res['content'])} chars, cost=${res['cost_usd']:.4f})")

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
        "# Deep Introspective, Second- & Third-Order Dynamic NFL Intelligence Bible (Waves 9–12)",
        "",
        f"- **Generated At (UTC):** `{payload_out['generated_at_utc']}`",
        f"- **Waves Executed:** `{len(results)}` (`grok-4.20-0309-reasoning` & `grok-4.7` with live `x_search` + `web_search`)",
        f"- **Total Characters Harvested:** `{total_chars:,}`",
        f"- **Total xAI API Spend (Waves 9–12):** `${total_cost:.4f}`",
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
            Path("scripts/ops/xai_deep_introspective_second_order_nfl_intelligence_harvester.py"),
            Path("data/audits/xai_deep_introspective_second_order_nfl_intelligence_2026_11_06.json"),
            Path("docs/engine/research/2026-11-06/XAI_DEEP_INTROSPECTIVE_SECOND_ORDER_NFL_INTELLIGENCE_BIBLE.md"),
        ]:
            dst = sports_root / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(REPO_ROOT / rel, dst)

    print(f"[xAI Deep Harvester] ALL 12 DEEP WAVES (9A..12C) COMPLETE: {total_chars:,} chars, cost=${total_cost:.4f}")


if __name__ == "__main__":
    main()
