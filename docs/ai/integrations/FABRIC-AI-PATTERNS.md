# Fabric: Personal AI Pattern Library for Developer Productivity

> Source: `danielmiessler/fabric` (MIT, 26k★)
> Purpose: CLI framework for personal AI augmentation with 150+ reusable prompt patterns — pipe any content through Claude from the terminal

## What This Solves

This is the only tool in the GSN stack that is purely for the **developer's personal workflow**, not the production application.

Every day as a developer you:
- Read long articles, papers, competitor analysis docs
- Write prompts, then try to improve them
- Analyze competitor pricing, pick services, UX decisions
- Draft PRD sections, technical specs, postmortems
- Extract key decisions from transcripts, meeting notes, Slack threads

Without Fabric, you either do this manually or write one-off throwaway prompts. Fabric gives you 150+ battle-tested patterns invokable from the terminal:

```bash
cat competitor-analysis.pdf | fabric --pattern extract_wisdom
cat pick-algorithm-spec.md | fabric --pattern improve_prompt
cat research-paper.txt | fabric --pattern summarize
cat transcript.txt | fabric --pattern create_report_finding
```

## What This Does NOT Duplicate

| Tool | Role |
|---|---|
| Ollama | Local LLM for production pre-screening (GSN server-side) |
| LiteLLM | Production model routing (GSN server-side) |
| AgentOps | Production AI session telemetry (GSN server-side) |
| Claude Code (this tool) | Interactive agentic coding sessions |
| **Fabric** | **Personal CLI AI augmentation for the developer's daily workflow** |

Fabric is not in GSN's production code. It's in your terminal, for you.

## Installation

```bash
# macOS (recommended)
brew install fabric

# OR Go install
go install github.com/danielmiessler/fabric@latest

# Configure with Claude API
fabric --setup
# → Select Anthropic as provider
# → Enter ANTHROPIC_API_KEY
# → Select claude-sonnet-5 as default model
```

## The Pattern Library

Fabric ships 150+ patterns. The most useful for GSN development:

### For Research & Analysis

```bash
# Extract the key insights from any long document
curl -s https://[competitor-site]/blog/picks-methodology | fabric --pattern extract_wisdom

# Summarize a research paper about sports prediction models
cat sports-betting-ml-paper.pdf | fabric --pattern summarize

# Extract key quotes and claims from competitor marketing copy
cat competitor-landing.html | fabric --pattern extract_extraordinary_claims

# Analyze a business/technical decision
cat pricing-strategy-doc.md | fabric --pattern analyze_paper
```

### For Prompt Engineering (High-Value for GSN)

```bash
# Improve a pick generation prompt
echo "You are a sports betting analyst. Analyze this game: {{game}}" | \
  fabric --pattern improve_prompt

# Create a better system prompt for the pick analyst
cat current-pick-prompt.txt | fabric --pattern create_system_prompt

# Evaluate your current prompt quality
cat current-pick-prompt.txt | fabric --pattern rate_ai_response
```

### For Writing & Documentation

```bash
# Draft a technical spec from notes
cat design-notes.txt | fabric --pattern write_essay

# Create a report from findings
cat audit-output.txt | fabric --pattern create_report_finding

# Improve existing docs
cat OPENTELEMETRY-TRACING.md | fabric --pattern improve_writing
```

### For GSN-Specific Use Cases

```bash
# Analyze a competitor's pick product (from their public page)
curl -s https://competitor.com/picks | fabric --pattern extract_wisdom

# Summarize a week of pick outcomes for the weekly summary email
cat pick-outcomes-week-47.csv | fabric --pattern create_summary

# Extract the key claims from a sports analytics paper
cat nfl-prediction-paper.pdf | fabric --pattern extract_extraordinary_claims

# Rate whether a pick narrative sounds confident vs. hedged
echo "Chiefs ML is solid if Mahomes is healthy" | fabric --pattern rate_value

# Draft a tweet announcing a win streak
cat win-streak-data.json | fabric --pattern write_micro_essay
```

## Custom Patterns for GSN

Fabric lets you add custom patterns. Store them in `~/.config/fabric/patterns/`:

**`~/.config/fabric/patterns/analyze_pick_rationale/system.md`**:

```markdown
# IDENTITY

You are a professional sports betting analyst reviewing pick rationales for accuracy, confidence calibration, and logical soundness.

# STEPS

- Read the pick rationale carefully
- Identify claims that are stated as fact vs. opinion
- Check if confidence levels are proportional to the evidence
- Flag any reasoning fallacies (recency bias, public fading without cause, etc.)
- Note if the rationale would hold up to a sharp bettor's scrutiny

# OUTPUT

- STRENGTHS: Bullet list of sound reasoning elements
- WEAKNESSES: Bullet list of reasoning gaps or overconfidence
- CALIBRATION: Is the stated confidence (X%) defensible given the evidence? Why/why not?
- VERDICT: One sentence on whether this rationale should be published as-is
```

Now use it:
```bash
cat pick-rationale-draft.txt | fabric --pattern analyze_pick_rationale
```

**`~/.config/fabric/patterns/extract_competitor_features/system.md`**:

```markdown
# IDENTITY

You are a product researcher documenting competitor features for a sports betting analytics product.

# STEPS

- Identify every distinct feature or data point the competitor surfaces
- Note the pricing tier each feature is gated behind (if visible)
- Identify what data sources they appear to use (public, proprietary)
- Note any UX patterns that suggest their conversion strategy

# OUTPUT

## Features
[table: Feature | Tier | Data Source | Notes]

## Pricing Signals
[what they seem to charge and what's gated]

## Conversion Strategy
[how they drive upgrades]

## Gaps
[what they DON'T have that GSN has or could have]
```

## Fabric + Pipes: Power Workflows

Fabric is designed for Unix pipes:

```bash
# Fetch a competitor's picks page, extract wisdom, save to a file
curl -s https://competitor.com/picks | \
  fabric --pattern extract_wisdom | \
  tee competitor-insights-$(date +%Y-%m-%d).md

# Get today's injury report (from a known API), summarize impact on picks
curl -s "https://api.sportsdata.io/v3/nfl/projections/json/InjuriesByWeek/2026REG/14" \
  -H "Okey-Key: $SPORTSDATA_KEY" | \
  fabric --pattern extract_wisdom

# Analyze the diff of a PR before reviewing
git diff origin/main..HEAD | fabric --pattern analyze_paper
```

## YouTube Transcripts

Fabric has a built-in YouTube transcript fetcher:

```bash
# Get wisdom from a sports analytics YouTube video
fabric -y https://www.youtube.com/watch?v=<video-id> --pattern extract_wisdom

# Summarize a podcast about sports betting strategy
fabric -y https://www.youtube.com/watch?v=<podcast-id> --pattern summarize
```

## Fabric Sessions: Persistent Context

```bash
# Start a research session (context accumulates across calls)
fabric --session gsn-competitor-research --pattern extract_wisdom < competitor-1.txt
fabric --session gsn-competitor-research --pattern extract_wisdom < competitor-2.txt
fabric --session gsn-competitor-research "Synthesize what you've learned about our competitors"
```

## Daily Developer Workflow

Suggested integration with your morning routine:

```bash
# Morning: extract wisdom from overnight articles
cat ~/Downloads/*.pdf | fabric --pattern extract_wisdom >> ~/research/morning-$(date +%Y-%m-%d).md

# Before PR review: analyze the diff for insights
git diff main..feature-branch | fabric --pattern analyze_paper

# After a hard debugging session: extract learnings
cat debug-notes.txt | fabric --pattern extract_wisdom >> ~/research/learnings.md
```

## Configuration

```bash
# ~/.config/fabric/config.yaml
default_model: claude-sonnet-5
default_vendor: anthropic

# Use Ollama (local, free) for cheap patterns:
fabric --model ollama/llama3.1:8b --pattern summarize < long-article.txt

# Use Sonnet for high-quality patterns:
fabric --model claude-sonnet-5 --pattern improve_prompt < draft-prompt.txt
```

## Status

- [ ] `brew install fabric` on dev machine
- [ ] Run `fabric --setup`, configure Anthropic (claude-sonnet-5)
- [ ] Run `fabric --list` to see all 150+ available patterns
- [ ] Test: `echo "test prompt for pick generation" | fabric --pattern improve_prompt`
- [ ] Create custom pattern `analyze_pick_rationale` in `~/.config/fabric/patterns/`
- [ ] Create custom pattern `extract_competitor_features` in `~/.config/fabric/patterns/`
- [ ] Wire Ollama as the cheap model for `--pattern summarize` (free, local)
- [ ] Add to morning routine: pipe overnight reading through `extract_wisdom`
