# Jev text-helper migration: Mercury 2.5 → Mercury 3

Prepared 2026-10-26 from Inception's email received 2026-10-26 18:46 CT
("Mercury 2 and 2.5 are retiring: upgrade to Mercury 3").

## Deadline
- Mercury 2 and Mercury 2.5 closed to new signups October 19, 2026.
- Existing users (usage before October 19) keep access **until November 15, 2026**.
- After November 15, 2026 both models are gone. Inception says direct-API users are
  auto-moved to Mercury 3; Garrett's Jev setup does **not** call Inception directly (see below),
  so do not rely on the auto-move covering it.

## How Garrett's Jev actually calls Mercury (verified in the local checkout, 2026-10-26)
- Repo: `~/workspace/jev-ultrafast`
- `.env` line 7 and `dist-windows/.env` line 7: `TEXT_MODEL=inception/mercury-2.5`
- `TEXT_MODEL_BASE_URL=https://openrouter.ai/api/v1` — the key is an **OpenRouter** key
  (`.env.example` header + README line 68 confirm this).
- So the migration target slug is the OpenRouter form, expected `inception/mercury-3`.
  Mercury 3's availability through OpenRouter is confirmed by multiple launch reports
  (Oct 19–21, 2026); the exact slug spelling should be confirmed on OpenRouter at switch time.

## Files to change at switch time (one line each)
1. `~/workspace/jev-ultrafast/.env` — `TEXT_MODEL=inception/mercury-2.5` → Mercury 3 slug
2. `~/workspace/jev-ultrafast/dist-windows/.env` — same line (the Windows copy Garrett runs by hand)
3. `~/workspace/jev-ultrafast/.env.example` line 6 — same, so future setups start on the live model
4. `~/workspace/jev-ultrafast/README.md` line 68 — the sentence naming `inception/mercury-2.5`

Do **not** rewrite the measurement JSONs or `docs/performance.md`: those are historical
benchmark records that correctly name the model they were measured with.

## Why this was NOT blind-swapped in this run
- The Jev lane is parked on Garrett's call (tracking: jev-ultrafast setup, "Parked on Garrett's
  call; the lane stays dark until he reopens it"). Nothing is calling Mercury tonight.
- The benchmark docs freeze Mercury 2.5 deliberately so runtime comparisons do not mix a
  helper-model change with code changes. Swapping silently would corrupt that comparability.
- Correct sequence when the lane reopens, or before November 15, whichever comes first:
  change the four lines above, then re-run the live Wikipedia test (the test that passed on
  the VM at setup) plus one TYPE_TEXT flight-field probe, and only then call it migrated.

## Mercury 3 facts from the email (vendor claims, not independently tested)
- Same API, same key for direct Inception users; model name `mercury-3` on their API.
- Pricing stated: $0.20/M input ($0.02/M cached), $0.70/M output, 50% off at launch.
- 1M context window; reasoning modes High / Medium / Low / Instant.
  Note: Jev runs with `TEXT_MODEL_REASONING=none` — check Mercury 3 accepts the
  equivalent setting during the switch test.
