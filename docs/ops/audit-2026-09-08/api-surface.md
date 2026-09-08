# Audit 2026-09-08: Dimension: every API route

Read-only audit. Scope: every `apps/web/app/api/**/route.ts` (180 files). No source
was modified. Nothing below proposes flipping a gate, weakening a guard, lowering a
threshold, or skipping a test.

Punctuation note: the only em dashes in this file sit inside verbatim quotations of
repo source and are reproduced unaltered. No em dash appears in copy authored here.

Baseline rules this is graded against, quoted from the repo itself:

- `.claude/rules/api-gating.md` rule 2: "Every premium route handler under
  `apps/web/app/api/**` calls `gateApi`, `requirePremiumApi`,
  `requirePremiumApiRateLimited`, `requireFantasyApi`, or
  `requireFantasyApiRateLimited` before touching the database or composing a
  response body."
- `.claude/rules/nextjs-caching.md` rule 2: "Every such API route returns via
  `jsonNoStore`, including error/gate responses (503 bootstrap/stale-data gates, 403
  entitlement denials) — not just the 200 happy path. A cacheable error is exactly as
  dangerous as a cacheable success."
- `.claude/rules/nextjs-caching.md` rule 3: "Entitlement-dependent output is never
  cached, full stop."
- `apps/web/lib/api/no-store.ts:21-23` (header comment): "`dynamic = "force-dynamic"`
  governs Next's own render cache; it does not promise anything about an
  intermediary, so say it explicitly."

That last line is the load-bearing premise for most of what follows: the repo's own
written position is that `force-dynamic` alone is **not** sufficient to stop an
intermediary cache, and `jsonNoStore` is the required mechanism.

---

## What I checked (with commands run)

```bash
find apps/web/app/api -name "route.ts" | sort | wc -l     # -> 180
```

Machine scan of all 180 files (script written to the scratchpad, not the repo) that
recorded, per file: exported HTTP methods, `export const dynamic`, `revalidate`,
`runtime`, count of `jsonNoStore(` vs `NextResponse.json(` vs `new NextResponse(`,
presence of `await auth()`, which entitlement helper is imported, which cron/ops auth
helper is imported, whether `zod` is imported, and whether `ADMIN` appears.

```bash
node <scratchpad>/scan.mjs        # produced the full table in the appendix
```

Targeted greps and full reads:

```bash
cat .claude/rules/api-gating.md .claude/rules/nextjs-caching.md
cat apps/web/lib/api-entitlement.ts
cat apps/web/lib/api/no-store.ts
cat apps/web/lib/cron/authorize.ts apps/web/lib/ops/ops-auth.ts
cat apps/web/lib/auth/require-admin.ts apps/web/lib/auth/csrf-origin-guard.ts
cat apps/web/lib/b2b/api-key-auth.ts apps/web/lib/gse-stats/session-tier.ts

grep -rn 'mode:\s*"dual"\|"dual"' apps/web/app/api/            # -> 0 hits
grep -rn -A2 'cronAuthError(' apps/web/app/api/cron/           # all 25 cron routes
grep -rn "auth()|isAdmin|FOUNDER|ADMIN" apps/web/app/api/cockpit/
grep -rn "Cache-Control|cache-control|s-maxage|max-age" apps/web/app/api/ | grep -v no-store
grep -rln "csrfOriginCheck" apps/web/app/api/                  # -> 2 files
grep -rln "export async function (POST|PATCH|DELETE|PUT)" apps/web/app/api/  # -> 40 files
grep -rn "err instanceof Error ? err.message|error: msg" apps/web/app/api/
grep -rl "requirePremiumApi|requireFantasyApi|gateApi(" apps/web/app/api/ --include=route.ts
  # then filtered to those with no jsonNoStore -> 35 files
grep -rn "sameSite|cookies|session:|trustHost" apps/web/lib/auth.ts
grep -rn "DEV_FAKE_ADMIN" apps/web/lib apps/web/app
grep -rn "no-store, must-revalidate|private, no-cache, no-store" node_modules/next/dist/server/
```

Files read in full: `api/picks/route.ts`, `api/picks/daily-slate/route.ts`,
`api/picks/[id]/explain/route.ts`, `api/board/state/route.ts`,
`api/board/passes/route.ts`, `api/clv/route.ts`, `api/performance/route.ts`,
`api/calibration/route.ts` + `lib/calibration/report.ts` head,
`api/calibration/{elo,market}-backtest`, `api/calibration/replay-provenance`,
`api/brief`, `api/dev/state`, `api/verify`, `api/verify/slate`,
`api/verify/slate/opening`, `api/proof/{ledger,receipts}`, `api/v1/probabilities`,
`api/v1/signals`, `api/v1/openapi`, all seven `api/gse/v1/*` POST/GET handlers read,
`api/contests/{enter,week}`, `api/waitlist`, `api/age-verify`,
`api/moderation/anonymous-report`, `api/cipher/verify`, `api/promotions`,
`api/watchlist/*`, `api/push/*`, `api/subscriptions/{checkout head,portal}`,
`api/webhooks/stripe` (auth path), `api/ops/*` (auth + response headers),
`api/health` + `lib/health/live-capability-probes.ts`, `api/cockpit/history/export`,
`api/cockpit/{agents,tasks,tasks/[id],calibration,content,bot-outbox/preview}`,
`api/admin/*`, `api/airwave/*`, `api/media/readiness`, `api/decision-genome`,
`api/sleeper/{league,leagues}` + `lib/integrations/sleeper-sync.ts` URL building,
`api/intelligence/{graded-pool,team-ratings,roster-advice}`, `api/tools/lineup`,
`api/projections`, `api/dfs/salaries`, `api/scoring/player-index`,
`api/receipts/[id]`, `api/receipts/verify`, `api/cron/autonomy-cycle` auth block,
`api/cron/gamma`, `lib/ops/traffic-heartbeat.ts` cooldown.

---

## Findings

### BLOCKER: none

I found no route that serves PRO/ELITE-only *content* to an unauthenticated caller by
its own logic, no cron route reachable without its secret, and no route that lets a
query parameter elevate a tier. The most severe items below are edge-cache exposures
and kill-switch scope gaps, which I have graded MAJOR rather than BLOCKER because each
requires a shared intermediary cache or a provisioned key to exploit and I could not
verify the production edge behaviour from inside this repo.

---

### MAJOR 1: The entitlement gate helper itself emits cacheable 401/403/429, and 35 gated routes return their paid 200 body the same way

**Evidence.**

`apps/web/lib/api-entitlement.ts:86-89` (401), `:108-111` (403), `:170-176` (429),
`:225-231` (429) all return a bare `NextResponse.json(...)` with no `Cache-Control`.
Every one of `gateApi`, `requirePremiumApi`, `requirePremiumApiRateLimited`,
`requireFantasyApi`, `requireFantasyApiRateLimited` funnels through those four
returns, and `.claude/rules/api-gating.md` rule 4 requires callers to "`return` it
immediately as the handler's response" - so the helper's header choice is the final
header on the wire for every denial in the app.

Separately, these 35 gated route files contain zero `jsonNoStore` calls (command and
full list in the appendix):

```
apps/web/app/api/dfs/salaries/route.ts
apps/web/app/api/intelligence/{clv-calibration,expected-points,opportunity-transfer,
  player-archetypes,player-model,player-movers,predictiveness,qb-consensus,qb-forward,
  receiving-opportunity,roster-advice,route-rate,rush-schemes,rushing-contact,
  rushing-efficiency,scoring-zone,sleeper-trending,team-environment,team-ratings}/route.ts
apps/web/app/api/nflverse/{birthday-usage-trend,combine,edge-signals,expected-metrics,
  injuries,next-gen-stats,player-lab,pressure-coverage,qb-age-rb-trend,qbr,snap-share,
  usage-pulse}/route.ts
apps/web/app/api/projections/route.ts
apps/web/app/api/scoring/player-index/route.ts
apps/web/app/api/tools/lineup/route.ts
```

Concretely: `apps/web/app/api/intelligence/team-ratings/route.ts:22` returns the paid
payload as `NextResponse.json({ success: ..., data })` with only
`export const dynamic = "force-dynamic"` at line 11.

**What is specifically wrong.** These bodies are entitlement-shaped output at a single
URL with no `Vary` and no `Cache-Control`. `.claude/rules/nextjs-caching.md` rule 3
says "Entitlement-dependent output is never cached, full stop", and `no-store.ts:17-24`
names exactly this failure ("a shared cache entry populated by one tier and served to
another is a paywall bypass at the edge"). The sibling route
`apps/web/app/api/intelligence/graded-pool/route.ts:20-26` already does it correctly and
its inline comment cites the same two rules by number, which is what makes the other 35
a drift rather than a design choice. The denial side is the mirror image: a cached 403
keeps refusing a user who just upgraded, and a cached 429 keeps refusing a caller whose
window has reset - `board/passes/route.ts:11-14` already documents that second case as
a reason to no-store a limiter response.

**Proposed fix.** Change the four returns in `apps/web/lib/api-entitlement.ts` to go
through `jsonNoStore` (it already accepts `{ status, headers }`, so the `Retry-After`
header on the 429 paths survives verbatim), and change the terminal
`NextResponse.json(...)` in each of the 35 route files to `jsonNoStore(...)`. No status
code, body, or gate order changes. Optionally add a guardrail script that fails when a
file importing a gate helper contains `NextResponse.json` on a return path - the repo
has 26 guards but none currently mentions `jsonNoStore` or `no-store`
(`grep -rln "jsonNoStore\|no-store" scripts/guardrails/` returns nothing).

**Risk of fix.** Very low. `jsonNoStore` (`apps/web/lib/api/no-store.ts:27-38`) is a
thin wrapper over `NextResponse.json` that spreads caller headers first and applies
`Cache-Control` last, so no existing header can be lost. The change is mechanical and
each route already has tests exercising its status codes.

---

### MAJOR 2: `PUBLIC_PICKS` does not reach the two B2B pick surfaces; `/api/v1/probabilities` reads no readiness gate at all

**Evidence.**

`apps/web/app/api/v1/probabilities/route.ts` - a grep for `ReadinessGates|canExpose`
over that file returns nothing. It queries `db.pick.findMany` (`:44-66`) for
`isPublished: true` rows and returns `pModel`, `rankingP`, `marketFairProb`,
`modelVersion` per row.

`apps/web/app/api/v1/signals/route.ts:38-41` calls `getReadinessGates()` but uses the
result **only** to pick a `claimPosture` string. `canExposePublicPicks` is never
consulted. `:57-88` returns `selection`, `line`, `modelConfidence`, `rankingP` and the
matchup for up to 50 published picks.

Contrast `apps/web/app/api/picks/route.ts:46-49` and
`apps/web/app/api/picks/daily-slate/route.ts:63-65`, both of which return 503 when
`!gates.canExposePublicPicks`. The daily-slate file carries a long comment (`:47-62`)
recording that this exact divergence was already found and fixed once: "with
`PUBLIC_PICKS_ENABLED=false` `/api/picks` went dark (503) while this endpoint kept
answering 200 ... Two public pick endpoints must not disagree about whether picks are
public."

**What is specifically wrong.** The public-picks kill switch is scoped to the web
surfaces only. With it off, `/api/picks` and `/api/picks/daily-slate` go dark while
`/api/v1/signals` and `/api/v1/probabilities` keep serving the same underlying pick
rows to any holder of a `GSE_B2B_API_KEYS` entry. AGENTS.md law 3 calls these gates
"the honesty boundary"; a boundary with two doors and a latch on one is the same defect
the daily-slate comment describes. Note this is not a public leak - `resolveB2bKeyScope`
(`apps/web/lib/b2b/api-key-auth.ts:63-79`) returns `null` for any unrecognised key, and
a bare key is correctly scoped to `tier: "FREE"` rows only (`v1/signals:63`,
`v1/probabilities:51`). The problem is scope of the switch, not authentication.

Secondary observation on the same two routes (**MINOR**, listed here for context): a
`free`-scope B2B key receives `modelConfidence` / `pModel` on FREE-tier picks and up to
50 rows, whereas a FREE web viewer gets no confidence at all
(`apps/web/app/api/picks/route.ts:249` - `entitlements.canSeeConfidence ? pick.confidence
: null`) and at most `dailyPickLimit` rows, and never sees rows that fail
`passesPublicSelectiveFilterAsync` (`picks/route.ts:194-201`), which the B2B routes do
not apply. The B2B FREE scope is therefore a strict superset of the web FREE
entitlement. That may be intentional for a paid integration contract, but it is not
written down anywhere I found.

**Proposed fix.** Add the same guard both `/api/picks` handlers use, at the top of each
handler after the key check: read `getReadinessGates()` and return the existing
`bootstrapGateResponse(...)` shape (via `jsonNoStore`, which both files already import)
with status 503 when `canExposePublicPicks` is false. Separately, decide and document
whether the `free` B2B scope is meant to exceed the web FREE tier, and if not, apply
the same confidence-withholding and daily cap.

**Risk of fix.** Low for the gate (it only closes a path that is currently open, and
`canExposePublicPicks` is on today so behaviour is unchanged in the current
configuration). The B2B parity question is a product decision, not a code fix, and
should not be made by an agent.

---

### MAJOR 3: `/api/proof/ledger` sets a 5-minute shared cache on a founder-gated honesty surface

**Evidence.** `apps/web/app/api/proof/ledger/route.ts:27-32`:

```ts
return NextResponse.json(doc, {
  status: 200,
  headers: { "cache-control": "public, max-age=300, s-maxage=300" },
});
```

`buildMachineProof()` embeds `loadLedgerView()` verbatim
(`apps/web/lib/proof/machine-proof.ts:93`), and `loadLedgerView` is gated on
`process.env["PUBLISH_LEDGER"] !== "true"` (`apps/web/lib/ledger/ledger-view.ts:86`).
The route's own header comment (`:14-16`) calls that "the ONE founder-gated seam".

**What is specifically wrong.** `s-maxage=300` explicitly authorises a shared
intermediary to hold this body for five minutes. That makes the `PUBLISH_LEDGER` switch
lossy in both directions: turning it **off** does not take the published record off the
wire for up to five minutes, and turning it **on** leaves an honest-empty body in front
of it for up to five minutes. `apps/web/lib/api/no-store.ts:8-16` describes precisely
this ("A kill switch you cannot reliably close is not a kill switch") as the reason
`jsonNoStore` exists. The same `s-maxage` pattern appears on
`apps/web/app/api/proof/receipts/route.ts:167` (`max-age=120, s-maxage=120`) and
`apps/web/app/api/promotions/route.ts:51` (`max-age=60, s-maxage=300`).

For `proof/receipts` the exposure is materially smaller and arguably acceptable: its
query is filtered to settled-and-kicked-off receipts (`:81-88`), a population that only
grows, so a stale page is incomplete rather than wrong. For `/api/promotions` the risk
is different in kind: `buildPublicPromotionsResponse` takes a `now` for expiry
filtering (`apps/web/lib/promotions/public-payload.ts:57,84`), so `s-maxage=300` permits
serving a compliance-filtered promotion for up to five minutes past its own expiry -
which the route's comment (`:11-12`, "Cache headers permit a brief cache to keep the
page snappy without serving expired promos") asserts it does not do.

`/api/v1/openapi:66`, `/api/gse/v1/catalog:17`, `/api/proof/openapi.json:16` and
`/api/proof/verification-spec.json:18` also set public caches; those bodies are static
specification documents and caching them is correct.

**Proposed fix.** Return `/api/proof/ledger` through `jsonNoStore`. For
`/api/promotions`, either drop `s-maxage` to zero or shorten it below the shortest
meaningful expiry granularity, and correct the header comment either way. Leave
`proof/receipts` and the four spec documents as they are, or reduce `proof/receipts`
to `s-maxage=0` if the founder wants the ledger family uniformly uncached.

**Risk of fix.** Low; a small increase in origin requests on three read-only routes,
all of which are already rate-limited per IP (`proof/receipts:36`, `promotions` has no
limiter - see MINOR 6).

---

### MAJOR 4: Public performance and calibration surfaces do not use `jsonNoStore` on either their gate response or their data response

**Evidence.**

- `apps/web/app/api/clv/route.ts` - `dynamic = "force-dynamic"` at `:7`; the
  `canExposePerformanceStats` gate returns `NextResponse.json(bootstrapGateResponse("CLV"),
  { status: 503 })` at `:39` and again at `:50`; the 429 at `:31`; the 200 at `:53`.
  Zero `jsonNoStore` calls in the file.
- `apps/web/app/api/calibration/route.ts:8` - the entire handler is
  `return NextResponse.json({ success: true, ...payload })`. The gate lives inside
  `loadPublicCalibrationReport` (`apps/web/lib/calibration/report.ts:17-32`), which
  returns a distinct "gated" body when `resolveEffectivePerformanceGate()` says no. So
  the body flips shape when the founder gate flips, on a route with no cache header.
- `apps/web/app/api/picks/[id]/explain/route.ts` - 12 `NextResponse.json` returns,
  zero `jsonNoStore`, including the `canExposePublicPicks` 503 at `:61` and the PRO/ELITE
  403 at `:73-76`.
- `apps/web/app/api/brief/route.ts:26` and `apps/web/app/api/dev/state/route.ts:13,17`
  are the two remaining gate-reading routes on bare `NextResponse.json`.

The correct-by-comparison siblings are `apps/web/app/api/performance/route.ts` (three
`jsonNoStore` calls, including the 503 gate at `:12` and the 429 at `:19`) and
`apps/web/app/api/picks/route.ts` (five, including both 503 gates).

**What is specifically wrong.** `.claude/rules/nextjs-caching.md` rule 1 names
"calibration" and "settlement" explicitly, and rule 2 requires the gate responses
themselves to be no-store. `/api/calibration` is the public face of the number the
PROVEN decision turns on; if an intermediary holds a gated-empty body across a gate
flip, the site publishes the wrong state of its own honesty gate, in whichever
direction. `/api/clv` has the same shape. `picks/[id]/explain` is a POST, which no
conforming shared cache stores, so its severity is lower - I list it for completeness
rather than as an active exposure. `dev/state` returns 404 in production (`:13-15`), so
it is a non-issue there.

**Proposed fix.** Route `/api/clv` (all four returns), `/api/calibration` (one return),
`/api/brief`, and `picks/[id]/explain` (all twelve) through `jsonNoStore`. Import is
already available repo-wide.

**Risk of fix.** Very low; mechanical, no logic change.

---

### MAJOR 5: `csrfOriginCheck` exists, names checkout and review mutations in its own docstring, and is wired to only two of the 40 mutating routes

**Evidence.** `grep -rln "csrfOriginCheck" apps/web/app/api/` returns exactly two files:
`push/subscribe/route.ts` and `push/unsubscribe/route.ts`.
`grep -rln "export async function (POST|PATCH|DELETE|PUT)"` over the same tree returns
40 files. The guard's own header comment
(`apps/web/lib/auth/csrf-origin-guard.ts:7-11`) says it is for "state-changing
endpoints that rely on session cookies for authorization (e.g. push
subscribe/unsubscribe, **checkout**, **review mutations**). A cross-site POST with a
valid session cookie would otherwise sail through server-side auth checks." Neither
`apps/web/app/api/subscriptions/checkout/route.ts` nor
`apps/web/app/api/cockpit/content/[id]/review/route.ts` calls it.

**What is specifically wrong.** The gap is between the guard's stated scope and its
actual wiring. The mitigating fact, and the reason I did not grade this higher: I found
no cookie override in `apps/web/lib/auth.ts` - `grep -n "sameSite|cookies|session:"`
returns only `trustHost: true` (`:73`) and `session: { strategy: "jwt", maxAge: ... }`
(`:82`) - so the NextAuth v5 session cookie takes the library default `SameSite=Lax`,
which browsers do not attach to a cross-site POST. **NOT VERIFIED:** I did not observe
the `Set-Cookie` header on a running instance, and I did not confirm the NextAuth v5
default from its source in `node_modules`. If that default ever changes, or a future
edit sets `sameSite: "none"`, 38 mutating routes lose their only CSRF protection at
once with nothing in CI to notice.

The affected set, from the same grep, includes every cockpit mutation
(`journal`, `journal/[id]/{retract,scan,submit}`, `tasks`, `tasks/[id]`,
`content/[id]/review`, `api-costs/override`, `studio/generate`, `listener-log`,
`bot-outbox/preview`), `admin/losses/[pickId]/draft`, `admin/trigger-refresh`,
`subscriptions/{checkout,portal}`, `watchlist/{follow,unfollow}`,
`room/[gameId]/model-court`, and `picks/[id]/explain`. Routes on the list that are
*not* cookie-authorized (`webhooks/stripe` - Stripe signature at
`webhooks/stripe/route.ts:42-45`; `cron/gamma` - bearer; `ops/ranking-pause-apply` -
bearer; the anonymous public forms) do not need this guard.

**Proposed fix.** Add the existing `csrfOriginCheck(request.headers.get("origin"),
request.headers.get("referer"))` call, with the same 403 shape push already uses, to
the cookie-authorized mutating routes - beginning with the two the docstring already
names (`subscriptions/checkout`, `cockpit/content/[id]/review`) and the two
budget/state mutations (`cockpit/api-costs/override`, `admin/trigger-refresh`). Do this
as one reviewed change with tests, not a sweep: the guard fails closed when
`NEXT_PUBLIC_APP_URL` is unset (`csrf-origin-guard.ts:66-69`), so adding it blindly to
40 routes could break a non-production environment.

**Risk of fix.** Medium if applied broadly, low if applied route by route with a test
each. The fail-closed-on-missing-env behaviour is the specific thing to verify per
environment before landing.

---

### MINOR 1: `/api/health` publicly discloses money-path environment posture, and is the only unthrottled DB-touching public route

**Evidence.** `apps/web/app/api/health/route.ts` has no rate limiter (compare
`picks/route.ts:36`, `clv/route.ts:29`, `board/state/route.ts:16`,
`proof/receipts/route.ts:36`, all of which do). Its `capabilities` array is returned
verbatim (`:78`) and is built by `computeLiveCapabilityProbes`, whose money-path leaf
emits reason strings such as `"Stripe secret present; no STRIPE_*_PRICE_ID envs —
checkout depends on lookup_key resolution"` (`apps/web/lib/health/live-capability-probes.ts:63`)
and `` `Stripe secret + ${money.envPriceSlotsConfigured}/6 env price slots configured` ``
(`:71`). It also returns the deployment SHA (`route.ts:79`) and ingestion last-success
timestamps (`live-capability-probes.ts:141`).

**What is specifically wrong.** No secret value is disclosed - this is
presence-and-count only, and the database error path is already reduced to a static
`"database unreachable"` string with an explicit comment about not leaking the host
(`live-capability-probes.ts:117-119`), so the file is clearly aware of the concern.
Still, "how many of my six Stripe price IDs are configured" is internal deployment
posture on an anonymous endpoint. The sibling `/api/dev/state` returns 404 in
production for the same class of information (`dev/state/route.ts:13-15`).

`maybeRunTrafficHeartbeat()` (`route.ts:74`) can start ingestion work from an
unauthenticated GET, but it is protected by a Neon-backed 30-minute cross-isolate lease
(`apps/web/lib/ops/traffic-heartbeat.ts:62,118,173`) and only fires past the staleness
SLA, so it is not an amplification vector.

**Proposed fix.** Gate the `capabilities` / `capabilityGraph` / `schedulerLiveness`
fields behind `hasOpsAuth(request)` (`apps/web/lib/ops/ops-auth.ts`), the same
public-summary / operator-detail split `/api/ops/public-surface-truth` already uses
(`:158,164,203,391,750,889`), leaving `ok`, `status` and the HTTP code untouched so the
Nightly Sentinel and external uptime monitors are unaffected. Add an IP rate limit
matching the other public routes.

**Risk of fix.** Low, but must not change `ok`/`allOk`/HTTP status - the route's own
comments (`:52-56`, `:62-68`) record that external monitors depend on those semantics.

---

### MINOR 2: `/api/sleeper/league` has no rate limit; `/api/sleeper/leagues` has an unbounded module-scope cache

**Evidence.** `apps/web/app/api/sleeper/leagues/route.ts:19` calls
`consumeRateLimit("sleeper-leagues", clientIp(request), 20, 60_000)`.
`apps/web/app/api/sleeper/league/route.ts` has no limiter at all, and issues four
upstream fetches per call (`lib/integrations/sleeper-sync.ts:235-238`).

`sleeper/leagues/route.ts:13` declares `const resultCache = new Map<string, CacheEntry>()`
at module scope, keyed by `${username}:${season}` (`:33`), written at `:41`, and never
pruned or size-capped - entries are only checked for expiry on a matching read (`:35`).

**What is specifically wrong.** Two unauthenticated proxies to the same upstream API
with asymmetric protection, and a Map that grows with distinct usernames for the life of
the isolate. Neither is severe: `SLEEPER_URLS.user()` correctly wraps the username in
`encodeURIComponent` (`apps/web/lib/integrations/sleeper.ts:40`) so there is no path
traversal or host-substitution vector, and `leagueId`/`userId` are stripped to digits
and truncated to 32 chars (`sleeper/league/route.ts:10-11`).

**Proposed fix.** Add the same `consumeRateLimit("sleeper-league", clientIp(request),
20, 60_000)` to `/api/sleeper/league`. Give `resultCache` a size cap with eviction, or
sweep expired entries on write.

**Risk of fix.** Very low.

---

### MINOR 3: Six routes touching picks, entitlements or billing carry no `dynamic` / `revalidate` declaration

**Evidence** (from the full scan; column `dyn` in the appendix table):

| Route | Methods | Note |
|---|---|---|
| `/api/subscriptions/checkout` | POST | entitlement + billing |
| `/api/subscriptions/portal` | POST | billing |
| `/api/webhooks/stripe` | POST | billing |
| `/api/cockpit/tasks` | GET, POST | admin data, GET has no `dynamic` |
| `/api/cockpit/history/export` | GET | admin CSV of the pick ledger |
| `/api/age-verify` | POST | sets the 21+ cookie |

`/api/pledge/affiliate-free/route.ts:5` is the one deliberate `force-static`, and that
is correct - it serves a constant.

**What is specifically wrong.** `.claude/rules/nextjs-caching.md` rule 1 says
`force-dynamic` or `revalidate = 0` on "every page/route touching picks, odds, lines,
calibration, settlement, or entitlements — no exceptions". POST handlers are dynamic in
practice and every one of these calls `auth()` (which reads cookies and forces dynamic
rendering), so I found no live defect. `/api/cockpit/tasks` GET is the one that would
actually benefit, and `/api/cockpit/history/export` GET returns a 500-row CSV of the
pick ledger. Its 200 sets `Cache-Control: no-store` (`:130`) but its 403 does not
(`:30`, `new NextResponse("Forbidden", { status: 403 })`).

**Proposed fix.** Add `export const dynamic = "force-dynamic";` to the six files, and
add `"Cache-Control": "no-store"` to the 403 in `cockpit/history/export`.

**Risk of fix.** Negligible.

---

### MINOR 4: `cron/authorize.ts` documents a "dual" mode no route uses, and `cron/autonomy-cycle` carries a comment that no longer matches its behaviour

**Evidence.** `grep -rn 'mode:\s*"dual"' apps/web/app/api/` returns zero hits across all
180 routes. `resolveMode` (`apps/web/lib/cron/authorize.ts:50-53`) defaults to
`"bearer_only"`, so all 25 `cron/*` routes plus `ops/ranking-pause-apply` are bearer-only.

`apps/web/app/api/cron/autonomy-cycle/route.ts:52-56`:

```ts
// When execute is live, require Bearer so spoofed x-vercel-cron cannot drive acts.
// Dry-run plan may still use dual auth (platform header) for observability.
const denied = executeEnabled ? cronAuthErrorBearerOnly(request) : cronAuthError(request);
```

The `cronAuthError(request)` branch passes no options, so it resolves to
`bearer_only` too. The dry-run branch is identical in effect to the execute branch.

**What is specifically wrong.** This is a stale comment and dead configuration surface,
not a hole - the behaviour is *stricter* than documented, which is the safe direction.
It matters because someone reading `authorize.ts:22-27` ("Mode 'dual' is reserved for
read-only health-probe crons that must run from the Vercel cron runner with no injected
Authorization header") may conclude some cron survives without a Bearer token. None
does. Every scheduled route in `apps/web/vercel.json` depends on Vercel injecting
`Authorization: Bearer $CRON_SECRET`. **NOT VERIFIED:** I did not confirm from
production logs that the header is actually injected; the AGENTS.md scheduler notes
suggest crons are running, which is consistent, but that is inference not observation.

**Proposed fix.** Correct the two-line comment in `cron/autonomy-cycle/route.ts` to say
both branches are bearer-only, and collapse the ternary to a single
`cronAuthErrorBearerOnly(request)` call. Do **not** add `mode: "dual"` anywhere - that
would weaken auth, which AGENTS.md law 9 forbids. Leave the `dual` code path in
`authorize.ts` as-is or delete it in a separate reviewed change.

**Risk of fix.** None for the comment; the ternary collapse is behaviour-preserving.

---

### MINOR 5: `/api/verify` and `/api/verify/slate` gate on wall-clock kickoff and are not no-store

**Evidence.** `apps/web/app/api/verify/route.ts:112-125` decides `sealed` vs open from
`game.commenceTime.getTime() <= Date.now()` and `receipt.pick.result !== "PENDING"`.
Six `NextResponse.json` returns, zero `jsonNoStore`, `dynamic = "force-dynamic"` at
`:25`. Same shape in `verify/slate/route.ts` (five returns) and
`verify/slate/opening/route.ts` (five returns).

**What is specifically wrong.** The response for a fixed `?hash=` changes over time
without the URL changing. A cached response can only ever be the *sealed* one served
after it should have opened, because the population only moves one direction - so this
fails closed and is a freshness defect, not a disclosure defect. Listing it because
these are the endpoints whose entire purpose is that a skeptic gets a live answer, and
a stale "sealed" verdict on a settled pick undermines that.

**Proposed fix.** Return all three verify routes through `jsonNoStore`.

**Risk of fix.** Very low.

---

### MINOR 6: `/api/promotions` has no rate limiter

**Evidence.** `apps/web/app/api/promotions/route.ts:25-52` runs
`db.promotion.findMany({ take: 100 })` on every anonymous request with no
`consumeRateLimit` call, unlike the other public DB-reading routes
(`picks:36`, `daily-slate:36`, `clv:29`, `board/state:16`, `board/passes:9`,
`verify:35`, `proof/receipts:36`, `sources/catalog`).

**What is specifically wrong.** Inconsistency with the established pattern on a route
that does a bounded but real DB query per call. The `s-maxage=300` header absorbs most
of it at the edge in practice, which is presumably why it was never added - but that is
also the header MAJOR 3 recommends shortening, so the two should be changed together.

**Proposed fix.** Add `consumeRateLimit("public-promotions", clientIp(req), 60, 60_000)`
matching the sibling routes, in the same change that adjusts the cache header.

**Risk of fix.** Very low.

---

## What I checked and found CORRECT

**Cron authorization (26 routes).** All 25 `apps/web/app/api/cron/*/route.ts` plus
`ops/ranking-pause-apply` call `cronAuthError` / `cronAuthErrorBearerOnly` /
`authorizeCronRequest` as the first statement in the handler, before any DB or network
work. No route opts into `mode: "dual"`, so the spoofable `x-vercel-cron` header
authorizes nothing anywhere (`apps/web/lib/cron/authorize.ts:36-39, 50-53, 64-67`).
`authorizeCronSecret` compares in constant time via `@sports/util` and returns a
distinct 500 for `cron_secret_unset` so a missing secret fails closed rather than open
(`:78-86`). `CRON_SECRET_PREVIOUS` supports rotation without a window of open access.

**Admin gating (40 routes).** Every route under `admin/*`, `cockpit/*`, `airwave/*`,
plus `media/readiness`, `health/synthetic-monitoring` and `decision-genome` checks
`session.user.role === "ADMIN"` (inline, via a local `requireAdmin` helper, or via
`isAdminSession` from `apps/web/lib/auth/require-admin.ts:13`) before any data read.
I verified the multi-method files individually - `cockpit/tasks` (`:38-47,50,92`),
`cockpit/tasks/[id]` (`:12-21,27,50`), `cockpit/content` (`:71-76`, POST is a hard 405
at `:188-195`), `cockpit/calibration` (`:32-35`, POST 405 at `:59-63`),
`cockpit/bot-outbox/preview` (`:305-311,314,337`) - so no second method slips past the
first method's gate. `DEV_FAKE_ADMIN` is hard-gated inert in production with a throwing
assertion (`apps/web/lib/entitlements.ts:35-38, 61-68`).

**Ops surfaces.** `hasOpsAuth` (`apps/web/lib/ops/ops-auth.ts:12-25`) is constant-time,
never accepts `x-vercel-cron`, and returns false when `CRON_SECRET` is unset.
`ops/settlement-rca` is fully behind it and answers via `jsonNoStore` (`:132-133`).
`ops/daily-truth` is fully behind it and sets `Cache-Control: no-store` on both the 401
(`:79`) and the payload. `ops/public-surface-truth` is deliberately public in summary
form with operator detail behind `hasOpsAuth` (`:158,164`), rate-limits the public path
(`:165-173`), and sets `Cache-Control: no-store` on its response (`:891`).

**The core picks path.** `apps/web/app/api/picks/route.ts` is the reference
implementation and holds up under reading: durable IP rate limit before any work
(`:36`), the `canExposePublicPicks` 503 gate (`:47-49`), the `FORCE_NO_BET_IF_STALE`
gate (`:57-62`), anonymous callers resolved through the same `getEntitlements("FREE")`
source of truth as signed-in ones (`:72-73`), the tier filter applied **in the Prisma
where clause** rather than in the response map (`:134`), confidence gated on
`canSeeConfidence` for every viewer (`:249`), `marketImplied` under the same entitlement
(`:264-270`), `lineMovement` under `canSeeLineMovement` (`:293-305`), factor breakdown
under `canSeeFactorBreakdown` (`:229`), the teaser text itself guarded so a
percentage cannot leak back through prose (`:328-329`), and every single return - 200, both
503s, the 429 - through `jsonNoStore`. `daily-slate` returns aggregate counts only and
carries the same gates.

**`/api/board/state`.** Tier filter and `market` redaction applied server-side inside
`loadBoardState`, confidence stripped by `redactBoardConfidence` when
`canSeeConfidence` is false, and `jsonNoStore` on both the 429 and the payload with an
inline comment (`:38-49`) explaining that this body varies by viewer from a single URL.
This is the model the 35 routes in MAJOR 1 should follow.

**`/api/picks/[id]/audit`.** `canSeeDetail` derived from tier (`:74`), detail withheld
at `:233`, six `jsonNoStore` returns including the 503 gate and the 404.

**`/api/blog`.** Paid content keyed on `entitlements.tier !== "FREE"` and set to `null`
otherwise (`:71`), with an explicit comment that keying on `canSeePremiumPicks` would be
wrong since that is now true for all tiers. All five returns through `jsonNoStore`.

**Tier-spoofing resistance on the GSE Stats API.** `resolveStatsBillingTier`
(`apps/web/lib/gse-stats/session-tier.ts:22-58`) takes tier from the session only;
`?tier=` returns `{ tier: "FREE", spoofBlocked: true }` and the dev override is
additionally `NODE_ENV !== "production"`-gated. Both `gse/v1/metrics/[metricId]` and
`gse/v1/values/[metricId]` use it. `gse/v1/metrics` pins `publicOnly: true` rather than
reading it from the query string, with a comment recording the 32 restricted definitions
that used to leak (`:14-31`).

**B2B key handling.** `resolveB2bKeyScope` uses `timingSafeEqual` with a length
pre-check (`api-key-auth.ts:52-56`), defaults a bare key to `free` scope, and requires an
explicit `:premium` suffix to see PREMIUM rows. Rate limiting is durable
(Postgres-backed) and fails **closed** with a 503 when the store is unavailable
(`:130-136`).

**Stripe webhook.** Signature is required (`webhooks/stripe/route.ts:13-16`) and
verified with `stripeClient.webhooks.constructEvent` against `STRIPE_WEBHOOK_SECRET`
(`:42-45`) before any handling; an invalid signature is a 400 (`:51`); an unconfigured
secret is a 503 (`:33`) rather than an open path.

**Denial-of-wallet controls.** Every paid-call route is throttled before the spend:
`picks/[id]/explain` (durable, per-user, 10/5min, fail-closed 503 - `:87-97`),
`room/[gameId]/model-court` (`:40`), `admin/losses/[pickId]/draft` (`:38`),
`cockpit/studio/generate`, `admin/trigger-refresh` (`:37`, guarding a fan-out to the
paid Odds API), `subscriptions/{checkout,portal}` (10/5min per user). `dfs/salaries`
gates *before* the provider load with an explicit comment saying why (`:8-14`).

**Error-message hygiene.** `grep` for raw `err.message` reaching a response body finds
hits only in `cron/*` (bearer-gated) and `ops/daily-truth` (ops-bearer-gated). Public
routes return authored strings: `verify:74`, `verify/slate:86` and `proof/receipts:103`
all return a fixed "temporarily unavailable. This is not a verdict" body on a DB
exception rather than the exception, and each separates "not found" from "database
unreachable" so an outage is never reported as a false claim of non-existence.
`picks/[id]/explain:174-180` returns only authored `PickExplanationError` messages.
`subscriptions/portal:56-58` logs the detail server-side and returns a generic message.
`live-capability-probes.ts:117-119` reduces a DB error to a static string specifically
so the internal host and port are not disclosed.

**Public form abuse controls.** `waitlist` (honeypot `:15-19` + min-submit-time
`:21-28` + durable 5/min IP limit + consent enforcement `:64-69`), `contests/enter`
(zod `ContestEntrySchema` + honeypot + 8/min), `cipher/verify` (durable 8 per 10min,
`timingSafeEqual` hash comparison `:39-46`, and reward issuance deliberately reduced to
a manual claim reference because a serverless in-memory cursor would double-issue),
`moderation/anonymous-report` (null reporter by construction, 503 rather than a fake
accept when the durable store is absent).

**User-scoped routes.** `push/unsubscribe` deletes scoped to `(userId, endpoint)` so one
user can never remove another's row; `push/subscribe` refuses to re-own an endpoint
belonging to another account and deliberately does not disclose whose (`:74-84`).
`watchlist/follow` is idempotent and checks the cap *after* the already-following
short-circuit so re-following never consumes quota (`:70-83`).

**Leak-safety on the proof surfaces.** `/api/verify` withholds the committed fields
pre-kickoff (`:118-126`) and withholds them entirely when the live tamper check fails
(`:141-152`). `/api/verify/slate` selects `pickId + contentHash` only and explicitly
does **not** select `pedersenAggregateValue` / `pedersenBlindingSum`, with a comment
naming them as the opener (`:70-72`); it re-folds the Merkle root live rather than
trusting the DB index (`:105-113`). `/api/proof/receipts` filters to settled AND
kicked-off, a strict subset of "open" (`:81-88`). `/api/verify/slate/opening` is dark
unless `SLATE_OPENING_REVEAL_ENABLED === "true"` (`:65`).

**Anonymous-to-FREE consistency.** Every route that resolves entitlements for an
anonymous caller goes through `getEntitlements("FREE")` rather than a hand-rolled
literal - `picks:71-73`, `board/state:24-26`, `picks/[id]/audit:69-71`,
`session-tier.ts:55` - with a comment in `picks` recording that a hand-rolled fallback
is exactly how the two FREE definitions drifted apart before.

**Fail-closed entitlement resolution.** `evaluateGate` (`api-entitlement.ts:65-113`)
catches a throwing `auth()` and a throwing `getUserEntitlements` and falls back to
`getEntitlements("FREE")` in both cases, logging through `logEntitlementFailClosed` so
the downgrade is observable rather than silent. `isPremium` is `PRO || ELITE`, not
`!== "FREE"`, with a comment recording that the looser form leaked the Pro slate to
FANTASY.

---

## What I could not check and why

1. **Actual HTTP response headers in production.** This audit is static. I could not
   observe what Vercel's edge attaches to a `force-dynamic` route handler that sets no
   `Cache-Control` of its own. I searched `node_modules/next/dist/server/base-server.js`
   and found `private, no-cache, no-store, max-age=0, must-revalidate` set only on the
   preview-mode, middleware-prefetch and `renderError` paths, and `no-store,
   must-revalidate` set only under `dev` - none of which is the app-route handler path.
   **NOT VERIFIED:** whether Next 14.2 or Vercel supplies a no-store default for these
   handlers. Every caching finding above is therefore graded against the repo's own
   written rule (`no-store.ts:29-31`, "`dynamic` … does not promise anything about an
   intermediary"), which is the correct standard to hold the code to regardless of what
   the platform happens to do today. If a founder wants to downgrade any of them, the
   way to settle it is a `curl -sI` against production, not a code reading.

2. **Whether Vercel Cron injects `Authorization: Bearer $CRON_SECRET`.** All 26
   secret-gated routes are bearer-only. I did not check production logs or the Vercel
   dashboard, so I cannot state from observation that the scheduled invocations are
   authorizing. See MINOR 4.

3. **The NextAuth v5 session cookie's `SameSite` value.** I confirmed
   `apps/web/lib/auth.ts` sets no `cookies` override, so the library default applies,
   but I did not read the default out of `node_modules/next-auth` or observe a
   `Set-Cookie` header. MAJOR 5's severity depends on this.

4. **Runtime behaviour of any handler.** No route was executed. I did not run
   `npm run typecheck`, `npm run lint`, `npm test` or `npm run guardrails` - this task
   is read-only and changes nothing, so there is no diff for them to grade. Every claim
   above traces to a file and line I read.

5. **Route reachability versus `apps/web/vercel.json` and `middleware.ts`.** I audited
   handlers, not the middleware matcher. A route could be additionally protected (or
   additionally exposed) by middleware in a way this audit does not reflect. The one
   middleware fact I did read is the comment in `api/age-verify/route.ts:3` stating that
   `api/` is excluded from the middleware matcher.

6. **The 34 `intelligence/*` and `nflverse/*` data loaders.** I read three of them
   (`graded-pool`, `team-ratings`, `roster-advice`) plus the four `nflverse` files with
   more than one response. The remaining thin wrappers were classified from the scan
   (gate helper present, gate called first, single data return) rather than read line by
   line. I did not verify what each loader returns, only that each route gates before
   loading.

7. **Whether the B2B FREE scope exceeding the web FREE tier is intended.** That is a
   product decision recorded nowhere I could find. Flagged under MAJOR 2, not resolved.

8. **C-247 score-integrity interaction.** Several routes above serve `result`,
   `settledAt` and derived win rates (`/api/performance`, `/api/calibration`,
   `/api/clv`, `/api/proof/receipts`, `/api/v1/signals`). Per the session baseline, 25
   MLB / 14 MLS / 2 NCAAF stored FINAL scores are contradicted by the ESPN feed and 68
   settled published picks sit on them. Nothing in the API layer can detect or repair
   that - it is a data-integrity issue upstream of every one of these handlers, is
   founder-owned, and I made no attempt to assess it here.

---

## Appendix: full route table (180 routes)

Column semantics, stated precisely so nothing here is over-read:

- **Auth / gate**: the mechanism the handler itself enforces.
- **Entitlement checked server-side**: which helper or check runs before data is read.
  `n/a (secret)` means the route is bearer-gated and serves no per-viewer body.
- **jsonNoStore**: `yes (n)` = every response goes through it; `partial (n/m)` = some
  do; `NO` = the file uses only `NextResponse.json`; `n/a` = the file returns neither
  (redirects or a `new NextResponse` body).
- **4xx/5xx cacheable?**: `no` means every error path is `jsonNoStore`.
  **`unset headers` means the handler sets no `Cache-Control` on its error paths - it is
  NOT a claim that a cache actually stores them.** See "could not check" item 1.
- **Input validated**: `zod` = a schema parse; `manual/none` = hand-rolled checks or no
  request input. Most `manual` routes do validate (regex, `Number.isInteger` bounds,
  enum membership); the column records the mechanism, not a verdict.

Routes that set an explicit **public** cache header, which the table's `unset headers`
value does not capture: `/api/promotions` (`max-age=60, s-maxage=300`),
`/api/proof/receipts` (`120/120`), `/api/proof/ledger` (`300/300`),
`/api/proof/openapi.json` and `/api/proof/verification-spec.json` (`3600/3600`),
`/api/v1/openapi` (`max-age=300`), `/api/gse/v1/catalog` (`max-age=60`).
Routes that set an explicit `no-store` without using `jsonNoStore`:
`/api/contests/week`, `/api/cockpit/history/export` (200 only), `/api/ops/daily-truth`,
`/api/ops/public-surface-truth`.

| # | Route | Methods | Auth / gate | Entitlement checked server-side | jsonNoStore | force-dynamic | 4xx/5xx cacheable? | Input validated |
|---|---|---|---|---|---|---|---|---|
| 1 | /api/admin/dashboard | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 2 | /api/admin/losses/[pickId]/draft | POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 3 | /api/admin/promotions | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 4 | /api/admin/trigger-refresh | POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 5 | /api/age-verify | POST | public | none | n/a | NO | unset headers | manual/none |
| 6 | /api/airwave/intake-readiness | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 7 | /api/airwave/intelligence-readiness | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 8 | /api/airwave/readiness | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 9 | /api/airwave/review-queue | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 10 | /api/auth/[...nextauth] | ? | public | none | n/a | NO | unset headers | manual/none |
| 11 | /api/blog | GET | session | getEnt | yes (5) | yes | no | manual/none |
| 12 | /api/board/passes | GET | public | none | yes (2) | yes | no | manual/none |
| 13 | /api/board/state | GET | session | getEnt | yes (2) | yes | no | manual/none |
| 14 | /api/brief | GET | public | none | NO | yes | unset headers | manual/none |
| 15 | /api/calibration/elo-backtest | GET | public | none | NO | yes | unset headers | manual/none |
| 16 | /api/calibration/market-backtest | GET | public | none | NO | yes | unset headers | manual/none |
| 17 | /api/calibration/replay-provenance | GET | public | none | NO | yes | unset headers | manual/none |
| 18 | /api/calibration | GET | public | none | NO | yes | unset headers | manual/none |
| 19 | /api/cipher/verify | POST | public | none | NO | yes | unset headers | manual/none |
| 20 | /api/clv | GET | public | none | NO | yes | unset headers | manual/none |
| 21 | /api/cockpit/agents | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 22 | /api/cockpit/api-costs/override | POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 23 | /api/cockpit/bot-outbox/preview | GET|POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 24 | /api/cockpit/brief | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 25 | /api/cockpit/calibration | GET|POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 26 | /api/cockpit/command-center | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 27 | /api/cockpit/content/[id]/review | POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 28 | /api/cockpit/content/[id] | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 29 | /api/cockpit/content | GET|POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 30 | /api/cockpit/free-coverage | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 31 | /api/cockpit/history/export | GET | ADMIN session | role===ADMIN | n/a | NO | unset headers | manual/none |
| 32 | /api/cockpit/jarvis | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 33 | /api/cockpit/jarvis/trend | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 34 | /api/cockpit/journal/[id]/retract | POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 35 | /api/cockpit/journal/[id] | PATCH | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 36 | /api/cockpit/journal/[id]/scan | POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 37 | /api/cockpit/journal/[id]/submit | POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 38 | /api/cockpit/journal | POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 39 | /api/cockpit/journal/week-data | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 40 | /api/cockpit/listener-log | POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 41 | /api/cockpit/market-twin | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 42 | /api/cockpit/operator-registry | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 43 | /api/cockpit/readiness | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 44 | /api/cockpit/resource-intelligence | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 45 | /api/cockpit/studio/generate | POST | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 46 | /api/cockpit/tasks/[id]/decisions | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 47 | /api/cockpit/tasks/[id] | GET|PATCH | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 48 | /api/cockpit/tasks | GET|POST | ADMIN session | role===ADMIN | NO | NO | unset headers | manual/none |
| 49 | /api/cockpit/world-class-readiness | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 50 | /api/contests/enter | POST | public | none | NO | yes | unset headers | manual/none |
| 51 | /api/contests/week | GET | public | none | NO | yes | unset headers | manual/none |
| 52 | /api/cron/autonomy-cycle | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 53 | /api/cron/backfill-historical-games | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 54 | /api/cron/backfill-independent-trueprob | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 55 | /api/cron/backfill-player-data | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 56 | /api/cron/backfill-team-efficiency | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 57 | /api/cron/backtest-calibration | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 58 | /api/cron/board-fill | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 59 | /api/cron/calibration-metrics | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 60 | /api/cron/deliver-settlement-alerts | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 61 | /api/cron/drain-ai-telemetry-recovery | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 62 | /api/cron/free-spine-health | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 63 | /api/cron/gamma | GET|POST | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 64 | /api/cron/generate-drafts | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 65 | /api/cron/generate-signal-slate | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 66 | /api/cron/health-alert | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 67 | /api/cron/hydrate-cold-plane | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 68 | /api/cron/ingest-player-stats | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 69 | /api/cron/jarvis-snapshot | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 70 | /api/cron/prune-rate-limits | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 71 | /api/cron/reconcile-entitlements | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 72 | /api/cron/refresh-odds | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 73 | /api/cron/refresh-player-stats | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 74 | /api/cron/repair-checkout-attempts | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 75 | /api/cron/run-formal-receipt | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 76 | /api/cron/settle-picks | GET | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 77 | /api/decision-genome | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 78 | /api/dev/state | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 79 | /api/dfs/salaries | GET | FANTASY+ | fan | NO | yes | unset headers | manual/none |
| 80 | /api/gse/v1/catalog | GET | public | none | NO | yes | unset headers | manual/none |
| 81 | /api/gse/v1/entitlements | GET | public | none | NO | yes | unset headers | manual/none |
| 82 | /api/gse/v1/external | GET | public | none | NO | yes | unset headers | manual/none |
| 83 | /api/gse/v1/hydration/plan | POST | public | none | NO | yes | unset headers | zod |
| 84 | /api/gse/v1/hydration/strategies | GET | public | none | NO | yes | unset headers | manual/none |
| 85 | /api/gse/v1/metrics/[metricId] | GET | public | none | NO | yes | unset headers | manual/none |
| 86 | /api/gse/v1/metrics | GET | public | none | NO | yes | unset headers | manual/none |
| 87 | /api/gse/v1/openapi | GET | public | none | NO | yes | unset headers | manual/none |
| 88 | /api/gse/v1/own/values | POST | public | none | NO | yes | unset headers | manual/none |
| 89 | /api/gse/v1/rights/classify-export | POST | public | none | NO | yes | unset headers | manual/none |
| 90 | /api/gse/v1/source-matrix | GET | public | none | NO | yes | unset headers | manual/none |
| 91 | /api/gse/v1/truth/edge | POST | public | none | NO | yes | unset headers | manual/none |
| 92 | /api/gse/v1/truth/fire | GET|POST | public | none | NO | yes | unset headers | manual/none |
| 93 | /api/gse/v1/truth/health | POST | public | none | NO | yes | unset headers | manual/none |
| 94 | /api/gse/v1/truth | GET | public | none | NO | yes | unset headers | manual/none |
| 95 | /api/gse/v1/values/[metricId] | GET | public | none | NO | yes | unset headers | manual/none |
| 96 | /api/health | GET | public | none | NO | yes | unset headers | manual/none |
| 97 | /api/health/synthetic-monitoring | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 98 | /api/human/availability | GET | public | none | NO | yes | unset headers | manual/none |
| 99 | /api/human/environment | GET | public | none | NO | yes | unset headers | manual/none |
| 100 | /api/human/readiness | GET | public | none | NO | yes | unset headers | manual/none |
| 101 | /api/human/roster-availability | POST | public | none | NO | yes | unset headers | manual/none |
| 102 | /api/intelligence/clv-calibration | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 103 | /api/intelligence/expected-points | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 104 | /api/intelligence/graded-pool | GET | PRO/ELITE | premRL | yes (1) | yes | no | manual/none |
| 105 | /api/intelligence/opportunity-transfer | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 106 | /api/intelligence/player-archetypes | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 107 | /api/intelligence/player-model | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 108 | /api/intelligence/player-movers | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 109 | /api/intelligence/predictiveness | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 110 | /api/intelligence/qb-consensus | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 111 | /api/intelligence/qb-forward | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 112 | /api/intelligence/receiving-opportunity | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 113 | /api/intelligence/roster-advice | POST | PRO/ELITE | prem | NO | yes | unset headers | manual/none |
| 114 | /api/intelligence/route-rate | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 115 | /api/intelligence/rush-schemes | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 116 | /api/intelligence/rushing-contact | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 117 | /api/intelligence/rushing-efficiency | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 118 | /api/intelligence/scoring-zone | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 119 | /api/intelligence/sleeper-trending | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 120 | /api/intelligence/team-environment | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 121 | /api/intelligence/team-ratings | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 122 | /api/legal/sources | GET | public | none | NO | yes | unset headers | manual/none |
| 123 | /api/media/readiness | GET | ADMIN session | role===ADMIN | NO | yes | unset headers | manual/none |
| 124 | /api/mlb/teams | GET | public | none | NO | yes | unset headers | manual/none |
| 125 | /api/moderation/anonymous-report | const-export | public | none | n/a | yes | unset headers | manual/none |
| 126 | /api/moneypuck/nhl | GET | public | none | NO | yes | unset headers | manual/none |
| 127 | /api/nflverse/birthday-usage-trend | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 128 | /api/nflverse/combine | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 129 | /api/nflverse/edge-signals | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 130 | /api/nflverse/expected-metrics | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 131 | /api/nflverse/injuries | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 132 | /api/nflverse/next-gen-stats | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 133 | /api/nflverse/player-lab | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 134 | /api/nflverse/pressure-coverage | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 135 | /api/nflverse/qb-age-rb-trend | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 136 | /api/nflverse/qbr | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 137 | /api/nflverse/snap-share | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 138 | /api/nflverse/usage-pulse | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 139 | /api/ops/daily-truth | GET | OPS bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 140 | /api/ops/public-surface-truth | GET | public (+ops bearer detail) | none | NO | yes | unset headers | manual/none |
| 141 | /api/ops/ranking-pause-apply | GET|POST | CRON bearer | n/a (secret) | NO | yes | unset headers | manual/none |
| 142 | /api/ops/settlement-rca | GET | OPS bearer | n/a (secret) | yes (2) | yes | no | manual/none |
| 143 | /api/performance | GET | public | none | yes (3) | yes | no | manual/none |
| 144 | /api/picks/[id]/audit | GET | session | getEnt | yes (6) | yes | no | manual/none |
| 145 | /api/picks/[id]/explain | POST | session | getEnt | NO | yes | unset headers | manual/none |
| 146 | /api/picks/daily-slate | GET | public | none | yes (4) | yes | no | manual/none |
| 147 | /api/picks | GET | session | getEnt | yes (5) | yes | no | manual/none |
| 148 | /api/pledge/affiliate-free | GET | public | none | NO | force-static | unset headers | manual/none |
| 149 | /api/projections | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 150 | /api/promotions | GET | public | none | NO | yes | unset headers | manual/none |
| 151 | /api/proof/ledger | GET | public | none | NO | yes | unset headers | manual/none |
| 152 | /api/proof/openapi.json | GET | public | none | NO | yes | unset headers | manual/none |
| 153 | /api/proof/receipts | GET | public | none | NO | yes | unset headers | manual/none |
| 154 | /api/proof/verification-spec.json | GET | public | none | NO | yes | unset headers | manual/none |
| 155 | /api/push/subscribe | POST | session | none | NO | yes | unset headers | manual/none |
| 156 | /api/push/unsubscribe | POST | session | none | NO | yes | unset headers | manual/none |
| 157 | /api/receipts/[id] | GET | public | none | NO | yes | unset headers | manual/none |
| 158 | /api/receipts/verify | POST | public | none | NO | yes | unset headers | manual/none |
| 159 | /api/room/[gameId]/model-court | POST | session | getEnt | NO | yes | unset headers | manual/none |
| 160 | /api/scoring/player-index | GET | PRO/ELITE | premRL | NO | yes | unset headers | manual/none |
| 161 | /api/sleeper/league | GET | public | none | NO | yes | unset headers | manual/none |
| 162 | /api/sleeper/leagues | GET | public | none | NO | yes | unset headers | manual/none |
| 163 | /api/sleeper/market-signal | GET | public | none | NO | yes | unset headers | manual/none |
| 164 | /api/sources/catalog | GET | public | none | NO | yes | unset headers | manual/none |
| 165 | /api/subscriptions/checkout | POST | session | none | NO | NO | unset headers | zod |
| 166 | /api/subscriptions/portal | POST | session | none | NO | NO | unset headers | manual/none |
| 167 | /api/tools/lineup | GET | FANTASY+ | fanRL | NO | yes | unset headers | manual/none |
| 168 | /api/trends/nflverse-readiness | GET | public | none | NO | yes | unset headers | manual/none |
| 169 | /api/v1/openapi | GET | public | none | NO | yes | unset headers | manual/none |
| 170 | /api/v1/probabilities | GET | B2B key | none | yes (4) | yes | no | manual/none |
| 171 | /api/v1/signals | GET | B2B key | none | yes (4) | yes | no | manual/none |
| 172 | /api/verify | GET | public | none | NO | yes | unset headers | manual/none |
| 173 | /api/verify/slate/opening | GET | public | none | NO | yes | unset headers | manual/none |
| 174 | /api/verify/slate | GET | public | none | NO | yes | unset headers | manual/none |
| 175 | /api/waitlist | POST | public | none | NO | yes | unset headers | manual/none |
| 176 | /api/watchlist/follow | POST | session | getEnt | NO | yes | unset headers | manual/none |
| 177 | /api/watchlist | GET | session | getEnt | NO | yes | unset headers | manual/none |
| 178 | /api/watchlist/unfollow | POST | session | none | NO | yes | unset headers | manual/none |
| 179 | /api/weather/game | GET | public | none | NO | yes | unset headers | manual/none |
| 180 | /api/webhooks/stripe | POST | Stripe sig | none | NO | NO | unset headers | manual/none |