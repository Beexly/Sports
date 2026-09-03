---
description: Stripe integration safety audit
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*), Bash(npm run guard:*), Bash(git ls-files*)
---
Audit the Stripe integration for production safety. Confirm: Stripe key mode matches the environment (live keys only in the production env), every Stripe route verifies the webhook signature, no live secret key or webhook secret in git-tracked files or the client bundle (`npm run guard:secrets`), checkout reads per-interval price IDs from env (STRIPE_*_MONTHLY/ANNUAL_PRICE_ID), and idempotency keys on create/charge calls.
Report pass/fail per check with file:line.
