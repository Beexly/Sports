# ROUND 05 VERIFICATION REPORT — Motif lab audit of DeepSeek MOVE-37-ANALYSIS-05
Date: 2026-09-13 | Auditor: Motif (execution lab) | Source: ~/workspace/gse-discovery/deepseek-move37-analysis-round-05.md (saved verbatim)

## Verdict

Substantive, largely honest response with one genuine code catch — but the Priority Zero deliverable (runnable IRL protocol) contains a **blocking mathematical defect** and cannot be executed as written. Several generation artifacts (duplicated section, truncated rows, incomplete audit table) mean the effort checklist overclaims completeness. Citation verification is running separately; nothing below depends on it.

## §-by-§ audit

### WP-4 code audit — one REAL catch [CONFIRMED]
DeepSeek claims `bootstrap_r2` in both scripts resamples individual play indices with no game stratification, producing too-narrow CIs. **Verified true by reading the code:**
- `move37_phase4_v2.py:203` — `idx = rng.randint(0, n_obs, n_obs)` — no game IDs used. True.
- `tournament.py:233` — identical pattern. True.
- (DeepSeek's cited line numbers, 110–125 and 32–45, are wrong; the substance is right.)
- Impact assessment: the defect widens CIs but does not move point estimates. The phase-4 VALID verdict does not hinge on CI width (criterion 2 compared two CIs computed the same way, far apart). DeepSeek's own impact note ("does not invalidate the headline R²") is accurate. **Lab action: re-run phase-4 bootstrap with game stratification to publish corrected CIs. Cheap.**
- DeepSeek's quoted lab CI [0.1229, 0.1442] matches `phase4_stdout.txt` exactly. The quoted numbers are faithful.

### WP-1 IRL protocol — BLOCKING DEFECT, not runnable as written [ISSUE — repair required]
The CRRA utility specification is mathematically broken:
1. `U(x) = (x^(1−γ)−1)/(1−γ)` is defined over "terminal game outcome (win=1, loss=0)". For γ ≥ 1, `U(0)` is undefined/infinite (`0^(negative)` → +∞; `ln(0)` → −∞). The pre-registered prediction says γ ∈ [0.5, 3.0] — most of that range makes `U(loss)` infinite. The likelihood cannot be computed.
2. Component 4 then applies `U` to **WP values** (`E[U|go] = p_conv · U(WP_after_conv) + …`), contradicting Component 2's definition of `U` over terminal outcomes {0,1}. The domain is inconsistent within the protocol.
3. The Component 4 formulas are garbled in transmission: `U(WP),_after_conv)`, `U(WP which_after_fail)`, "similarly for uses kick and punt". Not implementable verbatim.
4. Component 5's NYT baseline bullet is an incomplete sentence ("archived the nflfastR WP model") — unclear claim, unverifiable as written.

What survives: the identification-assumption framing (unbiased beliefs) is correctly identified as the weakest link; the three failure-mode diagnostics (§4b) are well-designed and cheap; the train/test split is leak-free; pre-registered predictions and kill criteria are present and numeric. **The protocol needs a repaired utility specification** (utility defined over WP ∈ [0,1] with a bounded, well-behaved parametric family, or win/loss lotteries with explicit tremble) **before the lab executes anything.** Repair note prepared: `~/workspace/gse-discovery/deepseek-irl-repair-note.md` — paste-ready for the next DeepSeek round.

### WP-3 numeric self-audit — INCOMPLETE AS RECEIVED [ISSUE]
- The §6 table as received contains **9 rows (N-01–N-04, N-19–N-23)**. Rows N-05–N-18 are absent and N-04 is truncated mid-row ("if GBM ceiling R² = 0.52").
- The "14 of 23 UNSOURCED" headline therefore **cannot be verified from the received text**.
- Possible causes: DeepSeek truncated its own output, or the paste was cut in transit. Either way the effort checklist's "full numeric self-audit table ☑" overclaims.
- What is verifiable: the calibration arithmetic in N-19/§10.4 is correct (0.112/0.0037 = 30.3×; 0.35/0.05 = 7.0×; 0.03/0.0527 = 0.57×; median = 7.0×). IRL 0.32/7 = 0.046 ✓ (§10.4; §11 shows 0.05 — rounding inconsistency, minor).
- **Lab action: none until the missing rows are re-supplied. Garrett: re-paste §6 if you want the full audit verified.**

### WP-6 hypotheses — 12 IDs present, 2 malformed [ISSUE, minor]
- H-08 row is truncated (missing kill criterion and cheapest-test columns). H-12 row is truncated (missing prediction, kill criterion, test). H-11 ("pass_oe predicts wins") is weak — a correlation, not a discovery.
- All 8 mandatory mining sites are covered (H-01/H-02 → site 1; H-03 → 2; H-04 → 3; H-05 → 4; H-06 → 5; H-07 → 6; H-08 → 7; H-09 → 8).
- The checklist claim "12 hypotheses" is technically true by ID count but two are incomplete deliverables.

### WP-7 / WP-8 — sound, two logical slips [MINOR]
- §10.4 (calibration arithmetic) is **duplicated verbatim** — generation glitch, harmless but sloppy.
- §4c says a failed IRL "drops to rank #4 (below soft-target SR and time-stratified SR)" — but §11 ranks those #4/#5 as lab-falsified. Dropping IRL below two dead frameworks is incoherent; the fallback ranking needs rework.
- §11 rank 3 ("Alternative tail transformations") shows a "calibration-adjusted EV 0.04" with no prior EV (marked "—") — not actually calibration-adjusted, just assigned.
- The second-shift report is genuinely good: the qsec-ablation costing correction (5 min → 30+ min) and the calibration-factor instability note are honest self-corrections.

### WP-2 literature — pending independent verification
Four adjudications (L1–L4) plus counter-sources are structurally well-formed (three passes each, adjudication labels, full citations with DOIs). A dedicated verification pass is checking all 11 cited works against the live web for fabrication or misattribution. Results will be appended here. **Nothing in the lab queue depends on WP-2.**

### WP-5 replication designs — structurally complete [OK]
9 designs (3×3), each with predictions and kill criteria, each falsification including one labeled steel-manned overturn attempt. The qsec-ablation designs (R2-F1, Artifact A/C diagnostics) are the highest-value near-term runs.

## Lab queue (autonomous — starting now)
1. Game-stratified bootstrap re-run for phase-4 CI (correct the published interval). Cheap.
2. H-01/H-02: residual mean by season + clean-play filter (resolves the −0.043 anomaly). Cheap.
3. H-03: down×ydstogo interaction GBM on the play-type residual (decomposes the 0.0527 ceiling). Cheap.
4. Artifact A diagnostic: ablate `quarter_seconds_remaining`, re-measure GBM late-game ceiling (tests leakage). Medium.
5. IRL execution: **BLOCKED** pending DeepSeek's repaired utility specification (see repair note).

## What goes back to DeepSeek next round
`~/workspace/gse-discovery/deepseek-irl-repair-note.md` — the utility-domain defect, the garbled formulas, the missing §6 rows (N-05–N-18), the truncated H-08/H-12 rows, and the §4c fallback-ranking incoherence. Nothing else is blocked on the theorist.

## Appendix A — Citation verification (independent web check, 2026-09-13)
All 11 cited works checked with 2–3 searches each.

| # | Work | Verdict |
|---|------|---------|
| 1 | Vanneschi & Castelli (2021), ESA 177, 114929 | REAL — DOI confirmed; quoted "completely eliminate overfitting" sentence verified verbatim in abstract |
| 2 | Sandholtz et al. (2024), Ann. Appl. Stat. 18(4) | REAL paper, **FABRICATED DOI** — cited 10.1214/24-AOAS1918 resolves to an unrelated gun-violence paper; correct DOI appears to be 10.1214/24-AOAS1933. Paper content claims (inverse optimization, low quantiles, rising risk tolerance) check out |
| 3 | de Franca & Kronberger (2023), GECCO | REAL — DOI 10.1145/3583131.3590346 confirmed |
| 4 | "Oliveira et al. (2025)" TIR overfitting | REAL paper, **WRONG ATTRIBUTION** — actually Fabricio Olivetti de Franca (single author), 2023, Genet. Prog. Evolvable Mach. 24:13 |
| 5 | "Zhang et al. (2026)" description length | REAL paper, **WRONG ATTRIBUTION** — authors are Kronberger, de Franca, Bartlett, Desmond & Ferreira (arXiv 2605.22374) |
| 6 | Takayanagi et al. (2022) stochastic IRL | REAL — bncss.org abstract confirms mixture density network + max-entropy comparison |
| 7 | "Tackling Endogeneity" SSRN pass-rate IV | REAL paper, exact numbers (51.7% vs 59.1%) confirmed — but **"Tackling Endogeneity" is the title, not the author** (Putman & Tolhurst); SSRN hosting unverified |
| 8 | Ribeiro et al. (2025), Front. Sports Act. Living | REAL — PubMed PMID 40161419 |
| 9 | "Elvidge (2025)" Bayesian Kalman | REAL source, **MISCHARACTERIZED** — it is a blog post (seanelvidge.com), not a paper, and its point is the opposite of the attributed claim (replaces heuristic surprise-weighted updates with a Bayesian EKF) |
| 10 | nflfastR 4.0.0 add_xpass() | REAL — release notes confirm xpass + pass_oe, NA pre-2006 |
| 11 | Establish the Run PROE 2026-01-17 | UNCERTAIN — PROE metric is real and ETR uses it, but no article found matching that date; pass_oe linkage unverified |

**Net:** no wholesale fabrication, but 5 attribution defects: one fabricated DOI (#2), two wrong author/year attributions (#4, #5), one title-mistaken-for-author (#7), one blog-post-presented-as-paper with inverted characterization (#9), one unverifiable date/linkage (#11). None of the four L1–L4 existence adjudications collapse, but L2's citation is unusable as given and L4's counter-source is weaker than presented. These join the repair note for the next theorist round.
