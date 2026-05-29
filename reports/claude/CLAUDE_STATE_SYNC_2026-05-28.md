# Claude State Sync — Opus 4.8 Advancement Pass

**Generated:** 2026-05-29 (loop label: 2026-05-28)
**Agent:** Claude (Opus 4.8), review + build pass
**Branch:** `claude/awesome-sagan-LOyCa` · **HEAD:** `728f9c8` ("docs: parity sync Wave 1-3 docs from AI Sports workspace")
**Working tree at sync:** clean · **Remote:** `origin` → Beexly/Sports

---

## 1. Repository facts (proven, not assumed)

| Signal | Value | How verified |
|---|---|---|
| Page routes | **60** | `find apps/web/app -name page.tsx \| wc -l` |
| API routes | **48** | `find apps/web/app/api -name route.ts \| wc -l` |
| Test files | **154** | `__tests__/` inventory |
| Guardrail scripts | 4 + composite | `scripts/guardrails/` |
| Brand `Galaxy Sports Edge` | 82 files | repo grep |
| TypeScript | strict (`^5.4.5`) | `apps/web/tsconfig.json` |
| Node / Next / React | `>=20` / `^14.2.15` / `^18.3.1` | package manifests |

**Guardrails (real commands):**
- `node scripts/guardrails/trust-gate.mjs` — banned-phrase scan over `apps/web/{app,components,lib}` + `packages` (does **not** scan `docs/`/`reports/`). Verified this pass: **OK — 262 files, no banned phrases.**
- `node scripts/guardrails/model-freeze.mjs` — blocks `MODEL_VERSION` bumps without an IMPLEMENTED CalibrationProposal.
- `node scripts/guardrails/draft-only.mjs` — blocks publish-side writes / outbound senders.
- `node scripts/guardrails/claude-api-usage.mjs` — confines Anthropic calls to `apps/web/lib/claude-api/messages.ts`.
- `npm run guardrails` runs all four + `scripts/eval-contracts.mjs`.

**Trust infra (single sources of truth):**
- `apps/web/lib/trust-claims.ts` — 26 claims (10 approved / 3 gated / 13 banned); `scanForBannedPhrases()`.
- `apps/web/components/ui/risk-disclosure.tsx` — reusable `inline`/`compact`/`card`.
- Global `Footer` links Methodology + Responsible-Play (1-800-GAMBLER) + a risk disclaimer site-wide.
- Feature gates: `canExposePublicPicks`, `canExposePerformanceStats`, `canPromoteFeaturedPicks`, `canExposeEdgeIndex`, `isDemoPicksEnabled()`, `isStubMode()`.
- `prefers-reduced-motion` honored globally (`apps/web/app/globals.css`).

---

## 2. Critical finding — the operating framework this loop expects is MISSING

The advancement prompt directs a `SYNC → AUDIT → … → HANDOFF` loop driven by a set of
"READ FIRST" docs. **None of the following exist in this clone:**

- `docs/ops/GALAXY_2026_CURRENT_OPERATING_PLAN.md` (+ `.json`)
- `docs/ops/PLAN_ALIGNMENT_AUDIT.md`, `docs/ops/CURRENT_AGENT_OPERATING_MAP.md`
- `docs/ops/NEXT_AUTONOMOUS_LOOP.md`, `docs/ops/ROUTE_SURFACE_CONTRACT.md` (+ `.json`)
- `docs/ops/DEFINITION_OF_WORLD_CLASS_DONE.md`, `docs/ops/GOLDEN_PATH_PROOF.md`
- `docs/ops/OWNER_GATE_FIREWALL.md`, `docs/ops/AUTONOMOUS_RELEASE_BOARD.md`
- `docs/ops/GALAXY_2026_WORLD_CLASS_SCORECARD.md`, `docs/ops/AGENT_HANDOFF_PROTOCOL.md`
- `docs/ops/RESEARCH_TRIGGER_PROTOCOL.md`
- All `reports/codex/*` (no `reports/codex/` directory exists)

The real ops docs are a different set: `WAVE_COMPLETION_REPORT_2026-05-27.md`,
`PRIMARY_CLONE_SYNC_AUDIT_2026-05-27.md`, `CODEX_DOCS_PARITY_SYNC_BRIEF.md`,
`decision-log.md`, `issue-queue.md`, `stuck-queue.md`, `improvement-backlog.md`, and
`docs/ops/evals/`. `HEAD` is a docs-only parity sync from a separate "scratch" workspace
(`AI Sports`) into this primary clone.

**Interpretation:** the prompt targets a vision/workspace whose governance layer was never
synced here. Per the prompt's own rule — *"if a file is missing, record it; do not assume"*
and *"if the repo does not prove it, it is not true"* — this pass **establishes the missing
backbone** rather than executing a phantom queue.

Golden-path vocabulary is only partly real: `Autopsy` (53 files), `Today's Board` (9),
`Command Center`/cockpit (5), `No-Bet` (2); but `Decision Room`, `Parlay MRI`, `Academy`,
`Decision Coach` appear in **0 files**.

---

## 3. Owner gates (left untouched this pass)

Recorded from `WAVE_COMPLETION_REPORT_2026-05-27.md` (6 Zone-3 items) + constitution:
Sports-Science Evidence Vault schema · Player-Performance adapters + license · RAG vector
store · `PlayNote` schema · league-data enrollment (MLBAM/NGS/Second Spectrum) ·
OBP/Driveline commercial use. Plus: payments activation, live-AI activation, public-picks
activation, launch-state flip, Prisma ADR approval, production env, preview URL.

## 4. Highest open item (real)

`improvement-backlog.md` IMP-003 (scratch→primary parity) is now largely resolved by the
docs parity sync at `HEAD`. `issue-queue.md` / `stuck-queue.md` are clean (no SEV0/SEV1).
The highest-leverage *unblocked* gap this pass addresses: the **Decision Room
(`/room/[gameId]`) had no in-content onward path** — a dead-end on the canonical decision
surface. See `docs/ops/GOLDEN_PATH_PROOF.md`.
</content>
