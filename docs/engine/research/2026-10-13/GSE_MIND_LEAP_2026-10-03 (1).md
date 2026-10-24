# GSE_MIND_LEAP_2026-10-03

Status: executable instructions for Hermes and the mind. Not an audit. Not a card.
Repo verified on origin: `Beexly/Sports`, branch `research/engine-plan-2026-10-03`, HEAD `d74e2eeaea666168aaf761394e17bde952acc8b5` (prompt short hash `d74e2eeae`). Plan folder verified: `docs/research/2026-10-03/engine-plan/`. Binding file verified: `docs/research/2026-10-03/engine-plan/GSE_V3_DECISIONS_2026-10-03.md`.
Conflict rule: this document's later section wins. Section E's ceiling paragraph wins over any claim that NFL hit rate 1 is a near-term deliverable. Section G's numeric kills override a LIVE row in F if the kill fires. The user prompt overrides V3's sentence "Do not spend the gate trying to beat 0.6098 on the moneyline." The target is not replaced. A tie with the close is not a stop.
Hard constraints from the prompt, restated as code rules: do not start a second `mind_train.py` if `brain/mind_train.pid` is alive. Do not download weights. Do not duplicate the repo. Do not write Neon production picks. Do not place a bet. Week 4 mint is forecast-only. FTN charting is CC-BY-SA and does not enter a served price. Stop a provider at $8 if responses go empty. Do not retry these four on the inference API: `mimo-v2.6-flash-free`, `fledge-alpha-free`, `big-pickle`, `muse-spark-1.3-contributor-free`.
Numbers below are the prompt's measured numbers unless a path is cited. Anything not re-measured is UNVERIFIED.

Prompt receipts used as inputs, not re-litigated:
- Champion: market-offset, point-in-time QB, home/neutral, Elo residual. Log loss 0.6107 vs de-vigged close 0.6098, n=1,914. Gap CI includes 0. Hit rate 0.6625. Close hit rate 0.6635. Misses to hit rate 1: 646.
- Do not cite 0.6072. That number used actual starters and was leaky. V3 says the same: `docs/research/2026-10-03/engine-plan/GSE_V3_DECISIONS_2026-10-03.md`.
- V3 receipt on the same comparison, different n labeling: engine v1 log loss 0.6107, Brier 0.2116, ECE 0.0216; close log loss 0.6098, Brier 0.2112, ECE 0.0224; gap CI -0.00001 to 0.00196. Log loss is the score.
- Corpus: `C:\Users\Garrett\_research\agent-bus`, about 5,000 text files, 0.11 GB. Fulltext: `C:\Users\Garrett\_research\agent-bus\research\arxiv-sweep\fulltext`, 1,115 files, 0 empty, min 2,817 bytes, median 61,283. Claimed sweep 865 does not match. Do not subtract.
- Extract: `C:\Users\Garrett\_research\ctx-2026-10-03\corpus_extract\extract.jsonl`, 5,103 records. UNVERIFIED by this session. Verify: `(Get-Content 'C:\Users\Garrett\_research\ctx-2026-10-03\corpus_extract\extract.jsonl' | Measure-Object -Line).Lines`
- Mind trainer LIVE. `mind.jsonl` 11.6 MB, 1,471 lines. Log `brain/mind_train.log`. Script `brain/mind_train.py`. Watchdog cron `b3dd3d599d0e`.
- Reasoner stopped at 81 (`brain/mind_actions.jsonl`). Thinker stopped at 41 (`brain/mind_thoughts.jsonl`). Index: `brain/intelligence_index.json`, 991 KB, 11,623 lines. Extend, do not rebuild.
- Reader failure: arXiv 0707.1051, file 55,022 bytes, reader returned 0 characters. Verified title: Braverman and Mossel, Noisy Sorting Without Resampling, https://arxiv.org/abs/0707.1051.

Verify commands this session did not run:
- `(Get-ChildItem 'C:\Users\Garrett\_research\agent-bus\research\arxiv-sweep\fulltext' -File).Count`
- `Get-Content C:\Users\Garrett\_research\ctx-2026-10-03\brain\mind_train.pid`
- `Get-Item C:\Users\Garrett\_research\ctx-2026-10-03\brain\mind.jsonl | Select-Object Length`

---

## A. The mind, as a system

Implement tonight in Python on the Windows machine. No local GPU. No new weights. Fleet that answered: `space-bunny-free`, `glm-5.3-flash`, `gpt-6-luna` on OpenCode Zen; `xiaomi/mimo-v2.6-flash`, `deepseek/deepseek-v4.1-flash`, `z-ai/glm-5.3-flash`, `nvidia/nemotron-3-ultra-550b-a55b:free` on OpenRouter; `nvidia/nemotron-3-ultra-550b-a55b` on NVIDIA and AI/ML.

### State

Append-only files. A human is not in the loop.

1. Registry `C:\Users\Garrett\_research\ctx-2026-10-03\brain\paper_registry.jsonl`. One row per fulltext file. Fields: `path`, `sha256`, `bytes`, `arxiv_id`, `extract_status` in `{unread, empty, partial, equations, refused}`, `equation_ids`, `last_model`, `n_reads`, `extract_chars`. A file with `bytes >= 2817` and `extract_chars == 0` is `refused`, not progress. Canonical case: arXiv 0707.1051, prompt file size 55,022 bytes.
2. `mind.jsonl`. Do not truncate. Prompt baseline 1,471 lines, 11.6 MB.
3. `brain/mind_thoughts.jsonl`. A thought.
4. `brain/mind_actions.jsonl`. An investigation and its result.
5. `brain/intelligence_index.json`. Extend only. Prompt baseline 991 KB, 11,623 lines.
6. `brain/agreement.jsonl`. Two-model equation ledger.
7. `brain/kills.jsonl`. Dead hypotheses. They stay in the log. They leave the live index.

### What a thought is

One JSON line. Invalid if any required field is missing.

```json
{"id":"t-...","ts":"2026-10-03T...","paper_path":"...","equation_latex":"...","claim":"...","domain":"...","prediction":"...","kill_test":{"metric":"...","threshold":"...","n_min":0},"status":"queued"}
```

`paper_path` is a local path or a URL. A thought with neither is dropped.

### What an investigation is

A thought with `status=queued` bound to one runner:

- `compute`: Python on files already on disk.
- `challenge`: a second model must emit the same normalized equation string.
- `measure`: a metric on a replayable table with a timestamp rule.

### What updates the mind

A line appended to `mind.jsonl`:

```json
{"thought_id":"...","metric":"...","n":0,"value":0,"ci":[null,null],"killed":false,"receipt_path":"..."}
```

If `killed` is true, the index row's `status` becomes `KILLED`. The equation can remain as a signal. It is not an edge.

### How it avoids rereading as progress

Dedup key is `sha256(path + normalized_equation)`. A second read of the same paper that emits the same equation does not increment progress. Progress is a new equation, a new measurement, or a kill. `n_reads` may increase. The progress counter may not.

### How it refuses an empty extraction

```text
if file_bytes >= 2817 and extract_chars < 200:
    status = READER_FAIL
    do not write a mind row
    retry once on a different answered model
    if still empty: quarantine the path, do not delete, do not subtract from 1115
```

### Loop a coder implements tonight

S0. If `brain/mind_train.pid` is alive, do not launch `mind_train.py`. Resume only with `python C:\Users\Garrett\AppData\Local\hermes\scripts\mind_watch.py`. Watchdog `b3dd3d599d0e` already restarts a dead pid every 30 minutes.
S1. Scan fulltext. Enqueue any file with `extract_status` missing or `empty` and `bytes >= 2817`.
S2. Extract equations only. Two models must emit the same normalized string or the equation is `UNVERIFIED` and is not indexed.
S3. Emit a thought only if equation, kill test, and source path exist.
S4. Run the investigation. Append the result.
S5. Dedup. Reread is not progress.
S6. Commit on `research/engine-plan-2026-10-03` and push. A commit not on origin does not exist.
S7. If a provider returns empty responses, stop that provider at $8. Do not drain a balance on 429 retries.

This section wins over any script cap. The reasoner cap at 81 and the thinker cap at 41 are not completion.

---

## B. Intelligence index, the product surface

Extend `brain/intelligence_index.json`. Do not rebuild. One object per signal. A row with no `source_path` is invalid and is dropped on write.

```json
{
  "signal_id": "str",
  "equation": "full latex",
  "domain": "math|physics|vision|learning|calibration|portfolio|language|sports",
  "source_path": "arxiv URL or local path",
  "local_path_status": "VERIFIED|UNVERIFIED",
  "verify_command": "exact command",
  "lets_mind_see": "one sentence",
  "test": "exact falsifier",
  "test_run": false,
  "measurement": null,
  "uncertainty": "interval or UNVERIFIED",
  "status": "CANDIDATE|KILLED|LIVE"
}
```

Local filename-to-paper mappings were not listed in this session. Every local path below is UNVERIFIED. Verify with:

```powershell
Get-ChildItem 'C:\Users\Garrett\_research\agent-bus\research\arxiv-sweep\fulltext' -File | Where-Object { $_.Name -match '0707.1051' }
```

Rows. Source path is the paper URL, which this session resolved. `test_run` is false unless the prompt already measured it.

1. `noisy_sort_ml`. \( s_q(\sigma)=\sum_{i,j:\sigma(i)>\sigma(j)} q(a_{\sigma(i)},a_{\sigma(j)}) \). Domain math. Source https://arxiv.org/abs/0707.1051. Lets the mind see the MLE order under independent comparison noise. Test: synthetic tournament, \(\gamma=0.1\), \(n=64\), recovered \( \sum_i|\sigma(i)-\pi(i)| \) must be \(O(n)\), not \(O(n^2)\).
2. `log_loss`. \( \mathrm{LL}=-(1/n)\sum_i [y_i\log p_i+(1-y_i)\log(1-p_i)] \), \(p\) clipped to \([10^{-6},1-10^{-6}]\). Domain calibration. Source https://arxiv.org/abs/1706.04599 (NLL). NFL measurement from the prompt: 0.6107 vs close 0.6098, n=1,914, CI includes 0. Status LIVE as a score, not as an edge.
3. `brier`. \( \mathrm{BS}=(1/n)\sum_i (p_i-y_i)^2 \). Domain calibration. Source https://arxiv.org/abs/1706.04599. V3 measurement: engine 0.2116, close 0.2112. Test: BS must be finite and in \([0,1]\).
4. `murphy`. \( \mathrm{BS}=\mathrm{REL}-\mathrm{RES}+\mathrm{UNC} \), \( \mathrm{UNC}=\bar y(1-\bar y) \). Domain calibration. Source Murphy 1973, used by Guo et al. https://arxiv.org/abs/1706.04599. Test: REL must be \(\ge 0\). If REL > UNC the forecast is worse than climatology and the head is KILLED.
5. `ece`. \( \mathrm{ECE}=\sum_{m=1}^{M}(n_m/n)|\mathrm{acc}(B_m)-\mathrm{conf}(B_m)| \). Domain calibration. Source https://arxiv.org/abs/1706.04599 eq. 3. V3 measurement: engine 0.0216, close 0.0224. Test: after temperature, ECE on a later split must fall or the calibration head is KILLED.
6. `temperature`. \( \hat q_i=\mathrm{softmax}(z_i/T) \), \(T>0\) fit by minimizing NLL on a validation split only. Domain learning. Source https://arxiv.org/abs/1706.04599. Lets the mind see overconfidence without changing argmax. Test: accuracy change \(\le 0.001\) and NLL falls. Else KILL the implementation.
7. `platt`. \( q(s)=1/(1+\exp(-(As+B))) \). Domain calibration. Source Platt 1999, cited by Guo et al. https://arxiv.org/abs/1706.04599. Test: fit A,B on an earlier split only; if later-split LL does not fall, KILL.
8. `elo_expect`. \( E_a=1/(1+10^{(R_b-R_a)/400}) \). Domain ranking. Source Elo 1978. Prompt already measured the Elo residual inside the 0.6107 champion. Do not re-litigate. Point-in-time: rating updated only after the outcome timestamp.
9. `kelly_growth`. \( g(f)=p\log(1+bf)+(1-p)\log(1-f) \), \( f^*=p-(1-p)/b \), \( b \) is net decimal odds. Domain portfolio. Source Kelly 1956, Bell System Technical Journal. Test: replay log-growth on labeled outcomes. No order is sent. Not a bet instruction.
10. `dislocation`. \( D(\sigma,\pi)=\sum_i|\sigma(i)-\pi(i)| \). Domain math. Source https://arxiv.org/abs/0707.1051. Paper states \( D=\Theta(n) \) and \( \max_i|\sigma(i)-\pi(i)|=\Theta(\log n) \) with high probability for an optimal \(\sigma\). Test: if \( D>10 n\log n \) on the synthetic, kill the recovery claim for that \(\gamma\).
11. `softmax_ce`. \( \mathcal L=-\sum_k y_k\log\mathrm{softmax}(z)_k \). Domain learning. Source standard; NLL form in https://arxiv.org/abs/1706.04599 eq. 6. Test: gradient of a one-hot row is \( \mathrm{softmax}(z)-y \). If a finite-difference check disagrees by \(>10^{-4}\), KILL the implementation.
12. `focal`. \( \mathrm{FL}(p_t)=-\alpha_t(1-p_t)^\gamma\log(p_t) \). Domain vision. Source Lin et al., https://arxiv.org/abs/1708.02002. Lets the mind see down-weighting of easy negatives. Test: at \(\gamma=0\) the loss equals cross-entropy. If not, KILL.
13. `mixup`. \( \tilde x=\lambda x_i+(1-\lambda)x_j \), \( \tilde y=\lambda y_i+(1-\lambda)y_j \), \(\lambda\sim\mathrm{Beta}(\alpha,\alpha)\). Domain vision. Source Zhang et al., https://arxiv.org/abs/1710.09412. Test: \(\lambda=1\) recovers the original pair. If not, KILL.
14. `dropout_expect`. At test time, \( \mathbb E[h]=p\,W h \) for inverted-dropout inverted, or scale weights by keep-prob \(p\). Domain learning. Source Srivastava et al. 2014, JMLR. Test: train-mode mean of 1,000 masks must match \(p\) within 0.02. Local path UNVERIFIED.
15. `conformal_set`. Prediction set \( C(x)=\{y: s(x,y)\le \hat q\} \), \(\hat q\) the \((1-\alpha)(1+1/n)\) empirical quantile of calibration scores. Domain learning. Source https://arxiv.org/abs/2107.07511 (Angelopoulos and Bates tutorial). Test: on a calibration split, empirical coverage must be \(\ge 1-\alpha\) up to sampling error. If coverage \(< 1-\alpha-0.05\) on n\(\ge 200\), KILL the implementation.
16. `page_rank`. \( r=(1-d)/N + d\,P^\top r \), \( d=0.85 \). Domain language. Source Page et al. 1999. Test: \( r \) sums to 1 and the power iteration residual \( \|r_{t+1}-r_t\|_1<10^{-8} \).
17. `tfidf_cosine`. \( \mathrm{tfidf}(t,d)=\mathrm{tf}(t,d)\log(N/\mathrm{df}(t)) \), \( \cos(u,v)=u\cdot v/(\|u\|\|v\|) \). Domain language. Source standard IR. Test: identical documents have cosine 1. If not, KILL the tokenizer, not the equation.
18. `kl_gap`. \( \mathrm{KL}(q\|p)=\sum_k q_k\log(q_k/p_k) \). For a proper log score the excess risk equals KL. Domain calibration. Source standard; NLL minimizer statement in https://arxiv.org/abs/1706.04599. Test: KL \(\ge 0\), equal to 0 iff \( p=q \).
19. `bayes_update`. \( p(\theta\mid D)\propto p(D\mid\theta)p(\theta) \). Domain math. Source standard. Test: on a Beta-Bernoulli toy, posterior mean equals \((\alpha+s)/(\alpha+\beta+n)\). If not, KILL the implementation.
20. `kalman`. Predict \( \hat x_{t|t-1}=F\hat x_{t-1} \), \( P_{t|t-1}=FP_{t-1}F^\top+Q \). Update \( K_t=P_{t|t-1}H^\top(HP_{t|t-1}H^\top+R)^{-1} \), \( \hat x_t=\hat x_{t|t-1}+K_t(z_t-H\hat x_{t|t-1}) \). Domain physics. Source Kalman 1960. Test: scalar 1-D random walk, innovation should be white. Local path UNVERIFIED.
21. `brownian_var`. For \( W_t \), \( \mathbb E[W_t]=0 \), \( \mathrm{Var}(W_t)=t \). Domain physics. Source standard. Test: simulated paths, sample variance within 10% of \( t \) at n\(\ge 1{,}000\).
22. `auc`. \( \mathrm{AUC}=\Pr(s_+>s_-) \). Domain learning. Source standard. Test: a perfectly ordered score has AUC 1; a reversed score has AUC 0. If both fail, KILL.
23. `isotonic`. Pool-adjacent-violators: nondecreasing \(\hat p\) minimizing \(\sum_i (p_i-y_i)^2\) under the order constraint. Domain calibration. Source standard. Test: output is monotone. Fit on an earlier split only.
24. `heldout_mod10`. A paper is test-only if the integer formed by its arXiv id with the dot removed is divisible by 10. Domain learning. Source: this document, section D. Test: no held-out id appears as a training write in `mind.jsonl`.
25. `clip_prob`. \( p=\min(1-10^{-6},\max(10^{-6},p)) \) before any log. Domain calibration. Source numerical. Test: LL is finite on a row with \( p\in\{0,1\} \).

Rows 11–23 cite public equations. Their presence in the 1,115-file directory is UNVERIFIED. Do not mark them LIVE until the registry matches the arXiv id to a file with `extract_chars > 200`.

---

## C. Reasoning, not retrieval

A thought becomes an investigation only when a runner is bound. A JSON note with no runner is not a thought. The current thinker stopping at 41 notes is fake progress (section G).

### Pattern 1. Computation on files already on disk

Source: https://arxiv.org/abs/0707.1051. Local file size 55,022 bytes is the prompt's measurement. A 0-character read is a reader failure.

Equation to minimize:

\[
s_q(\sigma)=\sum_{i,j:\,\sigma(i)>\sigma(j)} q\!\left(a_{\sigma(i)},a_{\sigma(j)}\right)
\]

with \( q(a_i,a_j)=+ \) with probability at least \( 1/2+\gamma \) if \( \pi(i)>\pi(j) \), \(\gamma>0\) constant, errors independent, and \( q(a_i,a_j)=-q(a_j,a_i) \).

Derivation: under independent comparison noise the likelihood of a permutation is monotone in the number of agreeing pairs, so the MLE is the feedback-arc minimizer on the noisy tournament. Dislocation \( D(\sigma,\pi)=\sum_i|\sigma(i)-\pi(i)| \). The paper states that an optimal \(\sigma\) satisfies \( \sum_i|\sigma(i)-\pi(i)|=\Theta(n) \) and \( \max_i|\sigma(i)-\pi(i)|=\Theta(\log n) \) with high probability.

Kill test: re-extract the local file with a second answered model. If characters stay 0, mark `READER_FAIL`, do not index, do not delete, do not subtract from 1,115. If the extracted objective is not the sum above, mark `UNVERIFIED`.

### Pattern 2. Second model challenged to break the first derivation

Source: Guo, Pleiss, Sun, Weinberger, https://arxiv.org/abs/1706.04599.

\[
\hat q_i=\mathrm{softmax}(z_i/T),\qquad T>0
\]

\( T \) is fit by minimizing NLL on a validation split only. For \( T>0 \), \( \arg\max(z/T)=\arg\max(z) \), so accuracy is invariant. A measured accuracy change is an implementation bug, not a theorem failure.

Kill test: model A emits the equation and the invariance. Model B must emit the same normalized equation string. Mismatch means `UNVERIFIED`. If a replay on any logit file already on disk moves accuracy by more than 0.001, kill the implementation.

### Pattern 3. Measurement that can falsify the thought

\[
\mathrm{LL}=-(1/n)\sum_i\left[y_i\log p_i+(1-y_i)\log(1-p_i)\right]
\]

\[
\mathrm{BS}=(1/n)\sum_i(p_i-y_i)^2=\mathrm{REL}-\mathrm{RES}+\mathrm{UNC},\qquad \mathrm{UNC}=\bar y(1-\bar y)
\]

Derivation: a feature that does not add resolution can move LL only through reliability. The prompt measurement is LL 0.6107 vs close 0.6098, n=1,914, gap CI includes 0, hit rate 0.6625 vs 0.6635.

Kill test: a new point-in-time signal is killed as an edge if \( \Delta\mathrm{LL}\ge -0.001 \) or the CI on the gap includes 0 on those same 1,914 rows. Protection stress, INT occurrence, pressure-floor INT, target concentration, deep rate, and takeaway start-position already moved by thousandths or less. They stay on the engine as signals. They are not edges. Do not cite 0.6072.

Section E wins on the conflict: binary hit rate 1 is not a near-term NFL deliverable. The target is not replaced.

---

## D. Frontier-lab moves that still apply tonight

No 70B pretrain. No weight download. Moves that still apply:

1. Data mixture. Tag each fulltext file by arXiv id prefix. Mixture weight: math, physics, vision, learning, calibration above sports notes. Inbox kit notes are not the mind.
2. Curriculum order. (i) byte-size gate, (ii) two-model equation extract, (iii) replay the derivation on disk, (iv) cross-domain transfer of the equation, (v) held-out claim check.
3. Empty-parse rejection. Rule in section A. The 0707.1051 0-character read is the example. Retry once. Do not drop the paper.
4. Self-consistency. Two models from the answered fleet must emit the same normalized equation. Else `UNVERIFIED`. Do not retry the four 403 API models.
5. Held-out slice. A paper is test-only if the integer of its arXiv id with the dot removed is divisible by 10. Never write a signal whose only source is a held-out paper. The test is whether the mind recovers the paper's stated equation without that equation having been written into `mind.jsonl` as a training row.

Agreement rule wins over any single-model extraction. This section agrees with A. No conflict.

---

## E. Path from here toward 100%

Target stays 100% hit rate on every published prediction and log loss 0 on the intelligence index, with every claim traceable to a file or a measurement. A failed hypothesis dies. The target does not. A tie with the close is not a stop.

Decompose the gap. Prompt NFL receipt: 646 misses to hit rate 1 on n=1,914. LL gap vs close is 0.0009 and the CI includes 0.

Missing information. Test: list every symbol in the equation that has no point-in-time file. Data we have: the prompt receipts and V3's gate file `eng/w4_mint_v1_20261003T0757Z.json`, sha256 `b67c48f988f072e65119864bcb49ac6478960b3f181bf5bbef12acdda174099e` (verified in V3 text). Move: add a feature only if a pre-outcome file exists. Do not use actual starters.

Wrong equation. Test: two-model disagreement, or held-out replay fails. Move: kill the equation, keep the target.

Reader failure. Test: `file_bytes >= 2817` and `extract_chars == 0`. Data: prompt minimum 2,817 bytes, 0 empty files, and the 0707.1051 failure. Move: retry once on a second provider. Quarantine. Do not subtract from 1,115.

Overconfidence. Test: LL and ECE.

\[
\mathrm{LL}=-(1/n)\sum_i\left[y_i\log p_i+(1-y_i)\log(1-p_i)\right]
\]

\[
\mathrm{ECE}=\sum_b (n_b/n)\,|\bar p_b-\bar y_b|
\]

Move: temperature scale \( p_T=\mathrm{softmax}(z/T) \), \( T=\arg\min \mathrm{NLL} \) on an earlier split. Accuracy of the argmax is unchanged (Guo et al., https://arxiv.org/abs/1706.04599). Platt: \( q(s)=1/(1+\exp(-(As+B))) \).

Why hit rate 1 is unreachable for binary NFL outcomes given current information. A probability \( p\in(0,1) \) has conditional expected accuracy \( \max(p,1-p)<1 \). Expected accuracy of a calibrated forecast is \( \mathbb E[\max(p,1-p)]<1 \) unless \( p\in\{0,1\} \) almost surely. Log loss 0 requires \( p_i=y_i \) on every row, which pre-game information does not support: the prompt gap vs the close is about 0.0009 and the CI includes 0. Highest realized accuracy the close supports on this sample is 0.6635 (prompt, n=1,914). This paragraph wins over any claim that hit rate 1 is a near-term NFL deliverable. It does not replace the target.

Move that gets closer anyway. Decompose Brier into reliability, resolution, uncertainty. Attack reliability with temperature or Platt on a time split. Attack resolution only with a new point-in-time signal that two models agree on and that beats 0.6107 by a CI excluding 0. Vision and calibration can drive ECE toward 0 on a labeled held-out slice if the labels are on disk. Grouping loss can remain after perfect calibration (https://arxiv.org/abs/2210.16315); that is a separate ceiling, not a reason to stop measuring it. Local presence of that paper is UNVERIFIED.

---

## F. Signals the mind should create tonight, ranked

A signal is an equation, a source, a point-in-time rule, and a test. BUILD-NOW means the data is on this machine per the prompt, or is a free call. Section G overrides LIVE if a kill fires.

1. BUILD-NOW `empty_extract_gate`. Reject if `file_bytes>=2817` and chars==0. Source: prompt fulltext minimum, and arXiv 0707.1051 at 55,022 bytes. Point-in-time: file mtime. Test: READER_FAIL is not a mind row. Reason: the failure already happened.
2. BUILD-NOW `two_model_eq_agree`. Normalized strings equal, else UNVERIFIED. Source: answered fleet. Test: agreement rate on 30 papers. Reason: agreement rule in D.
3. BUILD-NOW `log_loss_score`. Equation in B.2. Point-in-time: \( p \) frozen before the outcome. Test: LL and bootstrap CI. Reason: score any labeled file already extracted.
4. BUILD-NOW `brier_murphy`. Equation in B.3 and B.4. Test: REL \(\ge 0\). Reason: non-NFL calibration split.
5. BUILD-NOW `temperature`. Equation in B.6. Test: validation NLL falls and accuracy moves \(\le 0.001\). Reason: non-NFL.
6. BUILD-NOW `ece`. Equation in B.5. Test: ECE after \( T \) is below ECE at \( T=1 \). Reason: non-NFL.
7. BUILD-NOW `noisy_sort_score`. Equation in C pattern 1. Point-in-time: comparisons only, no resample. Test: synthetic \( n=32 \), \(\gamma=0.2\), \( D=O(n) \). Reason: the empty-read paper, non-NFL.
8. BUILD-NOW `kelly_growth`. Equation in B.9. Test: replay log-growth. No order. Reason: portfolio, non-NFL.
9. BUILD-NOW `heldout_mod10`. Equation in B.24. Test: held-out ids absent from training writes. Reason: non-NFL curriculum.
10. BUILD-NOW `mind_growth_watch`. Lines of `mind.jsonl` must increase from 1,471. Source: prompt. Test: delta lines \( >0 \) per hour. Reason: trainer is live. Do not start a second copy.
11. LATER `vision_grouping`. Grouping loss, https://arxiv.org/abs/2210.16315. Test needs image labels on disk. Reason: no confirmed image dump. Local path UNVERIFIED.
12. BUILD-NOW `elo_residual_freeze`. Equation in B.8. Test: do not recompute with actual starters. Reason: already measured. Not the mind.
13. BUILD-NOW `clip_prob`. Equation in B.25. Test: LL finite. Reason: 0/1 probabilities blow the score.
14. LATER `physics_green`. Model-order-reduction error claims. Source URL only if a registry hit exists. Reason: not verified on disk. Do not invent the measurement.
15. BUILD-NOW `index_row_validity`. A row with blank `source_path` is invalid. Test: invalid count is 0 after extend. Reason: product surface.

Non-NFL among BUILD-NOW: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 15. That is more than 8.

---

## G. What to kill

The target is not killed. These hypotheses and patterns are.

Already measured as noise, from the prompt. Protection stress, INT occurrence, pressure-floor INT, target concentration, deep rate, takeaway start-position. Kill as edges if \( |\Delta\mathrm{LL}|<0.002 \) vs 0.6107 on n=1,914. Keep them as engine signals.

Leaky starter number. Kill any citation of 0.6072. Criterion: a number that uses actual starters is invalid.

Fake progress, numeric:

- Thinker note with no `equation_latex` and no `kill_test`. Kill the pattern if `mind_thoughts.jsonl` grows and investigations stay at 81 for 60 minutes.
- Reread counted as new. Kill if unique arXiv ids in new `mind.jsonl` lines divided by new lines is below 0.5 over 200 lines.
- Empty extraction written as a result. Kill if any row has `extract_chars==0` and `file_bytes>2817`.
- Second `mind_train.py`. Kill if two pids. Check `brain/mind_train.pid` before start.
- Reasoner cap at 81 and thinker cap at 41. A cap hit is not completion.

FTN. If a served price file references FTN charting, reject the file. CC-BY-SA does not enter a served price.

Week 4 mint stays forecast-only. Neon production writes are a hard kill. A placed bet is a hard kill.

This section overrides F if a numeric kill fires.

---

## H. Overnight runbook for Hermes

Clock is 2026-10-03 08:11 CT. Eight hours. Branch `research/engine-plan-2026-10-03`. Push after every commit. Never write Neon production picks. Never place a bet.

H0, now to 09:00. Process: trainer, via watchdog `b3dd3d599d0e`, or `python C:\Users\Garrett\AppData\Local\hermes\scripts\mind_watch.py` if the pid is dead. File: `brain/mind.jsonl`. Proof: line count \( >1471 \). If flat: read `brain/mind_train.pid`. If dead, `mind_watch.py` only. Do not start a second `mind_train.py`. Log: `brain/mind_train.log`.

H1, 09:00 to 10:00. Process: `python -u C:\Users\Garrett\_research\ctx-2026-10-03\brain\mind_reason.py`. File: `brain/mind_actions.jsonl`. Proof: lines \( >81 \), and new lines have a runner. If flat: the cap is the bug. Remove the cap. Restart once.

H2, 10:00 to 11:00. Process: `python -u C:\Users\Garrett\_research\ctx-2026-10-03\brain\mind_think.py`. File: `brain/mind_thoughts.jsonl`. Proof: lines \( >41 \) and each new line has `equation_latex` and `kill_test`. If flat or notes-only: kill that pattern.

H3, 11:00 to 12:00. Process: registry builder, path `C:\Users\Garrett\_research\ctx-2026-10-03\brain\build_registry.py` (not yet written; UNVERIFIED until the file exists). File: `paper_registry.jsonl`. Proof: row count equals fulltext file count. Verify: `(Get-ChildItem 'C:\Users\Garrett\_research\agent-bus\research\arxiv-sweep\fulltext' -File).Count`. Prompt says 1,115. Do not subtract. If flat: rerun the scan. Do not download weights.

H4, 12:00 to 13:00. Process: two-model agreement pass. File: `brain/agreement.jsonl`. Proof: agreement rate computed, mismatches `UNVERIFIED`. If flat: switch the model pair. Stop a provider at $8 if responses go empty.

H5, 13:00 to 14:00. Process: index extender, not rebuilder. File: `brain/intelligence_index.json`. Proof: size \( >991 \) KB or lines \( >11623 \), and every new row has `source_path`. If flat: append only rows that passed agreement.

H6, 14:00 to 15:00. Process: held-out score. File: `brain/heldout_score.json`. Proof: `n_heldout>0` and empty-parse rate recorded. Rule: section D. If flat: the slice was never written. Do not train on it.

H7, 15:00 to 16:00. Process: kill sweep. File: `brain/kills.jsonl`. Proof: the thousandths-LL features have `killed=true` with the prompt receipt. If flat: do not promote them to the index as edges. Disk free about 24 GB. Do not duplicate the repo.

If a proof number is flat for 20 minutes, write the failure to `brain/mind_train.log` and move to the next hour. Credits in the prompt: about $15 OpenRouter, $30 OpenCode, $20 AI/ML, plus NVIDIA API. Current balances UNVERIFIED. The check is the provider dashboard, not a local file.

---

## I. Five hypotheses

At least three are not NFL game outcomes. No paid dataset. No Neon write. No bet.

H1, calibration, non-NFL. Temperature scaling does not change argmax accuracy and reduces NLL. Source: https://arxiv.org/abs/1706.04599. Timestamp: fit \( T \) on an earlier split only. Metric: NLL and accuracy. Sample: any logit dump already on disk; if none, status UNVERIFIED and skip. Kill if accuracy changes by \( >0.001 \) or NLL does not fall.

H2, grouping loss, non-NFL. Grouping loss stays positive on a vision net after calibration. Source: https://arxiv.org/abs/2210.16315. Timestamp: calibration fit on an earlier split. Metric: the paper's grouping-loss estimator. Sample: only if labels are already on disk. Kill if the estimator is \(\le 0\) on the held-out slice. Local file UNVERIFIED.

H3, reader, non-NFL. A second model recovers text on files with size \(\ge 2817\) and prior extract length 0. Source: fulltext directory. Count UNVERIFIED; command in H3. Metric: `recovered_chars`. Sample: every READER_FAIL row, including 0707.1051. Kill if `recovered_chars` stays 0 after the second model.

H4, agreement, non-NFL. Two-model equation agreement predicts held-out replay success. Timestamp: agreement pass before the replay. Metric: agreement rate vs replay match rate. Sample: n\(\ge 30\) held-out papers. Kill if agreement rate \( >0.8 \) and replay match rate \( <0.5 \).

H5, sports, one only. A new point-in-time signal that two models agree on reduces LL vs 0.6107 on the same n=1,914 rows with a CI that excludes 0. Timestamp: feature frozen before kickoff. Metric: LL. Kill if \( \Delta\mathrm{LL}\ge -0.001 \) or the CI includes 0. Do not write Neon production picks. Do not place a bet.

Section E's ceiling paragraph wins over any reading of H5 that treats hit rate 1 as the expected result of this test. H5 tests a gap. It does not replace the target.

---

## Next 10 actions

1. Resume the trainer only with `python C:\Users\Garrett\AppData\Local\hermes\scripts\mind_watch.py` if `brain/mind_train.pid` is dead, and never start a second `mind_train.py`.
2. Build `paper_registry.jsonl` from the fulltext directory, refuse 0-character extracts on files with at least 2,817 bytes, and retry arXiv 0707.1051 on a second answered model.
3. Remove the reasoner cap at 81 and the thinker cap at 41, and drop any new line that lacks `equation_latex` and a kill test.
4. Run two-model agreement on every new equation and mark a mismatch UNVERIFIED.
5. Extend `brain/intelligence_index.json` with the schema in B and drop any row that has no source path.
6. Write the held-out slice as arXiv-id integer mod 10 equals 0, and score extraction fidelity on that slice only.
7. Write `brain/kills.jsonl` for the thousandths-of-log-loss sports features and for the leaky 0.6072 number, and keep those features as engine signals rather than edges.
8. Bind the three runners in C to 0707.1051, 1706.04599, and the n=1,914 log-loss receipt, and append the measurements to `mind.jsonl`.
9. Commit on `research/engine-plan-2026-10-03` and push after every commit.
10. Stop any provider at $8 if responses go empty, and do not drain a balance on 429 retries.
