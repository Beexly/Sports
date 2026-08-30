# Night Shift Ledger — July 2 (branch: claude/night-shift)

## The v2.0 docx, fully read and mined (all 232 lines)

Same blueprint family as the v3 paste. Line-by-line delta against what shipped
tonight:

- Its "3h dynamic AI-optimized freshness" → **built, better**:
  `ODDS_FRESHNESS_MODE=dynamic` goes to **2h near first pitch** (tighter than
  their 3h exactly where it matters most), driven by time-to-game math instead
  of an invented "AI volatility oracle", and clamped so it can only tighten,
  never loosen. Tested, monotone-proven.
- Its intraday scheduler YAML → ours shipped first, runs 6x/day, and has the
  no-op safety + real result validation theirs lacks.
- Its "alert on gate failure" → built (Telegram owner alerts, dark-by-default,
  fail-safe, 3 tests).
- Its "CLV integrity dashboard live for users" → already existed (/clv).
- Its "transparency as differentiator" → the /picks line-freshness badge +
  the /methodology freshness section, both built tonight.
- Its "legal crawler layer" → the FREE-DATA-CENSUS (8 categories, ~45 sources,
  legal verdicts) + 7 typed gated intakes in sports-data-candidates.ts.
- **Still refused, with the v2 text confirming why**: the Supabase/Coolify/
  MinIO migration sprint (untested prod-DB replatform), the $6.3M-$12.3M NPV /
  +47%-edge / P10-P90 tables (fabricated numbers with no data behind them),
  the "sharp money divergence detected in 3 public forums 47min ago" feature
  (v2 spells it out explicitly: inject scraped-forum vibes into pick
  explanations as if they were verified signals — the exact pattern the
  trust-gate exists to kill), and OpenHands auto-merging its own code by CLV
  grade.
- **One real nugget extracted**: volatility-triggered extra refreshes (fetch
  MORE when lines move fast). The honest version needs no new stack: compute
  line-movement velocity from our own successive odds fetches and fire a
  workflow_dispatch when it spikes. Queued below.

## What "self-evolving" honestly means here (the thesis, grounded)

The platform now contains real closed loops, each with a human gate exactly
where money or truth is at stake:

1. **Data loop**: fetch → per-game freshness gate (time-aware) → publish or
   refuse → the refusal itself is diagnosed in the error → failure pings the
   owner's phone → the fix feeds back into the gate.
2. **Model loop**: picks settle → calibration table updates → the held-out
   validator (ready to run, 167 eligible picks) grades whether the calibrator
   beats raw confidence → PASS unlocks the audited activation → new
   MODEL_VERSION, never retroactive.
3. **Source loop**: census → gated candidate intake (approval flags
   type-locked false) → live terms read → rights registry → adapter → shadow
   evidence → founder-gated scoring weight.

That is recursion with brakes. The blueprint's version is recursion without
brakes, on a betting product, with invented numbers. Ours compounds; theirs
explodes.

## Late additions (same branch, post-ledger)
6. `feat(news)`: LIVE RSS WIRE for The Beat — the first real crawler lane
   (owner-whitelisted feeds via NEWS_RSS_FEEDS, headlines only, conservative
   signal classifier, dark-by-default, 10 tests). The fictional sample now
   only renders when unconfigured, with the marker swapping to real source
   attribution when live.
7. `docs`: 60-DAY-FORECAST.md — good/bad/ugly per phase with mitigations +
   revenue impact, weekly Monday refresh ritual.
8. `feat(trust)`: PUBLIC /verify — cryptographic proof-of-record. Paste a
   receipt hash, the server re-hashes the stored record live; pre-kickoff
   receipts verify as sealed; tampering would show an unhideable red state.
9. `feat(trust)`: receipt hash on every pick card, deep-linked to /verify
   with auto-check on arrival. The skeptic's loop is one click.

## Shipped tonight on this branch (each validated + pushed)
1. `feat(ingestion)`: dynamic time-to-game freshness gate (8 tests)
2. `feat(ops)`: Telegram ingestion-failure alerts (3 tests)
3. `feat(trust)`: /methodology line-freshness section (trust-gate caught my
   own first draft using banned vocabulary; rewritten compliant)
4. `docs`: LEGAL-DATA-EDGE-MAP (10 cleared lanes ranked; NWS weather = play #1)
5. `feat(data)`: FREE-DATA-CENSUS + 7 gated candidate intakes
Plus, on sibling branches: freshness badge (+6 tests), 6x/day scheduler,
morning brief.

## Next build queue (value order)
1. Line-movement display for Pro picks (`canSeeLineMovement` entitlement
   exists and currently gates nothing visible — make Pro worth paying for)
2. NWS weather → MLB shadow evidence (cleared source, slot waiting)
3. MLB Stats API probables/lineups (census #2; terms read first)
4. Volatility-triggered ad-hoc refresh (the one good v2 nugget)
5. Calibration validator run + (on PASS) the audited activation sequence

## Branches waiting on merge (all validated)
- `claude/intraday-odds-scheduler` (+ CRON_SECRET repo secret to activate)
- `claude/freshness-badge`
- `claude/night-shift` (this one)
- `claude/gse-project-review-m6vrza` — RESCUED from a parallel session
  (stranded since Jun 28): NGS persistence wired into the player-stats cron
  (8 tests) + the edge-lab CLV/calibration eval harness with sealed-vault
  splits (13-check smoke). Test-merged clean against today's main; both
  suites green. Merge it with the other three.

## Handoff-claims audit (the conformal/Optuna message)
Verified against the repo: commit 2256e7e EXISTS (it is the NGS cron wiring
above, not "conformal in cron"). Conformal prediction code EXISTS in TS from
earlier sessions (rolling/Mondrian conformal-intervals.ts, finite-sample
quantile fix, calibration curves). Optuna / MAPIE / Gaussian-process code
does NOT exist anywhere in the repo — that part of the handoff was theory
discussion, not implementation; treat any "implemented" claim about it as
unbuilt. The real "integration script" is eval/edge-lab/run-clv-report.ts
(needs prod DATABASE_URL; same runner situation as
scripts/calibration-validate.ts).
