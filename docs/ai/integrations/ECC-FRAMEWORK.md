# ECC Framework Integration

> Source: `affaan-m/ECC` (MIT)
> Purpose: 278 skills + 67 agents + 8 hooks — Claude Code productivity framework

## What Was Integrated

ECC provides a comprehensive Claude Code skill and agent framework. The following commands from ECC have been adapted and added to `.claude/commands/`:

| ECC Command | GSN Command | Notes |
|---|---|---|
| `/plan` | `/plan` | Adapted with GSN Prisma/NextAuth patterns |
| `/code-review` | `/code-review` | Extended with GSN-specific audit checklist |
| `/build-fix` | `/build-fix` | Identical methodology, GSN toolchain |
| `/refactor-clean` | `/refactor-clean` | Added GSN dead-code inventory from audit |
| `/quality-gate` | `/quality-gate` | Extended with guardrails + vitest suite |
| `/test-coverage` | `/test-coverage` | Added GSN critical gap inventory |
| `/checkpoint` | `/checkpoint` | Adapted for GSN workflow phases |
| `/multi-plan` | `/multi-plan` | Adapted with Codex/Gemini parallel analysis |
| `/learn` | `/learn` | Added GSN-specific learned patterns |

## ECC Skills Worth Installing Locally

From ECC's 278 skills, these are highest-value for GSN:

```bash
# Install ECC as Claude Code plugin:
/plugin marketplace add https://github.com/affaan-m/ECC
/plugin install ecc@ecc
```

**Top skills for GSN:**
- `tdd-workflow` — Red-Green-Refactor cycle (adapted as `/tdd` command)
- `verification-loop` — Continuous build/test/lint/typecheck
- `security-review` — Comprehensive security checklist
- `api-design` — REST design patterns
- `database-patterns` — Migration and schema patterns
- `database-migrations` — Prisma migration workflow
- `autonomous-loops` — Sequential pipelines and PR loops
- `mcp-server-patterns` — Build MCP servers with TypeScript SDK
- `postgres-patterns` — PostgreSQL optimization
- `docker-patterns` — Container security and compose

## ECC Agents Worth Activating

From ECC's 67 agents:

- `code-reviewer` — Quality, security, maintainability
- `security-reviewer` — OWASP vulnerability analysis
- `typescript-reviewer` — TypeScript/JS patterns
- `database-reviewer` — Query optimization
- `planner` — Feature implementation planning
- `architect` — System design decisions
- `tdd-guide` — Test-driven development methodology

## Hook Architecture

ECC's `hooks/hooks.json` fires on 8 Claude Code events. Most relevant for GSN:

```json
{
  "PostToolUse": {
    "command": "node scripts/hooks/quality-gate.js",
    "env": {
      "ECC_QUALITY_GATE_FIX": "true"
    }
  },
  "SessionEnd": {
    "command": "node scripts/hooks/extract-patterns.js"
  }
}
```

The `PostToolUse` quality gate (TypeScript/Biome/Prettier formatting on every file edit) is particularly useful.

## CLAUDE.md Configuration Pattern

ECC recommends project-level config in CLAUDE.md:

```markdown
---
agents:
  - planner
  - code-reviewer
  - security-reviewer
  - database-reviewer
  
rules: ecc/typescript

skills:
  - tdd-workflow
  - verification-loop
  - security-review
  - database-patterns
  - api-design
```

## Learning System

ECC's instinct-based learning system:
- `/learn` → extract session patterns
- `/learn-eval` → evaluate and save patterns
- `/instinct-status` → view accumulated instincts
- `/evolve` → cluster instincts into reusable skills

The GSN `/learn` command captures this pattern locally.

## Status

- [ ] Install ECC as Claude Code plugin: `npm exec --yes -- ecc-install`
- [ ] Copy `rules/typescript` to `~/.claude/rules/ecc/typescript`
- [ ] Add PostToolUse quality gate hook
- [ ] Activate `security-reviewer` agent for PR reviews
- [ ] Run `/instinct-status` after first 5 sessions
