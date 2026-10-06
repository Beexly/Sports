# Research CSV inventory: wired vs unused (2026-09-23)

Tracked gaps from the wire-nfl-mlb pass. No stubs. Everything here is either
already wired into independent fair values, or named with its file pointer so a
later task can pick it up without re-discovering it.

## Wired into independent fair values

| Source | Module | Notes |
|---|---|---|
| SamHoppen composite power ratings (points-vs-average) | `packages/prediction-engine/src/power-ratings-fair-value.ts` (`powerRatingsToIndependentFairValue`) | 6-source mean (FPI / nfelo / Inpredictable / Unexpected Points / FTN DVOA / PFF). Provenance `research_power_ratings`. |
| benbbaldwin objective power ratings (win% vs avg) | same file (`winPctVsAverageToIndependentFairValue`) | Market-implied tiers. Provenance caller-supplied (`teamrankings` / research label). |
| MLB standings win% logistic | `packages/prediction-engine/src/standings-strength.ts` (`standingsWinPctToIndependentFairValue`) | **This is the MLB late-week fair-value path.** Source default `mlb_standings`. Already live for late-week MLB independent ML fair values. |

## Unused research CSVs (high-value, NFL Week 2/3)

Located under `docs/research/2026-09-22/full-tables/` (index: `README.md`).

| CSV | What it could feed | Why not wired yet |
|---|---|---|
| `samhoppen-explosive-play-rates-week2-partial.csv` | Explosive-play differential as a team-strength residual (spread/total feature) | Team-level rate; not a direct win-prob scale. Needs a calibrated mapping before it can be a fair-value source. |
| `samhoppen-epa-per-drive-tiers-week2-partial.csv` | EPA/drive net tier as a second efficiency rating scale | Same family as power ratings already wired; wiring would double-count unless the ensemble treats it as a separate source with its own provenance. |
| `samhoppen-proe-leaders-week2-partial.csv` | PROE as a play-calling aggressiveness residual | Already modeled in `signals/tactical/early-down-pass-rate-momentum.ts` (Factor A8) as a signal, not a fair-value source. Leave as signal. |
| `gridironinfo-series-results-week2-partial.csv` | Drive-anatomy outcome mix (TD / first down / FG / punt / TO) as a scoring-environment feature | Descriptive, not a rating. Feeds totals work, not ML fair values. |
| `gridironinfo-first-downs-by-down-week2-partial.csv` | Down-level conversion profile | Same: descriptive feature, not a rating scale. |
| `gridironinfo-avg-drive-start-position-week2-partial.csv` | Hidden-yardage / field-position prior | Small, situational. |

Same inventory pattern applies to `docs/research/2026-09-22/full-tables/` Week-2
tables already listed in that directory's README (composite power ratings CSVs
are the ones already consumed).

## MLB late-week fair-value path: CLOSED (already live)

No new work required. `standingsWinPctToIndependentFairValue` /
`standingsWinPctToWinProbs` in `packages/prediction-engine/src/standings-strength.ts`
convert standings win% to independent ML fair values (Bradley-Terry / logit +
HFA), source label `mlb_standings`. Power-ratings path is NFL-oriented in
practice (NFL_NAME_TO_ABBR in the consumer) but the math is sport-keyed and
does not need an MLB extension for late-week fair values.

Skellam/Poisson cover path is separate and already present in the engine.

## Rule for whoever picks these up

- Do not wire a CSV as a fair-value source until it has a calibrated mapping to
  a win probability (the power-ratings module is the template).
- Descriptive team rates (explosive, PROE, series results) belong in the
  factor/signal layer, not the independent blend.
- Keep provenance labels distinct per corpus so the ensemble can de-duplicate.
