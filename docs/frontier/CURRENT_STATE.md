# GSE Frontier Current State

**Status:** ACTIVE
**Last verified:** 2026-07-17 (this session, command evidence in DEC-001/DEC-004, extended through DEC-020)
**Base SHA:** `c179a78` (origin/main, PR #120)
**Active branch/worktree:** `claude/galaxy-sports-edge-pdcswh` (pushed; superset of main)
**Active workstream:** none — W002 DONE (DEC-009); W-OTS DONE all 3 slices (DEC-010/011/013); W-MCP DONE slice 1 + Phase 2.1 + Phase 2.3 (DEC-012/017/019); W-WEATHER-REC DONE (DEC-014); W003 Reality Receipt v0 DONE + Phase 2.2 Merkle-inclusion leg (DEC-015/018); W004 SportsIR v0 DONE (DEC-016). Master plan approved 2026-07-17 (founder). GG-000 Genesis Convergence Map DONE on PR #126 (docs-only). GX-000/GG-001 unified genesis-kernel build DONE on its own branch, draft PR #127 open (founder-gated merge); a separate unrelated pre-existing CI bug found + fixed as PR #128 (also founder-gated). Phase 2 follow-ups: 2.1/2.2/2.3/2.4 DONE. Next: Phase 3 (W005).

## Verified facts

- Main (through #120) has: The Odds API + nflverse ingestion, pick engine v5.1.0, settlement + CLV capture, calibration pipeline, sealed-slate Merkle commitments, Glass Ledger + proof receipts API, watchlist, tools hub, fantasy August draft pool, Stripe subscriptions (founding ladder), cockpit (layout-level admin gate), guardrail suite + CI.
- W000 slice 1 DONE on this branch: PR #119's settlement side-derivation fix + scanner/CI hardening recovered onto c179a78; third commit (fixture alignment) proved already-on-main. Full gates green (prediction-engine 1440, ingestion-pipeline 119, web 8252, guardrails, typecheck, lint, build 214 pages). Red-team: APPROVE-WITH-NOTES (DEC-004).
- Founder orchestrator overlay (GSE_FRONTIER_ORCHESTRATOR_1.zip) installed and reconciled with the session-built control layer; canonical ledger names are the overlay's.
- Open PRs verified 2026-07-17: #119 (recovered here), #121, #122, #123, #124, #112 (draft), #101 (superseded by #122), #52 (stale base). All based at e9fab35 (#118) or older.
- W001 DONE: governed playback spine (PickEvidenceEnvelope, IntelligenceEvent lifecycle, epistemic deltas, decision-change certificate, audience projections) + Game Room playback consumer ported from PR #112 with three semantic grafts; entitlement narrowings declared in DEC-008; red-team APPROVE-WITH-NOTES with both fail-closed hardenings applied. Gates: targeted 50 + full web 8,323 green, tsc/lint/guardrails green, build 214 pages.
- W002 DONE: bitemporal Worldline v0 (`apps/web/lib/worldline`) — as-of reads, semantic diffs, exact-attribution replay-stability audit, canonical digests. Verifier found and both blockers were fixed (DEC-009).
- W-OTS DONE end to end: verbatim-ported, live-verified OpenTimestamps primitive (`packages/crypto/src/ots-anchor.ts`) → additive `otsProof`/`otsBitcoinHeight` storage → fail-open mint-path wiring + `/api/proof/ots/[slateKey]` → `upgradeDetached` + gated nightly `/api/cron/ots-upgrade` poll (DEC-010/011/013). `OTS_ANCHOR_ENABLED` default off.
- W-MCP DONE: the founder's galaxy-proof-mcp 7-tool contract hosted in-process at `/api/mcp` (streamable-HTTP JSON-RPC), zero new infra (DEC-012) + an 8th tool `get_reality_receipt` (Phase 2.1, DEC-017) + the same 7-tool contract vendored standalone at `packages/galaxy-proof-mcp-stdio` for local Claude Desktop/Cursor installs, byte-identical to the founder's original packet (Phase 2.3, DEC-019).
- W-WEATHER-REC DONE: vendored as-of Open-Meteo loader + adapter into the existing leak-gated edge-lab feature builder — complementary layers, not duplicates (DEC-014). One open gate before any real historical admission run: the packet's §2 strict previous-runs smoke.
- W003 DONE: Reality Receipt v0 (`apps/web/lib/reality-receipt`) composes the W001 envelope digest + the pick-proof hash-chain receipt's live tamper check + the W-OTS Bitcoin-anchor status into one reproducible object. `GET /api/proof/reality/[gameId]` (JSON) + `/image` (PNG via `next/og`), FREE-tier-only fail-closed by construction (DEC-015). 31 new tests; tsc/lint clean on changed files. Phase 2.2 (DEC-018) added a `slateInclusion` Merkle-inclusion leg, gated to the receipt's own SEALED/OPEN disclosure timing after a gse-red-team pass caught premature pre-kickoff hash exposure in the first cut.
- W004 DONE: SportsIR v0 (DEC-016) — see WORKSTREAM_QUEUE.md.
- GG-000 DONE (docs-only, on PR #126): `docs/frontier/GENESIS_CONVERGENCE_MAP.md` rules GG-001 ≡ GX-000's build — exactly one implementation satisfies both founder control-package queues.
- GX-000/GG-001 DONE: `packages/genesis-kernel` (Codebase Twin v0 + Metacortex Plan Compiler v0), shadow-only, zero production imports, 26 tests, independent gse-verifier PASS on all 13 checklist items. Draft PR #127 open — founder merge only; do not begin GX-001 without a fresh founder signal.
- PR #128 (unrelated, found while opening #127): a pre-existing `commercial-copy-scan` self-trigger on `apps/web/app/tools/page.tsx`'s own doc comment, blocking "All guardrails" green on `main` regardless of any PR's diff. One-line comment fix, non-draft, founder merge only.
- Phase 2.4 DONE (DEC-020): the GX-000 Codebase Twin's flagged source-rights-registry "duplicate" turned out to be a pure 18-line re-export shim with zero independent data — deleted, three consumers + the barrel re-pointed to the canonical `apps/web/lib/scraping/source-rights-registry.ts` (860 lines, untouched — zero-line diff). gse-red-team CONFIRMED clean on all 6 checks; minimum fix required: none. 125 tests green.

## Owner gates

- OG-001 (DEC-005): merging #119/#121–#124 to main and applying #122's additive migrations are founder-only. PRs stay open; #119's content is additionally de-risked on this branch.
- Merging PR #127 (genesis-kernel) and PR #128 (guardrail fix) to main are founder-only, as with every prior workstream this session.

## Next action

Phase 3: W005 Intelligence Contract v0 — persistent user-maintained intelligence over
watchlist entities, compiled against the Worldline/SportsIR spine (W002 ✓, W004 ✓). Decide
`IntelligenceContract` type reuse from `@sports/genesis-kernel` (still on its own unmerged
branch/PR #127) by evidence at start time — either recover it onto this branch or
type-mirror until founder merges.
