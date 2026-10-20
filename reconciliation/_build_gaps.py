#!/usr/bin/env python3
"""Emit reconciliation/gaps.json — structured gap + contradiction findings."""
import json, os

WT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(WT, "reconciliation")

tiers = json.load(open(os.path.join(R, "tiers.json"), encoding="utf8"))
live = json.load(open(os.path.join(R, "live-path.json"), encoding="utf8"))
reach = json.load(open(os.path.join(R, "reachability.json"), encoding="utf8"))

G = []


def g(id, severity, title, category, claim, evidence, impact, action, blocking=None):
    G.append({
        "id": id, "severity": severity, "title": title, "category": category,
        "claim_tested": claim, "evidence": evidence, "impact": impact,
        "recommended_action": action, "blocks_current_business_model": blocking,
    })


g("GAP-01", "CRITICAL",
  "Oct-18 published picks are clamped into a fixed window, not the engine's output",
  "integrity",
  "The live board that shipped Week 6 sides/totals/MLs/props/SGPs on 2026-10-18 shows the GSE engine's published confidence, edge score and pick grade.",
  ["scripts/publish_late_sun_mon_live_free.py:498  true_prob = max(0.6020, min(0.6160, sig_attr[\"trueProb\"]))",
   "scripts/publish_late_sun_mon_live_free.py:502  edge_score = min(71.2, max(68.4, sig_attr[\"edgeScore\"]))",
   "scripts/publish_late_sun_mon_live_free.py:503  confidence = max(66, min(69, sig_attr[\"confidence\"]))",
   "scripts/publish_late_sun_mon_live_free.py:504  tier = \"FREE\"",
   "scripts/publish_late_sun_mon_live_free.py:505  pick_grade = \"STRONG_PLAY\"   # hardcoded, no threshold",
   "scripts/sync_week6_db.py:257-261,758-761  # the EARLIER writer derives these from raw_edge (no clamp)",
   "apps/web/lib/board/state.ts:495, apps/web/lib/board/load-gate-slate.ts:580, apps/web/lib/board/passes.ts:154  # public board reads isPublished:true rows"],
  "Published confidence, edgeScore and pickGrade are not engine outputs. The grade is hardcoded to the strongest value for every pick regardless of the model's own view. Any downstream CLV, settlement, calibration or ledger analysis on these rows measures the clamp, not the model.",
  "Remove all four clamps; publish sig_attr values unmodified. Add a CI assertion that published pickGrade is derived, never literal.",
  True)

g("GAP-02", "CRITICAL",
  "The walk-forward emission gate is closed on the path that produces nothing and absent on the path that published",
  "contradiction",
  "The walk-forward gate (walk-forward-gate.json) protects emission of picks.",
  ["packages/ingestion-pipeline/walk-forward-gate.json  ->  \"passed\": false, \"crps\": null, \"gaussian_close_crps\": 7.154021 (gate requires CRPS <= 7.099)",
   "packages/ingestion-pipeline/src/walk-forward-emission-gate.ts:19-31  readEmissionGate() -> emissionBlocked(), fail-closed on missing file",
   "packages/ingestion-pipeline/src/generate-signal-slate.ts:265  if (emissionBlocked(opts.emissionGate)) -> returns 0 picks, note 'emission gate closed: 0 picks, 0 parlays, 0 DFS'",
   "scripts/publish_late_sun_mon_live_free.py:589,603  writes picks with \"isPublished\": true, importing compute_pick_probability_from_db_signals directly",
   "grep -rn 'publish_late_sun_mon_live_free' --include='*.yml' --include='*.yaml' --include='*.json' --include='*.sh'  ->  no hits (not on any cron)"],
  "The TS board-fill slate emits nothing because its gate is closed; the content that actually shipped bypassed the gate entirely. The gate is doing no safety work.",
  "Decide the gate's real scope. Either (a) make every publish path consult readEmissionGate(), or (b) delete the gate from the TS path and re-home it where it has meaning. Also resolve the outstanding CRPS<=7.099 criterion.",
  True)

g("GAP-03", "CRITICAL",
  "The Week 6 publish path bypasses the entire TypeScript honesty/gate stack",
  "integrity",
  "Published picks pass the engine's publish gates (min confidence, bookmaker count, line integrity, adverse-edge withhold, fixture confirmation, proof-of-record, pick proof receipt).",
  ["packages/prediction-engine/src/guards/, src/honesty/, src/promotion/, src/proof-of-record.ts, src/pick-proof-receipt.ts  # the gate stack",
   "scripts/publish_late_sun_mon_live_free.py:20-28  imports ONLY { REPO_ROOT, TEAM_ABBR_MAP, get_database_url, make_cuid, compute_real_continuity_by_team, load_active_db_signals, compute_pick_probability_from_db_signals } from scripts.sync_week6_db",
   "scripts/publish_late_sun_mon_live_free.py:99-300  PLAYS table hardcodes market_fair_prob (mostly 0.5000) and structural_delta_prob per pick",
   "scripts/publish_late_sun_mon_live_free.py:607  INSERT INTO picks (... \"modelVersion\", \"generatedAt\", \"dataFreshnessAt\", result, \"isPublished\" ...)"],
  "The published board has no adverse-edge withhold, no minimum-confidence gate, no bookmaker-count floor, no line-integrity snap to a real posted line, no fixture confirmation, no proof-of-record / pick-proof-receipt. Only the paid-odds cron path (process-sport.ts) enforces them.",
  "Route the Week 6 path through the same gate sequence, or make the Python writer call the TS gates via a subprocess/CLI. Hardcoded market_fair_prob must come from the de-vigged book consensus.",
  True)

g("GAP-04", "HIGH",
  "The TypeScript Sovereign Signal Plane has zero call sites; a Python re-implementation is what ships",
  "contradiction",
  "packages/prediction-engine/src/index.ts exports the Sovereign Signal Plane and it is wired into the live board.",
  ["packages/prediction-engine/src/game-context.ts:1065  export function computeSovereignSignalPlaneContribution(...)  -- DEFINITION ONLY",
   "packages/prediction-engine/src/scoring.ts:26 (import) and :37 (re-export)  -- the import exists solely to re-export; there is no invocation",
   "packages/prediction-engine/src/index.ts:36  barrel export",
   "repo-wide grep for computeSovereignSignalPlaneContribution  ->  4 hits total: 1 definition, 2 re-export, 1 mention in a Python docstring (intelligence/pipeline/emit_week6_master_product.py:1272)",
   "scripts/sync_week6_db.py:181-274  compute_pick_probability_from_db_signals -- the function that actually computes trueProb",
   "scripts/sync_week6_db.py:212  weight = h_row[\"weight\"]  -- weight read from Neon, not from the frozen TS constant",
   "packages/prediction-engine/src/game-context.ts:1026  SOVEREIGN_SIGNAL_PLANE_WEIGHTS -- 17 keys (frozen constant)"],
  "Editing SOVEREIGN_SIGNAL_PLANE_WEIGHTS in TypeScript changes nothing that ships. There are two sources of truth for one equation: a frozen TS constant (17 keys) and DB weights (14 keys).",
  "Pick one implementation. Either delete the TS function and re-export the Python behaviour contract in docs, or make the TS function the only one and have sync_week6_db.py call it (e.g. via a small Node CLI).",
  True)

g("GAP-05", "HIGH",
  "The 3 highest-weighted NGS keys are activated in the DB but excluded from the live Python key list",
  "partial",
  "The 17-key Sovereign Signal Plane operates with vision/FTN/QBR/snaps/cognitive/NGS weights as documented.",
  ["scripts/sync_week6_db.py:116-131  SOVEREIGN_SIGNAL_KEYS -- 14 keys; grep -n 'ngs\\.' scripts/sync_week6_db.py -> NO HITS",
   "scripts/ingest_week6_signals_db.py:321-332  explicitly activates the three NGS rows in `signals`: SET weight = CASE ... WHERE key IN ('ngs.avg_separation','ngs.ryoe_per_att','ngs.cpoe') AND weight = 0",
   "packages/prediction-engine/src/game-context.ts:1026  SOVEREIGN_SIGNAL_PLANE_WEIGHTS includes ngs.avg_separation 0.085, ngs.ryoe_per_att 0.095, ngs.cpoe 0.105"],
  "Three active DB signal rows are ingested, paid for, and then never read by the scorer. NGS contributes 0 to every published Week 6 trueProb.",
  "Add the three ngs.* keys to SOVEREIGN_SIGNAL_KEYS in scripts/sync_week6_db.py, or document them as intentionally excluded and stop activating them.",
  False)

g("GAP-06", "HIGH",
  "The Reasoning Engine output is computed, stored, displayed -- and never enters the probability",
  "shadow",
  "The Reasoning Engine reasons over every signal and updates beliefs; the corpus/mind evaluation feeds the engine's belief.",
  ["packages/prediction-engine/src/reasoning/corpus-evaluator.ts:937  evaluateFullCorpus -- runs, claims 2,179 arXiv papers + 429 Kaggle + 499 OpenAlex",
   "packages/prediction-engine/src/reasoning/situational-engine.ts:155-158  corpusEvaluation -> corpusSituationalShift",
   "packages/ingestion-pipeline/src/process-sport.ts:1454  corpusSituationalShift written into pick.factorBreakdown.situationalReading",
   "apps/web/app/api/ops/ranked-picks/route.ts:179  exposed on an internal ops route",
   "packages/prediction-engine/src/ranking-prob.ts:56-58  corpusAdjustment / corpusWeight declared; :57 comment 'Default 0.0 unpromoted'",
   "repo-wide grep corpusAdjustment outside ranking-prob.ts -> NO production caller",
   "packages/prediction-engine/src/reasoning/mind-reasoning.ts:1059  evaluateMindReasoning -> situationalPick (a model fair probability) also never enters trueProb"],
  "The Layer-2 literature corpus and the 5,148-record mind corpus influence nothing that is published. They are decorative metadata on the pick. The engine's 'belief' is market fair value + hardcoded structural delta + continuity delta + signal plane.",
  "Either (a) promote the corpus into ranking via the existing corpusWeight seam once the documented pre-registration (N>=500 settled, delta Brier >= 0.002) is actually run and passed, or (b) remove the corpus/mind evaluation from the scoring path so the repo stops claiming it reasons.",
  True)

g("GAP-07", "HIGH",
  "Corpus and mind-corpus file discovery is hardcoded to a developer machine, so production evaluates zero items",
  "integrity",
  "The Reasoning Engine ingests thousands of literature records continuously.",
  ["packages/prediction-engine/src/reasoning/corpus-evaluator.ts:835-850  findCorpusDirectories() probes process.cwd(), ../.., .., and the literal 'C:/Users/Garrett/Sports'",
   "packages/prediction-engine/src/reasoning/mind-reasoning.ts:130-139  findMindCorpusPaths() -- two repo-relative candidates plus two literal 'C:/Users/Garrett/Sports/...' paths",
   "packages/prediction-engine/src/reasoning/mind-reasoning.ts:150  loadMindCorpus THROWS 'Mind corpus file not found. Checked candidate paths: ...'",
   "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl  exists in the repo (7,999,749 bytes, 5,148 records) -- so a repo-root cwd resolves it, but a Vercel build dir does not"],
  "On Vercel the corpus evaluator loads 0 items (returns [] rather than throwing) and the mind corpus throws unless a repo-relative path happens to resolve. Either way the reasoning corpus is absent in production while present in local dev -- the exact class of drift this audit is about.",
  "Resolve both corpora via an explicit env var (GSE_CORPUS_DIR / GSE_MIND_CORPUS) with a repo-relative fallback, bundle the corpus in the build, or skip the evaluation explicitly when unavailable instead of silently evaluating 0 items.",
  True)

g("GAP-08", "HIGH",
  "No self-improvement loop exists; the continual-learning and recalibration libraries have no consumers",
  "missing",
  "The engine gets smarter every day; it updates beliefs continuously.",
  ["packages/prediction-engine/src/continual/1612-00796v2-ewc-feature-anchoring.ts:35,51,62,78  ewcPenalty / ewcGradient / anchoredStep / importanceOverlap -- BARREL_ONLY",
   "packages/prediction-engine/src/continual/1904-10644v1-certainty-weighted-continual-updates.ts:26,104,132  naturalGradLogistic / steinCoresetGreedy / mmdCoreset -- BARREL_ONLY",
   "packages/prediction-engine/src/continual/2304-01239v1-teacher-student-continual.ts:26,84  teacherEmaUpdate / forgettingAudit -- BARREL_ONLY",
   "packages/prediction-engine/src/continual/adaer-replay.ts:2,43  interferenceScores / adaErBufferSelect -- ORPHAN",
   "packages/prediction-engine/src/continual/online-metric-suite.ts:2,33  brierScore / onlineMetricSuite -- ORPHAN",
   "packages/prediction-engine/src/online-beta-recalibration.ts:107,116,279  applyOnlineBeta / runOnlineBetaRecalibration / fitResAwareBeta -- ORPHAN",
   "packages/prediction-engine/src/calibration-ladder.ts:62,142,228  plattScaling / binnedEmpiricalCalibration / buildCalibrationLadder -- ORPHAN",
   "packages/prediction-engine/src/calibration-apply.ts:73  buildCalibrator -- imported only by apps/web/lib/calibration/calibration-audit-harness.ts:26 (an audit harness, not the scoring path)",
   "packages/prediction-engine/src/calibration-apply.ts:9-17  'Wiring this into the live scoring/display path is a deliberate, audited MODEL_VERSION step'"],
  "21 of 22 packages/prediction-engine/src/calibration/* modules, plus all 5 continual/* modules, plus the online-beta and calibration-ladder recalibration paths, have zero production consumers. The only calibration effect in production is a withhold (packages/prediction-engine/src/calibration/pathwise-defect.ts:201 calibrationHistoryWithholds, imported at scoring.ts:14) which can block a pick but never adjust one. The system cannot currently learn from its own results.",
  "Pick the one recalibration path to promote (online-beta-recalibration is the natural candidate -- it is designed for exactly this), wire it behind the existing promotion gates, and land the pre-registration it requires. Until then, stop describing the engine as self-improving.",
  True)

g("GAP-09", "MEDIUM",
  "The market fair probability for most published Week 6 picks is the placeholder 0.5000",
  "integrity",
  "Market fair value is the de-vigged sportsbook consensus (removeVig over averaged implied probabilities).",
  ["packages/prediction-engine/src/scoring.ts:187  removeVig(homeProb, awayProb) -- the real implementation",
   "packages/prediction-engine/src/scoring.ts:138  averageAmericanPrices -- the real implementation",
   "scripts/publish_late_sun_mon_live_free.py:127,150,171,194,214,235,257,279  \"market_fair_prob\": 0.5000  (8 of 10 visible plays)",
   "scripts/publish_late_sun_mon_live_free.py:106  0.5022 and :300  0.4978  (the other two)",
   "scripts/publish_late_sun_mon_live_free.py:507  raw_edge = round(true_prob - play[\"market_fair_prob\"], 4)"],
  "Published raw edge for most Week 6 picks was computed against 0.5000 rather than a de-vigged book consensus. With trueProb clamped to [0.6020,0.6160], the published raw edge is 0.1020-0.1160 by construction, not by model.",
  "Populate market_fair_prob from the live de-vigged multi-book consensus at publish time, and fail closed when it is unavailable rather than defaulting to 0.5000.",
  True)

g("GAP-10", "MEDIUM",
  "Sovereign Signal Plane weights are duplicated across TS constant, DB column, and Python key list with no single owner",
  "contradiction",
  "The plane's 17 keys and weights are frozen in SOVEREIGN_SIGNAL_PLANE_WEIGHTS.",
  ["packages/prediction-engine/src/game-context.ts:1026  SOVEREIGN_SIGNAL_PLANE_WEIGHTS (frozen const, 17 keys)",
   "scripts/sync_week6_db.py:116-131  SOVEREIGN_SIGNAL_KEYS (14 keys, hardcoded tuple)",
   "scripts/ingest_week6_signals_db.py:236  (\"vision.soe_yd\", \"TRACKING\", v[\"soe_yd\"], v[\"soe_yd\"], 0.085, \"ngs_vision_2026\", ...)  -- weights hardcoded AGAIN at ingest",
   "scripts/sync_week6_db.py:212  weight read from the signals.weight column"],
  "The same weight appears in three places. They agree today (0.085 appears in all three), but there is no test asserting agreement and no generation step. A weight change in one place silently desynchronises the engine from the board.",
  "Generate the Python key list and the ingest weights FROM the TS constant (single source), and add a test asserting DB weight == SOVEREIGN_SIGNAL_PLANE_WEIGHTS[key].",
  False)

g("GAP-11", "MEDIUM",
  "395 of 1014 prediction-engine modules are reachable only through the barrel or not at all",
  "dead-code",
  "Research fed into prior sessions was implemented in the engine.",
  ["reconciliation/tiers.json -- PROD 428 / BARREL_ONLY 189 / ORPHAN 397 of 1,014 non-test modules",
   "reconciliation/tiers.json -- PROD_arxiv_derived 99, BARREL_ONLY_arxiv_derived 19, ORPHAN_arxiv_derived 180",
   "reconciliation/live-path.json -- the live TS publish paths touch only 59 PE modules (19 on the paid-odds path; 40 more on the emission-closed board-fill path)",
   "packages/prediction-engine/src/scoring.ts:14-34 -- the scoring closure is 11 modules: calibration/pathwise-defect, constants, edge-engine, game-context, honesty/devig-method-compare, poisson, published-line, ranking-prob, scoring, skellam, team-rates",
   "examples of BARREL_ONLY arXiv modules: continual/1904-10644v1-certainty-weighted-continual-updates, bayesian/2002-01193-copula-hmm-momentum, markets/2112-13001v3-dcp-prop-framework, metalearning/1703-03400v3-maml-rookie-adapter, invention/1905-11481v2-ai-feynman-separability",
   "437 of the unreachable modules have a sibling .test.ts -- they are tested but uninvoked"],
  "A large fraction of the research corpus is implemented, unit-tested, and never executed by a shipped path. This is the concrete form of the 'everything gets wired' backlog gap named in the brief.",
  "Generate a per-module reachability report in CI. For each BARREL_ONLY module, decide: promote to a consumer, or mark it explicitly shadow with a documented promotion criterion. Do not delete tests -- the modules are the inventory of what research exists.",
  False)

g("GAP-12", "MEDIUM",
  "The only calibration effect in production is a withhold; no calibration map is applied to any published probability",
  "partial",
  "Calibration maps are built offline from settled history and can be applied optionally.",
  ["packages/prediction-engine/src/scoring.ts:14  import { calibrationHistoryWithholds } from \"./calibration/pathwise-defect.js\"  -- the ONLY calibration import in the scoring path",
   "packages/prediction-engine/src/calibration/pathwise-defect.ts:201  calibrationHistoryWithholds -> boolean (block/no-block)",
   "packages/prediction-engine/src/calibration-apply.ts:73  buildCalibrator -- imported only by apps/web/lib/calibration/calibration-audit-harness.ts:26",
   "packages/prediction-engine/src/calibration-apply.ts:9-17  'Until there is a settled canonical sample to fit against AND that audited step is taken, buildCalibrator returns an inactive calibrator that is a no-op identity map'",
   "packages/prediction-engine/src/calibration-apply.ts:31  DEFAULT_MIN_CALIBRATION_SAMPLE = 100",
   "packages/prediction-engine/src/edge-engine.ts:222-231  the calibrator seam IS wired into assessEdge -- but no caller passes input.calibrator"],
  "The edge engine has a working calibration seam (edge-engine.ts:224-231) and scoring.ts DOES thread a calibrator into it -- packages/prediction-engine/src/scoring.ts:832 passes input.context?.probabilityCalibrator -- but nothing in production ever SETS probabilityCalibrator on the context. grep for probabilityCalibrator across the repo returns only scoring.ts:832 and :1499 (readers), packages/types/src/index.ts:616 (the type), and packages/prediction-engine/src/__tests__/calibration-seam-threading.test.ts (the only writer -- a test). dynamic-context-builder.ts and process-sport.ts never populate it. The seam is live but permanently empty, so published probabilities are uncalibrated by construction. The memory note 'Brier 0.2484 vs coin 0.25' is consistent with a ranking that is monotone but ~5.2pt inflated and never corrected.",
  "Either fit a calibration map from settled picks and set context.probabilityCalibrator at context-build time (packages/ingestion-pipeline/src/dynamic-context-builder.ts), or explicitly declare the engine uncalibrated in public copy.",
  False)

g("GAP-13", "MEDIUM",
  "The reasoning surfaces are architecturally forbidden from ever being a pick",
  "contradiction",
  "The Reasoning Engine produces picks with edges that get published.",
  ["packages/prediction-engine/src/reasoning/aggregation-trace.ts:229  publishablePick: false",
   "packages/ingestion-pipeline/src/reasoning-trace.ts:139  'A reasoning trace is not a pick. publishablePick is false. beatsBookClaim is false.'",
   "packages/ingestion-pipeline/src/reasoning-trace.ts:202  publishablePick: false",
   "packages/ingestion-pipeline/src/gse-score-bridge.ts:37  'GSE action score is an internal gate, not a pick. publishablePick is false for every kernel decision, including PLAY and LEAN.'",
   "packages/ingestion-pipeline/src/gse-score-bridge.ts:297  publishablePick: false",
   "packages/prediction-engine/src/reasoning/situational-engine.ts:169  divergenceIsEdge: false"],
  "The type system encodes 'reasoning never becomes a pick' as a literal false in five places. This was the correct posture while predictions were unpublished. Under the current model it means the Reasoning Engine is structurally barred from ever being the thing that is published -- the opposite of the stated product direction.",
  "This is a doctrine decision, not a patch. Either the reasoning layer stays a non-pick advisory layer (and the product statement should say the engine publishes market-anchored picks with reasoning as explanation), or the type is changed to allow a reasoning-derived pick through a promotion gate.",
  True)

g("GAP-14", "LOW",
  "Corpus-evaluator coverage is asserted in a docstring but not enforced",
  "missing",
  "Every genuine paper in the corpus is individually parsed and executed against live context.",
  ["packages/prediction-engine/src/reasoning/corpus-evaluator.ts:4-6  'Every genuine paper, study, and dataset in the corpus (2,179 arXiv papers, 429 Kaggle datasets, 499 OpenAlex works) is individually parsed'",
   "packages/prediction-engine/src/reasoning/corpus-evaluator.ts:26-29  'Promotion Gate: Base production weight is frozen at 0.0 until verified on a pre-registered holdout with N >= 500 settled games and delta Brier >= 0.002' -- no code enforces either condition",
   "packages/prediction-engine/src/reasoning/corpus-evaluator.ts:121  CORPUS_EVALUATOR_DEFAULT_WEIGHT = 0.05"],
  "The docstring's coverage and the promotion-gate criteria are prose, not invariants. A future reader will reasonably believe the gate is enforced.",
  "Turn the promotion gate into a code check (assert weight == 0 until a signed pre-registration artifact with N>=500 exists), or reword the docstring to 'planned'.",
  False)

g("GAP-15", "LOW",
  "walk-forward-gate.json self-documents an unimplemented research path",
  "missing",
  "The walk-forward gate evaluates the Laplace CRPS.",
  ["packages/ingestion-pipeline/walk-forward-gate.json  \"rerun\": { \"n\": 2462, \"gaussian_close_crps\": 7.154021, \"crps\": null, \"reason\": \"Gaussian line reproduced with crps_gaussian from intelligence/ratings/engine_math.py. Laplace CRPS 7.1597 was not recomputed: no Laplace margin module on this branch, and none was written.\" }"],
  "The gate's own admission is that its primary metric was never computed on this branch. The gate is therefore closed on a criterion that was never evaluated.",
  "Implement the Laplace margin module the gate needs, or re-scope the gate to the Gaussian CRPS it actually measures and restate the threshold.",
  False)

g("GAP-16", "LOW",
  "Published copy is generated from a separate hardcoded reason table, not from the engine's factor breakdown",
  "contradiction",
  "Public reasoning explains why the engine picked the side.",
  ["scripts/publish_late_sun_mon_live_free.py:511-521  full_reasoning = play[\"reasoning\"] (from the hardcoded PLAYS table)",
   "scripts/publish_late_sun_mon_live_free.py:512-517  fb = {\"factors\": [...]} -- four hardcoded factor names with fixed weights 30/25/25/20",
   "packages/ingestion-pipeline/src/process-sport.ts:1446-1470  the TS path writes pick.factorBreakdown (real factors) instead",
   "scripts/publish_late_sun_mon_live_free.py:589  \"isPublished\": true"],
  "The public factor breakdown on the shipped board is a static four-line table with the same weights for every pick, while the engine's own factor breakdown is computed. The 'why' shown to customers is not the engine's 'why'.",
  "Publish the engine's factorBreakdown. If the copy must be human-readable, generate it FROM the breakdown rather than replacing it.",
  False)

out = {
    "audit": "GSE research-to-code reconciliation -- gaps and contradictions",
    "audited_ref": "origin/main@4fa5330f4",
    "severity_counts": {
        "CRITICAL": sum(1 for x in G if x["severity"] == "CRITICAL"),
        "HIGH": sum(1 for x in G if x["severity"] == "HIGH"),
        "MEDIUM": sum(1 for x in G if x["severity"] == "MEDIUM"),
        "LOW": sum(1 for x in G if x["severity"] == "LOW"),
    },
    "blocking_current_business_model": [x["id"] for x in G if x["blocks_current_business_model"]],
    "gaps": G,
}
p = os.path.join(R, "gaps.json")
with open(p, "w", encoding="utf8") as f:
    json.dump(out, f, indent=1)
print("wrote", p, os.path.getsize(p))
print(json.dumps(out["severity_counts"], indent=1))
print("blocking:", out["blocking_current_business_model"])
