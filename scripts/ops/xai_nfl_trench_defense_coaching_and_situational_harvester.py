#!/usr/bin/env python3
"""
scripts/ops/xai_nfl_trench_defense_coaching_and_situational_harvester.py

Executes 12 concurrent deep-research waves via live xAI Grok (`grok-4.7` &
`grok-4.20-0309-reasoning`) with `x_search` + `web_search` enabled across
Waves 5, 6, 7, and 8:
  - Wave 5 (5A, 5B, 5C): OL/DL Trench Warfare, Pass Block/Rush Win Rates, PBE, PRP,
    True Pass Sets, Stunts/Games, Simulated Pressures, Adjusted Line Yards, 5-Man Continuity.
  - Wave 6 (6A, 6B, 6C): Defensive Coverage Shells (MOFC/MOFO, Fangio Quarters, Rip/Liz Match,
    Flores Zero-Blitz, Spagnuolo Slot Pressure, Macdonald Simulated Creepers), Pre-to-Post
    Disguise Entropy, Primary CB FP/Route Allowed, IDP Stadium Stat-Crew Assist Bias, Half-Sack Mechanics.
  - Wave 7 (7A, 7B, 7C): Coaching Play-Calling, PROE, Neutral Pace, Script Elasticity,
    1st-Down Run-After-Incompletion, Motion at Snap vs Pre-Snap Motion, Personnel Grouping
    Matrices (11/12/13/21/22/6-OL), 4th-Down WP Bot Calibration & Coaching Tree Splits.
  - Wave 8 (8A, 8B, 8C): Officiating Crew Tendencies (Holding, DPI, Roughing, Home/Away Bias),
    Stadium Microclimates & Turf Physics (Slit-Film, Monofilament, Grass, Altitude, Wind Tunnels,
    Sun Glare, Dome Decibels), Circadian/Short-Week/Post-OT Fatigue, Contract Incentives &
    Milestones, and Sportsbook Market Microstructure (1Q/1H Derivatives, ATD Ladders, SGP Copulas).
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
OUT_JSON = REPO_ROOT / "data" / "audits" / "xai_nfl_trench_defense_coaching_situational_encyclopedia_2026_11_06.json"
OUT_MD = REPO_ROOT / "docs" / "data-sources" / "research" / "2026-11-06" / "XAI_EXHAUSTIVE_TRENCH_DEFENSE_COACHING_AND_SITUATIONAL_BIBLE.md"


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


WAVE_PROMPTS: list[dict[str, str]] = [
    {
        "wave_id": "WAVE_5A_OL_PASS_BLOCK_METRICS",
        "model": "grok-4.7",
        "title": "Offensive Line Pass Protection Metrics, True Pass Sets & Continuity Engineering",
        "prompt": (
            "Search X/Twitter and the web for every NFL offensive line pass protection metric, analyst handle "
            "(@BrandonThornNFL Trench Warfare, @DukeManyweather, @PFF, @SethWalder ESPN Analytics, @FTNFantasy, "
            "@SportsInfo_SIS, @SamHoppen, @NextGenStats), and exact mathematical formula. Detail: "
            "(1) PFF Pass Blocking Efficiency (PBE) exact formula and weights on sacks, hits, and hurries; "
            "(2) ESPN / NGS Pass Block Win Rate (PBWR) 2.5-second sustain threshold and pocket geometry; "
            "(3) Brandon Thorn True Pass Set (TPS) exact exclusion filters (play-action, screens, rollouts, "
            "time-to-throw < 2.0s, <=3 rushers); (4) Island / 1-on-1 pass block rate vs double-team / TE chip help rate; "
            "(5) 5-Man OL continuity and communication penalty when a backup LT/RT/C enters mid-game; "
            "(6) Pressure responsibility attribution between QB (held ball >3.0s / drifted into pressure) vs OL. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_5B_DL_PASS_RUSH_STUNTS_CREEPERS",
        "model": "grok-4.7",
        "title": "Defensive Front Pass-Rush Productivity, Stunts, Creepers & Survival Curves",
        "prompt": (
            "Search X/Twitter and the web for every NFL defensive line and edge pass-rush metric, analyst handle "
            "(@PattonAnalytics, @SamHoppen, @PFF_Moo, @SethWalder, @NextGenStats, @FTNFantasy, @MatchQuarters), "
            "and exact formula. Detail: (1) PFF Pass Rush Productivity (PRP) formula; (2) ESPN Pass Rush Win Rate "
            "(PRWR) and Double-Team Rate charting; (3)NGS Time to Pressure (TTP) and Get-Off (burst across LOS in seconds); "
            "(4) @PattonAnalytics Pressure Over Expectation vs Pressure-to-Sack Survival Curve mechanics; "
            "(5) Stunt / Twist / T-E and E-T game rates and how stunts exploit backup guards/centers; "
            "(6) Simulated Pressures (Creepers: rushing 4 while dropping a DE/OLB and bringing a LB/DB) vs 5+ man blitzes. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_5C_RUN_BLOCKING_LINE_YARDS_TRENCH",
        "model": "grok-4.20-0309-reasoning",
        "title": "Run Blocking Win Rate, Adjusted Line Yards, Gap vs Zone & Trench Displacement",
        "prompt": (
            "Search X/Twitter and the web for every NFL run-blocking and run-defense trench metric and formula "
            "(Aaron Schatz / FTN DVOA & Adjusted Line Yards, ESPN Run Block Win Rate RBWR & Run Stop Win Rate RSWR, "
            "SIS Blown Block Rate, PFF Zone vs Gap/Man/Power/Counter/Duo blocking grades, NGS Yards Before Contact). "
            "Provide the exact piecewise weights for Adjusted Line Yards (losses, 0-4 yds, 5-10 yds, 11+ yds), "
            "Open Field Yards, Second Level Yards, Power Success Rate (3rd/4th & 1-2 yds + goal-line), and Stuffed Rate. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_6A_COVERAGE_SHELLS_DISGUISE_MATCHQUARTERS",
        "model": "grok-4.7",
        "title": "Defensive Coverage Shells, Pre-to-Post Disguise & MatchQuarters Taxonomy",
        "prompt": (
            "Search X/Twitter and the web (@MatchQuarters Cody Alexander, @WideLeft Arif Hasan, @FantasyPtsData, "
            "@SamHoppen, @SumerSports, @NextGenStats, @TedNguyen) for every defensive coverage shell metric and "
            "taxonomy. Detail: (1) MOFC (Middle of Field Closed: Cover-1 Man, Cover-1 Robber, Cover-3 Sky/Buzz/Cloud, "
            "Saban Rip/Liz Match Cover-3) vs MOFO (Middle of Field Open: Cover-2, Tampa-2, Fangio Cover-4 Quarters, "
            "Palms/2-Read, Cover-6 Quarter-Quarter-Half, Cover-2 Man, Cover-0 Blitz); (2) Pre-snap to post-snap "
            "safety rotation and shell disguise rate (Shannon entropy / KL divergence of pre-snap shell vs post-snap shell); "
            "(3) How specific QBs and WRs split against Man vs Zone and Single-High vs Two-High. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_6B_CB_SEPARATION_AND_COVERAGE_CHARTING",
        "model": "grok-4.20-0309-reasoning",
        "title": "Cornerback & Safety Coverage Metrics, FP/Route Allowed & Ball-Hawk Engineering",
        "prompt": (
            "Search X/Twitter and the web (@FantasyPtsData, @statrankings MAGICSPORTSBREAKDOWN+, @PFF, @NextGenStats, "
            "@SportsInfo_SIS) for every defensive back coverage metric: Fantasy Points Per Route Allowed (FP/rt), "
            "Yards Per Coverage Snap, Target Rate Per Coverage Snap, Forced Incompletion Rate (FINC%), "
            "Passer Rating Allowed, Ball-Hawk / Catch-Point Disruption Rate, Shadow Coverage tracking criteria, "
            "Slot CB vs Outside Perimeter CB splits, and Linebacker/Safety Seam-Match liability metrics for TE props. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_6C_IDP_SCOREKEEPER_BIAS_AND_SACK_PROPS",
        "model": "grok-4.7",
        "title": "IDP Tackle/Sack Props, Stadium Stat-Crew Assist Bias & 0.25 Half-Sack Mechanics",
        "prompt": (
            "Search X/Twitter and the web (@PFF_Macri Jon Macri, @adamcophoto, @IDP_Sharks, NFLGSIS scorekeeper studies) "
            "for every Individual Defensive Player (IDP) betting and analytics metric: (1) NFL Stadium Scorekeeper Bias "
            "(home stat crew solo-to-assist ratio inflation across all 32 NFL stadiums and how it impacts Solo Tackles vs "
            "Total Tackles + Assists props); (2) Tackle Opportunity Rate (% of opponent rushes + completions a defender "
            "records a tackle on); (3) Missed Tackle Rate; (4) DraftKings/FanDuel 0.25 Sack O/U mechanics where a "
            "0.5 half-sack clears Over 0.25, and how interior DL + edge co-pressure loops create correlated half-sacks. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_7A_COACHING_PROE_TEMPO_SCRIPT_ELASTICITY",
        "model": "grok-4.7",
        "title": "Coaching PROE, Neutral Pace, Script Elasticity & Establish-the-Run Tendencies",
        "prompt": (
            "Search X/Twitter and the web (@benbbaldwin, @SamHoppen, @statrankings, @SharpFootball, @SumerSports, "
            "@PattonAnalytics) for every offensive coordinator and head coach play-calling metric: "
            "(1) Pass Rate Over Expected (PROE) exact nflfastR xpass model features and season vs L3-week rolling delta; "
            "(2) Neutral Situation Pace (seconds per snap when WP is 20-80%) vs Up-7+ Clock-Drain Pace vs Trailing-8+ "
            "Hurry-Up Pace; (3) Script Elasticity (how sharply a coordinator shifts pass rate when trailing vs stubbornly "
            "running into stacked boxes); (4) 2nd-and-10 run rate after a 1st-down incompletion ('Establish It' index); "
            "(5) First-15 scripted opening-drive EPA/play vs 2nd-half coordinator adjustment delta. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_7B_MOTION_PERSONNEL_FORMATIONS_4TH_DOWN",
        "model": "grok-4.20-0309-reasoning",
        "title": "Pre-Snap Motion, Motion-at-Snap, Personnel Groupings & 4th-Down Decision Models",
        "prompt": (
            "Search X/Twitter and the web (@SamHoppen, @SethWalder, @SumerSports, @FTNFantasy, @benbbaldwin) "
            "for: (1) Pre-Snap Motion % vs Motion-at-Snap % ( Shanahan/McDaniel/McVay fly/jet/orbit motion creating "
            "leverage and coverage tells); (2) Personnel grouping matrices (11, 12, 13, 21, 22, 10, 6-OL jumbo) and how "
            "defenses respond (Base 4-3/3-4 vs Nickel vs Dime vs Penny 5-1); (3) Condensed formation splits vs wide "
            "splits; (4) pistol vs shotgun vs under-center play-action pass/run tells; (5) 4th-Down Go-For-It WP Added "
            "models and two-point conversion analytics charts. Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_7C_REDZONE_GREENZONE_GOAL_LINE_COACHING",
        "model": "grok-4.7",
        "title": "Red-Zone, Green-Zone, Inside-5 & Goal-Line Play-Calling & TD Conversion Mechanics",
        "prompt": (
            "Search X/Twitter and the web for every red-zone (inside-20), green-zone (inside-10), and goal-to-go / "
            "inside-5 play-calling and player usage metric: (1) Red-Zone PROE and Pass/Run TD ratio over expectation; "
            "(2) QB sneak / Tush Push conversion rates on 3rd/4th & 1 and 1-yard line; (3) Designed QB red-zone RPO / "
            "zone-read keeper share; (4) RB inside-5 carry share vs 3rd-down back substitution rules; "
            "(5) WR/TE end-zone target share, fade vs flat vs rub/pick-route TD conversion rates. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_8A_OFFICIATING_CREWS_PENALTIES_PACE",
        "model": "grok-4.7",
        "title": "NFL Officiating Crew Analytics, Penalty Tendencies, DPI Yardage & Clock Impact",
        "prompt": (
            "Search X/Twitter and the web (@SharpFootball, @NFLOfficiating, nflpenalties.com, @Austen_Sports) "
            "for how professional NFL bettors and statisticians model referee and officiating crew assignments: "
            "(1) Crew-specific Offensive Holding call rates (killing drives and depressing Overs/underdog scripts); "
            "(2) Crew-specific Defensive Pass Interference (DPI) & Defensive Holding rates (automatic 1st downs and "
            "spot-foul hidden yardage boosting deep-ball QBs and Overs); (3) Roughing the Passer and Unnecessary Roughness "
            "rates; (4) Home vs Away penalty bias and trailing-team catch-up flag bias; (5) Total flags per game and "
            "administrative stoppage impact on total play volume. Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_8B_STADIUM_TURF_WEATHER_ALTITUDE_FATIGUE",
        "model": "grok-4.7",
        "title": "Stadium Microclimates, Turf Physics, Wind Tunnels, Altitude & Circadian/Rest Fatigue",
        "prompt": (
            "Search X/Twitter and the web for every environmental, biomechanical, and logistical situational factor in the NFL: "
            "(1) Playing surfaces: slit-film synthetic vs monofilament FieldTurf/Matrix vs hybrid GrassMaster vs natural "
            "Bermuda/Kentucky Bluegrass — impact on 40-yard burst speed, cutting deceleration, and non-contact injury risk; "
            "(2) Stadium wind tunnels and orientation (Cleveland Huntington Bank Field, Buffalo Highmark, Pittsburgh Acrisure "
            "open end zone, MetLife crosswinds) and nonlinear wind thresholds (12 mph, 17 mph, 22+ mph gusts) on deep passes "
            "and FG accuracy; (3) Altitude at Empower Field (5,280 ft air density reducing drag +4.5 yds on FGs while "
            "accelerating 2nd-half visiting DL hypoxia); (4) Circadian rhythm travel (West-to-East 1:00 PM ET Kickoff, "
            "TNF short-week 0-padded-practice trench fatigue, post-OT >78 defensive snap exhaustion, post-Europe return). "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
    {
        "wave_id": "WAVE_8C_INCENTIVES_NARRATIVES_MARKET_MICROSTRUCTURE",
        "model": "grok-4.20-0309-reasoning",
        "title": "Contract Incentives, Revenge Spots & Sportsbook Market Microstructure (Pinnacle/Circa/DK/FD)",
        "prompt": (
            "Search X/Twitter and the web (@Spotrac, @OverTheCap, @TheHammerHQ, @UnabatedSports, @CaptainJack2000, "
            "@Spanky, @PlusEVAnalytics) for: (1) NFL contract incentive escalators (receptions, yards, TDs, sacks, "
            "playtime %, passer rating thresholds) and how coaches force-feed players near milestones; (2) Layered revenge "
            "and coaching-tree familiarity spots (coordinator facing former HC); (3) Market microstructure: how Pinnacle, "
            "Circa, and BookMaker originate Sunday night openers, how sharp steam moves numbers vs public ticket/handle "
            "splits, Wong teaser key numbers (3, 7, 6, 10, 14) under modern 4th-down/2-pt aggression, 1Q/1H derivative "
            "pricing, and how DraftKings/FanDuel apply Gaussian copula markups (15-30% hold) on Same-Game Parlays. "
            "Never use the abbreviation 'e-t-c' with a period."
        ),
    },
]


def call_xai_wave(wave: dict[str, str], api_key: str) -> dict[str, Any]:
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
            "User-Agent": "GSE-Harvester/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    # Extract assistant text from output items
    texts: list[str] = []
    for item in raw.get("output", []):
        if item.get("type") == "message":
            for part in item.get("content", []):
                if part.get("type") in ("output_text", "text") and part.get("text"):
                    texts.append(part["text"])
    combined_text = "\n\n".join(texts).replace("etc.", "and related metrics").replace("ETC.", "AND RELATED METRICS")
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
        futs = {pool.submit(call_xai_wave, w, api_key): w["wave_id"] for w in WAVE_PROMPTS}
        for fut in as_completed(futs):
            wid = futs[fut]
            res = fut.result()
            results.append(res)
            print(f"[xAI Harvester] Completed {wid} ({len(res['content'])} chars, cost=${res['cost_usd']:.4f})")

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
        "# Exhaustive xAI Grok Live X-Search & Web-Search Bible: Waves 5–8 (Trench Warfare, Coverage Shells, IDP, Coaching & Situational Context)",
        "",
        f"- **Generated At (UTC):** `{payload_out['generated_at_utc']}`",
        f"- **Waves Executed:** `{len(results)}` (`grok-4.7` & `grok-4.20-0309-reasoning` with live `x_search` + `web_search`)",
        f"- **Total Characters Harvested:** `{total_chars:,}`",
        f"- **Total xAI API Spend (Waves 5–8):** `${total_cost:.4f}`",
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

    # Sync to C:\Users\Garrett\Sports if running in worktree
    sports_root = Path(r"C:\Users\Garrett\Sports")
    if sports_root.exists() and sports_root.resolve() != REPO_ROOT.resolve():
        for rel in [
            Path("scripts/ops/xai_nfl_trench_defense_coaching_and_situational_harvester.py"),
            Path("data/audits/xai_nfl_trench_defense_coaching_situational_encyclopedia_2026_11_06.json"),
            Path("docs/data-sources/research/2026-11-06/XAI_EXHAUSTIVE_TRENCH_DEFENSE_COACHING_AND_SITUATIONAL_BIBLE.md"),
        ]:
            dst = sports_root / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(REPO_ROOT / rel, dst)

    print(f"[xAI Harvester] ALL 12 WAVES (5A..8C) COMPLETE: {total_chars:,} chars, cost=${total_cost:.4f}")


if __name__ == "__main__":
    main()
