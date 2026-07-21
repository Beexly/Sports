# Zed: AI-Native Code Editor for Maximum Dev Velocity

> Source: `zed-industries/zed` (GPL/AGPL, 58k★)
> Purpose: GPU-rendered, Rust-based editor with Claude built-in — the fastest dev environment for the GSN codebase, with native multi-file AI editing

## What This Solves

VS Code is the default but it has real costs for a complex TypeScript monorepo:
- **Startup time**: 3–8 seconds cold start
- **CPU/memory**: Electron + language server + extensions = 800MB+ RAM in a large workspace
- **AI integration**: Copilot or Claude.dev are third-party extensions, not first-class
- **Rendering**: JavaScript-based rendering with occasional jank in large files

Zed is different:
- **Written in Rust with GPU rendering** — opens in <500ms, scrolls at 120fps
- **Claude built-in** — not an extension, integrated at the framework level
- **Multi-buffer editing** — open and edit multiple files simultaneously in one view
- **AI terminal** — terminal commands autocompleted by Claude
- **Collaborative editing** — real-time multi-cursor across machines (like Figma for code)

## What This Does NOT Duplicate

| Tool | Role |
|---|---|
| Claude Code (CLI) | Agentic coding sessions, file edits, git operations — terminal-based |
| Fabric | Personal AI patterns via terminal pipes |
| Ollama | Local LLMs for GSN production pre-screening |
| **Zed** | **Daily coding IDE — where you spend 8 hours a day writing GSN code** |

Claude Code and Zed are complementary. Claude Code runs agentic multi-step tasks in the terminal. Zed is your editor for manual code writing, with Claude assistance inline.

## Installation

```bash
# macOS
brew install --cask zed

# OR download from zed.dev
# Linux: also available (first-class support)
```

## Claude Integration Setup

```json
// ~/.config/zed/settings.json
{
  "assistant": {
    "default_model": {
      "provider": "anthropic",
      "model": "claude-sonnet-5"
    },
    "enabled": true,
    "version": "2"
  },
  "features": {
    "inline_completion_provider": "copilot"
  }
}
```

Set `ANTHROPIC_API_KEY` in your shell profile — Zed picks it up automatically.

## Key Features for GSN Development

### 1. AI Panel (Cmd+Shift+A)

Opens a Claude chat panel docked to the editor. Full codebase context:

```
You: The council-ledgers test is failing because auth() is called before seat validation.
     Here's the function [paste code]. Fix it.

Claude: [edits ledgers.ts directly in the editor]
```

The AI panel can:
- Edit files directly (no copy-paste)
- See the current file's content automatically
- Reference other files by path
- Run shell commands and show output

### 2. Inline Edits (Cmd+K)

Select any code, press Cmd+K, describe the change:

```
[select the logHandoff function]
Cmd+K → "move seat validation before the auth() call"
```

Zed opens a diff view. Accept or reject. No switching to a chat window.

### 3. Multi-Buffer Editing

Open `ledgers.ts` and `council-ledgers.test.ts` side-by-side in the same view (not just split panes — both are part of one editing surface). When Claude suggests a fix that spans both files, you see it simultaneously.

### 4. AI Terminal (Terminal Cmd+K)

```bash
# In the integrated terminal:
[cursor in terminal]
Cmd+K → "run just the council-ledgers tests and show the failing ones"

# Zed generates:
npx vitest run __tests__/council-ledgers.test.ts --root apps/web
```

For a TypeScript monorepo, this saves time looking up workspace flags.

### 5. Project Search That Understands Code

Zed's search understands TypeScript structure:
- `⌘T` (symbol search) → find any function, class, type across the monorepo
- `⌘P` (file search) → fuzzy find across all 494 test files instantly
- No indexing delay — Zed indexes incrementally in Rust

### 6. Language Server Performance

For the GSN monorepo (TypeScript strict, Prisma, Next.js 15):
- `typescript-language-server` starts in ~1 second vs VS Code's 5–15 seconds
- `go to definition` across workspace packages (`@sports/db`, `@sports/ai`) is instant
- Inline type errors appear as you type, not after a 2-second delay

## Zed Configuration for GSN Monorepo

**`~/.config/zed/settings.json`**:

```json
{
  "tab_size": 2,
  "formatter": "prettier",
  "format_on_save": "on",
  "assistant": {
    "default_model": {
      "provider": "anthropic",
      "model": "claude-sonnet-5"
    },
    "enabled": true,
    "version": "2"
  },
  "lsp": {
    "typescript-language-server": {
      "initialization_options": {
        "preferences": {
          "importModuleSpecifierPreference": "non-relative"
        }
      }
    }
  },
  "file_scan_exclusions": [
    ".next",
    "node_modules",
    ".git",
    "dist",
    ".turbo"
  ],
  "terminal": {
    "shell": "system",
    "working_directory": "current_project_directory"
  }
}
```

**`.zed/settings.json`** in the repo root (per-project):

```json
{
  "tab_size": 2,
  "formatter": "prettier",
  "languages": {
    "TypeScript": {
      "tab_size": 2,
      "formatter": "prettier"
    },
    "Prisma": {
      "tab_size": 2
    }
  }
}
```

## Workflow: Zed + Claude Code Together

These two tools compose cleanly:

```
Zed:           Open file, understand structure, make targeted edits
Claude Code:   Agentic tasks — "fix all failing tests", "add the auth mock to this test"
Fabric:        Research, improve prompts, analyze competitors
Ollama:        Local model for cheap pre-screening (runs in background)
```

**Typical GSN session**:
1. Open `apps/web` in Zed
2. `Cmd+T` → find `logHandoff` → understand the function
3. `Cmd+K` → "move seat validation before auth check"
4. Review diff, accept
5. Switch to terminal → `npm test --workspace=apps/web` (or Claude Code handles this)

## Zed vs VS Code: What to Expect

| | VS Code | Zed |
|---|---|---|
| Cold start | 3–8s | <500ms |
| RAM (monorepo) | 800MB–1.5GB | 150–300MB |
| Scroll performance | Variable | Locked 120fps |
| AI | Extension (Copilot/Claude.dev) | Built-in (Claude) |
| Multi-file AI edit | Manual copy-paste | Native (Cmd+K) |
| Collaborative editing | LiveShare (plugin) | Built-in |
| Linux | Electron | Native (GPU) |

For a developer working 8+ hours/day on GSN, the performance difference compounds.

## Collaborative Mode for Pair Work

If working with another developer on GSN:
```bash
# Share your Zed session (like Figma for code)
zed --new-connection
# Share the connection URL — they join, you see each other's cursors in real time
```

## Status

- [ ] `brew install --cask zed` on dev machine
- [ ] Configure `~/.config/zed/settings.json` with Anthropic claude-sonnet-5
- [ ] Add `.zed/settings.json` to repo root (per-project TypeScript settings)
- [ ] Open GSN monorepo in Zed: `zed /path/to/sports`
- [ ] Test inline edit: select a function, Cmd+K, describe change
- [ ] Test AI panel: ask it to explain a complex piece of GSN logic
- [ ] Verify TypeScript LSP resolves `@sports/db`, `@sports/ai` workspace packages
- [ ] Switch daily coding from VS Code to Zed for 1 week — evaluate velocity
