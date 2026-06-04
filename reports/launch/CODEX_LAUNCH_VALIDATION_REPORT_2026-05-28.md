# CODEX Launch Validation Report — 2026-05-28

## Scope
- Repository: `C:\Users\Garrett\Sports`
- Branch validated: `main`
- Objective: release-engineer validation lane, legal/public guardrails, smoke safety, and launch readiness signal.

## Branch And Diff Hygiene
- Current branch: `main`
- Tracking: `origin/main`
- Working tree is heavily dirty before this pass (multiple app routes, package changes, new packages, guardrail files, reports).
- `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md` was **missing in-repo** during initial check, while a copy exists in `C:\Users\Garrett\Downloads\FULL_SITE_LAUNCH_READINESS_2026-05-28.md` claims it was created on Claude's branch.
- Conclusion: local `main` is not equivalent to Claude's launch branch from handoff screenshot/readiness doc.

## Validation Commands And Results

1. `npm.cmd run lint`
- Result: PASS

2. `npm.cmd run build`
- Result: PASS
- Notable output: Prisma auth errors to localhost during generation, but build completes.

3. `npm.cmd run typecheck`
- Result: PASS

4. `npm.cmd run test`
- Result: PASS (`154` files, `1806` tests)

5. `npm.cmd run test:brand-safety`
- Result: PASS (`19` files, `725` tests)

6. `npm.cmd run guard:trust`
- Result: PASS (`[trust-gate] OK - scanned 273 file(s); no banned phrases.`)

7. `npm.cmd run lint:brand`
- Result: PASS (`[brand-lint] OK - brand enforcement passed`)

8. `npm.cmd run test:smoke`
- Initial result: FAIL due Windows path bug in newly added script
- Fix made: use `fileURLToPath(new URL('.', import.meta.url))` for repo root resolution
- Final result: PASS (`76` checks, `0` failed)

## Fixes Made In This Pass

1. Added real smoke validator script
- File: `scripts/smoke-launch.mjs`
- Behavior:
  - checks required launch routes
  - checks pricing/methodology/legal surface presence
  - scans public routes for forbidden betting-certainty phrases
  - validates robots disallow coverage for internal/admin/api routes
  - asserts no public crawler route
  - asserts no unrestricted public Brain route (or requires explicit gated/demo markers if brain route exists)
  - checks demo/preview labels when demo routes exist

2. Wired smoke into root scripts
- File: `package.json`
- Change: added `"test:smoke": "node scripts/smoke-launch.mjs"`

3. Repaired smoke script path handling on Windows
- File: `scripts/smoke-launch.mjs`
- Change: replaced URL pathname derivation with `fileURLToPath(...)`

## Brand Package Integration Validation
Validated via typecheck/tests/lint for:
- `packages/brand`
- `packages/ui-brand`
- `packages/emails`
- `packages/social-formatters`
- `scripts/guardrails/brand-lint.mjs`
- `scripts/guardrails/trust-gate.mjs`

All checks in this pass passed.

## Files Changed By Codex In This Pass
- `package.json`
- `scripts/smoke-launch.mjs` (new)
- `reports/launch/CODEX_LAUNCH_VALIDATION_REPORT_2026-05-28.md` (new)

## Unresolved Launch Blockers / Risks
1. Branch divergence risk
- Claude handoff references `claude/determined-keller-dUcdG` with routes/scripts not present on local `main` at start of this pass.
- Required: reconcile or fast-forward the actual launch branch before production decision.

2. Missing relay artifact in repo state validated
- `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md` absent in local repo when requested.
- Required: restore or regenerate in-repo handoff doc for traceable ownership boundaries.

3. Runtime env readiness not validated in this local pass
- Build/test pass with stub/fallback behavior, but production safety still depends on env correctness (DB/auth/Stripe/live data keys).

## Deployment Safety Verdict
- Code-quality lane verdict for current local tree: **PASS** (`lint/build/typecheck/test/test:brand-safety/test:smoke/guard:trust/lint:brand` all green).
- Production launch safety verdict: **CONDITIONALLY SAFE** only after branch reconciliation with Claude's launch branch and production environment verification.
