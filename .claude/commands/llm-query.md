# /llm-query — Shell-Native AI Queries via simonw/llm

Quick one-off AI analysis using the `llm` CLI tool — pipe-native, cheap, logged.
Use this when Claude Code full-context mode is overkill for a quick check.

## Prerequisites

```bash
pip install llm && llm install llm-anthropic
llm keys set anthropic  # paste ANTHROPIC_API_KEY
llm models default claude-haiku-4-5-20251001  # fast+cheap default
```

## Patterns

### Security pre-screen (before full Claude Code session)

```bash
cat apps/web/lib/community/moderation-actions.ts | \
  llm "list any missing auth checks or privilege escalation risks. Be specific."
```

### Commit message from diff

```bash
git diff --cached | llm "write a conventional commit message (type: description)"
```

### Log root cause analysis

```bash
cat workers/data-refresh/logs/latest.log | \
  llm "find the root cause of failures. List: error message, file, likely fix."
```

### Structured data extraction from API responses

```bash
# Extract game data into typed JSON
curl "$ODDS_API_URL" | \
  llm --schema '{"games": [{"homeTeam": "string", "awayTeam": "string", "spread": "number", "moneyline": "number"}]}' \
  "extract all games with their spread and moneyline values"
```

### Quick type safety check

```bash
cat packages/prediction-engine/src/grade.ts | \
  llm -m claude-haiku-4-5-20251001 "any implicit any types, missing return types, or unsafe casts?"
```

### PR description from branch diff

```bash
git diff main...HEAD | llm \
  "write a GitHub PR description with ## Summary (3 bullets) and ## Test Plan sections"
```

## Audit Log

All queries are auto-logged to `~/.config/llm/logs.db`. Review:

```bash
llm logs list --limit 20
llm logs list --search "stripe"      # find all AI queries about Stripe
llm logs list --model claude-haiku   # filter by model
```

Optional UI:
```bash
pip install datasette && datasette ~/.config/llm/logs.db
# Browse at http://localhost:8001
```

## Cost Comparison

| Task | Claude Code | llm CLI (Haiku) |
|---|---|---|
| Single file security check | ~$0.05 | ~$0.001 |
| Commit message generation | ~$0.02 | ~$0.0005 |
| Log analysis (500 lines) | ~$0.10 | ~$0.003 |
| Full session with context | ~$0.50–2.00 | N/A (different tool) |

Use `llm` for pre-screening. Use Claude Code for implementation.
