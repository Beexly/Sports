# Stale-branch audit — remainder (Sports, repo Beexly/Sports)

Read-only. Every number below comes from `gh api repos/Beexly/Sports/compare/main...<branch>` (three-dot / merge-base semantics) plus the contents API. No repo was fetched, checked out, or written to. Only this file and scratch JSON under `branch-audit/rest/` were created.

## Reference point: what `motif/gse-intelligence-build-2026-10-02` actually holds

- `compare main...motif/gse-intelligence-build-2026-10-02`: **6 ahead / 5 behind**, 40 changed files.
- All 40 changed files are under `intelligence/`. **Zero** files under `packages/prediction-engine` or `packages/ingestion-pipeline`.
- Blob-SHA check on all 38 in-scope paths touched by any branch below: `motif` blob == `main` blob on every one (checked directly as 38 main-vs-motif pairs, and again across the 59 branch×path rows below).

Consequence: for these three directories, "already in motif" is the same statement as "already in main". Any in-scope difference from main listed below is therefore, by construction, something motif does not have. Also: **none of the 12 branches touches `intelligence/` at all** — that directory only moved on main/motif.

## Summary table

| Branch | Last commit | Ahead / behind main | Files changed vs main (all) | In-scope files (`packages/prediction-engine`, `intelligence`, `packages/ingestion-pipeline`) | Differs from main in a way motif does not have? |
|---|---|---|---|---|---|
| claude/sports-prediction-platform-6F7Wa | 2026-04-22 | 16 / 3567 | 53 | 16 | **Yes** — 15 of 16 differ (2 are files main lacks entirely); 1 is byte-identical |
| claude/keen-ptolemy-d0pbK | 2026-05-24 | 48 / 3539 | 117 | 3 | **Yes** — all 3 (2 are files main lacks entirely) |
| claude/keen-ptolemy-d0pbK-codex | 2026-05-24 | 49 / 3539 | 124 | 3 | **Yes** — same three files as its parent branch |
| claude/keen-ptolemy-d0pbK-audit | 2026-05-24 | 50 / 3539 | 128 | 3 | **Yes** — same three files as its parent branch |
| claude/magical-volta-yiUwL | 2026-05-24 | 59 / 3539 | 98 | 21 | **Partly** — 12 of 21 (2 are files main lacks entirely); 8 already in main, 1 byte-identical |
| claude/magical-volta-wXkx2 | 2026-05-30 | 48 / 3402 | 64 | 6 (all tests) | **Yes** — all 6 (4 are files main lacks entirely) |
| claude/laughing-wozniak-gyryjx | 2026-06-22 | 27 / 2971 | 93 | 5 | **Yes** — all 5 (2 are files main lacks entirely) |
| codex/galaxy-dynasty-studio-rescue-v2 | 2026-06-24 | 21 / 2971 | 250 | 0 | **No** — no file in the three directories |
| jarvis/os-foundation-fable5-v1 | 2026-06-13 | 21 / 3228 | 98 | 0 | **No** — no file in the three directories |
| claude/launch-review-fixes | 2026-07-01 | 14 / 2685 | 111 | 2 | **No** — main already contains every edit the branch made to both files |
| fix/overnight-codex-feature-gates-260524 | 2026-05-24 | n/a — compare 404s | n/a | 0 | **No** — orphan lineage, no such directories (see below) |
| codex/autonomy-release-command-center-2026-05-28 | 2026-05-29 | n/a — compare 404s | n/a | 0 | **No** — same orphan lineage (see below) |

"In-scope file" = a file the branch's compare-vs-main list reports under one of the three directories (i.e. the branch side changed it relative to the merge base).

## Per-branch detail

### claude/sports-prediction-platform-6F7Wa — 16 ahead / 3567 behind

16 in-scope files. One (`packages/ingestion-pipeline/vitest.config.ts`) is byte-identical to main. The other 15 differ, and none of the branch's changes are in main:

**Files main does not have at all:**
- `packages/ingestion-pipeline/src/settle-picks.ts` (11,972 bytes; opens `settlePicks — canonical settlement entry point.` … `Phase 1: The Odds API scores (primary — last N days). Phase 2: TheSportsDB supplement…`)
- `packages/ingestion-pipeline/src/__tests__/settle-picks.test.ts` (16,698 bytes)

**Files main has, but the branch's content is absent from main:**
- `packages/ingestion-pipeline/src/index.ts` — branch-only lines: `export type { SettlePicksResult, SettlePicksSummary } from "./settle-picks";` and `export { settlePicks } from "./settle-picks";`
- `packages/prediction-engine/src/constants.ts` — 7 branch-only lines incl. `PLAYOFF_CONTEXT_COMPONENT_MAX: 8`, `export const MODEL_VERSION = "v6.0.0"`, and `// ── Playoff/series context (v6) ───────────────────────────────`
- `packages/prediction-engine/src/game-context.ts` — 76 branch-only lines incl. `name: "Playoff Series Context",`
- `packages/prediction-engine/src/scoring.ts` — 8 branch-only lines incl. `const playoffContextScore = ctx?.playoffContextScore ?? 0;` and `else if (playoffContextScore > 3) contextClauses.push("playoff desperation (trailing in series)");`
- `packages/prediction-engine/src/index.ts` — branch-only lines: `// v6` and `computePlayoffContextScore,`
- `packages/ingestion-pipeline/src/process-sport.ts` — 17 branch-only lines incl. `playoffContext = await detectPlayoffContext(` and `// Playoff/series context (v6): detect if this is part of an active series.`
- `packages/prediction-engine/src/__tests__/game-context.test.ts` (256 branch-only lines, incl. `desperationMultiplier: 1.9, // max desperation → min reliability`), `packages/ingestion-pipeline/src/__tests__/process-sport.test.ts` (264), `packages/prediction-engine/src/__tests__/scoring.test.ts` (2)
- Config: `packages/prediction-engine/package.json` + `packages/ingestion-pipeline/package.json` (`"build": "tsc"`, `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`), `tsconfig.json` in both packages (`"exclude": ["node_modules", "dist", "src/**/*.test.ts"]`)

Cross-checks on main: main's `game-context.ts`, `constants.ts` and `scoring.ts` contain no `Playoff`, `desperation` or `seriesDeficit` string; default-branch code search for `detectPlayoffContext` returns 0 hits. Motif has none of this either (it changes no `packages/` file).

### claude/keen-ptolemy-d0pbK (+ `-codex`, `-audit`) — 48/49/50 ahead, 3539 behind

The three branches carry the same three in-scope files (the `-codex`/`-audit` variants differ only in non-in-scope files):

- `packages/prediction-engine/src/pick-sources.ts` — **absent from main entirely** (1,292 bytes; opens `Pick-level sources aggregator.` … `flattens it into the deduplicated, ACTIVE-only list a consumer wants.`)
- `packages/prediction-engine/src/__tests__/pick-sources.test.ts` — **absent from main entirely** (4,148 bytes)
- `packages/prediction-engine/src/index.ts` — one branch-only line: `export { extractPickSources } from "./pick-sources";`

Default-branch code search for `extractPickSources` returns 0 hits; `pick-sources` does not appear in main's `index.ts`.

### claude/magical-volta-yiUwL — 59 ahead / 3539 behind

21 in-scope files. Split three ways:

- **Main lacks the file (2):** `packages/prediction-engine/src/__tests__/platform-config.test.ts` (6,378 bytes) and `packages/prediction-engine/src/__tests__/readiness-gates.test.ts` (6,484 bytes). Main *does* have the modules under test (`platform-config.ts` sha `6b56383f…`, `readiness.ts` sha `19e6bf63…`), it just has neither test.
- **Branch edits not present in main (10):** `packages/prediction-engine/src/__tests__/evidence-readiness-matrix.test.ts` (59 branch-only lines), `__tests__/game-context.test.ts` (315), `__tests__/scoring.test.ts` (208), `__tests__/signal-snapshot.test.ts` (207), `__tests__/settlement.test.ts` (13), `__tests__/poisson.test.ts` (9), `packages/ingestion-pipeline/src/__tests__/source-snapshot.test.ts` (63), both `package.json` files (adds `"vitest": "^4.1.7"`, `"test": "vitest run"`, `"vite": "^6.4.2"`, `"@sports/types": "*"`), and `packages/ingestion-pipeline/src/source-snapshot.ts` — the single differing line is `export function stableStringify(value: unknown): string {` where main has the same function **unexported** (`function stableStringify(value: unknown): string {`).
- **Already in main (8) / byte-identical (1):** `packages/prediction-engine/src/index.ts`, `game-context.ts`, `kelly.ts`, `readiness.ts`, `scoring.ts`, `packages/ingestion-pipeline/src/index.ts`, `process-sport.ts`, `packages/prediction-engine/src/__tests__/kelly.test.ts` — every line the branch added relative to its merge base exists in main (after normalizing `./x.js` import specifiers); `packages/ingestion-pipeline/vitest.config.ts` is identical to main.

So for this branch the residual unique content is test coverage plus two config bumps, not engine source.

### claude/magical-volta-wXkx2 — 48 ahead / 3402 behind

Six in-scope files, **all test files, no source changes**:

- **Main lacks them entirely (4):** `__tests__/evidence-readiness-matrix-gaps.test.ts` (11,999 bytes), `__tests__/game-context-functions.test.ts` (21,389 bytes; opens `Targeted unit tests for the individual exported pure functions in game-context.ts.`), `__tests__/platform-config.test.ts` (5,607 bytes), `__tests__/readiness.test.ts` (8,275 bytes)
- **Main has a different copy (2):** `__tests__/game-context.test.ts` (97 branch-only lines vs its merge base), `__tests__/signal-snapshot.test.ts` (147)

### claude/laughing-wozniak-gyryjx — 27 ahead / 2971 behind

- `packages/prediction-engine/src/model-promoter.ts` — **absent from main entirely** (10,543 bytes; opens `Champion/Challenger Promoter — safe model version progression.` … `Promotes a challenger to champion only when it demonstrates: 1. Sufficient settled sample (CLV proof threshold)…`)
- `packages/prediction-engine/src/__tests__/model-promoter.test.ts` — **absent from main entirely** (8,589 bytes)
- `packages/prediction-engine/src/index.ts` — 8 branch-only lines: the import block members `ModelMetadata,` `ModelPerformance,` `PromotionConfig,` `PromotionReason,` `promoteModel,`, the comments `// Champion/challenger model promoter — safe version progression` / `// OOS split harness — out-of-sample testing and health assessment`, and `} from "./model-promoter.js";`
- `packages/prediction-engine/src/oos-split.ts` — main **does** have this file (sha `5daca728…`) but without the branch's 8 lines, e.g. `readonly brierDelta: number; // OOS Brier − inSample Brier` and a `healthSummary` string reading `OOS is … than in-sample`
- `packages/prediction-engine/src/__tests__/oos-split.test.ts` — 3 branch-only lines, all comments (Brier arithmetic in the test headers)

Default-branch code search for `promoteModel` returns 0 hits.

### claude/launch-review-fixes — 14 ahead / 2685 behind — **no unique in-scope content**

Both in-scope files (`packages/prediction-engine/src/probability-calibration.ts`, `src/__tests__/probability-calibration.test.ts`) differ from main, but the difference is main-side evolution only:

- every line the branch added relative to its merge base is present verbatim in main (24 lines in the source, 12 in the test — checked line by line, e.g. `const last = groups[groups.length - 1];`, `if (last && last.xStart === s.p) {`, `last.weight += 1;`)
- none of the 15 lines the branch removed are still present in main
- main's copy of `probability-calibration.ts` is ~173 lines larger than the branch's

Verdict: the calibration edit this branch carries is already in main; nothing here that motif is missing.

### codex/galaxy-dynasty-studio-rescue-v2 — 21 ahead / 2971 behind
### jarvis/os-foundation-fable5-v1 — 21 ahead / 3228 behind

Neither branch's compare-vs-main file list contains a single path under `packages/prediction-engine`, `intelligence`, or `packages/ingestion-pipeline` (250 and 98 files changed respectively, all elsewhere). Nothing in scope to rescue.

## The two branches whose compare 404s

`gh api repos/Beexly/Sports/compare/main...fix%2Fovernight-codex-feature-gates-260524` and `...codex%2Fautonomy-release-command-center-2026-05-28` both return HTTP 404 with the message `No common ancestor between main and <branch>.` — so there is no ahead/behind count to report for either.

What they are:

- They are **one lineage, not two**: comparing them to each other works (merge base `f4a1f033…`, the autonomy branch is 3 ahead / 1 behind the gates branch).
- Root of that lineage: `0bcff9e26e7533ded54852eb56b46601af5a4320`, **parents: none** (a true orphan root), authored `Codex <codex@openai.com>` 2026-05-22, message `Harden external cron workflow scheduling and invocation`.
- Lineage size (counted from the commits list with `per_page=1`, last page): 101 commits for `fix/overnight-codex-feature-gates-260524` (head `44d823ca…`, `Codex <codex@local>`, 2026-05-24, `fix(web): add explicit public trust gate helpers with tests`), 103 commits for `codex/autonomy-release-command-center-2026-05-28` (head `322ec192…`, 2026-05-29, `Lock Galaxy 2026 operating plan and autonomous finish system`).
- Also unrelated to `backup/pre-gg-rewrite-4fc09e9e3` and `master` (both compare 404 with "No common ancestor"), while `backup/pre-gg-rewrite-4fc09e9e3` *does* compare cleanly against main (6 ahead / 1075 behind). So this is not the pre-rewrite Sports history.

Which repo they belong to:

- Their tree at head is not the Sports monorepo: root is `.env.example`, `.github`, `.gitignore`, `CODEX_MONETIZATION_V3_MASTER_BRIEF.md`, `README.md`, `apps/`, `docs/`, `package-lock.json`, `package.json`, `scripts/` (+ `reports/` on the autonomy branch). A recursive path filter on the head tree returns **0** matches for `packages/`, `intelligence/`, or `apps/web/app/picks` (339 files total). `package.json` name is `galaxy-sports-edge`.
- Content is the Galaxy Sports Edge **monetization-v3** workspace. Quoting files I opened: README.md — `This repository currently holds the Galaxy Sports Edge monetization v3 operating system and supporting execution artifacts.` with canonical entrypoints `docs/monetization-v3/README.md` and `docs/monetization-v3/17-current-state-handoff.md`; `CODEX_MONETIZATION_V3_MASTER_BRIEF.md` — `**Date:** 2026-05-22` … `Single self-contained document for Codex to execute the Galaxy Sports Edge monetization v3 plan.`
- Sports main has **none** of that: `docs/monetization-v3/README.md`, `CODEX_MONETIZATION_V3_MASTER_BRIEF.md`, `apps/web/app/api/vault/apply/route.ts`, `apps/web/lib/vault/entitlements.ts`, `apps/web/app/loss-room/page.tsx` all 404 on `ref=main`.
- Probes for a home repo, all negative: the head SHA `44d823ca…` and the root SHA `0bcff9e2…` are absent from **all 17 accessible Beexly repos** (`agent-bus`, `autonomous-revenue-engine`, `awesome-ai-agents-2026`, `chick-goodies-kit`, `claude-code-best-practice`, `Clouds-bruh`, `Doug.As-Builders`, `espn-groupme-bot`, `Fablechain`, `gradio-GSN`, `gse-competitive-intel`, `GSN.Cards`, `OmniRoute`, `Project-Tree`, `Sports`, `SupaAgent`, `UltimaScraper`) — every probe returned 404/422. The `Galaxy-Sports-Network` org (I am admin) shows no repositories. No local clone on this machine has this history in its own refs (`git for-each-ref --contains <root> refs/heads` is empty in every local clone checked; they hold it only via `refs/remotes/origin/…`), and a filesystem sweep of `C:\Users\Garrett` (depth ≤9, `node_modules`/`.git`/`AppData` pruned) found no local copy of `docs/monetization-v3` or `CODEX_MONETIZATION_V3_MASTER_BRIEF.md`.

Conclusion I can defend: **they belong to a standalone "galaxy-sports-edge" monetization/ops repository that is not reachable from the Beexly account** (no accessible GitHub repo contains the commits; no local clone owns them), and its history was pushed into `Beexly/Sports` as two orphan branches. Whether that home repo still exists elsewhere I cannot verify from here. Either way the diff is docs/marketing/monetization tooling (`docs/monetization-v3/`, issue templates, a Vault/Stripe/Discord web surface) — **not engine wiring**, and it contains none of the three in-scope directories.

## Method and limits

- Counts (`ahead_by`, `behind_by`, changed-file lists) are straight from the compare API; the API's file list is capped at 300 files — the largest list seen here was 250 (`codex/galaxy-dynasty-studio-rescue-v2`), so none of the 10 comparable branches were truncated (the two 404 branches never produce a list).
- "Main lacks the file" = contents API 404 for that exact path on `ref=main` (confirmed for `settle-picks.ts` + test, `pick-sources.ts` + test, `model-promoter.ts` + test, `platform-config.test.ts`, `readiness-gates.test.ts`, `readiness.test.ts`, `evidence-readiness-matrix-gaps.test.ts`, `game-context-functions.test.ts`).
- "Branch edit not in main" is a **line-level** test: lines the branch added relative to its merge base that do not appear in main's copy, after normalizing `from "./x.js"` to `from "./x"`. It is evidence of absence of that text, not proof that main lacks equivalent logic; where it mattered I cross-checked by grepping main's copies and by default-branch code search (`detectPlayoffContext`, `extractPickSources`, `promoteModel`, `settlePicks` → 0 hits each; GitHub code search indexes only the default branch, so a 0 is supporting evidence, not a guarantee).
- Motif comparison is blob-SHA equality against main for every in-scope path, so it is exact, not heuristic.
- All file content quoted above was fetched and opened during this audit (branch ref, `main`, `motif`, and merge base). Nothing outside these three directories was evaluated, and no wiring recommendation is implied for the config/package.json deltas.
