# Challenges — c10 full slice (r01–r60)

Claims challenged on evidence, inflated numbers corrected to honest versions, and standing
REJECTs. Part A sections (r01–r30) then Part B C1–C15 (r31–r60), then the cross-half
standing list from the coordinator merge (2026-10-02). Marking inference as inference
throughout; nothing inflated.

---

## Half A — inflated numbers, contradictions, negative results (r01–r30)

Every challenged claim in this half: what is weak, inflated, vacuous, or rejected — why — and what would rehabilitate it. REJECT-verdict methods stay rejected; that is stated explicitly in each case. Numbers below were verified against the cited source files (see `verified-claims-partA.md`).

---

## A. Inflated or misleading numbers (the honest delta is smaller)

### 1. r26/1516 — SEL features: 60.11% → 81.32% accuracy is a leakage signature, not a breakthrough
Claim: Random Forest accuracy jumps 21.2pp (60.11% → 81.32%, Brier 0.4837 → 0.3145) from two "strength of early lineup" features.
Why challenged: the source file itself flags it (INFERENCE by the deep-read author): the paper does not state strengths were re-estimated strictly as-of each match date (expanding window). A 21-point jump from two features on a 250-game test set is the classic leakage shape. Also: single small test window (250 games, one sport/gender, three months), no opponent adjustment in strength estimation (unbalanced schedules), no CIs.
Status: ADAPT with the numbers treated as **upper bounds achievable only with future information**.
Rehabilitate: re-run expanding-window with as-of-date strength estimates; report the with/without-SEL delta on that run. The SEL *pattern* (early-lineup strength) is portable; the *numbers* are not.
Source: `arxiv-program/research/2026-09-21/arxiv-deep/1516-prediction-of-handball-matches-with-statistically.md`

### 2. r04/0178 — serve prediction 83.18% vs betting odds 69.04%: probable target leakage
Claim: RF 83.18% accuracy beats betting odds' 69.04%.
Why challenged: the decisive serve features (FirstWonFirstIn, SecondWonSecondIn) have no stated pre-match aggregation window and appear sourced from per-match charting — i.e., the features likely contain the outcome being predicted. Odds still achieved the highest total confidence score (2059.66) despite lower accuracy, which is consistent with odds being calibrated and the RF being sharp-but-leaky.
Status: **REJECT stays rejected.**
Rehabilitate: pre-match-only feature windows, walk-forward evaluation, calibration comparison (not just accuracy).

### 3. r03/0049 — the +21.3% headline is a straw-man comparison; honest delta is +5.2%
Claim: relativized features beat absolute features by +21.3% AUC.
Why challenged: +21.3% is relative-vs-*single*-absolute; vs the *two-feature* absolute the delta is **+5.2%**, and in head-to-head trials relative beats two-feature in only 51% of accuracy / 61% of AUC trials — a statistical tie, exactly as the paper's theory predicts. The brief already makes this correction; the challenge is to anyone quoting the headline.
Status: ADAPT, but the gate (≥0.01 AUC vs the **relativized twin**) exists precisely because of this.
Rehabilitate: pre-register the two-feature-absolute baseline in every future relativization test.

### 4. r25/1448 — the +2.8pp accuracy gain is largely from dropping draw modeling, not better skill
Claim: G-Elo accuracy 0.6656 vs Elo-Davidson 0.6375 (+2.8pp), LS 0.6224 vs 0.6304, RPS 0.2166 vs 0.2200.
Why challenged: the source notes the accuracy gain comes "largely from dropping draw modeling" — a modeling-scope choice, not evidence of superior skill estimation. On EPL the same method gives small consistent LS/RPS gains with accuracy flat (0.5389 vs 0.5442). NFL-only +2.8pp on one dataset is a single-source risk.
Status: ADAPT, with the gate (ΔLS ≥ 0.005 AND accuracy ≥ baseline+1pp on 2019–2023) and a re-score under the ignorance rule (r21/1083 says ignorance > Brier > RPS at low imperfection).
Rehabilitate: show the LS/RPS gain persists after re-scoring under ignorance, and decompose accuracy gain into draw-modeling vs skill-estimation components.

### 5. r29/1608 — quote the capped number, not the uncapped one
Claim: uncapped theoretical profit $4,418.44 (single-market arb).
Why challenged: the executable number is **$210.19 capped** ($100/episode); the uncapped figure assumes infinite liquidity at top-of-book in markets where 76.9% of combinatorial episodes are liquidity-constrained (average executable size 14.79 shares). Median ex-outlier yield is 11.0% / $11.01 per episode.
Status: ADAPT as measurement methodology; the capped series is the only one that may inform sizing.
Rehabilitate: depth-walked executable profit (the r29/1618 Eqs. 2–4 framework) replaces both.

### 6. r22/1143 — corr ≈ 1 means the value is uncertainty, not new rankings
Claim: rGAX residualized metric — corr(GAX,rGAX) = 0.998, robustness slopes 0.936 vs 0.757, NFL corr(CPAE,rCPAE) = 0.997.
Why challenged: correlation ≈ 1 with the raw metric *everywhere* — rGAX does not re-rank anyone. The marginal product is the CI/p-value machinery, and the paper's figures are **not multiplicity-corrected**.
Status: ADOPT, but ship CIs with Bonferroni-Holm/BH/BY correction for decision use — never a "new leaderboard."
Rehabilitate: demonstrate a decision that changes under multiplicity-corrected rGAX CIs vs raw GAX ranks.

### 7. r10/0424 — the contamination bias is real but second-order vs noise
Claim: Messi GAX 127.6 → 120.8 under contamination; corrected 127.57 → 149.99.
Why challenged: the same source shows a +25% finisher at 150 shots/season has **SD 3.73 around a mean GAX of 3.70** — single-season GAX is mostly noise, and the contamination bias is second-order relative to that noise. Decontamination effort should not outrank sample-size effort.
Status: ADAPT as an audit discipline, not as a precision upgrade.
Rehabilitate: show a decision-useful CI tightening from decontamination at fixed sample size.

## B. REJECT verdicts that stay rejected (with grounds)

| Brief | Claim | Why it stays rejected | What would rehabilitate |
|---|---|---|---|
| r29/1631 | Drawdown-minimizing portfolios "dominate the index on >99% of out-of-sample days" | No edge/probability input — minimizes trailing realized drawdown, concentrating stake on low-volatility legs regardless of +EV. >99% claim with zero transaction costs + overlapping 30-day in-sample windows is an overfit signature. No stake-sizing rule (weights, not bankroll fractions). | Edge filter before the optimizer + transaction costs + fresh-regime out-of-sample |
| r23/1173 | Dirichlet-process infinite forecast combinations | Combining infinitely many forecasts adds nothing without a real diversity/edge input. r27/1550's angular combining (+2.7% MQS) already covers the combination lane with a falsifiable method. | Beat angular combining on MQS with a documented diversity input |
| r21/1103 | Neuro-symbolic historical probabilities (Cannae 57.3%, Zama 57.8%) | N=7/N=2 samples; circular calibration (model confirms hand-fed structure); arbitrary ground truth; no held-out validation; degenerate "100.0% [100.0%, 100.0%]" interval signals broken machinery. | Held-out validation on non-hand-fed structure; non-degenerate intervals |
| r23/1193 | Self-affirmation feedback model of football goal distributions | Era-pooled fits (1963–2005 as one distribution); feedback parameter is a league-level constant, not a team trait — cannot rate teams. **Zero predictive content**: never forecasts a match, goal count, or price; no proper scoring rule. | Any out-of-sample forecast scored by a proper rule |
| r27/1539 | "Dynamic analysis and prediction" 0.913–0.932 accuracy | 4-class labels derived from the same Bayes computation as the classifier — circular. No out-of-sample numbers, no Brier/log-loss, no baselines beaten. | Independent labels; proper scoring; baselines |
| r22/1123 | Automated tackle injury-risk assessment | 15% risk region: 62.50% on 64 clips, 36.70% over 109; F1 = 0.50, Cohen's κ = 0.28 (fair). Below any usable operating point. | κ ≥ 0.6 with pre-registered operating threshold on fresh film |
| r26/1464 | ACL landing simulation thesis | No validated predictive numbers transferable to NFL injury modeling. | Validated prospective numbers |
| r04/0178 | Serve prediction 83.18% | See A.2 — probable target leakage. | Pre-match windows + walk-forward |
| r02/0028 | Asia Cup T20 structured dataset | EDA results are figure-referenced only — **no numeric values in the text**. Nothing to verify or build on. | Numeric tables |
| r12/0504 | Velocity-disambiguation VFI (LPIPS 0.105→0.086, NIQE 6.663→6.220) | No test on sports broadcast footage; 448×256 evaluation far below broadcast 1080p; no prediction-modeling application. | Broadcast-footage test at 1080p |
| r08/0343, r08/0353, r09/0383 | Badminton vision / action-frame prediction / 3D HMR | Vision methods with no NFL-transferable numbers in this half's scope. | NFL tracking-data application with gates |
| r09/0393 | "The most exciting game" | Qualitative; no numbers. | — |
| r11/0484 | Structure regularization theory | Theory with no sports application or numbers. | Sports prediction application |
| r12/0524 | RLHF distortion revisited | Alignment theory; not engine-relevant. | — |
| r13/0534 | LLM benchmarking "before the action" | Benchmark results not transferable to the prediction engine. | — |
| r14/0595 | Limits of PageRank-based ranking | Negative result on PageRank limits; no buildable replacement in the brief. | — |
| r17/0814 | Parimutuel permutations mechanism | Mechanism design; no NFL market application. | — |
| r05/0253 | In-season batting averages | Baseball-specific empirical-Bayes; the partial-pooling *pattern* is noted but the numbers don't transfer. | — |
| r06/0263 | Systematic review of CI in sports | Review; no primary numbers. | — |
| r06/0273 | Cardiorespiratory causal paths | Not sports. | — |
| r04/0129 | Communication protocol choice | No data; the only salvageable item is a *proposed* benchmark study (REST vs SSE vs WebSocket; adopt winner only if ≥2× lower p99 at equal CPU). | Run the proposed study |

## C. Negative results that are valuable (challenged the heuristic, not the paper)

### 8. r16/0716 — difficulty/consensus abstention heuristics are invalidated
The paper's own variance decomposition: difficulty alone explains 0.4–1.5% of the deferral signal; +ability → 0.8–1.8%; +IRT ambiguity → 1.1–3.7%; **residual unexplained 76.8–90.2%**. Any GSE abstention rule built on "hard questions" or "model disagreement" proxies is building on <4% of the signal. What survives: MC-Dropout variance itself (+1.9–2.4pp AUC, bootstrap CI ±0.13pp never crossing zero). The abstention stack (Pipeline 1) must key on calibrated uncertainty, never on difficulty proxies.

### 9. r13/0575 — no exploitable hot hand
Posterior means: β_CH = −0.49 (−0.58,−0.39); β_HC = 0.38 (0.27,0.49). Whatever the sign pattern, the brief's upshot for GSE is that raw-streak "momentum" features are not evidence-backed; regime structure belongs in a tested HMM (r30/1654, gated on holdout predictive log-likelihood ≥ 0.02 nats/obs), not in streak counters.

### 10. r28/1595 — F1 41.4 is modest; the method forces ≥1 event per sentence
The paper's own limitations: absolute F1 41.4 (vs 27.6 SOTA — a real gain, but modest); only pairs with a matching player name get PairModels (tactical/stat sentences invisible); forces ≥1 event per sentence (wrong for stats/weather/strategy talk); quadratic pairwise scaling; no code. The NFL port's "no-event/strategy-talk" head and the F1 ≥ 0.55 gate exist because of these weaknesses.

## D. Single-source risks (one paper, one dataset, one regime)

1. **r05/0213's ≥0.003 log-loss gate is ledger-authored, not a paper result.** The survey ran no experiments; the gate is a build contract written by the deep-read author. It is reasonable, but it has not itself been validated — the first PlusDC-BT run *is* the validation.
2. **r30/1654: one team, one season, in-sample only.** ΔAIC = 48 / ΔBIC = 35 for the copula over independence, and K=3 by BIC (20,979 vs 21,020/21,030/21,098), are all in-sample on 3,214 minute-level observations of Borussia Dortmund 2017/18, fit by 50-restart numerical ML. Treat as a template with a hard holdout gate, not as evidence that momentum regimes exist.
3. **r29/1641: B=25 bootstrap × weekly refits is compute-heavy**, and the sliding window discards all old residuals even in stable regimes; window length T′ is an untuned knob. The weeks-1–4 win (0.893 vs 0.646) is on solar/wind/sensor data, not NFL margins — the NFL replication is the actual test.
4. **r30/1677: Prop. 2's "only if" direction is proof-under-review.** The d-regular characterization is one-sided as published; the star-is-worst result (Cor. 1) is the solid leg. Lean on Cor. 1, not Prop. 2's converse.
5. **r29/1618's $1.118M** excludes a judged-coordinated $381,748 anomaly cluster (3 addresses, Dec 12 2025) — the headline is already cleaned, but the cleaning itself is a judgment call worth knowing about.
6. **r28/1582: model-cycle changes (Cy43r1/Cy45r1) forbid pooling reforecasts across eras** — any GSE weather replication must respect the same era boundaries in GEFS reforecasts.
7. **r22/1163 PARTIAL:** the candies "best guess 630" figure is not present in the cited source file (truth G=636, ⟨g⟩=531, error 16.5%, 70%, skewness 0.73 all verified). Do not quote 630 without the primary paper.

## E. Vacuous or untestable-as-written (kept honest by their own briefs)

- **r02/0028**: figures with no numeric values (see B).
- **r04/0119 LAPIS**: 82.7–92.1% token reduction is real, but "LLM reasoning quality on LAPIS vs OpenAPI is explicitly untested" — the paper admits no comprehension experiment, and lossy conversions (oneOf → most common variant) are exactly where an agent picks the wrong variant. Token savings ≠ safe adoption.
- **r21/1093 contest recommendation**: the online A/B win is reported via plots only — exact numeric lifts not stated in text (chart-read only). Cannot be cited as a number.
- **r20/1033, r10/0444, r10/0454, r09/0373, r07/0333** (vision/NLP): ADAPT verdicts with no NFL-transferable numeric gates in this half — portable patterns only, each needs its own gate before wiring.
---

## Half B — challenges C1–C15 (r31–r60)

Every challenged claim, why it fails, and the exact rehabilitation path. Ordered by
severity. Claims not listed here survived challenge at the level verified.

---

## C1. r53 L10 provider probes: self-contradictory ESPN verdict — CONTRADICTED

**The conflict** (`ops/calibration/2026-08-19-l10-provider-probes/RESULTS.md`):
- Lines 13, 41–52: probe table records ESPN **FAIL** (81.9ms, 41.4ms); detail sections
  record **HTTP 403** for the scoreboard and teams endpoints.
- Line 145: summary claims **"Live probe OK... returns 200 with JSON"**.
- Line 154: ESPN listed under "Cleared for immediate use."

Both cannot be true. The 403s are recorded in the measurement section; the "cleared" line
is in the summary — the summary was likely written against a different run or a
stale template.

**Why it matters:** ESPN is the event-identity source for game-row joins (the ESPN
event-id backfill blocker C-150 is real, per r51). Building on "cleared" while the
provider 403s would silently break every ESPN-joined row.

**Rehabilitation:** run a fresh probe now; until it returns 200, **treat ESPN as blocked**.
Do not cite line 154.

## C2. r55 public-surface specs vs the 2026-09-28 HARD doctrines — CONTRADICTED

**The conflict:**
- `product/galaxy-memory-persistence-spec.md:179`: "Memory is public. Anyone can navigate
  to /room/[gameId] for any past tracked game and see the Memory panel." Plus `/memory`
  searchable archive (lines 46, 115, 187, 194).
- `product/monetization-map.md:28,160-162`: free tier includes Public Ledger with
  **per-pick signal snapshots**, a **methodology page**, public Edge Index, Edge Lab tools.
- The 2026-09-28 HARD doctrines: public = **projections and rankings only**; all data,
  metrics, signals, and methodology **internal**. NGS doctrine: metrics never shown, not
  even a little.

The specs are product-strategy documents, not shipped code — but if they get built as
written, they violate standing doctrine. The Public Ledger's "signal snapshot" is the
sharpest conflict: a per-pick signal snapshot is methodology disclosure by another name.

**Rehabilitation:** a decision, not a default. Either (a) the specs get rewritten to the
doctrine (public = settled pick + projection, no signal snapshots, no methodology page),
or (b) Garrett amends the doctrine with explicit carve-outs. Until then, quote the
doctrine, not the specs.

## C3. r37/2047 AlphaEvolve: SR 21.3 is an in-sample-flavored, double-dipped, cost-free number — PARTIAL (headline) / VERIFIED* (mechanics)

**The problems** (all admitted in the ledger's own lines 34, 42, 45-46):
1. **Validation double-dipping:** the validation set is used *both* for fitness during
   evolution *and* for the 15% correlation cutoff.
2. **Annualized from 116 validation days** (~5 months) — a short window for an annualized
   Sharpe.
3. **No transaction costs** in the long-short evaluation.

SR 21.3 is a screening statistic, not an expected return. Quoting it as performance —
as the brief's Findings section risks when read casually — violates DISCLOSURE_COPY's
"never present an illustrative example as a live prediction" spirit.

**What survives:** the mechanics are real and portable — redundancy pruning via the
15%-cutoff weak-correlation rounds, the fingerprint cache. Adopt the *pruning protocol*,
not the number.

**Rehabilitation:** re-run on a test set that was used for neither fitness nor the
cutoff, with transaction costs, over ≥2 years. Quote only test-set SR.

## C4. r33/1804 APMM: the ~6% parlay edge is in-sample — PARTIAL

**The problems** (ledger lines 53, 62, 67, 80, 82-83):
1. **In-sample replay:** interaction parameters estimated on the same tape the maker
   prices against.
2. **Non-adversarial flow assumption** — real flow includes sharps who see the maker's
   price.
3. **Fees excluded** — the business model itself is not in the evaluation.
4. Order-5/6 ratios (0.938) on thin data.

**Rehabilitation:** walk-forward replay with fees and adversarial flow before any
production claim. The quadratic-vs-exponential loss claim is the theoretically
interesting piece; the 0.938 ratio is not evidence.

## C5. r33/1827 NeSymReS: "outperforms all baselines on all 5 datasets" is unverifiable from the paper text — PARTIAL

The ledger itself (line 39): **"exact point values are not recoverable from the text —
the rankings are the paper's stated conclusions from those curves."** The headline claim
rests on curves, not tables. The 1e-14/token skeleton penalty is a hand-tuned hack
(line 62).

**Rehabilitation:** the ledger's own bake-off gate (line 65) — within 5% test RMSE of
PySR's 30-min best at 100s budget on nflverse 2024–2025. Run that; quote only its result.

## C6. r33/1852 feature programming: 80/20 random split, no pruning — PARTIAL

The paper's eval is a **random 80/20 split, not walk-forward** — on time series, that's a
hygiene failure, not a result. No pruning mechanism exists in the paper, so the
multi-horizon +88% R² number is measured on an unpruned feature explosion.

**Rehabilitation:** causal operators + a pruning stage + walk-forward eval. Until then,
the R² deltas are screening numbers.

## C7. r34/1885 drift ensemble: deployment attribution has confounders; no significance test — PARTIAL

The ledger (line 41) acknowledges confounders in the "33% fewer major incidents" Walmart
attribution. Drift labels are label-flip injections — a coarse proxy. No significance
test that the majority-vote ensemble beats the best single detector (the headline
"top-3 on every metric" could be a small-N artifact).

**Rehabilitation:** McNemar or paired permutation test on the benchmark; treat the
deployment number as anecdotal.

## C8. r59 dk-salary-week2: TLS-impersonated client — needs Garrett's forbidden-endpoint ruling

**The fact** (dk-salary-week2-import.md): the DK salary import was verified live against
DK's own metadata (draftGroupId 154078, 1,135 draftables → 619 players) using a
**TLS-impersonated client**.

**Why it's flagged, not rejected:** the import works and the numbers are verified. The
open question is policy, not engineering: does a TLS-impersonated client against DK's
metadata endpoints violate Garrett's standing rules on forbidden endpoints / ToS
boundaries? This interacts with statking-integrity's one-line blocked-source rule
(r60:7-8) — the principle that some sources stay off-limits even via alternate routes.

**Rehabilitation:** Garrett's explicit ruling. Until then: the template is reusable for
*authorized* feeds; do not generalize the TLS-impersonation pattern to other providers
without the ruling.

## C9. r51 NFL_WEEK1_COVERAGE: the 0.58 fairProb floor structurally suppresses tight-line ML picks — design choice, not bug

**The fact** (NFL_WEEK1_COVERAGE_2026-09-08.md:93,105,115): `scoring.ts:965` —
`if (fairProb < 0.58) return null` DROPS. A −3 favorite prices ~−150/+130; de-vigged
that's 0.580 — **sitting exactly on the floor**.

This is a conservative design choice (don't publish low-confidence ML), but it has a
coverage cost that must be named: the engine structurally cannot publish moneyline picks
on tight-line NFL games. Any coverage or hit-rate accounting that doesn't disclose this
is misleading.

**Rehabilitation:** either (a) document the coverage cost explicitly in the coverage
report, or (b) replace the hard floor with the confidence-gravity mechanism (market-gravity
r41: bounded [5,85] confidence adjustments) so tight-line games publish at low
confidence instead of disappearing.

## C10. r47 keenum: n=323 targets / 10 games — suggestive, not predictive

The file itself (line 167): "Single-game variance dominates — treat the pattern as
suggestive, not predictive." The rusty-backup rule (≥8-week gap, ≥10 targets) and the
individual-player blanket finding are real patterns in a small sample. The brief is
honest about this; the challenge is to anyone tempted to hard-code it as a Phase-2
archetype without the 2026 backtest the brief's own gate requires.

**Rehabilitation:** the brief's gate — backtest the rule on 2024–2025 backup-QB returns
before it enters the QB vector.

## C11. r41 dossier-v2: the dossier's own caveat must travel with the 0.61 number

dossier-v2-methods.md:119-136: **"No peer-reviewed paper with clean forward-validation
was located... reported here with that caveat... provisional until a peer-reviewed
forward-validation study is found."** The pass-efficiency vs wins gap (0.53–0.61 vs
0.13–0.19) is the dossier's "single most actionable number" — but it is a
stability/reproducibility synthesis, and stability ≠ predictive relevance (the dossier
says this itself).

**Rehabilitation:** the forward-validation study the dossier asks for — or GSE's own:
regress future point differential on lagged passing efficiency vs rushing efficiency,
walk-forward, 2000–2025. Until then, quote the number with the caveat attached.

## C12. r54 architecture handoff: dated 2026-09-18 — re-verify before acting

The contamination punchlist (trueProb cron rewrite, cqr 83.33% coverage, null-clock
leakage hole, row-index walk-forward, market-logit shrinkage, double-inverted metrics)
is the single most important integrity finding in the half — but it is **dated
2026-09-18**. Some items may be fixed. Acting on a stale punchlist risks re-breaking
fixed code or double-counting fixed items in audit reports.

**Rehabilitation:** re-run the punchlist's file:line checks against the current tree
before citing any item as live. The two contaminations also cited in the LLM playbook
(trueProb rewrite, row-index walk-forward) are the highest-priority re-checks.

## C13. r36/2022 feature store: zero numbers, aspirational sections, unvalidated anti-leakage — PARTIAL

The paper has **no latency/throughput/consistency figures**; §3 is marked "aspirational...
not formally implemented"; merge semantics assume "no failure of dumping"; the
anti-leakage mechanism (§4.4) has **no validation that it works** (2022:28-31,47,58-61).

**Rehabilitation:** adopt the (event_ts, creation_ts) semantics and per-source delays as
design input; validate the anti-leakage rule with a synthetic leak-injection test (insert
a future-dated row, confirm it can never be read by an as-of query). Do not cite the
paper as validated architecture.

## C14. r43/2601.14727 Bradley–Terry: survey with zero new empirical evidence — PARTIAL

The ledger (line 117): **"no CLV, no Brier score, no ROI anywhere; the NFL row in Table 2
is decorative."** The three algorithms (Newman FPI, EM-MAP, PlusDC) are re-implementable
equations, not validated sports models. Two landmines the ledger itself flags: sync
Newman FPI may diverge on near-bipartite graphs (async required); vanilla MLE is
unusable early-season (Ford-condition divergence on undefeated teams — ûᵢ→∞).

**Rehabilitation:** the brief's own gate — ≥2% walk-forward Brier improvement over the
current team-strength prior on 2022–2024. Until then, the equations are candidates, not
upgrades.

## C15. Stays rejected / blocked (no rehabilitation without new evidence)

- **1631 drawdown optimizer** (other half): REJECT stands — optimizes drawdown with no
  edge input. 1749/1203 are the non-contradictory versions. Do not re-litigate.
- **RESCUE A8** (r58): stays BLOCKED — ran on a synthetic fixture. Boltzmann 0.2558 vs
  isotonic 0.2148 is evidence *against* shipping it, not a benchmark to beat later on
  the same fixture.
- **Cohort-A CLV** (r50): clearsBreakEven=false — no edge claimed, none available to
  claim.

## Challenge method note

The strongest challenges in this half came from the ledgers' and briefs' *own*
adversarial notes (2047 double-dipping, 1827 unrecoverable point values, 1804 in-sample
replay, 2022 aspirational sections, dossier-v2's missing forward-validation, keenum's
variance caveat). The verification pass treated those notes as first-class evidence —
a brief that attacks its own claim is more trustworthy, not less, and its numbers are
the ones most likely to survive contact with the build queue.
---

## Cross-half standing list (coordinator merge, 2026-10-02)

**CONTRADICTED (2, both in r31–r60 — the most policy-urgent findings in the slice):**
1. r53 L10's "ESPN cleared for immediate use" vs the measurement section's ESPN 403s —
   treat ESPN as blocked until a fresh probe clears it.
2. r55's product specs (public Memory rooms, Public Ledger with signal snapshots,
   methodology page) vs the 2026-09-28 HARD public/private doctrines — decision required,
   not a default.

**REJECTED in both halves — do not re-litigate:**
- 1631-style drawdown minimization with no edge input (PartA challenge A-table + PartB
  exclusion note).
- Abstention on difficulty/consensus heuristics (0716: 76.8–90.2% residual unexplained;
  cited in PartA challenges and PartB S7).

**Honest-delta corrections that now apply slice-wide:** 0049 +5.2% (not +21.3%); 1448
+2.8pp (draw-modeling scope, decompose before adopting); 1608 $210 capped (not $4,418);
1143 value-is-uncertainty (corr≈1 with raw); 0424 bias-is-second-order; 2047 21.3% SR
(double-dipped, cost-free); 1804 ~6% parlay edge (in-sample); 1827 headline unverifiable.

**PARTIALs needing primary-source confirmation before public use:** r22/1163 candies
"best guess 630" (truth G=636); r22/1143 Dalton (8|8) CPAE transcription.

**Policy flags for Garrett's ruling:** the DK salary import's TLS-impersonated client
(C8) — forbidden-endpoint ruling required before generalizing; cv-scoreboard-ocr is a
build-or-drop item (B16).

**Standing INFERENCE warnings:** the α-governor's discrete reconstruction (ledger's own
reconstruction of the Azéma–Yor rule), B3's two-docs-agree claim, and the ledger-authored
gates [LEDGER] are build contracts, not findings — the first implementation run is the
validation.
