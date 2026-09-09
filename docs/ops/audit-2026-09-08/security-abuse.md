# Security and Abuse audit, 2026-09-08

Read-only. No source file was modified. No credential value was read, printed, or searched for.
Scope: authorization on object access (IDOR), rate limiting on expensive and paid-data endpoints,
user-supplied values reaching a DB query / fetch URL / shell, secrets read from anywhere other than
`process.env`, cron secret comparison, open redirects, and paid-credit spend without an auth or
entitlement check.

Everything below traces to a file and line I read or a command I ran and whose output I saw. Where I
reasoned from a specification rather than observing production, it is labelled NOT VERIFIED.

---

## What I checked (with commands run)

Inventory and gating survey:

```bash
find apps/web/app/api -name "route.ts" | wc -l          # 180 routes
# per-route gate survey (which of requirePremiumApi* / requireFantasyApi* / gateApi /
# resolveB2bKeyScope / cronAuthError / hasOpsAuth / auth() / consumeRateLimit /
# consumePublicFormRateLimit each route calls, and which call none)
for f in $(find apps/web/app/api -name route.ts | sort); do ... grep -oE ... ; done
```

Cron and operator authorization:

```bash
grep -rl "CRON_SECRET" apps/web/lib apps/web/app --include=*.ts
for f in $(find apps/web/app/api/cron -name route.ts); do grep -n "cronAuthError|authorizeCronRequest|..." $f; done
grep -rn "timingSafeEqual|safeEqual|constantTime" apps/web packages --include=*.ts -l
grep -rn "=== process\.env|!== process\.env" apps/web packages workers scripts   # no secret compared with ===
```

Injection and SSRF sinks:

```bash
grep -rn "\$queryRaw|\$executeRaw|queryRawUnsafe|executeRawUnsafe" apps/web packages workers
grep -rn "child_process|execSync|spawnSync|exec\(|spawn\(" apps/web    # zero hits in apps/web
grep -rn "await fetch\(|fetchImpl\(" apps/web/lib
grep -rn "x-forwarded-for" apps/web --include=*.ts --include=*.tsx
grep -rn "searchParams.get" apps/web/app/api | grep -iE "limit|take|days|size"
```

Redirect guards, proved with an executable check rather than by reading:

```bash
node -e 'for (const c of ["/\t/evil.com","/\n/evil.com","/ /evil.com","/%2f%2fevil.com"]) {
  const passes = c.startsWith("/") && !c.startsWith("//") && !c.startsWith("/\\");
  console.log(JSON.stringify(c), passes, new URL(c,"https://www.galaxysportsedge.com/age-verify").href); }'
# "/\t/evil.com" guardPasses=true -> https://evil.com/
# "/\n/evil.com" guardPasses=true -> https://evil.com/
# "/\r/evil.com" guardPasses=true -> https://evil.com/

node -e '<minimal http server>'   # Node emits Location: "/\t/evil.com" verbatim, status 307
node -e '<timingSafeEqual on 64 non-hex chars>'   # RangeError: Input buffers must have the same byte length
```

Repo guardrails actually executed:

```bash
node scripts/guardrails/secret-scan.mjs          # exit 0, "scanned 0 file(s) [staged]"
node scripts/guardrails/openapi-security-scan.mjs # exit 0, 3 contract files passed
grep -rlnE "(sk_live_|sk_test_|whsec_|AKIA[0-9A-Z]{16}|sk-ant-)" apps packages workers scripts
# only test fixtures, a regex pattern in lib/ai-control-plane/validation.ts:124,
# and a shell usage example in scripts/ops/create-founding-payment-link.mjs:6
```

Files read in full or in the relevant range: `apps/web/lib/api-entitlement.ts`,
`apps/web/lib/entitlements.ts`, `apps/web/lib/auth.ts`, `apps/web/middleware.ts`,
`apps/web/lib/cron/authorize.ts`, `packages/util/src/safe-equal.ts`, `apps/web/lib/ops/ops-auth.ts`,
`apps/web/lib/api/rate-limit.ts`, `apps/web/lib/api/public-form-rate-limit.ts`,
`apps/web/lib/community/durable-rate-limiter.ts`, `apps/web/lib/b2b/api-key-auth.ts`,
`apps/web/lib/auth/callback-url-guard.ts`, `apps/web/lib/age-verify/surface.ts`,
`apps/web/lib/auth/csrf-origin-guard.ts`, `apps/web/lib/api-auth/hash.ts`,
`apps/web/lib/api-auth/webhook-signature.ts`, `apps/web/lib/push/validation.ts`,
`apps/web/lib/push/subscription-db.ts`, `apps/web/lib/autonomy/execute-autonomy-cycle.ts`,
`apps/web/lib/ops/traffic-heartbeat.ts`, `apps/web/lib/health/live-capability-probes.ts`,
`apps/web/lib/news/rss.ts`, `apps/web/lib/community/anonymous-report-handler.ts`,
`packages/prediction-engine/src/ensemble/remote-model-client.ts`,
`packages/ingestion-pipeline/src/board-fill.ts`, `packages/ingestion-pipeline/src/refresh-odds.ts`,
`apps/web/next.config.mjs`, and roughly 35 individual route handlers.

---

## Findings

### 1. Open redirect: both same-origin redirect guards accept a tab or newline after the leading slash

**Severity: MAJOR**

Evidence:

- `apps/web/lib/age-verify/surface.ts:62-73` (`safeAgeRedirect`) accepts any string that
  `startsWith("/")` and does not start with `//` or `/\`.
- `apps/web/app/api/age-verify/route.ts:19` and `:26` feed that value into
  `NextResponse.redirect(new URL(target, request.url), 303)`.
- `apps/web/lib/auth/callback-url-guard.ts:29-37` (`safeCallbackUrl`) applies the same three prefix
  tests, and `apps/web/app/auth/signin/page.tsx:22` passes the result to `redirect()`.

What is wrong: the WHATWG URL parser strips ASCII tab, LF and CR from a URL before parsing, so
`/\t/evil.com` normalises to `//evil.com`, which is protocol-relative. The prefix tests run on the
pre-strip string, so they do not see it. I proved the resolution rather than assuming it:

```
"/\t/evil.com"  guardPasses=true  -> https://evil.com/
"/\n/evil.com"  guardPasses=true  -> https://evil.com/
"/\r/evil.com"  guardPasses=true  -> https://evil.com/
```

`POST /api/age-verify` is unauthenticated, takes `next` from a form field, and has no CSRF origin
check, so an attacker page can post to it directly and receive a 303 to an arbitrary host, issued by
the product's own domain. That is a usable phishing primitive: a link that genuinely starts at
`www.galaxysportsedge.com` and lands on the attacker. The unit tests at
`apps/web/lib/age-verify/surface.test.ts:40-49` and `apps/web/__tests__/callback-url-guard.test.ts:29-55`
cover `//`, `///`, `/\` and absolute URLs, but no control character, which is why this survived.

For the signin path I confirmed Node emits a tab in a `Location` header verbatim (307, header value
`"/\t/evil.com"`). Whether the Vercel edge rewrites or rejects that header before it reaches a
browser is **NOT VERIFIED** (no production request was made). The age-verify path does not depend on
that question at all, because `new URL()` resolves the host inside the app before the header is
built.

Proposed fix (both files, same shape): reject the value when it contains any ASCII control character
before the existing prefix tests, for example refuse when `/[\u0000-\u001F\u007F]/.test(raw)` is
true, and add the three control-character cases to the two existing test files. This tightens the
guards and removes nothing from them.

Risk of fix: very low. Legitimate internal paths never contain a raw tab, LF or CR; a real path that
needed one would already carry it percent-encoded, which the check does not touch.

---

### 2. Five routes key their rate limiter on the client-controlled leftmost `X-Forwarded-For` entry, defeating the durable limiter

**Severity: MAJOR**

Evidence, all reading `x-forwarded-for` directly instead of calling the hardened
`clientIp()` helper:

- `apps/web/app/api/cipher/verify/route.ts:29-33` (`clientIp()` redefined locally, first hop)
- `apps/web/app/api/waitlist/route.ts:35-38`
- `apps/web/app/api/contests/enter/route.ts:15-18`
- `apps/web/app/api/human/roster-availability/route.ts:10-11`
- `apps/web/app/api/intelligence/roster-advice/route.ts:14-15`

The correct helper is `apps/web/lib/api/rate-limit.ts:100-118`, whose own header comment at lines
79 to 99 states the exact problem: *"this previously returned the LEFTMOST `x-forwarded-for` entry.
That entry is client-controlled ... An attacker could therefore mint an unlimited number of distinct
rate-limit buckets and bypass every per-IP limit entirely, which also defeats any future durable
store: a shared counter is worthless if the key can be forged."* The fix landed in `clientIp()`;
these five call sites were not migrated to it.

What is wrong specifically: a proxy appends its observed address, so position 0 is whatever the
client sent. Sending a fresh `X-Forwarded-For: <random>` on every request gives every request its own
bucket. Three of the five then pass that forged key into `consumePublicFormRateLimit`, the durable
Postgres limiter, so the cross-instance guarantee described at
`apps/web/lib/community/durable-rate-limiter.ts:4-13` buys nothing on those routes.

Impact ranked by what the limiter is protecting:

- `cipher/verify` is an answer-guessing gate (`MAX_ATTEMPTS = 8` per 10 minutes,
  `apps/web/app/api/cipher/verify/route.ts:25-26`). Unlimited guesses is the whole failure mode the
  limit exists for.
- `waitlist` (5 per minute) and `contests/enter` (8 per minute) are the anti-spam and
  entry-stuffing gates on unauthenticated write paths.
- `human/roster-availability` is an unauthenticated POST doing model work.
- `intelligence/roster-advice` sits behind `requirePremiumApi()` (line 12), so the caller must be a
  paying PRO or ELITE subscriber; the limiter is still forgeable.

Proposed fix: replace each local derivation with `clientIp(req)` from `@/lib/api/rate-limit`
(the two `Request`-typed handlers need `NextRequest`, or a small `Request`-accepting overload of the
same right-to-left logic). No threshold changes, no test disabled.

Risk of fix: low. `clientIp()` prefers the platform-set `x-vercel-forwarded-for` / `x-real-ip`, then
counts back `TRUSTED_PROXY_HOPS` from the right, then falls back to a single shared `"anon"` bucket,
which is stricter than today. On Vercel the resolved value is the same real address for honest
callers, so legitimate traffic sees no change.

---

### 3. The paid Claude endpoint `/api/room/[gameId]/model-court` is wallet-guarded only per warm instance

**Severity: MAJOR**

Evidence:

- `apps/web/app/api/room/[gameId]/model-court/route.ts:40` uses the in-memory limiter:
  `consumeRateLimit("model-court", session.user.id, 10, 5 * 60 * 1000)`.
- `apps/web/lib/api/rate-limit.ts:1-10` states the store is *"In-memory and per-instance"*.
- The sibling paid route was already migrated for exactly this reason:
  `apps/web/app/api/picks/[id]/explain/route.ts:92` calls `consumePublicFormRateLimit`, and its
  comment at lines 83 to 91 says *"This one is the most important limiter in the file set to make
  DURABLE: in-memory it was 10-per-5min PER WARM INSTANCE, so the wallet guard scaled with
  horizontal scale, the exact spend it exists to bound."*

What is wrong: `answerModelCourtQuestion` at line 123 is a billed Anthropic call. On serverless the
effective quota is 10 per 5 minutes multiplied by the number of warm isolates, and a caller can grow
that number by sending concurrent requests. A single PRO or ELITE subscriber (the tier gate at line
49 does hold) can therefore draw far more than the intended 10 per 5 minutes against the shared
monthly Claude budget. The explain route's fix was not applied here.

Two secondary ordering notes on the same file, both minor on their own: the limiter at line 40 runs
*before* the entitlement check at line 48, which is the reverse of the documented order in
`apps/web/lib/api-entitlement.ts:130-140` (*"the gate strictly precedes the limiter, so the paywall
is never masked by a 429"*); and the `catch` at line 138 maps every `ModelCourtAnswerError` to 422,
where the explain route deliberately splits BUDGET and UPSTREAM to 503
(`apps/web/app/api/picks/[id]/explain/route.ts:192-198`).

Proposed fix: swap line 40 to `await consumePublicFormRateLimit("model-court", session.user.id, 10, 5 * 60 * 1000)`
and honour its `limit.status` (429 or fail-closed 503) exactly as the explain route does at lines 93
to 100; move the call below the entitlement gate.

Risk of fix: low, and the pattern is already proven in the same codebase. It adds one Postgres upsert
per request to a route that already makes a network call to Anthropic.

---

### 4. `/api/health` is unauthenticated, uncached and unthrottled while doing DB aggregates, an outbound probe, and a paid-ingestion trigger

**Severity: MAJOR**

Evidence:

- `apps/web/app/api/health/route.ts:11` sets `dynamic = "force-dynamic"`, so no edge cache; the file
  contains no `consumeRateLimit` or auth call (confirmed by the whole-surface gate survey above,
  where it printed in the "no gate, no limiter" list).
- Per request it runs `computeLiveCapabilityProbes()` (line 32), which does
  `db.$queryRaw\`SELECT 1\`` (`apps/web/lib/health/live-capability-probes.ts:113`),
  `db.ingestionRun.findFirst` (line 125), `loadSettlementHealth(db, {})` (line 153) which itself
  issues `db.pick.count` aggregates (`apps/web/lib/performance/settlement-health.ts:160-161`), and on
  a cold isolate an outbound `probeNflverseSourceCurrency({ timeoutMs: 4000 })` (line 167). Then
  `assessSchedulerLiveness()` (route line 63) adds another query.
- Line 70 fires `maybeRunTrafficHeartbeat()`, which when ingestion is already past the staleness SLA
  calls `runBoardFillPipeline` (`apps/web/lib/ops/traffic-heartbeat.ts:184`), and that calls
  `refreshOdds` (`packages/ingestion-pipeline/src/board-fill.ts:40`), which takes the paid Odds API
  path when the key is present (`packages/ingestion-pipeline/src/refresh-odds.ts:252-254`).

What is wrong: the same codebase treats this exact risk as real one file over.
`apps/web/app/api/ops/public-surface-truth/route.ts:160-166` throttles its anonymous branch with the
comment *"Anonymous GETs hit ~31 DB loaders and (when STIPE_SECRET_KEY is set) a live Stripe API call
every request. Rate-limit the public (non-authenticated) branch to prevent pool exhaustion."*
`/api/health` has a comparable per-request cost, is the most guessable path on the domain, and has no
limiter at all. On a Neon pool this is a cheap availability attack, and the answers it computes are
what every operator surface reads.

The paid-spend leg is genuinely well bounded, and I want to state the mitigations rather than
overstate the finding: the heartbeat only fires past the staleness SLA
(`traffic-heartbeat.ts:162`), takes a durable 30-minute lease across isolates (lines 62 and 110-137),
and the paid path consults the C-109 credit governor. The one caveat is that the governor
**fails open**: `packages/ingestion-pipeline/src/refresh-odds.ts:181-190` catches a construction
failure and logs *"default credit governor unavailable, proceeding unpaced"*, and the comment at
lines 164-166 says `decide()` fails open too. So the innermost money bound on a path reachable from
an unauthenticated GET is advisory. Given the C-109 credit-cliff note in AGENTS.md, that is worth the
founder knowing; it is a deliberate availability-over-cost decision and I am not proposing to change
it.

Proposed fix: add the same anonymous-branch limiter the ops truth surface already uses, at the top of
`GET`, keyed with `clientIp()`. A generous ceiling (uptime monitors poll at most every 30 to 60
seconds, and several monitors are in play per the AGENTS.md notes) keeps every legitimate caller
under it. This adds a control; it removes none.

Risk of fix: low, but the limit must be set high enough that the Nightly Sentinel and the external
watchdog are never throttled into a false page. That is the only real design question.

---

### 5. The CSRF origin guard exists but is wired to only two of the cookie-authorized POST routes

**Severity: MINOR**

Evidence:

- `apps/web/lib/auth/csrf-origin-guard.ts:1-15` names its intended callers: *"state-changing
  endpoints that rely on session cookies for authorization (e.g. push subscribe/unsubscribe,
  checkout, review mutations)"*.
- Actual call sites, from `grep -rn "csrfOriginCheck"`: only
  `apps/web/app/api/push/subscribe/route.ts:28` and `apps/web/app/api/push/unsubscribe/route.ts:27`.
- Not applied on, among others, `apps/web/app/api/subscriptions/checkout/route.ts:53`,
  `apps/web/app/api/subscriptions/portal/route.ts:7`,
  `apps/web/app/api/watchlist/follow/route.ts:30`, `apps/web/app/api/admin/trigger-refresh/route.ts:28`,
  `apps/web/app/api/picks/[id]/explain/route.ts:57`, `apps/web/app/api/cockpit/studio/generate/route.ts:35`.

What is wrong: the guard's own docstring calls out checkout by name and checkout does not call it.
The practical exposure is small, and I want to be accurate about why: `apps/web/lib/auth.ts:71-133`
sets no `cookies` block, so the NextAuth v5 session cookie keeps its default `SameSite=Lax`, which
means a modern browser does not attach it to a cross-site POST. So this is defence in depth that is
currently carried by a framework default rather than by code in this repo. Whether every browser in
the user base enforces Lax-by-default is **NOT VERIFIED**.

Proposed fix: call `csrfOriginCheck(request.headers.get("origin"), request.headers.get("referer"))`
at the top of the cookie-authorized, state-changing or money-spending POST handlers, matching the two
push routes exactly. Note the guard already fails closed when `NEXT_PUBLIC_APP_URL` is unset
(line 66-69), so a deployment missing that variable would start returning 403 on those routes; verify
it is set in production before wiring more callers.

Risk of fix: medium, higher than it looks. Any legitimate non-browser caller of those routes (a
mobile client, an internal script, a smoke test) sends no `Origin` and would begin receiving 403. It
should be rolled out per route with the fail-closed `NEXT_PUBLIC_APP_URL` behaviour confirmed first.

---

### 6. `verifyWebhookSignature` can throw on malformed input where its hardened sibling returns false

**Severity: MINOR**

Evidence: `apps/web/lib/api-auth/webhook-signature.ts:7-11` compares
`Buffer.from(signature, "hex")` against `Buffer.from(expected, "hex")` after only a string-length
check. `apps/web/lib/api-auth/hash.ts:10-33` documents this exact hazard for the sibling function and
fixes it with `SHA256_HEX_PATTERN` validation before decoding.

What is wrong: `Buffer.from(str, "hex")` stops at the first non-hex character and returns a truncated
buffer instead of throwing, so a 64-character non-hex string decodes to fewer than 32 bytes while
`expected` decodes to 32, and `timingSafeEqual` raises. I confirmed the behaviour:

```
len eq: true
THROWS: RangeError Input buffers must have the same byte length
```

This is not an authentication bypass. To reach 32 decoded bytes an attacker must supply 64 valid hex
characters, which is a real digest, so a forged signature still cannot compare equal. The defect is
an uncaught `RangeError` on attacker-shaped input, which is an unhandled-500 path and an
input-dependent branch inside a function whose whole point is to be input-independent.

Mitigating fact: `grep -rn "verifyWebhookSignature"` across `apps/web` and `packages` finds no
production call site, only the definition. It is a latent trap for whoever wires it up.

Proposed fix: apply the same guard the sibling already uses, rejecting any value that fails
`/^[0-9a-f]{64}$/` before decoding.

Risk of fix: negligible. It only turns a throw into `false`.

---

### 7. Stored Web Push endpoint URLs carry no scheme or host allow-list (latent SSRF sink)

**Severity: MINOR**

Evidence: `apps/web/lib/push/validation.ts:22` validates the endpoint with
`z.string().trim().url().max(2048)` only. Zod's `.url()` accepts any absolute URL that `new URL()`
parses, including `http://127.0.0.1:9000/x` and `http://169.254.169.254/latest/meta-data/`. The value
is stored per user at `apps/web/lib/push/subscription-db.ts:130-140`.

What is wrong today: nothing is exploitable right now. `grep` for a sender across `apps/web/lib`
found no `web-push` call and no fetch of a stored endpoint, so these URLs are written and never
requested. The problem is sequencing: the moment a delivery worker is added (the Elite alerts tier in
CLAUDE.md implies one is planned), it will fetch attacker-chosen URLs from the server, and the
validation that would have stopped it lives two files away in a module nobody will think to touch.

There is a good in-repo model to copy: `packages/prediction-engine/src/ensemble/remote-model-client.ts:236-267`
(`validateEndpointUrl`) already refuses non-http(s) schemes, cloud metadata hosts and private or
loopback IP literals, and `apps/web/lib/news/rss.ts:213-232` shows the correct usage including
re-validating a manual redirect hop.

Proposed fix: run the endpoint through `validateEndpointUrl` in
`parsePushSubscriptionInput`, and require `https:`. Real push services (FCM, Mozilla autopush,
Apple) are all public HTTPS hosts, so nothing legitimate is refused.

Risk of fix: low.

---

### 8. Paid Claude generation on `POST /api/cockpit/journal` has no rate limiter, unlike every sibling

**Severity: MINOR**

Evidence: `apps/web/app/api/cockpit/journal/route.ts:97-114` performs a billed
`generateModelJournalDraftMarkdown` call when the body carries `draftWithClaude: true`. The handler
has an admin gate (line 47) but no `consumeRateLimit` anywhere in the file.

Every comparable paid route has one, each with a comment naming denial of wallet as the reason:
`apps/web/app/api/cockpit/studio/generate/route.ts:44` (20 per 5 min),
`apps/web/app/api/admin/losses/[pickId]/draft/route.ts:38` (20 per 5 min),
`apps/web/app/api/admin/trigger-refresh/route.ts:38` (10 per min). Even the non-paid
`apps/web/app/api/cockpit/journal/[id]/scan/route.ts:33` has one.

Exposure is bounded by ADMIN role, so this matters only for a compromised or shared admin session,
which is precisely the scenario the sibling comments cite.

Proposed fix: add `consumeRateLimit("cockpit-journal-create", guard.userId, 20, 5 * 60 * 1000)` after
the admin gate, mirroring `studio/generate`. (`requireAdmin` in this file returns `email`, not `id`,
so either widen it to also return `session.user.id` or key on the email.)

Risk of fix: negligible.

---

### 9. Unauthenticated upstream-proxy routes with no limiter, and one unbounded in-memory cache keyed by attacker input

**Severity: MINOR**

Evidence:

- `apps/web/app/api/sleeper/league/route.ts:6-16` is anonymous, has no rate limit, and calls
  `loadSleeperLeague`, which issues three sequential upstream fetches
  (`apps/web/lib/integrations/sleeper-sync.ts:235-237`). Its sibling
  `apps/web/app/api/sleeper/leagues/route.ts:19` does throttle, with the comment
  *"Anonymous, unauthenticated route that proxies to Sleeper's public API ... Rate-limit per IP to
  prevent proxy abuse."* The reasoning applies identically to `league` and was not applied.
- `apps/web/app/api/mlb/teams/route.ts`, `apps/web/app/api/moneypuck/nhl/route.ts`,
  `apps/web/app/api/trends/nflverse-readiness/route.ts` and `apps/web/app/api/weather/game/route.ts`
  are each a bare anonymous `GET` calling a loader, with no auth and no limiter.
- `apps/web/app/api/sleeper/leagues/route.ts:11-13, 33, 41` keeps a module-level
  `resultCache = new Map()` keyed by `` `${username}:${season}` ``. `username` is taken raw from the
  query string (line 28, no length or charset bound) and the map is never evicted or size-capped, only
  TTL-checked on read. Distinct usernames therefore grow the map without bound for the isolate's
  lifetime.

What is wrong: the first item is proxy abuse (this server's IP reputation and Sleeper's quota spent
on behalf of anonymous callers). The cache is a slow memory leak that an attacker can drive; the
per-IP limiter in front of it is 20 per minute and, per finding 2's class, per-instance, so it slows
but does not stop growth.

Proposed fix: add `consumeRateLimit(..., clientIp(request), ...)` to `sleeper/league` and the four
other bare loader routes, matching `sleeper/leagues`. Bound the cache with a maximum entry count and
cap or reject `username` beyond a sane length before it becomes a key.

Risk of fix: low.

---

### 10. Admin `GET /api/cockpit/bot-outbox/preview` takes unclamped size parameters and has no limiter, while its own `POST` has both

**Severity: MINOR**

Evidence: `apps/web/app/api/cockpit/bot-outbox/preview/route.ts:318-319` reads `lookbackMinutes` and
`limitPerKind` through `parsePositiveInteger` (defined at line 90-94), which accepts *any* positive
integer with no upper clamp, and passes them into `loadBotOutboxDrafts`. The `POST` handler on the
same file rate-limits at line 343. The `GET` does not.

Every other size parameter I checked is properly clamped, which is what makes this one stand out:
`apps/web/app/api/proof/receipts/route.ts:47-51` (`Math.min(..., MAX_LIMIT)`),
`apps/web/app/api/cockpit/jarvis/trend/route.ts:43-45`,
`apps/web/app/api/cron/hydrate-cold-plane/route.ts:47-50` (`Math.min(10_000, Math.max(1, ...))`).

Also on this handler, line 320-322: `publicUrl` is accepted from the query string with only a
`startsWith("https://")` test, so any host can be injected into the generated draft links. This is
draft-only with `externalDelivery: false` in the response policy, and admin-gated, so the impact is
an operator copying a bad link, not an automated post.

Proposed fix: clamp both parameters the way `proof/receipts` does, and add the same per-admin
`consumeRateLimit` the `POST` already has.

Risk of fix: negligible.

---

### 11. Production CSP allows `script-src 'unsafe-inline'`

**Severity: MINOR**

Evidence: `apps/web/next.config.mjs:87-88` defines `scriptSrcProd` with `'unsafe-inline'` included.
The rest of the policy is genuinely tight: `default-src 'self'`, `base-uri 'self'`,
`form-action 'self'`, `object-src 'none'`, `frame-ancestors 'self'`, and
`upgrade-insecure-requests` in production only (lines 95-111). Line 84-86 documents that
`'unsafe-eval'` was correctly split out to dev only.

What is wrong: `'unsafe-inline'` on `script-src` is what turns any reflected or stored HTML injection
into script execution, so the CSP provides no XSS backstop. Next.js App Router needs inline
bootstrap scripts, which is why this is common, but the supported answer is a nonce.

Proposed fix: move to a per-request nonce, generated in `middleware.ts`, added to the CSP as
`'nonce-<value>'` alongside `'strict-dynamic'`, and read by Next through the standard nonce
propagation. This is a real change with real regression surface (the Clarity, Stripe and Cloudflare
Insights tags at line 88 each need the nonce), so it is a scheduled piece of work, not a one-line
edit.

Risk of fix: medium. A wrong nonce wiring breaks hydration site-wide. It should ship behind a
preview deploy with the checkout path exercised, since `SubscribeButton` is a client handler.

---

### 12. Observations that are not defects but that the founder should know

**Severity: MINOR**

- `scripts/guardrails/secret-scan.mjs` ran clean but reported `scanned 0 file(s) [staged]`. It
  operates on the git staging area, so a green result from it says nothing about the working tree or
  about history. My own working-tree scan for credential prefixes (command in the section above)
  found only test fixtures, a detection regex at `apps/web/lib/ai-control-plane/validation.ts:124`,
  and a shell usage example at `scripts/ops/create-founding-payment-link.mjs:6`. No real key.
- `apps/web/app/api/cron/autonomy-cycle/route.ts:47-56`: `?execute=1` in the query string overrides
  the `AUTONOMY_EXECUTE` environment flag. It correctly forces `cronAuthErrorBearerOnly` when it
  does, so only a holder of `CRON_SECRET` can use it, and the executor's targets are allow-listed
  (`apps/web/lib/autonomy/execute-autonomy-cycle.ts:27-41`). Recording it because a query parameter
  that overrides a founder env flag is worth being deliberate about, not because it is exploitable.
  Note also that the comment on line 53-54 says dry run "may still use dual auth", but
  `resolveMode` at `apps/web/lib/cron/authorize.ts:52-55` defaults to `bearer_only`, so the comment
  is stale and the behaviour is the safer one.
- `apps/web/app/api/webhooks/stripe/route.ts:44` uses a non-null assertion on
  `process.env["STRIPE_WEBHOOK_SECRET"]`. It fails closed (a missing secret makes `constructEvent`
  throw and the route answers 400 "Invalid signature"), but the failure is reported as a bad
  signature rather than as a misconfiguration, which would mislead an operator during an incident.
  The route already models the better pattern one block up, at lines 24-36, where a missing
  `STRIPE_SECRET_KEY` yields a 503 naming the variable.
- `apps/web/app/api/picks/[id]/audit/route.ts:80` runs its rate limiter after `auth()` and
  `getUserEntitlements()` (lines 68-70). Not exploitable; just the reverse of the documented
  gate-then-limit order.
- `apps/web/lib/b2b/api-key-auth.ts:72` matches the `:premium` scope suffix case-insensitively while
  the key itself is compared case-sensitively, so a configured key whose literal text ends in
  `:PREMIUM` would be silently reinterpreted as a scope marker. Configuration hygiene, not a
  vulnerability.

---

## What I checked and found CORRECT

**Cron and operator secret comparison is constant-time everywhere.** `authorizeCronSecret`
(`packages/util/src/safe-equal.ts:95-114`) routes both the primary and the rotation secret through
`safeEqualSecret` (lines 19-29), which length-checks then calls `timingSafeEqual`. The HTTP wrapper
`cronAuthError` (`apps/web/lib/cron/authorize.ts:60-88`) defaults to `bearer_only`, so the spoofable
`x-vercel-cron` header authorizes nothing unless a route explicitly opts into `"dual"`. I checked all
24 `/api/cron/*` handlers: every one calls `cronAuthError` or `cronAuthErrorBearerOnly` as its first
statement, and none passes `mode: "dual"`. `cron/gamma`'s `POST` (line 97-99) delegates to `GET`, so
it inherits the same check. `hasOpsAuth` (`apps/web/lib/ops/ops-auth.ts:12-24`) and the duplicate
copy inside `ops/public-surface-truth/route.ts:140-149` both use `timingSafeEqual` with a length
pre-check and return `false` when the secret is unset, so a misconfigured deploy fails closed.
`grep` for `=== process.env` found no secret compared with `===` anywhere in the repo.

**No SQL injection surface.** Every `$queryRawUnsafe` / `$executeRawUnsafe` call I traced uses `$1`
style bind parameters:
`apps/web/lib/community/durable-rate-limiter.ts:113-118` (the rate-limit upsert),
`apps/web/lib/ai-control-plane/budget.ts` and `credit-admission.ts` throughout. The only string
interpolated into SQL is `confirmedColumn` at `budget.ts:974` and `:993`, and it is assigned from a
two-branch literal at line 936-937 (`"confirmedBilledUsd"` or `"confirmedCreditUsd"`), never from
input. `apps/web/app/api/performance/route.ts:57-70` uses a Prisma tagged template, which
parameterises, and its own comment says so.

**No shell execution in the web app.** `grep -rn "child_process|execSync|spawnSync|exec\(|spawn\("`
over `apps/web` returned only regex `.exec()` calls on strings. No user-supplied value reaches a
shell.

**SSRF defence at the one place it matters is well built.** `apps/web/lib/news/rss.ts:213-232` sets
`redirect: "manual"`, validates the initial URL with `validateEndpointUrl`, then re-validates the
`Location` hop with both `locationIsInternalTargetLocation` and `validateEndpointUrl` before
following it exactly once. `validateEndpointUrl`
(`packages/prediction-engine/src/ensemble/remote-model-client.ts:236-267`) rejects non-http(s)
schemes, cloud metadata hosts, and private/loopback IPv4 and bracketed IPv6 literals. The autonomy
executor (`apps/web/lib/autonomy/execute-autonomy-cycle.ts:139-146, 196-212`) derives its base URL
from environment variables only, restricts paths to a compile-time allow-list, and sets
`redirect: "manual"`. The Sleeper URL builders (`apps/web/lib/integrations/sleeper.ts:39-46`) use
`encodeURIComponent` on the username, and the routes strip `leagueId` and `season` to digits
(`apps/web/app/api/sleeper/league/route.ts:10-11`).

**Secrets are read only from `process.env`.** No literal key, no config file read, no fallback to a
hardcoded value on any auth path. `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` fall back to the
harmless placeholder `"dev-noop"` (`apps/web/lib/auth.ts:76-77`), which cannot authenticate anyone.
`/api/dev/state` returns only booleans about which variables are set, never values, and 404s outright
when `NODE_ENV === "production"` (`apps/web/app/api/dev/state/route.ts:13-15, 32-38`).

**The dev admin bypass is genuinely hard-gated, three times over.** `auth()` returns the synthetic
ADMIN session only when `NODE_ENV !== "production"` (`apps/web/lib/auth.ts:162`); `getUserEntitlements`
repeats the check before escalating (`apps/web/lib/entitlements.ts:61-69`); `middleware.ts:97` repeats
it again for the cookie redirect; and `assertDevAdminDisabledInProd` runs at module load and refuses
to import the module at all if the flag leaked into a production build
(`apps/web/lib/entitlements.ts:32-42`).

**Role resolution is fail-safe, never fail-open.** The JWT callback re-reads the DB role on every
refresh so a downgrade propagates within the token life, and a failed lookup leaves the existing role
alone rather than defaulting to ADMIN (`apps/web/lib/auth.ts:98-115`). The `ADMIN_EMAILS` allow-list
is applied fresh in the session callback rather than baked into the token, so removing an email
revokes admin on the next request (lines 117-128), and `isAdminEmail` refuses non-ASCII emails to
close the homoglyph class (lines 62-69). Session `maxAge` is bounded to 24 hours (line 82).

**No IDOR found.** I traced every route taking an identifier:
`cockpit/journal/[id]/{route,submit,retract,scan}`, `cockpit/tasks/[id]`, `cockpit/content/[id]` and
`.../review`, `admin/losses/[pickId]/draft`, `admin/promotions`, `admin/dashboard`,
`cockpit/api-costs/override`, `cockpit/operator-registry`, `cockpit/resource-intelligence`,
`airwave/*`, `media/readiness`, `decision-genome`. Every one gates on
`session.user.role !== "ADMIN"` as the first statement. The objects behind them are single-tenant
operator records, so there is no second owner to scope to. The genuinely per-user objects are
correctly scoped: `deletePushSubscription` filters on `(userId, endpoint)` and cannot delete another
user's row even given the endpoint string (`apps/web/lib/push/subscription-db.ts:146-161`);
`upsertPushSubscription` refuses to re-own an endpoint held by a different user and returns a generic
409 that does not disclose the owner (lines 107-142, and the route's handling at
`push/subscribe/route.ts:67-78`); every watchlist operation is keyed by the session `userId`
(`watchlist/{route,follow,unfollow}`). `receipts/[id]` and `picks/[id]/audit` are public by design and
forward an explicit allow-list of fields rather than the raw row
(`apps/web/app/api/receipts/[id]/route.ts:1-10, 33-47`).

**The premium and fantasy paywall is enforced server-side on every analytics route.** All 20
`/api/intelligence/*`, all 11 `/api/nflverse/*`, plus `projections`, `scoring/player-index`,
`dfs/salaries` and `tools/lineup` call `requirePremiumApi*` or `requireFantasyApi*` as their first
statement. `isPremium` (`apps/web/lib/api-entitlement.ts:36`) correctly excludes FANTASY from the
betting-analytics floor, and the module comment records that keying on `tier !== "FREE"` had
previously leaked the Pro slate to fantasy subscribers. `evaluateGate` fails closed to FREE on a
lookup error and logs it (lines 90-98). The only routes with no gate are genuinely public data
(`mlb/teams`, `moneypuck/nhl`, `trends/nflverse-readiness`), which is finding 9's rate-limit point,
not a paywall point.

**B2B key handling is correct.** `resolveB2bKeyScope` (`apps/web/lib/b2b/api-key-auth.ts:62-78`)
compares in constant time, defaults a bare key to the FREE scope rather than premium, and the module
comment records the leak that fail-closed default fixed. `rateLimitB2b` uses the durable Postgres
limiter keyed on a fingerprint of the key rather than the key itself, and returns 503 rather than
allowing when the store is down (lines 118-152).

**Stripe money path.** Webhook signature verification happens before any state write
(`apps/web/app/api/webhooks/stripe/route.ts:41-52`); the client is acquired outside the signature try
block so a config error is not misreported as a bad signature (lines 24-36); a durable store is a hard
precondition (lines 61-73); events are idempotent by `stripeEventId` with a benign-conflict path
(lines 76-110). Checkout is authenticated, rate limited, age gated, zod validated, protected against
double subscription, and derives its `successUrl` / `cancelUrl` from `NEXT_PUBLIC_APP_URL`, never
from request input (`apps/web/app/api/subscriptions/checkout/route.ts:70-97, 341-351`) so there is no
open redirect there. Errors return a generic message and log the detail server-side (lines 418-424).

**The durable rate limiter itself is sound.** One atomic
`INSERT ... ON CONFLICT DO UPDATE ... WHERE count < $4` per check
(`apps/web/lib/community/durable-rate-limiter.ts:113-118`), so two instances cannot both pass a
boundary slot; a store error throws `RateLimitStoreUnavailableError` and every caller I read
translates it to 503 rather than allowing; a zero or negative limit denies rather than meaning
unlimited (lines 144-147); retention is bounded at 48 hours with a wired prune cron.

**Anonymous moderation reporting is careful about its trust boundary.**
`deriveTrustedSourceIp` (`apps/web/lib/community/anonymous-report-handler.ts:125-153`) uses the
platform-overwritten header on Vercel, and off Vercel refuses to trust any header until an operator
names one explicitly, returning null (fail closed) rather than silently weakening the quota. It never
reads a client-declared fingerprint, and the feature is default-off.

**Security headers.** `apps/web/next.config.mjs:112-155` sets HSTS with preload,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
`Permissions-Policy`, and `X-Frame-Options: DENY` on every route except `/embed`, with the exclusion
regex at line 140 written specifically so the embed response does not ship DENY next to
`frame-ancestors *`. `poweredByHeader: false` at line 15.

---

## What I could not check and why

- **Production runtime behaviour.** No request was made to any deployed host. Everything here is
  static reading plus local Node experiments. In particular I could not confirm whether the Vercel
  edge sanitises a `Location` header containing a tab before it reaches a browser, which is the one
  open question in finding 1's signin leg (the age-verify leg does not depend on it).
- **Whether `NEXT_PUBLIC_APP_URL` is set in production.** It determines whether `csrfOriginCheck`
  (finding 5) would fail closed and 403 real traffic if wired to more routes, and it is the base for
  the Stripe `successUrl`. `.env*` files are Read-denied for agent sessions per CLAUDE.md rule 4.
- **Dependency vulnerabilities.** I did not run `npm audit` or `scripts/guardrails/dependency-audit.mjs`;
  that is the `audit-deps` dimension, not this one. No claim either way.
- **The full guardrail suite.** I ran only `secret-scan.mjs` (exit 0, but staged mode, 0 files) and
  `openapi-security-scan.mjs` (exit 0, 3 contract files). I did not run `run-all.mjs`, so I make no
  claim about the other 24 guards.
- **Database contents and live entitlement rows.** Read-only source audit; no DB connection was
  opened.
- **Actual Claude and Odds API spend.** I read the code paths that bill and the governors that bound
  them, but I have no billing data, so finding 3 and finding 4's spend leg are analyses of the
  control, not measurements of loss.
- **Exploit confirmation.** I did not attempt any of the described abuses against a running instance.
  The open redirect (finding 1) and the header-forgery limiter bypass (finding 2) are both confirmed
  at the level of the guard logic itself, by executing the guard's own predicate and the URL
  resolution beside it; neither was fired at a live server.
- **`packages/{epistemic-twin, genesis-kernel, governed, ops, partner-stack, phase-c, quote-plane}`
  and `workers/*`** were only touched where an `apps/web` path led into them. They were not
  independently swept, so absence of findings there is absence of evidence.
