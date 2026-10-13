# Beex Command Deck

**One prompt in → best agent out.** A local router that classifies each task, sends it to the strongest *available* agent via that vendor's official CLI on **your existing subscriptions**, and fails over automatically when one hits a quota wall (the exact failure GitHub Copilot's cloud agent just hit).

```
you ──> deck "refactor the auth pipeline"
              │  classify: deep-code
              ├─ claude  (Claude Max)      ← quota? cooldown + next
              ├─ codex   (ChatGPT Plus)    ← winner ✔
              ├─ grok    (SuperGrok)
              └─ gemini  (free 1000/day)
```

## Why this design (and not a "universal login")

Verified July 2026:

- **Anthropic bans and technically blocks** routing Claude Pro/Max credentials through third-party tools (enforced since Feb 2026; accounts have been banned). Every `claude-max-proxy` repo on GitHub is a ToS violation waiting to eat your account.
- **The sanctioned pattern** is the one this tool uses: each vendor's *first-party* CLI running headless on its own subscription — `claude -p`, `codex exec`, `gemini -p`, `grok -p`, `ollama run`. Zero API credits, zero credential sharing, zero ban risk.
- GitHub Copilot's **cloud coding agent** cannot be pointed at outside accounts at all (BYOK covers VS Code/CLI only, and needs pay-per-token API keys anyway).

## Install (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Then log in to whichever agents you have subscriptions for (one time each):

| Agent | Install | Auth | Costs |
|---|---|---|---|
| Claude Code | `irm https://claude.ai/install.ps1 \| iex` | run `claude`, log in | Claude Pro/Max sub |
| Codex | `npm i -g @openai/codex` | `codex login --device-auth` | ChatGPT Plus/Pro sub |
| Gemini CLI | `npm i -g @google/gemini-cli` | run `gemini`, Google OAuth | **free** 1,000 req/day |
| Grok Build | `irm https://x.ai/cli/install.ps1 \| iex` | `grok login` | SuperGrok / X Premium+ |
| Ollama | `winget install Ollama.Ollama` | none | **free**, local, private |

Missing agents are simply skipped — the deck routes around them.

## Use

```powershell
deck "write a regex that strips ANSI codes"          # auto-routes (quick-code)
deck --lane research "compare pgvector vs qdrant"    # force a lane
deck --agent claude "..."                            # force an agent (ignores cooldown)
deck --build "fix the failing tests in this repo"    # allows file edits (workspace-write)
deck --private "draft the 21+ intake copy"           # LOCAL ONLY — never leaves the machine
deck status                                          # install/auth/cooldown table
deck test                                            # ping every installed agent
deck ui                                              # cockpit at http://127.0.0.1:8787
```

`deck <prompt> --json` gives the full machine-readable routing outcome for scripting.

## Routing table (edit `%USERPROFILE%\.beexdeck\deck.config.json`)

| Lane | Chain | Rationale |
|---|---|---|
| `deep-code` | claude → codex → grok → gemini | strongest agentic coder first |
| `quick-code` | codex → gemini → ollama → claude | preserve Claude quota for deep work |
| `research` | gemini → grok → codex → ollama | burn the free 1,000/day first |
| `bulk` | ollama → gemini → codex | free local floor for cheap work |
| `private` | **ollama only** | adult-division content never touches a cloud provider |

## Quota behavior

- A quota error starts a **cooldown** (30 min, doubling per repeat, cap 5 h; weekly-limit messages → 24 h) stored in `state.json`. Cooling agents are skipped without being spawned.
- A success resets the agent's failure counter.
- Every run appends a JSONL line to `history.jsonl` — **prompt hash only** by default (`log_prompts: false`), so private-lane content is never persisted in logs.

## Safety rails baked in

- Default mode is **ask** (read-only tools). `--build` enables workspace edits. `--danger` (full access / permission bypass) exists but must be typed explicitly — the deck never defaults to it.
- `ANTHROPIC_API_KEY` is stripped from claude runs — if present it would silently override your subscription and bill you per token.
- `CLAUDE_CODE_MAX_RETRIES=1` for fast failover; `CLAUDE_CODE_RETRY_WATCHDOG` is force-disabled (it would retry a 429 for up to 5 minutes instead of failing over).
- Gemini's free tier silently downgrades Pro→Flash on quota with exit 0; the deck detects this via `stats.models` and marks the result `degraded` instead of pretending it's healthy.
- Codex trap: `-p` means `--profile` there; the deck uses `codex exec` correctly.
- Claude JSON trap: `subtype` stays `"success"` even on API errors; the deck branches on `is_error` / `api_error_status` / exit code.

## Known gaps (honest)

- **Grok Build error shapes are unverified upstream** — quota detection for grok is heuristic (429/rate-limit regex). If xAI documents exit codes, tighten `detect_grok`.
- Claude's exit/status for a *subscription* limit (vs API 429) is matched by string patterns as well as status — both paths covered, but a new wording upstream could slip to `error` (which still fails over, just without the cooldown).
- Windows-native Claude Code has no sandbox (WSL2 does). `--build` on the native install means real writes — keep it in repos with git.

## How the cockpit GUIs fit

- **AionUi** — nice multi-CLI chat GUI, but *you* pick the agent per chat; no routing, no quota failover. Use it as a face if you like; the deck remains the brain (`deck ui` is the built-in face).
- **Open WebUI** — chat front-end for local/API models; pairs with Ollama for the private lane. Not a coding agent driver.
- **Khoj** — personal knowledge assistant (notes/docs RAG); different lane entirely.

## Files

```
%USERPROFILE%\.beexdeck\
  deck.py            the router
  deck.config.json   lanes, chains, private markers, ollama model, timeouts
  state.json         quota ledger (cooldowns)
  history.jsonl      routing telemetry (hashes only by default)
  bin\deck.cmd       the `deck` command
```

Tests: `python test_deck.py` — 31 tests covering detectors (against captured real CLI output shapes), classification, failover, cooldown math, and the private-lane guarantee.
