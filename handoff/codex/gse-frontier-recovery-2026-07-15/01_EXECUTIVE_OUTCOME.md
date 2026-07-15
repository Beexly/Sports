# Executive Outcome

The recovery branch turns a fragmented sports-intelligence repository into one fail-closed, replayable evidence spine and makes that spine visible in the real Game Room route.

## Shipped on the branch

- Seven P0 truth failures were repaired or closed: production stub DB, stale actionable prices, Game Room entitlement leakage, market/proof invariants, confidence/calibration contradiction, fictional-news framing, and public fantasy fixtures.
- PRs #76-#101 were reconciled. Unsafe or superseded branches were closed; reproducible invariants were rebuilt on current main; #101 remains an explicit owner-gated schema hold.
- `PickEvidenceEnvelope` now binds decision, market, model, evidence, factors, receipt, settlement, CLV, and calibration under deterministic canonical JSON and SHA-256.
- `IntelligenceEvent` reconstructs the lifecycle from `UNKNOWN` through observed/corroborated/scored, publish-or-pass, settlement, and recalibration only when captured.
- `EpistemicDelta` and `DecisionChangeCertificate` explain recorded transitions with citations while explicitly refusing causal inference.
- PUBLIC, PAID, and COCKPIT projections derive from one canonical object and exclude raw internal output.
- `/room/[gameId]` renders accessible Intelligence Playback with keyboard controls, scrubber, supporting and weakening evidence, reversal conditions, transcript, table, and an honest unavailable state.
- Pure, tested projections feed selected-game Twin, deterministic Brain answer, postgame autopsy, and draft-only Media Studio packages without opening new publication paths.
- Public fantasy routes fail closed behind a real-data release contract. Illustrative player pools cannot render publicly.

## Frontier contribution

The novel product primitive is an **epistemic flight recorder**: a deterministic ledger of what the system knew, what changed, which stored boundary moved, and what evidence weakened the view. It gives users a cited answer to “why did the decision change?” without pretending correlation is causation or turning raw model internals into marketing copy.

## Not claimed

- The public custom domain was verified reachable on 2026-07-15 (`galaxysportsedge.com` redirected to `www`, which returned `200` without a Vercel SSO wall). Vercel identifies the current READY production deployment as `main` SHA `3ce5c4a1`; this recovery branch is not deployed to production.
- Production DB connectivity, cron execution, provider freshness, and real persisted playback rows were not verified.
- No production migration, secret change, production deployment, billing/auth/legal change, publication, or destructive operation occurred.
- Twin, Brain, autopsy, and Studio projections are code-level consumers, not publicly wired product surfaces.
- Current persistence cannot durably reconstruct every historical PASS decision or pick-specific recalibration effect.
