# Grok Heavy Prompts — GSE Document Ingestion

*Written 2026-10-02 by Motif. Run in order. Prompt 1 is the money — one Heavy run, maximum yield. Prompt 2 is optional, only if quota allows.*

*Prerequisite: `Beexly/agent-bus@main` must show 5,102 files under `research/` (3,728 corpus-intelligence + 1,374 arxiv-sweep, verified 2026-10-02, main SHA `aa0f9169`). Verify the count before running.*

---

## PROMPT 1 — Full ingestion (run this first, and if quota is tight, run ONLY this)

```
You are running as Grok Heavy: up to 16 parallel agents that work independently,
then debate toward a final answer. Use that structure deliberately.

MISSION
Ingest every document in these two directories and turn them into an
actionable build list for the Galaxy Sports Edge (GSE) NFL prediction engine:

- https://github.com/Beexly/agent-bus/tree/main/research/corpus-intelligence (~3,728 files: research briefs, metric catalogs, method writeups, digests)
- https://github.com/Beexly/agent-bus/tree/main/research/arxiv-sweep (~1,374 files: arXiv paper extractions on sports prediction, ML, calibration, causal inference)

CURRENT REPO STATE — Beexly/Sports, main @ 2026-10-02 (so you don't recommend what's already built)
- PR #1020 MERGED (merge 651f51f7a6fbb4d330c1c54f8f470de75fb661d7): head 9c7c7ac3 passed Test, Model freeze, Build. 6 files, +90 lines, no MODEL_VERSION change.
- PR #1018 OPEN (OL deadline + GSI): Test, Build, Model freeze passed; Codacy failed. Not merged.
- PR #1019 OPEN (DARK evaluators): Test failed (tsc exit 2 in worker-pick-generation). Not merged.
- PR #1016 OPEN (trueProb quarantine): Test still running.
- PR #860 OPEN ([cat:C5] edge-rank + offline bake-off): Test failed. The only C5-tagged PR; no C6 PR exists.
- Signal registry: 47 signals, 46 no / 1 partial. T1 partial, analyze() returns INVALID. Props are the open frontier.
- Do NOT recommend rebuilding bridge-model.ts (Brier 0.2237 vs spread-bucket 0.2120 on 285 sealed 2025 games) or re-litigating paper 1704.00197 (in-game logistic, not our least-squares rating model).
- Rank your build list AFTER this state: skip anything already merged, flag anything that collides with an open PR.

WHAT GSE IS (so you can judge what matters)
GSE is an NFL prediction engine. It reasons over game signals (quarterback play,
coaching schemes, offensive line, injuries, weather, rest) and outputs calibrated
win probabilities. Its pipeline is: research → wire the signal in → weight it →
calibrate it → test it → polish. Anything uncalibrated runs in shadow, never
published. "Actionable" means: a signal we can wire, a method we can implement,
a calibration technique we can use, or a dataset we can train on.

AGENT ROLES — assign your parallel agents as follows
- 4 agents as STATISTICIANS: read for methods, math, estimators, calibration techniques
- 4 agents as FOOTBALL ANALYSTS: read for domain insight — what actually wins games
- 4 agents as SKEPTICS: read to attack — which claims are unproven, overfit, or misapplied
- 4 agents as SYNTHESIZERS: do not read raw docs; they only read the other agents' outputs

WORK IN FIVE INTERNAL PHASES. Do not skip phases. Each phase's output feeds the next.

PHASE 1 — MAP (statisticians + analysts)
Walk the full file tree of both directories. Produce a catalog: total files read,
categories found, and duplicates flagged (known: arXiv 1704.00197 appears twice,
2603.09896 appears three times — find all others). Report counts per category.
If you cannot read a file, list it as unread — never silently skip.

PHASE 2 — EXTRACT (statisticians + analysts, divided by category)
For every document, extract: (a) the method or signal in one sentence,
(b) the math/estimator if any, (c) the dataset and sample size, (d) the claimed
result with its metric, (e) the license or provenance if stated,
(f) GSE relevance: HIGH / MEDIUM / LOW / NONE with one-line justification.
Be terse. One tight paragraph per document, not essays.

PHASE 3 — SYNTHESIZE (synthesizers read Phase 2 output only)
Across all extractions: (a) which signals/methods compound — i.e., combine into
something stronger than any piece alone, (b) which claims contradict each other
and which side has the stronger evidence, (c) rank the top 25 by expected GSE
value, (d) list what is already standard practice (not an edge).

PHASE 4 — CHALLENGE (skeptics read the Phase 3 top-25 only)
Attack each of the 25: is the result overfit? Was it tested out-of-sample?
Does the method transfer to NFL, or was it built for another sport/domain?
Would it survive the admission test: shuffled-time placebo, adds value beyond
the betting market, threshold tuned on a disjoint fold? Kill anything that
doesn't survive. Be ruthless — a killed claim is a correct output.

PHASE 5 — DELIVER (synthesizers, final)
The build list, ordered by expected value. For each surviving item:
1. What to build (one sentence)
2. Source file path(s) on the branch
3. Implementation sketch (what code, what data in, what number out)
4. The test that proves it works (what held-out check, what metric, what bar)
5. Shadow or publish-ready, and why

RULES
- Never invent a result, a number, or a citation. If a document doesn't state it, say so.
- A restrictive license means learn-the-method, not copy-the-code. Flag licenses.
- Duplicates get extracted once and flagged, not double-counted.
- If the branch has fewer than ~5,000 files under research/, say so and stop — the upload is incomplete.
```

---

## PROMPT 2 — Deep dive (optional; only run if quota allows after Prompt 1)

```
You are running as Grok Heavy. This is a follow-up to a prior ingestion run over
the GSE research corpus (Beexly/agent-bus, branch motif/research-push-all).

The prior run produced a ranked build list. Take the TOP 10 items from that list
and go deeper on each, using your parallel agents as follows:
- Half your agents: find every corroborating or contradicting source — inside the
  corpus AND on the open web. Does the wider literature support this?
- Half your agents: steelman the strongest objection to each item, then answer it.

For each of the 10, deliver:
1. The item and its rank from the prior run
2. Corroboration: what supports it (with sources)
3. Strongest objection and your answer to it
4. Revised rank — did it move up, down, or off the list?
5. The single experiment that would settle it, specified exactly:
   data in, method, held-out metric, pass/fail bar

RULES
- If the evidence got weaker on review, say so and downrank. Do not protect prior outputs.
- Never invent sources. Every claim needs a file path or a URL.
```

---

## PROMPT 3 — Second Heavy run: promote-or-kill (run this next, then hand the result to the builder)

```
You are running as Grok Heavy. This is a second pass. The first pass is in this
conversation — its Phase 5 build list has 7 items, ALL marked shadow because the
underlying source files were never opened. Your job: open them, and for each
item either PROMOTE it to a measured build or KILL it with cause. No item stays
in limbo.

ACCESS RULE — the first pass got rate-limited by the GitHub API. Do NOT use
api.github.com. Fetch every file via raw.githubusercontent.com, e.g.
https://raw.githubusercontent.com/Beexly/agent-bus/main/research/corpus-intelligence/maps/c02-map.md
That path pattern works for every file. If a fetch fails, retry once, then list
the file as unread — never silently skip.

PHASE 1 — READ THE UNREAD MAPS (all agents, divided)
Open all 8 unread slice maps:
- research/corpus-intelligence/maps/c02-map.md
- research/corpus-intelligence/maps/c03-map.md
- research/corpus-intelligence/maps/c06-map.md
- research/corpus-intelligence/maps/c07-map.md
- research/corpus-intelligence/maps/c07d-map.md
- research/corpus-intelligence/maps/c08-map.md
- research/corpus-intelligence/maps/c09-map.md
- research/corpus-intelligence/maps/c10-map.md
Extract every actionable claim the same way the first pass did: method in one
sentence, math/estimator, dataset and sample size, claimed result with metric,
license, GSE relevance HIGH/MEDIUM/LOW/NONE. Flag anything that contradicts or
outranks the first pass's top 13.

PHASE 2 — PROMOTE OR KILL (statisticians + skeptics)
For each of the 7 shadow items in the first pass's build list, resolve the cited
source file from the maps (ledgers are under the Sports docs tree — search the
repo file listing for the ledger number or filename), open it, and rule:
- PROMOTE if the numbers check out: state the exact metric, sample, and protocol
  from the source. It becomes a measured build.
- KILL with cause if: the sport isn't NFL, the sample is unstated, there's no
  out-of-sample result, or the map misattributed the claim.
The 7 items: (1) conformal publication gate [ledger 0743], (2) per-QB
EPA/dropback [handoff-indie-builders-v2-fullspec-2026-09-25.md], (3) QB
pressure-to-sack residual [sweep-2026-09-21.md], (4) trust-target props stack
[CARDS_SHARE_CORE_WIRING.md, arxiv-deep/0912], (5) injury/QB-change provenance
[signal-staleness-gate.md], (6) within-player scale-fit [signal-ledger-scale-fit.md],
(7) moderate-favorite leaf audit [MARKET_CALIBRATION_2026-09-04.md].
Also re-examine the 4 demoted items — coverage transformer [ledger 0489],
soft-Elo [ledger 0540], ensemble [ledger 0797], OpenSkill bake-off — and say
plainly whether any deserves resurrection.

PHASE 3 — BUILDER HANDOFF (synthesizers, final)
This goes to a builder agent tonight. For every PROMOTED item, write:
1. What to build, in one sentence
2. Exact repo paths to read first (Sports repo, Beexly/Sports@main)
3. Exact files to create or modify, with the function/module names
4. The test that proves it works: data in, held-out metric, pass/fail bar
5. What NOT to touch (open PRs #1016, #1018, #1019, #860 own their lanes)
6. Shadow or publish-ready, and why
Order by expected value. If fewer than 3 items promote, say so explicitly and
say what the second-best use of the builder's night is.

RULES
- Never invent a number, a file path, or a citation. Unread = unread.
- The do-not-rebuild list stands: bridge-model.ts, 1704.00197, market-moneyline
  recalibration, team-level pressure-to-sack, per-QB uncertainty bands.
- A killed claim is a correct output. Do not protect the first pass's list.
```

*Note: Prompt 2 (generic deep dive) is superseded by Prompt 3 for tonight. Prompt 2 remains valid for a future quota cycle.*

---

## PROMPT 4 — Floodgates: full corpus read + open arXiv scrape (the deepest run)

```
You are running as Grok Heavy: up to 16 parallel agents, independent work, then
debate to a final answer. This is the deepest research run. Two prior passes are
in this conversation. They read ONLY the slice maps (c01–c10), four search
notes, and reconciliation files — roughly 20 files. They did NOT read the
3,457 briefs, the 1,115 arXiv fulltext extracts, the scored batches, or the
waves. Your job is to read what they didn't, then go beyond the corpus entirely.

ACCESS RULES
- Corpus files: fetch via raw.githubusercontent.com ONLY (the API rate-limits).
  Pattern: https://raw.githubusercontent.com/Beexly/agent-bus/main/research/<path>
  Example: https://raw.githubusercontent.com/Beexly/agent-bus/main/research/corpus-intelligence/briefs/c01/c01-d01/<file>.brief.md
- arXiv papers: use arXiv directly (arxiv.org/abs/<id>, export.arxiv.org API,
  ar5iv for full text). Do NOT use the GitHub API at all.
- If a fetch fails, retry once, then log the file as unread. Never silently skip.
- Keep a COVERAGE LEDGER from the first fetch: every file read or unread, with
  counts per directory. The final report opens with this ledger. If you cannot
  reach 100% coverage, say exactly what remains and what it would take.

PHASE 1 — READ THE CORPUS (12 agents, divided by directory)
The corpus is Beexly/agent-bus@main, research/corpus-intelligence (3,728 files)
and research/arxiv-sweep (1,374 files). Divide as follows and read in priority
order within each assignment:
- 4 agents: research/corpus-intelligence/briefs/ (3,457 files) — these are the
  actual research briefs the maps summarized. Read every one. Where a brief
  makes a quantitative claim (a metric, a delta, a sample size), note the source
  file it cites.
- 3 agents: research/arxiv-sweep/fulltext/ (1,115 files) — full paper extractions.
  Read every one.
- 2 agents: research/arxiv-sweep/waves/ + research/corpus-intelligence/deep/ +
  research/corpus-intelligence/handoff/ — the deep analyses.
- 1 agent: research/arxiv-sweep/scored_batch_*.jsonl + phase2-candidates-*.jsonl
  + research/corpus-intelligence/chunks/ + intake/ — the scored queues.
Per file, extract: method in one sentence, math/estimator, dataset and sample
size, claimed result with metric, license/provenance, GSE relevance
HIGH/MEDIUM/LOW/NONE with one-line justification. Terse — one tight paragraph
per file. Deduplicate: the maps already found filename-level dupes
(2002.12860, 2004.14108, 2609.10615) — extract once, and flag any new dupes.

PHASE 2 — OPEN ARXIV SCRAPE (4 agents, the floodgates)
The corpus is not the universe. Find every arXiv paper on sports prediction,
NFL modeling, calibration, forecasting, causal inference in sports, and betting
markets that is NOT already in the corpus.
- Exclusion list (already covered, do not re-extract): open
  research/corpus-intelligence/../arxiv-sweep/existing-research-map.md — it
  holds 64 arXiv IDs already read into Sports — plus every ID appearing in the
  corpus fulltext/ directory and the manifest files. Build the exclusion set
  first, then search.
- Search arXiv broadly: query the API across stat.AP, cs.LG, cs.AI, econ.EM,
  q-fin.*, physics.soc-ph for sports/prediction/calibration/forecasting terms,
  all years, sorted by relevance then by date. Also sweep recent submissions
  (2024–2026) in those categories for sports keywords.
- For each paper NOT excluded: read the abstract; if relevant, read the full
  text via ar5iv. Extract the same fields as Phase 1.
- Log: queries run, papers screened, papers kept, papers excluded as dupes.

PHASE 3 — SYNTHESIZE (synthesizers read Phase 1 + 2 output only)
- What is NEW versus the two prior passes? The prior build list had 6 items
  (conformal publish gate, QB pressure-to-sack residual, per-QB EPA/dropback,
  trust-target props stack, staleness provenance, within-player scale-fit).
  For each: does the new evidence strengthen, weaken, or kill it? Update ranks.
- What compounds across the new material? Look specifically for: (a) props
  signals (the open frontier — 47-signal registry has props unwired),
  (b) calibration techniques beyond what the maps covered, (c) causal/injury
  effects with actual NFL coefficients, (d) market microstructure edges.
- Contradictions: where the new material disagrees with the maps or with the
  prior build list, name both sides and judge the evidence.

PHASE 4 — CHALLENGE (skeptics)
Attack every HIGH-relevance claim from Phases 1–3: overfit? out-of-sample?
transfers to NFL or another sport/domain? survives shuffled-time placebo +
value-beyond-close + disjoint-fold threshold? Kill what doesn't survive.
A killed claim is a correct output.

PHASE 5 — DELIVER
1. COVERAGE LEDGER: files read / unread per directory, arXiv queries run,
   papers screened/kept/excluded. Honest numbers.
2. RANKED BUILD LIST: new items first, then re-ranked prior items with their
   evidence delta (strengthened/weakened/killed). For each: what to build,
   source file path or arXiv ID, implementation sketch, the test that proves
   it (data in, held-out metric, pass/fail bar), shadow or publish-ready.
3. DEDUP REPORT: every duplicate found beyond the known ones.
4. WHAT'S LEFT: if coverage < 100%, exactly what remains unread and the
   single most valuable next read.

RULES
- Never invent a result, number, citation, or file path. Unread = unread.
- The do-not-rebuild list stands: bridge-model.ts, paper 1704.00197 as anything
  other than what it is (an in-game logistic), market-moneyline recalibration,
  team-level pressure-to-sack, per-QB uncertainty bands.
- A restrictive license means learn-the-method, not copy-the-code. Flag licenses.
- Do not re-litigate settled kills (soft-Elo, coverage transformer, CMP-SAS,
  Ising/KellyBoost) unless the new scrape finds genuine new evidence — and if
  it does, say exactly what changed.
- Sports repo state: PR #1020 merged; #1018 open (OL/GSI — QB-identity work
  waits for it); #1019 open; #860 open; #1016 merged. Signal registry: 47
  signals, props unwired. Do not recommend anything colliding with an open PR.
```

*Run order for tonight: Prompt 4 (this floodgates run) → hand its build list to the builder. Prompts 1–3 are complete; do not re-run them.*

---

## PROMPT 4 v2 — ABYSSAL (supersedes v1; this is the run)

```
You are running as Grok Heavy: up to 16 parallel agents, independent work, then
debate to a final answer. This is the deepest research run. Two prior passes are
in this conversation. They read ONLY the slice maps (c01–c10), four search
notes, and reconciliation files — roughly 20 files. They did NOT read the
3,457 briefs, the 1,115 arXiv fulltext extracts, the scored batches, or the
waves. Your job: read what they didn't, chase every citation outward, verify
the math like a reviewer, pool the evidence like a meta-analyst, and find the
gaps nobody covers.

ACCESS RULES
- Corpus files: fetch via raw.githubusercontent.com ONLY (the API rate-limits).
  Pattern: https://raw.githubusercontent.com/Beexly/agent-bus/main/research/<path>
- Sports repo docs (for citation chasing): https://raw.githubusercontent.com/Beexly/Sports/main/<path>
- arXiv papers: arxiv.org/abs/<id>, export.arxiv.org API, ar5iv for full text.
- Never use api.github.com. Fetch failing twice = log as unread, never silently skip.
- Keep a COVERAGE LEDGER from the first fetch: every file read or unread, counts
  per directory, every arXiv query run, every paper screened/kept/excluded.
  The final report opens with this ledger.

PHASE 1 — READ THE CORPUS (10 agents, divided by directory, priority-ordered)
- 4 agents: research/corpus-intelligence/briefs/ (3,457 files). Read every one.
  Where a brief makes a quantitative claim, record the source file it cites —
  Phase 2 will open it.
- 3 agents: research/arxiv-sweep/fulltext/ (1,115 files). Read every one.
- 2 agents: research/arxiv-sweep/waves/ + research/corpus-intelligence/deep/ +
  research/corpus-intelligence/handoff/.
- 1 agent: scored_batch_*.jsonl + phase2-candidates-*.jsonl +
  research/corpus-intelligence/chunks/ + intake/.
Per file: method in one sentence, math/estimator, dataset and sample size,
claimed result with metric, license/provenance, GSE relevance HIGH/MEDIUM/LOW/
NONE. Deduplicate against the known dupes (2002.12860, 2004.14108, 2609.10615)
and flag new ones.

PHASE 2 — CITATION CHAINING, TWO HOPS (4 agents)
For EVERY item rated HIGH in Phase 1:
- Hop 1: open every source it cites — whether that's a Sports repo doc, an
  arXiv paper, or another corpus file. Read it. Verify the claim is actually
  in the source and quoted correctly. Log misattributions.
- Hop 2: from each hop-1 source, open ITS references that bear on the claim
  (the paper's own citations, the doc's linked files). Read the ones that
  could confirm or overturn it.
- This is how you catch map errors, telephone-game drift, and claims whose
  only support is a citation to a citation. Report every break in the chain.

PHASE 3 — REVIEWER-GRADE DEEP READS (all agents converge, top 50 by expected GSE value)
For the 50 highest-value items, do not summarize — review:
- Verify the math: is the estimator what the paper says it is? Are the
  assumptions stated? What breaks if they're violated?
- Audit the protocol: train/test split, sample size, leakage controls,
  baseline strength. Would YOU accept this at a journal?
- Replicability verdict: could a competent engineer rebuild this from the
  paper alone? What's missing?
- Extract implementation-grade pseudocode: inputs, exact steps, outputs —
  enough that a builder could implement without re-reading the paper.
- Time-test: has any later paper overturned, weakened, or superseded this?
  Track the claim's history 2020→2026.

PHASE 4 — OPEN ARXIV SCRAPE (4 agents, parallel with Phase 3)
Everything on sports prediction, NFL modeling, calibration, forecasting,
causal inference in sports, and betting markets NOT already in the corpus.
- Exclusion set first: the 64 IDs in
  research/arxiv-sweep/existing-research-map.md, every ID in fulltext/, every
  ID cited in the maps. Build it, then search.
- Sweep the arXiv API across stat.AP, cs.LG, cs.AI, econ.EM, q-fin.*,
  physics.soc-ph — all years by relevance, 2024–2026 by date — plus a
  targeted pass for 2026 preprints (the corpus may be stale on the newest work).
- Abstract-screen everything; full-read via ar5iv anything relevant.
  Same extraction fields as Phase 1.

PHASE 5 — META-ANALYSIS (synthesizers)
Where multiple sources estimate the SAME effect, pool them: home-field edge,
pressure-to-sack conversion, EPA/dropback stability, calibration of the close,
cover rates by spread bucket, injury absence effects. For each pooled effect:
the estimates, their samples and protocols, the pooled value, the spread, and
whether the spread is explained by era, sample, or method. A pooled estimate
with a tight spread is worth more than any single paper.

PHASE 6 — GAP ANALYSIS (synthesizers)
After reading everything: what does NOBODY in the corpus answer? Which
questions would a championship prediction engine need answered that have no
paper, no brief, no ledger? Rank the gaps by GSE value. A gap is a research
commission, not a shrug.

PHASE 7 — SYNTHESIZE
- Revisit the prior 6-item build list (conformal publish gate, QB
  pressure-to-sack residual, per-QB EPA/dropback, trust-target props stack,
  staleness provenance, within-player scale-fit). For each: strengthened,
  weakened, or killed — with the new evidence cited.
- New items from Phases 1–5, ranked by expected GSE value.
- What compounds: specify JOINT implementations, not just lists — e.g. exactly
  how the conformal gate composes with the QB residual in one pipeline.

PHASE 8 — ADVERSARIAL REPLICATION (skeptics)
For every HIGH item in the final list: attempt a paper-only replication in
your head. Write the exact steps you'd take, then name the step where it
breaks — missing hyperparameter, unstated preprocessing, unavailable data.
If it can't be replicated from the materials, it ships as shadow with the
missing piece named, not as a measured build.

PHASE 9 — DELIVER
1. COVERAGE LEDGER (honest numbers: read/unread per directory, queries run,
   papers screened/kept/excluded, citation chains followed/broken).
2. RANKED BUILD LIST with evidence deltas on the prior 6.
3. PSEUDOCODE APPENDIX for every promoted item (from Phase 3).
4. POOLED EFFECTS table (from Phase 5).
5. GAP RANKING (from Phase 6).
6. MISATTRIBUTION LOG (from Phase 2 — every broken citation chain).
7. WHAT'S LEFT: if coverage < 100%, exactly what remains and the single most
   valuable next read.

RULES
- Never invent a result, number, citation, or file path. Unread = unread.
- The do-not-rebuild list stands: bridge-model.ts, paper 1704.00197 as anything
  other than an in-game logistic, market-moneyline recalibration, team-level
  pressure-to-sack, per-QB uncertainty bands. Settled kills (soft-Elo, coverage
  transformer, CMP-SAS, Ising/KellyBoost) stay dead unless genuinely new
  evidence appears — and if it does, say exactly what changed.
- A restrictive license means learn-the-method, not copy-the-code. Flag licenses.
- Sports repo state: PR #1020 merged; #1018 open (OL/GSI — QB-identity work
  waits for it); #1019 open; #860 open; #1016 merged. Signal registry: 47
  signals, props unwired. Nothing colliding with an open PR gets recommended.
```

*Run order for tonight: Prompt 4 v2 (this run) → hand its build list to the builder. Prompts 1–3 and Prompt 4 v1 are complete/superseded; do not re-run them.*
