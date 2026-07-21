# TruffleHog: Git History Secret Scanner

> Source: `trufflesecurity/trufflehog` (MIT, 18k★)
> Purpose: Scan the ENTIRE git history for committed secrets — not just staged files

## What This Solves

`/push-safe` scans staged files before a push. TruffleHog scans what `/push-safe` can't reach:

- **A secret committed 6 months ago** and later deleted is still in git history — every clone contains it
- **Revert commits don't help** — the secret is in a reachable parent commit
- **Pre-commit hooks are bypassed** by `--no-verify` or by developers who didn't install the hook
- **PR branches** can import secrets from feature branches that were squash-merged

TruffleHog closes the "what's already in history" blind spot that every pre-commit tool misses.

It has 700+ secret detectors and **verifies secrets are still live** against the target API before alerting — near-zero false positives.

## Installation

```bash
# Docker (zero install — recommended)
docker pull trufflesecurity/trufflehog:latest

# Homebrew (Mac)
brew install trufflehog

# Direct binary (Linux)
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin
```

## One-Time Repo Scan

Run this on the Sports repo TODAY before merging more PRs:

```bash
# Full history scan (first run — takes 2-5 min on a large repo)
docker run --rm \
  -v "$PWD:/pwd" \
  trufflesecurity/trufflehog:latest \
  git file:///pwd \
  --only-verified \
  --json

# Scan last 100 commits only (faster, for incremental checks)
docker run --rm \
  -v "$PWD:/pwd" \
  trufflesecurity/trufflehog:latest \
  git file:///pwd \
  --since-commit HEAD~100 \
  --only-verified \
  --json

# Scan a specific branch
docker run --rm \
  -v "$PWD:/pwd" \
  trufflesecurity/trufflehog:latest \
  git file:///pwd \
  --branch claude/ecc-gse-gsn-commands-weaxnk \
  --only-verified \
  --json
```

`--only-verified` is critical: TruffleHog actually calls the API with the found credential. If the API rejects it (revoked, expired), TruffleHog does not alert. This eliminates test credentials, example keys in docs, and other common false positives.

## What It Finds in a Sports Betting Codebase

High-priority detector classes for GSN:

| Secret Type | Detector | Risk |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic | HIGH — unbounded AI spend |
| `STRIPE_SECRET_KEY` / `sk_live_*` | Stripe | CRITICAL — payment access |
| `DATABASE_URL` with credentials | PostgreSQL | CRITICAL — direct DB access |
| `NEXTAUTH_SECRET` | Generic JWT | HIGH — session forgery |
| `ODDS_API_KEY` | Generic API | MEDIUM — usage charges |
| `REDIS_URL` with password | Redis | HIGH — queue access |

## CI Integration (GitHub Actions)

Add to `.github/workflows/ci.yml` — runs on every PR, takes ~30s:

```yaml
  secret-scan:
    name: TruffleHog secret scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # full history required

      - name: TruffleHog OSS
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --only-verified --fail
```

`--fail` makes the action exit 1 if any verified secret is found — blocks the PR from merging.
`base: main` → `head: HEAD` scans only the commits this PR adds, not the full history (fast).

## Pre-Push Hook (Complement to /push-safe)

Add TruffleHog as a second check in the git pre-push hook:

```bash
# .git/hooks/pre-push (or via Husky in package.json)
#!/bin/bash
set -e

echo "[pre-push] Running TruffleHog secret scan..."

if command -v trufflehog &>/dev/null; then
  trufflehog git file://. \
    --since-commit "$(git merge-base HEAD origin/main)" \
    --only-verified \
    --fail \
    --no-update
else
  docker run --rm -v "$(pwd):/pwd" trufflesecurity/trufflehog:latest \
    git file:///pwd \
    --since-commit "$(git merge-base HEAD origin/main)" \
    --only-verified \
    --fail \
    --no-update
fi

echo "[pre-push] Secret scan passed."
```

## Handling Found Secrets

If TruffleHog finds a verified secret:

1. **Immediately revoke the secret** at the provider (Stripe dashboard, Anthropic console, etc.)
2. **Generate a new credential** and update `.env.local` / Vercel env vars
3. **Clean git history** (optional — the old credential is revoked, so low priority):
   ```bash
   # Nuclear option: remove from all history (requires force push)
   git filter-repo --path-glob '*.env*' --invert-paths
   # OR use BFG Repo Cleaner for a specific string
   bfg --replace-text secrets.txt
   ```
4. **Verify** the old credential is dead: TruffleHog `--only-verified` should return clean

## Exclusions (.trufflehog.yaml)

Create at repo root to exclude test fixtures and known-safe patterns:

```yaml
# .trufflehog.yaml
detectors:
  exclude:
    - Stripe  # only if you have Stripe test keys (sk_test_*) in test fixtures
               # TruffleHog --only-verified already handles this; include only if noisy

filters:
  - path: "**/*.test.ts"
    reason: "Test files use mock credentials only"
  - path: "**/fixtures/**"
    reason: "Test fixtures use fake credentials"
```

## Relation to /push-safe

| | `/push-safe` | TruffleHog |
|---|---|---|
| Scope | Staged files only | Full git history |
| Trigger | Pre-push hook | CI + manual scan |
| False positives | Higher (regex) | Low (verified) |
| Speed | Instant | 30s (CI) / 2-5min (full scan) |
| Coverage | New secrets | New + historical |

Use both — they're complementary, not redundant.

## Status

- [ ] Run full history scan on Sports repo: `docker run ... trufflehog:latest git file:///pwd --only-verified`
- [ ] Add TruffleHog step to `.github/workflows/ci.yml`
- [ ] Add pre-push hook that runs TruffleHog on new commits
- [ ] Create `.trufflehog.yaml` exclusion config
- [ ] Confirm scan is clean (or rotate any found credentials immediately)
