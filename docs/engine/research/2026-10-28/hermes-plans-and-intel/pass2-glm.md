# GSE Drive Review — Pass 2 (GLM): the zips the PDF pass never opened

Scope: `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26\corpus-intelligence-2026-10-02.zip` and `...\arxiv-sweep-2026-10-02.zip`.
Method: both zips extracted read-only to a scratch temp dir (`C:\Users\Garrett\AppData\Local\Temp\opencode\pass2-glm`). Nothing written to G: or to any Sports checkout. `C:\Users\Garrett\Sports-wt-intel` was inspected with read-only `ls`/`find`/`grep`/`head` only.
Source of numbers: every number below is quoted from a named file inside the zips or a named live file. No number is invented; where the PDF pass's own text is quoted, the citation is `glm-papers.md`.

---

## The answer

**The method the PDF pass undervalued: the bucketed empirical win-rate calibration audit** — the "state-conditioned empirical win rate" of arXiv:2607.00164 (the paper is in the sweep: `arxiv-sweep-2026-10-02.zip → arxiv-sweep/fulltext/2607.00164.txt`).

What the PDF pass said (`glm-papers.md`, entry `2607.00164v1.pdf`): *"Disposition: shadow — as an audit of logged pick probabilities (bucketed empirical win rate), not as a new calibration transform"* and its wire #4: *"Build a shadow audit of logged pick probabilities … No live file yet."*

What the zip briefs show: that audit is not a shadow build waiting to happen. The corpus zip's calibration briefs show it already ran, on the engine's own settled picks, and already produced its numbers.

**Zip path of the brief that already measured it:** `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26\corpus-intelligence-2026-10-02.zip` →
- `corpus-intelligence/briefs/c10/r50/LAUNCH_CALIBRATION_COHORT_2026-09-12.brief.md`
- supported by `corpus-intelligence/briefs/c09/c09-r25/ops__PLATT_AND_BRIER_DECOMP.md.brief.md` and `corpus-intelligence/briefs/c09/c09-r25/ops__SLIDING_WINDOW_OGD.md.brief.md`

**The claim (as written in those briefs, quoted, not paraphrased into new numbers):**
- Cohort A (market_anchored_v3, settled WIN/LOSS two-way moneyline): *"eligibility GREEN n=407, Brier 0.2103, raw ECE 0.0549, debiased 0.038688"* — endpoint-reported, honestly labeled as quoted-not-recomputed.
- Cohort D identical-row bake-off metrics: *"engine brierDecomposition, 10-bin ECE (4dp)"* — i.e., bucket-by-stated-probability vs realized outcome, exactly the audit the PDF pass proposed to build.
- Cohort E (2006–2025 NFL market baseline): *"pooled held-out 2016-2025 n=2,750: base rate 55.02%, Brier 0.2106 [0.2050, 0.2172], reliability 0.0324, resolution 0.0361, ECE equal-width 0.0180 / adaptive 0.0126 (adaptive is the honest binner)"*.
- `ops__PLATT_AND_BRIER_DECOMP`: Platt scaling via MAP IRLS in `platt-scaling.ts`, Brier = REL − RES + UNC, and *"live RES ≈ 0.002 is the binding constraint: it blocks the PROVEN claim"* — calibration-map application stays OFF.
- `ops__SLIDING_WINDOW_OGD`: OGD on a Beta calibration map refit on a trailing window (default 120 samples), shadow-only, *"live eligibility stays map-free … `CALIBRATION_ADJUSTMENTS_ENABLED` stays OFF until live RES floors clear."*

**Does the live checkout already have the method? YES.** Read-only inspection of `C:\Users\Garrett\Sports-wt-intel` found:
- `apps/web/lib/calibration/ece-debiased.ts` — binned ECE (10 equal-width bins) with a Monte-Carlo noise null and a per-bin variance debias (C-290/C-292), which is the bucketed empirical-rate audit with its finite-n bias handled.
- `apps/web/lib/calibration/calibration-map-bakeoff.ts`, `identical-row-bakeoff.ts`, `market-backtest.ts`, `bootstrap-metric-ci.ts`, `holdout-ranking-report.ts`, `live-calibration-p.ts`, `platt-scaling.ts` — the cohort/bake-off machinery the briefs describe.
- `packages/prediction-engine/src/calibration-monitor.ts` (shadow Brier-streak health check) which reuses *"the exact `brierDecomposition` this package already exports"*; `brierDecomposition` is exported at `packages/prediction-engine/src/index.ts:393` and used in `edge-lab/calibration-blend.ts:178` and `elo-backtest.ts:100`.
- `packages/prediction-engine/src/online-beta-recalibration.ts`, `online-beta-sliding-window.ts` — the sliding-window (window=120) calibration diagnostics from the SLIDING_WINDOW_OGD brief.
- Also present and relevant: `apps/web/lib/calibration/2110-03874-bradley-terry-uq.ts` — a rolling 3-season BT-MLE with joint HFA term, exponentially decayed pseudo-counts, asymptotic 90% CIs on win probabilities, and abstention when the CI covers 0.5. Header: `ENABLED = false`, *"Not wired into any publish path."*

So the PDF pass's wire #4 ("build the audit, no live file yet") proposes constructing what this checkout already contains, and what the briefs already measured. The undervaluation is concrete: the PDF pass rated the method "shadow / to-build" when the brief had already measured it and the checkout already runs it. The honest correction is smaller than the wire implies: wire #4 becomes "consume the existing cohorts" — treat the n=2,750 baseline as the reference, prefer the adaptive/debiased ECE reading, and investigate the RES ≈ 0.002 PROVEN blocker — not "build an audit."

**What the live checkout does NOT have (checked, not assumed):**
- `probabilityCalibrator` — zero hits in this checkout (grep across the repo, node_modules excluded). The PDF pass's claim that the seam *"on feat/trueprob-calibration-boundary … passes probabilityCalibrator at both assessIndependentEdge call sites"* is not verifiable in `Sports-wt-intel`; either it lives on another checkout/branch or the pass over-claimed. `assessIndependentEdge` does exist in `packages/prediction-engine/src/scoring.ts`.
- Adaptive-bin ECE — not found as an ECE binner in this checkout (the "adaptive" hits in `calibration-map-bakeoff.ts` are an adaptive-δ hedge analysis). The brief's "adaptive is the honest binner" is a spec the checkout has not yet adopted; what exists is equal-width bins plus the debias/noise corrections.
- The 2607.00164 *training* variant (RLVR rewarding the bucketed rate with the gradient masked to the answer span) — no hits. The audit side is live; the training-transform side is not, consistent with the PDF pass's "not as a new calibration transform" — but that framing is now a deliberate policy state (maps apply OFF), not a missing build.

---

## Secondary corrections the same briefs force

1. **Wire #2's "No live file for the fit yet" is stale for this checkout.** `apps/web/lib/calibration/2110-03874-bradley-terry-uq.ts` is a BT fit with uncertainty quantification, disabled and additive. A next wire should say "evaluate/enable-gate the existing BT-UQ module," not "build the first BT fit."
2. **The corpus briefs already measured the BT benchmark the wires would have to beat.** `corpus-intelligence/briefs/c10/r26/1494-dynamic-bradley-terry.md.brief.md` (arXiv:2003.00083) carries measured numbers — simulation rank displacement 2.29 (dynamic BT) vs 3.75 (static BT/win rate), LOO prob error 0.37 vs 0.44, and NFL 2011–2015 top-10 overlap of 6–10 of FiveThirtyEight ELO's top 10 per season — and prescribes the strong-connectivity existence check (Condition 4.1) as an engine-actionable guardrail before publishing any pairwise rating. The PDF pass filed the connectivity check (its 1505.01462v1 item) as "shadow — not a pick-path component"; the brief rates the same guardrail engine-actionable. Related spec briefs (`c10/r05/0213-recent-advances-in-the-bradleyterry-model.brief.md`, `c10/r43/2601.14727-bradley-terry-advances.brief.md`) already set acceptance gates (rolling log-loss ≥0.003 better than plain BT and Elo; walk-forward moneyline Brier ≥2% lower than engine baseline). Wire #2 should inherit those gates rather than re-derive them. Note: `2601.14727` is a different paper from anything in the top-level PDF pass — the pass could not have seen it.
3. **What holds up, not undervalued:** the PDF pass's wire #1 (reasoning trace lacks premises) is independently confirmed by measurement. `corpus-intelligence/briefs/c10/r56/2025-holdout-trace-distribution.brief.md`: `reasonAbout` on 285 settled 2025 NFL holdout games returned *"285/285 … INSUFFICIENT; 0 WITHHELD, 0 ASSOCIATION_ONLY"*, every row *"0 sources, reason 'no usable probability premise'"*, and no confidence field existed so *"no reliability diagram or Brier score could be computed."* The trace exists in the checkout (`packages/ingestion-pipeline/src/reasoning-trace/from-bridge.ts`); the missing piece is the probability premise, exactly as the PDF pass said.

---

## Method notes, limits, and honesty

- The PDF pass judged papers by opening PDFs; the briefs inside `corpus-intelligence-2026-10-02.zip` are full-read ledgers of a *different, larger* sweep (the 2026-09-21 arxiv-deep program, ~500 papers) plus ops/reasoning briefs. The pass's undervaluations are therefore all cases of "judged from the paper alone while the measured brief sat one zip away" — the audit above is the cleanest and most consequential because it inverts a wire from "build" to "already built and already measured."
- `arxiv-sweep-2026-10-02.zip` contributes the search/QC context, not measurements of the engine: `arxiv-sweep/phase2-search-notes-calibration.md` (14 queries, 2,800 raw hits, 149 kept) and `arxiv-sweep/triage-calibration-QC.md` (documented cross-batch drift on 2-scores: batch2 ~28, batch3 ~45, batch4 ~67 — the sweep's own scores are calibration-sensitive). Its `existing-research-map.md` already listed the calibration stack (CQR, grouping loss 2210.16315, temperature scaling, LRD, ECE-by-slice) and Bradley-Terry among covered methods — corroboration that the audit lane predates the PDF pass.
- Cohort A's numbers are endpoint-reported, not independently recomputed (the brief says so itself); Cohort E's baseline is a market baseline, and the brief warns its two populations (5,281-game folds vs the 15,939-pick replay corpus) *"must never be cross-quoted."* I have not cross-quoted them.
- License walls stay queued: everything quoted above is GSE-internal research documentation inside the zips. The arXiv papers (both the top-level PDFs and the sweep fulltexts, including `fulltext/2607.00164.txt`) remain research-only until per-paper license checks; nothing from them moves into shipped prompt or eval text.
- Nothing in this pass modified G: or `C:\Users\Garrett\Sports-wt-intel`.

**Revised next wires (changes only, everything else from `glm-papers.md` stands):**
1. Wire #4 re-scoped: do not build the audit — ingest the existing cohorts (`identical-row-bakeoff.ts`, `ece-debiased.ts`, `calibration-map-bakeoff.ts` outputs); adopt the adaptive/debiased ECE reading as the reported binner; chase the RES ≈ 0.002 PROVEN blocker.
2. Wire #2 re-scoped: gate-evaluate the existing `2110-03874-bradley-terry-uq.ts` against the briefs' acceptance gates (walk-forward Brier ≥2% better / log-loss ≥0.003) instead of writing a first fit; carry the Condition-4.1 connectivity guardrail from the 1494 brief into the same gate.
3. Wire #1 unchanged and now measurement-backed: give holdout rows a real probability premise (per the 285/285 INSUFFICIENT brief) so `from-bridge.ts`'s trace can be graded at all.
