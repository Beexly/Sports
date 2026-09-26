# Galaxy Sports Edge — native SwiftUI iOS app

Branch `feat/ios-swiftui` · Xcode project `ios/GalaxySportsEdge.xcodeproj` ·
iOS 17.0+ · Swift 5.9+ · Xcode 16+ · **zero third-party dependencies**.

Five tabs: The Edge · Scores · Reads · My Bets · Profile.

---

## 0. Read this first: the Xcode project is generated

`ios/GalaxySportsEdge.xcodeproj/project.pbxproj` is **generated** by
`ios/generate_project.py`. The file tree is the source of truth.

```bash
python3 ios/generate_project.py           # regenerate after adding/removing files
python3 ios/generate_project.py --check   # CI: fail if the two have drifted
```

Hand-editing the project is not merely discouraged, it is a trap: dropping a
file from the sources phase makes it silently not compile, and nothing in the
build says so. `--check` runs in CI for exactly that reason. The generator emits
deterministic ids, so a regeneration with no changes is byte-identical and
produces an empty diff.

---

## 1. Layout

```
ios/
  GalaxySportsEdge.xcodeproj      GENERATED — do not hand-edit
  GalaxySportsEdgeTests/          61 tests, 7 files
  generate_project.py
  INTEGRATION.md

  GalaxySportsEdge/
    App/            composition root, app delegate, notification router
    Platform/
      Config/       AppConfiguration — origins, feature switches, route names
      Domain/       Models (domain), DTOs (wire), OddsMath (pure arithmetic)
      Persistence/  Keychain, JSONFileStore, BetStore, SavedPicksStore
      Auth/         OAuthEndpoints, SignInWebView, AuthSession, SessionCookieStore
      Subscription/ SubscriptionStore (StoreKit 2 + Stripe handoff)
      Push/         PushNotificationManager (APNs)
    Core/
      Networking/   Endpoint, APIClient, APIError, Envelope
      Services/     SportsService (protocol), LiveSportsService, MockSportsService
      Design/       Theme, Components, Formatting
    Features/       one folder per screen: View + ViewModel together
      Picks/ Scores/ Articles/ MyBets/ Profile/ Account/ Paywall/ Support/
```

`AppEnvironment` is the composition root. Screens never construct a service, a
store or a client — they read them from the environment. That is what makes the
app testable: a test builds an `AppEnvironment` from stubs and the whole app
runs against it.

---

## 2. Backend: what is actually wired

`AppConfiguration.useMockData = false`. The app talks to the real backend.
Every route below exists in `apps/web/app/api/**` on this branch.

| Screen | Route | Status |
|---|---|---|
| The Edge | `GET /api/picks?date&sport` | existed |
| The Edge | `GET /api/picks/{id}/explain` | existed (auth) |
| Scores | `GET /api/games?date&sport` | **added on this branch** |
| Reads | `GET /api/blog?page&limit`, `?slug=` | existed |
| Profile | `GET /api/me` | **added on this branch** |
| Account | `DELETE /api/me` | **added on this branch** |
| Push | `POST`/`DELETE /api/push/apns` | **added on this branch** |
| Billing | `POST /api/subscriptions/checkout`, `/portal` | existed |
| Follows | `GET /api/watchlist`, `POST /api/watchlist/follow|unfollow` | existed |

### Things the scaffold got wrong, and what is true now

The original `INTEGRATION.md` claimed these routes existed. They did not:

- **`/v1/picks`, `/v1/games`, `/v1/articles`, `/v1/me`, `/v1/picks/save` — none
  of them exist.** The Next.js app mounts its API at `/api/*`, and the only
  versioned namespace is `/api/v1/*` (raw signals and probabilities). The
  client now joins `baseURL + "api" + path`, and a path opts into `v1/` by
  starting with it.
- **Tiers were `free` / `edgePro`.** The real entitlement table is
  `FREE / FANTASY / PRO / ELITE` (`SubscriptionTier` in `packages/types`).
- **`ProfileView` invented an `edgePro` tier and a stubbed profile.** Replaced
  with `GET /api/me`, which resolves the tier through the same
  `getUserEntitlements` every other surface uses.
- **`SavedPicksView` had no backend.** `/api/watchlist` follows *teams and
  players* — it is not a pick-save route, and pretending otherwise would have
  been a paywalled dead end. Bookmarks are local and the UI says so
  ("saved on this device").

### Backend files added

```
apps/web/app/api/games/route.ts              public scoreboard
apps/web/app/api/me/route.ts                GET + DELETE (5.1.1(v))
apps/web/app/api/push/apns/route.ts         native APNs register/unregister
apps/web/lib/push/apns-db.ts                 persistence, same result discipline
apps/web/lib/push/apns-validation.ts         zod input validation
packages/db/prisma/schema.prisma             + model ApnsDevice
```

**Why APNs is a new route and not `/api/push/subscribe`:** that route registers
a *Web Push* subscription and enforces a browser `Origin` CSRF check. That
check is correct for the web and wrong for native — an iOS client has no Origin
header at all and would be rejected by a guard that is protecting the right
thing in the wrong place. Weakening it would have been the easy fix and the
wrong one, so the native path is separate and the web check is untouched.

**Migration required:** the `ApnsDevice` model needs a migration. Until it is
applied, `/api/push/apns` answers an honest 503 with
`{"error": "Push alerts are not activated yet."}` — the same degradation the
web push route already uses for the same situation.

---

## 3. Data honesty — the rules the client follows

These are the ones worth arguing about, so they are written down.

1. **A pick with no book price stays priceless.** `hasBookPrice: false` rows
   render `—`, not a price. Deriving a quote from the model's own probability
   and printing it as a *market* price would be the app quoting itself.
2. **A gated field renders a lock, not a zero.** A withheld confidence and a
   0% confidence are different claims; only one of them is honest.
3. **An unknown enum member degrades, it does not throw.** The engine adds
   `PickGrade` and `RiskLevel` members. An app that throws on one of them
   shows a red screen for a whole slate because of a single row.
4. **`content: null` from `/api/blog` is a LOCKED article, not an empty one.**
   Decoding it as an empty article renders a blank read instead of a paywall.
5. **A refused explanation is shown as a refusal.** The explain route can
   refuse on budget, upstream, or a bad question. No canned paragraph ever
   stands in for a refusal.
6. **The FREE daily cap is named.** The slate meta reports
   `totalAvailableToday`; the UI says "3 more picks today — your Free tier
   sees 1 per day" rather than silently truncating.
7. **Sample data labels itself.** Mock data sets `meta.containsSeedData`, and
   the slate renders a "SAMPLE DATA — not model output" banner.
8. **Edge points are not expected value.** `edgePoints()` ignores the vig and
   can read positive on a bet that is negative-EV, so the UI labels it "vs
   market" and never "edge %". Both are implemented and pinned by tests.
9. **Bookmarks and the bet log are local, and the UI says so.** The app has no
   sportsbook integration and does not pretend to.

---

## 4. INTEGRATION.md checklist — status

### 4.1 Auth UI — DONE (web-flow, cookie replay)

- [x] `OAuthEndpoints` — the sign-in contract in one place, including the
      callback-URL validation that stops a hostile app from getting this one to
      carry its cookies.
- [x] `SignInWebView` — the NextAuth sign-in page in a `WKWebView`. Intercepts
      the `gse://auth` redirect, reads the cookie jar from
      `WKWebsiteDataStore.default()`, hands back only the session cookies.
- [x] `SessionCookieStore` — persists the session cookie in the keychain,
      replays it as a `Cookie:` header, recognises both
      `next-auth.session-token` and `__Secure-next-auth.session-token`.
- [x] `AuthSession` — restore, sign in, sign out, refresh, delete. A 401 wipes
      the jar; a network error does **not** log anyone out.
- [x] `SignInView` — presented from Profile, explains that the sign-in happens
      on our own site and that the app only receives the session cookie.
- [x] `CFBundleURLTypes` → `gse` in `Info.plist`.

**Why a web view and not a native OAuth client:** the backend is NextAuth with
a Google provider and a Prisma adapter. There is no native token endpoint, and
the credential is an HTTP-only **cookie**, not a bearer token. The web flow is
the one the product already ships.

**Known limitation:** the flow opens NextAuth's sign-in *page*, so the reader
taps "Sign in with Google" once. Navigating straight at
`/api/auth/signin/google` skips the CSRF handshake and lands on an error page.
Removing the extra tap means owning a token exchange the backend does not have.

**Blocker to ship:** add `gse://auth` to the NextAuth `trustHost` /
`redirect` allowlist in the deployment env. Until that is set, the redirect
never arrives and sign-in cannot complete.

### 4.2 StoreKit / subscriptions — client DONE, server side PARTIAL

- [x] `SubscriptionStore` — StoreKit 2: `Product.products(for:)`,
      `purchase()` with verified/unverified handling, `Transaction.updates`
      listener, `currentEntitlements`. An unverified transaction is refused
      loudly, because accepting it is the bug that lets a jailbroken device
      mint a subscription.
- [x] Honest `State` enum: `available` / `notConfigured` / `unavailable(reason)`
      / `purchasing`. An app that says "unavailable" when it means "not
      configured yet" teaches readers to ignore the label.
- [x] `PaywallView` — renders the Stripe-hosted checkout path (live today),
      the StoreKit path when configured, and says which mode it is in.
- [x] `BillingInterval.monthly / .yearly` wired to the real checkout request.
- [x] `BrowserSheet` — a `WKWebView` sheet for checkout and the billing
      portal, both of which are web surfaces.

**`AppConfiguration.usesAppStoreIAP = false`, and that is deliberate.** The
backend's live billing is Stripe. Turning StoreKit on before the products exist
in App Store Connect *and* a server route can redeem a signed transaction
would sell subscriptions the server cannot honour.

**To switch it on, in order:**
1. Create the auto-renewable subscriptions in App Store Connect; put their
   product ids in `AppConfiguration.storeKitProductIDs`.
2. Add `POST /api/subscriptions/verify` accepting the transaction JWS
   (`transaction.jwsRepresentation`) and granting the tier in the existing
   `Subscription` row. **Verify the signature against Apple's chain and fail
   closed** — an unverified transaction is a forged subscription. Note
   `Subscription.stripeCustomerId` is `NOT NULL @unique`; an App-Store-origin
   row needs a stable synthetic value (e.g. `apple:<originalTransactionId>`).
3. Set `usesAppStoreIAP = true`.
4. Only then remove the Stripe path from `PaywallView`.

Until then the Stripe button is the one that works, and that is what it says.

### 4.3 Push notifications — DONE (client + route), migration BLOCKED

- [x] `PushNotificationManager` — authorization, APNs registration, token
      hex-encoding, server registration, foreground presentation.
- [x] **A token is not a subscription.** APNs issues a token before the reader
      has answered the permission prompt; registering it then creates a row
      the server will push to for someone who was never asked. Server
      registration is gated on granted authorization.
- [x] A denied prompt is treated as final. The only offered action is Settings.
- [x] `AppDelegate` — APNs callbacks, foreground banners, notification taps
      routed to the pick.
- [x] Unregister on sign-out and before account deletion, so a sold device
      stops receiving another person's graded picks.
- [x] `POST` / `DELETE /api/push/apns` + `ApnsDevice` model.

**BLOCKER:** the `apns_devices` migration must be applied by the founder (this
repo's migrations are founder-applied by convention). Until then the route
returns a 503 that the client shows as "not activated yet".

**Also blocked:** sending. An APNs sender needs an APNs auth key
(`.p8`) and a team ID in the deployment env. The route stores and revokes
tokens; nothing in this branch dispatches a push yet, and the client has no
code that claims otherwise.

### 4.4 Account deletion — DONE

- [x] `DELETE /api/me` — deletes the user row; every child relation is
      `onDelete: Cascade`, so sessions, watchlist, subscription, alerts,
      checkout attempts and push tokens all go with it.
- [x] `DeleteAccountView` — lists exactly what is deleted and exactly what is
      not (the local bet log, which was never on the server), requires the
      reader to type `DELETE`, and shows a terminal "your account is deleted"
      state rather than silently dismissing.
- [x] Admin accounts are refused a 403. Losing the owner account to an
      in-app tap is unrecoverable and not what the button is for.

### 4.5 Subscription gate → content — DONE

- [x] `Article.isLocked` / `readMinutes` behaviour, wired into
      `ArticleDetailView` + `PaywallView`.

### 4.6 Article images / team logos — STILL OPEN

`heroImageURL` and `Team.logoURL` are `nil` across the API surface: the blog
route has no image column and the games route does not join the `teams` table.
`AsyncLogo` already handles load + monogram fallback, so the app degrades
cleanly, but no real logos ship.

**To close it:** join `Team` in `/api/games` and return `logoURL`; add an
image column to the blog route. Both are backend work, not client work.

---

## 5. Tests

118 test methods, 1,672 lines, 7 files, in a real `XCTest` target that CI runs
on a simulator.

| File | What it pins |
|---|---|
| `OddsMathTests` | implied probability, profit vs payout, overround, the 5-point retail increment, round-trip stability, proportional de-vig, and why `edgePoints` can read positive on a negative-EV bet |
| `PickDecodingTests` | the real `/api/picks` payload, the FREE-tier null-gated row, a no-book-price row, unknown enum members, fields the server has not added yet, `success:false` with a 200 |
| `NetworkingTests` | URL construction, the `v1/` namespace, sorted query items, inline-query merge, which errors are retryable, gated-503 is not auto-retried, every error has a message |
| `ViewModelTests` | filter guards (no refetch on a no-op tap), graded-first ordering, scoreboard grouping, paging termination, a failed "load more" keeps the list, refusals stay refusals |
| `BetStoreTests` | payouts, pushes in the record, win rate excluding pushes, ROI excluding pending stake, stake-weighted portfolio break-even, persistence, corrupt-file recovery, bookmark cap |
| `DomainTests` | team abbreviations, backend sport names, tier ordering, `content:null` paywall, the cookie jar, callback validation |
| `StubSportsService` | the scriptable service and the fixtures |

The fixtures are the real API's shape. A test written to match the decoder
instead of the server is the most common reason a "passing" contract test
proves nothing, so the payloads were transcribed from
`apps/web/app/api/picks/route.ts` and `apps/web/app/api/blog/route.ts`.

CI runs them, and the workflow checks the log for `TEST SUCCEEDED` and an
executed-test count rather than trusting `xcodebuild test`'s exit code, which
is 0 on a run that produced no test bundle at all.

---

## 6. CI

`.github/workflows/ios-build.yml`, macOS 15, free on a public repo.

- `project` job (ubuntu, ~5s): `generate_project.py --check`, then
  `check_pbxproj.py`.
- `build-and-test` job: `plutil -lint` on the two XML property lists,
  `xcodebuild -list` to prove Xcode can open the project, an unsigned
  simulator build, then `xcodebuild test` against a simulator chosen at
  runtime — GitHub adds and removes runtimes from its images, and a
  hard-coded UDID is a flaky lane.

`check_pbxproj.py` parses the project file as what it is — an OpenStep
property list — and reports a line and a column when something is wrong. It
exists because of `buildActionMask = [PHONE]`, which the generator emitted
into all six build phases. `[` cannot begin a value in an OpenStep plist, so
Xcode refused to open the project at all; its own conversion of the file to
JSON failed with "JSON text did not start with array or object", which says
nothing about the cause. Every brace in the file balanced, which is why
counting them never found it. The value is an integer, `2147483647`.

The generator is the only thing that writes this file, so a structural mistake
is a bug that reproduces on every run. Catching it in the ubuntu job costs a
second instead of a 35-minute macOS lane.

The project file is checked with `xcodebuild -list`, not `plutil -lint`. A
pbxproj is OpenStep; plutil applies the XML grammar to it regardless of the
file name, so it rejects the `// !$*UTF8*$!` header of a file Xcode opens
without complaint. Brace counting is not a substitute either: the file that
Xcode refused to open had balanced braces, balanced parens and no dangling
references.

`xcodebuild test` also exits 0 on a run that produced no test bundle, so the
step greps the log for an executed-test count and `TEST SUCCEEDED` rather than
trusting that exit code.

### The generated project file is location-independent

Object ids are derived from the target name and the path relative to it, never
from the absolute source root. They were derived from the root, which made the
generated pbxproj differ at every checkout location while looking correct in
the author's own directory — so `generate_project.py --check` reported the
project stale on every CI run and had never once passed. A generated file that
only reproduces where it was generated is not generated; it is a snapshot.

---

## 7. Before this can ship

Nothing here blocks an internal build. The list is what blocks a *store*
build, in the order it will bite.

1. **Apple Developer Program membership** ($99/yr). Without it there is no
   device build, no TestFlight, no signing. This is a purchase, not a task.
2. **NextAuth trusted-callback config** for `gse://auth` in the deployment
   env. Sign-in cannot complete without it.
3. **`apns_devices` migration** applied by the founder.
4. **Age rating and posture.** Guideline 4.7 / 5.3: the app displays odds.
   That requires either a gambling licence per territory or a purely
   editorial posture with no wagering facilitation. The app is built for the
   second — it logs the reader's *own* notes, has no book integration, and says
   so in the Profile footer — but the App Review decision is Apple's, not
   ours, and it should be settled before submission, not after a rejection.
5. **Support URL and privacy policy URL** in App Store Connect.
6. **Privacy manifest review.** `PrivacyInfo.xcprivacy` ships; the declared
   API usages should be re-checked against what the app now actually calls
   (UserDefaults, file timestamps, and the keychain were added since the
   scaffold wrote it).
7. **`usesAppStoreIAP`**, if Apple rules that a Stripe-hosted checkout is not
   acceptable for in-app digital subscriptions. See §4.2.
