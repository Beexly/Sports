# c07 verified claims — deep-pass consolidation (2026-10-02)

Source: the c07d deep pass (60 briefs, `briefs/c07d/c07d-d01…d60`) plus the c07
first pass (30 briefs), claim-verified by 4 independent workers against the
briefs on disk. Full worker reports: `/tmp/verif-reports.txt` (22.9 KB).

Legend: **CITED** = number appears verbatim in the named brief. **INFLATED** =
the deep pass's number does NOT appear in the cited brief — struck, do not use.
**CAVEAT** = the number is real but the deep pass omitted load-bearing context.
Inference is marked as inference.

---

## 1. CITED — carry forward

### Time-varying edge decay (TAE)
- **θ = −0.62, 95% HPD (−1.08, −0.17)** — cited in `c07d-d01` (brief 0602).
  CAVEAT: descriptive/observational — "diagnostic, not prescriptive."
- EPA-lost formula — cited (0602). 3×3 cells — cited (0602).

### Decorrelation / portfolio construction
- **γ = 0.4 → profit 1.74 ± 0.14 at accuracy 67.15 vs book 69 ± 2.5** — cited
  (0174). CAVEAT: the XENT decorrelation loss is the brief's ADAPT port, not the
  paper's equation (paper is MSE*-based). Mark the port as ADAPT, not paper canon.

### Calibration-vs-accuracy selection
- **Calibration-selected +34.69% ROI vs accuracy-selected −35.17% ROI** — cited
  (0290). CAVEAT: single-season (2018/19), confounded selection paradigm; the
  fixed-stakes pair is "the cleaner number."
- **Eighth-Kelly: −75.9% vs +36.93%** — cited (0290), same caveats.

### OL drag / tackle ladder
- **Tackle ladder: −2.65 (se 0.91, n=129) / −1.77 / −1.17 on 1,069 team-weeks**,
  practice-participation input — cited (ol-drag-calibration).
- INFLATED (struck): "rest +0.41 margin pts per extra day on 544 games" appears
  NOWHERE in ol-drag-calibration.brief.md. Do not cite from that brief; check
  week3-2026.brief.md before reuse.

### Forecast combination (twCRPS / TMCB)
- **twCRPS TMCB +44.81 / +48.90 / +49.28% at CRPS −0.09…−0.15%** — cited (1523).
  CAVEAT: figures are at γ=5; the EMOS MCB −13.55% cost is routinely omitted —
  carry it.

### Regime / hidden-state models
- **HMM 0.715, per-team 0.602–0.779** — cited (0431). CAVEAT: 2 states not
  AIC-validated; data ends 2018.

### Elo sparsity
- **t/N ≈ 9, η_t = √(aN/(t+b))** — cited (0940).

### Precision weighting
- **Regret 0.0225 vs 0.0625** (≈3×) — cited (1160). CAVEAT: worst-case
  (adversarial) regret; Conjecture 3 unproven.

### Dampened / marginal-corrected logit
- **Dampened logit α = 0.585, regret 0.025512 vs 0.023379 bound** — cited (1180).
  CAVEAT: certificates are numerical, not analytic.
- **Marginal-corrected α = 0.656089, γ = 0.498268** — cited (1180).

### Kelly drawdown / governor
- **Kelly drawdown: K* 0.98 → ≈0.1, 92% P(drawdown > 98%)** — cited (1210).
- **Governor M(k): 5% vs 22.5% drawdown at ~12% wealth cost** — cited (1628).
  CAVEAT: 1628 is a single-TSLA-episode study; the brief lives in c07d-d24, not
  d20 as the map claimed.

### E[max] duel
- **E[max] duel +$5,376 (+55.6%) vs −$4,374** — cited (1759).

### Live-news activity
- **15× activity, β̂₃ = 0.531 vs β̂₅ = 0.034** — cited (0240).

### Ghost Score (RB)
- **Jacobs 0.542 / Sanders 0.539 / Etienne 0.527** — cited (0210).
- Gates re-tagged: the brief's "Spearman ≥ 0.80 / ≥ 0.60" gates are the brief's
  own future acceptance gates, NOT paper findings. Do not present as results.

### CausalTraj
- **minJADE20 1.12 / minJFDE20 2.68** — cited (0330).

### Cox (soccer, method port)
- **Theorem 1: <10s / 78 params / 3039 matches; red card −30.48%; trailing
  +10.11%** — cited (0390).

### SHAPEffects
- **12.61 vs 13.39–13.41** — cited (2185). CAVEAT: R² is −0.99 even for the
  winner — relative superiority only, not usable fit.

### DYNAMO (crowd effects)
- **Home 37.9% / away 40.3% empty, 43.0% crowds, Arsenal −29% MSE** — cited
  (1080).
- INFERENCE (struck as attribution): "paired-differencing eq. 6 from 0270" —
  "0270" and "paired-differencing" appear nowhere in the brief. The method may
  be real; the attribution is unsupported.

### Empirical-rate teacher (calibration)
- **ECE 0.10 → 0.050, p̂ = (w + 25·p̂_parent) / (n + 25)** — cited (0691).

### Gate statistic
- **φ = (s² − σ²_{2k}) / s², gate Spearman ρ > 0.3** — cited (0003).

---

## 2. INFLATED — struck, do not use without re-sourcing

1. **0643 momentum claim**: "+12.7pp momentum stake bias (p<0.001), β 0.115 n.s.
   outcome effect, −7.4% to −23.3% ROI" — NONE of these numbers appear in the
   0643 brief. The brief's real content must be re-read before any momentum
   claim is built on.
2. **"rest +0.41 margin pts/day on 544 games"** — absent from
   ol-drag-calibration.brief.md (see above).
3. **DYNAMO "0270 / paired-differencing eq. 6"** — absent from the brief.

---

## 3. Open contradictions (NOT resolved — need primary sources)

1. **Calibration snapshot**: n=392 / ECE=0.0639 (timestamped 2026-09-10
   23:44:52Z truth surface) vs n=458 / 0.0524 (dateless AGENTS.md note).
   Needs: the note's date + both filter definitions. Until then, cite neither
   as canonical.
2. **BDB 2026 license**: CC BY-NC benchmark-only vs no-license / confidential /
   destroy. Default posture: **no BDB data at all** until resolved.
3. **1461 MOVDA**: internally numerically self-contradictory (confirmed).
   Steal the equation, not the numbers.
4. **arXiv:2512.18858**: REJECTED (four internal contradictions). Stands rejected.
