# Fleet Architecture — October 8, 2026

Garrett's single command layer over 26+ agents. You deal with Motif. Motif routes everything.

## The Org

```
GARRETT
  └── MOTIF (primary captain — strategy, orchestration, QC, reporting)
        ├── FLEET ROUTER (~/workspace/fleet-router/ — task classification → backend)
        ├── ORCA (execution dashboard — 35 agents, worktrees, parallel sessions)
        │     └── orcad (remote runtime via relay — your computer stays out of it)
        ├── HERMES (peer personal agent — mobile, via agent bus)
        └── PLAYERS (routed by task type — see below)
```

## Full Lineup — Routed by Task Type

### Deep Reasoning / Hard Engineering
| Agent | Call it with | Cost |
|---|---|---|
| Claude Code (Anthropic) | `claude -p "task" --output-format json` | Pro $20/mo or API $2/$10 per 1M |
| DeepSeek V4.1 Flash | OpenRouter `deepseek/deepseek-v4-flash` | $0.30/$1.20 per 1M (half off-peak) |
| Muse (Meta) | `muse` CLI | $1.25/$4.25 per 1M (contributor $0.10/$0.20) |
| Cline | `cline` CLI or VS Code | Free (BYOK) |

### Fast Iteration
| Agent | Call it with | Cost |
|---|---|---|
| Cursor | `agent -p --print --yolo --model <id>` | Pro $20/mo |
| Kimi K2.7 | `kimi -p` or Moonshot API | $0.95/$4.00 per 1M |
| Copilot CLI | `copilot -p --allow-all-tools` | Pro $10/mo |
| Aider | `aider` (git-native) | Free (BYOK model) |

### Cheap Bulk Workers (cash-tight parallel work)
| Agent | Call it with | Cost |
|---|---|---|
| **Freebuff** ⭐ ADD | `npm install -g freebuff` | **$0** (ad-supported) |
| DeepSeek V4.1 Flash | OpenRouter | $0.30/$1.20 per 1M |
| OMP ("Oh My Pi") | `omp -p` | Free (BYOK) |
| Kilocode | `kilo` CLI, Auto-Free routing | $0 (free models) |
| OpenCode | `opencode run` | Free (BYOK) |

### Async Background (fire and forget)
| Agent | Call it with | Cost |
|---|---|---|
| Jules | `jules-api POST /v1alpha/sessions` | 15 tasks/day free; AI Pro $20/mo |
| Devin | devin.ai API / `devin` CLI | ~$20/mo + usage (verify pricing) |
| Mistral Vibe | `vibe` CLI | Free → Pro $14.99/mo |
| Antigravity | `agy -p` | Free tier (limits refresh ~5h) |

### Review / QC
| Agent | Call it with | Cost |
|---|---|---|
| **CodeRabbit** ⭐ ADD | GitHub App (2-click install) | Free tier |
| Merge Sheriff dot | OpenDots (needs API keys) | OpenRouter flash (near-free) |
| Auggie | `auggie --print` (CI mode) | Paid (verify pricing) |

### Browser Automation
| Agent | Call it with | Cost |
|---|---|---|
| **Browserbase + Stagehand** ⭐ ADD | `npm i @browserbasehq/stagehand` | Free tier; Dev $20/mo |
| Jev | Python browser-action engine | Free (local) |

### Security
| Agent | Call it with | Cost |
|---|---|---|
| **Socket** ⭐ ADD | GitHub App on Beexly org | Free for OSS |

### Special Purpose
| Agent | Role |
|---|---|
| Grok Build (SpaceXAI) | Heavy 16-agent architecture, 500K ctx |
| MiMo Code | Long-horizon tasks (persistent memory) — confirm which "MiMo" Orca detected |
| Prime Agent | Self-improving research loops, durable sessions |
| Command Code | Style-consistent output (learns your taste) |
| Hermes Agent (Nous) | Cron + persistent memory background jobs |
| OpenClaude | Model-agnostic CLI (200+ LLMs) — confirm CLI vs app |
| Pi (Inflection) | Weak fleet fit — personal assistant, not coding |
| Gemini CLI | **DEPRECATED** for consumer tiers → use Antigravity (`agy`) |

## The 5 Missing Pieces (in priority order)

1. **Freebuff** — $0 bulk workers. `npm install -g freebuff`. Biggest leverage for cash-tight parallel work.
2. **CodeRabbit** — Auto PR review. GitHub App install. Catches what Merge Sheriff can't yet.
3. **Browserbase + Stagehand** — Programmable browser for every agent. Fixes the browser automation gap.
4. **Socket** — Supply-chain security. You're `npm install`ing random GitHub repos constantly.
5. **OpenAI Codex** — Zero OpenAI agents in the fleet. Every other lab is represented.

## Dashboard Decision

**Stay on Orca.** 87.8k stars, 130 commits/day, v1.4.222 shipped yesterday, purpose-built for heterogeneous coding fleets, MIT/free. Nothing else matches.

**Evaluate Multica** as the work-routing layer alongside Orca. Its "Squads with leader routing" maps 1:1 to your captains/players model. Natively drives Hermes + OpenClaw + OpenCode.

**Protocol bet: MCP.** Only protocol with verified production adoption. Centralize MCP config once, share across all agents.

## How You Work Today

You talk to Motif. That's it. Motif classifies your task (Fleet Router), routes to the best agent, QC's the output, and reports back. Jules handles async coding NOW. OpenRouter handles model tasks NOW. Orca desktop runs your 22 local agents NOW.

## Naming Collisions (do not confuse)

- **Muse ≠ Claude Code.** Muse is Meta's. Claude Code is Anthropic's.
- **Hermes × 3:** Nous Hermes models, Nous Hermes Agent CLI, your Minis mobile agent.
- **Vibe × 2:** Mistral Vibe platform + `vibe` CLI.
- **OpenClaude ≠ OpenCode.** Different projects.

---
*Researched October 8, 2026. Full 26-agent inventory: ~/workspace/agent-fleet-inventory-2026-10-08.md*
*Dashboard landscape: subagent report 2026-10-08. Verify pricing on official pages before budgeting.*
