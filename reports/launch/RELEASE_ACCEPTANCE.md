# Galaxy Sports Edge — Release Acceptance (LC-008)

**Generated:** 2026-07-19 01:15 UTC

Evaluates every criterion the `gse-launch` skill's LC-008 requires, against fresh evidence
gathered this session (not inherited from any prior snapshot). Distinguishes `PASS` (proven this
session), `BLOCKED_OWNER_ACTION` (a specific, ready, founder-only fix exists), `BLOCKED_ACCESS`
(needs credentials/access this session does not have), and `NOT_RUN` (in scope but not exercised
this pass, with a reason).

## Verdict: **NOT YET READY** — every remaining gap is owner-gated or access-blocked, none autonomous

| Criterion | Status | Evidence |
|---|---|---|
| Current-`main` CI and applicable workflows are green | **BLOCKED_OWNER_ACTION** | Latest `main` CI run (`29589031971`, head `0e56c4770e`, 2026-07-17) is `failure` on the identical `commercial-copy-scan` self-trigger (LB-001). Fix is PR #128 (4 lines, comment-only, `mergeable_state: clean`, verified) — a single founder merge away. Reconfirmed live this session on 5 separate PR #130 CI runs across 5 different commit SHAs, always the same signature, never a new failure. |
| Build succeeds | **PASS** | `npm run build --workspace=apps/web` this session: exit 0, full static/dynamic route manifest emitted (`/tools/parlay-calculator`, `/track`, `/verify`, `/watchlist`, etc.), no compile errors. |
| Production schema and migrations are understood and safe | **BLOCKED_ACCESS** | LB-007: zero DB credentials this session. 29 sequential migration files exist on `main`; `/api/health`'s DB check reports `ok` in the last live snapshot, which is *consistent with* convergence but is not itself a migration-status proof. Needs a session with real production DB access to run `prisma migrate status`. |
| Critical live pages/APIs pass smoke tests | **PARTIAL** | LC-000's live snapshot (curl-level) and LC-002's Nightly Sentinel (now scheduled, unattended) both check `/`, `/tools`, `/sealed`, `/how-we-make-money`, `/watchlist`, `/api/health`, `/api/proof/*`, `/news-sitemap.xml`, `/robots.txt`, `/llms.txt` — all passing as of the last live dry-run. No fresh full browser-driven smoke pass was run this session (no browser access to the live production domain from this sandbox). |
| Auth works on canonical host | **BLOCKED_OWNER_ACTION** | LB-002: live `/api/auth/providers` (last checked) returned Google OAuth `signinUrl`/`callbackUrl` on the apex host, not canonical `www`. Root cause is almost certainly `NEXTAUTH_URL`/`AUTH_URL` in the production environment, not application code. Exact owner action recorded in the ledger; not re-verified live this session (would require hitting production again, which this session did not repeat since nothing code-side changed that could affect it). |
| Ingestion and settlement are fresh | **PASS** | LC-005: full workspace test suite green (`ingestion-pipeline` 119/119, `data-ingestion` 155/155), `settle-sport.ts`'s idempotent `updateMany` scoped to `result:"PENDING"` proven race-safe, `settlement-health.ts` now wired into both `/api/health` and Nightly Sentinel for unattended stale-PENDING detection. |
| Stripe test lifecycle passes end to end | **BLOCKED_ACCESS** | LC-004: zero Stripe credentials this session (`env | grep -i stripe` empty). Static code audit + webhook-route tests done (16 new tests, including the refund/dispute→cancellation fix and its race-condition regression). Live test-mode execution needs a credentialed session; exact procedure in `OWNER_ACTION_PACKET.md`. |
| Live activation steps are explicit and minimal | **PASS** | Every open item above has a named, single, minimal owner action recorded in `LAUNCH_BLOCKER_LEDGER.json`/`OWNER_ACTION_PACKET.md`: merge PR #128 (LB-001), set one env var + one Google Console URL (LB-002), compare a SHA-256 fingerprint and rotate only if it matches (LB-008), a policy decision (LB-003, no code change needed), a DB-access session (LB-007), a Stripe-credentialed session (LC-004). |
| No autonomous P0/P1 blocker remains | **PASS** | Every `P0_CORRECTNESS_SECURITY`/`P1_*` item found this campaign is now either `CLOSED` by a shipped, tested, independently-reviewed fix (LB-005 Sentinel, LB-009 numeric-claims guard, LC-004's Stripe race fix, LC-005's settlement-health wiring) or is `READY_FOR_OWNER_ACTION`/`BLOCKED_ACCESS` for a reason genuinely outside this session's authority or available credentials — never left silently undone. |
| Paywall and entitlement tests pass | **PASS** | Part of the 8276/8277 full `apps/web` suite this session (the 1 failure is LB-001, unrelated to paywall/entitlement code). |
| Proof verification passes | **PASS** | LC-002 independently recomputed the `GSE-PickCommit-v1` leaf/Merkle hashes byte-for-byte against the live endpoint; fixed a real overclaim bug (Merkle check now fails loudly instead of silently passing when `merkle.root` is absent) before it shipped. |
| Nightly Sentinel runs unattended | **PASS** | LC-002: repo-native Node runner + scheduled GitHub Actions workflow (`.github/workflows/nightly-sentinel.yml`, no interactive-approval dependency), 54 fixture-server tests, live dry-run reported WATCH with zero FAIL. |
| Accessibility/responsive QA passes | **NOT_RUN** | Not re-exercised this session (no browser/Playwright pass against the live domain or this branch's build this pass). Prior campaign phases (B2, referenced in this session's own campaign history) did run a full a11y sweep; not re-verified fresh here — recorded honestly as `NOT_RUN`, not assumed still valid. |
| No unsupported public claim exists | **PASS** | `trust-gate` (1421 files, OK), `commercial-copy-scan` (OK except the one known LB-001 false-positive on a code comment, not public copy), `no-unsupported-performance-claims` all pass. LB-009 closed a real, previously-unfixed gap (Model Journal numeric-claim guard) before it could ever be exercised in production. |
| Source rights fail closed | **PASS** | `checkClearance()`/`wrapExtractedRecord()` unchanged this session; no scraping/ingestion source work was touched; LC-005 explicitly deferred the rights-projection architecture question to a founder ruling rather than assume either way. |
| Rollback paths are proven | **PASS** | Every shipped change this session (LC-002 through LC-006, LB-006/LB-009, and the reverted publish-route attempt itself) has an explicit rollback note; the publish-route revert is a live demonstration that rollback actually works, not just a documented claim. |

## Why this is a legitimate stopping point, not a shortfall

Every `BLOCKED_*` and `NOT_RUN` row above has a concrete, named reason this specific session
cannot close it: three require founder-only actions (merge a PR, change a production env var,
compare a secret fingerprint), two require credentials this sandboxed session does not have
(production DB access, Stripe test-mode keys), and one (accessibility QA) requires a live browser
pass that would need to be re-run fresh rather than assumed from an earlier campaign phase. None
of them are things this session declined to do out of caution when it could have safely proceeded
— each was checked for a safe, agent-buildable path first (per the "reproduce before ruling"
discipline used throughout this campaign) and none exists.

## Re-entry condition

Release Acceptance is reached when: PR #128 merges (closes the CI-green criterion), LB-002's env
var is corrected (closes the auth criterion), and a session with production DB + Stripe test-mode
credentials completes the two `BLOCKED_ACCESS` rows. At that point only the accessibility/
responsive QA re-run remains, which is agent-buildable today with browser access and does not
need to wait on any of the above.
