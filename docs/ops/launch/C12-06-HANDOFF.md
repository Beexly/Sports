# C12-06 — PART 7: The 2am Handoff

## 1. What is true right now (five sentences)

The repo is on `hermes/c12-close-the-pass` with every C12 fix committed, verified (typecheck 0,
lint 0, lint:brand 0, 151 tests green), and pushed to origin. New paid checkouts are closed
server-side by one switch; the free product — board, stats, records — is intact. The age gate,
alert-copy fix, push-opt-in mount, emailVerified stamping, board-surface chip, ESPN disclosure, and
footer coverage are all landed and tested. Stripe LIVE keys have been in the environment since
2026-07-09; nothing was exercised against them this session (read-only per rails). Two things remain
genuinely unknown: whether Neon backups/PITR exist, and whether ESPN's public feed may legally be
displayed commercially.

## 2. Safe to ship today vs not

SAFE NOW (free-only):
- The whole free surface — gate code landed, no gate flipped, no fabrication risk.
- Age gate, ESPN disclosure, footer, surface chip: all behind tests, all honest by default.

NOT SAFE YET:
- Paid checkout — counsel hasn't signed terms; alert delivery unproven E2E; Stripe unexercised even
  in TEST mode this cycle. (The switch keeps this closed by default.)
- Flag flips (OUTCOME_LEARNING → backfill → CANONICAL_HISTORY) — safe WHEN run in that exact order
  by you, on the console, with the backfill between them. Out of order = permanent calibration loss.

## 3. Ordered checklist — going live free-only

1. Set `PAID_CHECKOUT_OPEN=false` in Vercel (Production) → redeploy. This is THE free-only switch.
   [If this session's commit is deployed, checkout already 503s only when this var is "false" —
   setting it is what makes the state deliberate and visible.]
2. Put the C12-03 §4.6 sentence on the site (pricing page banner or launch page).
3. Confirm no paying customers exist: Stripe dashboard → Customers (keys live since 2026-07-09).
   If any exist, tell them nothing changes — portal stays open for manage/cancel by design.
4. Smoke the public surfaces in the preview deployment: /board, /pricing (age gate → verify →
   return), /faq Elite answer, /data ESPN section, /watchlist (elite push panel hidden while free),
   footer on /brief and /waitlist.
5. Try to buy: click Subscribe on /pricing while logged in — expect the 503 "paid_checkout_closed"
   JSON, no Stripe session. That is the control working.
6. Verify no cron secret leaked into any client bundle (existing guardrail; just re-run the
   readiness script): `node scripts/check-deploy-readiness.mjs`.

## 4. What must be true before paid opens (owner + proof)

| # | Item | Owner | Proof it's true |
|---|---|---|---|
| 1 | Counsel signs terms + privacy | Founder (human, paid) | Written sign-off on file; then the code comment at terms/page.tsx:15 can be retired by the founder |
| 2 | ESPN rights call: keep-with-disclosure or darken | Founder | Decision recorded in the ledger; if darken, espn-public.ts fallback disabled |
| 3 | Stripe TEST-mode full cycle | Founder | Subscribe → entitlement appears → cancel → entitlement drops, all in TEST dashboard + app |
| 4 | Alert delivery E2E | Engineering agent | One graded pick produces email (and push once VAPID keys set) to a real inbox/device |
| 5 | Prices match advertised phase | Founder console | `node scripts/check-deploy-readiness.mjs` exits 0 — it now FAILS on any amount/interval/currency mismatch across all six price vars |
| 6 | Neon backup/PITR confirmed | Founder (Neon console) | Retention window + one restore test actually run, written into GO_LIVE_RUNBOOK |
| 7 | Ratify this doc's two ACCEPTED rows | Founder | S10 feed decision + free-before-paid ordering initialed in the ledger |

## 5. Still unknown, cheapest next step each

- Neon PITR/backup: open Neon console → Backups; write what you see into the runbook. (C12-01 §2.6.)
- ESPN commercial display rights: one email to counsel; until answered, disclosure text stands.
- Existing-subscriber count: Stripe dashboard, 30 seconds.
- C11's lost D-0..D-15 definitions: re-run C11 with `--max-tokens 16000`, or paste the founder's
  saved C11 transcript to the next agent session.
- Push delivery in prod: set VAPID keys, then the /watchlist opt-in panel appears by itself.

## 6. Most likely failures in the first 72 hours

1. **Someone re-opens paid by accident** — the var is one console click. Symptom: a checkout
   succeeds. Response: set it back to "false", refund via Stripe dashboard, check whether counsel
   sign-off (precondition) ever happened.
2. **A cron route fires unauthenticated** — 26/26 were verified auth-first this cycle, so a failure
   here means a NEW route landed without the pattern. Symptom: 401s from cron in Vercel logs.
   Response: compare the new route against the C12-01 §2.1 pattern (auth as first statement).
3. **Backfill run out of order** — CANONICAL_HISTORY flipped before the backfill. Symptom:
   calibration floor counts stay at 0 despite settled picks. Response: leave the flag ON (flipping
   back re-loses nothing but fixes nothing either); run the backfill immediately; the floor clock
   starts from backfill completion (C12-01 §2.7).

## PART 9 — Self-check (literal answers)

1. Model disclosed on line one? **Yes** — this run's response header carried MODEL + FALLBACK.
2. Seven PART 2 items closed? **7/7 closed in C12-01** (§2.1–2.7, incl. the honest NOT-RUN framing
   on 2.6's console-only facts). None remain [NOT RUN].
3. Five blockers: **5 FIXED** (S1, S2, S3, S10-disclosure, #16-precision) of which two carry an
   **ACCEPTED (founder-to-ratify)** residual: S10's underlying feed use, and #16's paid-ordering.
   Zero items were left as bare RECOMMENDED.
4. Weakest claim in this output: **"no marketing email system exists"** (C12-03 §4.1) — it rests on
   a negative grep across apps/web/lib plus two worker packages. What confirms/kills it: a
   grep across EVERY package (not just apps/web) for a mailer with checkout-link templating, and a
   read of any resend/loops config in the Vercel dashboard (console-only, invisible to me). If a
   newsletter tool exists there, the free-only switch still holds (it is server-side), but §4.1's
   enumeration would need one more row.
5. Left out for budget: **nothing material**. The C11 D-list definitions (D-0, D-5, D-9, D-11..D-15)
   were not omitted for budget but because the source text is lost — recovery path named in C12-04.
