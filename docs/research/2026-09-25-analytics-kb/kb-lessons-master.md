# 14. Lessons Learned Master

# Lessons Learned — Master Consolidation

Garrett's NFL Analytics Reverse-Engineering knowledge base, coding-agent edition.

**Scope directive (Garrett, 2026-09-24):** no filtering, no relevance judgments. His
engine ingests ALL signals and learns from everything — decisions are made downstream
from the full data. This master consolidates every LESSONS section from the digests
below, keeping each item with attribution. Nothing dropped as "marginal" or
"duplicative"; where two sections state the same rule, both appearances are
preserved with their sources.

## Source digests (all in this `expanded/` directory)

- `pre-sept17-digest.md` §8 — root research files, CEPT v2.2, scraping, brand rules
- `sept18-digest.md` §6 — Sept 18 charts, FTN, 76 tables, props reverse-engineering
- `sept19-24-digest.md` §7 — Sept 19–24 charts/tables, @DETROlTLions313, Keenum study
- `sept21-deep-digest.md` §7 — Sept 21 sweep, backend-gold, wiring, drive-deep audits
- `memory-sports-learnings.md` §C/§E — dated memory events + rules
- `learnings.md` — the standing lessons digest (referenced, not re-pasted in full)

---

# PART 1 — Mistakes caught (with the correction)

## From pre-sept17-digest.md §8
1. **v1.0 CEPT Proposition 1 was ill-posed** (`cept/HONEST_CEPT.md` Remark 4): assumed each
   fixed-i ratio was "an e-value under H₀" for a single unspecified null — not well-posed
   under performativity. Counterexample: interventions a, b with m(1|do(a))=0.9,
   m(1|do(b))=0.1, p(1|do(b))=0.9; under do(a), E[p(Y|do(b))/m(Y|do(b))] ≈ 8.11 > 1.
   Correction: restated as **Theorem 1** under an explicit composite null (R1)–(R2),
   kept auditable.
2. **The dropped-set Brier integrity check was mathematically vacuous** (Proposition 6):
   for a dropped pick with p = 1/2 + ε, realized score is 1/4 ∓ ε + ε²; dropped picks
   satisfy |ε| < δ, so the dropped set's sample Brier lies in [1/4 − δ(1−δ),
   1/4 + δ(1+δ)] **for every possible outcome sequence** — pinned near 0.25
   deterministically by the selection rule. It cannot work. Replacement: run the
   skill-vs-market e-process and calibration instruments on the dropped set. The
   blindness cuts the direction that matters: dropped picks with p=0.5, true q=0.7,
   market m=0.4 beat the market at a compounding e-process log-rate of ≈0.10
   nats/pick while scoring exactly 0.25 — real, discarded edge the check passes.
3. **v1.0 wrote the global base rate π in the selective-publication identity** — correct
   quantity is **π_δ = E[Y | published]** (Proposition 5 correction). A symmetric filter
   |p − 0.5| ≥ δ can still yield π_δ far from 1/2 when forecasts are asymmetric (worked
   example: P=0.7 w.p. 0.2, P=0.45 w.p. 0.8 — global base rate 1/2, but δ=0.1 publishes
   only the 0.7 picks, so π_δ=0.7 and BS_pub=0.21). Validation step 2 now reports π_δ on
   the held-out window.
4. **The deleted "average E-factor 1.031 over ~148 games" was internally inconsistent**:
   1.031^148 ≈ 92 < 100 = 1/α; the draft's own numbers never cleared its own threshold
   (adopted from the independent DeepSeek review).
5. **CPOE throwaway bug** (`gse-lab/COMPUTATION_NOTES.md`): an early version compared
   completions over ALL attempts to expected over non-throwaways, wrongly making nearly
   every QB negative — caught and fixed; comp_pct, exp_comp_pct, cpoe all computed on
   the cp-available (non-throwaway) subset, with n_cpoe reported.
6. **Pushes were silently flattering the record** (`session-handoff-2026-09-12.md`): PUSH
   was structurally unreachable for spreads/totals; published and graded the posted book
   line; calibration bucket win rates were averaging push as half a win (flattering
   sub-50% buckets); correlation WIN_RATE counted every push as a loss; /api/performance
   floor counts included pushes — all fixed to decided-picks-only, ties resolve against
   us, published bet terms frozen write-once (the card can no longer show −4.5 while we
   grade −3.0).
7. **Decorative mathematics in the early CEPT draft** (`cept/HONEST_CEPT.md` §10):
   non-commutative probability/von Neumann algebras, symplectic geometry/Kostant-Souriau,
   Causal Index Theorem (Atiyah-Singer), Chern class/obstruction theorem, Euclidean
   QFT/holographic duality/Wheeler-DeWitt, "Theorem 4 (Universality)" — all removed with
   reasons; "a shorter true paper is worth more than a longer impressive one."
8. **ever-gauzy recommendation reversal** (`2026-09-18-ever-gauzy-reference-architecture.md`):
   "do not build multi-tenancy now" was wrong in the specific direction this project
   keeps correcting — it treated an undecided product decision as a reason to defer
   foundational work whose cost rises with time. Corrected: build the foundation now,
   gate the product decision separately.

## From sept18-digest.md §6 (mistakes in the Sept 18 corpus itself)
9. **`gridironinfo-buf-passing-week2.csv` J. Allen row shows a source-side chart error**:
   negative signs in green cells (CPOE −5.7, EPA −15.0, EPA/db −0.46) contradicting slides
   1–2 of the same chart set (BUF CPOE +5.7 / EPA/DB +0.55 / Dropback EPA +20.8).
   Transcribed as displayed; contradiction flagged in-row. Lesson: when a chart set
   contradicts itself, preserve the error and cross-reference the agreeing slides —
   never silently substitute.
10. **Patton ANY/A "Drew Lock" duplication**: the name is duplicated in post text as
    displayed — likely an author typo, noted in-row.
11. **Statyx Irving runner-evidence "RYOE" cell**: "No matched RYOE evidence is
    available for this runner." — a missing-data cell, not a zero. Transcribe the
    absence.
12. **jmac Bills target distribution**: Sam LaPorta row truncated in source —
    share/TPRR not captured. Record the truncation.
13. **sfdata9ers missed-tackle rates rank 2**: team logo ambiguous at chart resolution
    — unidentified. Record the gap rather than guessing the team.
14. **sfdata9ers week2-previews**: several home/away logos uncertain — flagged per row
    in the note column.
15. **patton-playcaller-tendencies**: two rows (Zac Robinson, Sean Mannion) have no team
    stated; all 32 values are approximate bar reads.
16. **Magicsportsguy Dee Alford BUF CB row**: side/zone splits blank in source — keep
    blanks, don't impute.
17. **ScottBarrett YPRR**: rows 17+ not visible in the source screenshot; A.J. Brown
    team shown as "PHI NE" as displayed.
18. **FantasyPts defensive targets-by-position**: only two teams text-attributed;
    remaining shares are approximate stacked-bar reads with approximate team mapping —
    not individually transcribed.
19. **Malachi Fields slot rank "161st" of 152 receivers**: inconsistent rank denominator
    as displayed — preserved as displayed.
20. **Missed-tackle CSV `paganetti-rush-ypa-regression`**: only 17 teams named in source
    — don't treat as full-league.
21. **Missed CSV count**: `full-tables/` holds 76 CSVs, not 83 — verify counts by
    listing, not by assumption.

## From sept19-24-digest.md §7
22. **Descriptive ≠ predictive**: BAL posted a 16.6% higher success rate than NO and
    still lost (second-largest net success-rate upset since 2022); success-rate edges
    don't guarantee outcomes. Keep the engine's descriptive inputs separated from its
    outcome predictions.
23. **Snap-qualification and tiny-sample traps**: the SumerSports PRWR min-25-snaps
    leaderboard was led by players with ~5 and ~3 snaps (Hunt 29.6%, Muhammad 27.3%) —
    the filter denominator was unclear from the screenshot. Treat unqualified or
    small-sample leaderboards as provisional; gate win-rate metrics on snap volume.
24. **New labels can surface without definitions**: "9YOE" (GridironInfo, 9/22) has no
    definition — unusable until the author defines it; flag as watch-item, do not guess.
25. **The backup-QB lesson (Keenum study)**: no positional tell — rusty Keenum is not a
    TE guy or checkdown guy (WR 62.2% / TE 20.1% / RB 17.6% in return games). The
    "safety blanket" is role-based (slot / receiving RB / X) and follows the roster and
    scheme, not the QB. For DFS stacking or prop angles on backup QBs, identify the
    scheme's designated guy, not a position.
26. **Fourth-down aggressiveness as regime indicator**: 2026 W1–2 ≈ 16% vs 2025 ≈ 21%
    (ngreenberg/TruMedia). Early-season samples are small — don't over-fit; author's
    framing ("small-sample blip or new normal?") is the right posture.
27. **Garrett's process lesson (Sept 24 pool notes)**: his reads were directionally
    right and the actuals were slightly better than he remembered (DAL 29.7 FPG to TEs,
    not 27; Andrews 24.5% share, not 25%) — verify numerically before fading or
    following, but don't dismiss his directional instincts.

## From sept21-deep-digest.md §7
28. **Fake-tightness / quantile clamping (the central caught defect)**: a small-sample
    CQR quantile clamp (`rank = Math.min(Math.max(rank, 0), n - 1)` in
    `apps/web/lib/calibration/cqr.ts`) at n=5, α=0.10 falsely certifies 90% coverage
    while delivering 83.33% (a 6.67pp under-coverage defect), and its tests explicitly
    encoded the wrong behavior. Standing rule: ban ALL quantile clamping; emit +∞/No-Bet
    when n < ⌈1/α⌉−1. Repaired 2026-09-22 (commit `1d38140`) — re-verify against live
    checkout.
29. **Name-confusion traps (do NOT conflate)**: Barrett's RB Weighted Opportunity
    (coefficient formula, full-PPR) vs. Marvin's WR WOPR (1.5×TS + 0.7×AY%) — different
    metrics, same name family. PFF's xFP (2019 article, public formula) vs. FantasyPoints
    Data Suite current XFP (behind closed beta — deltas unknown). CQR math must NEVER
    touch binary moneylines (mathematically invalid for Y∈{0,1}) — binaries go to
    Venn-Abers. Closing lines / near-game odds as input features to team-strength models
    = severe target leakage (model parrots consensus, CLV unmeasurable). Average-quality
    trap: un-conformalized QR under-covers in finite samples (error ∝ d/n) — raw
    NN/boosted quantile outputs are strictly *uncalibrated proposal distributions*.
30. **Jackknife+ reporting honesty**: guarantees 1−2α, NOT 1−α. At α=0.10 → exactly 80%
    guaranteed coverage, not 90%. Track/log/report explicitly.
31. **Venn-Abers threshold arbitrariness**: p₁−p₀ > 0.20 is an example policy value, not
    a derived constant — calibrate on shadow data before adopting as a gate. ACI's
    asymptotic coverage does NOT certify anything over an 18-week NFL season (no
    finite-sample guarantee) — don't cite it as one.
32. **Conversion/extraction gotchas**: equation images dropped by python-docx→markdown
    (corpus audit's 22 PNGs recovered by rendering; anyone reading only the .md misses
    the formulas). Table columns blank in conversion (conformal audit's Exchangeable Y/N
    and Source ID; Table 2 From/Sender). The cqr-research.md file is a compiled survey,
    not a single paper (three batches + raw dump; heading mistyped `## . arXiv:2609.17091`;
    entry numbering inconsistent — 8–118). Abstract-fragment papers (100-paper batch) are
    metadata-level, not evidence-level. Papers cited with 2026 venues/dates (ICML 2026,
    KDD 2026, COPA 2026) are future-dated acceptances — taken at face value from the
    source docs. The 2026 "OpenAI solved Navier-Stokes" narrative is a YouTube Shorts
    anecdote, not a paper — unverifiable, conflicts with the no-claims-without-lab-
    execution rule. Rolling-Origin CP listed as "2026" — either a 2026 preprint or
    transcription artifact, unverified. Operational states (PR numbers, CI run #2948,
    watchdog RED since 2026-09-13 16:53 UTC, 2026-09-24 board gate, 2026-10-08 EPA
    activation) are 2026-09-19/21 snapshots — re-verify against the live repo.
33. **Model-honesty defects**: per-sport noise scales — a single global calibration
    layer is "mathematically unsound" (arXiv 1701.05976); never share calibration
    across sports. Train under Brier loss, not BCE, for calibration (empirical:
    LSTM+Brier → 0.159 vs Transformer+BCE highest AUC 0.847). Release-time snapshot
    partitioning for CLV — never train on near-game-time lines. Dual CLV reporting
    (Decided 40.8% / System 23.2%) side by side, vs 52.4% break-even floor. Inverted
    confidence metrics (Brier 0.3617, z=−10.7) = anti-predictive — purge from any public
    surface. Sort by marketFairProb (Shin/Power devigged consensus, Brier 0.2189) until
    the model demonstrably beats the close. "Questionable" is a mandated range, not a
    50/50 — since 2016. Rest DNPs (NIR-Rest) are not injury signals. Purge "AI" marketing
    copy (hygiene governance). Physical plausibility: player movement >13 m/s = fatally
    corrupt telemetry (not an outlier); wind direction is not naively averaged (store as
    categorical or directional cosines); non-finite timestamps = hard error.
34. **Feature bloat and killed programs**: feature bloat killed until baseline MAE/
    calibration competitive (STGCN-LSTM, soccer vector fields, TDA, fluid dynamics
    layer, AGI swarm — vision/horizon material, not engineering). Ten dead-domain papers
    excluded (matched generic keywords only). Features W5–W8 (Wasserstein, DFA,
    Intrinsic Dimension, Permutation Entropy): 12/12 failed → permanently killed.
    Mondrian-k calibration ΔCRPS=0.0092 < 0.01 threshold → killed. QB-change variance
    scaling τ²=1.379 < 1.50 kill threshold → killed. Spread×Total correlation ρ=0.016 →
    independence kept. Hawkes branching ratio n̂=0 → momentum rejected. Hawkes steam
    detection rejected on short-horizon odds archives (overfits to high-frequency
    noise) — replaced by parameter-free RTS Kalman + cubic B-spline curvature geometry.
35. **2026-09-21 arXiv Phase-1 integrity failure (Garrett's rejection)**: phase 1 closed
    at a claimed 510 ledgers; his standard was 500 papers ACTIVE AND WORTH ADAPTING. Only
    365 qualified (342 ADAPT + 23 ADOPT); 145 REJECTs were written off without
    replacement, violating the standing replace-on-reject rule. Framing phase 1 as "done"
    was the integrity failure. New program rule: a REJECT never counts toward the target;
    every REJECT is replaced with another full-paper read.
36. **2026-09-14 DeepSeek citation-fabrication finding**: second-pass audit of DeepSeek
    MOVE-37 submissions — 20 confirmed defects including systemic citation-fabrication;
    corrected README + ledger drafted. DeepSeek literature claims are unverified until
    checked — this is why the execution gate exists.
37. **2026-09-10 Maye 22/33 vs 23/33 incident**: published @GalaxySportsHQ post used the
    wrong line; Garrett's directive: "Delete the post if it's not factual — repost."
    Lesson: box-score facts are verified against the source (ESPN); inaccuracy triggers
    delete-and-repost, not edit-and-hope.
38. **2026-09-10 Greenlaw/assertion correction**: Motif asserted Greenlaw as the
    forced-fumble player; postgame majority sources credited Fred Warner. Never state a
    contested fact as certain to Garrett; carry the conflict; public copy hedges until
    the primary source settles it.
39. **2026-09-22 "forgotten/stalled" audit**: caught the cqr.ts clamp bug (fixed
    1d38140); NGS backward continuation never done; 3 NGS transcription discrepancies
    open (Van Ness, Allen, Apr 27 big board); corpus not machine-usable (1,251 markdown
    ledgers, no structured index); 48 ADOPTs with no consolidated build queue; the
    bottleneck flipped from knowledge to implementation. Lesson: periodic stalled-work
    audits beat assuming done.
40. **2026-09-21 copy correction on NGS playbook**: corrected a misspelled name (Uar
    Bernard) and removed an unverified bio-rendering explanation from the finalized
    implementation playbook. Lesson: unverified explanations are removed, not published.

---

# PART 2 — Standards established

1. **Trust no claims, even your own.** Counts must be file-verifiable — auditable
   against actual files on disk. Tracker rows reconcile with real files, matching IDs
   and verdicts, zero mismatches. (learned 2026-09-21 arXiv audit; memory-sports-
   learnings.md §E1)
2. **Framing a phase "done" without the standard being met is the integrity failure.**
   (2026-09-21; memory-sports-learnings.md §E2)
3. **Every number carries league context** — rank, percentile, or average line, or it
   is cut. (edge-sheet design brief; pre-sept17-digest.md)
4. **Every proprietary metric gets a birth certificate** — source-rights envelope,
   payload-rights classification, metric card, model card, validation report, drift
   card, public/private exposure level — before promotion. (R&D map § Source rights)
5. **The Evidence Readiness Matrix** — factors ACTIVE / SHADOW_READY / SHADOW_COLLECTING
   / BLOCKED / ABSENT; scoring reads only ACTIVE factors; true EV stays blocked until
   independent fair probability is source-backed and separately promoted. (2026-05-21)
6. **Shadow-first, then product**: every method becomes a deterministic, tested,
   documented shadow primitive before influencing public claims; CEPT instruments run in
   shadow; the learning loop's champion/challenger and shadow deployment are the
   reference. (R&D map; ML brief §15)
7. **Pre-registered hypotheses with kill lines**: anything entering the engine carries a
   pre-registered hypothesis with a kill line written on the same line as the
   prediction, a shared test set, fixture-grouped time-ordered folds, a result recorded
   whether it lives or dies. (ML brief; props-consensus H1/H2/H3)
8. **Absent = factor does not fire**: missing data is ABSENT, never zero — factor
   engine convention; the `consensus` factor: NEVER fabricate — absent = the factor
   does not fire.
9. **Never collapse skill/profit/self-honesty into one number** (CEPT §4); never
   overstate — implemented-and-running-in-shadow-mode, validation-pending is the
   correct statement until the validation procedure's step 4.
10. **Cite or don't claim**: every legal proposition gets primary-source support;
    unverifiable citations marked UNVERIFIED rather than presented as established.
11. **Denominators, filters, sample windows, and minimum qualifiers are first-class
    fields** (e.g., true target share = % of **team pass attempts**, not targets;
    Statyx "last_3" = NQ = not qualified). (sept18-digest.md)
12. **Approximate chart transcriptions stay approximate** — never promoted to canonical
    values. Chart-reads are approximate; formulas are exact. Author-stated formulas
    (ARBY's footer, ThunderDan's 80/20 blend, benbbaldwin's 40/40/20) are the
    reverse-engineering-grade material. (sept18-digest.md; sept19-24-digest.md)
13. **Distinct denominators mean distinct metrics** — success-rate conventions don't
    merge across sources; reposts and new cuts of existing metrics are revisits, not
    new metrics. (sept18-digest.md)
14. **Neutral-inventory standard**: metric name, definition as given, columns/sample
    values, date/account, data source as stated, caveats as attributed facts — no
    verdicts. (sept21-deep-digest.md)
15. **Evaluation discipline**: choose δ on an early chronological window, evaluate on a
    later one — a threshold tuned and scored on the same rows is a curve fit (CEPT);
    report π_δ on the held-out window; report effect sizes with sample sizes and proper
    time-ordered splits; report negative results. (ML brief)
16. **The ML-regime reminder**: evaluate every method against low SNR (edges worth
    having are 1–3 percentage points), an efficient price, small uneven samples,
    non-stationarity, leakage hazards, missing-heavy inputs, and calibration-over-
    accuracy. A method winning large-sample benchmarks and failing here is a negative
    result. (ML brief §7a)
17. **Query/test/plot proof for every completion claim** (v5.3.0 build spec): no claim
    of completion without executed evidence; approximate transcriptions (unlabeled
    scatter axes, partial visibility, visual estimates) never feed leaderboards —
    labeled APPROXIMATE. (memory-sports-learnings.md §E12)
18. **Batch handoffs; report gaps first.** When several items need another agent's
    input, batch into one handoff (what you did, exact file paths, what you need, what
    you're not claiming). Report blockers and partial progress up front — named gaps
    beat silent holes. (memory-sports-learnings.md §E13)
19. **Raw-corpus-first research standard** (2026-09-19/20): analysis works from the raw
    corpus FIRST (the repo docs/research/<date>/, lab tables, optimizer run directly
    and cited to the file), with summaries only after the reading is done — a
    digest-of-digests he hears as bias. (memory-sports-learnings.md §H1)
20. **Conformal wrappers guarantee coverage but cannot repair point-estimate bias** —
    fix Brier/ECE of the point model first. Raw boosted/NN quantile outputs are
    proposal distributions, not calibrated intervals. (sept21-deep-digest.md)
21. **Data-freshness / update-cadence rules**: NFL stat corrections land Mon–Wed —
    Thursday's pull is the cleanest. Raw pbp JSON within ~15 min of game end.
    Rosters/depth charts/injuries 7 AM UTC daily. NGS player-level weekly: nightly
    3–5 AM ET. nflverse participation: pre-2023 source died in 2023 season; 2023+
    courtesy of FTN, only after all postseason games. (sept21-deep-digest.md)
22. **Small-sample honesty**: uncertainty-aware leg hit rates use Wilson intervals; n=1
    splits are flagged, not headlined. Public performance displays withheld until
    n ≥ 30 (Clopper-Pearson 95% CIs). n ≥ 100 settled games before NFL PASS
    recommendations; n ≥ 1,000 to claim calibration. (sept21-deep-digest.md)
23. **9.2 is a floor, not a target** (2026-09-10): anything below 9.2 stays internal;
    surfaced drafts below floor = judgment event. (memory-sports-learnings.md §C)

---

# PART 3 — Builder-facing rules

1. **Claim-safety and gate law**: content-flag-aware deploy gates; STATS_PUBLIC default
   OFF with founder-only unlock checklist (StatKing: `/stats` 404, robots Disallow,
   sitemap omission; dark until rights memo per feed, live-feed SLA green, settlement
   not CRITICAL, explicit `STATS_PUBLIC=1`, trust-gate + unfinished-copy clean).
   (pre-sept17-digest.md)
2. **Decision doctrine**: confidence is not win probability; GSE Signal Score is
   decision quality, not win probability; no bet is a decision; high EV cannot override
   missing data, stale inputs, unclear rights, drift, or calibration debt.
3. **No public claim without settled evidence**: no market-beating performance claims;
   no CLV success claims without sample size and approval; any accuracy-theater
   without floors is a brand anti-pattern. (R&D map; prediction-market triage)
4. **No raw restricted payloads as product**: no raw NGS exposure; no raw paid odds
   resale; no raw sports data resale; never re-serve raw restricted feeds as the
   product; raw NGS *row* exposure banned. Raw paid odds payloads exposed only where
   terms allow.
5. **Scraping law**: no restricted scraping, paywall bypass, CAPTCHA bypass, credential
   misuse, fake accounts; check `source-rights-registry.ts` before scraping a fantasy
   site; never put a real book's quotes into a paid SaaS without rights.
   (scrape-wave-2)
6. **Do-not-re-scrape**: wave-2 results are the wiring map — do not re-scrape those
   URLs. (scrape-wave-2-results)
7. **Polymarket hard-hold law**: no public Polymarket product, no arb bots, no
   copy-trade, no whale-alert customer features, no guaranteed-edge claims.
   (prediction-market-ecosystem-triage)
8. **Copy law**: no em dashes; no "sports intelligence"/"intelligence"/"sports galaxy"
   phrasing in public copy; no hashtag walls; human voice; team names FULL CAPS when
   large; BUF/DET only inside chart legends and data labels; sharp-friend test for
   every customer-facing string — "would a sharp friend who actually plays DFS say
   this?" Every public number traces to a source; every claim can be verified; show
   exact copy and get approval before publishing (Garrett's gate).
9. **Footage law**: seconds-long transformative clips, telestrated, commentary-led —
   never standalone rips/compilations; 2–4s real-footage clips per the 2026-09-15 legal
   check; no safe "under X seconds" assumption; make every second necessary to active
   criticism; when footage rights are uncertain, rebuild the teaching point as original
   diagrams or Madden captures; quote-press-releases freely, treat footage separately;
   quote-post, never download and re-upload. If real footage cannot be secured, say so
   and stop — a fallback render without the material is not a deliverable.
10. **Learn, don't lift**: PFF grades, DVOA tables, NGS visuals may be read to learn
    and to sanity-check our numbers — never republished, never claimed as computed.
    One public PFF grade/stat per post max, labeled "Source: PFF," with link and
    original analysis on top — never paid-only tables or bulk rankings.
11. **Projection language discipline**: a projection that disagrees with the market is a
    hypothesis, not an edge, until validated; leans, never calls; disagreement between
    our own methods is model uncertainty, not an edge.
12. **No AWS action without approval**: no credentials, no deploy, no account mutation,
    no hosted resources, no DNS, no paid service; AWS artifacts stay local, no-cost,
    credential-free.
13. **Fail closed**: restricted, unclear, stale, and raw-payload inputs fail closed;
    no-bet governor tests must prove stale inputs, calibration debt, drift, and missing
    data can veto high EV; robust Kelly sizing fails closed.
14. **Repository laws (the nine, session-handoff-2026-09-12)**: PRs only, never push
    main; never modify schema.prisma, migrations, .github/workflows, scripts/guardrails,
    .claude, .env*, package-lock.json, .gitignore, .githooks, ai-control-plane; never
    flip a gate or env flag (founder-only); never write a claim you did not observe;
    never mark DONE without DoD commands passing; never `git commit --no-verify`;
    never install a package, run a migration, or touch a database; never fabricate
    product data; never weaken a guard to make a test pass.
15. **Charting honesty (edge-sheet DO NOT LIST)**: no pie/donut; no radar/spider; no 3D,
    bevels, gradients, glows, drop shadows; no dual y-axes; no truncated bar axes; no
    rainbow palettes (fourth color must be justified in build notes); no legends where
    direct labeling works; no tick-label soup; no heavy box spines; no orphan numbers;
    no paragraph text; no DejaVu Sans headlines; no fake precision.
16. **Publication-coin discipline (CEPT/ADR-009)**: append one entry per epoch BEFORE the
    epoch begins; fill revealedSeed only AFTER the epoch ends; never edit past entries.
17. **Wiring discipline**: additive-only — new modules + tests, nothing existing touched,
    nothing wired into live publish paths. Publish-path wiring = NEEDS HUMAN CALL with
    pre-registered acceptance gates. schema.prisma/migrations frozen to agents (law 2);
    DB reads forbidden to agents (law 7). Prop storage blocked on `PROP` in Prisma
    PickType (human schema change).
18. **Credential hygiene**: never commit credentials; if one lands in git, rewrite the
    branch and broadcast the reset instruction to all holders (reset --hard to fresh
    versions before pushing). Keys live only in gitignored env files with 600
    permissions; values never in memory/chat logs.
19. **Research doctrine**: public surfaces only; provenance on everything;
    CONFIRMED/INFERRED/UNVERIFIED labels; no fabricated URLs/endpoints; no hallucinated
    schemas/formulas; extract, don't summarize; never bypass logins, paywalls, or
    access controls; no social interaction on research passes. Public reading does not
    grant redistribution rights; respect targets' licenses (Firecrawl rule 7).
20. **Task rule (backend-gold)**: never bypass logins, paywalls, or access controls; no
    social interaction (no likes, follows, replies, reposts, forms). Public-web-only
    research; every formula sourced from a primary public source linked inline;
    anything not found marked GAP rather than invented.
21. **Lawful-openings framing**: phrase "loopholes" only as lawful openings,
    terms-approved gaps, open-source analogs, public-data methods, underused
    rights-cleared sources, competitor blind spots, workflow asymmetries, process
    advantages.
22. **Priority hygiene**: more repo-visible proof, fewer unsupported claims; every AWS
    artifact remains local and credential-free; every public claim can point to code,
    docs, tests, or settled evidence. And the CEPT closing rule: **do not submit to
    arXiv until §6 contains real numbers.**
23. **Proprietary charts shouldn't be republished as GSE data**; the clean reusable
    foundation is nflverse. Vendor disclosure is an attributed claim, not independent
    supply-chain verification (e.g., "750+ NFL data points", OddsPapi 350+ books,
    SumerSports' lead claims). (sept18-digest.md)
24. **Never commit credentials; no AWS action without approval; no paywall bypass** —
    standing lines repeated across the corpus (each restated in its digest with its
    source).
25. **"The best" rule (2026-09-12)**: do not declare anything 'the best' without
    independent leaderboard evidence; vendor-reported model-card numbers alone do not
    support a rankings claim.
26. **Model-research boundary (2026-09-12)**: research must extend beyond whatever list
    Garrett provided and re-check the live free-model landscape — it changes daily.
27. **Stand-down protocol**: when Garrett says "stand down," paused work is named
    without being asked; verify everything pushed and live before shutting down
    cleanly. **"Don't retry after explicit denial"** (2026-09-18): explicit denial
    means no retry or workaround unless he asks.
28. **Proactive, not reactive** (2026-09-17): keep finding benchmark material
    proactively, not only process charts he sends. Pursue legal revenue paths
    autonomously; only true hard blocks surface, batched.
29. **Traffic-first operating rule (2026-09-09)**: no new product work until the site
    reaches 1,000 visitors. Research and infrastructure that don't move traffic wait.
30. **Distinguish snapshots from live state**: timestamps and statuses in docs (PR
    numbers, CI gates, counts, prices, odds lines) are snapshots — re-check live before
    any build decision. Memory figures go stale.

---

# PART 4 — Gotchas and transcription hazards

1. **OddsPapi traps** (vendor-documented): `hasOdds=false` on finished fixtures is
   expected, not missing data; identical price tuples must be grouped empirically
   (`cloneOf` doesn't track all duplicates); tournamentId lifts the 10-day fixture
   window; historical-odds retention disputed (docs say Jan 2026, independent probe
   ~90 days) — resolve live before backfill; "free" endpoints still 429 after plan
   exhaustion. Key hygiene: OddsPapi key is a query param — never log the query
   string; 429 body carries `error.retryMs` as valid JSON — honor it.
2. **Close semantics**: no `is_closing` field — close = last active snapshot with
   `createdAt < kickoff`; Pinnacle prices in-play so a pre-KO cutoff is mandatory.
3. **Pinnacle `limit`** per snapshot = max stake = a confidence signal no other free
   source carries — persist it.
4. **persist `externalProviders`** at fixture ingest — collapses entity resolution
   across every downstream feed keyed to any listed provider.
5. **ESPN public endpoints**: undocumented, unstable; UA behavior changes responses
   (403 browser UA vs 200 plain curl).
6. **Do not retry**: rbsdm.com (failed to load in mission), statrankings provider
   inference from FTN/Kevin Adams link, fantasy-points paywalled articles.
7. **Manual charting QA** (from b_peters12 recon): store observed geometry separately
   from inferred team terminology; double-chart, adjudicate, compute inter-rater
   reliability, retain timestamped film evidence, version the codebook.
8. **Under-center cut**: needs explicit treatment of no-plays, spikes, kneels,
   penalties, pistol; exact nflverse field names unverified.
9. **StatRankings JS inventory** (`statrankings/js/`): 103 files; controllers reveal app
   features — stat builder, projection overrides, survivor grid, implied probability,
   market search, depth-chart overrides, coverage shell controllers, paywall modal,
   PDF export. Controller names = UI capabilities evidence, **not public API endpoints**.
   `nfl-urls.txt` = 1,148 paths; `methodology-definitions.json` = 673 glossary
   definitions (prose, no proprietary formulas — ARBY/Havoc/PROE+/xFP definitions
   absent).
10. **Composite-metric construction patterns observed in the wild**: ARBY (65% ARBY /
    35% RB YPC, 65% prior-year / 35% current-year, 50/50 offense-defense; TNF version
    adds game-weighting 5/2 across windows); benbbaldwin pass-protection composite (PFF
    40% / SIS blown-block 40% / ESPN PBWR 20%, each source re-scaled 0–100 before
    blending); SamHoppen Week 3 composite power ratings (mean of 6 sources as expected
    spread vs. average, per-team std dev as the disagreement measure); ThunderDan PROJ
    YPPR (prior-year baseline × projected opponent coverage splits, 80/20 old/new
    blend); RaritosFootball Nota (EPA + success rate + pressure → 1–10 with
    attack/defense sub-ratings). When reverse-engineering a public composite, look for
    this shape: weighted blend of public/paid inputs + a prior-year anchor + a
    normalization step.
11. **Most of the signal is vendor-gated; the construction is what matters.** The
    valuable reverse-engineering targets are the open methodology + construction
    patterns, not the charted data (FTN, PFF, Statyx, SIS, ESPN PBWR are all gated).
12. **Same-caveat explosive-play counts** (@DETROlTLions313, Sep 23): the Claude-built
    query excluded QB runs — Seattle's allowed 10+ rushes read 2 in the dashboard vs 4
    manually counted (Drake Maye 16 and 10, Stevenson 12, Bam Knight 18). Any
    explosive-rush pipeline must explicitly include or exclude QB runs and say which;
    verify against other sources before comparing. **Position-aware baselines**:
    WillBrinson's caveat on the rushing-EPA chart — QB rushing (scrambles, situational
    runs) is not comparable to traditional RB rushing; keep position-aware reference
    lines. **nflverse pbp has no alignment data**: slot/X/Y/Z attribution needs
    charting data (FTN/PFF/Statyx).
13. **The no-code pipeline recipe is engine-replicable** (@DETROlTLions313): natural-
    language prompt → Claude → RStudio + nflreadr → BigQuery → Grafana. End-to-end
    verified by a third party. Cumulative EPA by play number (not by week) is a trend
    shape the engine can mirror for any quarterback.
14. **DeepSeek numeric claims are evidence, not verification** (no execution
    environment on their side; disclosed 2026-09-13). Standing gate: no DeepSeek
    numeric/discovery claim is published or built on without Motif-VM execution.
15. **Never publish when the independent model passes** (2026-09-13 calibration audit:
    the Steelers ML -285 pick shipped even though the independent model said PASS with
    −16% edge — codified as the v5.3.0 regression test). Related: verify the source of
    truth before building on it (2026-09-10 SuperGrok identity mismatch: wrong email =
    wrong identity, not bad credential).
16. **The 2026-09-24 arXiv-count "correction" pattern**: a subagent's claimed count is
    a lead, not a fact — needs Motif-level verification before promoting to the
    record. (memory-sports-learnings.md §E24, §C)
17. **Browser-harness daemon wedge** (jev-ultrafast, 2026-09-24): if CDP calls time
    out, kill the daemon pid and rerun; Chrome itself stays fine.

---

*End of master. Each item carries its source digest and original source. For full
context read the cited digest section. This file lives at
`~/workspace/research_notes/nfl-sweep-metrics-catalog/expanded/lessons-learned-master.md`.*


---

