# Issue 08: Adversarial red-team review

## Context
The repo is reviewed from hostile legal, security, ML, product, investor, maintainer, and user-harm perspectives.

## Why It Matters
High-risk claims should fail in docs before failing in public.

## Acceptance Criteria
- Reviewer roles are listed.
- Attacks, evidence, missing evidence, and fixes are explicit.
- Pre-merge kill switches exist.

## Files Likely Touched
- `docs/fable/red-team/*`

## Test Plan
- `npm run fable:evidence`

## Risk
Review can become theater if not tied to commands.

## Owner Decision Needed
Priority of fixes before public demo.
