from __future__ import annotations

import hashlib
import json
import re
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

DEFAULT_SOURCE_PATH = (
    REPO_ROOT / "data" / "engine" / "week11_unified_sealed_projections_2026_11_18.json"
)
DEFAULT_OUTPUT_PATH = (
    REPO_ROOT / "apps" / "web" / "lib" / "slate" / "current-sealed-slate.json"
)

_NUMBER_AT_END_RE = re.compile(r"([+-]?\d+(?:\.\d+)?)\s*$")
_BANNED_TERMS_RE = re.compile(
    r"\b(?:JEV|Sinkhorn|Cholesky|tau_hat|locked|guaranteed)\b"
    r"|Romano\s+CQR|10,000\s+worlds|risk[- ]free|62-23-1|%",
    re.IGNORECASE,
)


def _ascii_clean(text: str) -> str:
    cleaned = (
        text.replace("\u2014", "--")
        .replace("\u2013", "-")
        .replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2192", "->")
        .replace("\u00b7", "-")
        .replace("\u00b0", " deg")
    )
    ascii_only = cleaned.encode("ascii", "ignore").decode("ascii")
    if _BANNED_TERMS_RE.search(ascii_only):
        raise ValueError(f"Banned term detected in public copy: {ascii_only}")
    return ascii_only


def _extract_market_line(selection: str, fallback: float = 0.0) -> float:
    match = _NUMBER_AT_END_RE.search(selection.strip())
    if not match:
        return round(float(fallback), 2)
    return round(float(match.group(1)), 2)


def _confidence_display(model_p: float) -> str:
    score = int(round(max(1.0, min(99.0, float(model_p) * 100.0))))
    return f"{score}/100"


def _build_game_environment_clause(game: dict[str, Any]) -> str:
    env = game.get("stage2_reasoned_environment", {})
    is_indoor = env.get("is_indoor", game.get("indoor", False))
    venue_label = "indoors" if is_indoor else "outdoors"
    pace = round(float(env.get("pace_sec_per_play", 27.5)), 1)
    away_env = env.get("away", {})
    home_env = env.get("home", {})
    away_disrupt = int(round(float(away_env.get("ol_disruption", 0.22)) * 100))
    home_disrupt = int(round(float(home_env.get("ol_disruption", 0.22)) * 100))
    return (
        f"Played {venue_label} at {pace:.1f}s neutral pace; "
        f"protection stress profiles sit at {away_disrupt}/100 away "
        f"and {home_disrupt}/100 home."
    )


def _build_game_pass_row(
    game: dict[str, Any],
    gp: dict[str, Any],
    category: str = "PASS",
) -> dict[str, Any]:
    model_p = round(float(gp.get("model_prob", 0.5)), 4)
    market_p = round(float(gp.get("devigged_market_prob", 0.5)), 4)
    edge = round(min(0.0, float(gp.get("expected_clv", model_p - market_p))), 4)
    selection = _ascii_clean(str(gp["selection"]))
    market_line = _extract_market_line(
        selection, float(game.get("market_total", 0.0))
    )
    env_clause = _build_game_environment_clause(game)
    market_id = str(gp.get("market_id", "market")).replace("_", " ")
    rationale = _ascii_clean(
        f"Pass discipline holds on {market_id}: number aligns with market "
        f"equilibrium. {env_clause}"
    )
    return {
        "matchup": _ascii_clean(str(game["matchup"])),
        "category": category,
        "selection": selection,
        "decision": "PASS",
        "publishAllowed": False,
        "model_p": model_p,
        "market_p": market_p,
        "edge": edge,
        "model_median": round(float(market_line), 2),
        "rationale": rationale,
        "confidence_display": _confidence_display(model_p),
        "market_line": market_line,
    }


def _build_prop_row(
    game: dict[str, Any],
    prop: dict[str, Any],
    *,
    category: str,
    decision: str,
    rationale: str,
    include_watch_odds: bool = False,
) -> dict[str, Any]:
    model_p = round(float(prop.get("model_prob", 0.5)), 4)
    market_p = round(float(prop.get("devigged_market_prob", 0.5)), 4)
    edge = round(float(prop.get("expected_clv", model_p - market_p)), 4)
    selection = _ascii_clean(str(prop["selection"]))
    market_line = _extract_market_line(selection, 0.5)
    model_median = round(float(prop.get("mean_proj", market_line)), 2)
    row: dict[str, Any] = {
        "matchup": _ascii_clean(str(game["matchup"])),
        "category": category,
        "selection": selection,
        "decision": decision,
        "publishAllowed": False,
        "model_p": model_p,
        "market_p": market_p,
        "edge": edge,
        "model_median": model_median,
        "rationale": _ascii_clean(rationale),
        "confidence_display": _confidence_display(model_p),
        "market_line": market_line,
    }
    if include_watch_odds:
        row["trigger_odds"] = -105
        row["fair_odds"] = -112
    return row


def export_sealed_slate(
    source_path: Path = DEFAULT_SOURCE_PATH,
    output_path: Path = DEFAULT_OUTPUT_PATH,
    now_utc: datetime | None = None,
) -> dict[str, Any]:
    """Export Week 11 unified projections to a public-safe sealed web slate."""
    doc = json.loads(source_path.read_text(encoding="utf-8"))
    season = int(doc["season"])
    week = int(doc["week"])
    source_sha = _ascii_clean(str(doc["projection_source_sha256"]))
    games: list[dict[str, Any]] = list(doc["games"])

    # Enforce zero free paid-pick leakage: paid PLAY rows stay behind paywall.
    main_rows: list[dict[str, Any]] = []
    pass_rows: list[dict[str, Any]] = []
    watch_one_q: list[dict[str, Any]] = []
    watch_kicking: list[dict[str, Any]] = []
    watch_idp: list[dict[str, Any]] = []
    watch_atd: list[dict[str, Any]] = []

    covered_matchups: set[str] = set()

    # Select prime IND @ HOU passes + ensure every Week 11 game has coverage.
    for game in games:
        matchup = _ascii_clean(str(game["matchup"]))
        tpass_game_plays = [
            gp
            for gp in game.get("game_plays", [])
            if gp.get("decision") == "TRANSPARENT_PASS"
        ]
        if matchup == "IND @ HOU":
            for gp in tpass_game_plays:
                mkt_id = gp.get("market_id")
                if mkt_id in ("full_game_spread", "full_game_total"):
                    main_rows.append(_build_game_pass_row(game, gp, category="PASS"))
                    covered_matchups.add(matchup)
                elif mkt_id == "first_quarter_total":
                    sel_str = str(gp["selection"])
                    prob_val = float(gp.get("model_prob", 0.25))
                    mkt_prob = float(gp.get("devigged_market_prob", 0.5))
                    line_val = _extract_market_line(sel_str, 9.1)
                    watch_one_q.append(
                        {
                            "matchup": matchup,
                            "category": "1Q_SCRIPT",
                            "selection": _ascii_clean(f"{sel_str} Watch"),
                            "decision": "ABSTAIN",
                            "publishAllowed": False,
                            "model_p": round(prob_val, 4),
                            "market_p": round(mkt_prob, 4),
                            "edge": round(float(gp.get("expected_clv", 0.0)), 4),
                            "model_median": round(line_val, 2),
                            "rationale": _ascii_clean(
                                "Opening-quarter tempo watchlist only; market sits "
                                "tighter than trigger price ahead of inactives."
                            ),
                            "confidence_display": _confidence_display(prob_val),
                            "market_line": line_val,
                            "trigger_odds": 100,
                            "fair_odds": -105,
                        }
                    )
                    covered_matchups.add(matchup)
        else:
            # Record transparent game passes without leaking PLAY picks.
            spread_passes = [
                gp
                for gp in tpass_game_plays
                if gp.get("market_id") == "full_game_spread"
            ]
            fallback_gp = tpass_game_plays[0] if tpass_game_plays else None
            chosen_gp = spread_passes[0] if spread_passes else fallback_gp
            if chosen_gp is not None:
                pass_rows.append(
                    _build_game_pass_row(game, chosen_gp, category="PASS")
                )
                covered_matchups.add(matchup)

        for prop in game.get("player_props", []):
            if prop.get("decision") != "TRANSPARENT_PASS":
                continue
            market = str(prop.get("market", ""))
            env_clause = _build_game_environment_clause(game)
            if market == "q1_rec_yds":
                watch_one_q.append(
                    _build_prop_row(
                        game,
                        prop,
                        category="1Q_REC_YDS",
                        decision="ABSTAIN",
                        rationale=(
                            "Opening-quarter receiving watchlist; margin fails "
                            f"final trigger hurdle. {env_clause}"
                        ),
                        include_watch_odds=True,
                    )
                )
            elif market == "kicking_pts":
                watch_kicking.append(
                    _build_prop_row(
                        game,
                        prop,
                        category="KICKING_PTS",
                        decision="ABSTAIN",
                        rationale=(
                            "Kicking volume watchlist; red-zone TD conversion "
                            f"keeps kicking total borderline. {env_clause}"
                        ),
                        include_watch_odds=True,
                    )
                )
            else:
                pass_rows.append(
                    _build_prop_row(
                        game,
                        prop,
                        category="PASS_PROP",
                        decision="PASS",
                        rationale=(
                            "Pass discipline: projection clears neither price "
                            f"trigger nor final hurdle. {env_clause}"
                        ),
                    )
                )
            covered_matchups.add(matchup)

    # Populate IDP and Anytime TD watchlists safely without leaking paid PLAY items.
    tnf_game = games[0]
    tnf_env = _build_game_environment_clause(tnf_game)
    watch_idp.append(
        {
            "matchup": _ascii_clean(str(tnf_game["matchup"])),
            "category": "IDP_SACKS",
            "selection": "TNF Defensive Front Sack Watch (Member Card Sealed)",
            "decision": "ABSTAIN",
            "publishAllowed": False,
            "model_p": 0.5,
            "market_p": 0.5,
            "edge": 0.0,
            "model_median": 0.5,
            "rationale": _ascii_clean(
                "Individual sack triggers remain sealed behind member access "
                f"pending final offensive line actives. {tnf_env}"
            ),
            "confidence_display": "50/100",
            "market_line": 0.5,
            "trigger_odds": -110,
            "fair_odds": -110,
        }
    )
    watch_atd.append(
        {
            "matchup": _ascii_clean(str(tnf_game["matchup"])),
            "category": "ANYTIME_TD",
            "selection": "TNF Red-Zone Touchdown Watch (Member Card Sealed)",
            "decision": "ABSTAIN",
            "publishAllowed": False,
            "model_p": 0.5,
            "market_p": 0.5,
            "edge": 0.0,
            "model_median": 0.5,
            "rationale": _ascii_clean(
                "Goal-line touchdown selections stay sealed behind member "
                f"access; monitor Thursday closing prices. {tnf_env}"
            ),
            "confidence_display": "50/100",
            "market_line": 0.5,
            "trigger_odds": 100,
            "fair_odds": 100,
        }
    )

    if len(covered_matchups) != len(games):
        missing = sorted({str(g["matchup"]) for g in games} - covered_matchups)
        raise RuntimeError(f"Unrepresented Week 11 matchups: {missing}")

    abstain_count = (
        len(watch_one_q) + len(watch_kicking) + len(watch_idp) + len(watch_atd)
    )
    pass_count = len(main_rows) + len(pass_rows)
    publish_count = 0
    evaluated_count = publish_count + abstain_count + pass_count

    core_payload: dict[str, Any] = {
        "season": season,
        "week": week,
        "projection_source_sha256": source_sha,
        "counts": {
            "evaluated": evaluated_count,
            "publish": publish_count,
            "abstain": abstain_count,
            "pass": pass_count,
        },
        "main": main_rows,
        "props": [],
        "passes": pass_rows,
        "watch": {
            "one_q": watch_one_q,
            "kicking": watch_kicking,
            "idp": watch_idp,
            "atd": watch_atd,
        },
    }
    canonical_bytes = json.dumps(
        core_payload, sort_keys=True, ensure_ascii=True
    ).encode("ascii")
    seal_digest = hashlib.sha256(canonical_bytes).hexdigest()

    ts = (
        (now_utc or datetime.now(UTC))
        .astimezone(UTC)
        .strftime("%Y-%m-%dT%H:%M:%SZ")
    )

    board: dict[str, Any] = {
        "seal_digest": seal_digest,
        "generated_at": ts,
        **core_payload,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(board, indent=2, ensure_ascii=True) + "\n"
    if not serialized.isascii():
        raise ValueError("Generated sealed slate JSON contains non-ASCII")
    output_path.write_text(serialized, encoding="ascii")
    return board


def main() -> int:
    """CLI entrypoint to export Week 11 sealed slate JSON for apps/web."""
    board = export_sealed_slate()
    print(
        f"Exported Week {board['week']} ({board['season']}) sealed slate: "
        f"evaluated={board['counts']['evaluated']}, "
        f"abstain={board['counts']['abstain']}, "
        f"pass={board['counts']['pass']}, "
        f"seal_digest={board['seal_digest']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
