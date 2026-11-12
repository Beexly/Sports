#!/usr/bin/env python3
"""Build a per-game JEV spine file.

    python scripts/ops/build_jev_spine.py --game-id cmt4fewrc00jbeat5nq9eauqo \
        --away WSH --home NYG --out data/engine/jev/wsh-nyg-2026-11-12.json

What this produces, and what it is not
--------------------------------------
A spine is JEV's classification of a set of situational buckets for one game:
the play call, the defensive shell, the target carrier, the snap outcome and
the pressure/disruption read, for each down-distance-field-position state.

It is an LLM classifier's opinion about a game that has not been played. It is
NOT measured data. The file says so in `label`, and it carries
`emissionWeight: 0` so it cannot move a probability. It exists so the reasoning
trace has something to show and so the loop can start scoring it.

The contentHash is SHA-256 over the canonical JSON of everything except the
hash itself, so a verifier can re-derive it.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path.home() / "hermes-jev-skills"))

try:
    from jevkit import client as jev
except Exception as exc:  # pragma: no cover - import guard
    print(f"FATAL: jevkit not importable: {exc}", file=sys.stderr)
    raise SystemExit(1)

SCHEMA = "gse.jev.spine.v1"
LABEL = "UNVALIDATED_CLASSIFIER_SHADOW"

# Down, distance, own-yard-line, score margin (home perspective), seconds left.
# Twelve states that cover the shape of a game without pretending to be all 150
# snaps. Each is a real football situation, not a random draw.
BUCKETS = [
    ("Q1_1st_10_own25_tied", 1, 10, 25, 0, 3600),
    ("Q1_3rd_7_own40_tied", 3, 7, 40, 0, 3000),
    ("Q2_1st_10_opp35_lead3", 1, 10, 65, 3, 1800),
    ("Q2_3rd_2_opp12_lead3", 3, 2, 88, 3, 900),
    ("Q2_2min_own20_trail3", 1, 10, 20, -3, 120),
    ("Q3_1st_10_own25_trail3", 1, 10, 25, -3, 3600),
    ("Q3_3rd_12_own18_trail10", 3, 12, 18, -10, 2400),
    ("Q4_1st_10_own35_trail10", 1, 10, 35, -10, 1200),
    ("Q4_3rd_4_opp45_trail3", 3, 4, 55, -3, 600),
    ("Q4_4th_1_opp38_trail3", 4, 1, 62, -3, 420),
    ("Q4_2min_own25_trail3", 1, 10, 25, -3, 120),
    ("Q4_1st_10_opp20_tied", 1, 10, 80, 0, 60),
]

QUESTIONS = {
    "off_play_call": {
        "type": "choice",
        "instructions": (
            "Given this down, distance, field position, score margin and time, "
            "what is the most likely offensive play call family?"
        ),
        "criteria": {
            "inside_zone_run": "a run between the tackles",
            "outside_zone_run": "a run to the edge",
            "play_action_pass": "a pass off play-action",
            "quick_game_pass": "a short, fast-timing pass",
            "dropback_pass": "a standard dropback pass",
            "screen": "a screen pass",
            "rpo": "a run-pass option",
            "desperation_pass": "a low-probability deep or sideline pass",
        },
    },
    "def_shell_call": {
        "type": "choice",
        "instructions": (
            "Given this down, distance, field position, score margin and time, "
            "what defensive shell is the defense most likely to call?"
        ),
        "criteria": {
            "single_high": "one deep safety",
            "two_high_quarters": "two deep safeties, quarters coverage",
            "two_high_split": "two deep safeties, split coverage",
            "cover_zero_pressure": "no deep safety, heavy pressure",
            "goal_line": "an extra lineman, run-first",
            "prevent": "deep, keep-everything-in-front",
        },
    },
    "target_carrier": {
        "type": "choice",
        "instructions": (
            "Given this situation, which offensive skill player is most likely to "
            "carry or catch the ball?"
        ),
        "criteria": {
            "rb1": "the primary running back",
            "rb2": "the change-of-pace back",
            "wr1": "the primary receiver",
            "wr2": "the second receiver",
            "te1": "the primary tight end",
            "qb_scramble": "the quarterback on a designed or improvised run",
        },
    },
    "snap_outcome": {
        "type": "choice",
        "instructions": (
            "Given this situation and the likely call, what is the most likely "
            "outcome of the snap?"
        ),
        "criteria": {
            "explosive_gain": "20+ yards",
            "moderate_gain": "5 to 19 yards",
            "short_gain": "1 to 4 yards",
            "no_gain_or_loss": "zero or negative yards",
            "incomplete": "an incomplete pass",
            "turnover": "an interception or a lost fumble",
            "sack": "the quarterback is sacked",
        },
    },
    "pressure_disruption": {
        "type": "choice",
        "instructions": (
            "How likely is the defense to disrupt this snap with pressure or "
            "penetration?"
        ),
        "criteria": {
            "none": "clean pocket, no disruption",
            "low": "pressure arrives late",
            "moderate": "pressure affects the throw",
            "high": "pressure forces an early decision",
            "immediate": "disruption before the route develops",
        },
    },
}


def _normalise(obj: object) -> object:
    """Make the canonical form agree with JavaScript's JSON.stringify.

    Python writes ``0.0`` for an integral float; JavaScript writes ``0``. The
    TypeScript verifier re-derives this hash with JSON.stringify, so an
    un-normalised 0.0 in a Jev answer would make every spine fail its own
    integrity check. Integral floats become ints; everything else is untouched.
    """
    if isinstance(obj, float) and obj.is_integer():
        return int(obj)
    if isinstance(obj, dict):
        return {k: _normalise(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_normalise(v) for v in obj]
    return obj


def canonical(obj: object) -> str:
    return json.dumps(_normalise(obj), sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build_state(away: str, home: str, bucket: tuple) -> dict:
    name, down, distance, yardline, margin, seconds = bucket
    return {
        "game": f"{away} at {home}",
        "situation": name,
        "down": down,
        "distance": distance,
        "yardline_own": yardline,
        "score_margin_home": margin,
        "seconds_remaining": seconds,
        "offense": away if margin <= 0 else home,
        "defense": home if margin <= 0 else away,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--game-id", required=True)
    ap.add_argument("--away", required=True)
    ap.add_argument("--home", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--timeout", type=float, default=30.0)
    args = ap.parse_args()

    api_key = os.environ.get("JEV_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        # The key normally lives in the Hermes env file, not this shell.
        try:
            from jevkit import keystore

            api_key = keystore.resolve()
        except Exception as exc:
            print(f"FATAL: no JEV key and keystore failed: {exc}", file=sys.stderr)
            return 1
    if not api_key:
        print("FATAL: no JEV key available", file=sys.stderr)
        return 1

    buckets_out = []
    total_latency = 0
    for bucket in BUCKETS:
        state = build_state(args.away, args.home, bucket)
        try:
            reply = jev.ask(
                state,
                QUESTIONS,
                timeout=args.timeout,
                retries=3,
                api_key=api_key,
                provider="openrouter",
            )
        except Exception as exc:
            print(f"FATAL: Jev refused bucket {bucket[0]}: {exc}", file=sys.stderr)
            return 1
        answers = reply.get("answers", {})
        missing = [q for q in QUESTIONS if q not in answers]
        if missing:
            print(f"FATAL: bucket {bucket[0]} missing answers: {missing}", file=sys.stderr)
            return 1
        total_latency += int(reply.get("latency_ms", 0))
        buckets_out.append(
            {
                "id": bucket[0],
                "down": bucket[1],
                "distance": bucket[2],
                "yardlineOwn": bucket[3],
                "scoreMarginHome": bucket[4],
                "secondsRemaining": bucket[5],
                "answers": answers,
            }
        )

    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    body = {
        "schema": SCHEMA,
        "gameId": args.game_id,
        "awayTeam": args.away,
        "homeTeam": args.home,
        "generatedAt": generated_at,
        "label": LABEL,
        "emissionWeight": 0,
        # Integer, not 0.0: the TypeScript verifier re-derives this hash with
        # JSON.stringify, which writes 0 for an integral number and 0.0 for a
        # float. Keeping every integral field an int is what makes the two
        # canonical forms agree.
        "diagnosticDelta": 0,
        "snapCount": len(buckets_out),
        "latencyMs": total_latency,
        "questions": list(QUESTIONS.keys()),
        "buckets": buckets_out,
        "note": (
            "JEV classification of situational buckets for a game that has not been "
            "played. Not measured data. Emission weight is zero by construction; this "
            "file may inform the reasoning trace and nothing else."
        ),
    }
    content_hash = sha256_hex(canonical(body))
    body["contentHash"] = content_hash

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(body, indent=2, sort_keys=True), encoding="utf-8")

    print(f"buckets {len(buckets_out)}  latency {total_latency}ms")
    print(f"contentHash {content_hash}")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
