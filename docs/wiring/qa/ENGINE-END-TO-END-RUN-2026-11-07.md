# REASONING ENGINE — END-TO-END RUN, EXECUTED (Motif, 2026-11-07)

The open end of the consumption chain all night was: the catalog gate is called inside the reasoning engine's analyze pipeline, but nobody had run the engine itself. Now run.

**Setup (the honest plumbing):** the qa-repo sparse checkout does not materialize intelligence/reasoning/ (sparse patterns), so the full package was extracted from the HEAD commit tree (git archive: intelligence/reasoning + intelligence/research + research/) into a staging dir with the catalog + twin placed at the gate's hardcoded repo-relative paths. Two import findings on the way in: (1) orchestrator.py imports the corpus retriever via a try/except — primary `intelligence.research.corpus_retriever`, fallback `research.corpus_retriever` — and the module actually lives at intelligence/research/corpus_retriever.py (the HEAD tree has NO top-level research/corpus_retriever.py; the fallback is dead). (2) That retriever's own header carries a GATE WARNING worth quoting into the record: every corpus record is UNVALIDATED, the module stamps wired=false / gate_status=UNVALIDATED, and "the reasoning engine does NOT enforce that stamp... Wiring these hits into a recommendation would let unvalidated research influence a pick with no gate stopping it." Filed as a finding, not fixed tonight.

**The run:** AnalysisEngine.analyze() with the repo's own fixture shape (intelligence/tests/fixtures.py pattern): GameRequest(away=ATL, home=CIN, week=10, season=2026), question on the pressure matchup, exposure=CARD, requested depth L5, market spread CIN -2.5 / total 47.0, all five checklist hints CLEAR, two observations. No game simulation — a reasoning trace on a synthetic fixture context, inside the night's wiring-only boundary.

**Result: TRACE COMPLETED at depth L5, label FINAL.**
- trace_id 2026-11-07T101706Z0000-8fcea270, content_hash fb0bc8aed9f2… (persisted trace machinery live)
- escalation_log: 7 entries (L1→L2 on requested_depth_floor, onward through the levels)
- tool_calls: 6 recorded (first: market_lookup spread → "CIN -2.5")
- hierarchy_order: the five tracks in doctrine order, offensive_line first
- the run passed through validate_corpus_and_equation_gate (orchestrator.py:100 → audit_12304_equation_catalog_integrity) with the real 12,304-entry catalog in place — the gate audited the full catalog as part of the pipeline and the pipeline proceeded.

**Chain status after this run:** catalog → gate (executed) → orchestrator validation (executed as part of analyze) → L1–L5 engine trace (executed, FINAL). What remains unproven is unchanged and specific: whether any PUBLISHED surface (site, card, post) changes when the catalog is disconnected — Copilot PR #1258's test, still an "Initial plan" commit; and the corpus-hits enforcement gap the retriever's own header warns about.
