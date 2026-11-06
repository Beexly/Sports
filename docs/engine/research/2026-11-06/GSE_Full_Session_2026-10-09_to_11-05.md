# GSE Full Session Transcript — 2026-10-09 to 2026-11-05
**Galaxy Sports Edge · Research Path · Doctrine-Enforced Prediction Engine**

Compiled from the complete chat session covering Glicko-2 mechanics, rating atlas, warehouse Phase 1, 19-rule doctrine implementation, CFB separate model, book anatomy, prop engines, PBP tendencies, flow pump, and honesty gates.

**Doctrine (non-negotiable throughout):**
- μ remains the market close (Pinnacle primary).
- CRPS bar must be beaten on frozen walk-forward before any promotion.
- Transfer operators only. Foreign coefficients stay off the NFL margin head.
- One invented number is sabotage.
- College is a separate model. No port of NFL constants (13.45, 1.56, etc.).
- Research path only. No production scoring, MODEL_VERSION, Stripe, or main-branch changes.
- Warehouse is append-only with `observed_at ≤ t`. Leakage fails closed.

---

## Phase 1 — Glicko-2 Mechanics & Rating Atlas (Early Session)

### User Requests
- Explain the idle step for `glicko2.py`.
- Explain the sigma calculation.
- Explain the 0.5 tau value and why the default is 0.5.
- Explain the Glicko-2 volatility formula + Glickman's volatility tuning + what the system constant represents.
- Request for one singular markdown file consolidating the session for coding-agent handoff (college football imminent).

### Key Technical Points Delivered
- **Idle step**: Zero-game player — rating unchanged, sigma unchanged, `rd' = scale * sqrt((rd/scale)^2 + sigma^2)`. No volatility solve. No division by `v`. Parallel path untouched.
- Canonical self-check: parallel 1464.05 / 151.52 / 0.059996 (matches paper to rounding); sequential 1463.79 with σ staying 0.06 (not 2).
- Tau default 0.5 is the system constant controlling volatility change rate (Glickman range [0.3, 1.2]).
- Period-parallel vs sequential updates explained; Illinois root-finding for volatility solve.

### Hermes Verification (later)
- Idle path wired in commit (rating/sigma unchanged, rd' formula, no solve). Parallel path byte-identical. Self-check + asserts pass. `python3 glicko2.py` exits 0.

---

## Phase 2 — Prediction Engine Dossier, Math, & Corrections

### Major Artifacts Shared
- Full Prediction Engine Complete Build Dossier (research, math, code, verification).
- Rating Atlas (60+ systems: BT, Elo/Glicko/TrueSkill, Dixon-Coles, Skellam, Shin, Kelly, Brier, conformal, etc.).
- FULL_STACK_DELIVERY.md series.
- Hierarchical Bayes (Gibbs) on NFL margins: HFA ~1.56 [1.54, 1.59], σ ~13.36 (validates 13.45 ladder).
- Weather covariate: wind −0.197 pts/mph (se 0.027). Intercept +1.74 is scoring-boom lag, not a per-game addend.
- Team-total sign fix, CI function issues, FLB clean (slope 0.943), temperature dose-response, motivation spots (division games tighter).

### Key Findings & Doctrine Labels
- Closing line is the best forecaster. Moat is data latency, variance quality, covariate engines, honesty infrastructure (CLV, calibration X-rays, deflated Sharpe, conformal).
- Priors vs measurements explicitly labeled (hfa=2.0 prior vs measured 1.56; wind −0.25 prior vs −0.197 measured).
- Glicko-2 language corrected to "match to rounding".
- Router cleaned to prediction-only commands (`/predict`, `/props`, `/ratings`, `/calib`, `/kelly2`, `/clv`, `/backtest`, `/xray`). Security handlers excluded.

### Self-Checks That Passed
- Shin −110/−110: z=0.0476, fair 0.50/0.50.
- CRPS 0.233695 = (√2 − 1)/√π.
- Listed −3.5, sd 13.45: cover 50%, home win 60.3%.
- Teaser (seed 7, n=20000): rho 0 → 0.468 (+114); rho 0.35 → 0.506 (−102). Correlation gap +0.038.
- Conformal N(0,1) coverage ~0.91.
- Bivariate Poisson examples.

---

## Phase 3 — Warehouse, Book Lanes, Fantasy Recon, Novig, PFR

### Fantasy Tooling Recon v2
- MyFantasyLeague export API (keyless JSON: players, ADP).
- FantasyFootballCalculator ADP API (keyless, multiple formats).
- FantasyPros consensus parseable.
- Cross-source ADP panel as TRANSFER diagnostic only (z-deviations; never into win prob or μ).

### Novig
- Peer-to-peer order-book structure explained (Take/Make on outcomeId, no pregame house vig).
- Public daily CSVs at data.novig.com (keyless). Harvest: 168,559 market rows for 2026-10-08, OHLC mid = mean(O,H,L,C), no de-vig. Tape of 602k trades.
- Live order book still requires signed key. Remains STRUCTURE-ONLY / diagnostic reference. Never replaces Pinnacle close.

### Book Adapters
- Caesars: no public API; browser/aggregator.
- BetMGM: browser-lane (keyless 403).
- Fanatics: browser-lane only.
- All end with warehouse key rule `(game_id, book, market, observed_at)`, `observed_at ≤ t`.

### PFR Full Map & Recipe
Seven surfaces, one ID system:
- Player pages: YBC, YAC, broken tackles, ADOT, drops, etc.
- Team season pages: PFR expected points.
- Boxscores: officials, stadium, weather, Vegas lines (comment handling).
- Coach pages: W/L, SRS, challenge counts.
- Draft + CFB sibling.
- Full browser-lane extraction recipe (`pfr_pull.py` skeleton with polite delays, data-stat extraction, HTML-comment unwrap).

### ADP Panel v1
- FFC half-vs-PPR format gaps (McBride −15.6, Aubrey −13.8, Waddle +8.4). Diagnostic only. Zero weights.

---

## Phase 4 — 19-Rule Doctrine as Code

### The 19 Rules (Implemented and Self-Checked 19/19 PASS)
1. Point-in-time warehouse (`Warehouse.asof(t)` only read path).
2. Pinnacle close = permanent anchor (`Anchor.propose_mu` only on PROMOTED verdict).
3. College fit on college rows only (`CollegeGuard` blocks NFL constants by key and by value).
4–5, 8, 12–14. Diagnostic/context roles (`FeatureRegistry.margin_head_inputs()` returns production only).
6. Shin closed-form primary; multiplicative only on sub-1; pools require calibration history.
7/17. Injury/latency hard bounds; after-t rows worthless.
9. CLV ledger primary; backtest alone never promotes.
10. ADP isolation (`ADPGuard` feeds rankings_diagnostic ONLY).
11. Novig ≠ close.
15. Founder gate (n≥100, Brier≤0.22, ECE≤0.05, 3 consecutive green).
16. Kill ledger append-only, hash-chained, tamper-evident.
18. σ proposals require PROMOTED verdict covering exact proposal.
19. Honesty gate unbypassable (manifest sha-frozen; tamper voids; forged verdicts refused).

**Refusal chain**: raw data → stamp → Warehouse → declare role → beat Gaussian-close CRPS on frozen walk-forward → PROMOTED verdict + live CLV → promote. Everything else raises. One invented number is impossible.

Artifacts: `doctrine.py`, `doctrine_selfcheck.py`, `DOCTRINE_19.md`, `kill_ledger.jsonl`.

---

## Phase 5 — CFB Separate Engine & Book Anatomy

### CFB Engine (CollegeGuard-clean)
- Spread σ **15.15** (NFL 13.45).
- Total σ **15.81**.
- HFA **4.32** (NFL 1.56).
- Close CRPS **8.3314** frozen bar on 2026 wks 1–6 holdout (n=283).
- Point-in-time Colley from `asof(kickoff)`.
- CFBD spread is away-perspective (fixed).

### PPA Challenger
- k=5.55 pts/PPA.
- Frozen wk-6 gate: **REFUSED by 0.026** (7.5272 vs 7.5057).
- Pooled 2026 (n=232): close+PPA wins by 0.0432 CRPS (t=+1.83). Edge in cold-start weeks 2–3. Diagnostic with reopen condition (t≥1.96 on locked folds).

### Book Anatomy (4 seasons)
- DraftKings: 4.19% engineered constant hold.
- Caesars/WH: sharpest close (CRPS 8.335).
- Favorite-longshot tax ~3.0 pts from favorites vs 1.2 from dogs.
- Kalshi: exchange, 1¢ walls, 1.43¢ taker fee at mid.

### Methodology Highlights
- |3|+|7| = 18.6% of CFB games (keys ≠ NFL).
- Blowout tax: 31+ favorites beat close by +2.84 to +3.08.
- CFB bye effect **DEAD** (+0.01 vs NFL −2.33) — empirical proof of Rule 3.
- Long travel >1000 mi near-signal (+1.20, t=1.92).
- Recruiting capital: honest null vs close (slope −0.08 pts/100 gap, t≈−0.5). Belongs in prior.

---

## Phase 6 — Prop Engines, Tendencies, Flow Pump, NFL Context

### DK CFB Prop Engine Clone
- Ladder math identical; fed with empirical CFBD distributions + position-level tail corrections.
- σ medians: pass 74.8, rush 33.0, rec 32.5.
- DK σ / empirical σ ≈ 0.94 (6% tighter).
- Divergence-ranked edge sheet. Kill test pre-registered (weekly cadence + graded outcomes). Diagnostic only.

### PBP Tendencies (126,362 plays, 2026 wks 1–6)
- 4th-down aggression: Vandy/FAA .889 vs Wyoming .000 (z−3.12).
- Tempo: Auburn 27.0 s/play → Wisconsin 34.6.
- Halftime adjusters: Texas Tech +13.8 best; USC/Miami −12.0.
- All registry-pathed, diagnostic, unweighted.

### Flow Pump (L4)
- Live: 5,190+ latency-stamped rows (CFBD + Kalshi + Pinnacle).
- First-mover diffing verified. Move-leadership dataset CFBD cannot provide.

### NFL Deep Context
- Weather (549 outdoor): wind 15+ mph = total −5.41 vs mild (prior −3.0).
- Rain −1.31, cold −2.36. Residual-vs-close queued.
- Rest/travel measured raw; residual versions pending line history.

---

## Phase 7 — Bus State & Kill Ledger

**Commit chain (verified):**
`b9a36b133` → `ff65975ef` → `c6a160566` → `58b4818f3` → `97176f72b` → `20c182d97` → `311bcadda` → `b0e820210` → `bd6348e7c` (and later advances).

All under `docs/research/2026-10-09/rating-atlas/minis/`. Research path only. Parent preserved. Blobs verified. Kill ledger chain intact with reopen conditions on every refusal.

**Standing bars:**
- CFB close CRPS 8.3314 (2026 holdout).
- NFL Gaussian-close baselines recorded (e.g., totals ~7.41 with σ 13.19).

---

## Phase 8 — Week 5 Intel (Diagnostic Only)

High-signal items extracted for warehouse ingest with `observed_at` stamps and FeatureRegistry roles (diagnostic/context only):

- PHI fire sale (Jurgens, Lane Johnson retired, A.J. Brown, Barkley IR likely).
- Lamar ankle multi-week; Huntley likely.
- CIN Chase concussion vs practicing conflict (latency test case).
- Cheap QB: Brissett $5.5K multi-source.
- RB: Chase Brown vs MIA, Taylor matchup-proof, Braelon Allen, etc.
- WR: Michael Wilson chalk, Amon-Ra, Nico Collins, Nabers.
- TE: Likely, Fannin, McBride.
- Situational: Philly crumbling, Bowden Cowboys NFC East, CFB lines (UGA@Bama flip, etc.).

None reach margin head without HonestyGate PROMOTED + live CLV. College items behind CollegeGuard.

---

## Current Queue (Pre-Registered, Gate-Ordered)

1. Cold-start PPA overlay (wks 1–3 only) through walk-forward gate.
2. Both-sides DK harvest → true EV rows on edge sheet.
3. Residual-vs-close framing for every PBP tendency (FBS-only re-run first).
4. Travel × altitude interaction; blowout-tax μ-shift as registry candidates.
5. Pump cadence automation (more stamped rows).
6. Weekly prop-drift tracker + CLV test.
7. FD/Caesars/Circa engine clones (browser lanes).
8. Totals-by-class ladder.

**The gate is code. The close moves only when the evidence does.**

---

## Lessons Encoded

- Subagent caps require disk-verify + own-run of deliverables.
- Workspace wipes recovered via shared mirror (now doctrine).
- CFBD spread is away-perspective — orient by moneyline or lose ~13 points of σ.
- Within-class close variation masquerades as distribution-shape edge — residualize per-game.
- Probit slope sign and DK in-page fetch encoding gotchas documented.
- One invented number remains sabotage — and now raises.

---

*End of compiled session. All work research-path only. Doctrine held. No production scoring. College separate. μ = close until beaten on locked walk-forward.*

---

## Appendix A — Complete Artifacts Directory Catalog (as of 2026-11-05)

Every file and folder currently present under `/workspace/artifacts/`. This is the physical inventory the session produced or referenced.

### Root-level files
- `GROK_BUILD_PROMPT.md` — Deep research prompt for Google Deep Research covering the full engine stack.
- `GSE_BLUEPRINT_EXPANDED.md` — Expanded engine blueprints with football-dimension engines, OL/DL attribution, scheme/coverage, coaching, ADP panel, Novig zero-vig.
- `GSE_Full_Session_2026-10-09_to_11-05.md` — This document (narrative + catalog).
- `LOOP6_DELTA.md` — Delta notes from loop 6 research pass.
- `PFR_PULL_RECIPE.md` — Full browser-lane recipe for PFR advanced tables (YBC/YAC/broken tackles, data-stat extraction).
- `SESSION_LEDGER_2026-10-09.md` — Session ledger from 2026-10-09.
- `V7_AUDIT.md` — Audit notes (v7).
- `engine_math.py` — Core math library (devig family, BT/Elo, Dixon-Coles, Skellam, Kalman, CRPS/PIT/Brier, etc.). Pure stdlib.
- `novig_ingest.py` — Keyless Novig CSV harvest function (trades + markets → warehouse rows).

### `gse-rating-engines/` (skill package)
- `SKILL.md` — Skill definition for rating engines.
- `CHANGELOG.md`
- `evals/evals.json`, `evals/triggers.json`
- `references/conventions.md`, `references/taxonomy.md`
- `scripts/engine_math.py`, `scripts/props_optimizer.py`

### `rating-atlas/` (research packet mirror)
**Docs:**
- `README.md`, `AGENT_BOARD.md`, `AGENT_FILES.md`, `ATLAS_STATUS.md`
- `AUDIT_RERUN.md`, `CFB_MODEL_DECISION.md`, `CODING_AGENT_HANDOFF.md`, `CODING_AGENT_PROMPT_EXACT.md`
- `DEEP_RESEARCH_AUDIT.md`, `DEEP_RESEARCH_PROMPT.md`, `DOSSIER_AUDIT.md`, `DOSSIER_RECONCILE.md`
- `FIT_CANDIDATES.md`, `GLICKO2_DEEP_RESEARCH_PROMPT.md`, `INTELLIGENCE_MARKS.md`, `KILL_LEDGER.md`
- `SESSION_NOTE_2026-10-09.md`, `cfb_2026-10-10.md`, `cycle_ledger.md`, `props_command_patch.md`

**Code:**
- `engine_math.py`, `glicko2.py`, `glicko2_idle.py`
- `props_optimizer.py`, `team_total_and_intervals.py`, `analyze_intervals.py`
- `run_cycle.py`, `verify_claims.py`

**Bus ticket:**
- `bus-ticket/TASK.md`, `bus-ticket/status.json`

### Other directories
- `browsed_files/` — Cached page content from browser tools.
- `__pycache__/` — Python bytecode (ignored).
- `.tmp/` — Temporary MCP results (ignored).

---

**Inventory note:** All research-path material. No production paths, no MODEL_VERSION, no Stripe. Doctrine held. College remains separate. μ = close until beaten on locked walk-forward.

*Catalog appended 2026-11-05.*
