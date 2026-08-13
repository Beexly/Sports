# HERMES JOB 1 — READ-ONLY SECURITY & QUALITY AUDIT

You are auditing a production sports-prediction platform. This job is **read-only**.
You will not fix anything. You will run a fixed list of probes, record exactly what
came back, and classify each result using a lookup table. Then you stop.

Read this whole file once before running anything.

---

## 0. THE FOUR HARD RULES

Break any of these and the entire run is discarded.

**RULE 1 — You may not modify any file outside `handoff/`.**
No edits, no deletes, no renames, no `npm install`, no `git add`, no `git commit`,
no `git push`, no `git checkout`, no `git stash`. The only files you create or write
are `handoff/AUDIT_FINDINGS.md`, `handoff/AUDIT_COVERAGE.md`, and
`handoff/JOURNAL.md`. The `handoff/` directory is gitignored, so at the end
`git status --short` must print **nothing at all**. If it prints anything, you
modified something you should not have.

**RULE 2 — No evidence, no finding.**
A finding is only real if you can paste a **file path, a line number, and the actual
line of text** from the repository. If you cannot paste that, it is not a finding and
it does not go in the report. "This looks like it might be insecure" is not a finding.
"`apps/web/app/api/x/route.ts:14: export async function GET() {` with no auth check in
the function body" is a finding.

**RULE 3 — Never guess an answer. Record "NOT DETERMINED".**
If a probe fails, times out, returns something you don't understand, or you cannot
tell which severity applies, write `NOT DETERMINED` plus the raw output in
`handoff/AUDIT_COVERAGE.md` and move to the next probe. An honest gap is useful. A
confident wrong answer is worse than nothing. There is no penalty for gaps.

**RULE 4 — Never print a secret value.**
If a probe surfaces something that looks like a real key, token, password, or
connection string, record the **file and line number only** and write the value as
`[REDACTED — <n> chars]`. Never copy the characters of the secret into any file.

---

## 1. THE ONLY JUDGMENT YOU MAKE

You do not decide how bad something is. You look it up in this table. Find the row
that matches the probe you just ran, and use that severity. Nothing else.

| If the probe found... | Severity |
|---|---|
| A hardcoded credential, API key, token, or password in a tracked file | **BLOCKER** |
| A `critical` or `high` npm advisory in a production dependency | **BLOCKER** |
| An authenticated/paid feature gated only in a React component, with no server check | **BLOCKER** |
| A raw SQL string built with `${...}` string interpolation | **BLOCKER** |
| An API route handler with no session/auth check and no comment saying it is public | **HIGH** |
| A `catch` block that is completely empty (swallows the error silently) | **HIGH** |
| A `moderate` npm advisory in a production dependency | **HIGH** |
| A guardrail script that exits non-zero | **HIGH** |
| An API route that reads `req.json()` without validating the shape | **HIGH** |
| A test file where every test is `.skip` or `.todo` | **HIGH** |
| `any`, `as any`, or `@ts-ignore` / `@ts-expect-error` in a tracked `.ts`/`.tsx` file | **MEDIUM** |
| `console.log` inside `apps/web/app/api/**` | **MEDIUM** |
| A `TODO`, `FIXME`, `HACK`, or `XXX` comment | **LOW** |
| A `low` npm advisory | **LOW** |
| Anything else you recorded but the table does not cover | **INFO** |

If two rows could apply, use the **more severe** one. If no row applies, use `INFO`.

---

## 2. SETUP — run this first, exactly once

```bash
cd <repo root>
git rev-parse --abbrev-ref HEAD
git log --oneline -1
mkdir -p handoff
```

Write the branch name and commit hash into `handoff/JOURNAL.md` as the first two
lines. If the branch is not `claude/fable-5-ultracode-plan-ptru4e`, **stop
immediately** and write `WRONG BRANCH — STOPPED` in the journal. Do not switch
branches yourself.

Then start the journal. After **every** probe, append one line to
`handoff/JOURNAL.md` in this exact shape:

```
P<number> | <started HH:MM> | <PASS|FINDINGS|NOT DETERMINED> | <count> results
```

Never let the journal fall behind. If the run is interrupted, the journal is the only
record that survives, and it is what tells the owner where you got to.

---

## 3. THE PROBES

There are 28 probes in 8 blocks. Run every one, in order. Do not skip ahead. Do not
invent extra probes.

For each probe: run the command exactly as written, look at the output, and decide
one of three things.

- **Zero lines of output** → the probe passed. Journal it as `PASS`. Write nothing
  in `AUDIT_FINDINGS.md`.
- **Output with lines** → each line is a candidate finding. Apply the block's
  *keep/discard* rule below, then write the survivors into `AUDIT_FINDINGS.md`.
- **The command errored** → journal it as `NOT DETERMINED` and record the error text
  in `AUDIT_COVERAGE.md`.

Every command uses `git grep`, which only searches files tracked by git. It will
never descend into `node_modules`. That is deliberate — do not replace it with
`grep -r` or `rg`.

Many probes will return a lot of lines. **If a probe returns more than 40 lines, do
not paste all of them.** Paste the first 15, then write
`... <N> more results, not individually listed` and record the total count. Getting
through all 28 probes matters more than exhaustively listing one of them.

**Expected result volumes.** These probes were run once on this branch on 2026-08-13.
Use these numbers only to check that your command *worked* — a wildly different count
usually means you mistyped the command, not that the codebase changed overnight. Do not
copy these numbers into your report; report what *you* see.

| Probe | Expected roughly |
|---|---|
| P1 hardcoded key assignments | 0 |
| P2 provider key prefixes | ~23 lines across ~9 files — the secret scanner itself, test fixtures, `.env.example`; expect to discard all of them |
| P4 committed env files | 0 non-example |
| P7 unpinned npx | 5 raw, 1 kept (see probe) |
| P8 curl-pipe-to-shell | 3 raw, 1 kept (see probe) |
| P9 entitlement enforcement | ~6 call sites |
| P10 premium gating in components | ~15 files (open the first 12) |
| P11 routes with no visible auth | ~96 of 176 (most are legitimately public) |
| P13 raw SQL interpolation | 0 and 0 |
| P14 unvalidated bodies | ~29 files |
| P15 dangerouslySetInnerHTML | ~15 (expect mostly JSON-LD) |
| P16 command execution | ~33 raw (most are literal-array spawns; keep variable-built only) |
| P17 files with type escapes | ~66 files, max 8 in one file |
| P18 empty catches | 1 one-line, 0 two-line |
| P21 skipped/todo tests | ~17 |
| P22 tests with no assertion | 0 |
| P23 untested critical modules | 0 modules at zero |
| P25 fabricated-data markers | ~33 raw (most are the seed script, comments forbidding mock data, and demo-mode code that labels itself; keep only unlabeled paths that reach users) |
| P26 freshness context | ~16 files |
| P27 guardrails | 22/25 passed |
| P28 TODO/FIXME/HACK | ~14 |

P11 returning ~96 files is normal and is not 96 findings — a sitemap route, a health
check, and a public blog feed all legitimately have no auth. That is exactly why the
probe makes you open the file and read the top comment before classifying.

---

### BLOCK A — Secrets (RULE 4 applies to this entire block)

**P1 — hardcoded key-shaped assignments**
```bash
git grep -nE "(api[_-]?key|secret|password|token)\s*[:=]\s*[\"'][A-Za-z0-9_\-]{16,}[\"']" -- "*.ts" "*.tsx" "*.mjs" "*.js" "*.json" "*.yml" "*.yaml"
```
*Keep* a line if the quoted value looks like a real credential.
*Discard* a line if the value is obviously a placeholder — it contains `example`,
`your-`, `xxx`, `placeholder`, `dummy`, `test`, `fake`, `sk-ant-xxx`, or is all one
repeated character. Also discard if the line is inside a `*.test.ts` file.
Severity: **BLOCKER** for anything kept. Print file:line only, value `[REDACTED]`.

**P2 — provider key prefixes**
```bash
git grep -nE "(sk-ant-|sk-[A-Za-z0-9]{20,}|ghp_|gho_|github_pat_|AKIA[0-9A-Z]{16}|xoxb-|AIza[0-9A-Za-z_\-]{30,})" -- . ":(exclude)*.md"
```
Same keep/discard rule as P1. Severity **BLOCKER**.

**P3 — the repo's own secret scanner**
```bash
node scripts/guardrails/secret-scan.mjs --all
```
Record whether it exits 0. If it exits non-zero, paste its output (it is written to
not print secret values). Severity **BLOCKER** if non-zero.

**P4 — committed env files**
```bash
git ls-files | grep -E "\.env" || echo "NONE"
```
*Keep* only files that are NOT named `*.example`, `*.sample`, or `*.template`.
Severity **BLOCKER** for anything kept.

---

### BLOCK B — Dependencies

**P5 — production advisories**
```bash
npm audit --omit=dev --json > handoff/_audit_raw.json 2>&1; echo "exit=$?"
node -e "const a=require('./handoff/_audit_raw.json');const v=a.metadata&&a.metadata.vulnerabilities;console.log(JSON.stringify(v))"
```
Record the counts object verbatim. Then for each advisory, list the package name and
severity. Severity per the table: `critical`/`high` → **BLOCKER**, `moderate` →
**HIGH**, `low` → **LOW**.
If `npm audit` fails because there is no network, journal `NOT DETERMINED` and say
"no network" in `AUDIT_COVERAGE.md`. **Delete `handoff/_audit_raw.json` when done** —
it is a scratch file, not a deliverable.

**P6 — the repo's dependency gate**
```bash
node scripts/guardrails/dependency-audit.mjs; echo "exit=$?"
```
Record exit code and output. Non-zero → **HIGH**.

**P7 — unpinned remote executables**
```bash
git grep -nE "npx [a-z0-9@/._-]+@latest" -- "*.json" "*.ts" "*.yml" "*.yaml" "*.mjs" "*.sh"
```
Expected: **5 raw hits**. Four are display strings — advice text inside quotes in
`apps/web/lib/cockpit/*` and `lib/jarvis/capability-registry.ts` telling the owner
what to type. Those never execute; **discard** them (severity **INFO**, one aggregate
note). The one that executes is `package.json` `eval:prompts` — `@latest` there means
the version that runs tomorrow is not the version that ran today. Severity **MEDIUM**.
(The build queue's H3 pins it; if it is already pinned when you run, record that.)

**P8 — curl-pipe-to-shell**
```bash
git grep -nE "curl [^|]*\| *(ba)?sh" -- . ":(exclude)*.md"
```
Expected: **3 hits**. Two are self-test fixtures inside
`scripts/guardrails/agent-bash-guard.mjs` — strings the guard exists to block;
**discard** those. The third is real: `docker/oracle-vps/deploy.sh` pipes
`get.docker.com` into `sh`. That is the standard Docker convenience installer, but it
is still remote code piped to a shell in a deploy script — record it as **HIGH** with
that context, and let the owner decide. Anything **else** you find is **BLOCKER**.

---

### BLOCK C — Paywall & authorization (this is the product's revenue boundary)

Repo rule #3 is: *"No frontend-only paywalls — enforcement is server-side only."*
These probes test whether that rule actually holds.

**P9 — where entitlement is enforced**
```bash
git grep -n "checkEntitlement\|requireEntitlement\|hasEntitlement\|assertEntitled" -- apps/web | head -60
```
Do not classify individual lines here. Instead, **count** how many results are under
`apps/web/app/api/` (server) versus under `apps/web/components/` or `apps/web/app/`
non-API paths (client). Record both numbers. This is context for P10, not a finding
on its own. Severity **INFO**.

**P10 — premium gating that only exists in a component**
```bash
git grep -lE "(isPro|isPremium|isElite|tier ?===|subscriptionTier)" -- apps/web/components apps/web/app ":(exclude)apps/web/app/api"
```
Use this command exactly — the `:(exclude)...` pathspec is what keeps API routes out
of the results. (An earlier draft used `--and --not`, which git grep silently
misapplies to paths; if your output contains any path with `/api/` in it, you ran
the wrong command.)
For **each file** returned, open it and answer one question: does the premium data it
hides ever arrive from the server in the first place? Look for the prop or fetch that
supplies it. Write for each file, in one line:

- `SERVER-GATED` — the file receives already-filtered data, or the sibling API route
  it calls checks entitlement. Severity **INFO**.
- `CLIENT-ONLY` — the full data reaches the browser and the component only hides it
  visually. Severity **BLOCKER**.
- `NOT DETERMINED` — you could not follow the data path in a reasonable number of
  file reads. This is a completely acceptable answer. Say so and move on.

Cap this probe at **12 files**. If more come back, do the first 12 and record the
remainder as uninspected in `AUDIT_COVERAGE.md`.

**P11 — API routes with no visible auth**
```bash
for f in $(git ls-files "apps/web/app/api/**/route.ts"); do
  if ! grep -qE "auth\(\)|getServerSession|requireUser|requireAdmin|requireEntitlement|checkEntitlement|verifySignature|CRON_SECRET|webhook" "$f"; then
    echo "$f"
  fi
done
```
Every file returned is a route with no obvious authentication or authorization.
For each, open it and check the top-of-file comment. If a comment explicitly says the
route is public (e.g. "public endpoint", "no auth by design"), classify **INFO**.
Otherwise **HIGH**. Cap at **25 files**; record the rest as uninspected.

**P12 — the repo's own API boundary guards**
```bash
node scripts/guardrails/api-v1-boundary.mjs; echo "exit=$?"
node scripts/guardrails/openapi-security-scan.mjs; echo "exit=$?"
node scripts/guardrails/api-payload-rights-scan.mjs; echo "exit=$?"
```
Record each exit code and output. Non-zero → **HIGH**.

---

### BLOCK D — Injection & input handling

**P13 — raw SQL with interpolation**
```bash
git grep -nE "\\\$queryRawUnsafe|\\\$executeRawUnsafe" -- "*.ts"
git grep -nE "\\\$queryRaw\`[^\`]*\\\$\{" -- "*.ts"
```
Any result from the first command is **BLOCKER** unless the argument is a plain
string literal with no variables. Any result from the second is **BLOCKER**.
Note: Prisma's tagged-template `$queryRaw` with `${var}` is actually parameterized and
safe — but record it anyway as **MEDIUM** with a note, because distinguishing safe from
unsafe usage here is exactly the kind of call this audit should surface to a human
rather than resolve itself.

**P14 — unvalidated request bodies**
```bash
git grep -ln "await req.json()\|await request.json()" -- apps/web/app/api > handoff/_p14a.txt
git grep -ln "zod\|z.object\|safeParse" -- apps/web/app/api > handoff/_p14b.txt
comm -23 <(sort handoff/_p14a.txt) <(sort handoff/_p14b.txt)
rm -f handoff/_p14a.txt handoff/_p14b.txt
```
Each file returned parses a JSON body without any schema validation in the same file.
Severity **HIGH**. Cap the list at 25; count the rest.

**P15 — dangerous DOM injection**
```bash
git grep -n "dangerouslySetInnerHTML" -- apps/web
```
For each, check whether the value is a JSON-LD `<script>` block (very common and fine)
or user/AI-generated content (not fine). JSON-LD → **INFO**. Anything else → **HIGH**.

**P16 — command execution from variables**
```bash
git grep -nE "exec\(|execSync\(|spawn\(.*\+|child_process" -- apps/web packages workers
```
*Keep* results where the command string is built from a variable. *Discard* results
where the command is a hardcoded array of literals. Severity **HIGH** for kept.

---

### BLOCK E — Type safety & error handling

**P17 — type escape hatches**
```bash
git grep -cn ": any\|as any\|@ts-ignore\|@ts-expect-error" -- "*.ts" "*.tsx" | sort -t: -k2 -rn | head -25
```
This gives per-file counts, highest first. Record the top 25 as a table. Severity
**MEDIUM** overall — a single aggregate finding, not one per line. Also record the
total: `git grep -c ... | wc -l` files affected.

**P18 — silently swallowed errors**
```bash
git grep -nE "catch\s*\([a-zA-Z_]*\)\s*\{\s*\}" -- "*.ts" "*.tsx"
git grep -n -A1 -E "catch[^{]*\{$" -- "*.ts" "*.tsx" | grep -E "^[^:]+-[0-9]+-\s*\}\s*$"
```
The first command finds one-line empty catches. The second finds two-line ones. A
catch block that does nothing at all is **HIGH** — it converts a failure into a silent
wrong answer. A catch that logs, rethrows, returns a fallback, or has a comment
explaining the intentional swallow is fine — **discard** those.

**P19 — leaked logging in API routes**
```bash
git grep -n "console\.log" -- apps/web/app/api
```
Severity **MEDIUM**. Note in the finding whether the logged expression looks like it
could contain a user identifier, email, or token.

**P20 — typecheck and lint truth**
```bash
npm run typecheck 2>&1 | tail -30; echo "typecheck exit=$?"
npm run lint 2>&1 | tail -30; echo "lint exit=$?"
```
**Known state, verified 2026-08-13:** typecheck FAILS with exactly **3 errors**, and
that is the expected baseline, tracked as GitHub issue #421:

```
apps/web/lib/autonomy/execute-autonomy-cycle.ts(33,3)      TS2353 RUN_GENERATE_SIGNAL_SLATE
apps/web/lib/calibration/ranking-power-control.ts(227,39)  TS2339 appliedPauseGroups
apps/web/lib/ops/proven-path-seed.ts(86,9)                 TS2353 appliedPauseGroups
```

- Exactly those 3 errors → **INFO**, note "matches known debt (#421)".
- Any **other** typecheck error, or more than 3 → **HIGH**, and it goes at the top of
  your report.
- lint is expected to exit 0. Non-zero → **HIGH**.

---

### BLOCK F — Test integrity

**P21 — skipped and disabled tests**
```bash
git grep -nE "(describe|it|test)\.(skip|todo)\b" -- "*.test.ts" "*.test.tsx"
```
Count them and list the files. If a file's tests are **entirely** skipped, that file is
a **HIGH** finding (it looks like coverage and is not). Individual skips → **LOW**.

**P22 — tests that assert nothing**
```bash
for f in $(git ls-files "*.test.ts" "*.test.tsx"); do
  if ! grep -q "expect(" "$f"; then echo "$f"; fi
done
```
Each result is a test file with no assertion. Severity **HIGH**. Zero expected.

**P23 — critical modules without a test file**
```bash
for f in apps/web/lib/entitlements.ts apps/web/lib/api-entitlement.ts apps/web/lib/billing/reconcile-entitlements.ts apps/web/lib/claude-api/free-lane.ts apps/web/lib/claude-api/provider-dispatch.ts apps/web/lib/claude-api/response-cache.ts apps/web/lib/claude-api/model-router.ts apps/web/lib/scraping/clearance-engine.ts; do
  base=$(basename "$f" .ts)
  hits=$(git grep -l "$base" -- "*.test.ts" | wc -l)
  echo "$f -> $hits test file(s) mention it"
done
```
Any module reporting `0` is a **HIGH** finding: these are the paywall, the billing
reconciliation, the AI dispatch path, and the legal clearance gate. Untested is not
acceptable on any of them. Report the count for every module, including the ones with
tests — the passing rows are as informative as the failing ones.

**P24 — does the suite actually pass**
```bash
npm test 2>&1 | tail -40; echo "test exit=$?"
```
This may take several minutes. Let it finish. Record the exit code and the final
summary lines. Non-zero → **HIGH**. If it hangs for more than 15 minutes, stop it,
journal `NOT DETERMINED`, and continue.

---

### BLOCK G — Governance rules specific to this repo

The repo's `CLAUDE.md` states seven non-negotiable rules. These probes test three of
them that a grep can actually reach.

**P25 — fabricated data markers (rules #1 and #2)**
```bash
git grep -nE "(mock|fake|dummy|placeholder|hardcod|sample)[ _-]?(data|odds|picks?|stats?|line)" -- apps/web/lib apps/web/app packages workers ":(exclude)*.test.ts" ":(exclude)*.test.tsx"
```
*Keep* results in code paths that could reach a user. *Discard* results in test
fixtures, seed scripts, storybook files, or comments explaining that mock data is
forbidden. Severity **HIGH** for kept — this is rule #1.

**P26 — freshness validation (rule #5)**
```bash
git grep -ln "staleness\|isStale\|maxAgeMs\|freshnessMs\|MAX_AGE" -- apps/web/lib | head -30
git grep -ln "fetch(" -- apps/web/lib/data* apps/web/lib/odds* packages/data-ingestion 2>/dev/null | head -30
```
Record both lists. This is context, not a verdict — you are showing the owner where
freshness is checked and where remote data enters. Severity **INFO**.

**P27 — full guardrail suite**
```bash
node scripts/guardrails/run-all.mjs 2>&1 | tail -40; echo "exit=$?"
```
Record the `N/25 passed` line and the exact `FAILED:` list.

**Expected baseline (after `npm install` has run): `22/25 passed`**, with exactly
these three failing — all tracked, pre-existing, base-branch debt:
`model-freeze` (#419), `api-v1-boundary` (#420), `ai-transport-import-boundary`.

- Exactly that list → severity **INFO**, note "matches expected baseline".
- Any **other** guard fails → that guard is a **HIGH** finding, called out by name.
- `actor-minting-boundary` or `ai-council` failing means `npm install` did not
  complete — that is an environment problem, not a finding. Journal it, record
  `NOT DETERMINED` for this probe, and say so in `AUDIT_COVERAGE.md`.
- **More than 22** pass → note the improvement, severity **INFO**.

---

### BLOCK H — Debt inventory (last, lowest priority)

**P28 — TODO/FIXME/HACK census**
```bash
git grep -nE "(TODO|FIXME|HACK|XXX)\b" -- "*.ts" "*.tsx" "*.mjs" | wc -l
git grep -nE "(TODO|FIXME|HACK|XXX)\b" -- "*.ts" "*.tsx" "*.mjs" | sed -E "s|^([^:]+):.*|\1|" | sort | uniq -c | sort -rn | head -20
```
Record the total count and the top 20 files. **One aggregate LOW finding**, not one
per comment.

---

## 4. WHAT YOU WRITE

Three files. Nothing else.

### `handoff/AUDIT_FINDINGS.md`

Start with this header, filled in:

```markdown
# Audit Findings — <date>

Branch: <branch>  Commit: <hash>
Probes run: <n>/28   Probes NOT DETERMINED: <n>

| Severity | Count |
|---|---|
| BLOCKER | |
| HIGH | |
| MEDIUM | |
| LOW | |
| INFO | |
```

Then one section per finding, **ordered BLOCKER first, then HIGH, MEDIUM, LOW, INFO**.
Use exactly this template. Do not add fields, do not drop fields.

```markdown
## F<nn> — <one-line description> [<SEVERITY>]

**Probe:** P<n>
**Where:** `<path>:<line>`
**Evidence:**
```
<the actual line of text from the file, pasted verbatim>
```
**What the probe showed:** <one or two sentences, factual only>
**What I could not determine:** <what a human still needs to check, or "nothing">
```

Two absolute constraints on this file:

1. **Do not propose fixes.** Not in the description, not in the notes. This audit
   reports state. Someone else decides what to do. If you find yourself typing "we
   should", delete the sentence.
2. **Do not include a finding without an evidence block.** If the evidence block would
   be empty, the finding does not exist. Delete it.

### `handoff/AUDIT_COVERAGE.md`

The honest-gaps file. This is not the leftover bin — it is half the value of the run.

```markdown
# Audit Coverage — <date>

## Probes that completed
P1, P2, ... (list)

## Probes that did not complete
| Probe | Why | Raw output |
|---|---|---|

## Capped probes
| Probe | Inspected | Total found | Not inspected |
|---|---|---|---|

## What this audit structurally cannot see
- Runtime behavior — nothing was executed against a live database or live API.
- Anything in `node_modules` or in untracked files.
- Logic bugs. Every probe here is a text pattern; a correct-looking line with wrong
  business logic passes all 28 probes.
- Whether a route that *has* an auth check has the *right* auth check.
```

### `handoff/JOURNAL.md`

Append-only, one line per probe, in the format from §2. Plus a final block:

```
=== RUN COMPLETE ===
started: <HH:MM>
finished: <HH:MM>
probes completed: <n>/28
findings: <n> (BLOCKER <n>, HIGH <n>, MEDIUM <n>, LOW <n>, INFO <n>)
git status --short output:
<paste it>
```

---

## 5. STOP CONDITIONS

Stop and write the final journal block when **any** of these is true:

1. All 28 probes are done. ← the normal ending
2. Three probes in a row fail with the same error (something environmental is broken).
3. You catch yourself about to modify a file outside `handoff/`. Stop *before* doing
   it, journal `RULE 1 VIOLATION AVERTED — <what you were about to do>`, and end.
4. You have been running for six hours.

**Do not** start fixing anything. **Do not** move on to `BUILD_QUEUE.md`. **Do not**
commit. That is a separate job the owner launches separately, after reading what you
wrote here.

---

## 6. THE STANDARD YOU ARE HELD TO

Not "how many findings." The four things that make this run worth the electricity:

1. Every finding has a real `file:line` and a real pasted line.
2. Every gap is declared in `AUDIT_COVERAGE.md` rather than quietly skipped.
3. `git status --short` prints nothing at the end (`handoff/` is gitignored).
4. Nothing in the report is invented, inferred, or softened.

A report with **four** BLOCKER findings that are all real and all reproducible beats a
report with forty findings where six are guesses. The owner is going to spot-check
your `file:line` references against the actual files. Every one of them needs to hold.

Begin at §2.
