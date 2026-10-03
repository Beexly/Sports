# THE EDGE ROADMAP — from RES ≈ 0 to a certified, published edge

Machine-consumable synthesis of Reports 1–4 (pipeline archaeology, dormant assets, literature, competitive field). Date 2026-08-19. Working tree /home/user/Sports. All file:line cites verified this session (directly by this agent or by the four same-session source reports; load-bearing ones re-verified directly — see §7 Provenance). READ-ONLY constraints honored: nothing edited, committed, flipped, or fetched from .env*; DB not reachable from agent sessions, so all row-count claims are schema/flag-derived.

---

## 0. Verdict and program logic

**Diagnosis (settled):** the graded number (`Pick.confidence`) is a market-structure echo with no outcome model in it — spread confidence is a sum of consensus/depth/vig/volatility/context components (packages/prediction-engine/src/scoring.ts:486-494), ML likewise (scoring.ts:844-851) with the independent-edge assessment deliberately excluded from confidence (scoring.ts:833-835). SPREAD/TOTAL picks are "bet the market's own favorite at the market's own line" with `rankingSource: "confidence"` hardcoded — "no independent ATS model yet" (scoring.ts:551-552; totals analog per Report 1 at scoring.ts:732-733). Flat suppression sweep and BSS +0.93% are therefore the expected output, not a mystery. The one channel that could carry information (ML `independentEdge.trueProb`) is attenuated ×0.484 and re-anchored 45% to the market's own price before the only metric that sees it (apps/web/lib/calibration/live-calibration-p.ts:35-37,72-74), and its historical record is contaminated by a look-ahead retro-backfill (packages/ingestion-pipeline/src/backfill-independent-trueprob.ts:169-178) plus a team-win-prob-as-ATS-prob category error (backfill-independent-trueprob.ts:198,249-255).

**Program thesis (from the literature):** the only cheap, persistent Resolution source is **disagreement between market prices** — cross-book outliers (Kaunitz et al. 2017, https://arxiv.org/abs/1710.02824; Angelini & De Angelis, IJF 2019, https://www.sciencedirect.com/science/article/abs/pii/S0169207018301134), sharp-anchor divergence (Buchdahl, https://www.football-data.co.uk/The_Wisdom_of_the_Crowd_updated.pdf; Štrumbelj, IJF 2014, https://www.sciencedirect.com/science/article/abs/pii/S0169207014000533), prediction-market divergence, and under-attended venues (NFL preseason — limits ~$2k, ~80% professional handle, https://www.espn.com/espn/print?id=24263228). Team-strength modeling tuned for accuracy collapses onto the book's own model and yields zero residual resolution (Hubáček et al., IJF 2019, http://ida.felk.cvut.cz/zelezny/pubs/ijf.2019.pdf). GSE's whole current confidence stack is on the wrong side of that line; its dormant divergence assets are on the right side.

**Proof standard:** CLV beat-rate ≥ 52.4% (the -110 break-even, 110/210 = 52.38%, https://www.boydsbets.com/percentage-bets-break-even/) — already the business's own ESTABLISHED trigger (`minBeatCloseRate: 0.524`, apps/web/lib/pricing/pricing-phases.ts:110) — tested with the in-repo anytime-valid e-process toolkit (packages/prediction-engine/src/forecast-skill-eprocess.ts; also on origin/hermes/sprint-backup-20260819, verified via git ls-tree).

---

## 1. Program rules — the preregistration protocol (applies to every experiment)

Declared once here; every experiment below inherits it. Each experiment files a declaration BEFORE its first graded pick; the declaration is hash-committed (SHA-256 now; Pedersen commitments available — packages/prediction-engine/src/pedersen-ledger.ts exists) and published to the prereg registry (§5 Rung 0).

**1.1 Unit and outcome.** Unit = one flagged pick. Outcome X_t = 1{clvVerdict = "BEAT_CLOSE"} using the existing CLV grading fields (packages/db/prisma/schema.prisma:544-552: clvLockLine/clvLockPrice/clvCloseLine/clvClosePrice/clvKind/clvValue "positive = beat the close"/clvVerdict). MATCHED_CLOSE is excluded from the Bernoulli stream and reported as a diagnostic rate (high match rate = 15-min snapshot granularity artifact). Benchmark close = same-book close where the flag names a book, else the consensus close derived from the Odds history (packages/ingestion-pipeline/src/settle-sport.ts:316-331 per Report 1). Once the Pinnacle EU leg accrues (E2), Pinnacle close is added as co-benchmark — "the program's PRIMARY CLV benchmark and is otherwise never captured" (packages/ingestion-pipeline/src/pinnacle-line-archive.ts:5-9) — dual-reported; a benchmark is never switched retroactively inside a running experiment.

**1.2 Two e-process tracks per experiment, one kill counter.** All three reuse the H-C likelihood-ratio machinery: E_t = p_t/m_t on success, (1−p_t)/(1−m_t) on failure; product is a supermartingale under H0; Ville's inequality makes sup_t M_t an anytime-valid statistic; the running max is the test (forecast-skill-eprocess.ts:25-64).
- **Certification track (business claim):** H0: P(beat) ≤ 0.524 (m_t ≡ 0.524). Alternative = preregistered mixture over θ ∈ {0.56, 0.60, 0.65} (equal-weight average of the three e-processes; a convex combination of e-processes is an e-process). PROMOTE when running-max E ≥ 20 (α = 0.05 anytime-valid).
- **Detection track (research signal):** identical with m_t ≡ 0.50. Faster-growing; used for continue/kill decisions, never for public certification.
- **Kill counter:** H0′: P(beat) ≥ 0.524, alternative θ = 0.48 (boundary-null supermartingale by monotone likelihood ratio). KILL-A when E⁻ ≥ 10 at any time. KILL-B (budget kill): at N_max flagged picks, running-max detection E < 3 → shelve. Every experiment also gets a calendar checkpoint (review at 6 weeks regardless of N).

**1.3 Power table** (expected n to reach E ≥ 20 with well-specified point alternative; n = ln 20 / KL(Bern(θ)‖Bern(θ₀)); mixture alternatives modestly slower):

| true beat-rate θ | vs 50% null (detection) | vs 52.4% null (certification) |
|---|---|---|
| 55% | ~600 | ~2,200 |
| 58% | ~230 | ~475 |
| 60% | ~150 | ~260 |
| 65% | ~65 | ~90 |
| 70% | ~35 | ~50 |

Implication: only signals with plausible flagged-subset beat-rates ≥ 58–60% can certify within a season at this platform's volume (lifetime settled census = 1,161). That is why divergence signals (documented flagged-subset effects of 2–5% EV) outrank diffuse model-improvement work.

**1.4 Retrospective pilots vs prospective proof.** Any evaluation on already-settled rows is labeled PILOT — effect-size estimation only, never published as evidence and never fed to the e-process (rows were not independent of selection; the census's own optional-stopping history is unknown — the H-E CSV is unpushed, docs/ops/AGENT_LEDGER.md:88 per Reports 1–2). The e-process clock starts at the declaration timestamp; only picks flagged after it count.

**1.5 Multiplicity.** Per-family certification stays E ≥ 20. The platform-level claim ("GSE has a certified edge") uses the product/average across preregistered families or e-BH; running k families concurrently is disclosed in the registry.

**1.6 Compliance.** Every data source named below is already registry-approved API/open data (The Odds API, TheRundown, ESPN, Kalshi public GET, MLB StatsAPI, nflverse CC-BY); no new scraping clearance is required, and any new source goes through the Scraping Clearance Engine per CLAUDE.md. No LLM API calls appear anywhere in this program. Polymarket remains behind its compliance hold (`INDEPENDENT_POLYMARKET=1`, default OFF — packages/data-ingestion/src/polymarket-independent-client.ts:1-27 per Report 2) and is a founder decision, not a dependency.

---

## 2. Enablers — mandatory, this week (not ranked; everything depends on them)

**E1. Clean-room baseline + shadow-rail readout (0.5–1 agent-day; founder must run the export against prod, since agent sessions cannot reach the DB).**
Re-measure separation/RES/CLV on **prospective, publish-time ML `independentEdge.trueProb` only**: exclude `rationale LIKE 'Retrospective%'` rows (backfill-independent-trueprob.ts:249-255), exclude SPREAD/TOTAL (no cover/total model exists — scoring.ts:551-552; backfill skips TOTAL and mislabels SPREAD, backfill-independent-trueprob.ts:146-153,198,250-253), evaluate raw trueProb — NOT the 0.484-attenuated, 45%-market-anchored eligibility blend (live-calibration-p.ts:35-37,72-74). Vehicle: scripts/export-settled-picks-for-calibration.mjs:40-99 (already extracts rankingP/rankingSource/marketFairProb/independentTrueProb + all CLV columns). Also read out the already-accumulating ShadowSignal ledger — a leakage-safe, home-referenced independent-vs-market dataset with the forecast-skill e-process attached, persisted on every refresh cycle (apps/web/lib/ops/shadow-evaluation-pass.ts:1-32; ShadowSignal model schema.prisma:1322-1344 per Report 2). Output: the PILOT effect sizes that set X5's go/no-go and calibrate priors for X1–X4. Secondary diagnostic: re-run the suppression sweep with the H-G random/oracle baselines (packages/prediction-engine/src/suppression-curve.ts, present on origin/hermes/sprint-backup-20260819).

**E2. Turn on the line archive + wire close-tagging + start the Pinnacle leg (1–1.5 agent-days code + founder console steps).**
Capture is already wired into refresh (`captureLineSnapshotsIfEnabled`, packages/ingestion-pipeline/src/process-sport.ts:469-474 per Report 2) but hard-gated OFF (line-archive.ts:143-146); `markClosingSnapshots` exists but "is NOT wired into any caller yet" (line-archive.ts:174-179; schema comment schema.prisma:450-452). Founder activation order per reports/agent-handoffs/ACTIVE_AGENT_RELAY.md:59-61 (migration → LINE_ARCHIVE_ENABLED=true → LINE_ARCHIVE_EU_PINNACLE=true). Pinnacle leg costs exactly one extra Odds API credit per sport per refresh (pinnacle-line-archive.ts:18-19); the free tier is 500/month with no historical odds (https://the-odds-api.com/), so preregister a cadence budget (e.g., Pinnacle capture at T-24h/T-6h/T-60m/T-5m per game-day per sport, ≈120 credits/month/sport) instead of every 15-min cycle. This enabler is the substrate for X2/X3, honest CLV coverage ("every pick gets a CLV record at close", apps/web/lib/performance/clv-coverage.ts:1-19), and the ladder's Rung 1.

**E3. Quarantine the retro-backfill (0.5–1 agent-day).**
Analysis-side immediately (E1's filters); pipeline-side: either stop the 4-hourly backfill cron from enriching (per Report 2, vercel.json cron `10 */4 * * *`) or make it as-of-correct — MLB standings are fetched CURRENT at backfill time (build-independent-fair-values.ts:270-279 per Report 1), ESPN FPI uses the current-season map (:207-208), NFL EPA queries the season with no date cut (:337-345). Also guard `resolveLiveCalibrationP` so a SPREAD row's team-win trueProb can't enter the honest-p sample (live-calibration-p.ts:67-85 has no pickType guard on the independent branch).

**E4. Preregistration registry + pick commitment (0.5–1 agent-day).**
Public registry page of experiment declarations (hash-committed at declaration time), plus per-pick hash pre-commitment before game start (pedersen-ledger.ts primitive exists). Cross-post picks to Pikkit/BetStamp for free third-party timestamps — the RAS playbook (https://www.raspicks.com/about; https://xclsvmedia.com/pikkit-vs-slipsync-vs-betstamp-bet-tracker-2026/). This is Rung 0 of §5 and what makes every later claim non-gameable.

---

## 3. The ranked experiment program

Score = (expected CLV impact × confidence) / cost. Impact = expected beat-rate points above 52.4% on the flagged subset; confidence ∈ [0,1] from evidence quality × transferability to GSE's 7-recreational-US-book, free-tier data surface; cost in agent-days (wiring only — evidence accrues on calendar time).

| Rank | ID | Experiment | Impact | Conf | Cost | Score | Phase |
|---|---|---|---|---|---|---|---|
| 1 | X1 | Cross-book consensus-outlier ranking (Kaunitz replication); first venue = NFL preseason NOW | 3.0 | 0.60 | 1.5 | 1.20 | QUICK |
| 2 | X3 | Sharp-anchor divergence vs devigged Pinnacle (Buchdahl replication) | 3.0 | 0.65 | 2.5 | 0.78 | MEDIUM (data accrual gated by E2) |
| 3 | X4 | Kalshi divergence persisted at lock (+Polymarket if founder lifts hold) | 2.0 | 0.50 | 3.0 | 0.33 | MEDIUM |
| 4 | X2 | Line-movement/velocity: predict the close from stored Odds history | 1.5 | 0.50 | 2.5 | 0.30 | QUICK |
| 5 | X8 | Under-attended derivatives: NFL season win totals (manual-research lane, volume-capped) | 2.5 | 0.45 | 4.0 | 0.28 | DEEP |
| 6 | X5 | Promote prospective independent trueProb to the published p (via shadow rail) | 1.5 | 0.40 | 3.5 | 0.17 | MEDIUM, conditional on E1 |
| 7 | X6 | NFL injury/depth-chart/participation latency (regular season) | 2.0 | 0.40 | 6.0 | 0.13 | DEEP |
| 8 | X7 | Decorrelated totals/ATS second-opinion models (Poisson λ / EPA-margin) | 1.0 | 0.35 | 5.0 | 0.07 | DEEP |

### QUICK (this week)

**X1 — Cross-book consensus-outlier ranking. THE #1 EXPERIMENT.**
- Signal: per (game, market, side), Shin-devig each book (shin_devig_v1 exists — packages/prediction-engine/src/market-read.ts:1-29; note scoring's own devig is proportional, scoring.ts per Report 2, so use market-read, not scoring's), form the consensus fair mean, flag when a named book's devigged prob for a side is ≥ τ below consensus (its price is too long). Per-book inputs already reach scoring in full (process-sport.ts:611-622 per Report 2) and the append-only per-book Odds history already exists (process-sport.ts:444; index schema.prisma at [gameId, fetchedAt] per Report 2).
- Prereg: τ = 0.03 devigged-prob (ML) / dispersion-scaled equivalent for spread-total prices; population = all sports currently refreshed + `americanfootball_nfl_preseason` enabled as a venue (preseason books disagree by a full point and move 5 points on playing-time news — https://sports.yahoo.com/nfl/betting/article/preseason-nfl-betting-isnt-for-degenerates-why-there-is-value-and-how-to-find-it-154353633.html; pro handle ~80%, https://www.espn.com/espn/print?id=24263228); benchmark = flagged book's own close (mechanical CLV target); alternative mixture {0.56, 0.60, 0.65}; N_max = 400 flagged.
- Kill: KILL-A/KILL-B per §1.2.
- Cost: 1.5 agent-days (log-only signal table + grading job; no product change).
- Evidence: +3.5% ROI over 10 years of closing odds, +6.2–8.5% real money before account limiting (https://arxiv.org/abs/1710.02824; https://www.technologyreview.com/2017/10/19/67760/the-secret-betting-strategy-that-beats-online-bookmakers/; replication repo https://github.com/Lisandro79/BeatTheBookie); best-odds-vs-consensus inefficiency in 4/11 leagues (https://www.sciencedirect.com/science/article/abs/pii/S0169207018301134). Account-limiting risk is irrelevant — GSE sells picks, it does not bet.
- Confidence haircut to 0.60: 2017 publication decay + 7 recreational US books without a sharp anchor ("who is the outlier" is weakly identified until E2's Pinnacle leg — Report 2 item 7). Calendar-urgent: preseason ends ~Aug 28; wire this first.

**X2 — Line-movement/velocity, predict the close.**
- Signal: from the existing Odds time series (created every 15-min refresh cycle, never overwritten), features = signed open→now move per book, last-3h velocity, cross-book lead-lag; score = predicted CLV of taking the current price; flag top decile. This is the only experiment whose training target IS the closing line, so it optimizes the proof metric directly.
- Prereg: population = all refreshed sports; flag = top-decile predicted CLV; alternative mixture; N_max = 500 flagged. Kill per §1.2 plus ablation kill: if predicted-vs-realized CLV rank-correlation < 0.05 at N_max, shelve regardless of e-value.
- Cost: 2.5 agent-days. Caveats: 15-min granularity; thin per-game history from the pre-cadence-change era (config.ts:110-118 per Report 2); Hawkes steam detector stays inert until a fitted alpha prior exists (packages/prediction-engine/src/hawkes-steam.ts consumed only by the shadow orchestrator with default alpha=0 — Report 2 item 1) — do not build on it yet.
- Evidence: betting-market momentum exists but sub-transaction-cost for bettors (Moskowitz, J. Finance 2021, https://onlinelibrary.wiley.com/doi/abs/10.1111/jofi.13082) — usable as ranking resolution because a picks platform pays no vig.

### MEDIUM (2–4 weeks)

**X3 — Sharp-anchor divergence (Pinnacle).**
- Signal: retail book price vs Shin-devigged Pinnacle fair; flag divergence ≥ 0.02 prob; pick the retail side priced too long. Requires E2's Pinnacle EU leg accruing (double-gated today — pinnacle-line-archive.ts:11-16,43-45).
- Prereg: benchmark = retail book's close (Buchdahl's definition makes the signal ≈ predicted CLV by construction); alternative mixture; N_max = 400 flagged.
- Kill: per §1.2; additional data-kill if Pinnacle credit budget cannot sustain ≥ 2 pre-close snapshots/game (then re-scope to close-only capture and CLV-vs-Pinnacle grading of X1's flags).
- Cost: 2.5 agent-days on top of E2.
- Evidence: the best-documented persistent method in the field — live published record since Aug 2015 (https://www.football-data.co.uk/The_Wisdom_of_the_Crowd_updated.pdf; https://www.football-data.co.uk/blog/wisdom_of_crowd_bets_closing_odds.php equivalent analysis), Shin/power devig demonstrably the right fair-price extractor (https://www.sciencedirect.com/science/article/abs/pii/S0169207014000533). Highest confidence of any signal (0.65); ranked #2 only because its data accrual starts after E2.

**X4 — Prediction-market divergence at lock (Kalshi primary).**
- Signal: kalshiFair − bookFairShin at pick time; flag |div| ≥ 0.03 with a liquidity floor; direction toward Kalshi. Both numbers are already computed in-memory at scoring time (scoring.ts:836-842); the missing step is named by the client itself — "Persisting that snapshot at lock + near start, and grading picks against it, is a separate, deliberate step (a schema field + computeMoneylineClv at settlement)" (packages/data-ingestion/src/kalshi-client.ts:22-24). Kalshi is public GET-only, no key, near-zero overround (kalshi-client.ts:1-13).
- Prereg: two co-primary tests — (a) CLV beat-rate of flagged picks per §1.2, N_max = 300; (b) the resolution-direction e-process: fraction of divergences whose book close moves toward Kalshi, null 0.5.
- Kill: per §1.2.
- Cost: 3 agent-days (lock-snapshot schema field + persistence + grading). ML markets only (IndependentMarketFairValue is home/away-shaped — Report 2 item 4).
- Evidence: prediction markets are accurate-but-not-oracular aggregators (Wolfers & Zitzewitz, JEP 2004, https://www.aeaweb.org/articles?id=10.1257%2F0895330041371321) with friction that lets divergences persist (Kalshi taker fee peak ~1.75% at p=0.5, https://help.kalshi.com/en/articles/13823805-fees); noise-trading audits (https://www.dlnews.com/articles/markets/polymarket-kalshi-prediction-markets-not-so-reliable-says-study/) justify the liquidity floor and the divergence-flag (not oracle) framing. Value bonus: orthogonal to X1/X3 book-noise, and it directly powers the ladder's prediction-market cross-check column (§5).

**X5 — Promote prospective independent trueProb to the published probability (conditional).**
- Gate: run only if E1's PILOT shows positive prospective-only separation on ML trueProb. The promotion rail already runs: every refresh cycle persists ShadowSignal (shadowProb, marketProb, outcome) with the forecast-skill e-process attached and never touches picks (shadow-evaluation-pass.ts:1-32).
- Prereg: forecast-skill e-process p_t = publish-time trueProb vs m_t = devigged book fair (the toolkit's native test, forecast-skill-eprocess.ts:25-47); N_max = 500 prospective ML picks; secondary preregistered ablation = α/anchor sweep of the 0.88 shrink and 0.55/0.45 market re-anchor on clean prospective data only (live-calibration-p.ts:35-37 — the current setting forfeits ~77% of independent variance: deviation multiplier 0.55×0.88 = 0.484, variance ×0.234).
- Kill: per §1.2 on the skill e-process.
- Cost: 3.5 agent-days: persist rankingP/trueProb as real columns (today they survive only inside factorBreakdown JSON — upsert payload has no rankingScore, process-sport.ts:634-649 per Report 2; export script must dig them out, export-settled-picks-for-calibration.mjs:81-98), calibrate the promoted p instead of confidence, publish it for ML picks. Founder-gated MODEL_VERSION step (currently v5.2.6, packages/prediction-engine/src/constants.ts:23).
- Confidence 0.40 pending E1 because the estimators' documented positive separation is partly fabricated by look-ahead (§0; Report 1 §3.1).

### DEEP (season-long)

**X6 — NFL informational latency: injuries, depth charts, participation (regular season, Sept+).**
- Signal: canonical non-market info (nflverse injuries/depth charts/snap counts/participation — adapter complete, "not yet wired into the live pipeline", packages/data-ingestion/src/nflverse-source.ts:1-21,62-80 per Report 2; CC-BY-4.0, $0) arriving before the line moves; flag = material report + line unmoved after L minutes. PickSignalSnapshot already reserves hadInjurySignal/hadPlayerSignal slots (schema.prisma:798-805 per Report 2).
- Prereg: N_max = one season of flags; alternative mixture; kill per §1.2 plus latency-kill if median line-response time < ingestion latency (edge structurally inaccessible at free-tier polling cadence).
- Cost: 6 agent-days. Confidence 0.40: regular-season NFL absorbs injury news fast; the preseason version of this signal (where the literature is strongest) is captured by X1's venue this year and rebuilt properly for preseason 2027.

**X7 — Decorrelated totals/ATS second-opinion models.**
- Purpose: 2/3 of the pick surface has literally no independent input (scoring.ts:551-552 and totals analog), so it can never contribute resolution. Build a Poisson-λ totals fair value from already-ingested TeamGameLog/TeamGameEfficiency (team-rates machinery exists, founder-gated — packages/data-ingestion/src/team-rates-source.ts:1-16 per Report 2) and an EPA-margin ATS probability. Used ONLY as divergence-vs-market flags (the Hubáček decorrelation lesson, http://ida.felk.cvut.cz/zelezny/pubs/ijf.2019.pdf), never accuracy-tuned standalone (known-not-to-work: Wilkens 2026, https://journals.sagepub.com/doi/10.1177/22150218261416681).
- Prereg: flag |modelFair − marketFair| ≥ 0.04; N_max = 300; kill per §1.2.
- Cost: 5 agent-days. Confidence 0.35: closing totals/spreads are near-efficient; the honest goal is unlocking measurement + modest divergence resolution, not beating the close by team modeling.

**X8 — Under-attended derivatives: NFL/MLB season win totals (manual-research lane).**
- Evidence: season-wins markets "highly inefficient" via representativeness (Woodland & Woodland; MLB confirmation https://link.springer.com/article/10.1007/s12197-015-9322-x); low-volume, annually repriced, hard for books to sharpen.
- Prereg: regression-to-mean rule declared before lines are read; N ≈ 30–90 picks/season → this is a proof venue, not a scale venue; certification realistically multi-season; kill after two seasons below 52.4% point estimate.
- Cost: 4 agent-days (futures markets cost extra Odds API credits — budget check first). Keep inside `manual_research_only`-compatible workflow; no new scraping.

---

## 4. STOP list — cannot produce Resolution; actively poisons measurement

1. **STOP all work that treats `Pick.confidence` (or any calibrated transform of it) as a model.** It is a monotone echo of the market's own structure (scoring.ts:486-494,844-851) with documented separation ≈ −0.005 (docs/calibration-proposals/2026-08-09-ranking-polarity-independents-v5.2.1.md:34 per Report 1); calibrating it fixes Reliability and cannot create Resolution (calibration-apply.ts:54-58 per Report 2). No more calibrator fits, threshold tuning, or tier/publish-gate "improvements" on this column. Keep it, at most, as a UX display number explicitly not sold as a probability.
2. **STOP using the retrospective backfill as evidence, and quarantine its rows everywhere.** It rebuilds independents at backfill time with current-season standings/FPI/EPA (backfill-independent-trueprob.ts:169-178; build-independent-fair-values.ts:270-279,:207-208,:337-345 per Report 1) — look-ahead — and writes team-WIN probabilities onto SPREAD picks (backfill-independent-trueprob.ts:198,250-253) that then leak into the honest-p eligibility sample (live-calibration-p.ts:67-85, no pickType guard). Every apparent-separation claim built on these rows is untrustworthy. Filter: `rationale LIKE 'Retrospective%'`.
3. **STOP selecting suppression policy in-sample.** `selectivePublishSweep` argmaxes Murphy resolution on the same settled rows it is validated on (apps/web/lib/calibration/selective-publish.ts:162-279, Brier cap :220-222, argmax :235-273), and pause groups are chosen from the same history (docs/ops/CURRENT_STATE.md:13,30 per Report 1). All future suppression claims must be preregistered rules evaluated out-of-sample against the H-G random/oracle baselines (suppression-curve.ts, origin/hermes/sprint-backup-20260819).

Do-not-revive list (already dead per literature; keep as features, never as edge claims): public Elo/FPI vs the spread (~51% ATS, https://fivethirtyeight.com/features/introducing-nfl-elo-ratings; nfelo +0.14% vs close, https://www.nfeloapp.com/games/nfl-model-performance/); accuracy-tuned box-score models (https://journals.sagepub.com/doi/10.1177/22150218261416681); static published biases — unders on high totals, big NCAA dogs (decayed post-publication, http://www.aabri.com/manuscripts/193138.pdf); post-news in-play chasing (https://academic.oup.com/ej/article/124/575/62/5076978).

---

## 5. The proof-of-#1 ladder — every claim machine-checkable at every rung

Nobody in the field publishes calibration curves, Brier decompositions, anytime-valid statistics, per-pick CLV ledgers, or negative results (Report 4 §3; the honesty ceiling is RAS's aggregate CLV beat-rate + third-party timestamps, https://www.raspicks.com/about). Each rung below ships a machine-checkable artifact tied to the pricing ladder (FOUNDING → PROVEN → ESTABLISHED → AUTHORITY, apps/web/lib/pricing/pricing-phases.ts:105-116).

**Rung 0 — FOUNDING, ship this week (with E4):**
(a) Live reliability curve + full Brier decomposition page, including the bad number — "REL solved (holdout ECE 0.0044), RES ≈ 0 (BSS +0.93%), here is the plan" — published as nightly JSON {n, ece, brier, rel, res, unc, model_version} + rendered page. Publishing the weak number is the moat: no competitor can copy "we publish our own bad news" without publishing theirs (Report 4 §4).
(b) Per-pick hash pre-commitment before game start (pedersen-ledger.ts), commitments cross-posted to Pikkit/BetStamp for free third-party timestamps.
(c) Public preregistration registry: every §3 experiment's declaration + SHA-256, timestamped before its first flagged pick.
Verifier: anyone can recompute the curve from the settled-pick export and check each pick's hash against its pre-game commitment.

**Rung 1 — PROVEN (≥100 settled + published calibration, per CLAUDE.md ladder):**
Public per-pick CLV ledger — lock line/price, close line/price, book, clvKind, clvValue, clvVerdict, timestamps (columns already exist, schema.prisma:544-552) — as an open, hash-chained CSV/JSON with a coverage number attached, because "beat-close rate is only honest if computed over (nearly) ALL settled picks" (clv-coverage.ts:1-19). Pinnacle close appears as co-benchmark once E2 accrues (pinnacle-line-archive.ts:5-9). This is already the Elite-tier promise (pricing-phases.ts:116; feature-gates.ts:192-194 per Report 4). Verifier: recompute clvValue from published lock/close pairs; recompute coverage.

**Rung 2 — ESTABLISHED (≥500 settled + verified CLV ≥ 52.4%, pricing-phases.ts:108-110):**
The e-process edge certificate: for each preregistered signal family, the live running-max E_t of the certification track (§1.2), published as an endpoint with the plain-English gloss "evidence you could not have manufactured by choosing when to stop counting" (method: Ramdas–Grünwald–Vovk–Shafer, https://arxiv.org/abs/2210.01948; repo implementation forecast-skill-eprocess.ts:25-64). ESTABLISHED price step-up triggers only when a family's certification E ≥ 20 with the ledger public. Verifier: E_t is exactly recomputable from the Rung-1 ledger plus the registry's declared (m_t, alternative) — no trust required.

**Rung 3 — AUTHORITY (multi-season):**
Multi-season certificates + the model graveyard: every killed experiment published with its prereg ID, kill trigger (KILL-A/B), and final e-values — the negative-results monopoly nobody occupies (Report 4 §3.7) — plus the per-pick prediction-market cross-check column (our p vs book close vs Kalshi close, powered by X4's lock snapshots).

Honest-state note the ladder must carry: Rungs 0–1 prove honesty immediately even while the edge is absent ("calibrated but uninformative" is the launch state); Rung 2 is the first rung that requires Resolution to exist. The same machinery that certifies the edge will honestly report its absence — that is the FOUNDING-phase story ("watch us earn PROVEN in public"), and it is survivable because CLV can certify edge long before win-rate resolution is distinguishable from noise.

---

## 6. Order of operations

Week 1: E4 (registry + commitments) → E1 (clean-room pilot + shadow readout; founder runs the export) → E2 (founder: migration + flags; agent: wire markClosingSnapshots + Pinnacle cadence budget) → E3 (quarantine) → declare + start X1 (preseason NFL venue immediately — preseason ends ~Aug 28) → declare + start X2.
Weeks 2–4: X3 as Pinnacle snapshots accrue; X4 lock-snapshot persistence; X5 go/no-go from E1's pilot; Rung 0 artifacts live; Rung 1 ledger begins filling.
Season: X6/X7/X8 behind the same rail; every kill feeds the graveyard; first certification candidate realistically X1 or X3 at a flagged-subset beat-rate ≥ 60% (n ≈ 260 to certify) — at lifetime volume of ~1,161 settled picks, expect one to two certifiable families per season, which is exactly what the ESTABLISHED rung needs.

Total wiring budget: enablers ~3–4.5 agent-days; QUICK ~4; MEDIUM ~9; DEEP ~15 — sequenceable by one founder plus agent sessions with zero data spend beyond the existing free tiers.

---

## 7. Provenance and constraints

Directly re-verified this session by this agent: live-calibration-p.ts:35-37,43-45,67-97; forecast-skill-eprocess.ts:1-80 (incl. its separation from anytime-ledger.ts profitability test and calibration-sequence.ts self-calibration, :7-21); line-archive.ts:143-210; pinnacle-line-archive.ts:1-45; scoring.ts:480-559,766-795,830-899; kalshi-client.ts:1-40; schema.prisma:440-471,502-563; constants.ts:1-70; clv-coverage.ts:1-19; selective-publish.ts:160-279; export-settled-picks-for-calibration.mjs:40-99; market-read.ts:1-29; pricing-phases.ts:105-124; backfill-independent-trueprob.ts:130-259; shadow-evaluation-pass.ts:1-70; existence of pedersen-ledger.ts, hawkes-steam.ts, anytime-ledger.ts, calibration-sequence.ts, clv.ts, clv-decomposition.ts (Glob); existence of suppression-curve.ts + forecast-skill-eprocess.ts on origin/hermes/sprint-backup-20260819 (git ls-tree). Carried from the four same-session source reports (not re-read here): process-sport.ts, build-independent-fair-values.ts, config.ts, ranking-prob.ts, selective-publish-runtime.ts, proven-path-rows.ts, generate-signal-slate.ts, nflverse-source.ts, team-rates-source.ts, polymarket-independent-client.ts, schema.prisma:798-805/:1322-1344, feature-gates.ts, docs/ops/* cites, and all census/DB row-count context (census CSV itself is unpushed and unverifiable — docs/ops/AGENT_LEDGER.md:88). .env* files were not read (prohibited); flag defaults are cited from code gates instead. DB was not queryable; every experiment above therefore names the founder-side step (export run, migration, env flip) it depends on.