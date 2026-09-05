# C12-04 — PART 5: D-Item Execution Artifacts

Runtime: agent (filesystem + shell). Verify block (real exit codes, this session, whole WIP):
`npm run typecheck` → 0 · `npm run lint` → 0 · `npm run lint:brand` → 0 ·
`npx vitest run` (board-classify-state, middleware-contract, subscriptions-checkout-route,
lib/auth.test, age-verify/surface, deploy-readiness-stripe-prices) → 116/116 ·
push stack (push-subscribe-api, web-push-channel, subscription-db) → 35/35.

**Honesty note on scope:** C11's Stage 6 D-list text (D-0..D-15 as C11 wrote it) is NOT RECOVERABLE —
it was truncated in the C11 run and never committed. Searched: the C12 brief, the committed C11
summary (`docs/ops/LAUNCH_READINESS_C11_2026-09-04.md`, 67 lines, no D-list), `scripts/ops/chaos/out/`
(empty), all 80+ sibling Sports-* clones, the agent ledger. What IS recoverable: the D-items the
codebase itself names in comments and tests (D-1, D-2, D-3, D-4, D-6, D-7, D-8, D-10). Artifacts for
those are below, each verified. **D-0, D-5, D-9, D-11..D-15: definitions unknown — [NOT RUN: source
text lost with C11's truncation].** Cheapest recovery: re-run C11 with `--max-tokens 16000` per the
C12 brief's own flag instruction, or ask the founder for the C11 panel transcript.

---

### D-1 — Stamp `emailVerified` from Google's `email_verified` claim
**STATUS: DONE.** Without it the settlement worker refuses every recipient (column was never written)
— Elite email alerts could never deliver to anyone.
- Diff: `apps/web/lib/auth.ts` — `stampEmailVerifiedFromProfile()`: fail-closed (only literal
  `email_verified === true` counts), idempotent (skips non-null), fire-and-forget from the jwt
  callback (a failed write never breaks sign-in; it leaves alerts blocked, never falsely verified).
- Foundation verified in C12-01 §2.2 against the installed `@auth/core`: the field exists and is
  populated for Google.
- Regression catch: `lib/auth.test.ts` D-1 suite (5 tests: stamp / idempotent / fail-closed matrix /
  no-email·no-user / findUnique-rejection-degrades). Green.
- Confidence: 92%. Residual: no live Google round-trip (keys live, flow not exercised per rails).

### D-2 — Mount the push opt-in (web-push channel was dark by construction)
**STATUS: DONE.** `components/push/push-alert-opt-in.tsx` existed, fully specified, mounted nowhere —
no session path could create a `push_subscriptions` row.
- Diff: mounted in `/watchlist` AlertsBanner (elite-only render path). Renders nothing until VAPID
  keys are configured (honest dark state); every state it shows is server-confirmed.
- Regression catch: `__tests__/push-subscribe-api.test.ts` + `web-push-channel.test.ts` +
  `subscription-db.test.ts` (35/35). Named gap: the COMPONENT itself has no dedicated test file —
  the C11 comment "fully tested" overstates; channel/DB/API layers are what's tested.
- Confidence: 88%.

### D-3 — De-hardcode `liveBoardOn` (S1)
**STATUS: DONE.** See C12-02 §S1. Four call sites now `liveBoardOn()` (state.ts:275, 365, 483, 513);
env-driven, house flag convention; no gate flipped. Regression: `board-classify-state.test.ts` 8/8.
Confidence: 93%.

### D-4 — Backfill `eligibleForLearning` for pre-gate settled snapshots
**STATUS: LANDED, RUN GATED (founder action).** C12-01 §2.3 confirmed every schema column exists
(schema.prisma ~line 801) — D-4 stays a launch-day item, NOT reclassified to B-.
- Artifact: `scripts/ops/backfill-learning-eligibility.mjs` — dry-run default, `--apply` to write,
  idempotent, recomputes the stamp from stored fields, never invents outcomes, never touches
  bootstrap rows.
- Live verification of the safety control (this session): dry run →
  `REFUSED: OUTCOME_LEARNING_ENABLED is off at execution time.` **exit 2** [VERIFIED — the script
  refuses to stamp while the gate is off; exactly the Stage-4 ordering invariant].
- Operator sequence (founder console; not executed by any agent): flip OUTCOME_LEARNING_ENABLED →
  `node scripts/ops/backfill-learning-eligibility.mjs` (read the dry-run count) →
  `node scripts/ops/backfill-learning-eligibility.mjs --apply` → re-run dry (expect 0 pending) →
  only then CANONICAL_HISTORY_ENABLED.
- Confidence: 90% (logic + refusal verified; the actual write is deliberately unexercised).

### D-6 — Elite alert copy matches what the code does
**STATUS: DONE.** FAQ "What does Elite get?" rewritten: "email and push notifications **when a pick
you follow is graded** — win, loss, push, or void. We never alert on an ungraded tip." Full surface
enumeration in C12-02 §S2. Confidence: 88%.

### D-7 — Legal/RG footer on orphan public pages
**STATUS: DONE.** `/brief` and `/waitlist` now render the shared Footer (RG block + terms/privacy).
Both were public pages with zero legal links. Confidence: 95%.

### D-8 — 21+ attestation age gate (S3)
**STATUS: DONE.** Middleware + `/age-verify` + `lib/age-verify/surface.ts`; always-on, no env flag;
loop-proof; open-redirect-proof. See C12-02 §S3. Regression: middleware-contract age rows +
`surface.test.ts`. Confidence: 90%.

### D-10 — Public board says which surface it is
**STATUS: DONE.** `components/board/board-surface-chip.tsx` mounted on `/board` (header, above
BoardHealthBadge). Fail-honest: with no odds-freshness signal it labels the board SIGNAL — model
lines, not book prices; `PUBLIC_BOARD_SURFACE=market` gets the market chip explicitly. Reuses the
existing policy module; no logic duplicated. Confidence: 92%.

---

## Stage-4 flag-order runbook (WRITTEN, NOT EXECUTED — founder's console only)

1. `OUTCOME_LEARNING_ENABLED=true` (Vercel env, Production) → redeploy. **This first — nothing else.**
2. `node scripts/ops/backfill-learning-eligibility.mjs` (dry) → review count → `--apply` → dry again
   (expect 0 pending). **Between the two flags. Irreversible pair.**
3. `CANONICAL_HISTORY_ENABLED=true` → redeploy. **Only after step 2.**
4. Watch: board banner now reflects the live state (D-3 made it truthful); calibration floors begin
   counting backfilled rows (C12-01 §2.7).
5. Do NOT touch: PUBLIC_PICKS, STATS_PUBLIC, LIVE_BOARD, PERFORMANCE_STATS,
   CALIBRATION_ADJUSTMENTS_ENABLED, CALIBRATION_PUBLISHED, CALIBRATION_AUTO_PUBLISH — each stays
   where it is until its own audited step in the runbook.

Flipping any flag out of order — especially 3 before 2 — is the permanent-loss trap (C11 R8): rows
settled while learning is off become calibration-invisible forever.
