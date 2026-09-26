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

## 1. Counts

| Bucket | Count | Note |
|---|---|---|
| Modules audited | 704 | recounted from the tree |
| REAL_IMPLEMENTATION | **5** | **hand-read floor, not a census** |
| TEMPLATE_STAMP | 307 | shared algorithm body across different paper ids |
| BROKEN | 0 | |
| UNRESOLVED | 392 | unique body, attribution unverified |
| DUPLICATE_COLLAPSED | 2 | `2607.08725`, `2503.04638` |

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
- at least one test in the repo exercises the quantity, and the test's
  assertions are about the paper's claim rather than about the module's own
  constants;
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
| Generation records, per worker | `docs/research/2026-09-21/arxiv-program/phase2/wave-reports/wave1-reader-01..61.jsonl` | yes, 61 files |
| Lane/bucket assignment | `normalized_lane`, `bucket` fields in the same JSONL | yes |
| **The module header+body template itself** | — | **not committed** |

Two things the audit would need to establish, both currently unanswerable from
committed artifacts:

- **The template is not in the tree.** The nearest file,
  `docs/research/2026-09-21/arxiv-program/state/ledger-template.md`, is the
  *arXiv-deep ledger* template, not the module header template. The stamping
  therefore cannot be reproduced or diffed against its source.
- **The record source does not cover the stamped ids.** 269 of the 307 stamped
  modules have no matching `arxiv_id` in `IMPROVEMENT-LEDGER.jsonl`. So the
  headers those modules cite came from a different or extended record set that
  is not identified in the tree. Finding that set is the first question of the
  audit.

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
