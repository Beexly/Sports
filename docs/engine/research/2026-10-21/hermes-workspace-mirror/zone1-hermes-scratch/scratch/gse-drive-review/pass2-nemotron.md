# Pass 2 — Directory Tree Comparison

## G: Drive Paths Examined

### 1. `sports-intelligence-os-phase-9-ci`
**Status: Gitlink (submodule reference), not a directory tree**

File content:
```
0000000000000000000000000000000000000000 335311d1774509e7c282205b70aa3047c57de20b unknown <Garrett@Beexly.(none)> 1779419816 -0500	fetch origin main sports-intelligence-os-phase-9-ci: storing head
```

This is a gitlink reference file containing a commit hash and ref metadata. No source tree is present on disk.

### 2. `sports-prediction-platform` (via `sports-prediction-platform-6F7Wa`)
**Status: Gitlink (submodule reference), not a directory tree**

File content:
```
0000000000000000000000000000000000000000 d693ecf34f2c6e21d8f6adab450fc0c0c926edc7 unknown <Garrett@Beexly.(none)> 1776739932 -0600	branch: Created from refs/remotes/origin/claude/sports-prediction-platform-6F7Wa
```

This is a gitlink reference file containing a commit hash and ref metadata. No source tree is present on disk.

## Live Branch: `C:\Users\Garrett\Sports-wt-intel\intelligence`

**Status: Full working tree present**

### Search Results for Target Concepts

| Concept | Found in Live Branch? | Details |
|---------|----------------------|---------|
| **"leakage gate"** (exact phrase) | **No** | No matches for exact phrase "leakage gate" |
| **"temporal fence"** (exact phrase) | **No** | No matches for exact phrase "temporal fence" |
| **"refusal"** | **Yes** | Multiple references across doctrine, reasoning, signals, tests |

#### Refusal References in Live Branch
- `doctrine/honest-refusal.md` — Documents the refusal policy; states live refusal is `integration/api.py` raising/recording `DATA-GAP`, checklist refusing `UNCHECKED` at L3+
- `integration/api.py` — Implements `DATA-GAP` refusal at line 152 (anti-leakage context)
- `calibration/receipts.py` — "refusal to use them as weights"
- `qb/props.py` — "correct output is refusal, not a number"
- `reasoning/schemas.py` — "near-refusal shadow metrics"
- `reasoning_engine/README.md` — "INVALID is a refusal, not a failed kill"
- `signals/registry.json` — "inherits the same unsigned-continuous refusal as its family"
- `tests/e2e/test_t1_real_e2e.py` — "The refusal is the feature"

#### Anti-Leakage (Not "Leakage Gate")
The live branch uses **"anti-leakage"** as a design principle throughout (30+ occurrences):
- `trust/leakwall.py` — Feature store with as-of / no-leakage semantics
- `newregime/feature_store.py` — Leakage rule: nearest-past-value with per-source delay; backfill runner: no-leakage by construction
- `qb-behavior/` — Multiple files enforce strictly-before weeks only
- `coaching/pressure_answer.py` — Strictly-prior weeks (anti-leakage)
- `trust/evidence_guard.py` — `leakage_attested` check

#### Temporal (Not "Temporal Fence")
- "temporal" appears only in research paper summaries (arXiv metadata), not as a runtime gate/fence

## Conclusion

**Neither G: drive path contains a readable directory tree.** Both are gitlink reference files pointing to commits that are not checked out locally. Therefore, no "leakage gate", "temporal fence", or "refusal" code can be quoted from those trees — they do not exist on disk.

The live branch `C:\Users\Garrett\Sports-wt-intel\intelligence` contains:
- A documented **refusal policy** (`honest-refusal.md`) with implementation in `integration/api.py` (DATA-GAP)
- Pervasive **anti-leakage** enforcement by construction (as-of queries, strictly-before windows, backfill runners)
- No code matching the exact phrases **"leakage gate"** or **"temporal fence"**

**Answer:** The G: drive paths are gitlinks, not directory trees. No code can be quoted from them. The live branch has a refusal gate (DATA-GAP in `integration/api.py`) and anti-leakage by construction, but no named "leakage gate" or "temporal fence".