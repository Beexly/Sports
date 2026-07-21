# LLM CLI: Shell-Native AI for Developer Workflow

> Source: `simonw/llm` (Apache-2.0, 12k★)
> Purpose: Unix-pipe AI queries, structured extraction, automatic SQLite audit log — complement to Claude Code for fast one-off tasks

## What This Solves

Claude Code is a full session with context management. Sometimes you need 3 seconds, not 3 minutes:

```bash
cat apps/web/lib/stripe.ts | llm "does this have any missing idempotency keys?"
git diff HEAD~1 | llm "write a one-line commit message for this diff"
cat workers/data-refresh/logs/2026-07-21.log | llm "find the root cause of the 502s"
```

Every prompt and response is auto-logged to a local SQLite database — making it a
zero-config audit trail for all AI interactions during development.

## Installation

```bash
pip install llm
# OR
brew install llm
# OR (isolated, recommended)
pipx install llm
# OR
uv tool install llm

# Claude plugin
llm install llm-anthropic
llm keys set anthropic
# paste ANTHROPIC_API_KEY when prompted

# Set Claude as default model
llm models default claude-haiku-4-5-20251001
# Use Haiku by default (fast + cheap for dev); switch to Sonnet with -m flag
```

## Core Patterns for GSN Development

### 1. Pipe file content for quick analysis

```bash
# Security review of a single file
cat apps/web/lib/api-auth/hash.ts | llm -s "find timing-sensitive comparisons"

# Type-check questions without running TypeScript
cat packages/ingestion-pipeline/src/settle-sport.ts | llm \
  "what are the possible values of score.homeScore and what type is it"

# Explain an unfamiliar BullMQ job
cat workers/data-refresh/src/index.ts | llm "explain what this worker does in 3 bullets"
```

### 2. Git workflow automation

```bash
# Generate commit message from staged diff
git diff --cached | llm "write a conventional commit message for these changes"

# PR description from branch diff
git diff main...HEAD | llm "write a PR description with Summary and Test Plan sections"

# Find what changed in a merge
git log --oneline -20 | llm "what was the most impactful change in these commits"
```

### 3. Structured data extraction from sports APIs

```bash
# Parse raw odds API response into typed shape
curl "https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?..." | \
  llm --schema '{"games": [{"homeTeam": "string", "awayTeam": "string", "spread": "number"}]}' \
  "extract all NFL games with their spread values"

# Extract injury report from ESPN text
curl "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries" | \
  llm --schema '{"injuries": [{"player": "string", "team": "string", "status": "string"}]}' \
  "extract all player injury statuses"
```

### 4. Log analysis

```bash
# Find errors in production logs
cat /var/log/sports-worker.log | llm "what are the top 3 error patterns in the last hour"

# Analyze BullMQ failed jobs
llm "$(redis-cli lrange bull:pick-generation:failed 0 20)" \
  "what's the most common failure reason"
```

### 5. Quick model for comparison before Claude Code session

```bash
# Cheap pre-screen: is this worth a full Claude Code session?
cat packages/ingestion-pipeline/src/settle-sport.ts | \
  llm -m claude-haiku-4-5-20251001 "list the 3 highest risk bugs in this file"
# Cost: ~$0.002. If it finds real issues, open a full Claude Code session.
```

## SQLite Audit Log

Every `llm` invocation is automatically logged to `~/.config/llm/logs.db`.

```bash
# View last 10 queries
llm logs list --limit 10

# Search for a specific topic
llm logs list --search "stripe"

# Export for analysis
llm logs list --output json > ai-session-log.json

# Browse with Datasette (optional UI)
pip install datasette
datasette ~/.config/llm/logs.db
# Opens at http://localhost:8001 — full query history with search
```

**GSN use case:** After a development sprint, run:
```bash
llm logs list --search "picks" --model claude-sonnet-4 | \
  llm "what patterns or problems came up most often in these AI queries about picks"
```

## CI Integration: Model Comparison Gate

In GitHub Actions, compare two models on the same prediction prompt before deploying
a model change:

```yaml
# .github/workflows/model-gate.yml
- name: Compare pick prediction models
  run: |
    pip install llm llm-anthropic
    llm keys set anthropic --value ${{ secrets.ANTHROPIC_API_KEY }}

    PROMPT="NFL Week 12: Bills -3.5 at home vs. Jets. 5 reasons to bet the spread."

    llm -m claude-sonnet-4-20250514 "$PROMPT" > /tmp/sonnet-pick.txt
    llm -m claude-haiku-4-5-20251001 "$PROMPT" > /tmp/haiku-pick.txt

    diff /tmp/sonnet-pick.txt /tmp/haiku-pick.txt | \
      llm "is the haiku response meaningfully worse than the sonnet response for sports betting?"
```

## Plugin System

```bash
# Install additional model providers
llm install llm-anthropic   # Claude (Haiku, Sonnet, Opus)
llm install llm-gemini      # Gemini Flash/Pro
llm install llm-ollama      # Local models via Ollama

# Embeddings (for similarity search on picks database)
llm install llm-sentence-transformers
llm embed -m sentence-transformers/all-MiniLM-L6-v2 "Patrick Mahomes injury"
```

## Works Inside Claude Code Sessions

Claude Code controls the terminal. This means Claude Code can call `llm` as a
subprocess for specific subtasks where a lightweight query is sufficient:

```bash
# Inside a Claude Code session, for a quick pre-check:
cat apps/web/app/api/picks/[id]/route.ts | \
  llm -m claude-haiku-4-5-20251001 "list any missing auth checks"
```

The output lands in Claude Code's terminal context. Cost: ~$0.002 vs ~$0.15 for
Claude Code analyzing the same file in full context mode.

## Status

- [ ] `pip install llm && llm install llm-anthropic`
- [ ] `llm keys set anthropic` with ANTHROPIC_API_KEY
- [ ] `llm models default claude-haiku-4-5-20251001` (fast + cheap default)
- [ ] Add `llm logs list` to weekly developer review habit
- [ ] Install `datasette` for log browsing UI
- [ ] Add model comparison step to CI for pick generation changes
