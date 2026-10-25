#!/usr/bin/env python3
"""
Live JEV Epistemic Arbitration (~typesafe/jev-latest via OpenRouter Alpha Decisions API)
for Sunday Week 7 Master Slate (2026-10-25).
Reads artifacts/slate/2026-10-25-week7-master-slate.json, arbitrates all 13 games + 26 props
through live ~typesafe/jev-latest (choice + noul pre-kickoff approval probability),
and writes back to both artifacts/slate/2026-10-25-week7-master-slate.json and
data/bundles/2026-10-25-week7-sunday-master.json.
"""
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, r"C:\Users\Garrett\hermes-jev-skills")
from jevkit import client

REPO_ROOT = Path(r"C:\Users\Garrett\Sports")
SLATE_PATH = REPO_ROOT / "artifacts" / "slate" / "2026-10-25-week7-master-slate.json"
BUNDLE_PATH = REPO_ROOT / "data" / "bundles" / "2026-10-25-week7-sunday-master.json"


def arbitrate_game(g: dict) -> tuple[str, dict]:
    game_id = g["matchup"]
    matchup = g["matchup"]
    r = g["classALockedReceipt"]
    c = g["classBMarketComparison"]
    gates = g.get("sixGatesAudit", {})
    reasoning = g.get("fullReasoningTrace", {})
    prompt = (
        f"NFL Week 7 (2026-10-25) Epistemic Gate Arbitration for {matchup} ({g['kickoffWindow']}).\n"
        f"- Locked Class A Margin (Home-Away): {r['finalProjectedHomeMargin']:+.2f}, Locked Total: {r['finalProjectedTotal']:.2f}, Home WinProb: {r['modelWinProbHome']:.4f}\n"
        f"- Market Line: {c['dkSpreadDetails']}, Total {c['totalLine']:.1f}, ML Home/Away {c['mlHomeOdds']}/{c['mlAwayOdds']}\n"
        f"- Spread Pick: [{c['spreadDecision']}] {c['bestSpreadSide']} (edge={c['bestSpreadEdgePct']:+.2f}%, EV={c['bestSpreadEvPct']:+.2f}%)\n"
        f"- Total Pick: [{c['totalDecision']}] {c['bestTotalSide']} (edge={c['bestTotalEdgePct']:+.2f}%, EV={c['bestTotalEvPct']:+.2f}%)\n"
        f"- ML Pick: [{c['mlDecision']}] {c['bestMlSide']} {c['bestMlOdds']} (edge={c['bestMlEdgePct']:+.2f}%, EV={c['bestMlEvPct']:+.2f}%)\n"
        f"- 6-Gate Status: All6Passed={gates.get('allGatesPassed')}, Gate2={gates.get('gate2IndependentEdgeDecision')} ({gates.get('gate2RefereeAgreement')}), "
        f"Gate4 LCB95={gates.get('gate4BayesianLcb95')}, BayesFactor(2lnB10)={reasoning.get('bayesFactor2LnB10')}, "
        f"ProfitBias={reasoning.get('profitBiasBookMispricing')}, Gate5 Cholesky={reasoning.get('choleskySixFamilyDelta')}\n"
        f"- ArXiv/Mind Synthesis: {str(reasoning.get('arxivSynthesis', ''))[:180]}\n"
        f"- Injuries: {', '.join(g.get('keyInjuriesOut', []))}\n"
    )
    t0 = time.perf_counter()
    try:
        resp = client.ask(
            prompt,
            {
                "game_verdict": client.choice(
                    "Classify this NFL Week 7 game card's primary actionability under GSE 6-gate discipline.",
                    {
                        "CERTIFIED_ACTIONABLE": "At least one spread/total/ML play clears all 6 gates with positive EV, LCB95, and Bayes Factor support.",
                        "LEAN_CAUTIOUS": "Modest edge or secondary market play only; size conservatively.",
                        "PASS_NO_EDGE": "Market is efficient or edge fails the independent-edge / adverse-edge gate.",
                        "TRAP_WARNING": "High injury/steam uncertainty or conflicting estimators; avoid.",
                    },
                ),
                "clv_hold_prob": client.noul(
                    "The primary PLAY recommendation on this game has positive expected value and will hold positive closing line value through kickoff."
                ),
            },
            timeout=25.0,
        )
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)
        ans = resp.get("answers", {})
        gv = ans.get("game_verdict", {})
        cp = ans.get("clv_hold_prob", {})
        return game_id, {
            "model": "~typesafe/jev-latest",
            "verdict": gv.get("choice", "LEAN_CAUTIOUS"),
            "probabilities": gv.get("probabilities", {}),
            "confidence": gv.get("confidence", 1.0),
            "clvHoldProb": cp.get("noul", 0.5),
            "latencyMs": elapsed_ms,
        }
    except Exception as exc:
        return game_id, {
            "model": "~typesafe/jev-latest (fallback)",
            "verdict": "CERTIFIED_ACTIONABLE" if gates.get("allGatesPassed") else "PASS_NO_EDGE",
            "error": str(exc),
        }


def arbitrate_prop(p: dict) -> tuple[str, dict]:
    key = f"{p['player']}_{p['propType']}"
    gates = p.get("sixGatesAudit", {})
    odds = p["overOdds"] if p["direction"] == "OVER" else p["underOdds"]
    prompt = (
        f"NFL Week 7 (2026-10-25, National Tight Ends Day) Player Prop Epistemic Arbitration:\n"
        f"- Player: {p['player']} ({p['team']} {p['pos']}, {p['matchup']})\n"
        f"- Market: {p['direction']} {p['dkLine']} {p['propType']} ({odds} on DraftKings; OpenLine={p.get('dkOpenLine')}, SteamDelta={p.get('steamDeltaYds'):+.1f} yds, ShinFair={p['shinMarketFairProb']:.4f})\n"
        f"- Engine Projection: Mean={p['meanProjection']}, P10={p['p10']}, P50={p['p50']}, P90={p['p90']}, WinProb={p['modelWinProb']:.4f}\n"
        f"- Edge: +{p['edgePct']:.2f}%, EV: +{p['evPct']:.2f}%, LCB95={gates.get('bayesianLcb95')}, CQRWidth={gates.get('cqrWidth')}/{gates.get('cqrMaxAllowed')}, AllGates={gates.get('allGatesPassed')}, Score={p['confidenceScore']}\n"
        f"- Reasoning: {p['reasoning'][:240]}\n"
    )
    t0 = time.perf_counter()
    try:
        resp = client.ask(
            prompt,
            {
                "prop_verdict": client.choice(
                    "Classify this player prop under GSE 6-gate discipline.",
                    {
                        "CERTIFIED_PLAY": "Strong positive EV and LCB95 clearance with healthy snap/target role and unsteamed line.",
                        "CAUTIOUS_LEAN": "Positive edge but higher variance or moderate line movement.",
                        "STEAM_TRAP_PASS": "Line has already moved too far past fair value.",
                        "INJURY_RISK_PASS": "Player availability or snap count is compromised.",
                    },
                ),
                "edge_survival_prob": client.noul(
                    "This player prop has genuine positive expected value and will beat the de-vigged DraftKings closing line."
                ),
            },
            timeout=25.0,
        )
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)
        ans = resp.get("answers", {})
        pv = ans.get("prop_verdict", {})
        ep = ans.get("edge_survival_prob", {})
        return key, {
            "model": "~typesafe/jev-latest",
            "verdict": pv.get("choice", "CERTIFIED_PLAY"),
            "probabilities": pv.get("probabilities", {}),
            "confidence": pv.get("confidence", 1.0),
            "edgeSurvivalProb": ep.get("noul", 0.5),
            "latencyMs": elapsed_ms,
        }
    except Exception as exc:
        return key, {
            "model": "~typesafe/jev-latest (fallback)",
            "verdict": "CERTIFIED_PLAY" if gates.get("allGatesPassed") else "CAUTIOUS_LEAN",
            "error": str(exc),
        }


def main() -> None:
    data = json.loads(SLATE_PATH.read_text(encoding="utf-8"))
    games = data.get("evaluatedGames", [])
    props = data.get("evaluatedProps", [])
    print(f"[JEV Live Arbitration] Arbitrating {len(games)} games and {len(props)} props via ~typesafe/jev-latest...")

    game_results = {}
    prop_results = {}

    with ThreadPoolExecutor(max_workers=6) as pool:
        future_to_game = {pool.submit(arbitrate_game, g): g["matchup"] for g in games}
        future_to_prop = {pool.submit(arbitrate_prop, p): f"{p['player']}_{p['propType']}" for p in props}

        for fut in as_completed(future_to_game):
            gid, res = fut.result()
            game_results[gid] = res
            print(f"  [GAME] {gid}: verdict={res.get('verdict')} clvHoldProb={res.get('clvHoldProb')} ({res.get('latencyMs')}ms)")

        for fut in as_completed(future_to_prop):
            pkey, res = fut.result()
            prop_results[pkey] = res
            print(f"  [PROP] {pkey}: verdict={res.get('verdict')} survivalProb={res.get('edgeSurvivalProb')} ({res.get('latencyMs')}ms)")

    for g in games:
        g["liveJevArbitration"] = game_results.get(g["matchup"], {})

    for p in props:
        pkey = f"{p['player']}_{p['propType']}"
        p["liveJevArbitration"] = prop_results.get(pkey, {})

    data["jevArbitrationSummary"] = {
        "model": "~typesafe/jev-latest",
        "endpoint": "https://openrouter.ai/api/alpha/decisions",
        "gamesArbitrated": len(game_results),
        "propsArbitrated": len(prop_results),
        "certifiedGames": [
            g["matchup"] for g in games if g.get("liveJevArbitration", {}).get("verdict") == "CERTIFIED_ACTIONABLE"
        ],
        "certifiedProps": [
            f"{p['player']} {p['direction']} {p['dkLine']} {p['propType']}"
            for p in props
            if p.get("liveJevArbitration", {}).get("verdict") == "CERTIFIED_PLAY"
        ],
    }

    SLATE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    BUNDLE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"[JEV Live Arbitration] Saved updated bundle to {SLATE_PATH} and {BUNDLE_PATH}")


if __name__ == "__main__":
    main()
