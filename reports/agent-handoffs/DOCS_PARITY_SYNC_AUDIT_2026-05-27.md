# DOCS Parity Sync Audit - 2026-05-27

## Scope
- Source workspace: C:\Users\Garrett\Documents\Claude\Projects\AI Sports
- Target workspace: C:\Users\Garrett\Sports
- Branch: main
- Mode: custody-control, docs/report sync only

## Baseline Git Status
A  .gitattributes
 M docs/ops/issue-queue.md
 M scripts/smoke-prod.ps1
 M scripts/smoke-prod.sh
?? BLOCKED_NEED_G.md
?? COORDINATION.md
?? STATE.md
?? dashboard.html
?? findings/
?? metrics/


## Baseline Protected File
- Path: docs/ops/decision-log.md
- Hash (SHA256): C05A8E65745BF4E05C172F6CA09F3A02D1991DE8C21CE86CB1051A9E54A3929E
- Size: 46062

## Pre-Sync File Count (Scratch Allowed Zones)
- Total candidate files inventoried: 95
- Copy candidates: 0
- Skip (already matched): 92
- Preserve-primary: 1
- Investigate: 2

## Post-Sync File Count
- Files copied this run: 0
- Files skipped this run: 92
- Files preserved this run: 1

## Files Copied
- None. All allowed doctrine-wave docs already present or classified non-copy.

## Files Skipped
DESIGN.md
docs/agents/agent-action-policy.md
docs/agents/autogpt-style-task-loop-boundaries.md
docs/audit/agentic-owasp-controls.md
docs/audit/codemod-safety-policy.md
docs/audit/final-wave-source-risk-register.md
docs/audit/media-automation-risk-policy.md
docs/audit/piracy-malware-do-not-use-register.md
docs/audit/prompt-leak-and-sensitive-source-policy.md
docs/brain/ask-the-brain.md
docs/brain/calibration-feedback-loop.md
docs/brain/claim-governance.md
docs/brain/entity-graph.md
docs/brain/evidence-vault.md
docs/brain/fantasy-war-room.md
docs/brain/intelligence-routing.md
docs/brain/market-gravity.md
docs/brain/operator-cockpit-governance.md
docs/brain/picks-intelligence.md
docs/brain/public-trust-layer.md
docs/brain/research-lab.md
docs/brain/signal-ledger.md
docs/brain/source-acquisition-mesh.md
docs/brain/source-hierarchy.md
docs/brain/weak-signal-engine.md
docs/data/source-provider-module-taxonomy.md
docs/data/sports-api-provider-policy.md
docs/design/component-system-maturity.md
docs/design/design-md-spec.md
docs/design/design-to-react-review.md
docs/design/final-wave-design-pattern-register.md
docs/design/media-studio-doctrine.md
docs/design/motion-and-transition-doctrine.md
docs/design/obs-inspired-scene-system.md
docs/design/stitch-agent-workflow.md
docs/design/visual-language-palette-lab.md
docs/media/audio-voice-policy.md
docs/media/content-provenance-and-review.md
docs/media/media-studio-workflow.md
docs/media/video-brief-pipeline.md
docs/media/youtube-automation-boundaries.md
docs/models/answer-eval-benchmark-lab.md
docs/models/fine-tuning-governance.md
docs/models/local-model-lane.md
docs/models/model-benchmark-lab.md
docs/models/prompt-leak-and-auth-sensitive-policy.md
docs/models/ragflow-governance.md
docs/ops/_manifest_allowed_copy_plan_2026-05-27.csv
docs/ops/_pre_sync_inventory_2026-05-27.csv
docs/ops/CODEX_DOCS_PARITY_SYNC_BRIEF.md
docs/ops/evals/discord-bot-publication-embed-happy.md
docs/ops/evals/discord-bot-settlement-loss-embed.md
docs/ops/evals/discord-bot-slash-pick-today-happy.md
docs/ops/evals/discord-bot-slash-unauthenticated-projection.md
docs/ops/evals/model-court-betting-certainty-refusal.md
docs/ops/evals/model-court-happy-with-citations.md
docs/ops/evals/model-court-personal-advice-refusal.md
docs/ops/evals/model-court-thin-evidence-refusal.md
docs/ops/evals/model-journal-banned-vocab-block.md
docs/ops/evals/model-journal-happy-path.md
docs/ops/evals/model-journal-thin-week-honesty.md
docs/ops/evals/pre-mortem-compare-called-vs-missed.md
docs/ops/evals/pre-mortem-compose-happy.md
docs/ops/evals/pre-mortem-compose-thin-coverage.md
docs/ops/evals/README.md
docs/ops/evals/studio-betting-education-recommendation-block.md
docs/ops/evals/studio-betting-education-thin-evidence.md
docs/ops/evals/studio-fan-explainer-happy.md
docs/ops/evals/studio-sponsor-safe-competitor-claim-block.md
docs/ops/evals/studio-x-thread-emoji-ladder-block.md
docs/ops/evals/twitter-bot-banned-vocab-block.md
docs/ops/evals/twitter-bot-paid-pick-refusal.md
docs/ops/evals/twitter-bot-publication-happy.md
docs/ops/evals/twitter-bot-settlement-loss.md
docs/ops/evals/twitter-bot-settlement-win.md
docs/ops/improvement-backlog.md
docs/ops/issue-queue.md
docs/ops/PRIMARY_CLONE_SYNC_AUDIT_2026-05-27.md
docs/ops/pr-review-checklist.md
docs/ops/stuck-queue.md
docs/ops/stuck-queue-protocol.md
docs/ops/WAVE_COMPLETION_REPORT_2026-05-27.md
docs/performance/biomechanics-modality-taxonomy.md
docs/performance/force-plate-and-high-performance-layer.md
docs/performance/play-classification-layer.md
docs/performance/player-performance-intelligence.md
docs/performance/radar-and-tracking-data-layer.md
docs/performance/sports-science-evidence-vault.md
docs/performance/sports-science-licensing-policy.md
docs/source-providers/commercial-crawling-approval-gate.md
docs/source-providers/historical-trends-provider-policy.md
docs/source-providers/scores24-source-review.md

## Files Preserved
docs/ops/decision-log.md

## Files Marked Investigate
reports/agent-handoffs/ACTIVE_AGENT_RELAY.md
reports/agent-handoffs/CODEX_CC1_HANDOFF.md

## Protected File Before/After
- docs/ops/decision-log.md unchanged
- Hash (before/after): C05A8E65745BF4E05C172F6CA09F3A02D1991DE8C21CE86CB1051A9E54A3929E
- Size (before/after): 46062

## Forbidden-Zone Diff Checks (Post-Run)
- git diff -- package.json package-lock.json: existing non-doc drift present, unchanged by this run
- git diff -- packages/db/prisma/schema.prisma: no diff
- git diff -- apps/web/app: existing app diffs present, unchanged by this run
- git diff -- apps/web/app/api: no diff
- No copy mutation executed outside allowed docs/report zones

## Validation Results
1. npm run lint: PASS
2. npm run typecheck: FAIL
- Error class: missing .next/types/**/*.ts files referenced by apps/web/tsconfig.json include pattern
- Classification: environment/build-artifact-related, not docs-related
3. npm run test: FAIL
- Failing test in one run: __tests__/guardrails.test.ts -> draft-only exits 0 (status=1)
- Classification: pre-existing/non-deterministic guardrail-state issue, not docs-related
4. npm run test:smoke: FAIL (Missing script: test:smoke)
- Classification: pre-existing config gap
5. npm run build: PASS
- Non-fatal Prisma auth warnings during static generation

## Unresolved Blockers
1. Working tree has pre-existing non-doc modifications/untracked paths in forbidden zones (apps, package files, .github, packages, scripts)
2. Validation is not fully green (typecheck, test, test:smoke failures)
3. Commit gate cannot pass because not all changed files are in allowed docs/report zones

## Structural Safety Assessment
- Primary clone is safe for a post-sync doctrine integrity audit from a docs custody perspective
- Primary clone is not structurally clean for implementation start due to pre-existing forbidden-zone drift and failing validation items

## Recommended Next Prompt
Codex: perform a structural clean-room audit only. Do not edit files. Identify the minimal sequence to return working tree to implementation-safe state (forbidden-zone drift triage, deterministic guardrail test diagnosis, and .next/types generation strategy), then wait for explicit approval before any mutation.
