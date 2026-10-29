# registry.json regeneration — read-only review

Repo: `Beexly/Sports`. Worktrees inspected: `C:/Users/Garrett/Sports-wt-pick-gate`
(HEAD `ea1f56bcf`, `hermes/book-pick-verdict-gate`) and `C:/Users/Garrett/Sports-wt-intel`
(HEAD `1758cfa0d`, `motif/gse-intelligence-build-2026-10-02`).

Constraints honored: no writer run, no build, no test, no commit, no repo modification.
Only `Read`, `Grep`, `git show/log/grep/rev-parse/merge-base`, and JSON parsing of a blob
dumped to a temp file outside the repo.

---

## Bottom line

**There is no script that regenerates `intelligence/signals/registry.json`.** The file was
produced by a manual, agent-performed edit and committed. Both questions in the brief are
answered below, but the premise "running it" has nothing to run.

| Question | Answer |
|---|---|
| Does a regenerating script exist? | **No** — none, anywhere in repo history |
| Would running it rewrite traced verdicts? | **Nothing to run.** The one observed regen left `traced` untouched (47/47 `no` before *and* after) |
| Live branch or frozen snapshot? | **Frozen**, explicitly pinned to `531b39a43` — not live HEAD |

---

## 1. The script does not exist

Negative results, all verified:

- `git log --all -S"intelligence/signals/registry.json"` → **zero commits**. No file's
  *content*, on any branch, at any point in history, contains that path.
- Grep across the full pick-gate worktree (tracked + untracked) → no references.
- `intelligence/signals/` contains exactly one file, `registry.json`. Across all history
  (`git log --all --diff-filter=A -- intelligence/signals/*`) it is the **only** file ever
  added there. No generator sits beside it.
- Both commits that touched the file added no writer:
  - `1fce7fb4c` `[hermes-reconcile] Inventory registry, parquet pins, and the two-host rule`
  - `ae329b719` `[hermes-task016] Ledger, injury gate, paired audit, registry states`
- No untracked/ignored generator in either worktree (only `__pycache__` dirs in `Sports-wt-intel`).

### The one near-miss, and why it is not it

A hermes paste (`pastes/paste_25_123209.txt`) proposes `intelligence/gates/registry_check.py`.
It is **absent** from the repo, as are its dependencies:

```
ABSENT: intelligence/gates/registry_check.py
ABSENT: intelligence/signals/registry.schema.json
ABSENT: .github/workflows/registry-and-traces.yml
EXISTS: intelligence/gates/claim_matrix.py
EXISTS: intelligence/gates/manifest_check.py
```

It is a *validator* (jsonschema "Fails CI on drift"), not a writer — so it would not have
rewritten verdicts anyway. It also **cannot run against the real file**: it does
`for r in data` and `r.get("wired_state")`, but the committed shape is a dict
`{provenance, signals:[...]}`, not a flat array. The committed file never had
`registry_check.py` run against it.

---

## 2. How the file was actually produced (timeline, verified)

```
12:34:25 -05:00  1fce7fb4c  creates registry.json (blob a3a54001), 47 signals
                          provenance: "Copied from the read-only inventory survey written
                          against commit cc151ddd3. Label SURVEY. Not re-audited line by
                          line in this commit."
12:55:05 -05:00  531b39a43  [hermes-tau-stamp] — registry untouched
12:57:25 -05:00  (regen performed; provenance stamps "at HEAD 531b39a43")
12:58:26 -05:00  ae329b719  commits regen (blob ccb9d3fe)
14:35:57 -05:00  1758cfa0d  motif HEAD — registry blob unchanged
```

The provenance stamp is **truthful and internally consistent**: `17:57:25Z` is exactly
`12:57:25 -05:00`, one minute before the `12:58:26` commit, and `531b39a43` was indeed the
working-tree HEAD at that moment.

Current provenance, verbatim:

> Regenerated 2026-10-02T17:57:25Z at HEAD 531b39a43. wired_state is taken from the prior
> survey field plus the homeSign wire. This is not a fresh line-by-line re-read of all 47
> evaluators. Prior survey commit remains cc151ddd3.

Blob `ccb9d3fef` is **byte-identical** at the motif HEAD (`1758cfa0d`) and the pick-gate
HEAD (`ea1f56bcf`). Pick-gate did not modify it — `git status` is clean for that path.

---

## 3. Would it rewrite traced verdicts?

**The observed regen did not.** Diffing blob `a3a54001` (pre) against `ccb9d3fef` (post):

| Field | Before | After |
|---|---|---|
| `traced.verdict` | `no` × 47 | `no` × 47 |
| `wired.verdict` | `no` 37, `partial` 10 | `no` 37, `partial` 10 |
| `weighted.verdict` | `numeric_no_evidence` 4, `prior_no_evidence` 43 | identical |
| `tested.verdict` | `no` 38, `partial` 9 | identical |
| `wired_state` | *(absent on all 47)* | `no` 46, `partial` 1 |

The regen's **entire** substantive effect was **adding two new fields** — `wired_state` and
`_blocked_reason` — and replacing the provenance string. No verdict field was touched.

The real risk is the opposite of the one asked about: `traced` is not rewritten because
**nothing derives it**. All 47 `traced.verdict` values are identical, carried verbatim from
the `cc151ddd3` survey. The regen provenance concedes it outright — *"This is not a fresh
line-by-line re-read of all 47 evaluators."* A future hand-regen is free to overwrite them,
and 47/47 identical `no` is a blanket copied value with no per-signal re-verification behind it.

---

## 4. Live branch or frozen snapshot?

**Frozen, commit-pinned.** The provenance names `531b39a43` explicitly. Live HEAD of the motif
branch is `1758cfa0d` — 8 commits later, 59 files changed between them.

**But the snapshot is materially still accurate for its cited source.** The registry's evidence
strings cite `packages/ingestion-pipeline/src/signal-registry-definitions.ts` by line, and that
file is **byte-identical** from `cc151ddd3` all the way to `1758cfa0d`:

```
$ git diff --stat cc151ddd3 1758cfa0d -- .../signal-registry-definitions.ts
(empty)
```

Spot-checks confirm the line citations resolve exactly as claimed:

- `:76` → `id: "prefetched_exchange",`
- `:91-94` → `evaluate: async (ctx) => {` / `// Handled directly when prefetched rows are passed` / `return null;`

**One real drift, which the regen did partly track:** `signal-registry-extensions.ts` changed
`+6/-1` since `cc151ddd3` — the homeSign +1 wire landing. The registry picked that up in
`wired_state` for `nfl_age_conditioned_rest`:

```
wired_state: partial
_blocked_reason: "homeSign +1 landed at e28e4b808. Live slate still passes process.env.
                 Those keys have no writer."
```

Note this signal has `wired.verdict: no` but `wired_state: partial` — consistent with the
provenance's "prior survey field plus the homeSign wire", not a contradiction.

**The 47 count is correct.** All 47 registry ids resolve against source. One appeared to miss
(`skellam_cover`) but that is a constant indirection, not drift —
`signal-registry-definitions.ts:330` declares `id: SKELLAM_COVER_SOURCE`, which is
`"skellam_cover"`.

---

## 5. Enforcement gap (the real finding)

Nothing reads `registry.json` at runtime — no reference anywhere in `packages/` or
`intelligence/`. The pre-regen provenance said so directly:

> The live scoring path still bypasses SIGNAL_REGISTRY. This file is an inventory, not a
> runtime registry.

So there is no schema, no validator, no CI job, and no generator. Drift **cannot** fail CI.

Meanwhile the doctrine asserts the opposite. `pastes/paste_7_165221.txt` line 16 (duplicated at
`paste_3_164442.txt` line 5):

> The registry is regenerated from the current branch HEAD — it is an inventory with honest
> states, not a wish list.

That claim is **not backed by any committed tooling.** It happened exactly once, by hand, at a
pinned commit eight commits behind the branch head. Anyone reading the doctrine would reasonably
assume a pipeline maintains this file. None exists.

For reference, the state counts the doctrine quotes do check out against the file:
`wired_state` = **46 `no`, 1 `partial`**, matching `paste_3_164442.txt` line 19
("46 no, 1 partial").

---

## 6. Provenance chain, condensed

`intelligence/doctrine/two-host-rule.md` (added in the same commit as the registry) states that
Machine A is `C:/Users/Garrett/Sports-wt-intel` and that a commit is the transfer mechanism. That
is consistent with what I found: the work was done on the motif worktree, where `531b39a43` was
HEAD, and the result reached pick-gate as a plain commit with no tooling in between.

---

## Verification limits

- Confirmed by opening: `intelligence/signals/registry.json`, both registry blobs, both commits,
  `signal-registry-definitions.ts` (cited lines), the `extensions.ts` diff, `two-host-rule.md`,
  `pastes/paste_25`, `paste_7`, `paste_3`, `paste_18`.
- The `47` / `47 traced:no` / `531b39a43` / `1758cfa0d` figures in the brief are all confirmed.
- Not verified: whether a regeneration script exists on a host or drive not reachable from here.
  Per this repo's own two-host rule, that would be a Machine-A fact only, not a global one.
- No claim here rests on a number I did not read out of the file or compute from git.