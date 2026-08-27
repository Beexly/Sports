# Agent Tooling Inventory — Unused Tooling Audit

**Repo:** `C:/Users/Garrett/Sports` (sports-prediction platform)  
**Scope:** `.agents/skills/` and `.claude/commands/` directories  
**Method:** `ls -la`, `du -sb`/`stat`, and `git grep -Fl <item-name>` excluding each item's own directory to find *outside* references.

---

## `.agents/skills/`

| Name | Size (bytes) | References (outside directory) |
|------|-------------:|--------------------------------|
| higgsfield-brandkit | 220,208 | `skills-lock.json` |
| higgsfield-generate | 79,160 | `skills-lock.json` |
| higgsfield-marketplace-cards | 3,754 | `skills-lock.json` |
| higgsfield-product-photoshoot | 9,438 | `skills-lock.json` |
| higgsfield-soul-id | 4,636 | `skills-lock.json` |
| higgsfield-video-explainer | 17,345 | `skills-lock.json` |
| higgsfield-websites | 715,525 | `skills-lock.json` |
| higgsfield-youtube-thumbnail | 27,660 | `skills-lock.json` |

**Subtotal:** 1,077,726 bytes — 0 items with zero outside references  
(*Note:* every skill's only reference is the auto-generated `skills-lock.json` lockfile at the repo root — no code, config, or documentation file imports or invokes these skills.)

---

## `.claude/commands/`

| Name | Size (bytes) | References (outside directory) |
|------|-------------:|--------------------------------|
| accuracy.md | 339 | — (none) |
| audit-auth.md | 324 | `docs/ops/hermes/CONTINUOUS.md`, `handoff/LEDGER.md` |
| audit-db.md | 363 | — (none) |
| audit-deps.md | 263 | — (none) |
| audit-odds.md | 298 | `docs/ops/hermes/CONTINUOUS.md`, `handoff/LEDGER.md` |
| audit-picks.md | 411 | `docs/ops/hermes/CONTINUOUS.md`, `handoff/LEDGER.md` |
| audit-secrets.md | 237 | — (none) |
| audit-stripe.md | 347 | `docs/ops/hermes/CONTINUOUS.md`, `handoff/LEDGER.md` |
| audit-types.md | 289 | — (none) |
| audit.md | 402 | `apps/web/__tests__/morning-handoff-cross-links.test.ts`, `apps/web/__tests__/session-deliverables-shape.test.ts`, `docs/gse/owner-approval-queue.md`, `docs/gse/pr2-waitlist-implementation-readiness.md`, `docs/ops/AGENT_LEDGER.md`, `docs/ops/OVERNIGHT-ORCHESTRATOR-2026-08-19.md`, `docs/ops/hermes/BUILD-QUEUE-2026-08-20B.md`, `docs/ops/hermes/CONTINUOUS.md`, `handoff/LEDGER.md`, `reports/launch-night/README.md`, `reports/launch-night/final-report.md`, `reports/launch-night/morning-handoff.md`, `reports/launch-night/overnight-changelog.md`, `scripts/statking_generate_product_depth.py` |
| calibrate.md | 386 | — (none) |
| check-claims.md | 319 | `docs/ops/hermes/CONTINUOUS.md`, `handoff/COMPLIANCE_COPY.md`, `handoff/LEDGER.md` |
| color-roles.md | 566 | — (none) |
| contrast.md | 556 | `docs/ops/hermes/CONTINUOUS.md`, `handoff/LEDGER.md` |
| debug.md | 318 | — (none) |
| design-tokens.md | 406 | — (none) |
| focus-anchor.md | 452 | — (none) |
| grade-audit.md | 316 | — (none) |
| lint.md | 271 | — (none) |
| motion.md | 420 | `scripts/guardrails/api-v1-boundary.mjs` |
| perf.md | 277 | `docs/ops/hermes/CONTINUOUS.md`, `handoff/LEDGER.md` |
| polish-view.md | 397 | — (none) |
| polish.md | 310 | — (none) |
| preflight.md | 319 | — (none) |
| repro.md | 300 | — (none) |
| responsive.md | 363 | `docs/ops/hermes/CONTINUOUS.md`, `handoff/LEDGER.md` |
| safety-check.md | 386 | `docs/ops/hermes/CONTINUOUS.md`, `handoff/LEDGER.md` |
| states.md | 477 | `docs/ops/hermes/CONTINUOUS.md`, `handoff/LEDGER.md` |
| test-gaps.md | 296 | — (none) |
| trace.md | 314 | — (none) |
| tune-prompts.md | 323 | — (none) |
| tune-thresholds.md | 326 | — (none) |
| ui-audit.md | 475 | `docs/ops/hermes/CONTINUOUS.md`, `handoff/LEDGER.md` |
| visual-qa.md | 385 | `docs/ops/hermes/CONTINUOUS.md`, `handoff/LEDGER.md` |

**Subtotal:** 12,231 bytes — 20 items with zero outside references

---

## Summary

**Total:** 1,089,957 bytes across 42 items (8 skills + 34 commands). **20 items** have zero outside references — all from `.claude/commands/`, none from `.agents/skills/`.

---

## Items Plainly Unrelated to a Sports-Prediction Platform

All eight skills under `.agents/skills/` are `higgsfield-*` directories belonging to the **Higgsfield AI** ecosystem (brandkit, image/video generation, marketplace cards, product photoshoot, soul-ID, websites, YouTube thumbnails) — none touch sports prediction, odds modeling, or picks generation. Among the commands, the front-end/UI cluster (`color-roles.md`, `contrast.md`, `design-tokens.md`, `motion.md`, `polish.md`, `polish-view.md`, `visual-qa.md`, `grade-audit.md`) concerns visual design and accessibility auditing of a web UI, not sports-prediction logic. Conversely, the `audit-odds.md`, `audit-picks.md`, `audit-stripe.md`, `accuracy.md`, `calibrate.md`, `check-claims.md`, `perf.md`, `tune-prompts.md`, `tune-thresholds.md`, `safety-check.md`, `test-gaps.md`, and `trace.md` commands appear plausibly aligned with a prediction platform's model pipeline, infrastructure, and ML operations.
