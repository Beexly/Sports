#!/usr/bin/env bash
# Week 10 shadow slate: one JEV spine and one sealed pregame run per game.
# Read-only against Neon. Nothing is published; every run seals publishable:false.
set -u

cd /c/Users/Garrett/Sports-engine-wire || exit 1
OUT=data/engine/shadow/week10-2026-11-12
JEV=data/engine/jev/week10-2026-11-12
mkdir -p "$OUT" "$JEV"

GAMES=(
  "WSH@NYG:cmt4fewrc00jbeat5nq9eauqo"
  "NE@DET:cmt4fewrh00jdeat5qnhy6h8f"
  "BUF@NYJ:cmt4fewrq00jheat511t2yutz"
  "MIA@IND:cmt4fews800jpeat5w2m7q0pb"
  "HOU@CLE:cmt4fewry00jleat5cdenxtrq"
  "CAR@NO:cmt4fewru00jjeat5lykxxmw3"
  "JAX@TEN:cmt4fewsc00jreat5k8fz5lhy"
  "KC@ATL:cmt4fewrl00jfeat5qiyx6jjm"
  "MIN@GB:cmt4fews300jneat5dc5jrbcr"
  "LAR@ARI:cmt4fewsg00jteat500horgfu"
  "SEA@LV:cmt4fewsl00jveat59oe7kp26"
  "SF@DAL:cmt4fewsp00jxeat5auo8dp90"
  "PIT@CIN:cmt4fewsu00jzeat5cid5m5sj"
  "LAC@BAL:cmt4fewsy00k1eat5o90fmf0g"
)

ok=0
fail=0
for entry in "${GAMES[@]}"; do
  matchup="${entry%%:*}"
  gameid="${entry##*:}"
  away="${matchup%%@*}"
  home="${matchup##*@}"
  slug="$(echo "$matchup" | tr 'A-Z@' 'a-z-')"

  echo "=== $matchup ($gameid) ==="

  if ! python scripts/ops/build_jev_spine.py \
      --game-id "$gameid" --away "$away" --home "$home" \
      --out "$JEV/$slug.json" 2>&1 | tail -3; then
    echo "  SPINE FAILED for $matchup"
    fail=$((fail + 1))
    continue
  fi

  if node node_modules/tsx/dist/cli.mjs scripts/ops/run_pregame.ts \
      --week 10 --game "$matchup" \
      --jev "$JEV/$slug.json" \
      --out "$OUT/$slug.json" 2>&1 | grep -E "STAGE B|STAGE F|verdict|sha256|wrote"; then
    ok=$((ok + 1))
  else
    echo "  RUN FAILED for $matchup"
    fail=$((fail + 1))
  fi
done

echo "=== done: $ok ok, $fail failed ==="
