# Deep analysis r04 — c09-r22, r23, r25, r26, r29

**Analyst:** r04 (subagent, depth 2/2)
**Date:** 2026-10-02
**Assignment:** 5 wave-0 subdirs. Reality check: **c09-r23 and c09-r26 contain zero briefs** (their wave-0 readers errored/closed mid-run on the 429 saturation; the slice map confirms all 299 sources are covered elsewhere, so no sources are actually orphaned — but there is no brief material in those two dirs to deep-analyze). Effective chunk: **27 briefs** — r22 (13), r25 (12), r29 (2).

**Character of this chunk:** overwhelmingly ops/infra/governance/doctrine, ~70% of the briefs. Almost no football-substance material. The intelligence-program value concentrates in four briefs: `patent-forensics` (r22, film-pipeline FTO → future QB/scheme behavior analysis), `rankings-program` (r29, charting spec + Phase-10 gating), `NFLVERSE_GSIS_CROSSWALK` (r25, identity join key for all nflverse/PFR/NGS data), and the `UNCERTAINTY_AND_ACTIVE_LEARNING` + `PUBLIC_DATA_FORENSIC_REPORT` pair (r22, honesty/review machinery). The ops calibration briefs (r25) independently corroborate the slice's calibration crisis.

---

## Verified claims

Format: claim — `source:line` — verdict. All paths relative to `~/workspace/vendor/Sports/docs/`.

### r22

- Vercel AI Gateway: 0% inference markup (pay provider list price), per-request cost/latency logging, budgets at 4 scopes (team/project/API key/user), ordered fallbacks — `engine/research/2026-09-28/vercel-max-leverage-2026-09-28.md:15,68,76` — VERIFIED. (line 68: "Zero markup, no platform fee on tokens — pay provider list price"; line 76: budgets at team/project/API key/user.)
- AI Gateway free tier "$5/mo credit, third-party verified 2026-09-24; buying credits permanently ends the free monthly credit" — `vercel-max-leverage-2026-09-28.md:70` — VERIFIED as quoted; provenance is third-party research, not official Vercel docs (doc itself labels it).
- OpenRouter 5.5% Stripe deposit fee ($0.80 min) — `vercel-max-leverage-2026-09-28.md:85` — VERIFIED as quoted; doc labels it "third-party research."
- Region pricing: Active CPU Fluid iad1/cle1/pdx1 $0.128 vs sfo1 $0.177 vs gru1 $0.221 per CPU-hr; provisioned memory $0.0106 vs $0.0147 per GB-hr; ~73% regional spread; sfo1→iad1 cuts compute ~28–38% — `vercel-max-leverage-2026-09-28.md:39-40,115` — VERIFIED.
- New teams default $200/billing-cycle on-demand budget with 50/75/100% alerts + optional auto-pause at 100% — `vercel-max-leverage-2026-09-28.md:54` — VERIFIED.
- Patent FTO correction: US20060132487A1 is NOT Sharp — filed by Object Prediction Technologies LLC, granted as US7609855B2 (Oct 27, 2009, inventors Sada/Tsai/Meijome), expired fee-related — `engine/research/2026-09-29/patent-forensics-2026-09-29.md:5` — VERIFIED.
- SMT acquired 100% of Sportvision, closed Oct 4, 2016, reported >$25M; six patents assigned to Sportsmedia Technology Corp March 2017 — `patent-forensics-2026-09-29.md:28` — VERIFIED.
- Sharp Labs of America (Camas, WA): 275 employees, 286 patents (EDN 2003–2004 reporting) — `patent-forensics-2026-09-29.md:60` — VERIFIED as quoted (contemporaneous reporting, not independently re-checked here).
- Sharp play-boundary methods: 70% voting sliding window (US7639275), 5–6σ color-histogram scene-change end detection (US7474331) — `patent-forensics-2026-09-29.md:55` — VERIFIED.
- FTO caveat: "displayed status is an assumption, not a legal conclusion; run a family/continuation review before any build decision" — `patent-forensics-2026-09-29.md:89` — VERIFIED.
- Uncertainty triage formulas: least-confidence = `1 - max(probability)`; margin = smallest gap between top-two class probabilities; entropy = normalized class entropy — `fable/UNCERTAINTY_AND_ACTIVE_LEARNING.md:10-12` — VERIFIED.
- Forensic-report fixture: `abs(0.59 − 0.48) = 0.11` probability delta; falsification rules (change fixture probs → delta must change deterministically) — `fable/demo/PUBLIC_DATA_FORENSIC_REPORT.md:27,39-40` — VERIFIED.
- Clean Rooms privacy thresholds per partner type (media/creator k≥50; DFS/sportsbook k≥100; sports-data provider/team/league k≥25) — `fable/aws/AWS_CLEAN_ROOMS_PARTNERSHIP_PLAN.md` (brief-level, no row numbers given; accepted as reported — source file exists and the brief is intake-faithful; structure matches the companion demo rules doc) — VERIFIED at brief level.

### r25

- Live calibration state RED: Brier ≈ 0.275 / ECE ≈ 0.112 / RES ≈ 0.002 — `ops/MASTER_PROMPT_V2_COMPRESSED.md:6` — VERIFIED. **Corroborated cross-file** (all in ops/): `ENGINE_RANKING_RES_NEAR_ZERO.md:4`, `LAUNCH_MAX_PATH_2026-08-09.md:6`, `MASTER_PROMPT_V2.md:17`, `MASTER_PROMPT_V3_COMPRESSED.md:13`, `BAKEOFF_FLOOR_STRESS.md:8` all state the same triple. Five-way corroboration — but all date from ~Aug 2026 (staleness risk noted under Challenges).
- Murphy decomposition: Brier = REL − RES + UNC; live RES ≈ 0.002 blocks the PROVEN claim — `ops/PLATT_AND_BRIER_DECOMP.md:3-4` — VERIFIED.
- Beta-map OGD: `g = σ(a·logit p + b)` under log-loss, re-fit on trailing chronological window default 120 samples; fields window.a / deltaA / deltaVarCal / expansionPreferred ∈ {full, window, neither} — `ops/SLIDING_WINDOW_OGD.md:7,12-15` — VERIFIED.
- Ingestion stale if last SUCCESS > 240m; settlement grace 6h; critical overdue threshold 5; health-alert ingestion age >90m — `ops/LAUNCH_PREFLIGHT.md:36-37,88-91` — VERIFIED.
- PROVE_THE_EDGE: "best professional operations live at 53–55% ATS; 57% sustained is legendary" — `ops/PROVE_THE_EDGE.md:26-27` — VERIFIED. "200+ fired bets" sample floor — `ops/PROVE_THE_EDGE.md:34` — VERIFIED. MAX_SEASONS_PER_CALL=2 — `ops/PROVE_THE_EDGE.md:90` — VERIFIED.
- Honesty demo floors: pundit hit rate withheld below 25 decided calls; five reason codes FIRE / NO_BET_LCB / NO_BET_WIDTH / INSUFFICIENT_CALIBRATION (+ one more); "not judged" = stratum < 100 settled picks — `ops/archive/dated/PUBLIC_HONESTY_DEMO_SCRIPT.md:17,86-87,96` — VERIFIED.
- nflverse identity: snap_counts is `pfr_player_id`-only (no GSIS column) — must bridge via roster; PFR ids are short strings (e.g., `MahoPa00`), never coerce to numeric — `ops/NFLVERSE_GSIS_CROSSWALK.md:13,44,49` — VERIFIED.
- Calibration pipeline chain: settled-picks → timeHoldoutSplit → CIR (`centeredIsotonicCalibration` in @sports/prediction-engine) → selectedSliceEce → CLV → portfolio Kelly; offline `npm run calibration:offline` = Shin → hold-out → CIR → paradox → Kelly deflator — `ops/ORBIT_MAP.md:11,26-28,39` — VERIFIED.
- vercel.json carries 15 crons (autonomy schedule) — `ops/LAUNCH_AUTONOMY_PACK_2026-08-06.md:54` — VERIFIED.
- Wide-loop handoff: stale PR hygiene for #265/#266 — `ops/WIDE_LOOP_HANDOFF_CLAUDE_MAX_2026-08-06.md:57` — VERIFIED.

### r29

- Rankings program status 2026-10-01 audit: QUEUED — NOT BUILT, NOT LIVE — `research/2026-09-28/orchestration/rankings-program.md:3` — VERIFIED.
- FantasyPros accuracy context: 150+ analysts; 2025 in-season winner Justin Boone (Yahoo); 2024 winner Tyler Orginski; Nathan Jahnke (PFF) most accurate in-season ranker six straight seasons; draft accuracy 3-yr rolling, Jody Smith (Draft Sharks) #1 — `rankings-program.md:58` — VERIFIED as quoted (second-hand from FantasyPros; not independently re-verified here).
- FFA MAE study 2019–2023, startable pool (top-20 QB/TE, top-50 RB/WR): per-position leaders rotate year to year; FFA simple average consistently near top — "the consensus beats almost every individual source" — `rankings-program.md:59` — VERIFIED as quoted (source is the FFA blog post; not a replicated experiment — see Challenges).
- FantasyPoints' own claim: "#1 DFS Fantasy Projections" — 2025, DraftKings, weekly correlation testing across 18 regular-season main slates; newsletter cites 0.71 CORREL, "#1 among the top 5 biggest DFS sites, after finishing 2nd-best last year"; competitors anonymized ("Comp. 1–3"); methodology unpublished; not tracked by any independent benchmark — `rankings-program.md:64,66` — VERIFIED as quoted.
- Automated charting spec: play-level tagging pipeline (personnel, formation, coverage shell, route concepts, blitz ID) over all-22 where legally available; automated QC (cross-tag consistency, physical-plausibility anomaly flags); diff-against-source with low-confidence review queue — `rankings-program.md:77-79,83` — VERIFIED.
- Hard gates: Phase 10, cannot start until Phase 1 (locked projection source), Phase 4 (adjustment layer + populated player signals), Phase 9 partial (off-field intake where backtested); "rankings never maintain a separate projection fork — pick↔ranking divergence is a bug" — `rankings-program.md:90-96, §"hard rule"` — VERIFIED (the "no separate fork" rule is stated in the doc's hard-rule section; the exact line for it wasn't re-grepped but the Phase gates are at 90–96).
- Snapshot schema: `{season, week, product, generated_at, input_hashes, model_version}`, frozen on publish; adjustments in TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG form — `rankings-program.md:48,38` — VERIFIED.
- Confidence display: Premium/Strong/Marginal/Pass tiers dropped onto the 9.2 Hold quality floor — `rankings-program.md:50` — VERIFIED.

---

## Cross-file connections

Each connection cites the chunk file and the slice-map / sibling file it connects to.

1. **Calibration crisis, third corroboration (r25 ↔ map #12, #13).** MASTER_PROMPT/PLATT_AND_BRIER_DECOMP record live Brier 0.275 / ECE 0.112 / RES 0.002 RED (five-way cross-file corroboration inside ops/). This is the same crisis measured independently in d29 (HERMES: 1,663 graded picks, resolution 0.005; 152 picks at ≥80% won 40%) and d28/d30 (PROVEN recipe α=0.88, floors Brier≤0.22/ECE≤0.05). The numbers are mutually consistent (RES 0.002 vs resolution 0.005 — same order of magnitude, zero-information ranking). **Connection verdict: reinforce.** Implication for the intelligence program: any QB/coaching/trust signal that can't raise RES is decorative — the sliding-window OGD detector (r25) is the diagnostic half, and the scalarizer activation gate (d34, map #18: |r|≥0.08 AND |slope|>se) is the promotion half. Those two should be paired: OGD window-vs-full detects regime change; scalarizer decides whether a new signal earns a weight.

2. **Honesty machinery as the intelligence API's outer contract (r22/r25 ↔ Garrett's 17:34 audit challenge).** Three independent honesty mechanisms in this chunk form a complete receipts layer: (a) PUBLIC_HONESTY_DEMO_SCRIPT sample floors (25 decided calls, 100-pick strata, five gate reason codes); (b) PUBLIC_DATA_FORENSIC_REPORT's `abs(model_prob − market_open_prob)` delta + explicit would-not-claim list + fixture falsification rules; (c) EVIDENCE_INDEX's ten schema contracts (claim-evidence-entry, edge-experiment-entry, calibration-report-entry). The map's engine has the calibration *math* but not the receipts *format* — this chunk supplies the format. **Connection verdict: extend** — nothing in the map contradicts; this is the missing "how claims arrive with audit receipts" piece the alignment synthesis demands.

3. **Film pipeline: two halves of one build (r22 patent-forensics ↔ r29 rankings-program charting spec).** Neither file references the other, but they compose: patent-forensics clears the FTO path for multimodal play-boundary detection (OCR/audio/data-feeds/visual, explicit uncertainty, image-based match-moving — deliberately NOT the expired single-cue claims) and recommends G2-classical-prefilter → G1-field-anchored-telestration build order; rankings-program specifies what runs downstream: automated personnel/formation/coverage-shell/route/blitz tagging + automated QC + low-confidence review queue, and states the cost-honest truth that full hand-grading is a staffing decision. Together: **boundary detection (r22) → tagging (r29) → review queue (r29) → tendency data** that fills map gaps #2 (coaching tendencies thin) and #5 (man/zone paywalled). **Connection verdict: compose (INFERENCE — the composition is mine; neither source links them).**

4. **Identity crosswalk is the dependency everything sits on (r25 ↔ map #5, #7, #8).** NFLVERSE_GSIS_CROSSWALK (snap_counts PFR-only, `MahoPa00` string keys, season-matched rosters, first-write-wins) is the join prerequisite for the QB matrix (d35, map #1), DST features (d35, map #7), and the OL-injury adjustment flags (d34, map #5). Ordering dependency for the intelligence API: crosswalk → feature joins → profiles. No other file in the slice documents the snap_counts PFR-only trap — this is the file that prevents a silent inner-join data loss. **Connection verdict: reinforce (foundational).**

5. **Adjustment-layer schema agreement (r29 ↔ map build-order #6).** rankings-program mandates adjustments in TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG form and "exactly one signal pipeline, not a rankings-specific one" (player signals table). The map's build order already proposes "rule-shape contract (d25) + scalarizer (d34) → adjustment layer intake." The r29 doc supplies the field-level schema and the no-fork hard rule (pick↔ranking divergence = bug). **Connection verdict: reinforce and concretize.**

6. **Uncertainty triage ↔ uncertainty stack (r22 fable ↔ map build-order #5).** The fable three-formula review-queue triage (least-confidence/margin/entropy) is the *human-review* complement to the map's selective-prediction stack (AC-RAC conformal decisions, SCoRE selective prediction). Different layer (triage vs abstention), same machinery, no contradiction. The charting pipeline's low-confidence review queue (r29) is the natural first consumer. **Connection verdict: extend.**

7. **AI Gateway pilot ↔ cost stack (r22 vercel-audit ↔ standing prefs).** The audit's budget-capped AI Gateway pilot (one key, one lane, one month vs OpenRouter) operationalizes Garrett's standing model-routing directive (OmniRoute/OpenRouter; NIM flaky). It does not conflict with the map's δ/σ staking stack — orthogonal layers (inference cost vs bet sizing). **Connection verdict: no contradiction; orthogonal.**

8. **Clean-Rooms governance ↔ trust-signal gap (r22 ↔ map gap #1).** The Clean Rooms partnership plan is scaffolding for data that doesn't exist yet (doc is explicit: no partner, no dataset, no collaboration). Map gap #1 is the trust-signal intake gap. The rights-gating rule (expert-partner-signal-playbook: rights-gated before display/storage/redistribution/training/expert-signal conversion) is the compliance half of any future quote-mining intake. **Connection verdict: compose — future trust-signal intake should route through the rights-gate + k-threshold contracts already specified here, rather than being built greenfield.**

---

## Challenges

**Claim-level problems:**

1. **FLAGGED — PROVE_THE_EDGE carries two win-rate caps.** Line 26: "53–55% ATS; 57% sustained is legendary" (sourced to PATH_TO_PROVEN_EDGE §3/§4). Line 38: the task asks for "~52-56% / 200+ fired bets / selective subset" (sourced to SPRINT_QUEUE.md lines 1940-1942). These are not the same number. The doc is self-aware ("If a differing number is later found in a strategy doc, prefer the doc and update this runbook") but the inconsistency persists in the text. Either is defensible as an engine input (both say ~mid-50s is the pro ceiling), but the doc should not carry two numbers. Recommend: adopt one figure from PATH_TO_PROVEN_EDGE and delete the other.
2. **FLAGGED — calibration RED state is stale-dated.** The 0.275/0.112/0.002 triple is corroborated 5× across ops docs, but every corroborating doc is ~Aug 2026 vintage. d29's HERMES numbers (2026-09-04, 1,663 graded picks) are fresher and consistent — which strengthens the *direction* of the claim but means the exact triple should be treated as "last recorded Aug 2026 state," not live truth. Any engine input keyed to these constants (e.g., the bake-off floors) needs a refresh read before use.
3. **FLAGGED — FantasyPoints debunk rests on their own pages.** The rankings program's skepticism of the "most accurate 2025" claim is well-constructed (three different measurements: DK-slate correlation vs FantasyPros ranking accuracy vs FFA projection MAE), but every fact about FantasyPoints (0.71 correlation, 18 slates, anonymized competitors) comes from FantasyPoints' own site/newsletter. The debunk is a *framing* correction, not an independent measurement. Fair as stated; don't cite it as a replication.
4. **FLAGGED — FFA "consensus beats almost every individual source" is second-hand.** The 2019–2023 MAE study finding (FFA simple average consistently near top across positions/seasons) comes from a Fantasy Football Analytics blog post. It is the strongest available prior for GSE's benchmark methodology, but it has not been re-run in-repo. Treat as a prior, not a verified result — and note the population (top-20 QB/TE, top-50 RB/WR startable pool) before generalizing.
5. **FLAGGED — Vercel audit mixes official and third-party provenance.** The "0% markup" and "$200 budget" claims are official-docs sourced (vercel.com/docs/*). The "$5/mo free tier" and "5.5% OpenRouter deposit fee" are third-party-research sourced; the doc labels both honestly. The "NVIDIA NIM free tier flaky" claim is anecdotal (Garrett's TASK-012 experience). Usable for the pilot decision, but the pilot's acceptance gate must be measured spend, not these figures.
6. **FLAGGED — patent FTO is explicitly not legal advice.** The forensics doc says displayed Google-Patents status "is an assumption, not a legal conclusion" and requires a family/continuation review before build. The build recommendation (G2 prefilter → G1 telestration) is marked UNTESTED — QUEUED FOR EVALUATION. The "lab-to-lapse" causal link for Sharp's collapse is flagged unverified in the source itself. The verdict is directionally strong (two independent "why they stopped" answers: term-expiry-after-acquisition for Sportvision; commercial orphaning for Sharp) but the FTO half still has an open legal-review gate.
7. **FLAGGED — PUBLIC_HONESTY_DEMO_SCRIPT is archived (2026-07-03 era).** The shipped-state claims (PRs #206/#207/#208 merged, #209 open) are two months stale by the analysis date; the *floors* (25 calls, 100-pick strata, 5 reason codes) are policy constants that presumably still hold, but verify against current code before treating them as live gates.
8. **Stale-by-design:** WIDE_LOOP_HANDOFF_CLAUDE_MAX_2026-08-06's "live baseline (to re-verify, evidence expires)" and LAUNCH_AUTONOMY_PACK's live-state claims are operational snapshots, not durable facts. Not errors — but they have no business as engine inputs.

**Method problems:**

9. **The "would I bet on this" test.** The chunk's bettable content is thin — mostly deliberately so (it's ops/doctrine). The bettable items: (a) AI Gateway pilot — bettable, pilot is designed as a measured experiment; (b) FantasyPoints claim — the doc's "different measurements" framing is the kind of distinction that saves money, bettable in the sense of *not* copying a marketing claim; (c) patent FTO build — explicitly UNTESTED, not bettable until the classical prefilter runs on real NFL frames; (d) consensus-beats-individuals (FFA) — bettable as a *benchmark-method choice* for the rankings program, not as a production edge.
10. **Second-hand citation chains with no verification.** This chunk is unusually citation-honest (it labels third-party vs official, marks unverified links, states what demo fixtures don't prove). The weak links are: FantasyPros winners list (2025 in-season Justin Boone etc.) — single-source from FantasyPros leaderboards; Sharp employee/patent counts — single-source from EDN 2003–2004; EDN's "ESPN likely first licensee" — described by EDN, never materialized, correctly flagged as no-durable-traction. None of these are load-bearing for engine inputs except the FFA consensus finding (see #4).
11. **r23/r26 empty.** Two of five assigned subdirs yielded nothing. The slice map says all 299 sources have briefs, so the underlying files were covered by dense-wave readers elsewhere — but this deep analysis cannot speak to whatever was in r23/r26. If the parent needs per-reader coverage of those dirs, the wave-0 chunk manifests (`chunks/c09/chunk_*`) would need mapping to reader IDs.

**INFERENCE-marked speculation:**

- **(INFERENCE)** The sliding-window OGD diagnostic and the d34 scalarizer activation gate are complementary halves (regime detection vs promotion decision). Neither file proposes the pairing; the composition is mine, and it should be validated by running both on the same historical pick series before any wiring.
- **(INFERENCE)** Applying the fable least-confidence/margin/entropy triage to QB-behavior and scheme classifications (e.g., ambiguous coverage-shell tags) is my extension. The source only covers "surfaces in the GSE web app." The formulas are domain-general, so the risk is low, but no in-slice evidence tests them on football classifications.
- **(INFERENCE)** The patent-forensics build recommendation (G2→G1) plus the rankings charting spec is presented here as one film-intelligence stack. The sources never connect; the composition is architecturally natural but unbuilt and untested at every stage.
- **(INFERENCE)** The claim-evidence schema trio (r22) as the implementation of Garrett's 17:34 audit-receipts mandate is my mapping. The schemas exist; whether they satisfy his bar ("test counts, what was exercised, where the logs live") needs a check of the schema fields against that bar — the brief lists schema names, not field contents.

---

## Buildable systems

Prioritized toward QB behavior, coaching/scheme, OL, trust signals, calibration, uncertainty, sizing. Each entry: name, inputs → method → output, acceptance gate. Status notes where the source says QUEUED/UNTESTED.

### 1. Review-queue triage layer (r22, `fable/UNCERTAINTY_AND_ACTIVE_LEARNING.md`)
- **Inputs:** per-case class probability vectors from any engine classifier (coverage-shell tags, blitz ID, pundit-call classifiers, scheme labels); prediction intervals + settled outcomes from the uncertainty-map shadow segment.
- **Method:** rank review candidates by least-confidence `1 − max(p)`, margin (smallest top-two gap), and normalized class entropy. Ranking only — never retrains, never triggers paid jobs, never routes picks to customers.
- **Output:** ordered human-review queue in the web app.
- **Acceptance gate:** shadow validation on settled outcomes — top-decile least-confidence cases show ≥2× the error rate of median cases; queue reorders deterministically (same inputs → same order). **First consumer:** the charting pipeline's low-confidence tag queue (r29).

### 2. Model–market disagreement monitor (r22, `fable/demo/PUBLIC_DATA_FORENSIC_REPORT.md`)
- **Inputs:** `current_model_probability` and `market_open_probability` per game/pick; public-event timing metadata; depth-chart stability flags.
- **Method:** `abs(model_prob − market_open_prob)` delta + gse_flags (model-market disagreement, public event timing changed after market open, depth-chart instability requires review) + explicit would-not-claim list attached to every output. Fixture-falsification discipline: changing inputs must change outputs deterministically; required fields missing → schema failure.
- **Output:** honest disagreement report per pick — what the model says, what the market said at open, what it is *not* claiming.
- **Acceptance gate:** recomputation is deterministic on fixtures (the `abs(0.59−0.48)=0.11` pattern); flags fire only with named evidence; the would-not-claim list (no "betting edge," no "prediction superiority") is enforced in copy, not just docs.

### 3. Claim-evidence audit ledger (r22, `fable/evidence/EVIDENCE_INDEX.md`)
- **Inputs:** engine claims, edge experiments, calibration reports.
- **Method:** adopt the claim-evidence-entry / edge-experiment-entry / calibration-report-entry schema pattern as the engine's experiment ledger format (fields: claim, evidence, source+hash, blockers).
- **Output:** machine-verifiable receipt per engine claim — the direct implementation of Garrett's audit-receipts bar (test counts, what was exercised, where logs live).
- **Acceptance gate:** every public or internal engine claim has a linked ledger entry with source hash; the claims harness fails if a live-source claim lacks evidence (the `npm run fable:claims` pattern).

### 4. Non-stationarity / underconfidence regime detector (r25, `ops/SLIDING_WINDOW_OGD.md`)
- **Inputs:** chronological pick outcomes + raw model probabilities.
- **Method:** Beta-map OGD `g = σ(a·logit p + b)` under log-loss, fit on full series vs trailing window (default 120); read `deltaA = window.a − full.a`, `deltaVarCal`, `expansionPreferred ∈ {full, window, neither}` per the decision table (window.a>1 + beats-raw-Brier + deltaVarCal>0 → RES-cal candidate offline; unstable window.a → non-stationary, shadow only).
- **Output:** regime classification per signal — underconfident / fine / non-stationary / don't-touch.
- **Acceptance gate:** no map ever applies to live eligibility (`CALIBRATION_ADJUSTMENTS_ENABLED` stays OFF); a RES-cal candidate is proposed offline only after the full decision-table row fires. This is diagnostics, not a publish policy — the source is explicit.

### 5. nflverse identity crosswalk service (r25, `ops/NFLVERSE_GSIS_CROSSWALK.md`)
- **Inputs:** nflverse rosters, snap_counts (PFR-keyed), pfr_advstats, injuries, weekly_rosters, NGS (`player_gsis_id`), PBP role ids.
- **Method:** `buildIdCrosswalk`/`resolveGsisId` with PFR string ids (never numeric, never invented), season-matched roster loading (prior season only to fill missing keys, first write wins), bridge `snap.pfr_player_id → roster.pfr_id → roster.gsis_id` and ESPN/PFR advstats paths.
- **Output:** GSIS-keyed joins for snap counts, pressures, YAC, NGS tracking — the identity layer under every QB/OL/player feature.
- **Acceptance gate:** zero invented IDs (empty vendor id → no substitute); snap_counts join coverage ≥99% on the stats season's roster; season-floor law enforced (no fabricated injury designations early-season).

### 6. Film play-boundary + tagging pipeline v0 (r22 + r29; STATUS: UNTESTED — QUEUED FOR EVALUATION)
- **Inputs:** broadcast video frames (real NFL frames for the first test).
- **Method:** (a) multimodal play-boundary detection — scoreboard/clock OCR + audio cues (whistle/crowd) + visual models + data feeds, explicit uncertainty, no single cue as ground truth; image-based match-moving + neural segmentation, zero stadium hardware (deliberate design-around of the expired Sportvision/Sharp claims); build order G2 classical prefilter → G1 field-anchored telestration. (b) automated per-play tagging: personnel, formation, coverage shell, route concepts, blitz ID; automated QC (cross-tag consistency, physical-plausibility anomaly flags); low-confidence tags → prioritized review queue (sampled, not every play).
- **Output:** charting rows per play with per-tag confidence — the tendency/coverage data source the slice map says is thin (gaps #2, #5).
- **Acceptance gate:** family/continuation FTO review completed before build (the doc's explicit gate); boundary precision/recall on a hand-labeled sample ≥90% precision; QC review queue sized by confidence; never claim "hand-graded" until humans actually graded. Feeds coaching-tendency and shell-conditioned matchup features downstream.

### 7. Rankings publication engine (r29; STATUS: QUEUED — hard-gated on Phase 1/4/9)
- **Inputs:** locked projection source (Phase 1, Garrett's call) + adjustment layer v1 (Phase 4) + populated player signals table (Phase 4, "exactly one signal pipeline") + off-field intake where backtested (Phase 9 partial).
- **Method:** frozen immutable snapshots `{season, week, product, generated_at, input_hashes, model_version}`; adjustments logged TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG; PPR published primary, half-PPR/standard recorded for audit; Premium/Strong/Marginal/Pass confidence tiers on the 9.2 Hold floor; **hard rule: no separate projection fork** — pick↔ranking divergence for the same player/week is a bug.
- **Output:** rest-of-season + weekly + positional rankings, weeks 4 → fantasy playoffs, auto-scored.
- **Acceptance gate:** MAE/RMSE/Spearman vs actuals per position per week with confidence intervals on differences; public benchmark = FantasyPros analyst registration or FFA-style MAE with identical population/weeks/metric; no "our accuracy vs FantasyPoints" head-to-head (Garrett's call — the measurements differ).

### 8. Agent-fleet LLM cost pilot (r22, `vercel-max-leverage-2026-09-28.md`)
- **Inputs:** agent-fleet model calls (OpenRouter + NIM).
- **Method:** one budget-capped Vercel AI Gateway key, one agent lane, one month, vs OpenRouter baseline. 0% inference markup vs OpenRouter's 5.5% deposit fee; 4-scope budgets (team/project/key/user) with 50/75/100% alerts; ZDR/disallow-prompt-training set before any projection/proprietary data flows; ISR/static-ify public projections+rankings pages in parallel (cached view = zero invocations).
- **Output:** measured $/1K agent calls + spend-governance report; region moved to iad1 if elsewhere.
- **Acceptance gate:** pilot $/1K calls lower than OpenRouter all-in at equal task quality; CRON_SECRET on all cron routes (publicly invokable today — the doc's security finding); spend budget $40–60 with alerts set before pilot.

---

## Integration notes

For a unified intelligence API tying qb-behavior + coaching + trust-signals + reasoning into one callable interface, this chunk contributes the **outer honesty contract and the dependency ordering**, not the models themselves:

1. **Ordering dependency (build/wire sequence):** identity crosswalk (r25, #5) → charting/boundary pipeline (r22+r29, #6) → tendency + matchup features → QB behavioral profiles (map #1–#4 inputs) → game model; calibration/disagreement monitors (#2, #4) wrap every published number; review-queue triage (#1) sits above all classifiers. OL data specifically flows: crosswalk joins snap_counts/advstats (PFR-only trap documented) → OL injury flags (map #5) → trench adjustments in TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG form (#7).

2. **Cross-module contracts:**
   - Every probability-emitting module must publish `{raw_prob, sample_size, regime_tag}` so the disagreement monitor (#2) and sliding-window OGD (#4) can consume it without per-module adapters.
   - Every classifier (coverage shell, blitz ID, play boundary, scheme label) must emit a **confidence score** — the shared currency between the least-confidence triage (#1) and the charting QC review queue (r29). No confidence → no queue → no human review; make it a required field.
   - Adjustments across ALL modules use one schema: TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG (r29). This is the "one signal pipeline" rule — the game model, the rankings engine, and the DFS packet consume the same adjustment log, never module-local forks.

3. **Honesty at the API boundary (not per module):** gate reason codes (FIRE, NO_BET_LCB, NO_BET_WIDTH, INSUFFICIENT_CALIBRATION, NOT_EVALUATED_MISSING_INPUTS), sample floors (25 decided calls before a pundit % renders; 100 settled picks before a stratum is "judged"), and the would-not-claim list are module-agnostic. Enforce them in the API layer so a new QB-behavior or trust-signal module inherits the receipts discipline without re-implementing it. This is the direct answer to the 17:34 audit challenge: claims arrive with ledger entries (claim-evidence-entry schema), not with adjectives.

4. **Trust-signal intake placeholder:** the slice has ~zero trust-signal coverage (map gap #1). When intake is built, route it through the contracts this chunk already specifies: rights-gating before display/storage/training (expert-partner-signal-playbook), k-anonymity aggregation thresholds (Clean Rooms plan: k≥50 media/creator, k≥100 DFS/sportsbook), and every extracted claim lands as a claim-evidence-entry. Don't build intake greenfield — the compliance shape exists.

5. **Calibration-state freshness:** the API should expose the live calibration triple (Brier/ECE/RES) as a first-class endpoint, not a constant in a prompt file. The r25 triple is five-times-corroborated but Aug-2026-vintage; a stale constant masquerading as live state is exactly the "fitting on the answer" failure the as-of quarantine ruler (map #19) exists to prevent. Wire the endpoint to the bake-off cron output (`calibration-map-bakeoff.json`), not to a doc.

6. **What this chunk does NOT supply:** no QB-behavioral features, no coaching-tendency time series, no OL continuity metrics, no trust-signal extractors — those live in the dense-wave briefs (d24/d32–d37). This chunk's job is the scaffolding they plug into: identity, honesty, review, calibration diagnostics, and the film-pipeline FTO. The film pipeline (#6) is the one build in this chunk that *creates* new intelligence data rather than governing it.
