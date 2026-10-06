# c07 syntheses — what the deep pass composes into (2026-10-02)

Cross-paper syntheses from the c07/c07d deep pass. Every component number is
CITED in `verified-claims.md`; bracketed tags mark what is established vs
inferred. Nothing here is a build spec — buildable systems live in
`buildable-systems.md`.

---

## S1. The calibration ladder (selection → estimation → combination)

**Established.** Three independent results compose into one pipeline:

1. **Select on calibration, not accuracy.** Calibration-selected portfolios
   +34.69% ROI vs accuracy-selected −35.17% (0290, single-season caveat).
2. **Shrink toward the parent rate.** The empirical-rate teacher
   p̂ = (w + 25·p̂_parent)/(n + 25) halves ECE 0.10 → 0.050 (0691). The +25
   pseudo-count is a portable shrinkage recipe for any sparse cell.
3. **Combine with tail weight.** twCRPS-gated TMCB gains +44.81/+48.90/+49.28%
   at γ=5 (1523) — but carry the EMOS MCB −13.55% cost; the combination is not
   free.

**Inference.** The ladder is ordered: selection criterion first (it decides
which models survive), shrinkage second (it fixes sparse cells), combination
third (it harvests the tail). Reversing the order — e.g. combining before
shrinking — is untested in the corpus. Treat the ordering as inference, not
result.

## S2. The Kelly architecture (fraction → drawdown governor → decorrelation)

**Established.** Three results, one staking stack:

1. **Full Kelly is ruinous in practice.** K* 0.98 → ≈0.1 under drawdown
   constraints; 92% P(drawdown > 98%) at full Kelly (1210).
2. **A governor buys survival cheaply.** M(k) cuts drawdown 22.5% → 5% at ~12%
   wealth cost (1628; single-TSLA-episode caveat).
3. **Decorrelate the book.** γ=0.4 decorrelation → 1.74 ± 0.14 profit at 67.15%
   accuracy vs the book's 69 ± 2.5 (0174; XENT port is the brief's ADAPT, not
   paper canon).

**Inference.** The natural stack is fractional-Kelly sizing → drawdown governor
→ decorrelated portfolio. The corpus never tests all three jointly; the joint
behavior (especially governor × decorrelation interaction) is unmeasured.

## S3. Edge decay is real and measurable (TAE)

**Established.** θ = −0.62, 95% HPD (−1.08, −0.17) (0602) — edges decay over
time, and the decay is quantified, not vibes. **Caveat:** descriptive /
observational — "diagnostic, not prescriptive." It tells you the half-life
exists; it does not tell you which edges die fastest.

**Inference.** Any system that sizes on stale edges without a decay term is
overbetting by construction. The decay rate should enter as a haircut on edge,
not as a post-hoc adjustment.

## S4. The OL → scheme → QB hierarchy has quantitative backing

**Established.** The OL tackle ladder (−2.65 / −1.77 / −1.17 on 1,069
team-weeks, practice-participation input) quantifies how line degradation
propagates (ol-drag-calibration). The reasoning engine's L5 hierarchy
(OL → scheme → QB) is a structural prior; the ladder gives it a number.

**Inference.** Pressure-funnel theses (PIT@CLE archetype) live or die on the OL
link first. The L4 breaking conditions should always include an OL-health
falsifier before any QB-behavior falsifier — the hierarchy is evaluation order,
not just presentation order.

## S5. Publish/withhold is a decision system, not a feeling

**Established.** The reasoning-depth spec's §7 contract (published pick/card
MUST be L5; breaking_conditions_met must be false; adversarial report
attached) plus the E[max] duel result (+$5,376 / +55.6% for the max-exposure
strategy vs −$4,374) jointly say: selection discipline dominates edge size.

**Inference.** The withhold decision (REJECT) is the product as much as the
pick. A system that cannot say REJECT — with the falsifiers named — is not a
system.

## S6. Regime awareness beats static ratings

**Established.** HMM 0.715 (per-team 0.602–0.779, 0431; 2 states not
AIC-validated, data ends 2018) and the Elo sparsity result (t/N ≈ 9,
η_t = √(aN/(t+b)), 0940) both point the same way: static point ratings
understate regime change.

**Inference.** Ratings should carry a regime posterior, not just a point. The
corpus does not give a joint regime+rating recipe — that is a build gap, not a
result.
