# Galaxy Sports Edge (GSE) & Galaxy Sports Network (GSN) System Overview

## Discovery Summary
This directory contains the operational workspace for the Galaxy Sports Edge (GSE) sports betting prediction system and Galaxy Sports Network (GSN) content system, not merely raw NFL data.

## Key Components Identified

### 1. NFL Data Foundation
- `/data/nflverse/games.csv` - Historical NFL game data (~2.5MB)
- `/data/nflverse/games_harness_rows.jsonl` - Additional NFL harness data (~4MB)

### 2. System Documentation (Found in Strix Analysis & .cagent)
The actual system architecture and operation is documented in:
- `/.cagent/Sports/.claude/worktrees/phase3/AUTONOMOUS_OPERATING_SYSTEM.md`
- `/.cagent/Sports/.claude/worktrees/phase3/docs/ai/airwave/GSE_GSN_AIRWAVE_INTELLIGENCE_ARCHITECTURE.md`
- And related files in the same directory structure

### 3. Analysis Artifacts (From Strix Penetration Tests)
Temporary analysis performed by Strix security tests revealed:
- CLV (Closing Line Value) calculations for betting picks — whether our locked line beat the de-vigged closing line; 52.4% is the breakeven beat rate at -110
- Performance metrics showing >52.4% beat rate (profitable threshold)
- Spread movement analysis with 14.7% sign-flip detection
- Moneyline lock/provenance verification checks
- These were found in `/c/Users/Garrett/AppData/Local/Temp/strix_repos/sports_145b/Sports/docs/ops/calibration/`

## System Architecture (Per Documentation)

### Core Concept: GSN as Autonomous Operating System
- **Doctrine**: "every agent drafts; only a human commits anything externally visible"
- **Hard Stops**: No auto-bet, no auto-publish, no fabricated data, no destructive DB ops
- **Human Approval Required**: All external actions require operator review/approval

### Six Operator Agents
1. **SCOUT** - Sports Research: Watches odds movement, injury/news, schedule signals
2. **JARVIS** - Orchestrator/Chief of Staff: Routes work, surfaces readiness
3. **SARAH** - Support & Review Queue: Drafts support replies, triages
4. **TAL** - Engineering: Repo audits, bug triage, failing-test comments
5. **AVA** - Content/Media: Drafts blog/newsletter/short-form from approved data
6. **BOBBY** - Funnel/Subscription/Analytics: Surfaces conversion/churn observations

### Airwave Intelligence Intake
Processes sports-media input (satellite radio, podcasts, YouTube, beat reports, operator notes) into structured sports intelligence for:
- **GSE Outputs**: Picks, confidence scores, model context, injury alerts, usage alerts, DFS value signals, etc.
- **GSN Outputs**: Editorial briefs, show segments, podcast ideas, newsletters

### Model Routing & Optimization
- Uses Haiku/Sonnet/Opus models based on task complexity
- Cost-aware routing with prompt caching for 30-70% cost reduction
- Surface-specific model selection via `pickModelForSurface()` function

## Current State Assessment

### What's Present in This Directory
1. **Raw Data Foundation**: NFL historical data files
2. **System Workspace**: Environment where GSE/GSN operates
3. **Security Analysis Artifacts**: Strix penetration test reports and temporary analysis files

### What's Not Present (But Referenced)
- Core prediction/model generation code (may be elsewhere)
- Live betting/publishing mechanisms (disabled by hard stops)
- User interface/frontend components
- Database schema/live connections

## Safety & Compliance Features
- **No Auto-Bet**: Explicitly forbidden in CLAUDE.md
- **No Fabricated Data**: Must cite sources or emit "unknown"
- **Human-in-the-Loop**: All external actions require approval
- **Review Gates**: Nothing captures/publishes without explicit gate flags
- **Compliance Modules**: Dedicated responsible gaming documentation
- **Cost Controls**: Per-surface budgets, model routing optimization

## Connection to Beexly-dev
**NO DIRECT CONNECTION FOUND**
- `/c/Users/Garrett/beexly-dev` appears to be a separate website repository for "Altify Developing LTD"
- Contains standard web files, documentation, security tools
- No sports betting algorithms, prediction models, or GSE/GSN references found

## Recommendations for Claude Code

### For Understanding the System:
1. Review `SYSTEM_OVERVIEW.md` (this file)
2. Examine the key documentation files in `/.cagent/Sports/.claude/worktrees/phase3/`
3. Understand the six agent architecture and their specific missions
4. Note the hard stops and compliance requirements

### For Further Investigation:
1. The core GSE prediction algorithm may reside outside this directory
2. Look for model files, prediction scripts, or betting logic in other locations
3. Check for configuration files defining strategy/parameters
4. The NFL data here serves as foundational input to the system

### Key Files for Claude Code to Reference:
- `/c/Users/Garrett/Sports/SYSTEM_OVERVIEW.md` (this file)
- `/c/Users/Garrett/.cagent/Sports/.claude/worktrees/phase3/AUTONOMOUS_OPERATING_SYSTEM.md`
- `/c/Users/Garrett/.cagent/Sports/.claude/worktrees/phase3/docs/ai/airwave/GSE_GSN_AIRWAVE_INTELLIGENCE_ARCHITECTURE.md`
- `/c/Users/Garrett/AppData/Local/Temp/strix_repos/sports_145b/Sports/docs/ops/calibration/2026-08-19-l9-clv-slices/` (analysis artifacts)

## Verification Notes
- All findings are based on actual file discovery and content analysis
- No speculation - only what was found in files and directories
- System appears to be in analysis/workspace mode, not live betting operation
- Strix tests were evaluating this system's security/operation