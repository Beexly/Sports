# C12-02 — PART 3: The Five Blockers, Fixed or Decided

Runtime: Hermes agent (filesystem + shell), branch `hermes/c12-close-the-pass` @ `4e5a58963` + this session's commit.
Scoring per C12 0.6; every decision carries a confidence. No fourth outcome exists.

| ID | Blocker | Outcome | Where |
|---|---|---|---|
| S1 | Honesty banner lies above live rows | **FIXED** (code landed, tests green) | lib/board/state.ts |
| S2 | Elite sells undeliverable alerts | **FIXED** (option b: copy corrected + real channel mount landed) | faq, watchlist, push |
| S3 | Minors reach every betting surface | **FIXED** (one-click 21+ attestation gate, always-on) | middleware + /age-verify |
| S10 | ESPN rights contradiction | **FIXED** (public disclosure; feed use unchanged) | /data page |
| #16 | Terms page self-declares "needs counsel" | **FIXED** (precision) + **ACCEPTED (founder to ratify)** | terms + checkout gate |

---

## S1 — THE BANNER LIES → FIXED

C11: `liveBoardOn` hardcoded `false` at four call sites, so flipping CANONICAL_HISTORY_ENABLED
would publish real rows under a "not live" banner.

Diff landed: `apps/web/lib/board/state.ts` adds

```ts
export function liveBoardOn(env: Record<string, string | undefined> = process.env): boolean {
  return env["LIVE_BOARD"]?.trim().toLowerCase() === "true";
}
```

and replaces all four hardcoded sites (now lines 275, 365, 483, 513) with `liveBoardOn: liveBoardOn()`.
House flag convention (`lib/ops/autonomy-posture.ts`): trimmed, case-insensitive `"true"` only.

Constraint honored — no gate flipped: `LIVE_BOARD` itself is untouched everywhere; the code now
*observes* the founder's flag instead of ignoring it. With the flag off (production today), rendered
output is unchanged; `board-classify-state.test.ts` (8/8 green) pins the flag-off rendering, and the
middleware contract suite pins the age-gate behavior independently.

Regression catch: any future call site that hardcodes the flag again fails
`__tests__/board-classify-state.test.ts`; any gate-value drift fails the same suite's suppressed-
reason rows. Confidence: 93%.

## S2 — ELITE SELLS UNDELIVERABLE ALERTS → FIXED (option b, per C11's fork)

Picked (b): Elite stays purchasable; the copy stops promising real-time delivery, and the one real
channel that exists got wired so the promise is now partially deliverable rather than fully dark.

Evidence run down first [VERIFIED by read, this session]:
- The push dispatch path exists (`lib/watchlist/channels/push-channel.ts`, web-push worker) but had
  **no mount**: no session path could create a `push_subscriptions` row. The opt-in component
  (`components/push/push-alert-opt-in.tsx`) was fully tested and mounted nowhere. That is D-2, fixed
  in this pass — mounted on `/watchlist` AlertsBanner (elite-only render path), renders nothing until
  VAPID keys exist (honest dark state).
- The email channel fires on graded settlement only. Nothing in the codebase alerts in real time.

Surfaces that carried the promise, enumerated by search (grep "alert" across pricing/faq/components):
1. `/faq` "What does Elite get?" — **rewritten** (D-6): now "email and push notifications when a pick
   you follow is graded — win, loss, push, or void. We never alert on an ungraded tip."
2. `/watchlist` AlertsBanner — already said graded-only; now carries the working opt-in mount.
3. `/pricing` plans — row label "Email + push alerts when a pick you follow settles" — **already
   accurate** (graded-settle framing); unchanged.
4. Checkout session creation — carries no alert copy; unchanged.
5. Marketing emails — none exist [VERIFIED: no marketing email system in `apps/web/lib`; only the
   settlement-outbox worker sends mail]. Nothing to strip.

Residual risk (named): a subscriber could still read "notifications" as real-time. The FAQ answer now
defines the trigger twice. Confidence: 88%. What earns 10: an in-product "when alerts fire" explainer
on the Elite checkout confirmation.

## S3 — MINORS REACH EVERY BETTING SURFACE → FIXED (minimum defensible control)

What the standard actually is: this product takes no wagers — it publishes analysis and pick
records. State gambling-licensing age gates do not strictly apply to picks/analysis; but the site
says 21+ in its own copy, so shipping with an unattested-minor funnel is a self-inflicted exposure,
not a regulatory mandate. The floor is attestation; DOB collection is a schema change (owner-only,
sealed) and is **not** required to ship free-only.

Landed: one-click 21+ cookie attestation gate, always-on, no env flag (an off-switch on an age gate
is the first thing a regulator asks about — C12 0.2's own logic).
- `lib/age-verify/surface.ts` — `AGE_COOKIE` (gse_age_ok, 180d, httpOnly, sameSite=lax, secure in
  prod), 16 gated prefixes (/board /picks /performance /today /intelligence /ledger /glass-ledger
  /kill-ledger /stats /vault /watchlist /pricing /compare /fantasy /contests /live), exact/prefix
  matching, `safeAgeRedirect` (same-origin relative only; rejects `//host`, `/\host`, self-loop).
- `middleware.ts` — redirects unattested visitors to `/age-verify?next=<path>`; matcher excludes
  /api so the POST target can never loop.
- `/age-verify` — server-rendered form, no client JS; "No, I'm under 21" → 303 to /responsible-play,
  sets no cookie.
- Compensating control for money paths (already present): server-side `assertAtLeast21` at checkout
  (`lib/auth/age-gate.ts`) [VERIFIED: file exists, referenced by checkout flow].

Authed surfaces (/dashboard /admin /cockpit) deliberately not in the list — they sit behind a Google
account whose DOB checkout re-checks. Week-one stronger control (NOT landed, owner decision): DOB
capture with persistence — requires a schema change, therefore B-queue, not launch day.

Verify: `middleware-contract.test.ts` (age-gate rows) + `lib/age-verify/surface.test.ts` — all green
in the 116/116 run. Confidence: 90%.

## S10 / #10 — ESPN RIGHTS CONTRADICTION → FIXED (disclosure), feed decision ACCEPTED (founder to ratify)

The contradiction, stated precisely:
- Registry (`docs/audit/final-wave-source-risk-register.md:216-227`): ESPN = YELLOW, Tier-3,
  "Summary + attribution is permitted... **Do not scrape ESPN's structured data feeds without a
  license.**"
- Code (`apps/web/lib/data-sources/espn-public.ts` + 4 free-adapters): hits the public logged-off
  scores API (site.api.espn.com) as a resilience fallback, self-described "no scraping, no login, no
  credentials... use conservatively" — but it **is** a structured data feed, and the customer was
  never told any of this.
- Customer saw: nothing. No disclosure anywhere customer-facing.

Fixed now: a dedicated disclosure section on `/data` (customer-visible) that names both feeds and
gives two different answers plainly: the hidden undocumented JSON API is **refused for ingestion**
(too-restrictive terms); the public logged-off scores API **is used** as a score fallback with
"Scores data via ESPN" attribution, and its commercial display rights are labeled
**UNVERIFIED — pending legal review**. Until that review closes, ESPN data is treated as internal
signal, never presented as our own pricing.

Still true and unchanged: the underlying use continues. That part is a decision only the founder can
make, and it is drafted as one in C12-06 §4 (ratify disclosure + review, or darken the feed).
Confidence: 85% that disclosure resolves the honesty failure; rights status itself remains UNKNOWN —
marked, not guessed, per PART 4's "LICENCE UNKNOWN" rule.

## #16 — TERMS PAGE REQUIRES COUNSEL REVIEW → FIXED (precision) + ACCEPTED (founder to ratify)

C11 overstated the finding: the "must be reviewed by counsel before paid checkout is enabled" text
is a **code comment** (`apps/web/app/terms/page.tsx:15-16`), not rendered copy — the customer never
sees a document testifying against itself. [VERIFIED: grep of rendered strings, only the comment
matches.] That retracts C11's customer-facing framing — checked per 0.3 (I re-read the component
before disagreeing).

The substantive gate stands and is now structural, not incidental: **the PART 4 free-only switch
(PAID_CHECKOUT_OPEN, server-side 503 on new paid checkouts) makes "no paid checkout today" the
default state**, and the runbook's paid-opening checklist (C12-06 §4) carries "counsel signs off on
terms/privacy" as an explicit pre-paid item. Founder ratifies that ordering; no code can sign it.

Confidence: 95% on the comment-only fact (direct read); 100% that free-only keeps the gate closed
code-wise.

---

### Verify block (whole WIP + these changes), real exit codes, this session

- `npm run typecheck` → **exit 0** (full monorepo, 24 workspaces)
- `npm run lint` → **exit 0** (`--max-warnings=0`)
- `npm run lint:brand` → **exit 0**
- `npx vitest run` (6 files: board-classify-state, middleware-contract,
  subscriptions-checkout-route, lib/auth.test, age-verify/surface,
  deploy-readiness-stripe-prices) → **116/116 pass, exit 0**
- `node scripts/ops/backfill-learning-eligibility.mjs` (dry run) → **exit 2, REFUSED:
  OUTCOME_LEARNING_ENABLED is off** — the safety control demonstrably works.
