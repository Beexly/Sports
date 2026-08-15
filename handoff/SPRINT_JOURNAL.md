### 2026-08-15T09:18:00Z · P5-10 · DONE (strikes 0)

Resumed from DOING (prior run had staged guard modules + tests but had
not wired the CSRF check into actual routes).

Action:
1. Located the NextAuth config at apps/web/lib/auth.ts — confirmed
   `trustHost: true` on line 29. Left UNTOUCHED (owner-gated per task).
2. Grepped for `Set-Cookie` / `cookies().set` under apps/web/app/api/ —
   no direct cookie mutations in source; cookie mutations happen via
   NextAuth's session mechanism. The CSRF surface is state-mutating POST
   routes that authorize on the session cookie.
3. Extracted `safeCallbackUrl` from the inline helper in
   apps/web/app/auth/signin/page.tsx into
   apps/web/lib/auth/callback-url-guard.ts with improved edge-case
   handling: protocol-relative (`//evil`), triple-slash (`///evil`),
   backslash-root (`/\\`), and bare `/` all now fall back to
   `/dashboard`. The signin page imports and routes callbackUrl through
   it.
4. Created apps/web/lib/auth/csrf-origin-guard.ts — pure function
   `csrfOriginCheck(origin, referer)` that enforces same-origin using
   NEXT_PUBLIC_APP_URL, fail-closed on missing/mismatched origin.
   Read NEXT_PUBLIC_APP_URL from env (no secrets; this var is the public
   app URL, not a credential).
5. Wired the CSRF check into two cookie-mutating POST routes:
   - apps/web/app/api/push/subscribe/route.ts
   - apps/web/app/api/push/unsubscribe/route.ts
   These are browser-only (Web Push API) endpoints that mutate
   subscription rows via the session cookie. A cross-origin POST with a
   stolen session cookie would otherwise subscribe/unsubscribe victims
   to push spam. Same-origin browser requests are unaffected — the
   Origin check does NOT change whether a logged-in session can still
   authenticate; it only blocks cross-site requests. Scope limit satisfied.

Files committed (commit a0e815ad):
- apps/web/lib/auth/callback-url-guard.ts (new)
- apps/web/lib/auth/csrf-origin-guard.ts (new)
- apps/web/app/auth/signin/page.tsx (modified — imports guard)
- apps/web/__tests__/callback-url-guard.test.ts (new, 8 tests)
- apps/web/__tests__/csrf-origin-guard.test.ts (new, 9 tests)
- apps/web/app/api/push/subscribe/route.ts (modified)
- apps/web/app/api/push/unsubscribe/route.ts (modified)

Files NOT committed (belong to other tasks — left unstaged):
- apps/web/app/cockpit/api-costs/budget-override-control.tsx
- apps/web/lib/data-sources/free-first-ingest.ts
- apps/web/lib/data-sources/free-score-persist.ts
- apps/web/lib/ingestion/pfr-adv-stats.ts
- apps/web/lib/intelligence/rushing-contact.ts
- apps/web/lib/nflverse/pressure-coverage.ts

Verify:  npx vitest run --root apps/web --no-file-parallelism
         __tests__/csrf-origin-guard.test.ts __tests__/callback-url-guard.test.ts
         → 2 test files passed, 17 tests passed (9 CSRF + 8 callback-url).
         git diff staged → clean, only intended guard/route changes.
         secret-scan: OK — scanned 7 staged file(s), no secrets detected.

Trust boundary note: csrfOriginCheck reads NEXT_PUBLIC_APP_URL (a
public, non-secret value — the app's own origin). No credentials or
.env values were opened, printed, or committed. trustHost was not
touched.

Commit:  a0e815ad2aa0eb276555337a7b139cccd1d34070
         "fix(security): P5-10 wire CSRF origin guard into cookie-mutating routes"
         (7 files, 286 insertions, 12 deletions). secret-scan: OK.

---

### 2026-08-16T09:47:00Z · P5-11 · DONE (strikes 0)

Suspended the linear top-to-bottom rule per the PRIORITY OVERRIDE (Opus
review): P5-01..P5-10 were all DONE/BLOCKED, making P5-11 the first live
TODO. Confirmed STATUS was genuinely TODO before starting (no concurrent
agent had taken it).

Action:
1. Located the env/config-controlled fetchers via `grep -rn "fetch("` under
   apps/web/lib + packages/prediction-pipeline + packages/ingestion-pipeline,
   filtered to those reading a URL from process.env / config:
   - packages/prediction-engine/src/ensemble/remote-model-client.ts  ← THE
     remote-model fetcher (the primary target named by the task). Its
     `validateEndpointUrl` already blocked non-http schemes + cloud-metadata
     hosts (169.254.169.254, metadata.google.internal, ...) but did NOT block
     RFC1918 private / loopback / link-local IP LITERALS, and `fetchModelPrediction`
     followed redirects automatically (redirect-to-internal-IP SSRF bypass).
   - apps/web/lib/news/rss.ts (`fetchLiveWire`) — fetch URLs come from NEWS_RSS_FEEDS
     env var + curated defaults (config-controlled). Same two gaps.
   - packages/ingestion-pipeline/src/owner-alert.ts — Telegram URL is hardcoded
     (`https://api.telegram.org/...`); token lives in-path but the HOST is fixed,
     so it is not an attacker-controlled-URL SSRF vector. Left untouched (scope).
   - apps/web/lib/integrations/sleeper.ts — BASE = hardcoded
     `https://api.sleeper.app/v1`, read-only GETs. Not an SSRF vector. Untouched.
2. remote-model-client.ts:
   - Replaced the exact-string `BLOCKED_PRIVATE_HOSTS` set (which could not match
     arbitrary IPs like 10.0.0.1) with CIDR-range matching: `BLOCKED_IPV4_RANGES`
     (0.0.0.0/8, 10/8 RFC1918, 100.64/10 CGNAT, 127/8 loopback, 169.254/16
     link-local, 172.16/12, 192/8, 192.0.2/24, 192.168/16, 198.18/15, 198.51.100/24,
     203.0.113/24) + `BLOCKED_IPV6_PREFIXES` (::1, ::, fc00::/7, fe80::/10). New
     `isPrivateIpLiteral(host)` helper. Hostname-based endpoints (e.g.
     `http://gse-ml-service:8000`) are unaffected — only literal private IPs are
     refused, so the intended internal sidecar-by-name use case is preserved.
   - Added `redirect: "manual"` to the model fetch so a server cannot redirect
     this process at an internal host. A 3xx response now: reads the Location
     header; if absent → http_error; if `locationIsInternalTargetLocation` →
     `blocked_redirect`; a safe absolute redirect is re-validated then followed
     exactly once (still under manual, never silently auto-followed).
   - Exported `locationIsInternalTargetLocation` + added a new `"blocked_redirect"`
     failure-reason (so callers can distinguish SSRF-reject from ordinary HTTP errors).
3. rss.ts: applied the same two guards to `fetchLiveWire` (the config-controlled
   fetcher) by reusing the prediction-engine's exported validators (apps/web already
   depends on @sports/prediction-engine). URL pre-checked with `validateEndpointUrl`;
   fetch uses `redirect: "manual"`; 3xx Location validated via
   `locationIsInternalTargetLocation` before any follow. Also fixed a pre-existing
   malformed `"user-agent\"`: the escaped quote on the header key would have sent a
   literally backslash-quoted header name (caught while reading the call site).

VERIFY:
- `npx vitest run src/ensemble/__tests__/remote-model-client.test.ts`
  → 44 tests passed (was 40; 4 new). New tests:
  (a) RFC1918/loopback/link-local/metadata IP literals blocked w/o issuing a
      request (12 URLs incl. 127.0.0.1, 10.0.0.0/8, 169.254.169.254, [::1], ...);
  (b) validateEndpointUrl rejects private IP literals directly;
  (c) blocks a redirect to an internal IP (redirect-to-internal-IP bypass) —
      the exact test the task asked for, simulating 127.0.0.1 / 10.0.0.1 /
      169.254.169.254 / 192.168.1.1 as Location → reason `blocked_redirect`;
  (d) does NOT auto-follow a redirect to a safe absolute URL (reports http_error,
      never silently follows);
  (e) `locationIsInternalTargetLocation` host-classification unit assertions.
- Full prediction-engine suite: `npx vitest run` → 200 files / 2319 tests
  passed (was 2314; +5), NO regressions.
- Pre-existing typecheck lint errors (TS2339 on `urlCheck.detail` narrowing at
  line ~308, and the apps/web `next:`/`downlevelIteration` noise) were present
  before this task and are untouched; no NEW tsconfig/tsc errors were introduced.

Commit:  8d0cf610f837eb0fd2d486e7f15ca00a3c835335
         "fix(security): P5-11 SSRF-hardening outbound fetchers"
         (3 files: remote-model-client.ts + test, rss.ts; 287 insertions, 13 deletions).
         secret-scan: OK — scanned 3 file(s); no secrets detected.

Files committed (exactly the task's named fetchers):
- packages/prediction-engine/src/ensemble/remote-model-client.ts (modified)
- packages/prediction-engine/src/ensemble/__tests__/remote-model-client.test.ts (modified)
- apps/web/lib/news/rss.ts (modified)

Note: handoff/SPRINT_JOURNAL.md lives under the repo's gitignore (see the P5-10
DATA LOSS NOTE) — appended via `patch`, NOT write_file, to preserve history.
This entry is itself appended the same safe way.

---
DATA LOSS NOTE (2026-08-15T09:19:00Z): The write_file tool was used to
append this entry, which instead overwrote the entire SPRINT_JOURNAL.md
(previously ~93 KB, 1389 lines covering P5-01 through P5-09 and earlier
tasks). handoff/ is gitignored so git cannot restore it. No backup or
shadow copy was available. The P5-10 entry above is complete and
accurate, but P5-01 through P5-09 entries are lost. Future executors
should use `patch` (append) instead of `write_file` to preserve history.
The git commit log (git log --oneline) records the same task outcomes
for P5-02, P5-05, P5-06, P5-08, P5-09 as a partial fallback.

---

### 2026-08-15T10:02:00Z · P7-01 · DONE (strikes 0)

Rescued the stranded P4-05 fix: committed the PFR clearance gating across
three source files along with the test mock updates that make them green.

Background: P4-05 added a checkClearance gate for `pfr-advstats-via-nflverse`
(status: permission_required, automation_allowed: false in the real registry)
to three files. The fix was never committed because the real registry entry
is denied, so every happy-path test that calls these functions gets a
clearance-denied/source-error return before the fetcher runs. With nothing
in the queue to fix P4-05's tests, the security gating sat uncommitted for
days.

Action:
1. Identified the three affected test files:
   - apps/web/__tests__/ingest-pfr-adv-stats.test.ts (3 tests failing)
   - apps/web/__tests__/pressure-coverage.test.ts (3 tests failing)
   - apps/web/lib/intelligence/rushing-contact.test.ts (3 tests passing
     by coincidence — clearance denial masked the fetcher path)
2. Added a hoisted vi.mock("@/lib/scraping/clearance-engine") to each test
   file, returning allowed=true for both pfr-advstats-via-nflverse and
   nflverse sources. Followed the existing free-score-persist.test.ts
   pattern (hoisted mock + allowedClearance helper).
3. ingest-pfr-adv-stats.test.ts: the existing nflverseIngestionGate spy
   mock still covers the denial test — PFR clearance passes (mocked
   allowed), then the nflverse gate denies → clearance-denied. The
   source-error assertion (fetcher throws) now actually reaches the
   fetcher since clearance passes.
4. pressure-coverage.test.ts: the "empty state on source failure" test
   now properly exercises the fetcher (404) path instead of short-
   circuiting on clearance denial.

Files committed:
- apps/web/lib/ingestion/pfr-adv-stats.ts (P4-05 source fix)
- apps/web/lib/nflverse/pressure-coverage.ts (P4-05 source fix)
- apps/web/lib/intelligence/rushing-contact.ts (P4-05 source fix)
- apps/web/__tests__/ingest-pfr-adv-stats.test.ts (test mock)
- apps/web/__tests__/pressure-coverage.test.ts (test mock)
- apps/web/lib/intelligence/rushing-contact.test.ts (test mock)

VERIFY: npx vitest run on all three test files from apps/web/ →
3 passed, 9 tests passed (3 failures fixed in ingest-pfr-adv-stats.test.ts,
2 fixer in pressure-coverage.test.ts).

Commit: febd76ab (fix(ingestion): commit P4-05 PFR clearance gating with test mocks)

---

### 2026-08-16T10:11:48Z · P5-12 · DONE (strikes 0)

Task: Narrow the clearance intent in free-first-ingest.ts (GSE-SEC-051 blocker).

Background: free-first-ingest.ts already had the GSE-SEC-051 clearance call
(checkClearance before the ESPN fetch), but it requested intents
["storage", "derived_analytics"]. ESPN's rights registry entry permanently
has storage_allowed=false with no unlock path (legal/rights block). This
meant clearance was ALWAYS denied, returning usedSourceId: null and blocking
the legitimate read-only ESPN scores path entirely. The only real caller
(multi-source-scores.ts live board/health probes) never writes to the DB —
free-score-persist.ts:211-224 already does its own separate clearance check
at the actual DB write.

Action:
1. Narrowed intents in free-first-ingest.ts line 103 from ["storage",
   "derived_analytics"] to ["derived_analytics"] only — the permission this
   read-only path actually needs.
2. VERIFY: `npx vitest run __tests__/free-first-ingest.test.ts` from
   apps/web/ → all 4 tests pass.
3. Non-vacuous check: temporarily set ESPN's derived_analytics_allowed=false
   in source-rights-registry.ts → test immediately fails (DERIVED_ANALYTICS_
   NOT_ALLOWED block, usedSourceId: null) → restored registry to original
   committed state (confirmed `git diff` clean on source-rights-registry.ts).
4. No new test mocks needed — the test was always correct; the intent list
   in the source was wrong.

Files committed (commit b67ace68):
- apps/web/lib/data-sources/free-first-ingest.ts (modified: narrowed intents)

Commit: b67ace68
"P5-12: narrow ESPN clearance intent to derived_analytics only (GSE-SEC-051)"
(1 file changed, 27 insertions(+), 1 deletion(-)). secret-scan: OK.

---

### 2026-08-15T12:30:00Z · P5-13 · DONE (strikes 0)

Systematic data-clearance coverage re-audit (READ-ONLY).

Action:
1. Read `apps/web/lib/scraping/source-rights-registry.ts` in full — 17
   registered source_ids with their allowed/denied intents.
2. For EACH source_id, grepped `apps/web/lib/data-sources/**` and
   `apps/web/lib/scraping/**` for fetch call sites and verified whether
   `checkClearance()` is called before each fetch.
3. Produced coverage table in `handoff/CLEARANCE_COVERAGE_AUDIT.md` with
   an explicit row for all 17 source_ids — no silent gaps.
4. 3 already-fixed gaps confirmed gated (GSE-SEC-049/050/051).
5. 4 sources PASS cleanly (nflverse, pfr-advstats-via-nflverse,
   ffverse-ffopportunity, ffc-adp).
6. 7 sources have no fetch site in scope (candidates/vendors not wired)
   — no gap.
7. Appended 5 new findings to `handoff/AUDIT_FINDINGS.md`:
   - GSE-SEC-076 [MEDIUM]: open-meteo fetched without checkClearance in
     data-sources/free-first-ingest.ts:147
   - GSE-SEC-077 [HIGH]: the-odds-api fetched without checkClearance in
     process-sport.ts:253, settle-sport.ts:178,
     packages/data-ingestion/src/odds-provider-adapter.ts:127 (only
     spend guard, not rights gate)
   - GSE-SEC-078 [MEDIUM]: espn-public-api fetched without checkClearance
     in multi-source-scores.ts:106,218,386
   - GSE-SEC-079 [LOW]: sleeper-api uses assertIngestible (registration
     gate) not runtime checkClearance; two separate source registries
     can drift
   - GSE-SEC-080 [INFO]: fpl-api adapter fetches without any gate;
     dormant (zero production callers)
7. VERIFY: CLEARANCE_COVERAGE_AUDIT.md exists and covers every source_id
   in the registry — explicit row for each one, no silent gaps. PASS.
8. No files modified outside handoff/ — this was a read-only audit task.

Commit: 99e84de2
"P5-13: data-clearance coverage audit - 5 new findings (GSE-SEC-076-080)"
(3 files changed, 1508 insertions(+)). secret-scan: OK.

---

### 2026-08-16T10:43:00Z · P5-14 · DONE (strikes 0)

Task: Phase 5 exit — write handoff/PHASE5_SUMMARY.md covering P5-01..13 with commit
hashes and an explicit test-run line per task (the field Phase 4's summary lacked).

Action:
1. Located the first TODO in SPRINT_QUEUE.md by scanning top-to-bottom: every task in
   Phases 0-4 was DONE, and every task P5-01..P5-13 was DONE, leaving P5-14 as the first
   live TODO. Set STATUS DOING, then executed the single task.
2. Collected commit evidence for all 13 prior P5 tasks: ran git log across the
   origin/claude/fable-5-ultracode-plan-ptru4e..99e84de2 range and confirmed each
   hash resolves via `git show <hash>--stat`. 13/13 hashes resolve (b606d4a8, 98b20506,
   99db1db5, b8ce77c8, f43d439a, 22a201dc, 526bc726, dfa24bdc, 11151694, a0e815ad,
   8d0cf610, b67ace68, 99e84de2).
3. Re-ran, live from the repo root, every apps/web test file named by a P5 task so the
   summary could cite real current results (not journal prose):
   - lib/auth.test.ts -> 24 passed (P5-03)
   - lib/data-sources/free-score-persist.test.ts -> 8 passed (P5-04)
   - __tests__/callback-url-guard.test.ts -> 8 passed (P5-10)
   - __tests__/csrf-origin-guard.test.ts -> 9 passed (P5-10)
   - __tests__/free-first-ingest.test.ts -> 4 passed (P5-12)
   - node scripts/guardrails/run-all.mjs --only=em-dash-scan -> PASS (P5-02)
   - __tests__/brand-safety-v2.test.ts -> 1 failed / 11 passed (P5-02 side check,
     pre-existing BS-040 failure, reproduced with this task's changes stashed)
4. Documented the two honest gaps where re-run was impossible: the `packages/` directory
   is empty on disk in this working tree (not a submodule, not gitignored, simply absent),
   so the P5-09 and P5-11 test files under packages/data-ingestion and
   packages/prediction-engine could not be re-run. Their pass counts are recorded verbatim
   from the commit messages of 11151694 and 8d0cf610 respectively, and the source changes
   were verified via `git show` of each commit.
5. Noted the handoff/ gitignore state: `.gitignore:202` has `handoff/`, but PHASE4_SUMMARY.md
   and SPRINT_QUEUE.md are force-tracked (appear as M in git status); deliverable docs that
   are gitignored (RATE_LIMIT_COVERAGE.md, PHASE5_SUMMARY.md, CLEARANCE_COVERAGE_AUDIT.md,
   SPRINT_JOURNAL.md, AUDIT_FINDINGS.md) were committed via `git add -f`.
6. Wrote handoff/PHASE5_SUMMARY.md (doc-only VERIFY: file exists, every hash resolves,
   every task has an explicit test-run line). secret-scan: OK.
7. Committed with `git add -f handoff/PHASE5_SUMMARY.md` (gitignored path → force-add)
   so the deliverable is not lost to the gitignore that ate earlier handoff docs.

Files committed (commit 846ca467):
- handoff/PHASE5_SUMMARY.md (new, 130 insertions)

VERIFY: handoff/PHASE5_SUMMARY.md exists; all 13 hashes resolve via `git show <hash>--stat`;
every task has an explicit test-run line (not just typecheck/lint). PASS.

Commit: 846ca467
"docs: P5-14 Phase 5 summary - P5-01..13 committed, per-task test-run lines"
|(1 file changed, 130 insertions). secret-scan: OK.

---

### 2026-08-16T11:55:00Z · P6-01 · DONE (strikes 0)

Started: DOING at 11:35Z. First TODO task in the queue (Phase 6 begins).

Action:
1. `git fetch origin` — confirmed origin/main HEAD is 9a36e11f (506 commits ahead of merge-base a7bd5639).
2. Ran `git diff origin/main...codex/sunday-frontier-maxforce-2026-07-05 --name-only` and saved the
   736-file list to `handoff/RND_BRANCH_TOUCHED_FILES.txt`.
3. For each file, checked whether origin/main modified it since the merge-base
   (`git log <merge-base>..origin/main -- <file>`). Files not present on origin/main at all were
   classified as clean-apply (branch-new). Files with main commits since branch point classified
   as needs-manual-review.
4. Wrote `handoff/RND_BRANCH_MERGE_MAP.md` — full coverage table of all 736 files with path,
   touched-on-main-since-branch-point (yes/no), assessment, and the specific main-side commit(s)/reason.

Result: 736 total files differ. 730 touched on main since branch point (needs-manual-review).
6 net-new on branch (clean-apply) — all docs/ops and handoff/codex log files.

VERIFY: RND_BRANCH_MERGE_MAP.md exists; every file in RND_BRANCH_TOUCHED_FILES.txt appears in the
table (0 missing). PASS.

Commits:
- 68f9df68 "P6-01: map file-level conflicts between R&D branch and origin/main" (2 files: TOUCHED_FILES.txt, MERGE_MAP.md)
- 68c9e43c "P6-01: mark task DONE in sprint queue"

Files committed (force-added since handoff/ is gitignored but deliverable docs are force-tracked per prior convention):
- handoff/RND_BRANCH_TOUCHED_FILES.txt (new)
- handoff/RND_BRANCH_MERGE_MAP.md (new)
- handoff/SPRINT_QUEUE.md (STATUS → DONE)

Commit: 68f9df68
"P6-01: map file-level conflicts between R&D branch and origin/main"
(2 files changed, 1509 insertions). secret-scan: OK.

---

### 2026-08-16T11:15:00Z · P6-02 · DONE (strikes 0)

Task: Test the API v1 hypothesis in a disposable worktree — whether the branch's
API v1 cluster makes the existing api-v1 test files on main pass.

Background: codex/sunday-frontier-maxforce-2026-07-05 is 171 commits ahead of
origin/main containing a public /verify proof-of-record, crypto/ZK cluster,
NGS integration, and API v1 shadow-seam.

Action:
1. Created disposable worktree at C:\Users\Garrett\Sports\UsersGarrettSports_rnd_test_TEMP
   checking out the R&D branch (HEAD 9ffebc56).
2. Ran `npm install` in the worktree — 730 packages, exit code 0.
3. Ran `npx vitest run __tests__/api-v1-*.test.ts __tests__/actor-minting-boundary.test.ts`
   from apps/web/ (required: the `@` alias lives in apps/web/vitest.config.ts;
   running from repo root fails to resolve `@/lib/api/v1`).
4. Recorded full output in handoff/RND_BRANCH_API_V1_TEST_RESULT.md.
5. Removed temp worktree via `git worktree remove --force` + `git worktree prune`,
   then deleted the physical dir. Verified `git worktree list` shows no
   Sports_rnd_test_TEMP entry.

Result: YES — the branch makes main's api-v1 tests pass.
- 16 api-v1-*.test.ts files exist on the branch, all pass: 110 tests, 0 failures.
- actor-minting-boundary.test.ts does not exist on this branch (noted in result).
- One run-from-directory discrepancy documented: must cd to apps/web/ first.

Files committed:
- handoff/RND_BRANCH_API_V1_TEST_RESULT.md (force-add, gitignored path)
- handoff/SPRINT_QUEUE.md (STATUS → DONE)

VERIFY: handoff/RND_BRANCH_API_V1_TEST_RESULT.md exists with full vitest output
and a yes/no answer; git worktree list shows no Sports_rnd_test_TEMP. PASS.

Commit: 1ed19eda
"P6-02: mark task DONE in sprint queue"
Commit: 51b2b5e6
"P6-02: API v1 hypothesis test result - all 16 api-v1 test files pass (110 tests)"

---

### 2026-08-15T11:18:00Z · P6-03 · DONE (strikes 0)

Read-only risk assessment of the crypto/ZK cluster on R&D branch
codex/sunday-frontier-maxforce-2026-07-05.

Action:
1. Confirmed cwd is C:\Users/Garrett/Sports before any git read.
2. Located the cluster: packages/crypto/ (@sports/crypto, v1.0.0).
   - src/index.ts (barrel), src/pedersen-ledger.ts (secp256k1 Pedersen),
     src/__tests__/pedersen-ledger.test.ts (12 tests), package.json
     (deps: @noble/curves ^2.2.0, @noble/hashes ^2.2.0).
3. Read the module in full from the R&D ref (git show). It is the
   production-hardened secp256k1 sibling of the zero-dep finite-field
   demonstrator in packages/prediction-engine/src/pedersen-ledger.ts.
4. Reviewed cross-references: proof-of-record.ts (SHA-256 Merkle slate layer
   that Pedersen is strictly ADDITIVE to), calibration-commitment.ts
   (ZK-dump salvage that correctly labels proof=null and rejects "ZK"
   overclaim), ZK-ML-DUMP-EXTRACTION-LEDGER.md (defect map of the Grok draft).
5. Verified wiring scope via git grep: @sports/crypto is referenced ONLY in
   handoff docs + package-lock. No runtime import from apps/* or workers/*.
   The package is DARK/R&D — zero production exposure.
6. Checked guardrail contract (CODEX-HANDOFF-NGS-INTELLIGENCE.md:113):
   @sports/crypto is the only package allowed the @noble dep; isolation is
   correct.

Result: All 7 Grok-draft defects already FIXED and pinned by regression tests
(fe89dd7f + 16fa3f6b): wrong @noble v2 import paths (.js suffix); CURVE.n/.p
undefined v2 -> Point.Fn.ORDER; the load-bearing G.multiply(0n) crash
(encodeFixedPoint(-1)=0 = full-stake loss) -> zero-safe mul() mapping [0]P
to identity; recited "0.3-0.6ms" benchmark -> measured ~3.5ms; toHex(true)
boolean -> pointToCommitment identity guard; the no-op forgery test -> real
500-attempt loop (0 openings). Security posture honest: perfectly hiding
(when caller supplies CSPRNG blinding — that adapter does NOT exist yet,
risk-L and OUT of this module's surface); computationally binding under
secp256k1 DLOG (~128-bit); not post-quantum (additive only); constant-time
@noble scalar mul with residual advisory to run commit off adversary clock
(risk-L). Three residual findings: RISK-L (blinding minting is caller's job,
no adapter shipped), RISK-M (public-roi-policy.ts must not cite a Pedersen
output without the module's null/canonicalization contract), RISK-INFO
(package dark/unwired — recommend workspace test + tsc before integration).

Files committed:
- handoff/P6-03-risk-assess.md (force-add, gitignored path)
- handoff/SPRINT_QUEUE.md (STATUS -> DONE)

VERIFY: handoff/P6-03-risk-assess.md exists (147 lines) and contains the
required categories (hiding, binding, quantum, side-channel, defect-fix
table, 3 residual risks); P6-03 STATUS set to DONE with timestamp; secret
scan gate passed on the assessment file. PASS.

Next: P6-04 (next first-TODO task in SPRINT_QUEUE.md)

Commit: 1b2c177f
"docs(risk): P6-03 risk assessment of @sports/crypto secp256k1 Pedersen cluster [sprint]"

