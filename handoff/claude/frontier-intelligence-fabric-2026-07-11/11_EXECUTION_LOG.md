# 11 — Execution Log

Append-only. Newest entries last.

## 2026-07-11 — Program start

- PR #75 merged to `main` (`821d0ca3`) after CI green + 4 verified Codex fixes.
- Designated branch reset onto merged main.
- Founder's Frontier R&D packet absorbed (master report, master handoff,
  43-item radar CSV).
- Artifact pack created.

## 2026-07-11 — Workstream A: truth reconciliation (complete)

**Files changed:**

- `apps/web/lib/jarvis/capability-registry.ts` — memory → DESIGNED (evidence-met
  criterion), market-line CLV truth corrected
- `apps/web/lib/jarvis/intelligence-state.ts` — REMEMBER prose + fallback
  posture ("built, not activated"); status deliberately unchanged
- `apps/web/lib/jarvis/agent-council.ts` — ARCHIVE seat currentTruth
- `apps/web/lib/jarvis/jarvis-operating-assessment.ts` — memoryStatus line
- `apps/web/lib/cockpit/ask-jarvis.ts` — answerMemoryStatus hardcoded text
- `apps/web/lib/cockpit/cockpit-operating-map.ts` — Memory surface DESIGNED/internal
- `docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md` — header, Current Truth, tier
  table, promotion criterion SATISFIED marker, pending table
- `docs/ai/jarvis/JARVIS_CAPABILITY_REGISTRY.md` — rows, counts, score 38→39
- `apps/web/__tests__/jarvis-memory.test.ts`,
  `jarvis-intelligence-state.test.ts` — pins evolved (promise preserved:
  fallback never claims recall)
- `apps/web/__tests__/jarvis-capability-registry.test.ts` — NEW anti-drift
  suite: store-exists ⇒ registry can't deny it; no activation claim without
  demonstrated write; CLV-code-exists ⇒ registry can't deny CLV

**Deliberately NOT done:** REMEMBER phase promotion (criterion = confirmed
production record); ARCHIVE seat status change (seat still cannot execute);
any ACTIVE promotion anywhere.

**Tests:** 223/223 green across the 8 Jarvis/cockpit truth-surface files
(vitest, 2026-07-11). Full-suite run recorded before PR A opens.

**Rollback:** revert the single Workstream A commit; no schema, no flags, no
public surface touched.

## 2026-07-11 — Workstream B: R&D Radar (complete)

**Built (all additive, no Prisma migration, no installs):**

- `apps/web/lib/resource-intelligence/radar/` — types, normalize (identity +
  posture, mirrors the import script exactly), policy (blocked → quarantine;
  critical → owner review; unverified license never implementable; radar can
  never emit approved_direct), score (11 advisory dimensions, blockedOverride),
  snapshot (committed JSON + validation), dossier (conservative cross-window
  merge: most restrictive posture wins), queries (feed with gated COUNTS,
  leak-proof recommendedExperiments), index.
- `.../generated/2026-07-11.json` — 43 observations imported from the
  founder-verified CSV (raw CSV preserved at
  `docs/rnd/radar-snapshots/2026-07-11.csv`; JSON pins the CSV sha256).
- `scripts/resource-radar-import.mjs` — deterministic CSV→JSON (no network,
  no clock; unknown numerics stay null).
- `apps/web/app/api/cockpit/resource-intelligence/radar/route.ts` — admin
  403 before flag check; flag-off is a deliberate 404 state.
- `apps/web/app/cockpit/sources/radar/page.tsx` — read-only surface with
  disabled/empty/data states; no install affordance; facts-vs-claims rule in
  copy; linked from the Sources board header.
- `docs/rnd/RADAR_POLICY.md` — the policy the code enforces.
- `apps/web/__tests__/resource-radar.test.ts` — all 12 required invariant
  classes (26 tests): normalization determinism, duplicate merge, score
  determinism, blocked override, quarantine leak prevention, owner-review
  leak prevention, unknown-license cap, self-claims labeled, admin-only API,
  no secrets in payload, distinct empty/disabled states + flag default off +
  no install affordance, fixture sha256 pin + CSV provenance + 43-count.

**Feed shape from the real snapshot:** 43 observations → 38 dossiers;
gated counts ownerReview 9 / quarantine 3; recommended experiments exclude
every gated item by construction.

**Flag:** `RESOURCE_RADAR_V2_ENABLED` (default off — module ships dark).

**Tests:** 26/26 radar tests green; typecheck green; lint green; all
guardrail scanners green. Full-suite result recorded in 12_FINAL_REPORT.md
when PR A opens.

**Rollback:** revert the Workstream B commit; delete the flag from any env.

## 2026-07-11 — PR A opened

- PR #76 (https://github.com/Beexly/Sports/pull/76), head `06ffa38c`,
  base `main`. Opened for owner review — NOT auto-merged per program rules.
- Babysit loop armed: CI + review sweeps continue; merge stays owner-gated.

## 2026-07-11 — Workstream C: Agent Foundry (complete)

- Branch `claude/frontier-agent-foundry-2026-07-11` (stacked on PR A head).
- `apps/web/lib/agent-foundry/`: manifest contract, sealed content hashes,
  council-derived authority (never duplicated), deterministic 15-family
  baseline scanner (findings only, never approves), external-scanner adapter
  boundary with honest absence, 3 first-party DRAFT manifests, canExecute
  structurally false.
- Surfaces: /cockpit/agent-foundry + admin API behind AGENT_FOUNDRY_ENABLED
  (default off); sidebar entry added (nav-coverage pin).
- Fix during build: scanner \b boundary missed snake_case verbs
  ("publish_post") — separators normalized before the verb check; test
  caught it before commit.
- Tests 26/26; typecheck, lint green.

## 2026-07-11 — Workstream D: AI Setup Assurance (complete)

- `apps/web/lib/assurance/`: categories/weights (sum 100, pinned), honest
  per-category coverage with not-inspected lists, findings derived from live
  registry + file evidence (nothing hard-coded that code disproves), health
  scoring with risk×confidence penalties, top recommendation by
  risk-adjusted leverage.
- Verdict for a pure repo checkout: INCOMPLETE (weighted coverage ~0.76 <
  threshold 0.80, deliberately set above what a checkout can reach). The
  grade unlocks via evidence collectors, never threshold relaxation.
- Current open findings (all derived, not asserted): memory activation
  pending (owner B2), no model router (Workstream E ships shadow),
  no external skill scanner, tool bus not wired, provider-specific
  telemetry, doc-drift pins partial, foundry unused (acknowledged).
- Surfaces: /cockpit/assurance + admin API behind AI_SETUP_ASSURANCE_ENABLED
  (default off); sidebar entry added.
- Tests: assurance suite green; typecheck, lint, scanners green.

## 2026-07-11 — PR B opened + Codex sweep on PR A

- PR #77 (https://github.com/Beexly/Sports/pull/77): Foundry + Assurance,
  stacked on PR A's branch. Owner-gated merge.
- Codex left 6 findings on PR A — all six confirmed and fixed (merged-risk
  score override, conservative license merge, positive license allowlist,
  memory canAnswer reverted to false, importer closed-set risk validation +
  fail-closed policy on unknown labels, latest.json runtime pointer).
  Regression tests added for each; threads resolved; pushed as 9fcf0c78.
- Assurance model-routing finding made two-state (absent vs shadow-only) so
  PR B and PR C are both honest without edits.

## 2026-07-11 — Workstream E: Model Portfolio Router, shadow only (complete)

- Branch `claude/frontier-model-router-shadow-2026-07-11` (stacked on PR B).
- `apps/web/lib/ai-routing/`: 7 lanes, deterministic priority policy
  (deterministic→NO_MODEL; sensitive→LOCAL_PRIVATE, blocks with no local
  endpoint; public/critical→PUBLIC_HIGH_STAKES regardless of budget),
  version-pinned (routing-policy/1.0.0), single registered endpoint (the
  production Claude config; trainsOnData:false structurally required),
  honest probe-less health (UNKNOWN usable only for the endpoint production
  already exercises), per-lane budget ceilings (lower-only task overrides),
  frozen eval interfaces with EMPTY committed suite/history (comparative
  claims impossible without runs), shadowRecommend gated by
  AI_MODEL_ROUTER_SHADOW_ENABLED (default off; null when off).
- Structurally no-op: source-level pins forbid network primitives in the
  module and forbid any reference from lib/claude-api call sites.
- Tests 20/20 (all 11 packet rules); typecheck, lint green.
- Route policy is method IP: no public surface renders any of it.
