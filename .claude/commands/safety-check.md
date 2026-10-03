---
description: Verify GSE (Galaxy Sports Edge) hard stops are enforced
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*), Bash(npm run guard:*)
---
Verify the GSE hard stops are enforced in code and config:
1) no destructive DB operations possible in normal flows, 2) Stripe key mode matches the environment: live keys only in the production env; no live secret key or webhook secret in git-tracked files or the client bundle (`npm run guard:secrets`); every Stripe route verifies the webhook signature; checkout reads per-interval price IDs from env (STRIPE_*_MONTHLY/ANNUAL_PRICE_ID), 3) no automated production deploys without explicit approval, 4) no public accuracy claims unsupported by graded data.
Report each as enforced / at-risk with file:line evidence.
