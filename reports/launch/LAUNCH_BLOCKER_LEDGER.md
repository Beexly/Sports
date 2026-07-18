# Galaxy Sports Edge — Launch Blocker Ledger (LC-000/LC-001 seed)

**Generated:** 2026-07-18 22:30 UTC
**Full machine-readable record:** `LAUNCH_BLOCKER_LEDGER.json`

Seven items, evidence-backed, classified. **Zero P0_CORRECTNESS_SECURITY findings this pass.**
Two items have a clean, low-risk, immediate owner action available today.

| ID | Title | Class | Status |
|---|---|---|---|
| LB-001 | `main` CI red on `commercial-copy-scan` self-trigger | P1_DEPLOYMENT_AUTH | **Ready for owner action — merge PR #128** |
| LB-002 | Live OAuth signin/callback on apex host, not `www` | P1_DEPLOYMENT_AUTH | **Ready for owner action — env var + Google Console** |
| LB-003 | Refund promise contradiction (pricing vs. Terms) | P1_REVENUE | Owner-gated on a policy decision |
| LB-004 | Clarity analytics tag has literal `undefined` ID | P2_TRUST_UX | Ready for owner action or code fix |
| LB-005 | Nightly Sentinel has zero unattended coverage | P1_DATA_ENGINE | **CLOSED — LC-002 shipped, verified, live dry-run WATCH** |
| LB-006 | `news-sitemap.xml` is empty | P2_TRUST_UX | Needs investigation (may be intentional) |
| LB-007 | Production DB migration convergence unverified | P1_DATA_ENGINE | Needs access this session doesn't have |

## The two immediate owner actions

**LB-001 — Merge PR #128.** A 4-line, comment-only, already-verified fix
(`mergeable_state: clean`, base identical to current `main` HEAD). This single merge takes
`main`'s CI from red to green. Nothing else depends on it.

**LB-002 — Fix the production `NEXTAUTH_URL`/`AUTH_URL`.** Live `/api/auth/providers` returns
Google OAuth `signinUrl`/`callbackUrl` on the apex host (`galaxysportsedge.com`), not the
canonical `www` host CLAUDE.md requires. Root cause is almost certainly a Vercel production
environment variable, not application code (`apps/web/lib/auth.ts`'s `trustHost: true` doesn't
explain a host-header-independent apex result). Set the env var to
`https://www.galaxysportsedge.com` and confirm Google Cloud Console's Authorized redirect URIs
include the matching `www` callback. Real, currently-live risk to Google sign-in for real
users.

## LC-001 status: satisfied by LC-000

The Blocker Graph workstream (LC-001) is not a separate artifact. Every row above already
carries the full required field set (classification against the exact taxonomy, evidence,
impact, blast radius, canonical owner, dependencies, smallest safe fix, verification, rollback,
re-entry condition) in `LAUNCH_BLOCKER_LEDGER.json`. This ledger *is* the Blocker Graph. LC-001
is treated as satisfied rather than rebuilt from scratch, per the campaign's zero-duplicated-work
discipline.

## Full detail

See `LAUNCH_BLOCKER_LEDGER.json` for evidence, impact, blast radius, canonical owner,
dependencies, smallest safe fix, verification, and rollback for every item above.

## What's next

Agent-side: LC-002 (Nightly Sentinel v2) shipped, closing LB-005 -- see `scripts/launch/nightly-sentinel*.mjs`
and `.github/workflows/nightly-sentinel.yml`. A live dry-run reported WATCH (news-sitemap
zero-URL WARN, matching LB-006 below; zero FAIL). Next up: LC-003 (Security Residue -- the
live-shaped `THE_ODDS_API_KEY` found on an unlanded historical branch) and LB-006's short
investigation (does the news-content pipeline actually have zero eligible items right now, or
is something silently failing to publish?) before it's classified as a real defect or closed as
intentional.

Owner-side: LB-001 and LB-002 first (both are fast, safe, and unblock CI + auth confidence);
LB-003's refund-policy decision whenever convenient (not urgent-urgent, but real revenue-trust
exposure exists until decided); LB-007 whenever DB access is available to a session that can
verify it.
