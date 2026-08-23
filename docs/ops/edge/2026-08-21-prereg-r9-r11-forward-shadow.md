# Pre-registration — R-9 / R-11 Comparison Arm (Forward Shadow, MLB)

**Status:** ARMED (shadow only). **FIRE = NO.**

**Frozen as of:** 2026-08-20T19:57:00Z (commit `a6ff3d72`, start of T05).
This file exists and is frozen **before any forward observation is graded**.
Editing any rule below after a forward game is graded moves the track's hash to
void.

This is a **comparison arm**, not a pick input. It pairs the existing R-9 NB-RBPF
shadow engine with R-11 residual-info on the **same forward MLB window** as
T02 (team-only). It may NOT fire until the T02 team-only track has a recorded
survive-or-kill outcome.

---

## 1. Why this document exists

We do not have a certified betting edge. The killed H-F5 cycle (n=100, E=0.0204,
hash `ec15120bbfdb01997417f377c5c11b8ee547254cb8263f544dbe02966a607de8`)
burned its real-data sample on the 337 graded games. The only honest way to
keep trying is **unused hypotheses on unseen games**, one locked shot at a time.

T05 locks a **second forward-only candidate**: a shadow comparison arm using the
already-audited R-9 and R-11 engines (synthetic nulls already passed; we do NOT
rerun them). It is a hypothesis document, not a firing order.

## 2. Engines (read-only, do not edit)

| Layer | File | Role | Status |
|---|---|---|---|
| R-9 core | `packages/prediction-engine/src/research/nb-rbpf.ts` | Hierarchical NB Rao-Blackwellized particle filter shadow engine | Frozen at `cc939ea3` |
| R-11 proxy | `packages/prediction-engine/src/research/residual-info.ts` | Residual-information proxy over R-9, adaptive-λ comparison-only | Frozen at `4ed83c75` |
| Increment | `packages/prediction-engine/src/research/mve-eprocess.ts` | Side-adaptive increment `sideAdaptiveIncrement`, e-process capital path | Frozen H-F5 e-process |

**Do NOT edit any of the above.** This prereg binds them as-is.

### Constants (do not retune after seeing acceptance numbers)

From `nb-rbpf.ts`:
- `N_PARTICLES = 24`
- `LOG_PHI` / φ parameters as committed in `cc939ea3`
- House-filter conventions: seed required (no `Math.random`/`Date.now`),
  mulberry32 for reproducibility, log-space weights with ESS-triggered resampling.

From `residual-info.ts`:
- `LAMBDA_BASE = 0.15`, `MIN_LAMBDA = 0.02`, `MAX_LAMBDA = 0.3`
- `INFO_SCALE = 1.0`, `DD_COEF = 2.0`, `ALPHA_LO = 0.2`, `ALPHA_HI = 0.85`
- `NULL_SEEDS_MLB = 200`, `NULL_SEEDS_NFL = 80`
- `PLANTED_SEEDS = 40`, `ALPHA = 0.05`

### Null-test history (frozen, do not rerun)

- R-9 synthetic null: `NULL_SEEDS_MLB = 200` seeds, 0/200 capital > 20 (open-loop
  baseline 1.0000). Planted median max 2.1385. **PASSED** (C-44-style null gate).
- R-11 synthetic null: MLB-like + NFL-like (mean 21). **PASSED** at `4ed83c75`.
- These nulls are frozen. They will **NOT** be rerun unless engine code changes
  (which we will NOT do). R-9 math is immutable for this track.

## 3. Sample (frozen — the forward window only)

**Sample:** MLB totals games whose `commenceTime` is **strictly after** this file's
commit SHA time. This is the same forward window as T02 (commit `ddb94bd2`,
`2026-08-20T16:36:35-05:00`).

Explicit: **Not the H-F5 337.** Not Track E discovery. Not the 241-game archive.
This arm reads only games with `commenceTime` strictly after the SHA above.

**Sport filter:** `sports.key = 'baseball_mlb'` (opaque sport ID
`cmpg6yjjv03d91herlsqhono5`).

## 4. Entry (frozen — same bar as T02, comparison-only)

- **Entry window:** exactly 6–3h before scheduled first pitch. No other window.
- **Books:** ≥3 books quote the total at entry (Shin `m` from `entryForGame`,
  NOT vig-inclusive — same convention as team-only).
- **Quote age:** ≤15 minutes old from the earliest snapshot in the window.
- **priced:** `false`. This arm does NOT produce picks. It is a shadow
  comparison. No capital is allocated. No bet is placed.

## 5. FIRE gate (frozen — founder-gated)

- **FIRE = NO.** Locked until:
  1. The T02 team-only track has a recorded survive-or-kill outcome (SURVIVE or
     KILL at a checkpoint), and
  2. The founder sets `FIRE=yes` (written founder signature required).
- Writing this prereg does NOT arm FIRE. T02 has not completed its forward cycle.
- If this arm were ever to fire (weeks future, founder-gated), it would fire under
  the **same** frozen H-F5 e-process (`mve-eprocess.ts`, λ=0.3, miss
  `(1-q_bet)`, kill E ≤ 0.10 at checkpoints every 50 games, certify E ≥ 20).

## 6. Kill rule (frozen — identical to T02 / DO_NOT_RERUN)

- E ≤ 0.10 at any checkpoint → KILL. No amendment mid-cycle.
- E ≥ 20 at a scheduled checkpoint → SURVIVE (prospective certification
  draft, still founder-signed before any live bet).
- This comparison arm's kill/survive is informational only — it does NOT
  activate Path C or trigger any live betting without founder action.

## 7. NFL (blocked — not armed)

NFL MVE remains **FIRE=no** until CLOSE ≥ 50 graded 6–3h games (T03: CLOSE=0
across all sports). This prereg explicitly does NOT fire on NFL tonight.
If T03's CLOSE count later reaches ≥50, a separate NFL prereg is required.

## 8. Composite hash

Recorded by `scripts/edge-lab/freeze-team-only-hash.mjs` as part of the T02
manifest composite `c4dc8d511846669a5e7a0d17b4825d6982ea734f7ae656916b3cda08711905eb`.

This T05 prereg is **not** added to the T01/T02 freeze manifest (that manifest
is the team-only unused-shot hash and must stay immutable). T05 is bound by
reference to the frozen engine SHAs above (`cc939ea3`, `4ed83c75`) and the
T02 composite.

## 9. Ledger

`R-14` UNPUSHED on `overnight/2026-08-20-mlb-nfl`.

---

**Signing:** This is a Hermes autonomous prereg. It locks the protocol at
`2026-08-20T19:57:00Z`. No forward game is graded under this arm until the T02
team-only track records a survive-or-kill and the founder sets FIRE=yes. The
honest default is that we do not have an edge tonight; this arm is installed,
not fired.
