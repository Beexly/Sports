# Hermes Overnight Corpus Ingestion - Wave 1 (2026-11-15)

Shift: autonomous zero-collision overnight watch, 00:15 -> 08:00 CST.
Worktree: C:\Users\Garrett\Sports-worktrees\hermes-sunday-watch-2026-11-15
Branch: feat/hermes-overnight-mind-and-munich-watch-2026-11-15
Base at start: origin/main 4b793c509 (fetched 00:37 CST).
Author: Hermes (inline execution, no subagents). Cost: 0.00 USD (local parsing only).

## 1. What was audited

- brain/feeds/**/*.jsonl: 93,224 records scanned; 58,474 unique record_id values;
  42,881 unique primitive names; 334 explicit arxiv_ids, 508 effective arxiv ids
  once ids embedded in record_id / primitive_name / title are counted.
- docs/arxiv-program/research/MASTER-PAPER-INDEX.md: 1,480 table rows,
  1,470 unique arxiv ids (Part A family modules + Part B ledger-only papers).
- docs/arxiv-program/research/2026-11-14/arxiv_and_tier_a_sovereign_equation_synthesis.json:
  10,746 complete sovereign books, 58,486 feed records emitted 2026-11-14,
  1,646 refused stub books (all INSUFFICIENT_SOURCE_ACCESS, fail-closed).
- Topic coverage among already-ingested primitive names:
  conformal/calibration 134, copula/Student-t 50, market microstructure 9,
  snap-transition priors 2, transport/shrinkage 207.

Gap definition: a master-index arxiv id absent from the effective ingested id
set AND whose normalized title is absent from the 16,380 normalized feed
titles. Result: 1,307 gap rows.

## 2. What was emitted

Feed: brain/feeds/2026-11-15/hermes_arxiv_and_microstructure_wave1.jsonl
Records: 173. Bytes: 231,018.
sha256: 2ac3dbe2c69ecc0a950c2f0837c3e32b2339cf59b1e98b5f97f5d6976ded33b5

Selection: 192 candidates across the five mission topic buckets; 19 excluded
because the master index itself adjudicated them REJECT / off-domain (corpus
discipline: a rejected paper is never re-ingested as a primitive).

| Topic bucket | Candidates | Emitted | Example ids |
|---|---|---|---|
| conformal / calibration | 91 | 82 | 2502.07255, 2603.24704, 1812.10371 |
| snap transition / sequential priors | 56 | 53 | 1707.06887, 2308.02414, 2505.22422 |
| copula / SGP correlation | 22 | 21 | 2003.02743, 1806.05293, 2010.12508 |
| transport / shrinkage | 13 | 10 | 0903.2910, 2202.00769, 1904.10644 |
| market microstructure | 10 | 7 | 1708.02715, 2105.08310, 2510.16008 |

Grounding split: 44 records are [DIRECT-PORT] (a prediction-engine code module
exists; the verbatim_quote is extracted from that module's JSDoc header, and
17 records carry a canonical_form line from the header). 129 records are
[INDEX-ABSTRACT] (no code module; the verbatim_quote is the master-index row
summary, verbatim). Every record carries source_path + source_line so the
trainer can resolve the exact origin.

Router wiring uses the production helpers from
intelligence/foundry_bridge/sovereign_to_cognitive_router_wiring.py
(classify_text_to_family, compute_family_bit_index), identical to the
2026-11-14 synthesizer. Family distribution of the 173 records:
marketMicrostructure 85, qbSkillScript 55, weather 14, restFatigue 12,
coveragePersonnel 4, pressure 3. All bits within 0..287.

## 3. Sanitization policy (guardrail compliance)

- Pure ASCII: every byte of the feed satisfies ord(c) <= 127. Unicode in
  source quotes (Greek letters, math symbols, typographic dashes) is
  transliterated via a fixed map, then any residual non-ASCII is dropped.
  ascii_transliterated: true is set on every record; provenance is unchanged.
- Public-jargon scrub: banned shift tokens are replaced with plain-language
  equivalents inside quotes and mappings (e.g. the entropic-transport solver
  name becomes "entropic-transport solver"). The unscrubbed original remains
  at source_path/source_line. This is a display-layer scrub, not a content
  edit; no equation semantics were altered.
- Confidence format: no confidence percentages are asserted anywhere in this
  wave; where later waves state confidence they use XX/100.
- Single-writer rule: brain/mind.jsonl was NOT touched. The feed lives only
  under brain/feeds/2026-11-15/. The 1,646 refused stubs remain fail-closed;
  nothing was fabricated to fill them.

## 4. Validation (all passed, 0 errors)

1. Every line parses as JSON.
2. Every character ASCII (ord <= 127).
3. record_id unique within the feed and against all 58,474 pre-existing ids.
4. verbatim_quote containment verified against the sanitized source text
   (module JSDoc join or index row) for all 173 records.
5. situational_family in the 6-family vocabulary; router_bit_index in 0..287.
6. Zero banned-token occurrences in the feed file.
7. REJECT/off-domain index rows excluded (19), listed in the build report.

Builder (reproducible, reads only repo sources):
scripts/ops/hermes_wave1_gap_feed_builder.py
Build report: scratch wave1_build_report.json (session-local; counts above
are the durable record).

## 5. Honest limits

- Topic buckets are keyword-routed, not hand-adjudicated; a few rows sit in
  the nearest bucket (e.g. temporal-correlation Kelly papers under copula/SGP
  because their summary names the outcome-correlation matrix).
- [INDEX-ABSTRACT] records are abstract-level primitives: they carry the
  index's one-line summary, not full-paper equations. They are marked as such
  so the trainer can weight them below [DIRECT-PORT] records.
- The arxiv-deep ledger tree referenced by the master index (1,511 ledgers)
  is not present in this worktree (1 file remains); grounding therefore uses
  module headers and index rows only. No external fetches were made.
- Family routing is the production classifier's deterministic output; ties
  and keyword defaults are inherited, not overridden.

Next: Wave 2 rebases onto origin/main once Antigravity's Week 10 push lands,
then builds the 13-game external charting cross-verification matrix.