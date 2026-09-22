# [2036] What Went Wrong with Data Lakes? A 15-Year Reality Check from the Field (arXiv:2606.08266v1)

**Citation:** Gahi, Y. (ENSA, Ibn Tofail University) (2026). *What Went Wrong with Data Lakes? A 15-Year Reality Check from the Field*. arXiv:2606.08266v1. URL: https://arxiv.org/abs/2606.08266
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF, ~23,500 words).
**Verdict:** ADAPT
**Rationale:** the lane's capstone risk paper. Every other ledger in this block is about making the lakehouse work; this one explains how it dies. Its six measurable swamp indicators can be computed on GSE's own store today, and its governance-debt framework is the organizational justification for the discipline the other 14 ledgers prescribe.

## 1. Research question
Fifteen years after Dixon (2010), data lakes show high failure rates across surveys. Why? The author synthesizes 64 sources (academic, analyst, practitioner) into seven recurring anti-patterns (the "Seven Deadly Sins"), proposes Governance Debt as the explanatory mechanism, governance gravity as the pull back to warehouse-style approaches, gives "data swamp" a measurable definition, and grounds it in ~500 field reality checks recorded over 15 years building/rescuing enterprise lakes in financial services and telecom across Morocco and West Africa.

## 2. Dataset / schema
- 64 sources: academic work, analyst reports (Gartner, NewVantage), practitioner accounts.
- Primary source: author's catalogue of ~500 field reality checks, assembled independently of the literature, landing on the same anti-patterns plus two under-reported dimensions: operational debt and engineering-discipline debt.
- Expert review: 8 practitioners (3 data architects, 2 governance PMs, 1 CDO, 2 consultants) for face validity; formal empirical validation explicitly deferred (validation designs proposed: multi-case criterion validity, inter-rater reliability, correlation with operational metrics, longitudinal tracking).

## 3. Method / model
- The Seven Deadly Sins as self-reinforcing system: (1) Ingest Without Purpose / Gluttony, (2) Schema Avoidance / Sloth, (3) Governance as Afterthought / Pride, (4) Technology Worship / Idolatry, (5) Democratization Illusion / Envy, (6) Skills Mirage / Greed, (7) Cost Delusion / Wrath. The loop, not any single sin, makes failure durable across technology generations.
- Governance Debt: compounding cost of deferred governance decisions; components = classic governance dimensions + operational debt + engineering-discipline debt.
- Governance gravity: the organizational pull back to structured warehouse approaches when governance gets hard (distinguished from McCrory's data gravity).
- Practitioner tools: Reality Check Framework, Stage-Based Intervention Matrix (stages 2–5 mapped to indicators and GDAM dimensions), GDAM rubric.
- Honest caveat: instruments are "testable hypotheses, not validated standards"; the paper is a critical retrospective, not an RCT.

## 4. Equations & assumptions
Operational swamp definition: a lake exhibiting 3+ of 6 measurable indicators: (1) no assigned ownership for >50% of assets; (2) metadata completeness <40%; (3) >40% of datasets unused in 90 days; (4) undocumented/untraceable lineage for critical pipelines; (5) duplicate datasets >20% of assets; (6) no automated quality validation on ingestion. Formulas + data sources given for each (catalog stewardship fields, catalog field completion, query logs e.g. Snowflake ACCOUNT_USAGE / Databricks query history / BigQuery INFORMATION_SCHEMA.JOBS, lineage tools, profiling tools with schema-similarity >90% or content-hash matches). Thresholds are declared heuristics to calibrate, not validated cutoffs; trajectory matters more than absolute values.

## 5. Features / target
N/A (meta-study/practitioner retrospective). Deliverables are the taxonomy, the measurable swamp definition, the GDAM rubric (5 dimensions: Metadata Completeness, Quality Observability, Access Governance, Lineage Traceability, Organizational Ownership — each read at Absent/Ad hoc/Partial/Established; deliberately no numeric score to avoid false precision), and the stage matrix.

## 6. Validation design
Literature convergence analysis (no averaging of incomparable failure rates — read as convergent signals), independent field-catalogue cross-check, expert panel review with documented protocol (semi-structured 45–60 min interviews, thematic analysis), proposed formal validation designs. Worked illustrative example of GDAM applied to a struggling program (lands High-Risk; prescription: ownership and metadata first).

## 7. Numerical results / baselines
- Convergent failure signals: Gartner 60–85% big data project failure (2015–17); NewVantage 2020: 98.8% of Fortune 1000 investing, only 37.8% data-driven; VentureBeat 87% of data science projects fail to reach production; NewVantage 2022: 92% of executives say culture, not technology, is the main obstacle; 83% of leaders call data literacy essential for every role, only 28% of orgs have reached it.
- Sins ranking: governance sins (purposeless ingestion, governance-as-afterthought) most frequently cited; democratization illusion least.
- Three sequential breaking points: (1) trust collapse (users build shadow systems; the Gartner swamp), (2) compliance shock (can't say what data is held, whence it came, who touched it — Capital One 2019: 100M+ records, $80M OCC fine), (3) remediation impossibility (retrospective governance costs more than rebuilding).
- Stage matrix: Stage 2 (Governance Deferral → ownership gaps, metadata incomplete, lineage undocumented; fix MC/OO); Stage 3 (Trust Erosion → unused datasets, quality issues, conflicting values; fix QO/LT); Stage 4 (Retreat to DW — governance gravity activates; achieve governance parity before decommission); Stage 5 (Archive State — all indicators; evaluate rebuild vs remediation).

## 8. Code / data availability
No code. The ~500-case field catalogue is the author's private primary source; the six swamp indicators are implementable from standard catalog/query-log tooling.

## 9. Leakage & limitations
- Adversarial: the framework is unvalidated — expert review gives face validity only; all thresholds are heuristics; the author is admirably explicit about this ("testable hypotheses, not validated standards"). Treat prescriptions as directional, not calibrated.
- Single-author practitioner study; the field catalogue is not public or independently auditable; emerging-market (Morocco/West Africa) vantage is a stated lens, not a control.
- 2026 preprint; literature cutoff mid-2020s. The lakehouse/data-mesh verdict — "technology has advanced, the organizational record has barely moved" — is an assessment, not a measurement.
- The Sins taxonomy is a mnemonic, not a causal model; the self-reinforcing loop is a diagram, not an identified causal graph.

## 10. GSE overlap
No duplication. Capstone risk paper for the whole lane: 2022–2035 are the engineering answers; this is the organizational audit of whether they'll be operated or abandoned. Pairs with 2030 (maintenance), 2035 (manifest discipline), 2031 (frozen prefix contract).

## 11. GSE implementation spec
GSE is a one-person operation — which makes governance debt accrue *faster* (no one notices) and *slower* (no org politics). Adopt the measurable parts:
1. **Swamp-indicator dashboard for GSE's store:** compute all six indicators quarterly on the feature store / signal inventory: (1) ownership — every table/signal has an owner field (default: Garrett; missing = flag); (2) metadata completeness — required fields per table (definition, source, refresh cadence, owner); target ≥90% (stricter than the paper's 40% because GSE is data-intensive in the paper's sense); (3) dormancy — signals unused in 90 days flagged for deprecation review; (4) lineage — every ingested signal traces to a source + transform version; (5) duplication — schema-similarity/content-hash sweep for duplicate signal tables, target <20%; (6) ingestion validation — automated quality checks on every ingestion pipeline (ties to 2032's probe pattern).
2. **GDAM self-review quarterly:** read the five dimensions at Absent/Ad hoc/Partial/Established; anything Ad hoc or worse is the quarter's priority fix.
3. **Governance-debt ledger entry:** each deferred governance decision (e.g., "skip metadata on new signal") gets a one-line entry in the research log with a date to revisit — the paper's core mechanism (deferred decisions compound) made visible.
4. **Sin-2 guard:** schema avoidance is the lane-specific risk — every new signal lands with its schema, units, and source documented at ingestion (2035's manifest pattern extended with metadata fields), never "raw now, documented later."

## 12. Reproducible test
Run the six-indicator computation on GSE's current store: produce a one-page swamp report (indicator, value, threshold, breach/no-breach). Assert: (a) computation completes from existing logs/catalog alone — if any indicator can't be computed, that's itself a Stage-2 finding (missing diagnostic instrumentation, per the paper's meta-problem); (b) re-run quarterly and plot trajectory; a deteriorating trajectory over two consecutive quarters triggers the Stage-Based Intervention Matrix actions.

## 13. Acceptance / rejection gate
ADOPT the dashboard + quarterly GDAM iff: (a) all six indicators are computable (no missing-instrumentation gaps) within one quarter; (b) metadata completeness ≥90% and duplication <20% at first full run; (c) quarterly re-run takes <2 hours of operator time. If indicator (3) dormancy shows >40% of signals unused in 90 days, trigger the paper's Stage-3 intervention: quality gates + a deprecation review — REJECT the instinct to keep ingesting (Sin 1). REJECT treating thresholds as targets — trajectory is the metric (per the paper's own calibration guidance).

## 14. Improvement experiment
The paper's stated gap is empirical validation of GDAM. GSE, as a single-operator lakehouse, is a natural n=1 longitudinal case: publish the quarterly GDAM profiles and swamp-indicator trajectories for one season in the Sports repo — the first public small-team longitudinal data point the paper's validation design calls for. Passive logging, one page per quarter, real contribution to the literature's validation agenda.
