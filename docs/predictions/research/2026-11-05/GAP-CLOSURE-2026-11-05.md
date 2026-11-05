# Gap Closure — 2026-11-05

Three gaps were left open at the end of the TNF cycle. This receipt records what closed, what did not, and the evidence.

## 1. Batches 5-7 staging

**Claim in handoff:** 122 unique works.
**What the handoff actually enumerates:** 8 operator source lines. Splitting every comma and slash-separated citation yields **63 distinct works** (42 arXiv IDs, 2 OpenAlex IDs, 19 named papers), plus **16 datasets/contributors** and **8 operators**.

**Staged:** 63 works + 16 datasets + 8 operators = **87 records** in `data/mind_staging/mind_2026_11_05_full_corpus.jsonl`.
- 62 work records were new; Ötting arXiv:2003.10791 was already staged under an earlier id.
- 44 works carry resolved metadata. arXiv abstracts provide full text; unresolved named citations are `short_text` and not marked trainer-ready.

**Disclosure:** the 122 figure is not reproducible from the document. Staging 122 would require inventing 35 records. The enumerable set is 63 works and it is fully staged. Source receipt: `data/research/batches_5_7_works_2026_11_05.json`.

## 2. INDEX-BATCH-3

**Claim:** 63 items. **Original staging:** 55 (### headings only).

The index uses three shapes: ### headings, numbered items under Lane A2, and bold-numbered **N.** items under Lane A4. Reparsing all three yields exactly **63 items**:
- Lane A1 7, Lane A2 10, Lane A3 9, Lane A4 8 papers + 1 dataset card, Lane B 9, Lane C 13 patents, Lane D 6 datasets.
- All 63 titles are present in the corpus. Six group headings that an earlier pass had staged as items were removed.

Receipt: `data/research/index_batch3_items_2026_11_05.json`.

## 3. Dime, two-high, shell EPA, RB YBC

| Input | Previous status | Now | Source |
|---|---|---|---|
| RB YBC 2026 | unavailable in nflverse pbp | **measured**: BAL 2.52 YBC/Att (231 att, 582 YBC), JAX 1.92 (200 att, 384 YBC) | Pro-Football-Reference 2026 Advanced Rushing |
| BAL two-high rate | claimed 59.7%, unavailable | **59.5%** | Sharp Football middle-open rate, updated 2026-10-27 |
| BAL dime rate | claimed 28.3%, unavailable | **30.7%** on the ≤5-in-box proxy | nflverse FTN charting 2026 `n_defense_box` |
| TLaw EPA vs shell | box split only | box split only: +0.3521 vs light box (n=137), +0.1091 vs heavy (n=56) | nflverse pbp + FTN |

The two scheme claims validate against independent public charting: two-high within 0.2 points, dime within 2.4 points. The dime number is a personnel proxy (five or fewer in the box), not charted dime personnel, and is labeled as such everywhere it appears.

Still unavailable from public data: a per-shell EPA split for Lawrence, and A-gap/Fire Zone attribution. Those remain external claims and are never model inputs.

Receipt: `data/engine/public_proxy_rates_2026.json`, script `scripts/ops/build_public_proxy_rates_2026.py`.

## Corpus state

| File | Records | Trainer-ready |
|---|---|---|
| `mind_2026_11_05_full_corpus.jsonl` | 1,196 | 231 |
| `mind_batch3_batch4_gaphunt_repocatalog_am_pm_2026_11_05.jsonl` | 1,286 | 242 |

Trainer-ready means full text (≥200 characters of abstract/source text) or a structured operator spec. PDF pointers, context stubs, metadata-only rows, dataset references and short citations are staged but flagged false.
