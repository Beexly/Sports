# Scratch → Primary Clone Copy Manifest

**Date:** 2026-05-22
**Trigger:** Codex confirmed during Phase 3 work that `docs/product/**` and `apps/web/lib/*/templates/` files from Claude's scratch clone are NOT present in the primary clone checkout. Codex is shipping clean implementations but cannot wire against the specs that lock voice rules, refusal templates, and compliance contracts.

**Action required:** owner copies the files listed below from scratch (`C:\Users\Garrett\Documents\Claude\Projects\AI Sports`) to primary (`C:\Users\Garrett\Sports`), commits, pushes. Then Codex re-fetches and wires Phase 3 surfaces against the canonical specs.

Alternatively, owner can ask Codex to re-implement from scratch using its own judgment (specs and template code are content-equivalent; either route reaches similar output). The copy route preserves the locked content + the voice/compliance contracts I wrote.

---

## Priority 1 — needed before Phase 3 Studio + bots can wire compliance

Without these, the Studio templates, Twitter bot, Discord bot, Model Journal, and Model Court will not have the locked voice rules + refusal templates + compliance contracts that prevent banned-vocabulary leaks in user-facing output.

### Template code (`apps/web/lib/`)

These 33 TypeScript files contain the actual prompt + compliance + post-template content. Codex's Phase 3 implementation will read these directly.

**Compliance scanner (single most critical file):**

- `apps/web/lib/compliance-scanner/rules.ts` — the 3-layer banned-vocabulary rules + per-template overrides. Used by every AI-output surface.

**Pre-mortem templates (DEC-030 says Codex shipped equivalent on primary; this is the spec-of-record):**

- `apps/web/lib/pre-mortem/templates/index.ts`
- `apps/web/lib/pre-mortem/templates/types.ts`
- `apps/web/lib/pre-mortem/templates/consensus.ts`
- `apps/web/lib/pre-mortem/templates/depth.ts`
- `apps/web/lib/pre-mortem/templates/line-movement.ts`
- `apps/web/lib/pre-mortem/templates/volatility.ts`
- `apps/web/lib/pre-mortem/templates/rest-advantage.ts`
- `apps/web/lib/pre-mortem/templates/schedule-stress.ts`
- `apps/web/lib/pre-mortem/templates/venue-form.ts`
- `apps/web/lib/pre-mortem/templates/cross-market.ts`
- `apps/web/lib/pre-mortem/templates/data-quality.ts`
- `apps/web/lib/pre-mortem/compose.ts`
- `apps/web/lib/pre-mortem/compare.ts`

**Galaxy Studio templates (Phase 3 Step 1 — generates the 8 creator-asset kinds):**

- `apps/web/lib/studio/templates/index.ts`
- `apps/web/lib/studio/templates/types.ts`
- `apps/web/lib/studio/templates/fan-explainer.ts`
- `apps/web/lib/studio/templates/betting-education.ts`
- `apps/web/lib/studio/templates/x-thread.ts`
- `apps/web/lib/studio/templates/sponsor-safe.ts`
- `apps/web/lib/studio/templates/fantasy-angle.ts`
- `apps/web/lib/studio/templates/tiktok-reels-script.ts`
- `apps/web/lib/studio/templates/newsletter-block.ts`
- `apps/web/lib/studio/templates/youtube-titles.ts`

**Twitter bot templates (Phase 3 Step 3):**

- `apps/web/lib/twitter-bot/templates/index.ts`
- `apps/web/lib/twitter-bot/templates/types.ts`
- `apps/web/lib/twitter-bot/templates/pick-publication.ts`
- `apps/web/lib/twitter-bot/templates/slate-state-gated.ts`
- `apps/web/lib/twitter-bot/templates/settlement.ts`
- `apps/web/lib/twitter-bot/templates/post-mortem-thread.ts`

**Discord bot templates (Phase 3 Step 4):**

- `apps/web/lib/discord-bot/templates/index.ts`
- `apps/web/lib/discord-bot/templates/types.ts`
- `apps/web/lib/discord-bot/templates/pick-publication-embed.ts`
- `apps/web/lib/discord-bot/templates/slate-state-gated-embed.ts`
- `apps/web/lib/discord-bot/templates/settlement-embed.ts`

**Model Court prompts (Phase 4 but file is ready):**

- `apps/web/lib/intelligence-graph/model-court/prompts.ts` — locked system prompt + 6 refusal templates + 3 mode-prelude builders.

**Model Journal + calibration prompts (Phase 3 + Phase 4):**

- `apps/web/lib/journal/prompts.ts` — Saturday drafting prompt.
- `apps/web/lib/calibration-training/insight-prompt.ts` — weekly user insight prompt.

---

## Priority 2 — Phase 3 product specs (the design contracts)

These docs define the contracts Codex implements against. Phase 3 surfaces specifically:

- `docs/product/galaxy-studio-spec.md` — Studio v0 product spec.
- `docs/product/game-room-spec.md` — Game Intelligence Rooms (Phase 3 read-only, Phase 4 conversational).
- `docs/product/twitter-bot-voice-spec.md` — bot voice rules + refusals + rate limits.
- `docs/product/discord-bot-spec.md` — Discord bot equivalent.
- `docs/product/model-journal-spec.md` — weekly essay surface.
- `docs/product/pre-mortem-pipeline-spec.md` — wiring spec (builder shipped, this is the wiring contract).
- `docs/product/ledger-and-loss-room-spec.md` — Loss Room product layer.
- `docs/product/galaxy-memory-persistence-spec.md` — post-settlement Game Room slot.
- `docs/product/intelligence-graph-spec.md` — typed primitives layer (Codex implemented in Phase 2 — this is the spec they implemented against in spirit).

---

## Priority 3 — operational governance docs

- `docs/innovation-os-current-state.md` (revision 3) — canonical "where the codebase actually is" reference.
- `docs/positioning.md` — locked positioning + banned vocab cross-ref.
- `docs/ops/pr-review-checklist.md` — Claude's 10-point auto-review form. Codex self-checks before tagging.
- `docs/ops/stuck-queue-protocol.md` — STUCK criteria + severity tiers + escalation thresholds.
- `docs/product/synthetic-monitoring-spec.md` — continuous production verification spec.
- `docs/product/claude-api-cost-monitoring-spec.md` — per-surface budgets + fallback voice.
- `docs/product/migration-sequence-spec.md` — all Phase 3-5 Prisma migrations with deps.
- `docs/product/engine-versioning-policy.md` — PATCH/MINOR/MAJOR triggers + changelog discipline.
- `docs/product/cockpit-studio-spec.md` — operator workspace UI for Studio.

---

## Priority 4 — Phase 4 + 5 forward-runway specs

These don't block Phase 3 but Codex will need them at phase boundaries:

- `docs/product/calibration-training-spec.md`
- `docs/product/edge-lab-expansion-spec.md`
- `docs/product/github-issues-for-model-spec.md`
- `docs/product/chrome-extension-spec.md`
- `docs/product/model-court-prompts.md`
- `docs/product/anti-galaxy-spec.md`
- `docs/product/programmable-dsl-spec.md`
- `docs/product/cross-sport-correlation-engine-spec.md`
- `docs/product/live-war-room-spec.md`
- `docs/product/b2b-widgets-and-api-spec.md`
- `docs/product/trust-compliance-toolkit-spec.md`
- `docs/product/monetization-map.md`
- `docs/product/phase-6-plus-planning.md`
- `CODEX_PHASE_3_BRIEF.md` (already exists in some form; primary may have an older version)
- `CODEX_PHASE_4_BRIEF.md`
- `CODEX_PHASE_5_BRIEF.md`

---

## Priority 5 — Fixtures + evals

Backing files for tests Codex will write:

- `apps/web/__fixtures__/intelligence-graph/README.md`
- `apps/web/__fixtures__/intelligence-graph/happy-path-canonical.ts`
- `apps/web/__fixtures__/intelligence-graph/bootstrap-game.ts`
- `apps/web/__fixtures__/intelligence-graph/gated-game.ts`
- `apps/web/__fixtures__/intelligence-graph/settled-loss-with-autopsy.ts`
- `apps/web/__fixtures__/intelligence-graph/slate-weather-notable.ts`
- `docs/ops/evals/*.md` — all 18 eval files (Twitter bot 5, Studio 5, Discord bot 4, Model Court 4).

---

## Suggested copy procedure (PowerShell, owner runs)

```powershell
$src = "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"
$dst = "C:\Users\Garrett\Sports"

# Priority 1 — template code
Copy-Item -Recurse "$src\apps\web\lib\compliance-scanner" "$dst\apps\web\lib\"
Copy-Item -Recurse "$src\apps\web\lib\pre-mortem\templates" "$dst\apps\web\lib\pre-mortem\" -Force
Copy-Item "$src\apps\web\lib\pre-mortem\compose.ts" "$dst\apps\web\lib\pre-mortem\"
Copy-Item "$src\apps\web\lib\pre-mortem\compare.ts" "$dst\apps\web\lib\pre-mortem\"
Copy-Item -Recurse "$src\apps\web\lib\studio" "$dst\apps\web\lib\"
Copy-Item -Recurse "$src\apps\web\lib\twitter-bot" "$dst\apps\web\lib\"
Copy-Item -Recurse "$src\apps\web\lib\discord-bot" "$dst\apps\web\lib\"
Copy-Item -Recurse "$src\apps\web\lib\intelligence-graph\model-court" "$dst\apps\web\lib\intelligence-graph\"
Copy-Item -Recurse "$src\apps\web\lib\journal" "$dst\apps\web\lib\"
Copy-Item -Recurse "$src\apps\web\lib\calibration-training" "$dst\apps\web\lib\"

# Priority 2-5 — docs
Copy-Item -Recurse "$src\docs\product" "$dst\docs\" -Force
Copy-Item -Recurse "$src\docs\ops" "$dst\docs\" -Force
Copy-Item "$src\docs\innovation-os-current-state.md" "$dst\docs\"
Copy-Item "$src\docs\positioning.md" "$dst\docs\"
Copy-Item "$src\CODEX_PHASE_3_BRIEF.md" "$dst\"
Copy-Item "$src\CODEX_PHASE_4_BRIEF.md" "$dst\"
Copy-Item "$src\CODEX_PHASE_5_BRIEF.md" "$dst\"

# Fixtures
Copy-Item -Recurse "$src\apps\web\__fixtures__\intelligence-graph" "$dst\apps\web\__fixtures__\" -Force

cd $dst
git status     # review what's new
git add docs apps/web/lib apps/web/__fixtures__ CODEX_PHASE_3_BRIEF.md CODEX_PHASE_4_BRIEF.md CODEX_PHASE_5_BRIEF.md
git commit -m "Sync scratch-clone specs and template code to primary"
git push
```

After this lands on the primary clone + origin/main, Codex can:

1. Confirm the new files compile (typecheck against existing engine + Intelligence Graph).
2. Wire the Studio runtime against `apps/web/lib/studio/templates/`.
3. Wire the Twitter bot against `apps/web/lib/twitter-bot/templates/`.
4. Wire the Discord bot against `apps/web/lib/discord-bot/templates/`.
5. Wire compliance scanner into every AI-generated surface via `apps/web/lib/compliance-scanner/rules.ts`.

If the typecheck surfaces any conflicts (e.g. Codex's primary-clone pre-mortem implementation has a different type shape than mine), resolve in favor of Codex's primary-clone version since that's already in production. The scratch-clone files exist to lock content + voice; they don't override Codex's architectural choices.

---

## Alternative: do not copy, re-implement

If the copy is messy (e.g. Codex's primary-clone already has equivalent files at different paths), the alternative is: Codex re-implements the Phase 3 surfaces from the spec docs alone. The specs (`docs/product/galaxy-studio-spec.md`, `docs/product/twitter-bot-voice-spec.md`, etc.) contain the same voice rules + refusal templates + compliance contracts as the template code; either route reaches equivalent output.

Recommended: copy Priority 1 (template code) at minimum since that's the immediately consumable layer. Copy Priority 2 (Phase 3 specs) for the contracts. Priorities 3-5 can wait or be re-implemented.

---

*Manifest authored by Claude. Owner decides copy vs re-implement.*
