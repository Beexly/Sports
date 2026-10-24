Task: port the matchup REFUSAL CONTRACT into the Sports worktree. Read-only reconnaissance is done; this is a code task. Work ONLY inside C:\Users\Garrett\Sports-wt-pick-gate (branch hermes/book-pick-verdict-gate).

Source material (read these first):
- C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\matchup-refusal.md — contains the full quoted contract from stale branch claude/edge-map-rebuild-2026-06-04 (sourceError factory, gating-vs-enrichment policy, leaf withhold).

Create exactly two files:

1. C:\Users\Garrett\Sports-wt-pick-gate\apps\web\lib\intelligence\matchup-contract.ts
   - Types only + pure functions. NO network, NO fetch, NO db, NO weight constants, NO reference bands. The engine is NOT ported — only the refusal contract.
   - Port these pieces, citing the stale branch in the header comment:
     a) MatchupSourceStatus = "live" | "source-error" (plus "empty" if needed for the empty-but-successful read)
     b) The sourceError() factory shape: generatedAt, status:"source-error", season, week, rows:[], gamesCovered:0, matchupsRead:0, canPublishProjections:false, note (honest user-facing withholding note), sourceUrls, error
     c) The GATING vs ENRICHMENT two-tier policy as a pure decision function: given {playerModel: {status, profiles}|null, schedule: {status, rows}|null, environment, pressureCoverage}, return either a sourceError result (when a GATING source is missing, status==="source-error", or length 0) or a live result with canPublishProjections:false on BOTH paths. The `status === "source-error" || length === 0` pairing that catches an empty-but-successful read is load-bearing — keep it.
     d) The leaf withhold: computeMatchupDeltaLeaf(opp: unknown | null, contributions: readonly unknown[]) returns {delta:null, grade:"unknown", topDriver:null, topMagnitude:0} when opp is null OR contributions.length===0. No numeric delta is ever computed in this file.
     e) matchupsRead counts only non-null deltas (never overstates coverage).
   - Header comment: ported refusal contract from claude/edge-map-rebuild-2026-06-04; the hand-weighted delta (MAX_DELTA=12, W_DEF_EPA=7, POS_SENSITIVITY, reference bands) is deliberately NOT ported — no out-of-sample evidence.

2. C:\Users\Garrett\Sports-wt-pick-gate\apps\web\lib\intelligence\matchup-contract.test.ts
   - Vitest. Cover at minimum: gating source missing -> sourceError with canPublishProjections:false; gating source empty-but-successful -> sourceError; enrichment source missing -> still live with null deltas; success path also carries canPublishProjections:false; leaf withhold on null opp and on empty contributions; matchupsRead never counts null deltas.

HARD RULES:
- Do NOT run any git command (no add/commit/status). I do all git operations.
- Do NOT modify any file except the two above. Do NOT touch the registry, calibration gates, or process-sport.
- Match the repo's existing code style (readonly fields, no `any`, explicit null handling). Do not add new dependencies.

Verify before finishing (run from C:\Users\Garrett\Sports-wt-pick-gate\apps\web):
  node C:/Users/Garrett/Sports/node_modules/vitest/vitest.mjs run lib/intelligence/matchup-contract.test.ts --reporter=dot
All tests must pass. Then write your report to C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\matchup-contract.md with: files created, test counts (exact), the honest port boundary (what was copied, what was refused), and anything you deliberately did not port.
