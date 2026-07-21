# Strix AI Penetration Testing

> Source: `usestrix/strix` (Python, 42k★)  
> Purpose: Dynamic AI-driven security testing against live GSN instance

## What This Solves

The GSN security audit (static analysis) found:
- CRITICAL: `timingSafeHashEqual` uses plain `===` — timing oracle
- HIGH: Server actions without auth checks (`moderation-actions.ts`, `jarvis/ledgers.ts`)
- HIGH: `dispatchWatchlistAlert` no-op (sold feature not implemented)
- MEDIUM: Self-fetch via `x-forwarded-host` (SSRF risk)

Strix validates these findings dynamically against a running instance and finds additional issues that static analysis misses (race conditions, IDOR, business logic flaws).

## Requirements

- Docker (running)
- `ANTHROPIC_API_KEY` set
- GSN running locally (or staging URL)

## Setup

```bash
# Install
pip install strix-ai
# or Docker:
docker pull usestrix/strix:latest

# Set env
export STRIX_LLM=anthropic
export LLM_API_KEY=$ANTHROPIC_API_KEY
```

## GSN-Specific Scan Commands

```bash
# 1. Basic scan of local codebase
strix --target ./apps/web

# 2. Auth bypass scan (Server Actions)
strix --target http://localhost:3000 \
  --instruction "Test all server actions for authentication bypass. Focus on /api/ routes and Next.js server actions."

# 3. Subscription enforcement scan
strix --target http://localhost:3000 \
  --instruction "Test subscription enforcement. Attempt to access premium picks content as a free-tier user."

# 4. Payment manipulation
strix --target http://localhost:3000 \
  --instruction "Test Stripe checkout flow for race conditions, idempotency failures, and price manipulation."

# 5. IDOR on picks API
strix --target http://localhost:3000/api/picks \
  --instruction "Test IDOR vulnerabilities — can user A access user B's private picks data?"

# 6. Prompt injection
strix --target http://localhost:3000 \
  --instruction "Test AI layer for prompt injection via user-controlled inputs to content generation."
```

## CI/CD Integration

```yaml
# .github/workflows/security.yml
name: Security Scan
on:
  pull_request:
    branches: [main]

jobs:
  strix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Strix
        env:
          STRIX_LLM: anthropic
          LLM_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          docker run --rm \
            -e STRIX_LLM=$STRIX_LLM \
            -e LLM_API_KEY=$LLM_API_KEY \
            usestrix/strix:latest \
            --target ./apps/web \
            --output-format github-sarif > strix-results.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: strix-results.sarif
```

## Known Findings to Verify

| Finding | File | Strix Test |
|---|---|---|
| Timing oracle in hash compare | `lib/api-auth/hash.ts` | `--instruction "Test for timing attacks on API key validation"` |
| Auth bypass on server action | `lib/community/moderation-actions.ts` | `--instruction "Test moderation endpoints for auth bypass"` |
| SSRF via forwarded-host | `app/picks/page.tsx:49-85` | `--instruction "Test for SSRF via Host header manipulation"` |
| Race condition on checkout | `lib/stripe.ts:158` | `--instruction "Test Stripe checkout for race conditions and idempotency"` |

## Status

- [ ] Install Strix locally with Docker
- [ ] Run auth bypass scan against local GSN instance
- [ ] Run subscription enforcement scan
- [ ] Fix all CRITICAL findings first (timing oracle)
- [ ] Add Strix to CI/CD pipeline
