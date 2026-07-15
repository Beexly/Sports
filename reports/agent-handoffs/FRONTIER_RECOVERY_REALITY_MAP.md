# GSE Frontier Recovery Reality Map

Verified: 2026-07-15

Branch: `codex/gse-frontier-recovery-2026-07-13`

Base inspected: `origin/main@3ce5c4a198df7f9baac37888de4f28297e24f581`

This is repository truth, not a production-readiness claim. `REAL` means executable code exists and has a real-data path within the stated boundary. It does not mean the production database, credentials, cron history, or deployed SHA were verified. `PARTIAL` means useful executable pieces exist without the complete named product. `DEMO` means an explicitly illustrative runtime path still exists. `DOC_ONLY` means design or governance exists without the named runtime. `ABSENT` means the required durable field or writer was not found.

## Product and intelligence surfaces

| Area | Status | Repo evidence | Exact boundary / next proof |
|---|---|---|---|
| Public odds, picks, proof, and settlement | `REAL` | `packages/ingestion-pipeline/src/process-sport.ts`, `settle-sport.ts`; `Pick`, `Odds`, `PickProofReceipt` in `packages/db/prisma/schema.prisma`; public board/pick/proof routes and tests | Real code and fail-closed gates exist. Production DB rows, active cron history, and deployed identity remain unverified. |
| CLV | `REAL` | `packages/prediction-engine/src/clv-capture.ts`; immutable lock/close fields on `Pick`; `/clv`, `/api/clv`, and focused CLV tests | Aggregate and pick CLV are implemented. PR #101's four additional decomposition fields remain owner-gated and unmerged. |
| Calibration and public performance | `REAL` for aggregate population; `ABSENT` for immutable per-pick calibration effect | `apps/web/lib/calibration/**`, `apps/web/lib/performance/canonical-population.ts`, `/performance`, `/api/calibration`; no pick-to-calibration-effect model | The canonical aggregate report is executable and probability-gated. Intelligence Playback must say `NOT_CAPTURED` for a pick-specific recalibration effect. |
| nflverse source and player-stat foundation | `REAL` code; live operations unverified | `packages/data-ingestion/src/nflverse-source.ts`, `nflverse-ngs.ts`; `Player`, `PlayerGameStat`, historical/team/player models in Prisma; `/nflverse` and multiple source-backed APIs | The old missing-model audit is stale: the models now exist. No claim is made that every production table is populated nightly. |
| Trend Lab | `PARTIAL` | `/trends`, `apps/web/lib/trends/workbench.ts`, live nflverse cohort loaders, deterministic trend engine/tests | Direct source-backed cohort reports exist. The stored workbench intentionally publishes no placeholder observations, and its own note says persistence is still required. |
| Public fantasy tools | `DEMO`, publicly blocked | illustrative fantasy modules remain under `apps/web/lib/fantasy/**`; `apps/web/lib/fantasy/public-gate.ts` and middleware redirect public tools; 27 focused assertions and prior browser receipts | The honest public gate is real. The underlying projections remain illustrative and must not be reopened until a rights-cleared provider, freshness policy, and ingestion proof exist. |
| Entity Graph | `PARTIAL` | `apps/web/lib/intelligence-graph/index.ts` is a typed read model over game, pick, and signal inputs | It is not the universal entity-resolution graph described in `docs/brain/entity-graph.md`. |
| Named Evidence Vault | `DOC_ONLY` | `docs/brain/evidence-vault.md` and dependency docs explicitly require schema approval; related real primitives are `SourceSnapshot`, `PickProofReceipt`, and new `PickEvidenceEnvelope` | Do not rename the existing primitives into a completed Vault. A cross-entity evidence store, admission workflow, and retrieval API are not implemented. |
| Signal Ledger | `PARTIAL` | `packages/prediction-engine/src/signal-ledger.ts`, `GameSignal`, `PickSignalSnapshot`, migration and tests | Engine ledger semantics and persisted game/pick snapshots exist; the universal Brain ledger that references Vault evidence does not. |
| Source health and rights | `PARTIAL` | `packages/data-ingestion/src/source-health.ts`, source registry/tests; `apps/web/lib/source-rights/**`, `lib/ip/**`, rights fences | Policy and evaluators are real. End-to-end operational telemetry and clearance coverage across every provider are not proven. |
| Market Gravity | `REAL` metric | `packages/prediction-engine/src/metrics/market/market-gravity-index.ts` and tests; Observatory market board | It measures market conviction/agreement, not truth or outcome probability. |
| Command palette and operator command center | `REAL` | `apps/web/components/ui/command-palette.tsx`; Cockpit palette; `apps/web/lib/command-center/**`; admin-gated `/cockpit/command-center` | Feed declares per-lane `live`, `live_with_labeled_fallbacks`, or `unavailable`; production lane states are not asserted here. |
| Nova presenter / audio | `DEMO` | admin-only `/fantasy/studio`, `StudioHost`, `ILLUSTRATIVE_NOTE`, synthetic-presenter disclosure | Script/presenter preview only. No autonomous external publication, synthetic-likeness video, or production audio claim. |
| Media Studio | `PARTIAL` | admin-gated `/cockpit/media`; `apps/web/lib/media/control-plane.ts`; media readiness tests | Read-only/draft-only/founder-gated/manual-export control plane. No automatic publishing or social posting. |
| Ask the Brain | `PARTIAL` deterministic adapter; named product remains incomplete | `apps/web/lib/intelligence-playback/consumer-projections.ts` builds a cited deterministic answer from the canonical stream; `docs/brain/ask-the-brain.md` still requires the wider Vault/Graph/Ledger product | The adapter is real and tested but is not wired to a Cockpit route. `/stats/ask`, pick `AskWhy`, and Model Court remain separate bounded products. |
| RAG and retrieval evals | `DOC_ONLY` / bounded prompt evals only | `docs/models/ragflow-governance.md` states no third-party RAG framework is installed; `docs/ops/evals/**` contains contracts | No Vault-backed vector store or audited retrieval log exists. Do not market a RAG product. |
| Sports-science vault | `DOC_ONLY` | `docs/performance/sports-science-evidence-vault.md` explicitly labels itself doctrine; related performance plans require license review | No approved sports-science evidence schema, licensed provider ingestion, or public performance claim path. |

## Canonical playback vertical slice

| Component | Status | Evidence |
|---|---|---|
| `PickEvidenceEnvelope` | `REAL` bounded slice | `apps/web/lib/intelligence-playback/build-envelope.ts`, deterministic canonical JSON/digest, exact captured/not-captured evidence, factor bindings, publication eligibility, receipt/settlement/CLV/calibration states |
| One audience policy | `REAL` | `apps/web/lib/intelligence-playback/project.ts` projects PUBLIC, PAID, and COCKPIT from one envelope; PUBLIC/PAID never receive raw internal output and PUBLIC omits movement/dispersion |
| `IntelligenceEvent` lifecycle | `REAL` bounded slice | `UNKNOWN -> OBSERVED -> CORROBORATED -> SCORED -> PUBLISHED|PASSED -> SETTLED -> RECALIBRATED` in `events.ts`; public event projection in `event-projection.ts` |
| Epistemic delta / decision certificate | `REAL` bounded slice | `epistemic-deltas.ts` deterministically reports evidence, source, boundary, contradiction, representation, and market transitions with event citations and an explicit no-causality contract |
| Stored Game Room adapter | `REAL` for complete published chains; `PARTIAL` for PASS | `room-adapter.ts`, `room-evidence.ts`, and `game-room/evidence-record.ts` bind Pick, GateDecision, Odds, SourceSnapshot metadata, signals, proof, settlement and CLV without selecting raw source payloads | Current `GateDecision` cannot store a complete offered market and threshold, and no GateDecision writer was found. Stored PASS events therefore withhold rather than invent. |
| `/room/[gameId]` playback | `REAL` bounded slice | server-entitled loader returns digest, publication, projected events, deltas, and a decision certificate; `IntelligencePlayback` supplies scrubber, controls, keyboard arrows, current change, both evidence directions, provenance, reversal condition, cited why answer, transcript, and table | The route displays an honest unavailable state when there is no persisted rights-cleared chain. It does not substitute demo events. |
| Twin/Observatory shared playback | `PARTIAL` pure adapter | `consumer-projections.ts` derives a selected-game Twin read model from the canonical stream; tests prove withheld/raw-output behavior | No Twin/Observatory route consumes it yet. Observatory still uses its own gated `getSlateTwin()` provider and explicit `DEMO_SLATE` fallback. |
| Autopsy, Media Studio, deterministic cockpit explanation consumers | `PARTIAL` pure adapters | `buildPlaybackConsumerBundle()` derives postgame autopsy, cited Brain answer, and draft-only Studio scenes; tests pin no raw output and `autoPublishAllowed: false` | The adapters are not route-wired. Existing products retain separate inputs/control planes until a real eligible persisted record is available. |

## Current proof from this slice

- 54/54 focused tests passed across envelope, exact proof/gate binding, temporal and boundary consistency, post-decision evidence exclusion, evidence-ID collision handling, audience projection, stale active-factor policy, capability isolation, stored gate-status consistency, room paywall, route wiring, outage behavior, UI interaction, epistemic deltas, cited decision certificates, and consumer projections.
- Web TypeScript passed after page integration.
- Web lint passed with zero warnings after replacing one empty-interface style violation with a readonly type alias.
- Playwright renderer QA passed at 1440x900 and 390x844 with reduced motion: controls and keyboard state changes, focus, transcript/table, both evidence directions, delta/certificate/citations, main landmark, no raw marker, no horizontal page overflow, and no console/page errors. Axe-core reported zero WCAG A/AA violations, and 200% text zoom caused no page-level overflow. The temporary fixture route was deleted after capture; these receipts prove the renderer, not live production data.
- No migration, production write, secret change, billing/auth/legal edit, publication action, or PR merge was performed.

## Decisions

1. One canonical envelope is the truth object; events and audience projections are derived views.
2. A missing field is `NOT_CAPTURED`, never inferred from a nearby score or later quote.
3. The public Game Room receives no raw source payload, raw internal model output, paid-only movement, or unentitled factor trail.
4. Legacy PASS decisions remain withheld until an immutable decision snapshot and an actual writer exist.
5. Historical rows will not be guessed into compliance. Any future backfill must prove every source, quote, threshold, and effective time or leave the row unavailable.
