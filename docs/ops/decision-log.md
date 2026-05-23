# Decision Log

> Append-only. Every decision by Claude, Codex, or the product owner
> lands here with date, rationale, and alternatives considered. This is
> the canonical record — when context is lost or a decision is
> challenged, this file is the source of truth.
>
> Read the last 20 entries on every rehydration (master plan Part 1.5,
> step 2 of the rehydration procedure).

## Format

```
### YYYY-MM-DD — <short title>

**Decided by:** owner / Claude / Codex / joint
**Status:** locked / provisional / reversed
**Decision:** one sentence stating what was decided

**Context:** what prompted this — the question, the trade-off, the
stuck-point.

**Alternatives considered:** what else was on the table and why it
lost.

**Rationale:** why this won.

**Reversibility:** how easy is it to undo this if we change our minds.

**Touched:** files / surfaces / phases this decision binds.
```

---

## Entries (newest first)

### 2026-05-23 — Retraction of "Stripe webhook clean" claim from earlier audit pass

**Decided by:** Claude (self-correction)
**Status:** locked
**Decision:** retract the "Stripe webhook is secure and idempotent. This
is well-built." claim from this branch's earlier audit pass. Owner
Pass 13 verified a P0 silent priceId-downgrade bug at
`apps/web/app/api/webhooks/stripe/route.ts:184-188` that this branch's
audit missed. The audit was correct on the signature-verification,
idempotency, raw-body, and error-handling layers — but missed the
`getTierFromPriceId` correctness hole.

**Context:** Pass 13 surfaced the bug as the top finding in the
primary clone. Verified in this tree:
`getTierFromPriceId(priceId)` returns `"FREE"` silently for any
priceId that doesn't equal the two known env vars. A new Stripe
priceId + stale env vars = silent paid-user downgrade on every
webhook event. Secondary hole: `undefined === undefined` returns true
when the elite env var and incoming priceId are both unset, wrongly
tagging as ELITE.

**Alternatives considered:**

- Quietly update the issue queue without retraction. Rejected —
  decision log honesty matters more than appearing thorough. Future
  Claude sessions reading this log need to know what the earlier
  audit got wrong.

**Rationale:** the prior audit's "clean" verdict on the Stripe
webhook was scoped to the structural layer (signature / idempotency /
errors). It did not analyze the priceId mapping function semantics.
The retraction preserves the structural-layer findings but flags the
semantic-layer gap.

**Reversibility:** irrelevant — this is a self-correction, not a
forward decision.

**Touched:** `docs/ops/issue-queue.md` (P0 entry added),
`docs/product/stripe-webhook-decisioning-spec.md` (spec scaffold
added), this entry.

### 2026-05-23 — Galaxy Sports Network LLC as corporate parent

**Decided by:** owner (locked May 22, 2026 with the LLC filing) + Claude
(captured here per master plan decision #26)
**Status:** locked
**Decision:** Galaxy Sports Network LLC (Texas) is the corporate
parent. Galaxy Sports Edge is the flagship consumer product. All
user-facing branding stays "Galaxy Sports Edge"; the LLC surfaces only
where the legal entity legitimately needs to appear.

**Context:** the platform is evolving from a single consumer
subscription into a Sports Intelligence OS that will eventually host
multiple products (Galaxy Studio, Galaxy B2B API, Galaxy TeamHub, future
verticals). The owner filed the LLC on May 22, 2026 so future products
fit without renaming everything.

**Alternatives considered:**

- **Single brand (Galaxy Sports Edge LLC)** — simpler, but boxes future
  products into the consumer-facing brand. Rejected.
- **Defer corporate structure until a second product ships** — would
  force a brand-and-entity rename later when contracts, trademarks, and
  affiliate enrollments are harder to migrate. Rejected.

**Rationale:** mirrors the Meta Platforms / Anthropic pattern —
corporate parent, distinct consumer products. Clean home for IP,
contracts, trademark filings, Stripe entity, sportsbook affiliate
enrollments, white-label licensing, and future hiring. The consumer
wedge is unaffected.

**Reversibility:** medium. Reversing the LLC would require dissolution
filings; the brand-surface side could be unwound by removing the
PARENT_COMPANY constant and reverting the legal pages.

**Touched:** `apps/web/lib/brand.ts` (added `PARENT_COMPANY`),
`apps/web/components/ui/footer.tsx`, `apps/web/app/terms/page.tsx`,
`apps/web/app/privacy/page.tsx`, `apps/web/app/about/page.tsx`,
`docs/corporate-structure.md`, `docs/galaxy-sports-edge-master-action-plan.md`.

### 2026-05-23 — Master plan persisted as canonical source of truth

**Decided by:** Claude (autonomous, per delegated authority)
**Status:** locked
**Decision:** persist the Galaxy Sports Edge Master Action Plan at
`docs/galaxy-sports-edge-master-action-plan.md` as the canonical
single source of truth, superseding all prior briefs.

**Context:** the product owner provided a comprehensive 7-part action
plan that consolidates every prior brief and locks 26 decisions. The
plan's own rehydration procedure (Part 1.5) requires the file to live
at this path.

**Alternatives considered:**

- Embed only the decisions in the decision log without persisting the
  full plan. Rejected — losing the narrative context (positioning,
  voice rules, phasing rationale) would force every future Claude /
  Codex session to be re-briefed from scratch.

**Rationale:** every future agent session, every PR review, every phase
brief reads from this file first. Without it persisted, the autonomous
loop has no foundation.

**Reversibility:** easy. The file can be deleted or replaced.

**Touched:** `docs/galaxy-sports-edge-master-action-plan.md`,
`docs/ops/decision-log.md`, `docs/ops/issue-queue.md`,
`docs/ops/stuck-queue.md`, `docs/ops/improvement-backlog.md`.

### 2026-05-23 — Autonomous loop is the default operating mode

**Decided by:** owner (delegation), Claude (codified)
**Status:** locked (master plan decision #25)
**Decision:** the autonomous collaboration loop (master plan Part 1.5)
is the default. The owner manages by exception via `stuck-queue.md`.

**Context:** the prior plan put the owner inside every loop. Bottleneck
the size of one human.

**Alternatives considered:**

- Owner-in-the-loop on every PR. Rejected — doesn't scale and burdens
  the owner with routine work.

**Rationale:** explicit STUCK criteria + retry limits + shared queues
make autonomous safe. Owner sees real escalations clearly, not buried
in chat history.

**Reversibility:** easy. Owner can override at any time.

**Touched:** the entire operating model.
