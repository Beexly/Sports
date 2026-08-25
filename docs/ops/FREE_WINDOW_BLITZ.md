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
| **Stealth-program terms: content IS shared with the anonymous provider AND used to train, evaluate and improve their models** | **This is the binding constraint on the entire plan.** See §3 — it is NOT "retained, not trained." |
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

## 3. IP EXPOSURE — READ BEFORE SENDING ONE TOKEN TO A FREE ENDPOINT

### 3a. The correction that changes the plan

Circulating summaries of Ox Alpha say *"trains on your prompts: No — retained, not
trained."* **The OpenRouter Stealth Program terms say the opposite.** Per
`openrouter.ai/terms/stealth`:

- *"your User Content may be collected by us and shared with the Stealth Provider"* (§1)
- the provider receives content *"for the sole purpose of enabling the Stealth Provider(s)
  to **train, evaluate, and improve** those Stealth Model(s)"* (§4)
- OpenRouter takes a *"non-exclusive, irrevocable, perpetual, transferable, worldwide,
  fully paid-up, royalty-free license"* over User Content, sublicensed to that provider
- the AUP prohibits submitting data subject to safeguarding or distribution limits

**Conclusion: stealth models are a training-on-input endpoint operated by a party we
cannot name.** Free inference is paid for with our data. That is a legitimate trade — for
the right data. It is a catastrophic trade for the moat.

*Verify these terms yourself before the first batch; they govern everything below, and I
am relying on a fetch of that page rather than counsel.*

### 3b. Classify the data, then the endpoint follows

Free compute is only free when what it sees costs nothing to leak. So classify first:

| Class | What's in it | Where it may go |
|---|---|---|
| **PUBLIC** | nflverse field schemas and column semantics, open methodology (BDB/academic), boilerplate, test scaffolding, formatting, docstrings, generated-doc prose | **Any free endpoint, including stealth.** Leakage costs us nothing — it's already public. |
| **INTERNAL** | repo architecture, generic app/infra code, non-edge utilities | No-training endpoints only. Not stealth. |
| **CROWN** | `EDGE_CATALOG.md` (above all, which hypotheses SURVIVED), the doctrine's class map, GSE-CPOE/RYOE/xYAC methodology, the covariate bus and share-core design, mining grids, calibration/CLV results, the genealogy library | **Paid/contractual endpoints only — never any free tier, ever.** This is the company. |

The moat is not the code; it is **which edges we tested and which survived** (doctrine
C8.2). A competitor with our validated survivor list needs no other document.

### 3c. Hard rules for the window
1. **Send the task, never the thesis.** A worker gets one file, its exact spec, and the
   paths it needs — never `EDGE_SUPREMACY_DOCTRINE.md`, `EDGE_FACTORY_MASTERPLAN.md`, or
   `EDGE_CATALOG.md` wholesale.
2. **Never send CROWN-class content to any free endpoint**, and never paste validated edge
   entries — mechanism, magnitude, or survivor status — anywhere free.
3. **No secrets, ever** (a `CLAUDE.md` non-negotiable, restated because the surface is
   new): no `.env`, no keys, no prod hostnames, no DB URLs in a worker prompt.
4. **Endpoints that train on inputs get PUBLIC-class work only.** By the terms above that
   now includes stealth/Ox Alpha, alongside Poolside Laguna and Thinking Machines Inkling.
   Do not assume any free tier is no-training — **read its terms, don't trust a table.**
5. Anything touching the clearance engine, source-rights registry, or license
   classification is judgment tier — it never goes to a free worker at all.
6. **Re-scope Tier 0 accordingly:** the generated data dictionary is mostly PUBLIC (nflverse
   field semantics) → fine for stealth. The repo map is INTERNAL. The covariate-bus scaffold
   generator is CROWN-adjacent → build it on the paid tier. Slice the substrate work along
   the class boundary before fanning it out, not after.

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

**Fleet composition — maximize free agents WITHIN the class boundary (§3b):**
Run as many free workers as the PUBLIC-class queue can feed — that queue is large (field
semantics, boilerplate, tests, docs, per-source inventories) and it is genuinely the
majority of Tier 0 by volume. Free agents are capped by *what they may safely see*, not by
appetite. Grow the free tier by growing the PUBLIC-class queue: every generated artifact
that turns proprietary exploration into public-shaped mechanical work moves more of the
sprint into the free lane. That is the compounding move.

**Kill / fallback ladder** (when the window closes or the provider degrades):
1. `z-ai/glm-5.2:free` — best free fallback on capability. **Verify its data terms
   independently before trusting it with anything above PUBLIC class**; the Ox Alpha
   correction in §3a is exactly the error to avoid repeating.
2. NVIDIA Nemotron Ultra `:free` — only if we accept their logging of free-endpoint data.
3. **Never** Laguna / Inkling above PUBLIC class (train on inputs — §3c.4).
4. Paid DeepSeek Flash is a *speed and reliability* upgrade, **not an intelligence
   upgrade** — if Ox is GLM-5.3-class, Flash is a step down in capability. Do not buy it
   expecting better thinking; buy it only if throughput reliability is the blocker.
5. **CROWN-class work never enters this ladder at all** — it stays on paid/contractual
   endpoints regardless of how the free tier evolves.

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
