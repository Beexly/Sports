# Attack Tree — Galaxy Sports Edge web surface

**Scope:** `apps/web` — 218 API routes + the page middleware.
**Date:** 2026-11-04, branch `hermes/overnight-2026-11-03-corpus`.
**Authorization:** owner-authorized self-assessment of this repository. No
third-party systems were probed. This document is for the repo owner; it
contains no working exploit payloads.

Every control claim below is a measurement from this session, with the command
that produced it. Where my first scan was wrong, the correction is recorded —
two false positives were caught and are noted inline, because a tree built on a
bad scan is worse than no tree.

---

## 0. The one architectural fact that shapes everything

**The middleware does not run on `/api/*`.**

```
apps/web/middleware.ts:125-130
  matcher: ["/dashboard/:path*", "/admin/:path*", "/cockpit/:path*", "/waitlist/:path*"]
```

The comment there is explicit: *"/embed/* and all other public paths never
needed middleware."* API routes are "other public paths."

**Consequence:** every one of the 218 API routes is reached without any
central gate. Each must self-protect, and nothing catches a route that forgets.
This is the tree's dominant structural risk: not a missing guard on an existing
route, but the absence of a backstop for the next one.

---

## 1. Measured control posture

| Area | Guarded / total | Mechanism | Verdict |
|---|---|---|---|
| `admin` | 5 / 5 | session + role | solid |
| `cockpit` | 30 / 30 | session + role | solid |
| `ops` | 17 / 17 | session + role | solid |
| `cron` | 38 / 38 | `cronAuthError()` | solid |
| `webhooks/stripe` | yes | `stripe-signature` → `constructEvent` | solid |
| `webhooks/whop` | yes | `x-whop-signature` → `verifyWhopWebhookSignature` | solid |
| **`webhooks/telegram`** | **no** | none | **gap (bounded)** |
| `gse/v1` data routes | 3 / 3 | entitlement + api key | solid |
| `gse/v1` catalog/external | 0 / 13 | none | public by design |
| `proof`, `verify` | 0 / 8 | none | public by design |
| all routes | 114 / 218 have any check | — | rest are public by design |

**False positive #1 — cron.** A grep for `CRON_SECRET` reported 7 cron routes
unguarded. Wrong test: the guard is the `cronAuthError()` helper, and
`CRON_SECRET` lives inside it. Re-measured against the helper: **38/38 guarded,
0 unguarded.** No finding.

**False positive #2 — webhooks.** A coarse scan reported 0/3 guarded. Wrong
again: Stripe uses `stripe-signature` and Whop uses `x-whop-signature`, neither
of which my regex matched. Two of three are properly signature-verified.

---

## 2. Assets

| # | Asset | Where | Why an attacker wants it |
|---|---|---|---|
| A1 | Paid picks | `/packages`, gated content | Paywall bypass = direct revenue loss |
| A2 | Member PII | `age-verify`, `auth`, `members` | Identity + compliance exposure |
| A3 | Payment state | Stripe/Whop webhooks, `subscriptions` | Grant entitlement without paying |
| A4 | Pick integrity | `generate-signal-slate`, published board | Manipulating a published pick is reputational + regulatory |
| A5 | Proof ledger | `/api/proof/*`, signing layers | Forged receipt undermines the product's core claim |
| A6 | Compute | 38 cron triggers | Unauthenticated invocation burns quota |

---

## 3. Attack tree

Root: **obtain value from GSE without authorization.**

```
G  Obtain value without authorization
│
├─ OR ─ G1  Bypass the paywall                                    [A1]
│   ├─ OR ─ G1.1  Read paid content through an ungated route
│   │   ├─ LEAF  Enumerate /api/* and find one returning paid data
│   │   │        cost: $0 · skill: low · time: hours · detect: LOW
│   │   │        -> 211 of 218 routes are undocumented (measured, separate
│   │   │           audit). Enumeration is cheap and nothing alerts.
│   │   └─ LEAF  Abuse cache headers on a public route
│   │            cost: $0 · skill: low · time: minutes · detect: none
│   │            (e.g. gse/v1/catalog sets Cache-Control: public, max-age=60 —
│   │             harmless today; the pattern is the risk if it ever returns
│   │             user-scoped data)
│   └─ AND ─ G1.2  Forge an entitlement
│       ├─ LEAF  Obtain a valid API key (leak, log, client bundle)
│       └─ LEAF  Present it to gse/v1/values/{metricId}
│                cost: $0 · skill: med · time: days · detect: MED
│                MITIGATED: entitlement + api key present on all 3 data routes
│
├─ OR ─ G2  Escalate to an operator surface                         [A1,A4]
│   ├─ LEAF  Hit an admin/cockpit/ops route with no session
│   │        cost: $0 · skill: low · time: minutes · detect: MED
│   │        BLOCKED: 52/52 admin+cockpit+ops routes check session+role
│   └─ LEAF  Forge a session cookie
│            cost: $0 · skill: high · time: weeks · detect: HIGH
│            MITIGATED: middleware only checks cookie PRESENCE
│            (middleware.ts:102 `req.cookies.has`) — but that is a redirect
│            convenience, not the control. Real validation is in each page
│            and route. Note this: the middleware check is NOT a security
│            boundary and must never be treated as one.
│
├─ OR ─ G3  Manufacture a payment                                  [A3]
│   ├─ LEAF  POST a fake webhook to grant entitlement
│   │        cost: $0 · skill: med · time: hours · detect: HIGH
│   │        BLOCKED (Stripe, Whop): signature verified before parse
│   └─ LEAF  POST a fake update to the Telegram webhook
│            cost: $0 · skill: low · time: minutes · detect: LOW
│            OPEN: no secret_token check on /api/webhooks/telegram
│            IMPACT BOUNDED: the only write path (/unlock <token>) calls
│            verifyPackagePurchase(), so a forged update cannot mint an
│            entitlement. Real exposure = unauthenticated ingestion:
│            junk rows, log noise, resource use. Fix anyway — it is one header.
│
├─ OR ─ G4  Corrupt a published pick                               [A4]
│   └─ LEAF  Trigger a slate generator directly
│            cost: $0 · skill: low · time: minutes · detect: MED
│            BLOCKED: all 38 cron routes call cronAuthError()
│            NOT BLOCKED BY MIDDLEWARE — these are GETs. If cronAuthError were
│            ever removed or mis-ordered above the handler body, a GET becomes
│            a remote trigger reachable from an <img> tag. Order matters:
│            the guard is the first statement in the handler.
│
└─ OR ─ G5  Forge a proof receipt                                  [A5]
    └─ LEAF  Recompute the ledger and republish
             cost: $0 · skill: high · time: weeks · detect: HIGH
             OUT OF SCOPE for this tree: depends on the six signing layers,
             which were not audited. Recorded as a NAMED GAP, not a zero.
```

---

## 4. Prioritised paths

Ranked by (impact × likelihood) ÷ cost-to-defend.

| Rank | Path | Status | Action |
|---|---|---|---|
| 1 | **Missing `/api/*` middleware backstop** | structural | Add a deny-by-default check: a route not in an explicit public allowlist must fail closed. Today nothing catches a new route that forgets a guard. |
| 2 | `/api/webhooks/telegram` no secret_token | open, bounded | Add Telegram's `secret_token` header check. One header, minutes of work. |
| 3 | Route enumeration | open, low severity | 211/218 undocumented. Specs won't stop enumeration, but they make accidental data-bearing routes visible in review. |
| 4 | Middleware cookie-presence check misread as a boundary | latent | Document in `middleware.ts` that it is a redirect convenience only. It already says this in prose — make it a test so it cannot drift into a security assumption. |
| 5 | Proof ledger forgery | not assessed | Named gap. Do not treat as safe. |

---

## 5. What this tree does NOT claim

- It does not claim `/api/proof` or `/api/verify` are vulnerable. They are
  public by design; a public verification API is the point.
- It does not claim the 104 routes without a check are broken. Most are
  intentionally public (`health`, `proof`, `verify`, `gse` catalog). The
  finding is that **nothing distinguishes intentional from accidental** — that
  is finding #1.
- It does not assess the signing layers (G5).

## 6. Reproduce

```bash
# middleware scope
sed -n '116,131p' apps/web/middleware.ts

# auth coverage across all 218 routes
python <scratch>/api_auth_audit.py

# cron guard (against the helper, NOT the literal CRON_SECRET)
python <scratch>/cron_auth.py     # 38/38 guarded
```
