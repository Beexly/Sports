# Grok Heavy Run 2 — Promote-or-Kill (2026-10-02)

*Prompt 3 from GROK-HEAVY-PROMPTS-2026-10-02.md. All ten slice maps now open (c01–c10, c07d). Still unread: 3,457 briefs, 1,115 fulltexts, scored batches, waves. Counts unchanged: 3,728 + 1,374 = 5,102.*

## New map evidence (Phase 3 update)

- **c02**: selectivePublishSweep (|p−0.5| at deltas 0, 0.08, 0.10, 0.12, 0.15, 0.18) has never been run on settled data. Live resolution ~0.0048 vs ~0.03 needed for Brier ≤ 0.22.
- **c06**: scores ≥ 80 won 43.7% while claiming 86.2% (AUC 0.4965); Brier 0.275 = reliability 0.026 − resolution 0.002 + uncertainty 0.250. Mandate: fix resolution before any recalibration.
- **c10**: restates market baseline exactly as c05 — Cohort E, 5,281 games 2006–2025, pooled Brier 0.2106, adaptive ECE 0.0126; sketches a conformal reject/abstain stage.
- Pressure-to-sack contradiction restated: c02 carries team veto (R² < 0.005, no sack props); c01 and c09 treat QB-level rate as profile feature. Both can be true.
- Standard, still not an edge: opponent-adjusted EPA, Platt/isotonic, Elo on hard wins, the close as the label.

## The ten, with evidence deltas

**1. Selective publication gate (conformal risk control vs de-vigged close). Prior 1 → stays 1.**
Corroboration: Angelopoulos et al., Conformal Risk Control, arXiv:2208.02814 — controls expected monotone loss at α under exchangeability, tight to O(1/n). arXiv non-exclusive license: learn the method. Selective extension exists (arXiv:2512.12844), experiments not NFL. Corpus: c05 cites ledger 0743; c02 says the sweep never ran. Close is the bar: Brier 0.2106, ECE 0.0126 on 5,281 games.
Objection: NFL weeks aren't exchangeable. Answer: don't claim the guarantee; tune λ on prior seasons, test on next. Engine's gap is resolution, not reliability; confidence is anti-predictive (c06).
Experiment: sealed rows, mint-time engine p, multiplicative de-vig close. CRC on posted Brier, λ fit 2022–2023 only. Pass: posted log loss beats close on 2024–2025, shuffled-week placebo fails.

**2. QB pressure-to-sack residual, <2.5s, after team pressure. Prior 3 → 2.**
Corroboration (strongest external match): NGS defines quick pressure as <2.5s. Trapsheet 2024 qualifier pool: league pressure-to-sack 18.69% vs corpus ~18%. FTN caused-pressure split: line causes pressure, QB converts it; caused pressure is the stable piece. FTN charting on nflverse as is_qb_fault_sack, CC-BY-SA 4.0 — wireable if attributed. c02 keeps team R²<0.005 veto.
Objection: scheme/time-to-throw confound; #1018 owns OL/GSI. Answer: residualize on team pressure and time-to-throw; wire only after #1018.
Experiment: nflverse dropbacks + FTN quick-pressure, prior-season shrink, 2024–2025 holdout. Pass: log-loss lift beyond close and team pressure; shuffled passer_player_id placebo fails.

**3. Per-QB EPA/dropback, snap-share anti-leakage. Prior 2 → 3 (downranked on evidence).**
The 0.633→0.625 / 0.690→0.700 delta exists only in c01's citation of handoff-indie-builders-v2-fullspec-2026-09-25.md. Not opened. No open-web restatement. The unit (EPA/dropback) is public; the delta is not corroborated.
Experiment: nflverse 2016–2025, passer_player_id, prior-season shrink, walk-forward. Pass: ≥0.005 log-loss gain vs team EPA on 2024–2025 AND vs the close. Else kill.

**4. Trust-target props stack. Prior 4 → stays 4.**
c01: Pitts TPRR 0.18→0.28 without London (template). c05: Dirichlet share-core, CARDS_SHARE_CORE_WIRING.md, mean E[N]·s_i. Props are the registry's open frontier; the prop close is softer than the moneyline.
Objection: share spike is injury news, mean-reverts. Answer: encode teammate absence as state from inactive list; don't update baseline share.
Experiment: anytime-TD + receptions 2023–2025, Σ P(TD|target)P(target) vs marginal. Pass: ≥5% holdout log-loss drop, absence-shuffle null.

**5. Injury/QB-change provenance on staleness gate. Prior 5 → stays 5.**
Corpus-only: c01 item 12 cites signal-staleness-gate.md. Gate wired; isPublished has no provenance column. No paper needed — it's a column, not a probability.
Experiment: replay starter-change weeks. Pass: published pick flips/shadows inside inactive window.

**6. Within-player scale-fit. Prior 6 → stays 6, as constraint.**
c05 cites 4×–68× between-vs-within correlation gap (signal-ledger-scale-fit.md). c06: within-player QB coefficient of variation ~0.993 on 2020–2024 (n=771).
Objection: between-player r is what ranks players. Answer: don't zero stable traits; a weight may not rank on between-player r alone.
Experiment: shuffle player identity; surviving weights = leakage. Target share must beat raw team passing EPA on within-player log loss.

**7. Moderate-favorite leaf. Prior 7 → OFF the build list.**
Corpus: 6.5–9.5 pt favorites 65.86%→57.12% (n=576, ~3.6 SE). Public multi-decade nflverse cover rates flat near 50% in every bucket. Straight-up TD favorite wins ~73%, not 66%. Estimand not reopened — cannot treat 65.86% as cover rate or edge. One replication check only. Not a build.

**8. Opponent-adjusted EPA residual. Near-miss → OFF as standalone edge.**
Shrinkage + opponent pass is standard public practice. c01: 80/40 shrinkage, 55/15/15/10/5 blend. One public simulator: opponent adjustment collapsed to shrinkage, no forward gain. Belongs inside item 3 as a shrink. Hermes's version already in flight.

**9. Soft-Elo / Bradley-Terry. Demotion stands.**
c05 cites ledger 0540, MAE 45.9→17.9. Sport/sample not in map. No corroborating NFL URL. Killed until ledger read and sport is NFL.

**10. Coverage-responsibility transformer. Demotion stands.**
c05 cites ledger 0489, 0.894 vs 0.764 heuristic. Needs tracking GSE doesn't have in the public pipeline. Dataset-gated, not a wire.

## Revised build order

1. Conformal publish gate vs the close. 2. QB pressure-to-sack residual after #1018. 3. Per-QB EPA/dropback re-run. 4. Absence-conditional target-share props. 5. Staleness provenance. 6. Within-player weight constraint. Favorite leaf = audit only. Soft-Elo, coverage transformer, standalone opponent-EPA, bridge-model rebuild stay off. Look-ahead price rows from c02 collide with #1016 — do not duplicate.
