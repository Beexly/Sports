# ADR 001 — Public Performance Policy as the Single Source of Truth

**Date:** 2026-05-18
**Status:** Accepted
**Author:** Launch Observatory autonomous loop

## Context

Before this change, customer-facing surfaces (`/dashboard`,
`/performance`, the `recentRecord` in `/api/picks/daily-slate`) each
queried `db.pick` directly and applied their own ad-hoc filters and
math to derive a record / win-rate. Three problems came from that:

1. **Inconsistency.** The dashboard counted PUSH in the denominator;
   the performance page didn't. The daily-slate API returned
   `recentRecord` regardless of the `canExposePerformanceStats` gate.
2. **Bootstrap leakage.** The dashboard's 14-day list did not filter on
   `isBootstrap: false`. A bootstrap streak could be exposed as a real
   win rate to a logged-in user.
3. **Gate bypass.** The dashboard didn't reference
   `getReadinessGates().canExposePerformanceStats` at all — it just
   showed whatever `db.pick.findMany` returned.

The audit phase of this work surfaced each of these.

## Decision

Introduce a pure, I/O-free function as the single decision point for
"can this surface make a public performance claim right now?":

```ts
evaluatePublicPerformancePolicy({
  canExposePerformanceStats,    // readiness gate
  minSettledPicksForLearning,   // platform-config minimum
  canonicalSettledCount,        // count of settled non-bootstrap picks
  bootstrapCount,
  pendingCount,
  canonicalWins, canonicalLosses, canonicalPushes,
  recentTotalCount, recentBootstrapCount,
}) → {
  canExposePerformanceStats,
  blockers, primaryReason,
  publicWinRate, publicRecord,
  publicMessage,                // customer-safe — disclaimer baked in
  operatorMessage,              // cockpit-precise — internal terms OK
  minimumRequirements,
}
```

Rules, evaluated in order:

1. If `canExposePerformanceStats` is false → block,
   reason `GATE_OFF_PERFORMANCE_STATS`.
2. If `canonicalSettledCount < minCanonical` → block,
   reason `INSUFFICIENT_CANONICAL_SAMPLE`.
3. If the recent window is entirely bootstrap → block,
   reason `ALL_RECENT_PICKS_BOOTSTRAP`.
4. Otherwise → allowed.

Every customer-facing surface that wants to display a record or
win-rate must compute its counts and call this function. The function
is pure so it can be exhaustively unit-tested without a database.

## Consequences

**Positive:**
- Customer surfaces agree on the answer to "is this safe to show?"
- Bootstrap leakage is impossible: bootstrap picks are not in any of
  the counts the policy reads.
- The disclaimer ("Past performance does not guarantee future results")
  is embedded in every `publicMessage`, so the page can't accidentally
  omit it.
- The asymmetry is deliberate: `publicMessage` is brand-safe; the
  separate `operatorMessage` carries the precise numbers and the
  internal vocabulary (`canonical`, `bootstrap`, `PERFORMANCE_STATS_ENABLED`)
  the cockpit needs.

**Negative:**
- Two queries per page (counts for the policy + display data).
  Acceptable; counts are O(milliseconds) at our scale.
- New contributors must learn the policy boundary before adding a
  customer-facing claim. The CONTRIBUTING.md captures this.

**Tested invariants** (see `apps/web/__tests__/`):
- `public-performance-policy.test.ts` — the policy's mapping table.
- `dashboard-performance-gate.test.ts` — every relevant API + page
  references the policy or the gate.
- `policy-only-winrate.test.ts` — no other file does ad-hoc win-rate
  math.
- `metadata-banned-phrases.test.ts` — metadata never contains banned
  hype, including in the `description` field.

## Alternatives considered

- **Gate-only.** Use `getReadinessGates()` directly in each page. Rejected
  because it duplicates the sample-size check and the bootstrap-recent
  detection at every call site.
- **API-driven.** Have every page call `/api/performance` and use its
  response. Rejected because it adds latency for a synchronous server
  component and because the policy still needs to live somewhere.
- **Embed in `getReadinessGates()`.** Tempting, but the readiness gate
  is about *capability* (can we expose this?); the policy is about
  *application* (here's the message, the record, the win rate). Keeping
  them separate makes both clearer.

## Out of scope

- Defensive input clamping. The policy trusts its inputs; the loader
  layer is responsible for well-formed counts. (The original loop did
  add clamping; it was reverted intentionally — the policy stays
  simple.)
- Multi-region rollouts. The gate is a single boolean today.
- Per-tier policy variations (e.g. show a record to PRO but not FREE).
  If we add this, it goes inside the policy, not in the page.
