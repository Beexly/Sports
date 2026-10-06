# News/Social Signal Methods — c06 Deep Research

**Scope:** the social-signal half of trust-signal intake. Sibling module (c05) owns raw text/news intake; this lane covers turning social/news content (the 6 X intake accounts in `~/workspace/corpus-intelligence/intake/x-intake-registry.md`) into structured, scored, provenance-auditable trust signals.

**Date:** 2026-10-02. All numeric claims below were spot-verified against the source deep-read ledgers in `~/workspace/vendor/Sports/docs/` (read-only) unless marked INFERENCE.

---

## 1. Verified claims

### 1.1 LEAP (0440-leap-likelihood-elicitation-and-aggregation-for.md) — VERIFIED

Spot-check against the ledger (grep of the source file confirmed every number below):

- **ECE halved:** GPT-5.4-mini, diagnostic subset: ECE **0.1840 → 0.0876**; Adaptive ECE 0.1765 → 0.0912; overconfidence 0.3167 → 0.1500.
- **Brier −16.5:** external agent frameworks macro-average: **0.4806 → 0.3157** (−16.5); FutureX +9.8, Accuracy +4.7, Spherical +14.1, NCRPS −12.9.
- **"Prior carries the weight":** ablation removing the prior drops FutureX below the monolithic baseline (**0.6427 vs 0.6512**, ECE 0.2134) — the prior is the load-bearing component. Removing dependency clustering: ECE 0.088 → 0.158. Removing reliability sampling: ECE → 0.1219.
- **Controlled comparisons:** LEAP (0.7284/0.2057/0.0876) beats prior-matched Monolithic (0.6742/0.2510/0.1508), budget-matched Monolithic (0.6736/0.2497/0.1471), and linear opinion pool (FX 0.7284 vs 0.6808, ECE 0.0876 vs 0.1117).
- **Robustness:** all cells averaged over N=5 seeds; median run-to-run σ≈0.010; ordering preserved in 48/50 cells. Gains hold across FutureX/GAIA/BrowseComp sources (LEAP ECE 0.1010–0.1090 vs Monolithic 0.1600–0.2050).
- **Cost:** 11,508 tokens/task vs 5,733; median latency 10.4s vs 6.2s (~2×).
- **Key mechanism details:** posterior P(θ|E) ∝ P₀(θ) ∏ Pi(ei|θ); continuous τ_post = τ0 + ηΣτi; temper η default 1.0; role weights w_i ∈ [0.05, 1.5]; outlier rejection (>4 prior σ from μ0); reliability sampling (R repeats, agreement shrinks likelihoods); dependency clustering (one representative per source group; domain clustering gave best ECE 0.0798 but authors default to source-key); LOO auditability Δj = μ_post − μ_post^(−j).
- **Already drafted for NFL:** the ledger's "paper's-improvement experiment" (lines 66–72) specifies the exact NFL port: 2024–2025 regular-season games, evidence = Grok daily briefs + pre-kickoff injury reports (frozen corpus), baseline = engine probability alone, metric = Brier + ECE on {cover} outcomes with per-game evidence freeze, ablate the prior. ADOPT gate: Brier improvement ≥0.010 AND ECE ≥25% relative improvement; ADAPT-fallback: overconfidence drops ≥30% relative with accuracy preserved → adopt as calibration/auditability layer only; REJECT if Brier worsens, or if removing the engine prior performs comparably (LLM evidence adds nothing beyond the prior), or if cost exceeds $0.50/game without a Brier gain. Second direction in-ledger: replace fixed likelihood-mapping constants with per-source-tier shrinkage fit on 2024 Brier (meta-calibration), evaluate on 2025.

### 1.2 Kampakis & Adamides Twitter-predicts-football (0841) — VERIFIED, with the ledger's own limitations intact

- **Numbers confirmed:** 1,975,614 tweets, 2014-03-21 → 2014-05-11 (EPL 2013–14); Twitter-only RF **65.6% ± 4.33%** accuracy, **κ=0.25 ± 0.093**; historical-only NB 58.9% ± 5.97%, κ=0.239 ± 0.075; combined RF **69.6% ± 2.4%**, κ=0.28 ± 0.065. Pipeline: CMU ARK TwitterNLP POS tagger (adjectives/verbs/nouns/adverbs/interjections/emoticons) → Porter stemming → chi-square-ranked bigrams, ~11–15 features per side → RF/NB/LR/SVM, 100 seeds, LOOCV.
- **Limitations confirmed in-ledger (these are real, not hand-waving):** ~90 matches (3 months, one season), high variance; **feature selection (chi-square over the whole corpus) likely outside the CV loop → optimistic bias**; no time-ordered split; **never tested against odds**; authors themselves note the Twitter RF "may predict the majority class often" (high accuracy, modest kappa); Liverpool 426,457 tweets vs Fulham 15,530 (popularity confound); 2014 Twitter ≠ 2026 X.
- **The ledger's NFL port spec (c05's sibling lane should own the build):** 2024 NFL season, X team-mention tweets in 72h pre-game window, time-ordered CV (train weeks 1–12, test 13–18), baselines = historical-stats model AND the market. ADOPT only if combined-model κ beats stats-only κ by ≥0.03; **REJECT if sentiment features add nothing once market lines are included** — "the real baseline — the paper never tested against odds."

### 1.3 NFL fandom emotional arcs (1119) — VERIFIED, descriptive only

- Sentiment (winner/loser): pregame **6.14/6.09**; halftime **5.86/5.80**; end **6.12/5.77** — winners rebound, losers stay depressed. Inside-fandom vs overall sentiment Spearman **ρ=0.85, p<0.001**; win% vs sentiment Pearson **0.33**.
- **Status:** observational/descriptive, zero predictive validation in the paper; 2011–2014 Twitter Decahose data; lexicon sentiment fails on sarcasm; the ledger's own "method fix required: replace lexicon with sports-tuned transformer sentiment."

### 1.4 Supporting corpus methods (verified via briefs)

- **BoRaEM per-source reliability (0530):** first corpus method to jointly estimate item ratings AND per-source reliability (P(w≻l;s) = σ(β_s(r_w − r_l)), EM with closed-form M-step). But honest caveats in-ledger: real-data gains over plain BT are tiny (+0.20%), the method optimizes rank not calibrated probabilities (needs a separate logistic calibration step), and β should be clipped to [0,1] for analysts (adversarial β∈[−1,1] not operative).
- **Corrected forecast combinations (1556):** γ=0.5 error correction cut MSFE ~50%; usable as a downstream layer on the social-fused forecast. Outlier caveat: correction hurts after |e_t|>3σ weeks — skip rule required.
- **Entity Graph proposal (r16/entity-graph):** 28 canonical entity types including `rumor_cluster`, `article`, `reporter`, `source`, `injury`, `transaction`; `EntityRef` = {entityType, entityId, displayName, resolvedAt, sourceTier (1–6)}; entity-resolution + staleness rules. **Status: PROPOSAL, not implemented** — schema-bearing, but no working code.
- **Signal Ledger proposal (r16/signal-ledger):** append-only 30+ event-type lifecycle (intake → processing → review → publication → settlement), `LedgerEntry` carries entityIds + evidenceIds + modelVersion, corrections are new entries (never edits), calibration feedback loop (confidencePredicted vs settlement). **Status: PROPOSAL — schema does not exist in the database; six prerequisites enumerated; BLOCK-2 tracked.**
- **Source discipline (d22/report):** confirmed-vs-inferred-vs-unknown/proprietary claim labeling throughout the creator reverse-engineering mission — this taxonomy is the trust-signal analog for source-verification status.

### 1.5 Sentiment grep — completeness check

`grep -rli "sentiment"` across all 300 c06 briefs returned exactly 3 files: **0841** (Twitter prediction), **1119** (fandom arcs), **1522** (FRED "Consumer Sentiment" — macro indicator, false positive, irrelevant). Nothing in the social-sentiment lane was missed.

---

## 2. Transfer assessment: LEAP → trust-signal scoring

### What transfers honestly (the mechanism, not the numbers)

LEAP's architecture is the closest thing in the corpus to a news-fusion layer, and the mapping to the X intake registry is nearly one-to-one:

| LEAP component | Trust-signal analog |
|---|---|
| Engine prior P₀(θ) | GSE's existing game/prop probability (the engine prior) |
| Per-evidence-item isolated LLM likelihood | One isolated LLM call per intake item: elicit directional likelihood (P(item \| θ) parameters) around the engine prior — **not** raw sentiment |
| Tempered conjugate update (η, τ accumulation) | Posterior trust score with a temper knob; η<1 for high-noise social sources |
| Dependency clustering (one rep per source group) | Quote-tweet cascades of one @mysportsupdate report = one cluster; correlated beat-writer errors clustered by beat (the ledger's own "beyond the paper" direction) |
| Outlier rejection (>4 prior σ) | Single viral post can't swing a QB trust score beyond 4 prior-σ |
| Reliability sampling (R repeats, agreement shrinks likelihoods) | Re-elicit the same item R times; low-agreement items get shrunk likelihoods — a built-in hedge against LLM stance noise |
| LOO Δj per item | **The provenance bridge:** per-item contribution to the posted score, each traceable to a source URL |
| Ablation "prior carries the weight" | Design consequence: this layer calibrates the engine prior with news; it cannot create signal the engine lacks. If GSE's prior is bad (slice verdict: Brier 0.275, RES≈0 is the binding constraint), LEAP-style fusion will not fix it |

### What does NOT transfer (honest boundaries)

1. **Domain gap:** LEAP was validated on 347 forecasting/info-seeking tasks (FutureX, GAIA, BrowseComp) — not on NFL games. The ECE 0.1840→0.0876 halving and −16.5 Brier are paper-domain numbers; **they are not an expected GSE outcome.** INFERENCE: on NFL {cover} outcomes, where the market is the strongest public prior (0670 ŵ=0.000) and the engine's own bar is Brier 0.2237 vs spread-bucket 0.2120, the marginal gain of news fusion is likely much smaller. The ledger's own gate (Brier ≥0.010 improvement on 2024–2025) is the honest test.
2. **Prior-quality dependence is a two-edged sword:** the ablation shows the prior is load-bearing. For the QB-behavioral program, the "prior" is the engine's existing probability — if that probability is itself a de-vigged market read (the d16 verdict: displayed prob = market prob because model confidence is inverted), then news-fusion is calibrating *the market*, and beating the close requires the news to contain something the market missed before kickoff. The window for that is: injury/role news the market hasn't priced + expert disagreement (e.g., @the_waldman's sims diverging from Vegas prop lines — exactly the registry's TRUST-SIGNAL note).
3. **Cost structure:** ~2× tokens per item. At weekly NFL scale (dozens of items from 6 accounts) this is affordable; at firehose scale (all X team-mention tweets, à la 0841) it is not. INFERENCE: LEAP-style per-item elicitation is the right mechanism for the 6-account expert intake (small-N, high-value items), and the wrong mechanism for bulk fan sentiment (big-N, low-value items) — those get the 0841-style batched feature pipeline instead.
4. **The dependency assumption is only partially patched.** LEAP's conditional-independence assumption is "working," with clustering as the patch. Social news is maximally correlated (one Schefter tweet → 500 quote posts). Domain-clustering gave the best ECE (0.0798); for NFL, cluster by story/beat, not by domain. The ledger's in-progress direction (hierarchical evidence grouping by beat-writer beat) is the right one and should be specified in the build: one representative per story-cluster, cluster-level likelihood, not item-level.

### Transfer verdict

**ADAPT the mechanism, do not adopt the numbers.** Build: engine probability as prior → isolated per-item LLM likelihood elicitation on registry items → story-clustered tempered Bayesian posterior → LOO Δj audit trail. Run the ledger's specified 2024–2025 backtest protocol before any production weight. Everything else (per-item elicitation on bulk fan tweets, expecting ECE to halve on NFL games) is INFERENCE and would be inflation.

---

## 3. Pipeline-stage analysis: corpus-backed vs greenfield

Stages: **ingest → dedup → entity-tag → stance/trust-classify → score → attach to QB/coach profiles.**

### Stage 1 — Ingest: corpus PARTIAL, infra GREENFIELD

- Corpus-backed: LEAP's evidence-collection stage (ReAct loop, one evidence set E per task, temporal isolation audit — the "per-game evidence freeze" in the NFL port spec). 0841's collection protocol (team hashtags, multi-team tweet discard, nickname-collision filtering, 72h pre-game window) is a dated but real template for bulk collection.
- Greenfield: the actual feed. The registry is explicit: X direct fetch is blocked from this environment (upstream_fetch_failed, 2026-10-01); the lane needs an X-accessible environment (X API key, or mirror fallback chain twstalker→xstalk→instalker). Mirrors are already showing fragility (403 on @the_waldman post 2105678944465027107; chart image unreadable on the @throwthedamball post). **This is the #1 hard dependency — no live feed, no pipeline.**
- Existing: item files land in `~/workspace/corpus-intelligence/intake/items/<handle>/YYYY-MM-DD.md` with post text/URL/timestamp + track tags. That's the intake sink; keep it.

### Stage 2 — Dedup: registry rule BACKED, semantic dedup GREENFIELD

- Corpus-backed: registry rule "key on X post ID, never re-ingest" (mechanical, solid). LEAP dependency clustering (one representative per source group) covers *correlation*, but dedup-before-scoring of quote-tweet/paraphrase cascades across mirrors is greenfield. INFERENCE: near-duplicate text matching (paraphrased reposts of the same injury report across @mysportsupdate, beat writers, aggregators) needs a similarity stage the corpus doesn't specify; the honest design is story-clustering at ingest (shared source event → one cluster ID) rather than pure post-ID dedup.

### Stage 3 — Entity-tag: schema BACKED, implementation GREENFIELD

- Corpus-backed: the entity-graph proposal gives the schema (28 types incl. `rumor_cluster`, `article`, `reporter`, `injury`, `transaction`; canonical UUIDs; `sourceTier` 1–6 on every observation; staleness rules; relationship integrity). The registry's track tags (QB-BEHAVIOR, COACHING, OL, TRUST-SIGNAL, SCHEME, NEWS) are a working taxonomy already in use.
- Greenfield: the NER itself — resolving "Rodgers," "Hurts," "the Eagles' left guard" to canonical player IDs from X text, disambiguating by team/position, mapping coordinator→scheme. Nothing in c06 implements this; the entity graph is a proposal. This is the biggest greenfield stage, and it's a prerequisite for profile attachment (Stage 6).

### Stage 4 — Stance/trust-classify: method BACKED (LEAP), taxonomy GREENFIELD

- Corpus-backed: LEAP's per-item isolated likelihood elicitation is the right primitive — elicit *likelihood parameters conditioned on the outcome*, not sentiment. 0841's POS-filtered bigram sentiment is the naive baseline to surpass, and 1119's lexicon approach is explicitly marked for replacement with a sports-tuned transformer. 0530 BoRaEM provides the per-source reliability weight mechanism (with the [0,1] clip and logistic-calibration caveats).
- Greenfield: the stance taxonomy itself (e.g., item SUPPORTS/REFUTES/NEUTRAL/AMBIGUOUS a specific QB-behavior claim), and the mapping from the 6 accounts' heterogeneous content types to a common elicitation prompt. The registry gives the content-type map: @throwthedamball (OL chart numbers → structured data extraction), @the_waldman (sim projections vs Vegas lines → model-disagreement signal), @mysportsupdate (breaking transactions/injuries → event items), @doug_clawson (historical comps → base-rate priors), @shauncore (All-22 officiating/formation → scheme items). INFERENCE: each lane needs its own elicitation template; a single generic "classify this tweet" prompt will not capture a guard island-rate chart vs a prop-line disagreement.
- Important conceptual distinction (verified across the corpus): **expert-model disagreement (registry accounts) is not fan sentiment (0841/1119).** The trust signal lives in the former. Treating Waldman/Fortgang items with a sentiment classifier would be a category error; treating bulk fan tweets with per-item likelihood elicitation would be a cost error.

### Stage 5 — Score: method BACKED (LEAP + composition chain), NFL evidence GREENFIELD

- Corpus-backed: tempered conjugate update, η default 1.0, role weights w_i∈[0.05,1.5], >4σ outlier rejection; downstream 1556 γ=0.5 error-correction; 1169 log-pooling; acceptance gates everywhere (0670 ŵ-vs-close benchmark protocol: fit the engine-vs-market weight — if ŵ≈0, the social layer adds nothing over the close; 1614 Φ spread→win map as the null; slice publish floors Brier ≤0.22 / ECE ≤0.05).
- Greenfield: NFL validation. The ledger's 2024–2025 protocol is specified but not run. No evidence yet that per-item news likelihoods move NFL Brier. INFERENCE: also greenfield is the per-source-tier shrinkage (the ledger's "beyond the paper" meta-calibration direction: learn a per-tier shrinkage parameter on 2024, evaluate on 2025) — specified as a direction, not built.

### Stage 6 — Attach to QB/coach profiles: schema PARTIAL, wiring GREENFIELD

- Corpus-backed: entity-graph relationships (coach affects scheme; coordinator defines scheme; scheme affects player usage) give the attachment schema; the c06 map names the QB-behavioral primitives this lane should feed (age-conditional target distribution, coverage×situation tendency cells, first-read rates, absence-driven concentration deltas, old-QB RB dump rate). Registry items tagged QB-BEHAVIOR/TRUST-SIGNAL already cross-link into profile dirs by spec.
- Greenfield: the actual wiring from scored items to profile fields. Also a slice-level gap flagged in the c06 map: trust-concentration (HHI) has no in-slice methodological counterpart — the social pipeline can score *agreement/concentration of expert opinion* (e.g., 4 of 6 sources aligned on a QB role change), but the metric itself is novel construction. INFERENCE: "expert consensus concentration" as a trust signal (analogous to HHI) is a defensible greenfield metric — % of source weight on one side of a claim — with LEAP's role weights as the weighting scheme and LOO Δj as the disagreement detector.

---

## 4. Provenance design

**Requirement (registry, non-negotiable):** every item carries its source URL or a PROVENANCE-GAP note. Never invent post content; if a mirror fails, log the gap and move on.

### The provenance chain (item → score → audit)

1. **Intake record** (exists per registry spec): `intake/items/<handle>/YYYY-MM-DD.md` — post ID, post URL, timestamp, raw text (or PROVENANCE-GAP), track tags, one-line intelligence note. This is the immutable evidence layer; nothing downstream may alter it.
2. **Story cluster ID:** story-level clustering assigns each item to a `story_cluster` (e.g., `rodgers-shoulder-2026-10-01`). LEAP's dependency-clustering becomes: one likelihood elicitation per story-cluster representative, with the cluster's member URLs listed. This prevents 500 quote-posts of one report from counting as 500 evidence items.
3. **Elicitation record** (new, per item/cluster): `{ item_url | PROVENANCE-GAP, entity_refs[], elicited_likelihood_params, reliability_samples_R, agreement_score, cluster_id, source_tier, role_weight_w_i, elicited_at, model_version }`. Items with PROVENANCE-GAP get `w_i` pinned to the 0.05 floor (LEAP's role-weight range) — they can enter the record but cannot move the posterior meaningfully.
4. **Posterior update log** (new): `{ prior, posterior, eta, per_item Δj (LOO), timestamp }`. The LOO Δj per item is the audit receipt: for any published trust score, enumerate every item that moved it and by how much, each with its source URL or gap note. This is LEAP's strongest provenance property and should be the headline guarantee of the layer.
5. **Signal-ledger entry** (r16 schema when built): append-only, `evidenceIds` pointing at intake records, `entityIds` at canonical entities, `modelVersion` stamped. Corrections are new entries referencing the corrected one — e.g., when @matt_barlowe's lane is resolved (currently PROVENANCE-GAP, Tier 4 monthly verification), or when a story is retracted, the correction propagates as a new ledger event, never a silent edit.

### Gap propagation rules (INFERENCE, proposed)

- Any item with PROVENANCE-GAP: `w_i = 0.05` (floor), flagged in the LOO audit trail as gap-sourced.
- The two known registry gaps (@the_waldman post 2105678944465027107, 403; @throwthedamball post 2105612970453574116 chart image, unreadable) must enter the pipeline as gap items if used at all — no inferred content may carry non-floor weight. (The registry already marks the Waldman post content as INFERENCE; that marking must survive into the scoring record.)
- Source-tier mapping (INFERENCE): Tier 1 daily accounts (@throwthedamball, @mysportsupdate) default to higher w_i; @matt_barlowe (Tier 4, unconfirmed) stays at floor until verified. Long-run, replace fixed tiers with the ledger's meta-calibration direction: learn per-source-tier shrinkage on 2024 outcomes (BoRaEM-style), evaluate on 2025.

---

## 5. Challenges (honest)

1. **No live feed.** X direct fetch is blocked from this environment; mirrors are already failing (403s, unreadable chart images). The entire pipeline is speculative until an X-accessible environment (API key or phone/browser session) is wired. This is the single true hard block.
2. **Sentiment ≠ trust.** The corpus's social-prediction papers (0841, 1119) measure crowd noise with weak methods (κ=0.25, no time-ordered split, no odds baseline, decade-old data). The registry's 6 accounts are curated experts + a news wire. The pipeline must not import the papers' methods as anything more than a naive baseline; the real signal is expert-model disagreement and timestamped events, fused via LEAP-style likelihood elicitation around the engine prior.
3. **The prior is load-bearing and the engine's is weak.** LEAP's ablation + the slice's calibration verdict (Brier 0.275, RES≈0, "never display model confidence," market beats model per 0670) mean news fusion calibrates the prior — it doesn't create resolution. If the engine prior is a de-vigged market read, the social layer only earns weight where news precedes market pricing (injury/role changes, expert-model disagreement like Waldman's prop-line divergences).
4. **Beating the close is the only gate that matters.** 0841 never tested against odds; that omission is fatal for a betting engine. Any social feature must pass the 0670 ŵ protocol and the slice publish floors (Brier ≤0.22, ECE ≤0.05) on the 2024–2025 backtest before it touches a live score.
5. **Correlation is the default state of social news.** One report → hundreds of quote-posts. Without story-level clustering and the >4σ outlier cap, a viral item will dominate the posterior. LEAP's dependency clustering is a partial patch; NFL-specific story/beat clustering is greenfield and must be built before scoring.
6. **Greenfield stages are the majority.** Of six pipeline stages, entity-tagging NER (Stage 3) and profile wiring (Stage 6) are substantially greenfield; the entity graph and signal ledger are unimplemented proposals. The corpus gives the scoring math and the audit doctrine, not the plumbing.
7. **Temporal discipline is non-negotiable.** 0841's lack of a time-ordered split is the exact failure to avoid: all evidence must be timestamp-frozen pre-kickoff, per-game evidence freeze (LEAP NFL port spec), or the backtest is leakage theater.

---

## Appendix: source files consulted

- `~/workspace/corpus-intelligence/maps/c06-map.md`
- `~/workspace/corpus-intelligence/intake/x-intake-registry.md`, `x-throwthedamball.md`, `x-the_waldman.md`
- Briefs: `briefs/c06/r04/0440-leap-likelihood-elicitation-and-aggregation-for.brief.md`, `briefs/c06/c00/0841-using-twitter-to-predict-football-outcomes.brief.md`, `briefs/c06/c01/1119-triumphs-tragedies-fandom-emotional-arcs-nfl.brief.md`, `briefs/c06/d26/2026-09-26-faceless-nfl-youtube-landscape-brief.brief.md`, `briefs/c06/d21/MISSION-BRIEF-2026-09-18.brief.md`, `briefs/c06/d22/report.brief.md`, `briefs/c06/r11/1522-calibration-diversity-data-scarcity.brief.md`, `briefs/c06/c00/0530-finding-the-signal-in-the-spam.brief.md`, `briefs/c06/r11/1556-corrected-forecast-combinations.brief.md`, `briefs/c06/r16/entity-graph.brief.md`, `briefs/c06/r16/signal-ledger.brief.md`
- Source ledgers spot-verified (grep): `0440`, `0841`, `1119` in `~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/`
- Sentiment grep: 3 hits total (0841, 1119, 1522-as-false-positive); nothing missed.
