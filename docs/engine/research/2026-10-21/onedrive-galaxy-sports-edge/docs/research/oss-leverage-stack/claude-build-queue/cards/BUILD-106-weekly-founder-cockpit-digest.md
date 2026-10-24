# BUILD-106: weekly founder cockpit digest

## Repo(s)

AnythingLLM

## Which Open-Source Repo(s) This Uses Or Studies

anythingllm

## Goal

Create a GSE-specific, owner-reviewable implementation packet for weekly founder cockpit digest without touching production systems.

## Why It Matters

This improves decision quality, revenue, speed, support, retention, trust, or cost savings by converting open-source leverage into a bounded GSE workflow.

## GSE / GSN Fit

Fits the GSE operating system as part of I. Cross-Stack Automations. Start in docs or a sandbox and only move into app code after explicit approval.

## User-Facing Value

Customers eventually get clearer support, better onboarding, better alerts, better education, or safer product workflows. No customer-facing release is included in this card unless a later approval says so.

## Founder/Internal Value

Founder gets lower manual coordination, reusable SOPs, a clearer build queue, and a repeatable way to turn OSS leverage into product and ops improvements.

## SaaS Replaced or Reduced

Potentially reduces paid SaaS in the category represented by AnythingLLM. Exact competitor pricing must be refreshed before claiming numeric savings.

## Legal / License Boundary

Allowed: study docs, use APIs, self-host in an isolated lab, and write original GSE integration code. Disallowed: copying source code or UI into GSE, white-labeling restricted projects, or modifying AGPL/MPL/custom-license code without legal approval. License risk: LOW.

## Security Boundary

No secrets, production data, customer PII, proprietary method docs, payment data, or production source keys. Security risk: HIGH.

## Repo Context

Likely GSE files/directories: `docs/research/oss-leverage-stack/`, `docs/ops/`, `reports/codex/`, and only after approval `apps/web/app/api/` or `apps/web/lib/`. Avoid `.env*`, Stripe/billing code, launch gates, production deploy config, and unrelated app files.

## Integration Mode

webhook integration

## Data Model

Suggested entities: `OssTool`, `BuildCard`, `RiskDecision`, `IntegrationEvent`, `CustomerSegment`, `SourceArtifact`, and `ApprovalGate` as needed.

## Implementation Plan

1. Verify the active GSE clone and current branch before edits.
2. Read this research packet and the repo deep dive for anythingllm.
3. Produce a docs-first spec or mocked sandbox artifact for weekly founder cockpit digest.
4. Add explicit license, security, rollback, and owner-approval notes.
5. Run only local validation that does not require secrets or production services.
6. Report files changed and blocked approvals.

## Testing Plan

- Markdown/link lint if available.
- JSON schema validation if a JSON artifact is created.
- Unit tests only if app code is explicitly approved and touched.
- No Docker, production API, or real customer data in this card.

## Acceptance Criteria

- The build is scoped to one clear GSE workflow.
- License and security boundaries are present.
- No secrets or production data are used.
- Output is understandable by Claude Code without extra owner context.
- Rollback is documented.

## Rollback Plan

Delete the card-specific docs/spec files or revert the isolated branch changes. No production rollback should be needed because this card starts docs-first.

## Estimated Difficulty

M

## Priority

P2

## Dependencies

BUILD-001, BUILD-003

## Claude Code Prompt

```text
You are Claude Code working in the Galaxy Sports Edge / GSN repo. Execute only BUILD-106: weekly founder cockpit digest. Start by verifying the active repo and branch. Do not touch production secrets, launch gates, billing, or deploy config. Use the OSS leverage research files under docs/research/oss-leverage-stack, especially the deep dives for anythingllm. Produce the smallest docs-first or mocked-sandbox artifact that satisfies the acceptance criteria. Do not install or run untrusted OSS code. Report changed files, tests run, blocked approvals, and rollback instructions.
```
