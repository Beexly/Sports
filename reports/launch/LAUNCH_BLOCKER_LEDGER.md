# Galaxy Sports Edge — Launch Blocker Ledger (LC-000/LC-001 seed)

**Generated:** 2026-07-18 22:30 UTC (last updated 2026-07-19, LB-006/LB-009)
**Full machine-readable record:** `LAUNCH_BLOCKER_LEDGER.json`

Nine items, evidence-backed, classified. **Two confirmed P0_CORRECTNESS_SECURITY findings**
(LB-008, added by LC-003 — see `SECURITY_RESIDUE.md`; a secrets-hygiene exposure on an unlanded
branch, not a live production code defect — and LB-009, a real but never-yet-exercised gap in the
Model Journal public read-time guard, found and fixed this session). Three items have a clean,
low-risk, immediate owner action available today.

| ID | Title | Class | Status |
|---|---|---|---|
| LB-001 | `main` CI red on `commercial-copy-scan` self-trigger | P1_DEPLOYMENT_AUTH | **Ready for owner action — merge PR #128** |
| LB-002 | Live OAuth signin/callback on apex host, not `www` | P1_DEPLOYMENT_AUTH | **Ready for owner action — env var + Google Console** |
| LB-003 | Refund promise contradiction (pricing vs. Terms) | P1_REVENUE | Owner-gated on a policy decision |
| LB-004 | Clarity analytics tag has literal `undefined` ID | P2_TRUST_UX | Ready for owner action or code fix |
| LB-005 | Nightly Sentinel has zero unattended coverage | P1_DATA_ENGINE | **CLOSED — LC-002 shipped, verified, live dry-run WATCH** |
| LB-006 | `news-sitemap.xml` is empty | INTENTIONAL_CLOSED | **CLOSED — correct output of a founder-hardened publish barrier, not a defect; OWNER_GATE recorded** |
| LB-007 | Production DB migration convergence unverified | P1_DATA_ENGINE | Needs access this session doesn't have |
| LB-008 | Live-shaped `THE_ODDS_API_KEY` on a still-public unlanded branch | P0_CORRECTNESS_SECURITY | **Ready for owner action — fingerprint compare, rotate if it matches** |
| LB-009 | Model Journal public guard missed numeric performance claims | P0_CORRECTNESS_SECURITY | **CLOSED — fixed, tested, never actually exercised in production (LB-006)** |

## The three immediate owner actions

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

**LB-008 — Compare fingerprints, rotate `THE_ODDS_API_KEY` only if it matches.** A live-shaped
32-hex-character value is hardcoded on a still-public, unlanded branch
(`claude/fix-local-setup-PmnyX`). First confirm the variable is populated
(`echo -n "$THE_ODDS_API_KEY" | wc -c` should print 32), then run
`echo -n "$THE_ODDS_API_KEY" | sha256sum` against the real production value and compare to
`076035217a9d4263f44f8d27e9a9916401c6a3046037719f48bb9ca378e0600f` — rotate at
the-odds-api.com only if it matches. Avoid typing the raw key into an interactive shell where
avoidable (shell-history risk) — see `SECURITY_RESIDUE.md` for the full safe procedure and exact
OWNER_GATE.

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
and `.github/workflows/nightly-sentinel.yml`. LC-003 (Security Residue) shipped, closing
LB-008's investigation and the scanner gap it found -- see `SECURITY_RESIDUE.md` and the new
`odds-api.key.embedded` rule in `scripts/guardrails/secret-scan.mjs`. LC-004 (Revenue Canary,
Stripe test-mode static audit) and LC-005 (Data and Engine Canary) and LC-006 (Gate Matrix) all
shipped. LB-006's investigation is now closed: root-caused to `ModelJournalEntry` having no code
path anywhere that ever sets `status: "PUBLISHED"` -- confirmed this is **deliberate**, not a gap.
An attempted fix (a new admin-gated `/publish` cockpit route) was built, tripped the
`draft-only.mjs` CI guardrail (a founder-hardened invariant that blocks ANY application code from
performing a publish-side write), and was fully reverted rather than weakened. See LB-006's entry
in the JSON ledger for the full evidence chain and the recorded OWNER_GATE. While investigating,
gse-red-team found and this session fixed a real, independent gap (LB-009): the Model Journal
public read-time guard (`apps/web/lib/journal/public-guard.ts`) used a word-list-only scan that
would have let a numeric fabricated stat ("71% cover rate") through unredacted the moment any
entry is ever published -- now uses the same `scanPublicCopyForClaims` fix already proven for the
Blog guard. Next up: LC-007 (Focused Release Candidates) and LC-008 (Release Acceptance).

Owner-side: LB-001, LB-002, and LB-008 first (all three are fast, safe, and either unblock CI +
auth confidence or close a secrets-hygiene exposure); LB-003's refund-policy decision whenever
convenient (not urgent-urgent, but real revenue-trust exposure exists until decided); LB-006's new
OWNER_GATE whenever the founder wants Model Journal content to actually go live (direct DB action,
or explicit authorization to add a reviewed exemption to `draft-only.mjs`); LB-007 whenever DB
access is available to a session that can verify it.
