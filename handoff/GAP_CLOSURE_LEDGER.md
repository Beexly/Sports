# The Gap Closure Ledger — 28 gaps, every status re-derived by a probe

**Branch:** `audit/reconciliation-2026-10-20`
**Date:** 2026-10-21
**Files:** `reconciliation/gap_closures.json` (the ledger), `reconciliation/_verify_gap_closures.mjs`
(the machine that re-derives and checks it), `.github/workflows/ci.yml` (a step that runs it)

---

## 1. The hole this fills

`reconciliation/gaps.json` records **28 gaps** — 6 CRITICAL, 10 HIGH, 8 MEDIUM, 4 LOW;
**15 block the current business model** — and it has **no field saying whether any of them
is closed**. There was no way to ask "how much of the audit is actually done?" without
re-deriving it from scratch. That was named as the single biggest bookkeeping hole in the
work, in the handoff, three times.

## 2. Why it is a SEPARATE file, and not a `status` field on `gaps.json`

**`gaps.json` is GENERATED.** `reconciliation/_build_gaps.py` writes it and
`reconciliation/_integrate_recon.py` merges into it. A hand-added `status` field would be
**wiped on the next regeneration**, and the ledger would silently rot back to "no status
known" — a failure that looks like a green build.

A separate file cannot be clobbered by a generator that does not know about it. And
because the ledger is derived, it can be **checked** rather than trusted.

## 3. The ledger, as it stands

```
counts: {"open": 18, "partial": 9, "closed": 1}
```

**One gap is closed. That is the honest number**, and it is much lower than the work feels
like it accomplished — which is exactly why the ledger is worth having.

| status | count | meaning |
|---|---|---|
| `closed` | **1** | the gap's claim no longer holds, **and a probe proves it** |
| `partial` | 9 | part of the gap is addressed; the probe measures exactly how much |
| `open` | 18 | the gap's claim still holds, **and a probe proves it** |
| `not_attempted` | 0 | recorded and untouched — **nobody has measured it** |

`not_attempted` is a distinct status on purpose. "Open" means *someone measured it and it
still holds*; "not_attempted" means *nobody has looked*. Conflating them would let a gap
look audited when it was never checked.

**The one closed gap is GAP-27** (the X-transport regex), plus GAP-14 moved to `partial`
because the coverage auditor now exists and enforces, but **is not wired into CI**.

**The eight partial ones are the honest middle**, and the two that this audit moved are
worth naming: **GAP-21** (the 8-reader default divergence is now documented and pinned by a
test, but the default is still wrong and the mint path still does not consult the gate) and
**GAP-23** (G7 is now wired — but 2 of the 5 named gates still have no live CALL site).

## 4. Every status is a PROBE RESULT, not an opinion

Each gap carries a mechanical probe — a grep, a file check, an artifact's own count — and
the script **runs them**. The probe is named in the ledger, so a reader can check the
probe rather than trust the answer.

Some of what the probes now measure, that a reader would not have guessed:

- **GAP-11** — *560 of 1014* non-test prediction-engine modules are unreachable from a
  production entry; 255 arxiv-derived ones are unreachable. (The gap's own title said
  "395 of 1014 ... reachable only through the barrel or not at all". The probe measures
  reachability, and the number is worse than the gap claimed.)
- **GAP-20** — **2,174 source files have ZERO importers** of 4,269 scanned, and 888 more are
  imported only inside their own package.
- **GAP-15** — the `walk_forward.json` artifact is **not on this branch**; it lives at
  `origin/grok/walk-forward-2026-10-14:dfs/walk_forward/walk_forward.json`, and the probe
  reads it from there. It still reports `gate_cleared=false` — the artifact documents a gate
  the code did not enforce.

## 5. The probes were wrong twice, and the ledger lied both times

**This is the part worth reading, and it is why the ledger is machine-checked.**

**First run: GAP-20 reported `closed` ("0 modules have zero importers").** It is **2,174**.
The probe read `z.zeroImporters`, and the artifact's key is `zero_importer_files` — a
different name, so the probe saw nothing and concluded there was nothing to fix. **A probe
that measures the wrong thing reports a confident wrong answer**, and a wrong answer in a
closure ledger is worse than no ledger, because it looks authoritative.

**Second: GAP-23 reported every named gate as wired.** The probe used a **prefix** match,
so `evaluatePromotionForPublish` — a *different* symbol — counted as a caller of
`evaluatePromotion`. The probe now matches the symbol exactly **and distinguishes a CALL
from an import, a definition, and a docstring**. The corrected answer: **2 of the 5 named
gates still have no live call site** (`assertDisplaySubstantiated` and `publicCommitPick`).

**Also fixed:** GAP-19 read `literature_coverage.json`; the file is
`literature-coverage.json` (a hyphen). GAP-15 reported "artifact not on disk" when the
artifact simply lives on another branch. GAP-11 read a `barrelOnly` key that does not exist.

**Each of these was caught by reading the probe against the artifact it claims to measure**,
which is the same discipline the audit applied to the guards: *would this fail if the
behaviour it pins broke?* A probe that cannot fail is a probe that cannot lie — until it
measures the wrong key, and then it lies loudly.

## 6. The regression check — a closure is a claim CI re-checks

Because the statuses are re-derived on every run, a closure that stops holding flips itself.
**But a silent flip is not enough.** So the script reads the **previous** ledger first, and
a gap that was `closed` and is no longer closed is a **regression**: the script exits **1**
and names the gap.

**Proved, not asserted.** A false `closed` was planted on GAP-01 (which is genuinely open)
and the script was re-run:

```
=== with a planted false 'closed' on GAP-01: exit = 1
    === REGRESSION: a closed gap is no longer closed
    !! GAP-01 was closed, is now open: the clamp is still in the publisher
```

The ledger was then restored and the script re-ran to exit 0.

**And it is in CI** — a step, not a note:

```yaml
- name: Verify the gap closure ledger (re-derives every status; fails on a regression)
  run: node reconciliation/_verify_gap_closures.mjs
```

## 7. What this is and is not

**It is:** the audit's completion state, as a queryable fact, with every status
re-derived by a probe and every closure re-checked by CI.

**It is NOT a second source of truth for the gaps themselves.** `gaps.json` still holds the
claims, the evidence and the impacts; the ledger holds only the status, the probe and the
probe's evidence. If they disagree, `gaps.json` is the finding and the ledger is the
measurement.

**It is NOT a claim that 1 of 28 is all the audit did.** The audit landed 92 commits: 17
probe modules with mutation sweeps, 3 CI guardrail matrices (21 suites, 322+ assertions that
never gated a commit), 2 pre-existing `apps/web` surface failures fixed by asserting the
*stronger* property, the G7 circuit breaker's noise floor (393 of 400 healthy families were
being halted), GAP-27 closed, and G7 wired to the live publish path. **Most of that work was
never expressed as a `GAP-nn` item**, because the gaps were catalogued from the spec and the
repo, and the work was driven by what the probes found. The ledger measures the gaps; it
does not measure the audit.

## 8. The four next things, ranked by what the ledger now says

1. **GAP-20 (2,174 zero-importer files) and GAP-11 (560 unreachable modules)** — the two
   biggest measured numbers in the whole audit, and they are the same problem seen twice.
2. **GAP-01 / GAP-02 / GAP-03 (the Python publish path)** — the clamp, the missing gate, and
   the bypass are one story: `scripts/publish_late_sun_mon_live_free.py` is the path that
   produced the Week 6 board, and it bypasses the entire TypeScript honesty stack.
3. **GAP-21** — the founder's law is recorded; the default diverges from it; one line and
   one mint-time read. See `GAP21_PUBLIC_PICKS_ENABLED_READERS.md` §6b.
4. **GAP-24** — still no gate registry. **This ledger is the closest thing that exists, and
   it covers GAPS, not GATES** — so the gap stands, and the honest next step is to extend
   this pattern to the gates.
