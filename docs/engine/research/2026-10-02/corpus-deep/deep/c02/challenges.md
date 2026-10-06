# c02 Deep Research — Challenges

**Coordinator:** c02 Phase 2+ (session cbb07087) · **Date:** 2026-10-02
**Purpose:** every weak, contradictory, or unverifiable claim found during verification. A challenge is not a rejection — it is a build gate: the item is not wired until the challenge is answered.

---

## From a03 (INT model / projection_methods.md)

- **CH-INT-1 — The 52.3% conversion is an unverifiable constant.** Stated once (L180), no n, no denominator, no sample definition. Cannot be audited or reconditioned. **Gate:** recompute worthy→INT conversion from the FTN join with stated filters before use; test situation-conditional conversion rather than assuming invariance.
- **CH-INT-2 — Baseline-only by construction.** The recipe answers "how many INTs per game" as one scalar. All situational dimensions must be built fresh — the doc provides the join key and filters, not the splits.
- **CH-INT-3 — Garbage-time inconsistency inside the doc.** Volume projections get the unfiltered/filtered ratio (Allen 195→201), but the INT recipe's exposure inputs (27.0, 34.2 dropbacks) are filtered-sample with no visible garbage multiplier. Numerically immaterial here, but principle-level: exposure must be full-game for settled props.
- **CH-INT-4 — The sticky-signal assumption is asserted via literature, not measured in-file.** Worthy-rate-as-skill leans on cited literature + one cross-sectional example (Allen vs Goff). No YoY worthy-rate stability number, no QB-level conversion-persistence test in the file. **Gate:** measure both before wiring weights.
- **CH-INT-5 — Single-game INTs are Poisson noise (doc says so twice).** Situational INT models must output wide bands and be scored over large samples. Project *rates*; game-count point estimates are theater.
- **CH-INT-6 — The hurry blind spot is structural.** nflverse has no hurries; `qb_hit`/sack are floors. A pressure-conditioned INT model on nflverse alone systematically undercounts pressured dropbacks. True pressure conditioning needs charting with hurries.
- **CH-INT-7 — Throwaway / `cp`-NA handling absent from the doc.** Any CPOE-style feature built downstream must handle `cp` = NA on throwaways explicitly (exclude vs treat-as-incomplete changes the denominator).
- **CH-INT-8 — No aggressiveness % usage.** Tight-window/aggressiveness interaction for situational INT is greenfield, not verified here.

## From a04 (completion model / arXiv:2109.08051)

- **CH-COMP-1 — The 0.998 calibration is weaker than it looks.** Pearson 0.998 on *binned means* of per-frame P(C|T=i) vs empirical completion %, with massive within-play frame correlation inflating effective n. Honest discrimination number is the play-grouped frame AUC 0.8829.
- **CH-COMP-2 — Single-season, single CV family.** 2018 only; LGOCV grouped by play within one season; no out-of-season test (authors admit). Era/style overfit risk unmeasured.
- **CH-COMP-3 — The 86.92% target-ID is post-release identification, not prediction.** Answers "whose trajectory matches the ball's" after the throw — useless for pre-throw decision modeling; requires live tracking.
- **CH-COMP-4 — Ledger Test 1 gate (target-ID ≥ 85% on 2024 tracking) is vacuous without a tracking feed.** On nflverse pbp alone Stage 1 cannot be reproduced at all.
- **CH-COMP-5 — Ledger §11 effort estimate ("low-medium") understates the skill-prior work.** The Python port is low-medium; the receiver/CB prior machinery (hierarchical modeling, weekly updating, PFR join, participation mapping) is medium, ~2–4 engineer-weeks incl. validation. (INFERENCE)
- **CH-COMP-6 — Map finding #10's "frame-by-frame" qualifier matters.** 20 of 32 features + the entire Stage-1 apparatus are tracking-bound. The map is accurate but a reader could infer the whole pipeline ports. It doesn't.
- **CH-COMP-7 — Public/private doctrine collision.** The paper is NGS-data-native. Any build ingesting NGS tracking stays 100% internal: website shows only projections/rankings, never completion-probability machinery or NGS names.
- **CH-COMP-8 — Test 2 gate (AUC +0.01 from talent priors) must be measured vs nflfastR `cp` on a true future-season holdout**, not vs the paper's 0.8829 — different tasks, different grains.

## From a02 (NGS replacement spec)

- **CH-NGS-1 — The heuristic profile source is missing from the checkout.** `agents_website_list/AdvancedDataEnrichment.py` does not exist in `~/workspace/vendor/Sports`. The deep-2.5s/short-3.0s/intermediate-4.0s profile, the inversion critique, and the "seconds before snap" misdefinition are all conditional on an unverifiable module. The 35–43% arithmetic is exact *if* the 4.0s constant is as stated.
- **CH-NGS-2 — The pinned TTT band is season-aggregate, not weekly.** Both rows are 2025/REG/week-0 (full-season aggregates). Says nothing about week-to-week variance at the player-week grain. Weekly TTT features need small-sample guards.
- **CH-NGS-3 — "Intermediate depth" is the spec author's framing, not an NGS category.** Do not generalize "9.1 air yards = ~2.8–3.0s" into a rule.
- **CH-NGS-4 — nflverse pbp CPOE ≠ NGS CPOE.** Different estimators. Using pbp `mean(cpoe)` and calling it `cpoe` is exactly the substitution failure the governing rule forbids. Suffix discipline (`_nflverse_pbp`) is mandatory.
- **CH-NGS-5 — TTT has no honest pbp proxy.** Nothing in nflverse measures snap-to-release. Emit NULL, never a proxy.
- **CH-NGS-6 — The "two quarterbacks" are the only real rows in the fixture.** Third row ("Low Volume QB", XXX) is synthetic scaffolding.
- **CH-NGS-7 — Upstream CSV has fields the Prisma table drops** (`avg_air_yards_differential`, `max_completed_air_distance`, `efficiency`, ...). Dropped at ingestion; do not assume queryable.

## Cross-cutting (coordinator)

- **CH-X-1 — Pressure definition schism.** The phase-1 pipeline uses `qb_hit` as the pressure proxy; the FTN charting has no hurry flag either (only `n_blitzers`/`n_pass_rushers`); the c02 spec (a01, pending) may demand FTN join coverage. Three different "pressure" definitions are in play across the program. **Resolution rule (from NGS-3/NBS naming contract):** every pressure metric carries its definition in the name — `pressure_floor_pbp` (sack+hit), `pressure_ftn_blitz` (n_blitzers>0), never bare "pressure."
- **CH-X-2 — The 0.523 conversion and the hurry blind spot compound.** If worthy throws under pressure convert differently AND pressure is undercounted, a flat 0.523 on a `qb_hit`-defined pressured cell is wrong twice. **Gate:** measure conversion by pressure cell before shipping any pressure-conditioned INT rate.
- **CH-X-3 — Season-level vs week-level grain mismatch.** Phase-1 metrics are per-QB-season; the reasoning spec's T1 test needs pre-kickoff (weekly) inputs; the trust-target module needs weekly series. Season aggregates cannot answer "what has he done the last 3 weeks." Weekly computation with small-sample refusal (NGS-10) is the required grain.
- **CH-X-4 — `read_thrown` (FTN) vs first-read proxies.** FTN charting has `read_thrown` (which read the QB threw on) — a direct first-read measurement the phase-1 pipeline lacked. But FTN coverage is 2022+ and join completeness is unverified. **Gate:** measure join coverage (nflverse dropbacks with matched FTN rows) before treating `read_thrown` as a first-read feature.
- **CH-X-5 — Stale-number hazard (from c02 map).** Several high-value docs are archival snapshots. Any number quoted from a 2026-05/06/07 doc must be re-verified against the live repo before wiring.

## Pending analysts

All six analyst reports are in. Resolved below.

## a01 — Pressure indices (from `work/a01-pressure-indices.md` §4)

- **CH-PRESS-1 — The data premise fails verification (highest severity).** The proposal's load-bearing premise ("datasets already in the ingestion registry", `pfr_advstats` "live in `lib/nflverse/pressure-coverage.ts`") is unverifiable in this checkout: no `lib/nflverse/`, no `pressure-coverage.ts`, no ingestion-registry artifact, zero `pfr_advstats` references. The proposal was written against a different branch/state. Do not schedule the build as if the premise holds.
- **CH-PRESS-2 — Index 1 unbuildable from nflverse; "No new sources" is in direct tension with it.** The nflverse FTN release has no per-play pressure field (PRESS-7); pbp has only `qb_hit`; `pbp_participation.was_pressure` is post-season-only. Charting from outside nflverse is mandatory for the spec's charted sensitivity — which is a new source in practice.
- **CH-PRESS-3 — The `qb_hit` proxy violates the spec in letter and substance.** Letter: the spec mandates an FTN-charting clean/pressured split with a 95% join guard. Substance: hit ⊂ pressure; hurries misclassified as clean attenuate sensitivity toward zero; team-week grain ≠ per-QB estimand. Any stopgap is `hit_rate_proxy`, never `sensitivity`.
- **CH-PRESS-4 — QB-quality confounding is unaddressed.** Three channels, none in the file: level confound (bad QBs degrade more AND start lower), exposure confound (worse QBs face more pressure from worse situations — the two means are not situation-matched), behavioral confound (QBs who hold the ball cause their own pressure). The spec's stated weakness covers line-contamination of the clean baseline, not the cross-QB confound.
- **CH-PRESS-5 — The 100-pressured-dropback guard overselects QBs in bad situations.** Bad QBs behind bad lines reach 100 pressured dropbacks faster — the published leaderboard is exactly the population where the file's own "conflates QB and line" weakness bites hardest. (INFERENCE)
- **CH-PRESS-6 — Blitz rate is endogenous.** Defenses blitz bad lines/statuesque QBs more and punish-proof QBs less. The residual "losing one-on-ones" reading of Protection Stress treats blitz rate as exogenous exposure. It isn't. (INFERENCE)
- **CH-PRESS-7 — QB-fault sacks inflate Protection Stress.** PFR `times_pressured` includes sacks without fault attribution; a QB who holds the ball makes his *line* look stressed — the mirror image of Index 1's conflation, unstated in the file. (INFERENCE)
- **CH-PRESS-8 — Time-to-throw confound on Protection Stress.** Quick-game offenses suppress pressure and blitz effectiveness; the league regression pools them with deep-drop offenses, so residuals partly measure scheme, not trench play. (INFERENCE)
- **CH-PRESS-9 — Unsigned spec ambiguities for the owner:** dropback definition; EPA variant; join key; traded-QB handling; as-of/freshness rule vs the 48h charting lag; Index 2 rate denominators; OLS weighting/intercept/fit-pool inclusion; REG-only restatement for Index 2; fit-quality gate for the early league regression.
- **CH-PRESS-10 — "Higher = more pressure-fragile" bakes in a causal reading of a descriptive gap.** Neutral display name: "larger degradation." The file's own weaknesses undercut the "fragile" label.
- **CH-PRESS-11 — Stat Stability Grade may not compose.** The proposal surfaces values "carrying the Stat Stability Grade (existing)" but never checks the grade covers a *difference of two means* (~√2× the noise of components). (INFERENCE)

## a05 — Trust-target (from `work/a05-trust-target.md` §4)

- **CH-TRUST-1 — The PRFFBall triple is attributed, not corpus-verified.** n=25, nested conditioning (16/25 → 16/19), @FantasyPtsData's definitions not in the corpus, not wired (backlog item 31). Treating it as a fact without recomputation is the M89 "single unverified constant" failure pattern. Gate: pre-registered backtest on 2021–2025.
- **CH-TRUST-2 — Wiring-backlog definitions are missing.** Item 31 references first-read targets, air-yard share, TPRR without defining any — a "wiring target that is not yet a specification." The corpus catalogs the rule but cannot build it.
- **CH-TRUST-3 — Receiver-side splits have no QB-side complement.** Coverage-shell TPRR/YPRR deltas (JSN, Sutton, McConkey) describe the receiver's menu, not the QB's reads. Without QB-side splits by shell the behavioral story is half-written; joint coverage×read data is greenfield.
- **CH-TRUST-4 — First-read coverage is thin and misaligned.** The only first-read series is one third-party week (W1 2026, n≈28–42 reads/QB); FTN `read_thrown` starts 2022 with unverified join coverage; pbp cannot observe reads. Three sources, three eras, no overlap — no cross-source validation exists.
- **CH-TRUST-5 — Air-yard share ≠ trust share.** A 35% air-yard share can be three deep shots; a possession receiver can lead targets at 18% air-yard share. The triple's legs measure different things; backtesting should decompose leg contributions, not just the conjunction.
- **CH-TRUST-6 — The "charted vs pbp_proxy" boundary is load-bearing.** Averaging FTN `read_thrown` with a pbp band-proxy produces a number that is neither charted nor pbp-native. `read_thrown` validates the proxy; it never joins it.
- **CH-TRUST-7 — No persistence evidence for HHI/top_share.** The module's core claim (concentration is a behavioral trait) has zero week-to-week autocorrelation evidence in the corpus. If hhi doesn't persist, it's descriptive, not predictive. Gate: report autocorrelation before any predictive use.
- **CH-TRUST-8 — The Dirichlet-multinomial gap is real program-wide.** Searched all 300 briefs: genuinely absent. If the share module shows small-sample blowups, the owner decision is adopt (new method) vs ship-with-refusal (current design). Named, not hidden.

## a06 — INT situational (from `work/a06-int-situational.md` §5)

- **CH-SIT-1 — The 52.3% constant is the M89 single-unverifiable-constant pattern.** No n, no denominator, no sample window, no pressure split. Using it on a pressure-conditioned cell compounds two errors (CH-X-2). Display-lane only; engine uses occurrence.
- **CH-SIT-2 — Blitz splits are rights-gated, not data-gated.** nflverse has no blitz column; FTN `n_blitzers` is CC-BY-SA display-only. Engine blitz splits need a founder decision — this is a rights question, not an engineering one.
- **CH-SIT-3 — Score-differential cells are endogenous.** Teams trailing throw more (BUF 61.8% vs 50.0% leading) into worse looks; the INT rate in "trailing" cells mixes QB risk-taking with situation-forced throws. The EB ladder shrinks the noise but not the confounding.
- **CH-SIT-4 — Pressure-floor × INT cells are attenuated toward zero.** The clean cell contains unflagged hurries; the pressured cell misses hurries. The contrast is conservative — reported bands must say so, or users will read "no pressure effect" as a finding.
- **CH-SIT-5 — The complementary value (+0.6–1.0 pts/drive) is a paper estimate, not a GSE measurement.** 0678's ordinal-regression estimate on their sample; transport to 2026 game states is INFERENCE. Use as a prior, not a constant.
- **CH-SIT-6 — Poisson bands on single-game INTs are wide by construction.** The module must refuse point estimates for single-game INT counts. Doc states it twice; the build must enforce it (NULL or band-only, never a point).
- **CH-SIT-7 — 3-season pooling vs regime change is a judgment call.** The denoised-rate auditor's regime-break handling is precedent, not proof. Backtest the pooling window before locking it.
