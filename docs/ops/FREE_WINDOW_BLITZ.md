# FREE WINDOW BLITZ — converting perishable free compute into permanent assets

**The deadline is not NFL kickoff. It is the Ox Alpha free preview closing (~1 week from
Aug 21–22).** Near-unlimited, 1M-context, tool-capable, max-reasoning compute at $0 is a
resource that will not come back on these terms. NFL kickoff (~Sep 10) is the *second*
deadline and the substrate built this week is what makes it hittable.

**Governing principle for the whole window:**

> Spend perishable free compute ONLY on work that leaves behind a permanent asset.
> Never spend it on work that has to be re-done, re-judged, or re-verified by an
> expensive model afterward.

A week of free grunt that produces one generated data dictionary, one scaffold generator,
one validation bench, and a fixture corpus is worth more than a month of the same compute
producing chat. The window closes; the scripts do not.

---

## 1. Read the resource correctly

| Property | Consequence for how we use it |
|---|---|
| $0, "near unlimited", ~1 week | Volume is free; **time is the only budget**. Run wide, start now. |
| ~18 tok/s, ~7s latency | **Slowness is defeated by width, not by paying.** 10–15 parallel workers, not one fast one. One worker ≈ 65k output tokens/hour; twelve ≈ 780k/hour. |
| 1,048,576 context | The killer feature. A worker can hold an entire package + the data dictionary + the doc section at once — so give it **whole-file context and one narrow job**, never a repo crawl. |
| 131k max output | Big enough to emit a complete generated file in one shot. Size tasks to one file. |
| Tools + JSON, mandatory max reasoning | Real agent work is in scope, and structured output is reliable — use JSON task cards. |
| Retained, not trained | Safe-ish, **not** safe for crown-jewel IP. See §3. |
| One anonymous provider | It can vanish mid-task with no notice. **Every task must be small, committed, and restartable.** |

**Design conclusion:** a wide, shallow, idempotent queue of file-scoped tasks with
script-based verification. Not a deep autonomous agent loop.

## 2. Allocation matrix — who does what this week

| Tier | Who | Work | Why them |
|---|---|---|---|
| Grunt (free, wide) | **Ox Alpha × 10–15 via OpenCode** | Generated dictionary rows, repo-map entries, scaffold templates, fixture extraction, test writing, docstrings, mechanical refactors, per-package inventories, catalog hypothesis cards | Mechanical, latency-tolerant, verifiable by script. Exactly what free volume is for. |
| Judgment (expensive, narrow) | **Opus (me)** | License calls (CC-BY vs CC-BY-SA), validation math design, q-firewall rules, merge decisions, edge-catalog promotion, anything irreversible | These are the calls that are expensive to get wrong and cheap to make once. |
| Adversarial (second family) | **Grok** | Reviewing Hermes, STOP conditions, independent critique of my designs | Decorrelated error — a different model family catches what I miss. |
| Integration | **Opus (me)** | PR review + merge, FLEET_STATUS, steering | One merge authority. Never two. |

**The rule that makes this work:** a free worker never makes a decision that is expensive
to reverse. It produces *drafts and artifacts*; the gates stay with the paid tier and CI.

## 3. IP safety on free/anonymous endpoints (nobody else has flagged this — it matters)

Our moat is not the code. It is the **edge catalog and the genealogy of what we tested and
what survived** (doctrine C8.2). That is precisely the thing that must not leak.

**Hard rules for the window:**
1. **Send the task, never the thesis.** A worker gets its one file, the exact spec for that
   file, and the paths it needs. It does NOT get `EDGE_SUPREMACY_DOCTRINE.md`,
   `EDGE_FACTORY_MASTERPLAN.md`, or `EDGE_CATALOG.md` wholesale.
2. **Never paste VALIDATED edge entries** — the mechanism, the magnitude, and which ones
   survived — into any free or anonymous endpoint. Hypothesis-tier mechanical work is fine;
   the survivor list is the crown jewel.
3. **No secrets, ever** (already a `CLAUDE.md` non-negotiable, restated because the surface
   is new): no `.env`, no keys, no prod hostnames, no DB URLs in a worker prompt.
4. **Models that TRAIN on free inputs are banned from this repo outright** — per the
   research that means Poolside Laguna and Thinking Machines Inkling. "Retained, not
   trained" (Ox Alpha, GLM) is the minimum bar; training-on-input is disqualifying no
   matter how good the coding score.
5. Anything touching the clearance engine, source-rights registry, or license
   classification is **judgment tier** — it never goes to a free worker at all.

## 4. The queue — how to slice work for slow, wide, mortal workers

Every task card must satisfy all five:
1. **One artifact** — one file created or modified. If it needs two, it's two tasks.
2. **Self-contained context** — the card carries the spec and the paths; the worker never
   explores. (This is why Tier 0's generated maps come first: they turn "explore the repo"
   into "read one file.")
3. **Script-verifiable** — a command decides pass/fail (`npm run typecheck`, the test it
   wrote, a guard). Verification must not need a model.
4. **Idempotent and restartable** — if the provider dies mid-task, re-running it from
   scratch is correct and cheap.
5. **Commit on completion** — never leave a finished artifact only in a session buffer.

**Task card format (JSON, because tools+JSON are reliable here):**
```json
{ "id": "T0.1-pbp-rows",
  "artifact": "docs/data/_gen/dict.pbp.json",
  "spec": "<the exact field list and column meanings for this one source>",
  "paths": ["packages/data-ingestion/src/nflverse/pbp.ts"],
  "verify": "npm run data:dict -- --check",
  "forbidden": ["prisma/", ".env", "event-odds-ingest", "line-archive"],
  "license_rule": "If a field's license is not provably CC-BY, mark UNKNOWN and exclude. Never guess." }
```

**Fan-out shape:** the Tier 0 substrate decomposes into ~30 independent cards (one per data
source for the dictionary, one per package for the repo map, one per fixture slice, one per
scaffold template). That is the overnight batch — genuinely parallel, genuinely mechanical,
and it is exactly the work that makes every later week cheaper.

## 5. Operating the fleet

Mechanism: **OpenCode CLI sessions as parallel Ox Alpha workers** (the `ox-alpha-spawn`
skill pattern — skill at `~/.codex/skills/ox-alpha-spawn/`, OpenCode ≥1.18, an
authenticated OpenRouter provider, model `openrouter/stealth/ox-alpha`). Verify with:
```
opencode providers list
opencode models openrouter | rg 'ox-alpha'
```
Run workers on isolated git worktrees (or per-worker branches) so twelve agents never
fight over one working tree. One PR per card or per small group of cards; **I merge**.

**Monitoring at fleet scale:** `docs/data/FLEET_STATUS.md`, machine-appended, one line per
worker: id, card, artifact, verify-status, PR. Monitoring cost is what caps fleet size —
this is the file that raises the cap. Do not read twelve transcripts.

**Kill / fallback ladder** (when the window closes or the provider degrades):
1. `z-ai/glm-5.2:free` — best free fallback, faster, retained-not-trained.
2. NVIDIA Nemotron Ultra `:free` — only if we accept their logging of free-endpoint data.
3. **Never** Laguna / Inkling on this repo (train on inputs — §3.4).
4. Paid DeepSeek Flash is a *speed and reliability* upgrade, **not an intelligence
   upgrade** — if Ox is GLM-5.3-class, Flash is a step down in capability. Do not buy it
   expecting better thinking; buy it only if throughput reliability is the blocker.

**Continuity requirement:** by the time the window closes, every asset must be committed
and every generator must run without any free model in the loop. Nothing we build this week
may depend on Ox Alpha still existing next week. That is the test of whether we converted
the resource or merely consumed it.

## 6. Done-when (end of window)

The window closes and we still own: the generated data dictionary with license tags, the
repo map, the covariate scaffold generator, the fixture corpus, the q-contamination guard,
the validation bench CLI, the first NFL battle-order scanners, and a spawn playbook plus
skill files that make the *next* fleet — on whatever model is free then — start smarter
than this one did.

If the window closes and all we have is chat logs, we wasted the single cheapest week of
compute this project will ever see.
