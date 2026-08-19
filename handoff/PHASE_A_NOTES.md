# Phase A Notes — diff-vs-spec review (2026-08-12)

Reviewer: Hermes (overnight run). Scope: T1 (model-advisor, shipped by prior
session), T2 + T3 (built this run). Spec: `docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md`.

## T1 — model-advisor: CONFORMS

- File layout §1.1: types.ts / catalog.ts / recommend.ts / cli.ts /
  recommend.test.ts / README.md — all present, exact.
- Types §1.2: shapes match; `VerificationStatus` is `"verified" | "known-real"`
  (the spec's `"unverified"` member is intentionally absent so the catalog
  cannot hold unverified models — the spec's own rule, enforced by type).
- Recommender §1.4: rule order privacy → bulk → multimodal → long-context →
  complexity ladder matches exactly; `budget:"free"` downgrade present.
- Required test cases §1.6: all 7 present (10 tests total).
- DoD §1.7: vitest 10/10 green; strict tsc clean; no new deps; no imports from
  apps/ or packages/.

## T2 — routing legibility card: CONFORMS WITH DOCUMENTED SPLIT

- Card renders from real data (model-router SURFACE_TIER via
  activeTierForSurface/SURFACE_RECOMMENDED, blended $/Mtok from the vendored
  models.dev snapshot via surfaceEconomics(), free-lane set from
  free-lane-policy). No new deps. Component test added (7 tests). typecheck
  adds 0 errors to the #421 baseline; workspace lint green.
- DIVERGENCE (protocol-mandated): the spec asks the card to show "request
  count" and "reported $ per surface" per model-router surface. The repo has
  TWO surface enums with no in-code bridge: model-router `ClaudeSurface`
  (studio/journal/calibration-insight/model-court/content/brief) and
  cost-monitor `ClaudeApiSurface` (BLOG_GENERATION/…/OTHER), and call records
  are keyed to the latter. Hardcoding a bridge in the card would be a
  fabricated mapping that silently mislabels data if a call site changes. The
  card therefore shows the routing view (tier/model/$ per Mtok) and the page's
  existing budget table shows spend/calls/errors per cost-monitor surface; a
  note explains the split. Honest, real-data-only.
- Cache-hit rate: no data source exists (ClaudeApiCallRecord has no cache
  field). Rendered as "not recorded" — no invented number (charter A3: honest
  empty states).

## T3 — eval:prompts offline scorer: CONFORMS WITH PROTOCOL-BOUND DIVERGENCE

- Fixed Sports-OS prompt set per ClaudeSurface: 6 prompts, grounded in each
  surface's real job, all passing the repo's own banned-phrase scan.
- Scorer: deterministic static quality rubric + cost from the vendored
  models.dev snapshot. 13 tests incl. negative cases. Report written to
  reports/eval-prompts/<date>.md.
- DIVERGENCE: DoD says "npm run eval:prompts emits a per-surface cost/quality
  report". Hard rule 1 (overnight protocol) and charter Prime Directive 3
  forbid editing any package.json, so the npm script itself could not be
  rewired. The offline report is `npx tsx eval/promptfoo/report.ts`; the live
  promptfoo gate (`npm run eval:prompts`) is unchanged and remains the parity
  check. The harness prompt set works for BOTH paths ({{input}} slot kept).
- Edge cases covered: boundary/negative tests (missing placeholder, banned
  phrase, missing risk disclosure), empty prompts set integrity, determinism
  modulo wall-clock timestamp, clear error messages in the CLI.

## A3 rubric — no outstanding "no" items

- Strict types, zero `any`, no non-null-assertion abuse (removed from tests).
- Tests assert real behavior; no tautologies.
- No fabricated data/pricing/benchmarks; unverified = labeled (model-advisor
  catalog excludes unverified by type; report carries STATIC-analysis note).
- Error handling: throws carry the failing surface/model id; CLI exits non-zero
  on failure.
- No console noise in library code; no dead code; comments state constraints.
- T2 accessible (aria-label, th scope, honest empty state); T3 deterministic,
  no network, dated report, scorer unit-tested.

## Divergence disposition

Both divergences are deliberate, protocol-required, and documented in the
journal. Neither weakens a gate, changes schema, adds a dependency, or touches
a sealed surface.
