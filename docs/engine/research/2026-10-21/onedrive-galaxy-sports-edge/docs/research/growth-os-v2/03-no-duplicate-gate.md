# No-Duplicate Gate

As of: 2026-06-09

## Gate Inputs

- `existing-build-ledger.jsonl`
- `existing-build-ledger.csv`
- `existing-doc-ledger.csv`
- `existing-surface-ledger.csv`
- Prior OSS leverage queue with 120 cards
- Prior next-wave stack with 60 packets

## Classifications

- DUPLICATE: same goal, same user value, same surface, same implementation path. Action: do not create.
- VARIANT: same goal but different audience, tier, or surface. Action: merge if possible; otherwise create child build.
- EXTENSION: existing build exists but lacks one important layer. Action: create child build with parent_id.
- DEPENDENCY: build must happen before or after an existing build. Action: create dependency link.
- REPLACEMENT: new idea is better than an old idea. Action: create supersedes relationship and explain why.
- CONFLICT: new idea contradicts product, legal, responsible-gambling, or brand direction. Action: founder review.
- NET_NEW: distinct user value, business value, surface, or data model. Action: create new build card.
- UNCERTAIN_REQUIRES_REVIEW: exclude from main queue and add to `uncertain-builds-for-review.jsonl`.

## Duplicate Pressure Found

- Support, CRM, newsletter, lifecycle, AI/RAG, API testing, design workflow, video workflow, PostHog analytics, Payload CMS, Dub attribution, Formbricks feedback, Trigger.dev workers, Unkey API access, Novu notifications, and SigNoz observability already have build concepts.
- New cards should emphasize GSE-specific sports intelligence, responsible-play-safe promotions, no-bet/risk logic, track-record trust, GSE Rating/Product Lab education, pricing psychology, unit economics, and non-duplicative operating cadence.

## Enforcement

Every new build must include duplicate_check_status, matched_existing_ids, relation_to_existing, reason_not_duplicate, parent_id, supersedes_id, dependency_ids, and merge_notes.
