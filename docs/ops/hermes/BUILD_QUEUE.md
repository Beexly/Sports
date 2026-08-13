# HERMES JOB 2 — BUILD QUEUE

Twelve tasks (H0–H11), ordered safest-first. Build them in order, one at a time. Six are
reports or single-file changes that cannot break anything; five are code. Commit each
code task separately. Do not push. Then stop.

Read this whole file once before starting H0.

---

## 0. THE SEVEN HARD RULES

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
.gitignore                              .githooks/**
apps/web/lib/autonomy/execute-autonomy-cycle.ts
apps/web/lib/calibration/ranking-power-control.ts
apps/web/lib/ops/proven-path-seed.ts
```
The last three carry known typecheck errors (issue #421) that are **deliberate open
design questions**, not bugs to fix — the "obvious" fix on each would silently change
an authorization allow-list or which ranking groups get paused. Leave them exactly as
they are.

Also: **never run** `npm install <anything>`, `prisma migrate`, `prisma db push`,
`prisma db seed`, or anything that connects to a database. Adding a dependency requires
owner approval that you do not have. `npm install` with no arguments — restoring the
lockfile that already exists — is fine and is part of setup.

**RULE 4 — Two strikes, then move on.**
If a task's Definition of Done fails twice, you are done with that task. Undo it:
```bash
git checkout -- <the files on that task's list that already existed>
rm -f <the files on that task's list that you created>
git status --short          # must print nothing before you start the next task
```
Journal it as `H<n> ABANDONED — <the exact error text>`. Then go to the next task. A
clean eight-of-twelve is a good night. A tangled twelve-of-twelve is a bad one.

**RULE 5 — Every commit is tagged and scoped.**
```bash
git add <only the files on this task's list>
git commit -m "[hermes-H<n>] <what you built in one line>"
```
Never `git add -A`, never `git add .`, never `git commit -a`. Add files by name. This is
what lets the owner drop one bad task with `git rebase -i` without losing the rest.

**RULE 6 — The pre-commit hook is a tripwire, not an obstacle.**
This repo installs a pre-commit hook (via `npm install`) that runs a secret scan on
your staged files. If it blocks a commit, you staged something that looks like a
credential. **Never use `git commit --no-verify`.** Unstage, figure out which line
tripped it, journal it, and if you cannot resolve it, abandon the task under RULE 4.

**RULE 7 — No new dependencies, no fabricated data, no `any`.**
The repo is TypeScript strict. `any`, `as any`, `@ts-ignore`, and `@ts-expect-error`
will fail review even if they compile. Every number that reaches a user must come from
real data — never invent a stat, a price, a benchmark, or a result to make output look
complete. Reports must contain only what your commands actually printed.

---

## 1. SETUP — once, before H0

```bash
cd <repo root>
git rev-parse --abbrev-ref HEAD          # must be claude/fable-5-ultracode-plan-ptru4e
git status --short                       # must print nothing
npm install                              # restores the existing lockfile; runs prisma generate
mkdir -p handoff
```

If the branch is wrong or `git status` is dirty, **stop** and write why in
`handoff/JOURNAL.md`. Do not switch branches and do not discard someone else's work.

Then measure the starting line — you need these numbers to tell later whether *you*
broke something:

```bash
npm run typecheck 2>&1 | grep -c "error TS"      # EXPECTED: 3
npm run lint 2>&1 | tail -3                       # EXPECTED: exit 0
node scripts/guardrails/run-all.mjs | tail -3     # EXPECTED: 22/25 passed
```

Write all three results into `handoff/JOURNAL.md` under `=== BASELINE ===`.

**The 3 typecheck errors are known debt (issue #421)** and live in the three files
RULE 3 puts off-limits:

```
apps/web/lib/autonomy/execute-autonomy-cycle.ts(33,3)      TS2353
apps/web/lib/calibration/ranking-power-control.ts(227,39)  TS2339
apps/web/lib/ops/proven-path-seed.ts(86,9)                 TS2353
```

**The 3 expected guard failures are** `model-freeze` (#419), `api-v1-boundary` (#420),
`ai-transport-import-boundary` — tracked base-branch debt, not yours to fix. If
`actor-minting-boundary` or `ai-council` fail, `npm install` did not complete — rerun
it. If any **other** guard fails, or the typecheck error count is not exactly 3, stop
and journal it: the ground moved and the task specs below assume it did not.

After **every** task, append one line to `handoff/JOURNAL.md`:

```
H<n> | <HH:MM> | <DONE|ABANDONED> | <commit hash or "-"> | <one-line note>
```

---

## 2. THE VERIFY BLOCK

Every code task ends with "run the verify block." It is always these commands, and
every line must hit its expected value before you commit:

```bash
npm run typecheck 2>&1 | grep -c "error TS"    # must print EXACTLY 3 (the known ones)
npm run lint                                    # exit 0
npx vitest run <the test file this task names>  # all green
```

If the typecheck count is 4 or more, your change added an error — find it and fix it,
or abandon. If it is somehow less than 3, you modified an off-limits file — undo that
immediately.

---

# THE TASKS

**H0 comes before everything and is the most valuable task in this file.** Then
H1–H6 are reports (no product code, nothing to break), and H7–H11 are code, ordered
by blast radius. Do them in order.

---

## H0 — Run the diagnostics that already exist, capture the output

**Why this is first and why it matters more than the other ten combined:** this repo
already contains a purpose-built founder diagnostic that reads **live production**
and prints an ordered P0/P1/P2 action list. It is `scripts/ops/launch-preflight.mjs`,
its step 3 prints `revenueLadder` and `founderNextSteps`, and it needs **no database
credentials** — it is a black-box HTTP probe. Nobody has been running it.

You are not deciding anything here. You are running three commands and saving what
they print, so the owner wakes up to real state instead of guesses.

**FILES YOU MAY TOUCH**
```
handoff/OPS_TRUTH.md      (create)
```

**WHAT TO DO**

```bash
npm run ops:preflight   2>&1 | tee handoff/_preflight.txt ; echo "exit=$?"
npm run ops:impeccable  2>&1 | tee handoff/_impeccable.txt ; echo "exit=$?"
node scripts/ops/verify-shadow-pipeline.ts 2>&1 | tee handoff/_shadow.txt ; echo "exit=$?"
```

Then write `handoff/OPS_TRUTH.md` containing, in this order:

1. **`founderNextSteps`** — every item, verbatim, with its priority and domain. This
   is the single most important thing you will produce tonight. Do not summarize it,
   do not reorder it, do not add commentary. Copy it exactly.
2. **`revenueLadder`** — current step, next step, and every blocker listed.
3. The **settlement counts** and **gates** from step 3 of the preflight output.
4. The **trust/SEO** results from step 6 (robots, sitemaps, feed, ads.txt).
5. Each command's **exit code**, and the full text of any `!!` hard-fail lines.

Then delete the three scratch files:
```bash
rm -f handoff/_preflight.txt handoff/_impeccable.txt handoff/_shadow.txt
```

**IF A COMMAND FAILS**

Record exactly what happened and move on — a failure here is *itself* the finding,
and it is more valuable than a success:

- **Network unreachable / DNS / timeout** → the probe could not reach production.
  Write `PRODUCTION UNREACHABLE FROM THIS MACHINE` and the error text.
- **`founderNextSteps missing — prod SHA likely lags main`** → copy that line
  verbatim into the report. It means the deployed build is older than the code.
- **`verify-shadow-pipeline.ts` fails on a missing `DATABASE_URL`** → expected on a
  laptop. Write `SHADOW VERIFY NEEDS PRODUCTION DATABASE_URL — not run` and move on.
  Do not go looking for credentials. Do not create a `.env` file.

**DEFINITION OF DONE**
```bash
test -f handoff/OPS_TRUTH.md && echo OK
ls handoff/_*.txt 2>/dev/null && echo "SCRATCH FILES LEFT — delete them" || echo "clean"
git status --short          # must print nothing
```
No commit. Journal as DONE with `-`.

---

## H1 — Create the missing change-proposal template

**Why first:** documentation only, cannot break a build, proves your file-writing path
works before anything risky.

**The gap:** `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md` and
`docs/adr/005-entity-graph-minimal-schema.md` both instruct contributors to fill out
`docs/adr/pre-implementation-change-proposal-template.md` before schema or dependency
changes. **That file does not exist.** Two documents point at a void.

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
grep -c "^## " docs/adr/pre-implementation-change-proposal-template.md   # >= 7
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
handoff/INVENTORY.md      (create — handoff/ is gitignored; this is a report, not repo content)
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

Then one short paragraph: which items are plainly unrelated to a sports-prediction
platform (judge by name and the first ten lines of the file), and which are clearly in
use. **Recommend nothing. Delete nothing.**

**DEFINITION OF DONE**
```bash
test -f handoff/INVENTORY.md && echo OK
git status --short          # must print nothing (handoff/ is gitignored)
```
No commit. Journal it as DONE with `-` for the commit hash.

---

## H3 — Pin the promptfoo version

**Why:** `package.json` runs `npx promptfoo@latest` in `eval:prompts`. `@latest` means
the version that executes tomorrow is not the version that executed today — an
unreviewed package upgrade every run. The current published version is **0.122.0**.

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

That is the whole task. Do not touch any other script. (You may notice four more
`@latest` strings under `apps/web/lib/cockpit/` and `lib/jarvis/` — those are display
text shown to the owner, not executed commands. **Leave them alone.**) Do not run
`npm run eval:prompts` — it costs real money and needs an API key you do not have.

**DEFINITION OF DONE**
```bash
node -e "console.log(require('./package.json').scripts['eval:prompts'])"   # shows 0.122.0
git diff --stat package.json      # must read: 1 file changed, 1 insertion(+), 1 deletion(-)
```
If more than one line changed, your editor reformatted the file. `git checkout --
package.json` and redo it by changing only that one string. Then commit as
`[hermes-H3]`.

---

## H4 — Route-auth inventory (all 176 API routes)

**Why:** the repo's #1 non-negotiable revenue rule is "no frontend-only paywalls —
enforcement is server-side only." Whether that holds depends on 176 route files, and
nobody has a table of them. You are building that table. Read-only. This is one of the
most valuable things in this queue, and it requires zero judgment — just diligence.

**FILES YOU MAY TOUCH**
```
handoff/ROUTE_AUTH_INVENTORY.md      (create)
```

**WHAT TO BUILD**

For **every** file matching `apps/web/app/api/**/route.ts` (list them with
`git ls-files "apps/web/app/api"` filtered to `route.ts`), open the file and record
one row:

| Column | How to fill it |
|---|---|
| Route path | The file path with `apps/web/app` and `/route.ts` stripped — e.g. `/api/picks/daily-slate` |
| Methods | Which of `GET/POST/PUT/PATCH/DELETE` are exported |
| Auth mechanism | The **first** of these you find in the file: `auth()` / `getServerSession` / `requireUser` / `requireAdmin` / `requireEntitlement` / `checkEntitlement` / `verifySignature` / `CRON_SECRET` / a webhook signature check / `NONE FOUND` |
| Body parsing | `yes` if the file contains `req.json()` or `request.json()`, else `no` |
| Validation | `yes` if the file mentions `zod`, `z.object`, or `safeParse`, else `no` |
| Self-declared public | `yes` if a comment near the top says public/no-auth-by-design, else `no` |

Work in file order, 176 rows, no skipping. If a file is confusing, fill what you can
and put `?` in the cell you could not determine — a `?` is honest, a guess is not.

End the report with four counts: routes with `NONE FOUND` and no public comment;
routes parsing bodies without validation; routes with entitlement checks; total rows
written (must be the number of route files you listed).

**DEFINITION OF DONE**
```bash
test -f handoff/ROUTE_AUTH_INVENTORY.md && echo OK
grep -c "^| /api" handoff/ROUTE_AUTH_INVENTORY.md   # must equal the route-file count
git status --short                                   # must print nothing
```
No commit. Journal as DONE with `-`.

---

## H5 — Doc-drift report (references to files that do not exist)

**Why:** this repo just spent a day discovering that two documents pointed at a
template that was never created (H1 fixes that one instance). You are finding every
other instance of the same rot. Read-only.

**FILES YOU MAY TOUCH**
```
handoff/DOC_DRIFT.md      (create)
```

**WHAT TO BUILD**

For every tracked markdown file under `docs/` (`git ls-files "docs/*.md" "docs/**/*.md"`),
extract every backtick-quoted string that looks like a repo path — starts with one of
`apps/`, `packages/`, `scripts/`, `docs/`, `workers/`, `eval/`, `tools/`, and contains
at least one `/`. For each, test whether the path exists in the repo
(`git ls-files <path>` non-empty, or the directory exists). A path with obvious
placeholder syntax (`NNN`, `<...>`, `*`, `{`) is skipped, not reported.

Write `handoff/DOC_DRIFT.md`: one table — referencing doc, quoted path, `MISSING`.
Then a count of docs scanned and references checked. If a doc has more than 5 missing
references, add one line flagging it as probably stale wholesale.

Write a small throwaway script to do this if you like — put it in `handoff/`
(e.g. `handoff/_doc_drift.mjs`), run it with `node`, and leave it there so the owner
can rerun it. It must only read the repo and write into `handoff/`.

**DEFINITION OF DONE**
```bash
test -f handoff/DOC_DRIFT.md && echo OK
git status --short          # must print nothing
```
No commit. Journal as DONE with `-`.

---

## H6 — Revenue-core test-gap map

**Why:** the money path (Stripe → entitlements → paywall) and the legal path
(scraping clearance) are the two places an untested change costs real dollars. You are
mapping which source files in those areas have tests exercising them and which do not.
Read-only. The owner writes the missing tests later, with judgment; your map tells
them where.

**FILES YOU MAY TOUCH**
```
handoff/TEST_GAP_MAP.md      (create)
```

**WHAT TO BUILD**

For every `.ts` file (excluding `.test.ts`) in these places:

```
apps/web/lib/billing/          apps/web/lib/stripe.ts
apps/web/lib/entitlements.ts   apps/web/lib/api-entitlement.ts
apps/web/lib/scraping/         apps/web/lib/claude-api/
```

record: file path, line count (`wc -l`), how many test files mention its basename
(`git grep -l "<basename-without-ext>" -- "*.test.ts" "*.test.tsx" | wc -l`), and the
names of up to 3 of those test files.

Sort the table by (mentions ascending, line count descending) — biggest untested files
first. End with: the ten highest-priority gaps by that sort, as a plain list.

A mention is a weak signal — say so in the report header: "a test file naming a module
is not proof it covers it; zero mentions is proof nothing does."

**DEFINITION OF DONE**
```bash
test -f handoff/TEST_GAP_MAP.md && echo OK
git status --short          # must print nothing
```
No commit. Journal as DONE with `-`.

---

## H7 — Entity name normalization (pure function)

**Why:** `packages/db/prisma/schema.prisma` has an `Entity` model with a unique
constraint on `(entity_type, normalized_name, sport)`. Nothing computes
`normalized_name`. This function is the missing primitive — zero dependencies, no
database, no network.

**FILES YOU MAY TOUCH**
```
apps/web/lib/entity-graph/normalize.ts        (create)
apps/web/lib/entity-graph/normalize.test.ts   (create)
```

**WHAT TO BUILD**

There is already a `normalizeName` in `apps/web/lib/resource-intelligence/classify.ts`
for a different domain. **Do not import it and do not modify it.** Name yours
`normalizeEntityName` so the two never get confused.

```ts
export function normalizeEntityName(raw: string): string
```

Apply these steps **in this exact order**:

1. Unicode-normalize with `raw.normalize("NFKD")`, then strip combining marks with
   `.replace(/[̀-ͯ]/g, "")`. This turns `Nikola Jokić` into `Nikola Jokic`.
2. Lowercase.
3. Remove all periods and apostrophes with **no** replacement character, so `A.J.`
   becomes `aj` and `O'Neal` becomes `oneal`.
4. Replace every remaining run of non-alphanumeric characters with a single space.
5. Collapse runs of whitespace to one space, and trim.
6. Strip a trailing generational suffix — `jr`, `sr`, `ii`, `iii`, `iv`, `v` — but
   **only** when it is the final whitespace-separated token **and** there are at least
   two other tokens before it. (`Odell Beckham Jr.` → `odell beckham`; a person whose
   entire name is `Jr` keeps it.)

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

Plus one collision test asserting `"A.J. Brown"` and `"AJ Brown"` produce the **same**
string — that convergence is the entire reason this function exists.

**DEFINITION OF DONE**
```bash
npx vitest run apps/web/lib/entity-graph/normalize.test.ts    # 13+ tests, all green
```
Then the verify block (§2). Then commit as `[hermes-H7]`.

---

## H8 — Entity graph repository layer

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
declares a small structural interface describing only the Prisma methods it uses,
defaults the parameter to the real `db`, and casts once at the default. That makes
every function unit-testable with a hand-written fake and **no** database connection.
Follow that shape precisely. If your test needs a live database, you built it wrong.

**EXACT IMPORTS** (verified in this repo — use these, do not improvise):
```ts
import { db as defaultDb } from "@sports/db";
import type { Entity, EntityEdge, EntityType } from "@prisma/client";
import { normalizeEntityName } from "./normalize";
```
`npm install` already ran `prisma generate`, so `EntityType` exists in
`@prisma/client`. If that import errors anyway, run `npm run db:generate` once (it
reads the schema and writes the client — no database involved). If it STILL errors,
abandon under RULE 4 and journal the exact error. Do not declare your own `EntityType`
union and do not widen anything to `string` — a hand-written copy of a generated enum
rots silently the moment the schema changes.

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
- Computes `normalizedName` with `normalizeEntityName` from H7.
- `sport` defaults to `""`. **Never `null`, never `undefined`.** Read the "sport is NOT
  NULL DEFAULT ''" paragraph in `docs/adr/005-entity-graph-minimal-schema.md` first —
  Postgres treats NULLs as *distinct* inside a unique index, so a null `sport` silently
  defeats the deduplication this table exists to provide.
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
- **Throws** if `sourceRef` is empty/whitespace or `sourceTier` is not a finite number.
  An edge with no provenance is a fabricated relationship, which repo rule #2 forbids.
  This guard is the most important line in the file — write its test first.
- `confidence` defaults to 50, clamped to 0–100.
- Upserts on `(fromEntityId, relation, toEntityId, observedAt)` so re-ingesting the
  same observation twice is a no-op, not a duplicate row.

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
- One hop only. `direction` defaults to `"both"`, `limit` defaults to 100, capped at
  500. **Do not write a recursive traversal** — that is a separate, later change.

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

**DEFINITION OF DONE**
```bash
npx vitest run apps/web/lib/entity-graph/          # all green, including H7's tests
git grep -n "as any\|: any" apps/web/lib/entity-graph/   # must print nothing
git status --short | grep -v entity-graph          # nothing outside entity-graph
```
Then the verify block (§2). Then commit as `[hermes-H8]`.

---

## H9 — Router legibility card in the cockpit

**Why:** `apps/web/lib/claude-api/model-router.ts` decides which Claude tier answers
each surface, and `SURFACE_RECOMMENDED` records which tier *should* once validated.
That gap is money, and today it is invisible unless you read source. This makes it a
card on a page the owner already looks at.

**FILES YOU MAY TOUCH**
```
apps/web/components/cockpit/router-legibility-card.tsx        (create)
apps/web/__tests__/router-legibility-card.test.tsx            (create)
apps/web/app/cockpit/api-costs/page.tsx                       (modify — one import, one element)
```

**READ THIS FIRST — the trap in this task**

There are **two different surface vocabularies** in this codebase and they do not
overlap:

- `ClaudeSurface` in `model-router.ts` — 6 values, lowercase/kebab:
  `studio`, `journal`, `calibration-insight`, `model-court`, `content`, `brief`.
- `ClaudeApiSurface` in `cost-monitor.ts` — 9 values, SCREAMING_SNAKE:
  `BLOG_GENERATION`, … `OTHER`.

The existing page renders `ClaudeApiSurface` (budget rows). **Your card renders
`ClaudeSurface` (routing rows).** Do not join, map, or reconcile them. Two tables
about two different things on one page is correct here; inventing a mapping between
them would be a fabricated relationship.

**WHAT TO BUILD**

The data source already exists, pure and offline: `surfaceEconomics()` in
`apps/web/lib/claude-api/model-economics.ts`. It returns one row per `ClaudeSurface`
with `activeTier`, `recommendedTier`, `activeBlended`, `recommendedBlended`,
`savingsFraction`, computed from a vendored price snapshot. **No database, no network,
no new plumbing.** Call it and render it.

The component:
```tsx
export function RouterLegibilityCard(): JSX.Element
```
A `<section>` matching the sibling sections in `page.tsx` — same
`rounded-lg border border-titanium/40 bg-obsidian/60` shell, same header treatment,
same `overflow-x-auto` table wrapper. Copy those class strings from `page.tsx`; do not
invent new ones and do not add a stylesheet.

Columns: **Surface · Active tier · Recommended tier · Active $/Mtok · Recommended
$/Mtok · Savings if flipped**.

Rules for the rows:
- Sort by `savingsFraction` descending — biggest unclaimed saving on top.
- When `activeTier === recommendedTier`, render the savings cell as `—`, not `0%`.
- When `savingsFraction` is negative (the recommendation is an *upgrade* — true for
  `model-court`), render it as e.g. `+140% cost` — never as a negative saving. A cost
  increase displayed as a saving is exactly the quietly-wrong number this repo's rules
  exist to prevent.
- Format currency with `Intl.NumberFormat` like the `formatUsd` helper at the bottom
  of `page.tsx`. Blended costs are dollars per million tokens and are small — use
  enough decimals that they do not all render `$0.00`.
- One caption line under the header: figures come from a vendored price snapshot, and
  a tier flip requires passing the promptfoo gate first. Do not present it as live
  pricing.

Wire into `page.tsx`: add the import, place `<RouterLegibilityCard />` directly
**after** the "Surface Budgets" section and **before** "Recent Errors". Change nothing
else in that file.

**Required tests** (Testing Library + jsdom — the harness is already configured; see
`apps/web/__tests__/subscribe-button-disclosure.test.tsx` for a working example to
imitate):
1. Renders one row per `ClaudeSurface` — assert exactly 6 data rows.
2. `brief` shows active tier `haiku`.
3. `model-court` shows active `sonnet` and recommended `opus`.
4. A surface where active equals recommended renders `—` in the savings cell.
5. `model-court`'s savings cell does **not** contain a `-` sign.

**DEFINITION OF DONE**
```bash
npx vitest run apps/web/__tests__/router-legibility-card.test.tsx   # all green
git diff --stat apps/web/app/cockpit/api-costs/page.tsx             # ~2 lines changed
```
Then the verify block (§2). Then commit as `[hermes-H9]`.

---

## H10 — Offline routing-cost report

**Why:** `npm run eval:prompts` is the *quality* gate but needs `ANTHROPIC_API_KEY`
and costs money, so it cannot run in CI or unattended. The *cost* half of the same
question is computable offline from the vendored snapshot. This makes that half
runnable any time, free, deterministic.

**Scope discipline:** this task builds a cost/routing report. It does **not** score
model quality. Nothing in it calls an LLM, and no output is labeled a quality score.
The report's own header must say quality parity is validated separately by
`npm run eval:prompts` and is not measured here.

**FILES YOU MAY TOUCH**
```
scripts/eval/routing-cost-report.mjs        (create)
scripts/eval/routing-cost-report.test.mjs   (create)
package.json                                (modify — add exactly one script line)
```

**WHAT TO BUILD**

A plain Node ESM script, no dependencies, in the house style of
`scripts/guardrails/run-all.mjs` (read it first: top-of-file WHY comment, `node:`
prefixed imports).

Behavior:
- Reads the vendored price snapshot **directly** from its literal path:
  `apps/web/__tests__/fixtures/models-dev-snapshot.json` (this is the same file
  `model-economics.ts` imports — verified). Parse it with `JSON.parse(readFileSync(...))`.
- Recomputes per surface: active tier, recommended tier, blended cost of each, savings
  fraction. Blended cost is `input * 0.75 + output * 0.25` — the same 75/25 split the
  TypeScript module uses. Hardcode the surface→tier maps by copying the current values
  out of `model-router.ts` (`SURFACE_TIER` and `SURFACE_RECOMMENDED`), with a comment
  naming that file as the source of truth to re-sync from.
- Writes `reports/ai/routing-cost-<YYYY-MM-DD>.md`: a table, a total line, and a
  "Biggest unclaimed saving" line naming the surface with the highest positive
  `savingsFraction`.
- Supports `--json` (print JSON to stdout, write no file) and `--check` (write no
  file; exit 1 if any surface's active tier is more than 25% more expensive than its
  recommended tier — money on the table — and print which).
- Prints the output path on success. Creates `reports/ai/` if missing.

**Required tests** (`node --test`, imitating `scripts/ai/build-call-site-inventory.test.mjs`):
1. Blended-cost calculation returns a known value for a known input.
2. Savings fraction is `0` when tiers are identical.
3. Savings fraction is **negative** when the recommendation is more expensive.
4. The markdown table has one row per surface (6).
5. `--json` produces parseable JSON with 6 entries.

Add to `package.json`, adjacent to `eval:prompts`:
```json
"eval:routing-cost": "node scripts/eval/routing-cost-report.mjs",
```

**DEFINITION OF DONE**
```bash
node --test scripts/eval/routing-cost-report.test.mjs    # all green
node scripts/eval/routing-cost-report.mjs --json         # valid JSON, 6 entries
node scripts/eval/routing-cost-report.mjs                # writes the dated file, prints path
node scripts/eval/routing-cost-report.mjs --check; echo "exit=$?"    # runs; 0 or 1
rm -f reports/ai/routing-cost-*.md                       # the run's output is not source — delete it
git status --short    # must show ONLY scripts/eval/* and package.json
```
Commit the script, its test, and the `package.json` line as `[hermes-H10]` (after the
verify block, §2). The owner regenerates the report any time with
`npm run eval:routing-cost`.

---

## H11 — Wire the response cache into the free lane

**Why last:** the only task that changes a code path the product actually runs.
Everything before it was additive. Read the whole task before typing.

**The gap:** `apps/web/lib/claude-api/response-cache.ts` was built and tested
(18 tests green) and never connected to anything. It currently saves zero dollars.

**FILES YOU MAY TOUCH**
```
apps/web/lib/claude-api/free-lane.ts                  (modify)
apps/web/__tests__/free-lane-response-cache.test.ts   (create)
```

**THE NON-NEGOTIABLE CONSTRAINT**

With no environment variables set and no store passed in, `generateContentMessages`
must behave **byte-identically to today**. Same call sequence, same return value, same
errors. The cache is strictly opt-in. If you cannot demonstrate that with a test, you
have not finished this task.

The cache path activates only when **all three** are true:
1. `env["LLM_RESPONSE_CACHE_ENABLED"] === "true"`, and
2. the caller passed a `cacheStore`, and
3. `request.surface !== undefined`.

Any of the three missing → the existing body runs untouched. Check all three **before**
touching the cache; this also sidesteps a type trap — `pickModelForSurface` requires a
defined `ClaudeSurface`, so never call it with a possibly-undefined surface.

**WHAT TO BUILD**

Read `apps/web/lib/claude-api/response-cache.ts` in full first — particularly
`withResponseCache`, `cacheBypassReason`, and the comment on why this cache is
exact-key, not semantic. Then:

1. Add optional `cacheStore?: ResponseCacheStore` to `ContentMessagesRequest`.
2. In `generateContentMessages`, when the three conditions hold, wrap the **entire
   existing body** (Cerebras → secondary → `callClaude`, unchanged) in a `call`
   closure handed to `withResponseCache`. Do not restructure the fallback chain. One
   nested closure is the whole diff.
3. Build the `CacheableRequest` with
   `model: pickModelForSurface(request.surface, env)` (import from `./model-router` —
   already an in-repo import path). **Never a literal string, never `"unknown"`** —
   the model id is part of the cache key; a constant there would serve one model's
   answer for another model's request.
4. `withResponseCache` already refuses non-cacheable surfaces (only `brief` and
   `content`) and any `temperature > 0`. Do not re-implement those checks and do not
   widen the allow-list.
5. Return `outcome.result`. The shape of what `generateContentMessages` returns must
   not change — callers depend on it.

**Required tests:**
1. **The identity test, first.** No env var, no store → underlying dispatch called
   exactly once, and the returned object deep-equals the un-cached path's result.
   This is the test the task lives or dies on.
2. Env `"true"` + memory store (`createMemoryResponseCacheStore`) + surface `"brief"`
   → two identical calls invoke dispatch **once**; both return the same text.
3. Env + store + surface `"studio"` → dispatch called **twice** (not cacheable).
4. Env + store + `temperature: 0.7` → dispatch called **twice** (never cache sampled
   output).
5. Store whose `get` rejects → the call still succeeds via the live path. A cache
   failure must never become a product failure.
6. Two requests differing only in `user` text → dispatch called **twice**.

**IF YOU GET STUCK**

Do not partially wire this. A half-connected cache is worse than none — it can serve a
stale draft while looking like it works. If test 1 does not pass, abandon under
RULE 4, `git checkout -- apps/web/lib/claude-api/free-lane.ts`, delete your test file,
journal it. The owner would much rather read `H11 ABANDONED` than debug a
subtly-wrong cache.

**DEFINITION OF DONE**
```bash
npx vitest run apps/web/__tests__/free-lane-response-cache.test.ts   # all green
npx vitest run apps/web/__tests__/claude-api-free-lane.test.ts       # EXISTING suite still green
node scripts/guardrails/ai-transport-import-boundary.mjs ; echo "exit=$?"  # not newly broken
git diff --stat apps/web/lib/claude-api/free-lane.ts                 # small
```
The existing suite staying green is the real gate — proof you did not change current
behavior. Then the verify block (§2). Then commit as `[hermes-H11]`.

---

# 3. WHEN YOU FINISH

Run the full verification, then write the summary. An unverified run is an unusable
run.

```bash
npm run typecheck 2>&1 | grep -c "error TS"     # must print 3
npm run lint
npm test
node scripts/guardrails/run-all.mjs
git log --oneline origin/claude/fable-5-ultracode-plan-ptru4e..HEAD
git status --short                               # must print nothing
```

Append to `handoff/JOURNAL.md`:

```
=== RUN COMPLETE ===
tasks DONE: H<n>, H<n>, ...
tasks ABANDONED: H<n> (<why>), ...
typecheck errors: <n> (baseline 3)   lint: <exit>   tests: <exit>
guardrails: <N>/25 passed — FAILED: <list>   (baseline 22/25)
commits: <paste git log --oneline output>
git status --short: <paste — must be empty>
```

Then write `handoff/BUILD_SUMMARY.md`: one short section per task — what you built,
what you verified, and, most valuable of all, **anything you were unsure about**. If
you guessed, say so and name the file and line. A flagged guess costs the owner two
minutes; an unflagged one costs an afternoon.

**Then stop. Do not push.**

---

# 4. STOP CONDITIONS

Stop immediately, write the summary, and end if any of these happen:

1. All twelve tasks (H0–H11) are done or abandoned. ← the normal ending
2. Two tasks in a row abandon for the same underlying reason (something environmental
   is wrong and later tasks will fail the same way).
3. The typecheck error count rises above 3 and undoing your own last change does not
   bring it back.
4. You are about to touch a file on the RULE 3 off-limits list.
5. You have been running for eight hours.

---

# 5. THE STANDARD

You are not judged on how many tasks you finish. You are judged on this:

**Every commit you leave behind is one the owner can read in two minutes and either
keep or drop, with total confidence about which. Every report you leave behind
contains only things your commands actually printed.**

That means: one task per commit, tagged `[hermes-H<n>]`. Only that task's files in
that commit. The verify block green at every commit. No file touched that its task did
not name. Every uncertainty written down instead of papered over.

Six clean reports and three good commits beats twelve artifacts where two are subtly
wrong, because wrong costs more to find than it saved to write.

Begin at §1.
