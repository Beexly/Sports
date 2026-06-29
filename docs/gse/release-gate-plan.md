# GSE — Release Gate Plan (Waitlist Public Readiness)

**Status:** PLAN ONLY. No deploy. Defines the gate that must pass before `/waitlist`
could ever be made public — and the owner approvals required at each step.

> Nothing here authorizes a deploy/push/publish. It is the checklist that would
> precede one, plus the rollback contract.

## 1. Pre-release automated gate (must all be GREEN)

| Check | Command / method | Pass condition |
|---|---|---|
| Typecheck | `npm run typecheck --workspace=apps/web` | exit 0 |
| Lint | `npm run lint --workspace=apps/web` | exit 0 (`--max-warnings=0`) |
| Targeted tests | `npx vitest run apps/web/__tests__/gse-waitlist.test.ts apps/web/__tests__/guardrails.test.ts` | all pass |
| Guardrails | trust-gate / model-freeze / draft-only / claude-api-usage | all exit 0 |
| No-claim scan | `runNoClaimGuard` over every waitlist copy string | 0 block flags |
| Backtest-truth scan | assert `BACKTEST_TRUTH.beatsNaive === false`; page contains "10,301" + "does not beat naive" | true |
| Build | `npm run build --workspace=apps/web` | exit 0 |

## 2. Waitlist smoke tests (pre-public, local/staging)

1. `GET /waitlist` renders the no-claim copy + transparency line + form.
2. Submit without consent → blocked (422); with valid data + consent → "thank you".
3. Duplicate email → safe `already_queued` (no 500, no second row).
4. No external network call other than same-origin `POST /api/waitlist`.
5. No email is sent; no analytics provider call fires.
6. Page returns `noindex` until the public gate is explicitly opened.

## 3. Public deploy gate (owner-approved, each item)

- [ ] Owner approves making `/waitlist` public.
- [ ] Remove `robots: noindex` (only at go-live).
- [ ] Decide nav linkage (or keep it an unlinked direct URL).
- [ ] Durable storage in place (see `pr3-durable-storage-plan.md`) OR explicit
      acceptance that file storage is non-durable on serverless.
- [ ] Env confirmed (no secrets in code; `GSE_WAITLIST_STORE_PATH` or DB URL set).
- [ ] Legal/compliance final read of public copy (no-claim).

## 4. Rollback plan

- Fastest: re-apply `noindex` + unlink → page is effectively dark.
- Storage: flag `WAITLIST_STORAGE=file` reverts to local store; DB down-migration
  if the table must go (see PR3 plan §7).
- Ops note: prod is **alias-based** — a Vercel "rollback" does not undo a migration;
  the real rollback is flag flip + (if needed) down-migration, then re-alias.

## 5. Owner approvals needed (all BLOCKED today)

1. Approve durable storage migration (gate 1).
2. Approve analytics provider, if any (gate 2).
3. Approve removing `noindex` + nav linkage (gate 3).
4. Approve the deploy itself (gate 4 — push/deploy).
5. Approve email confirmation sending, if enabled (gate 5).

## 6. Exact next safe action

Keep `/waitlist` `noindex` and local. Re-run the automated gate (§1) on demand to
keep evidence fresh. Advance only one gated item at a time, each with explicit
owner approval, and never push/deploy without it.
