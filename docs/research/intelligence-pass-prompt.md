# Galaxy Sports Edge — Intelligence Pass

You are reviewing Galaxy Sports Edge (galaxysportsedge.com), a sports prediction and fantasy platform. The codebase is at `C:\Users\Garrett\Sports-worktrees\astra-2026-09-14`. Read `AGENTS.md` first — it carries the full system context, laws, and session history.

This is NOT a code-review or audit. You are here to use your reasoning to find what we're missing, what we're doing wrong, and what could be dramatically better. Another agent will implement your recommendations. Your job is to THINK.

---

## What the product does

GSE scores sports betting markets and fantasy decisions. It publishes picks it stands behind, passes on ones it doesn't (with reasons), and grades everything in public. The core claim: we don't lie about our own performance.

Key surfaces:
- `/board` — every game scored today, what we're on, what we passed on
- `/picks` — published picks with line, timing, reasoning
- `/calibration` — public record: Brier, ECE, win rates, CLV
- `/fantasy` — start-sit, waivers, trades, DFS optimizer, pick'em
- `/players` — player lab with GSE Score ranking
- `/founder-picks` — owner's personal calls on the same honest record

---

## What to examine (in priority order)

### 1. Calibration mathematics

The calibration system is the product's credibility. Current state:
- Floors: n>=100, Brier<=0.22, ECE<=0.05 (debiased)
- Selective path: delta=0.1, rank on marketFairProb
- Skill metrics: Brier Skill Score, Negative Log Likelihood, Murphy decomposition (REL/RES/UNC), null-band ECE
- Pushes excluded from win rates
- Published line snaps to nearest book quote (not consensus mean)

Files to read:
- `apps/web/lib/calibration/compute.ts`
- `apps/web/lib/calibration/skill-metrics.ts`
- `apps/web/lib/calibration/calibration-eligibility.ts`
- `apps/web/lib/ops/per-market-gate.ts`
- `packages/prediction-engine/src/published-line.ts`
- `docs/ops/CALIBRATION_ECE_ESTIMATOR_2026-09-09.md`

Questions to answer:
- Is the debiased ECE estimator correct? The plug-in noise subtraction `max(0, raw - noise)` — does it over-subtract when a real gap exists? Is there a better estimator?
- Is the selective gate (delta=0.1 on marketFairProb) the right structure? What would a Bayesian approach look like?
- Are we using the right proper scoring rules? Should we add CRPS or log score to the public surface?
- The market's own price (marketFairProb) is the best-calibrated forecaster (Brier 0.197 vs 0.231 for confidence on 469 rows). What does this tell us about our model architecture?
- CLV beat-close is 23% vs 52.4% required. This is the ESTABLISHED blocker. What's the actual root cause? Is it the line timing, the market efficiency, or our selection bias?

### 2. DFS optimizer correctness

The optimizer uses exact dynamic programming over (roster-slot fill state) x (salary bucket). It's provably optimal for the given objective.

Files:
- `apps/web/lib/fantasy/dfs-optimizer.ts` (the DP solver)
- `apps/web/lib/fantasy/dfs-slate.ts` (player pool, leverage calc)
- `apps/web/components/fantasy/dfs-optimizer.tsx` (UI)
- `apps/web/components/fantasy/projections-table.tsx` (LineStar-parity table)

Questions:
- Is the leverage formula correct? `leverage = ceiling / (proj * own)` — does this properly capture contrarian upside?
- The QB stacking constraint runs one solver per candidate stacked team. Is there a more elegant formulation?
- Cash mode maximizes projection (median). GPP maximizes ceiling. Is ceiling the right GPP objective, or should it be something like top-percentile of simulated outcomes?
- Exposure control: maxExp is a 1-100% cap per player across generated lineups. Is the current implementation (greedy rejection) optimal, or should it be integrated into the DP?
- What's missing vs LineStar? They have: Consensus, Cons Diff, AlertScore, SIC Score, Safety, Imp Pts, vs Pos rank, Range (floor-to-ceiling spread). Which of these would actually improve lineup quality?

### 3. Player ranking system (GSE Score)

GSE Score (0-100) is the player ranking. LIVE reads processGrade from nflverse. SAMPLE is pool percentile.

Files:
- `apps/web/lib/fantasy/gse-score.ts`
- `apps/web/lib/nflverse/expected-metrics.ts` (GSE-CPOE, GSE-RYOE, GSE-xYAC)
- `apps/web/lib/nflverse/next-gen-stats.ts` (NGS ground truth)

Questions:
- Is pool percentile the right SAMPLE ranking? What about a z-score or percentile-of-position?
- The expected-metrics module fits its own CPOE/RYOE/xYAC models on nflverse play-by-play and proves them against NGS. Is the fitting approach (linear regression on play features) adequate, or should it be gradient-boosted?
- How should GSE Score compose with salary for DFS value? Currently `value = proj / salary * 1000`. Is points-per-$1k the right value metric?

### 4. Visual design and motion

The Field visual system: near-black ground (#08090C), bone text (#EDE8E0), one ember signal (#FF4D2E). Five nav destinations (trimmed to four: Board / Players / Fantasy / GSN).

Files:
- `apps/web/styles/design-tokens.css`
- `apps/web/tailwind.config.ts`
- `apps/web/app/page.tsx` (homepage)
- `apps/web/app/board/page.tsx` (board)
- `apps/web/components/landing/field-board-ticker.tsx` (ticker)
- `apps/web/components/landing/door-card.tsx` (homepage doors)
- `apps/web/components/motion/` (all motion components)

Questions:
- The ticker runs at 90s for the full loop. Is that readable? What's the optimal speed given typical line lengths?
- The homepage hero uses a canvas animation (FieldHeroCanvas). Does it compete with the content or enhance it?
- The board page has a cinematic opening with radial gradients and scanlines. Is this earning its keep, or is it decoration?
- Door cards use a hover rail animation (scale-x from 0 to 1). Is the timing right?
- What ONE visual change would most improve perceived quality?

### 5. Copy and communication

Every customer-facing string must pass: "would a sharp friend who actually plays DFS say this?"

Recent changes replaced jargon: "cleared the gate" became "we're on this", "held" became "passed", "market depth below publish threshold" became "not enough sportsbooks are pricing this game yet".

Files to spot-check:
- `apps/web/app/page.tsx`
- `apps/web/app/board/page.tsx`
- `apps/web/app/picks/page.tsx`
- `apps/web/lib/board/pass-reason.ts`
- `apps/web/lib/board/gate-consumer.ts`

Questions:
- Is there remaining jargon a normal person wouldn't understand?
- Are the empty states honest AND clear?
- Does the homepage communicate what the product IS in under 5 seconds?

### 6. Data flow and factor engine

The founder-picks factor engine composes: depth chart, injury, matchup split, underlying metrics, consensus, rest.

Files:
- `apps/web/lib/founder-picks/factors.ts`
- `apps/web/lib/statcast/index.ts` (new Statcast loader)
- `apps/web/lib/nflverse/` (all NFL data loaders)

Questions:
- The factor engine treats missing data as ABSENT (never zero). Is this the right default?
- The Statcast loader fetches season-aggregate CSVs. Should it cache? What's the refresh cadence?
- Are there factors we're NOT computing that would materially improve pick quality? (e.g., weather, travel, referee tendencies, public money splits)

---

## What NOT to do

- Do not rewrite code. Describe what should change and why.
- Do not audit every file. Focus on the six areas above.
- Do not check every test. Trust the guardrails unless something looks wrong.
- Do not re-derive what AGENTS.md already documents.

---

## Output format

For each area, provide:

1. **One insight** we're probably missing (the non-obvious thing)
2. **One concrete recommendation** with enough detail to implement
3. **One risk** — what could go wrong if we change this

End with a **priority ranking** of your recommendations: what would most improve the product if implemented correctly?

Be direct. If something is wrong, say so. If something is already excellent, say that too — knowing what NOT to change is as valuable as knowing what to fix.
