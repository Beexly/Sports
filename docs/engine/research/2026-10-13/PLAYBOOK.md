# Beex Command Deck — Playbook & Source of Truth

**Goal:** one entry point. A prompt goes in → it's classified into a lane → routed to the
strongest *available* engine under budget → fails over on quota → returns the result.
Optimized for **$0 marginal cost**: burn free/local pools first, subscriptions last.

This is the operator's manual. The runtime is `deck.py`; the roster is `models.json`.

---

## The three agents converged (this is the reconciliation)

You have three assistants that independently designed the same system. That agreement is the spec:

| | What it produced | Role going forward |
|---|---|---|
| **Claude (this)** | `deck.py` — working router: HTTP adapter, quota ledger, daily budgets, adult lane, 38 tests | **The runtime.** The thing that actually runs. |
| **Grok** (`grok/autonomous-bootstrap`) | `config/*.json` — provider/rotation/scout/personal-brand/agent-orchestra schema + Adult Agents OS scaffold | **The intent layer.** Human-readable plan + the app scaffold. |
| **Codex** (`.codex/`, local XXX app) | The actual Vite/TS/React "media command studio" app (`src/`, `server/`, `tests/`) | **The product.** The application the deck serves. |

**Mapping (they're the same design in two shapes):**

- Grok `config/rotation-schedule.json` lanes  ==  deck.py `models.json` → `lanes`
- Grok `config/providers.json` (burnFreeFirst, adultLaneLocalOnly)  ==  deck.py free-first chains + `nsfw_ok`/local gating
- Grok `config/weekly-scout.json`  ==  the weekly scout scheduled task (below)
- Grok `creative_adult` / `adultLane:true`  ==  deck.py `adult` lane (Ollama-only, hard-locked)

Grok's config lists *intent* (which providers, what order) but not the operational fields
(endpoints, key env vars, model IDs). `deck.py`'s `models.json` has those — it's executable.
**Keep both:** Grok's config is the readable plan in the repo; `models.json` is what runs.

---

## Lanes (edit in `models.json`)

| Lane | Chain (free → paid) | Purpose |
|---|---|---|
| deep-code | claude → grok → nim → openrouter → gemini → codex → ollama | Hard multi-file work |
| quick-code | gemini → groq → nim → zai → openrouter → ollama → claude | Snippets, one-offs |
| plan-review | github-models → claude → nim → grok | Second opinions (GPT-5-class one-shots) |
| research | gemini → grok → nim → openrouter → mistral → ollama | Trends, docs, comparisons |
| bulk | ollama → zai → groq → mistral → openrouter | Cheap high-volume |
| private | **ollama only** | Business-internal; never leaves the machine |
| adult | **ollama-uncensored → venice** | 21+ brand text; local-first, cloud only if you flip `allow_cloud_nsfw` |

## Rotation = automatic, quota-aware, cheapest-first

- Each provider has a `daily_quota`. The router spends free daily pools first and **skips
  exhausted ones** without spawning them. That IS the rotation schedule — no manual juggling.
- A quota/429 error → cooldown (30 min, doubling, cap 5h; weekly-limit → 24h) and burns that
  provider's remaining daily budget so it's skipped until reset.
- `deck status` shows each provider's `today` budget and cooldown at a glance.

## NSFW / personal-brand lane (nothing illegal, fully private)

- Cloud models refuse adult brand work, so the `adult` lane runs on **local Ollama** uncensored
  models (dolphin3 + alternates). Prompts in this lane and the `private` lane are **never logged**
  (hash only), regardless of settings.
- Cloud NSFW (e.g. Venice) stays **off** unless you explicitly set `allow_cloud_nsfw: true`.
- `models.json` validation **refuses to load** a roster that puts a non-local provider in the
  adult lane or a non-Ollama provider in the private lane. The safety rail is in code, not honor system.
- Recommended local models (pull what your VRAM allows): `dolphin3`, `dolphin-mixtral`,
  `huihui_ai/qwen2.5-coder-abliterate:7b` (coding), abliterated Qwen for reasoning.

---

## Weekly scout (the autonomous auto-update)

A scheduled task runs weekly, scans the free-model landscape, and proposes an updated
`models.json` + a short changelog. It does **not** auto-download models or auto-apply — you
approve (matches "escalate uncertainty, don't hide it"). Apply an approved roster with:

```
deck apply <new-models.json>     # validates safety invariants, backs up the old one, installs
```

Watch sources it checks: OpenRouter free models, Ollama new tags, Artificial Analysis coding
index, Vals SWE-bench, HuggingFace trending, GitHub Copilot changelog, Anthropic release notes,
r/LocalLLaMA weekly top, PulseMCP new servers.

---

## SAFETY — what NEVER goes near git or the cloud

Hard rules the sync script and lanes enforce:

1. **Never commit** `*.sqlite` (your customer/preference DBs), `.codex/auth.json`, `secrets/`,
   `.env`, `*.pem`, API tokens, model weights. `sync-to-github.ps1` aborts if it sees any.
2. **Adult/private prompts never leave the machine** and are never logged in full.
3. The `Beexly/XXX` repo is **public** as of setup — treat everything pushed there as world-readable
   until it's made private. Personal identifiers (body profile, geo, real name) do not belong in a
   public repo.

---

## Files

```
command-deck/
  deck.py             the router (CLI + web UI + apply)
  models.json         hot-swappable roster (providers + lanes)  <- weekly scout regenerates this
  test_deck.py        38 tests (detectors, routing, budgets, safety invariants)
  install.ps1         installs the `deck` command + audits which agents you have
  setup-keys.ps1      set free API keys locally (you paste; never leaves your machine)
  sync-to-github.ps1  push ONLY the deck to a review branch (secrets hard-blocked)
  README.md           quick start
  PLAYBOOK.md         this file
```

## Daily use

```
deck "refactor the auth module"        # auto-routed
deck --lane research "compare X vs Y"
deck --private "internal ops note"     # local only
deck "onlyfans caption for the vault"  # auto media-ops: local uncensored, never logged
deck status | test | ui                # cockpit at 127.0.0.1:8787
deck doctor                            # health: config, readiness, cooldowns, ollama, git
deck scout                             # proposal-only free-model watch (never downloads)
deck sync-config models.candidate.json # install a new roster, PRESERVING cooldowns
```

## Cooldown ledger (handoff spec)
- Quota signals detected: 429, rate-limit, "quota", "limit:0", weekly-limit, and HTTP `Retry-After`.
- Backoff: 30m → 1h → 2h → 4h → cap 5h. Weekly-limit → 24h. A server `Retry-After` header overrides the schedule exactly. Success resets the counter; cooling agents are skipped without being spawned.

## Private / media-ops lane = multi-model LOCAL Ollama
Within the local-only lane, the prompt is sub-classified and sent to the right local model:
- creative / captions / adult writing → `dolphin3`
- strategy / pricing / funnels → abliterated Qwen reasoner
- local code → coder-abliterated
- fast / tags / titles → small local

Auto-forced local (never cloud, hash-only logs) on: nsfw, onlyfans, fansly, ppv, customs, 21+, vault, stage-name, personal-brand. Edit the model map in `deck.config.json` → `private_models`.

## --build safety (Windows)
`--build` / `--danger` refuse to run unless the current directory is a git repo — no editing untracked files. Default mode is read-only `ask`.
