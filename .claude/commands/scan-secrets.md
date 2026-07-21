# /scan-secrets — TruffleHog Git History Secret Scan

Scan the entire Sports repo git history for committed secrets using TruffleHog.
Use this before any major merge, after onboarding a new contributor, or on a schedule.

## Quick Scan (new commits since main)

```bash
# Scan only commits not yet on main — fast, for pre-merge checks
docker run --rm \
  -v "$(pwd):/pwd" \
  trufflesecurity/trufflehog:latest \
  git file:///pwd \
  --since-commit "$(git merge-base HEAD origin/main)" \
  --only-verified \
  --json
```

## Full History Scan (first run / periodic audit)

```bash
# Full scan — takes 2-5 minutes, run quarterly
docker run --rm \
  -v "$(pwd):/pwd" \
  trufflesecurity/trufflehog:latest \
  git file:///pwd \
  --only-verified \
  --json | jq '.'
```

## Targeted Branch Scan

```bash
# Scan a specific feature branch
BRANCH=$(git branch --show-current)
docker run --rm \
  -v "$(pwd):/pwd" \
  trufflesecurity/trufflehog:latest \
  git file:///pwd \
  --branch "$BRANCH" \
  --only-verified \
  --json | jq '.'
```

## Interpreting Results

- **Empty output + exit 0**: clean — no verified live secrets found
- **JSON output with `DetectorName`**: a LIVE credential was found — act immediately:
  1. Identify the secret from `Raw` field in the JSON
  2. Revoke it at the provider (Stripe, Anthropic, etc.)
  3. Generate a new credential and update Vercel env vars
  4. The old commit containing the secret is now harmless (credential dead)

## What TruffleHog Finds in This Repo

High-priority detectors for GSN:
- `ANTHROPIC_API_KEY` — unbounded AI spend if leaked
- `STRIPE_SECRET_KEY` (sk_live_*) — payment access
- `DATABASE_URL` with credentials — direct DB access
- `NEXTAUTH_SECRET` — session forgery
- `REDIS_URL` with password — queue access

`--only-verified` = TruffleHog actually tests each found secret against its API.
Credentials that have been rotated (the old key is dead) do NOT alert.

## Prerequisites

```bash
# Docker must be running
docker --version

# OR install binary directly (faster after first run):
# Mac: brew install trufflehog
# Linux: curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin
```

See docs/ai/integrations/TRUFFLEHOG-SECRETS.md for CI integration.
