# SURF-2: a real exposure the route-level sweep could not see (2026-09-28)

**A confirmed leak, found and fenced.** Not a measurement, not a near-miss: an
anonymous public route that published the source stack, found by walking the
import graph instead of reading route files.

## The exposure

`apps/web/app/api/sources/catalog/route.ts` was anonymous, rate-limited at 60
requests/minute per IP, and returned:

- `DATA_SOURCE_STACK` — the full list of feeds, by name: "The Odds API",
  "Sleeper public API", "Premium charting overlays", "Airwave transcript
  spreadsheet", "Beat reporter source mesh", "Galaxy Studio asset engine",
  "Scores24 reference feed"
- a per-source `status` carrying the refused ones: `permission-required`,
  `founder-gated`, `planned`, `waiting-for-real-observations`
- `providerStatuses()` including the **`envVar` name behind every provider**,
  which maps the shop's wiring to its configuration

The doctrine names this exact shape on its keep-out list: "Data sources: which
sources are used *and* which were refused (that is competitive intel)."

**A rate limit is not a fence.** 60/min throttles a scraper; it does not
withhold the payload. The route was treating its own rate limiter as if it
answered the doctrine.

## Why the earlier sweep cleared it

`surface-exposure-sweep.md` in this folder swept 403 routes and reported zero
exposures, and it was wrong about this one. Not sloppy — structurally blind.
The route's own text names no keep-out column. It reads:

```ts
import { DATA_SOURCE_STACK, PUBLIC_DATA_SOURCES, ... } from "@/lib/data-sources/catalog";
```

The keep-out data lives one import away, in a `lib/` module. A guard that reads
one file at a time sees a clean route. This is the limitation the earlier doc
listed as "does not cover `lib/` components rendered inside cleared pages" — it
turned out to be the one that mattered, and it found a live exposure on the
first run.

The corrected method was to walk the import graph from every public page
(403 pages, BFS to depth 4, resolving `@/` aliases) and look for keep-out
vocabulary in any reachable `lib/` or `components/` module.

## What the transitive sweep actually found

First run: 272 of 403 public pages "reaching keep-out vocabulary" — which was
almost entirely noise. `lib/auth.ts` and `lib/entitlement-observability.ts`
appeared on nearly every page because the keep-out list contained the bare
words `carries` and `opportunities`, which match the English in comments
("carries a claim", "hidden opportunities"). 272 findings, zero signal.

After tightening those patterns to data-shaped tokens (`target_share`,
`rush_yards`, `receiving_yards`, `fumbles_lost`, `opportunities:`), the same
sweep returned 113 pages, of which 43 were ungated. Most of the remainder are
`/admin/**` and `/cockpit/**`, which are session-gated at the layout.

**`/api/sources/catalog` was the one genuine public exposure.**

## The fix

Fenced in the existing registry rather than by a new mechanism:

- `INTERNAL_API_ROUTES["/api/sources/catalog"]`, opt-in flag
  `SOURCES_CATALOG_PUBLIC` (founder-owned under law 3; this change does not set
  it, and the route is dark by default)
- the route refuses before its rate limiter and before any loader runs
- uses the same `internalSurfaceBlockedResponse` envelope as `/api/calibration`
  and `/api/gse/v1/truth`, with `Cache-Control: no-store`
- two public pages linked a "Data sources" button at it (`/fantasy`,
  `/fantasy/baseline`); those links are removed, because a dark link is a
  broken product surface, not a fence. The cockpit's own sources page still
  works — it is session-gated and is the correct home for this.

**The founder may disagree**, and that is the point of the flag: the doctrine
also says "the cleared/forbidden source registry is trust-building copy" in its
own review notes. Showing the *cleared* sources is a legitimate founder product
call. The fence makes it one flag instead of a code change, and it is dark until
he makes it.

## Verification

- new `apps/web/__tests__/source-catalog-fence.test.ts`: dark by default, and
  the serialized 404 body is asserted not to contain a provider name, an
  `envVar`, or a refused-source status (a refusal that leaked in its error
  envelope would be the same leak, quieter)
- **non-vacuity proven by removing the guard call** and re-running: the test goes
  red, restoring it goes green. A green fence test that was never seen to fail
  proves nothing.
- `internal-surface-fence.test.ts` extends itself: the flag list, the
  "refuses before it loads anything" wiring check, and the policy map. Its
  loader-order check needed `loadSourceLiveEvidence` added to its known-loader
  set. That set was left as an explicit list rather than loosened to a generic
  `load*(` regex: the generic version produced a false "has no loader to guard"
  failure on `/api/gse/v1/truth`, a correctly-wired route this change did not
  touch. Weakening an assertion to accommodate a new route would have hidden a
  real regression in a pre-existing one.
- `npx tsc --noEmit -p tsconfig.json` in `apps/web`: clean
- eslint `--max-warnings=0` over `app lib __tests__`: clean
- 29/29 across source-catalog-fence, internal-surface-fence, public-surface-sweep,
  and board-phase2-routes

## What this does NOT prove

The transitive sweep is still a static text match over the import graph, to
depth 4, resolving only statically-analyzable `@/` imports. It still cannot see
a leak built by composing two allowed payloads, a dynamically-constructed
import, a value fetched from the database under a name that reads like a
projection, or a module reached through a barrel file that re-exports under a
different name. It is a wider net than the route-level sweep, not a proof.

It also is not a CI guard yet. This finding was made by a scratch script, not by
anything that runs on every commit. Turning the transitive walk into a second
pass inside `public-surface-sweep.test.ts` is the obvious follow-up and is
unblocked.

**No threshold, gate, or flag was moved. `SOURCES_CATALOG_PUBLIC` is new and
unset, which makes the surface darker than it was, never brighter.**
