# Where Things Live — orientation map

For a future agent (or future you). When you need to change one thing, this says **which file owns it**,
**what test guards it**, and **what you must never touch without owner approval**. The goal: make it
impossible to get lost, and impossible to flip a safety gate by accident.

## "I want to add / change a …"

| Change | Owner file(s) | Guard / test |
|---|---|---|
| **Data source** | `packages/nfl-stat-universe/src/stat-definition.ts` (`SOURCES`) + `apps/web/lib/scraping/source-rights-registry.ts` (legal status) | `nfl-stat-universe.acceptance.test.ts`; clearance engine `apps/web/lib/scraping/clearance-engine.ts` |
| **Stat / fact** | `packages/nfl-stat-universe/src/nfl-stat-manifest.ts`, `stat-category.ts`; fact taxonomy in `packages/data-intelligence/src/fact-type.ts` | `nfl-stat-universe.acceptance.test.ts` |
| **Decision state** | `packages/nfl-stat-universe/src/decision-state-matrix.ts` (contract) + `packages/decision-field-runtime/src/decision-state-stat-contract.ts` (type) | `decision-state-matrix.test.ts` — keep `maxStrengthIfMissing` **below `ACTION`** |
| **Provider→fact unlock** | `PROVIDER_UNLOCKS` in `decision-state-matrix.ts` | `decision-state-matrix.test.ts` — forbidden lanes must stay empty `[]` |
| **Card copy** (public prose) | `packages/decision-field-runtime/src/run-decision-field-frame.ts` (`buildCard`, `buildUpgrade`), `decision-card.ts` | `__tests__/copy-hygiene.test.ts` + trust/brand scans |
| **"Why not stronger?"** | `buildUpgrade()` in `run-decision-field-frame.ts`; rendered in `apps/web/components/decision/decision-card-drawer.tsx` | `copy-hygiene.test.ts` |
| **Permission strength ladder** | `packages/decision-field-runtime/src/decision-state-stat-contract.ts` (`MaxPermittedStrength`, `STRENGTH_ORDER`), `decision-permission-gradient.ts` | runtime acceptance tests |
| **Public label / glossary** | `apps/web/lib/glossary.ts` (public-label source of truth) | `public-copy-scan-strong.test.ts` |
| **Public page / IA** | `apps/web/app/*` (homepage carries Today; `/edge`, `/gameplan`, `/learn`, `/proof/*`), nav in `apps/web/components/ui/nav.tsx` | `public-copy-scan-strong.test.ts` (add new pages to `SCAN_TARGETS`) |
| **Proof drawer** | `apps/web/components/decision/decision-card-drawer.tsx`; data via the runtime `proofDrawer` on each card | `copy-hygiene.test.ts` |
| **Galileo output / atlas** | `packages/galileo-week/src/atlas-builder.ts`, `week-runner.ts`, `week-plan.ts`; CLI `scripts/galileo-plan.ts` | `packages/galileo-week/src/__tests__/*`; run `npm run galileo:plan` |
| **Readiness gate** | `packages/prediction-engine` `getReadinessGates`; live-data guard `apps/web/lib/integrations/projections.ts` (`isLiveProjections`, `getLiveProjectionsMeta`) | no-demo-as-live tests |
| **Entitlements / paywall** | `apps/web/lib/entitlements.ts` (server-side, fail-closed FREE) | entitlement tests |
| **Pricing** | `apps/web/lib/pricing/pricing-phases.ts` (single source of truth) | pricing tests |

## Verify what you changed

- Decision surfaces (Prisma-free, runs in sandbox): `npm run guard:decision-surfaces` + `npx vitest run <package>`.
- Trust/brand/secrets/evals: `npm run guardrails`.
- Full app build: `npm run build:verify:local` (needs `db:generate` — see `docs/build/PRODUCTION_BUILD_READINESS.md`).

## Never touch without explicit owner approval

These are the irreversible / outward / spend / account levers. Everything here stays **propose-only**
and **owner-gated** — a change must surface as a proposal, never execute itself.

- **The live gate / `priced=true`** — flipping demo or preview surfaces to live, or marking anything priced.
- **API keys / secrets** — never read values, never commit, never add to code (env only).
- **Galileo Week LIVE mode** — `scripts/galileo-plan.ts` and the runner refuse LIVE; only owner-approved
  keys + spend may execute it. PLAN/PREVIEW only by default.
- **The Authority Charter** — `packages/autonomy/src/*`: proposals carry `status: "PROPOSED"`;
  `assertBoundedAutonomy` must keep `SELF` actions bounded and route `OWNER_GATE`/`CLAUDE_REVIEW`/`NEVER`
  upward. Do not widen an action's authority.
- **Roster writes / account actions / publish / send** — all owner-gated; `npm run guard:draft-only`
  enforces no publish/send paths.
- **Internal engine names in public copy** — galileo/einstein/genesis/scar/ghost/conscience/field-stress
  etc. stay in code, admin, and docs only. The trust-gate + copy-hygiene scans bite if they leak.
- **Rights snapshots** — point-in-time; never mutate. Every extracted record carries one.

## The one-paragraph mental model

The five new packages are a pipeline: `nfl-stat-universe` (what facts exist + who supplies them) →
`decision-field-runtime` (turn facts into claim-bounded cards with a permission ceiling) →
`decision-factory` (multi-pass compile + the learning loop / scar memory) → `autonomy` (propose-only
operating plan) → `galileo-week` (owner-gated acquisition experiment). The app (`apps/web`) renders the
cards on public surfaces and enforces the paywall **server-side**. Proof is always one click away. No
card can claim more than its weakest gate allows.
