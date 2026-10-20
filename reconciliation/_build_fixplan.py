#!/usr/bin/env python3
"""Regenerate reconciliation/fix_plan.md with the CORRECTED verdicts.

Kept as a generator so the numbers in the prose cannot drift from
dark_sources_census_corrected.json.
"""
import json, os

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(WT, "reconciliation")
c = json.load(open(os.path.join(R, "dark_sources_census_corrected.json"), encoding="utf8"))

adapter = [r for r in c["evaluators"] if r["verdict"] == "DATA-EXISTS-NEEDS-ADAPTER"]
newprod = [r for r in c["evaluators"] if r["verdict"] == "NEEDS-A-NEW-PRODUCER"]


def rows(lst):
    out = []
    for r in lst:
        miss = r["what_is_missing"].replace("|", "/")
        out.append("| `" + r["signal_id"] + "` | " + r["status"] + " | " + miss + " |")
    return "\n".join(out)


BODY = r'''# Dark Sources — Corrected Census and Fix Plan

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Machine-readable:** `reconciliation/dark_sources_census_corrected.json`
**Generator:** `reconciliation/_census_dark_corrected.py`
**Supersedes:** the verdict field in `dark_sources_census.json` (its per-evaluator
env keys and declared dependencies are still valid; the verdicts were wrong)

---

## 0. The correction — my first pass was too generous

My first census judged each DARK evaluator by whether its **declared
`dataDependencies` named a table that exists**. That was the wrong test.

The declared names are **source-product** names — `nfl_pbp`, `nfl_charting`,
`nfl_coaching_history` — not table names. And the play-level tables those
products would populate **do not exist** in
`packages/db/prisma/schema.prisma`: there is no `model Play`, no `model
Drive`, no penalty column, no `Player.birthDate`, and no venue lat/lon.

**Measured on `schema.prisma` (2026-10-20):**

| Model | Present |
|---|---|
| `Player` (`:2767`) · `PlayerGameStat` (`:2787`) · `TeamGameEfficiency` (`:2951`) · `TeamWeekStat` (`:3132`) · `SnapCount` (`:2824`) · `DepthChartEntry` (`:2883`) · `Injury` (`:2853`) · `NextGenStat` (`:3012`) · `TeamGameLog` · `Game` · `HistoricalGame` | yes |
| `Play` · `Drive` · penalty rows · `Player.birthDate` · venue lat/lon · coach table · coordinator table · draft-capital column | **no** |

**So the corrected counts are:**

| | |
|---|---|
| DARK evaluators | **21** |
| SHADOW_ONLY evaluators in the same file | **2** |
| **total** | **23** |
| `DATA-EXISTS-NEEDS-ADAPTER` | **5** |
| `NEEDS-A-NEW-PRODUCER` | **18** |

**My earlier claim — "20 of 21 declare dataDependencies naming a table with
rows, so they need an adapter, not a feed" — was wrong.** The correct number
is **5**. The other 18 need a producer that does not exist, at a granularity
the schema has never had.

The 5 that only need an adapter:

| signal id | status | what is missing |
|---|---|---|
__ADAPTER_ROWS__

The 18 that need a real producer:

| signal id | status | what is missing |
|---|---|---|
__NEWPROD_ROWS__

**A 32-row static venue table is the single highest-leverage write in this
repo.** It would unblock `nfl_high_altitude_fatigue` (elevation),
`nfl_linear_wind_pass_impact` (dome flag), and `nfl_turf_surface_fatigue`
(surface enum) — three signals, no feed, no key, no licence. Storage slot
already exists: `model Entity` has `entity_type: EntityType` (already
enumerating `venue`, `coordinator`, `coach` — `schema.prisma:3875-3878`) plus
`attributes Json?` (`:3917`), so **no migration is needed** — but the graph
is *"additive, not yet read by any surface"* (`:3870`), so a reader is the
actual work.

---

## 1. The structural cause, unchanged and still correct

The evaluators read their inputs from `ctx.env`. The file says it at
`packages/ingestion-pipeline/src/signal-registry-extensions.ts:39`:

```ts
const DARK_NO_PIT =
  "DARK: no point-in-time producer on the mint path. Env keys are not a feed.";
```

"Env keys are not a feed" is exactly right — and it is the whole story for
the 5 adapter candidates.

---

## 2. The three gates a DARK signal must clear

**This decides whether wiring the 5 is worth doing.** A producer alone does
not activate a signal. Three gates exist, and all 23 fail all three:

1. **Producer gate.** `ctx.env` is either the whole process environment
   (`signal-registry-runner.ts:40` — `env: (input.env ?? process.env)`) or
   `envWithStoredSignals(...)` at `generate-signal-slate.ts:604`, which merges
   exactly **four** stored keys into five env names
   (`stored-signal-env-bridge.ts:24-37`: `wind_mph->WIND_MPH`,
   `wind_gust_mph->WIND_GUST_MPH`, `temp_f->TEMP_F`,
   `precip_pct->PRECIP_PCT|PRECIP_IN`) and reads them only from
   `db.gameSignal` where `sourceName: "nws"` (`:68-76`).
   **No non-weather key can be read from the DB by any code path.**
2. **Status gate.** Both consumers skip anything not ACTIVE:
   `signal-registry-runner.ts:48`, `continuous-signal-tilt.ts:79`.
3. **Sign gate.** A CONTINUOUS_VALUE signal is refused unless its result
   carries `metadata.homeSign` of exactly `1`/`-1`
   (`continuous-signal-tilt.ts:43-47`, refusal at `:100-104`).
   **Only one of the 23 declares it** — `signal-registry-extensions.ts:210`
   (age-conditioned rest, which also needs a producer for other reasons).
   And `grep -c homeSign signal-registry-definitions.ts` = **0**, so no
   ACTIVE registry signal supplies a sign either.

**Consequence: `applyContinuousSignalTilt` — the ONLY seam where a signal
moves `trueProb` — yields `votes.length === 0` today** and returns
`applied: false` (`continuous-signal-tilt.ts:123-131`). The path is wired and
structurally inert.

**DARK is also test-locked.** `continuous-signal-tilt.test.ts:140-153`
asserts every extended signal is DARK/SHADOW_ONLY with a `blockedReason`
containing `point-in-time`/`SHADOW`. **Wiring any one requires editing that
test in the same commit.**

---

## 3. Two signals that are worse than DARK

**`nfl_wr1_out_redistribution` is ACTIVE, weight 0.14, and can never fire.**

`packages/ingestion-pipeline/src/signal-registry-definitions.ts:880-888`:
```ts
activationStatus: "ACTIVE",
...
evaluate: async (ctx) => {
  return null;        // <-- always
},
```

Because it is ACTIVE it has no `blockedReason`, so
`buildMissingContextEvidenceFromRegistry` (`:923-926`, which filters
`!== "ACTIVE"`) **never reports it missing**. An ACTIVE signal that silently
returns null is worse than a DARK one: DARK is honest, ACTIVE-and-null is a
claim the system cannot support.

**`nfl_referee_crew_tendencies` is the same shape**
(`definitions.ts:815-818`).

**And the officials surface — the brief's "marked dark for honesty failures"
— is not a DARK signal at all.** It is an ACTIVE registration that cannot
produce a value. That is a worse honesty failure than being dark, and it
should be fixed by either producing the value or de-registering it.

---

## 4. The duplicate

**`nfl_wr1_vacated_target_efficiency`** (extensions `:583`) carries a
hand-rolled local formula at `:606-619`:
`reallocation = min(1, wr2 + vacated*0.45)`, `edge = (reallocation-wr2)*0.6`,
under a comment claiming *"Same math"* (`:614`) as a kernel it never imports.
Meanwhile `nflWr1OutRedistributionSignal` (`definitions.ts:871`) is the
upstream kernel — and it `return null`s (`:888`).

**The comment's claim cannot hold.** Delete the extension; keep one surface.

---

## 5. Deletion candidates — 4, not 2

| # | Signal | Why delete rather than wire |
|---|---|---|
| 1 | `nfl_wr1_vacated_target_efficiency` | duplicate of `nfl_wr1_out_redistribution`, with a false "Same math" comment (`:614`) |
| 2 | `nfl_turf_surface_fatigue` | `TURF_SOFTNESS_INDEX` has **one occurrence in the whole repo** — the read. Invented. Re-derive from a surface enum instead. |
| 3 | `nfl_redzone_opportunity_conversion` + `nfl_negative_binomial_redzone_td` | both need a drive table the schema has never had; #17 additionally needs a fitted dispersion stored nowhere |
| 4 | the 225 trust-intake rows | one day, one source, one label contradiction, `quote_text` null and `extraction_confidence` 0.0 on every row, `schema_version 1.0.0` while the pipeline declares `1.1.0` (`extractors/pipeline.py`), `extractor_name: null` — **the store's contents were not written by the code in this repo** |

---

## 6. The trust-signals intake is a relabelled parquet, not a news wire

Measured, all 225 rows (`intelligence/trust-signals/intake/signals.jsonl`):

| field | value | count |
|---|---|---|
| `shadow` | `true` | 225/225 |
| `signal_origin` | `news_wire` | 225/225 |
| `source_handle` | `@mysportsupdate` | 225/225 |
| `source_url` | `.../nflverse-data/releases/download/injuries/...` | 225/225 |
| `signal_type` | `injury` | 225/225 |
| `verification` | `CORPUS` | 225/225 |
| `calibration_state` | `UNCALIBRATED` | 225/225 |
| `extraction_confidence` | `0.0` | 225/225 |
| `quote_text` | `null` | 225/225 |
| `schema_version` | `1.0.0` | 225/225 |
| `observed_at` | `2026-10-14` | 225/225 |

A representative row:
```
"signal_origin": "news_wire", "source_handle": "@mysportsupdate",
"source_url": ".../injuries_2026.parquet",
"text": "[Week 4 nflverse] Damien Lewis (G, CAR): report_status=Out, ..."
```

**This is the nflverse injuries parquet relabelled as a news-wire intake.**
The `source_url` is a GitHub release asset, `quote_text` is null, and
`extraction_confidence` is 0.0. Meanwhile
`intelligence/trust-signals/extractors/pipeline.py` declares
`SCHEMA_VERSION = "1.1.0"`, and the store's rows say `1.0.0` with
`extractor_name: null` — **the contents were not written by the code in this
repo**.

The producer code exists (`extractors/pipeline.py:181`
`IntakeStore.save_signal`) but its only callers are tests
(`intelligence/tests/test_trust_signals_c06.py:439, :810`). No cron, no
script, no schedule.

**The X path is a documented stub.**
`intelligence/trust-signals/fetch.py:49-61` is `MirrorFetcher`, documented
as a `STUB: twstalker -> xstalk -> instalker fallback chain`, with
`MIRRORS = ("twstalker","xstalk","instalker")` and **no HTTP call**.
`intelligence/trust-signals/README.md:25`: *"No working X client ships (X is
blocked from this environment). The `fetch.SourceFetcher` seam is the
deliverable."*

The consumer side is real: `intelligence/integration/api.py:343`
(`providers.trust.get_trust_signals`), `specialists.py:170`, and
`run_game.py:48-51` (`HonestTrustSignalProvider`). It would serve these rows
if asked.

---

## 7. What "coverage" means for this surface

| Metric | Today | After Tier A+B | Measured by |
|---|---|---|---|
| DARK + SHADOW_ONLY evaluators | **23** | 19 (4 deleted) | `dark_sources_census_corrected.json` |
| with a live producer | **0** | **5** (adapter only) | same -> `verdict` |
| that can actually vote | **0** | **0** until `homeSign` + the env bridge are fixed | `continuous-signal-tilt.ts:100-104` |
| appearing in a reasoning trace | **0** | at least 1 | join `signals.key` against trace `observed_values` |
| wire signal rows | **44** | 44 + X volume | `select count(*) from signals where key like 'wire.%'` |
| classifier precision | **unmeasured** | measured | labelled sample |

**The honest ceiling, stated plainly.** Wiring the 5 adapter candidates does
**not** make them vote. The sign gate and the env bridge both block them.
Three things are needed in order:

1. **A sign.** `metadata.homeSign` on every CONTINUOUS_VALUE signal. Without
   it, `continuous-signal-tilt.ts:100-104` refuses every one.
2. **An env bridge that can carry non-weather keys.**
   `stored-signal-env-bridge.ts:24-37` currently maps exactly four weather
   keys. A general bridge is the work.
3. **The adapter** — resolve the declared fields from the tables that exist.

**And then the kill line** (`signal-registry-extensions.ts:41-46`):
`maxBrierScoreVsMarket 0.250`, `minSettledSample 100`,
`maxDivergenceZScore 3.0`, `maxAgeMinutes 120`. A newly wired evaluator
starts at weight 0 and must earn its way up through the settlement loop —
which is `staged_improvements/04-settlement-to-belief-loop.md`, and which
does not yet exist on `main`.

**So the correct sequence is: sign gate -> env bridge -> adapter -> measure ->
settlement loop -> promote.** Wiring first produces 5 more signals that never
earn weight — the same failure as the corpus evaluator.

---

## 8. The ACTIVE-but-null signals, which are the honesty failure

The brief says officials, weather, and narrative contracts "were marked dark
for honesty failures." Measured:

- **Officials** — `nfl_referee_crew_tendencies` is registered **ACTIVE** with
  an `evaluate` that cannot produce a value (`definitions.ts:815-818`). Not
  dark. **Worse than dark**, and the fix is to de-register it or produce the
  value.
- **Weather** — `nfl_linear_wind_pass_impact` and
  `nfl_temperature_precipitation_decay` are correctly **SHADOW_ONLY**, and
  the family is measured `|slope| < se` (`engine-weights.ts:14`) — the
  honest state. **The honesty failure is fixed here.** They stay shadow.
- **Narrative contract** — the family is advertised LIVE on an application
  input broken by 10^6.
  `data/reasoning/narrative-contract-week3-2026-09-27.json` emits:
  ```json
  "home_roster_mean_apy_millions": 5.311087280701753e-06,
  "away_roster_mean_apy_millions": 5.441898588235294e-06,
  "x_apy_gap_millions": -1.308113075335404e-07
  ```
  $5.31 mean APY per player; a home-minus-away gap of -$0.13. A 0.05/$M
  slope applied to a 1e-7 gap contributes nothing, so `signed: 0.0416` is
  effectively the intercept — **the same value for every game**.
  `engine-weights.ts:24` still says `role: "dark"`, which is the more
  honest of the two registry rows. **HONESTY-FAILURE-STILL-PRESENT.**

---

## 9. Doc drift worth a one-line fix

`signal-registry-extensions.ts:2` says *"the 22 signal evaluators"*.
`EXTENDED_SIGNALS` holds **23** (`:900-923`).
'''

out = (BODY.replace("__ADAPTER_ROWS__", rows(adapter))
           .replace("__NEWPROD_ROWS__", rows(newprod)))
p = os.path.join(R, "fix_plan.md")
open(p, "w", encoding="utf8").write(out)
print("wrote", p, os.path.getsize(p))
print("adapter rows:", len(adapter), " new-producer rows:", len(newprod))
