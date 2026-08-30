# SPRINT BLOCKED LOG

Auto-appended by the GSE sprint executor when a task exhausts its strikes.

---

## P7-07 — Production build verification

**Date:** 2026-08-15
**Status:** BLOCKED (STRIKES: 2)
**Root cause:** `DEV_FAKE_ADMIN=true` is set in `apps/web/.env.local`
(gitignored, local-only file, line 122). Next.js loads `.env.local` during
`npm run build`, setting the env var. The boot-time guard
`assertDevAdminDisabledInProd` in `apps/web/lib/entitlements.ts` (line 34)
hard-fails at module load when `NODE_ENV=production &&
DEV_FAKE_ADMIN=true`, which is exactly the state during a production build.

**Why blocked (not auto-fixed):**
1. The cause file (`.env.local`) is gitignored — cannot be committed.
2. The cause file was NOT touched by this sprint (`git status` confirms
   only `budget-override-control.tsx`, `free-score-persist.ts`, and
   `handoff/*.md` files are modified).
3. `DEV_FAKE_ADMIN` is explicitly owner-gated hardening
   (see `reports/claude/GALAXY_FULL_AUDIT_2026-05-29.md` line 91:
   "do NOT auto-change — protects the launch workflow").

**Attempts:**
- Attempt 1: `npm run build > handoff/build-raw.txt 2>&1` → exit 1 (guard fired).
- Attempt 2 (alternative): `env -u DEV_FAKE_ADMIN npm run build` → exit 1 (same
  guard fired; Next.js loads `.env.local` at framework level, overriding the
  process-level `env -u` unset).

**Resolution required (owner-gated):** Unset or set
`DEV_FAKE_ADMIN=false` in `apps/web/.env.local` (line 122), then re-run
`npm run build`. This is a local environment change only — no commit needed.

**Artifacts:**
- `handoff/build-raw.txt` — raw build output (failure captured).
- `handoff/BUILD_FAILURE.md` — full root-cause diagnosis.
- `apps/web/.next` — removed (`rm -rf`) after capture, per task rules.
