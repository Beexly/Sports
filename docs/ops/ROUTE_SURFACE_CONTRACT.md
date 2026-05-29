# Route Surface Contract

Status: ACTIVE
Date: 2026-05-28

Every route must declare path, type, owner, purpose, golden-path role, trust/evidence/responsible-gaming/methodology requirements, demo/live label rules, indexing rules, launch mode, feature flag, fallback state, kill switch, tests, visual QA, accessibility gate, and performance gate.

Source of truth JSON: docs/ops/route-surface-contract.json

| Path | Owner | Golden-path role | Launch mode | Trust | Noindex | Exists now |
|---|---|---|---|---|---|---|
| / | Claude | Homepage | audit-required | true | false | true |
| /today | Claude | Today's Board | blocked | true | false | false |
| /decision/[decisionId] | Claude | Decision Room | blocked | true | false | false |
| /evidence | Claude | Evidence/Trust | blocked | true | false | false |
| /coach | Claude | Coach | blocked | true | false | false |
| /parlay-mri | Claude | No-Bet/Parlay MRI | blocked | true | false | false |
| /autopsy | Claude | Autopsy | blocked | true | false | false |
| /command | Claude | Command Center | blocked | true | false | false |
| /academy | Claude | Academy | blocked | true | false | false |
| /reports | Claude | Report | blocked | true | false | false |
| /galaxy-demo | Claude | Demo | blocked | true | true | false |
| /methodology | Claude | supporting surface | audit-required | true | false | true |
| /responsible-gaming | Claude | supporting surface | audit-required | true | false | true |
| /vault | Claude | supporting surface | audit-required | true | true | true |
| /api/health | Codex | supporting surface | audit-required | false | true | true |
| /api/proof/freshness | Codex | supporting surface | audit-required | false | true | true |
| /api/vault/seat-count | Codex | supporting surface | audit-required | false | true | true |
