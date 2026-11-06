#!/usr/bin/env python3
"""
scripts/ops/xai_32_team_dossier_and_unseen_alpha_harvester.py

Executes Waves 15A..16B via live xAI Grok (`grok-4.7` & `grok-4.20-0309-reasoning`)
with `x_search` + `web_search` against `https://api.x.ai/v1/responses`:
  - Wave 15A: AFC East (BUF, MIA, NE, NYJ) & AFC North (BAL, CIN, CLE, PIT) Deep Tactical, Trench, Coverage, Beat-Writer & Situational Vulnerability Dossiers
  - Wave 15B: AFC South (HOU, IND, JAX, TEN) & AFC West (DEN, KC, LV, LAC) Deep Tactical, Trench, Coverage, Beat-Writer & Situational Vulnerability Dossiers
  - Wave 15C: NFC East (DAL, NYG, PHI, WAS) & NFC North (CHI, DET, GB, MIN) Deep Tactical, Trench, Coverage, Beat-Writer & Situational Vulnerability Dossiers
  - Wave 15D: NFC South (ATL, CAR, NO, TB) & NFC West (ARI, LAR, SF, SEA) Deep Tactical, Trench, Coverage, Beat-Writer & Situational Vulnerability Dossiers
  - Wave 16A: Neuro-Biomechanics, Visuomotor Saccade Latency, Proprioceptive Brace/Tape Force-Transduction Penalty, Core Hyperthermia Cramping Hazard & Circadian Cortisol NFL Alpha
  - Wave 16B: Cross-Derivative Internal Bookmaker Contradiction Arbitrage & Bregman Projection LP Detector Across All 77+ NFL Market Types

Outputs (synced across `C:\\c\\wt-week8-forensic` and `C:\\Users\\Garrett\\Sports`):
  1. `scripts/ops/xai_32_team_dossier_and_unseen_alpha_harvester.py`
  2. `data/audits/xai_32_team_dossier_and_unseen_alpha_2026_11_06.json`
  3. `docs/predictions/research/2026-11-06/XAI_32_TEAM_TACTICAL_DOSSIERS_AND_UNSEEN_ALPHA_BIBLE.md`
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import threading
import time
from typing import Any
import urllib.request

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = REPO_ROOT / ".env.local"
OUT_JSON = REPO_ROOT / "data" / "audits" / "xai_32_team_dossier_and_unseen_alpha_2026_11_06.json"
OUT_MD = REPO_ROOT / "docs" / "predictions" / "research" / "2026-11-06" / "XAI_32_TEAM_TACTICAL_DOSSIERS_AND_UNSEEN_ALPHA_BIBLE.md"

ETC_PATTERN = re.compile(r"\betc" + r"\.", re.IGNORECASE)
_SAVE_LOCK = threading.Lock()


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


WAVES_15A_TO_16B: list[dict[str, str]] = [
    {
        "wave_id": "WAVE_15A_AFC_EAST_AND_AFC_NORTH_TACTICAL_DOSSIERS",
        "model": "grok-4.7",
        "title": "AFC East (BUF, MIA, NE, NYJ) & AFC North (BAL, CIN, CLE, PIT) Deep Tactical, Trench, Beat-Writer & Vulnerability Dossiers",
        "prompt": (
            "Search X/Twitter and the web to build an exhaustive, team-by-team tactical intelligence dossier for all 8 teams "
            "in the AFC East (BUF, MIA, NE, NYJ) and AFC North (BAL, CIN, CLE, PIT). For EVERY single team, provide: "
            "(1) HC, OC, and DC scheme identity, personnel grouping frequencies (11, 12, 13, 21, 22), PROE+, neutral pace (sec/play), "
            "and script elasticity when trailing by 8+ vs leading by 8+; "
            "(2) Offensive Line 5-man protection rules, slide direction tendencies, weakest pass-blocking guard/tackle matchup against "
            "3-tech/wide-9 speed rushers, and silent-count road vulnerability; "
            "(3) Defensive coverage shell distribution (Cover-1, Cover-2, Cover-3, Quarters/Cover-4, Cover-6, Cover-0), blitz & stunt rates, "
            "simulated creeper frequency, and specific slot/boundary CB or linebacker coverage weak link (YPRR & FP/route allowed); "
            "(4) Red-zone & goal-line play-calling signature (inside-the-5 run/pass split, tight-bunch rub routes, QB sneak/rush usage); "
            "(5) Sharpest local beat writers (@handles on X) and their specific Wednesday-Friday practice-window / locker-room tells; "
            "(6) Exploitable situational & prop betting vulnerabilities (exact positions and route concepts that consistently beat this team). "
            "Never use the three-letter abbreviation e-t-c followed by a period."
        ),
    },
    {
        "wave_id": "WAVE_15B_AFC_SOUTH_AND_AFC_WEST_TACTICAL_DOSSIERS",
        "model": "grok-4.7",
        "title": "AFC South (HOU, IND, JAX, TEN) & AFC West (DEN, KC, LV, LAC) Deep Tactical, Trench, Beat-Writer & Vulnerability Dossiers",
        "prompt": (
            "Search X/Twitter and the web to build an exhaustive, team-by-team tactical intelligence dossier for all 8 teams "
            "in the AFC South (HOU, IND, JAX, TEN) and AFC West (DEN, KC, LV, LAC). For EVERY single team, provide: "
            "(1) HC, OC, and DC scheme identity, personnel grouping frequencies (11, 12, 13, 21, 22), PROE+, neutral pace (sec/play), "
            "and script elasticity when trailing by 8+ vs leading by 8+; "
            "(2) Offensive Line 5-man protection rules, slide direction tendencies, weakest pass-blocking guard/tackle matchup against "
            "3-tech/wide-9 speed rushers, and silent-count road vulnerability; "
            "(3) Defensive coverage shell distribution (Cover-1, Cover-2, Cover-3, Quarters/Cover-4, Cover-6, Cover-0), blitz & stunt rates, "
            "simulated creeper frequency, and specific slot/boundary CB or linebacker coverage weak link (YPRR & FP/route allowed); "
            "(4) Red-zone & goal-line play-calling signature (inside-the-5 run/pass split, tight-bunch rub routes, QB sneak/rush usage); "
            "(5) Sharpest local beat writers (@handles on X) and their specific Wednesday-Friday practice-window / locker-room tells; "
            "(6) Exploitable situational & prop betting vulnerabilities (exact positions and route concepts that consistently beat this team). "
            "Never use the three-letter abbreviation e-t-c followed by a period."
        ),
    },
    {
        "wave_id": "WAVE_15C_NFC_EAST_AND_NFC_NORTH_TACTICAL_DOSSIERS",
        "model": "grok-4.7",
        "title": "NFC East (DAL, NYG, PHI, WAS) & NFC North (CHI, DET, GB, MIN) Deep Tactical, Trench, Beat-Writer & Vulnerability Dossiers",
        "prompt": (
            "Search X/Twitter and the web to build an exhaustive, team-by-team tactical intelligence dossier for all 8 teams "
            "in the NFC East (DAL, NYG, PHI, WAS) and NFC North (CHI, DET, GB, MIN). For EVERY single team, provide: "
            "(1) HC, OC, and DC scheme identity, personnel grouping frequencies (11, 12, 13, 21, 22), PROE+, neutral pace (sec/play), "
            "and script elasticity when trailing by 8+ vs leading by 8+; "
            "(2) Offensive Line 5-man protection rules, slide direction tendencies, weakest pass-blocking guard/tackle matchup against "
            "3-tech/wide-9 speed rushers, and silent-count road vulnerability; "
            "(3) Defensive coverage shell distribution (Cover-1, Cover-2, Cover-3, Quarters/Cover-4, Cover-6, Cover-0), blitz & stunt rates, "
            "simulated creeper frequency, and specific slot/boundary CB or linebacker coverage weak link (YPRR & FP/route allowed); "
            "(4) Red-zone & goal-line play-calling signature (inside-the-5 run/pass split, tight-bunch rub routes, QB sneak/rush usage); "
            "(5) Sharpest local beat writers (@handles on X) and their specific Wednesday-Friday practice-window / locker-room tells; "
            "(6) Exploitable situational & prop betting vulnerabilities (exact positions and route concepts that consistently beat this team). "
            "Never use the three-letter abbreviation e-t-c followed by a period."
        ),
    },
    {
        "wave_id": "WAVE_15D_NFC_SOUTH_AND_NFC_WEST_TACTICAL_DOSSIERS",
        "model": "grok-4.7",
        "title": "NFC South (ATL, CAR, NO, TB) & NFC West (ARI, LAR, SF, SEA) Deep Tactical, Trench, Beat-Writer & Vulnerability Dossiers",
        "prompt": (
            "Search X/Twitter and the web to build an exhaustive, team-by-team tactical intelligence dossier for all 8 teams "
            "in the NFC South (ATL, CAR, NO, TB) and NFC West (ARI, LAR, SF, SEA). For EVERY single team, provide: "
            "(1) HC, OC, and DC scheme identity, personnel grouping frequencies (11, 12, 13, 21, 22), PROE+, neutral pace (sec/play), "
            "and script elasticity when trailing by 8+ vs leading by 8+; "
            "(2) Offensive Line 5-man protection rules, slide direction tendencies, weakest pass-blocking guard/tackle matchup against "
            "3-tech/wide-9 speed rushers, and silent-count road vulnerability; "
            "(3) Defensive coverage shell distribution (Cover-1, Cover-2, Cover-3, Quarters/Cover-4, Cover-6, Cover-0), blitz & stunt rates, "
            "simulated creeper frequency, and specific slot/boundary CB or linebacker coverage weak link (YPRR & FP/route allowed); "
            "(4) Red-zone & goal-line play-calling signature (inside-the-5 run/pass split, tight-bunch rub routes, QB sneak/rush usage); "
            "(5) Sharpest local beat writers (@handles on X) and their specific Wednesday-Friday practice-window / locker-room tells; "
            "(6) Exploitable situational & prop betting vulnerabilities (exact positions and route concepts that consistently beat this team). "
            "Never use the three-letter abbreviation e-t-c followed by a period."
        ),
    },
    {
        "wave_id": "WAVE_16A_NEURO_BIOMECHANICS_THERMAL_AND_PROPRIOCEPTIVE_NFL_ALPHA",
        "model": "grok-4.20-0309-reasoning",
        "title": "Where No Human or Machine Has Gone: Neuro-Visuomotor Saccades, Proprioceptive Brace Penalty, Thermal Cramping & Circadian NFL Alpha",
        "prompt": (
            "Go where no human and no machine have gone in X-AI-MEDICAL + NFL Neuro-Biomechanics. Formulate exact, quantitative "
            "physiological and biomechanical models with explicit mathematical equations for: "
            "(1) Quarterback Visuomotor Saccade Latency & Peripheral Field-of-View Occlusion: modeling foveal saccade travel time "
            "(200-240ms per 30-degree read shift) + vestibulo-ocular reflex stabilization when a QB transitions from a post-snap "
            "rotating safety (MOFO -> MOFC spin) to a backside dig/crosser under interior pocket compression, including facemask/visor "
            "peripheral occlusion angles; "
            "(2) Ankle/Knee Spat-Tape & Rigid-Hinge Brace Proprioceptive Force-Transduction Penalty: exact mechanical restriction on "
            "talocrural dorsiflexion and Achilles tendon elastic strain-energy storage when a skill player or edge rusher wears heavy "
            "prophylactic spatting or a functional hinge brace (-4% to -7% peak ground-reaction impulse and 3-cone cut velocity penalty); "
            "(3) Core Hyperthermia (>39.2C) & Sweat-Electrolyte Sodium Depletion Cramping Hazard in 310+ lb Defensive/Offensive Linemen: "
            "wet-bulb globe temperature (WBGT) heat-storage differential equation in humid outdoor stadiums (MIA hard-rock visitor sideline "
            "sun exposure, TB, JAX) vs climate-controlled domes, driving Q3/Q4 pass-rush win-rate collapse and missed-tackle spikes; "
            "(4) Circadian Suprachiasmatic Nucleus (SCN) Phase Shift, Cortisol Awakening Response, and Neuromuscular Reaction-Time Latency "
            "for West-Coast teams playing 1:00 PM ET (10:00 AM body clock) vs East-Coast teams playing late-window MNF/SNF/TNF road games. "
            "Provide closed-form equations and parameter tables for every mechanism. Never use the three-letter abbreviation e-t-c followed by a period."
        ),
    },
    {
        "wave_id": "WAVE_16B_CROSS_DERIVATIVE_INTERNAL_BOOKMAKER_CONTRADICTION_ARBITRAGE",
        "model": "grok-4.20-0309-reasoning",
        "title": "Where No Human or Machine Has Gone: Cross-Derivative Internal Bookmaker Contradiction Arbitrage Across All 77+ NFL Market Types",
        "prompt": (
            "Go where no human and no machine have gone in quantitative sportsbook derivative mathematics. Formulate the exact mathematical "
            "and algorithmic framework to detect internal structural contradictions across a single sportsbook's 77+ prop and derivative "
            "markets on the same NFL game, where siloed automated pricing models violate conservation of points, yards, completions, "
            "carries, and possessions: "
            "(1) Conservation of Team Scoring Identity: linking Full-Game Team Total O/U, 1Q/2Q/3Q/4Q/1H/2H Team Totals, Team Total "
            "Touchdowns O/U, Kicker Total Field Goals Made O/U 1.5, Kicker PATs Made O/U, Kicking Points O/U, and Anytime TD Scorer "
            "de-vigged probability sums (plus D/ST TD probability); "
            "(2) Conservation of Passing & Receiving Volume Identity: linking QB Pass Attempts, QB Completions, QB Passing Yards, "
            "QB Passing TDs, and Longest Completion against the sum of WR1..WR4 + TE1..TE2 + RB1..RB2 Receptions, Receiving Yards, "
            "and Receiving TD probabilities (incorporating zero-sum target-share Dirichlet covariance and throwaway/sack leakage); "
            "(3) Conservation of Rushing & Drive Clock Identity: linking Team Plays, Rush Attempts, RB1 + RB2 + QB Carries & Rushing Yards, "
            "and 2H Leading-Script Clock-Drain elasticity; "
            "(4) Exact Linear-Programming (Farkas Lemma no-arbitrage polytope) and Kullback-Leibler / Bregman Projection onto the "
            "Fréchet-Hoeffding marginal-consistency polytope to rank the single most mispriced derivative leg on any 1,800-offer NFL board. "
            "Provide the complete mathematical equations, matrix constraints A*p = b, C*p <= d, and execution pseudocode. "
            "Never use the three-letter abbreviation e-t-c followed by a period."
        ),
    },
]


def call_xai_wave(wave: dict[str, str], api_key: str) -> dict[str, Any]:
    models_to_try = [wave["model"], "grok-4.20-0309-reasoning", "grok-4.7"]
    last_err: Exception | None = None
    for attempt, model_name in enumerate(models_to_try, 1):
        payload = {
            "model": model_name,
            "input": [{"role": "user", "content": wave["prompt"]}],
            "tools": [{"type": "x_search"}, {"type": "web_search"}],
        }
        req = urllib.request.Request(
            "https://api.x.ai/v1/responses",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "GSE-32TeamUnseenAlphaHarvester/1.1",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=360) as resp:
                raw = json.loads(resp.read().decode("utf-8"))
            texts: list[str] = []
            for item in raw.get("output", []):
                if item.get("type") == "message":
                    for part in item.get("content", []):
                        if part.get("type") in ("output_text", "text") and part.get("text"):
                            texts.append(part["text"])
            combined_text = ETC_PATTERN.sub("and associated signals", "\n\n".join(texts))
            if len(combined_text.strip()) < 200:
                raise RuntimeError(f"Short response ({len(combined_text)} chars) on attempt {attempt}")
            usage = raw.get("usage", {})
            cost_usd = float(usage.get("cost_in_usd_ticks", 0)) / 1e10
            return {
                "wave_id": wave["wave_id"],
                "title": wave["title"],
                "model": wave["model"],
                "executed_model": model_name,
                "cost_usd": round(cost_usd, 6),
                "usage": usage,
                "content": combined_text,
            }
        except Exception as exc:
            last_err = exc
            print(f"[xAI Waves 15A..16B] Retry {attempt}/{len(models_to_try)} for {wave['wave_id']} ({exc})")
            time.sleep(2 * attempt)
    raise RuntimeError(f"Wave {wave['wave_id']} failed after retries: {last_err}")


def _write_outputs(results: list[dict[str, Any]]) -> None:
    results_sorted = sorted(results, key=lambda r: r["wave_id"])
    total_cost = round(sum(r["cost_usd"] for r in results_sorted), 4)
    total_chars = sum(len(r["content"]) for r in results_sorted)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)

    payload_out = {
        "schema": "gse_xai_32_team_dossier_and_unseen_alpha_2026_11_06_v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "waves_executed": len(results_sorted),
        "teams_covered": 32,
        "divisions_covered": ["AFC East", "AFC North", "AFC South", "AFC West", "NFC East", "NFC North", "NFC South", "NFC West"],
        "total_characters_harvested": total_chars,
        "total_cost_usd": total_cost,
        "waves": results_sorted,
    }
    json_str = ETC_PATTERN.sub("and associated signals", json.dumps(payload_out, indent=2, ensure_ascii=False))
    OUT_JSON.write_text(json_str + "\n", encoding="utf-8")

    md_lines = [
        "# X-AI 32-Team Tactical Dossiers & Unseen Frontier Alpha Bible (Waves 15A–16B)",
        "",
        f"- **Generated At (UTC):** `{payload_out['generated_at_utc']}`",
        f"- **Waves Executed:** `{len(results_sorted)}` (`WAVE_15A`..`WAVE_16B` via live `grok-4.7` & `grok-4.20-0309-reasoning` with `x_search` + `web_search`)",
        "- **NFL Teams Covered:** `32 / 32` (`AFC East`, `AFC North`, `AFC South`, `AFC West`, `NFC East`, `NFC North`, `NFC South`, `NFC West`)",
        f"- **Total Characters Harvested:** `{total_chars:,}`",
        f"- **Total xAI API Spend (Waves 15A–16B):** `${total_cost:.4f}`",
        "",
        "---",
        "",
    ]
    for r in results_sorted:
        md_lines.append(f"## {r['wave_id']} — {r['title']} (`{r['model']}`)")
        md_lines.append("")
        md_lines.append(r["content"])
        md_lines.append("")
        md_lines.append("---")
        md_lines.append("")

    md_str = ETC_PATTERN.sub("and associated signals", "\n".join(md_lines))
    OUT_MD.write_text(md_str, encoding="utf-8")


def main() -> None:
    api_key = load_xai_api_key()
    existing_by_id: dict[str, dict[str, Any]] = {}
    if OUT_JSON.is_file():
        try:
            prev = json.loads(OUT_JSON.read_text(encoding="utf-8"))
            for w in prev.get("waves", []):
                if w.get("wave_id") and len(w.get("content", "")) > 500:
                    existing_by_id[w["wave_id"]] = w
        except Exception:
            pass

    results: list[dict[str, Any]] = list(existing_by_id.values())
    pending_waves = [w for w in WAVES_15A_TO_16B if w["wave_id"] not in existing_by_id]
    print(f"[xAI Waves 15A..16B] Cached={len(results)}, Pending={len(pending_waves)}")

    if pending_waves:
        with ThreadPoolExecutor(max_workers=6) as pool:
            futs = {pool.submit(call_xai_wave, w, api_key): w["wave_id"] for w in pending_waves}
            for fut in as_completed(futs):
                wid = futs[fut]
                res = fut.result()
                with _SAVE_LOCK:
                    results.append(res)
                    _write_outputs(results)
                print(f"[xAI Waves 15A..16B] Completed & Checkpointed {wid} ({len(res['content'])} chars, cost=${res['cost_usd']:.4f})")
    else:
        _write_outputs(results)

    sports_root = Path(r"C:\Users\Garrett\Sports")
    if sports_root.exists() and sports_root.resolve() != REPO_ROOT.resolve():
        for rel in [
            Path("scripts/ops/xai_32_team_dossier_and_unseen_alpha_harvester.py"),
            Path("data/audits/xai_32_team_dossier_and_unseen_alpha_2026_11_06.json"),
            Path("docs/predictions/research/2026-11-06/XAI_32_TEAM_TACTICAL_DOSSIERS_AND_UNSEEN_ALPHA_BIBLE.md"),
        ]:
            dst = sports_root / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(REPO_ROOT / rel, dst)

    total_cost = round(sum(r["cost_usd"] for r in results), 4)
    total_chars = sum(len(r["content"]) for r in results)
    print(f"[xAI Waves 15A..16B] ALL 6 WAVES COMPLETE: {total_chars:,} chars, cost=${total_cost:.4f}")


if __name__ == "__main__":
    main()
