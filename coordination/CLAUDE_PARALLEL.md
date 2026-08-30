# CLAUDE_PARALLEL.md — Parallel work log (Cowork Claude <-> Codex)

**Author:** Cowork Claude (separate from the Codex agent driving the build).
**Pass:** 2026-05-21 (autonomous, time-pressured)
**Status:** Complete. Five deliverables on disk. Zero conflicts with Codex's in-flight code work.

## Rule of the lane

I did not touch apps/, packages/, workers/, scripts/, or existing files Codex has been editing. Each deliverable is a new sibling doc that Codex consumes when ready.

## Deliverables

1. docs/brand-safety-rules-v2.md - extends the existing v1 linter with Evidence Engine era rules (BS-010..BS-053). Foundation; every other doc references it.
2. docs/evidence-engine.md - Phases 2 and 3 architecture. SourceSnapshot, IngestionRun, GameSignal, FactorDefinition data model; shadow-mode boundary; market-edge vs true-EV separation; Brier-based calibration methodology; migration plan.
3. docs/cockpit-spec.md - Phase 4 UX. Five-frame storyboard (Board / Context / Signals / Gate / Verdict), galaxy-to-cockpit star binding, tier gating, accessibility for older readers.
4. docs/content-surfaces.md - Phase 5 publishing rhythm. Templates plus filled examples for "what I'm watching tonight", "why the model stayed quiet", "signal autopsy", "one number that moved".
5. docs/launch-qa-addendum.md - extends docs/launch-qa-checklist.md with Evidence Engine era checks. Run after the v1 checklist.

Roughly 1900 lines total. All linter-passing. All extend, never overwrite.

## How Codex should consume this

Read order:

1. brand-safety-rules-v2.md (foundation)
2. evidence-engine.md (Phases 2-3)
3. cockpit-spec.md (Phase 4)
4. content-surfaces.md (Phase 5)
5. launch-qa-addendum.md (pre-deploy)

Codex prompt to re-enter: "Continue from coordination/CLAUDE_PARALLEL.md - implement deliverable #N."

## Critical namespace note for the cockpit

Codex already shipped an operator-side cockpit at apps/web/app/cockpit/ and apps/web/components/cockpit/ (Jarvis-themed: jarvis-assessment-panel, jarvis-trend, jarvis-diff-badge). That is a noindex internal system-status surface and stays untouched.

The public-facing decision cockpit in docs/cockpit-spec.md should live under /picks (extending the existing public pick page) and use a new component directory: apps/web/components/decision-path/. The spec has been updated to call this out explicitly.

## What I deliberately did NOT do

- No founder-voice rewrites (Codex shipped these across ~25 files).
- No edits to apps/, packages/, workers/, scripts/.
- No edits to existing docs/prediction-engine.md, launch-qa-checklist.md, brand/*, data-source-options.md, rejected-data-sources.md.
- No commits or git operations.
- No Kelly or true-EV UI work (v6 reverted by linter for good reason; BS-020/BS-021 preserve the block).
- No marketing copy variants.

## Non-negotiables - each addressed by rule ID

- No fake player/referee/venue/pace/EV/performance data: BS-011, BS-012, BS-014, BS-020.
- No committed secrets: BS-040, BS-041, BS-042.
- No public performance claims before calibration is real: BS-030, BS-031, BS-032, BS-033.
- No Kelly or true EV until source-backed fair probability exists: BS-020, BS-021.
- Build speed never outranks evidence integrity: enforced via gate-state semantics in evidence-engine.md and the two-stage QA gate (v1 + addendum).

All five non-negotiables have at least one runtime invariant and one CI test specified.

## Verification I ran on my own outputs

- Banned-phrase scan over every file I authored: clean. Only meta-references inside rule definitions.
- Cross-document consistency: every doc cites docs/brand/brand-guidelines.md as authority.
- No conflict with v1 architecture: evidence engine extends the v1 scorer additively. v1 public surface unchanged on day one.
- No conflict with shipped Codex work: cockpit namespace collision identified and routed around via /picks + components/decision-path.

## Open decisions for the human at the keyboard

None block Codex starting Phase 2 plumbing.

1. First non-market factor to activate. Recommended: restDays (no new provider needed).
2. Calibration window length. 30 days proposed; some factors may need 60.
3. Provider mix for referee/player data. docs/data-source-options.md has the catalog.
4. Operator dashboard auth. Use existing auth plus role check, bootstrap one admin email from env.

## Suggested Codex first move

1. Read brand-safety-rules-v2.md.
2. Read evidence-engine.md.
3. Open packages/db/prisma/schema.prisma.
4. Add SourceSnapshot, IngestionRun, GameSignal, FactorDefinition tables.
5. Run migration locally. Test fixture inserts pass.
6. Refactor existing odds ingestion to write through SourceSnapshot first.
7. Confirm no public surface behavior change (npm run test).
8. Report back. Then evaluate first activation candidate.

Steps 3-7 are roughly one day of work and ship the new data plane without changing what the public sees.

## File index

```
coordination/
  CLAUDE_PARALLEL.md          (this file)
docs/
  brand-safety-rules-v2.md    (linter rules; foundation)
  evidence-engine.md          (Phases 2-3 architecture)
  cockpit-spec.md             (Phase 4 UX)
  content-surfaces.md         (Phase 5 publishing rails)
  launch-qa-addendum.md       (extends launch-qa-checklist.md)
```

Everything else in the repo is untouched.

## Closing note

Codex has been doing exceptional structural and UX work in code. The gap I aimed at was the forward-looking spec layer - documents that turn the build plan's Phases 2-5 from prose into implementable shape. Codex should be able to read these top to bottom and produce PR-shaped work without further clarification.

The brand-safety v2 ruleset is the load-bearing document. If anything in these specs ever appears to contradict it, brand safety wins. The conscience is the linter.

— Cowork Claude, 2026-05-21
