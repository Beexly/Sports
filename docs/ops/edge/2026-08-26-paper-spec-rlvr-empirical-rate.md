# Paper spec — arXiv:2607.00164 · Verifiable Rewards for Calibrated Probabilistic Forecasting

**Source:** Singh, Reddy & Chopra (Cascade Research), arXiv:2607.00164v1, 30 Jun 2026.
Full text fetched and read 2026-08-26 (PDF, all 14 pages incl. appendices A–D).
**License: CC BY-NC-ND 4.0** — method ideas are usable (methods are not
copyrightable); do NOT reuse the paper's text, figures, or released
code/adapters without checking their repo license separately. Everything below
is paraphrase + extracted numbers.

**Corpus id:** ORBIT_NEXT_50 #58 · feeds EDGE-PATH E1 ("skill-doc" item) and the
E2 resolution diagnosis.

---

## 1. Method (as extracted)

### 1.1 Task and setting (§3)

NFL in-game win probability. State `x` = score margin, quarter + time
remaining, down & distance, field position, team in possession, and the public
pregame point spread. Output: one probability that the possession team wins.
The live market win probability is withheld from both prompt and reward — it is
the evaluation reference only (integrity audit in their App. D). Splits are
season-disjoint: train 2015–2022 (40,246 states), select 2023 (5,241), test
2024 (5,185), nflfastR data.

Framing that matters for us: this is **aleatoric** forecasting — the output IS
the probability and the label is one Bernoulli draw. There is no "correct
answer" to be confident about. Calibration target is the conditional rate
η(x) = Pr(win | x), never the realized outcome.

### 1.2 The reward (§4.1, their Eq. 1)

Naive verifiable reward against the realized outcome `y ∈ {0,1}`:

```
r_naive = 1 − (p − y)²         // unbiased but high-variance
```

fails: two identical favorites, one winning and one losing, emit equal and
opposite gradients; the noise is intrinsic to a binary label and swamps the
per-state signal in GRPO's small comparison groups. Their fix — replace the
single draw with a **state-conditioned empirical win rate** p̂(x), estimated
from training-season outcomes only:

```
r = 1 − (p − p̂(x))²           // Eq. (1) — verifiable, label-free, dense
```

"Label-free" = no human labels; p̂ aggregates the same realized outcomes the
binary reward would use, averaged over similar states into a low-variance
estimate of η(x). p̂ is called the *teacher* because a model trained on Eq. (1)
can be no better calibrated than p̂ itself (an explicit ceiling).

Reward-target ablation (their Table 1, identical training, held-out n=128):
realized outcome → Brier 0.166 / ECE 0.10; blend ½y + ½p̂ → 0.181 / 0.121
(worse on both — reintroduces the noise); empirical rate → **0.154 / 0.050**.

### 1.3 State-conditioned binning (Appendix A)

Buckets over three game-level features (their stated counts/edges verbatim):

| Feature | Bins | Edges |
|---|---|---|
| Score margin (possession team) | 14 | ±1, ±4, ±7, ±10, ±14, ±21 pts |
| Time remaining | 7 | 2, 5, 10, 15, 30, 45 min |
| Pregame spread | 9 | ±0.5, ±3, ±7, ±10 pts |

(Transcription note: 12 margin edges yield 13 intervals; the paper says
"fourteen bins" — presumably a split at 0. Immaterial for our port.)

Raw bucket value = fraction of that bucket's training plays won by the
possession team. Sparse buckets shrink toward coarser parents by hierarchical
empirical Bayes, applied from the global rate downward:

```
p̂_bucket = (w + M · p̂_parent) / (n + M),   pseudocount M = 25
```

where `n` = plays in bucket, `w` = wins. Granularity ablation (their Table 5,
2023 eval): adding field position + down changes nothing at game level (Brier
0.1532 coarse vs 0.1534 fine), so the reward stays coarse. Lesson: **condition
on game-level features only; drive-level features add noise, not game signal.**

### 1.4 Training loop (§4.2, §5, App. B) — recorded for the R&D file only

- GRPO (TRL), Qwen2.5-7B-Instruct, **no SFT**; LoRA r=16, α=32, dropout 0.05;
  8 completions/state at temp 0.9; token-level loss; single on-policy update;
  250 steps, 20-step warmup, checkpoint every 50, selected by Brier on 2023.
- Two decoupling variants — the paper's second core finding is that even with
  the denoised reward, letting the policy gradient flow through
  chain-of-thought tokens *decalibrates* (held-out Brier 0.25→0.34, ECE
  0.19→0.30): optimizing the final number rewrites the reasoning into
  pseudo-quantitative arguments for extreme values.
  - **Direct**: no CoT, ≤48-token answer; lr 2e-5, KL 0.01.
  - **Masked-CoT**: ≤640 tokens of reasoning sampled, gradient masked to the
    final `Probability: NN%` span only; lr 3e-5, **KL β=0 required** (the k3
    KL estimator overflows when the gradient concentrates on few tokens).
- Masked-CoT keeps reasoning faithful: blinded-judge inconsistency rate
  (stated probability does not follow from own reasoning) 22.4% → 4.4%
  (App. C, 250 stratified held-out plays).

### 1.5 Evaluation vs the betting market (§3, §5, §6)

Metrics: Brier; ECE + MCE over 10 equal-width bins; accuracy; Murphy
decomposition; reliability diagrams; paired bootstrap over plays (10⁴
resamples). Market odds → probability via Štrumbelj (2014) [their ref 32] —
same family as our devig oracle. Held-out 2024 (n=5,185), their Table 3:

| System | Brier | ECE | MCE | Resolution |
|---|---|---|---|---|
| Qwen 7B zero-shot (CoT) | 0.1681 | 0.0687 | 0.1493 | 0.0875 |
| Masked-CoT RLVR | 0.1522 | 0.0293 | 0.0684 | 0.0986 |
| Direct RLVR | 0.1443 | 0.0292 | 0.0596 | 0.1058 |
| DeepSeek-V4 zero-shot | 0.1438 | 0.0430 | 0.0716 | 0.1078 |
| Empirical rate p̂ (teacher) | 0.1432 | 0.0437 | 0.0993 | 0.1083 |
| Betting market | 0.1355 | 0.0273 | 0.0824 | 0.1148 |

Static-feature comparison (their Table 4): tuned nflverse WP model 0.1562,
GBM-all-features 0.1584 — both **worse** than the coarse bucketed rate 0.1432.

Three take-aways we can operationalize:

1. **The convergence test.** Three unrelated estimators (RL-trained 7B,
   frontier LLM, tabular rate) land at the same Brier (~0.143–0.144; paired
   bootstrap separates none). When unrelated methods agree, the score is the
   information ceiling of the inputs — further accuracy requires NEW
   information, not a better model. The market's +0.008 edge is live in-game
   info; the gap is resolution, not reliability (0.106 vs 0.115).
2. **A trained model can beat its own teacher on calibration** (ECE 0.029 vs
   p̂'s 0.044) by smoothing the bucketed target — analogous to what our CIR
   does to PAVA plateaus.
3. **Keep the number-producing path away from the narrative-producing path.**
   Their gradient mask is the training-time version of a rule we already hold:
   probability computed upstream, prose conditions on it, prose never adjusts it.

---

## 2. Data required vs data GSE has

| Paper needs | GSE equivalent | Status |
|---|---|---|
| Settled outcomes with state features | `picks` table: `confidence`, `pickType`, `result`, `generatedAt`, sport, line — 1,469 settled non-bootstrap WIN/LOSS as of 2026-08-25, via read-only `hermes_ro` SQL-over-HTTP | HAVE (small — hence EB shrinkage is essential) |
| A market-implied probability per state | devig oracle (q per pick at generation); line archive for movement | HAVE (archive stalled since Aug 22 — owner action, E0) |
| Season-disjoint holdout discipline | `timeHoldoutSplit` in `probability-calibration.ts` | HAVE |
| Play-level in-game states | — | DON'T HAVE and don't need: our picks are pregame; our "state" is pick metadata, not game clock |
| GPU RL lane | — | DON'T HAVE (and out of scope, see §5) |

---

## 3. Port plan

### 3a. NOW — offline eval: the empirical-rate teacher for our own confidence stack

The idea, translated: build p̂(x) over **our settled picks**, conditioned on
pick-level state, with the paper's exact shrinkage rule, and score every
forecaster we have (raw κ, PAVA(κ), CIR(κ), market q) against it. This is a
state-conditioned reliability audit — strictly finer than the 10-bin ECE we run
today, and it directly measures whether confidence carries any information
beyond state (the L12 grouping-loss question, now with a principled estimator).

**New module** `packages/prediction-engine/src/empirical-rate-teacher.ts`
(pure, strict TS, unit-tested; sibling of `probability-calibration.ts`):

```ts
interface TeacherSample { readonly y: 0 | 1; readonly features: readonly number[] }
// binIndex per feature from explicit edge arrays (like the paper's App. A)
interface TeacherConfig {
  readonly dims: readonly { name: string; edges: readonly number[] }[];
  readonly pseudocount: number; // default 25, per the paper
}
// Hierarchical EB: global rate -> marginal per dim-prefix -> full bucket,
// each level shrunk toward its parent: (w + M*parent)/(n + M).
function fitEmpiricalRateTeacher(samples, config): TeacherModel; // predict(x) -> p̂
function teacherGapReport(forecasts, teacher): { perBucket: ..., meanAbsGap, brierVsTeacher };
```

Candidate dims for the first fit (keep COARSE — their Table 5 lesson, and our
n=1,469 forces it): `pickType` (3) × market-implied-prob band from q
(edges 0.40, 0.50, 0.55, 0.60, 0.65 → 6 bands) × optionally sport (collapse if
sparse). ~18–54 buckets, EB-shrunk, fit on the train slice of
`timeHoldoutSplit(0.7)` only.

**New script** `scripts/calibration-offline/teacher-eval.ts` (same I/O contract
as `fit-real-sample.ts`, extended export with q and sport):

1. Fit teacher on train slice; report held-out Brier/ECE of the teacher itself
   (is the bucketed rate a better forecaster than our confidence? — their
   Table 4 says a coarse rate beat two fancier models).
2. Score raw κ, PAVA(κ), CIR(κ), and q against teacher and against outcomes.
3. **Convergence test**: if PAVA(κ), the teacher, and q converge on held-out
   Brier, that is affirmative evidence κ contains no information beyond state —
   the Brier-floor diagnosis of `2026-08-26-CALIBRATION-FIT-REPORT.md`
   becomes a positive statement: resolution must come from new covariates (E2),
   full stop.

**Gates:** offline only; nothing imports this from live scoring; results land
as a dated ops report next to the calibration fit report; re-run at the same
~250-settled cadence. No new env, no network beyond the existing `hermes_ro`
read path.

### 3b. LATER — R&D path (parked, founder-gated)

If/when GSE trains its own p-model for props (E2 covariate ladder), the
paper's two rules become training law: (i) never train against single
outcomes — train against state-conditioned empirical rates (or use them as the
calibration check on a supervised model); (ii) if an LLM is ever in the number
path, the number must be produced by a direct head or a masked span — no
gradient (and, at inference, no prompt pressure) on reasoning tokens. An
actual RLVR run (GPU, GRPO, 7B) is not on any current horizon.

---

## 4. Effort estimate

- `empirical-rate-teacher.ts` + tests (hierarchy, shrinkage, edge cases,
  determinism): **~1 day**.
- Extended SQL export (add q + sport) + `teacher-eval.ts` + first report:
  **~1 day**. Depends on devig q being reconstructable for settled picks — if
  q wasn't stored per pick, first run conditions on `pickType` × confidence
  band only and says so honestly.
- Total: **~2 days**, fully offline, zero live-path risk.

---

## 5. What we deliberately skip and why

- **RL training entirely** (GRPO/LoRA/GPU): no GPU lane, n=1,469 vs their
  40k states, and E1's goal is honest display, not trained calibration.
  Post-hoc PAVA/CIR already passes the ECE floor; the binding gap is
  resolution, which no calibration method — trained or post-hoc — can create.
- **Their code/adapters**: paper is CC BY-NC-ND; we re-derive from the method
  description only. No text or figure reuse.
- **In-game/live win probability**: our product surface is pregame picks; the
  play-level state machinery has no consumer here yet.
- **Fine-grained buckets**: their own ablation says game-level features
  suffice, and our sample cannot support more anyway.
- **LLM-as-forecaster**: our law is the opposite and stays so — Claude is
  content-only, never source of truth. This paper is used to *audit* numeric
  forecasters, not to add an LLM one.
