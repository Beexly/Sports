# Survey Explorer 2 Handoff Report: R2 (Quant Jargon Purge) & R3 (Tier Restructuring & Elite Value Engine)

## Executive Summary
This survey provides a comprehensive audit and implementation blueprint for **Requirement 2 (Plain-English Translation / Quant Jargon Purge)** and **Requirement 3 (Tier Restructuring & Elite Value Engine)** of the Galaxy Sports Edge (GSE) architectural overhaul. All investigations were conducted in read-only mode using exact file observations, verified tests, and concrete evidence chains.

---

## 1. Observation

### 1.1 R2: Quant Developer Acronyms & Jargon in Customer-Facing Components
Across the web workspace (`apps/web`), quant developer acronyms and internal variable names are currently exposed on customer-facing cards and pages:

1. **`apps/web/components/picks/pick-card.tsx`**:
   - Line 385:
     ```tsx
     <span className="text-[10px] font-semibold uppercase tracking-wide text-orbital-cyan">
       Ranking P
     </span>
     ```
     `Ranking P` is developer shorthand for model ranking probability / sort key.
   - Line 397–403:
     ```tsx
     <p className="mt-1 text-[10px] text-ion-3">
       Market fair:{" "}
       {(breakdown.marketFairProb * 100).toFixed(1)}%
       <ValueGapBadge rankingP={breakdown.rankingP} marketFairProb={breakdown.marketFairProb} />
     </p>
     ```
     Uses informal `"Market fair:"` rather than consumer-grade `"Fair Market Value"`.
   - Line 404–408:
     ```tsx
     <DevigMethodDisclosure
       proportional={breakdown.marketFairProb}
       shin={breakdown.marketFairShinProb}
     />
     ```
     Embeds internal bookmaker margin terminology directly into public cards.
   - Line 434–439:
     ```tsx
     {typeof breakdown.independentEdge.trueProb === "number" &&
       Number.isFinite(breakdown.independentEdge.trueProb) && (
         <p className="mt-1 font-mono text-[10px] text-ion-2">
           trueProb {(breakdown.independentEdge.trueProb * 100).toFixed(1)}%
         </p>
       )}
     ```
     Exposes raw code identifier `trueProb` to customers.

2. **`apps/web/components/picks/devig-method-disclosure.tsx`**:
   - Lines 39–46:
     ```tsx
     <p className="mt-0.5 text-[10px] text-ion-3">
       Shin de-vig: {(shin! * 100).toFixed(1)}%{" "}
       <span className="text-ion-2">
         ({delta > 0 ? "+" : "−"}
         {Math.abs(delta * 100).toFixed(1)}pt)
       </span>{" "}
       — this price depends on de-vig method; we rank on the proportional number.
     </p>
     ```
     Exposes `"Shin de-vig"` and `"depends on de-vig method"` verbatim to customers.

3. **`apps/web/components/picks/verify-pick-button.tsx`**:
   - Lines 86–91:
     ```tsx
     {state.modelVersion && (
       <>
         <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ion-2">Model version</p>
         <p className="mt-1 font-mono text-ion-1">{state.modelVersion}</p>
       </>
     )}
     ```
     Renders raw internal model version strings (e.g., `"v5.2.8-edge-c3"`, `"sample-..."`).

4. **`apps/web/components/picks/evidence-audit-drawer.tsx`**:
   - Lines 375–379:
     ```tsx
     <Row
       k="Model version"
       v={audit.modelVersion || "—"}
       mono
     />
     ```
     Renders raw internal model version strings.
   - Line 148: Button label defaults to `"View evidence"`.

5. **`apps/web/components/intelligence/engine-view.tsx`**:
   - Lines 161–164:
     ```tsx
     { key: "dakota", label: "DAKOTA", align: "right", numeric: true, tooltip: "DAKOTA (EPA+CPOE composite)", sortValue: (r) => r.dakota, render: (r) => (r.dakota == null ? "—" : r.dakota.toFixed(2)) },
     ```
     Exposes acronyms `DAKOTA` and `CPOE`.
   - Lines 166–169:
     ```tsx
     { key: "wopr", label: "WOPR", align: "right", numeric: true, tooltip: "weighted opportunity rating", sortValue: (r) => r.wopr, render: (r) => (r.wopr == null ? "—" : r.wopr.toFixed(2)) },
     ```
     Exposes acronym `WOPR`.
   - Lines 329–333:
     ```tsx
     { key: "dakota", label: "DAKOTA", align: "right", numeric: true, tooltip: "DAKOTA EPA + CPOE composite", render: (r) => r.dakota.toFixed(3) },
     { key: "anyA", label: "ANY/A", align: "right", numeric: true, tooltip: "adjusted net yards per attempt", render: (r) => r.anyA.toFixed(2) },
     { key: "dakotaPct", label: "DAK%", align: "right", numeric: true, tooltip: "DAKOTA percentile within QB pool", render: (r) => r.dakotaPct.toFixed(0) },
     { key: "anyaPct", label: "ANY/A%", align: "right", numeric: true, tooltip: "ANY/A percentile within QB pool", render: (r) => r.anyaPct.toFixed(0) },
     ```
     Exposes `DAKOTA`, `CPOE`, and `ANY/A`.

6. **`apps/web/components/players/player-lab-table.tsx`**:
   - Line 174 & Line 221:
     ```tsx
     { key: "wopr", label: "WOPR", align: "right", numeric: true, sortValue: (r) => r.wopr, render: (r) => fmtDecimal(r.wopr, 2) },
     ...
     { key: "wopr", label: "WOPR", align: "right", numeric: true, tooltip: "1.5·target share + 0.7·air-yards share", render: (r) => r.wopr.toFixed(2) },
     ```
     Exposes `WOPR`.

7. **`apps/web/app/nflverse/page.tsx`**:
   - Line 178 & Line 199:
     ```tsx
     <th scope="col" className="px-4 py-3">WOPR</th>
     ...
     <td className="px-4 py-3 font-mono text-ion">{fmtDecimal(row.wopr)}</td>
     ```
     Renders `WOPR` in table headers.

8. **`apps/web/components/tracker/bet-tracker.tsx`**:
   - Line 83:
     ```tsx
     <Metric label="Brier" value={`${p.brier}`} />
     ```
     Directly labels a personal portfolio metric with the quant score name `"Brier"`.

9. **`apps/web/components/performance/calibration-panel.tsx`**:
   - Lines 305–319:
     ```tsx
     <span className="text-xs uppercase tracking-widest text-ion-2">Brier score</span>
     ...
     Model version{data.modelVersions.length === 1 ? "" : "s"}: {data.modelVersions.join(", ")}
     ```
     Renders raw `"Brier score"` and raw `"Model versions"`.

10. **`apps/web/app/board/page.tsx`**:
    - Line 294: `<StateTile label="Model" value={state.modelVersion} />`
    - Line 476: `<dd className="text-ion-1">{row.detail.modelVersion}</dd>`
    Renders raw model version strings on the primary Board route.

### 1.2 R2: Developer Telemetry Buttons & Labels
Observed literal `"JSON"` or developer-oriented links across public pages:
- **`apps/web/app/trends/page.tsx`**:
  - Line 139: `<Link href="/api/trends/nflverse-readiness" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">JSON</Link>`
  - Line 227: `<Link href="/api/trends/nflverse-preview" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">JSON</Link>`
  - Line 303: `<Link href="/api/trends" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">JSON</Link>`
- **`apps/web/app/weather/page.tsx`**:
  - Line 44: `<Link href="/api/weather/game" ...>View as JSON</Link>`
- **`apps/web/app/mlb/page.tsx`**:
  - Line 52: `<Link href="/api/mlb/teams" ...>View as JSON</Link>`
- **`apps/web/app/nhl/page.tsx`**:
  - Line 58: `<Link href="/api/moneypuck/nhl" ...>View as JSON</Link>`

### 1.3 R2: Brand Linter & Test Suite Verification
Executed commands directly:
- `npm run lint:brand`:
  - Command runs: `vitest run` on 19 brand safety test files in `apps/web`.
  - **Result**: `Test Files 19 passed (19)`, `Tests 4661 passed (4661)`. Runtime: 61.75s.
- `npm run guard:trust`:
  - Command runs: `node scripts/guardrails/trust-gate.mjs`.
  - **Result**: `[trust-gate] OK - scanned 3654 file(s); no banned phrases.` Exit code 0.
- `apps/web/__tests__/public-copy-scanner.test.ts`:
  - Enforces `readsAsCustomerCopy` and bans:
    1. Environment variables and flag names (`/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/`).
    2. Internal gate/role language (`/\bfounder[\s-]*(?:gated?|enables?|enabled|flips?|only|held|toggles?)\b/i`).
    3. Internal ticket IDs (`/\b(?:BS|OP|GSE|GSN)-\d{2,4}\b|\bT-[a-z]+-[a-z]+\b/`).
    4. Banned claims (`"guaranteed wins"`, `"we always win"`, `"100% accurate"`).
- `apps/web/lib/positioning-vocab.json`:
  - Sourced by `apps/web/lib/positioning-vocab.ts`, `apps/web/lib/trust-claims.ts`, and `scripts/guardrails/trust-gate.mjs`.
  - Bans 24 AI phrases: `"AI-powered"`, `"machine learning"`, `"AI picks"`, `"AI agents"`, etc.

### 1.4 R3: Tier Matrix Discrepancy & Gating Architecture
1. **Vocabulary Divergence**:
   - `packages/types/src/index.ts`:
     ```ts
     export type SubscriptionTier = "FREE" | "FANTASY" | "PRO" | "ELITE";
     ```
   - `apps/web/lib/pricing/value-architecture.ts`:
     ```ts
     export type ValueTierId = "FREE" | "PRO" | "ELITE" | "OPERATOR";
     ```
     `FANTASY` is omitted from `ValueTierId` and `VALUE_TIERS`.
   - `apps/web/lib/pricing/feature-gates.ts`:
     ```ts
     const TIER_ORDER: Record<ValueTierId | "FANTASY", number> = {
       FREE: 0,
       FANTASY: 1,
       PRO: 2,
       ELITE: 3,
       OPERATOR: 4,
     };
     ```
     Employs an ad-hoc union patch `"ValueTierId | 'FANTASY'"` because `value-architecture.ts` lacks `FANTASY`.

2. **Entitlements Definition (`packages/types/src/index.ts`)**:
   - `dailyPickLimit`: Currently `isPro ? null : 2` (Free receives 2 teaser picks instead of the required 1 daily teaser pick).
   - `canUseParlayMri`: Currently `isPro` (`tier === "PRO" || tier === "ELITE"`).
   - Missing explicit fields for the 150-Max DFS Optimizer and SGP Correlation Matrix.

3. **High-Leverage Tools Current Status**:
   - **Multi-Lineup (150-Max) DFS Optimizer**:
     - `apps/web/lib/fantasy/dfs-optimizer.ts`: Supports multi-lineup generation via `generateLineups(opts, count, maxExposure, slate, signalPen)`.
     - `apps/web/components/fantasy/dfs-optimizer.tsx`: Slider is currently hardcoded to `min={1} max={20}` with zero tier check.
     - Unrestricted client-side execution; lacks server-side Elite gate.
   - **Full Situational & SGP Correlation Matrix**:
     - `apps/web/lib/projections/correlation.ts`: Has `buildGaussianCopulaMatrix`, `buildFantasyCopulaLinks`, and `summarizeGaussianCopulaPortfolio`.
     - `apps/web/lib/parlay/parlay.ts`: Has `sampleLegs` and copula correlation calculations.
     - Currently assigned to Pro (`canUseParlayMri: isPro`) rather than locked strictly behind Elite.
   - **Real-Time Line Steam & Sharp Movement Alerts**:
     - `apps/web/lib/ops/line-movement.ts`: Implements `computeLineMovements` with `steamCandidate: Math.abs(movement) >= 2.0`.
     - `apps/web/lib/watchlist/alert-eligibility.ts`: Enforces `canGetAlerts: boolean` (Elite-exclusive).
     - Gated under `canGetAlerts`, but not surfaced as a distinct high-leverage Elite feature in `FEATURE_GATES`.
   - **Personal CLV & ROI Portfolio Dashboard**:
     - `apps/web/app/track/page.tsx`: Gated server-side via `viewer.canUseClvLedger`. If false, renders `<TierGatePanel need="ELITE" ... />`. No client bypass possible.
     - `apps/web/lib/pricing/feature-gates.ts`: Marked as `status: "preview"` rather than `status: "live"`.

4. **Galaxy Twin Status**:
   - `apps/web/lib/pricing/feature-gates.ts` line 161:
     ```ts
     key: "galaxy-twin",
     displayName: "Galaxy Twin / Edge Map",
     internalNote: "RETIRED FROM THE PRODUCT 2026-09-11 (founder)... Set to disabled/hidden...",
     minTier: "ELITE", status: "disabled", freePreview: false, lockBehaviorForFree: "hidden", upgradeCtaTier: "ELITE",
     ```
   - `apps/web/app/pricing/page.tsx`: 0 occurrences of `"twin"` or `"Edge Map"` in `PLANS`, `FREE_FEATURES`, `PRO_FEATURES`, `ELITE_FEATURES`, or `FANTASY_FEATURES`.
   - `apps/web/__tests__/edge-map-retirement.test.ts`: 4/4 passing tests asserting no navigation links exist, pricing catalog does not advertise it, and `/observatory` redirects to `/board`.

---

## 2. Logic Chain

### 2.1 Quant Jargon Translation Rationale
1. **Observation**: Public cards render internal developer acronyms (`CPOE`, `WOPR`, `RYOE`, `DAKOTA`, `ANY/A`, `de-vig`, `Brier`) and variable names (`trueProb`, `Ranking P`).
2. **Impact**: These terms read as unparsed telemetry or betting jargon to casual and serious sports fans. They violate the GSE Brand Directive ("math you can read", transparent and plain-English).
3. **Inference**: Each acronym represents a straightforward sports concept:
   - `WOPR` (Weighted Opportunity Rating) measures a receiver's target and air-yards share $\rightarrow$ Translated to **Target Opportunity** / **Opportunity Share**.
   - `DAKOTA` / `CPOE` (EPA + Completion Percentage Above Expectation) measures quarterback passing efficiency $\rightarrow$ Translated to **Pass Efficiency Index**.
   - `ANY/A` (Adjusted Net Yards per Pass Attempt) $\rightarrow$ Translated to **Adjusted Pass Yards / Att**.
   - `de-vig` (stripping sportsbook margin / overround) $\rightarrow$ Translated to **Fair Market Value** or **Margin-Adjusted Price**.
   - `Shin de-vig` (Shin's insider-trading margin adjustment) $\rightarrow$ Translated to **Adjusted Market Consensus**.
   - `Brier` (mean squared error of probability forecasts) on personal bet tracker $\rightarrow$ Translated to **Accuracy Error (Brier)** or **Forecast Error**.
   - `trueProb` $\rightarrow$ Translated to **Projected Win Probability**.
   - `Ranking P` $\rightarrow$ Translated to **Model Edge Rating**.
   - Literal `"JSON"` buttons $\rightarrow$ Translated to **"View Audit Receipt"** or **"View Audit Data"**.

### 2.2 Tier Matrix Alignment & Hardening
1. **Observation**:
   - `packages/types`: `SubscriptionTier = "FREE" | "FANTASY" | "PRO" | "ELITE"`.
   - `value-architecture.ts`: `ValueTierId = "FREE" | "PRO" | "ELITE" | "OPERATOR"`.
   - Target requirement: Free ($0), Fantasy ($19/mo), Pro ($49/mo), Elite ($99/mo · $799/yr).
2. **Impact**: The pricing presentation layer and the core type definitions disagree on whether `FANTASY` is a primary value tier. `feature-gates.ts` requires a union patch to avoid runtime `undefined` lookup errors.
3. **Inference**:
   - `ValueTierId` in `value-architecture.ts` must include `"FANTASY"`, with a dedicated `VALUE_TIERS` object defining its monthly price ($19), seasonal tools unlocks, and upgrade path to Pro.
   - `PRICING_PHASES` in `pricing-phases.ts` should reflect the target commercial pricing: Fantasy ($19/mo), Pro ($49/mo), and Elite ($99/mo · $799/yr).
   - In `packages/types`, update `dailyPickLimit` from 2 to 1 for Free.
   - High-leverage tools must have distinct server-enforced entitlement checks (`canUseDfsOptimizer150`, `canUseSgpCorrelation`, `canGetSteamAlerts`, `canUseClvLedger`) evaluated strictly against `tier === "ELITE"`.

---

## 3. Caveats
1. **Read-Only Scope**: This investigation surveyed code and executed test suites without modifying repository source files.
2. **Pricing Grandfathering Policy**: `pricing-phases.ts` includes a `GRANDFATHER_GUARANTEE` where existing subscribers retain their founding rate. Updating the target price constants applies to new subscribers; existing Stripe customer subscriptions persist in Stripe.
3. **Database Schema Dependencies**: The Prisma database schema has a `Subscription` model with `tier` string. It supports `FREE`, `FANTASY`, `PRO`, `ELITE`. No database schema migrations are required to support the 4-tier matrix.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Plain-English Translation Blueprint (R2)

| Target File | Current Text / Code | Proposed User-Facing Replacement | Rationale |
|---|---|---|---|
| `apps/web/components/picks/pick-card.tsx:385` | `"Ranking P"` | `"Model Edge Rating"` | Replaces internal sort key name with clear metric |
| `apps/web/components/picks/pick-card.tsx:399` | `"Market fair:"` | `"Fair Market Value:"` | Replaces informal label with industry standard term |
| `apps/web/components/picks/pick-card.tsx:437` | `"trueProb {(... * 100).toFixed(1)}%"` | `"Win Probability: {(... * 100).toFixed(1)}%"` | Replaces raw TypeScript variable name |
| `apps/web/components/picks/devig-method-disclosure.tsx:40` | `"Shin de-vig: ..."` | `"Adjusted Market Consensus: ..."` | Eliminates internal margin-removal jargon |
| `apps/web/components/picks/devig-method-disclosure.tsx:45` | `"— this price depends on de-vig method; we rank on the proportional number."` | `"— adjusted for bookmaker margin using Shin's method; ranked by standard market consensus."` | Explains math without using "de-vig" jargon |
| `apps/web/components/picks/verify-pick-button.tsx:88` | `"<p>Model version</p><p>{state.modelVersion}</p>"` | `"<p>Audit Receipt Build</p><p>{formatReleaseLabel(state.modelVersion)}</p>"` | Replaces raw version string with clean release label |
| `apps/web/components/picks/evidence-audit-drawer.tsx:148` | `label ?? "View evidence"` | `label ?? "View Audit Receipt"` | Standardizes public audit verification label |
| `apps/web/components/intelligence/engine-view.tsx:162, 330` | `label: "DAKOTA", tooltip: "...EPA+CPOE..."` | `label: "Pass Efficiency", tooltip: "Quarterback efficiency combining EPA and completion quality"` | Purges DAKOTA and CPOE acronyms |
| `apps/web/components/intelligence/engine-view.tsx:167` | `label: "WOPR", tooltip: "...weighted opportunity..."` | `label: "Opportunity Share", tooltip: "Combined target and air-yards share"` | Purges WOPR acronym |
| `apps/web/components/intelligence/engine-view.tsx:331` | `label: "ANY/A", tooltip: "adjusted net yards..."` | `label: "Adj Yds/Att", tooltip: "Adjusted net yards per attempt"` | Purges ANY/A developer notation |
| `apps/web/components/players/player-lab-table.tsx:174, 221` | `label: "WOPR"` | `label: "Opp Share", tooltip: "Target and air-yards opportunity share"` | Consumer-grade terminology for player tables |
| `apps/web/app/nflverse/page.tsx:178` | `<th>WOPR</th>` | `<th>Opp Share</th>` | Replaces WOPR in nflverse pulse table |
| `apps/web/components/tracker/bet-tracker.tsx:83` | `<Metric label="Brier" value={p.brier} />` | `<Metric label="Calibration Error" value={p.brier} />` | Replaces raw statistician name with readable label |
| `apps/web/app/trends/page.tsx:139, 227, 303` | `<Link ...>JSON</Link>` | `<Link ...>View Audit Receipt</Link>` | Replaces literal raw developer links |
| `apps/web/app/weather/page.tsx:44` | `"View as JSON"` | `"View Data Feed"` | User-facing telemetry link |
| `apps/web/app/mlb/page.tsx:52`, `nhl/page.tsx:58` | `"View as JSON"` | `"View Data Feed"` | User-facing telemetry link |

### 4.2 Tier Restructuring & Elite Value Engine Blueprint (R3)

#### Tier Definition & Pricing Table
| Tier | Pricing | Core Capabilities & Deliverables | Gated Below / Upgrades To |
|---|---|---|---|
| **Free** | $0 | 1 daily teaser pick (`dailyPickLimit: 1`), public Edge Index, public calibration verification, Academy basics | Upgrades to Fantasy or Pro |
| **Fantasy** | $19/mo | Live seasonal tools: Start-Sit, Waivers, Draft Assistant, Trade Analyzer, Best Ball kit, ADP overlays | Betting signals & factor trails locked |
| **Pro** | $49/mo | Full Slate Betting Signals, Confidence Ratings (NN/100), Plain-English Reasoning, Full Factor Trails, No-Bet pass reasoning, Trend Lab | Elite tools locked |
| **Elite** | $99/mo · $799/yr | **The 4 High-Leverage Tools**:<br>1. Multi-Lineup (150-Max) DFS Optimizer<br>2. Full Situational & SGP Correlation Matrix<br>3. Real-Time Line Steam & Sharp Movement Alerts<br>4. Personal CLV & ROI Portfolio Dashboard | Top public tier; fully unlocked |

#### Server-Side Gating Implementation Steps
1. **`packages/types/src/index.ts`**:
   - Update `SubscriptionTier` (already `"FREE" | "FANTASY" | "PRO" | "ELITE"`).
   - In `Entitlements` interface, add:
     ```ts
     canUseDfsOptimizer150: boolean; // Elite only
     canUseSgpCorrelation: boolean;  // Elite only
     canGetSteamAlerts: boolean;     // Elite only
     ```
   - In `getEntitlements(tier)`:
     ```ts
     dailyPickLimit: isPro ? null : 1, // Free = 1 teaser pick
     canUseDfsOptimizer150: tier === "ELITE",
     canUseSgpCorrelation: tier === "ELITE",
     canGetSteamAlerts: tier === "ELITE",
     canUseClvLedger: tier === "ELITE",
     ```
2. **`apps/web/lib/pricing/value-architecture.ts`**:
   - Update `ValueTierId`:
     ```ts
     export type ValueTierId = "FREE" | "FANTASY" | "PRO" | "ELITE" | "OPERATOR";
     ```
   - Add `FANTASY` tier object in `VALUE_TIERS` with monthly price $19 and annual equivalent, detailing the seasonal suite.
3. **`apps/web/lib/pricing/feature-gates.ts`**:
   - Add `dfs-optimizer-150` (`minTier: "ELITE"`, `status: "live"`).
   - Add `sgp-correlation-matrix` (`minTier: "ELITE"`, `status: "live"`).
   - Update `alerts-steam` (`minTier: "ELITE"`, `status: "live"`).
   - Update `clv-tracking` (`minTier: "ELITE"`, `status: "live"`).
   - Ensure `galaxy-twin` remains `status: "disabled"` and `lockBehaviorForFree: "hidden"`.
4. **`apps/web/lib/api-entitlement.ts`**:
   - Add `requireEliteApi()`:
     ```ts
     const isElite = (e: Entitlements): boolean => e.tier === "ELITE";
     export function requireEliteApi(): Promise<NextResponse | null> {
       return gateApi(isElite, "This high-leverage tool requires an Elite subscription.");
     }
     ```
5. **`apps/web/components/fantasy/dfs-optimizer.tsx`**:
   - Update lineup count slider / input to allow up to 150 lineups when `canUseDfsOptimizer150` is true; for unentitled users, cap at 1–20 with an inline upgrade prompt if dragged beyond.
6. **`apps/web/app/track/page.tsx`**:
   - Maintain the existing strict server-side gate on `viewer.canUseClvLedger`.
7. **`apps/web/app/pricing/page.tsx`**:
   - Update pricing cards and comparison matrix to display the target prices ($19/mo, $49/mo, $99/mo / $799/yr) and prominently highlight the 4 Elite high-leverage tools.

---

## 5. Verification Method

To independently verify these findings and confirm post-implementation compliance:

1. **Brand Linter & Safety Scan**:
   ```powershell
   npm run lint:brand
   ```
   *Expected*: All 19 test suites and 4,661 tests pass cleanly (0 errors).

2. **Trust Gate Guardrail**:
   ```powershell
   npm run guard:trust
   ```
   *Expected*: 3,654 tracked files scanned, 0 banned phrases or AI terminology violations detected.

3. **Jargon Purge Verification**:
   ```powershell
   git grep -in -E "(CPOE|WOPR|RYOE|DAKOTA|ANY/A|de-vig)" apps/web/components/picks apps/web/app/board
   ```
   *Expected*: Zero occurrences in public card and board components.

4. **Pricing Architecture Unit Tests**:
   ```powershell
   npx vitest run apps/web/__tests__/pricing-phases.test.ts apps/web/__tests__/pricing-value-architecture.test.ts apps/web/__tests__/edge-map-retirement.test.ts
   ```
   *Expected*: All tier ordering, entitlement gates, and retirement checks pass.

5. **Typecheck & Build Invariants**:
   ```powershell
   npm run typecheck --workspace=packages/types
   npm run typecheck --workspace=apps/web
   ```
   *Expected*: 0 TypeScript diagnostics.
