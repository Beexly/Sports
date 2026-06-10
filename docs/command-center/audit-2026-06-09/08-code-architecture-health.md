# 08 — Code / Architecture / Health Audit

**Date:** 2026-06-09
**Lens:** Code, architecture, and engineering health across the two clones.
**Scope:** Monorepo structure, the two-clones drift problem, tech debt, test coverage breadth + quality, TypeScript strictness, build health, dead/shadow/inert code, RSC client-boundary footguns.
**Method:** Read-only. Every finding below cites a real `file:line` or a concrete surface read in one or both clones. Clones are labelled **DEPLOY** = `C:/Users/Garrett/Sports` and **CANONICAL** = `C:/Users/Garrett/Sports-canonical-2026-06-03`.

---

## Grade: B-

**Verdict.** The underlying engineering is genuinely good: strict TypeScript (`strict` + `noUncheckedIndexedAccess` + `noImplicitReturns` + `noFallthroughCasesInSwitch`), near-zero escape hatches (3 `as any` in DEPLOY production `lib/`, ~30 total across CANONICAL incl. tests), effectively zero `TODO/FIXME` (2 in the entire DEPLOY monorepo), a mature CI matrix that runs lint + typecheck + a real-Postgres test job + a separate build job + five dedicated policy/guardrail gates, and a set of hand-written guardrail scripts (`trust-gate`, `model-freeze`, `draft-only`) that are thoughtful, documented, and defensively coded. Build health is structurally sound — neither `next.config.mjs` suppresses TS or ESLint errors. **What pulls the grade down is structural, not local: the two-clones model is actively diverging at the schema, migration, build-command, and CI-trigger layers — and DEPLOY (the launch target) is the *weaker* of the two on exactly the things that matter for shipping correctly** (no migrate-in-build step, missing HSTS in `vercel.json`, a branch CI doesn't fire on, `three.js` typing silenced to `any`, and four unwired shadow packages). The 2x file divergence (DEPLOY ~598 TS files vs CANONICAL ~1244) means any future "promote canonical → deploy" is a large, schema-sensitive merge with no shared branch to diff against. This is the dominant maintainability + shipping risk and it is getting worse, not better, as canonical grows.

---

## Findings by severity

### P0 — Launch-blocking / correctness

#### P0-1 — DEPLOY's `vercel.json` does NOT run migrations at build; CANONICAL does (schema can ship ahead of DB)
- **Clone:** DEPLOY (the bug); CANONICAL has the fix.
- **Evidence:**
  - DEPLOY `vercel.json:3` — `"buildCommand": "cd ../.. && npm run db:generate && npm run build --workspace=@sports/web"` (no migrate step).
  - CANONICAL `vercel.json:3` — `"buildCommand": "cd ../.. && npm run db:generate && node scripts/migrate-if-configured.mjs && npm run build --workspace=@sports/web"`.
  - `scripts/migrate-if-configured.mjs` **exists in CANONICAL, is MISSING from DEPLOY** (`ls` confirmed).
- **Why it matters:** MEMORY records the established invariant "migrations must lead code." DEPLOY is the launch target. As written, a deploy that includes new Prisma columns/tables will build and ship application code that references columns the production DB does not have → runtime `PrismaClientKnownRequestError` on the affected routes. The earlier Airwave fix (`migrate-in-build`, commit 2431271 per MEMORY) lives in canonical's lineage but **was never ported to deploy's `vercel.json`**.
- **Recommendation:** Port `scripts/migrate-if-configured.mjs` into DEPLOY and add the `node scripts/migrate-if-configured.mjs` step to DEPLOY's `vercel.json` build command. Founder-gated only in the sense that it touches prod deploy mechanics — recommend founder review the migration-runner's env gating before flipping, but the *absence* is itself the hazard.

#### P0-2 — DEPLOY's git branch is not covered by the CI triggers → pushes to the launch target may not run CI
- **Clone:** DEPLOY.
- **Evidence:** `.github/workflows/ci.yml:4-7` triggers on `push: branches: [main, "claude/*", "sports-intelligence-os-*"]` and `pull_request: branches: [main]`. DEPLOY's current branch is `safety/sports-wip-2026-06-04` (from `git rev-parse --abbrev-ref HEAD`), which matches **none** of those globs. CANONICAL is on `claude/edge-map-rebuild-2026-06-04`, which **does** match `claude/*`.
- **Why it matters:** The full gate suite (lint, typecheck, test, build, trust-gate, model-freeze, draft-only, brand-safety) only fires for branches in the trigger list. Work committed directly on DEPLOY's `safety/*` branch can land without CI ever running unless a PR is opened against `main`. The launch target is the clone with the weakest automated coverage in practice.
- **Recommendation:** Either (a) bring DEPLOY onto a branch name CI covers, (b) add `safety/*` to the push trigger globs, or (c) make `main` the working branch for deploy and rely on `pull_request: [main]`. Confirm Vercel's production branch and the CI branch are the same line of history.

---

### P1 — Important (quality, trust, shipping correctness)

#### P1-1 — Two-clones drift is real, structural, and widening (schema + migrations + history)
- **Clone:** both.
- **Evidence:**
  - File-count divergence: DEPLOY ~598 TS/TSX files vs CANONICAL ~1244 (≈2.1x) across `apps`+`packages`+`workers` (excl. node_modules). Web API routes: DEPLOY 50 vs CANONICAL 96. `apps/web/lib` subdirs: DEPLOY 32 vs CANONICAL 72. `prediction-engine/src`: DEPLOY 16 files vs CANONICAL 59. `'use client'` components: DEPLOY 14 vs CANONICAL 78.
  - **Migration fork:** both share history through `packages/db/prisma/migrations/20260523031000_seed_claude_api_budgets`. CANONICAL then adds three DEPLOY does not have: `20260603120000_add_pick_clv`, `20260603130000_seed_pick_explanation_budget`, `20260603140000_seed_loss_autopsy_draft_budget` (10 vs 7 migrations).
  - **Schema fork:** the `Pick` model's CLV columns exist only in CANONICAL — `packages/db/prisma/schema.prisma:382-389` (`clvLockLine`, `clvCloseLine`, `clvValue`, `clvVerdict`, etc.). DEPLOY's `schema.prisma` has the same 39 model *names* but is missing those columns (grep for `clv` in DEPLOY schema returns nothing).
  - **Divergent branches with no shared working branch:** DEPLOY `safety/sports-wip-2026-06-04` (877 tracked files) vs CANONICAL `claude/edge-map-rebuild-2026-06-04` (1730 tracked files).
- **Why it matters:** This is the single biggest maintainability risk. There is no clean diff baseline; "promote canonical → deploy" is a large, manual, schema-coupled merge. The CLV columns are the canary: if any canonical CLV-aware code is cherry-picked into deploy without the schema columns + migration, the Prisma client won't type or run those fields. The drift is **bidirectional** (see P1-2/P1-3), so neither clone is a strict superset — you cannot simply "take canonical."
- **Recommendation:** Pick a single source-of-truth branch and reconcile per the existing data-mesh reconcile workstream (MEMORY: research-packet reconcile). At minimum, write down (a) which clone is authoritative for schema, (b) the exact migration delta, and (c) a one-way promotion checklist. Treat schema + migrations as the highest-priority parity item before any canonical feature lands in deploy.

#### P1-2 — DEPLOY carries four shadow workspace packages that no shipping code imports
- **Clone:** DEPLOY.
- **Evidence:** `packages/{brand,emails,social-formatters,ui-brand}` exist only in DEPLOY (CANONICAL `packages/` has none of them). They are imported by **zero** files in `apps/web` (`grep "@sports/brand"` etc. → 0), are **not** listed in `apps/web/package.json` dependencies, and are referenced only by `scripts/guardrails/brand-lint.mjs`. They were introduced in DEPLOY's `safety/sports-wip` commit (`f897fd5 ... brand/emails/social packages`) but never wired into the app.
- **Why it matters:** Inert workspace packages bloat install, confuse "what's actually shipping," and create the illusion of capability (email/social formatting) that the app doesn't use. They are part of why DEPLOY's structure diverges from CANONICAL in a way that *isn't* product surface.
- **Recommendation:** Either wire them in deliberately or remove them. If kept as staging-ground, document them as inert in a package README so a future reader doesn't assume they're live.

#### P1-3 — CANONICAL is missing the `brand-lint` guardrail that DEPLOY enforces (bidirectional gate drift)
- **Clone:** CANONICAL (the gap); DEPLOY has it.
- **Evidence:** DEPLOY `scripts/guardrails/` contains `brand-lint.mjs`; CANONICAL's does not. DEPLOY root `package.json:31` composite `guardrails` script includes `brand-lint.mjs`; CANONICAL `package.json:32` composite omits it. DEPLOY also has `.github/workflows/brand-lint.yml`; CANONICAL does not.
- **Why it matters:** Demonstrates the drift cuts both ways — DEPLOY has a brand gate canonical lacks, while canonical has migrate-in-build + HSTS + instrumentation that deploy lacks. There is no single "more complete" clone, which makes reconciliation a genuine merge rather than a fast-forward.
- **Recommendation:** Define the canonical set of guardrails that BOTH clones must run, and make the `guardrails` npm script + CI identical across clones. Gate drift is the most dangerous kind of drift because it silently weakens enforcement on whichever clone is behind.

#### P1-4 — `three.js` is fully untyped in DEPLOY (`declare module "three"` blanket shim)
- **Clone:** DEPLOY.
- **Evidence:** `apps/web/types/three.d.ts:1` is exactly `declare module "three";` — which types the entire `three` package as `any`. DEPLOY's `apps/web/package.json` depends on `three@^0.184.0` but does **not** include `@types/three` in devDependencies. CANONICAL instead ships real types: `@types/three@^0.184.0` in `apps/web/package.json:57`.
- **Why it matters:** Every three.js call site in DEPLOY type-checks as `any` — no signature checking on the WebGL/3D code, which is exactly the kind of code (matrices, geometries, disposal) where type errors cause silent runtime breakage or memory leaks. It's a deliberate-looking strictness hole in an otherwise strict codebase.
- **Recommendation:** Replace the blanket shim with `@types/three` (as canonical already does) and delete `types/three.d.ts`. If a specific subpath has no types, shim only that subpath, not the whole package.

#### P1-5 — DEPLOY's `vercel.json` is missing the HSTS header that CANONICAL sets
- **Clone:** DEPLOY.
- **Evidence:** `diff vercel.json` shows CANONICAL adds `{ "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }` at `vercel.json:52`; DEPLOY's header block (lines 46-58) has no HSTS entry. Same gap in `next.config.mjs` — CANONICAL sets HSTS at `next.config.mjs:58-61`; DEPLOY's headers (lines 36-44) omit it. (Severity capped at P1 because this is hardening, not a functional break; cross-listed with the security lens.)
- **Why it matters:** The launch target ships without HSTS, weakening transport security relative to the platform's own established baseline (canonical). It's a one-line parity fix.
- **Recommendation:** Add the HSTS header to DEPLOY's `vercel.json` and `next.config.mjs` to match canonical.

#### P1-6 — Latent RSC client-boundary footgun: pure helpers co-located with `node:zlib` in server modules
- **Clone:** CANONICAL (the surface); not present in DEPLOY (these libs don't exist there).
- **Evidence:** `apps/web/lib/trends/nflverse-readiness.ts:1` does a top-level `import { gunzipSync } from "node:zlib"`, and the same module exports the **pure** `latestNflverseInspectionSeason(now = new Date())` at line 47. Eleven server-lib files import `node:` builtins: `lib/{airwave/intake-readiness, fantasy/gm-ledger, nflverse/{birthday-usage-trend,edge-signals,next-gen-stats,player-lab,qb-age-rb-trend,usage-pulse}, synthetic-monitoring/dashboard, trends/nflverse-readiness, trust-ledger/proof-demo}.ts`. CANONICAL has 78 `'use client'` components (5.5x DEPLOY's 14), so the surface that *could* accidentally import a co-located pure helper is large.
- **Current status — verified latent, not live:** no `'use client'` component currently imports `latestNflverseInspectionSeason` or `lib/trends/nflverse-readiness` (its importers are all server routes/server libs — `app/api/trends/nflverse-readiness/route.ts`, `app/trends/page.tsx`, `lib/intelligence/*`, `lib/nflverse/*`). So it is a footgun, not an active bug. MEMORY corroborates this exact class of issue.
- **Counter-evidence (done right):** `apps/web/instrumentation.ts` handles the *same* `node:zlib`-via-graded-pool risk correctly — it dynamically imports under a literal `process.env.NEXT_RUNTIME === "nodejs"` guard so the Edge build dead-code-eliminates it (documented at `instrumentation.ts:11-19`). This is the pattern to generalize.
- **Why it matters:** A single future `import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness"` inside a client component would pull `node:zlib` into the client bundle and break the build (or bloat it). The risk scales with the 78-and-growing client-component count.
- **Recommendation:** Split pure helpers (date math, formatting, type-only exports) out of any module that imports a `node:` builtin into a sibling `*.pure.ts`/`*.shared.ts` with no node imports. Add a lightweight guardrail test (in the same spirit as the existing scanners) asserting no `'use client'` file transitively imports a `node:`-importing module. This converts a latent footgun into a CI-enforced invariant.

---

### P2 — Worth doing

#### P2-1 — `next.config.mjs` and root scripts have drifted in non-trivial ways beyond the security headers
- **Clone:** both.
- **Evidence:** CANONICAL `next.config.mjs` adds `experimental.instrumentationHook: true` (line 15, required for the founder-gate startup hook), transpiles `@sports/ingestion-pipeline` (line 10), and defines `rewrites()` for `/intelligence/*` canonical paths (lines 41-49) — none of which exist in DEPLOY's `next.config.mjs`. CANONICAL root `package.json` adds `test:integration:db`, `db:disposable`, and `@playwright/test` devDependency (lines 16-17, 49); DEPLOY lacks these.
- **Why it matters:** Config drift compounds the P1-1 reconciliation cost. The `instrumentationHook` gap means the founder-gated live-projections startup hook simply does not exist in DEPLOY, which is fine while it's intentionally narrower — but it's another thing a promotion must consciously carry over.
- **Recommendation:** Capture the intended config delta in the promotion checklist (P1-1). Decide per-item whether each canonical-only config belongs in deploy at launch.

#### P2-2 — Stray nested repo copy inside the DEPLOY working tree (`Sports/Sports`)
- **Clone:** DEPLOY.
- **Evidence:** `C:/Users/Garrett/Sports/Sports/` is a full second monorepo copy — its own `.git`, `apps/`, `packages/`, `workers/`, 71 TS files, 1.6M. It is git-ignored (`git check-ignore "Sports/"` → IGNORED) so it does not pollute the tracked tree, but it sits in the working directory and will confuse any recursive tool/search and any human spelunking the repo.
- **Why it matters:** Low functional risk (ignored), but it's a trap: glob/grep tools and new contributors will trip over a stale third copy of the codebase. It also inflates local disk and backup size.
- **Recommendation:** Remove the nested `Sports/Sports` directory from the working tree (it is not tracked, so removal is safe) once confirmed it holds nothing unique.

#### P2-3 — `_overnight_quarantine/` debris and committed lock-file artifacts
- **Clone:** DEPLOY (CANONICAL also has `_overnight_quarantine` + `_logs`).
- **Evidence:** DEPLOY `_overnight_quarantine/` contains `api-picks-elite.test.ts.bad`, `index.lock-current`, `index.lock.bak`, `index.lock.moved-11212`, `index.lock.removed`. The directory is git-ignored (`.gitignore:57`), so it's not tracked, but a quarantined `.bad` test file means a test was disabled by renaming rather than fixing or deleting.
- **Why it matters:** A `.test.ts.bad` is a silently-dropped test — coverage you think you have but don't. It's also a smell that something failed and was parked rather than resolved.
- **Recommendation:** Triage the quarantined test (fix + restore, or delete with a note). Clean the lock-file debris. Quarantine dirs should be empty in a healthy tree.

#### P2-4 — `exactOptionalPropertyTypes` is the one strict knob left off
- **Clone:** both (identical `tsconfig.base.json`).
- **Evidence:** `tsconfig.base.json:8` — `"exactOptionalPropertyTypes": false` (everything else strict: `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch` all on).
- **Why it matters:** Minor. `exactOptionalPropertyTypes` catches a real class of `undefined`-vs-absent bugs, especially around optional API payload fields. Given how strict the rest of the config is, this is a small, defensible gap — turning it on can be noisy.
- **Recommendation:** Optional. Consider enabling it on a future cleanup pass and fixing the fallout; not a launch concern.

---

### P3 — Minor / polish

#### P3-1 — Large single-file components (~1,200 lines)
- **Clone:** CANONICAL.
- **Evidence:** Largest source files: `components/intelligence/engine-view.tsx` (1204 lines), `components/slate-twin/galaxy-slate-twin.tsx` (1149), `lib/players/views.tsx` (1130), `components/players/player-lab-table.tsx` (1000), `app/api/admin/dashboard/route.ts` (722), `lib/cockpit/intelligence-control-plane.ts` (716).
- **Why it matters:** Not pathological for a data-viz-dense product, but 1,000+-line components are harder to test in isolation and review. `lib/players/views.tsx` is also the lone `.tsx` in CANONICAL's `lib/` (a view module living under `lib/` rather than `components/` — a small structural inconsistency).
- **Recommendation:** Opportunistically decompose the largest components when next touched; move `lib/players/views.tsx` toward `components/` to keep `lib/` non-JSX.

---

## Strengths (real, grounded)

1. **TypeScript strictness is genuinely strong.** `tsconfig.base.json:7-11` enables `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`. Both clones inherit it.
2. **Escape hatches are rare.** DEPLOY has **3** `as any`/`@ts-ignore` in production `lib/` (5 more in tests); CANONICAL ~30 total across a 1,244-file tree incl. tests. **Zero** `eslint-disable` in DEPLOY app/lib/components. This is unusually disciplined.
3. **Effectively zero rotting debt markers.** **2** `TODO/FIXME` in the entire DEPLOY monorepo (apps+packages+workers); 0 in the app surface of either clone.
4. **Build health is not faked.** Neither `next.config.mjs` sets `typescript.ignoreBuildErrors` or `eslint.ignoreDuringBuilds`. Lint runs with `--max-warnings=0` (`apps/web/package.json:9`) and `no-explicit-any` is a warning — so even an `any` fails the build.
5. **The guardrail scripts are real engineering, not theater.** `scripts/guardrails/trust-gate.mjs` (banned-phrase scanner with whitelist + comment-aware line filtering), `model-freeze.mjs` (blocks `MODEL_VERSION` bumps without an IMPLEMENTED `CalibrationProposal` — three evidence forms, local-state-only), and `draft-only.mjs` (blocks publish-side writes / auto-send paths). All three are well-documented and defensively coded.
6. **CI is a mature matrix.** `.github/workflows/ci.yml` runs a real-Postgres test job (lint + typecheck + `prisma validate` + `db:push` + full test suite), a separate build job, and dedicated `trust-gate`, `model-freeze`, `draft-only`, composite `guardrails`, and `brand-safety` jobs. Identical across both clones.
7. **Test breadth is large and policy-focused.** DEPLOY 158 `__tests__` files / 171 test files total; CANONICAL 224 / 336. The suites encode product *invariants* (public-copy banned phrases, performance policy, readiness gates, cockpit nav coverage, stub-mode contracts) — not just unit coverage.
8. **The hardest RSC/runtime footgun is handled correctly where it counts.** `apps/web/instrumentation.ts` dynamically imports the `node:zlib`-pulling graded pool under a literal `NEXT_RUNTIME === "nodejs"` guard so Edge dead-code-eliminates it, and the gate logic is extracted and unit-tested (`__tests__/instrumentation-gate.test.ts`, 5 cases incl. "never fabricates," "never crashes startup," founder-gate-holds-when-unset).
9. **Sensible monorepo shape.** Clean `apps/web` + `packages/*` + `workers/*` workspaces; `next.config.mjs` transpiles workspace packages and aliases `.js`→`.ts` for ESM-style source imports; `serverComponentsExternalPackages: ["@prisma/client"]` is correct.

---

## What would move this from B- to A

1. **Resolve P0-1 and P0-2.** Port `migrate-if-configured.mjs` + the build-command migrate step into DEPLOY, and put DEPLOY on a CI-covered branch (or extend the triggers). The launch target must run migrations at deploy and run CI on every push. These two alone are the difference between "ships correctly" and "ships and then 500s on a missing column."
2. **Kill the two-clones drift as a *standing* risk, not a one-time merge.** Declare one authoritative branch, write a one-way promotion checklist (schema → migrations → config → guardrails → code), and reconcile the known deltas (CLV schema/migrations, instrumentation hook, rewrites, OSS deps). Add a CI/parity check that diffs `schema.prisma`, the migrations list, the `guardrails` npm script, and `vercel.json`/`next.config.mjs` headers between clones and fails on unexpected drift. Drift that can't silently grow is drift that's survivable.
3. **Make gate enforcement identical across clones.** Unify the guardrail set (DEPLOY's `brand-lint` ↔ CANONICAL's instrumentation gate) so neither clone is silently weaker. A gate that runs on only one clone is a gate you can't trust at launch.
4. **Close the strictness holes.** Replace DEPLOY's `declare module "three"` with `@types/three`; add a guardrail test that asserts no `'use client'` module transitively imports a `node:`-importing file (turning P1-6 from latent footgun into enforced invariant); split pure helpers out of the 11 node-builtin server libs.
5. **Sweep the debris.** Remove the nested `Sports/Sports` copy, empty `_overnight_quarantine/` (triage the `.bad` test), and document or delete the four unwired DEPLOY packages. A clean tree makes every future audit and merge faster and lowers the chance of editing the wrong copy.

---

## Cross-references
- **Data-source state** is covered by the parallel data-mesh workstream (`docs/command-center/data-mesh/00-01,10-14`); this lens audits structure/health only and defers source reconciliation there.
- **Security headers (P1-5)** overlap the security lens — listed here as a clone-parity/config-drift finding.
- **Founder/legal gating** (instrumentation projections provider, `PROJECTIONS_PROVIDER`, MODEL_VERSION freeze) is respected as-is: all are inert-by-default and founder-gated. No flip recommended.
