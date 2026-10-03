# C12-05 — PART 6: Re-Scores (only what changed)

Sections whose evidence changed via PART 2/3/5. Silence means unchanged — 19 sections not listed.

| Section | C11 | C12 | What moved it | Conf. |
|---|---|---|---|---|
| 18. Billing & entitlement sync | — | 6 → **7** | Runbook now generates prices from the phase source of truth; deploy-readiness gate FAILS (not warns) on amount/interval/currency mismatch across all six price vars incl. FANTASY (was: green line printing whatever amount it fetched, FANTASY pair skipped); closed-state choke verified by test. Held at 7 not higher: prices themselves remain unexercised (no live flow per rails), portal UX untested. | 85% |
| 19. Alerts & notifications | — | 2 → **5** | Was: Elite sold real-time alerts no code could deliver (D-2 dark channel, D-1 never-stamped recipients). Now: emailVerified stamps on sign-in (5-test suite), push opt-in mounted (35/35 push-stack green), copy says graded-only everywhere (FAQ rewritten; pricing page already accurate; no marketing emails exist). Held at 5, not higher: no end-to-end delivery ever exercised; component itself untested; VAPID keys unconfigured in prod. | 88% |
| 14. Front-end coherence | — | 5 → **6** | liveBoardOn de-hardcoded (banner can no longer lie above live rows when the founder flips the flag); surface chip labels signal vs market; orphan pages got the legal footer. Held at 6: the coherence pass was scoped to C11 items, not a full sweep. | 80% |
| 16. Legal & compliance floor | — | 3 → **5** | 21+ attestation gate always-on across 16 betting prefixes (middleware-tested, loop-proof, redirect-safe); ESPN disclosure live on /data naming both feeds and the UNVERIFIED rights status; #16 precision-corrected (the "counsel" line was a code comment, not rendered copy) with the substantive gate kept structural via free-only. Held at 5: counsel review hasn't happened; ESPN rights still UNKNOWN; DOB capture deferred to B-queue. | 82% |
| 17. Responsible gambling | — | 5 → **6** | Under-21 answer routes to /responsible-play; RG footer block now on every public page including /brief and /waitlist; age gate carries RG link on the interstitial itself. | 85% |
| 10 / S10. Data rights & sourcing | 2 | **5** | Was "the worst surface in the product": registry said no structured-feed scraping, code hit ESPN's public API, customer saw nothing. Now the contradiction is stated plainly on /data with per-feed answers and UNVERIFIED labels. Not higher: the underlying use continues pending legal review — disclosure is not rights. | 80% |

### 2.7 calibration check (from C12-01, restated for the record)
3/10 was roughly right as a PAID-readiness score on a degraded run, and slightly harsh as a
FREE-ONLY score. The five paid blockers were real (four now landed); the strengths C11 under-leveraged
(cron auth enumerated 26/26, audit matrix waived with reasons, webhook idempotency present) were
never weighed. Separating the numbers below is the correction.

### Overall

- **Launch-readiness FREE-ONLY today: 6/10** (confidence 80%). Blockers to the free surface landed
  and tested; the remaining points are held by the Neon/PITR unknown (C12-01 §2.6), unexercised
  delivery paths, and the calibration honesty floor that only time can fill.
- **Launch-readiness PAID today: 4/10** (confidence 78%). The free-only switch makes paid a
  deliberate act, and billing correctness tooling now fails hard on mismatch — but counsel review,
  the ESPN rights call, live Stripe exercise in TEST mode, and alert delivery E2E all sit in front
  of opening it.

A motivated attacker breaks the 6: the age gate is an attestation, not verification — it is the
floor, documented as such, with server-side DOB re-check on the money path as the compensating
control.
