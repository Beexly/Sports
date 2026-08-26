# Founder paper corpus — deep extraction, batch 2 (2026-08-26)

> Deep full-text pass over six founder-selected arXiv ids, correcting the one-line
> triage in `ORBIT_NEXT_50.md` rows 84–89 (wave 5). Method: full text read via
> ar5iv HTML (five papers) and the arXiv PDF (2410.17619, whose ar5iv conversion
> is broken upstream — "Fatal error … may be truncated"). Every claim below is
> from the papers' own text; sections/equations cited. Lens rules as in the ORBIT
> doc: **pattern** = portable method with a named GSE wiring; **skill-doc** =
> reference knowledge worth keeping; **ignore** = none after honest review.
> Companion context: `docs/ops/2026-08-26-EDGE-PATH.md` (E1–E3 program).

---

## 1. arXiv:2602.03157 — Human-in-the-loop Adaptation in Group Activity Feature Learning for Team Sports Video Retrieval

**ORBIT row 84 verdict at triage: ignore.**

### (a) What it actually is (full text)

Nakatani, Kawashima, Ukita (Toyota Technological Institute / U. Hyogo; accepted
manuscript, Computer Vision and Image Understanding 2026/01). A video-retrieval
paper, end to end:

- **Pre-training (§3.1):** person features from video frames via VGG-19 +
  RoIAlign on player bounding boxes plus positional encoding of box centers; a
  Group Activity Feature (GAF) is learned self-supervised through Masked Person
  Modeling and a location-guided appearance-prediction pretext task (MSE loss,
  Eq. 1). Builds on GAFL [Nakatani et al.] and the baller2vec-style TS/ST
  attention branches.
- **Human-in-the-loop adaptation (§3.2):** a user supplies ~3 query videos of a
  target group activity; the system selects ~5 database videos for the user to
  label positive/negative, then fine-tunes the GAF space.
  - *Query similarity* (Eq. 2): cosine similarity to query GAFs.
  - *Query local dissimilarity* (Eqs. 3–4): mask N^V=2 random players in the
    query, recompute GAFs P times; the **variance** of similarities under
    masking scores how "globally similar but locally dissimilar" a candidate is.
  - Informative score I = S + λV (Eq. 5, Algorithm 1), then Core-Set
    diversity selection (Eqs. 6–7, Algorithm 2).
  - Fine-tune with triplet contrastive loss + MSE regularization anchoring to
    the pre-trained GAF space to prevent catastrophic forgetting (Eqs. 8–10).
- **Experiments (§4):** Volleyball (4,830 clips), NBA (9,172 sequences),
  Collective Activity datasets. Precision@10 0.533 → 0.647 over GAFL on
  Volleyball; ablations (Table 8, Figs. 11–12) show both S and V terms matter,
  best with N^V=2, N^E=3–4.

### (b) THE APPLICATION

**NONE AFTER FULL READ.** The entire pipeline consumes broadcast-style video
with per-player bounding boxes (VGG/RoIAlign features, tracked frames). GSE
ingests odds/stat/API data and has no video ingestion, storage, or retrieval
surface anywhere in the repo; acquiring one is not on any roadmap and would be
rights-gated besides. Stripped of video, what remains is a generic
active-learning recipe (label a few well-chosen samples near the query, coreset
for diversity, anchored contrastive fine-tune) with no GSE embedding-retrieval
surface to apply it to — no module retrieves "similar historical game states"
by learned embedding, and inventing one to fit the paper would be speculative
scope, exactly what the wave-5 discipline note warns against.

### (c) Corrected lens vs ORBIT

**ignore — CONFIRMED.** Triage read the paper correctly; the full text adds
detail but no new GSE angle.

---

## 2. arXiv:2508.17157 — SportSQL: An Interactive System for Real-Time Sports Reasoning and Visualization

**ORBIT row 85 verdict at triage: pattern (medium) — "NL-to-SQL for Trend Lab
conversational querying; DSQABench eval design for the ops harness."**

### (a) What it actually is (full text)

Martinez et al. (ASU; demo-track paper). A modular NL→SQL system over a live
Fantasy Premier League database, plus a benchmark:

- **Architecture (§2):** FPL API → MariaDB with a **hybrid storage strategy** —
  query-agnostic core tables refreshed nightly by cron, query-dependent
  fine-grained views (e.g. "past 5 games") fetched just-in-time and
  materialized in memory per query, discarded after. Persistent DB stays <5GB.
- **Schema-only prompting:** the LLM sees only the schema, never cell values.
  Entity grounding is done by having the LLM emit case-insensitive wildcard SQL
  against curated reference tables to resolve aliases ("CR7") to primary keys.
  SQL-generation prompts carry table hints, synonym maps, column cautions, and
  derived-field formulas.
- **Visualization agent (§2.4):** secondary code-gen LLM emits matplotlib code;
  a **validation layer checks the dataframe referenced in the code matches the
  SQL output byte-for-byte; any mismatch triggers automatic re-querying.**
- **DSQABench (§3):** 1,793 questions from 180 templates ×3 rephrasings, each
  paired with a manually authored gold SQL program, gold answer, **and the
  database snapshot at execution time** — so freshness-sensitive answers stay
  gradeable. Type-aware eval: exact match for strings, TabEval
  (entailment-based precision/recall/F1) for tables.
- **Results (§4):** GPT-4o 80.5% EM strings / 0.75 macro-F1 tables. The
  primitive-tagged error analysis is the paper's most load-bearing finding
  (§4.2, Figs. 4–5): accuracy is 93% on single-primitive queries, **drops to
  67% at two primitives and ~50% at three or more; any pair involving
  Manipulate (joins) or Calculate (aggregation) falls to ~15%.**

### (b) THE APPLICATION — implementable

The triage aimed this at a user-facing conversational Trend Lab. The full text
**argues against that**: real Trend-Lab-shaped questions ("average pass
accuracy for midfielders under 23") are exactly the Filter+Calculate(+Order)
compositions where even GPT-4o sits at 15–50%. Shipping that behind the Pro
paywall would be a wrong-answer machine with a confident UI — a check-claims
violation waiting to happen.

The honest, immediately implementable port is the **evaluation design**, into
the existing harness:

- **Target module:** `scripts/agent-eval/` (`npm run agent:eval`, fixtures dir
  already exists). Complements the SportsMetrics numeric-fidelity spec
  (`docs/ops/edge/2026-08-26-paper-spec-sportsmetrics-numeric-fidelity.md`).
- **What to build:** snapshot-pinned QA fixtures for every agent surface that
  answers questions from the picks/odds/settlement DB (accuracy skill, content
  agents, cockpit Jarvis trend endpoints): each fixture = natural-language
  question + gold SQL + gold answer + a pinned DB snapshot (a Neon read-only
  sample, per the SQL-over-HTTP path in EDGE-PATH §0.4), so grading survives
  data drift. Tag each fixture with its reasoning primitives
  (retrieve/filter/calculate/compare/order/manipulate) and report accuracy
  **per primitive-count slice**, not just overall — the paper shows the overall
  number hides a cliff.
- **Second portable piece:** the byte-for-byte "rendered output must equal the
  executed query's result" validation gate — the same invariant as GSE's
  no-fabricated-stats rule, mechanized. Any chart/table an agent produces from
  DB data should be diffed against the query result before publish.
- **Gate:** a future conversational query feature (Trend Lab or cockpit) is
  admitted only when the ≥3-primitive slice of this eval passes a floor set in
  the harness — not on overall accuracy.

### (c) Corrected lens vs ORBIT

**pattern (medium) — KEPT, but re-aimed.** Not "port NL→SQL to Trend Lab now";
instead: port DSQABench's snapshot-pinned, primitive-sliced eval design and the
output-equals-query validation gate into `scripts/agent-eval/`, and treat the
paper's own accuracy cliff as the admission gate blocking the user-facing
feature the triage proposed.

---

## 3. arXiv:2410.17619 — From PDFs to Structured Data: Utilizing LLM Analysis in Sports Database Management

**ORBIT row 86 verdict at triage: skill-doc (low).**
*(Fetched via arXiv PDF; the ar5iv HTML conversion is broken upstream.)*

### (a) What it actually is (full text)

Merilehto (JAMK, Finland). A single-author **action-research case study**, not
a methods paper: updating the Finnish Sports Clubs Database from 72 sports
federation PDF membership reports using GPT-4 (gpt-4-0613) and Claude 3 Opus
via API, PyMuPDF extraction, pandas structuring, Excel output (§3, Fig. 1).
Iteratively refined zero-shot-with-heading-examples prompt. Results (§4):

- 90% file-level success — 65/72 files processed without error, >7,900 rows;
  of the 7 failures, 2 fully manual, 5 manually corrected.
- Failure taxonomy: the "double name problem" (bilingual Finnish/Swedish names
  in one cell push business IDs/member counts into wrong columns); extraneous
  headers and "totals" rows ingested as data; on >400-row multi-page documents,
  ~10% missing rows and rare hallucinated club names/member counts — **feeding
  pages to the API one at a time "practically removed the issue entirely."**
- Time economics (§5): first-year build ≈ manual effort (3 months), projected
  ~90% time reduction on reruns. Conclusion: hybrid AI + selective human
  oversight is optimal.

No benchmark, no baseline beyond the prior year's manual process, N=1
practitioner-researcher (self-acknowledged bias, §3).

### (b) THE APPLICATION

Marginal, contingent, and already correctly shelved: a **reference note for
data-ingestion-agent** to be pulled out only if a rights-cleared PDF source
ever enters the ingestion pipeline (none exists today; GSE's sources are
structured APIs, and any PDF source must first pass
`apps/web/lib/scraping/clearance-engine.ts`). The three transferable nuggets
worth the note: (1) page-at-a-time chunking eliminates the missing-row and
hallucination modes on long documents; (2) the concrete failure checklist —
multi-value cells causing column misalignment, header/summary-row
contamination, "which of several member-count columns is canonical"
disambiguation in the prompt; (3) plan for a human-correction lane (7/72 files
here) rather than assuming full automation. Nothing here justifies code today.

### (c) Corrected lens vs ORBIT

**skill-doc (low) — CONFIRMED**, with the content of the skill-doc now
specified (the three nuggets above). If anything the triage was generous: this
is experience report, not method. Priority stays low.

---

## 4. arXiv:2403.12977 — SportsNGEN: Sustained Generation of Realistic Multi-player Sports Gameplay

**ORBIT row 87 verdict at triage: skill-doc (medium) — "needs tracking-data
pipelines GSE does not ingest; reference for a future sim-based projection
layer."**

### (a) What it actually is (full text)

Thorpe et al. (Hawk-Eye Innovations + Cambridge). Transformer-decoder
simulation engine over player+ball tracking sequences, trained on a
**proprietary Hawk-Eye tennis tracking dataset** (25 Hz COM positions):

- **Tokens (§3.1):** per-object state {learned player-identity vector I,
  position, velocity, distance-to-ball, elapsed time} + learned context tokens
  (tournament, surface, first/second serve). Crucially, **uniform noise is
  injected into ball position/velocity during training** (±25mm x, ±12.5mm
  y/z, §4) — without it autoregressive rollouts go out-of-distribution and
  collapse.
- **Model (§3.2):** extended baller2vec decoder; the next-step update is a
  **classification over discretized relative-offset bins** (61² player,
  61³ ball) rather than regression; nucleus (top-p) sampling; a separate event
  classifier g labels shots/winners/errors (§3.3); rally start/end logic makes
  full-match simulation possible (§4).
- **Evaluation-by-distribution-matching (§5):** simulations are graded by
  median/IQR/**Wasserstein distance** between real and simulated distributions
  of physical stats (serve/return/groundstroke speeds) plus aggregate rates
  (first-serve %, double-fault %, ace %), and a discard-rate of non-realistic
  rallies. **top-p is treated as a tunable realism hyperparameter, optimal at
  0.8–0.9** (Fig. 7): too low collapses shot variety, too high breaks physics.
- **Calibration result (§6, Figs. 14–15):** rally win probabilities produced by
  100 rollouts from random mid-rally states are **well-calibrated against
  ground-truth outcomes** (predicted vs observed win% on the diagonal), which
  is what licenses the counterfactual shot-choice analysis (58% vs <50% win
  probability, Fig. 16).
- Player customization by fine-tuning a generic model (§5 Transfer Learning);
  football shown qualitatively only. Limitations (§7): OOD fragility, 2 days
  on an A100, proprietary data.

### (b) THE APPLICATION

Direct port stays blocked, as triage said: the input is commercial tracking
data GSE neither ingests nor has clearance for (EDGE-PATH already notes Big
Data Bowl research licenses are not commercial clearance). But the full read
surfaces a portable piece the triage missed — **the paper's validation
protocol, which needs no tracking data at all**:

- **Target modules:** `apps/web/lib/sim/score-distribution.ts` (Simulation
  Cloud — currently an illustrative Poisson margin cloud, correctly firewalled
  from pick output) and any future Monte-Carlo layer for fantasy projections /
  Parlay MRI correlation modeling (`apps/web/app/parlay-mri`,
  `apps/web/components/parlay`).
- **The recipe to record (skill-doc content):** the moment any GSE simulator's
  output is used as a *probability* rather than an illustration, it must pass
  the SportsNGEN-style gate: (1) sample historical states, run N rollouts,
  bin predicted win%/hit% and verify observed frequency per bin — i.e. run the
  sim through the exact calibration harness the pick stack already uses
  (EDGE-PATH E1); (2) tune the simulator's dispersion knobs (for SportsNGEN,
  top-p; for a Poisson/negative-binomial projection sim, the variance/
  correlation parameters) **against distributional distances (Wasserstein) of
  real vs simulated stat distributions and a discard-rate metric — never
  against means alone**. This is the difference between a sim that matches
  averages and one whose tails are honest — and tails are what Parlay MRI and
  DFS optimization price.
- **Gate:** no sim-derived probability reaches a user surface until it passes
  the same ECE floor as the calibrated pick stack, walk-forward, via edge-lab
  law like every covariate (trials-registry, sealed holdout).

### (c) Corrected lens vs ORBIT

**skill-doc (medium) — CONFIRMED, content sharpened.** The triage's "reference
for a future sim-based projection layer" undersold the one piece portable
*today*: the calibration-plot-for-simulated-probabilities protocol and
distribution-matching hyperparameter tuning, which slot into GSE's existing
calibration machinery the day any Monte-Carlo projection ships. Not upgraded to
pattern because there is no sim-probability surface in production to wire it to
yet — the Simulation Cloud is deliberately non-predictive.

---

## 5. arXiv:2607.12089 — Cross-Cutting Security Analysis of LLM-Generated Code via Metamorphic Testing and Association Rule Mining

**ORBIT row 88 verdict at triage: skill-doc (low) — "prompt-level security
checks for agent-fleet code generation; no prediction/fantasy relevance."**

### (a) What it actually is (full text)

Peng, Wang, Zhu. Four-phase pipeline (§III, Fig. 1) on 3,700 snippets (148
LLMSecEval prompts × 5 open models × 5 runs):

- **Nine security metamorphic relations** (Table I) mapped to CWEs — SQLi,
  XSS, command injection, path traversal, auth bypass, hard-coded credentials,
  weak crypto, buffer/integer overflow — each an adversarial transformation T
  plus expected secure output relation R_o.
- **LLM judge with provenance engineering (§III-B):** Claude Sonnet 4.6 judges
  all nine MRs per snippet; **system prompt and template frozen at experiment
  start with SHA-256 hashes; every judgment saved with full input, raw
  response, parsed verdicts, timing; append-only audit log**; 36-snippet pilot
  manually validated.
- **Apriori association-rule mining (§III-C)** over the violation matrix
  (support/confidence/lift), plus prompt-feature risk analysis (§III-D).
- **Findings:** 68.8% of snippets violate ≥1 MR (Table III; hard-coded creds
  79.1%, command injection 74.4%, SQLi only 11.5%). The MR judge detects 2×
  the union of four SAST tools (68.8% vs 34.2%, Table V; **no SAST tool caught
  a single auth-bypass**). Two co-violation clusters (Table VI): {AuthBypass,
  HardCred, CryptoWeak} — e.g. Crypto⇒HardCred conf 0.570 lift 2.23,
  XSS∧Crypto⇒HardCred conf 0.825 lift 3.23 — and {CmdInj, PathTrav,
  BuffOverflow}. **Database keywords are the strongest prompt-level risk
  predictor (r=0.52), authentication second (r=0.43)** (Table VII); high-risk
  prompts with database keywords are 14.2× likelier to trigger cross-cutting
  violations (§VI). **Security-aware phrasing ("secure", "sanitize",
  "validate") has no effect (r=−0.04, present in 0% of high-risk prompts).**
  65.5% of prompts get the same violation outcome from all five models —
  vulnerability is prompt-inherent, not model-dependent (§IV-D).

### (b) THE APPLICATION — implementable

The triage's "no prediction/fantasy relevance" is right, but "low" underprices
it: GSE's agent fleet generates code for a **database- and auth- and
payments-heavy platform** — exactly the prompt region the paper measures as
highest-risk — and GSE already runs the verification-side apparatus this paper
validates. Three concrete wirings, all ops-lane:

1. **Cluster-aware audit ordering** into the existing audit skills
   (`audit-secrets`, `audit-stripe`, `audit-auth`, `security-review`): when a
   hard-coded credential is found, the checklist must immediately force checks
   for weak crypto (57% conditional co-violation) and missing authorization
   (34.7%); when path-traversal handling is flagged, check shell/command input
   sanitization in the same module (lift 2.3). This is a documented ordering
   heuristic, near-zero cost.
2. **Doctrine justification, cited:** the r=−0.04 result is empirical proof
   that telling a code-gen agent to "write secure code" does nothing — the
   security budget belongs in post-generation verification (guardrail CI,
   `.github/workflows/ci.yml`, security-review skill), which is GSE's existing
   posture. Also: SAST alone caught 34.2% vs the LLM-judge's 68.8%, and zero
   auth-bypasses — keep semantic review in the loop, don't delegate to linters.
3. **Judge-provenance pattern** for `scripts/agent-eval/`: freeze judge
   prompts with content hashes, persist every judgment with full input/raw
   output/parsed verdict, append-only log. This matches the trials-registry /
   frozen-runner ethos GSE already applies to the MVE (EDGE-PATH §0.5) and
   should apply to LLM-judge evals too.

- **Data:** none needed beyond the repo. **Gate:** ops-lane, founder-gated to
  wire like all corpus adoptions; no edge-lab claim is being made.

### (c) Corrected lens vs ORBIT

**skill-doc, low → MEDIUM (ops).** Still not a pattern (no new module; it
hardens existing skills/harness), but the full text is more actionable than the
triage line suggests, and its highest-risk prompt profile is literally GSE's
daily prompt profile.

---

## 6. arXiv:2604.24186 — MultiDx: A Multi-Source Knowledge Integration Framework towards Diagnostic Reasoning

**ORBIT row 89 verdict at triage: ignore — no fit.**

### (a) What it actually is (full text)

Deng et al. (XJTU / CityU HK / Tencent Jarvis Lab; ACL 2026 code release).
Two-stage LLM diagnostic-reasoning framework:

- **Stage 1 (§2.3)** — four independent suspected-disease lists: (i) SOAP
  restructuring of the free-text case then LLM inference (Eqs. 1–2); (ii) BM25
  top-k similar clinician-annotated cases as few-shot context (Eqs. 3–4);
  (iii) fine-grained retrieval of *reasoning-trace fragments* scored by Jaccard
  overlap of SciSpaCy-extracted medical entities (Eqs. 5–7); (iv) an iterative
  web-search agent — plan P=(queries, tools, steps) (Eqs. 8–9), tool
  invocations (Eq. 10), incremental memory updates m_i = LLM(m_{i−1}, s_i)
  (Eq. 11) — with PubMed/HuggingFace blocked against leakage.
- **Stage 2 (§2.4)** — an LLM performs disease matching (canonicalizing
  synonyms across lists), support aggregation via voting over list
  presence/rank, pairwise differential diagnosis between top candidates, and
  final re-ranking with per-item justification (Eq. 13).
- **Results (§3):** on MedCaseReasoning (300 test cases) H@1 0.420 / H@10
  0.617 and reasoning recall 0.662, beating DeepSeek-R1, MedAgents, OpenAI-DR;
  similar on DiReCT. Ablations (Table 2): web search is the strongest single
  source for accuracy (H@10 0.602) **but has by far the worst reasoning recall
  (0.460 vs 0.634–0.648 for the others)** — highest-accuracy evidence produced
  the least clinically-aligned reasoning. Seen/unseen split (Table 4): case-DB
  retrieval only helps in-distribution diseases; web search generalizes.
  Cost: ~8.5 min, ~20k tokens per case (Table 5).

### (b) THE APPLICATION

**NONE AFTER FULL READ — with a specific reason.** The framework's portable
core is *an LLM in the integrator/decider seat*: it matches, votes, adjudicates
between candidates, and emits the final ranked prediction (Eq. 13). Mapped to
GSE that is an LLM ensembling and adjudicating **picks** — a direct inversion
of the platform's binding architecture (structured odds/line data is source of
truth; Claude is content-generation only; CLAUDE.md non-negotiables 1–2) and of
the edge thesis (fire on calibrated divergence from price, never on model
narrative). GSE's actual multi-source integration problem is solved numerically
(devig oracle, calibration stack, covariate walk-forward), where it is
auditable. The remaining sub-patterns are generic RAG plumbing (BM25 few-shot,
entity-overlap fragment retrieval, deep-research loops) already represented and
triaged elsewhere in the corpus (rows 90, 92 — skill-doc low / ignore); adding
this one adds nothing new. Worth one footnote only: the ablation's
accuracy-vs-reasoning-recall anti-correlation is a clean demonstration that
grading agents on answer accuracy alone can reward the least-faithful reasoning
path — a caution already embodied in the eval-harness direction (trajectory
scorers, not just outcomes).

### (c) Corrected lens vs ORBIT

**ignore — CONFIRMED** (reason now specific: source-of-truth inversion, not
just "no fit").

---

## Summary table

| arXiv id | What it actually is | ORBIT triage (rows 84–89) | Deep-pass verdict | The application (or reason for none) |
|---|---|---|---|---|
| 2602.03157 | Video retrieval: human-in-the-loop fine-tuning of self-supervised group-activity features (CVIU 2026) | ignore | **ignore — confirmed** | NONE: end-to-end video pipeline; GSE has no video surface; residual recipe is generic active learning |
| 2508.17157 | NL→SQL demo over live FPL DB + DSQABench (snapshot-pinned, primitive-tagged eval) | pattern (medium): Trend Lab NL querying | **pattern (medium) — re-aimed** | Port the eval design into `scripts/agent-eval/` (snapshot-pinned fixtures, primitive-sliced accuracy, output≡query gate); the paper's own 15–50% multi-primitive accuracy **blocks** the user-facing NL feature triage proposed |
| 2410.17619 | Action-research case study: GPT-4/Claude-3-Opus PDF→Excel for Finnish sports-club DB (90% file success) | skill-doc (low) | **skill-doc (low) — confirmed** | Reference note only, contingent on a rights-cleared PDF source ever existing: page-at-a-time chunking kills hallucination/missing-row modes; failure checklist; human-correction lane |
| 2403.12977 | Hawk-Eye transformer sim of tennis (discretized-offset decoding, noise-injected training, calibrated rollout win-probs) | skill-doc (medium) | **skill-doc (medium) — confirmed, sharpened** | Direct port blocked (proprietary tracking data), but the validation protocol is portable now: sim-derived probabilities must pass the pick-stack calibration gate; tune sim dispersion by Wasserstein distribution-matching + discard rate, never means. Targets `lib/sim/`, future Parlay-MRI/fantasy Monte-Carlo |
| 2607.12089 | 9 security MRs + LLM judge (frozen, hashed, audited) + Apriori co-violation mining over 3,700 snippets | skill-doc (low) | **skill-doc — raised to medium (ops)** | Wire cluster-aware checklist ordering into audit-secrets/audit-stripe/security-review; cite r=−0.04 ("ask nicely for security" does nothing) as doctrine for post-generation verification; adopt hashed-frozen-judge provenance in `scripts/agent-eval/` |
| 2604.24186 | Two-stage LLM diagnostic reasoning: 4 evidence sources → LLM matching/voting/differential re-ranking | ignore | **ignore — confirmed** | NONE: portable core puts the LLM in the decider seat over predictions — inverts GSE's source-of-truth architecture; RAG sub-patterns already covered by rows 90/92. Footnote: its ablation shows accuracy and faithful reasoning can anti-correlate — a caution for LLM-judge eval design |

*Fetch record: 2602.03157, 2508.17157, 2403.12977, 2607.12089, 2604.24186 read
in full from ar5iv HTML; 2410.17619 read in full from the arXiv PDF (11 pp.)
because its ar5iv conversion is broken upstream. Nothing in this document is
inferred from abstracts alone.*
