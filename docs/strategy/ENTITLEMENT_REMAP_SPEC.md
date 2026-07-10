# Entitlement Remap Spec — picks go free, tools become the product

> **⚠️ REVERSED (2026-07-10). DO NOT RE-APPLY.** The founder reversed Thread 1 ahead of
> football season: the picks are the paid product again (gate the board, win the top of
> funnel on content + engagement, not by giving picks away at peak demand).
> `getEntitlements("FREE")` now returns `canSeePremiumPicks:false`, `canSeeConfidence:false`,
> `dailyPickLimit:2` (a small daily teaser); `canSeeEdgeScore` stays public. PRO/ELITE own
> the full board + confidence + depth + tools; ELITE adds alerts + the CLV ledger. This
> document is retained for history only — the "Target end-state" below is no longer the
> target.

> Precise, sequenced implementation spec for the Thread 1 decision (stop charging for
> picks). Written against the real enforcement code so it can be executed safely on the
> hot path. Paywall enforcement is server-side and security-sensitive — follow the
> sequence; do not shortcut.

## The enforcement model (as built — verified)

- Tier → flags: `getEntitlements(tier)` in `@sports/types` returns
  `{ canSeePremiumPicks, dailyPickLimit, canSeeConfidence, canSeeFactorBreakdown,
  canSeeLineMovement, canGetAlerts, canSeeEdgeScore }`.
- Per-API gate: `apps/web/app/api/picks/route.ts` — line ~87
  `...(entitlements.canSeePremiumPicks ? {} : { tier: "FREE" })` and `take: dailyPickLimit`.
- Per-page gate: `apps/web/lib/pricing/tier-access.ts` → `getViewerEntitlements()` (fail-closed to FREE).
- User resolution: `apps/web/lib/entitlements.ts` → `getUserEntitlements(userId)`.
- Tests that MUST stay green: `entitlements-enforcement.test.ts`, and anything under
  `docs/adr/003-server-side-paywall-hardening.md`'s coverage.

## Current FREE vs PRO/ELITE (the starting point)

FREE today: `canSeePremiumPicks:false`, `dailyPickLimit:2`, `canSeeConfidence:false`,
`canSeeFactorBreakdown:false`, `canSeeLineMovement:false`, `canGetAlerts:false`,
`canSeeEdgeScore:true`. PRO/ELITE unlock premium picks + confidence + factor breakdown;
ELITE adds `canGetAlerts`.

## Target end-state (picks free; depth + tools + alerts paid)

| Flag | FREE (new) | PRO | ELITE |
|---|---|---|---|
| `canSeePremiumPicks` | **true** | true | true |
| `dailyPickLimit` | **null (all)** | null | null |
| `canSeeEdgeScore` | true | true | true |
| `canSeeConfidence` | **see sequence** | true | true |
| `canSeeFactorBreakdown` | false | true | true |
| `canSeeLineMovement` | false | true | true |
| `canGetAlerts` | false | false | **true** |

The paid line becomes **depth + tools + analytics + alerts**, not access to the picks.

## Sequence (do in this order — each its own reviewable commit, full gate green)

**Step 1 — De-paywall the picks (safe, do now).**
In `getEntitlements`, set FREE `canSeePremiumPicks:true` and `dailyPickLimit:null`. Leave
`canSeeConfidence:false` for FREE for now (see Step 3). Update `entitlements-enforcement.test.ts`
to assert the new FREE shape. This alone delivers "all picks are free." Existing PRO/ELITE lose
nothing (they keep depth/tools/alerts), so no subscriber harm.

**Step 2 — Strip the claims (safe, do now).**
Scan marketing/pricing copy for "winners / profitable / winning picks / edge-as-record" framing
and remove it. The pricing page and any teaser that sells *access to picks* must instead sell
*tools, depth, analytics, alerts*. trust-gate already bans the hard phrases; this catches the
softer "winning record" implications. Re-run `node scripts/guardrails/trust-gate.mjs`.

**Step 3 — Honest confidence, then free it (paired with Thread 2).**
Do NOT expose confidence to FREE while the public number is still the raw, ~20-point-overstated
value. First wire the validated calibrator into the public confidence path (Thread 2: honest
labels, calibrated). THEN set FREE `canSeeConfidence:true`. Order matters: honest first, free second.

**Step 4 — Make fantasy the paid hero (audit before gating).**
FIRST audit how the fantasy tools (`/fantasy/*`, optimizer, draft, tracker, academy) are currently
gated. If they are already Pro-gated → position them as the Pro headline on `/pricing`. If they
are currently FREE/ungated → gating them is a *takeaway* from current users; do NOT silently
remove access. Instead gate only the *power* features (unlimited optimizer runs, full draft kit,
unlimited tracking, full academy) and keep a real free trial of each. Report the current state
before changing it.

## Guardrails

- Server-side only — never gate in the client (CLAUDE.md rule #3).
- Existing subscribers must never lose value mid-cycle (grandfather doctrine).
- Every step: `npm run typecheck && npm run lint && (cd apps/web && npx vitest run) && npm run build`
  plus the trust-gate + em-dash scanners, all green, before push.
- Keep `apps/web/lib/pricing/pricing-phases.ts` (prices) as the source of truth — this spec changes
  *entitlements*, not prices.
