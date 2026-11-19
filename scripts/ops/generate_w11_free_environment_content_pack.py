from __future__ import annotations

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
    REPO_ROOT
    / "data"
    / "content-os"
    / "drafts"
    / "week11_free_environment_threads_2026_11_18.json"
)

_BANNED_TERMS_RE = re.compile(
    r"\b(?:JEV|Sinkhorn|Cholesky|tau_hat|lock|locked|locks|guaranteed)\b"
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
    ascii_text = cleaned.encode("ascii", "ignore").decode("ascii").strip()
    if _BANNED_TERMS_RE.search(ascii_text):
        raise ValueError(f"Banned term found in draft post: {ascii_text}")
    if len(ascii_text) > 280:
        raise ValueError(
            f"Draft post exceeds 280 chars ({len(ascii_text)}): {ascii_text}"
        )
    return ascii_text


def _build_thread_for_game(
    game: dict[str, Any],
    *,
    paid_selections: set[str],
) -> dict[str, Any]:
    matchup = _ascii_clean(str(game["matchup"]))
    display_matchup = _ascii_clean(str(game.get("display_matchup", matchup)))
    venue = _ascii_clean(str(game.get("venue", "Stadium")))
    env = game.get("stage2_reasoned_environment", {})
    indoor_text = "indoors on fast turf" if env.get("is_indoor", False) else "outdoors"
    pace = round(float(env.get("pace_sec_per_play", 27.5)), 1)
    away = env.get("away", {})
    home = env.get("home", {})

    away_plays = round(float(away.get("plays_mean", 61.0)), 1)
    home_plays = round(float(home.get("plays_mean", 62.0)), 1)
    away_pass = int(round(float(away.get("pass_rate", 0.55)) * 100))
    home_pass = int(round(float(home.get("pass_rate", 0.55)) * 100))
    away_disrupt = int(round(float(away.get("ol_disruption", 0.22)) * 100))
    home_disrupt = int(round(float(home.get("ol_disruption", 0.22)) * 100))
    away_rz = int(round(float(away.get("rz_td_rate", 0.55)) * 100))
    home_rz = int(round(float(home.get("rz_td_rate", 0.55)) * 100))

    qb_away = _ascii_clean(str(game.get("qb_away_name", "Away QB")))
    qb_home = _ascii_clean(str(game.get("qb_home_name", "Home QB")))
    market_line = _ascii_clean(str(game.get("market_odds_details", "PK")))
    market_total = round(float(game.get("market_total", 43.5)), 1)

    tpass_count = sum(
        1
        for row in (
            list(game.get("game_plays", [])) + list(game.get("player_props", []))
        )
        if row.get("decision") == "TRANSPARENT_PASS"
    )

    posts = [
        _ascii_clean(
            f"Week 11 Film & Environment Note: {display_matchup} ({venue}, "
            f"{indoor_text}). Market sits at {market_line} with O/U "
            f"{market_total}. Matchup pairs {qb_away} against {qb_home} "
            f"at {pace:.1f}s neutral pace. Free environment read -- zero free picks."
        ),
        _ascii_clean(
            f"{matchup} Tempo & Play-Calling: Away project {away_plays:.1f} snaps "
            f"({away_pass}/100 pass lean), Home project {home_plays:.1f} snaps "
            f"({home_pass}/100 pass lean). Trench protection stress rates track at "
            f"{away_disrupt}/100 away vs {home_disrupt}/100 home."
        ),
        _ascii_clean(
            f"{matchup} Red-Zone & Market Discipline: Red-zone TD finishes project "
            f"near {away_rz}/100 away and {home_rz}/100 home. We logged "
            f"{tpass_count} transparent market passes here; member props stay "
            "sealed at galaxysportsedge.com/packages."
        ),
    ]

    for post in posts:
        for sel in paid_selections:
            if sel in post:
                raise ValueError(
                    f"Paid selection '{sel}' leaked into free thread for {matchup}"
                )

    return {
        "matchup": matchup,
        "display_matchup": display_matchup,
        "kickoff_utc": _ascii_clean(str(game.get("kickoff_utc", ""))),
        "lane": "free_environment",
        "draft_only": True,
        "posts": posts,
    }


def generate_free_environment_content_pack(
    source_path: Path = DEFAULT_SOURCE_PATH,
    output_path: Path = DEFAULT_OUTPUT_PATH,
    now_utc: datetime | None = None,
) -> dict[str, Any]:
    """Generate draft-only Week 11 free-lane environment threads with zero paid picks."""
    doc = json.loads(source_path.read_text(encoding="utf-8"))
    games: list[dict[str, Any]] = list(doc["games"])

    paid_selections = {
        str(row["selection"]).strip()
        for game in games
        for row in (
            list(game.get("game_plays", [])) + list(game.get("player_props", []))
        )
        if row.get("decision") == "PLAY" and row.get("publish_allowed") is True
    }

    # Draft Week 11 free environment threads led by TNF IND @ HOU.
    priority_matchups = [
        "IND @ HOU",
        "TEN @ DAL",
        "TB @ DET",
        "PIT @ PHI",
        "MIN @ SF",
        "CIN @ WSH",
    ]
    games_by_matchup = {str(g["matchup"]): g for g in games}
    selected_games = [
        games_by_matchup[m] for m in priority_matchups if m in games_by_matchup
    ]
    for g in games:
        if g not in selected_games:
            selected_games.append(g)

    threads = [
        _build_thread_for_game(game, paid_selections=paid_selections)
        for game in selected_games[:6]
    ]

    ts = (
        (now_utc or datetime.now(UTC))
        .astimezone(UTC)
        .strftime("%Y-%m-%dT%H:%M:%SZ")
    )
    pack: dict[str, Any] = {
        "schema": "gse_w11_free_environment_content_pack_v1",
        "generated_at": ts,
        "season": int(doc["season"]),
        "week": int(doc["week"]),
        "projection_source_sha256": _ascii_clean(str(doc["projection_source_sha256"])),
        "draft_only": True,
        "auto_publish_allowed": False,
        "free_lane_only": True,
        "paid_picks_included": False,
        "record_url": "https://www.galaxysportsedge.com/record",
        "packages_url": "https://www.galaxysportsedge.com/packages",
        "threads": threads,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(pack, indent=2, ensure_ascii=True) + "\n"
    if not serialized.isascii():
        raise ValueError("Content pack JSON must be pure 7-bit ASCII")
    output_path.write_text(serialized, encoding="ascii")
    return pack


def main() -> int:
    """CLI entrypoint to write the Week 11 free-environment draft content pack."""
    pack = generate_free_environment_content_pack()
    print(
        f"Generated Week {pack['week']} free environment draft pack: "
        f"threads={len(pack['threads'])}, draft_only={pack['draft_only']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
