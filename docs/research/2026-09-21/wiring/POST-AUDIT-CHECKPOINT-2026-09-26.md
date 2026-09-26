# Post-audit checkpoint — 2026-09-26

Run type: checkpoint. No build work followed. One file written, nothing
modified, nothing deleted, no NEEDS_REVIEW tag stripped, `IMPLEMENTED.md`
untouched.

Branch `hermes/wire-papers-2026-09-26` @ `030c6c0f5`.

---

## Correction to my own earlier wording

Last turn I wrote that 308 modules share a **byte-identical body**. That was
imprecise and I am correcting it before anything is built on it.

The files are not byte-identical. They differ in their per-module attribution
constants — `ARXIV_ID`, `LANE`, `VERDICT`, `ENABLED` — which carry the arXiv
id. Measured precisely:

- 31 `tracklet-association` modules → **31 distinct raw bodies, 1 distinct
  algorithm body**.
- The 31 corresponding test files → **31 distinct bodies** (tests were not
  copy-pasted).

So the accurate statement is: **308 of 704 modules (43.8%) share an identical
algorithm body with a module attributed to a different paper, differing only
in the constants that name the paper.** One algorithm cannot be a faithful port
of 31 distinct papers, so the finding stands in substance and my earlier
phrasing overstated it. I should have measured with the id constants removed
before using the word "byte-identical."

---

## 0. Census restated, with the normalizer, on the checkout actually in use

**Checkout: `/tmp/wtp` · branch `hermes/wire-papers-2026-09-26` · commit `aa094062c` · base `origin/main @ d667351f9`.**

The `7d891ec71` figures were measured on a different commit (the `[hermes-V3]`
lane, "correct V3-347/348 SHAs after rebase onto origin"). The trees differ, so
the totals are not expected to match. They are reported side by side rather
than reconciled away.

### The normalizer, written down

Implemented in `audit/normalizer.py`, with the same explanation in its
docstring. Three hashes:

- **hash 1 — raw.** The entire file, verbatim bytes. No transformation.
- **hash 2 — algorithm.** (a) remove the leading `/** ... */` block comment,
  which carries the arXiv id, the improvement record and the acceptance gate;
  (b) drop blank lines and lines starting `//`, `*`, `/*`; (c) drop any line
  containing a backtick; (d) drop every line matching
  `^(export )?const (ARXIV_ID|LANE|VERDICT|ENABLED|ACCEPTANCE_GATE|DOCTRINE)\b`;
  (e) collapse whitespace; (f) join and md5. **Only hash 2 buckets anything.**
- **hash 3 — assertion.** hash 2, then keep only lines bearing an assertion
  (`expect(`, `assert.`, `toBe*`, `toEqual*`, `toBeCloseTo*`,
  `toBeGreaterThan*`, `toBeLessThan*`, `toHaveLength*`, `toThrow`). Test files
  only.

### data-ingestion/src, measured both places

| Measure | `7d891ec71` | `aa094062c` (this checkout) |
|---|---|---|
| non-test `.ts` modules | 461 | **478** |
| …of which export `ARXIV_ID` | 362 | **368** |
| …of which do not | — | 110 |
| share an algorithm body across >1 paper id | **269** | **269** |
| …in how many groups | **34** | **34** |
| `wave-reports` entries | **61** | **61** |
| `wave1-reader` range | 01–10 | **01–10** |
| `wave1` tracklet modules: raw / algorithm hashes | — | **31 / 1** |
| their tests: raw / algorithm / assertion hashes | 31 / — / 1 | **31 / 31 / 1** |

**Every shared-body figure matches exactly**: 269 modules, 34 groups, the 31
tracklet modules as one group, 31 test raw hashes collapsing to **1 assertion
body**, 61 wave-report entries, wave1-reader 01–10. Only the two file totals
differ (478 vs 461, 368 vs 362), which is a +17 / +6 tree delta between the two
commits. I have not chased that delta further; it is a difference in checkout,
not a disagreement about the finding.

The assertion hash is the load-bearing new number. The 31 tracklet test files
have 31 distinct algorithm bodies — they are not copy-paste — but **1 distinct
assertion body**. They assert the same things. See §2.

---

## 1. Counts

Full tree, this checkout. **Five buckets, summing to 706.**

| Bucket | Count | Note |
|---|---|---|
| Modules audited | 704 | non-test, paper-derived, whole tree |
| REAL_IMPLEMENTATION | **5** | **hand-read floor, not a census** |
| TEMPLATE_STAMP | 307 | shared algorithm body across different paper ids |
| BROKEN | 0 | |
| UNRESOLVED | 392 | unique body, attribution unverified |
| **DUPLICATE_COLLAPSED** | **2** | `2607.08725`, `2503.04638` |

5 + 307 + 392 = **704**. The two collapsed duplicates are a **fifth bucket**,
`DUPLICATE_COLLAPSED`, and they are not paper-derived modules at all — they are
`2607.08725` and `2503.04638`, each of which appeared **twice** in the 29-URL
set Garrett sent, collapsed to one row each and not double-counted. The CSV has
**706 rows** for that reason. They sit in no other bucket and are not evidence
about any module; they are a property of the input list, not of the tree.

The 5 are the modules I opened and confirmed by reading. There are certainly
more real modules among the 392; the 5 are the number I can defend, and they
must not be read as "only 5 modules are real."

Bug-fix record stands as reported: reintroducing the three bugs produced 3, 2
and 3 failures; restored tree 28/28. No severity or credibility score invented.
`lexical-screen-ABANDONED.py` left in place, not revived.

---

## 2. Proposed first adjudication batch for the 392 — NOT executed

**Size: 40 modules.** Rationale: large enough that a 25% stamp rate is
distinguishable from zero with useful precision, small enough that each gets
a real read against its source paper.

**Selection: stratified, not random-only.** The 392 are already known to have
unique bodies, so a uniform random sample would be dominated by whatever slug
vocabulary happens to be most common. Strata, in this order:

1. **Stratum A — the 11 "filed as wired" (10).** Highest value. These carry
   the strongest existing claims, and one of them (`2601-03099`) is already a
   confirmed mismatch. A failure here is the most informative single result in
   the batch.
2. **Stratum B — the ledger's own DEFERRED and NEEDS-HUMAN items (15).** These
   are named in `IMPLEMENTED.md` as not small work or gated on a human call.
   Their existence as ledger rows plus a module body is exactly the case the
   audit needs to resolve.
3. **Stratum C — 15 drawn uniformly at random with a fixed seed** from the
   remainder, to get an unbiased rate estimate alongside the targeted strata.

**What counts as REAL.** All four must hold:
- the body implements the quantity the paper actually names, read from the
  paper rather than from the module header;
- the exported symbols correspond to that quantity;
- **a repo test exercises the paper's claim, and that test is not a copy.** A
  test file whose assertion body (hash 3) is identical to a sibling paper's
  test does **not** satisfy this condition, no matter how the test file's raw
  bytes differ or how many assertions it contains. The 31 tracklet tests are
  exactly this case: 31 distinct test algorithm bodies, **1 distinct assertion
  body**. They assert the same things about the same shared implementation, so
  they attest to the template, not to 31 papers. Distinct-looking test files
  are not independent evidence.
- the module's `ACCEPTANCE_GATE` is evaluable against the body, i.e. the gate
  is not a string with no code behind it.

**What counts as TEMPLATE_STAMP.** The body does not implement the paper's
named quantity. The 307 already found are excluded from this batch.

**What is neither.** Lands in UNRESOLVED again, with the reason recorded. No
module is promoted to REAL on a partial read, and a failed read is a result,
not a reason to keep going.

**Deliverable per module:** one CSV row — bucket, the paper's named quantity
as read from the paper, the body line numbers that decided it, and a one-line
note. No code changes. No renames. No deletions.

---

## 3. Pipeline audit scope — named, NOT run

The generator is not a single committed script. It is a chain, and only parts
of it are in the tree:

| Stage | Path | In tree? |
|---|---|---|
| Per-paper record source (supplies `Improvement (record)` and `ACCEPTANCE GATE`) | `docs/research/2026-09-21/arxiv-program/index/IMPROVEMENT-LEDGER.jsonl` | yes, 1,251 records, same field schema as the module headers |
| Generation records, per worker | `docs/research/2026-09-21/arxiv-program/phase2/wave-reports/` | yes, **61 entries** |
| Lane/bucket assignment | `normalized_lane`, `bucket` fields in the same JSONL | yes |
| **The module header+body template itself** | — | **not committed** |

Correction, 2026-09-26: this checkpoint previously said *"269 of the 307
stamped modules have no matching `arxiv_id` in `IMPROVEMENT-LEDGER.jsonl`."*
**That was wrong — my lookup was broken, not the data.** The extracted keys
carried an `arXiv:` prefix, so every lookup missed. Re-run correctly:

```
modules exporting ARXIV_ID      : 368
ids matching ledger exactly     : 368
ids matching after version-strip:   0
ids NOT in ledger at all        :   0
```

**All 368 exported ids match `IMPROVEMENT-LEDGER.jsonl` exactly.** There is no
unidentified record set. The earlier claim is withdrawn in full, and the
"two gaps" framing collapses to one.

Correction, 2026-09-26: this checkpoint previously named the generation
records `wave1-reader-01..61.jsonl`. **That is wrong.** `wave-reports/` holds
**61 entries** spanning three waves:

- `wave1-reader-01.jsonl` … `wave1-reader-10.jsonl` — **wave1 is 01–10 only**
- `wave2-reader-11.jsonl` … `wave2-reader-20.jsonl` (+ `wave2-reader-12-search-log.md`)
- `wave3-reader-01..19.json` (mixed `.json` and `.jsonl`, with `-2b`, `-3b1..3b3` variants)

So the reader fan-out is roughly 10 + 10 + 19 = 39 generation runs across 61
files, not 61 runs.

**The one real gap** the audit would still need to close: the module
header+body template is not committed anywhere in the tree. The nearest file,
`docs/research/2026-09-21/arxiv-program/state/ledger-template.md`, is the
*arXiv-deep ledger* template, not the module header template. The stamping
therefore cannot be reproduced or diffed against its source.

Second lane, and it does not outrank adjudication.

---

## 4. Verification-column spec — proposed, ledger NOT edited

Additive migration in a later run. Not applied here.

**Field name:** `verification` — placed in
`docs/research/2026-09-21/wiring/` registers first. If and when it is adopted
into `IMPLEMENTED.md`, it goes in as a **new column**, not as a rewrite of
existing rows.

**Allowed values:**

| Value | Meaning | Who may set it |
|---|---|---|
| *(absent)* | legacy row, never adjudicated. **Not** a pass. | nobody — absence is the default |
| `HAND_READ_REAL` | a named person read the body against the paper and recorded evidence lines | a named reviewer, recorded by name in the row |
| `HAND_READ_STAMP` | same, outcome was a mismatch | a named reviewer |
| `SHARED_BODY` | machine result: algorithm body identical to a module under a different id. Not a verdict on the paper, a flag on the module | the audit script only |
| `SCREEN_UNRESOLVED` | screened, inconclusive | the audit script only |
| `UNREAD` | in quarantine, body not yet examined | the audit script only |

**Who may set REAL.** `HAND_READ_REAL` and `HAND_READ_STAMP` are settable only
by a human who has opened the body and the paper, and only with the evidence
lines recorded. No script may write either value. `SHARED_BODY` is a machine
result and deliberately cannot be promoted to a verdict by a machine.

**Consequence to state plainly:** the 5 confirmed real modules are a floor. A
row that has never been adjudicated is not a pass, and nothing downstream may
treat an absent value as an approval.

---

## 5. Confirmations

- **2606.18512 is still unwired.** `grep -rl "2606.18512|two-way synthetic"`
  over `packages` and `apps` returns no matches.
- **No new paper was pulled and none was wired.** Two `.ts` files exist on this
  branch, both from the earlier part of the day: the `2609-19354` rank-first
  gate and its test. The audit added no module.
- Nothing deleted, no body overwritten, no NEEDS_REVIEW tag stripped,
  `IMPLEMENTED.md` untouched.
- The four not-wired-with-reason papers are preserved in
  `CROSS-DOMAIN-MAP-2026-09-26.md` §4, not re-triaged.
- Cross-domain patterns remain in
  `research/cross-domain-patterns-pending.md`, unvalidated.

**Stopping here for review.**
