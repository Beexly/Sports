# GSE Frontier Current State

**Status:** ACTIVE
**Last verified:** 2026-07-17 (this session, command evidence in DEC-001/DEC-004, extended through DEC-015)
**Base SHA:** `c179a78` (origin/main, PR #120)
**Active branch/worktree:** `claude/galaxy-sports-edge-pdcswh` (pushed; superset of main)
**Active workstream:** none — W002 DONE (DEC-009); W-OTS DONE all 3 slices (DEC-010/011/013); W-MCP slice 1 DONE; W-WEATHER-REC DONE (DEC-014); W003 Reality Receipt v0 DONE (DEC-015); W004 SportsIR v0 DONE (DEC-016). Master plan approved 2026-07-17 (founder): next is GG-000 Genesis Convergence Map (PR #126, docs-only) then the GX-000/GG-001 unified genesis-kernel build (PR #125 contract) in separate worktrees from main, then Phase-2 follow-ups (8th MCP tool, W003 inclusion leg, stdio MCP vendoring, duplicate rights-registry reconciliation), then W005.

## Verified facts

- Main (through #120) has: The Odds API + nflverse ingestion, pick engine v5.1.0, settlement + CLV capture, calibration pipeline, sealed-slate Merkle commitments, Glass Ledger + proof receipts API, watchlist, tools hub, fantasy August draft pool, Stripe subscriptions (founding ladder), cockpit (layout-level admin gate), guardrail suite + CI.
- W000 slice 1 DONE on this branch: PR #119's settlement side-derivation fix + scanner/CI hardening recovered onto c179a78; third commit (fixture alignment) proved already-on-main. Full gates green (prediction-engine 1440, ingestion-pipeline 119, web 8252, guardrails, typecheck, lint, build 214 pages). Red-team: APPROVE-WITH-NOTES (DEC-004).
- Founder orchestrator overlay (GSE_FRONTIER_ORCHESTRATOR_1.zip) installed and reconciled with the session-built control layer; canonical ledger names are the overlay's.
- Open PRs verified 2026-07-17: #119 (recovered here), #121, #122, #123, #124, #112 (draft), #101 (superseded by #122), #52 (stale base). All based at e9fab35 (#118) or older.
- W001 DONE: governed playback spine (PickEvidenceEnvelope, IntelligenceEvent lifecycle, epistemic deltas, decision-change certificate, audience projections) + Game Room playback consumer ported from PR #112 with three semantic grafts; entitlement narrowings declared in DEC-008; red-team APPROVE-WITH-NOTES with both fail-closed hardenings applied. Gates: targeted 50 + full web 8,323 green, tsc/lint/guardrails green, build 214 pages.
- W002 DONE: bitemporal Worldline v0 (`apps/web/lib/worldline`) — as-of reads, semantic diffs, exact-attribution replay-stability audit, canonical digests. Verifier found and both blockers were fixed (DEC-009).
- W-OTS DONE end to end: verbatim-ported, live-verified OpenTimestamps primitive (`packages/crypto/src/ots-anchor.ts`) → additive `otsProof`/`otsBitcoinHeight` storage → fail-open mint-path wiring + `/api/proof/ots/[slateKey]` → `upgradeDetached` + gated nightly `/api/cron/ots-upgrade` poll (DEC-010/011/013). `OTS_ANCHOR_ENABLED` default off.
- W-MCP slice 1 DONE: the founder's galaxy-proof-mcp 7-tool contract hosted in-process at `/api/mcp` (streamable-HTTP JSON-RPC), zero new infra (DEC-012).
- W-WEATHER-REC DONE: vendored as-of Open-Meteo loader + adapter into the existing leak-gated edge-lab feature builder — complementary layers, not duplicates (DEC-014). One open gate before any real historical admission run: the packet's §2 strict previous-runs smoke.
- W003 DONE: Reality Receipt v0 (`apps/web/lib/reality-receipt`) composes the W001 envelope digest + the pick-proof hash-chain receipt's live tamper check + the W-OTS Bitcoin-anchor status into one reproducible object. `GET /api/proof/reality/[gameId]` (JSON) + `/image` (PNG via `next/og`), FREE-tier-only fail-closed by construction (DEC-015). 31 new tests; tsc/lint clean on changed files.

## Owner gates

- OG-001 (DEC-005): merging #119/#121–#124 to main and applying #122's additive migrations are founder-only. PRs stay open; #119's content is additionally de-risked on this branch.

## Next action

`/gse-run next` — W004 SportsIR v0 is unblocked (W002 ✓, W003 ✓). Lower-effort
parallel options still open with zero new founder input: vendor the stdio
galaxy-proof-mcp packet for local Claude Desktop/Cursor installs; an 8th MCP
tool wrapping `loadRealityReceipt`; W003's deferred Merkle-inclusion-proof
leg.
