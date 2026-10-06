# c06 Challenges — Adversarial Review (Consolidated)

**Slice:** c06 (300 briefs) · **Date:** 2026-10-02 · Item-level review: `working/challenges.md`.
**Convention:** CONFIRM / QUALIFY / CHALLENGE / REJECT (tested+failed, cited) / UNTESTED (NOT dead) / WEAK (NOT dead).
**Doctrine:** Garrett's standing rule — nothing is called dead until tested, cited, and confirmed. Challenges below carry file paths, not vibes.

---

## 1. Headline verdicts (top-20 findings + c00 supplement)

| # | Finding | Verdict | One-line challenge/qualification |
|---|---|---|---|
| 1 | Old-QB RB dump rate (20.9% vs 18.2%, z=8.0) | CONFIRM, QUALIFY causality | Trend-discovery scan; roster/scheme confounding untested; multiple-comparisons exposure unquantified |
| 2 | Coverage-conditional QB tendencies (84%/44%/41%) | QUALIFY, borderline WEAK | Host claims from 2-game 2026 sample, no denominators; Maye verdict = 1 game. **Do not hard-code as priors.** The ✅/❌/⚠️ verification ritual is the durable asset |
| 3 | Net pressure r=+0.2414 | CONFIRM, minor selection caveat | Honest walk-forward, but single 2025 season; winner's-curse on the selected signal |
| 4 | NGS week-3 gate components | QUALIFY | File explicitly: same-season associations, "not a claim that NGS beats the close" — not week-lagged walk-forward. **NEW:** brief claims ST EPA +0.054 "echoes" the −0.0648 situational finding — sign mischaracterization |
| 5 | QB most volatile (CV 0.993) | CONFIRM, measurement caveat | CV is relative-to-mean; cross-position ordering is scoring-format-specific. Post-injury pessimism flagged in-file as unshipped known defect |
| 6 | Goedert absence-driven concentration | QUALIFY | One moderate-sample case; DeVonta numbers rest on 2–4 games with inconsistent definitions |
| 7 | Market-implied team rating recipe | QUALIFY | "The notes' blend formula is an inference, not his exact formula" — joint spread/futures weighting is the notes author's construction |
| 8 | Bridge bar (Brier 0.2237 vs 0.2120) | CONFIRM on Brier; **CHALLENGE on rest-days leg** | Rest-days slope +0.411 wired at **1.62σ** while wind/temp zeroed as "too noisy" — no principled bar stated. Either state ≥1.5σ and apply uniformly, or hold rest at 0 |
| 9 | Structural model adds zero (ŵ=0.000) | CONFIRM as paper result; QUALIFY transfer | One sport/model/benchmark — one data point, not a universal law. The ŵ benchmark *protocol* is the portable asset |
| 10 | Hierarchical BT shrinkage (8.82 vs 24.65) | CONFIRM numbers; QUALIFY NFL transfer | MLB-parity hyperprior weakens exactly when NFL needs it (weeks 1–6, 17-game seasons). Keep the walk-forward gate |
| 11 | LEAP gains (ECE halved, Brier −16.5%) | CONFIRM gains; QUALIFY domain | 347 general forecasting tasks, not sports. Paper's load-bearing prior is the monolithic LLM's; mapping to GSE's engine prob is the ADAPT proposal with an honest gate |
| 12 | Corrected combinations γ=0.5 | CONFIRM paper; QUALIFY sports premise | ACF(1)≥0.15 consensus-error autocorrelation is the entire premise and **untested in-slice** |
| 13 | Spread→win map (σ=13.588), steam null | CONFIRM | Dead-edge treatment (decay 58.1→52.5→50.8%) is exemplary. Paper's own abstract/Table-1 and postseason-count tensions flagged in-file |
| 14 | Margin-as-gate (1784) | CONFIRM paper; QUALIFY engine mapping | Paper margin = s₁−s₂ between two candidates of one model; "model−market prob" is an analogy, not the quantity. The walk-forward gate must not be skipped |
| 15 | Partial Kelly rebalancing | CONFIRM; QUALIFY fee mapping | Simulated returns only; vig-as-fee is stated INFERENCE (rebalancing-transfer fees ≠ per-bet vig). Complementary to 1079/1209 (different failure modes, checked) |
| 16 | Calibration-selected beats accuracy-selected | CONFIRM; QUALIFY scope | Single NBA season (authors flag); NFL gate (≥2 seasons) correctly demanding. Cite scheme-specific 36.93% eighth-Kelly figure, not the averaged ROI |
| 17–20 | Video/CV methods (0209, 0379, 0389, 0349) + Sloan 2018 | CONFIRM with regime caveats | 0379's 90% rests on ~960 clips, unstated splits; 0389's IDsw headline is ground-truth-detections regime only (reverses on real detections); 0209's 0.67 recall needs hand-marked event centers. All caveats carried in `verified-claims.md` |

**Tally:** 12 CONFIRM (with qualifications noted), 7 QUALIFY, **1 CHALLENGE** (#8 rest-days leg).

## 2. Newly found contradictions and defects (not in the map)

**A. ST EPA sign mischaracterization.** `d23/ngs-st-pace.brief.md` claims r=+0.054 "echoes the separate situational-edges finding that ST EPA correlates the wrong way" — but +0.054 is the *right* way; situational-edges measured −0.0648. The brief mischaracterizes its own number. Fix: report both signs, do not claim agreement.

**B. Rest-days inconsistency (#8).** +0.411 (se 0.254) = 1.62σ wired as a live engine component while wind (−0.135/0.162) and temp (+0.029/0.039) are zeroed as "too noisy." No stated threshold. The map bundles this without questioning.

**C. Calibration-floor disputes.** ECE floor: 0.04 (wiring manifest) vs 0.05 (launch doc). Sample floor: n≥100 (launch doc) vs N≥500 (checklist, explicitly "strawman"). Adopt the stricter pair (0.04 / N≥500), note the discrepancy, never lower floors to greenwash.

**D. "Unanimous RES≈0" is one measurement family.** MURPHY_COMPONENTS_EXPLORE repeated across ~12 ops docs — the phenomenon (no discrimination) is independently corroborated 3 ways (AUC 0.4965 on 13,646 picks; ≥80 tail inverted 43.7% vs 86.2%; 27-season band inversion), but cite as one family, not twelve independent confirmations.

**E. r04 LEAP map reframe.** The map's "removing the engine prior drops it below baseline" slightly reframes the paper's prior-ablation (monolithic LLM prior). The ADAPT proposal's gate (Brier ≥0.010, ECE ≥25% relative, 2024–2025) is honest — keep it.

**F. 0450's 19% is illustrative.** The conformal-defect brief states it as illustrative, not a universal constant (`:49`) — the map drops this caveat.

**G. Spec-vs-build confusion in video tracking.** The 2026-09-26 video-tracking spec's headline numbers are contract targets, not measured capability. The YOLO-vs-RF-DETR inconsistency (spec says "YOLO detector" while license posture rules Ultralytics YOLO AGPL lab-only, names RF-DETR shippable) is an internal defect to fix.

## 3. Ledger status (from the slice's own verdict records)

- **8 REJECT** (cited, all respected as tested+failed).
- **7 WEAK** (thin/contradicted evidence — remain UNTESTED-QUEUED per doctrine, not dead).
- **15 UNTESTED** — nothing untested killed. Highest-priority unrun experiments: the 0440 LEAP NFL port (Brier ≥0.010 + ECE ≥25% gates), the 0670 ŵ protocol for any news-fused score, the 1556 ACF(1) premise check.

## 4. Corpus hygiene

- Zero duplicate md5s at brief level across the slice (clean).
- The 180-QB metrics table (2026-10-01) could not be located by filename in vendor docs — verify location before claiming it as the HHI vehicle.
- Postseason inclusion in the old-QB script unconfirmed (INFERENCE from n=4,936 > 4,736 regular-season ceiling) — confirm via re-run before production use.
