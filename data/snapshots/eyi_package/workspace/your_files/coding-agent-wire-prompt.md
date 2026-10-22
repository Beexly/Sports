# Coding agent — WIRING MISSION (2026-10-02)

Three blocking gaps, in priority order. Work all three; don't stop at the first green.

**Context:** branch `motif/gse-intelligence-build-2026-10-02` (HEAD `b3e15f21`). Full audit with receipts standard: `~/workspace/your_files/GSE-MASTER-INVENTORY-2026-10-02.md` §7. Repo rules govern.

**1. SEED CSVS — they exist, wire them in.** `~/workspace/coaching-tendencies/data/` holds `coach_offense.csv`, `coach_defense.csv`, `off_tendencies.csv`, `def_tendencies.csv` — real nflverse parquet-built (build scripts in `code/`), including the 2026 CLE Monken HC row (164 plays) the 10 failing coaching tests pin. Diff them against the tests' pinned expectations (1e-6 YoY delta), land the files on the branch, make the 10 tests pass for real.

**2. OL PROVIDER — build it.** Spec: `~/workspace/gse-intelligence-build/data/alexandria/RECONCILED-SOURCES-2026-10-02.md`. Implement `get_ol_status` / `get_ol_starters` (nflverse injuries + depth_charts; Alexandria only for live daily practice detail; `DataGapError` on unpublished/uncovered weeks). Invoke through the real `analyze()` path and the L3 OL track. Re-run `intelligence/tests/e2e/test_t1_real_e2e.py` — T1 must clear `offensive_line UNCHECKED`. Remove or re-mark the old hand-built T1 test (`test_reasoning_trace_e2e.py::TestT1PressureFunnelRejected`) — it passes on fixtures and real data alike, so it proves nothing.

**3. SIGNAL REGISTRY + TAU — give the engine its nervous system.** Write the signal registry as a versioned file on the branch (signal id, producer, wired state, gate, evidence). Give it its first real producer; one end-to-end test proving a signal fires on a real pick. Fix the gate: `homeSign` is unset on every production definition and 9 ACTIVE evaluators return null — set it or flip them to explicit DISABLED. Wire `tau_hat.csv` (`intelligence/coaching/data/`, manifest-pinned) into the reasoning context; prove one pick changes. Note: the served 2026 cells pool in-season weeks — do not present the table as pre-kickoff; rebuild walk-forward or stamp it.

**Proof required for each:** files changed, tests run with counts, what was actually exercised, where the logs live. Land everything on the branch. Don't stop, don't stall, don't hyper-fixate — if a sub-task is genuinely blocked, record why and move to the next.
