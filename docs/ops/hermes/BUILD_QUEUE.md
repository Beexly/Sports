# HERMES JOB 2 — BUILD QUEUE

Eight tasks, ordered safest-first. Build them in order, one at a time. Commit each one
separately. Do not push. Then stop.

Read this whole file once before starting H1.

---

## 0. THE SIX HARD RULES

**RULE 1 — `git push` is forbidden.** Every task commits locally. The owner reads the
diff in the morning and pushes. If you push, the owner loses the ability to reject your
work cheaply, which is the entire safety model for this run.

**RULE 2 — Each task has a `FILES YOU MAY TOUCH` list. It is exhaustive.**
Not "mostly these" — exactly these. If finishing a task seems to require editing a file
that is not on its list, that means the task is under-specified. Stop that task, write
why in the journal, and go to the next one. Do not widen the list yourself.

**RULE 3 — These are permanently off-limits, in every task:**
```
packages/db/prisma/schema.prisma        any migration under packages/db/prisma/migrations/
.github/workflows/**                    scripts/guardrails/**
.claude/**                              .env, .env.local, any .env*
package-lock.json                       apps/web/lib/ai-control-plane/**
```
Also: **never run** `npm install <anything>`, `prisma migrate`, `prisma db push`,
`prisma db seed`, or anything that connects to a database. Adding a dependency requires
owner approval that you do not have. `npm install` with no arguments — restoring the
lockfile that already exists — is fine and is part of setup.

**RULE 4 — Two strikes, then move on.**
If a task's Definition of Done fails twice, you are done with that task. Undo it:
```bash
git checkout -- <the files on that task's list that already existed>
rm -f <the files on that task's list that you created>
git status --short          # must be clean before you start the next task
```
Journal it as `H<n> ABANDONED — <the exact error text>`. Then go to the next task. A
clean six-of-eight is a good night. A tangled eight-of-eight is a bad one.

**RULE 5 — Every commit is tagged and scoped.**
```bash
git add <only the files on this task's list>
git commit -m "[hermes-H<n>] <what you built in one line>"
```
Never `git add -A`, never `git add .`, never `git commit -a`. Add files by name. This is
what lets the owner drop one bad task with `git rebase -i` without losing the rest.

**RULE 6 — No new dependencies, no fabricated data, no `any`.**
The repo is TypeScript strict. `any`, `as any`, `@ts-ignore`, and `@ts-expect-error` will
fail review even if they compile. Every number that reaches a user must come from real
data — never invent a stat, a price, a benchmark, or a result to make output look
complete.

---

## 1. SETUP — once, before H1

```bash
cd <repo root>
git rev-parse --abbrev-ref HEAD          # must be claude/fable-5-ultracode-plan-ptru4e
git status --short                       # must be empty
npm install                              # restores the existing lockfile; runs prisma generate
mkdir -p handoff
```

If the branch is wrong or `git status` is dirty, **stop** and write why in
`handoff/JOURNAL.md`. Do not switch branches and do not discard someone else's work.

Then confirm the starting line — you need to know these numbers so you can tell later
whether *you* broke something:

```bash
npm run typecheck                        # expected: exit 0
npm run lint                             # expected: exit 0
node scripts/guardrails/run-all.mjs      # expected: 20/25 passed
```

Write all three results into `handoff/JOURNAL.md` under `=== BASELINE ===`.

The five expected guard failures are `model-freeze`, `api-v1-boundary`,
`ai-transport-import-boundary`, `actor-minting-boundary`, `ai-council`. They are
pre-existing and **not yours to fix** — they are on the off-limits list in RULE 3.
If a *sixth* guard fails at baseline, stop and journal it; the ground moved and the
task specs below assume it did not.

After **every** task, append one line to `handoff/JOURNAL.md`:

```
H<n> | <HH:MM> | <DONE|ABANDONED> | <commit hash or "-"> | <one-line note>
```

---

## 2. THE VERIFY BLOCK

Several tasks end with "run the verify block." It is always these three commands, and
all three must pass before you commit:

```bash
npm run typecheck        # exit 0
npm run lint             # exit 0
npx vitest run <the test file you wrote>    # all green
```

If typecheck or lint was already failing at baseline, that is not your problem — but
the *number* of errors must not have gone up. If it did, your change caused it.

---

# THE TASKS

---

## H1 — Create the missing change-proposal template

**Why this is first:** it is documentation only, it cannot break a build, and it is a
warm-up that proves your file-writing path works before anything risky.

**The gap:** `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md` and
`docs/adr/005-entity-graph-minimal-schema.md` both instruct contributors to fill out
`docs/adr/pre-implementation-change-proposal-template.md` before making schema or
dependency changes. **That file does not exist.** Two documents point at a void.

**FILES YOU MAY TOUCH**
```
docs/adr/pre-implementation-change-proposal-template.md      (create)
```

**WHAT TO BUILD**

Read `docs/adr/003-server-side-paywall-hardening.md` and
`docs/adr/005-entity-graph-minimal-schema.md` first — match their voice and heading
depth. Then write the template with exactly these sections, each containing a short
italic instruction line for whoever fills it in:

1. `# Change Proposal — <title>` with a metadata block: Date, Status
   (Proposed / Approved / Rejected), Author, Affects (schema / dependency /
   product surface / registry / CI).
2. `## What changes` — the concrete diff in plain words.
3. `## Why now` — the problem, and what stays broken without it.
4. `## Alternatives considered` — at least two, with why each was rejected.
5. `## Blast radius` — what breaks if this is wrong. Name files and tables.
6. `## Rollback` — the literal commands to undo it.
7. `## Which non-negotiable rules this touches` — a checklist of the seven rules from
   `CLAUDE.md` (no fake data · no fabricated stats · no frontend-only paywalls · no
   secrets in code · no stale data · tests required · types required), each with a line
   for how the change satisfies it.
8. `## Owner approval` — a signature line. Explicit: *unapproved proposals are not
   implemented.*

**DEFINITION OF DONE**
```bash
test -f docs/adr/pre-implementation-change-proposal-template.md && echo OK
grep -c "^## " docs/adr/pre-implementation-change-proposal-template.md   # must be >= 7
node scripts/guardrails/no-unsupported-performance-claims.mjs            # exit 0
node scripts/guardrails/commercial-copy-scan.mjs                         # exit 0
```
Then commit as `[hermes-H1]`.

---

## H2 — Inventory report on unused agent tooling

**Why:** the repo carries `.agents/` (1.4 MB) and `.claude/commands/` (34 files,
140 KB). A previous audit suspected most of it is unrelated to this project. Nobody has
counted. **You are counting. You are not deleting.**

**FILES YOU MAY TOUCH**
```
handoff/INVENTORY.md      (create — note: handoff/, not docs/)
```

**WHAT TO BUILD**

```bash
ls -la .agents/skills/
du -sh .agents/skills/*
ls -la .claude/commands/
du -sh .claude/commands/* | sort -rh | head -20
```

Then, for each item in both directories, check whether anything else in the repo refers
to it:

```bash
for d in .agents/skills/*/; do
  n=$(basename "$d")
  c=$(git grep -l "$n" -- . ":(exclude).agents" | wc -l)
  echo "$n | $c reference(s) outside .agents"
done
```

Write `handoff/INVENTORY.md` with three tables: `.agents/skills` (name, size,
references), `.claude/commands` (name, size, references), and a summary line giving
total bytes and how many items have **zero** outside references.

Then add one short paragraph: which items are plainly unrelated to a sports-prediction
platform (judge by name and by the first ten lines of the file), and which are clearly
in use. **Recommend nothing. Delete nothing.** This is a count for a human to act on.

**DEFINITION OF DONE**
```bash
test -f handoff/INVENTORY.md && echo OK
git status --short          # must show ONLY handoff/INVENTORY.md
```
**Do not commit this one** — `handoff/` is a scratch directory for reports, not repo
content. Journal it as DONE with `-` for the commit hash.

---

## H3 — Pin the promptfoo version

**Why:** `package.json` line 27 runs `npx promptfoo@latest`. `@latest` means the version
that executes tomorrow is not the version that executed today — an unreviewed package
upgrade every single run. The current published version is **0.122.0**.

**FILES YOU MAY TOUCH**
```
package.json      (modify — exactly one line)
```

**WHAT TO BUILD**

Change:
```json
"eval:prompts": "npx promptfoo@latest eval -c eval/promptfoo/promptfooconfig.yaml",
```
to:
```json
"eval:prompts": "npx promptfoo@0.122.0 eval -c eval/promptfoo/promptfooconfig.yaml",
```

That is the whole task. Do not touch any other script. Do not run `npm install`. Do not
run `npm run eval:prompts` — it costs real money and needs an API key you do not have.

**DEFINITION OF DONE**
```bash
node -e "console.log(require('./package.json').scripts['eval:prompts'])"   # shows 0.122.0
git diff --stat package.json      # must read: 1 file changed, 1 insertion(+), 1 deletion(-)
```
If `git diff --stat` shows more than one changed line, your editor reformatted the file.
Undo everything (`git checkout -- package.json`) and redo it by changing only that one
string. Then commit as `[hermes-H3]`.

---

## H4 — Entity name normalization (pure function)

**Why:** `packages/db/prisma/schema.prisma` now has an `Entity` model with a unique
constraint on `(entity_type, normalized_name, sport)`. Nothing computes
`normalized_name`. Without it the constraint cannot be honored and the table cannot be
written to correctly. This function is the missing primitive, and it has zero
dependencies — no database, no network, no imports beyond types.

**FILES YOU MAY TOUCH**
```
apps/web/lib/entity-graph/normalize.ts        (create)
apps/web/lib/entity-graph/normalize.test.ts   (create)
```

**WHAT TO BUILD**

There is already a `normalizeName` in `apps/web/lib/resource-intelligence/classify.ts`
for a completely different domain. **Do not import it and do not modify it.** Name yours
`normalizeEntityName` so the two never get confused.

```ts
export function normalizeEntityName(raw: string): string
```

Apply these steps **in this exact order**:

1. Unicode-normalize with `raw.normalize("NFKD")`, then strip combining marks with
   `.replace(/[̀-ͯ]/g, "")`. This is what turns `Nikola Jokić` into
   `Nikola Jokic`.
2. Lowercase.
3. Remove all periods and apostrophes with **no** replacement character, so `A.J.`
   becomes `aj` and `O'Neal` becomes `oneal`.
4. Replace every remaining run of non-alphanumeric characters with a single space.
5. Collapse runs of whitespace to one space, and trim.
6. Strip a trailing generational suffix — `jr`, `sr`, `ii`, `iii`, `iv`, `v` — but
   **only** when it is the final whitespace-separated token **and** there are at least
   two other tokens before it. (`Odell Beckham Jr.` → `odell beckham`, but a person
   whose entire name is `Jr` keeps it.)

Return the result. Empty input returns `""`. Never throw.

**Required tests** — write exactly these, each as its own `it(...)`:

| Input | Expected output |
|---|---|
| `"A.J. Brown"` | `"aj brown"` |
| `"AJ Brown"` | `"aj brown"` |
| `"  Patrick   Mahomes  "` | `"patrick mahomes"` |
| `"Nikola Jokić"` | `"nikola jokic"` |
| `"Shaquille O'Neal"` | `"shaquille oneal"` |
| `"Odell Beckham Jr."` | `"odell beckham"` |
| `"Ken Griffey Sr"` | `"ken griffey"` |
| `"Robert Griffin III"` | `"robert griffin"` |
| `"St. Louis Cardinals"` | `"st louis cardinals"` |
| `""` | `""` |
| `"---"` | `""` |

Plus one idempotence test: for every input above,
`normalizeEntityName(normalizeEntityName(x)) === normalizeEntityName(x)`.

Plus one collision test asserting that `"A.J. Brown"` and `"AJ Brown"` produce the
**same** string — that convergence is the entire reason this function exists.

**DEFINITION OF DONE**
```bash
npx vitest run apps/web/lib/entity-graph/normalize.test.ts    # 13+ tests, all green
npm run typecheck                                             # exit 0
npm run lint                                                  # exit 0
git grep -n "any" apps/web/lib/entity-graph/normalize.ts      # must return nothing
```
Then commit as `[hermes-H4]`.

---

## H5 — Entity graph repository layer

**Why:** the `Entity` / `EntityEdge` models exist in the schema and nothing reads or
writes them. This is the typed access layer. It must be testable with **no database**,
so it takes its client by injection.

**FILES YOU MAY TOUCH**
```
apps/web/lib/entity-graph/repository.ts        (create)
apps/web/lib/entity-graph/repository.test.ts   (create)
apps/web/lib/entity-graph/index.ts             (create)
```

**THE PATTERN TO COPY**

Open `apps/web/lib/claude-api/usage-store.ts` and read it before writing anything. It
does exactly what you need: it declares a small structural interface
(`ClaudeUsageStoreDb`) describing only the Prisma methods it uses, defaults the
parameter to the real `db`, and casts once at the default. That makes every function
unit-testable with a hand-written fake and **no** database connection. Follow that shape
precisely. If your test needs a live database, you have built it wrong.

**WHAT TO BUILD**

```ts
export interface EntityGraphDb { /* only the prisma methods you actually call */ }

export async function upsertEntity(
  input: {
    entityType: EntityType;
    canonicalName: string;
    sport?: string;
    externalIds?: Record<string, string>;
    sourceTier: number;
    attributes?: Record<string, unknown>;
    observedAt?: Date;
  },
  db: EntityGraphDb = defaultDb as unknown as EntityGraphDb,
): Promise<{ id: string; normalizedName: string }>
```
- Computes `normalizedName` with `normalizeEntityName` from H4.
- `sport` defaults to `""`. **Never `null`, never `undefined`.** Read the "sport is NOT
  NULL DEFAULT ''" paragraph in `docs/adr/005-entity-graph-minimal-schema.md` before you
  touch this — Postgres treats NULLs as *distinct* inside a unique index, so a null
  `sport` silently defeats the deduplication the table exists to provide.
- Upserts on the unique triple `(entityType, normalizedName, sport)`.
- Sets `firstSeenAt` on create; always updates `lastSeenAt`.

```ts
export async function linkEntities(
  input: {
    fromEntityId: string;
    toEntityId: string;
    relation: string;
    sourceTier: number;
    sourceRef: string;
    observedAt: Date;
    confidence?: number;
    validFrom?: Date | null;
    validTo?: Date | null;
  },
  db: EntityGraphDb = defaultDb as unknown as EntityGraphDb,
): Promise<void>
```
- **Throws** if `sourceRef` is empty/whitespace or if `sourceTier` is not a finite
  number. An edge with no provenance is a fabricated relationship, which repo rule #2
  forbids. This guard is the most important line in the file — write the test for it
  first.
- `confidence` defaults to 50 and is clamped to 0–100.
- Upserts on `(fromEntityId, relation, toEntityId, observedAt)` so re-ingesting the same
  observation twice is a no-op rather than a duplicate row.

```ts
export async function findEntity(
  entityType: EntityType,
  name: string,
  sport?: string,
  db: EntityGraphDb = defaultDb as unknown as EntityGraphDb,
): Promise<Entity | null>
```
- Normalizes `name` first, then looks up the unique triple.

```ts
export async function neighbors(
  entityId: string,
  opts?: { relation?: string; direction?: "out" | "in" | "both"; limit?: number },
  db: EntityGraphDb = defaultDb as unknown as EntityGraphDb,
): Promise<readonly EntityEdge[]>
```
- One hop only. `direction` defaults to `"both"`, `limit` defaults to 100 and is capped
  at 500. **Do not write a recursive traversal** — that is a separate, later change.

`index.ts` re-exports the four functions plus `normalizeEntityName`. Nothing else.

**Required tests** (all against an in-memory fake, no DB):
1. `upsertEntity` with `sport` omitted passes `""` to the client — assert on the exact
   argument the fake received.
2. `upsertEntity("A.J. Brown")` and `upsertEntity("AJ Brown")` produce the same
   `normalizedName`.
3. `linkEntities` **throws** when `sourceRef` is `""`.
4. `linkEntities` **throws** when `sourceRef` is `"   "`.
5. `linkEntities` clamps `confidence: 150` to `100` and `confidence: -5` to `0`.
6. `linkEntities` defaults `confidence` to `50` when omitted.
7. `findEntity` normalizes before querying — assert the fake received the normalized
   form, not the raw string.
8. `neighbors` caps `limit: 9999` at `500`.
9. `neighbors` with `direction: "out"` queries only the `fromEntityId` side.

**IF `EntityType` DOES NOT IMPORT**

The Prisma client may not have been regenerated. Run `npm run db:generate` (this reads
`schema.prisma` and writes the client — it does **not** connect to a database and is
safe). If it still fails, **abandon this task under RULE 4** and journal the exact
error. Do not work around it by declaring your own `EntityType` union or by widening a
type to `string` — a hand-written duplicate of a generated enum silently rots the moment
the schema changes.

**DEFINITION OF DONE**
```bash
npx vitest run apps/web/lib/entity-graph/          # all green, including H4's tests
npm run typecheck                                   # exit 0
npm run lint                                        # exit 0
git grep -n "as any\|: any" apps/web/lib/entity-graph/   # must return nothing
git status --short                                  # no changes to schema.prisma
```
Then commit as `[hermes-H5]`.

---

## H6 — Router legibility card in the cockpit

**Why:** `apps/web/lib/claude-api/model-router.ts` decides which Claude tier answers
each surface, and `SURFACE_RECOMMENDED` records which tier *should* answer it once
validated. That gap is money — and today it is invisible unless you read the source.
This makes it a card on a page the owner already looks at.

**FILES YOU MAY TOUCH**
```
apps/web/components/cockpit/router-legibility-card.tsx        (create)
apps/web/__tests__/router-legibility-card.test.tsx            (create)
apps/web/app/cockpit/api-costs/page.tsx                       (modify — one import, one <section>)
```

**READ THIS BEFORE YOU START — the trap in this task**

There are **two different surface vocabularies** in this codebase and they do not
overlap:

- `ClaudeSurface` in `model-router.ts` — 6 values, lowercase/kebab:
  `studio`, `journal`, `calibration-insight`, `model-court`, `content`, `brief`.
- `ClaudeApiSurface` in `cost-monitor.ts` — 9 values, SCREAMING_SNAKE:
  `BLOG_GENERATION`, `STUDIO_GENERATION`, … `OTHER`.

The existing page renders `ClaudeApiSurface` (budget rows). **Your card renders
`ClaudeSurface` (routing rows).** Do not try to join, map, or reconcile them. Do not
rename either one. Two tables about two different things on one page is correct here;
inventing a mapping between them would be a fabricated relationship.

**WHAT TO BUILD**

The data source is already built, pure, and offline — `surfaceEconomics()` in
`apps/web/lib/claude-api/model-economics.ts`. It returns one row per `ClaudeSurface`
with `activeTier`, `recommendedTier`, `activeBlended`, `recommendedBlended`, and
`savingsFraction`, computed from a vendored price snapshot. **No database call, no
network call, no new data plumbing.** Call it and render it.

The component:
```tsx
export function RouterLegibilityCard(): JSX.Element
```
A `<section>` matching the visual language of the sibling sections in `page.tsx` — same
`rounded-lg border border-titanium/40 bg-obsidian/60` shell, same header treatment, same
`overflow-x-auto` table wrapper. Copy those class strings from `page.tsx`; do not invent
new ones and do not add a stylesheet.

Columns: **Surface · Active tier · Recommended tier · Active $/Mtok · Recommended $/Mtok
· Savings if flipped**.

Rules for the rows:
- Sort by `savingsFraction` descending, so the biggest unclaimed saving is at the top.
- When `activeTier === recommendedTier`, render the savings cell as `—`, not `0%`.
- When `savingsFraction` is negative (the recommendation is an *upgrade*, which is true
  for `model-court`), render it as e.g. `+140% cost` — never as a negative saving. A
  cost increase displayed as a saving is exactly the kind of quietly-wrong number this
  repo's rules exist to prevent.
- Format currency with `Intl.NumberFormat`, matching the `formatUsd` helper already at
  the bottom of `page.tsx`. Blended costs are dollars per million tokens and are small —
  use enough decimal places that they do not all render as `$0.00`.
- Add one line of caption text under the header stating that these figures come from a
  vendored price snapshot and that a tier flip requires passing the promptfoo gate
  first. Do not overstate it as live pricing.

Wire it into `page.tsx` by adding the import and placing `<RouterLegibilityCard />`
directly **after** the "Surface Budgets" section and **before** "Recent Errors". Change
nothing else in that file.

**Required tests** (Testing Library, following the pattern of any existing test in
`apps/web/__tests__/`):
1. Renders one row per `ClaudeSurface` — assert exactly 6 data rows.
2. `brief` shows active tier `haiku`.
3. `model-court` shows active `sonnet` and recommended `opus`.
4. A surface where active equals recommended renders `—` in the savings cell.
5. `model-court`'s savings cell does **not** contain a `-` sign (it is an upgrade and
   must read as added cost).

**DEFINITION OF DONE**
```bash
npx vitest run apps/web/__tests__/router-legibility-card.test.tsx   # all green
npm run typecheck                                                   # exit 0
npm run lint                                                        # exit 0
git diff --stat apps/web/app/cockpit/api-costs/page.tsx             # ~2 lines changed, no more
```
Then commit as `[hermes-H6]`.

---

## H7 — Offline routing-cost report

**Why:** `npm run eval:prompts` is the *quality* gate, but it needs `ANTHROPIC_API_KEY`
and costs money, so it cannot run in CI or unattended. The *cost* half of the same
question is fully computable offline from the vendored snapshot. This makes that half
runnable any time, for free, deterministically.

**Scope discipline:** this task builds a cost/routing report. It does **not** score model
quality. Do not add anything that calls an LLM, and do not label any output as a quality
score. The report must state in its own header that quality parity is validated
separately by `npm run eval:prompts` and is not measured here.

**FILES YOU MAY TOUCH**
```
scripts/eval/routing-cost-report.mjs        (create)
scripts/eval/routing-cost-report.test.mjs   (create)
package.json                                (modify — add exactly one script line)
```

**WHAT TO BUILD**

A plain Node ESM script (`.mjs`, run by `node`, matching the style of
`scripts/guardrails/run-all.mjs` — read it first for the house style: top-of-file
comment explaining *why* the file exists, `node:` prefixed built-in imports, no
dependencies).

Behavior:
- Reads the same vendored price snapshot `model-economics.ts` uses. Since a `.mjs`
  script cannot import a `.ts` module directly, read the snapshot **JSON** file itself
  and recompute the blended costs in the script. Find the snapshot by following the
  `import` at the top of `apps/web/lib/claude-api/model-economics.ts`.
- Recomputes, per surface: active tier, recommended tier, blended cost of each, and the
  savings fraction. Blended cost is `input * 0.75 + output * 0.25` — the same 75/25
  input share the TypeScript module uses. Hardcode the surface→tier maps by copying the
  current values out of `model-router.ts`, and add a comment naming that file as the
  source of truth so the next person knows where to re-sync from.
- Writes `reports/ai/routing-cost-<YYYY-MM-DD>.md`: a table, a total line, and a
  "Biggest unclaimed saving" line naming the single surface with the highest positive
  `savingsFraction`.
- Supports `--json` (print JSON to stdout, write no file) and `--check` (write no file;
  exit 1 if any surface's active tier is *more expensive* than its recommended tier by
  more than 25% — i.e. money is being left on the table — and print which).
- Prints the output path on success. Creates `reports/ai/` if missing.

**Required tests** (`node --test`, matching `scripts/ai/build-call-site-inventory.test.mjs`):
1. The blended-cost calculation returns a known value for a known input.
2. Savings fraction is `0` when active and recommended tiers are identical.
3. Savings fraction is **negative** when the recommendation is more expensive.
4. The rendered markdown table has one row per surface.
5. `--json` produces parseable JSON with one entry per surface.

Add to `package.json`, adjacent to `eval:prompts`:
```json
"eval:routing-cost": "node scripts/eval/routing-cost-report.mjs",
```

**DEFINITION OF DONE**
```bash
node --test scripts/eval/routing-cost-report.test.mjs    # all green
node scripts/eval/routing-cost-report.mjs --json         # valid JSON, 6 entries
node scripts/eval/routing-cost-report.mjs                # writes the dated file, prints path
node scripts/eval/routing-cost-report.mjs --check; echo "exit=$?"    # runs, exit 0 or 1
npm run typecheck && npm run lint                        # both exit 0
```
Commit the script, its test, and the `package.json` line. **Do not commit the generated
report** — `reports/ai/routing-cost-<date>.md` is an output, not source. If `git status`
shows it, leave it uncommitted and say so in the journal.
Then commit as `[hermes-H7]`.

---

## H8 — Wire the response cache into the free lane

**Why last:** this is the only task that changes a code path the product actually runs.
Everything before it was additive. Read the whole task before typing.

**The gap:** `apps/web/lib/claude-api/response-cache.ts` was built, tested (18 tests
green), and never connected to anything. It currently saves exactly zero dollars.

**FILES YOU MAY TOUCH**
```
apps/web/lib/claude-api/free-lane.ts              (modify)
apps/web/__tests__/free-lane-response-cache.test.ts   (create)
```

**THE NON-NEGOTIABLE CONSTRAINT**

With no environment variables set and no store passed in, `generateContentMessages` must
behave **byte-identically to today**. Same call sequence, same return value, same
errors. The cache is strictly opt-in. If you cannot demonstrate that with a test, you
have not finished this task.

Concretely, the cache activates only when **both** are true:
1. `env.LLM_RESPONSE_CACHE_ENABLED === "true"`, and
2. the caller passed a `cacheStore`.

Either one missing → the existing code path runs untouched.

**WHAT TO BUILD**

Read `apps/web/lib/claude-api/response-cache.ts` in full first — particularly
`withResponseCache`, `cacheBypassReason`, and the comment explaining why this cache is
exact-key and not semantic. Then:

1. Add an optional `cacheStore?: ResponseCacheStore` field to `ContentMessagesRequest`.
2. Inside `generateContentMessages`, wrap the **entire existing body** (the Cerebras →
   secondary → `callClaude` chain, unchanged) in a `call` closure and hand it to
   `withResponseCache`. Do not restructure or reorder the fallback chain. Do not "clean
   it up." One nested closure is the whole diff.
3. Build the `CacheableRequest` from the incoming request. For `model`, use the resolved
   model for the surface — `pickModelForSurface(request.surface, env)` from
   `model-router.ts`, which is already an in-repo import. **Do not use a literal string
   and do not use `"unknown"`**: the model id is part of the cache key, so a wrong or
   constant value there would serve one model's answer for another model's request.
4. `withResponseCache` already refuses non-cacheable surfaces (only `brief` and
   `content` are eligible) and any request with `temperature > 0`. Do not re-implement
   those checks and do not widen the allow-list.
5. Return `outcome.result`. Do not change the shape of what
   `generateContentMessages` returns — callers depend on it.

**Required tests:**
1. **The identity test, and it comes first.** No env var, no store → the underlying
   dispatch is called exactly once and the returned object deep-equals what the
   un-cached path returns. This is the test the whole task lives or dies on.
2. Env set to `"true"` + memory store (`createMemoryResponseCacheStore`) + surface
   `"brief"` → two identical calls invoke the underlying dispatch **once**, and both
   return the same text.
3. Env set + store + surface `"studio"` → underlying dispatch called **twice**
   (`studio` is not a cacheable surface).
4. Env set + store + `temperature: 0.7` → dispatch called **twice** (nondeterministic
   requests must never be cached).
5. Store whose `get` rejects → the call still succeeds via the live path. A cache
   failure must never become a product failure.
6. Two requests differing only in `user` text → dispatch called **twice** (different
   cache keys).

**IF YOU GET STUCK**

Do not partially wire this. A half-connected cache is worse than none — it can serve a
stale draft while looking like it works. If test 1 does not pass, abandon under RULE 4,
restore `free-lane.ts` with `git checkout -- apps/web/lib/claude-api/free-lane.ts`,
delete your test file, and journal it. The owner would much rather read
`H8 ABANDONED` than debug a subtly-wrong cache.

**DEFINITION OF DONE**
```bash
npx vitest run apps/web/__tests__/free-lane-response-cache.test.ts   # all green
npx vitest run apps/web/__tests__/claude-api-free-lane.test.ts       # the EXISTING suite, still green
npm run typecheck && npm run lint                                    # both exit 0
node scripts/guardrails/ai-transport-import-boundary.mjs             # not newly broken
git diff --stat apps/web/lib/claude-api/free-lane.ts                 # should be small
```
The existing `claude-api-free-lane.test.ts` staying green is the real gate here — it is
the proof you did not change current behavior. Then commit as `[hermes-H8]`.

---

# 3. WHEN YOU FINISH

Run the full verification, then write the summary. Do not skip this — an unverified run
is an unusable run.

```bash
npm run typecheck
npm run lint
npm test
node scripts/guardrails/run-all.mjs
git log --oneline origin/claude/fable-5-ultracode-plan-ptru4e..HEAD
git status --short
```

Append to `handoff/JOURNAL.md`:

```
=== RUN COMPLETE ===
tasks DONE: H<n>, H<n>, ...
tasks ABANDONED: H<n> (<why>), ...
typecheck: <exit>   lint: <exit>   tests: <exit>
guardrails: <N>/25 passed — FAILED: <list>
baseline was 20/25 — <same | better | WORSE>
commits: <paste git log --oneline output>
git status --short: <paste — should be empty or handoff/ only>
```

Then write `handoff/BUILD_SUMMARY.md`: one short section per task with what you built,
what you verified, and — most valuable of all — **anything you were unsure about**. If
you guessed at something, say so and name the file and line. A flagged guess costs the
owner two minutes; an unflagged one costs an afternoon.

**Then stop. Do not push.**

---

# 4. STOP CONDITIONS

Stop immediately, write the summary, and end if any of these happen:

1. All eight tasks are done or abandoned. ← the normal ending
2. Two tasks in a row abandon for the same underlying reason (something environmental is
   wrong and further tasks will fail the same way).
3. `npm run typecheck` fails and you cannot make it pass by undoing your own last change.
4. You are about to touch a file on the RULE 3 off-limits list.
5. You have been running for eight hours.

---

# 5. THE STANDARD

You are not being judged on how many tasks you finish. You are being judged on this:

**Every commit you leave behind is one the owner can read in two minutes and either keep
or drop, with total confidence about which.**

That means: one task per commit, tagged `[hermes-H<n>]`. Only that task's files in that
commit. Green typecheck and lint at every commit. No file touched that its task did not
name. Every uncertainty written down instead of papered over.

Three clean commits and five honest `ABANDONED` lines is a good night's work. Eight
commits where two are subtly wrong is a bad one, because it costs more to review than it
saved to write.

Begin at §1.
