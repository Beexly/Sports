# Continue.dev: AI Inside Your Editor

> Source: `continuedev/continue` (Apache-2.0, 22k★)
> Purpose: The open-source AI code assistant for VS Code and JetBrains — Claude in the editor, not just in the terminal

## What This Solves

Claude Code is a terminal session tool — you switch away from your editor, describe the problem, get a response, switch back. Continue.dev lives INSIDE the editor:

- **Cursor position aware**: "explain this function" → Claude reads the function under your cursor
- **Diff-aware**: asks about the current unstaged changes without copying and pasting
- **Multi-file context**: understands the file you're editing AND its imports
- **Inline code actions**: right-click → "Edit with AI" → change lands at the cursor
- **Quick queries**: Cmd+L to ask "what does this enum value mean" without leaving the file

Not a replacement for Claude Code — complementary:
- Continue = quick in-editor queries, autocomplete, single-file edits
- Claude Code = architecture sessions, multi-file refactors, complex reasoning

## Installation

```bash
# VS Code (recommended)
# Extensions → search "Continue" → Install (publisher: continue-dev)
# OR:
code --install-extension Continue.continue

# JetBrains (IntelliJ, WebStorm, etc.)
# Plugins → search "Continue" → Install
```

## Configuration: Claude as the Model

Create or edit `~/.continue/config.json`:

```json
{
  "models": [
    {
      "title": "Claude Sonnet (fast)",
      "provider": "anthropic",
      "model": "claude-sonnet-4-20250514",
      "apiKey": "$ANTHROPIC_API_KEY"
    },
    {
      "title": "Claude Haiku (cheap)",
      "provider": "anthropic",
      "model": "claude-haiku-4-5-20251001",
      "apiKey": "$ANTHROPIC_API_KEY"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Claude Haiku (autocomplete)",
    "provider": "anthropic",
    "model": "claude-haiku-4-5-20251001",
    "apiKey": "$ANTHROPIC_API_KEY"
  },
  "embeddingsProvider": {
    "provider": "anthropic",
    "model": "voyage-code-3",
    "apiKey": "$ANTHROPIC_API_KEY"
  },
  "contextProviders": [
    { "name": "diff", "params": {} },
    { "name": "repo-map", "params": {} },
    { "name": "file", "params": {} },
    { "name": "terminal", "params": {} },
    { "name": "problems", "params": {} },
    { "name": "open", "params": {} }
  ],
  "slashCommands": [
    { "name": "edit", "description": "Edit selected code" },
    { "name": "comment", "description": "Write comments for the highlighted code" },
    { "name": "share", "description": "Export conversation as markdown" },
    { "name": "cmd", "description": "Generate a shell command" }
  ]
}
```

## Repo-Level Config for GSN

Create `.continue/config.json` at the Sports repo root. Committed to git — shared across the team:

```json
{
  "systemMessage": "You are an expert in the GSN (Galaxy Sports Network) TypeScript monorepo. Stack: Next.js 14 App Router, TypeScript strict, Prisma + PostgreSQL, NextAuth.js v5, Stripe, The Odds API, Claude API, BullMQ + Redis, Vitest. Auth pattern: `import { auth } from '@/lib/auth'; const session = await auth(); if (!isAdminSession(session)) throw`. GameStatus enum: SCHEDULED, LIVE, FINAL, POSTPONED, CANCELED. PickResult: PENDING, WIN, LOSS, PUSH, VOID. Subscription tiers: FREE, PRO, ELITE. Always use TypeScript strict mode — no `any`.",
  "docs": [
    {
      "title": "GSN Architecture",
      "startUrl": "file:///workspace/sports/CLAUDE.md",
      "rootUrl": "file:///workspace/sports/"
    }
  ]
}
```

## Key Keyboard Shortcuts

| Action | Mac | Windows |
|---|---|---|
| Open Continue panel | `Cmd+L` | `Ctrl+L` |
| Edit selected code | `Cmd+I` | `Ctrl+I` |
| Quick action (inline) | `Cmd+Shift+L` | `Ctrl+Shift+L` |

## GSN-Specific Workflows

### Instant security review of current file
1. Open `apps/web/lib/api-auth/hash.ts`
2. `Cmd+L` → type `@file` → tab → check for timing-sensitive comparisons
3. Result inline in 2–3 seconds — never left the file

### Auth guard check on a new API route
1. Open the new route handler
2. Select all → `Cmd+I`
3. Type: "Add auth guard — check session with `auth()` and throw 401 if not admin"
4. Claude edits in place — no copy/paste

### Commit message from current diff
1. `Cmd+L`
2. Type `@diff` → space → "write a conventional commit message"
3. Copy the result into the terminal commit

### Understand an unfamiliar BullMQ job
1. Open `workers/data-refresh/src/index.ts`
2. Click on the `processJob` function
3. `Cmd+L` → "explain this BullMQ job's failure handling in 3 bullets"
4. Never left the editor

### Inline test generation
1. Open any function, select it
2. `Cmd+I` → "write a Vitest unit test for this function with 3 happy-path cases and 2 edge cases"
3. Test appears inline

## Custom Slash Commands for GSN

Add to `.continue/config.json`:

```json
{
  "slashCommands": [
    {
      "name": "gsn-review",
      "description": "Review selected code against GSN security non-negotiables",
      "prompt": "Review this code against the GSN security rules: no fake data, no fabricated stats, no frontend-only paywalls, no secrets in code, no stale data, always validate auth with isAdminSession(). Report any violations."
    },
    {
      "name": "gsn-test",
      "description": "Generate a Vitest test for selected function",
      "prompt": "Write a Vitest unit test for this function. Use `vi.fn()` for mocks, `describe`/`it` blocks, and `expect` assertions. Include happy path, edge cases, and error cases."
    },
    {
      "name": "gsn-types",
      "description": "Add TypeScript strict types to selected code",
      "prompt": "Add TypeScript strict types to this code. No `any`, explicit return types on all functions, Zod schemas for external data. Match the GSN convention of importing Prisma types from @sports/db."
    }
  ]
}
```

## Autocomplete Configuration

Haiku makes autocomplete fast and cheap (~$0.0001 per completion):

```json
{
  "tabAutocompleteModel": {
    "provider": "anthropic",
    "model": "claude-haiku-4-5-20251001",
    "apiKey": "$ANTHROPIC_API_KEY"
  },
  "tabAutocompleteOptions": {
    "debounceDelay": 500,
    "maxPromptTokens": 1500,
    "multilineCompletions": "auto"
  }
}
```

## Cost Estimate

| Usage | Model | Cost/day |
|---|---|---|
| 20 quick queries | Haiku | ~$0.002 |
| 5 inline edits | Sonnet | ~$0.05 |
| Autocomplete (50/day) | Haiku | ~$0.005 |
| Total | | ~$0.06/day |

One productive hour using Continue instead of switching to terminal = well under $1/day.

## Works Alongside Claude Code

Continue does NOT replace Claude Code — use both:

- **Continue**: "what does this type mean?", "add error handling here", "quick test for this function"
- **Claude Code**: architecture changes, security audits, multi-file refactors, session-level reasoning

## Status

- [ ] Install VS Code extension (`Continue.continue`)
- [ ] Add Claude Sonnet + Haiku to `~/.continue/config.json`
- [ ] Create `.continue/config.json` in Sports repo with GSN system message
- [ ] Add custom slash commands (`/gsn-review`, `/gsn-test`, `/gsn-types`)
- [ ] Configure Haiku autocomplete
- [ ] Commit `.continue/config.json` so the whole team benefits
