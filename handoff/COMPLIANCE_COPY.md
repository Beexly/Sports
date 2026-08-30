# Compliance Copy — Disclosure-Consistency Audit (read-only)

**Phase:** 1c, item 3 of 3 (P1c-3). **Author:** Hermes continuous run.
**Method:** ran `.claude/commands/check-claims.md` scoped to legal/risk copy — i.e. a
grep for accuracy/win-rate/guarantee claims and for winnings/prize/payout/profit
mentions, then verified each has adjacent risk context. **Report only — no copy
changed. Marketing wording is an owner decision.**

## Summary

The product is **strong and consistent** on honesty copy. Core picks/performance
surfaces carry explicit non-guarantee language, and the site-wide footer
(`apps/web/components/ui/footer.tsx`) links `responsible-play` on every page.

- `about/page.tsx:30` — "No certainty theater. No guarantees… loses 36 out of 100 times."
- `clv/route.ts:46-47` — "leading indicator of edge, not a guarantee. Past performance
  does not guarantee future results. For informational purposes only."
- `accountability/page.tsx`, `board/page.tsx`, `glass-ledger/page.tsx` — all carry
  risk/honesty markers (count ≥ 6 each).
- `how-we-make-money/page.tsx`, `dashboard/page.tsx`, `contests/page.tsx` — carry
  risk/responsible markers.

## Findings (file:line)

**F1 — `fantasy/props/page.tsx:26` discusses staking without an adjacent
responsible-gambling note.**
Copy: "…the line and multiplier where edge × payout pays best. Build a Power-Play
entry and see its real combined odds and expected value before you stake a dollar."
The only adjacent disclaimer is `PROPS_DISCLAIMER` (`apps/web/lib/fantasy/props.ts:157`),
which is *product* disclaimery ("We advise on third-party pick'em lines. We do not
operate a pick'em product.") — it carries **no** gambling-risk / age / HELPLINE
language, unlike the rest of the product. This is the one page where winnings/payout
framing sits next to a disclaimer that omits risk context. **Recommend (owner
decision):** add the standard responsible-play + age note to `PROPS_DISCLAIMER` or
render the footer risk line on this page. No change made here.

**F2 — `fantasy/contests/page.tsx:15,37` is a free paper product ("no entry fee, no
prize pool, no real money") but the *only* risk signal is that sentence itself.**
Acceptable as-is, but if the product later adds any prize/incentive language, it will
need the standard responsible-play framing the rest of the site uses. Flagged for
continuity, not a defect today.

**F3 — calculators are fine.** `tools/clv-calculator/page.tsx:55` ("does not prove
long-run profit") and `tools/ev-calculator/page.tsx:69` discuss profit/payout in an
educational, mathematically-honest frame with adjacent caveats. Consistent with the
product's honesty thesis. No action.

## Consistency verdict

- Risk language across picks/performance/money pages: **consistent** (footer
  responsible-play link + explicit non-guarantee copy on the core surfaces).
- Gambling-risk framing on fantasy/props + fantasy/contests: **inconsistent** — these
  two pages discuss staking/prizes without the responsible-gambling note the rest of
  the site carries (F1, F2). This is the single gap worth the owner's attention.

## What was NOT touched

No page, string, or component was modified. This is an audit. Any copy change is an
owner + counsel decision (see ADR 007's "do not cross the line" constraint and the
responsible-play page at `apps/web/app/responsible-play/page.tsx`).
