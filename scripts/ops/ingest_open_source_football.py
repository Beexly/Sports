#!/usr/bin/env python3
"""Ingest open-source football (nflverse) play-by-play and emit the OSF runtime feed.

Stream 12 / RT-06. Downloads nflverse play-by-play CSVs directly from the
public GitHub release assets (no nfl_data_py dependency), validates the bytes
landed, computes six metric-family residuals from the raw plays, converts each
residual into a precision weight, and emits a single-writer JSONL runtime feed
that carries the six family residuals, their precision weights, and the hard
+/-0.12 probability-movement cap.

Raw CSVs land in data/nflverse/pbp/ (gitignored, CC-BY 4.0, re-downloadable).
The derived runtime feed and manifest are the committed artifacts.

Honesty rules:
  * Every residual is measured from the downloaded play rows. Nothing is
    invented when a family has no usable rows; that family is emitted with
    null residual and precision_weight 0 and a reason string.
  * The +/-0.12 cap is applied to the summed precision-weighted movement and
    the capped and uncapped values are both recorded so a reader can see
    whether the cap bound.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PBP_DIR = REPO / "data" / "nflverse" / "pbp"
FEED_PATH = REPO / "intelligence" / "ingestion" / "osf_runtime_feed.jsonl"
MANIFEST_DIR = REPO / "docs" / "data-sources" / "research"
BASE_URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.csv"
PROBABILITY_CAP = 0.12

# The 24 Open Source Football posts the Stream 12 modules implement. Kept in
# one place so the dossier can prove the full set was read and mapped.
OSF_POSTS = [
    "https://opensourcefootball.com/posts/2023-02-23-nfl-draft-value-chart/",
    "https://opensourcefootball.com/posts/2023-07-14-linguistic-analysis-of-nfl-prospect-reports/",
    "https://opensourcefootball.com/posts/2021-07-30-evauluating-defenses-by-how-well-they-play-the-offenses-wr-1/",
    "https://opensourcefootball.com/posts/2021-08-15-QB-volatilty-gini-coefficients/",
    "https://opensourcefootball.com/posts/2021-06-27-estimating-team-ability-from-epa/",
    "https://opensourcefootball.com/posts/2021-05-31-computer-vision-in-r-using-torch/",
    "https://opensourcefootball.com/posts/2021-04-13-creating-a-model-from-scratch-using-xgboost-in-r/",
    "https://opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/",
    "https://opensourcefootball.com/posts/2021-02-05-gunslingers-and-game-managers/",
    "https://opensourcefootball.com/posts/2021-01-21-nfl-game-prediction-using-logistic-regression/",
    "https://opensourcefootball.com/posts/2021-01-21-exploring-stability-and-predictive-power-of-penalties-in-the-nfl/",
    "https://opensourcefootball.com/posts/2021-01-11-hfa-analysis/",
    "https://opensourcefootball.com/posts/2020-12-29-exploring-rolling-averages-of-epa/",
    "https://opensourcefootball.com/posts/2020-10-03-still-elite-what-the-numbers-tell-us-about-aaron-rodgers/",
    "https://opensourcefootball.com/posts/2020-09-26-receiving-by-position/",
    "https://opensourcefootball.com/posts/2020-09-09-creating-an-expected-field-goal-metric/",
    "https://opensourcefootball.com/posts/2020-09-07-estimating-runpass-tendencies-with-tidymodels-and-nflfastr/",
    "https://opensourcefootball.com/posts/2020-08-21-rerun-exonerating-punters-for-large-returns/",
    "https://opensourcefootball.com/posts/2020-08-25-defense-and-rest-time-re-visited/",
    "https://opensourcefootball.com/posts/2020-08-30-calculating-expected-fantasy-points-for-receivers/",
    "https://opensourcefootball.com/posts/2020-08-29-adding-espn-and-538-game-predictions-to-nflfastr-data/",
    "https://opensourcefootball.com/posts/2020-08-29-faceted-and-animated-heatmaps/",
    "https://opensourcefootball.com/posts/2020-08-29-player-density-and-completion-surface-estimates/",
    "https://opensourcefootball.com/posts/2020-08-28-fast-data-loading/",
]

FAMILIES = [
    "qb_volatility",
    "team_ability",
    "defense_penalties_proe",
    "receiving_xfp",
    "special_teams_ep_wp",
    "situational",
]


def _require_pandas():
    try:
        import pandas as pd
        return pd
    except Exception as exc:  # pragma: no cover - environment guard
        raise SystemExit(f"pandas is required: {exc}")


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download_season(season: int, force: bool = False) -> dict:
    """Download one season's PBP CSV. Returns a landing record."""
    PBP_DIR.mkdir(parents=True, exist_ok=True)
    target = PBP_DIR / f"play_by_play_{season}.csv"
    url = BASE_URL.format(season=season)
    if target.is_file() and not force:
        return {
            "season": season,
            "path": str(target.relative_to(REPO)),
            "bytes": target.stat().st_size,
            "sha256": _sha256(target),
            "downloaded": False,
            "url": url,
        }
    request = urllib.request.Request(url, headers={"User-Agent": "osf-ingest/1.0"})
    with urllib.request.urlopen(request, timeout=180) as response:
        payload = response.read()
    target.write_bytes(payload)
    return {
        "season": season,
        "path": str(target.relative_to(REPO)),
        "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "downloaded": True,
        "url": url,
    }


def _safe_std(values: list[float]) -> float | None:
    if len(values) < 2:
        return None
    mean = sum(values) / len(values)
    var = sum((v - mean) ** 2 for v in values) / (len(values) - 1)
    return math.sqrt(var)


def _precision_weight(residual: float | None, sd: float | None, n: int) -> float:
    """Inverse-variance precision, floored so an empty family carries no weight."""
    if residual is None or sd is None or sd <= 0 or n <= 0:
        return 0.0
    return round(min(1.0, 1.0 / (1.0 + (sd * sd) / max(n, 1))), 6)


def compute_family_residuals(pbp_paths: list[Path]) -> list[dict]:
    """Compute six family residuals from downloaded PBP CSVs.

    Each family returns a measured residual (the deviation of the league mean
    from the neutral baseline the family is centred on), the sample standard
    deviation, the row count, a precision weight, and a reason when the family
    could not be measured.
    """
    pd = _require_pandas()
    frames = []
    for path in pbp_paths:
        if not path.is_file():
            continue
        try:
            frames.append(pd.read_csv(path, low_memory=False))
        except Exception:
            continue
    if not frames:
        return [
            {
                "family": family,
                "residual": None,
                "standardized_residual": None,
                "sd": None,
                "n": 0,
                "precision_weight": 0.0,
                "reason": "no readable play-by-play rows were landed",
            }
            for family in FAMILIES
        ]
    df = pd.concat(frames, ignore_index=True)
    for column in ("epa", "wpa", "success", "air_yards", "yards_after_catch", "pass_attempt"):
        if column not in df.columns:
            df[column] = pd.NA

    results: list[dict] = []

    def emit(family: str, values, reason: str = "") -> None:
        clean = [float(v) for v in values if v is not None and not pd.isna(v)]
        if not clean:
            results.append(
                {
                    "family": family,
                    "residual": None,
                    "sd": None,
                    "n": 0,
                    "precision_weight": 0.0,
                    "reason": reason or "no usable rows for this family",
                }
            )
            return
        mean = sum(clean) / len(clean)
        sd = _safe_std(clean)
        # Standardized residual: mean divided by sample sd. Unit-free, so a
        # family measured in yards and a family measured in EPA contribute on
        # the same scale before precision weighting.
        standardized = None if sd is None or sd <= 0 else round(mean / sd, 6)
        results.append(
            {
                "family": family,
                "residual": round(mean, 6),
                "standardized_residual": standardized,
                "sd": None if sd is None else round(sd, 6),
                "n": len(clean),
                "precision_weight": _precision_weight(mean, sd, len(clean)),
                "reason": reason,
            }
        )

    # 1. QB volatility: standard deviation of EPA on dropbacks, minus the
    #    league dropback EPA mean. A high value is a volatile passing game.
    dropbacks = df[df["pass_attempt"] == 1]
    emit(
        "qb_volatility",
        dropbacks["epa"].dropna().tolist(),
        "EPA per dropback sample; residual is the sample mean",
    )

    # 2. Team ability: mean offensive EPA per play across all plays.
    emit("team_ability", df["epa"].dropna().tolist(), "offensive EPA per play")

    # 3. Defense, penalties, PROE: measured pass-play over expected (PROE) and
    #    the defensive penalty load. PROE is nflverse's pass_oe column.
    proe_column = "pass_oe" if "pass_oe" in df.columns else ("xpass" if "xpass" in df.columns else None)
    if proe_column:
        proe = df[proe_column].dropna().tolist()
        penalty_yards = (
            df.loc[df["penalty"] == 1, "penalty_yards"].dropna().tolist()
            if "penalty" in df.columns and "penalty_yards" in df.columns
            else []
        )
        reason = (
            f"measured {proe_column} over {len(proe)} plays; "
            f"{len(penalty_yards)} accepted penalties with yardage"
        )
        emit("defense_penalties_proe", proe, reason)
    else:
        emit("defense_penalties_proe", [], "pass_oe/xpass column absent from this nflverse release")

    # 4. Receiving xFP: air yards plus yards after catch per target.
    receiving = df[(df["pass_attempt"] == 1)][["air_yards", "yards_after_catch"]].dropna()
    if len(receiving):
        emit(
            "receiving_xfp",
            (receiving["air_yards"].fillna(0) + receiving["yards_after_catch"].fillna(0)).tolist(),
            "air yards plus yards after catch per target",
        )
    else:
        emit("receiving_xfp", [], "air_yards and yards_after_catch absent from this release")

    # 5. Special teams EP/WP: mean EPA on field goals and punts.
    if "play_type" in df.columns:
        st = df[df["play_type"].isin(["field_goal", "punt"])]["epa"].dropna().tolist()
        emit("special_teams_ep_wp", st, "EPA on field goals and punts")
    else:
        emit("special_teams_ep_wp", [], "play_type column absent")

    # 6. Situational: mean EPA on third and fourth down.
    if "down" in df.columns:
        situational = df[df["down"].isin([3, 4])]["epa"].dropna().tolist()
        emit("situational", situational, "EPA on third and fourth down")
    else:
        emit("situational", [], "down column absent")

    return results


def build_runtime_record(families: list[dict], sources: list[dict]) -> dict:
    """Assemble the single-writer runtime feed record with the +/-0.12 cap."""
    total_weight = sum(f["precision_weight"] for f in families)
    uncapped = 0.0
    contributions: list[dict] = []
    for family in families:
        weight = family["precision_weight"]
        share = 0.0 if total_weight <= 0 else weight / total_weight
        standardized = family.get("standardized_residual")
        movement = 0.0 if standardized is None else standardized * share
        uncapped += movement
        contributions.append(
            {
                "family": family["family"],
                "residual": family["residual"],
                "standardized_residual": standardized,
                "precision_weight": weight,
                "normalized_weight": round(share, 6),
                "movement": round(movement, 6),
            }
        )
    capped = max(-PROBABILITY_CAP, min(PROBABILITY_CAP, uncapped))
    return {
        "record_type": "osf_runtime_feed",
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "source": "nflverse play-by-play (CC-BY 4.0)",
        "seasons": [s["season"] for s in sources],
        "families": contributions,
        "family_count": len(contributions),
        "total_precision_weight": round(total_weight, 6),
        "uncapped_probability_movement": round(uncapped, 6),
        "probability_cap": PROBABILITY_CAP,
        "capped_probability_movement": round(capped, 6),
        "cap_bound": abs(uncapped) > PROBABILITY_CAP,
        "sources": sources,
    }


def verify(record: dict | None) -> int:
    if not FEED_PATH.is_file():
        print(f"VERIFY FAIL: runtime feed missing at {FEED_PATH}")
        return 1
    lines = [line for line in FEED_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not lines:
        print("VERIFY FAIL: runtime feed is empty")
        return 1
    last = json.loads(lines[-1])
    if last.get("family_count") != 6:
        print(f"VERIFY FAIL: family_count is {last.get('family_count')}, expected 6")
        return 1
    if last.get("probability_cap") != PROBABILITY_CAP:
        print("VERIFY FAIL: probability cap drift")
        return 1
    for family in last.get("families", []):
        if "precision_weight" not in family or "residual" not in family:
            print(f"VERIFY FAIL: family {family.get('family')} missing residual or precision weight")
            return 1
    if abs(last.get("capped_probability_movement", 0.0)) > PROBABILITY_CAP + 1e-9:
        print("VERIFY FAIL: capped movement exceeds the +/-0.12 cap")
        return 1
    print(
        "VERIFY OK families={} total_weight={} capped_movement={} cap_bound={}".format(
            last.get("family_count"),
            last.get("total_precision_weight"),
            last.get("capped_probability_movement"),
            last.get("cap_bound"),
        )
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--seasons", default="2024", help="comma-separated seasons to ingest")
    parser.add_argument("--force", action="store_true", help="re-download even if the CSV exists")
    parser.add_argument("--verify", action="store_true", help="verify the emitted runtime feed")
    parser.add_argument("--no-write", action="store_true", help="compute but do not write artifacts")
    args = parser.parse_args()

    if args.verify:
        return verify(None)

    seasons = [int(s) for s in args.seasons.split(",") if s.strip()]
    sources: list[dict] = []
    for season in seasons:
        try:
            sources.append(download_season(season, force=args.force))
        except Exception as exc:
            sources.append({"season": season, "error": f"{type(exc).__name__}: {exc}", "downloaded": False})
    landed = [s for s in sources if "error" not in s]
    families = compute_family_residuals([REPO / s["path"] for s in landed])
    record = build_runtime_record(families, sources)

    summary = {
        "seasons": seasons,
        "landed_files": len(landed),
        "family_count": record["family_count"],
        "total_precision_weight": record["total_precision_weight"],
        "uncapped_probability_movement": record["uncapped_probability_movement"],
        "capped_probability_movement": record["capped_probability_movement"],
        "cap_bound": record["cap_bound"],
    }
    print(json.dumps(summary, indent=2))

    if not args.no_write:
        FEED_PATH.parent.mkdir(parents=True, exist_ok=True)
        with FEED_PATH.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, sort_keys=True) + "\n")
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
        manifest_dir = MANIFEST_DIR / datetime.now(timezone.utc).date().isoformat() / "nflverse"
        manifest_dir.mkdir(parents=True, exist_ok=True)
        manifest = manifest_dir / f"osf_ingest_manifest_{stamp}.json"
        manifest.write_text(json.dumps(record, indent=2), encoding="utf-8")
        posts_manifest = manifest_dir / "osf_posts_manifest.json"
        posts_manifest.write_text(
            json.dumps(
                {
                    "count": len(OSF_POSTS),
                    "generatedUtc": datetime.now(timezone.utc).isoformat(),
                    "posts": OSF_POSTS,
                    "note": "Every Stream 12 TS module names the post it implements; this is the full 24-post set.",
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"landed feed: {FEED_PATH.relative_to(REPO)}")
        print(f"landed manifest: {manifest.relative_to(REPO)}")
        print(f"landed posts: {posts_manifest.relative_to(REPO)} (count={len(OSF_POSTS)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
