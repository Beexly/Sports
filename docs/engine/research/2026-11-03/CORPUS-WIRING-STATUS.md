# Research Corpus → Reasoning Engine: Wiring Status

**Date:** 2026-11-03
**Manifest:** `C:/Users/Garrett/AppData/Local/hermes/cache/scratch/research_corpus/manifest.jsonl` (9.13 MB, 2,034 records)
**Verdict:** Index and retriever **WIRED and TESTED**. Engine consumption **NOT WIRED** — the extension points are dead fields.

## What was built (verified by execution)

| Artifact | Path | Status |
|---|---|---|
| Index driver | `scripts/ops/build_corpus_index.py` | ran, exit 0 |
| Mind-feed | `intelligence/corpus/corpus_mindfeed.jsonl` | 1,428 entries, 2.1 MB |
| Index stats | `intelligence/corpus/corpus_index_stats.json` | written |
| Retriever bridge | `intelligence/research/corpus_retriever.py` | 25 tests pass |

### Build numbers (real output, not estimates)

```
raw_records            2034
deduped_records        1428   (606 duplicates collapsed)
full_text_records       249   of 1428 have extracted PDF text
retracted_records         3   quarantined, excluded by default
unique_terms          34044
avg_doc_len          415.06
build_seconds          0.66
dedupe_seconds         0.14
```

Topic distribution: football_analytics 308, vision_tracking 300, forecasting_calibration 235,
pose_homography 190, coverage_scheme 177, local_pdf 118, american_football 48.

### Retrieval probes — correct paper ranked first every time

| Query | Top hit | Score |
|---|---|---|
| coverage disguise trajectory | Decoding Defensive Coverage Responsibilities (arXiv:2603.25901) | 17.036 |
| offensive line spatial framework | A Spatial Framework for Analyzing NFL Offensive Line Play | 19.375 |
| aerodynamic drag football | Aerodynamic drag measurement of American footballs | 25.636 |
| pose estimation football | Deep Learning-Based Prediction of Football Players' Performance | 10.785 |

Retraction quarantine verified: 3 retracted records indexed, **0 surface by default**, 3 surface only
with `include_retracted=True`.

## The gap: the engine never asks

`DataContext` declares two fields that would carry corpus material:

```python
corpus_hits: list[str] = field(default_factory=list)
tool_backend: Callable[[str, dict], str] | None = None
```

**Neither is read anywhere in the reasoning engine.** Verified by repo-wide grep:

- `corpus_hits` appears in 4 places: its declaration (`interfaces.py:50`), a hardcoded literal in a
  test harness (`harness.py:84`), a pass-through parameter and its echo (`synthesis.py:22,55`).
  No specialist reads it. It is copied into the L5 output dict and never used to form a claim.
- `tool_backend` appears in exactly **one** place: its declaration (`interfaces.py:53`). Nothing calls it.
- Production `DataContext` construction sites set only `observations`, `chains`, `checklist_hints`
  (`sovereign_command_runner.py:285`, `api.py:109`, `score-mnf-live.py:189`).

So the corpus is indexed and queryable, and the bridge renders correct citations — but no analysis
path ever invokes it. Wiring the index without wiring the consumer is storage, not knowledge.

## Gate enforcement does not exist

`corpus_index.to_mind_feed` stamps every entry `wired=false`, `gate_status=UNVALIDATED`, and the
retriever carries that stamp into every hit dict and into the rendered tool text. That is correct
and deliberate.

**But no code enforces it.** A repo-wide search for `UNVALIDATED` finds only producers (harvesters,
ingesters, the index itself) and tests. Nothing in `intelligence/reasoning/` reads `gate_status`.
If these hits were fed into a recommendation, nothing would stop an unvalidated research paper from
becoming load-bearing evidence. The stamp is documentation, not a gate.

This matters because the corpus is *research about football*, not validated GSE data. A 2026 arXiv
preprint on factorized attention is a mechanism source, not evidence that a particular bet wins.

## How to wire it (opt-in, one line per construction site)

The retriever already matches the declared contract, so wiring needs no engine changes:

```python
from intelligence.research import corpus_retriever

ctx = DataContext(
    observations=...,
    chains=...,
    checklist_hints=...,
    corpus_hits=corpus_retriever.as_corpus_hits(question, k=5),
    tool_backend=corpus_retriever.tool_backend,   # specialists may call it
)
```

`tool_backend` accepts `("research_corpus", {"query": str, "k": int})` and returns a rendered text
block carrying the UNVALIDATED warning. Callers should log it via
`trace.record_tool_call(trace, "research_corpus", args, returned)`.

**Do not wire `corpus_hits` into claim formation** until a gate check exists. Wiring it into
`synthesize(corpus_hits=...)` only echoes strings into the output — harmless — but putting those
titles into a specialist's reasoning would launder unvalidated research into a pick.

## What is genuinely left

1. **A gate check.** Something in the reasoning layer must refuse to let a `gate_status != VALIDATED`
   record influence a recommendation. Until that exists, wiring is unsafe by construction.
2. **Engine-side consumption.** Either a `ResearchSpecialist` that queries the corpus and emits
   claims at `Verification.INFERENCE` (lowest precedence, cannot be load-bearing), or explicit
   `tool_backend` calls from existing specialists.
3. **Full-text coverage.** Only 249/1428 records (17%) have extracted text. The rest rank on
   title+abstract. Extracting the remaining PDFs would materially improve retrieval quality.
4. **arXiv MCP authorization.** The `arxiv` MCP server is configured but settled `not_connected`.
   It needs an `authorize` action before its tools load. Until then, corpus refresh goes through
   the existing harvester scripts.
5. **Week 2–8 coverage-model results.** Week 1 only; the monotone post-snap gain needs to hold
   across opponents before it counts as a capability floor.

## Reproduce

```bash
cd C:\c\wt-week8-forensic
python scripts/ops/build_corpus_index.py
python -m intelligence.research.corpus_retriever "coverage disguise" -k 3
python -m pytest tests/test_corpus_retriever.py tests/test_corpus_index.py -q
```
