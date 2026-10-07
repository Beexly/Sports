# Edge Program Verification — Deep Audit of the "No" Answer

**Date:** 2026-08-26
**For:** Garrett (founder)
**Question on the table:** "Simple yes no or getting closer — do we have an edge?"
**Provenance:** Every number and quote below traces to the seven-sweep audit fleet + adversarial verification pass + completeness critic run against this branch's committed files. This container has no database; nothing here rests on a DB read.

---

## 1. THE ANSWER

**No — no edge has been demonstrated, anywhere, on any real data. But "No" is not the same as "disproven": most of the search space was never actually tested.**

The honest three-sentence version:

1. **No edge demonstrated** applies everywhere: there is not a single SURVIVOR verdict on real data in the entire record (grep of the edge ledger confirms zero), and the one flagship positive number ever recorded — the 58.5% totals beat-close [52.8, 63.9] — still rests on a measurement pipeline whose three known defects (unbounded closing-snapshot age, `take: 80` truncation, model-derived locks) are all unfixed on HEAD and was already killed as a claim by the multiple-comparisons trap (C-41, AGENT_LEDGER.md:167).
2. **Edge disproven** applies only narrowly: close-prediction on one closed corpus — 241 MLB clean-close games at ~19-minute cadence — was killed by a genuinely pre-committed stopping rule (L-17, r=0.091 < 0.10, C-44 "no appeal"), and the totals-in-probability-space Ridge was mechanically shown to be a p_entry artifact (entry-only ablation r=0.503 matches full-model r=0.490). Those two things are dead on that corpus; nothing else is.
3. **Never actually tested** covers almost everything else: 26 of 27 edge-lab binds and all ~20 models never entered the falsifier (only W1-YACoe did, once, on a corpus with no market data); the totals line-movement-in-points target was never measured; the spread "promising" result (r=0.257) was voided without market-specific evidence; exchange divergence (X4) is built but has zero data because its cron was never scheduled; the NFL forward archive has never been checked for whether closes are even being stamped (CLOSE=0 as of 2026-08-20, C-62 still OPEN); and a production-accumulating independent-probability plane (ShadowSignal) has never been read out.

So: **not "yes," not "getting closer" in any measured sense — but also not "the space is exhausted." The program killed one narrow thing soundly, killed two adjacent things unsoundly-but-moot, and left the majority of its own built inventory unexamined.**

---

## 2. THE KILLS, RE-EXAMINED

Verification vocabulary: verified claims below were adversarially tested (CONFIRMED / WEAKENED); unverified sweep findings are marked as such. Falsifier gate vocabulary: PASS / KILLED / STARVED; overall SURVIVOR / KILLED / STARVED / PARKED.

| # | Verdict on record | Decided by | Taint status | After this audit |
|---|---|---|---|---|
| 1 | **L-15: kill MLB close-prediction** (RESULTS.md:28) | Post-hoc artifact demonstration (totals) + ML r=0.091 under a pre-committed threshold rule (946bdfb0c, 17:45:53Z, pre-results) that named **no market** | Not falsifier-tainted (Hermes SQL/Ridge, never touched falsify.ts) | **HOLDS in effect, defective as procedure** (verified WEAKENED — revised form below) |
| 2 | — L-15 totals void via corr(X,Y−X) identity | Entry-only ablation (r=0.503 ≈ full 0.490) — sound; the identity itself — overreach | — | **CONFIRMED**: identity cannot distinguish estimator noise from tradable reversion; only the ablation carries the void; no split-half-by-book test was ever run |
| 3 | — L-15 spread void (r=0.257, cleared "promising") | Narrative extension only — no corr(entry,close), no sd band, no ablation for spread; verdict paragraph never mentions the spread Ridge (RESULTS.md:26-30) | — | **CONFIRMED unsound-kill**: spread is an undecided "promising" result under the registered rule |
| 4 | — L-15 ML kill fragility | r=0.091, SE≈0.069 at 216 game-clusters; 95% CI [−0.043, 0.222] contains both bars | — | **WEAKENED** (revised form below): fragile in isolation, but L-17's game-level ML retest (r=−0.047, R²=−0.072) independently failed |
| 5 | **L-16: mechanism A dies on totals** (betus max t=1.48 < 2) | Pre-committed bar (dispatch a0a64857e, 7.5 min before results f2b485d38) | Not falsifier-tainted | **HOLDS on totals**. **CONFIRMED**: dispatched bar named no market; fanatics ML (t=−2.18, n=163) clears the dispatched bar; C-40's "nobody clears the pre-registered bar" (AGENT_LEDGER.md:166) is only true market-restricted — wording amendment owed |
| 6 | **C-41: fanatics ML quarantined, prospective-only** | Multiplicity (≥33 looks, 4 ML books at t>2) + L-18 same-market non-replication (ML BPQI all t<1.44) | Not falsifier-tainted | **HOLDS** (sweep sound-verdict-confirmed): correctly not a demonstrable live missed edge |
| 7 | **L-17 / C-44: edge program STOPS** (r=0.091, n=203, p=0.19) | Pre-committed rule (286b1f3e9, 8m13s before results), fired as written | Not falsifier-tainted | **HOLDS as a binding procedural stop; not statistical proof true r<0.10.** **CONFIRMED** caveats: pre-registered jitter leg never reported; round-7 gate artifacts not in-tree; un-preregistered ≥10-snapshot rule (241→210) and unexplained 210→203 attrition; 0.091 sits ~0.13 SE from the bar |
| 8 | **YACoe 341-row: MULTIPLICITY KILLED (e=0.000)** (EDGE_LEDGER.md:207) | Terminal-M e-process | **Triple-tainted**: predates 1c630fe1 (shuffle/split PASSes void); terminal-M vs supM ambiguous (audit §5b: repro shows supM=3.122e+24 and terminal M=5.516e-24 both print "e=0.000"); and per the completeness critic, falsify.ts:10/:102 defaulted marketProb to 0.5 on a corpus whose own artifact says "No market/odds data" — a coin-flip-baseline test recorded as a market test | **HOLDS as a conservative kill of nothing meaningful; the record is unreproducible** — an executed probe of the committed converter on 341 harness-shaped rows yields SURVIVOR M=1.6e+55, so the actual construction is uncommitted and unknown (unverified sweep, high confidence, probe executed) |
| 9 | **W1 synthetic: STARVED** / **G56 synthetic: KILLED by leakage** | Real-rows absence / sound leakage gate | Shuffle/split PASS legs void but carried zero decision weight | **HOLD** |
| 10 | **Inert shuffle/split gates** | — | Shuffle structurally could only PASS (permES ≡ origES pre-fix); split could kill in principle | **No kill on record ever rested on them** — zero shuffle- or split-KILLED verdicts exist anywhere in the ledger |

**Revised (WEAKENED) claims, stated in surviving form:**

- **L-15 registration:** the pre-results registration fixed thresholds but named no market; "Primary decision market = totals" first appears in the results commit itself (5f524a98). Totals cleared the soft threshold at r=0.490 and the kill rests on grounds outside the registration (artifact demonstration + moneyline). This is an under-specified registration adjudicated post-hoc — a real procedural defect exercised against the positive result (the null-preserving direction) — and it was **mooted** by L-17, which was separately pre-registered with totals as explicit primary, artifact-immune pre-entry features, and independently fired the stop. No re-run is owed; the residual action is a standing rule that registrations must name the deciding quantity.
- **L-15 ML fragility:** correct arithmetic, but no p-value was ever quoted for the ML gate itself, the rule was a pre-registered no-appeal stopping rule (budget allocation, not inference), and the cluster-aware L-17 retest independently stopped. Cluster-aware re-inference would qualify the record, not overturn the stop.

**Claims that did not survive (appendix):** no verified claim was REFUTED outright; the refuted *framings* were: "totals was the pre-registered primary that got overridden," "the kill was rendered on moneyline as the deciding market," "a clean re-registered close-pred re-run is still owed," and "the ML gate must not be treated as decisive pending cluster inference" (L-17 already supplied the cluster-aware answer).

---

## 3. WHAT WAS NEVER TESTED

Ranked by expected information value per the evidence (not by narrative preference):

| Rank | Candidate | Why never tested | Unblocks it | Expected information value |
|---|---|---|---|---|
| 1 | **NFL forward archive liveness (C-62)** — are closes being stamped at all? | Recorded CLOSE=0 of 9,864 NFL snapshots on 2026-08-20 was logged as "pending, not a pass"; nobody re-checked in 6 days | One SQL re-run of hf7-archive/query.sql (founder/DB) | **Highest** — if CLOSE is still 0 after settled games, the entire "forward archive for a future program" premise (C-44 door b) is silently void; if >0, the next corpus exists |
| 2 | **ShadowSignal readout** — shadowProb vs marketProb with settled outcomes, accumulating on every refresh-odds cycle (schema.prisma:1322-1344; cron verified in vercel.json) | Roadmap item E1 ordered the readout 2026-08-19; never done. Contradicts the blanket "no independent modelProb exists anywhere" — the correct statement is "none on the published Pick path (C-28 stands for confidence/100)" | DB export, then the repaired falsifier (post-1c630fe1, supM-reporting) | **Very high** — the fastest real-data test of an actually independent p the program owns; zero new collection needed; rows are exactly falsify.ts's BacktestRow shape |
| 3 | **Totals-CLV measurement completion (C-15 stack)** — M-F7 close-age bound, lock provenance, C-20 price-space grading | All three defects unfixed on HEAD (clv-capture.ts:90-110 accepts any pre-kickoff batch; settle-sport.ts:429 `take: 80`; process-sport.ts:901-902 writes locks from pick.line). Dossier ranks these 0 and 1 | M-F7 slice is agent-executable today (cherry-pick of 8e2af6f1, C-30-verified); provenance capture is agent code; C-20 schema migration founder-gated | **High, fix-forward only** — cannot certify the past (C-20 forbids in-place regrade; C-41 already killed the 58.5% as a claim). Value: every un-fixed day accrues prospective data under a fabricatable close, with ~6 weeks of MLB left |
| 4 | **modelProb aggregation core** (spec: docs/edge/MODELPROB_DESIGN.md) | Zero code exists for z-normalize → n/(n+τ) shrinkage → offense-weighted aggregation (grep for the method tag: 0 hits); process-sport.ts:976 still passes `modelProb: null` | Pure code + synthetic fixtures, buildable in this container now (56/56 targeted tests already pass here in 1.4s); prereg signature (τ, min-n, modelVersion) founder-gated | **High** — single bottleneck behind the entire untested fleet: unblocks L-12 → C-21 → C-26, meaningful falsifier runs, logit-pool test. Caveat: spec is NFL player-level; the graded census is MLB-dominant, so first computable run is prospective/NFL-replay, never the 909-pick census |
| 5 | **Totals line-movement-in-points** | L-15's label was probability-space Δ at floating lines — P(over) mechanically resets toward 50% on line moves (CONFIRMED); no test ever targeted close_line − entry_line in points | Founder/DB rerun of L-15 test 5 with the points target, grouped by game | **Medium-high** — a totals edge could have been discarded without ever being measured; per-book `total` exists in the odds table |
| 6 | **Spread close-pred readout** | r=0.257 cleared "promising"; voided with zero market-specific evidence (CONFIRMED) | Founder/DB: report corr(entry,close) + entry-only ablation for spread | **Medium** — one query decides whether an open "promising" result exists |
| 7 | **The untested fleet**: 26/27 binds, ~20 models, PRE-1..7 (5 built/0 falsified; PRE-1/PRE-5 never built — and PRE-1/PRE-4's "missing PFR source" blocker is gone since C-64 merged nflverse-pfr-def.ts), top-5 unexploited props (tackles, pass attempts, QB hits, completions allowed, missed tackles — data verified, zero models fit), H1/H2 pairs, TPR & separation harnesses | Structurally untestable: falsifyBind requires modelProb rows; none exist (C-28) | Rank-4 above, plus nflverse data re-fetch (harness rows were never committed on any ref) | **Medium each, large in aggregate** — this is the bulk of "never looked" |
| 8 | **MVE (H-F5)** — frozen on hermes/hf5-mve @ 0035e3b4, math adversarially re-verified sound | One cycle died on DB auth (28P01); honestly recorded BLOCKED, nothing looked at | Founder: resolve three recorded ambiguities (terminal-checkpoint reading, KILL-vs-CERTIFY precedence, degenerate covariates — the frozen runner is team-index-only, far below the charter's feature spec), then run one cycle with Neon creds + mandatory independent audit | **Medium** — founder-ordered, prereg intact, but tests a much weaker model than F-10 specified |
| 9 | **C-41 fanatics ML prospective track** | Correctly quarantined; retrospective upgrade barred and anti-corroborated by L-18's ML non-replication | Agent can draft the prereg from mve-prereg-v2 template (frozen rule, outcome-settled e-process, founder signature); runs on the forward archive only | **Modest** — the evidence ranks this below the measurement/readout items; the same-book pattern is a hypothesis-motivator, not a signal |
| 10 | **X4 exchange divergence (Kalshi/Polymarket)** — built, exported, roadmap #3, never run | The gamma quote cron exists as a route but was **never added to vercel.json** (21 crons, no /api/cron/gamma) — zero exchange data has ever accumulated | One-line cron addition + env (founder deploy); then wait for data | **Modest now, compounding** — no data exists to test; the process defect is the actionable part |
| 11 | C-36 preseason edge; C2 cross-market wiring; R-9/R-10 activation memos; dossier P-A..P-Q dispositions (0 of 17 have ledger dispositions; P-C's ×1.12 stretch, ordered deleted 2026-08-19, is still live at generate-signal-slate.ts:70-72) | Preseason expires ~Aug 30 (effectively dead for 2026); the rest is shelf inventory | Ledger reconciliation (agent); P-C deletion shifts every downstream shadowProb (founder-aware) | **Low individually; hygiene value** |

---

## 4. THE PATH

Is the operation pointed at the right next thing? **Mostly no.** The program's stated posture ("edge program ends on this corpus; remaining research = phase-tagged archive + future prereg") is directionally right but idle: the archive's liveness is unverified, the accumulating ShadowSignal dataset is unread, and prospective CLV data is being poisoned daily by three known, fixable defects. Top 5 by information-per-effort:

**AGENT-EXECUTABLE (this container, no DB):**

1. **Land the M-F7 slice** (cherry-pick only that slice of 8e2af6f1: clv-capture close-age bound + test + take:240; do NOT take M-F6, do NOT merge 9099ace2), record closeAgeMs and the stale/no-odds distinction on grades, keep the 6h bound a recorded parameter. Re-run typecheck + both package suites in-session (C-30's green claim is cited, not re-verified). *Hours; stops the daily poisoning.*
2. **Build modelprob-aggregation.ts** per MODELPROB_DESIGN.md with monotonicity property tests and a receipt round-trip; τ/min-n as required constructor params (nothing silently defaulted pre-signature); draft the prereg doc with explicit UNSIGNED placeholders. *Unblocks the entire fleet's testability.*
3. **Falsifier honesty fixes + ledger hygiene**: make falsify.ts refuse or STARVE the multiplicity gate when marketProb is absent (or tag "vs uniform baseline"); annotate EDGE_LEDGER.md:207 with the corrected semantics; amend C-40's wording to "on the pre-registered totals market"; append the L-17 attrition/deviation note next to C-44; append the kill-scope paragraph (§5 below) correcting "closed permanently"; mark the W1/G56 shuffle-split PASS legs evidentially void.
4. **Lock-provenance capture** at pick creation (process-sport.ts): write-once book/consensus quote + source tag + timestamp, with tests.
5. **Implement the C-23 continuous price-space e-process** per the round-3 spec as a dark unwired module with Ville-suite property tests (anytime-ledger.ts is already the one-sided special case).

**FOUNDER-GATED (exact hands-on step named):**

1. **Run the C-62 liveness query**: in a DB-connected session, re-run docs/ops/hermes/hf7-archive/query.sql and read the CLOSE counts. This one query decides whether door (b) exists.
2. **ShadowSignal readout**: export settled ShadowSignal rows per modelVersion, run the repaired falsifier over them with supM reporting.
3. **MVE**: on branch hermes/hf5-mve, put working Neon `DATABASE_URL`/`DIRECT_URL` in .env, record your choice on the three ambiguities (checkpoint-at-terminal-n yes/no; KILL-over-CERTIFY precedence; run frozen team-only model vs authorize a pre-run covariate amendment), then `node --env-file=.env --import tsx scripts/edge-lab/run-mve.ts` — one cycle, no retuning, then the mandatory independent audit (DeepSeek/Laguna, never Grok).
4. **Decide §5b**: terminal-M vs supM as the multiplicity decision statistic, and whether recorded verdicts get re-run under the repaired funnel. Until decided, re-runs only disambiguate records, never overturn kills.
5. **Sign or reject the modelProb prereg** (freeze τ, min-n, modelVersion) and approve the C-20 schema migration; also run the one closeAge-distribution SELECT before blessing the 6h constant.

---

## 5. WHAT THE KILLS DO AND DO NOT BIND

Stated once, plainly. Every recorded kill (L-15, L-16, L-17/C-44) binds exactly one population: **241 MLB clean-close totals-primary games from a single hermes_ro extract queried 2026-08-19T17:54:49Z, at ~19-minute snapshot cadence, across 11 books, in four fixed pre-game entry windows** (L-17's model: n=203 games after un-preregistered attrition). L-16's own verdict says "on this corpus."

They do **not** bind: NFL or any other sport; sub-19-minute or live in-game cadence; player props; exchange (Kalshi/Polymarket) divergence; cross-book totals correlation (explicitly flagged untested, EDGE_LEDGER.md:113); moneyline or spread as primary markets (C-41 is quarantined-prospective, not killed-as-primary; spread close-pred was voided without evidence); or any future MLB corpus at different cadence. EDGE_LEDGER.md:75's "minute-cadence MLB totals closed permanently" is an over-generalization on record and should read "on this corpus/cadence."

---

## 6. AUDIT LIMITS

**What this audit could not check (no DB — DATABASE_URL unset throughout):**

- No Hermes number (L-15/16/17/18) could be re-derived: the results commits (5f524a98, f2b485d38, e2986412a) contain only RESULTS.md + ledger lines — no SQL, no model code, no per-row outputs anywhere in-tree; the data lives on Neon branch hermes-census-l15-20260819, outside the repo.
- Absent data files: `data/nflverse/ngs_receiving_2021_2025_harness_rows.json` and the source CSV were never committed on any ref (git log --all: 0 commits each); the committed results JSON holds aggregates only; the TPR 2024 proxy-rows artifact is not in-tree.
- The 2026-08-24 YACoe 341-row construction is uncommitted and unknown — the committed converter demonstrably cannot reproduce the recorded kill.
- Not checkable without DB: share of the census with close age > 6h; historical lock verification against odds_batch; ShadowSignal row counts; NFL CLOSE-stamp status; every "founder/DB-gated" next action above.

**Verification cap:** of 25+ sweep findings, exactly **8 were adversarially verified** (6 CONFIRMED, 2 WEAKENED, 0 REFUTED). All 17 remaining claims — including the whole untested-inventory census, the falsifier-verdict census, the modelProb phase map, and every completeness-critic finding — carry sweep-confidence only and were not independently re-attacked. The completeness critic's ShadowSignal and marketProb=0.5 findings are the two highest-consequence unverified items.

**Commands the fleet actually executed** (everything else is file-read evidence): targeted vitest in packages/prediction-engine (5 files, 56/56 passed, 1.40s, no DB); the falsifier probe on 341 synthetic harness-shaped rows (SURVIVOR, M=1.6122e+55); git show/log/merge-base and grep operations cited inline throughout the inputs.

**NOT RUN:** all DB queries; the split-half-by-book noise-vs-reversion test; cluster-aware L-15 re-inference; the hf7 liveness query; the closeAge-distribution SELECT; nflverse network re-fetches; the MVE cycle; full-workspace test/typecheck/lint (one sweep explicitly recorded no test commands executed in its session — the M-F7 landing session must re-run `npm run typecheck` and both package suites itself).

**Standing constraints honored and re-affirmed:** C-32 remains binding — no publishing win rates, no "every pick sealed" copy, no re-selecting free picks by confidence. C-20 remains binding — the historical census is never re-graded in place for certification; any corrected history is a labeled audit stream only. Certification remains a 2027 event (C-33).
