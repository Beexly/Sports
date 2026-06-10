# 09 — Security / Compliance / Legal Audit

**Lens:** security-compliance-legal (highest-stakes)
**Date:** 2026-06-09
**Clones audited:** DEPLOY = `C:/Users/Garrett/Sports` (launch target, narrower picks/board) · CANONICAL = `C:/Users/Garrett/Sports-canonical-2026-06-03` (full platform: Player Lab, intelligence engines, Airwave, cockpit, fantasy)
**Posture:** READ-ONLY. No source/config/secret was modified, no build/test/migration run, no secret value printed, no live switch flipped.

---

## Grade: B+

**Verdict.** This is a genuinely security- and compliance-*conscious* codebase — well above typical pre-launch quality for a sports-prediction product. The compliance posture is encoded *in code*, not just in docs: a fail-closed promotions gate (default-deny, requires disclosure + RG text + terms URL + explicit eligible-states + an APPROVED_PARTNER operator that only code-review can add), a trust-claim registry with a banned-hype-phrase scanner wired into CI, a method/secret-leakage gate that is proven non-vacuous, an Airwave/SiriusXM pipeline that refuses by default and double-gates satellite capture behind an explicit human legal acknowledgement, injury handling that uses only public official designations and never asserts a medical state, and a fantasy stack that is skill-first with real-money/chance held behind founder/compliance review with no autonomous payments. Auth is Google-OAuth-only with server-side role gates on every admin/cockpit surface and API route, Stripe webhooks verify signatures and are idempotent, cron is Bearer-secret gated fail-closed, and no real secrets are tracked in git in either clone. The grade is held below A by one real cross-clone divergence (the canonical `DEV_FAKE_ADMIN` bypass lacks the production guard that DEPLOY has), a deploy-clone HSTS header that canonical has but DEPLOY dropped, honestly-unbuilt regulated controls (21+ age gate and state geo-gating are `forecast`, not implemented), and a couple of consistency/polish items. None of the open items block the *current* DEPLOY launch given its compliant default posture — but every regulated item below needs founder/legal sign-off before the corresponding switch is ever flipped.

---

## Findings by severity

### P0 — launch-blocking / correctness / legal / security

#### P0-1 — `DEV_FAKE_ADMIN` bypass is NOT production-guarded in the CANONICAL clone (mints admin+ELITE for everyone)
- **Clone:** CANONICAL (DEPLOY is correctly guarded)
- **Evidence:**
  - `C:/Users/Garrett/Sports-canonical-2026-06-03/apps/web/lib/auth.ts:92` — `if (process.env["DEV_FAKE_ADMIN"] === "true")` returns a synthetic `role: "ADMIN"` session with **no** `NODE_ENV !== "production"` check.
  - `C:/Users/Garrett/Sports-canonical-2026-06-03/apps/web/lib/entitlements.ts:27` — same flag grants `ELITE` (`DEV_FAKE_ADMIN_TIER`) with no prod guard.
  - `C:/Users/Garrett/Sports-canonical-2026-06-03/apps/web/middleware.ts:63` — middleware short-circuits its auth-cookie check on the same flag, again unguarded.
  - Contrast DEPLOY, which carries the guard everywhere: `C:/Users/Garrett/Sports/apps/web/lib/auth.ts:63-65` (`isDevFakeAdminEnabled()` requires `NODE_ENV !== "production"`), `.../lib/entitlements.ts:20-22`, `.../middleware.ts:27-28`. The hardening landed as DEPLOY commit `d26c306` ("security: add NODE_ENV production guard to DEV_FAKE_ADMIN bypass") and was **not** ported to canonical.
- **Impact:** If `DEV_FAKE_ADMIN=true` is ever present in the canonical clone's production environment (env drift, a copied `.env`, a console toggle), *every visitor* is silently elevated to ADMIN with ELITE entitlements — full cockpit access, all gated paid content, all operator surfaces. This is the single highest-severity item in this lens. It is mitigated *today* only by the fact that the live launch target is DEPLOY, where the guard exists.
- **Recommendation (FOUNDER, do not auto-flip):** Port the DEPLOY guard into canonical's `auth.ts`, `entitlements.ts`, and `middleware.ts` so the bypass is inert when `NODE_ENV==="production"` regardless of the flag. Add a vitest that asserts the guard exists in all three canonical files (DEPLOY-style), so the two clones cannot drift again. Until ported, treat any canonical deploy as gated on this fix.

---

### P1 — important (quality, trust, money, UX, regulated readiness)

#### P1-1 — 21+ age gate and state geo-gating are `forecast` (designed, not built) — required before ANY affiliate/regulated path
- **Clone:** CANONICAL (compliance model); affects both at go-live
- **Evidence:** `C:/Users/Garrett/Sports-canonical-2026-06-03/apps/web/lib/cockpit/compliance-program.ts:164-173` — `age.21-plus` status `"forecast"`, evidence "no age-verification step is wired yet"; `:153-163` — `state.geo-gating` status `"forecast"`, outstanding "Build a geo-IP gate on public surfaces so restricted states see the right copy and no affiliate path."
- **Impact:** Not a current launch blocker because no operator is APPROVED_PARTNER (see strengths) and no affiliate link can render — so the regulated path is closed. But the moment a sportsbook affiliate or any real-money fantasy path is enabled, FTC/state-licensing/age obligations attach and these controls are mandatory. The codebase is honest about this gap, which is the right behavior.
- **Recommendation (FOUNDER/LEGAL):** Treat both as hard prerequisites in the approval queue (they already are — `affiliate.sportsbook` depends on them). Do not flip any affiliate or real-money switch until a geo-IP gate and an age-affirmation step are built and legal-reviewed.

#### P1-2 — Missing `Strict-Transport-Security` (HSTS) header in the DEPLOY clone
- **Clone:** DEPLOY (canonical has it)
- **Evidence:** `C:/Users/Garrett/Sports/apps/web/next.config.mjs:32-47` — `headers()` emits X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, but **no** `Strict-Transport-Security`. Canonical `C:/Users/Garrett/Sports-canonical-2026-06-03/apps/web/next.config.mjs:58-61` emits `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. The policy test `C:/Users/Garrett/Sports/apps/web/__tests__/next-config-policy.test.ts` does not assert HSTS, so the gap is invisible to CI.
- **Impact:** The actual launch target ships without HSTS, leaving a TLS-stripping/downgrade window on first or cookie-bearing requests. Vercel typically sets HSTS at the edge, so real-world exposure may be partially covered by hosting — but the app-level guarantee that canonical has was dropped from DEPLOY.
- **Recommendation:** Add the same HSTS header to DEPLOY `next.config.mjs`, and extend `next-config-policy.test.ts` to assert `Strict-Transport-Security` + `max-age` so the two clones stay aligned. (Doc-only audit — not applying; founder/eng to make the one-line change.)

#### P1-3 — Responsible-gaming helpline number is inconsistent across surfaces (two different numbers shown to users)
- **Clone:** BOTH
- **Evidence:**
  - `1-800-GAMBLER` in the promotions public notice (`C:/Users/Garrett/Sports/apps/web/lib/promotions/public-payload.ts:48-51`) and in the `RiskDisclosure` component (`C:/Users/Garrett/Sports/apps/web/components/ui/risk-disclosure.tsx:21-24`) and the compliance-program evidence (`.../compliance-program.ts:99-100`).
  - `1-800-522-4700` (National Problem Gambling Helpline) in the trust-claim `risk.gamble-responsibly` (`C:/Users/Garrett/Sports/apps/web/lib/trust-claims.ts:252-261`).
- **Impact:** Two different RG hotline numbers reach customers depending on the surface. Both are real helplines, but inconsistency undermines the trust/compliance story and a regulator/affiliate review will flag it. Low technical risk, real credibility/compliance risk.
- **Recommendation:** Pick one canonical helpline constant (the footer/compliance-program already centralizes on a `HELPLINE` constant per `compliance-program.ts:99-100`) and reference it everywhere, including the trust-claim copy. Add a small test asserting a single helpline string across RG surfaces.

#### P1-4 — Cron secret comparison is not constant-time
- **Clone:** DEPLOY (and same pattern likely in canonical cron routes)
- **Evidence:** `C:/Users/Garrett/Sports/apps/web/app/api/cron/settle-picks/route.ts:37` — `if (authHeader !== \`Bearer ${expected}\`)` uses a plain `!==` string compare on the CRON_SECRET (same shape in the sibling cron routes `cron/refresh-odds`, `cron/jarvis-snapshot`).
- **Impact:** A non-constant-time compare is a theoretical timing-oracle for the cron bearer secret. Low practical risk over the public internet (network jitter dominates), and the route is fail-closed when the secret is unset (`:31-36`), but it is a cheap hardening miss for an endpoint that triggers ingestion.
- **Recommendation:** Compare with `crypto.timingSafeEqual` (length-checked) instead of `!==`. P1 only because it guards a state-changing endpoint; otherwise P2.

---

### P2 — worth doing

#### P2-1 — No Content-Security-Policy header
- **Clone:** BOTH
- **Evidence:** Neither `next.config.mjs` emits a `Content-Security-Policy`. `dangerouslySetInnerHTML` is used only for static JSON-LD (`C:/Users/Garrett/Sports/apps/web/app/layout.tsx:141-150`, `.../app/faq/page.tsx:166`, `.../app/pricing/page.tsx`, `.../app/cockpit/page.tsx`) — all `JSON.stringify` of constant objects, so there is no current injection vector. But absent CSP, any future XSS has no second line of defense.
- **Recommendation:** Add a baseline CSP (even report-only first) once the third-party script/style surface is enumerated. Not blocking; the current XSS surface is clean.

#### P2-2 — Auth role fallback defaults to a value rather than failing closed (defense-in-depth nit)
- **Clone:** BOTH
- **Evidence:** `C:/Users/Garrett/Sports/apps/web/lib/auth.ts:45` (and canonical `:46`) — `session.user.role = ((token.role as UserRole | undefined) ?? "USER")`. Default is `USER` (least privilege), which is correct; flagged only to note the JWT `role` is trusted from the token and re-hydrated from DB only when absent (`auth.ts:26-38`). Role *escalation* to ADMIN still requires a real DB `role` value, so this is safe — but the admin surface relies entirely on the DB `User.role` column being correct.
- **Recommendation:** Keep as-is; optionally re-verify `role === "ADMIN"` against the DB on entry to the most sensitive cockpit mutations rather than trusting the JWT claim alone. Low priority.

#### P2-3 — Privacy policy promises a self-serve deletion flow that the compliance model marks as not-yet-built
- **Clone:** BOTH (privacy page) vs CANONICAL (compliance model)
- **Evidence:** Privacy page states "You can delete your account at any time from the dashboard" (`C:/Users/Garrett/Sports/apps/web/app/privacy/page.tsx:64-70`), while `compliance-program.ts:197-205` (`data.privacy-inbox`) is `"in-progress"` with outstanding "Publish a formal privacy policy and a self-serve data-deletion / opt-out flow."
- **Impact:** A published privacy promise should match an actually-shipped capability (GDPR/CCPA deletion). If the dashboard delete flow is not live, the policy overstates a control — a real (if low-severity) legal exposure.
- **Recommendation (FOUNDER/LEGAL):** Confirm the dashboard self-serve delete is actually wired before launch, or soften the privacy copy to the email-request path (`LEGAL_EMAIL`, which is published) until it is.

---

### P3 — minor / polish

- **P3-1 — Trust-claim `lastReviewedAt` is stale (2026-05-18).** `C:/Users/Garrett/Sports/apps/web/lib/trust-claims.ts:91`. The registry is the legal source of truth for public copy; schedule a periodic human re-review and bump the date so "reviewed" stays meaningful. (BOTH clones.)
- **P3-2 — `trustHost: true` in NextAuth.** `auth.ts:10`. Required for the deploy host, but it means host-header trust rests on the platform; fine on Vercel, worth a note. (BOTH.)
- **P3-3 — Operator registry contains only DEMO rows with reviewer `"garrett"` and no `reviewedAt` integrity beyond the string.** `C:/Users/Garrett/Sports/apps/web/lib/cockpit/operator-registry.ts:32-77`. This is correct/safe (zero APPROVED_PARTNER ⇒ promos hard-off), noted only so the "code-review only" discipline for adding an APPROVED_PARTNER is preserved when the first real operator is onboarded. (BOTH.)

---

## Strengths (real, grounded)

1. **Fail-closed promotions/affiliate gate.** `lib/promotions/guards.ts:77-210` requires disclosure, RG text, terms URL, ACTIVE status, APPROVED compliance, banned-hype-language scan, explicit eligible-states allow-list, per-state restriction, AND an APPROVED_PARTNER operator — anything missing *omits* the promo rather than blanking it (`lib/promotions/public-payload.ts:57-82`). The operator registry has **zero** APPROVED_PARTNER rows (`lib/cockpit/operator-registry.ts:32-77`), so the entire affiliate surface is hard-off by default and a new partner can only be added by code review. (BOTH clones.)
2. **Airwave / SiriusXM live-capture is refusal-by-default and double-gated behind explicit human legal acknowledgement.** `lib/airwave/pipeline.ts:39-87` — master `AIRWAVE_ENABLED` off by default; satellite-radio (SiriusXM-class) additionally requires `AIRWAVE_SIRIUSXM_LEGAL_ACK`; demo data is fictional personas (`lib/airwave/demo-ledger.ts:2-4`); the redaction boundary makes a leaked source clip a *compile error* (`lib/airwave/redact.ts:11-30`), and tests assert legal-hold (`lib/airwave/__tests__/airwave.test.ts:160-174`). (CANONICAL.)
3. **Injury/medical data handled correctly.** `lib/human-performance/availability.ts:1-56` uses only public official injury designations, **never asserts a medical state** ("availability uncertain per public report"), and can only *widen* uncertainty or downgrade to no-bet — never narrow. This is the right posture for the highest-risk PII category in a sports product. (CANONICAL.)
4. **Auth + entitlement gates are server-side and consistent.** Google-OAuth-only sign-in (`app/auth/signin/page.tsx`), `role !== "ADMIN"` redirect on every cockpit/admin layout and page (`app/cockpit/layout.tsx:47-50`, `app/admin/page.tsx:9-11`), `requireAdmin()` returning 403 on cockpit API routes (`app/api/cockpit/tasks/route.ts:13-22`, `app/api/admin/trigger-refresh/route.ts:9-13`), and a server-only entitlement system explicitly documented "NEVER use client-side for access control" (`lib/entitlements.ts:1-4`). Cockpit is `robots: noindex` (`app/cockpit/layout.tsx:16-18`). (BOTH.)
5. **DEPLOY `DEV_FAKE_ADMIN` is production-guarded in all three places** (`lib/auth.ts:63-65`, `lib/entitlements.ts:20-22`, `middleware.ts:27-28`) and documented in `.env.example:21-25`. (DEPLOY.)
6. **Secrets hygiene is clean.** No real `.env` files are git-tracked in either clone (verified via `git ls-files` + `git check-ignore`); `.env.example` carries only placeholder shapes; `/api/dev/state` returns booleans only and 404s in production (`app/api/dev/state/route.ts:12-15`); a standing secret-leakage CI gate scans committed source for `sk_live_`/`whsec_`/`sk-ant-`/credential-bearing DB URLs and is proven non-vacuous (`__tests__/method-leakage-gate.test.ts:268-388`). (BOTH.)
7. **Stripe + cron hardening.** Webhook verifies the signature and is idempotent via a `webhookEvent` ledger (`app/api/webhooks/stripe/route.ts:9-57`); cron routes are Bearer-`CRON_SECRET` gated and fail closed when the secret is unset (`app/api/cron/settle-picks/route.ts:31-39`). (DEPLOY; canonical mirrors.)
8. **Compliance-as-code, honestly scoped.** The trust-claim registry + banned-phrase scanner gate public copy in CI (`lib/trust-claims.ts`), the method-leakage gate keeps engine internals out of customer copy (`__tests__/method-leakage-gate.test.ts`), and the cockpit compliance program maps real frameworks (FTC, AGA-RG, NCPG, state-geo, age, licensing, data-TOS) to grounded code evidence and **honestly marks unbuilt controls as `forecast`** rather than overstating safety (`lib/cockpit/compliance-program.ts`). Integrations fail closed and are explicitly "obtained under agreement, never scraped" / "never the forbidden DK hidden endpoint" (`lib/integrations/providers.ts:29-36`). (CANONICAL.)
9. **Fantasy real-money/chance posture is compliant.** Skill-first contests live, real-money entries/payouts and chance-based squares "founder-gated and activate only behind licensing and compliance review — there are no autonomous payments" (`app/fantasy/contests/page.tsx:36,83-84`); DFS is an illustrative sample-pool optimizer (`app/fantasy/dfs/page.tsx:18`); the public fantasy tools are env-gated off by default in middleware (`middleware.ts:44-51`). (CANONICAL.)
10. **Sound security headers + no XSS surface.** X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy locking camera/mic/geo (`next.config.mjs`); all `dangerouslySetInnerHTML` is static JSON-LD only. (BOTH.)

---

## What would move this from B+ to A

1. **Close P0-1:** port the production guard for `DEV_FAKE_ADMIN` into the CANONICAL `auth.ts` / `entitlements.ts` / `middleware.ts`, and add a cross-clone test that fails if the guard is absent in either clone. This alone is the biggest lift toward A — a launch-quality auth bypass must be impossible to trip in prod in *both* trees.
2. **Restore HSTS in DEPLOY** (P1-2) and assert it in `next-config-policy.test.ts` so DEPLOY and CANONICAL header policy can never silently diverge again.
3. **Build the two `forecast` regulated controls before any affiliate/real-money switch** (P1-1): a geo-IP state gate and a 21+ age-affirmation step, both legal-reviewed. Keep them in the founder approval queue (they already are) — A-grade here means the controls *exist and are tested inert*, not merely modeled.
4. **Unify the RG helpline number** (P1-3) to a single constant across promotions, RiskDisclosure, trust-claims, and footer, with a test.
5. **Make the cron secret compare constant-time** (P1-4) and **add a baseline CSP** (P2-1).
6. **Reconcile the privacy-policy deletion promise with the shipped capability** (P2-3) — either wire the self-serve delete or soften copy to the email path until it is — and **refresh the trust-claim review date** (P3-1) on a recurring cadence.

Every regulated item above (affiliate operators, sportsbook promotions, SiriusXM live capture, real-money/chance fantasy, age/geo gating, privacy-deletion guarantees) must remain founder/legal-gated and is explicitly **not** something to flip autonomously. The current default posture is compliant and closed; the work is to keep it that way while making the latent prod-bypass impossible and the modeled controls real.
