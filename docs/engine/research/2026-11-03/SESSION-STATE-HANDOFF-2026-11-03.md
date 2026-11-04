# Session State Handoff — 2026-11-03

**Purpose:** Capture verified state so the next agent/workspace/CLI does not repeat probes or
trust stale numbers. Every claim below is backed by a command that was actually run; unrun items
are labeled NOT RUN.

**Branch:** `hermes/overnight-2026-11-03-corpus`
**HEAD at handoff:** `fdcb55693` (merge: bring origin/main current before push)
**Uncommitted:** 4 tracked modifications + new untracked docs/packages (see `git status`).

---

## 1. What changed in this session

### `intelligence/research/corpus_retriever.py` — hardened tool boundary

| Change | Why | Verified |
|---|---|---|
| `DEFAULT_MANIFEST` → `_default_manifest()` with `$GSE_CORPUS_MANIFEST` → repo copy → cache fallback | The absolute user-home path was baked into committed source (non-portable + PII leak) | `python -c` import OK |
| `tool_backend` no longer reads `manifest` from `args` | `args` comes from model text; reading a path from it made the tool an arbitrary-file-read primitive | source assertion: `args.get("manifest")` absent |
| Query truncated to `MAX_QUERY_CHARS=300` | Unbounded model-supplied queries make the inverted-index scan quadratic | const present, long-query call returns cleanly |
| Every failure path returns a string | `DataContext.tool_backend` is typed `Callable[..., str]`; a raise crashes the reasoning engine | unknown tool / empty query / non-dict args all return strings |
| `render_hits` split into `_render_hit_list` + `_no_hits_text` | Callers that fetched with `include_retracted` lost the flag to a re-query; empty path lacked the GATE stamp | CLI + direct-call probes |
| Empty-result path now carries the GATE warning | "no records matched" alone reads as "no evidence either way" — the same error as trusting a hit | `tool_backend` no-match probe |

### `intelligence/vision/coverage_sequence_model.py` — nearest-opponent bug

The old lookup `opp_cache.get((g, p, my_club))` returned the defender's **own teammates**
(himself included), so nearest-opponent distance was a constant `0.0` — a dead feature. Replaced
with `opponents_for()` which merges every *other* club's tracked points per frame.

**Verified by retrain:** accuracy `0.3404 / 0.4044 / 0.4155` (pre_snap / through_throw /
through_arrival) reproduced exactly against `COVERAGE-SEQUENCE-MODEL-RESULT.md`, n=8176,
majority 0.2006. Post-snap gain +0.0640. Output:
`C:/Users/Garrett/AppData/Local/hermes/cache/scratch/cov_seq_fixed.json`.

### `reconciliation/_verify_final_state.py` — path anchoring bug

Ran all its work at import time against hardcoded relative paths. Rewritten behind `main()` with
paths anchored to the script's own location (`Path(__file__).resolve().parents[1]`), git only as
confirmation.

**Bug caught during testing:** git-first anchoring resolved to `C:\Users\Garrett` — which is
itself a git repo — so running from the home directory verified the *wrong* repo and reported
every artifact MISSING while exiting 0. A false negative that reads like a clean run. Now anchors
on the script path first. Verified from a foreign CWD (`cache/scratch`) → resolves
`C:\c\wt-week8-forensic`, HEAD `fdcb55693`, 22 dirty files.

### `docs/engine/research/2026-11-03/CORPUS-WIRING-STATUS.md` — stale numbers corrected

The doc described a 2,034-record manifest; the live manifest is **2,883 raw / 2,226 deduped**
(77.35 MB). It claimed 249 full-text records; reality is **1,143** (51%, not 17%). It claimed
"correct paper ranked first every time"; re-testing against the rebuilt index shows **3 of 4**
probes hold — the fourth ("pose estimation football") now surfaces a *soccer* paper and does NOT
recover the original target even when disambiguated with "American football" or "NFL".

---

## 2. Verified facts (re-run these to reproduce)

| Check | Command | Result |
|---|---|---|
| Full test suite | `python -m pytest tests/ -q` | **243 passed in 143.03s, exit 0** |
| Corpus retriever tests | `pytest tests/test_corpus_retriever.py tests/test_corpus_index.py tests/test_coverage_sequence_model.py -q` | 28 passed |
| Reconciliation guard | `python reconciliation/_verify_final_state.py` from any CWD | exit 0, correct repo root |
| Index currency | `corpus_index_stats.json` mtime 20:13:32 vs manifest 19:28:54 | index built AFTER manifest → current |
| Index size | `corpus_index_stats.json` | raw 2883, deduped 2226, full-text 1143, unique_terms 155213 |
| Retraction quarantine | `retrieve("retracted sports training", k=10)` vs `include_retracted=True` | 0/10 default, 3/10 flagged — works |
| Model reproducibility | retrain week 1, 3 folds, 6 epochs | 0.3404/0.4044/0.4155 — matches doc exactly |

---

## 3. Open defects (documented, not fixed)

1. **Retrieval regression — pose-estimation query.** The rebuilt index no longer surfaces
   "Deep Learning-Based Prediction of Football Players' Performance" for pose queries. Neither
   "American football pose estimation" nor "NFL pose estimation football" recovers it. Cause is
   unresolved; the honest fix is index-time American-football tagging or a query-side domain
   filter. NOT FIXED.
2. **Engine consumption still not wired.** `DataContext.corpus_hits` and `tool_backend` remain
   dead fields — no specialist calls them. Documented in CORPUS-WIRING-STATUS.md §"The gap".
   NOT FIXED.
3. **Gate enforcement does not exist.** `gate_status=UNVALIDATED` is stamped but nothing in
   `intelligence/reasoning/` reads it. NOT FIXED.
4. **1,083 records still lack full text** (2,226 − 1,143). Titles+abstracts only.
5. **arXiv MCP server** settled `not_connected`; needs an authorize action.
6. **Week 2–8 coverage model** not yet run; week 1 only.

---

## 4. Environment facts that cost time this session

- `C:\Users\Garrett` **is a git repo.** Any `git rev-parse --show-toplevel` from a home-dir CWD
  resolves there, not to the project. Always anchor on the script's own path first.
- `pytest --timeout=N` is **not installed**; it errors as an unrecognized argument. Worse,
  `python -m pytest ... | tail -20` masks that error as **exit 0** because the pipe's exit code
  is tail's. Redirect to a file and echo `$?` instead.
- The corpus manifest lives in the Hermes scratch cache
  (`AppData\Local\hermes\cache\scratch\research_corpus\`), not in the repo. It is 77 MB and
  gitignored-adjacent; do not commit it.
- Training writes to the scratch cache, not the repo. Copy results into docs only when the
  numbers are final.

---

## 5. What the next worker should do

1. Read `CORPUS-WIRING-STATUS.md` first — it is now accurate.
2. If wiring the corpus into the engine, add the gate check *before* wiring `corpus_hits` into
   claim formation (see §"How to wire it").
3. Fix the pose-query regression or document it as accepted.
4. Run weeks 2–8 for the coverage model before quoting a capability floor.
5. Commit the 4 tracked modifications on a `docs/audit` branch — never merge main.
