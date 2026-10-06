# Deep analysis d06 — c09-d30..d37

**Analyst chunk:** d30 (ops/archive, ops/audit, ops/edge), d31 (ops/edge, ops/evals), d32 (ops/hermes, ops/launch, ops, performance, phase-4, predictions), d33 (product, props), d34 (reasoning, research), d35 (research/2026-09-19-dk-week2, research/2026-09-24), d36 (research/2026-09-26, research/2026-10-01, research, revenue), d37 (source triage, statking, strategy).
**Read:** all 40 briefs. **Verified:** headline claims against `~/workspace/vendor/Sports/docs/` sources (read-only). Source-path resolution note: several briefs cite `deep/<file>` but the vendor checkout keeps these under `research/2026-09-19-dk-week2/deep/<file>` — resolution verified, no misses.
**Character of the chunk:** the football-substance half of the slice (QB matrix, DST/TE/WR Week-2 research, Week-3 wire, props projections, CV corpus) + the governance half (calibration floors, rulers, scalarizer, versioning, launch gates). The most buildable material in the slice lives here.

## Verified claims

Format: claim — `source:line` — VERIFIED or FLAGGED.

**QB behavioral matrix (d35)**
- Cooper Rush Week-1 profile: CPOE −21.3 [WEAK, worst], 80% pressure-to-sack [WEAK, worst], QBR 2.6 (worst), 3.5 air yds/att [WEAK], league-high 52.6% of passes to RBs; "trap at any salary" — `research/2026-09-19-dk-week2/deep/qb-full-pool-2026-09-19.md:73-74` — VERIFIED
- Geno Smith: 0.00% PFF negatively-graded dropbacks (1st of 30, "cleanest process of W1"); career 4-0, 104.4 rating vs Jonathan Gannon defenses — `qb-full-pool-2026-09-19.md:137` — VERIFIED
- C.J. Stroud: 0.45 EPA/db when kept clean; 21% aggressiveness (slate-high); highest accurate throw rate [ELITE] — `qb-full-pool-2026-09-19.md:116` — VERIFIED
- Jordan Love: 78.6% first-read (highest), bad-throw 35.7% (worst), Week-1 total EPA −15; 2025 baseline −1.4 EPA/game — "continuation, not outlier" — `qb-full-pool-2026-09-19.md:109` — VERIFIED
- Matrix covers 21 QBs in-file (21 `###` QB sections; 9 covered by a sibling lane); ALL salaries are [2P] second-party (DK API Akamai-blocked, verified 9/19); Mac Jones Week-2 salary UNKNOWN — `qb-full-pool-2026-09-19.md:6,196` + heading count — VERIFIED

**DST/trench features (d35)**
- Best pressure mismatch: JAX 50.0% generated (#2) vs DEN 56.3% allowed (worst) — `research/2026-09-19-dk-week2/deep/dst-phase1.md:34` — VERIFIED
- Motion-at-snap defensive pass EPA (@Paganetti, obs 9/19): PIT −0.85 … CLE +0.66 (full 24-team table) — `dst-phase1.md:42` — VERIFIED
- SumerSports edge PRWR (9/18, "approx reads"): Jalyx Hunt 29.6%, Maxx Crosby 26.7%, Will Anderson 24.1%, Will McDonald 22.2% — `dst-phase1.md:47` — VERIFIED (caveat is in-source: approximate reads)

**WR/TE trust features (d35)**
- Parker Washington W1: 0.40 TPRR, 5.53 YPRR, 26.1% share, 62.5% routes — labeled SINGLE (internal table); YPRR leaderboard JSN 3.79, Watson 2.85, Burden 2.79, London 2.52, Diggs 2.51 (from 2025-26-season CSV) — `research/2026-09-19-dk-week2/verify/wr-verify.md:52,58` — VERIFIED (see Challenges on the season-frame mismatch)
- McBride: 13 targets, 35% target share, +0.289 EPA/target; Schultz $3,200 / 11.6 FIC (3.6x), 18.2% first-read share, −0.315 EPA/target warning; Fant −1.066 EPA/target (worst); Kmet took Loveland's red-zone work — `research/2026-09-19-dk-week2/deep/te-phase1.md:45,47,65` — VERIFIED

**Week-3 wire (d34)**
- Pre-week-3 QB passing EPA/attempt: Purdy 0.503 (56 att), Allen 0.493 (60), Penix −0.756 (54), Rodgers −0.389 (81), Mayfield −0.306 (62), Stroud −0.087 (94) — `reasoning/week3-current-wire.md:8,20` (sample lines) — VERIFIED
- Scheme fingerprints (charted prior plays): SF motion 64.0% / PA 15.1%; LAC motion 66.2% / shotgun 61.3%; BUF shotgun 33.1%; CIN motion 29.8% / RPO 6.8%; NO no-huddle 12.5% — `week3-current-wire.md:21,45,72,75` — VERIFIED
- Named OL outs: GB Aaron Banks (G), Zach Bako-Bewele (T); LAC Trey Pipkins (T), Kayode Awosika (G) — `week3-current-wire.md:13,73` — VERIFIED

**Scalarizer + honesty gates (d34)**
- f1 = 0 when `|r| ≥ 0.08` AND `|slope| > se`; otherwise f1 = 1 ("Honesty failing is DARK"); only g = 0 goes LIVE — `reasoning/overnight-agent-prompt-2026-09-26.md:125` — VERIFIED
- DARK candidates, measured on 2025 holdout: officials n=113, r=−0.09257, slope=−0.01007, se=0.01028 (|r| clears .08, |slope| does not clear se); weather_physics wind slope −0.135/mph, se 0.1618, n=349; coaching fourth-down go rate r=−0.01363, n=255 — `overnight-agent-prompt-2026-09-26.md:47,48,50` — VERIFIED (brief's rounded values match)
- Calibration contract bar: sample ≥ 250, ECE ≤ 0.06, drift ≤ 0.10; below sample → `INSUFFICIENT_SAMPLE`, `probabilityClaimsAllowed: false` — `overnight-agent-prompt-2026-09-26.md:322` — VERIFIED
- Week-3 LIVE registry row: 2026_03_LAC_BUF edge sum 0.30259224777263855, coverage 0.68 — `overnight-agent-prompt-2026-09-26.md:281` — VERIFIED

**Calibration weights (d34)**
- Half-PPR blend w = 0.1 (chosen by lowest 2024 MAE, then frozen); position weights = 2025 inverse-MAE normalized: TE 0.329 (n=1150, MAE 3.162), RB 0.250, WR 0.269, QB 0.152 (n=583, MAE 6.827, hardest) — `reasoning/calibration-weights.md:4,16,18` — VERIFIED
- Elo on 3,018 games (2015–2025): Brier 0.2312, ECE 0.0338, drift 0.0057; devigged-price baseline 0.2122 — "This Elo does not beat that baseline, so the calibration contract must not come back VALIDATED" — `calibration-weights.md:30-31` — VERIFIED

**Rulers / CLV (d32)**
- Current CLV grader: "23.0 percent against a 52.4 percent requirement cannot be read as a statement" about the model alone — mint/close averages over different book sets; 52.4% is a RATE (share of picks whose price beat the close) — `ops/hermes/BUILD-QUEUE-2026-09-18-rulers.md:108,113` — VERIFIED
- Fix: grade only over the bookmaker-key intersection; refuse on empty intersection; store `clvSameBookValue` / `clvSameBookVerdict` / `clvBookBasis`; count refusals by reason — `BUILD-QUEUE-2026-09-18-rulers.md:139` — VERIFIED
- `gate_decisions` holds 1,167 rows (2026-06-10 → 2026-06-11) and nothing since — no code writes the table; readers on fallback paths 3+ months — `BUILD-QUEUE-2026-09-18-rulers.md:154` — VERIFIED
- Conformal: n=5, α=0.1 claims 90% coverage, delivers 83.33% after clamping — fix = return +infinity (refusal to price) below the sample floor, per stratum — `BUILD-QUEUE-2026-09-18-rulers.md:201,204,215-216` — VERIFIED

**Calibration floors / launch gates (d30)**
- `DEFAULT_CALIBRATION_FLOORS = { n: 100, brier: 0.22, ece: 0.05, murphyReliability: 0.05 }` at `apps/web/lib/ops/calibration-eligibility.ts:69-74` — `ops/edge/2026-08-19-calibration-gate-split-map.md:13` — VERIFIED
- Ladder: FOUNDING (live) → PROVEN (≥100 settled + published calibration) → ESTABLISHED (≥500 + verified CLV ≥52.4%) → AUTHORITY; verification gate: typecheck · lint · 5,619 web tests + engine/package suites · build (191 pages) — `ops/archive/root-museum/LAUNCH_LEDGER.md:109,102,28` — VERIFIED
- Split design: CALIBRATION gate {n:100, ece:0.05, murphyReliability:0.05} (currently passing) vs DISCRIMINATION gate {n:100, brier:0.22} (currently failing); BS≤0.22 requires resolution RES ≳ 0.03–0.05 ("calibration work alone cannot close the discrimination half") — brief-accurate to `ops/edge/2026-08-19-calibration-gate-split-map.md` — VERIFIED

**xFP/FPOE negative (d36)**
- Pre-registered FAIL: xFP/FPOE does NOT beat naive last-week fantasy points for next-week rank prediction — Δrho = −0.0165, 95% season-week bootstrap CI [−0.0396, 0.0086] (n=6022, holdout 2020–2025); 12/12 guard tests pass; results measured 2026-09-18 on a Windows worktree and NOT re-run — `research/2026-09-26/RESCUE-2026-09-26-4-xfp-research.md:17-18` — VERIFIED

**Props projections BUF-DET (d33)**
- Score: BUF 28 [21,36] – DET 25 [17,33]; drive method (BUF 2.63, DET 2.53 pts/drive × ~10.5 drives) vs EPA method margin −3 vs −7, presented AS the uncertainty — `props/research/2026-09-17/props-consensus/game-projections.md:15` — VERIFIED
- Structural mismatch: BUF rushes 4 on 70.4% of dropbacks (2025) / 64.3% (Wk1 2026) — top-5 four-man rate; DET allowed-pressure proxy 18.9% (2025) / 19.5% (Wk1), bottom-third, two backup starters; DET also down both starting safeties (Branch, Joseph — PUP) — `game-projections.md:5,30` — VERIFIED
- Luck layer: DET forced fumbles 2.10%/play (+6.5 over expected) but recovered only 26.3% (−20 pts vs league) — positive regression candidate; BUF's 13 INTs vs 8.9 expected — regresses down — `game-projections.md:31` — VERIFIED
- Literature vetoes: individual player sack props = NULL (pressure-to-sack conversion "near-pure luck," R² < 0.005) — `game-projections.md:48` — VERIFIED
- Prop leans: Allen pass yds market 250.5 vs model 201 — UNDER lean (band [135,265] covers the line); LaPorta rec yds 46.5 vs 79 — OVER lean (17.2% when-active share, n=9) — `game-projections.md:52-53` — VERIFIED

**Edge sheet situational splits (d32)**
- BUF/DET OFF/DEF EPA league ranks #5/#11/#9/#14; LATE AND CLOSE: BUF 68th, DET 6th (biggest gap) — `predictions/research/2026-09-17/edge-sheet/DESIGN_CRITIQUES_V2.md:137,71` — VERIFIED with FLAGGED internal inconsistency: line 66 gives "DET 6.5th percentile … vs BUF 67.7th" (6th/68th vs 6.5th/67.7th — rounding drift between critique passes)

**Vision tracker (d37)**
- June 2026 baseline: 4,349 web tests + 392 engine tests (4,898 total); "zero DONE-claims failed artifact verification" — `strategy/vision-tracker.md:159` — VERIFIED
- QB Pressure *Sensitivity* PARKED — "needs clean-vs-pressured efficiency splits not in this feed" (Protection Stress index 0–100 is DONE) — `strategy/vision-tracker.md:57` — VERIFIED

**NGS tracking ingest spec (d32)**
- Named per-player per-week NFL fields: `player_id, week, position, avg_separation, route_efficiency, target_rate, snap_count_pct`; TTL 7 days; aggregates-only, never raw RFID/GPS — `performance/radar-and-tracking-data-layer.md:156-157` — VERIFIED

**DFS oracle proof (d37)**
- Before fix: shipped slate 6 cases — 2 at optimum, 4 beaten by oracle (cash 120.0 vs 120.5; GPP 216 vs 218); synthetic 78 — 55 at optimum, 23 beaten (max gap 5.86%), 12 structural violations (`enforceStack()` gave up quietly under the cap) — `strategy/dfs-tooling-vetting-2026-09-12.md:178-195` — VERIFIED
- After fix: 6/6 and 78/78 at optimum, 0 beaten, 0 violations; evidence committed (`oracle-report.json`, `oracle-report-synthetic.json`); CI test `dfs-optimizer-optimality.test.ts` — `dfs-tooling-vetting-2026-09-12.md:203-208` — VERIFIED
- FLAGGED nuance: brief says "CI-pinned proof that 'best' lineups are real optima" — source says "Matches the independent optimum" and "proven optimal" are different sentences; cash search exhausts its 400k node budget before *proving* the optimum; only `optimizeOne` is oracle-checked (N-unique portfolio path is bounded-budget and NOT oracle-verified) — `:217-228` — the brief overstates

**CV corpus (d36)**
- Internal state: `buildTracklets` is greedy IoU (minIou 0.3, maxGapFrames 5) → fragments to 52–65 tracklets from ~6 players (0.6–0.8s median life) because broadcast pan breaks IoU — `research/2026-10-01/cv-corpus/deep-dive-harshraj-linkedin.md:50` — VERIFIED
- Source: 52-line LinkedIn post (~Aug 2026) read in full; comments unreadable (HTTP 999); embedded video unwatched; all numeric params (v_max ≈ 10 m/s, COAST_FRAMES=15, RANSAC 3px, gate 1.5×) are [DERIVED] clean-room, not author-stated — `deep-dive-harshraj-linkedin.md:4` — VERIFIED (derived-status flagged in-source)
- 57-frame eval baseline: precision 1.00 / recall 0.74 — "must reproduce before any tuning"; Sloan CART baseline: 86.5% QB position / 72.3% formation over 29 classes; related-work anchors Craig 75% (130k NFL plays), Goyal 80%, Newman 85% (Madden) — `research/2026-10-01/cv-corpus/top-kernels.md:29,57` — VERIFIED as in-file claims (anchors are third-hand via thesis bibliography — see Challenges)

**Misc verified**
- Grok stack audit: n=241 "a high-quality kill test, not a discovery test" (Grok's own power math); acceptance gate "die cleanly on pure noise" (capital process certifies at no more than nominal α across many noise seeds); Bickel & Kim 2-4% posterior for a real MLB totals edge — `ops/edge/2026-08-20-grok-stack-audit.md:20` — VERIFIED
- 2025 holdout distribution: 285 games, ALL ASSOCIATION_ONLY — "Not agreement, not a cause, and not a pick" (one probability source per game) — `reasoning/2025-holdout-distribution-v2.md:9,13` — VERIFIED
- Situation-join contract: abbr↔full team normalization, ±12h commenceTime, `eventId` never invented (ambiguous → null), never copy price keys onto the situation snapshot; free-quote precedence Rundown→Sharp×3→Odds-free→Parlay→OddsPapi→Apify — `ops/situation-signal-plugins.md:11` — VERIFIED
- HF billing: 74-char paste (HF tokens are 37 chars) → 401 raw and de-duped, 200 with correct form; POST bge-m3 403 "exceeded monthly spending limit" (not a billing bug); remediation: unwire hosted calls, alert specifically on the 403 — `reasoning/hf-billing-block-2026-09-28.md:30,37,39,41,75` — VERIFIED
- PFF §1.9/§1.10: monetized creators may reference/quote/display individual grades, stats, or free-article excerpts with attribution + link, non-bulk, non-substituting — `research/2026-09-10-galaxy-commentary-brand/final-report.md:85-86` — VERIFIED; NFL Access Pass Year 1: 24 creators, 200M+ views — `:17` — VERIFIED
- Injury sweep (d35): KC LT Josh Simmons OUT (rookie Kahlil Benson starts); Mims OUT — career 15.9-yard punt-return average (NFL record); Frankie Luvu OUT = blitz-unit downgrade (Quinn: "I like him as a blitzer… we'll definitely miss Frankie") — `research/2026-09-19-dk-week2/deep/x-sweep4.md:13,17,12` — VERIFIED
- StatKing audit: 546 seeded sources, 800 candidate records, 500,000 candidate capacity, 2,200 discovery queries, 800 metric definitions; verdict: legally-usable coverage smaller than seeded universe; licensed route/pressure/coverage/tracking/grades/trenches need contracts or first-party charting — `statking-alerts.md:12` (statking-gap-audit.md is near-identical content — duplicate file, not two audits) — VERIFIED

## Cross-file connections

**1. The 52.4% CLV requirement has a provenance, and the rulers doc proves it currently can't be measured (d32 ↔ d30).**
`ops/hermes/BUILD-QUEUE-2026-09-18-rulers.md:108` grades CLV at "23.0 percent against a 52.4 percent requirement" — and `ops/archive/root-museum/LAUNCH_LEDGER.md:109` shows 52.4% is the ESTABLISHED rung (≥500 settled + verified CLV ≥52.4%). The requirement isn't arbitrary; it's the revenue-ladder rung. The rulers doc's contribution is proving the current grader *cannot honestly report either number* because mint/close book sets differ. Connection: any "beat the close" claim in engine output must route through the same-book-intersection grader, or it is citing a rung it cannot measure.

**2. Scalarizer (d34) and the xFP 12-test guard (d36) are two instantiations of one doctrine: no signal promotes without a falsifiable threshold.**
`reasoning/overnight-agent-prompt-2026-09-26.md:125` (f1 = 0 ⟺ |r| ≥ 0.08 AND |slope| > se on true holdout; no duplicate family representative) and `research/2026-09-26/RESCUE-2026-09-26-4-xfp-research.md` (pre-registered kill lines + artifact-shape pins + leak check, 12/12 guard). Both also share the holdout discipline: overnight charter forbids "never train on 2025 then score 2025" (`:95` context); the xFP holdout is strictly 2020–2025 after training seasons. Reinforce: this is the program's strongest cross-file pattern — adoption of the scalarizer as the *activation contract* plus the xFP guard as the *record template* gives a complete promote/kill pipeline.

**3. The 0.22 Brier floor is ~0.008 above the devigged baseline — the discrimination gate is the binding constraint (d30 ↔ d34).**
`reasoning/calibration-weights.md:30-31` puts Elo at Brier 0.2312 vs devigged-price baseline 0.2122 (fails). `ops/edge/2026-08-19-calibration-gate-split-map.md:13` sets the public-claim floor at Brier ≤ 0.22. INFERENCE: the floor is essentially "beat the market by a hair" — and the split-map's own bound says BS≤0.22 requires resolution RES ≳ 0.03–0.05, which "calibration work alone cannot close." So the path to public calibration claims is discrimination, not reliability. This reframes where engine effort goes: resolution-raising signals (QB-behavior, trench, scheme — this chunk's substance) are what unlock the gate.

**4. xFP's negative verdict is narrow; the wr/te usage features survive it (d36 ↔ d35).**
The FAIL is scoped: xFP/FPOE vs naive last-week FP for *next-week rank prediction* (Δrho = −0.0165, CI covers zero). It does NOT invalidate the wr-verify/te-phase1 descriptive features (target share, first-read share, TPRR, YPRR, EPA/target, separation) — those are *usage/efficiency descriptors*, not air-yards *expectation* terms. Reinforce: keep the descriptive trust features (McBride 35% share, Schultz 18.2% first-read) in the rankings module; the veto applies specifically to weighting air-yards expectation in rank features. This is the correct, narrow reading of the map's #20 contradiction resolution.

**5. The QB matrix gives the schema; vision-tracker's PARKED item names the missing column (d35 ↔ d37).**
The matrix has pressure-to-sack rate, passer rating under pressure, PFF neg-graded dropbacks — but NOT clean-vs-pressured *efficiency* splits (EPA/db clean vs pressured). `strategy/vision-tracker.md:57` explicitly PARKS QB Pressure Sensitivity on exactly that missing input. Stroud's "0.45 EPA/db when clean" (`qb-full-pool:116`) is the closest in-file datum to the needed decomposition — and it's from a secondary source (rotoballer), not the feed. Connection: the matrix as it stands measures outcomes under mixed conditions; the sensitivity decomposition needs clean/pressure splits (NGS has them; the feed doesn't). This is the intelligence program's #1 data gap, stated in-repo, and the matrix schema is ready to receive the column when sourced.

**6. Three files compose one QB–WR trust quantity (d35 ↔ d32).**
qb-full-pool's target-concentration fields (Rush 52.6% RB target share; first-read rates) + wr-verify's TPRR/first-read/YPRR/separation CSVs + `performance/radar-and-tracking-data-layer.md:156-157`'s NGS fields (`avg_separation, route_efficiency, target_rate, snap_count_pct`). The NGS fields are the receiver-side decomposition of what the matrix sees from the QB side: separation explains target concentration, route efficiency explains first-read share. Reinforce as one feature stack, with the NGS-internal doctrine keeping the NGS-derived layer internal (reasoning fuel only).

**7. DST pressure mismatch + OL-out flags + coach-stated downgrades compose the trench layer (d35 ↔ d34).**
`dst-phase1.md:34`'s FTN generated-vs-allowed table + `week3-current-wire.md:13,73`'s named OL outs + `x-sweep4.md:12`'s Quinn quote on Luvu ("blitz-unit downgrade") are three independent views of the same quantity: effective pressure. The x-sweep4 template (rookie Kahlil Benson starting at LT for KC vs JAX's #2 pressure rate) shows how they compose into a matchup adjustment. Reinforce: OL-out flags should feed the mismatch table as an adjustment (rookie-LT flag, backup-count), not live as separate unweighted notes.

**8. The corpus has a standing noise-feature kill list forming (d33 ↔ d36 ↔ d34).**
Individual sack props = NULL (pressure→sack R² < 0.005, `game-projections.md:48`); FPOE not weighted for next-week rank (xFP FAIL); officials/weather/coaching DARK (scalarizer f1 failures); CB passer-rating-allowed downgraded to tiebreak-only (1-game sample, `wr-verify.md`). Four independent vetoes, same shape: name the feature, cite the measurement, record the verdict. Reinforce: this should be a standing `FeatureKillList` registry with re-test conditions, not four scattered file notes.

**9. Calibration-first doctrine is triply corroborated in-chunk (d30 ↔ d37 ↔ d36).**
calibration-gate-split-map (floors + split design), vision-tracker ("calibration over accuracy; probabilities calibrated before EV"), SUNDAY_FRONTIER_R_AND_D_MAP ("Confidence is not win probability. GSE Signal Score is decision quality, not win probability"). All three agree: confidence is decision quality, never P(win) — and the 2026-06-01 handoff records confidence-treated-as-P(win) as an open calibration gap. No contradiction in-chunk; the doctrine is settled.

**10. Proof culture is also triply corroborated (d37 ↔ d36 ↔ d32).**
dfs-tooling-vetting (independent oracle, non-zero exit on deviation, committed `oracle-report.json` artifacts), xFP (12-test guard, pre-registered kill lines, artifact-shape pins), RESUME.md (KNOWN BLOCKED isotonic-pava — "failure is a REAL CODE DEFECT, not test drift"). Reinforce: every engine number gets an independent check with a committed artifact; defects get registered, not patched-over.

**11. StatKing's licensed-data gap points at the CV corpus as the workaround (d37 ↔ d36).**
statking-alerts: licensed route/pressure/coverage/tracking/grades/trenches data need "contracts or first-party charting." The cv-corpus (harshraj + top-kernels) IS the first-party charting path — but its baseline is precision 1.00 / recall 0.74 on 57 frames with 52–65-tracklet fragmentation. The gap between "need first-party charting" and "CV is at 0.74 recall on 57 frames" is the honest measure of distance. INFERENCE: CV charting is a multi-quarter build, not a near-term feed replacement; in the interim the FTN/charting second-party lane (dst-phase1, qb-full-pool sources) is the working trench/scheme data.

**12. 2025-holdout-distribution (d34) + as-of quarantine ruler (d32) + situation-join contract (d32) = the evidence-provenance stack.**
All 285 2025 games are ASSOCIATION_ONLY ("Not agreement, not a cause, and not a pick") because a single pregame probability is one source; the rulers doc enforces bitemporal discipline (post_settlement_backfill vs as_of_mint); the situation-join contract enforces identity discipline (never-invented eventIds). Reinforce: provenance is a first-class engine input — every number in the unified API should carry basis, grade, and identity.

## Challenges

**CH-1. The QB matrix is a Week-1 snapshot wearing a behavioral-profile costume (d35).**
The [ELITE]/[WEAK] percentile flags are computed among ~30–32 Week-1 qualifiers — a 30-sample, one-game threshold set. Reading these as *behavioral profiles* conflates single-game outcomes with traits. The file itself applies continuation-vs-outlier discipline selectively (Love: "continuation, not outlier" with a 2025 baseline cited) but most entries get no such check. INFERENCE: a one-game 80% pressure-to-sack rate (Rush) mixes opponent pressure, game script, and QB trait — the matrix can't separate them at n=1. Mitigation: flags stay "snapshot" until 2+ consecutive weeks; trait language requires a prior-season baseline. The schema is excellent; the sample isn't.

**CH-2. All DK salaries are second-party (d35).**
DK API scrape was Akamai-blocked (9/19); every salary in qb-full-pool/dst-phase1/te-phase1 is [2P] (Huddle/DK Network), and Mac Jones's Week-2 salary was never captured. INFERENCE: any salary-gated build (optimizer value, proj/salary ratios like Schultz's 3.6x) inherits second-party staleness risk. The files label this honestly; the engine should carry the [2P] provenance tag into any salary-dependent feature.

**CH-3. Edge-sheet late-and-close: volatile split + year-frame mismatch (d32).**
DET 6th percentile / BUF 68th in late-and-close is a 2025-season split used to narrate a 2026 matchup; INFERENCE: late-game efficiency is among the least sticky team metrics year-to-year, so the "DET collapse" read is presentation, not prediction evidence, until a YoY-stability gate passes. Also the file contradicts itself across passes (6th vs 6.5th; 68th vs 67.7th) — rounding drift, but it shows these are hand-computed design numbers, not a pipeline output. The doc is a design-critique log, not a research record.

**CH-4. Game-projections BUF-DET: honest, but untested and unadjusted (d33).**
The file says so itself: explicitly NOT opponent-adjusted, no weather/rest/officiating inputs, pending out-of-sample backtesting vs 2025 prop lines — per the file, UNTESTED. The "Allen 250.5 vs 201 UNDER lean" has a model band [135,265] that covers the line — the lean carries no edge and the file admits "Lean, never a call." The literature vetoes (pressure→sack R² < 0.005; fumble-recovery noise) are asserted without citations — second-hand. INFERENCE: treat as a methodology template (two-method disagreement as uncertainty; NULL rules for noise props), not as validated projections.

**CH-5. The DFS oracle brief overstates "proof" (d37).**
Source is explicit: "Matches the independent optimum" and "proven optimal" are different sentences — cash search exhausts its 400k node budget before *proving* the optimum (`dfs-tooling-vetting-2026-09-12.md:217-228`). And only `optimizeOne` is oracle-checked; the N-unique exposure generator — the actual GPP lineup path — is bounded-budget with a portfolio objective the oracle doesn't model. The honest gap: the portfolio-optimization framing was adopted as doctrine but the shipped N-unique path doesn't optimize it. The CI falsifier is real and valuable; the "proof" wording is not.

**CH-6. xFP verdict is narrower than it sounds, and the guard doesn't re-run (d36).**
The FAIL is scoped to next-week *rank* prediction vs naive last-week FP — it does not say FPOE is useless everywhere (e.g., descriptive or matchup-adjusted uses were not tested). Unit 2 is INCONCLUSIVE, unit 3 BLOCKED — the record is 1 FAIL / 1 inconclusive / 1 blocked, not a clean sweep. And the results were measured 2026-09-18 on a Windows worktree and NOT re-run — the 12/12 guard verifies prose-to-artifact fidelity, not an independent replication. INFERENCE: high trust in the record-keeping, medium trust in the generality; any wider "FPOE is dead" reading is overreach.

**CH-7. Frozen weights risk staleness (d34).**
Blend w=0.1 was fit on 2024 MAE only, then frozen; position weights are 2025-only inverse-MAE; 2026 slopes are collapsing (n=323 — small sample, INFERENCE: likely noise). The freeze doctrine has no drift-triggered refit rule. INFERENCE: under a regime shift the frozen weights become the same "history never changes" problem the program rejects elsewhere. The 2025 data "did not choose" w=0.1 — the file should say what 2025 *would* have chosen, or the freeze is unfalsifiable.

**CH-8. Scalarizer priors are doctrine, not estimates (d34).**
The 16-direction prior map (efficiency .14 … social 0, summing to 1) is judgment, not fitted — no uncertainty is attached. The DARK failures rest on one 285-game 2025 holdout (subsets n=113/349/255). INFERENCE: one-holdout f1 failure is evidence against, not a verdict — the INGEST-AND-LEARN doctrine (untested ≠ dead) argues for multi-season re-tests before officials/weather/coaching are permanently DARK. The scalarizer is an excellent gate; its priors should carry "doctrine, v1" versioning.

**CH-9. Harshraj is practitioner intel, not evidence (d36).**
Single LinkedIn post, no code/dataset released, comments blocked (HTTP 999), video unwatched. Every numeric parameter (v_max ≈ 10 m/s, COAST_FRAMES=15, RANSAC inlier 3px, gate factor 1.5×) is [DERIVED] clean-room — not author-stated. The "52–65 tracklets" figure is GSE's own prod measurement, not the post's claim. The deep-dive is honest about all of this; the risk is downstream readers citing the derived parameters as the author's. INFERENCE: treat as a build blueprint with test fixtures, not as validated method.

**CH-10. Top-kernels' anchors are third-hand (d36).**
The related-work accuracy anchors (Craig 75% on 130k NFL plays, Goyal 80%, Newman 85% on Madden, Atmosukarto 67% on real footage, Siddiquie 72%, Li 70%) come via the Chung Brown thesis bibliography — and the file notes the thesis itself has "zero numeric parameters." K13's break-angle doctrine (Garçon 1.3 fewer yards than Jackson on mirrored comebacks) rests on the single-author 2018 Sloan thesis. INFERENCE: these are leads for the formation/play-classification lane, not benchmarks to beat. The internal baseline (57-frame, 1.00/0.74, "must reproduce before tuning") is the only first-hand number in the file.

**CH-11. ryanjheath is the note-taker's inference of Heath's method (d33).**
All derived columns (shell-weighted TPRR/YPRR, pressure-mismatch index, matchup adjustment) are explicitly file-marked INFERRED; the 2026 Week-2 column was paywalled and deliberately not accessed. The "pressure mismatch index" is not Heath's stated metric — it's the note-taker's guess at what his black box computes. INFERENCE: buildable as a design pattern (shell-conditioned splits from public charting), not as a reverse-engineered feature. The engine-actionable read is "build the public-charting version," never "replicate Heath."

**CH-12. wr-verify mixes season frames (d35).**
JSN's 3.79 YPRR comes from a 2025–26 *season* CSV (`scottbarrett-yprr-elite-2025-26.csv`) while the lane is Week-2 2026 form — a season-frame mismatch the file doesn't flag. Parker Washington's 0.40 TPRR is honestly labeled SINGLE (internal table). The file downgrades CB passer-rating-allowed to tiebreak-only for 1-game samples — good — but that same 1-game-sample caution applies to the whole W1 CSV set (TPRR/YPRR/separation), not just CBs.

**CH-13. The Week-2 research corpus is perishable (d35).**
dst-phase1, te-phase1, wr-verify, x-sweep4, qb-full-pool are Week-2 2026 snapshots — their durable value is methodology (verification taxonomy, grounding discipline, no-fabrication rule), not the numbers. The 2026-09-19-dk-week2 corpus is a *template library* for the weekly machine, not training data.

## Buildable systems

Prioritized per the program's QB-behavior / coaching / OL / trust-signal / calibration / uncertainty / sizing lanes.

**BS-1. QB Behavioral Profile Store.** Inputs: weekly standardized fields (EPA/db, CPOE, ANY/A, P2S, rating under pressure, aDOT, first-read rate, scramble rate, aggressiveness, TD/INT, man/zone splits) from nflverse + FTN charting + PFF grades where licensed. Method: percentile-flag schema [ELITE] (>85th) / [WEAK] (<15th) vs rolling qualifier pool; per-QB-per-week rows. Output: `QBBehavioralProfile { qb_id, week, metrics{}, flags[], provenance[2P|1P] }`. Acceptance gate: reproduce the Week-1 matrix from raw inputs with zero hand-entered cells; flags stay "snapshot" until 2 consecutive weeks, "trait" only with a prior-season baseline (addresses CH-1).

**BS-2. QB Pressure Sensitivity module (STAGED on sourcing).** Inputs: clean-vs-pressured efficiency splits (BLOCKED — the named gap), Protection Stress index. Method: sensitivity = EPA/db clean − pressured; decompose into scramble/run, INT-by-situation, sack-conversion under pressure. Output: per-QB sensitivity grade + situational INT decomposition. Acceptance gate: flips vision-tracker's PARKED item to STAGED on sourcing; must clear the scalarizer (f1: |r| ≥ 0.08 AND |slope| > se on a true holdout, no duplicate family) before LIVE — the gate is the gate.

**BS-3. QB–WR Trust Quantity.** Inputs: target share, first-read share, TPRR (qb/wr lanes) + NGS `avg_separation, route_efficiency, target_rate, snap_count_pct` (internal-only layer). Method: weekly target-concentration (HHI / max share) + separation-adjusted trust score; unseen-pair fallback per the JOI CatBoost pattern (map #4). Output: per-game trust targets + DFS stacking priors. Acceptance gate: pre-registered kill line — next-week target-share correlation beats naive share carryforward on 2020–2025, season-week clustered bootstrap CI excludes zero (the xFP 12-test guard as the record template). Kill-line failure → the feature joins BS-7, not the model.

**BS-4. Scheme Fingerprint Table.** Inputs: charted motion/PA/RPO/screen/shotgun/no-huddle rates per team (week3-wire template). Method: weekly `SchemeFingerprint { team, week, rates{}, n_plays }`; join as priors to QB/RB/WR projection adjustments. Output: priors for the coaching-tendency program. Acceptance gate: n_plays ≥ 150 floor (159–189 observed); week-over-week stability measured (not assumed) — motion/shotgun r ≥ 0.7 across adjacent weeks on 2025 data before any weight > 0.

**BS-5. Trench Adjustment Layer.** Inputs: FTN pressure-generated vs allowed mismatch table (dst-phase1 template) + official-injury-report OL outs (rookie-LT flag, backup count) + coach-stated unit downgrades (x-sweep4 template). Method: base mismatch × availability adjustment. Output: per-game pressure-mismatch index feeding QB projections (via BS-2) and DST projections. Acceptance gate: reproduce the Week-2 mismatch table (JAX 50.0 vs DEN 56.3 etc.) from the FTN feed; OL-out flags sourced from the official injury report only (no second-party).

**BS-6. Situational-Split Features (stability-gated).** Inputs: early-down / late-down / late-and-close / ball-security percentiles from nflverse play-by-play (edge-sheet template). Method: compute weekly; store as features, never as public claims. Output: situational features for the game model. Acceptance gate: year-over-year stability r ≥ 0.5 on 2020–2025 before any weight; the DET-6th-percentile read stays descriptive until the gate passes (addresses CH-3).

**BS-7. Feature Kill-List Registry.** Inputs: vetoed features with evidence pointers — pressure→sack R²<0.005 (sack props NULL); FPOE not weighted for next-week rank (Δrho −0.0165); officials/weather/coaching DARK (scalarizer f1); CB ratings tiebreak-only. Method: standing `FeatureKillList { feature, verdict, evidence_ref(file:line), retest_condition }` consulted by the adjustment-layer intake gate. Acceptance gate: every entry cites a source file:line; every re-test condition is falsifiable; the registry is append-only.

**BS-8. Scalarizer Activation Gate (adopt verbatim).** Inputs: candidate signal + true-holdout fit (r, slope, se). Method: f1 = 0 ⟺ |r| ≥ 0.08 AND |slope| > se; f2 = 1 if family already has a LIVE representative; f3 = 1 if week row missing; g = max λᵢfᵢ over λ=(0.5,0.3,0.2); only g = 0 goes LIVE; DARK rows appended to `dark-candidates.jsonl`. Output: LIVE/DARK/STORED decision. Acceptance gate: implementation reproduces the three documented DARK decisions byte-for-byte (officials n=113 r=−0.09257 slope=−0.01007 se=0.01028; wind −0.135/0.1618 n=349; coaching r=−0.01363 n=255).

**BS-9. Same-Book CLV Grader.** Inputs: OddsLineSnapshot rows with book keys and CLOSE/OPEN tags. Method: grade beat-the-close over the bookmaker-key intersection only; refuse (never average) on empty intersection; store `clvSameBookValue/clvSameBookVerdict/clvBookBasis`; count refusals by reason; report book composition beside every grade. Acceptance gate: the 23.0%-vs-52.4% number becomes interpretable or is retired; the ESTABLISHED rung (≥500 settled + verified CLV ≥52.4%) becomes measurable for the first time.

**BS-10. As-of / Bitemporal Guard.** Inputs: any backfill writing probabilities or edges. Method: typed `trueProbBasis` (`post_settlement_backfill` | `as_of_mint`) + `assertObservedAtOrBefore` guard around time-traveling sources (whole-season EPA reads, season-number-only standings fetches). Output: bitemporal-clean backfills; the aggregation layer enforces "one source = ASSOCIATION_ONLY, never a pick" (2025-holdout-distribution rule). Acceptance gate: bitemporal audit passes on all touched rows; no `trueProb` carries post-kickoff information with a pre-kickoff valid time.

**BS-11. Conformal +inf Refusal.** Inputs: calibration quantile heads. Method: return +infinity below the sample floor, per stratum — never clamp into [0, n−1]. Output: honest intervals or explicit refusal to price. Acceptance gate: the n=5, α=0.1 case returns infinity (not 83.33% coverage); stratum-coverage tests green. (Pairs with the map's isotonic do-not-apply rule: keep calibration maps OFF while resolution ≈ 0.)

**BS-12. Calibration Floors with Split Gates.** Inputs: settled-pick probability/outcome pairs. Method: CALIBRATION gate {n≥100, ECE≤0.05, MurphyRel≤0.05} + DISCRIMINATION gate {n≥100, Brier≤0.22}, each with own 3-streak; win-rate/track-record claims stay on the combined gate. Output: per-gate GREEN/RED + public-surface routing. Acceptance gate: floors reproduce at `calibration-eligibility.ts:69-74`; the passing-reliability story is publishable while Brier fails (the split's whole point). Note the binding constraint: 0.22 vs the 0.2122 devigged baseline leaves ~0.008 headroom — INFERENCE: this gate is cleared by discrimination (BS-1..BS-6), never by calibration polish (RES ≳ 0.03–0.05 required).

**BS-13. Evidence-Grade Governor (unified output contract).** Inputs: any module output. Method: every module returns `{ value, evidenceGrade (A–F), basis, modelVersion, sampleInfo{n, window} }`; below grade C → `EVIDENCE_THIN` refusal (no committed reads); stale inputs / drift / calibration debt veto high EV (SUNDAY_FRONTIER doctrine). Output: the no-bet governor for the unified API. Acceptance gate: the governor fires on the documented fixtures (2-of-14 books reporting → refusal; stale-odds → no-bet).

**BS-14. Falsifier / CI-Proof Pattern (program-wide).** Inputs: any engine number. Method: independent oracle or guard + non-zero exit on deviation + committed evidence artifacts (dfs `oracle-report.json` template; xFP `verify-record.test.mjs` template). Output: CI-pinned optima and verdict-locked research records. Acceptance gate: no engine number ships without an independent check and a committed artifact; defects register as BLOCKED with the defect description (isotonic-pava precedent), never as test edits.

## Integration notes

For the unified intelligence API (qb-behavior + coaching + trust-signals + reasoning as one callable interface):

**Ordering dependency: OL → scheme → QB.** Trench state (BS-5: pressure mismatch, OL outs) conditions scheme fingerprints (BS-4: motion/PA rates shift with protection quality), which conditions QB behavior (BS-1/BS-2: P2S, scramble rate, aDOT under pressure). The API should resolve modules in that order and pass context downstream as typed context objects: `TrenchContext → SchemeContext → QBContext`. The BUF-DET game-projections file is the worked example: four-man rush 70.4% + two backup OL + missing safeties composed into "the single biggest game variable" — currently qualitative; the API makes it quantitative with the same ordering.

**Cross-module contracts.** Every module returns `{ value, evidenceGrade, basis: 'as_of_mint'|'post_settlement_backfill', modelVersion, sampleInfo }`. Version stamps follow the engine-versioning policy (`product/engine-versioning-policy.md` brief, d33): semver vMAJOR.MINOR.PATCH, `anti-vX.Y.Z` pairing for adversary tracks, unstamped output = integrity bug. Calibration comparison across MINOR = yellow flag; across MAJOR = separate cohorts.

**Activation contract.** BS-8 (scalarizer) is the intake gate for every new signal module — qb-behavior, coaching-tendency, and trust-signal candidates all enter through f1/f2/f3. BS-7 (kill list) is the shared veto registry all modules consult before weighting a feature. New signals enter as corrector features on frozen-engine residuals (map pattern: residual-correction architecture), never as direct engine inputs — "tilt === engine edge; missing signals add zero."

**Honesty boundaries.** Public surfaces show projections and rankings only (public/private doctrine); NGS-derived fields (`avg_separation` etc.) stay internal as reasoning fuel (NGS internal-only doctrine). The trace encoding `0.5 + 0.49·clip(signed)` is explicitly not a win probability — the API types probability vs score distinctly (confidence ≠ P(win), per the 2026-06-01 handoff and the calibration-training fixtures). BS-12's split gates route which surfaces may publish.

**Data joins.** Market↔context joins use the situation-join contract (abbr↔full normalization, ±12h commenceTime tolerance, never-invented eventIds, no price keys on the context plane; free-quote precedence Rundown→Sharp×3→Odds-free→Parlay→OddsPapi→Apify). Any backfilled probability passes BS-10's bitemporal guard. Walk-forward evaluation uses fixture-grouped folds (rulers doc), never row-index slicing.

**Calibration wiring order (from the map, corroborated in-chunk):** scalarizer activation → Bayesian bake-off → floors (Brier≤0.22/ECE≤0.05, n≥100, 3-streak, split gates) → shadow promotion pipeline → settlement feedback loop. The intelligence modules (BS-1..BS-6) feed the discrimination half; BS-9/BS-11/BS-12/BS-13 guard the output half.

**Sizing interface.** The unified API exposes per-pick `{ p, edge, evidenceGrade, calibrationState }`; the sizing stack (map: 0791→0813→0834→1748→1463) consumes it with the δ/σ gate (stake only if δ_perc > 1.5σ) — but sizing stays OFF public surfaces until the calibration gates clear (vision-tracker PARKED: "Kelly/stake guidance from public surfaces").

**Open integration questions for the parent:** (1) clean-vs-pressured splits sourcing — which feed, and does the NGS-internal doctrine cover a commercial charting vendor's pressure splits, or only NGS? (2) The 16 scalarizer priors are doctrine v1 — who owns refitting them, and on what cadence? (3) The frozen calibration weights (w=0.1, position weights) need a drift-triggered refit rule to avoid the staleness CH-7 flags — propose the trigger metric. (4) CV charting (0.74 recall, 57 frames) vs licensed-data contracts: which is the 2026 path for route/coverage/trench data — the build timeline decides whether BS-4/BS-5 run on second-party charting indefinitely.
