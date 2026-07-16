# Agent Foundry Policy

The Foundry is GSE's skill supply chain: every executable skill is a governed
package with identity, permissions, provenance, risk, evals, license evidence,
and lifecycle. `apps/web/lib/agent-foundry/` is the executable version of this
policy; `apps/web/__tests__/agent-foundry.test.ts` pins it.

## What the Foundry is not

- It is **not a runner.** Nothing in it executes a skill. A sandboxed,
  owner-gated runner is separate future work (see the frontier artifact pack).
- It is **not an approver.** The scanner produces findings; lifecycle
  promotion to `APPROVED` happens only through an owner-reviewed code change.
- It is **not a second Agent Council.** Seat identity and authority derive
  from `agent-council.ts`; a manifest that disagrees with its seat is wrong
  by definition (`council-authority` scan rule).

## Manifest contract

Identity (id, semver, sha256 content hash sealed by the registry), owning
council seat, purpose, risk, allowed input data classes, allowed output
artifacts, explicit tool list (never `*`), network policy (`none` or a
non-empty allowlist), sandbox requirement, model route, budget and runtime
ceilings, prohibited actions (must forbid external action), human approval
requirement, eval suites, license evidence, audit flag, lifecycle, and a
repo-path proof source.

## Baseline scanner (deterministic, never auto-approves)

Fifteen rule families: identity completeness, hash integrity, wildcard
authority, shell-without-sandbox, production credential references, external
action verbs, audit disabled, missing prohibitions, missing evals, unknown
license, network without allowlist, sensitive data with a model route,
council authority mismatch, hidden-instruction patterns, proof-source
existence, duplicate ids. `BLOCK` findings pin a manifest below approval.

Coverage is reported honestly: every report lists the rules that ran AND the
external scanners that did not (`externalScannersAbsent`). A clean baseline
is a floor, not a certification. External scanning (SARIF import, dependency
vulnerability scan) plugs in through `ExternalScannerAdapter` after owner
approval — never silently.

## Lifecycle

`DRAFT → SCANNED → OWNER_REVIEW → APPROVED → RETIRED`

- Seeds ship as `DRAFT`.
- `APPROVED` cannot be reached programmatically. There is no write path.
- Even `APPROVED` + `humanApprovalRequired: true` cannot execute
  (`canExecute` returns false) — per-run approval survives approval of the
  package itself.

## Surfaces

- `/cockpit/agent-foundry` — read-only, admin-only, behind
  `AGENT_FOUNDRY_ENABLED` (default off).
- `GET /api/cockpit/agent-foundry` — same gates; payload includes per-manifest
  scan reports and the explicit reason execution is blocked.

## Seed manifests (first-party, non-executing)

| Id | Seat | Purpose |
|---|---|---|
| `repo-truth-auditor` | quality-officer (GAUGE) | Code-vs-docs contradiction ledgers, read-only |
| `resource-radar-evaluator` | tal (TAL) | Radar snapshot evaluation + adoption dossiers |
| `independent-diff-reviewer` | ai-ops-officer (METER) | Adversarial read-only diff review |

All three: no network, no external action, human approval required, DRAFT.
