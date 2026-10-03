# ADR 002 — Jarvis as a Deterministic Synthesizer

**Date:** 2026-05-18
**Status:** Accepted

## Context

The cockpit needed a single answer to "is the platform launch-ready?"
that an operator could trust at a glance. Existing dashboards
(`/admin/dashboard`) showed raw operational counts but did not answer
the *question*. Ad-hoc operator interpretation of those counts was
inconsistent and slow.

We also wanted the answer to be deterministic and auditable: same
inputs → same output, every time. That rules out an LLM call. It also
rules out anything that drifts with wall-clock time (e.g. random
sampling, `Math.random()` thresholds).

## Decision

`synthesizeJarvis(input)` is a pure, deterministic function over a
typed `JarvisInput` shape. It takes:

- The readiness-gates struct
- The `PublicPerformancePolicy` (from ADR 001)
- Ingestion summary (last attempt, last success, recent failures)
- Settlement summary (last settledAt, settled-in-24h, pending count)
- Historical pick counts (canonical/bootstrap/W/L/P/V/published/featured)
- Signal coverage percentages
- A *hand-maintained* phase-layer manifest
- A list of missing external-config env vars

and returns a `JarvisAssessment` carrying:

- `launchStatus`: 6-valued enum
- `confidenceLevel`: LOW / MEDIUM / HIGH
- 11 sectional health readouts (GREEN / AMBER / RED / UNKNOWN)
- `readinessGateSummary`
- 4 warning lists: safety, missing-phase, external-config, recommended actions
- `phaseMatrix` covering phases 1–9
- `assessedAt`, `version`

The synthesizer is tested for:

- Determinism (same input twice → identical JSON output).
- Purity (no I/O, no fs, no fetch, no `Date.now()`, no `Math.random()`,
  no top-level await — enforced by `jarvis-purity.test.ts`).
- Status ordering rules (LAUNCH_READY requires zero safety warnings,
  HIGH confidence requires LAUNCH_READY, etc.).
- Per-launch-status fixture cases.

## Why a hand-maintained layer manifest?

The synthesizer needs to know which phases are implemented. We
considered three options:

1. **Runtime `fs.existsSync` of representative paths.** Rejected:
   fragile across deploy environments, breaks in serverless runtimes
   that may not expose the filesystem the same way, and ties the
   synthesizer to a specific build layout.
2. **Read a `package.json` manifest.** Rejected: nothing forces a
   contributor to update the manifest when a phase ships.
3. **A `const LAYERS` in `jarvis-data.ts`.** Accepted. It's a single
   place, reviewed in the PR that ships the phase. Reviewers see the
   manifest change next to the phase change.

## Why never auto-recommend gate flips?

`PERFORMANCE_STATS_ENABLED=true` is the only operator action that
changes customer-visible behavior. The synthesizer never tells the
operator to "flip the gate now"; it tells them which conditions still
block the flip. The decision stays with the human.

Same for auto-publishing: the synthesizer never recommends "publish
this draft" or "promote this pick." Both are explicit operator
actions reviewed via the cockpit. The Jarvis test
(`jarvis.test.ts`) asserts no `recommendedNextActions` entry contains
`auto-bet` / `auto-publish`.

## Why a "version" stamp?

Auditing assessments after the fact. If we ever change the synthesizer
rules in a meaningful way (e.g. tighten the ingestion-RED threshold),
the version stamp lets a saved assessment be interpreted against the
synthesizer version that produced it. Bump `JARVIS_VERSION` when the
rules change.

## Why is there a Jarvis-history ring buffer?

To support trend display ("ingestion was AMBER 1h ago, GREEN now") and
quick rollback diagnostics. The buffer is process-local, capacity-bound,
and consumed via `sharedJarvisHistory()`. Persistence beyond a single
process is out of scope; pair with `serializeJarvisAudit` + a log file
when long-term audit matters.

## Consequences

**Positive:**
- One synthesizer, one truth. Tests cover every rule. Operators get a
  consistent picture across the cockpit, the JSON API, and the audit log.
- Determinism + purity → reliable in CI, reliable in stub mode, easy to
  reason about.
- Composable: the audit serializer, the history buffer, the JSON
  endpoint, and the trend component all consume the same shape.

**Negative:**
- Each rule change requires bumping `JARVIS_VERSION` and updating tests
  + the changelog. This is by design — Jarvis is the canary, and we
  don't want silent rule drift.
- The phase-layer manifest is a maintenance burden when phases change.
  Mitigated by the manifest's single location and the obvious test
  failure when a phase appears in the matrix as `unknown`.
