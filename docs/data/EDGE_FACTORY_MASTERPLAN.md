# Edge Factory Masterplan — the upgrade to the 10k-ft plan

**Status:** planning doc. Supersedes nothing; extends the Grok "10Hz / deep stats / props /
Hermes-under-Grok" plan. Nothing here is priced. Every magnitude in this document is a
**prior to be verified in-house** — publishing or pricing any number below before it passes
the validation protocol in §6 violates the no-fabricated-stats rule.

**Mission framing (do not compress):** the company is named for the edge. The deliverable of
this platform is not a model, a data feed, or a doc — it is a *count of validated edges and
the cadence at which that count grows*. Any single edge decays as books adapt. The moat is
the factory: hypothesis generation at industrial scale, ruthless validation, automatic
retirement. Everything below is subordinate to `validated edges / month`.

---

## 0. Verdict on the Grok plan

**Keep (it is right about these):**
- The L0–L3 layer discipline, and "higher layers are covariates/y-axes on lower-layer
  generative models, never replacements."
- The legal posture: CC-BY vs CC-BY-SA fail-closed, no scraping, BDB methods-not-frames,
  NGS as referee not `p`, reconstruction labeled `RECONSTRUCTED`.
- Proxy binding with honest labels and stable `f(...)` signatures so L3 plugs in later.
- `priced:false` gating, Hermes-in-isolated-worktree, CHECKPOINT protocol.

**What it is missing — and why it feels shallow despite being long:** it is an
*infrastructure and legality plan*, not an *edge plan*. Its "deep prop generative map" is
still volume × rate with better covariates. Six structural blind spots:

1. **Compositional structure.** Teammates compete for one pie. Independent NB target models
   per player are incoherent — they can imply a team throwing 55 targets. Target and carry
   *shares* are compositional (they sum to 1) and belong in a Dirichlet-multinomial, which
   gives negative teammate correlation, coherent same-game props, and turns injury
   re-projection into weight renormalization. §3.2.
2. **Props are quantile bets, not mean bets.** A line at 62.5 receiving yards settles on a
   quantile of a right-skewed mixture, not on a mean. Skew, zero-inflation, and censoring
   (blowout benchings) decide alt lines and unders. The referee must be CRPS/PIT, not hit
   rate. §3.4.
3. **Time is a first-class dimension.** Aging curves, role change-points, injury ramps,
   scheme resets. Season means are the enemy: books lag role changes by roughly a week, and
   the freshest-information window is where they are slowest. §4-A, §4-C.
4. **No mechanism produces conditional insights.** "QBs 32+ target the RB at a ~30% higher
   clip" is the *genre* we want, and nothing in the plan generates that genre. One insight
   is trivia; we need the machine that mines, FDR-controls, and validates thousands of
   conditional contrasts from data we already own. §2.
5. **Reliability-weighted shrinkage is itself an edge.** Books and the public overweight
   unstable stats (YPC, TD rate) and underweight stable ones (target share, aDOT, TTT).
   Measuring per-metric reliability in-house and shrinking accordingly is a systematic edge
   that costs $0. §4-F.
6. **Effort allocation is vibes.** The plan orders P2 by intuition. We own a line archive:
   cross-book dispersion and staleness by prop family is a measurable softness map. Point
   the p-side effort at measured softness, not at what is intellectually interesting. §4-G.

The rest of this document fixes those six.

---

## 1. The Edge Lifecycle (operating model for everything below)

Every edge — mined or hand-authored — moves through one registry with hard gates:

```
HYPOTHESIS  → written in EDGE_CATALOG.md with mechanism + estimand + data + entry point
CANDIDATE   → coded as a covariate on the bus (#547 pattern), priced:false, log-only
VALIDATED   → pre-registered holdout win (§6) + sign-stable across ≥2 seasons + survives FDR
LIVE        → enters independent p; contribution tracked on a rolling window
RETIRED     → rolling 8-week contribution ≤ 0 → auto-demote to log-only; entry kept
```

Rules:
- No edge skips a stage. No stage is exited without the artifact (catalog row, holdout
  report, scoreboard update).
- `docs/data/EDGE_SCOREBOARD.md` tracks counts per stage and is updated on every promotion
  or demotion. The scoreboard *is* the KPI. Target cadence once the harness exists:
  4–6 VALIDATED per month.
- Edges decay. RETIRED is a success state (it means the referee works), not a failure.

---

## 2. The Edge Mining Engine (the machine that finds the QB-age effect a thousand times)

The motivating example — "QBs 32+ target the RB at a ~30% higher clip" — is an instance of
one template:

> **Conditional rate contrast:** Δ = E[outcome | cohort, situation] − E[outcome | baseline],
> estimated with hierarchical controls, on data we already legally hold.

Everything needed to mass-produce these is in-house and CC-BY:

**Cohort dimensions** (from nflverse rosters / draft / combine — all CC-BY):
age (birth_date), seasons of experience, career touches/attempts (cumulative from PBP),
draft capital, size/speed archetype (combine 40, weight), position role proxy (aDOT profile,
slot-rate proxy via pass_location), QB archetype (scramble rate, aDOT, TTT).

**Situation dimensions** (from PBP + schedules — CC-BY):
down/distance, score differential and win-prob bucket, field zone (yardline_100,
goal_to_go), quarter/half/two-minute, shotgun, no_huddle, rest-days differential, roof,
surface, `temp`/`wind` (already columns in nflfastR PBP for outdoor games — verify
coverage), divisional rematch flag, home/away, season (era effect).

**Outcome dimensions:**
target share by position group, carry share, aDOT, catch rate, YPC distribution, TD rate,
sack rate, scramble rate, INT rate, completion rate.

**Statistical discipline (non-negotiable — this is what separates mining from p-hacking):**
1. **Pre-registration:** the grid is enumerated in a checked-in config before the job runs.
   Adding cells requires a new config version. This is the garden-of-forking-paths control.
2. **Hierarchical partial pooling** per cell: player ← archetype ← position ← league, with
   season random effects (era/rule-change drift; flag 2020 as an outlier year).
3. **Benjamini–Hochberg FDR** across the whole grid, not per-cell p-values.
4. **Sign stability:** the contrast must hold direction in ≥2 independent seasons.
5. **Economic materiality:** the affected prop family must have measured line volume and
   dispersion (§4-G1) — a real effect on a market nobody posts is trivia.
6. **Minimum effective sample** per cell, computed with design effects (hierarchical
   shrinkage means nominal n overstates information).

**Output:** ranked candidates written as HYPOTHESIS rows into `EDGE_CATALOG.md` (or a
log-only artifact table later — the Prisma schema stays a forbidden zone for Hermes).
**Implementation home:** a worker job (`workers/` pattern) over the in-house PBP store.
Pure L1. Zero new data. Zero spend.

**Worked example — E-A1 as a mining cell (the recipe for the whole genre):**
- Estimand: RB target share and aDOT by QB age bucket (<28, 28–31, 32+), controlling for
  win-prob bucket, down/distance, team scheme (coordinator fixed effect), receiver-room
  quality (teammate archetype mix), season.
- Join: PBP passer/receiver ↔ rosters (birth_date, position) ↔ depth charts.
- Report: shrunken Δ with interval, sign stability by season, FDR-adjusted q-value.
- If it survives: it enters the model not as a slogan but as an *age covariate on the
  Dirichlet target-share weights* (§3.2) and an *age covariate on aDOT* in the catch model.

---

## 3. Structural model upgrades (the p-side re-stack)

The Grok generative map stands as the skeleton. These are the five structural changes that
make it deep rather than long.

### 3.1 Latent script core (one game state drives every volume)

```
(plays, PROE, pace) ~ f(spread_line, total_line, team pace priors, rest delta, wind/temp, roof)
team dropbacks / rushes = g(plays, PROE, score-path simulation)
every player volume conditions on the script draw — never on season-average volume
```

**q-firewall, stated precisely (this refines the "never mix q into p" rule):**
- FORBIDDEN in p: the same prop's price at any book, any transform of it, or any feature
  fit on it. Provenance tag `MARKET_PROP` → a test walks every p-side covariate registry
  and fails the build if found.
- ALLOWED in p: game-level spread/total (`spread_line`/`total_line` are in nflverse
  schedules/PBP) as *script covariates*. They are exogenous to the player prop and this is
  the difference between projecting a 6-point favorite and a 6-point dog. Holdout must
  confirm they add skill at decision time.
- Everything else market-side (Shin, juice floor, dispersion, staleness) stays on q/pricing.

Every covariate carries `provenance: L0|L1|L2|L3|MARKET_GAME|MARKET_PROP` and `known_at`.

### 3.2 Dirichlet-multinomial share core (the single biggest coherence win)

Replace per-player independent NB target/carry models with:

```
team_dropbacks ~ script core
target_shares  ~ DirichletMultinomial(α_1..α_k)     # one α per active pass catcher
α_i = exp(  β·log(est_route_share_i)               # exposure offset, §4-C1
          + role covariates (WOPR, depth-chart slot, RZ role)
          + change-point-adjusted recency (§4-C2)
          + QB-conditioned effects (age, archetype — §4-A, §4-B)
          + matchup effects (§4-E) )
```

What this buys, concretely:
- Teammates are negatively correlated *automatically* (shares sum to 1) — same-game props
  and Parlay MRI become coherent without bolted-on copulas for the volume layer.
- Injury re-projection = drop the inactive player's α, renormalize, then apply measured
  **vacancy elasticity** (§4-C3) as a correction — not naive pro-rata.
- Overdispersion is native (Dirichlet concentration = how locked-in the hierarchy is;
  a settled WR room has high concentration, a committee backfield low).
- Same structure for carry shares. Rush and target shares of the same RB couple through a
  shared role factor.

### 3.3 Event-process stack (keep Grok's f(...) map; bind the missing covariates)

Grok's per-family equations stand. The additions that matter are in the catalog (§4):
age and archetype on aDOT and checkdown mix; pressure chains on completions/sacks/INT;
box-proxy on YPC; wind on deep rate; RZ-share bifurcation on both TD families.

### 3.4 Tails, zeros, censoring (price the shape, not the mean)

- Receiving yards = NB receptions ∘ per-reception (air + YAC) with a **heavy-tailed YAC
  mixture** (lognormal-ish tail; one broken play is often 40% of a game's yards). A
  high-aDOT low-volume receiver is right-skewed: median ≪ mean → mean-anchored lines
  systematically favor the under. This is checkable in-house before ever pricing it.
- **Zero-inflation is a product feature:** P(0 receptions) dominates 1.5/2.5-line props.
- **Censoring, not mean-shift, for blowouts:** starters' snaps are truncated when win prob
  crosses a threshold. Model the right tail as censored for heavy favorites — alt-overs on
  big favorites' stars are shape-mispriced, and a mean adjustment gets it wrong in both
  directions.
- Referee: CRPS and PIT histograms per prop family (§6), never hit-rate alone.

### 3.5 One simulation, all props

All families become marginals of **one player-game simulation**: simulate script → shares →
events. Guarantees internal consistency (the receptions line, rec-yards line, longest-rec
line, and ATD for the same player come from one joint draw) and unlocks §4-G5: detecting a
*book's own* internal inconsistencies across related lines — a new edge class that only a
joint model can see. ATD is then trivially 1 − P(no rushTD ∧ no recTD) under the joint,
never an addition.

### 3.6 Shrinkage spine

Every player-level rate shrinks toward archetype ← position ← league, with weights set by
the measured reliability table (§4-F1), not by convention. Stability-aware shrinkage is
where "we know YPC is noise and the market half-doesn't" turns into money.

---

## 4. Edge Catalog seed (~36 entries)

Format: **id · claim (H = hypothesis, prior magnitude to verify) · mechanism · test ·
enters-model-at · props affected.** All data references are in-house or CC-BY nflverse
unless marked. Everything is HYPOTHESIS until it passes §6.

### A. Aging & archetype curves (rosters.birth_date × PBP — the requested genre)

- **E-A1 · Aging QB → checkdown migration.** (H) QBs ~32+ shift target mix toward RB/TE
  and lower aDOT; prior on RB-target-share lift ~20–35% rel. vs <28 peers, script-controlled.
  Mechanism: arm strength declines, processing survives → quick short game. Test: §2 worked
  example. Enters: α-weights (3.2) + aDOT covariate. Props: RB receptions/rec-yds overs,
  deep-WR unders, QB completion% up / yds-per-completion down with old QBs.
- **E-A2 · Aging QB aDOT compression is a *shape* change.** (H) Completion% rises while
  air yards fall → pass-yds distribution narrows. Same mean, thinner right tail → alt-overs
  overpriced, main-line unders live. Enters: aDOT + completion f(...); priced via 3.4.
- **E-A3 · Sack rate is a sticky QB trait.** (H) TTT + internal clock follow the QB across
  teams; O-line reputation is the market's anchor. Test: QB-change and team-change
  discontinuities on sack rate vs line-implied. Enters: sacks|dropbacks f(TTT, QB effect).
  Props: sack props on QBs changing teams; young-QB sack overs behind good lines.
- **E-A4 · RB cliff.** (H) YPC and broken-tackle proxies decay at ~age 27+/~1500 career
  touches while attempts (role) lag the decay; receptions age better. Test: career-touch
  cohorts on YPC distribution, not mean. Enters: YPC mixture + share α. Props: rush-yds
  unders at stable attempt lines for aging volume backs.
- **E-A5 · WR aging is archetype-conditional.** (H) Speed/boundary WRs (combine 40, high
  aDOT) decline sharply ~29–30; slot/route-craft WRs and TEs decline gently. Cohort by
  40-time × aDOT profile × slot proxy (pass_location). Enters: α-weights + sep covariate
  aging prior. Props: season-long over/unders and week-to-week deep-role props.
- **E-A6 · Rookie ramps by draft capital.** (H) Rookie WR usage is depressed weeks ~1–4
  then ramps (TE version: year 2–3); books anchored to season-to-date under-project the
  ramp and over-project week 1. Test: usage trajectory curves by draft round. Enters:
  α recency weighting + explicit rookie ramp prior.
- **E-A7 · Rookie RB pass-pro gate.** (H) Third-down/2-minute snaps arrive only after
  pass-block trust, capping early-season reception ceilings regardless of talent. Test:
  rookie RB 3rd-down snap share trajectory. Enters: situational share model (4-C5).

### B. QB-conditioned teammate effects (generalizing E-A1)

- **E-B1 · Backup-QB delta matrix.** For each starter→backup transition: target-mix shift
  by position group, aDOT shift, scramble/sack shift — pooled hierarchically over backup
  archetypes (scrambler / statue / checkdown). On QB injury news, *every* teammate
  re-projects. Enters: α-weights + event processes. This is the highest-frequency in-season
  re-projection edge we can own.
- **E-B2 · QB–receiver depth match.** (H) A deep threat attached to a checkdown QB has a
  dead right tail (alt-overs overpriced) even at stable target volume. Test: receiver aDOT
  realized vs receiver-career aDOT under different QBs. Enters: aDOT covariate.
- **E-B3 · CPOE transfer.** Receiver catch-rate f(...) uses the *QB's* GSE-CPOE (already
  house IP), never the receiver's trailing raw catch rate; extends through B1 transitions.
- **E-B4 · Scrambler suppression.** (H) Scrambling QBs convert dropbacks to runs/sacks →
  team attempts down, teammate reception unders in QB-change weeks toward scramblers,
  QB rush props up. Enters: script core (dropback→attempt conversion).

### C. Role & usage microstructure (the freshness edges — volume beats rate)

**Principle that reorders all priorities: prop settlement variance is dominated by
volume/exposure error, not rate error. A 15% exposure miss swamps a 2% rate miss, and
exposure is where within-week information is freshest and books are slowest.**

- **E-C1 · est-routes / TPRR proxy.** Routes-run data is SA-poisoned (participation) or
  paid (PFF). Legal proxy: `est_routes_i = snaps_i × team_dropbacks / team_snaps` (all
  CC-BY). Targets-per-est-route is a more stable exposure denominator than target share on
  small samples. Enters: exposure offset in α (3.2). Label the proxy honestly.
- **E-C2 · Change-point role detection.** Bayesian online change-point / CUSUM on snap
  share, est-route share, target share, RZ share. On detection: **reset the exposure prior
  to the post-change window** instead of shrinking to season mean. Books move on season
  aggregates → this is the freshest structural edge in the plan. Enters: α recency machinery.
- **E-C3 · Vacancy elasticity.** When X is inactive, redistribute X's usage by *measured
  historical redistribution in X's past absences* + depth chart + archetype similarity —
  never pro-rata. Test: leave-one-out on past inactives. Enters: 3.2 renormalization.
- **E-C4 · Red-zone role bifurcation.** Inside-10 target/carry shares vs field shares are
  different jobs. TD props priced off field roles misprice goal-line specialists (and the
  vulture decouples rush-yds from rush-TD). Enters: #538/#539 as RZ-share covariates from
  PBP `yardline_100`/`goal_to_go`.
- **E-C5 · Two-minute personnel.** (H) Hurry-up concentrates on WR1 + pass-catching RB
  (`no_huddle`, half_seconds_remaining). Trailing-script projections must re-weight shares
  by 2-minute personnel — interacts with spread via the script core.
- **E-C6 · Blowout censoring.** See 3.4 — implemented as censoring in the simulation, and
  as an edge: books that mean-shift instead of truncate misprice both tails of heavy
  favorites' star props.

### D. Script, environment, schedule (mostly already-in-house columns)

- **E-D1 · Script core** (3.1) — spread/total/rest/pace → (plays, PROE); the covariate
  every volume model conditions on. `spread_line`/`total_line` from schedules, q-firewalled.
- **E-D2 · Wind.** (H) Wind ≥ ~15mph collapses deep-attempt rate and aDOT → pass-yds
  unders, rush-attempt overs, kicker effects. `wind`/`temp` are already nflfastR PBP
  columns for outdoor games (verify coverage); upgrade path: NOAA/NWS METAR history —
  **US-government public domain, $0, a legal net the 10k-ft plan missed** — joined on
  stadium + kickoff hour.
- **E-D3 · Cold/precip.** (H) Modest completion/fumble effects; verify before use.
- **E-D4 · Altitude (DEN).** (H) Kick distance, visitor late-game fatigue.
- **E-D5 · Dome team outdoors in Dec/Jan.** (H) Efficiency penalty; cheap flag to test.
- **E-D6 · Short week (Thu).** (H) Install limits → run-lean, lower totals; verify by era.
- **E-D7 · Rest differential.** Days-rest delta from schedules; includes post-bye.
- **E-D8 · Body clock.** (H) West-coast teams in 1pm ET starts (10am body clock)
  underperform — classic result; test whether it survives in modern data before use.
- **E-D9 · Divisional rematch familiarity.** (H) Passing efficiency dips in rematches.

### E. Opponent conditioning (defense as random effects, not ranks)

- **E-E1 · Shrunken role-specific DVP.** Defense effects vs slot/wide/TE/RB estimated as
  random effects in a hierarchical GLM with schedule adjustment — raw "defense vs position"
  ranks are mostly noise; the shrunken version must beat raw on holdout before entering.
- **E-E2 · Funnel defenses.** Strong pass-D/weak run-D shifts opponent PROE and mix;
  interacts with script core.
- **E-E3 · Pressure chains.** Opponent pressure proxy (sack + `qb_hit` rates — CC-BY
  columns, not participation) → checkdown rate up (RB receptions), aDOT down, sack prop up,
  INT mix shifts. One covariate feeds four prop families.
- **E-E4 · Pace interaction.** Both-team pace → plays; subordinate to script core.
- **E-E5 · Coverage-shell proxy without charting.** Opponent aDOT-allowed profile +
  middle-of-field target rates allowed (`pass_location`) as a shell fingerprint. Honest
  label: proxy, not charting; SIS/PFF is the paid upgrade later.

### F. Reliability & shrinkage (meta-edges — the market prices noise, we don't)

- **E-F1 · Metric reliability table.** Split-half and season-over-season reliability per
  metric per sample size, computed in-house → shrinkage constants for the spine (3.6).
  Deliverable: `docs/data/METRIC_RELIABILITY.md`. Priors to verify: target share and aDOT
  stabilize fast; YPC and TD rate are close to noise at season samples; catch-rate
  -over-expected (vs aDOT) stable where raw catch rate is not; TTT sticky.
- **E-F2 · YPC is noise.** Rush-yds from attempts × *distributional* YPC with heavy
  shrinkage + box proxy; systematically fade lines that chase recent YPC.
- **E-F3 · TD rate is noise → price expected TDs.** TD props priced off RZ shares (E-C4) ×
  team RZ efficiency × field-position model; ignore trailing TD counts. The public — and to
  a lesser degree books — chase TD streaks; regression is the edge.
- **E-F4 · Residuals over raw rates.** GSE-CPOE/RYOE/xYAC residuals (house IP) are the
  stable skill signal; raw rates mislead after role changes. Already the plan's stance —
  now with F1 quantifying *how much* to trust each.
- **E-F5 · Early-season prior decay with roster continuity.** Carryover weight on last
  season scales with returning QB/OL/coordinator continuity. A new OC resets scheme priors
  to *that OC's career fingerprint* (PROE, pace, formation rates from their prior stops) —
  not to last year's team. Data: coaches/schedules + PBP fingerprints.
- **E-F6 · Era effects everywhere.** Season random effects in every model (rule changes,
  2020 outlier); the mining engine (§2) already requires them.

### G. Market-side intelligence (q-side only, own archive only, never enters p)

- **E-G1 · Dispersion mining.** Cross-book line dispersion by prop family from our own
  line archive = the softness map. Fattest dispersion = softest market = where p-side
  effort pays. This turns P2 prioritization from vibes into measurement. (Grok-side P0 —
  the line archive is in Hermes's forbidden zone, which is fine.)
- **E-G2 · Injury-lag latency by book.** Measure per book: minutes from injury news to
  line move, by prop family. Pairs with E-C2/C3/B1 — the freshness edges only pay inside
  the measured latency window, so measure the window.
- **E-G3 · Opener-to-close drift by family.** Systematic drift = opener bias = bet-timing
  policy per family (hit openers where they're historically wrong, wait where they sharpen).
- **E-G4 · Popularity tax.** (H) Books shade star players' overs (public demand). Test vig
  asymmetry vs a popularity proxy on our archive. Consequence: prefer unders and
  low-salience overs where the tax is measured.
- **E-G5 · Book self-inconsistency scanner.** With the joint simulation (3.5), a book's
  own (receptions, rec-yds, longest-rec, ATD) quad for one player can be mutually
  incompatible. When it is, one leg is wrong — bet the leg most divergent from our joint.
  A genuinely new edge class; requires 3.5, no new data.

---

## 5. Nets to cast — deltas to the 10k-ft list (all $0, all legal)

Additions the plan missed, in priority order:
1. **rosters (birth_date, experience), draft picks, combine** — CC-BY nflverse; unlocks the
   entire §4-A genre. The single cheapest unlock in this document.
2. **`temp`/`wind` already inside nflfastR PBP** — no new ingestion for E-D2 v1.
3. **NOAA/NWS METAR history** — public domain US-government weather; precision upgrade.
4. **nflverse officials data** (crew penalty tendencies → DPI/deep-shot value, pace) —
   verify availability/license before use; HYPOTHESIS tier.
5. **Coaching/coordinator history** — for E-F5 scheme fingerprints.
6. **Our own line archive** — already in-house; §4-G makes it a research asset, not a log.

Reaffirmed poison list (unchanged): participation/FTN CC-BY-SA (incl. `defenders_in_box`,
routes, personnel — use E-C1/E-E3 proxies), no scraping, no BDB frame retention, no PFF
model outputs as p, no `last_price` as q, no same-prop market in p (3.1 firewall + test).

---

## 6. Validation protocol (the referee — nothing goes LIVE without it)

- **As-of discipline.** Every feature carries `known_at`; training joins use only
  information available at **decision time** (when we would bet — e.g., T-x hours before
  kickoff), not game time. Injury features are the canonical trap. The covariate bus
  (#547) is already leak-safe next-game — extend the same contract to every new source.
- **Temporal CV only.** Expanding-window by season/week. Random K-fold is banned (leakage).
- **Metrics.** Log-loss/Brier for binaries; **CRPS** for counts/yardage; **PIT histograms**
  and calibration slope per prop family. Hit rate is reported, never decisive.
- **Economic referee.** Simulated flat-stake CLV vs consensus close at decision time, plus
  realized ROI through the existing grading/accuracy pipeline. A covariate that improves
  log-loss but not CLV is describing the market, not beating it.
- **Gates.** CANDIDATE→VALIDATED: pre-registered holdout improvement + sign stability
  across ≥2 seasons + survives grid-level FDR. LIVE→RETIRED: rolling 8-week marginal
  contribution ≤ 0 → auto-demote. No manual overrides without a catalog entry saying why.
- **q-contamination test.** CI walks every p-side covariate registry; any `MARKET_PROP`
  provenance fails the build.

---

## 7. Revised phases (deltas to the 10k-ft plan)

**P0 (Grok, from origin/main)** — as planned (`PROP_COVARIATE_GAP.md`), **plus E-G1
dispersion mining** from the line archive. Output: gap table + softness map. The softness
map re-ranks P2 with measurement instead of intuition.

**P1 (Hermes, research only)** — the three planned docs, **plus three**:
- `docs/data/EDGE_CATALOG.md` — seeded from §4 above; Hermes extends it, never deletes.
- `docs/data/VALIDATION_PROTOCOL.md` — §6 expanded to an executable spec.
- `docs/data/METRIC_RELIABILITY.md` — the E-F1 study design (computation lands in P2).

**P2 (engineering, one slice per APPROVE)** — reordered by the volume-beats-rate principle
and pending the E-G1 softness map:
```
0. Validation harness + provenance/known_at tags + q-contamination test   (prereq, small)
1. Weekly NGS SEP on aDOT-catch (#541 upgrade)      — keep as pipe-cleaner  [Grok's #1]
2. est-routes / TPRR exposure offset (E-C1)         — upgrades ALL receiving volume
3. Change-point detector + vacancy elasticity (E-C2/C3) — the freshness edge
4. Dirichlet-multinomial share core (3.2)           — structural; biggest coherence win
5. RZ-share bifurcation into #538/#539 (E-C4)
6. qb_hit / air_yards / shotgun on completions       [Grok's #3]
7. GSE-xYAC residual on the YAC leg                  [Grok's #2]
8. wind/temp on deep rate + aDOT (E-D2, cols in house)
9. Script core + blowout censoring (E-D1, E-C6)
10. Shrunken role DVP (E-E1)
then: Edge Mining Engine (§2) as the standing factory, and the reliability study (E-F1).
```
Each slice: `priced:false`, fail-closed on missing, honesty label when proxy ≠ measured,
tests + typecheck, isolated PR, Grok merges. Unchanged from the 10k-ft rules.

**P3 (L3 contract)** and **P4 (owner/vendor)** — unchanged. The `f(...)` signatures in §3
are already written so SkillCorner frames bind without re-stacking.

---

## 8. Hermes prompt delta (paste into the existing Hermes prompt)

```
## ADDITIONS (Edge Factory)
P1 now has SIX deliverables: the original three, plus
  docs/data/EDGE_CATALOG.md        (seed from docs/data/EDGE_FACTORY_MASTERPLAN.md §4;
                                    extend entries, never delete; every entry keeps
                                    status HYPOTHESIS until it passes §6)
  docs/data/VALIDATION_PROTOCOL.md (expand §6 into an executable spec)
  docs/data/METRIC_RELIABILITY.md  (study design for E-F1; no computation yet)

P2 priority list is REPLACED by §7 of the masterplan. Slice 0 (validation harness +
provenance tags + q-contamination test) precedes every covariate slice.

## NEW KILL CONDITIONS (additive to the existing ones)
- any covariate with provenance MARKET_PROP in p
- mined conditional splits without pre-registered grid + BH-FDR + season sign-stability
- random K-fold CV anywhere; any feature join not respecting known_at at decision time
- Dirichlet share model merged without renormalization + teammate-correlation tests
- publishing or pricing any catalog magnitude still marked HYPOTHESIS
- rediscovering catalog entries (read EDGE_CATALOG.md before proposing "new" edges)
```

---

## 9. What this is not (extending the original list)

Not a SkillCorner purchase, not a Zebra license, not a scraper — unchanged. Additionally:
not a license to p-hack (the FDR/pre-registration discipline *is* the mining engine — a
grid scan without it is worse than nothing), not marketing copy (every §4 magnitude is a
prior; the no-fabricated-stats rule applies to internal docs that could leak into content),
and not a one-time list — if the catalog isn't growing and the scoreboard isn't moving,
the factory is broken, whatever any single model's holdout says.
