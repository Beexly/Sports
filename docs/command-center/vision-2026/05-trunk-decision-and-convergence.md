# 05 — The Trunk Decision + Convergence (the one move that unlocks everything)

**The finding (critic-confirmed, then independently re-verified at file:line):** GSE is *substance-ahead, surface-behind, and clone-stranded.* ~70% of "best website of 2026" is already built — but inert and stranded in CANONICAL, while the launch clone (DEPLOY) ships the plain twin. The work to greatness is **convergence + activation, not invention.** This is blocked on one decision only you can make.

## Verified facts (re-checked 2026-06-09, not taken on the audit's word)
- **Bidirectional drift — neither clone is a superset.**
  - DEPLOY has the *safety* CANONICAL lacks: the fail-closed cron truth contract (`refresh-odds/route.ts` 200/207/502 split), the `DEV_FAKE_ADMIN` production guard (`auth.ts`), the 60-min freshness gate, this session's A+ batch (migrate-in-build, HSTS, `/api/picks` guard, the shadow independent estimator).
  - CANONICAL has the *greatness* DEPLOY lacks: the matured tokenized design system + cinematic layer, the Model Court (reveal-less conversational engine), CLV pipeline, the wired observability/analytics stack, the failover toolkit, ~20 nflverse adapters, the department-heads cockpit, Beat-the-Model, the full monetization machine.
- **Two real regressions live in CANONICAL right now** (verified):
  - `refresh-odds/route.ts:76-77` always pushes `ok:true` and `:92-93` returns a default 200 — the masked-success bug. **DEPLOY is fixed; CANONICAL is not.**
  - `auth.ts:91-92` runs the `DEV_FAKE_ADMIN` ADMIN-session bypass with **no `NODE_ENV` production guard** — would mint ADMIN for every visitor if the flag ever leaks to a CANONICAL prod deploy.
- **Clone sprawl is real:** at least `Sports`, `Sports-canonical-2026-06-03`, `Sports-deploy-fix`, `Sports_release_codex`, and `_backup_old_repos/` carry app trees; a full enumeration timed out. "One source of truth" is a fiction until these are quarantined.

## The decision (yours — it's ceiling vs. speed)
- **Option A — DEPLOY is the trunk.** Port CANONICAL's features/design/cinematic *into* deploy. Faster to a safe narrow launch; lower ceiling; the port is large and ongoing.
- **Option B — CANONICAL is the trunk.** Port DEPLOY's *safety* (truth contract, `DEV_FAKE_ADMIN` guard, 60-min freshness, the A+ batch) *into* canonical, then run a launch-readiness pass on canonical. Higher ceiling — canonical *is* the "best website of 2026" base — but more work before launch.
- **My recommendation:** if the goal is genuinely *best website of 2026 + Garrett among the top analysts*, **Option B is the higher-ceiling path** — the greatness already exists in canonical; we harden it rather than rebuild it in the plain clone. Option A is the faster-narrow-launch path. This is a real trade-off and it's your call.

## Before either: quarantine (critic M1)
Archive/rename the stale trees (`Sports-deploy-fix`, `Sports_release_codex`, `_backup_old_repos`, any other `apps/web` copies) out of the working path so tooling, search, and "source of truth" are real. This is a prerequisite to any convergence.

## Prepared execution (the moment you pick a trunk)
The Vision-2026 program's `03-program-build-queue` Wave 0 is the compliance-preserving 5-wave port sequence. Once the trunk + quarantine are set, I run it directed: port the trust spine (observability + CLV, inert-without-keys) → the design system → reconcile pricing (before any Stripe object) → the cinematic + AI-native surfaces → growth loops. Most "build" items reduce to *port + activate*, which is why the decision is worth more than any feature I could build tonight.

**Two safe fixes you can authorize regardless of trunk choice** (I verified both; I left them for a directed pass rather than diving into an unverified tree overnight): port the `DEV_FAKE_ADMIN` prod guard into CANONICAL (P0 security), and port the cron truth-contract fix into CANONICAL.
