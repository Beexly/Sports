# MemPalace TEST — Register S50

**Date:** 2026-10-30 (overnight sprint) · **Tester:** Motif subagent · **Sandbox:** `~/workspace/tests/mempalace/`
**Item under test:** MemPalace 3.12.0 — local-first AI memory (MIT), github.com/MemPalace/mempalace, cloned shallow at HEAD `84582fb`, installed from source (`pip install ./repo` into a sandbox venv; chromadb 1.5.9).
**Claim under test:** "96.6% R@5 on LongMemEval" (vendor-run). Treated as a claim, not a fact.

## Verdict: LEARN-ONLY

On Garrett's own corpus, through the product's actual search path, MemPalace scored **13/20 (65%) R@5** against **19/20 (95%)** for a ~100-line BM25 full-text baseline over the same files. Its misses are structural — number-dense facts (records, units, CRPS values, IDs, dates), which is exactly what Garrett's memory is made of — and its top-5 is not stable: two facts that rank #1–#2 when 25 results are requested are absent from the top 5 when 5 are requested. The vendor's 96.6% does not transfer to the shipped product path (details below). The verbatim, local-first, no-summarization doctrine is sound — and is already how Garrett's current file memory works, at higher measured recall. Do not adopt; do not wire into the fleet. What would change this verdict: a retest with the `embeddinggemma` embedder showing ≥ baseline parity on a number-heavy question set. Not scheduled — the current stack is not the bottleneck.

## Method

- **Corpus (copies only, originals never touched):** `~/MEMORY.md` + 10 daily logs (2026-09-09, 09-13, 09-21, 09-27, 10-03, 10-12, 10-16, 10-23, 10-27, 10-29) copied to `corpus/` — 11 files, 1.46 MB, 6,333 lines. Using copies mattered: `init` writes `entities.json` and `mempalace.yaml` into the mined directory itself.
- **MemPalace config:** defaults a normal user gets — `init corpus --yes`, `mine corpus` (projects mode), default `minilm` embedder (all-MiniLM-L6-v2, ChromaDB's ONNX build), default chroma backend. Result: **2,531 drawers**, 194 hallways, ~4 min CPU mining.
- **Baseline:** `baseline_search.py` — BM25 over paragraph chunks (~1,200 chars) of the same 11 files (1,017 chunks), pure stdlib Python. Index + all 20 queries ran in ~2 s total.
- **Questions:** 20 factual questions (`questions.json`), each with a distinctive ground-truth string ("key") verified present verbatim in the corpus (raw grep: 20/20 present — every miss below is a ranking failure, not missing data).
- **Scoring (identical both systems):** hit = any top-5 returned passage contains the key (case-insensitive). Rank = first rank containing it.
- **MemPalace queries:** `mempalace search "<question>" --results 5` via the CLI — the product's real search path, which is hybrid (each result shows both `cosine_sim` and `bm25` scores). ~3–8 s per query including process/model startup.

## Results

| # | Question (short) | Key | MemPalace rank | Baseline rank |
|---|---|---|---|---|
| Q01 | arXiv verified of 750 by Oct 3 | `579/750` | **3** | ✗ miss |
| Q02 | Amazon Associates tag | `galaxysportse-20` | 1 | 2 |
| Q03 | Odds API credits/mo + cost | `20K credits/mo` | ✗ (rank 6 @25) | 2 |
| Q04 | Town Garrett lives in | `Kingwood, Texas` | 1 | 2 |
| Q05 | Packers–Panthers final, Oct 29 | `Packers 27, Panthers 19` | 1 | 4 |
| Q06 | Season record after CAR@GB | `47-16` | 3 | 1 |
| Q07 | Plays packaged in vault | `62 official plays` | 1 | 1 |
| Q08 | Higgsfield 404 vs bad key | `bad key = 401` | 1 | 2 |
| Q09 | tau_hat held-out value | `+6.77` | 1 | 1 |
| Q10 | gate_decisions last write | `2026-06-11` | ✗ (rank **1** @25) | 1 |
| Q11 | Frozen filter game count | `2,462` | ✗ (absent @25) | 1 |
| Q12 | Closing-market CRPS, 14,251 fixtures | `7.109` | ✗ (rank 9 @25) | 1 |
| Q13 | Residual gate not cleared | `7.099` | ✗ (absent @25) | 1 |
| Q14 | Next sweep watermark ID | `2115807692992246254` | ✗ (rank 7 @25) | 1 |
| Q15 | Flex rent update deadline | `by Nov 5 at 1:00 PM ET / 12:00 PM CT` | 1 | 1 |
| Q16 | Kraft 1Q TD sprinkle winnings | `Kraft 1Q TD sprinkle +2.38u` | ✗ (rank **2** @25) | 1 |
| Q17 | First-half card play count | `19 first-half plays` | 1 | 1 |
| Q18 | Beexly/Sports clone file count | `6,268 files` | 1 | 1 |
| Q19 | SPEC-C external stamp | `ffw26-f1c` | 1 | 1 |
| Q20 | Nova's locked voice | `Zephyr` | 2 | 1 |

**Totals: MemPalace 13/20 (65%) — Baseline 19/20 (95%).** MemPalace's one win over baseline: Q01. Raw result files: `mempalace-results.json`, `baseline-results.json`, `mempalace-deep-check.json`, per-question deep outputs `deep_Q*.txt`, `q10_r5.txt` / `q10_r25.txt`.

## Failure analysis

1. **Numeric facts are the blind spot.** 5 of 7 misses are number-carried facts (Q03, Q11, Q12, Q13, Q14; Q16 makes 6 of 7). MiniLM embeddings tokenize numbers poorly and drawer chunking dilutes them; BM25's exact-token matching is the right tool for records, units, thresholds, and IDs — the dominant fact type in Garrett's memory.
2. **Top-5 is not a prefix of top-25.** Q10's correct drawer ranks **#1** at `--results 25` and is **absent** at `--results 5`; Q16 ranks #2 at 25, absent at 5 (both re-verified by raw grep of saved outputs). The hybrid rerank's candidate pool changes with the requested count, so "R@5" through the CLI is not a stable measurement — an agent asking for 5 results can be told a fact is missing when the system holds it at rank 1 under a different flag.
3. **Q11/Q13 never surface** in the top 25 at all, despite the key strings appearing repeatedly in the mined files — pure ranking failure on short numeric tokens.

## The 96.6% claim, checked against the repo's own benchmark code

- `benchmarks/longmemeval_bench.py` + `BENCHMARKS.md`: the "raw" 96.6% stores **each LongMemEval session as a single whole document** in an ephemeral Chroma collection and queries it with default MiniLM embeddings — 500 questions against ~500 session-sized documents. The shipped product instead chunks files into ~2,500 drawers in one palace and searches with a hybrid cosine+BM25 ranker. Different corpus granularity, different candidate pool, different ranker: the benchmark number describes a configuration nobody runs as a product.
- The vendor's own table is more honest elsewhere: LoCoMo raw-mode R@10 is **60.3%** (hybrid v5: 88.9%). Our measured 65% product-path R@5 sits right next to that — and next to the independent 2026 head-to-head figure (0.60 store-only) already recorded in register S50. Three independent readings now agree: raw MemPalace retrieval is a ~60–65% system, not a 96.6% one.
- The README's current framing ("we do not headline a 100% number because the last 0.6% was reached by inspecting specific wrong answers") concedes the teach-to-the-test history the register flagged.

## Setup notes (what installing it here actually took)

1. Clone: first full clone produced an empty checkout (fetch-pack error); a shallow clone verified in the same command worked (85 MB, 839 files).
2. Install: venv + `pip install ./repo`, ~4.5 min, no errors.
3. **`init --yes` is not fully non-interactive:** it ends with a "Mine this directory now? [Y/n]" prompt `--yes` doesn't suppress — with piped stdin it blocked >6 min (killed); with stdin closed it proceeds and skips. `--auto-mine` exists for scripted setups.
4. **Embedding-model download is fragile on this network:** Chroma's ONNX MiniLM archive (83 MB from S3) failed three ways through the Python stack — httpx crashed parsing this sandbox's IPv6 `no_proxy` entries (`InvalidURL: Invalid port ':1]'`), then read/connect timeouts via proxy and direct. Resolved by pre-fetching the archive with curl (first attempt truncated at 77.7 MB; resume completed it; sha256 matched Chroma's pinned `913d7300…`) into the embedder cache. A normal user on a normal network likely never sees this; on this VM it was the single biggest setup cost.
5. **Containment:** the tool writes outside its palace by default — `init` updated `~/.mempalace/known_entities.json` (real HOME) and Chroma caches its model under `Path.home()/.cache/chroma` (an empty model dir was created at `~/.cache/chroma/onnx_models/all-MiniLM-L6-v2/` by the failed runs). After redirecting `HOME`, `MEMPALACE_PALACE_PATH`, XDG dirs, and `HF_HOME` into the sandbox (`mp.sh`), all state stayed inside. The two stray artifacts above remain in place, inert, and are noted here rather than silently deleted.
6. No changes were made anywhere else; Garrett's original memory files were only ever read (by `cp`).

## Bottom line

MemPalace is a well-built implementation of a doctrine Garrett already runs — verbatim local memory, no LLM deciding what matters — but its retrieval, as shipped and defaulted, is measurably worse than plain full-text search on his own files (65% vs 95%), worst exactly where his memory is densest (numbers), and its headline benchmark measures a configuration the product doesn't ship. **LEARN-ONLY:** keep the register entry, keep this sandbox as the reproduction, revisit only if a future version's default path closes the numeric-fact gap.
