---
description: Pre-push safety gate — run all checks, verify no secrets, confirm intent before pushing
---

Run the complete safety pipeline before any `git push`. Blocks on any failure.

## Pipeline

### Step 1: Working tree check
```bash
git status
git diff --stat HEAD
```
Confirm: no unexpected files staged, no secrets in new files.

### Step 2: Quality gate
Run `/quality-gate` (all 5 checks: typecheck, lint, guardrails, tests, build).
All must pass. Fix any failures before continuing.

### Step 3: Secret scan
```bash
grep -rE "(sk_live|sk_test|rk_live|STRIPE|ANTHROPIC_API_KEY|DATABASE_URL|NEXTAUTH_SECRET)\s*=\s*['\"]" \
  --include="*.ts" --include="*.tsx" --include="*.json" --include="*.env*" \
  $(git diff --name-only HEAD)
```
If any match → STOP. Do not push. Remove secret and rotate it.

### Step 4: Commit message check
```bash
git log --oneline -5
```
Confirm: commit messages are meaningful, no "WIP", no "fixup", no empty messages.

### Step 5: Branch target check
```bash
git branch --show-current
git remote -v
```
Confirm: pushing to the right branch (not directly to `main` unless explicitly intended).

### Step 6: Review what you're pushing
```bash
git diff origin/$(git branch --show-current)..HEAD --stat
```
Review the full diff. If this is more than expected → pause and investigate.

### Step 7: Push
```bash
git push -u origin $(git branch --show-current)
```

## GSN push rules

- **Never force-push `main`** — shared history, will break deploys
- **Never skip guardrails** — `--no-verify` is prohibited unless CI is completely broken
- **Always create a PR draft** after pushing a feature branch
- **STRIPE_SECRET_KEY** and similar production secrets must never appear in any commit

## Inspired by kunchenguid/no-mistakes

For an automated gate that intercepts `git push` and runs AI-powered review + auto-fixes in a worktree before passing code to origin, install `no-mistakes` locally:
```bash
curl -fsSL https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/install.sh | sh
# Then push via: git push no-mistakes
```
