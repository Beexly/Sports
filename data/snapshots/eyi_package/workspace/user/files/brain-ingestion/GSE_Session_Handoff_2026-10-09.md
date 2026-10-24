# GSE Session Handoff: 2026-10-09

Prepared for Garrett (G). Single source file to hand to a coding agent at the start of the next session. Items marked UNVERIFIED were not confirmed against a primary source or run. Secrets are intentionally excluded.

## 0. Read this first

- Football kickoff is hours away. The priority is a working rating path, not more research.
- Glicko-2 canonical example re-run this session (double precision, tau = 0.5): rating 1464.050671, RD 151.516524, volatility 0.059996. Matches the packet. The paper's 1464.06 is display rounding, not an algorithm defect.
- Idle-period RD step is NOT wired on the remote branch (commit 744d89fb is a kill-ledger update only). This is Task 1 and it is open.
- Earlier chat claims that Task 1 and Task 2 were "done" were checked and are false. See section 6.
- Do not touch `main` (e1260ae), `packages/`, Stripe, trust gates, `MODEL_VERSION`, or `publishes_pick`.

## 1. Glicko-2 explained

### 1.1 Scale conversion

Glicko-2 works on an internal scale. Convert the displayed rating r and RD to mu and phi:

- mu = (r - 1500) / 173.7178
- phi = RD / 173.7178

Convert back at the end: r' = 173.7178 * mu' + 1500, RD' = 173.7178 * phi'.

### 1.2 Per-period procedure (parallel update, one rating period)

For each game against opponent j with opponent rating mu_j, opponent deviation phi_j, and score s_j (1 win, 0 loss, 0.5 draw):

1. g(phi) = 1 / sqrt(1 + 3 phi^2 / pi^2)
2. E(mu, mu_j, phi_j) = 1 / (1 + exp(-g(phi_j) (mu - mu_j)))
3. Estimated variance: v = [ sum_j g(phi_j)^2 E_j (1 - E_j) ]^(-1)
4. Estimated improvement: Delta = v * sum_j g(phi_j) (s_j - E_j)
5. Volatility update (the only iterative step). Let a = ln(sigma^2) and define

   f(x) = e^x (Delta^2 - phi^2 - v - e^x) / (2 (phi^2 + v + e^x)^2) - (x - a) / tau^2

   Find the root x = ln(sigma'^2) with the Illinois (regula falsi variant) method, convergence tolerance epsilon = 1e-6. Bracket start: A = a; B = ln(Delta^2 - phi^2 - v) if Delta^2 > phi^2 + v, otherwise B = a - k tau for the smallest k >= 1 with f(a - k tau) < 0. Then sigma' = exp(A / 2) at convergence.
6. Pre-update deviation: phi* = sqrt(phi^2 + sigma'^2)
7. New deviation: phi' = 1 / sqrt(1 / phi*^2 + 1 / v)
8. New rating: mu' = mu + phi'^2 * sum_j g(phi_j) (s_j - E_j)

### 1.3 Idle periods (no games in the period)

Glickman's rule: rating and volatility stay unchanged, and only uncertainty grows:

- phi' = sqrt(phi^2 + sigma^2)
- No volatility solve. No division by v.

With RD = 200 and sigma = 0.06 (values computed and checked this session):

- 1 idle week: RD 200.27
- 4 idle weeks: RD 201.08
- 17 idle weeks: RD 204.57

The current glicko2.py does not do this for teams with zero games in a period. Teams that sit out (NFL bye) are left unadjusted. The impact per bye is about 0.27 RD points.

### 1.4 Canonical example

Active player: r = 1500, RD = 200, sigma = 0.06, tau = 0.5. Opponents in one period:

- (1400, RD 30), win
- (1550, RD 100), loss
- (1700, RD 300), loss

Result in double precision: r' = 1464.050671, RD' = 151.516524, sigma' = 0.059996. Glickman (2012) prints 1464.06 / 151.52 / 0.05999. The 0.01 rating difference is attributed to intermediate rounding in the paper. This was checked against a reference re-implementation written this session. It is not a second algorithm.

## 2. Volatility tuning and the system constant tau

- tau is the system constant. It constrains how much volatility can change per period.
- Glickman's guidance: typical values between 0.3 and 1.2. Smaller tau means volatility moves less. Larger tau allows more movement.
- The canonical example uses tau = 0.5.
- Volatility sigma starts at a prior (0.06 in the example). It is not a free fitted parameter in this codebase.
- Packet claim (UNVERIFIED by a fit in this session): on a 17-game NFL schedule, the profile likelihood for tau and for sigma is flat. The packet concludes volatility is effectively an inert structural constant. Its 100-permutation test was described but its numbers were not reproduced here.
- Operational default: keep tau = 0.5 until a fit that has not been run is done. Do not treat tau as identified.

## 3. Rating-period definition for NFL (open decision)

Options, each with trade-offs:

- Week-as-period: each team plays once, so the parallel update collapses to a sequential single-game update. A season is 17 sequential updates. This is the default if nothing is chosen. It is a period-definition decision, not a code bug.
- Month-as-period: about 4 games per period. Closer to Glickman's 5 to 15 games-per-period guidance is not met either, so this is a judgment call.
- Season-as-period: one update per season against preseason ratings. Discards in-season responsiveness.

Human decision needed: pick the period definition and whether to apply the idle-period rule (section 1.3) to byes. Recommended: wire the idle rule regardless, since it is correct under any choice.

Command named in the packet, `data.analyze_glicko_period`, does not exist. Do not wire it as described.

## 4. Glicko-2 status and tasks

Verified state on research/rating-atlas-2026-10-09-packet:

- glicko2.py blob is 0e24548f. No idle path. Canonical asserts present. Idle RD assert not present.
- BOARD.md is c5148f25. The board append is not committed.
- Ticket folder bus/gse/claimed/rating-atlas-idle-2026-10-09/ exists, but status.json still reads state: open, fence: 0, lease_holder: null. This is NOT a claim. Fix the status or move it back to inbox and claim it by the rule.
- cfd5786c1 does not exist on Sports.

Remaining work, in order:

1. Wire the idle step into glicko2.py. Zero-game player: rating unchanged, sigma unchanged, phi' = sqrt(phi^2 + sigma^2). Do not solve volatility. Do not divide by v. Leave the parallel path unchanged. Add the idle assert (RD 200 with sigma 0.06 gives 200.27). Acceptance: `python3 glicko2.py` prints 1464.05 / 151.52 / 0.059996 and exits 0.
2. Commit the BOARD.md append. Do not rewrite the file.
3. Fix the bus claim: state claimed, lease_holder set, fence 1, heartbeat_at set, attempt 1. On done, RESULT.md needs receipt, action_dependence, response_validity, then move to done/.
4. Do not touch main, packages/, Stripe, trust gates, or MODEL_VERSION.
5. Do not create an agent. Budget stays 2.

Working rules: Shin is closed-form and working. Glicko is match-to-rounding, not exact. Sequential updates are not canonical. The teaser ticket is plus money at 46.8%, not -155. Posterior intervals are draws, not mean CIs. Hermes is still wrong on the status claims above.

## 5. Engine and research status

### 5.1 Rating and probability engines (research packet, not production)

Class ladder reported: data, devig (multiplicative and Shin), Bradley-Terry and Elo, Dixon-Coles and normal-margin ladders, calibration (Platt, temperature, beta, PAV isotonic), market-stack, Kelly sketches, props (negative binomial, bivariate Poisson, copula joints, Bayes shrinkage), CRPS and PIT, deflated Sharpe, CLV ledger, in-game sqrt-time repricing.

Key facts from runs in the session:

- Shin devig (closed-root form): -110/-110 gives z = 0.0476, 0.50/0.50. Do not restore the old quadratic (z collapses to 0).
- Teaser: 6-point 2-leg crossing 3 and 7, book -110. Fair -155 if games are independent, fair -127 with 0.35 market correlation. A 28-point swing from correlation alone. Independent sampling is a silent mispricing.
- Backtest NFL 2025 weeks 1 to 6 (expanding window, SRS ensemble): 93 games, 77 predictions. Brier 0.2868, CRPS 10.607, pick accuracy 0.558. Temperature refit T = 7.512 improves Brier to 0.2464. PIT max deviation 0.082 (GOOD).
- Market hold observed (Shin plus multiplicative): moneyline about 4.2 to 4.5 percent, spread about 4.6 to 4.8 percent, total about 4.6 to 4.8 percent.
- CLV ledger (8 bets): average CLV -2.70 percent, beat-close rate 25 percent, t-stat -1.93 (not significant at n = 8). Settled P&L +1.19u. P&L on negative CLV is luck, not edge.
- Simultaneous Kelly on three correlated props: naive stakes overweight the correlated slate. Optimizer prices the correlated leg out at high correlation.
- Risk of ruin on optimized fractions: p_ruin 0.252 on the 200-round simulation (floor 50). Treat as a warning, not a validated number.

Known wrong or unresolved:

- Hermes "DONE" claims for Task 1 and Task 2 were false (see section 4).
- Kalman, teaser copula, CRPS, HMM, Shin: sketches, not production.
- Dixon-Coles time decay (xi) is in the atlas, not the code.
- Pinnacle prices are not unlocked. CLV tracker is the next build.

### 5.2 Literature and closing-line position (from the research brief)

- Closing line is the bar. Cost stays zero. Stack uses SQLite, no GPU, no production displacement.
- Situational covariates (travel, timezone, altitude, rest) appear priced in by the close per the brief's regression. UNVERIFIED by this session.
- Production home field remains 0.025 EPA/play. Tau stays 0.5.
- Production EPA models are not displaced by Glicko-2.
- Paper verdicts from the brief are NOT verified. Specific citation claims in the brief were flagged as wrong and must not be cited from the brief. For example, the brief's Kaunitz 2017 description was not verified and the ledger IDs for the five "priority ports" were swapped. Do not wire those ports until re-checked.
- Five unwired research ports named in the brief (verify IDs before use): disagreement-weighted pooling (entropy-based log-linear pool), drawdown-constrained Kelly, adaptive conformal inference under shift, James-Stein drive-EPA shrinkage, bivariate Poisson covariance for totals.
- ADAPT/REJECT counts and wired/unwired counts from the brief were not verified and are not reported here.

### 5.3 Open gaps (stack gap board from the brief, status as stated there)

- ci() sample division bug in analyze_nfl.py (OPEN)
- Kalman docstring mismatch (OPEN)
- Part 5 sigma row and manifest claim of exact Glicko-2 match (OPEN, fix to "match to rounding")
- EPL Ipswich unseen-team dictionary key fallback (OPEN)
- Weather OLS data schema join (OPEN)
- Reverse line movement source (KILLED)
- 10 Hz player tracking (KILLED)
- Missing 2024 NGS release (OPEN)
- Historical EPA and contract joins (OPEN)
- Proprietary metrics PFF and DVOA (KILLED)
- Team-conditioned KN total repricing (OPEN)
- Unverified NFL fatigue curve (OPEN)
- Missing market prior in NFL backtest (OPEN; integrate stack_with_market(p_model, p_market, w=0.3))

### 5.4 Governance decisions still needed (Garrett)

- Market-prior blend: pure fundamental ratings vs enforced blend with closing lines.
- Interval reconciliation: replace mean CIs with true posterior draw intervals globally.
- Glicko-2 period definition and volatility freeze (section 3).
- Paid API gate: no paid odds APIs until CLV ledger shows at least 500 settled wagers with significant positive CLV.
- Scope: whether modeling focuses on derivatives and props, treating main lines as anchors.

## 6. Corrections to earlier chat claims

- Claim: Task 1 done in 744d89fb. False. That commit is the kill-ledger update only.
- Claim: Task 2 done in cfd5786c1. False. That SHA does not exist on Sports.
- Claim: Task 4 board append done. False. BOARD.md is c5148f25.
- Claim: Task 5 ticket claimed. Half-done and broken. Status file still open.
- Claim: Glicko "EXACT" match. Corrected to match-to-rounding.
- Claim: sequential updates are canonical. Not canonical.
- Claim: Shin falls back to multiplicative. The closed-root Shin is on the branch. Sub-1 books still fall back.
- Claim: teaser ticket -155 to -127. Corrected as above.
- Claim: idle intervals and mean-CI intervals. Replaced by draw intervals.
- Claim: "+1.74 as an addend" and "RDS-only". Not current state.

## 7. Funding and business items (from this session)

Funding brief (Oct 9, 2026). Deadlines as published; confirm on each application page.

- PeopleFund Small Business Accelerator (Texas CDFI): $3K to $5K grant on graduation. Deadline Oct 12, 2026. First-come, 70 spots. Strongest Texas match.
- Hello Alice Main Street Rising Houston pitch: $1,000+ prize. Deadline Oct 28, 2026. Event Nov 10, The Ion, Houston.
- Breva Thrive Grant: $5,000, quarterly. Deadline Oct 31, 2026. Direct link UNVERIFIED (rules PDF confirmed).
- 2Gether-International Tech Cohort: 10-week accelerator for disabled founders, $10K seed pitch. Rolling. Confirm eligibility.
- Y Combinator W27: $500K (125K for 7% plus 375K MFN SAFE). Deadline Nov 2, 2026, 8pm PT. Low acceptance rate.
- Anthropic Claude Startups: $50K+ in perks, free, no equity. Official page UNVERIFIED.
- Microsoft for Startups Founders Hub: up to $150K Azure credits. Rolling.
- LiftFund (Texas CDFI): microloans and grant cycles, $2,500 to $25,000.
- Antares REACH grant (UNVERIFIED status). NASE Growth Grants (membership required). Google for Startups Cloud Program (UNVERIFIED direct link).
- SBA does not give grants to start or expand a business. Anyone advertising SBA grants is a red flag.

## 8. Other items noted in session

- Research compendium (45 days) reported complete. It flags: the REA tool was wiped in a VM swap and needs reinstall before reverse-engineering work; there are live keys in an agent-bus brief that need rotation (values not reproduced here; rotate them).
- Garrett-only actions (per the compendium): 23 items requiring his own taps (Stripe, keys, sign-ins). Get that list from the compendium.
- Sports Intelligence OS and Intel bot outputs are research outputs, not production picks. Nothing in this session publishes picks.

## 9. Coding conventions for the next agent

- Week-Saver mode: before editing, list target files, why each matters, intended change, risk level, and the smallest validation command.
- Touch at most 5 files without asking. Small, reversible changes only.
- Stop and ask before changing schema, auth, payments, security, production behavior, or architecture.
- After each task report: files changed, behavior changed, validation run, validation result, remaining risk, next safest step, working-memory summary.
- Validation commands: `python3 glicko2.py` (expect 1464.05 / 151.52 / 0.059996, exit 0); `python3 scripts/engine_math.py` self-check; `python3 scripts/props_optimizer.py` self-check.
- Do not cite paper verdicts from the brief. Re-verify before acting.
- Do not use bash-only Glicko shortcuts for the parallel path. Idle path is separate.

## 10. Sources and provenance

- Glickman, M. E. (2012 onward), Glicko-2 rating system specification and worked example. Formulas in section 1 follow the published specification. Canonical example values verified by re-run this session.
- Shin, H. S. (1993), insider-trading devig model. Closed-root form used by the packet.
- Research packet: docs/research/2026-10-09/rating-atlas/ (glicko2.py blob 0e24548f; engine_math.py; props_optimizer.py).
- Research brief: GSE Prediction Engine and Glicko-2 Implementation Audit (2026-10-09). Paper verdicts UNVERIFIED.
- Funding brief: Oct 9, 2026, Instagram and public social sweep plus official program pages.
