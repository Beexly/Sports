# Affiliate Revenue — Go-Live Runbook

Subscription is the primary model. Affiliate is **additive** and stays fully
dark until you deliberately turn it on, partner by partner. The whole path is
built, compliant, and tested — going live is a small, gated set of steps.

## What's already built (in this repo)

- **Compliance gate** (`apps/web/lib/promotions/guards.ts`): a promo can't show
  publicly without affiliate disclosure, responsible-gaming text, a real
  operator terms URL (placeholder/test/`javascript:` URLs are rejected), an
  `eligibleStates` allow-list, an unexpired/ACTIVE/APPROVED status, no banned
  hype language, and an **approved** operator. State filtering is honored.
- **Operator registry** (`apps/web/lib/cockpit/operator-registry.ts`): the real
  major books (DraftKings, FanDuel, BetMGM, Caesars, BetRivers, Fanatics,
  ESPN BET) are pre-loaded as `KNOWN_NOT_PARTNERED`. They are recognized but
  cannot publish until you flip one to `APPROVED_PARTNER`.
- **Public surface** (`/promotions`): renders an honest empty-state when no
  partner is approved; affiliate links carry `rel="nofollow sponsored
  noopener noreferrer"`, with disclosure + RG text on every card.
- **Click gate** (`/go/[slug]`): every "Visit operator" click re-checks
  compliance at click time (never forwards a pulled/expired promo) and attaches
  a first-party `subid` for attribution.
- **Legal pages**: `/responsible-play`, `/privacy`, `/terms` are live and
  compliant (1-800-GAMBLER, self-exclusion, ncpgambling).
- **Seed safety**: demo promotions never seed a production database.

## Owner steps to turn ONE partner on

These are deliberately not automatable (they require real legal/business action):

1. **Get an EIN** and apply to the operator's affiliate program (or an
   aggregator). You'll receive an **affiliate ID / tracking link**.
2. **Engage counsel** if required by the program / your state.
3. In `operator-registry.ts`, change that operator's `operatorClass` from
   `"KNOWN_NOT_PARTNERED"` to `"APPROVED_PARTNER"`, and fill `licensedStates`
   from the **signed agreement** + the operator's current state licensing.
   (Left empty today so nothing is fabricated.)
4. Create a `Promotion` row (cockpit or DB) for that `sportsbookKey` with: real
   `affiliateUrl` (your tracking link), real `termsUrl`, `disclosureText`,
   `responsibleGamingText`, `eligibleStates`, `minimumAge: 21`,
   `status: "ACTIVE"`, `complianceStatus: "APPROVED"`.
5. (Optional) set `AFFILIATE_SUBID` env to your preferred sub-id tag.

The promo now passes the gate and appears on `/promotions`; clicks route through
`/go/[slug]`. If anything is missing, the cockpit shows the exact blocker and the
public surface simply omits the promo — it never shows something non-compliant.

## Guardrails that stay on

- No promo publishes without an `APPROVED_PARTNER` operator.
- No state shows a promo unless it's in that promo's `eligibleStates`.
- Banned hype language is blocked in headlines/summaries.
- The click gate fails closed to `/promotions` on any compliance regression.

## Optional follow-ups (not blocking)

- Durable click tracking: add a `PromoClick` Prisma model and write to it from
  the `console.info` seam in `/go/[slug]/route.ts`.
- Per-network sub-id parameter names (some use `btag`/`s1` instead of `subid`).
