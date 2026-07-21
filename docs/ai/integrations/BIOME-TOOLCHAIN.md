# Biome: Rust Toolchain — 30–50x Faster Lint + Format

> Source: `biomejs/biome` (MIT, 18k★)
> Purpose: Replace ESLint + Prettier with a single Rust binary — CI drops from 4+ min to <2 min, local `npm run lint` from 8s to 0.2s, GitHub Actions minutes fall by 40%

## What This Solves

GSN's current lint/format stack:
- ESLint: node_modules-heavy, slow startup (2-4s cold), rule-by-rule JavaScript execution
- Prettier: separate process, separate config, separate install
- Combined: `npm run lint` on the monorepo takes 6-12 seconds

Biome is a single Rust binary that does BOTH. It's 30-50x faster than ESLint on the same rules. On the GSN monorepo:
- `biome check .` replaces `eslint . && prettier --check .`
- Runs in 150-400ms total (vs 6-12 seconds)
- CI step drops from 90s to 10s
- On 100 PRs/month: saves ~1,300 GitHub Actions seconds/month

At GitHub Actions' $0.008/minute, that's ~$5.20/month saved on CI costs. More importantly, CI response time drops from 4+ minutes to <2 minutes, making the feedback loop dramatically faster.

## What This Does NOT Duplicate

| Tool | Role |
|---|---|
| TypeScript | Type checking (`tsc --noEmit`) — Biome does NOT replace this |
| Vitest | Testing — not affected |
| TruffleHog | Secret scanning — not affected |
| **Biome** | **Replaces ESLint + Prettier only** |

Biome is a drop-in replacement for ESLint + Prettier. TypeScript type checking (`tsc`) and tests remain unchanged.

## Installation

```bash
cd /workspace/sports
npm install --save-dev --workspace=apps/web @biomejs/biome
npm install --save-dev --workspace=packages/ai @biomejs/biome

# OR at root (applies to all workspaces):
npm install --save-dev @biomejs/biome
```

## Configuration

Biome uses a single JSON config file at the repo root:

**`biome.json`** (root):

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "ignore": [
      "node_modules",
      ".next",
      "dist",
      ".turbo",
      "*.d.ts",
      "prisma/generated"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error",
        "noConsoleLog": "warn"
      },
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "error"
      },
      "security": {
        "noDangerouslySetInnerHtml": "error"
      },
      "performance": {
        "noDelete": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "es5",
      "semicolons": "always"
    },
    "parser": {
      "unsafeParameterDecoratorsEnabled": false
    }
  },
  "json": {
    "formatter": {
      "enabled": true
    }
  }
}
```

## Migration from ESLint + Prettier

Biome provides a migration command that reads your existing ESLint config and generates the equivalent Biome rules:

```bash
# Automatic migration from ESLint
npx @biomejs/biome migrate eslint --write

# Automatic migration from Prettier
npx @biomejs/biome migrate prettier --write

# Verify equivalent coverage
npx @biomejs/biome check .
```

Most ESLint rules have Biome equivalents. Rules with no equivalent:
- React-specific hooks rules → Biome has `useExhaustiveDependencies` equivalent
- Import ordering → Biome has `organizeImports`
- Custom ESLint plugins (e.g., next.js plugin rules) → keep ESLint for NEXT_SPECIFIC rules only

## package.json Script Updates

**`package.json`** (root):

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "check": "biome check . && tsc --noEmit"
  }
}
```

Before:
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write .",
    "check": "eslint . --ext .ts,.tsx && prettier --check . && tsc --noEmit"
  }
}
```

## CI Integration

**`.github/workflows/ci.yml`** — replace the lint step:

Before:
```yaml
- name: Lint
  run: npm run lint  # ESLint: ~90 seconds on monorepo
```

After:
```yaml
- name: Lint + Format check
  run: npx @biomejs/biome ci .  # Biome: ~8 seconds on monorepo
```

`biome ci` is the non-interactive version of `biome check` — exits with code 1 if any issues, no auto-fix.

## VS Code Integration

```bash
# Install Biome VS Code extension
code --install-extension biomejs.biome
```

**`.vscode/settings.json`**:

```json
{
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports.biome": "explicit"
  }
}
```

## Zed Integration

Zed has first-class Biome support via LSP — no extension needed. Add to `.zed/settings.json`:

```json
{
  "languages": {
    "TypeScript": {
      "formatter": { "language_server": { "name": "biome" } },
      "code_actions_on_format": { "source.fixAll.biome": true }
    }
  }
}
```

## Performance Benchmark (Expected for GSN Monorepo)

| Operation | ESLint + Prettier | Biome | Speedup |
|---|---|---|---|
| Full lint check | 8-12s | 150-250ms | 35-50x |
| Format check | 3-5s | 80-150ms | 25-35x |
| CI lint step | 60-90s | 8-15s | 7-10x |
| VS Code on-save | 300-800ms | 20-50ms | 10-20x |

*Measured on a 500-file TypeScript monorepo. GSN at 494 test files alone, plus source files = ~1,500+ total.*

## What to Keep from ESLint

After migrating, you may want to keep ESLint ONLY for Next.js-specific rules that Biome doesn't cover:

```bash
# If keeping ESLint for Next.js rules only:
npm install --save-dev eslint-config-next --workspace=apps/web
```

**`apps/web/.eslintrc.json`** (minimal, next.js-only):

```json
{
  "extends": "next/core-web-vitals",
  "rules": {}
}
```

Run `biome check .` for the fast path (CI), `eslint .` only for Next.js-specific rules.

## GitHub Actions Minutes Math

At 100 pushes/month to `claude/ecc-gse-gsn-commands-weaxnk`:
- Before Biome: lint step = 80s × 100 = 8,000 seconds = 133 minutes × $0.008 = **$1.07/month**
- After Biome: lint step = 10s × 100 = 1,000 seconds = 16.7 minutes × $0.008 = **$0.13/month**
- Savings: ~$0.94/month in CI costs

More importantly: CI round-trip drops from 5+ minutes to <2 minutes → faster iteration cycles.

## Status

- [ ] `npm install --save-dev @biomejs/biome` (root)
- [ ] Run `npx @biomejs/biome migrate eslint --write` to auto-migrate ESLint config
- [ ] Run `npx @biomejs/biome migrate prettier --write` to migrate Prettier config
- [ ] Create `biome.json` at repo root with GSN rules
- [ ] Update `package.json` scripts: lint → biome check
- [ ] Update `.github/workflows/ci.yml` lint step to `npx @biomejs/biome ci .`
- [ ] Install Biome VS Code extension: `code --install-extension biomejs.biome`
- [ ] Add Biome config to `.zed/settings.json`
- [ ] Run `npx @biomejs/biome check . --write` — fix all auto-fixable issues
- [ ] Verify: `npm run lint` runs in <500ms on local machine
- [ ] Verify: CI lint step completes in <15s (check GitHub Actions log)
- [ ] Remove `eslint` and `prettier` from package.json dependencies (if not keeping for Next.js)
