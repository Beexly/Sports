# CORPUS RETRIEVER — WHY IT RETURNED ZERO HITS (Motif, 2026-11-07)

Follow-up to the engine run note: ctx.corpus_hits came back 0 for a pressure query. Root cause, verified against the HEAD tree:

The retriever (intelligence/research/corpus_retriever.py) resolves its manifest in this order: (1) $GSE_CORPUS_MANIFEST env var, (2) repo-relative data/research_corpus/manifest.jsonl, (3) a Windows-home fallback ~/AppData/Local/hermes/cache/scratch/research_corpus/manifest.jsonl. Its DEFAULT_FEED is intelligence/corpus/corpus_mindfeed.jsonl.

**Neither data file exists anywhere in the HEAD commit tree** (full-tree name search for research_corpus/manifest and corpus_mindfeed: zero hits). The corpus the retriever serves — described in its own docstring as a ~2,034-record harvest manifest — lives outside the repo (a harvest cache on the Windows host, per the fallback path). On any clean checkout, including production deploys from this tree, retrieval returns zero hits by construction, and it fails SILENTLY: the engine's validator records corpus_hit_count 0 and proceeds; nothing raises.

So the corpus lane's state, exactly: retriever code real and security-reviewed (its tool_backend refuses caller-supplied manifest paths — a fixed exfiltration bug, documented in the source), index builder present (intelligence/research/corpus_index.py), stats file present (intelligence/corpus/corpus_index_stats.json) — but the DATA the retriever serves is not in the repo. Corpus→engine is disconnected at the data layer, not the code layer. Closing it = committing the manifest (or pointing GSE_CORPUS_MANIFEST at a served copy) — a Wave 3 ingestion task.

This is distinct from the mind staging corpus (MIND-TO-ENGINE-BOUNDARY): that is trainer-ready text with no game_ctx adapter; this is a retrieval corpus whose index data never landed in the tree. Two different corpora, two different disconnects, both now named precisely.
