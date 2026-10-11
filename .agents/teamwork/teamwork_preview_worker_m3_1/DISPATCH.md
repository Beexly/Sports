# DISPATCH: Milestone 3 Worker (Tier Restructuring & Elite Value Engine)

## Mission
Implement Milestone 3 (Tier Restructuring & Elite Value Engine) according to the blueprint in `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md` and requirements in `ORIGINAL_REQUEST.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Working Directory
`C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_worker_m3_1`

## Inputs
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md`
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\PROJECT.md`
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md` (Detailed blueprint)
- `apps/web/__tests__/e2e/astra-overhaul.test.ts` (E2E tests for M3)

## Exclusive File Boundaries
You exclusively own and may edit the following files:
- `packages/types/src/index.ts`
- `apps/web/lib/pricing/value-architecture.ts`
- `apps/web/lib/pricing/feature-gates.ts`
- `apps/web/lib/pricing/tier-access.ts`
- `apps/web/lib/api-entitlement.ts`
- `apps/web/app/pricing/page.tsx`
- `apps/web/components/fantasy/dfs-optimizer.tsx` (lineup count slider max)

DO NOT edit files outside this list (specifically do not edit pick-card, board page, nav, or fantasy parser).

## Implementation Checklist
1. **`packages/types/src/index.ts`**:
   - Ensure `SubscriptionTier = "FREE" | "FANTASY" | "PRO" | "ELITE"`.
   - In `Entitlements`, add:
     * `canUseDfsOptimizer150: boolean;` (Elite only)
     * `canUseSgpCorrelation: boolean;` (Elite only)
     * `canGetSteamAlerts: boolean;` (Elite only)
   - In `getEntitlements(tier)`:
     * `dailyPickLimit: isPro ? null : 1` (Free = 1 teaser pick, was 2)
     * `canUseDfsOptimizer150: tier === "ELITE"`
     * `canUseSgpCorrelation: tier === "ELITE"`
     * `canGetSteamAlerts: tier === "ELITE"`
     * `canUseClvLedger: tier === "ELITE"`
2. **`apps/web/lib/pricing/value-architecture.ts`**:
   - Update `ValueTierId`: `"FREE" | "FANTASY" | "PRO" | "ELITE" | "OPERATOR"`.
   - Add `FANTASY` tier object in `VALUE_TIERS`: $19/mo, seasonal tools (Start-Sit, Waivers, Draft Assistant, Trade Analyzer).
3. **`apps/web/lib/pricing/feature-gates.ts`**:
   - Add `dfs-optimizer-150` (minTier: "ELITE", status: "live").
   - Add `sgp-correlation-matrix` (minTier: "ELITE", status: "live").
   - Update `alerts-steam` (minTier: "ELITE", status: "live").
   - Update `clv-tracking` (minTier: "ELITE", status: "live").
   - Ensure `galaxy-twin` is `status: "disabled"` and `lockBehaviorForFree: "hidden"`.
4. **`apps/web/lib/api-entitlement.ts`**:
   - Add `requireEliteApi()` server-side gating helper.
5. **`apps/web/components/fantasy/dfs-optimizer.tsx`**:
   - When user is entitled to Elite (`canUseDfsOptimizer150`), allow lineup count slider up to 150. For unentitled users, cap at 1-20 with upgrade CTA.
6. **`apps/web/app/pricing/page.tsx`**:
   - Reconcile pricing cards and feature comparison matrix: Free ($0), Fantasy ($19/mo), Pro ($49/mo), Elite ($99/mo · $799/yr).
   - Zero mentions of retired Galaxy Twin or dead features.
   - Highlight the 4 high-leverage tools locked strictly behind Elite.
7. **Verification**:
   - Run `npm run test --workspace=apps/web -- __tests__/pricing-phases.test.ts __tests__/edge-map-retirement.test.ts`
   - Run `npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts`
   - Verify that all M3 E2E tests pass.

## 2026-10-11T21:27:23Z
You are Milestone 3 Worker (Tier Restructuring & Elite Value Engine).
Working directory: C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_worker_m3_1
Read DISPATCH.md in your directory and ORIGINAL_REQUEST.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement:
1. packages/types/src/index.ts: SubscriptionTier (FREE, FANTASY, PRO, ELITE), dailyPickLimit=1 for Free, add canUseDfsOptimizer150, canUseSgpCorrelation, canGetSteamAlerts to Entitlements (Elite only).
2. apps/web/lib/pricing/value-architecture.ts: add FANTASY to ValueTierId & VALUE_TIERS ($19/mo, seasonal tools).
3. apps/web/lib/pricing/feature-gates.ts: add dfs-optimizer-150 (ELITE), sgp-correlation-matrix (ELITE), ensure alerts-steam & clv-tracking are ELITE, ensure galaxy-twin disabled/hidden.
4. apps/web/lib/api-entitlement.ts: add requireEliteApi().
5. apps/web/components/fantasy/dfs-optimizer.tsx: slider up to 150 only when canUseDfsOptimizer150.
6. apps/web/app/pricing/page.tsx: 4-tier matrix ($0, $19, $49, $99), zero Galaxy Twin, 4 Elite high-leverage tools locked.
7. Verify with pricing tests and npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts.
Write handoff.md and notify me via send_message.
