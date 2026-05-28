# ACTIVE_AGENT_RELAY

## 2026-05-28 - Evidence Vault MVP ADR proposal session

- Scope: pre-implementation ADR only (no code/schema/runtime changes).
- Deliverable: `docs/adr/0001-evidence-vault-mvp.md`.
- Constraint handling: requested Sports OS source files were not present in this workspace (`docs/brain/evidence-vault.md`, ADR template path, Prisma schema path). ADR records this as an explicit approval blocker.
- Proposed model contract: new `EvidenceItem` additive table with tier/provenance, contradiction state, and raw JSON payload.
- Proposed rollout: one additive migration, no destructive changes, internal cockpit read-first, no public exposure.
- Required owner decision: finalize enum/dedupe policy and confirm source-proposal alignment before implementation.