# ROTATION SYNTHESIS — THE NIGHT'S VERIFICATION STATE IN ONE PAGE (Motif, 2026-11-07)

Base commit for censuses: main-side HEAD c0c721cc8. Branch: agy/total-wiring-2026-11-07. Every claim below was executed or counted by Motif tonight unless marked otherwise. Companion docs in this folder (docs/wiring/qa/).

## PROVEN BY EXECUTION
- Reasoning engine runs end-to-end: L1–L5 trace COMPLETED, label FINAL, with the real catalog in place (ENGINE-END-TO-END-RUN). The pipeline HARD-DEPENDS on the catalog-or-twin pair: both hidden -> analyze() raises FileNotFoundError, no trace. Catalog hidden alone -> twin silently serves, and the audit's catalog_path field still names the catalog (provenance invisibility).
- Equation gate: audit passes on the real catalog (12,304 equations, 279 families, 0 invalid bindings); router output varies by context (CIN@ATL +0.048026 vs TB@CHI +0.156970 on tonight's runs; perturbation battery: wind/temp/spread/rest/precip+total all move it; precip+total = largest swing +0.2755). Binding coverage complete: 35 catalog binding names all produced by the extractor (no silent-zero class).
- Gate filter enforced on context-supplied equations (VALIDATED passes, DRAFT/missing flagged with reasons). Retriever-side corpus stamp is NOT enforced (source's own warning) — different layer.
- Situational matrix engine runs end-to-end via its own main: routes all 12,304, 288-bit mask populated, clamped delta +0.022269 on empty context; its "80 rules" name undercounts (87 rules counted by the module itself).
- Receipt integrity: all 19 Week-9 dossiers, 114 stage hashes recomputed under the producer's exact convention — 114/114 MATCH, parent linkage consistent. The seal certifies the records' integrity, not the claims inside them.
- Warehouse dedup executed: registry 21 rows -> 11, naive sum 158,607 -> unique total 79,297 (the fleet's 79,298 ambiguity = the Open-Meteo split group, FAIL/0 + PASS/1, kept both by the spec key). Deduped file landed alongside the original.
- Core NFL Schemes module: real, self-tested (6 tests pass staged).

## REFUTED / CORRECTED
- Per-family / as-written formula consumption of the catalog: FALSE. The gate evaluates via its own 9 hardcoded operator kernels; the catalog's stored formula_expression strings are never parsed or executed by anything. PR #1260's "Wired 0 / Tested 0" is nonetheless also wrong: whole-catalog consumption by the gate is real (see above).
- Catalog header: authentic_source_verified_count 12,304 NOT sustained (field-presence definition; only 3,245 entries cite files that exist; 993 of 2,577 distinct cited paths exist nowhere, carrying 9,059 entries). real_corpus_sources_pooled_count 13,500 not reproducible (2,577 distinct source files). Counts OF the file (12,304 / 279 / 288 bits) are accurate.
- Stage 1B headlined router block is a CONSTANT (uniformity chain v1–v4): TS engines run once per process with no per-game input; defaults equal the receipted constants; Stage 2 consumes the constant at 0.03 weight (+0.0105 EPA to every away QB) while the varying Python-gate delta (receipt range −0.038..+0.280) has no demonstrated Stage 2 consumer.
- Stage 1B receipt headline total (12,304 "reviewed") does not derive from its components (sum 4,756); cite components, never the total. Bridge operators: 17 exported, receipt claims 25. "213 equations" = 21 written + 192 generated crossings (204 features executed). Stage 1A's "38" name is stale (52 modules verified in receipt; tree now holds 57).
- TEST-24's spot-check generalizes poorly: 1,776/12,304 entries (14.4%) are value-identical on its two flat states — decomposition closes exactly (1,641 binding-invariant across 4 triples + 135 saturation/linearity). Its aggregate assertions stand.
- 62-23-1 census at c0c721cc8: 101 files whole-tree; public surface exactly 2 files (llms.txt line 8; Week-9 TNF card SVG). Earlier counts (73 / 113 / 14-public) do not reproduce at this commit under their stated scopes.

## DISCONNECTED AT THE DATA LAYER (code real, data absent)
- Corpus retriever: manifest + default feed exist NOWHERE in the HEAD tree; the ~2,034-record corpus lives in a Windows-host cache. Clean-checkout retrieval returns zero hits silently.
- Mind staging -> engine: 14,040 lines / 13,265 trainer-ready / 6,240 unique records — and zero records carry game-state fields; no adapter to game_ctx exists. Both assets real; no code path connects them.
- Production workflow from a clean checkout: Stage 0 hard-fails by design — data/nflverse/pbp/play_by_play_2026.parquet exists nowhere in the tree. Stage 1A's pbp_reproductions and bdb2025 summaries are empty in 19/19 dossiers. The Nov 5 receipts prove the chain ran where the data lives (Windows host).

## ABSENT DELIVERABLES (master-order waves, at HEAD)
- Wave 3: data/corpus/research_records.jsonl + docs/wiring/RESEARCH-LEDGER.jsonl absent; main's data/corpus/ holds only the partial 38-file inbox copy (authoritative 127 files on branch motif/corpus-inbox-2026-11-07, unmerged).
- Wave 4: data/identity/ empty; canonical_entities.jsonl absent; zero references to it, entity_resolver, or EntityResolutionContaminationError outside the master document. Working substitute: Stage 0's per-game runtime denylist (stores nothing).
- Wave 5: equation_execution_registry.jsonl absent; the string exists only in the master order.
- Wave 6: brain/mind.jsonl absent; normalized warehouse data absent (registry paths point at C:\Users\Garrett\...).
- Wave 7: intelligence/reasoning/layers/ does not exist; no context-packet builder exists (3 content hits tree-wide, none code). The L1–L5 reasoning package itself is real (33 files) and internally wired.

## OPEN, WITH OWNERS
- DeepSeek independent cross-check of LANE2: L2Y session running since 04:25 CT with all evidence pre-staged (ds-l2y/); collect on exit. (L3 cross-check SETTLED: 4/5 claims confirmed, 1 corrected by DeepSeek and re-verified.)
- TS router executed: needs a TS runner + premise DB, neither present here.
- Published-surface disconnect test (Copilot PR #1258's question): unexecuted; PR still at its initial-plan commit on a stale base at last check.
- Refuted numbers still live on the public surface (morning audit item #1; fix is the AGY lane's, verification is Motif's when it lands).
