# Suggested patch list — GSE reconciliation

**Not applied.** These are staged as PR descriptions. Each is scoped to one
concern so a reviewer can accept or reject it independently. Ordered by
severity, then by the number of downstream numbers each one changes.

---

## PR-1 — Stop shipping clamped pick numbers (CRITICAL, GAP-01, GAP-09)

**Files**
- `scripts/publish_late_sun_mon_live_free.py` lines 498-505, 99-300

**What it does**

Removes four clamps and the hardcoded grade, and populates `market_fair_prob`
from the live de-vigged multi-book consensus:

```python
# BEFORE
true_prob = max(0.6020, min(0.6160, sig_attr["trueProb"]))
raw_edge = round(true_prob - play["market_fair_prob"], 4)
shrunk_edge = round(raw_edge * 0.65, 4)
expected_clv = round(shrunk_edge * 0.85, 4)
edge_score = min(71.2, max(68.4, sig_attr["edgeScore"]))
confidence = max(66, min(69, sig_attr["confidence"]))
tier = "FREE"
pick_grade = "STRONG_PLAY"

# AFTER
true_prob = sig_attr["trueProb"]
raw_edge = round(true_prob - market_fair_prob, 4)
shrunk_edge = round(raw_edge * 0.65, 4)
expected_clv = round(shrunk_edge * 0.85, 4)
edge_score = sig_attr["edgeScore"]
confidence = sig_attr["confidence"]
tier = "PREMIUM" if confidence >= 67 else "FREE"
pick_grade = "STRONG_PLAY" if (confidence >= 68 and edge_score >= 67.0) else "SOLID_PLAY"
```

`market_fair_prob` comes from the same de-vigged consensus the paid path uses
(`packages/prediction-engine/src/scoring.ts:138` `averageAmericanPrices` +
`:187` `removeVig`). **When the consensus is unavailable the script must fail
closed** — not default to 0.5000.

**Why it matters.** Today the published `confidence`, `edgeScore`, and
`pickGrade` are not engine outputs. Every downstream measurement — CLV,
settlement, the Elite ledger, calibration history — is measuring the clamp.

**Acceptance**
- No `max(`/`min(` on a published probability, score, or confidence in the
  script.
- `pick_grade` is derived, never a literal.
- A test asserts that the value written to `picks.confidence` equals the
  value the engine produced for that pick.

---

## PR-2 — One publish path that consults its gates (CRITICAL, GAP-21, GAP-02, GAP-03)

**Files**
- `packages/ingestion-pipeline/src/process-sport.ts` (mint site, ~`:1585`)
- `packages/prediction-engine/src/platform-config.ts:46, :166`
- `packages/prediction-engine/src/honesty/commit-reveal.ts:35`
- `packages/ingestion-pipeline/src/walk-forward-emission-gate.ts`

**What it does**

1. Reads `gates.canExposePublicPicks` at mint and sets `isPublished` from it,
   rather than inheriting the Prisma default `true`.
2. Reconciles the two `PUBLIC_PICKS_ENABLED` parsers to one default, and
   fixes the `platform-config.ts:46` docstring that says "Default: false"
   while `:166` ships `true`.
3. Makes the emission gate apply to every emit path, not only
   `generate-signal-slate.ts:265`.

**Why it matters.** The gate currently hides rows at read time but does not
stop the mint. The Oct-18 content shipped because its script sat outside both
the gate and the guardrail's scan set.

**Acceptance**
- `grep -c canExposePublicPicks process-sport.ts` > 0.
- One default for `PUBLIC_PICKS_ENABLED`, asserted by a test.
- The docstring and the code agree.

---

## PR-3 — Retire the AI-framing ban and the "math you can read" line (CRITICAL, GAP-26, GAP-27, GAP-28)

**Files**
- `apps/web/lib/positioning-vocab.json` (whole file)
- `apps/web/lib/positioning-vocab.ts:4`
- `apps/web/lib/compliance-scanner/rules.ts:50, :60`
- `apps/web/lib/trust-claims.ts:47, :376-455`
- `apps/mobile/src/components/brand.tsx:135`
- `apps/mobile/app/onboarding.tsx:119`
- `apps/mobile/app/(tabs)/more.tsx:317`
- `apps/mobile/package.json:7`
- `apps/mobile/tests/voice.test.js:62`
- `apps/web/lib/studio/templates/sponsor-safe.ts:65`
- `apps/web/app/tools/page.tsx:93`
- `README.md:14`, `CLAUDE.md:8, :77`, `docs/positioning.md:11, :20, :36-41`
- `scripts/guardrails/draft-only.mjs:238` (the `api.x.com` hole)
- `apps/web/lib/cockpit/ask-jarvis.ts:159`, `owner-summary.ts:145-148`, `jarvis-owner-summary.ts:7`
- `apps/web/__tests__/docs-public-copy-scan.test.ts:170-171, :205-206`
- `apps/web/__tests__/trust-claims.test.ts:406`
- `.claude/agents/frontend-app-agent.md:19`, `.claude/agents/content-publishing-agent.md:2, :21, :26`

**What it does**

Narrows the AI ban to genuinely AI-category marketing claims, drops the
retired line from web/mobile/docs/agent-briefs, corrects the `tools` page copy
to match a product that publishes predictions, and adds `api\.x\.com` to the
draft-only transport pattern.

**Why it matters.** The ban blocks a whole class of legitimate copy, the
mobile app still shows the retired line to users, the sponsor template
regenerates it on every blurb, and the `tools` page disclaims prediction while
the site publishes predictions. `AGENTS.md:607` already records the
retirement — the code never caught up.

**Acceptance**
- `node scripts/guardrails/trust-gate.mjs` exits 0.
- `node scripts/guardrails/draft-only.mjs` exits 0.
- No rendered mobile screen contains the retired line.
- `CLAUDE.md` rule 8 and the two agent briefs no longer point at removed
  enforcers.

---

## PR-4 — Make "wired" mean wired, and triage the unbuilt ADOPT papers (HIGH, GAP-17, GAP-19, GAP-20)

**Files**
- `docs/arxiv-program/research/2026-09-21/arxiv-program/index/WIRE-IN-PLAN.md`
- `docs/arxiv-program/research/2026-09-21/arxiv-program/index/MASTER-PAPER-INDEX.md`
- `docs/ops/DOSSIERS_58_FULL.md` (the broken stub)
- new: `scripts/ops/census-engine-reachability.mjs` + a CI job

**What it does**

1. Rewrites WIRE-IN-PLAN.md to state the measured number (291 / 1,442 IDs have
   an implementing module) and defines "wired" as *imported by a production
   path*, not *tagged in a bucket*.
2. Adds a CI check that re-derives the count from the import graph, so the
   doc cannot drift again.
3. Fixes the `DOSSIERS_58_FULL.md` stub, which points at a 68,507-byte blob
   that was never uploaded.
4. Adds a triage table for the 33 unbuilt ADOPT papers, each with its numeric
   gate from its ledger.

**Why it matters.** The repo's own index says 100% of the research is wired.
Measured, it is 20%. That gap is the largest single misstatement in the
repository, and it is the one most likely to be quoted.

**Acceptance**
- The doc's headline number equals what the CI check prints.
- The 33 ADOPT papers each have a verdict recorded.

---

## PR-5 — Wire the Literature Index as the corpus retrieval path (HIGH, GAP-06, GAP-18)

**Files**
- `packages/prediction-engine/src/literature/` (new — already written)
- `apps/web/lib/literature/` (new — already written)
- `packages/prediction-engine/src/index.ts` (barrel — already written)
- `packages/types/src/index.ts` (`corpusAdjustment` / `corpusWeight` — already written)
- `packages/prediction-engine/src/scoring.ts:848, :1534` (already written)
- `packages/ingestion-pipeline/src/process-sport.ts` (already written)
- `packages/prediction-engine/src/reasoning/literature-registries.ts` (wire or re-home)

**What it does**

Ships the pgvector literature index built in this session and makes it the
retrieval path for the Layer-2 corpus, replacing the hardcoded
`C:/Users/Garrett/Sports` path in `corpus-evaluator.ts:835-850` (which returns
zero items on Vercel) and the `mind-reasoning.ts:130-139` equivalent (which
throws).

**Why it matters.** The corpus is computed and discarded today. The index
makes it continuous — every new signal triggers a top-k retrieval, settlement
writes residuals, and premises that earn it are promoted to causal edges with
do-calculus tests on promoted edges only.

**Acceptance**
- `corpusWeight` stays 0 until the pre-registered gate (N≥500 settled, ΔBrier
  ≥0.002) is actually run and passed. Ship the weight at 0 deliberately.
- The corpus resolves by env var with a repo-relative fallback, never by a
  hardcoded absolute path.
- `literature-registries.ts` is either wired or moved to a research directory
  — it currently has a test and no caller.

---

## PR-6 — Build the gate registry (MEDIUM, GAP-23, GAP-24)

**Files**
- new: `packages/prediction-engine/src/guards/registry.ts`
- new: a `lit`-style `gse_gate_registry` table on a dev branch
- `packages/prediction-engine/src/readiness.ts:127-146`

**What it does**

One table of: gate id, file:line, what it checks, default state, and whether
it blocks at **mint**, at **read**, or only in **audit**. The audit's
37-gate inventory is a usable first draft.

**Why it matters.** There is no single place that answers "which gates exist,
what is each one's state, and which one is currently blocking." The audit had
to assemble 37 gates across six directories to answer it. Nine of them cannot
block anything, and the two that matter most under the current model —
`assertDisplaySubstantiated` and `validateWalkForwardIntegrity` — have no
caller at all.

**Acceptance**
- A query returns the gate inventory.
- Every gate is labelled mint / read / audit, and no gate is counted as
  mint-blocking unless it is.

---

## Ordering

1. **PR-1** (stop shipping clamped numbers) — changes the numbers users see.
2. **PR-2** (one publish path) — depends on PR-1's honesty about the path.
3. **PR-3** (retire the old doctrine) — independent, and CI-gated so it will
   fail loudly if a file is missed.
4. **PR-4** (make "wired" mean wired) — independent, no runtime effect.
5. **PR-5** (wire the literature index) — the largest change; land the
   schema and the modules first, the env-var fix second, the weight last
   (at 0).
6. **PR-6** (gate registry) — depends on PR-2's decision about which gates
   are real.

**Not staged as patches, deliberately:** anything touching
`prisma/migrations/`, `.env` values, `scripts/guardrails/` allowlist
semantics, or `MODEL_VERSION`. The last one is a founder decision, and the
repo's own law (`docs/calibration-proposals/FROZEN.md`) says so.
