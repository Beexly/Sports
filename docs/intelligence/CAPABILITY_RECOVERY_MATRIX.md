# Capability Recovery Matrix

**Date**: 2026-08-12 · **Method**: 4 parallel research agents, every claim checked against the
live npm registry, PyPI JSON, Hugging Face, OpenRouter's API, and the repo itself.

## The concession first

Earlier I called the DeepSeek blueprint "90% fiction." That was too broad, and the pushback was
right: **a fabricated package name does not mean the capability was a bad idea.** The packaging was
fake; most of the *architecture* was pointing at something real.

Here is the corrected verdict across all 30 components:

| Verdict | Count | Meaning |
|---|---|---|
| **Already have it** | 16 | The repo implements it, usually better and more governed |
| **Engineer in repo** | 5 | Real capability, no dependency needed — build it small |
| **Use a real package** | 2 | Genuinely worth installing (both with caveats) |
| **Not worth it** | 7 | Real or fake, the cost/benefit fails for a solo dev |
| **No recoverable capability** | 2 | "AHA", "T3MP3ST" — acronyms with no stated function |

**Net: install almost nothing. Build two small things. Fix one urgent security gap.**

---

## 🔴 The urgent finding (verified, not from the blueprint)

Chasing the "CyberStrike red-team" idea to its real equivalent — dependency CVE scanning — surfaced
a live problem. `npm audit --omit=dev` on **production** dependencies, run today:

```
critical: 2   high: 6   low: 1
```

Both criticals are in **`@auth/core` / `next-auth`** — the library enforcing your paywall:

- *"Configuration errors can cause existence-based auth checks to **fail open** (auth object populated with an error)"*
- *"`getToken()` throws an uncaught exception on malformed Bearer authorization headers"*
- *"Email normalizer validates the address before Unicode normalization, allowing a homoglyph @ bypass"*

Highs include `next` (Image Optimizer DoS, RSC deserialization DoS), `postcss` (XSS + arbitrary file
read via `sourceMappingURL`), `fast-uri` (host confusion), `nanoid`, `brace-expansion`.

**"Fail open" on the auth library is the exact failure mode CLAUDE.md rule #3 exists to prevent.**

And CI is configured never to look: `--no-audit` appears **7 times** in `.github/workflows/ci.yml`,
and `.github/dependabot.yml` does not exist.

> Fix: bump `next-auth`/`@auth/core`, add one `audit-ci` CI job, add `dependabot.yml`. Effort: S.
> This outranks every other item in this document.

Second, smaller: `.claude/settings.json` does not exist, so nothing constrains agent `Bash` calls in
a repo holding live Stripe and production DB env. A `permissions.deny` list + PreToolUse hook costs
zero dependencies — and the repo already proves it uses hook enforcement (`.githooks` secret-scan).

---

## ✅ Already have it (16) — the blueprint reinvented your own code

| Blueprint name | What it wanted | You already have |
|---|---|---|
| A3M Router | Route work to the right model tier | `claude-api/model-router.ts` — per-surface `SURFACE_TIER`, pure & testable |
| ClawRouter | Failover across backends | `claude-api/jynx.ts` — Bedrock → Azure → Vertex → Anthropic + `cerebras_free` lane |
| MTRouter | Multi-provider dispatch | `claude-api/provider-dispatch.ts` + `openai-compat.ts` |
| ParetoBandit | Budget pacing | `ai-control-plane/budget.ts` — 1,164-line reserve/settle ledger, integer micros |
| AgentGuard (3-layer) | Validate AI-written code | `typecheck` + `lint` + `test` + 24 `guardrails` scripts, all CI jobs |
| TEIA (SHA-256 / Merkle) | Audit sealing | `lib/performance/proof-hash.ts`, Merkle across 16 files, Pedersen ledger in `packages/crypto` |
| Basilisk | Adversarial prompt testing | `promptfoo` 0.122.0, already at `eval/promptfoo` |
| OPA fail-closed policy | Policy enforcement | `ai-control-plane/policy-registry.ts` + `enforce-gate.ts` |
| obsidian-skills | Agent-loadable runbooks | `docs/agent-skills/` — 8 SKILL.md files + `npm run agent:eval` |
| Prime Agent | Top-level coordinator | `lib/autonomy/operating-kernel.ts` — *pure, deterministic*, stamps `requiresOwner` per action |
| Evolution Engine | Propose→adopt improvements | `cti-miner.ts` + `accept-proposal.ts` + `CalibrationProposal` + promotion-gate contract |
| Semantic cache (partial) | Don't pay twice | Anthropic native prompt caching already live at `claude-api/messages.ts:64-68` |

**The pattern:** your versions are *more* governed. `operating-kernel.ts` is a pure deterministic
planner with no LLM in the decision path — strictly safer than an LLM "prime agent," because it's
testable and it cannot flip a public gate. Swapping it for the blueprint's version would be a
downgrade disguised as an upgrade.

Notably, `accept-proposal.ts` documents itself: *"ACCEPTANCE IS A HUMAN DECISION. NEVER RUN BY CI OR
CRON… there is intentionally no automated caller anywhere in the repo."* That is the self-evolution
idea, already solved correctly.

---

## 🔧 Engineer in repo (5) — real idea, zero dependencies

1. **LLM response cache** — the *one genuine gap* in the routing cluster. ~80 lines of exact-key
   caching on `ioredis ^5.10.1` (already a dependency). **Deliberately NOT embedding-based semantic
   caching**: a mis-tuned similarity threshold silently serves a stale answer, which violates
   CLAUDE.md rule #5. Effort S.
2. **Entity/knowledge graph** — two Prisma models (`Entity`, `EntityEdge` with typed relation +
   `source_tier` + `observed_at`) per the existing design in `docs/brain/entity-graph.md`. Recursive
   CTEs give you traversal. **Not Neo4j** — a graph DB is operational tax for one operator. Effort M.
3. **Agent shell constraints** — `.claude/settings.json` deny-list + PreToolUse hook. Effort S.
4. **Candidate mining → calibration** — wire `cti-miner`-style mining to the settlement side so
   proposals accumulate for human review. Effort M.
5. **Research intake queue** (the safe half of "Ambition Engine") — see below.

---

## 📦 Use a real package (2) — both with caveats

- **`audit-ci` 7.1.0** (npm) — CI gate for the CVE finding above. Unambiguously worth it.
- **`claude-mem` 13.15.0** (npm, Apache-2.0, `thedotmack/claude-mem`) — real and actively maintained
  (updated 2 days ago). **But** it installs hooks that read your session transcripts; in a repo with
  Stripe and DB secrets that's a data-exfil surface you'd own. Try it in a scratch clone first. You
  already own the durable half: `JarvisMemoryEvent` (`schema.prisma:1536`) with
  candidate→owner_approval→approved.

---

## ❌ Not worth it (7) — including the ones that are real

- **Portkey** (`portkey-ai` npm 3.1.0 — fully real): every headline feature maps to something you
  own. Routing→`jynx.ts`, fallbacks→`cloudAttemptOrder`, spend→`budget.ts`, observability→`usage-store`.
- **LiteLLM** (PyPI 1.96.2 — genuinely excellent): it's a *Python* proxy. Using it means operating a
  second service to duplicate `jynx.ts` + `openai-compat.ts`.
- **Letta** (PyPI 0.16.8, the real MemGPT): a second stateful service + its own Postgres. Worse, its
  self-editing memory is *opposed* to your doctrine — `JarvisMemoryEvent` requires `owner_approval`.
- **ruflo 3.38.4** (real; an alias publish of `ruvnet/claude-flow`): an 8MB CLI installing hooks and
  claiming "60+ agents, self-learning, consensus" — a large unaudited surface with unverifiable
  claims, on a repo whose rule #1 is no fake data. Orchestration isn't your bottleneck; settled
  sample size is.
- **NeMo Guardrails / llm-guard / garak / PyRIT**: Python sidecars defending an LLM that per
  CLAUDE.md is *"content generation only — not source of truth."* Red-teaming a public chatbot you
  don't have. Enterprise theater for your threat model.
- **Sigstore / in-toto**: attest published artifacts you don't publish.
- **LangGraph** (`@langchain/langgraph` 1.4.9 — real): would create a parallel control plane whose
  actions do **not** carry your `requiresOwner` flag. A safety regression.

---

## 🪤 Package-name traps found along the way

| You'd type | You'd get | The real one |
|---|---|---|
| npm `transformers` | a **string/templating library** — installs clean, fails at runtime | `@huggingface/transformers` 4.2.0 |
| npm `semgrep` | a 0.0.1 stub | PyPI `semgrep` 1.172.0 |
| `@openpolicyagent/opa-wasm` | 404 | `@open-policy-agent/opa-wasm` 1.10.0 |
| PyPI `memgpt` | a squatter whose own summary disclaims the project | PyPI `letta` 0.16.8 |
| npm `deepswarm` | 404 (PyPI one is 2019 ant-colony NAS research) | nothing — skip |
| npm `sprout` | dead 2022 scaffolding tool | — |
| `@routerbench/cli` | unrelated commercial coding CLI | the benchmark is a *paper* |

The npm `transformers` one is the most dangerous shape: it **installs successfully** and fails
silently later, rather than 404-ing at install time.

## 📄 Two "inventions" that are actually real research

- **LLMRouterBench** — arXiv 2601.07206. Real paper, not a package.
- **PAST-Bench** — arXiv 2608.04003 (`github.com/Gen-Verse/PAST-Bench`). Its core finding is exactly
  the trap a memory layer falls into: agents with the same headline gain differ in whether evidence
  supports the intended pathway. **Copy its experience-on/experience-off A/B design into
  `npm run agent:eval`. Add no dependency.**

---

## 💸 Free LLM stack (verified against OpenRouter's live API today)

### ⚠️ Correction: `tencent/hy3:free` is no longer free

The `:free` route has been retired. OpenRouter's live API right now returns only:

| Route | Input /1M | Output /1M | Context |
|---|---|---|---|
| `tencent/hy3` | **$0.132** | **$0.528** | 262K |
| `tencent/hy3-preview` | $0.063 | $0.21 | 262K |

There is **no `tencent/hy3:free`** in the API response. Hy3 is real and excellent — 295B MoE / 21B
active, 256K ctx, Apache-2.0, released 2026-07-06 — and $0.13/$0.53 is genuinely cheap. But it is
**not $0**, so don't make it the default on that basis.

### The actually-free routes (19 confirmed $0/$0 today)

Best of them, and two are the NVIDIA family we just added to the catalog:

| Route | Context | Note |
|---|---|---|
| `nvidia/nemotron-3.5-lightning:free` | **1,000,000** | The Aug-12 release — free *and* 1M context |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | **1,000,000** | 550B-A55B, free |
| `nvidia/nemotron-3-super-120b-a12b:free` | 262K | |
| `google/gemma-4-31b-it:free` | 262K | |
| `cohere/north-mini-code:free` | 256K | coding-tuned |
| `poolside/laguna-s-2.1:free` | 262K | |
| `openai/gpt-oss-20b:free` | 131K | most portable local↔hosted |

Limits: 20 req/min; 50 req/day with no credits, 1,000/day once you've bought $10 lifetime.

### Best local models (llm-stats, Aug 2026 — GPQA / SWE-bench Verified)

| Model | Size | GPQA | SWE-V | Ollama |
|---|---|---|---|---|
| **Qwen3.6-27B** | 17GB | **0.878** | 0.772 | `qwen3.6:27b` |
| Qwen3.6-35B-A3B | 24GB (3B active) | 0.860 | 0.734 | `qwen3.6:35b` |
| Gemma 4 31B | 20GB (19GB QAT) | 0.843 | — | `gemma4:31b` |
| **Qwen3.5-9B** | **6.6GB** | **0.817** | — | `qwen3.5:9b` |
| Qwen3.5-4B | 3.4GB | 0.762 | — | `qwen3.5:4b` |

All Apache-2.0. **Qwen3.6-27B at GPQA 0.878 beats every proprietary model priced under $1/1M.**
Qwen3.5-9B scoring 0.817 from a 6.6GB file is the standout for a laptop.

Cheapest competitive API: **DeepSeek-V4-Flash-0423 at $0.10/$0.20 per 1M** — GPQA 0.874, SWE 0.786,
1M context. Roughly 1/50th the input price of Opus-class for genuinely close numbers.

*Caveat from the data pull: of 350 models on llm-stats, only 93 carry a price. Absent price ≠ free.*

---

## Do these five, in order

| # | Action | Effort | Why |
|---|---|---|---|
| 1 | **Patch `next-auth`/`@auth/core`; add `audit-ci` + `dependabot.yml`; drop the 7 `--no-audit` flags** | S | Two criticals, one is *fail-open auth* on the paywall |
| 2 | **`.claude/settings.json` deny-list + PreToolUse hook** | S | Nothing currently constrains agent shell in a live-secrets repo |
| 3 | **Redis exact-key LLM response cache** (~80 lines, `ioredis`) | S | The only real gap in the routing cluster |
| 4 | **SKILL.md for the autonomy kernel + promotion gate** | S | The two surfaces most likely to be operated wrong have no runbook |
| 5 | **Entity graph as two Prisma models** | M | Unlocks `docs/brain/` designs without a graph DB |

Zero new runtime dependencies for #2–#5. One dev-dependency for #1.

---

## Sources

npm registry (`npm view`), PyPI JSON API, Hugging Face Hub, OpenRouter `/api/v1/models` (live),
llm-stats.com RSC payload (350 models), `npm audit --omit=dev` on this repo, and direct reads of
`apps/web/lib/**`, `scripts/guardrails/**`, `packages/db/prisma/schema.prisma`, `docs/brain/**`.
Anything unverifiable is marked as such rather than asserted.
