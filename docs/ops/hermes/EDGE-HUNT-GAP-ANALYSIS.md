# Market–Model Probability Divergence Across the 6 Binds
*Reasoning Agent 3 — H0 post-completion structural analysis*

## How the GAP is defined in code (not invented here)

The divergence is a single, code-grounded quantity, reused across every entry point:

- **gap = p − q** (positive ⇒ model hotter than the market on the over ⇒ potential overlay; negative ⇒ market overpriced ⇒ underlay).
- **q** = the market's no-vig (de-vigged) P(over) at the **closing line**, via **Shin (1992)** (favorite–longshot-bias corrected), not proportional split. Source: `close-truth.ts` (CL4) + `devig.ts`; `-110/-110 → q ≈ 0.50`; **sub-vig/overround<1 books are refused, never fabricated**.
- **p** = the HB prop model's independent P(over):
  - rush yards → `probOverRushYards` (Gamma-Poisson on yards/attempts, ZIP hurdle)
  - receptions → `aDOT×SEP` catch model (Beta-Binomial bucketed on `(aDOT, separation)`)
  - rec yards → `probOverReceivingYards` (air-YAC convolution of two Gamma-Poissons)
  - completions → `probOverCompletions` (Beta-Binomial on completions/attempts)
  - INT → `probInt` (Gamma-Poisson on ints/attempts)
- **Fire gate** = `|p − q| > fireThreshold` (`walkForwardEval`, `placebo.ts` L109; `evVsClose` fires on `sign(p − qClose)`, returns price-space return `(ySide − qSide)/qSide`).
- Alt surfaces of the same gap: `pricePropAgainstMarket.edgeOver` (Shin, `props-priced-edge.ts`), `computeValueGap` = `rankingP − marketFairProb` (`divergence.ts`/`value-gap.tsx`), and the Edge Lab council's `marketMicrostructureAnalyst`: `gap = modelScore − marketImpliedProb`.
- `ladder-boost-scanners.ts` turns the gap into a **softness map**: `boostScore` = fraction of ladder levels where p>q (market systematically underprices the over), `meanEdge` = mean(p−q), `scanBoostOpportunities` = levels sorted by edge desc (the overlay shortlist).

**Status: everything above is `priced: false`.** See caveats.

## The 6 binds — covariate → model p → market q → divergence map

All six bind the covariate bus's **leak-safe, week-t→t+1, fail-closed, never-imputed** NGS cells into typed `Bound*` samples (`priced: false` throughout). The structural divergence comes from the market pricing props on **box-score counting stats + shallow recency** while the model has the **deeper NGS process signal the books do not see**.

| # | Bind | Covariate(s) | Model p it touches | Market q blind spot | Divergence vector |
|---|------|--------------|---------------------|---------------------|-------------------|
| 1 | **context** (`props-context-bind`) | `rest_days`, `body_clock_shift_h`, `wx_total_suppression` | cross-cutting multiplier on ALL offensive props (over & under) | Vegas prices totals loosely for weather; rest/travel granularity is NGS-level | extreme deltas dominate: short-week x-country + wind/precip ⇒ systematic OVER of favorable-context overs, UNDER of adverse — cross-cutting, biggest magnitude amplifier |
| 2 | **adot-sep** (`props-hb-adot-sep-bind`) | `avgSeparation` (weekly NGS mean, not arrival) | receptions catch-rate buckets `(aDOT, sep)` | receptions priced on targets/share, not how open a man is | elite-sep / low-target receivers ⇒ receptions OVER underpriced (overlay); low-sep ⇒ overvalued |
| 3 | **yac** (`props-hb-air-yac-bind`) | `avgYac` (mean YAC per reception, L2 covariate) | rec-yards air+YAC prior | rec-yards priced on aDOT/targets, YAC/reception is a receiver+scheme trait | high-YAC/rec, low-aDOT slot/screen types ⇒ rec-yards OVER underpriced (overlay); deep/contested ⇒ overvalued |
| 4 | **cpoe-comp** (`props-hb-cpoe-comp-bind`) | `avgTimeToThrow`, `avgIntendedAirYards`, `gseCpoe` | completions Beta prior | completions priced on raw rate; process CPOE lags realized | high-gseCPOE + short TTT + low aDOT "unlucky" => comp OVER underpriced (overlay); low-CPOE/deep aDOT => overvalued |
| 5 | **int** (`props-hb-int-bind`) | `avgTimeToThrow`, `aggressiveness` | INT rate Gamma prior | INTs priced on attempts/recency (extremely sparse market) | high-TTT + high-aggressiveness QBs => INT OVER structurally underpriced (clearest overlay) |
| 6 | **rush-yards** (`props-hb-rush-yards-bind`) | `pctAttemptsGte8Defenders`, `avgTimeToLos` | yards/attempt Gamma prior | rush yds priced on touches + OL DVO; box-stack% is NGS-only | low-box% + room-to-run backs => rush OVER underpriced; high-box% workhorses => overvalued (underlay) |

### Direction-of-effect (model p) — grounded in the bind/contract semantics
- **int**: TTT↑ and aggressiveness↑ ⇒ INT rate↑ ⇒ `p(INT over)`↑. (INTs are rare counts; the books' Poisson-ish raw-attempt model systematically under-reacts.)
- **cpoe-comp**: TTT↓, aDOT↓, gseCpoe↑ ⇒ completion rate↑ ⇒ `p(comp over)`↑. Process CPOE is persistent; realized rate is noisy → the gap opens when the two diverge.
- **yac**: avgYac/reception↑ ⇒ YAC-rate prior↑ ⇒ `p(rec-yards over)`↑ at fixed aDOT. Screen/slot specialists live here.
- **adot-sep**: avgSeparation↑ ⇒ catch-probability↑ in the `(aDOT,sep)` cell ⇒ `p(receptions over)`↑. (Only place the covariate currently shifts p via buckets.)
- **rush-yards**: pctAttemptsGte8Defenders↑ ⇒ tougher environment ⇒ yards/attempt↓ ⇒ `p(rush over)`↓; avgTimeToLos↑ (more congested timing) ⇒ same direction. The market sees touches, not the box.
- **context**: rest↑ / body-clock favourable / weather favourable ⇒ offensive production↑ ⇒ OVER p↑ (and UNDER p↓); reverse for adverse. A multiplier, not an additive term, so it widens every sibling prop's gap in the same direction.

## Largest pricing gaps + overlay candidates (structural, ranked)

1. **INT over — high-TTT, high-aggressiveness QBs.** INT markets are the sparsest (rare counts), so books over-rely on raw attempts + recent recency. The `avgTimeToThrow + aggressiveness` covariate shifts INT-rate p far enough that the market's q systematically lags ⇒ widest projected `p − q > 0` (overlay). Conversely, pocket-passers with low TTT + conservative profile ⇒ market OVER-prices INT over (underlay).
2. **Rec YAC over — high-YAC/reception, low-aDOT receivers.** The air+YAC model splits air vs YAC; the market prices rec-yards on aDOT+targets and under-weights YAC/reception ⇒ screen/slot specialists structurally underpriced on rec-yards over.
3. **Receptions over — elite-separation, low-target receivers.** Market prices targets; misses separation. (p-shift here is the only one currently wired into the catch buckets, so this is the one gap the pipeline already emits live.)
4. **Rush yds over — low box-stack% + room-to-run backs.** Volume is priced; environment is not. Backs with few attempts against light boxes and clean time-to-LOS are underpriced vs the yards/attempt prior.
5. **Completions over — high-gseCPOE, short-TTT, low-aDOT "unlucky" QBs.** Process CPOE persists; realized rate regressates. The model pulls p up while the market's q sits on the recent rate ⇒ comp-over overlays.
6. **Context-multiplied overlays.** Favorable rest/travel/weather tilts every sibling over UP (market underprices the additive offensive boost); adverse deltas do the reverse. Highest leverage as an amplifier of #1–#5.

**Biggest underlays (p < q, market overpriced):** rush-yards over on high-box%, power backs (volume over environment); INT over on conservative pocket QBs; comp over on low-CPOE/deep-aDOT passers; rec-yards over on low-YAC/reception deep threats.

## Honest caveats (do NOT read past these)

1. **Covariates are bound but NOT yet wired into `p`.** I verified empirically: `probOverRushYards`, `probInt`, `probOverCompletions`, and the air+YAC posteriors consume **only** raw box-score counts (attempts, yards, completions, ints). They do **not** read the bound NGS covariates. The grep over 298 non-test edge-lab files found **zero** model/scorer consumer of `Bound*`Sample` (the only covariate actually consumed is `avgSeparation`, via the catch model's `(aDOT, sep)` buckets in `props-hb-adot-sep.ts`). So the GAP above for INT/CPOE/YAC/rush-yards is the *intended* divergence once the covariate→prior wiring lands — it is not yet measured by the shipping `p`.
2. **No prop-line close archive / no `qClose` feed.** `docs/data/CARDS_EDGE_VALIDATE.md` EV1 states verbatim: *"no prop-line close archive exists — `EvalRow.qClose` has no props feed, so the economic referee cannot run for prop families yet (`props-priced-edge.ts`: 'priced stays false until a prop-line archive can settle CLV')."* `walkForwardEval`/`evVsClose` (the real gap measurer) therefore cannot grade prop families yet — `q` lives only behind the founder-gated ingestion path.
3. **The edge-validate deck isn't built.** `packages/.../edge-lab/edge-validate/` does not exist; EV1–EV17 are a design spec. The consumption guards (EV10 sep-bind, EV11 yac-bind) and the covariate-bus `layer`/`knownAtWeek`/`P_SIDE_COVARIATE_REGISTRY` shape are gated on PR #555 (open grok branch, not main).
4. **CLV on game markets is separately broken.** `C-20` in the ledger: the live totals/spread CLV uses point-line movement while the real juice sits unused — the 58.5% totals beat is not evidence "until this lands." Relevant because it shows the repo's own honesty gate on price-space gaps.

## Bottom line
- **Gap = p − q (Shin de-vigged closing P(over)); fire on |p−q| > threshold.** Fully specified in code and consistently surfaced (priced-edge, value-gap, ladder-boost softness map, council microstructure analyst).
- **Largest projected divergence:** INT over (high-TTT/aggressive QBs) and Rec-YAC over (high-YAC/rec, low-aDOT) — sparse markets the books under-price; with Receptions-over (sep) the only one currently wired into `p`, and Context the highest-leverage cross-cutting amplifier.
- **Not yet measurable end-to-end:** the covariates aren't wired into `p` (except SEP), and there is no prop `qClose` archive — so this is a structural overlay map, not a measured table. Wiring the 4 open binds into their priors + standing up the prop close archive (and closing PR #555's bus shape) are the prerequisites to turn "projected" into measured `p − q`.
