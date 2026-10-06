# [2133] A Later Test Set Is Not a New Domain: Pretraining Familiarity Survives a Contamination-Free Hold-Out (arXiv:2609.10357v1)

**Citation:** Mahdi Naser Moghadasi, Faezeh Ghaderi (2026). *A Later Test Set Is Not a New Domain: Pretraining Familiarity Survives a Contamination-Free Hold-Out*. arXiv:2609.10357v1. URL: https://arxiv.org/abs/2609.10357
**Ledger completed:** 2026-09-22. **Read:** full text (PDF-extracted). Lane: `timeseries_foundation`.
**Verdict:** ADAPT — the contamination-free protocol plus the domain-familiarity finding directly constrain how GSE may pretrain and evaluate sports TSFMs: recency alone doesn't decontaminate; GSE needs domain holdouts stated relative to disclosed corpora.

## 1. Research question
Do time-series foundation models' strong benchmark scores reflect generalization or pretraining contamination — and does a hold-out that postdates every model's release (making window memorization impossible) eliminate the advantage?

## 2. Dataset / schema
- **Contamination-free hold-out:** 7 forecasting groups from 5 domains, every observation published *after* the release date of the most recently released evaluated model; all datasets rebuildable without an API key from continuously published institutional sources.
- **Groups:** Wikipedia pageviews (500 series each: daily/weekly/monthly), Weather (300 hourly), Air quality (379 hourly), Electricity (46 hourly), Exchange rates (29 daily), +2 more groups (7 total).
- **Forecasters:** 13 total — 4 classical, 3 trained-per-dataset, 6 pretrained (incl. TimesFM-3, Chronos family, Moirai-2).

## 3. Method / model
- **Protocol:** place the entire test window after the last model's release date; nothing in the hold-out could have been memorized.
- **Analysis:** rank-based comparison with multiple-comparison rank intervals and corrected paired tests (Friedman + post-hoc); cost measured alongside accuracy on identical hardware.
- **Familiarity test:** within-pretrained-family comparison on identical series (series difficulty cancels): TimesFM vs. Chronos family on Wikipedia vs. everywhere else; correlate advantage with corpus familiarity (TimesFM's authors describe Wikipedia pageviews as the bulk of its pretraining corpus).

## 4. Equations & assumptions
- Ranks with multiple-comparison intervals (not just decimal-place metric gaps); Mann–Whitney U for the within-family familiarity test.
- Seasonal strength and spectral entropy measured on input windows as candidate intrinsic explanations (both rejected).
- Assumptions: post-release publication ⇒ no memorization (true for the window, the paper's whole point is it's insufficient for the domain); institutional sources are uncontaminated by model outputs (no AI-generated feedback loops); rank intervals capture the decision-relevant uncertainty.

## 5. Features / target
Benchmark-design paper; inputs are the 7 domain groups, targets are the standard forecast horizons per group. The "target" of the paper is the *evaluation methodology* itself.

## 6. Validation design
13 forecasters × 7 groups, all post-release observations; Friedman test per group; paired corrected tests; cost-accuracy joint reporting; within-family familiarity contrast (TimesFM vs. Chronos on Wikipedia vs. non-Wikipedia).

## 7. Numerical results / baselines
- **Pretrained models win 5 of 7 groups** — but lose one to a **Theta baseline** (Electricity) and on daily exchange rates are **indistinguishable from seasonal naive** (Friedman doesn't reject; every method ties).
- **Largest gain: 28% lower MASE than the best classical method**, on weekly Wikipedia pageviews — TimesFM's pretraining domain (same source, same granularities, differing only in time window).
- **Within-family:** TimesFM outranks Chronos by **−0.53 on Wikipedia vs. −0.09 everywhere else** (1,500 vs. 754 series, **Mann–Whitney p < 10⁻⁵**) — the advantage tracks corpus familiarity, not series properties.
- **Negative results:** seasonal strength and spectral entropy do *not* explain the pattern (seasonal strength if anything negatively associated with the advantage); most published-style gaps between leading pretrained models fall inside multiple-comparison rank intervals — i.e., leaderboard differences are often noise.
- **Cost:** reported alongside accuracy (identical hardware) — a first for this literature.

## 8. Code / data availability
Fetchers released to rebuild the exact panel from keyless sources; protocol fully described. (Verify repo link at implementation.)

## 9. Leakage & limitations
- The hold-out is contamination-free for *windows* but the paper's thesis is that *domain* familiarity survives — the protocol demonstrates the problem more than solving it (domain holdouts relative to disclosed corpora are prescribed, not fully constructed).
- Only 7 groups / 5 domains; sports is not among them — the familiarity effect size on sports sequences is unmeasured.
- "Rebuildable without API key" depends on institutional sources remaining stable.
- Cost reporting is hardware-specific; relative costs transfer, absolute don't.

## 10. GSE overlap
No contamination/domain-holdout methodology in the GSE corpus. This directly threatens the naive reading of every other ledger in this lane: if GSE pretraining corpora include public NFL data (nflverse, odds histories), then "zero-shot" sports evaluations are familiarity-contaminated by construction. The 2026-09-17 benchmark audit covers data quality, not pretraining overlap. This paper mandates a disclosure + holdout discipline GSE doesn't have yet.

## 11. GSE implementation spec
1. **Corpus disclosure:** every sports-TSFM ledger's pretraining corpus gets a published manifest (sources, date ranges, series counts) — the "disclosed corpora" the paper demands.
2. **Domain holdouts:** define holdout *domains* relative to the corpus, not just later windows: e.g., pretrain on NFL regular season, hold out playoffs (different domain: elimination dynamics); pretrain on 2002–2019, hold out the COVID/opt-out seasons as regime holdouts; hold out entire stat categories (e.g., no special-teams series in pretraining).
3. **Familiarity audit:** replicate the within-family test — compare two backbones with different pretraining corpora on identical sports series; the gap that survives is familiarity, and it must be reported, not marketed as generalization.
4. **Leaderboard discipline:** report rank intervals, not decimal places, for internal model selection (most gaps are noise — the paper's finding).
Effort: 1–2 engineer-weeks for manifests + holdout definitions; ongoing discipline.

## 12. Reproducible test
Dataset: sports pile with disclosed manifest. Test: (a) temporal holdout (2022–2024) AND (b) domain holdout (playoffs; COVID seasons) for each backbone in 2122–2126. Metric: performance drop from (a) to (b) — the familiarity gap. Baselines: classical (Theta/ETS) on the same holdouts. Success: the protocol is *implemented* and the familiarity gap is *measured and reported* for every backbone; no gate on the gap's size (it's diagnostic).

## 13. Acceptance / rejection gate
ADOPT the disclosure+holdout protocol as mandatory: no sports-TSFM result is reported internally without (i) a corpus manifest, (ii) both temporal and domain holdout numbers, (iii) rank-interval (not decimal) comparisons; any "zero-shot" claim on a domain present in the pretraining corpus is automatically relabeled "familiar-domain" and REJECTED as a generalization claim. REJECT any backbone whose entire evaluation is a post-release temporal holdout with no domain holdout — per this paper, that's insufficient evidence.

## 14. Improvement experiment
Familiarity-decay measurement: pretrain ablated corpora with varying fractions of sports data (0%, 10%, 50%, 100% of the NFL pile, remainder generic series) and plot the domain-holdout performance vs. sports-fraction curve. Hypothesis: familiarity gains saturate fast (the paper's Wikipedia effect came from "bulk of corpus"), so a 25%-sports corpus may capture most of the benefit — meaning GSE can keep a genuine held-out sports domain while still getting familiarity where it counts, by *choosing* which subdomains to familiarize.
