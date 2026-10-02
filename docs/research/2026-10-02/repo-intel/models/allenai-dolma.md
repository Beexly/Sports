# allenai/dolma — Data Recipe Toolkit (OLMo's 3T-Token Pipeline)

**Repo:** https://github.com/allenai/dolma · ⭐ 1,548 (verified 2026-10-02)

## 1. Vision
The open toolkit behind the Dolma dataset (3 trillion tokens for OLMo): taggers (Gopher/C4/OpenWebText quality rules), fast Rust-Bloom-filter deduplication, and a parallel pipeline for curating pre-training data. The dataset side (ODC-BY licensed) documents a real, published *data mix*: web, academic, code, books, encyclopedic.

## 2. The Ask
- `pip install dolma`; runs on a single machine up to clusters, S3-compatible storage supported.
- You bring the raw corpus and choose taggers/thresholds; Dolma executes the mix.

## 3. Constraints
- **License:** Apache-2.0 for the toolkit (verified); the Dolma *dataset* is ODC-BY (attribution required) — relevant only if we used their data, which we don't.
- Pushed 2026-08-24, maintained (29 open issues). Text pipeline; GSE would reimplement taggers for tabular features.

## 4. GSE lens
- **The data-mix *documentation* is the artifact.** Dolma's published mix (what fraction web/code/books/academic, and why) is the closest public analog to what Llama 3's paper describes for its data recipe — and the transferable practice is *documenting the mix and ablating it*. GSE should version its training corpus the same way: a "Dolma-style data sheet" per training vintage listing every source, its weight/share, the quality taggers applied, and the dedup stats. When a signal underperforms, the first question becomes "what was its share and provenance?" instead of a guessing game.
- **Rust Bloom-filter dedup** is a concrete technique to steal for exact-duplicate removal across our merged feeds (nflverse, Sleeper, sportsbooks) — fast, memory-light, and it produces a dedup *report* (how many records dropped per source pair), which is audit evidence.
- **Taggers as versioned code, not vibes:** their Gopher/C4 taggers are named, parameterized, citable rules. Our "signal QC" should be the same: named rules with thresholds in version control, not notebook filters.

## 5. Verdict
**REBUILD** — reimplement the mix-documentation + tagger + Bloom-dedup pattern for our corpus pipeline (Apache-2.0 toolkit).

## 6. The 4 tricks
- Wiki: https://codewiki.google/allenai/dolma
- Diagram: https://gitdiagram.com/allenai/dolma
- Stars: https://star-history.com/#allenai/dolma (1,548 ⭐)
- Code: https://github.dev/allenai/dolma
