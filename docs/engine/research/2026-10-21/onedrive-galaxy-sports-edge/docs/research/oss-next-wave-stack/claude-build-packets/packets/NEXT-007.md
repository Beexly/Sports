# NEXT-007: Langfuse trace schema for every AI call

## Repo(s)

Langfuse

## Category

AI Ops

## Goal

Implement or design the langfuse trace schema for every ai call capability for GSE / GSN without touching production data first.

## Why It Matters

This increases GSE's ability to operate autonomously, learn from users, improve conversion, reduce SaaS cost, and make product/marketing decisions from evidence.

## GSE / GSN Fit

Fits the website and operating-system layer as a ai ops upgrade.

## User-Facing Value

Customers get a clearer, faster, more personalized, more trustworthy product experience.

## Founder/Internal Value

The team gets measurable workflows, fewer manual steps, better observability, and clearer build priorities.

## SaaS Replaced Or Reduced

See repo deep dive files for the specific SaaS category.

## Legal / License Boundary

Langfuse: MIT core outside ee/web/src/ee/worker/src/ee; enterprise modules require commercial license

Do not copy source code from these repos into GSE. Prefer API integration, SDK use under package license, or pattern/spec adoption unless legal approval exists.

## Security Boundary

Use fake data first. Do not paste secrets. Do not connect production customer data. Do not emit live notifications, billing events, or public AI output without owner approval.

## Repo Context

Likely real app clone files: package manifest, app routes, API routes, analytics layer, event taxonomy docs, tests, environment examples. Avoid production env files, billing code, launch gates, and unrelated schema changes unless this packet explicitly requires them.

## Integration Mode

SDK instrumentation

## Implementation Plan

1. Verify the real GSE repo root, branch, dirty state, package manager, and app framework.
2. Read existing analytics, jobs, API, auth, and env patterns.
3. Add a narrow design/spec document first if no local pattern exists.
4. Implement with fake data or disabled-by-default flags.
5. Add tests or validation checks around event shape, privacy gates, failure paths, and rollback.
6. Document required production environment variables by name only, never values.

## Testing Plan

- Unit or integration test for event/job/API behavior where applicable.
- Typecheck/lint/build command from the real repo.
- No secret-pattern matches in changed files.
- Verify feature stays disabled or fake-data-only until approved.

## Acceptance Criteria

- Clear implementation or spec exists.
- No secrets committed.
- No production data touched.
- Rollback path documented.
- Owner approval gates are explicit.

## Rollback Plan

Remove the feature flag, integration config, route/component, and docs for this packet only. Leave unrelated files untouched.

## Estimated Difficulty

M

## Priority

P0

## Claude Code Prompt

You are Claude Code working in the real Galaxy Sports Edge / GSE shipping clone. Execute only NEXT-007: Langfuse trace schema for every AI call. First verify repo root, branch, dirty state, package manager, scripts, and existing patterns. Do not use production data or secrets. Do not deploy. Do not copy source code from external repos. Implement the smallest safe version using fake data or a disabled-by-default flag, add tests/validation, document required env var names only, run the repo's relevant checks, and report exact files changed plus any owner approvals needed.
