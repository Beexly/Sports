# Grok Heavy Run 3 — Abyssal (2026-10-02)

*Prompt 4 v2 from GROK-HEAVY-PROMPTS-2026-10-02.md. Four agents ran, not sixteen. Coverage is not 100% — the ledger is the constraint on every rank.*

## Coverage ledger

**Opened this pass (raw.githubusercontent.com):** docs/data/MARKET_CALIBRATION_2026-09-04.md, docs/brain/signal-ledger-scale-fit.md, docs/predictions/research/2026-09-28/signal-staleness-gate.md, docs/data/CARDS_SHARE_CORE_WIRING.md, docs/ops/hermes/CONTINUOUS.md, docs/dfs/research/2026-09-25/youtube-builder-research/handoff-indie-builders-v2-fullspec-2026-09-25.md, docs/arxiv-program/research/2026-09-21/sweep-2026-09-21.md, docs/arxiv-program/research/2026-09-21/arxiv-deep/0743-conformal-risk-control.md, maps c07 and c07d. Ledger paths 0540-soft-elo.md and 0489-coverage.md 404'd at guessed names.
**Unread:** briefs 0/3,457, fulltext 0/1,115, waves, scored_batch jsonl, phase2-candidates jsonl.
**arXiv:** one query (all:NFL AND all:calibration, 3 hits). Kept 2601.18774 (blown-lead pathwise calibration; NFL 2018–2024, no global departure; NBA excess in upper 5% tail). Excluded 1704.00197. 2607.00164 not read past title.
**Text scan (separate):** all 5,102 files opened for text scan, not deep-read. briefs/: 463 mention Brier, 356 mention log loss. fulltext/ first 2,500 chars: 176 mention NFL. waves/: 88 counted, one worker-status opened (completed ADAPT/REJECT on non-NFL ids). scored_batch_1–5.jsonl: 865 rows parsed; score 3 = 16+9+41+16+14. Score-3 NFL/absorbed: 1802.00998 nflWAR, 2311.03490 fourth-down humility, 1906.01760 continuous-time within-play valuation, 1710.06551 oddsmaker bias, 2003.10791 play-call HMM. Rest of score 3: cricket, soccer, hockey, tennis, parlays, tracking. None states a held-out NFL log loss beating the de-vigged close. 1704.00197 stays excluded.
**Citation chains:** 4 followed, 2 broken, 2 intact.

## Promote or kill (all six prior items re-ruled on opened sources)

**1. Conformal publication gate, ledger 0743. KILL the NFL result. PROMOTE the unrun sweep.**
Ledger opened. Verdict: ADAPT. The 0.0987 vs α=0.1 is the paper's polyp-segmentation trial (n=1,000 calibration images, 1,000 resamples) + MS COCO mean risk 0.0996. Both vision. arXiv non-exclusive license: learn the method. Exchangeability flagged in the ledger itself. No NFL out-of-sample result.
What checks out: docs/ops/hermes/CONTINUOUS.md — resolution ~0.0048, Brier fails the 0.22 floor because resolution is near zero; selectivePublishSweep in holdout-ranking-report.ts already sweeps deltas {0, 0.08, 0.10, 0.12, 0.15, 0.18}; the results table is EMPTY. The sweep has never been run.

**2. Per-QB EPA/dropback. KILL the cited delta as a GSE result.**
Handoff opened. The 0.632 vs 0.632 line is team efficiency on top of Elo — adds nothing (the map misattributed this pair as a per-QB move; chain broken). CORRECTION: the handoff ALSO states, separately, that rating passers individually is the largest improvement: log loss 0.633 → 0.625, AUC 0.690 → 0.700. The brief at briefs/c01/reader-42/ repeats it, tags the source as TreMatt03, MIT, liftable with attribution. It is a third-party finding. The close is not in that comparison. Protocol and leakage controls not in the brief. It stays a shadow re-run, not a kill of the sentence, not a measured GSE result.

**3. QB pressure-to-sack residual. KILL as a measured lift.**
sweep-2026-09-21.md opened: a SumerSports rate; Bryce Young 23.3% → 15.8% → 12.7% → 10.5% across seasons; one NGS chart of five pressures under 2.5s. No sample, no out-of-sample log loss, no comparison to the close. Team R² < 0.005 veto stands. Blocked on #1018 even as a hypothesis.

**4. Trust-target props stack. KILL as a measured edge. Method only.**
CARDS_SHARE_CORE_WIRING.md opened: a design deck. Mean E[N]·s_i. Fit is a digamma fixed point. Sealed holdout untouched; openHoldout must not be called. No holdout log loss in the file. The ≥5% gate and Pitts 0.18→0.28 split were not in this file. Do not claim a props gain.

**5. Injury/QB-change provenance. KILL as a new model. PROMOTE the missing column.**
signal-staleness-gate.md opened: the age gate is shipped (packages/ingestion-pipeline/src/signal-staleness.ts, 90-minute bound on solo-source Elo inside a 12-hour pre-kick window). Simulated on 158 production rows, vetoed exactly the Bears specimen. The file says it does not add a quarterback or injury signal, and isPublished is a bare Boolean with no provenance column (the C-158 gap). The column is the unbuilt piece.

**6. Within-player scale-fit. KILL as new work. Already shipped.**
signal-ledger-scale-fit.md opened. Status: shipped, fit date 2026-09-30, 118,462 rows, seasons 2020–2026. Between-vs-within r: passing EPA 0.084 vs 0.002 (36.1×), target share 0.293 vs 0.091 (3.2×), 2024 target share 0.314 vs 0.0046 (68×). Fitted weight puts target share over passing EPA 39:1. Do not rebuild.

**7. Moderate-favorite leaf. KILL.**
MARKET_CALIBRATION_2026-09-04.md opened. Corpus 5,281 games 2006–2025. Pooled held-out 2016–2025 n=2,750 (not 5,281): Brier 0.2106, CI [0.2050, 0.2172], adaptive ECE 0.0126. Isotonic/Platt/beta miss identity by ≤0.0005. The 6.5–9.5 leaf: train 65.86% vs test 57.12%, n=576. The file says this does not justify any product change. nflverse CC BY 4.0, attribute.

Demoted items stay dead. Soft-Elo and coverage transformer 404'd. 2601.18774 (no global NFL departure on blown-lead pathwise calibration, 2018–2024) weakens any claim that NFL live win probability is globally miscalibrated — diagnostic, not a build. CC BY 4.0.

## Misattribution log

- c01-map reported the handoff's 0.632/0.632 team-efficiency-on-Elo pair as per-QB log loss 0.633→0.625. The source does not contain that delta as a per-QB result. Chain broken (with the correction above: the 0.633→0.625 sentence exists separately as a TreMatt03 third-party finding).
- Ledger 0743 quotes 0.0987 vs α=0.1 — the paper's polyp-segmentation trial, not a GSE pick-loss result. c05-map carried it as GSE. The ledger's own GSE section says ADOPT only if a rolling backtest on posted picks clears α−0.01. That backtest is not in the file. Chain broken.
- The 6.5–9.5 leaf is in MARKET_CALIBRATION_2026-09-04.md as written. Chain intact — and the file kills its own follow-on.
- Scale-fit 4×–68× verified in signal-ledger-scale-fit.md. Chain intact. Shipped 2026-09-30.

## Pooled effects (only effects with a number in an opened file)

- **Closing moneyline calibration:** held-out 2016–2025, n=2,750 of 5,281: Brier 0.2106, CI [0.2050, 0.2172], adaptive ECE 0.0126. Calibrator spread <0.0005. The close is the calibration. Do not recalibrate.
- **Engine resolution:** CONTINUOUS.md, RES ~0.0048 vs ~0.03 needed for Brier ≤ 0.22; ~57 picks/day near 0.5. Binding constraint is coin-flip volume, not a new model.
- **Confidence as probability:** architecture doc via c02 — confidence ≥80 (n=235) claimed 0.8663, realized 0.5191, z=−10.7, Brier 0.3617; c06 — scores ≥80 won 43.7% claiming 86.2%. Same direction. Never display confidence as probability.
- **Within-vs-between-player:** one fit, already shipped. Not a new build.
- **Moderate-favorite leaf:** one file, author says no product change.
- **NFL in-game win-prob path:** 2601.18774, no global departure 2018–2024. One paper.
- **Pressure-to-sack:** cannot pool. Not an effect.
- Home-field, injury-absence points, EPA/dropback stability: no second opened estimate. Not pooled.

## Ranked build list (final)

**1. Run the existing selective publish sweep.** Fill the empty table. Publish only |p−0.5| ≥ δ; report rejected-set Brier. Read CONTINUOUS.md + MARKET_CALIBRATION_2026-09-04.md. Modify the sweep caller only. Do not edit bridge-model.ts. Do not set CALIBRATION_AUTO_PUBLISH. CONTINUOUS.md forbids floor changes and applying maps while resolution <0.02. Test: δ tuned on pre-holdout seasons. Pass: posted log loss beats de-vigged close, rejected set near Brier 0.25. Fail: posted no better than close, or shuffled-week placebo passes. Shadow.
Pseudocode (from the file's own sweep):
```
deltas = [0, 0.08, 0.10, 0.12, 0.15, 0.18]
for delta in deltas:
    posted = [p for p in settled if abs(p - 0.5) >= delta]
    rejected = [p for p in settled if abs(p - 0.5) < delta]
    record Brier(posted), Brier(rejected), count(posted)
pick smallest delta whose posted Brier <= 0.22
fail if Brier(rejected) far from 0.25
fail if posted log loss does not beat de-vigged close
```
Ledger 0743's λ̂ is the method to learn if the sweep passes, not tonight's ship. arXiv non-exclusive license.
**2. Provenance column on isPublished.** Record why a pick published. Read signal-staleness-gate.md; gate at packages/ingestion-pipeline/src/signal-staleness.ts. Modify publish write path only. Test: replay 158 rows — Bears row the only veto; starter-change week cannot publish with null provenance; age exactly 0 must NOT count as stale. Publish-ready as fail-closed bit, not a probability.
Do not touch #1018, #1019, #860. #1016 merged. Joint pipeline once both land and #1018 merges: provenance bit first, then the sweep. Null provenance never enters the δ filter.

## Gap ranking

1. Whether the sweep beats the close — the table is empty; this unblocks everything else.
2. Props residual vs the prop close — registry unwired; share-core has no holdout; absence-shuffle bar unrun.
3. QB identity after #1018 — pressure-to-sack has no out-of-sample lift; don't commission until that PR lands.
4. Within-week injury timing vs the close — no opened file has an NFL absence coefficient.
5. Pathwise calibration of GSE's own live feed — 2601.18774 didn't cover it.

## What's left

Unread: 3,457 briefs, 1,115 fulltexts, waves, scored batches. Next read order: sweep output after it runs → per-QB re-measure vs close → 2603.17866 only if a tracking feed exists. Do not page the brief tree until those three are done.

## The seven contracts (strategic program, multi-week — not tonight)

1. **Frontier table:** hosts scored on vendor benchmarks, all labeled vendor numbers, no sealed prediction ledger on any host. MiMo-V2.6-Pro 46.32 (Xiaomi, AA page reports 46; MIT on AA page not Xiaomi page). Claude Sonnet 5.5 (Anthropic; Terminal-Bench 4.0 70.6% vendor claim; teammate-reported AA 64%/56 unreopened — disagreement stands). GLM-5.3 (z.ai docs; HF license field glm-5.3). DeepSeek-V4.1-Flash (HF card, MIT, 552B, 1M context — card states recipe, not score). Gemini 3.8 Flash (ai.google.dev, closed). Qwen 3.8 (GitHub QwenLM, Apache-2.0; 27B + 2.4T-A95B open). Grok 4.7 (docs.x.ai; 500k context, $2/$6 per M; tools: functions, web, X, code; cutoff May 2026).
2. **Training plan:** GSE does not pretrain. Copy DeepSeek's shape, not data: the runnable stages are SFT → RL → on-policy distillation, on public and licensed feeds only. Data: PUBLIC = nflverse pbp (CC-BY-4.0; participation 2023+ CC-BY-SA 4.0, attribute FTN via nflverse), NWS weather, official injury text. LICENSED = sportsbook prices under feed terms. CLOSED = every host pretraining mix. Distill the teacher into an MIT host — DeepSeek-V4.1-Flash is the only host with MIT on the weight repo (MiMo's MIT is AA-page only — confirm weight repo before any distillation run).
3. **Teacher and exam:** the capability no host has is an audited forecast trace — injury text, weather, book price, play fact in; probability out; every number maps to a feed row; what was rejected is named. Football first (binary outcome, feeds exist). "Beat the close" is rejected as the exam; Terminal-Bench is not the exam. A stated probability the model's own history contradicts fails (the 80→0.8663/0.5191 row is the fail case).
4. **Ontology:** scheme/roster MEASURABLE (nflverse, CC-BY-4.0); participation 2023+ MEASURABLE (FTN via nflverse, CC-BY-SA 4.0); injury text MEASURABLE, effect size INVENTION; weather MEASURABLE (NWS); travel MEASURABLE (schedule); sportsbook LICENSED or absent; market close MEASURABLE (held-out file — baseline, not target); sleep/nutrition/cognition UNKNOWABLE this season; play physics INVENTION (2603.17866 needs tracking frames — no tracking feed in pipeline). Borrowed: closing-line Brier 0.2106 / ECE 0.0126 (n=2,750). Borrowed, not GSE: per-QB EPA 0.633→0.625 (TreMatt03, MIT, attribute). INVENTION: injury-absence points (falsifier: shift already in the close).
5. **Harness:** reasoning host DeepSeek-V4.1-Flash (MIT, 1M context); cheap pass Grok 4.7 (caller, not student — weights unstated). Frozen weights both. GSE memory = trace log + sealed ledger. Refusal: a trace number with no feed row, or a stated probability the ledger falsified. Exam pseudocode: teacher.reason(feeds[week]) → assert every number maps to a feed row → ledger.history_contradicts → REFUSE → lock pre-kickoff → score Brier/ECE → shuffled-week placebo must fail → parlay: shared factors named or refused.
6. **Next build night:** write the trace schema and the sealed-week scorer. Not a pretraining job. No distillation until the scorer fails a shuffled week. Don't touch #1018/#1019/#860. Don't rebuild bridge-model.ts. Don't re-litigate 1704.00197.
7. **Coverage:** opened this pass — Anthropic Sonnet 5.5 page, Xiaomi MiMo page, Z.ai GLM-5.3 docs, HF GLM-5.3 card, HF DeepSeek-V4.1-Flash card, Google Gemini 3.8 Flash docs, xAI Grok 4.7 docs, Qwen3.8 GitHub repo, nflverse participation license. Unread: 3,457 briefs, 1,115 fulltexts, the AA page behind the Sonnet disagreement, the MiMo weight-repo license file.
