# Corpus progress ledger — 2026-08-26

**Purpose:** the founder's standing instruction is to keep marking off real
progress against the corpus as we go, and to never let a negative verdict
(kill/ignore/red) sit unexamined forever — a "doesn't work" finding is a
snapshot against today's model/math/data, not a permanent fact. This doc is
the visible checklist for both halves of that: what's shipped from the
corpus, and what's marked dead that might deserve a second look.

Update this file (don't create a new dated one) as items move between
sections. Source docs: `ORBIT_NEXT_50.md` (triage), `edge/2026-08-26-paper-spec-*.md`
(6 implementable specs), `edge/extraction/2026-08-26-group-*.md` (5 full-text
dossiers), `AGENT_LEDGER.md` (append-only history — never edit past rows).

---

## 1. Extraction status

**44/44 queued corpus items (7 repos + 37 papers) read in FULL TEXT.** Not a
single verdict in `ORBIT_NEXT_50.md` rests on an abs-page or README skim.
15 rows corrected or re-scoped by the deep read; the rest confirmed with
sharper, citable disqualifiers. Closed — nothing left to extract from the
2026-08-26 queue. New links the founder adds go through the same full-text
standard before a row is written.

## 2. Port queue — from extraction to shipped code

Ordered by what's actually landed vs what's next. "Shipped" means committed,
tested, typechecked, on the PR branch — not just specced.

| # | Item | Source | Target | Status |
|---|---|---|---|---|
| 1 | DK two-game roster rule | 2309.15253 (DFS MILP) | `dfs-optimizer.ts` | ✅ **SHIPPED** — commit `1a53c24e`, 26/26 tests, lazy-constraint DP flag, zero perf cost |
| 2 | Empirical-rate teacher + convergence test | 2607.00164 (RLVR) | `empirical-rate-teacher.ts` + `teacher-eval.ts` | ✅ **SHIPPED** — module + 22 unit tests + real-data run. Result: **inconclusive at current n** (see `2026-08-26-EMPIRICAL-RATE-TEACHER-REPORT.md`), not a resolution finding either direction — first run confounded a state-space comparison and self-corrected within the session (v1→v2); next step (paired bootstrap, finer bins, re-run at higher n) named in the report and in §3a below |
| 3 | FL-GUARD negative-update guard | 2403.04146 | `calibration-monitor.ts` | ✅ **SHIPPED** — `checkNegativeUpdateGuard`, 21 unit tests (hand-computed smoothing, median robustness, trigger/cancel hysteresis). Advisory only — emits an alert, does not flip C6 itself. Not yet wired to a live caller (needs a cohort-loss series builder alongside `calibration-regression-snapshot.ts`) or to `agent:eval`'s skill-update guard (the "second target" in the spec) — both are the natural next increments |
| 4 | Plasticity–Stability regression guard | 2503.04638 | re-fit cadence (~250-settled) | ✅ **SHIPPED** — `stabilityPlasticityCheck`, 7 unit tests. Hard gate: forgetting (candidate ECE degradation on the oldest cohort) must be ≤ bound (default 0.01) to be C6-eligible, independent of newest-cohort gains; PS ratio reported as a bake-off diagnostic. Not yet wired to `CALIBRATION_MAP_APPLY_MATRIX.md`'s bake-off table or the trials-registry — next increment |
| 5 | Phase-bucketed ECE audit | 1906.05029 | `calibration-monitor.ts` | ✅ **SHIPPED** — `phaseBucketedCalibrationAudit`, 8 unit tests incl. a constructed masking case (two phases forecast the same p, opposite-direction errors cancel to overall ECE~0 while each phase individually fails by 0.20). GSE has no in-game phases, so "phase" generalizes to any caller-supplied bucket (time-to-kickoff window, sport, pickType) — not yet wired to the real fit-report runbook (needs a time-to-kickoff column on the settled-pick export) |
| 6 | In-game soccer WP lane | 1906.05029 | new `ingame-soccer.ts` | ⏳ QUEUED — extends `dixon-coles.ts`/`poisson.ts`/`elo-estimator.ts` |
| 7 | Numeric-fidelity auditor for content | 2402.10979 (SportsMetrics) | `agent:eval` + numeric-guard | ⏳ QUEUED — deterministic numeral-source auditor + perturbed-fixture lane |
| 8 | Harnessed-elaboration claim verification | 2606.24443 | `numeric-guard.ts` v2 | ⏳ QUEUED — relation-level claims, not just value-membership |
| 9 | CPAE GAM surface | 1906.03339 | fantasy QB/defense factors | ⏳ QUEUED — nflverse aggregates only (image-scraping path is rights-gated, not pursued) |
| 10 | GMM coverage clustering | 1906.11373 | matchup covariates | ⏳ QUEUED — participation/NGS aggregates |
| 11 | DFS percentile benchmark harness | 2309.15253 | `percentile-benchmark.ts` | ⏳ QUEUED — the rule fix (row 1) shipped; the validation harness itself has not |
| 12 | Plan-caching read-only query lane | 2510.07297 + 2508.17157 (SportSQL) | ops query surface | ⏳ QUEUED — merge: SportSQL's eval-harness cliff becomes the admission gate for GridMind's plan-caching blueprint |
| 13 | Security co-violation checklist ordering | 2607.12089 | `audit-secrets`/`audit-stripe` | ⏳ QUEUED |
| 14 | Fail-closed LLM-judge cross-reference | 2606.28570 | `content-engine/` (build-draft → persist-draft) | ⏳ QUEUED |
| 15 | Injury ITS design + check-claims checklist | 1805.01271 | content trust-gate | ⏳ QUEUED |
| 16 | Rare-event props conventions (prefilter, class weights, precision@recall) | 2206.13222 | edge-lab props harness | ⏳ QUEUED |
| 17 | Partial pooling for thin calibration cells | 2608.18430 | `online-beta-recalibration.ts` | ⏳ QUEUED |
| 18 | Close-loss RG covariate + cool-down framing | 2606.18805 | bias-mirror + RG content | ⏳ QUEUED |
| 19 | Coverage-transformer / step-and-turn tracking core | 2603.25901, 2603.17866 | future player-movement models | 🔒 **PARKED, not dead** — blocked on a cleared tracking-data source (Big Data Bowl licenses are research-only); unlocks the moment rights clear, no code work possible before then |

## 3. Second-look register — negative verdicts, re-examined honestly

This is the section that answers "failing doesn't automatically mean it
doesn't work." The test applied to everything below: was the negative result
**power-verified** (a real, well-powered null) or **power-unverified**
(underpowered, undertested, or resting on a stale model)? Only the second
kind goes on the active watch list.

### 3a. Overturned or under active reconsideration

| Item | Original verdict | What changed it | Current status | Next unlock |
|---|---|---|---|---|
| H-F5 MVE (MLB totals, side-selection edge) | KILL (E=0.0055 at n=50) | Independent audit: P(KILL) 99.8% with no edge, 90% with a real +5pp edge (Bayes factor 0.90) — the v2 amendment stripped the test's power; covariates never implemented; cohort deviated from the authorizing instrument | **INSTRUMENT FAILURE / INCONCLUSIVE** — not "no edge exists" | Founder amendment to F-10 (charter miss term restored, covariates implemented, null + planted-edge power tests published) before any re-run — one-shot consumed |
| Calibration Brier floor (0.2466 > 0.22) | RED, "no resolution" | Diagnosed but never independently tested whether raw/PAVA/CIR/q genuinely carry zero information beyond state, or whether the floor is a measurement artifact of only using 10-bin ECE | **TESTED, INCONCLUSIVE AT CURRENT N** — the empirical-rate teacher convergence test ran (v1 confound caught and fixed in-session, v2 fair comparison executed on real data). Every forecaster-vs-teacher gap at n=441/145 sits within roughly one standard error of zero; none is a defensible finding either direction. Full numbers and reading: `2026-08-26-EMPIRICAL-RATE-TEACHER-REPORT.md` | A paired bootstrap significance test (the source paper's own method) + finer confidence bins + re-run at the next ~250-settled cadence — same "test needs more power before it can speak" pattern as the MVE, one level down in stakes |

### 3b. Power-verified negatives — closed, not on the watch list unless new data arrives

These were killed by adequately-powered, pre-registered tests. Re-opening
them needs a genuinely new input (new covariates, a new data source, a
materially larger sample) — not a different model re-reading the same
numbers.

| Item | Verdict | Power evidence |
|---|---|---|
| L-15/L-16 book-microstructure shade + lead-lag (MLB) | DEAD | 11 books × 863–947 labels each, largest \|t\| = 1.48 (nobody clears the bar); 110 ordered pairs, zero raw leads, zero after BH correction |
| L-17 path-geometry → CLV (Track E) | CLOSED, program ends on this corpus | Grouped-CV r=0.091 (< 0.10 kill rule), R² negative, n=203; all 6 features survived decimation and still don't predict — "the geometry is real and uninformative," the strongest form of a negative |
| C-16 calibration-only resolution ceiling | Governing result, not a kill | 0.2556 held-out Brier is *above* uncertainty 0.2499 → DSC−MCB ≈ −0.0057 (negative net skill); mathematically, monotone score-only transforms (isotonic/Platt/beta/Venn-Abers) provably cannot create resolution — this is why E2's covariate ladder exists, not a candidate for re-testing with a different calibrator |

### 3c. 15 wave-5 "NFL"-collision ignores

Already re-verified by full-text read in this session's extraction pass (not
abs-page triage) — two of the batch (FL-GUARD, No-Forgetting) were corrected
out of this bucket into the port queue above; the other 13 (quantum learning
theory ×2, neural-feedback-loops, nerve-fiber-layer, image feature extraction,
sequence simulation, NFL-privacy, math auto-formalization ×2, video
retrieval, stock-market KG, diagnostic reasoning) hold their ignore verdict
with a specific full-text disqualifier recorded per-row in `ORBIT_NEXT_50.md`.
Not on the watch list — re-opening any of these needs a new paper, not a
second look at the same one.

## 4. Founder research asks — where your own digging unlocks the next tier

Standing list; add to it as new blockers surface. These are the places a
different model or more math from *us* can't move the needle — they need
either your research or a decision only you can make.

- **Cleared tracking-data source** (rights, not technical) — unlocks item 19
  above (coverage-transformer, step-and-turn) plus the full-trajectory version
  of the CPAE surface. Big Data Bowl research licenses are not commercial
  clearance; if you know of a licensable NFL/NBA tracking feed, that's the
  single highest-leverage unlock left in the corpus.
- **CLV sharp-anchor decision** — Kalshi-inert vs a licensed Pinnacle feed vs
  self-consensus, needed before the ESTABLISHED (≥500 settled + CLV ≥52.4%)
  sample is built on a specific anchor.
- **F-10 amendment** for a powered MVE re-run (see §3a) — your call, one-shot.
- **Free-tier factor-trail tease** — open since the June workspace dump,
  unresolved (`docs/ops/2026-08-26-WORKSPACE-DUMP-EXTRACTION.md` item 6).

---

*Maintained inline — no dated snapshots of this file. When an item moves
(ships, gets overturned, gets parked), edit its row here in the same commit
as the work.*
