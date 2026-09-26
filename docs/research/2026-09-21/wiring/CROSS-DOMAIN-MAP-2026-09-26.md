# Cross-domain map — 27 papers from Garrett, 2026-09-26

Triage of every paper Garrett sent (29 URLs, 2 duplicates, 27 unique).
Written **before** wiring, so the cross-domain patterns could shape the
work rather than being discovered one module at a time.

All 27 PDFs are on disk at `/tmp/papers/<id>.pdf`. Conversion to text:
`pdftotext -layout`.

## 1. Honest status before any new work

| Status | Count | IDs |
|---|---|---|
| Filed as wired (see §1a) | 11 | 2609.19354, 2609.07617, 2609.04754, 2605.05487, 2603.10916, 2607.00164, 2303.05774, 1710.06551, 2601.18774, 2109.08051, 2601.03099 |
| New, engine-relevant | 10 | 2609.22497, 2608.21530, 2607.08725, 2604.02447, 2602.07030, 2503.04638, 2206.13114, 2206.13222, 2603.17866, 2606.18512 |
| New, weak relevance | 2 | 2609.23158, 2512.16961 |
| New, no engine relevance | 4 | 2607.18394, 2606.31028, 2306.03481, 2403.01607 |

**A filename check is not a port check.** Most of the "already wired" papers
have no file named after their arXiv id — the wave-1 workers used
descriptive slugs. Content-grep resolves it:

- 2605.05487 → `feature-store/src/lopo-gate-2605.ts`
- 2603.10916 → `feature-store/src/rank-fusion-2603.ts`
- 2607.00164 → `prediction-engine/src/calibration/teacher-calibration.ts`
- 2303.05774 → `prediction-engine/src/projections/rookie-combine-prior.ts`
- 1710.06551 → `data-ingestion/src/oddsmaker-entropy-filter.ts`
- 2601.18774 → `feature-store/src/blown-lead-monitor-2601.ts`
- 2109.08051 → `data-ingestion/src/2109-08051v1-tracking.ts` (NFL pass completion from player separations)

## 1a. Ledger audit — one "implemented" claim is false, and the cause matters

This surfaced while resolving the dedup above, and it is the most important
finding in this batch.

`data-ingestion/src/2601-03099v1-tracklet-association.ts` carries a header,
an improvement record, and an acceptance gate that all faithfully describe
**Time-Aware Synthetic Control** — "estimates the counterfactual impact of
starting-QB injuries, coordinator changes, or rule changes on team EPA/play
trajectories with 95% CIs validated by placebo tests", with the gate "median
placebo RMSE beats classical synthetic control by >=10% relative".

The body of that file implements something else entirely: cosine distance
between ReID identity embeddings, a jersey-number auxiliary head, spatial
gating, and greedy bipartite tracklet matching. It is a tracking primitive.
There is no synthetic control in it.

The confirming search:

```
grep -rl "synthetic control|syntheticControl|placebo" packages apps --include=*.ts
-> no matches
```

**The engine contains no synthetic-control implementation at all**, despite
the ledger listing 2601.03099 as implemented.

Likely mechanism: slug-template reuse in the ingestion lane. That directory
holds 477 modules across only 235 distinct slugs, with heavy concentration —
31 files named `tracklet-association`, 24 `team-ratings`, 19 `nlp`, 16
`tracking`, 12 `injury-risk`. A correct header with a generically-themed body
can be produced by stamping paper metadata onto a shared template. The bodies
are not byte-identical (31 distinct hashes across the 31 tracklet files), so
this is not pure copy-paste — but paper metadata and implementation clearly
are not guaranteed to correspond.

**Scope of the claim, stated honestly.** One file is confirmed mismatched by
reading it. 476 unverified. It would be wrong to assert the whole lane is
hollow on this evidence, and equally wrong to keep trusting the dedup list.
The cheap audit is: for each ledger ID, check that the module body actually
contains the paper's named quantity — a synthetic-control estimator, a
placebo distribution, a DoD multiplication, a Spearman rank. Anything that
fails is a ledger overstatement, and that paper is genuinely unbuilt.

Two consequences, both immediate:

1. **2606.18512 is bigger than it looked.** The adjacent method its own
   literature builds on is not in the engine either. The whole prospective
   counterfactual capability — synthetic control, time-aware synthetic
   control, two-way synthetic forecasting — is absent, not partially built.
2. **The 454-module figure in `IMPLEMENTED.md` should be read as "headers
   filed", not "capability shipped", until the body audit runs.**

**Open discrepancy, resolved above in §1a** — 2601.03099 was filed as
implemented but its body implements something else entirely.

## 2. The five cross-domain patterns

These are the things that only become visible when the whole batch is read
at once. Each one spans at least two sports, and three of the five point at
a specific, checkable weakness in how the engine currently validates itself.

### Pattern A — a frozen generator plus a small head; the head does the work

| Sport | Paper | Generator | Head | Reported effect |
|---|---|---|---|---|
| Diving | 2609.19354 | frozen VLMs, zero-shot | supervised regressor | rho 0.32 → 0.67 |
| Football | 2603.17866 | Bayesian step/turn multilevel model | posterior predictive simulation → valuation metrics | novel movement metrics from simulated hypotheticals |
| Football | 2604.02447 | MoG trajectory prediction from a formation | sampled play trajectories | diverse realistic plays for tactical analysis |
| Baseball | 2602.07030 | LLM world model | play-by-play prediction | beats narrow engineered-feature models |

The same architecture in three sports: do **not** retrain the big model.
Generate candidate futures with it, then put a cheap decision layer on top.
The diving paper quantifies the payoff (more than doubling the correlation),
and its corollary is the part that matters for us — **the head is where the
accuracy comes from, so head design deserves more attention than generator
size.** This is the shape of the E1/E2/E3 movement and video builds, now
supported by evidence rather than assumption.

### Pattern B — the evaluation statistic decides what you find, and can hide a real defect

- **2609.19354 (diving):** the best model scored rho 0.6664 with R² 0.2387.
  An R²-based promotion gate rejects it. The same model is either excellent
  or worthless depending on which number you read.
- **2601.18774 (NFL + NBA, blown lead):** the paper is explicit that fixed-time
  calibration summaries and proper scores miss the defect, and only a
  pathwise-extreme benchmark finds it. It found **no global departure in the
  NFL and a systematic excess in the NBA** (upper-5% tail excess 1.3%, 95%
  interval 0.4–2.3%).
- **2609.04754 (cricket, DLS):** a single shared resource table serves both
  men's and women's one-day cricket and miscalibrates one of them, a
  +6.13-run gap at comparable match states.

All three are the same failure wearing different clothes: **an aggregate
metric is blind to a defect that lives in a path or in a subgroup.** A single
engine-wide ECE number cannot see a blown-lead path, and cannot see a stratum
that is systematically off. The 2609.19354 module wired today is the rank
half of this; the stratum half is the natural next piece.

### Pattern C — generalization is across units, not across time

- **2605.05487 (baseball, ball speed):** leave-one-**subject**-out
  cross-validation, explicitly to measure cross-individual generalizability
  of the model. Already wired as `lopo-gate-2605.ts`.
- **2601.18774:** a **season-stratified dyadic bootstrap** specifically to
  account for recurring teams — a team's games are not independent draws.
- **2604.01491 (earlier batch):** cluster bootstrap at the game level for the
  same reason.

The engine validates on held-out time and calls it generalization. These
papers say the question that matters is whether a model transfers to a unit
it has never seen — a new team, a new player, a new market type — and that
clustered observations need a clustered resampling scheme. Directly
actionable against our current backtest design.

### Pattern D — derived capability is a plug-in; never modify the upstream

- **2607.08725 (BioModule):** attaches downstream of *any* 3D pose estimator,
  estimator-agnostic, explicitly no modification of the upstream model.
- **2601.03099:** extends the synthetic-control framework rather than
  replacing it.
- **2609.22497:** adapts a human three-stage deliberation protocol to LLMs
  rather than inventing a new one.

This is independent external support for the repo's existing additive-only
constraint. It is the right architecture for the E3 video pipeline too: the
detector changes, the plug-in must not.

### Pattern E — the market is a reference, and deliberation beats aggregation

- **2609.22497 (Wisdom of Artificial Deliberative Crowds):** a three-stage
  deliberation protocol for LLM ensembles, tested across four domains
  including **Study 4, sports forecasting against a real prediction market**.
  Deliberation reduced collective error *beyond passive aggregation of
  independent judgments*, and individual judgments also improved after
  deliberation.
- **1710.06551 (NFL, already wired):** exploiting oddsmaker biases beat the
  alternatives under the conditions tested.

Pattern E is a real architectural question we have not answered: our ensemble
combines members independently, and this paper says the combination step
itself should be sequential and deliberative. That is testable against our
own market reference, which is the same reference they use.

## 3. Prioritized wiring order

Ranked by engine leverage, not by the order the papers arrived.

1. **2606.18512 — Two-Way Synthetic Forecasting.** The largest unbuilt
   capability. 28k words of source text already on disk from the earlier
   batch, never ported, and its own application is NFL stadium openings. It is
   the prospective-counterfactual engine: what happens *beyond* the observed
   panel, which is the question regime-shift and team-change questions keep
   running into. Pairs naturally with time-aware synthetic control.
2. **2603.17866 — NFL step-and-turn.** Generative hypothetical movement.
   Feeds the movement and video builds directly, and is the football
   instance of Pattern A.
3. **2609.22497 — deliberative crowds.** Tests the ensemble-combination
   architecture (Pattern E) against a real prediction market.
4. **2607.08725 — pose-to-biomechanics plug-in.** The estimator-agnostic
   contract for the tracking/video lane (Pattern D).
5. **2206.13114 + 2206.13222 — multi-agent relational trajectory reasoning,
   and DPI from GPS.** Both direct NFL tracking, both additive to the
   existing tracking dir.
6. **2604.02447 + 2602.07030 — play generation and play-by-play world
   model.** Generation-side capability; pairs with the hypotheticals above.
7. **2503.04638 — buffer-free continual learning.** The continual dir exists;
   this supplies the shared-backbone + task-head protocol.
8. **2608.21530 — tennis injury/readiness ensemble.** Availability modelling;
   needs a founder call before it touches anything health-adjacent.

## 4. Papers that are not being wired, and why

- **2607.18394** (non-Fermi-liquid quasicrystals), **2606.31028** (graphene
  moiré heterostructures), **2306.03481** (entangled data in quantum ML),
  **2403.01607** (respiratory motion for radiotherapy targeting): condensed
  matter, quantum ML, and radiotherapy. No engine path. Recorded here so the
  decision is visible rather than a silent gap in the ledger.
- **2609.23158** (77 GHz radar skin states): physiological sensing via radar.
  Remote availability signal at best, and the measurement chain is
  speculative. Low priority, not zero.
- **2512.16961** (tournament score-set reconstruction): pure graph theory,
  Landau's theorem. There is a faint parlay-leg-combinatorics analogy and
  nothing else. Not worth a module.
