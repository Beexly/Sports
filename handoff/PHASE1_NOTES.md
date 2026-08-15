# PHASE1_NOTES — P1-02 spec diff

Compared implementations of T1/T2/T3 (all present on the branch) against
`docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md`. Each item below is one
divergence (a defect vs the spec). File layout for T1 matches §1.1.

Generated: 2026-08-14T23:03:19Z

## T1 — tools/model-advisor

### T1-D1 — VerificationStatus missing `"unverified"`
- Spec §1.2: `export type VerificationStatus = "verified" | "known-real" | "unverified"`
- Impl `tools/model-advisor/types.ts`: `"verified" | "known-real"` only.

### T1-D2 — ModelRole extra `"agentic-executor"`
- Spec §1.2 roles: `local-primary | local-coder | reasoning | frontier | cheap-frontier | long-context | multimodal`
- Impl adds `"agentic-executor"` (used by Nemotron).

### T1-D3 — Type shapes use `readonly` where spec does not
- Spec `ModelEntry.roles: ModelRole[]`; impl `readonly ModelRole[]`.
- Spec `Recommendation.fallbacks: ModelEntry[]`; impl `readonly ModelEntry[]`.
- Spec `MODEL_CATALOG: ModelEntry[]`; impl `readonly ModelEntry[]`.

### T1-D4 — Catalog is not a complete §A + §B populate
- Spec §1.3: populate from `docs/reference/MODEL_LANDSCAPE.md` §A + §B only.
- Missing §A rows: **Qwen3-Coder-Next** (`Qwen/Qwen3-Coder-Next`, verified) and **Codestral** (`mistralai/Codestral-*`, known-real).
- Extra vs spec's enumerated local-row list: **Nemotron 3.5 Lightning** (this row *is* in landscape §A, so it is landscape-aligned but not named in the spec's required local list).
- §B unverified rows (GPT-5.6, Gemini 3.x, Grok 4.x) are correctly omitted.

### T1-D5 — `recommendModel(task, catalog)` ignores the `catalog` argument on pick paths
- Spec §1.4 signature: `recommendModel(task: TaskProfile, catalog = MODEL_CATALOG)`.
- Impl `pick()` / `findModel()` always resolve ids from the module-global `MODEL_CATALOG`. Passing a substitute catalog cannot change primary/fallback picks.

### T1-D6 — Rule 1 local pick adds an unspec'd agentic branch
- Spec §1.4 rule 1: if multimodal → Muse Glimmer; else Qwen3-Coder-30B (or Qwen2.5-Coder-7B if complexity ≤ 2).
- Impl `bestLocal()`: if `kind === "agentic"` → `nemotron-3-5-lightning` (never named in §1.4).

### T1-D7 — Rule 4 never uses a long-context local
- Spec §1.4 rule 4: frontier **or a long-context local if it qualifies**.
- Impl always returns hosted Claude 1M-context (sonnet/opus/fable). No local long-context candidate is considered.

### T1-D8 — Extra `budget === "free"` downgrade rule
- Spec §1.4 lists five rules only. `TaskProfile.budget` exists in §1.2 but has no routing rule.
- Impl `freeify()` rewrites any non-local recommendation to `bestLocal` when `budget === "free"`.

### T1-D9 — README examples are paraphrased, not real CLI output
- Spec §1 DoD: README shows two example invocations **with real output**.
- `tools/model-advisor/README.md` comments (`# -> tier local, Qwen2.5-Coder-7B…`) are abbreviated prose, not captured `cli.ts` stdout.

### T1-D10 — Required test #5 asserts context window, not "long-context primary"
- Spec §1.6: `kind: "long-context", complexity: 6, contextTokens: 500_000` → long-context primary.
- Impl test asserts `rec.primary.contextTokens >= 1_000_000` and does not assert `roles` contains `"long-context"`.
- Required tests 1–4, 6, 7 are present and match.

## T2 — cockpit routing-legibility card

Present: `apps/web/app/cockpit/api-costs/routing-legibility.tsx` mounted from `page.tsx`; component test `apps/web/__tests__/cockpit-api-costs-routing.test.tsx`.

### T2-D1 — Card does not read `budget-store.ts` or the event ledger
- Spec §2: read from `budget-store.ts` + the event ledger.
- Card is pure presentation. `page.tsx` `buildRoutingRows()` reads `model-router`, `model-economics`, and `free-lane-policy` only. Dashboard spend (separate table) uses `budget-store` via `loadClaudeApiCostsDashboard`; that is not this card.

### T2-D2 — Missing required columns: request count, cache-hit rate, reported $ per surface
- Spec §2 per-surface: lane/tier used, **request count**, **cache-hit rate**, **reported $ per surface**.
- Card shows: surface, active lane, active model, recommended lane/model, blended $/Mtok active, blended $/Mtok recommended, savings, free-lane badge.
- Request count lives on the Surface Budgets table, not this card.
- Cache-hit is an honest "not recorded" note, not a rate.
- `$` cells are rate-card blended $/Mtok from models.dev, not reported spend.

### T2-D3 — Extra columns not in the spec
- Recommended tier, recommended model id, savings fraction, free-lane eligibility are not in §2.

## T3 — eval:prompts quality harness

Present: `eval/promptfoo/{surface-prompts,scorer,report,scorer.test}.ts` plus existing `promptfooconfig.yaml`. Scorer tests exist.

### T3-D1 — `npm run eval:prompts` does not emit the cost/quality report
- Spec §3 DoD: `npm run eval:prompts` emits a per-surface cost/quality report to `reports/`.
- Root `package.json` still is: `npx promptfoo@latest eval -c eval/promptfoo/promptfooconfig.yaml` (live API, needs keys).
- Dated markdown is produced only by a **different** command: `npx tsx eval/promptfoo/report.ts`.

### T3-D2 — Quality rubric scores harness prompt text, not model outputs
- Spec §3: fixed Sports-OS prompt set per `ClaudeSurface`, **scored for cost + a simple quality rubric** (router-quality harness).
- Impl `scoreQuality()` statically inspects the harness `system`/`userTemplate` strings (placeholder, banned phrases, grounding regex, calm-tone regex, risk disclosure, length). It never scores a model completion.
- Prompt set is also authored harness copy, not the production builders in `apps/web/lib/**` (file header says this explicitly).

### T3-D3 — Report is not fully deterministic
- Spec §3 DoD: deterministic.
- `scoreAllSurfaces()` sets `generatedAt: new Date().toISOString()`, so successive reports differ even when scores do not.

## Matches (not defects)

- T1 file layout (`types/catalog/recommend/cli/recommend.test/README`) matches §1.1.
- T1 required routing rules 2 (bulk→batch), 3 (multimodal→Muse unless complexity ≥ 9), 5 ladder bands, and CLI flags match.
- T1 required tests 1–4, 6, 7 are present.
- T2 is a read-only card under `apps/web/app/cockpit/api-costs/**` with a component test and no new product deps.
- T3 has a per-surface prompt set covering all six `ClaudeSurface` values, a scorer test file, and a dated `reports/eval-prompts/` writer (wrong npm script; see T3-D1).
