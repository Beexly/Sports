# Audit — 2026-11-04, measured on `hermes/overnight-2026-11-03-corpus` @ `14b8b31ca`

Every number below was produced by a command run in this session. Numbers from
prior sessions or from the audit skill's own recorded findings were **not**
transcribed — where they disagreed with a fresh measurement, both are shown and
the fresh measurement wins.

---

## Finding 1 — Metric name drift is LIVE and TOTAL (severity: high)

The repo's own audit skill records three metrics whose doc name and code name
disagree. The code half of that finding is **resolved**; the docs half is
**completely unresolved**.

Code (`packages/prediction-engine/src/metrics/gse-proprietary-seven.ts`):

```
176: * RLS — Route Liberation Score.
234: * SPESE — Special-Teams Expected Points.
264: * TOR — Turnover Regret.
```

Docs:

| Term | Files using the DRIFTED expansion | Files using the CORRECT expansion |
|---|---|---|
| "Situational Pace" / "Special-Teams Expected" | **8** | **0** |
| "Tackle Opportunity" / "Turnover Regret" | **11** | **0** |
| "Route Leverage Surplus" / "Route Liberation" | **9** | **0** |

Reproduce:
```bash
grep -rl "Situational Pace" docs/ | wc -l          # 8
grep -rl "Special-Teams Expected" docs/ | wc -l    # 0
grep -rl "Tackle Opportunity" docs/ | wc -l        # 11
grep -rl "Turnover Regret" docs/ | wc -l           # 0
grep -rl "Route Leverage Surplus" docs/ | wc -l    # 9
grep -rl "Route Liberation" docs/ | wc -l          # 0
```

This is worse than recorded. The skill says "three of seven metrics have
different names"; the measurement says **zero documentation files use the code's
expansion for any of the three**.

> **CORRECTION 2026-11-04 (same day, deeper read).** The counts above are right;
> **the prescription originally attached to them was wrong.** I first called this a
> mechanical rename of ~28 files with "zero risk." It is not, and renaming would
> have been a factual error.
>
> The files are **dated historical snapshots**, not live documentation. The
> dominant one, `Master_Execution_Report__The_Belichick.txt`, opens: *"as of
> October 24, 2026."* Its code blocks are the Oct-24 **design**, not the current
> implementation:
>
> ```
> doc : computeGseSpese(driveOutcomeProbs, epaBetween20s, epaRedZone3rdDown)
> code: computeGseSpese(input: { stEpa, stPlays, minPlays? })
> ```
>
> The metric **changed meaning**; it did not get a cosmetic rename. `TOR` was
> "LB Tackle Opportunity & Spine Conflict Rate" taking
> `(oppProjectedPlays, lbSnapShare, probBoxFitGivenPersonnel, paConflictFreezeRate)`;
> it is now "Turnover Regret" computed from fumble loss rates. Those are different
> quantities. Writing "Turnover Regret" over a code block that computes
> linebacker opportunity would mislabel a historical record and destroy the
> evidence of what the Oct-24 design did.
>
> **The real defect is different:** live documentation has no current-name
> glossary, so a reader cannot tell which names are current and which are the
> Oct-24 design. The fix is a `GLOSSARY.md` recording the current definitions plus
> a one-line "historical" banner on the dated snapshots — **not** a rename.
>
> Caught by applying the `ast-grep` skill, whose central invariant is that a bad
> pattern silently rewrites the wrong thing. The tool was the right one to reach
> for even though the files carry no AST: it forced the read-before-rewrite step.

Affected (sample): `docs/engine/research/2026-10-28/downloads/Autonomous_GSE_Coach-First_Engine_Plan.txt`,
`docs/engine/research/2026-10-28/downloads/Master_Execution_Report__The_Belichick.txt`,
`docs/data-sources/research/2026-10-28/KAGGLE-HF-HARVEST-MANIFEST.json`.

---

## Finding 2 — Over half the source tree has no non-test importer (severity: high)

```
source files scanned: 5534
zero-importer files: 2841
package-internal-only: 1167
externally consumed:   1467
```

51.3% of source modules are imported by nothing but their own test. Reproduce:
```bash
python reconciliation/_sweep_zero_importers.py
```

Largest clusters:

| Directory | Zero-importer files |
|---|---|
| `packages/data-ingestion/src` | 429 |
| `packages/prediction-engine/src` | 129 |
| `apps/web/lib/calibration` | 102 |
| `scripts` / `scripts/ops` | 94 / 92 |

**Spot-check performed** (the skill requires at least one per category, because
a passing sweep is not evidence). Three `data-ingestion` files — `0905-2997v1-active-learning`,
`0911-3249v1-markets`, `1006-4884v1-markets` — each returned exactly one
importer under a naive grep, which contradicted the sweep. Resolved: the single
importer in each case is the file's own `.test.ts` sibling, which the sweep
correctly excludes. **The sweep is right; my grep was wrong.** The 429 is real.

`packages/data-ingestion/src` holds 494 non-test files, of which 429 (86.8%) are
orphaned. That directory is effectively an archive, not a consumed package.

---

## Finding 3 — The skill's own recorded findings have drifted (severity: medium)

The audit skill asserts as a standing finding that `packages/mcp-equations-server`
claims a corpus via `MIND_CORPUS_3000.jsonl` and `PAPER_CATALOG.md` and that
"none exist." Measured:

| Claim | Measured |
|---|---|
| `MIND_CORPUS_3000.jsonl` does not exist | **FALSE** — exists at 2 paths, **5,303 lines** each |
| `PAPER_CATALOG.md` does not exist | **TRUE** — zero files match `*paper*catalog*` |
| `mcp-equations-server` references a corpus | **FALSE** — 0 hits for `MIND_CORPUS`/`PAPER_CATALOG` in its `src/` |

```bash
find . -iname "MIND_CORPUS*" | grep -v node_modules
#   docs/engine/research/2026-10-17/MIND_CORPUS_3000.jsonl
#   packages/prediction-engine/data/MIND_CORPUS_3000.jsonl
wc -l packages/prediction-engine/data/MIND_CORPUS_3000.jsonl   # 5303
find . -iname "*paper*catalog*" | grep -v node_modules | wc -l  # 0
```

So the corpus is real but mis-located in the record, and it is **5,303 lines, not
3,000** — the filename is aspirational. The skill's instruction ("verify corpus
claims against actual repo state") applies to the skill's own claims.

---

## Finding 4 — `tau_hat` wiring gap has been CLOSED (severity: informational)

The skill records `tau_hat.csv` as "the largest measured edge in the whole record
and nothing consumes it… zero non-test importers."

Measured: **62 non-test references** to `tau_hat`.

```bash
grep -rn 'tau_hat' packages/ apps/ intelligence/ --include=*.ts --include=*.py \
  | grep -v '\.test\.' | grep -v 'test_' | wc -l   # 62
```

The gap is closed. The record should be retired so the next audit does not spend
time re-measuring a solved problem.

---

## Finding 5 — Classes that measured CLEAN

| Class | Measurement | Result |
|---|---|---|
| Unenforced threshold exports | `node reconciliation/_audit_unenforced_thresholds.mjs` | **T12 GATE PASS**, self-test PASS, exit 0 |
| Placeholder commits (`PLACEHOLDER`, `REAL_RESTORED_CONTENT`) | grep over tracked `.ts`/`.py`/`.mjs` | **0 hits** |
| Sub-100-byte suspicious source files | 10 found, 3 inspected | all legitimate: re-export barrels + one exported constant |

The threshold gate passing is meaningful because the skill requires the sweep to
carry a self-test that proves it still detects its original target. Its output
confirms `MIN_EXPANSION_E_VALUE` is found **and** now gated — i.e. the machinery
has not silently gone blind.

---

## Not run (named gaps, not zeros)

- **arXiv citation verification.** 5+ files header-cite arXiv IDs
  (e.g. `2309-00756`, `2408-09178`, `2408-14837`). Each ID was **not** verified
  against arXiv in this pass. The skill's fabricated-citation hunt requires
  per-ID lookup; that is a separate pass and is NOT claimed here.
- **Seal invariant chain.** `data/engine/week9_tuesday_0400ct_sealed_baseline_2026.json`
  exists (md5 `009aaa86…`); its parent-hash chain and byte-identity against week 8
  were **not** verified. `candidates/` is tracked (10 files), contradicting the
  skill's "untracked placeholder" record — but I did not verify whether its
  parent hash is fabricated.
- **Live API contract verification.** 218 route surfaces exist; 211 undocumented
  (see `scripts/ops/api_docs_coverage.py`). Contract accuracy was not tested.
- **Full test suite.** Not re-run in this pass beyond the two sweep scripts.

---

## Recommended next actions, ranked by effect

1. **Write a current-name GLOSSARY** (Finding 1, corrected). NOT a rename — the
   dated snapshots are the Oct-24 design and must keep their own names. Record the
   seven current metric definitions in `GLOSSARY.md` and put a one-line
   "historical snapshot" banner on `docs/engine/research/2026-10-28/downloads/`.
   Then a reader can tell current from historical, which is the actual defect.
2. **Decide `packages/data-ingestion/src`'s status** (Finding 2). 429 orphaned
   files is not a wiring gap to close one-by-one; it is a package that is either
   an archive to retire or a subsystem awaiting a consumer. Name which.
3. **Update the skill's stale findings** (Findings 3–4) so the next audit does
   not re-measure solved problems or trust a wrong location for the corpus.
