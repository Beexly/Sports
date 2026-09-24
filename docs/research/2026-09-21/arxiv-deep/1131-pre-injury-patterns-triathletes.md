# [1131] Synthetic Data Generation for Pre-Injury Pattern Detection in Triathletes (arXiv:2511.17610)

**Citation:** Rodrigues, B. B., et al. (2025). *Pre-Injury Patterns in Triathletes*. arXiv:2511.17610v1. URL: https://arxiv.org/abs/2511.17610
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — not the injury-accuracy claims (the 0.858 AUC is circular: warning patterns are injected before scheduled injuries, so the model recovers the simulator's own assumptions), but the feature schema (100+ features, 3/7/14-day rolling summaries) and the synthetic-archetype sandbox as a negative control for GSE's own injury/availability models.

## 1. Research question
Can pre-injury patterns be detected from daily training/lifestyle data in triathletes? Because real injury labels are scarce, the authors build a synthetic cohort (1,000 athletes × 365 days) with injected warning patterns and test whether standard classifiers recover them.

## 2. Dataset / schema
- Synthetic: 1,000 athletes × 365 days = 365,000 daily records. 24 athlete-profile parameters; six lifestyle archetypes.
- Label construction: 4–6 injuries per athlete per year are *scheduled*, then 7–14-day warning patterns are injected retrospectively before each scheduled injury; 2–3 false-alarm (warning pattern, no injury) episodes per athlete per year.
- Features: 100+ engineered features including 3/7/14-day rolling summaries of training load, lifestyle signals. Target: injury within the next 7 days.
- Code/data: https://github.com/brunobastosrodrigues/injury-prediction (stated).
- Provenance flag: one table presents "real" vs "+synthetic" results, but the methodology describes only synthetic data generation — the "real" component's provenance is unexplained (see §9).

## 3. Method / model
Standard classifiers (best reported: XGBoost) on the 100+ feature set; train/test splits: 80/20 by athlete and a temporal split (Jan–Oct train, Nov–Dec test). Warning-pattern injection is the data-generating mechanism; the classifiers learn to detect the injected patterns.

## 4. Equations & assumptions
No equations stated. Assumptions: the synthetic archetypes and injected warning patterns resemble real pre-injury physiology; the 7–14-day warning window is the right horizon; false alarms (2–3/yr) adequately represent the real base rate. These assumptions are asserted, not validated.

## 5. Features / target
Inputs: 100+ features — training-load summaries (3/7/14-day rolling), lifestyle/archetype indicators, 24 profile parameters. Target: binary — injury occurs within the next 7 days.

## 6. Validation design
- 80/20 split by athlete (no athlete in both sets) — the correct design.
- Temporal split: Jan–Oct vs Nov–Dec — reasonable.
- Reported metric: best XGBoost AUC 0.858, AP 0.726 (paper's claim; see §9 for why this is circular).
- Baselines compared: not clearly enumerated in extracted text.

## 7. Numerical results / baselines
- Best XGBoost: AUC 0.858, AP 0.726 (paper's claim on synthetic data).
- The "real" vs "+synthetic" table exists but the "real" data source is not described in the methodology — treat that table as unverifiable.
- No confidence intervals reported.

## 8. Code / data availability
Code/data: https://github.com/brunobastosrodrigues/injury-prediction (stated). Real-data provenance unclear.

## 9. Leakage & limitations
- Severe circularity: features are engineered to precede labels *by construction* (warning patterns injected 7–14 days before scheduled injuries). The 0.858 AUC validates the simulator's assumptions, not real injury forecasting. This is the paper's central flaw and must be stated in any use.
- The "real" data in the real-vs-synthetic table has no described provenance — possible reporting inconsistency.
- Triathlon ≠ football: injury mechanisms (overuse/endurance) differ from contact-sport trauma; the archetype parameters do not transfer.
- The false-alarm rate (2–3/yr vs 4–6 injuries/yr) is a guess; real base rates dominate precision in deployment.
- Six lifestyle archetypes are coarse; individual heterogeneity is larger in reality.

## 10. GSE overlap
Extension with a cautionary role. The existing-research map's causal/injury lane (ledgers 0619–0622: soccer injury forecasting, DeepHit survival) covers real-data injury modeling; nothing covers synthetic-data sandboxes. GSE's player-availability work (2026-09-18 props lane, injury-report features) has no negative-control protocol — that is the gap this paper's *method* (not its results) fills: a synthetic cohort with known ground-truth injury mechanics is the right way to sanity-check an availability model before trusting it on real data.

## 11. GSE implementation spec
- Build an NFL synthetic-injury sandbox: 300 synthetic player-seasons with known injected mechanisms (e.g., practice-load spikes → soft-tissue risk with a 3–10-day lag; prior-injury recurrence), 3/7/14-day rolling features mirroring the paper's schema, mapped to nflverse-available signals (snaps, touches, travel, rest days).
- Run GSE's current availability model on the sandbox: require it to recover the *injected* mechanisms (feature attribution check) before its real-data outputs are trusted. A model that cannot find injected truth cannot be trusted on real data.
- Effort: 3–5 days for the sandbox generator + attribution harness.

## 12. Reproducible test
Dataset: the synthetic sandbox above (GSE-built, ground truth known). Metric: does GSE's availability model assign top-quartile attribution to the true injected features (vs decoys)? Baseline to beat: a logistic regression on the same features. Gate: GSE's model must rank the true mechanism features in its top 5 by attribution on ≥80% of sandbox replications; otherwise the model's real-data injury outputs are downgraded to "experimental" in any user-facing surface.

## 13. Acceptance / rejection gate
ADAPT the sandbox/negative-control protocol if: GSE's availability model passes the ≥80% attribution-recovery gate on the sandbox — then the sandbox becomes a standing regression test. REJECT any use of the paper's 0.858 AUC / 0.726 AP as evidence about real injury predictability; those numbers describe the simulator, not athletes.

## 14. Improvement experiment
Adversarial sandbox: generate synthetic cohorts where the true mechanism is *opposite* to the model's inductive bias (e.g., injuries driven by under-loading/detraining rather than spikes). Hypothesis: models that only look for spike patterns fail the adversarial sandbox, revealing blind spots that a real-data validation would never catch because real labels are too sparse to stratify.
