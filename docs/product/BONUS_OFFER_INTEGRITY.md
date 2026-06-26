# Bonus / Offer Integrity

**Module:** `packages/data-intelligence/src/bonus-passport.ts`
**Surface:** a future bonus surface (`OWNER_GATED`, compliance-reviewed) — fixture-only today.
**Status:** GSE never operates betting; no live affiliate link unless the owner configures it.

## The problem

Sportsbook-bonus affiliate funnels are the revenue engine of most prediction sites — and the place
where the honest answer is most often suppressed. `Risk-free`, `current offer`, `best bookmaker`,
`legal in your state` are claims that convert precisely when they are *unverified*. GSE's bonus layer
is built so an unverified or non-compliant claim **cannot display**.

## The passport

`buildBonusPassport(input)` → `BonusPassport`. Display is gated: `displayAllowed` is `true` only when
the offer has a `lastVerifiedAt` timestamp, a verified legality status, and — if the offer makes a
no-loss style promotional claim — an explaining caveat. `affiliateUrl` is `null` unless
`affiliateConfigured` is true (owner-configured). A responsible-gaming disclaimer (`RG_DISCLAIMER`) is
required and propagates to every derived output.

`LegalityStatus` ∈ `VERIFIED_LEGAL | VERIFIED_RESTRICTED | UNVERIFIED | UNKNOWN`. Anything but a
verified status blocks a "legal/available" implication.

## Bookmaker ratings

`buildBookmakerRating(input)` → `BookmakerRatingPassport` may only rank a book when the criteria are
**stated**. There is no "best bookmaker" without a published method and a verified jurisdiction.

## GSE's posture

`GSE_BETTING_POSTURE = { operatesBetting: false }`. GSE is an information institution, not a book and
not a tout. It does not take bets, does not guarantee outcomes, and does not imply that any offer is
current, legal, or best without the verification the passport requires.

## Invariants (enforced by tests)

- No active affiliate link without `affiliateConfigured`.
- No "current" offer without `lastVerifiedAt`.
- No "legal/available" implication without a verified jurisdiction.
- A no-loss promotional claim requires an explaining caveat or it does not display.
- The responsible-gaming disclaimer is always present.
- GSE never claims to operate betting.

## Tests

`packages/data-intelligence/src/__tests__/bonus-passport.test.ts` (10): each invariant above, plus the
posture flag and the disclaimer propagation.
