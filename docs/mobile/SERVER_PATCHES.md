# Mobile API v1 — server patch

**What this is.** The four server routes the native client needs that do not exist in
`Beexly/Sports` today. They are written to drop into the repo as-is.

**Why they are needed, in one line each.**

| Route | Why |
|---|---|
| `GET /api/mobile/v1/bootstrap` | One cold-start call instead of four. Four TLS handshakes on a cellular radio is the slowest possible first impression. |
| `POST /api/mobile/v1/devices` | APNs device registration. `/api/push/subscribe` is Web Push only — it takes a `PushSubscription.toJSON()` shape (`endpoint` + `p256dh`/`auth`), which a native app cannot produce. |
| `POST /api/mobile/v1/account/delete` | Required by App Store Review guideline 5.1.1(v). Must be callable from inside the app. |
| `POST /api/mobile/v1/auth/exchange` | A native client cannot use a NextAuth cookie session. It needs a bearer token minted from a completed web sign-in. |
| `POST /api/mobile/v1/receipts` | Verifies a StoreKit 2 JWS and grants the tier. Without it the client's purchase fix leaves every purchase at `pending` forever. |

**Non-negotiable constraints these routes respect.**

1. **They compose, never re-implement.** `bootstrap` calls `loadBoardState`, `getUserEntitlements`
   and the brief loader — the same functions the existing routes call. A second source of truth for
   any value is exactly the drift this repo spends real effort preventing (see the
   `pricesWorseThanMarket` placement note in `adverse-edge-suppression.ts`).
2. **Server-side gating only.** Every route resolves entitlements through
   `getUserEntitlements(userId)` and passes them into the loader, which applies the tier filter in
   the query. Nothing here trusts a client-supplied tier.
3. **No secrets, no new env var without a default.** `MOBILE_TOKEN_SECRET` falls back to
   `NEXTAUTH_SECRET`, so the patch cannot silently break a deploy that forgot to set it.
4. **Fail closed on auth, honest on absence.** A missing table returns 503 with a distinct body,
   never a 500 — the same pattern `/api/push/subscribe` already uses.
5. **The repo's own guardrails still apply.** These routes are additive and import only existing
   modules, so `scripts/guardrails/run-all.mjs` and the API v1 boundary guard are unaffected. They
   live under `/api/mobile/v1/`, deliberately NOT under `/api/v1/` (the shadow B2B stack that the
   boundary guard blocks).

**Rate limiting.** `bootstrap` is IP-keyed via `consumePublicFormRateLimit` (the durable limiter,
same as `/api/picks`) at 120/min — it is heavier than a single endpoint and called on every launch.
`devices` and `account/delete` are user-keyed via `consumeRateLimit`.

**Deploy order.** `bootstrap` and `devices` are safe to ship independently. `auth/exchange` should
ship with the client change that consumes it, because until the client uses it the route is dead
code with an auth surface.

---

## Files

```
apps/web/app/api/mobile/v1/bootstrap/route.ts
apps/web/app/api/mobile/v1/devices/route.ts
apps/web/app/api/mobile/v1/account/delete/route.ts
apps/web/app/api/mobile/v1/auth/exchange/route.ts
apps/web/app/api/mobile/v1/receipts/route.ts
apps/web/lib/mobile/bearer-auth.ts
```

## Environment variables

| Variable | Required | Why |
|---|---|---|
| `MOBILE_TOKEN_SECRET` | No — falls back to `NEXTAUTH_SECRET` | Signs mobile session tokens. |
| `IOS_BUNDLE_ID` | No — defaults to `com.galaxysportsedge.app` | The bundle id a StoreKit receipt must claim. |
| `APPLE_ROOT_CA_PEM` | **Yes, for purchases** | Apple's root CA, used to verify the JWS certificate chain. **Without it, `/receipts` returns 503 and grants nothing** — it fails closed rather than trusting an unverified signature. Fetch it from https://www.apple.com/certificateauthority/ (Apple Root CA - G3). |

## Schema additions

```prisma
// One row per registered device. Distinct from the Web Push table because the
// credential shapes are different and mixing them would make the send path
// branch on a stringly-typed column.
model MobileDevice {
  id         String   @id @default(cuid())
  userId     String
  pushToken  String   @unique   // Expo push token, or a raw APNs hex token
  platform   String              // "ios"
  appVersion String
  buildNumber String
  deviceModel String
  locale     String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  lastSeenAt DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

```prisma
// One row per verified StoreKit transaction. This table IS the idempotency
// mechanism for /receipts: StoreKit re-delivers unfinished transactions and the
// client re-submits everything on every launch, so the same transaction WILL
// arrive repeatedly and every call after the first must be a no-op.
model ProcessedReceipt {
  id                    String   @id @default(cuid())
  transactionId         String   @unique
  originalTransactionId String?
  userId                String
  productId             String
  tier                  String
  environment           String
  purchasedAt           DateTime
  expiresAt             DateTime?
  createdAt             DateTime @default(now())

  @@index([userId])
}

// The one-time code from the mobile sign-in exchange. Single-use is enforced by
// a conditional updateMany, not by a check-then-write, so two concurrent
// redemptions cannot both succeed.
model MobileAuthCode {
  id        String    @id @default(cuid())
  code      String    @unique
  userId    String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}
```

`onDelete: Cascade` on `MobileDevice` is load-bearing: deleting the account must delete the
devices, or the next push attempt sends to a token belonging to a deleted user.

## Migration

```
npm run db:migrate -- --name add_mobile_device
```

Until the migration is applied, `/api/mobile/v1/devices` returns 503 with
`code: "table_absent"` — the same honest degradation `/api/push/subscribe` already uses, so a
customer never sees a 500.
