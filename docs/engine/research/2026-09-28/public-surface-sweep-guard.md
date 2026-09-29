# Public surface keep-out sweep, promoted from a doc to a CI guard (2026-09-28)

**Follows `surface-exposure-sweep.md` in this folder, which recommended exactly
this: "re-run this as a CI guard... extended from 7 named surfaces to a pattern
sweep." That recommendation is now implemented, not just written down.

**Artifact:** `apps/web/__tests__/public-surface-sweep.test.ts` (9 tests). Runs
under the existing `npm test` job in `.github/workflows/ci.yml` — no CI config
change was needed or made.

## What it does

Walks every `route.ts` and `page.tsx` under `apps/web/app` (445 files),
excluding the `admin`, `auth` and `api/internal` trees. Each file is matched
against twelve keep-out patterns taken verbatim from the doctrine's keep-out
list (raw NGS rows, QBR, separation, WOPR, EPA, signal ledger, calibration
internals, edge internals, adjustment layer, truth-catalog topology, source
registry, raw player-week rows). A match is a **finding** only if the surface is
also ungated: no gate in the file, no gate in an ancestor layout, and no
recorded allow-list entry.

## The result: 0 exposures, and the search is not vacuous

The sweep found 42 matching files, all resolved. Twelve initially matched with
no *file-local* gate. Every one was benign, but two of the reasons were
structurally invisible to the 2026-09-28 sweep, which is the actual finding of
this iteration:

- **`/stats/*` is gated one level up.** `stats/trenches`, `stats/injuries` and
  `stats/watchlist` carry no gate of their own; `app/stats/layout.tsx` calls
  `isStatsPublic()` and `notFound()` for the whole subtree. A file-local scan
  reads them as ungated. They are not, and the guard now resolves ancestor
  layouts rather than trusting the file.
- **Cron routes authenticate through a helper, not a literal.**
  `api/cron/engine-dfs-slate/route.ts` is the only cron route with no
  `CRON_SECRET` string in it, because it calls `cronAuthError(request)` from
  `lib/cron/authorize`. Pattern-matching for the literal would have flagged it
  as an unauthenticated internal surface. It is authenticated.

The rest were vocabulary false positives: "magnitude" in a JSX comment, "opportunities"
in a marketing headline, "separation" in affiliate-disclosure copy, and the
word "isotonic" inside a JSDoc block in `board/gate/page.tsx` that is never
rendered.

## Three bugs this guard had, caught by testing the guard

A guard that has never been shown a failure is a hypothesis. Each of the
following was found by injecting a real leak and confirming the suite went red:

1. **Case-sensitive metric patterns.** A page containing `const wopr = 1` with no
   gate passed cleanly, because the pattern was `\bWOPR\b` and the spelling that
   actually ships in a column name or payload key is lowercase. Now
   case-insensitive with word boundaries, so it still does not fire on
   "separate". This was a genuine hole, not a fixture artifact.
2. **Flag polarity.** The default-off-flag pattern matched `=== "true"` only, so
   a gate written the other way (`!== "true"`, which is what `stats/layout.tsx`
   effectively does) was invisible. Both polarities are now recognized.
3. **Partial redirect treated as a gate.** Any file containing `redirect(`
   counted as fenced, including one that redirects in a single branch and
   renders keep-out data in another. The redirect is now checked
   structurally: it only counts if the handler cannot render at all.

Bug 2 deserves emphasis because of how it hid. The `/stats/*` pages passed
*only* because they were on the allow-list. The allow-list was masking a broken
predicate underneath it. I removed those three entries so the ancestor-layout
path has to carry them, and the suite stayed green — which is the only evidence
that the fix is real.

`apps/web/__tests__/public-surface-sweep.test.ts` pins all three as literal
regression cases, so they cannot silently return.

## What a green run still does not prove

Unchanged from the original sweep, and it is the more important half: this is
static text matching. It cannot see a leak from composing two allowed payloads,
from a route re-exporting another route's data under a different shape, from a
runtime query returning a keep-out column without naming it, or from an
`apps/web/lib/**` component rendered inside a page this cleared. It also
matches source text, so a match inside a comment is a finding to adjudicate, not
a leak.

A green run means **"no ungated public route or page names keep-out material"**.
It does not mean the public surface is proven clean. The allow-list is the
pressure valve, and it is the part a future editor could abuse: every entry
carries a mandatory recorded reason (enforced by a test), and stale entries
whose file no longer exists are rejected, but a determined future contributor
can always add a false exemption. That is a human review problem, not a
tooling one.

## Open item for the founder (unchanged, still not mine to decide)

`/api/nflverse/qbr` is premium-rate-limited, not anonymous, and returns a named
metric family the doctrine lists as internal. Fencing it is an entitlements
decision about a paying tier. Not actioned. It is allow-listed nowhere in this
guard, so it will surface as a finding if its gate is ever removed.

*New code: one test file. No gate moved, no flag flipped, no threshold touched.
Typecheck, lint, and the fence suite pass; the one typecheck failure is
pre-existing in `packages/data-ingestion` (uninstalled `@nflverse/nflreadts`)
and reproduces with this file removed.*
