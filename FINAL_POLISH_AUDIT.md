# Final Polish Audit — Hardening Phase

**Verdict: READY (decision OS green; documented build debt is pre-existing and isolated).**

The Decision Field Organism and its public face are built, tested, and pushed. This hardening pass made
the new surfaces boring-green, closed the trust-gate debt, added the "Why not stronger?" acquisition
clarity, shipped an operator-ready zero-spend Galileo dry-run, and deepened NFL data depth into a
fail-closed decision-state stat matrix. No new architecture — hardening, clarity, de-risking.

## What improved this phase

| Workstream | Result |
|---|---|
| **P0b — trust-gate** | Fully green via scoped technical/disclaimer exemptions. `npm run guardrails` passes (trust-gate scanned 1191 files, 0 banned phrases; secrets clean; 34 eval contracts valid). |
| **P1 — premium UX** | `upgrade: { cappedAt, reason, dataNeeded, requiresLiveData }` added to every card; "Why not stronger?" section in the drawer ties a missing fact to a concrete unlock. Public "scar memory" leak on `/proof/memory` replaced with "What we learned." Drawer links to the learning loop. |
| **P2 — Galileo dry-run** | `npm run galileo:plan` — `$0`, no network, no key read, refuses LIVE. Prices the acquisition stack, checks key presence, previews all 8 atlases. |
| **P3 — NFL data depth** | `decision-state-matrix.ts`: 14 decision states × required/optional facts × free/paid source × legal floor × max-strength-if-missing × blocked surface, plus a provider-unlock map. 12 new tests, all green. `docs/data/DECISION_STATE_STAT_MATRIX.md`. |
| **Tooling** | `build:verify:local`, `typecheck:app`, `guard:decision-surfaces` scripts. |
| **Docs** | This audit · `docs/architecture/WHERE_THINGS_LIVE.md` · `docs/build/PRODUCTION_BUILD_READINESS.md`. |

## Test + build status (measured, not asserted)

- **Decision surfaces:** `npm run guard:decision-surfaces` → exit 0 (all 5 new packages typecheck clean).
- **Package tests:** `nfl-stat-universe` 25/25; runtime copy-hygiene + factory/galileo suites green.
- **Guardrails:** trust-gate / model-freeze / draft-only / claude-api / secret-scan / eval-contracts — all green.
- **App typecheck (`apps/web`):** 204 errors = **52 environmental** (Prisma client not generated in the
  sandbox; CI regenerates it) + **152 pre-existing** admin/lib type-debt across 53 files + **0 from this
  workstream**. The decision-UI, new pages, and new packages are error-free. Full split & fix sequence in
  `docs/build/PRODUCTION_BUILD_READINESS.md`.

## What's still blocked (and why it's honest, not hidden)

1. **Full local `next build`** — gated *in this sandbox only* by the Prisma engine download (`ECONNRESET`
   behind the proxy). CI runs `db:generate` first and is unaffected.
2. **The 152 admin/lib type errors** — pre-existing, mechanical, but only safely fixed against a
   Prisma-generated typecheck (CI or a networked dev box), file-by-file from the concentration table.

## Safety posture (unchanged, verified)

No live gate touched · no `priced=true` · no keys read or committed · no network in tests · no
demo-as-live · no spend / publish / roster writes / account actions / gate flips. Every fact is
point-in-time filtered before decision credit; every claim carries proof obligations; every card has a
permission ceiling; every suppression has a reason; the paywall stays server-side and fail-closed.
Proof is one click away. Internal engine names stay out of public copy (scan-enforced).

## The one owner decision needed

**Galileo Week LIVE requires owner-approved keys + spend.** Everything up to LIVE runs at `$0`
(`npm run galileo:plan`). To execute a real acquisition week, the owner supplies `THE_ODDS_API_KEY` +
`SPORTSGAMEODDS_KEY` (optional `FANTASYDATA_KEY`/`SPORTSDATAIO_KEY`) and approves the monthly budget.
Until then the runner refuses LIVE by design.

## Next highest-leverage move

Run the 152-error admin type-debt cleanup in a Prisma-generated environment (start with
`app/api/admin/dashboard/route.ts` @16 and `lib/board/state.ts` @10). That converts the app build from
"green on CI" to "green everywhere" — the last gap between this and a fully boring-green tree.
