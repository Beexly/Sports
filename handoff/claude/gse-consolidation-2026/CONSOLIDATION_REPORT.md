# Consolidation Report (2026-06-13)

Branch: `claude/eloquent-goldberg-der80z`
Base at start: `aa1630b` (= GitHub `main` HEAD; PR #17 already merged)

## Goal

Garrett's directive: *"I don't want to ship just to get live. I want ALL of our
improvements / adjustments into the design before we say finished."* So this was
a consolidation pass, not a minimal ship: bring every shippable stream together,
keep every gate green, and clearly separate owner decisions from engineering.

## What was integrated

### 1. StatKing + visual uplift  (branch `friendly-fermat-fy99m2`) — FAST-FORWARD
`friendly-fermat` was a clean **superset** of the launch line (HEAD + 9 commits,
0 behind), already verified green last session. Fast-forwarded in with zero risk.
It brings:
- 30 StatKing stub pages built into real, snapshot-backed surfaces
- 32 pages rewritten on a premium component system (HeroStat, BarChart,
  ScoreRing, InsightCard, DataTable, StatusRibbon, FilterBar)
- admin cockpit auth guards, SEO metadata, wired filters
- **This also supersedes PR #19** — friendly-fermat already contains PR #19's
  head commit *and the fixes* that resolve the typecheck breakage PR #19 admitted.

### 2. PR #18  (branch `wonderful-ptolemy-qh7pnq`) — MERGED with conflict resolution
Brings NFL House, analyst voice / reader registers, Market Gravity Index,
Simulation Cloud, Protection Stress index, Line Death Clock pp/hr rate, the
Academy doorway, community moderation policy v1, and the Jeff Mans rights entry.

vs the launch line it was only **5 unique commits / 20 files** (its PR body's
"~80 commits" is relative to an old base). 14 files auto-merged; **6 were
parallel-divergent** and resolved on their merits:

| File | Conflict | Resolution |
|---|---|---|
| `packages/prediction-engine/src/market-read.ts` | HEAD added `fairHomeProbsByBook` (per-book samples); PR#18 added `homeProbDispersion` + `marketGravityIndex()` | **Kept both** — they are complementary. Gravity uses dispersion; the cloud uses the samples. |
| `components/observatory/simulation-cloud.tsx` (add/add) | HEAD = data-backed per-book dots; PR#18 = illustrative Poisson teaching tool. Same name, **two contracts** (page wants no-props; fair board wants props). | **Split into two components**: `SimulationCloud` (illustrative Poisson, on `/observatory`) + new `MarketCloud` (data-backed dots, embedded in the Market Fair Board). Distinct `data-testid`s, both survive. |
| `components/observatory/market-fair-board.tsx` | footer text + cloud import | Points embedded cloud at `MarketCloud`; footer unions the cloud note + Line Death Clock pp/hr note. |
| `components/parlay/parlay-genome.tsx` | "Correlation" vs "Dependency" label | Kept HEAD's numeric **Dependency Coefficient** (more advanced). |
| `__tests__/simulation-cloud.test.ts` (add/add) | two test suites | Combined: `cloudGeometry` (→ MarketCloud) + `scoreDistribution` (→ SimulationCloud) + both surface-wiring blocks. |
| `docs/strategy/vision-tracker.md` (9 blocks) | parallel status ledgers | Reconciled to true merged state (both clouds shipped; Gravity/Protection-Stress/Line-Death-Clock now genuinely DONE). |

Targeted tests for the resolved cluster: **49 passing** (14 prediction-engine + 35 web).

### 3. Strict-type pass on StatKing surfaces
The StatKing pages carried **24 `no-explicit-any`** warnings (failing
`eslint --max-warnings=0` and the CLAUDE.md "no any" rule). Fixed with real
types — index signatures on the JSON-snapshot interfaces, typed shared
components, typed map callbacks — **no suppressions, no behavior change.**

## What was deliberately NOT merged

| Item | Why |
|---|---|
| **PR #19** (StatKing, codex, draft) | Superseded — already inside friendly-fermat *and fixed*. Merging it would reintroduce its typecheck breakage. |
| **PR #2** (operator-doc guard) | Stale — based on a pre-reconciliation point; its only unique artifact is one doc-test asserting old playbook text. Its branch is a 1,158-file divergence (shallow-clone, no clean merge-base). Marginal value, high risk. |

## OWNER DECISION required (not mine to make)

**PR #14 — pricing model fork.** It proposes **weekly billing**
($14.99 / $21.99 / $49.99 per *week*) **+ a new VIP tier**. The current live
source of truth (`apps/web/lib/pricing/pricing-phases.ts` + `CLAUDE.md`) is the
**monthly** named ladder (Pro $14.99/mo, Elite $24.99/mo, Founding→Proven→
Established→Authority; no VIP). These are mutually exclusive, pricing is an
owner-only action, and merging PR #14 would *revert* the more-evolved phase
ladder. **Left for Garrett to decide as a deliberate migration, not a merge.**

## Branch landscape note

~50 branches exist; the vast majority (`magical-volta-*`, etc.) are superseded
autonomous-loop iterations already absorbed into the launch lineage via the
prior reconciliation sweeps ("drift absorbed, nothing missing"). The open PRs
were the explicit integration scope and are all accounted for above.

## Known follow-up (pre-existing, low-visibility)

A few admin-only StatKing tables (`source-crm`, `source-graph`) read field names
that don't match the snapshot shape and render blank/zero. Not introduced here;
behavior was preserved. Tracked for a data-contract pass.
