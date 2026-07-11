# 10 — Blocker Ledger (owner-only actions)

Blockers, never questions. Work continued around every one of these.

| # | Owner action | What it unblocks | Where documented |
|---|---|---|---|
| B1 | Run the migration-ledger reconciliation runbook against production (4× `migrate resolve --applied`, delete 4 orphan rows) — or set the break-glass env var for one deploy | Production deploys (currently fail closed at the gate); ships everything merged since the gate landed | `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md` |
| B2 | Record the first governed Jarvis memory write in production | `memory-knowledge-base` DESIGNED → MANUAL; REMEMBER phase → PARTIAL; `wired: true` in cockpit | `docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md` |
| B3 | Make the repository private (or split private strategy repo) | Landing confidential strategy docs in-repo; Fantasy Engine intake (task #13) | Session record; strategy docs delivered privately |
| B4 | Set Stripe LIVE per-interval price IDs in Vercel env | Live checkout at founding rates | `CLAUDE.md` env list |
| B5 | Enable branch protection on `main` | Enforced review path for frontier PRs | GitHub settings (MCP cannot change repo settings) |
| B6 | Review + merge frontier PRs (A: truth+radar; B: foundry+assurance; C: router shadow) | Each subsequent stacked workstream branch | This pack, `01_BASELINE.md` |
| B7 | Decide MLBAM umpire-data authorization-letter path (permission_required) | Umpire product R&D beyond Retrosheet-licensed scope | Private R&D dossier (delivered 2026-07-11) |
| B8 | Approve any future external dependency (adoption dossier + license + scan + sandbox evidence required) | Radar items marked PILOT/PROTOTYPE postures | `06_LICENSE_AND_RIGHTS_MATRIX.md` |

Constraint notes (not owner actions, but environmental):

- Production DB unreachable from this environment — production-activation
  claims are unverifiable here by design; statuses stay conservative.
- GitHub MCP cannot edit repository settings; branch protection and repo
  visibility are dashboard actions.
