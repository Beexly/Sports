# Frontier transfer — 2026-09-15 · what actually transfers, and what does not

Source set (all five read on 2026-09-15; the two PDFs were fetched as real PDFs at
`/abs/<slug>.pdf` — the `/pdf/<slug>` paths serve the SPA shell, not a document):

| # | paper | origin | date |
|---|---|---|---|
| P1 | *Finite Time Blowup for Navier–Stokes* | OpenAI | 2026-09-08 |
| P2 | *DeepSeek-V4.1-Flash: Pushing the Limits of KV Cache Compression* | DeepSeek | 2026-09-10 |
| P3 | *The Last AI Built by Humans: Toward Genuine Recursive Self-Improvement* | SJTU Theseus Labs / Tsinghua | 2026-09-15 |
| P4 | *Thinking with Looped Flows* | EPFL / KAIST / UvA | 2026-09-10 |
| P5 | *Recurrent Looped Transformer* | — | — |

---

## 0. THE HONEST TABLE (read this before the ideas)

| paper | what it is | transfers to the prediction engine? |
|---|---|---|
| **P1 Navier–Stokes** | a *conditional* result: given a smooth compactly-supported force, a solution exists whose velocity blows up in finite time at bounded energy; core device is a self-similar rescaling and a quadratic (Reynolds-stress) cancellation | **As physics: no.** Fluid PDEs do not govern prices. **As method: yes** — the *shape* of the result (a scale-free criterion that PROVES an outcome, rather than estimating it) is exactly what a provable hold needs. See N1. |
| **P2 DeepSeek V4.1-Flash** | KV-cache compression (CSA2 cross-layer reuse, FP4, CED asymmetric prefill/decode, SWA Bounded Replay) | **Not to pick quality.** It is a *cost* result. Two real uses: (a) infra spend on GSE's internal-LLM path, (b) an operating rule for agents — see N4. |
| **P3 RSI survey** | Headroom-Closed Index; B0–L5 autonomy taxonomy; the "effective recursion" standard (ΔP>0 at matched compute and evaluation budget) | **Yes, as an audit instrument.** GSE's improvement loop can be scored against it today, and by that standard GSE's compounding lane already fails — see N3. |
| **P4 Looped Flows** | stateful denoiser + probability flow; temporal-alignment training; inference-time scaling; adaptive computation time | **Partly.** GSE does not train these models. But *adaptive computation* — spend more compute where uncertainty is irreducible — is directly implementable in a scoring pipeline. See N2. |
| **P5 Recurrent Looped Transformer** | architecture paper | **No.** Same family as P4; no engine application. |

**A retraction, recorded deliberately.** A previous session of mine (2026-09-13) sketched
"odds vorticity", "pressure gradients in the betting market", and "blowup conditions for line
setting" as applications of the Navier–Stokes result. **That was a metaphor dressed as a
mechanism.** Those notes should not be built on, and are hereby retired. The failure mode they
represent — reaching for an impressive analogy because the analogy is impressive — is the single
fastest way to lose a frontier position, because it produces work that cannot be validated.

---

## N1 · EDGE-INADMISSIBILITY CERTIFICATE — a proof-carrying hold  *(from P1, as method)*

**Implemented and tested:** `inadmissibility.py` + `test_inadmissibility.py` (18 assertions,
all green, including a negative control proving the harness can fail).

### The problem it addresses
GSE's holds are threshold-based ("not enough sportsbooks are pricing this game yet"). A
threshold is a heuristic: unauditable, and wrong in both directions. AGENTS.md already asserts
*"a held row is not a blank — it is the finding."* The strongest form of that assertion is a
hold that comes with a **proof**.

### The derivation
On an internally consistent two-way market the offered price contains the vig, so the raw price
advantage is non-positive by construction — GSE's own v5.3.0 doc states it:
`rawEdge = p_A − o_A = −p_A(S−1) ≤ 0`. A pick therefore earns nothing from rawEdge; it earns
only if the line **moves** toward fair value after the bet (i.e. CLV). So the admissibility
question is not "is the price good?" but:

> is the price good by **more than the amount the line will move at random before kickoff,
> plus the vig already paid**?

```
vig_half        = (o_A + o_B − 1) / 2
σ_move(τ)       = s · τ^α                  (τ = hours to kickoff)
INADMISSIBLE if |p_A − o_A| ≤ vig_half + z·σ_move(τ)
```

### What is borrowed, and what is honestly standard
- **Standard:** the statistical content is a signal-to-cost / noise-band test. That idea is not new.
- **New here:** (a) it is issued as an **auditable certificate** that attaches to a hold row,
  with the arithmetic identity `threshold = vig_half + z·σ` checkable by a reader;
  (b) the tolerance is **scale-free** — `σ` is written in similarity variables `s·τ^α` so one
  calibrated pair sets the band for every sport, market and window, which is the only place
  P1's rescaling genuinely earns its keep;
  (c) **α and s must be measured from the observed line archive**, never assumed. An assumed
  exponent is exactly the "chosen constant" this design exists to forbid.

### Falsifiable predictions (each can kill the design)
1. **α ≈ 0.5.** If the de-vigged fair probability is a diffusive process over the pre-kickoff
   window, then the log-log fit of σ against τ has slope ≈ 0.5. A measured α far from 0.5 is a
   *finding about the market*, not a bug — and it changes the band.
2. **The certificate is conservative.** Among picks it marks inadmissible, the realised CLV beat
   rate must be **at or below** the all-pick base rate. If inadmissible picks beat as often as
   admissible ones, the certificate is not measuring what it claims and must be discarded.
3. **The certificate is not vacuous.** It must not hold everything. Target: it admits the
   wide-market/short-window tail. An always-hold certificate is a constant dressed as a criterion.
4. **α is stable across sports.** If α differs wildly by sport, either the market microstructure
   differs (a real result worth publishing internally) or the estimator is under-powered.

### What it would change in the product
CLV beat-close is GSE's only unmet ESTABLISHED requirement (23.0% vs 52.4%). If prediction 2
holds, this certificate converts "we can't beat the close" from a model failure into a
**measured, provable market fact** — which is a defensible public claim and, unlike a gate flip,
needs no floor to be lowered.

---

## N2 · ADAPTIVE COMPUTATION ALLOCATION  *(from P4)*

P4's Adaptive Computation Time stops spending compute once the model is confident, and spends it
where the problem is hard. GSE scores every game the same way, with the same budget.

**Proposal:** allocate per-pick compute ∝ the *irreducible* part of predictive uncertainty
(entropy of the consensus after de-vigging, not the model's own confidence). Cheap to state,
cheap to test: does a non-uniform budget improve OOS ΔLL at **matched total compute**? P3's own
standard — ΔP > 0 at matched budget — is the acceptance test. If it only wins at higher budget,
it is not an improvement and must be rejected.

---

## N3 · THE IMPROVEMENT LOOP SCORED AGAINST P3  *(from P3)*

P3's "effective recursion" requires: **ΔP > 0 under matched compute and evaluation budget, and
attributable to the inherited change** — not to extra compute, more data, or a friendlier test set.

Run GSE's own improvement loop through it:
- The contextual-compounding programme tested 13 compounds at game level → **0/13**.
- The props lab tested L1 (cold/wind × play-action) and L5 (pooled hierarchical) → both **KILLED**
  on pre-registered lines, with L5's pooled c₃ 90% CI covering 0 in every family.
- By P3's standard those are **correct negatives**, not failures: the loop produced evidence, and
  the loop did not inherit any unearned gain.

P3's warning is the one GSE most needs: *"automated selection can exploit weaknesses in the
evaluator — protected tests, independent checks, and rollback are therefore essential."* That is a
precise description of why GSE's ledger guard, pre-registration and kill lines exist. It is also
why the v5.3.0 "ship it live behind the flag" proposal earlier this week should stay blocked: it
removed the protected test (the shadow period) and called a rollback lever an evaluation.

**Concrete use:** report the HCI-style headroom metric, not raw win rate, when describing the
model's own progress. Raw rates invite the reader to compare incomparable things.

---

## N4 · BOUNDED REPLAY — an operating rule for agents  *(from P2)*

P2's SWA Bounded Replay: when session state is lost, **do not recompute the whole sequence** —
replay only the recent window and reconstruct. This host lost ~3 h of wall clock to a mid-run
reload on 2026-09-15; the expensive thing was re-deriving context, not the compute.

**Rule for agents on this repo:** on resume, re-read the *tail* of `docs/ops/AGENT.md` and the
most recent result files, and treat earlier reasoning as reconstructible. Do not re-read the
whole ledger or the whole overnight report to re-establish context.

---

## REMAINING IDEAS, NOT IMPLEMENTED (stated, not hidden)

- **Similarity-rescaled line paths.** Apply P1's similarity variables to the *shape* of the
  pre-kickoff line path (a scale-free descriptor across sports and windows). Needs intraday
  snapshots; the archive is in production and out of reach under the standing laws.
- **Quadratic-stress decomposition of line movement.** Decompose movement into mean flow +
  oscillatory residual and test whether the *covariance* of the residual with the flow predicts
  post-move. This is Kyle's-λ-shaped, and it is the only part of P1's structure that maps to a
  measurable market object. Requires the same archive.
