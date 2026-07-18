# Galaxy Sports Edge — Production Reality Snapshot (LC-000)

**Evidence as of:** 2026-07-18 22:30 UTC
**Target:** `https://www.galaxysportsedge.com`
**Full machine-readable record:** `PRODUCTION_REALITY_SNAPSHOT.json` (this file summarizes it)
**Boundary:** point-in-time observation, not a permanent health claim, not authorization to change production.

## Executive summary

Production is live, healthy on the surfaces checked, and correctly serves `main` HEAD
(`0e56c477`). It is **not** running the recovery/frontier work accumulated on the now-frozen
`claude/galaxy-sports-edge-pdcswh` branch (PR #129) — that branch is evidence, not a release
vehicle (see `PR129_FREEZE_RECEIPT.md`).

Two things need founder action before this campaign can call CI or auth clean:

1. **`main`'s CI is currently RED** — one mechanical, already-fixed, already-verified,
   zero-risk cause (PR #128, clean/mergeable, comment-only). This is the single
   highest-leverage action available right now.
2. **Live Google OAuth signin/callback URLs point to the apex host, not the canonical `www`
   host** CLAUDE.md mandates — a real, currently-live auth/revenue risk, likely a
   `NEXTAUTH_URL`/`AUTH_URL` environment-variable misconfiguration on Vercel, not a code bug.

A prior baseline (`docs/genesis/LIVE_PRODUCTION_BASELINE_2026-07-18.md`, on still-open PR #125,
timestamped 17:18 UTC today) independently found four more live defects (PROD-001 refund
contradiction, PROD-002 Clarity `undefined` identifier, PROD-003 Nightly Sentinel zero
coverage, PROD-004 empty news sitemap). This session independently re-confirmed PROD-001,
PROD-002, and PROD-004 are still live, and found PROD-005 (the OAuth host mismatch) new.

## What's PROVEN

- `main` HEAD is `0e56c4770e715630eaaac974702336447e367b5a` (founder-merged PR #119, a real
  settlement-correctness fix).
- Production is live on Vercel, apex correctly 307-redirects to `www`, `www` serves 200 with
  reasonable security headers (HSTS, X-Frame-Options DENY, nosniff).
- `/api/health` reports database OK and ingestion fresh (25 min old at check time).
- `/api/proof/ledger` is live and honestly gated (`PUBLISH_LEDGER` unset).
- `main`'s CI is failing on the exact same guardrail script for two different jobs — a single,
  well-understood, already-fixed root cause (see below).
- The refund-promise contradiction (pricing vs. Terms), the Clarity `undefined` tag, and the
  empty news sitemap are all still live in production right now (independently re-fetched this
  session, not just cited from the prior baseline).
- Live OAuth provider URLs are on the apex host, not `www` — confirmed via a direct fetch of
  `/api/auth/providers`, cross-checked against `apps/web/lib/auth.ts`'s `trustHost: true` (which
  doesn't explain the mismatch, pointing to an environment-variable override).

## What's FAILED

- `main`'s CI, current HEAD: "All guardrails" and "Test, type-check, lint, Prisma" both fail on
  `commercial-copy-scan.mjs` tripping on its own explanatory doc-comment in
  `apps/web/app/tools/page.tsx:17-18` (the comment names the banned phrase "risk-free" while
  describing the rule that bans it). Zero user-facing effect; a real CI-reliability defect
  with a 4-line, comment-only, already-verified fix sitting in **PR #128**
  (`mergeable_state: clean`, base SHA identical to current `main`).
- Live OAuth signin/callback host mismatch (PROD-005, see above).

## What's OWNER_GATE

- **OG-LC-001 — Merge PR #128.** The single highest-leverage action available: a clean,
  4-line, comment-only, already-verified fix that turns `main`'s CI from red to green. Nothing
  else in this campaign depends on it, but every future PR against `main` inherits the failure
  until it lands.
- **OG-LC-002 — Set the production `NEXTAUTH_URL`/`AUTH_URL` to `https://www.galaxysportsedge.com`
  and confirm Google Cloud Console's Authorized redirect URIs include the matching `www`
  callback.** An environment/console action, not a code change.
- Stripe live-mode configuration, production database migration status, branch protection
  rules, scheduled-job run history, and source-rights-vs-live-ingestion consistency all remain
  **NOT_TESTED** this pass — each needs either credentials this session doesn't have, or a
  dedicated follow-up pass (LC-001 through LC-006) to do honestly rather than guessed.

## What's NOT_TESTED (honest gaps, not silent gaps)

- Production database migration convergence (29 migration files exist on `main`; whether all
  29 are actually applied in production, and whether any out-of-band drift exists, is
  unverified — no DB credentials available this session). **This is the single largest
  unverified category and should be the first target of a follow-up pass with appropriate
  access.**
- Stripe test/live mode state, price IDs, webhook delivery, tax/payout configuration.
- Branch protection rules on `main`.
- Scheduled-job (cron) run history and success rate (workflow list existed; individual run
  history query exceeded tool output limits this pass and was deprioritized).
- Sentry/observability live wiring (documented dormant as of the prior DEC-030 check; not
  re-verified).
- Rollback-candidate deployment SHA on Vercel (not queried via Vercel's own API this pass).

## Environment note (for future sessions continuing this work)

This session's disk was constrained to ~761MB free at the start of Launch Convergence work.
Rather than running a fresh `npm install` in the new `origin/main`-based worktree (which would
likely have exhausted the disk — the shared `node_modules` is ~977MB), symlinks were used
instead. **A naive whole-`node_modules` symlink is unsafe**: npm workspace symlinks for
`@sports/*` packages are relative, and a symlink-of-a-symlink resolves against the *original*
worktree's location, not the new one — silently reading the wrong branch's source for every
local package and any Prisma-generated client. This produced one phantom local typecheck
failure before it was diagnosed and fixed (see `PRODUCTION_REALITY_SNAPSHOT.json`'s
`ci.localTypecheckAndTestReproduction.environmentNote` for the full mechanism). The fix:
symlink only third-party (non-`@sports`) packages from the shared `node_modules`, create fresh
`@sports/*` symlinks pointing at the *new* worktree's own `packages/*`, and regenerate the
Prisma client locally (`prisma generate`) rather than reusing a symlinked one. Any future
worktree created under similar disk constraints should follow this pattern, not a blanket
symlink.

## Next exact action

Founder: merge PR #128 (OG-LC-001), then set `NEXTAUTH_URL`/`AUTH_URL` and the Google OAuth
redirect URI (OG-LC-002). Agent: continue to LC-001 (Blocker Graph) to formally classify and
sequence every item above, then LC-002 (Nightly Sentinel v2) to close PROD-003 with real,
unattended, repo-native monitoring.
