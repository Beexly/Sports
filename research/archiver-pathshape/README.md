# Archiver Path-Shape / Absorption-Lag Extractor

Grok WO-8, Build 1 (Idea 4 — "highest-leverage idea already instrumented",
Pair A component). Extractor version **1.0.0**, frozen 2026-10-15.

The line archiver captures multi-timestamp DraftKings stamps per game. This
module turns each game's stamp series into descriptive path features for the
reasoning layer (weight 0):

| Feature | Definition |
|---|---|
| `time_to_stabilization_minutes` | Earliest stamp after which the spread (home line) and total both stay within the noise band of their values at that stamp, for the remainder of the window. Measured from the declared event time when one exists, else from the window's first stamp (`tts_reference`). |
| `net_drift_points` (per series) | Last window value − first window value, signed. Spread sign convention: the HOME team's line (positive drift = home line increased). |
| `drift_after_60m_flag` | True when the series moves strictly more than the threshold after the event+60m mark, relative to its value at the last stamp ≤ event+60m. Null (with a reason string) when the comparison is unobservable — no stamp on either side of the mark. The extractor never guesses. |
| `path_roughness_reversals` | Direction reversals in the first differences (zeros dropped), per series and summed. |

## Pre-registered constants (v1.0.0 — changing any = a new version, never an edit)

- `NOISE_BAND_POINTS = 0.5` — one hook; movement within ±0.5 of the anchor is noise.
- `DRIFT_AFTER_60M_THRESHOLD_POINTS = 0.5` — the flag requires late movement **strictly greater** than 0.5 (i.e. ≥ 1.0 point, two hooks), so a single late hook cannot trip it.
- `DRIFT_AFTER_60M_MINUTES = 60`.

## Inputs and honesty rules

- **Main series:** the archiver JSONL (SPREAD home line + TOTAL per stamp).
- **Alt-ladder file (oddsapi):** a single timestamp per game today, so it
  cannot support path features; it is recorded in each row's provenance as an
  auxiliary snapshot only.
- **Events:** supplied by an events fixture; the extractor NEVER invents an
  event. Games with no declared event get `event: null`, event-relative
  features null, and window-relative path features instead.
- **Event-time provenance:** where an event's precise publication timestamp
  is not stamped in a source system, the fixture declares the assumed time
  and labels it `DECLARED-FIXTURE`. Today's one declared event (SEA@DEN
  injury designations) is such a fixture: statuses from the ESPN pull
  2026-10-15 15:31–15:36 UTC, event time declared at pull completion.
- **Cadence caveat:** today's archive is hourly (3 stamps/game). Measured
  time-to-stabilization is therefore an UPPER BOUND; rows set
  `tts_is_upper_bound` when the path is already stable at the first window
  stamp. Nothing in a row claims finer resolution than the stamps support.
- Every row carries the full per-game stamp provenance and the archive
  file's SHA-256.

## Run

```
python3 pathshape.py \
  --archive line-archive-2026-10-15.jsonl \
  --oddsapi line-archive-oddsapi-2026-10-15.jsonl \
  --events events_fixture_2026-10-15.json \
  --out features_2026-10-15.jsonl
python3 -m unittest test_pathshape -v   # 14 tests
```

## FROZEN TEST CARD — Idea 4 falsifiable test (accrues on FUTURE games only)

**Hypothesis.** Games whose line keeps drifting after a stamped news event
(absorption incomplete) show larger residual variance than games that
stabilize immediately.

**Population.** Future NFL games that enter ONLY via the archiver (per
SPEC-A accrual), each with a news/injury event time stamped by the stamped
injury feed (branch `motif/injury-feed-stamps-2026-10-15`). DECLARED-FIXTURE
event times do NOT qualify a game for the test. Today's rows are DESCRIPTIVE
and are NOT part of the test population.

**Grouping (extractor v1.0.0 constants, unmodified).**
- Group A (late drift): `drift_after_60m_flag = true`.
- Group B (immediate stabilization): `drift_after_60m_flag = false` AND
  `time_to_stabilization_minutes ≤ 60`.
- Games with `drift_after_60m_flag = null` are unobservable and excluded —
  never imputed, never reassigned.

**Outcome.** Residual = actual final margin − the archived T_emit line
(the SPEC-A baseline line: archived spread at T−90 min). Outcome per game =
squared residual.

**Statistic and decision rule.** Primary statistic: ratio of mean squared
residuals, Group A / Group B. Test: Brown–Forsythe (median-centered Levene)
one-sided at α = 0.05. The hypothesis is supported only if BOTH the
variance ratio > 1 AND p < 0.05.

**Accrual and evaluation rule.** Evaluation is permitted only after ≥ 30
games have accrued in EACH group. Evaluations happen once per freeze
window, are recorded as hypothesis-ledger entries before results are
inspected, and are never re-run on the same accrual with altered constants:
a constants change starts a NEW accrual under a new extractor version.

**Null/negative handling.** A null or negative result is published as-is.
The features remain reasoning-layer inputs at weight 0 regardless of the
test outcome until a separate promotion decision exists. No claim that
drift predicts anything is licensed before this test accrues and clears.

## Today's descriptive output (2026-10-15, 14 games, 3 stamps each)

- SEA@DEN (the one game with a declared event): spread +2.5 / total 40.5 at
  every stamp — zero drift, zero reversals, already stable at the first
  archived stamp (TTS ≤ 99.9 min from the declared event time, upper
  bound). The drift-after-60m comparison is UNOBSERVABLE today: the archive
  opened ~100 min after the declared event time, so no stamp exists within
  60 min of the event. The row says exactly that (`flag: null`, reason
  recorded).
- 13 games had no declared news event: event fields null by construction.
  12 were flat across the window. One (espn 401872997) saw its total drift
  −1.0 (41.5 → 40.5) at the final stamp — recorded descriptively, with no
  event attached and no interpretation claimed.
