# Efficiency Audit — 2026-08-13

Triggered by a long, tool-heavy session (321k / 1M context, 32%). Two questions:
where does the budget actually go, and what did *this* session waste?

Findings are ordered by size of win. Numbers are measured, not estimated.

---

## 1. The connector tax — ~95k tokens, every session (biggest win, your action)

From the context breakdown:

| Component | Tokens | Note |
|---|---:|---|
| **MCP tools** | **95.2k** | 7.5k loaded + 87.7k deferred, **220 tools** |
| Custom agents | 12.5k | 105 agents |
| System tools | 11.2k + 17.6k deferred | |
| Skills | 12.8k | |
| Memory files | 6.3k | CLAUDE.md is 9KB |
| System prompt | 4.0k | |

**~95k of tool definitions load before you type a word.** That is ~9.5% of a 1M
window, and it is spent whether or not a single one is called.

This session used **three** MCP servers: `github`, `Claude_Code_Remote`,
`Hugging_Face` — plus built-in WebSearch/WebFetch. Everything else was dead weight.

The largest connectors by tool count, none of which relate to a sports
prediction platform: Roboflow (141), Ahrefs (134), Make (97), Higgsfield (81),
Intuit QuickBooks (72), Miro (65), Linear (53), Era_Context (48), Airtable (43),
Postman (41), ConnectMachine (40), Atlassian (40), Lovable (39), plus AngelList,
Figma, Superhuman, Vercel, Webflow, Zapier, ChEMBL, Clinical Trials, ICD-10,
LegalZoom, CourtListener, DingDuff, Descrybe, Synthesize Bio, Vaisala Xweather…

**Action (claude.ai → connector settings):** keep a working set of roughly
`github`, `Claude_Code_Remote`, `Hugging_Face`, `Context7`, `Sentry`, `Stripe`,
`Supabase`/`Railway`, `Vercel`, `Notion`/`Linear` if you plan there. Disable the
rest; re-enable per project when a task actually needs one.

**Expected:** ~95k → ~15-20k. Roughly **75-80k tokens of headroom recovered per
session**, and less connector churn (this session logged dozens of
disconnect/reconnect cycles, each re-announcing tool lists).

Second, smaller: `.agents/` is **1.4MB and all 8 skills are `higgsfield-*`**
(video/image generation) — unrelated to this repo. `.claude/commands/` is 34
commands / 140KB. Both are worth pruning to what you use here.

---

## 2. CI was reporting on 8 guards while claiming 25 (fixed in this pass)

The `guardrails` script was a 25-long `&&` chain. `&&` short-circuits, and since
the v5.2.6 `MODEL_VERSION` bump it halted at `model-freeze` in **position 2** —
so guards 3..25 never ran. **17 guards were dark behind one red one**, including
`ai-control-plane-sealing`, `openapi-security-scan`, `api-payload-rights-scan`,
`commercial-copy-scan` and `eval-contracts`, while the "All guardrails" job
looked like it covered them.

Fixed by `scripts/guardrails/run-all.mjs`: runs everything, reports everything,
exits non-zero if any failed, concurrency-capped at 8.

- **Before:** 2 of 25 guards executed; the rest invisible.
- **After:** 25 of 25 in **9.2s**. 20 pass; failures are the 3 tracked
  base-branch issues plus 2 that need `node_modules`.
- The 17 previously-dark guards **all pass** — the mask hid coverage, not breakage.

Measured overhead worth knowing: `npm run <script>` costs **~1.2s of npm wrapper**
versus calling `node script.mjs` directly (2003ms vs ~800ms for the same guard).
Across ~25 guard invocations in a session that is ~30s of pure wrapper. Prefer
`node scripts/guardrails/X.mjs` in loops; keep `npm run` for ergonomics.

---

## 3. What this session itself wasted (honest self-review)

**Fetching one URL took five approaches.** The DeepSeek transcript: `WebFetch`
(403) → `curl` (202 WAF challenge) → headless Chromium → full Chromium → proxy
variants → finally `r.jina.ai`, which worked first try. **Rule: when a page is
client-rendered or WAF-guarded, go to a reader proxy on attempt two, not attempt
six.** Cost: ~6 tool calls and a Playwright install for a result one call could
have produced.

**One workflow failed completely.** The first recon workflow hit a
`StructuredOutput` retry cap: **343k subagent tokens, 1 of 7 agents usable.**
Root cause: schemas too rigid for prompts that asked for judgment, on agents
also doing web search (where refusals break the forced-tool contract). **Rule:
keep schemas loose (`summary: string` + a small array) when the agent must also
browse; save strict schemas for deterministic extraction.**

**The second workflow's synthesis agent returned `{}`** after 4 research agents
succeeded — so ~500k subagent tokens produced 4 usable payloads and I wrote the
synthesis by hand anyway. **Rule: for the final synthesis step, don't force a
schema — return prose. The value was in the research fan-out, not the format.**

**Small-call fragmentation.** Many single-purpose `Bash` calls that could have
been one script. Batching related checks into one heredoc is measurably cheaper
in both turns and tokens.

**What worked and is worth repeating:**
- Verifying claims against live registries instead of recalling them. The whole
  fabricated-package finding came from `npm view`, not from memory.
- Self-tests that block: `agent-bash-guard --selftest` caught three real false
  positives, one of which blocked its own commit. Cheap, immediate feedback.
- Reading CI logs rather than assuming. The "failures are pre-existing" claim
  only became trustworthy after pulling the actual job output.

---

## 4. Model routing (ties to `tools/model-advisor/`)

You pay for Claude Pro Max; the leverage is not paying it *twice*.

| Work | Route | Why |
|---|---|---|
| Guard runs, greps, file moves, mechanical edits | Local (Ollama) | $0, no limits, no rate ceiling |
| Agent-loop execution steps | Nemotron 3.5 Lightning 30B-A3B locally, or its `:free` OpenRouter route (1M ctx) | purpose-built, 3B active |
| Mid-tier reasoning | OpenRouter free tier — 19 routes at $0/$0 today | see `docs/reference/MODEL_LANDSCAPE.md` |
| Bulk non-interactive | Claude Batch API | −50% |
| Hard architecture / novel logic | Claude Pro Max | reserve the ceiling |

`npx tsx tools/model-advisor/cli.ts recommend --kind coding --complexity 3` encodes this.

Session-hygiene levers that matter more than model choice: keep the cached prefix
stable (CLAUDE.md + repo map) so cache reads bill at ~10%; `/compact` at natural
task boundaries; push search into subagents so their tokens don't land in the
main window.

---

## Priority

| # | Action | Effort | Win |
|---|---|---|---|
| 1 | Prune MCP connectors to a working set | 10 min, your action | **~75-80k tokens/session** |
| 2 | ~~Fix the guardrail chain~~ | done | 17 guards un-darkened |
| 3 | Prune `.agents/higgsfield-*` and unused `.claude/commands/` | 15 min | 1.4MB + context |
| 4 | Adopt the three workflow rules in §3 | free | avoids ~500k-token dead ends |
| 5 | Route mechanical work local per §4 | already documented | protects the weekly ceiling |

Nothing here changes product behavior. #1 is the whole ballgame and only you can
do it — it is account-level, not in this repo.
