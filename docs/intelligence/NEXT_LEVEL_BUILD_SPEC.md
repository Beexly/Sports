# Next-Level Intelligence — Build Spec & Execution Handoff

**Status**: Executable spec. Design decisions are made; this is for a follow-on
executor to build mechanically — the Hermes overnight run
(`docs/ops/HERMES_OVERNIGHT_PROTOCOL.md`, tasks T2–T3 only) or any stronger
interactive session.
**Author**: Fable 5 (design + hard decisions), 2026-08-12.
**Reads with**: `NEXT_LEVEL_INTELLIGENCE_MASTER_PLAN.md`,
`docs/ops/DEV_LEVERAGE_RUNBOOK.md`, `docs/reference/MODEL_LANDSCAPE.md`.

> **How to use this handoff.** Everything below is decided and unambiguous. Build
> tasks top-to-bottom. Each task has: exact files, full type/interface design,
> test list, and a Definition of Done. Do not deviate into the fabricated
> handbook stack. When a task says "change proposal required," write the ADR and
> STOP for owner approval — do not implement product-surface/schema/registry
> changes without it.

---

## 0. Guardrails for the implementer (read first)

**Never:**
- `npm install` anything from the DeepSeek handbook (see Appendix A — all 404s,
  typosquats, or name-collisions). Add **no** new dependencies without an approved
  change proposal.
- Touch the sealed AI Control Plane, activate the dormant provider registry
  (`apps/web/lib/ai-control-plane/provider-registry.data.ts`), or change schema
  without an ADR + owner approval.
- Fabricate data, picks, odds, benchmarks, or pricing. Mark unverified as unverified.
- Fuse dev-workflow tooling (Ollama/Aider/routers) into the product as runtime deps.

**Always, before every commit:**
```bash
npm run typecheck && npm run lint
npx vitest run tools/model-advisor            # for Task 1
npm run guard:performance-claims && npm run guard:commercial-copy   # docs safety
```
Green on all → commit. Red → fix before proceeding.

**Branch**: `claude/fable-5-ultracode-plan-ptru4e` (this branch). Draft PR only.

---

## Task 1 — `model-advisor` tool (the real "self-router" + reference)

> **STATUS: IMPLEMENTED & VERIFIED** (this session, Fable 5). Lives at
> `tools/model-advisor/` — strict tsc clean, 15/15 Vitest tests green, CLI
> smoke-tested. The spec below is kept as the record of the design.
> Overnight run log: `handoff/OVERNIGHT_JOURNAL.md` (see entry for T2/T3).

Delivers what the thread asked for: a models/pricing/rankings reference AND a
deterministic "pick the best engine for this task" function. **Dev-facing tool,
standalone, zero new deps** (pure TS, run with `tsx`, test with Vitest). It does
**not** import from or modify `apps/`, `packages/`, or the control plane.

### 1.1 File layout
```
tools/model-advisor/
  types.ts            # types only
  catalog.ts          # MODEL_CATALOG data (mirror of MODEL_LANDSCAPE.md §A/B)
  recommend.ts        # pure recommendModel()
  cli.ts              # `tsx tools/model-advisor/cli.ts list | recommend ...`
  recommend.test.ts   # Vitest, co-located (repo convention: *.test.ts)
  README.md           # usage
```

### 1.2 Types (`types.ts`)
```ts
export type VerificationStatus = "verified" | "known-real" | "unverified";
export type ModelRole =
  | "local-primary" | "local-coder" | "reasoning"
  | "frontier" | "cheap-frontier" | "long-context" | "multimodal";
export type Tier = "local" | "openrouter" | "frontier" | "batch";

export interface ModelEntry {
  id: string;                 // e.g. "qwen3-coder-30b-a3b"
  label: string;              // human name
  provider: string;
  hfRepo: string | null;      // null for hosted-only
  license: string;
  verification: VerificationStatus;
  localRunnable: boolean;     // true if GGUF/Ollama path exists
  roles: ModelRole[];
  contextTokens: number | null;
  reportedInputUsdPerM: number | null;   // null for local/unknown; tagged "reported"
  reportedOutputUsdPerM: number | null;
  notes: string;
}

export type TaskKind =
  | "coding" | "reasoning" | "agentic" | "long-context" | "multimodal" | "bulk";

export interface TaskProfile {
  kind: TaskKind;
  complexity: number;         // 1..10
  contextTokens?: number;
  toolUse?: boolean;
  privacy?: "local-only" | "any";   // default "any"
  budget?: "free" | "cheap" | "any"; // default "any"
}

export interface Recommendation {
  tier: Tier;
  primary: ModelEntry;
  fallbacks: ModelEntry[];
  rationale: string;
}
```

### 1.3 Catalog (`catalog.ts`)
- Export `export const MODEL_CATALOG: ModelEntry[]`.
- Populate from `docs/reference/MODEL_LANDSCAPE.md` §A + §B **only** (verified /
  known-real rows). Do **not** add the ⚠️ unverified §C models to the catalog;
  they may be listed in README as "verify first," but the recommender must never
  return an unverified model.
- Local rows (`localRunnable: true`): Muse Glimmer 30B, Qwen3-Coder-30B-A3B,
  Qwen2.5-Coder-32B/7B, DeepSeek-Coder-V2, (GLM-5.2 = localRunnable but flag
  `notes: "large — API/OpenRouter unless high VRAM"`).
- Frontier rows: Claude Fable 5 / Opus 5 / Sonnet 5 / Haiku 4.5 with
  `reported*` pricing and `verification: "known-real"`.

### 1.4 Recommender (`recommend.ts`) — deterministic rules
`export function recommendModel(task: TaskProfile, catalog = MODEL_CATALOG): Recommendation`

Rule order (first match wins for tier; primary = best-fit within tier):
1. `privacy === "local-only"` → restrict candidate set to `localRunnable`. Tier
   `local`. If `kind === "multimodal"` → Muse Glimmer; else Qwen3-Coder-30B (or
   Qwen2.5-Coder-7B if `complexity <= 2`). Never return a non-local model here.
2. `kind === "bulk"` → tier `batch`; primary a cheap frontier (Haiku/Sonnet);
   rationale notes Batch API −50%.
3. `kind === "multimodal"` → prefer Muse Glimmer (local) unless `complexity >= 9`
   then a frontier multimodal; tier accordingly.
4. `contextTokens ?? 0 > 200_000` or `kind === "long-context"` → tier `frontier`
   (or a long-context local if it qualifies); primary a long-context model.
5. Else by `complexity`:
   - `<= 3` → tier `local`, Qwen3-Coder / Qwen2.5-Coder-7B.
   - `4..6` → tier `openrouter`, GLM-5.2 / DeepSeek (fallback local).
   - `7..8` → tier `openrouter` frontier-open, or `frontier` Sonnet if `toolUse`.
   - `9..10` → tier `frontier`, Claude Opus/Fable; rationale: reserve for hardest.
- `fallbacks`: next 1–2 best candidates by tier cost order (local < openrouter <
  frontier). `rationale`: one sentence citing the deciding factor(s).

### 1.5 CLI (`cli.ts`)
- `tsx tools/model-advisor/cli.ts list` → prints a table (id, label, license,
  local?, roles, reported $I/$O) grouped by local vs frontier.
- `tsx tools/model-advisor/cli.ts recommend --kind coding --complexity 2 --privacy local-only`
  → prints tier, primary, fallbacks, rationale.
- Pure `process.argv` parsing; no arg-parser dependency.

### 1.6 Tests (`recommend.test.ts`, Vitest)
Required cases (all must pass):
1. `{kind:"coding", complexity:2, privacy:"local-only"}` → `tier==="local"` and
   `primary.localRunnable === true`.
2. `{kind:"multimodal", complexity:4}` → `primary.id` is Muse Glimmer.
3. `{kind:"coding", complexity:10}` → `tier==="frontier"` and primary provider is
   Anthropic.
4. `{kind:"bulk", complexity:5}` → `tier==="batch"`.
5. `{kind:"long-context", complexity:6, contextTokens:500_000}` → long-context primary.
6. Property: for `privacy:"local-only"` across complexity 1..10, `primary` and all
   `fallbacks` are `localRunnable`.
7. Data-integrity: every `MODEL_CATALOG` entry has non-empty `id`,`label`,`license`,
   `roles`, and `verification !== "unverified"`.

### 1.7 Definition of Done (Task 1)
- `npx vitest run tools/model-advisor` → all green.
- `npx tsc --noEmit` on the tool files clean (no `any`, strict).
- `npm run lint` clean.
- No new entries in any `package.json`; no imports outside node built-ins + local files.
- README shows two example invocations with real output.

---

## Task 2 — Router legibility card (cockpit, read-only) — *Phase 1*

Make the **existing** Jynx routing observable. Read-only; no schema; reads existing
budget/event-ledger data.
- Files: `apps/web/app/cockpit/api-costs/**` (add a card component),
  read from `apps/web/lib/claude-api/budget-store.ts` + the event ledger.
- Show per-surface: lane/tier used (from `model-router.ts` `SURFACE_TIER`),
  request count, cache-hit rate, reported $ per surface.
- **DoD**: card renders from real data; no new deps; `typecheck`+`lint`+ relevant
  `__tests__/ai-control-plane-*` still green; add a component test.

## Task 3 — `eval:prompts` → router quality harness — *Phase 1*
Extend the existing `npm run eval:prompts` into the real version of the handbook's
fictional `benchmark`/`rsi-validate`.
- Locate the current `eval:prompts` entry (root `package.json`) and its impl.
- Add a fixed Sports-OS prompt set per `ClaudeSurface`, scored for cost + a simple
  quality rubric; output a dated report to `reports/` (dir already exists).
- **DoD**: `npm run eval:prompts` emits a per-surface cost/quality report;
  deterministic; tests cover the scorer; no fabricated scores.

## Task 4 — Governed local inference lane — *Phase 2, CHANGE PROPOSAL REQUIRED*
Write `docs/adr/NNN-local-inference-lane.md` proposing activation of the reserved
`local` economic class / `local-none` route for a **shadow-only** Ollama lane
(Muse Glimmer / Qwen3-Coder), internal/non-published surfaces only, behind a flag,
respecting the transport import-boundary guard. **Do not implement until approved.**

## Task 5 — Calibration/regression loop — *Phase 3, proposal + engine*
Turn shadow-engine + BAEE + calibration into a scheduled weekly shadow-vs-live
regression on settled outcomes; promotions gated by
`docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md`. Extends the existing weekly
shadow-vs-live workflow. Proposal for any scheduling/promotion change.

## Task 6 — Ambition/evolution engine (proposals-only) — *Phase 4, proposal*
Build on `apps/web/lib/autonomy/operating-kernel.ts`. The engine emits
**human-ratified proposals** into `docs/adr/` + the change-feed — never self-merges.
Sources cleared/facts-only/attributed via the clearance engine. Proposal required.

---

## Execution order (backlog)

- [x] **T1** model-advisor tool — **done & verified** (`tools/model-advisor/`).
- [x] **T2** router legibility cockpit card (read-only). *(Hermes-eligible)* — committed `41801e6b9` (implementation at `apps/web/app/cockpit/api-costs/routing-legibility.tsx`; see Phase 1 summary in `handoff/PHASE1_SUMMARY.md`).
- [x] **T3** eval:prompts quality harness. *(Hermes-eligible)* — committed `de4288d9b` (implementation at `eval/promptfoo/`; see Phase 1 summary in `handoff/PHASE1_SUMMARY.md`).
- [ ] **T4** ADR: governed local lane → STOP for approval.
- [ ] **T5** calibration/regression loop (after T3 + approval).
- [ ] **T6** ambition/evolution proposals engine (last; proposal-gated).

T1–T3 are safe to build and merge now. T4–T6 require change proposals before any
product/schema/registry code.

---

## Appendix A — Disposition of the uploaded DeepSeek corpus

| Uploaded artifact | What it is | Disposition |
|---|---|---|
| `*_f084be.txt` (Ultimate Handbook) | Full fabricated blueprint | Reference only; **not merged**. Superseded by this plan. |
| `sports-os.ts` / orchestrator | Imports fabricated pkgs (`teia-router`, `securellm-agentguard`, `@cyberstrike/sdk`, npm `litellm`) | **Won't compile; not merged.** Good ideas captured in Phases 1–4. |
| Evolution Engine `*.ts` | Imports non-existent `./meta-rl`, `./registry` | Idea → Task 6 (governed, on autonomy kernel). Code not merged. |
| Ambition Engine `*.ts` | Imports `axios` + `ruflo` as product dep | Idea → Task 6. Code not merged (no product dep on a dev orchestrator). |
| Regression Engine `*.ts` | Generic shape, references handbook baselines | Idea → Task 5 (built on real shadow engine). Code not merged. |
| Semantic Cache `*.ts` | Imports non-existent JS `transformers` | Idea → deferred; if needed, use real `@huggingface/transformers` + proposal. |
| `*.rego` guardrails | Real concept, but `default allow = true` makes rules moot (logically broken) | Concept → real OPA policy via proposal if/when a guard needs it. Not merged as-is. |
| `*_install.sh` | `brew install --cask cc-switch`, `npm i lite11m`, `curl|bash ruflo` | **Do not run.** Fabricated/dangerous. Not merged. |
| `*.py` | DeepSeek-generated Python helper | Reference only; not merged (repo is TS). |
| `*.tex` / `baxley_cept_document.pdf` | Owner's concept/CEPT doc (LaTeX + PDF) | Owner's own material — left untouched; not auto-merged. Review manually. |

All "ideas worth keeping" are already routed into Tasks 1–6 above with real,
governed implementations. Nothing from the corpus enters the repo as code or deps.
