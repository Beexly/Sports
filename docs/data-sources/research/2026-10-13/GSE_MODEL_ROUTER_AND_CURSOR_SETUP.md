# GSE model router + Cursor OpenRouter setup
Date: 2026-09-23
Repo: Beexly/Sports
Law: AGENTS.md — additive modules only. Never "destroy the code."

## Do not wait on Jev

Do **not** run a Jev phase before turning Cursor loose.

| Tool | Job | When |
|---|---|---|
| Jev / TypeSafe | 70–500ms typed decision: IMPLEMENT / SKIP / HUMAN-CALL / ALREADY-DONE | Optional sidecar later. Not a prerequisite. |
| Cursor cloud agents | Write TypeScript + tests + PRs in this repo | Now. This is the workforce. |
| OpenRouter free/stealth coding models | Burn-down of the 172 ledger items at $0 | Now. Wire as Cursor custom models. |

Jev cannot open the monorepo, run vitest, or respect Prisma freeze. Starting Jev first delays the only tool that already shipped 1,081 modules.

## Hard rules for every model you plug in

1. Additive files only. Zero deletions of existing engine logic.
2. Never edit `packages/db/prisma/**`, `migrations/**`, `.github/workflows/**`, `scripts/guardrails/**`, `.env*`.
3. Never send secrets to stealth models. OpenRouter stealth terms: prompts and completions may be **retained by an anonymous provider**. Strip `.env`, Stripe keys, Neon URLs, customer emails before any stealth call.
4. Never flip `SEALED_ENGINE_ENABLED`, `PERFORMANCE_STATS_ENABLED`, `CALIBRATION_ADJUSTMENTS_ENABLED`.
5. Max 6–8 concurrent coding agents. Not 50. Update `docs/research/2026-09-21/wiring/IMPLEMENTED.md` per ID so workers do not collide.
6. If a model says "rewrite the package" or "delete dead code" — reject. That is out of contract.

## Model roster (verify IDs live on openrouter.ai/models before paste)

Free / preview first. Paid only as fallback.

| Slot | Use for | OpenRouter / Zen model ID | Cost (listed) | Notes |
|---|---|---|---|---|
| WORKHORSE | 80% of additive module+test pairs | `stealth/space-bunny-alpha` | $0 preview (confirm on page) | 1M context, coding + reasoning. Released 2026-09-23. Anonymous provider retains prompts. |
| WORKHORSE_ALT | Same, if Bunny 429s | `big-pickle` via OpenCode Zen `https://opencode.ai/zen/v1` | $0 stealth | Strong SWE-style coding. Identity unknown; treat as untrusted for secrets. |
| FAST | Tiny modules, test-only, IMPLEMENTED.md rows | `xiaomi/mimo-v2.6-flash` or `xiaomi/mimo-v2.6-flash:free` if the :free suffix exists today | Flash paid is $0.14/$0.28; :free if listed | 1M context, agentic. Old `mimo-v2-flash:free` was deprecated Jan 2026 — do not use that ID. |
| HEAVY | Hard large-effort ledger items, architecture+harness | `xiaomi/mimo-v2.6-pro` | listed ~$0.44/$0.87 | Flagship. Use sparingly. |
| LONG_AGENT | Multi-file planning inside one session | `meta/muse-spark-1.3` or cheaper `meta/muse-spark-1.3-contributor` | Spark ~$1.25/$4.25; Contributor ~$0.10/$0.20 | Long-horizon agent. Contributor is the cheap Muse. Prompts may train Meta on Contributor. |
| ROUTER | IMPLEMENT / SKIP / HUMAN-CALL only | TypeSafe Jev `jev-1.13.0` | ~$0.042/M in, $0 out | Not a coder. |
| REVIEW | PR review, brand/trust, "did this change live ranking?" | Cursor-native Composer / Grok / Claude | Cursor pool | Keep one paid reliable reviewer. Do not let stealth merge itself. |

If an ID 404s, search OpenRouter for the display name and paste the current slug. Stealth aliases change.

## Cursor UI setup (you must click this — no remote agent can)

1. Cursor Settings → Models → API Keys
   - Add OpenRouter key. Base URL: `https://openrouter.ai/api/v1`
   - Add OpenCode Zen key if you use Big Pickle. Base URL: `https://opencode.ai/zen/v1`
   - Add TypeSafe key only if you turn Jev on later.
2. Settings → Models → Add Custom Model (repeat per row):

```
Name:         GSE Bunny
ID:           stealth/space-bunny-alpha
Provider:     OpenAI compatible
Base URL:     https://openrouter.ai/api/v1
API key:      <OPENROUTER_API_KEY>
Context:      1000000
```

```
Name:         GSE MiMo Flash
ID:           xiaomi/mimo-v2.6-flash
Provider:     OpenAI compatible
Base URL:     https://openrouter.ai/api/v1
API key:      <OPENROUTER_API_KEY>
```

```
Name:         GSE MiMo Pro
ID:           xiaomi/mimo-v2.6-pro
Provider:     OpenAI compatible
Base URL:     https://openrouter.ai/api/v1
API key:      <OPENROUTER_API_KEY>
```

```
Name:         GSE Muse Contributor
ID:           meta/muse-spark-1.3-contributor
Provider:     OpenAI compatible
Base URL:     https://openrouter.ai/api/v1
API key:      <OPENROUTER_API_KEY>
```

```
Name:         GSE Big Pickle
ID:           big-pickle
Provider:     OpenAI compatible
Base URL:     https://opencode.ai/zen/v1
API key:      <OPENCODE_ZEN_API_KEY>
```

3. Cloud Agents / Background Agents
   - Default model for factory workers: GSE Bunny
   - Fallback: GSE MiMo Flash → GSE Big Pickle
   - Review model: Cursor Composer or Grok (not stealth)
   - Concurrency cap: 8
4. Privacy
   - Privacy Mode ON for any session that might touch env, billing, or production URLs.
   - Do not enable stealth models on a workspace that has `.env.local` readable.

## Cloud agent prompt (paste into every Cursor cloud agent)

```
You are a GSE wiring worker on Beexly/Sports.

Read first:
- AGENTS.md
- CLAUDE.md
- docs/ops/HANDOFF_CURSOR_2026-09-22.md
- docs/research/2026-09-21/wiring/IMPLEMENTED.md
- docs/research/2026-09-21/wiring/WIRING-PLAN.md

Job: implement the next unused IMPROVEMENT-LEDGER.jsonl items that are NOT in IMPLEMENTED.md.

Contract:
- New files only. No deletions. No edits to existing scoring, publish, settlement, or schema.
- Each module: JSDoc with arXiv ID + verbatim ACCEPTANCE GATE comment.
- Disabled-by-default flag if the gate needs data we do not have.
- Co-located vitest. Run the touched package suite. Never push red.
- Training-program items: architecture + harness + eval scaffold only. Do not train.
- If the item needs behavior/schema change: append it under WIRING-PLAN.md NEEDS HUMAN CALL. Do not implement.
- Update IMPLEMENTED.md when done.
- Push small batches to a worker branch. Never force-push. Never push secrets.

Forbidden:
- packages/db/prisma/**, migrations, .github/workflows, scripts/guardrails
- .env* (do not read)
- SEALED_ENGINE_ENABLED / PERFORMANCE_STATS_ENABLED / CALIBRATION_* flips
- "cleanup", "rewrite", "destroy", "simplify the engine"

Claim 8–15 IDs max per run. Stop after green tests.
```

## Optional Jev sidecar (after Cursor is running, not before)

One TypeSafe call per ledger row:

- state = { id, title, files_hint, already_in_implemented: bool, needs_schema: bool, injury_adjacent: bool }
- questions:
  - action: Choice { IMPLEMENT, SKIP_DEFERRED, HUMAN_CALL, ALREADY_DONE }
  - risk: Score 0–5 "will this change live publish behavior?"

If HUMAN_CALL or risk>=4 → do not hand to Bunny. That is the only useful Jev job.

## What I cannot do from this chat

- Paste keys into your Cursor app
- Toggle Cursor Settings on your machine
- Guarantee space-bunny-alpha stays free (stealth previews end without notice, see Union Alpha)
- Run 50 agents (wrong number; 6–8)

If Bunny goes paid or 429s, switch workers to MiMo Flash / Big Pickle without changing the contract.
