# Launch calibration cohort + quote lineage — 2026-09-12

Branch: `hermes/c298-inplay-parity-2026-09-12`. Evidence only: no inclusion
rule changed, no production write invoked, no threshold/gate/model touched.
Governed suites green at write time: `__tests__/publish-time-market-p.test.ts`
(20) + `lib/calibration/__tests__/report-sample-completeness.test.ts` (9) +
`packages/prediction-engine src/__tests__/clv-capture.test.ts` (10).

## Cohort A — live eligibility floors (market_anchored_v3, C-298 2026-09-09)

Sample: settled WIN/LOSS two-way MONEYLINE picks with a market-anchored p.
Resolution order (live-calibration-p.ts): odds-table resolver first (two or
more books; exactly one book resolves as `resolver_single_book`), then proof
receipt marketFairProb, then factor-breakdown market fair. The receipt was
demoted after production showed it sitting 0.169 above the odds table at
generatedAt on v5.2.7 pre-game rows. Synthetic 0.5 is rejected.
Confidence/100 is never scored for the floors.

Exclusion buckets (counted, never silently dropped): `non_moneyline_market`
(receipted SPREAD/TOTAL cover probabilities sit near 0.5, Brier near 0.25 by
construction; reported per-market on the bake-off surface instead),
`three_way_market` (structural), `in_play` (generatedAt at/after
commenceTime — a live price, not a publish-time one; when commenceTime is
absent the row is KEPT, the exclusion only removes provable in-play),
`no_market_probability` (no WP-28 identity fields, never a recompute
candidate), `unverifiable_market_p` (C-300: receipt or factor-breakdown only,
no odds-table price at generatedAt; counted, never scored).

Single-book policy (C-110, 2026-09-06): a receipt-less pick whose game has
exactly one real book at/before generatedAt is scored on that book's
proportionally de-vigged price, tagged `market_p_single_book`, reported
separately from `market_p_from_odds_table`. Measurement only — publishing
still needs two books.

Endpoint-reported standing (quoted, NOT independently recomputed):
eligibility GREEN n=407, Brier 0.2103, raw ECE 0.0549, debiased 0.038688;
gates statsPublic, canExposePublicPicks, canExposePerformanceStats,
calibrationPublished all true (docs/ops/LAUNCH_EXECUTION_EVIDENCE_2026-09-12.md).
Version note: the endpoint reports probability basis `market_anchored_v4`
while this checkout's eligibility sample definition is `market_anchored_v3`
(C-298) — deployed-vs-local drift consistent with the known SHA mismatch;
ancestry unestablished, so v4 semantics are NOT attributed to this code.
Endpoint CLV posture (quoted, same source): graded 1443, beat 328, matched
611, lost 504, rate 0.2273, clearsBreakEven=false, canExposeClv=true —
an honestly labeled result, not proof of edge.

## Cohort B — publish-time market_p recompute (WP-28 / WP-28b)

Same primitives as the receipt (engine americanToImpliedProbability per book,
mean per side, proportional two-way de-vig; method tag
`mean_implied_proportional_devig`), rounded to the receipt's 6 decimals —
never a second method scored on the same curve. Snapshot rule per real book:
latest H2H row with fetchedAt at or before the pick's generatedAt; rows after
generatedAt are never read.

Intended vs actual timestamps: intended is the run that produced the pick
(odds rows share one run-level fetchedAt); actual may differ per book (a book
absent from that run contributes its own latest earlier row), and the result
reports the oldest row used so the reader sees the spread. At least
MIN_BOOKMAKERS (the engine's constant, never a literal) distinct bookmaker
keys each quoting BOTH sides tags `market_p_from_odds_table`; one real book
resolves as `market_p_single_book` (C-110). Side is the engine's
boundary-aware selectionIsHomeSide evaluated both directions — a selection
naming neither team, or both equally, returns null instead of a guessed side.

## Cohort C — closing-line value (clv-capture.ts + clv.ts)

The close is not a stored marker: it is the LAST odds batch at/before
commenceTime (`capturedAt`; null when no batch precedes kickoff), averaged
across books exactly as the scorer forms consensus. Pairings: moneyline =
American price for the chosen side (CLV in implied probability,
close minus pick); spread/total = home-perspective lines (spread negative =
home favored), CLV in points with the side flipping the sign so POSITIVE
always means the lock beat the close. Verdicts are epsilon-banded:
BEAT_CLOSE / LOST_TO_CLOSE / MATCHED_CLOSE (ties on the number match, they
do not beat). `bookmakerCount` on the snapshot is a documented misnomer: it
counts ROWS in the closing batch (one book pricing three markets contributes
3), not distinct books — `ClosingOddsRow` carries no bookmaker id, so read it
as a coarse priced-rows signal only. Spread/total and moneyline samples must
stay separate downstream (points vs probability units).

## Cohort D — identical-row bake-off (2026-09-08, C-265)

Motivation: the truth surface read confidence n=745, independent_trueProb
n=712, marketFairProb n=135 — different row sets, so cell gaps mixed score
quality with row selection. The bake-off fixes ONE row set: settled canonical
WIN/LOSS two-way MONEYLINE picks on which ALL of confidence/100, independent
trueProb, blend_indep_conf and marketFairProb are finite; three-way sports
excluded structurally; nothing else filtered. Resolution order is the
calibration loader's (receipt → factor breakdown → odds-table resolver), and
every row reports which source supplied its market p. The n=135 vs n=475 gap
is explained, not hidden: the by-market row builder reads the factor
breakdown BEFORE the receipt and never calls the resolver. Metrics are the
same engine functions (brierDecomposition, 10-bin ECE, 4dp); the /calibration
chart's five 10-point confidence buckets are display-only and not used here.
Bootstrap is seeded/paired (same resample indices per score), deterministic.
Sensitivity (C-247 ESPN-contradicted finals): builder accepts excludeGameIds;
without them the cell reads NOT RUN with the exact command — never an estimate.

## Cohort E — 2026-09-04 market corpus (baseline, do not cross-quote)

5,281 settled NFL games 2006-2025 from nflverse games.csv (closing MLs exist
from 2006), command `npx tsx scripts/analytics/replay-calibration.ts`,
reproduction log alongside. Walk-forward folds (train ≤ N, eval N+1, never one
pooled number for fit comparison); pooled held-out 2016-2025 n=2,750: base
rate 55.02%, Brier 0.2106 [0.2050, 0.2172], reliability 0.0324, resolution
0.0361, ECE equal-width 0.0180 / adaptive 0.0126 (adaptive is the honest
binner; equal-width is inflated by sparse tails). Ties excluded. This is the
MARKET-moneyline corpus — NOT the 15,939-pick spreads/totals 1999-2025 replay
corpus; the two populations must never be cross-quoted. nflverse CC BY 4.0.

## Routed duplicates — flagged, counts unchanged

`espn_public` is ESPN's routed DraftKings line and the odds row does not say
which provider was routed, so `espn_public` + `draftkings` in one snapshot
count as two keys here exactly as the engine counts them. `rundown_default`
(affiliate-less lines sharing one key, no book identity) is excluded;
unknown `rundown_<id>` affiliates are kept as real distinct books. These
rules are documented in-module; governed counts were NOT changed to smooth
any cohort.

## UNREPRODUCED (per policy — unavailable rows, not estimates)

- Current eligibility counts beyond the endpoint quote (needs live store read).
- Fresh odds-table market_p recompute on current production rows (loader run only).
- ESPN-contradicted-finals sensitivity cell (needs live ESPN finals + stored games).
- Any number not named above with a command or a quoted source: treat as absent.
