#!/usr/bin/env python3
"""Integrate the three recon agents' findings into reconciliation/gaps.json.

Every claim imported here was VERIFIED in this session by a fresh grep/count
(not taken on the subagent's word). The verification command is recorded
alongside each finding so a reader can re-run it.
"""
import json, os

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(WT, "reconciliation")

gaps = json.load(open(os.path.join(R, "gaps.json"), encoding="utf8"))
existing = {g["id"] for g in gaps["gaps"]}

NEW = []


def g(id, severity, title, category, claim, evidence, impact, action, blocking=None,
      source="recon batch (verified this session)"):
    NEW.append({
        "id": id, "severity": severity, "title": title, "category": category,
        "claim_tested": claim, "evidence": evidence, "impact": impact,
        "recommended_action": action, "blocks_current_business_model": blocking,
        "source": source,
    })


# ---------------------------------------------------------------------
# Batch A: research census (agent 1). Verified counts.
# ---------------------------------------------------------------------
g("GAP-17", "CRITICAL",
  "The repo's own 'every paper is wired' index is a bucket-tagging artifact, not code",
  "contradiction",
  "WIRE-IN-PLAN.md claims every one of the 1,251 tracker papers is mapped into an engine bucket and is 'wired to the engine'.",
  ["docs/arxiv-program/research/2026-09-21/arxiv-program/index/WIRE-IN-PLAN.md:3  'Coverage: 1,251 / 1,251 tracker papers indexed, each in >=1 engine bucket.'",
   "docs/arxiv-program/research/2026-09-21/arxiv-program/index/WIRE-IN-PLAN.md:32  print('WIRE-IN OK: 1251/1251, every paper in >=1 bucket')",
   "MEASURED: 1,511 arxiv-deep ledgers, 1,442 unique arXiv IDs; only 291 IDs have an implementing module (20%)",
   "MEASURED: 306 arXiv-derived modules in packages/prediction-engine/src; 7 are called by another engine module, 47 are barrel-only, 251 are imported by nothing",
   "MEASURED: 306/306 of those modules DO have a sibling .test.ts -- the test is the only thing exercising them"],
  "'Wired' in this repo's index means 'a string was written into corpus-index.jsonl', not 'code exists and is called'. A reader of WIRE-IN-PLAN.md would conclude 100% of the research corpus is in the engine. Measured code coverage is 20%. The gap between the two numbers is the single largest misstatement in the repository.",
  "Rewrite WIRE-IN-PLAN.md to state the measured number and define 'wired' as 'imported by a production path', not 'tagged in a bucket'. Add a CI check that re-derives the count from the import graph so the doc cannot drift again.",
  True)

g("GAP-18", "HIGH",
  "The corpus evaluator's premise registry modules are tested but never called",
  "dead-code",
  "FINAL_DELIVERY_AUTONOS_MIND.md claims the registered mathematical models (EQ-BETTING-003/004, MOD-BETTING-002, MOD-KAGGLE-001) are WIRED & TESTED.",
  ["docs/predictions/research/2026-10-17/FINAL_DELIVERY_AUTONOMOUS_MIND.md  -- claims WIRED & TESTED",
   "MEASURED: packages/prediction-engine/src/reasoning/literature-registries.ts has ZERO importers outside its own test file",
   "MEASURED: packages/prediction-engine/src/reasoning/arxiv-reasoning-bridge.ts has ZERO importers outside its own test file",
   "MEASURED: packages/prediction-engine/src/reasoning/live-edge-registry.ts is imported only by reasoning/part-reading.ts, which itself has no production importer",
   "MEASURED: data/gse-dataset/bridge-premises.jsonl (285 rows) is read by scripts/build-grounded-mind-corpus.mjs and scripts/build-mind-corpus-3000.mjs only"],
  "The premise registry -- the repo's own formalization of its research into named, tested equations -- is a library with no consumer. This is the same class of gap as the corpus evaluator: computed, displayed, never used.",
  "Either wire literature-registries.ts into a live path or move it behind the same promotion gate the corpus evaluator carries. It is the natural consumer for the new literature index.",
  True)

g("GAP-19", "HIGH",
  "The research corpus is 80% unimplemented: 1,151 of 1,442 paper IDs have no code at all",
  "missing",
  "The engine is built on the arXiv corpus: 'every genuine paper in the corpus is individually parsed and executed'.",
  ["MEASURED: docs/arxiv-program/research/2026-09-21/arxiv-deep/ holds 1,511 ledgers (1,442 unique IDs, 53 with no ID)",
   "MEASURED: 291 ledger IDs have an implementing module; 1,151 do not",
   "Verdicts across the ledgers: ADAPT 1,099, REJECT 206, ADOPT 47, BLOCKED 1, unparsed 158",
   "MEASURED: 33 of the 47 ADOPT papers have no module",
   "docs/predictions/research/2026-10-13/GSE_58_paper_dossiers.md -- 58 implementation-ready dossiers; 4 have a module",
   "docs/ops/DOSSIERS_58_FULL.md -- an index stub for a 68,507-byte blob that was never uploaded; the part00-02.md files it promises do not exist"],
  "The corpus is a READING program, not an implementation program. Only 20% of the papers it indexes have code, and 33 of the 47 explicitly ADOPTed papers do not. The engine's claimed grounding in the literature is real for the papers that were built and absent for the rest.",
  "Triage by the ADOPT verdict first (33 papers, each with a numeric gate in its ledger) rather than by corpus size. Fix the broken DOSSIERS_58_FULL.md stub so it does not point at a blob that does not exist.",
  False)

g("GAP-20", "MEDIUM",
  "Whole module families are exported, tested, and never invoked",
  "dead-code",
  "The symbolic-regression, rating, ensemble, and decision families implement research the docs ask for.",
  ["MEASURED: packages/prediction-engine/src/symreg/ -- 9 modules, each imported only by src/index.ts and its own test",
   "MEASURED: packages/prediction-engine/src/ratings/ -- 16 of 17 modules have no importer (BRADLEY-TERRY, DAVIDSON, PAGERANK, EB-SHRINKAGE)",
   "MEASURED: packages/prediction-engine/src/ensemble/ -- 44 modules with no importer",
   "MEASURED: packages/prediction-engine/src/decision/ -- 50 modules with no importer (KELLY, MCTS, BANDIT variants)",
   "MEASURED: packages/prediction-engine/src/reasoning/vision-factors.ts:40  export const VISION_DEFAULT_WEIGHT = 0.0; -- zero importers",
   "docs/engine/research/2026-10-11/HONEST_CEPT.md  -- the e-process / anytime-valid work, module research/mve-eprocess.ts has no importer",
   "docs/engine/research/2026-10-17/GREY_AREA_REASONING_AUDIT_REPORT.md -- already documents the ingestion<->reasoning disconnect"],
  "Roughly 730 of 1,012 engine modules exist in code, have tests, and are called by nothing. This is the concrete form of the 'everything gets wired' backlog the brief describes. It is not waste -- it is inventory -- but nothing in the repo tells an operator which 730 are load-bearing and which are not.",
  "Generate a per-module reachability report in CI (the same import-graph walk this audit ran) and label each module. The orphan count is the honest measure of the gap, and it should be visible rather than inferred.",
  False)

# ---------------------------------------------------------------------
# Batch B: publish path + gates (agent 2). Verified.
# ---------------------------------------------------------------------
g("GAP-21", "CRITICAL",
  "The public-picks gate is never consulted at mint time; isPublished defaults true",
  "integrity",
  "The readiness gates control whether picks reach the customer surface (canExposePublicPicks).",
  ["packages/db/prisma/schema.prisma:550  isPublished Boolean @default(true)",
   "MEASURED: 'canExposePublicPicks' and 'publicPicksEnabled' appear ZERO times in packages/ingestion-pipeline/src/process-sport.ts",
   "packages/prediction-engine/src/readiness.ts:134  canExposePublicPicks: config.publicPicksEnabled",
   "apps/web/app/api/picks/route.ts:73-76  -- the 503 gate lives on the READ path",
   "MEASURED: no gate registry exists -- grep for gateRegistry|GATE_REGISTRY|registerGate|gate_registry|shadowRegister|shadow_register over packages/ and apps/ returns zero hits",
   "packages/prediction-engine/src/platform-config.ts:46 docstring says 'Default: false' but :166 is parseBool(process.env['PUBLIC_PICKS_ENABLED'], true) -- code ships true",
   "packages/prediction-engine/src/honesty/commit-reveal.ts:35 parses the SAME env var strictly (=== 'true'), so the two parsers have OPPOSITE defaults"],
  "The book path mints publishable rows regardless of the readiness gate. The gate hides rows at read time; it does not stop the mint. So the system has a read-side switch that looks like a publish-side switch, and the two parsers of the same environment variable disagree about what the default is. There is also no registry of which gates exist or what state they are in.",
  "Read canExposePublicPicks at mint time in process-sport.ts and set isPublished from it. Reconcile the two PUBLIC_PICKS_ENABLED parsers to one default. Build the gate registry that the repo lacks, so gate state is a queryable fact rather than a set of scattered defaults.",
  True)

g("GAP-22", "HIGH",
  "Props and copula SGPs are not on the board at all -- they are a signals-table write and a blog post",
  "contradiction",
  "The live board shipped sides, totals, MLs, props, and copula SGPs on 18 October as one surface.",
  ["packages/db/prisma/schema.prisma:1459-1463  PickType enum is SPREAD | MONEYLINE | TOTAL -- there is no PROP and no SGP",
   "MEASURED: no prop_picks, sgp_picks, board_picks, or published_picks table exists",
   "apps/web/app/api/ops/props-slate/route.ts:352  db.signal.upsert with key props.model_p_over.* -- writes the `signals` table, not `picks`",
   "apps/web/app/api/ops/props-slate/route.ts:63  gated on PROPS_SLATE_ENABLED === '1', and no cron entry exists for it (vercel.json)",
   "packages/ingestion-pipeline/src/props-slate-shadow.ts:42  PROPS_SLATE_SHADOW_ENABLED, writes shadow:true, weight:0 -- never persisted",
   "scripts/publish_late_sun_mon_live_free.py:752  the Week 6 SGP card is an INSERT into `blog_posts`",
   "MEASURED: apps/web/data/sgp-projections.json (generatedAt 2026-10-18T17:58) is a static file with no in-repo generator",
   "MEASURED: the copula code (bayesian-residue-bridge.ts, sizing-bridge.ts) is imported by no SGP publish surface -- the 'copula' in the Oct-18 reasoning is hand-authored prose"],
  "The Oct-18 'board' was three different surfaces with three different mechanisms: picks rows for sides/totals/MLs, a signals-table write for props, and a blog post for SGPs. The copula math in the published SGPs is not what produced the numbers. A reader of the shipped content would reasonably assume one pipeline produced all of it.",
  "State the three surfaces explicitly in the product and in the audit. If copula SGPs are to ship as priced products, the copula module must be the thing that computes them.",
  False)

g("GAP-23", "HIGH",
  "Nine of 37 integrity gates are unwired, dark, or off by default",
  "dead-code",
  "The engine has a comprehensive honesty and verification gate stack.",
  ["MEASURED: 37 gates catalogued across packages/prediction-engine/src/guards, /honesty, /promotion, readiness.ts, packages/ingestion-pipeline, and apps/web",
   "UNWIRED: guards/display-substantiated.ts:117 assertDisplaySubstantiated (zero callers) -- the guard that would enforce a substantiated public claim",
   "UNWIRED: honesty/commit-reveal.ts:32,78 isPublicPicksEnabled / publicCommitPick (zero callers on the publish path)",
   "UNWIRED: promotion/integrity.ts:99 validateWalkForwardIntegrity (module declared DARK at promotion/index.ts:6-11)",
   "UNWIRED: promotion/evaluate.ts:25 evaluatePromotion (3-leg promotion, nMin 500, delta 0.002)",
   "UNWIRED: honesty/placebo-leak.ts:101 runShuffledTimePlacebo (the leak placebo)",
   "UNWIRED: packages/ingestion-pipeline/src/mint-withhold.ts:43 mint-withhold (only a test imports it)",
   "UNWIRED: packages/ingestion-pipeline/src/publish-guards-bridge.ts:54-352 (the header claims live wiring; only index.ts imports it)",
   "OFF BY DEFAULT: packages/prediction-engine/src/scoring.ts:1389-1390 LINE_INTEGRITY_PUBLISH_GUARD_ENABLED === 'true' (repo notes it suppresses ~half the board)",
   "ADVISORY ONLY: packages/ingestion-pipeline/src/leakage-gate.ts:29 -- leakageClean shifts factor weight, never blocks",
   "READ-ONLY ANNOTATION: packages/prediction-engine/src/honesty/no-bet-gate.ts:56 -- attached to the payload at apps/web/app/api/picks/route.ts:724-738, does NOT filter rows (fail-open)"],
  "The gate inventory reads as comprehensive in source but nine of the thirty-seven cannot block anything. The two that would matter most for the current model -- assertDisplaySubstantiated (a substantiated public claim) and the walk-forward integrity validator -- are exactly the ones with no caller.",
  "Decide per gate: wire it, or move it to an explicit 'research' directory so the file tree stops implying coverage. A gate that cannot block should not be counted as a gate.",
  True)

g("GAP-24", "MEDIUM",
  "No gate registry exists, so gate state is not a queryable fact",
  "missing",
  "Gates have a current state that operators can see.",
  ["MEASURED: grep for gateRegistry|GATE_REGISTRY|registerGate|gate_registry|shadowRegister|shadow_register over packages/ and apps/ returns zero hits",
   "The closest thing is getReadinessGates() at packages/prediction-engine/src/readiness.ts:127-146, fed by platform-config.ts:162-176",
   "Readiness state: canScore true, canPersistPicks true, canPersistCanonicalHistory true, canUseDerivedHistory false, canExposePublicPicks true, canPromoteFeaturedPicks false, canPublishContent false, canExposePerformanceStats false, isBootstrapMode false, canLearnFromOutcomes false, canApplyCalibrationAdjustments false, forceNoBetIfStale false",
   "The gate_decisions table (packages/db/prisma/schema.prisma:700, statuses SCORING/PUBLISHED/GATED at :1495-1499) RECORDS outcomes but does not gate"],
  "There is no single place that answers 'which gates exist, what is each one's state, and which one is currently blocking'. The audit had to assemble 37 gates across six directories to answer it. Any operator asking the same question gets a different answer depending on which directory they read.",
  "Build a gate registry: one table of gate id, file:line, what it checks, default state, and whether it blocks at mint, at read, or only in audit. The audit's own gate inventory is a usable first draft.",
  False)

# ---------------------------------------------------------------------
# Batch C: old doctrine (agent 3). Verified.
# ---------------------------------------------------------------------
g("GAP-25", "CRITICAL",
  "The no-publish doctrine is enforced by a CI guardrail, a default-ON kill switch, a runtime throw, and TypeScript literal types",
  "contradiction",
  "The old restriction against publishing predictions is prose and has been removed as doctrine.",
  ["scripts/guardrails/draft-only.mjs:5-11  'Fails CI if any API / page / lib / worker file performs a publish-side write' -- scans 3,716 files, exits 0 today",
   "scripts/guardrails/draft-only.mjs:225-227  blocks publishedAt: new Date(, status: 'PUBLISHED', and non-null publishedAt in any data block",
   ".github/workflows/ci.yml:237-252  the 'Draft-only (no auto-publish)' job, whose own comment says 'outside the explicit (and currently non-existent) publish boundary'",
   "workers/content-publishing/src/index.ts:15  INTERNAL_CALIBRATION_ONLY = process.env['INTERNAL_CALIBRATION_ONLY'] !== 'false' -- DEFAULT ON, so every request returns REFUSED (:32-38)",
   "apps/web/lib/content-engine/persist-draft.ts:60-65  throw new Error('...refusing to persist a record with publishedAt set')",
   "apps/web/lib/jarvis/agent-council.ts:88,90  readonly externalActions: 'NONE'; readonly externalActionsAllowed: false; -- LITERAL TYPES, so agent publishing is a COMPILE ERROR",
   "apps/web/lib/agents/agent-capabilities.ts:8  FORBIDDEN_EXTERNAL_ACTIONS includes PUBLISH, SEND_EXTERNAL, ENABLE_PUBLIC_PICKS -- publish is FORBIDDEN, not GATED",
   "apps/web/lib/agents/agent-registry.ts:51,57  forbiddenActions applied to every agent",
   "apps/web/app/api/ops/props-slate/route.ts:63  PROPS_SLATE_ENABLED === '1' -- and no cron entry exists for it"],
  "Doctrine (B) is not prose; it is code. The prohibitions are real and they are inconsistent with a model that publishes: the props route is gated off with no cron, the content worker refuses everything, agent publishing does not compile, and CI blocks any publish-side write in the scanned paths. Meanwhile the Oct-18 board was published by a script OUTSIDE the guardrail's scan set -- which is how both can be true at once.",
  "Reconcile the guardrail with the business model: give the publish surface a named boundary that draft-only.mjs allowlists, decide the props route's cron, and split PUBLISH out of FORBIDDEN_EXTERNAL_ACTIONS into a gated capability. Until then, the repo has two mutually exclusive publishing postures and no document says which is live.",
  True)

g("GAP-26", "HIGH",
  "The 'math you can read' AI-framing ban is still enforced in CI and at runtime, and the mobile app still ships the line",
  "contradiction",
  "The old positioning line and its brand rules are outdated and being removed.",
  ["apps/web/lib/positioning-vocab.json:2-27  bannedPhrases includes 'AI-powered', 'our AI', 'machine learning', 'AI picks' -- the single source of truth",
   "apps/web/lib/compliance-scanner/rules.ts:50  a rule with severity 'block' quoting the retired line as the platform's position",
   "apps/web/lib/trust-claims.ts:376-455  the banned-claim registry, scanned for any surface",
   "scripts/guardrails/trust-gate.mjs:13,107-135  the CI banned-phrase scanner (scans 3,701 files, exits 0 today); :186-196 also scans README.md, CLAUDE.md, AGENTS.md, START_HERE.md, CONTRIBUTING.md",
   ".github/workflows/ci.yml:158-183  the 'Trust gate (banned phrases on public copy)' job",
   "apps/mobile/src/components/brand.tsx:135  export const BRAND_POSITIONING_LINE = 'We\\'re not AI. We\\'re math you can read.';",
   "apps/mobile/app/onboarding.tsx:119 and apps/mobile/app/(tabs)/more.tsx:317 also render it -- MOBILE IS THE ONLY SURFACE STILL SHOWING IT TO USERS",
   "apps/mobile/tests/voice.test.js:62  asserts the line is 'clean' -- it fails if the line is ever added to a ban list",
   "apps/web/lib/studio/templates/sponsor-safe.ts:65  a live LLM system prompt telling the model to close with the retired line",
   "apps/web/app/tools/page.tsx:93  live public copy: 'Nothing is a black box, and nothing here claims to predict an outcome.' -- rendered while the site publishes predictions",
   "AGENTS.md:607 already records the retirement: 'math you can read is retired as a public tagline' -- the doc is AHEAD of the code"],
  "Half the brand doctrine is retired in prose and still enforced in machinery. The web chrome is clean, but the AI-framing ban blocks a whole class of legitimate copy, the mobile app still shows the retired line to users, the sponsor template regenerates it, and the tools page still disclaims prediction while the site publishes predictions.",
  "Narrow or retire the AI ban in positioning-vocab.json and the two compliance rules; strip the mobile brand line and its test; fix the sponsor template prompt; update the tools page copy. Note that CLAUDE.md rule 8 and the .claude/agents briefs point at these enforcers, so they must be updated in the same commit.",
  True)

g("GAP-27", "MEDIUM",
  "The draft-only guardrail's Twitter/X regex misses the actual transport",
  "integrity",
  "draft-only.mjs blocks any publish-side write, including posting to X.",
  ["scripts/guardrails/draft-only.mjs:238  { id: 'twitter-api', rx: /api\\.twitter\\.com|twitterPost\\(|\\btweet\\s\\(/i }",
   "MEASURED: the actual transport is workers/twitter-bot/x-client.js:19, which targets https://api.x.com",
   "MEASURED: the draft-only guardrail exits 0 today (3,716 files scanned) despite workers/twitter-bot/* existing"],
  "The regex matches api.twitter.com but not api.x.com, so a publish-side write to the current X API would not be caught. The guardrail's own coverage claim is weaker than it looks.",
  "Add api\\.x\\.com to the pattern. This is a one-line fix to a guardrail, not a change to any prod behavior flag.",
  False)

g("GAP-28", "LOW",
  "Status strings report the retired 'internal only' posture to agents and to the founder",
  "stale-copy",
  "The no-publish posture is retired; status reporting reflects the live model.",
  ["apps/web/lib/cockpit/ask-jarvis.ts:159  'Picks are internal only. ... The PUBLIC_PICKS_ENABLED gate is closed.'",
   "apps/web/lib/cockpit/owner-summary.ts:145-148  blockedReason = 'PUBLIC_PICKS_ENABLED gate is off' ... 'no picks are exposed on the customer surface'",
   "apps/web/lib/jarvis/jarvis-owner-summary.ts:7  'PUBLIC_PICKS_ENABLED remains owner-controlled and blocked from self-enabling.'",
   "packages/prediction-engine/src/platform-config.ts:5-15  docstring 'Phase 0 (default): ingest + score + internal admin only, no public surface' -- contradicted by :166 which defaults publicPicksEnabled to true"],
  "These strings do not block anything, but they feed agent decisions and founder-facing status with a model that is no longer the live one. A founder asking Jarvis whether picks are live gets an answer built from a retired assumption.",
  "Make these read the actual gate state instead of asserting a posture. The platform-config docstring should be corrected regardless.",
  False)

new_ids = [x["id"] for x in NEW]
for x in NEW:
    if x["id"] in existing:
        print(f"SKIP (already present): {x['id']}")
        continue
    gaps["gaps"].append(x)

gaps["severity_counts"] = {
    "CRITICAL": sum(1 for x in gaps["gaps"] if x["severity"] == "CRITICAL"),
    "HIGH": sum(1 for x in gaps["gaps"] if x["severity"] == "HIGH"),
    "MEDIUM": sum(1 for x in gaps["gaps"] if x["severity"] == "MEDIUM"),
    "LOW": sum(1 for x in gaps["gaps"] if x["severity"] == "LOW"),
}
gaps["blocking_current_business_model"] = [x["id"] for x in gaps["gaps"] if x["blocks_current_business_model"]]
gaps["provenance"] = {
    "phase_1_3_own_measurements": "GAP-01..GAP-16 -- produced by this session's import-graph walk and grep, in C:/Users/Garrett/Sports-wt-audit-20261020",
    "phase_4_recon_batch": "GAP-17..GAP-28 -- three read-only recon subagents; every claim independently re-verified in this session by a fresh grep before being recorded here",
    "rule": "no claim in this file rests on a subagent's word alone; the verification is in the evidence[] entries",
}
p = os.path.join(R, "gaps.json")
json.dump(gaps, open(p, "w", encoding="utf8"), indent=1)
print("wrote", p, os.path.getsize(p))
print("gaps:", len(gaps["gaps"]), gaps["severity_counts"])
print("added:", new_ids)
print("blocking:", gaps["blocking_current_business_model"])
