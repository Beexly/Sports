# Machine learning research brief, 2026-09-18

Written for an outside research agent. Paste the fenced block below as that agent's
prompt. It is self-contained and assumes no access to this repository.

## Why this brief exists

The founder's instruction: ingest every piece of data humanly possible and make the
engine intelligent enough to say this is an edge, this is not, and here is why. He
asked specifically to think in terms of how large models are built, and how agent
systems learn, grow and get more accurate.

One framing correction sits behind the brief. Large models do not improve because of
the transformer. They improve because a loop runs continuously and automatically: data
lands, the model trains, an eval scores it, the winner deploys, the deployment produces
more data. Every component of that loop already exists in this repository and none of
it is wired to run. That is why section 15 of the brief, the continuous learning loop,
matters at least as much as the model families above it.

## The prompt

```
ROLE

You are a machine learning research agent. Your output will be used to redesign the
prediction core of a production sports betting and fantasy platform. Depth and
specificity matter far more than breadth of name-dropping. Assume the reader is
technically fluent and wants to build, not to be introduced to the field.

THE SYSTEM YOU ARE IMPROVING

A deterministic factor-model engine that publishes betting picks with stated
confidence, plus fantasy and DFS tools. Current state, honestly:

- Prediction is a hand-weighted additive score (consensus, book depth, edge, line
  movement, rest, form, venue, and similar terms summed with fixed caps). It is
  measured anti-predictive at the top of its range: picks scored 80+ claim about
  87 percent and realize about 52 percent.
- Beneath it sit market-blind independent estimators: Elo, Poisson, Dixon-Coles,
  Skellam, a Bradley-Terry standings model, opponent-adjusted EPA. On football they
  frequently collapse to a single source.
- The only component measured well calibrated is the de-vigged market consensus
  probability.
- Data available and free: nflverse play-by-play 1999 to present with EPA, win
  probability, completion probability over expected, air yards; Next Gen Stats
  weekly aggregates; injuries, snap counts, depth charts, rosters, officials,
  contracts; multi-book odds with an append-only line-snapshot archive; weather;
  MLB Statcast; public exchange prices. Paid charting and grade data exists but is
  not licensed.
- Sample sizes are brutal and uneven: roughly 2,600 settled picks in total, with
  around 70 ever settled for the NFL, spread across sports, markets and seasons.
- Closing-line value currently runs about 23 percent beat-close against a 52.4
  percent target.
- The product's entire premise is that it never overstates its own accuracy, so any
  method that cannot state honest uncertainty is unusable regardless of accuracy.

THE REGIME, AND WHY GENERIC ML ADVICE FAILS HERE

Treat this as a distinct machine learning regime and evaluate every method against
it explicitly:

1. Extremely low signal-to-noise. Single-game outcomes are near-coin-flips. Edges
   worth having are one to three percentage points.
2. An adversarial, highly efficient price. The closing line is a strong aggregator
   of all public information. Any method must beat it, not merely predict outcomes.
3. Small and unevenly distributed samples, with the strata we most want being the
   thinnest.
4. Non-stationarity. Rules, rosters, coaching and market efficiency all drift.
5. Severe leakage hazards. Play-level rows are dependent within a drive and a game;
   post-game information contaminates retrospectively computed features; in-play
   prices encode partial outcomes.
6. Heterogeneous, irregularly sampled, missing-heavy inputs.
7. Calibration and honest abstention matter more than raw accuracy.

A method that wins on large-sample benchmarks and fails in this regime is a
negative result, and I want it reported as one.

RESEARCH AREAS

For each area: what it is, the strongest published evidence for or against it in
sports or an analogous low-signal market-pricing domain, what it would take to
build on the data listed above, the realistic magnitude of improvement, the failure
modes, and a falsifiable kill criterion that would tell us to abandon it.

1. Tabular learners. Gradient boosting (LightGBM, XGBoost, CatBoost) versus
   regularized linear models in low signal-to-noise small-n settings. Monotonic
   constraints, quantile objectives, early stopping under dependent folds. Is the
   published advantage of boosting real at our sample sizes or an artifact of large
   benchmarks?

2. Hierarchical partial pooling and multi-task learning. This is the direct attack
   on small n: share strength across sports, markets, seasons and teams so a
   70-row stratum borrows from a 2,000-row one. Hierarchical Bayesian models,
   mixed-effects models, empirical Bayes shrinkage, multi-task neural networks,
   meta-learning. Which formulation is best supported and how is the shrinkage
   schedule chosen rather than guessed?

3. Representation learning on play-by-play. The idea closest to how language models
   are built: self-supervised pretraining on decades of plays (next-play prediction,
   masked play modeling, contrastive drive embeddings) to learn team, player and
   situation representations, then fine-tuning for game outcome. Has anyone
   demonstrated this transfers to outcome or market-beating prediction? Include
   tracking-data work and the Big Data Bowl literature. Be explicit about whether
   the scale of available data supports pretraining at all, and what scaling
   behavior has actually been observed in this domain.

4. Sequence and state-space models for team strength. Kalman filters, particle
   filters, dynamic Elo, Gaussian processes over time, temporal fusion transformers.
   How should a team's latent strength evolve, and how is the process noise fit
   rather than assumed?

5. Learning to rank and selection, not just probability. Our product decides which
   picks to publish and in what order, which is a ranking and selection problem.
   Listwise and pairwise objectives, LambdaMART, top-k selection under a budget,
   learning to abstain, selective prediction with a coverage-risk curve.

6. Inherently interpretable high-capacity models. The product must explain why it is
   betting something. Explainable boosting machines and GA2M, neural additive
   models, generalized additive models with pairwise interactions, monotone
   constrained ensembles. Do these close the accuracy gap to unconstrained models,
   and do their per-feature contributions hold up as real explanations rather than
   post-hoc stories? Contrast with post-hoc attribution (SHAP, integrated gradients)
   and report the known critiques of post-hoc methods honestly.

7. Uncertainty and calibration. Conformal prediction, Mondrian and cross-conformal
   variants, Venn-Abers multiprobability, conformalized quantile regression,
   adaptive conformal under distribution shift. What guarantees survive when
   exchangeability is violated by drift? What is the smallest calibration set that
   supports an honest interval, and when must the correct answer be refusal?

8. Market-relative learning. Modeling the closing price as the baseline and learning
   only the residual. Beat-the-close as a training target versus outcome as a
   target. Line movement, steam and order-flow features. What does the market
   microstructure literature say about when a public model can persistently beat a
   liquid close, and in which markets and sports that has actually been demonstrated?

9. Online learning and non-stationarity. Follow-the-regularized-leader, exponentially
   weighted forecaster aggregation, online gradient descent on proper scoring rules,
   contextual bandits, change-point detection, drift-aware retraining schedules.
   Regret bounds that actually mean something at our data rate.

10. Causal inference. Double or debiased machine learning, uplift modeling,
    synthetic controls, causal forests. Where does a causal framing genuinely beat a
    predictive one here, for example injury impact, coaching change, rest, and where
    is it overkill?

11. Ensembling and distillation. Stacking, Bayesian model averaging, mixture of
    experts with a learned router over sport and market, distilling a large ensemble
    into a small deployable model. How are experts and routers fit without
    overfitting the router at our sample sizes?

12. Automated discovery. Automated feature engineering, symbolic regression, neural
    architecture search, LLM-driven hypothesis generation. Report honestly: most of
    these have weak track records on low-signal tabular problems, and an earlier
    internal effort using symbolic regression produced no surviving finding.

13. Multimodal and heterogeneous fusion. Combining structured stats, text (news,
    beat reports, injury language), weather grids and market ticks. Early versus
    late fusion, missing-data-aware architectures, text embeddings as features, and
    whether text has ever been shown to add information beyond the price in a liquid
    sports market.

14. Techniques from frontier model development that transfer. Evaluate each for real
    applicability, not metaphor: retrieval augmentation (retrieving similar
    historical games as context), test-time compute and self-consistency, mixture of
    experts, curriculum and data ordering, distillation, preference or reward
    modeling trained on realized outcomes, critic and verifier models applied as a
    veto layer, scaling-law analysis for how much more data actually buys in this
    domain, and continual learning without catastrophic forgetting.

15. The learning loop as system design, which may be the most important section.
    How do serious ML organizations build systems that improve continuously?
    Feature stores and point-in-time correctness, automated backtesting with purged
    and embargoed cross-validation, champion and challenger promotion, shadow
    deployment, experiment tracking and pre-registration, multiple-hypothesis
    control across many candidate features, data versioning and reproducibility,
    automated monitoring for drift and calibration decay, active learning for
    deciding what to label or prioritize next. Describe the reference architecture
    and the failure modes that make such loops stall in practice.

EVIDENCE STANDARD, AND THIS IS NOT NEGOTIABLE

- Cite primary sources: paper titles, authors, venue, year, and a link or DOI you
  have actually seen. If you cannot verify a citation, write UNVERIFIED next to it
  rather than presenting it as established. A fabricated citation makes the whole
  report unusable.
- Separate three things explicitly for every claim: what has been demonstrated in a
  sports or market-pricing setting with out-of-sample results; what has been
  demonstrated only in other domains; and what is plausible but untested.
- Report effect sizes with their sample sizes, and note whether the evaluation used
  a proper time-ordered split.
- Report negative results and replication failures. They are as valuable as the
  positive ones and they are usually harder to find.
- Where a claimed edge exists in the literature, ask whether it would survive the
  vig, and say so.

DELIVERABLE

1. An executive summary of at most one page: the three things that would most
   improve this engine, and the three most seductive approaches we should refuse.
2. One section per research area in the format above.
3. A ranked build list. For each item: expected improvement, data required,
   engineering cost, sample size needed before it can be evaluated at all, the
   pre-registered kill criterion, and its dependencies.
4. A proposed reference architecture for the continuous learning loop, concrete
   enough to implement, including what runs on what schedule.
5. An explicit list of what you could not determine and what would resolve it.

ANTI-GOALS

Do not recommend deep learning because it is modern. Do not recommend a method
without saying how it fails. Do not treat accuracy as the objective when the
objective is calibrated probability plus beating a price. Do not propose anything
that requires data we cannot lawfully use. Do not pad the report with definitions
of well-known methods.
```

## How to read the result

Sections 3, 14 and 15 are where the answer most likely lives. Section 15 is the one to
read first: it tells us why the previous ten months of building did not accumulate.

Anything the report recommends enters this engine through the same door as every other
signal: a pre-registered hypothesis with a kill line written on the same line as the
prediction, a shared test set, fixture-grouped and time-ordered folds, and a result
recorded whether it lives or dies. A method that cannot pass that door is research, not
product, however impressive its provenance.
