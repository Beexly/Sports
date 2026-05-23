# Session 2026-05-23

## Cycles completed: 9 (+ Cycle 10 = this summary)

Branch: `claude/keen-ptolemy-d0pbK` · Starting commit: `7900d41` · Ending commit: `e9af6ed`

Across 9 cycles, every Claude integration in the repo now goes through
the official `@anthropic-ai/sdk` with SDK-managed retries + typed
errors + JSON-schema output validation, plus three brand-new
capabilities (semantic draft reviewer, source citations, slate-overview
composer) and one structural utility (`extractPickSources`).

Test count: web **1342 → 1392** (+50) · prediction-engine **197 → 205** (+8) · types & data-ingestion unchanged.
Tests across all four workspaces: **1636 passing**, typecheck + lint + three guardrails (trust-gate, draft-only, model-freeze) all clean.

## Shipped

| # | Commit | Feature | Test surface |
|---|---|---|---|
| 1 | `3df11bc` | feat(content): migrate Claude blog generator to official `@anthropic-ai/sdk` (output_config json_schema, no more regex JSON extraction; closes Hard Rule §6) | `apps/web/__tests__/content-generator.test.ts` |
| 2 | `f66baa9` | feat(content): semantic draft reviewer module (Haiku 4.5, catches paraphrased trust-claim violations the regex scanner misses) | `apps/web/__tests__/draft-reviewer.test.ts` |
| 3 | `c796977` | feat(cockpit): admin-gated POST `/api/cockpit/review-draft` exposes the reviewer to operators | `apps/web/__tests__/cockpit-review-draft-api.test.ts` |
| 4 | `b5a6496` | feat(content): `generateAndReviewBlogPost` wrapper pairs the generator with the reviewer; non-throwing on REJECT so each caller picks its own policy | `apps/web/__tests__/content-generator.test.ts` |
| 5 | `cdcb026` | feat(prediction-engine): `extractPickSources` — ACTIVE-only, deduped, ordered source list per pick (satisfies master-prompt Track 1 `sources[]` spec) | `packages/prediction-engine/src/__tests__/pick-sources.test.ts` |
| 6 | `b1730bd` | feat(content): blog generator now cites pick sources when callers pass them through | `apps/web/__tests__/content-generator.test.ts` |
| 7 | `970c606` | chore(scripts): operator scripts migrated to `@anthropic-ai/sdk` (last raw-fetch holdouts); `check-deploy-readiness` gains 5xx retries on the CI gate | `apps/web/__tests__/operator-scripts-sdk.test.ts` |
| 8 | `feb1b8e` | feat(content): blog generator now parameterized on content kind (DAILY_PICKS / WEEKLY_RECAP); 6 more kinds slot in trivially in follow-ons | `apps/web/__tests__/content-generator.test.ts` |
| 9 | `e9af6ed` | feat(brief): `composeSlateOverview` — first restored slice of the daily brief composer (Sonnet 4.6, schema-validated) | `apps/web/__tests__/slate-overview.test.ts` |

## Decisions (see `_logs/DECISIONS.md` for full detail)

- **2026-05-23 · Adopt `@anthropic-ai/sdk` for every Claude call** — replaces raw fetch everywhere; SDK manages retries/timeouts/typed errors. Resolves Hard Rule §6.
- **2026-05-23 · Use Haiku 4.5 for the draft reviewer** — deliberate exception to the `claude-api` skill's default of `claude-opus-4-7`. Review is short, structured, latency-sensitive, classification-style; Haiku is the right tool.

## Hard Rules audit (master prompt §6)

- ✅ Never commit secrets — `.env` is gitignored; created stub files (`apps/web/.env`, `packages/db/.env`) for the ephemeral container with stub values; no real secrets in the working tree.
- ✅ All Anthropic calls go through the SDK with retries (`maxRetries: 3`), typed errors, and structured error handling — applies to content-generator, draft-reviewer, slate-overview, and both operator scripts.
- ✅ No auto-publish path. `draft-only.mjs` guardrail passes (177 → 178 files scanned, no publish/send paths leaked).
- ✅ No auto-bet / no auto-send / no hype language. `trust-gate.mjs` passes (170 → 171 files scanned, no banned phrases on the public surface).
- ✅ MODEL_VERSION untouched. `model-freeze.mjs` passes against the existing `v5.0.0` baseline.
- ✅ Prompt caching: not required this session — the largest system prompt (slate-overview) is ~80 lines / well under the ~2K-token threshold the master prompt cites. Should add ephemeral caching when a prompt grows past that bar.

## Boot state recovered + reconstructed

- `_logs/` did not exist — created with `boot-2026-05-23-1905.md`, `CHANGELOG.md`, `DECISIONS.md`, per-cycle plans, and this summary
- `apps/web/.env` and `packages/db/.env` did not exist — reconstructed from `.env.example` with stub values (DATABASE_URL=`stub`, DEV_FAKE_ADMIN=`true`, secret-shaped env vars blank or `stub`)
- `node_modules` not present — `npm install` succeeded; no install-blocking errors

## Open questions for Garrett

1. **Operator model upgrade?** The blog generator stays on `claude-sonnet-4-6` (the existing deliberate choice). The `claude-api` skill defaults new code to `claude-opus-4-7`. If you want to upgrade — and re-baseline token cost / re-tune the prompt — that's a future cycle, not a one-line change.
2. **Wire the reviewer into a real cockpit page?** Cycle 3 shipped the POST API; no UI surface calls it yet. The natural homes are `/cockpit/review/page.tsx` (admin review queue) or a per-draft button on `/cockpit/content/[id]/`. A UI cycle is a multi-file change that's hard to verify without a browser in this container — happy to wire it next session.
3. **Brief composer full restoration?** Cycle 9 shipped just the slate-overview slice. Restoring the full composer (sections, promotions, what-changed, content ideas, manual review) is a multi-cycle feature. Want to prioritize it next session?
4. **Anthropic API key rotation.** `CLAUDE_PICKUP.md` from a prior session flagged that the current ANTHROPIC_API_KEY returns 401 in deploy-readiness checks. The `scripts/rotate-anthropic-key.mjs` flow is now SDK-backed but still needs a real new key from console.anthropic.com — I can't generate one from here.
5. **Reference archives.** You uploaded ~10 SDK / plugins / claude-code-base-action zips this session. I extracted everything to `/home/user/anthropic-sdks-reference/` for this session. That directory is ephemeral and won't survive container teardown — save the originals locally if you want them for future sessions, or I can commit a curated cheatsheet of the highest-leverage patterns into `docs/` next session.

## Recommended next session (cycle queue)

1. **Wire reviewer into a cockpit page** (Track 5 — operator polish) — adds a "Run review" button on the existing draft view; renders findings inline.
2. **Add remaining 6 content kinds** to the blog generator (`METHODOLOGY_EDUCATION`, `MATCHUP_PREVIEW`, `PROMOTION_ROUNDUP`, `PERFORMANCE_TRANSPARENCY`, `RESPONSIBLE_BETTING_EDUCATION`, `MODEL_CHANGE_NOTE`) using the same `KIND_FRAMING` pattern from Cycle 8.
3. **Brief composer full restoration** — chain slate-overview with promotions + what-changed + sections; replace the brief stub. Likely 2-3 cycles.
4. **GitHub Action for nightly content** — using the extracted `claude-code-base-action`, a scheduled workflow that drafts the daily blog post + runs the reviewer, then opens a PR with the draft. Operator approves the PR to publish.
5. **Extract shared `makeAnthropicHolder()` helper** — three call sites now use the same singleton+test-escape pattern (`content-generator`, `draft-reviewer`, `slate-overview`); abstraction is justified.
6. **Prompt-caching audit** — once any system prompt grows past ~2k tokens, the Hard Rule kicks in. Add ephemeral caching to the slate-overview composer first (it'll grow as we add sections context).

## STOP — awaiting Garrett

Per master prompt §7, I've completed 10 cycles and am pausing. Branch
`claude/keen-ptolemy-d0pbK` is clean, all tests green, all guardrails
green. Ready to either continue with the queue above or take direction.
