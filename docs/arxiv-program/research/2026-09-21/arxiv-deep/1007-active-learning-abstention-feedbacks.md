# [1007] Bayesian Active Learning with Abstention Feedbacks (arXiv:1906.02179)

## Citation / full-text source

- arXiv:1906.02179 — full text: https://arxiv.org/pdf/1906.02179
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Cuong V. Nguyen, Lam Si Tung Ho, Huan Xu, Vu Dinh, Binh T. Nguyen (2019; v2). *Bayesian Active Learning with Abstention Feedbacks*. Journal: Peer Review. arXiv:1906.02179v2. URL: https://arxiv.org/abs/1906.02179
**Full-text source read:** local cache `/tmp/arxiv750-cache/fulltext/1906.02179.txt` (arXiv conversion; read in full — abstract, §§1–7, experiments Figs. 3–4, references; Eq. 3 greedy criterion, Algorithm 1, Figs. 1–2 described in text).
**Ledger completed:** 2026-09-21. **Read:** full text.
## Verdict

**ADAPT** — the (1−1/e) greedy rules for allocating a query budget when labelers abstain map to GSE's weekly research budget: spend research hours on games where sources will actually answer, not on dead-end queries.

## 1. Research question
In pool-based active learning where the labeler may abstain on any queried example (unknown abstention rate) and abstention counts against a fixed query budget N, can Bayesian greedy algorithms jointly learn the classifier and the abstention pattern with near-optimality guarantees?

## 2. Dataset / schema
Experiments: binary text classification on 20 Newsgroups pairs (rec.motorcycles vs rec.sport.baseball; comp.sys.mac.hardware vs comp.windows.x; sci.crypt vs sci.electronics; sci.space vs soc.religion.christian); >61,000-dimensional features. Pool size fixed at 1,322 for the unrelated-task scenario. Three abstention scenarios: (1) labeler abstains on examples unrelated to the target task (varying abstention %), (2) abstains on easy examples (far from boundary), (3) abstains on hard examples (near boundary). Model: Bayesian logistic regression with N(0,σ²) priors on both the label hypotheses ℋ and abstention hypotheses ℛ; MAP estimation (no MCMC at this dimension).

## 3. Method / model
BALAF framework (Algorithm 1): joint Bayesian posterior over label functions h and abstention functions r; on receiving a label, update both (h with the label, r with (1−r(x))); on abstention, update only r with r(x). Two greedy rules: (a) **average-case** (ALa): x* = argmax_x {1 − r̃(x)² − (1−r̃(x))² Σ_y p_{i−1}[Y=y;x]²} (Eq. 3) — Gibbs-error-like with abstention terms, maximizes expected version-space reduction of the joint space; (b) **worst-case** (ALw): least-confidence-like with abstention terms, maximizes worst-case version-space reduction. Guarantees: ALa within (1−1/e) of optimal expected utility (adaptive submodularity); ALw within (1−1/e) of optimal worst-case utility (pointwise submodularity).

## 4. Equations & assumptions
- Eq. 2: r̃(x) = E_{r∼p_{i−1}}[r(x)] (posterior-mean abstention probability).
- Eq. 3 (average-case greedy): x* = argmax_x {1 − r̃(x)² − (1−r̃(x))² Σ_y p[Y=y;x]²}.
- Utility: version-space reduction of the joint (h, r) space; guarantees (1−1/e) for average and worst case.
- Assumptions: h, r priors independent; labels/labeling independent across examples given h (Eq. 1).

## 5. Features / target
Features: high-dim bag-of-words text. Targets: (i) binary class label, (ii) per-example abstention indicator — both learned jointly.

## 6. Validation design
Area under the accuracy curve (AUAC) over the first 300 queries on a separate test set, normalized to 0–100, averaged over 10 random seeds. Baselines: passive learning (PL), standard Gibbs-error active learning (ALg, ignores abstention), plus "oracle r*" variants where abstention rates come from a logistic model fit on the full training set.

## 7. Numerical results / baselines
Chart-read (no numeric tables in text): scenario 1 (unrelated examples) — ALa/ALw consistently beat PL and ALg at abstention ≥40%; with a good r* estimate, better above 30%. Scenario 2 (abstain on easy) — ALa/ALw clearly better above 50% abstention; advantage fades at low abstention (learning r costs more than ignoring it). Scenario 3 (abstain on hard) — harder; ALa/ALw better only at 20–40%; without a good r* estimate, little advantage over PL elsewhere. With a good r* estimate, ALa/ALw are the best everywhere.

## 8. Code / data availability
None stated. Data: 20 Newsgroups (public).

## 9. Leakage
The oracle-r* variants use the full training set to fit the abstention model — acknowledged in the paper as an optimistic "good estimate" scenario, not a fair baseline. Main results use only queried feedback.

## Limitations
- Results are chart-read AUAC curves, no numeric tables, no confidence bands on 10 seeds.
- Greedy rules assume the MAP/hypotheses model is well-specified; heavy prior dependence.
- The abstention model ℛ is a separate logistic regression — doubles modeling cost; at low abstention rates the overhead isn't worth it (authors admit).
- No cost-of-abstention modeling beyond budget counting.

## 10. GSE overlap
Complements 1002 (spammer model): same spirit (model the labeler's failure mode) but for ACTIVE selection under a query budget. GSE's analogue of "abstention feedbacks": research queries that return nothing — injury news that never resolves, beat writers who go silent, line feeds that don't move. Garrett's weekly research hours are the fixed budget N, and wasted hours on unanswerable questions are abstentions that count against it. Nothing in the repo models research-query failure; the (1−1/e) guarantee gives this a rigor the current "research whatever feels hot" process lacks. Extension (new capability).

## 11. GSE implementation spec
**Research-budget allocator**: each week, the pool = slate games × research questions (injury, weather, line move, matchup stat); budget = research hours. Track per-(question-type) abstention rate: fraction of questions asked that returned no actionable answer. Greedy rule (adapted from Eq. 3): prioritize questions with high label uncertainty AND low estimated no-answer probability r̃ — i.e., don't burn hours re-checking beat writers who never answer, and don't burn hours on questions the model is already certain about. Implement as a simple scorer over the question queue; update r̃ from outcomes. Effort: ~1 day.

## 12. Reproducible test
Backtest on 2024 weeks: simulate a 20-question weekly research budget; compare (i) human-ordered questions, (ii) greedy rule from Eq. 3; metric: answered-question rate and downstream engine delta from answered questions; time-ordered.

## 13. Acceptance / rejection gate (numeric gate)
ADOPT if the greedy rule raises the answered-question rate by ≥15 pp over the human-ordered baseline (paired t-test, p<0.05 over 18 weeks) AND the r̃ estimates correlate with realized no-answer rates (Spearman ρ ≥ 0.4); otherwise REJECT. The single decisive number: **answered-question rate delta ≥ +15 pp at fixed budget**.

## 14. Improvement experiment
Worst-case (ALw) variant: optimize for the minimum answered-rate across weeks rather than the average — protects against the weeks where everything is quiet (holiday weeks, bye-heavy weeks) and prevents a few catastrophic weeks from starving the engine of inputs. Compare average-case vs worst-case greedy on the worst-decile weeks.
