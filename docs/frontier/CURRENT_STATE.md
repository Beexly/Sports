# Current State — 2026-07-17

Baseline: `origin/main` @ `c179a78` (PR #120 Glass Ledger + Edge Engine). Working branch `claude/galaxy-sports-edge-pdcswh`.

## What main has (merged through #120)

- Real ingestion (The Odds API + nflverse PBP + player stats cron), pick engine v5.1.0, settlement + CLV capture, calibration pipeline, sealed-slate Merkle commitments, Glass Ledger proof surface, proof receipts API, watchlist, tools hub, fantasy August draft pool, Stripe subscriptions (Pro/Elite/Fantasy, founding ladder), cockpit (layout-level admin gate), guardrail script suite + CI.

## Open recovery inventory (see RECOVERY_MATRIX.md for classification)

- **#119** settlement mis-grade fix + scanner/CI hardening — RECOVERED onto this branch (W000, this session).
- **#123** per-page cockpit admin (32 pages, scan-enforced) — clean, base #118, founder-mergeable.
- **#122** CLV decomposition + Pedersen aggregate re-land — migration-safety proven; OWNER_GATE (founder applies migrations).
- **#121** fantasy-engine floor (~7.2k lines, golden-verified) — trademark rename must land before public surfacing.
- **#124** frontier fabric: Agent Foundry, Assurance, Resource Radar, shadow router (~7.5k lines, added-file-only port).
- **#112** governed intelligence playback (`PickEvidenceEnvelope`) — DRAFT, Codex branch, base #115; strongest seed for Reality Receipts.
- **#101** superseded by #122. **#52** Galaxy Dynasty world graph — stale base, big, playable-layer only.

## Known frictions

- PRs #121/#123 share `require-admin.ts`; #121/#119 shared the fixture fix (now on this branch) — trivial either-order resolution.
- All open PRs are based on #118 (`e9fab35`) or older; main is one commit past that.
