# NEEDS_REVIEW — ledger quarantine, 2026-09-26

JEV-locked body audit. **QUARANTINE is in force for every module listed as
TEMPLATE_STAMP or UNRESOLVED below.** Files are kept, not deleted, not
overwritten. Nothing in this run deletes or modifies a module.

## Why IMPLEMENTED.md was not edited

The standing constraint for this work is *new files only, never modify
existing files*. This register is the `NEEDS_REVIEW` tag. If the ledger itself
should carry an inline marker, that is a one-line change needing a human —
flagged rather than done unilaterally.

## Counts

| Bucket | Count |
|---|---|
| modules audited | 704 |
| REAL_IMPLEMENTATION (hand-read only) | 5 |
| TEMPLATE_STAMP | 307 |
| BROKEN | 0 |
| UNRESOLVED (unique body, attribution unverified) | 392 |
| DUPLICATE_COLLAPSED | 2 |

## TEMPLATE_STAMP — 307 modules

Criterion: code body byte-identical to a module filed under a DIFFERENT arXiv
id. Verified under both a strict hash and a string-stripped hash, so the match
is not an artefact of embedded strings. One shared body cannot be a port of
many distinct papers. Largest clusters:

| Papers sharing one body | Example arXiv ids |
|---|---|
| 30 | ., 0, 1, 2, 4, 6, 8, :, X, a, i, r, v |
| 23 | ., 0, 1, 2, 3, 7, 8, 9, :, X, a, i, r, v |
| 17 | ., 0, 1, 2, 3, 5, :, X, a, i, r, v |
| 14 | ., 0, 1, 3, 6, 9, :, X, a, i, r, v |
| 14 | ., 0, 1, 2, 5, 6, :, X, a, i, r, v |
| 11 | ., 0, 1, 2, 4, 8, 9, :, X, a, i, r, v |
| 10 | ., 0, 1, 2, 7, 8, 9, :, X, a, i, r, v |
| 10 | ., 0, 1, 2, 3, 5, 6, :, X, a, i, r, v |

Per-module detail with evidence lines:
`docs/research/2026-09-21/wiring/audit/body-audit-2026-09-26.csv`

## Hand-confirmed mismatches (not inferred from the hash)

| Module | Mismatch |
|---|---|
| `2508-11711v2-data-infra` | Hand-read: header names LLM/sentence-transformer/CNN malicious-query detection, the same field states 'no LLM or learned detector is on the decision path', and the body is a static allowlist + rate-limit gate. Documented divergence, but the paper's method is absent. |
| `2601-03099v1-tracklet-association` | Hand-read: header/ACCEPTANCE_GATE describe Time-Aware Synthetic Control (placebo RMSE vs classical SC); Mechanism and body implement ReID cosine-distance tracklet association. First confirmed instance of the failure mode. |

## UNRESOLVED — 392 modules

Unique code body, so not template-shared. Paper attribution is NOT verified:
nothing here is claimed real or fake. Each needs the cited paper read against
the body. Quarantine holds until then.

## Method note — the automated screen was abandoned

Three lexical classifiers were built; all three failed their control set and
produced three different wrong counts (89 stamps; 478 BROKEN; 130 stamps / 6
real). Controls were hand-verified modules with known classifications. The
screen feeds no bucket. The surviving evidence is the byte-identity hash,
which requires no calibration.
