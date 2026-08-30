# Autonomous Release Board — Galaxy Sports Edge

**Generated:** 2026-05-29 · **By:** Claude (Opus 4.8) · **Branch:** `claude/awesome-sagan-LOyCa`

The working queue. Classification tags:
`CODEX-SAFE-PATCH` · `CLAUDE-BUILD-REPAIR` · `OWNER-GATED` · `PREVIEW-ONLY` ·
`DEFERRED-NONBLOCKING` · `UNKNOWN-REQUIRES-STATE-VERIFICATION`.

## ✅ Done this pass (Opus 4.8)
| Item | Class | Notes |
|---|---|---|
| Decision Room onward wayfinding + No-Bet/restraint framing | CLAUDE-BUILD-REPAIR | `apps/web/app/room/[gameId]/page.tsx` + test |
| Establish operating backbone (state sync, route contract, golden-path proof, scorecard, this board, next-loop, handoff) | CODEX-SAFE-PATCH (docs) | this directory + `reports/claude/` |
| A11y quick win for picks evidence surfaces | CODEX-SAFE-PATCH | Removed drawer-local cyan focus rings so global plasma focus owns keyboard state; lifted small muted `PickCard` / `EvidenceAuditDrawer` copy to `ion-1`; pinned with `pick-card-a11y` + `audit-drawer-shape` tests. |
| `/picks` in-content trust strip | CLAUDE-BUILD-REPAIR | Composed the shared `RiskDisclosure` card variant with a methodology link near the free-tier paywall; pinned in `picks-page-policy-gate`. |
| Weekly pricing alignment | CODEX-SAFE-PATCH | Replaced stale monthly public price copy with live Stripe sandbox weekly prices: Pro `$9.99/week`, Elite `$13.99/week`; pinned in `pricing-honesty`. |
| Picks/evidence design-token color migration | CODEX-SAFE-PATCH | Migrated raw casino/off-system Tailwind color classes in `PickCard`, `EvidenceAuditDrawer`, and pick label metadata to GSE tokens; pinned in `picks-design-token-integrity`. |
| Picks/evidence mobile tap targets | CODEX-SAFE-PATCH | Added mobile-first stacking and >=44px tap targets for evidence drawer actions; pinned in `picks-mobile-tap-targets`. |
| Odds API retry + public-picks quality floor | CODEX-SAFE-PATCH | Added bounded exponential backoff with jitter for 429/5xx Odds API responses while preserving the 15s timeout; public picks and daily-slate counts now require data quality >=70; pinned in `odds-api-client` and `public-picks-quality-floor`. |
| Settlement snapshot durability | CODEX-SAFE-PATCH | Settlement now retries PickSignalSnapshot outcome writes, treats already-settled rows as idempotent, and creates a minimal fallback learning record when a prediction-time snapshot is missing; pinned in `settlement-snapshot-durability`. |
| Homepage finish doctrine polish | CODEX-SAFE-PATCH | Tokenized the remaining homepage methodology/responsible close surfaces, removed old gray card styling, added reveal-on-scroll rhythm, and landed the page on an Instrument Serif responsible-play ethos; pinned in `homepage-finish-doctrine`. |

## 🔜 Next unblocked (recommended order)
| Pri | Item | Class | Why |
|---|---|---|---|
| 1 | Today's Board doctrine redesign: three telemetry lanes, visible No-Bet/restraint state, freshness/trust context | PREVIEW-ONLY → CLAUDE-BUILD-REPAIR | Next golden-path public decision surface; signature layout requires review |
| 2 | Decision Room doctrine redesign: evidence timeline, Market Pulse, Lens Switcher, pre-mortem, Galaxy Memory close | PREVIEW-ONLY → CLAUDE-BUILD-REPAIR | Convergence dossier is the core confidence surface |
| 3 | `/picks` conversion polish: premium card grid, tasteful tier gate, in-content trust strip maintained server-side | CLAUDE-BUILD-REPAIR | Commercial surface must feel premium without pressure |
| 4 | Trust + conversion surfaces one by one: Methodology, Performance, Ledger, Pricing, Responsible-Play | CLAUDE-BUILD-REPAIR | Bring the full public path to the doctrine bar |
| 5 | Global chrome doctrine pass after surface PRs stabilize | CODEX-SAFE-PATCH | Avoid nav/footer collision while route work is in flight |

## 🔒 Owner-gated (do NOT implement without approval)
- Public **Coach** (implies live AI) · payments activation · public-picks activation ·
  launch-state flip · preview URL · production env vars · Prisma ADR approval ·
  data-rights/legal approval.
- The 6 Zone-3 items (from `WAVE_COMPLETION_REPORT_2026-05-27.md`): Sports-Science Evidence
  Vault schema · Player-Performance adapters + license · RAG vector store · `PlayNote`
  schema · league-data enrollment · OBP/Driveline commercial use.

## ⏸ Deferred (non-blocking)
- **Parlay MRI**, **Academy**, dedicated guided **Demo** route — see Golden Path Proof.

## 🧱 Standing invariants (must stay true)
- No fake/stale data · server-side paywall only · no secrets in code · types strict ·
  tests required · guardrails green · protected engine never client-side.

## Severity legend used across reports
SEV0 trust/security/legal/data/compliance breach · SEV1 core user blocked / release
impossible · SEV2 major degradation · SEV3 feature-specific · SEV4 polish.
**Open SEV0/SEV1: none.**
