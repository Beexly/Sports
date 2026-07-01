> **UPDATE 2026-06-30:** Superseded — this work was committed, pushed, and MERGED into `main` as PR #57 (commit `6084550c`); the prod DB is LIVE and `/api/performance` returns real data (397 settled picks). The "Not committed. Not pushed. Not deployed." status below is historical.

# GSE PR2 — Owner Review Packet (Local No-Claim Waitlist)

**Prepared:** 2026-06-29 14:41:49 -05:00
**Repo:** C:/Users/Garrett/Sports
**Branch:** `codex/galaxy-dynasty-studio-rescue-v2`
**Status:** Hardened, validated, owner-reviewable. **Not committed. Not pushed. Not deployed.**

> Read this top-to-bottom, then decide one thing: whether to authorize a
> **local commit only** (see the Local Commit Package at the end). Nothing else
> is requested. No deploy, no push, no publish, no pricing, no Stripe.

---

## 1. What the feature does

A local, no-claim founding-waitlist path inside the GSE web app:

- A `/waitlist` page (server component, `noindex`) that shows process-first,
  no-claim copy plus the honest backtest-truth statement.
- A client form (name, email, role, sport interests, optional free-text) with a
  required **consent** checkbox.
- A local `POST /api/waitlist` handler that validates input, enforces the consent
  gate, de-duplicates by email, and records the lead to a **local file only**.
- The existing no-op analytics registry extended with `waitlist_*` events
  (`track()` stays inert — no provider, no network, no PII).

## 2. What it does NOT do

- No deploy, push, publish, or public exposure (page is `noindex`, local-only).
- No Stripe, billing, pricing, checkout, or money movement.
- No sportsbook or affiliate paths. No published picks.
- No email send — confirmation/follow-up copy in `docs/gse/` stays **draft-only**.
- No external analytics vendor — the only network call is a same-origin
  `fetch("/api/waitlist")`.
- No database/schema change (no Prisma migration).
- No performance/win-rate/ROI/accuracy/edge/profit/guaranteed-outcome claims.

## 3. Files changed

Tracked edits (additive):
- `apps/web/lib/analytics/events.ts` — added 8 `waitlist_*` no-op events to the
  typed union + documented map. `track()` unchanged (inert).
- `.gitignore` — added one narrow entry: `.gse-local/` (runtime lead data).

New files:
- `apps/web/lib/gse/waitlist-copy.ts` — single source of no-claim copy + backtest-truth line.
- `apps/web/lib/gse/waitlist-validation.ts` — zod schema + `validateWaitlistLead()` + `runNoClaimGuard()` (reuses `@/lib/compliance-scanner/rules`) + `hasNoPerformanceClaim()`.
- `apps/web/lib/gse/waitlist-store.ts` — local-file fallback store (gitignored `.gse-local/`, dedupe by email).
- `apps/web/components/gsn/waitlist-form.tsx` — client form (consent gate, no-op analytics).
- `apps/web/app/waitlist/page.tsx` — server page (`noindex`, no flags/pricing).
- `apps/web/app/api/waitlist/route.ts` — local POST handler (validate → consent → store; no send).
- `apps/web/__tests__/gse-waitlist.test.ts` — 19 tests (validation, consent, dedupe, no-op analytics, no-claim copy, DOM render, page source).
- `docs/gse/pr2-implementation-report.md`, `docs/gse/pr2-owner-review-packet.md` (this file).

(Plus the pre-existing untracked PR1 specs + PR2 plan/readiness under `docs/gse/`.)

## 4. Local-only storage explanation

Leads are written to a JSON file under `.gse-local/waitlist-leads.json` (override
with `GSE_WAITLIST_STORE_PATH`). `.gse-local/` is gitignored, so captured leads
are discoverable for your review but can never be committed. There is **no
database write** — the durable `WaitlistLead` Prisma table is intentionally
deferred because a migration is an owner-gated change.

## 5. Privacy / storage proof

- `.gitignore` excludes `.gse-local/`. Verified: `git check-ignore -v
  .gse-local/waitlist-leads.json` → matched (exit 0). Also matches an
  `apps/web/.gse-local/...` override.
- `git ls-files | grep -i "leads.json|waitlist.*json|gse-local"` → **nothing
  tracked**.
- No `.gse-local/` directory exists in the repo working tree (no runtime data
  present).
- No secrets: the only env var referenced is `GSE_WAITLIST_STORE_PATH` (a path,
  not a credential).
- No email send (`nodemailer`/`sendgrid`/`smtp`/`mailto`/`sendMail` — none).
- No external analytics vendor (`gtag`/`posthog`/`segment`/`mixpanel`/`amplitude`
  /`window.analytics` — none). `track()` is a no-op that returns its payload.
- Only network call is same-origin `fetch("/api/waitlist")` — no external URLs.
- No Stripe/pricing/sportsbook/affiliate code (only disavowing comments match
  those words).

## 6. No-claim proof

- Every user-facing copy string passes the platform compliance scanner
  (`runNoClaimGuard`, which reuses `getRulesForTemplate` from
  `@/lib/compliance-scanner/rules`) with **zero `block` flags** — and passes
  `hasNoPerformanceClaim` (no numeric win/ROI/accuracy/edge/profit, no
  "guarantee", no "risk-free"). Asserted in tests.
- Copy contains no pricing/Stripe strings (tested).
- Manual scan of the page, form, thank-you state, and API responses: no positive
  claim about win rate, ROI, accuracy, edge, profit, picks, guaranteed outcome,
  or betting advice. Framing is transparency / decision-hygiene / research /
  waitlist only.

## 7. Backtest truth proof

- `apps/web/lib/gse/waitlist-copy.ts` encodes `BACKTEST_TRUTH = { samples: 10_301,
  modelMae: 5.18, naiveMae: 4.9999, beatsNaive: false }` and a transparency line
  stating the model **does not beat naive**, shown openly on the page.
- Source `docs/gse/backtest-transparency.md` "do not alter" block is unchanged
  (10,301 / model MAE ≈ 5.180 / naive ≈ 4.9999 / beats naive = false).
- Tests assert `beatsNaive === false` and that the transparency line contains
  "10,301" and "does not beat naive".

## 8. Validation commands + results

| Command | Result |
|---|---|
| `npm run typecheck --workspace=apps/web` | **exit 0** |
| `npm run lint --workspace=apps/web` | **exit 0** (`--max-warnings=0`) |
| `npx vitest run apps/web/__tests__/gse-waitlist.test.ts apps/web/__tests__/guardrails.test.ts` | **24/24 passed** (19 waitlist + 5 guardrails) |

Guardrails (`trust-gate` / `draft-only` / `claude-api-usage`) all pass — the new
API route writes no `publishedAt` and flips no `PUBLISHED`.

## 9. Manual QA instructions (optional, owner)

1. `npm run dev` (boots Next on `http://localhost:3000`).
2. Visit `http://localhost:3000/waitlist`. Confirm: process-first copy, the
   honest backtest line ("does not beat naive"), and the form. No price, no picks.
3. Submit with no consent → blocked. Bad email → blocked. Valid + consent →
   "thank you" state (no claim).
4. Inspect captured leads at `.gse-local/waitlist-leads.json` (gitignored).
5. Confirm no email arrives and no external network call fires (DevTools → Network
   shows only the local `POST /api/waitlist`).

## 10. Owner gates still BLOCKED (unchanged)

- Deploy / push / publish / making `/waitlist` public.
- Prisma `WaitlistLead` migration + durable DB storage.
- Real analytics provider wiring.
- Email send (confirmation/follow-up).
- Stripe / pricing / checkout / sportsbook / affiliate / published picks.
- Performance/win-rate/ROI/accuracy/edge/profit/guaranteed-outcome claims.

## 11. Do-NOT-deploy warning

This is a **local-only** implementation. The `/waitlist` page is `noindex` and
unreferenced by nav. Do not deploy, push, or expose it. Persistence is a local
file, not a database — it is not production storage. Treat this as a reviewable
local feature branch state, nothing more.

## 12. Local commit recommendation

Recommended: a single **local commit (no push)** capturing the no-claim waitlist
feature + its specs, so the work is checkpointed without any external action.
This requires your explicit approval phrase (below). I will not commit without it.

## 13. Next gated options (your call, each is a separate approval)

1. **WaitlistLead Prisma migration** — add the model + generated migration (DB/schema gate).
2. **Durable storage** — switch the store from local file to the DB table once (1) lands.
3. **Analytics provider** — wire a real provider into the no-op `track()` (privacy review first).
4. **Public deploy** — remove `noindex`, add nav, deploy `/waitlist` (deploy/publish gate).
5. **Email integration** — send the draft confirmation/follow-up copy (external-messaging gate).

---

## Local Commit Package

> **Do not run until Garrett says exactly:** "approve local commit only, no push."
> No push, no deploy, no publish.

### Intended `git add` list (explicit — not `git add .`)
```
git add \
  apps/web/lib/analytics/events.ts \
  apps/web/lib/gse/ \
  apps/web/components/gsn/waitlist-form.tsx \
  apps/web/app/waitlist/ \
  apps/web/app/api/waitlist/ \
  apps/web/__tests__/gse-waitlist.test.ts \
  .gitignore \
  docs/gse/
```

### Excluded files (must NOT be committed)
- `.gse-local/` and `.gse-local/waitlist-leads.json` — runtime lead data (gitignored; PII).
- Any `GSE_WAITLIST_STORE_PATH` override target outside the repo.
- `.env*`, secrets, build output — none added by this work; standard ignores apply.
- Nothing outside the explicit `git add` list above.

### Commit message
```
feat(gse): add local no-claim waitlist
```

### Pre-commit validation checklist (all currently TRUE)
- [x] `npm run typecheck --workspace=apps/web` → exit 0
- [x] `npm run lint --workspace=apps/web` → exit 0
- [x] `npx vitest run apps/web/__tests__/gse-waitlist.test.ts apps/web/__tests__/guardrails.test.ts` → 24/24
- [x] No-claim copy passes the platform compliance scanner (0 block flags)
- [x] Backtest truth intact (beats naive = false; 10,301 surfaced)
- [x] `git check-ignore .gse-local/waitlist-leads.json` → ignored
- [x] No secrets / email send / external analytics vendor / Stripe / pricing / sportsbook / affiliate
- [x] No schema/DB migration; storage is local-file fallback

### Required owner approval phrase
> "approve local commit only, no push."

Until that exact phrase is given: **no commit.** Even after it: **commit only,
never push/deploy/publish.**
