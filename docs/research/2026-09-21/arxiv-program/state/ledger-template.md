# arXiv Deep-Dive Ledger Template (GSE 500-paper program)

Every paper researched in depth gets ONE ledger file. A paper counts toward the 500 ONLY when its full ledger is complete and verified. Abstract screening does NOT count.

## How to obtain the full text
1. Try the HTML version first: `https://ar5iv.org/html/{id}` (strip version suffix if needed; try both).
2. Fallback: `https://export.arxiv.org/api/query?id_list={id}` for metadata, or the PDF at `https://arxiv.org/pdf/{id}`.
3. If the full text is genuinely inaccessible (withdrawn, no ar5iv HTML, PDF unparseable), record the paper as BLOCKED in the manifest with the exact reason — do NOT write a ledger from the abstract. Blocked papers are replaced from the reserve list.

## Ledger file format (markdown)

```markdown
# [NNN] Title (arXiv:ID)

**Citation:** Authors (Year). *Title*. arXiv:ID. URL: https://arxiv.org/abs/ID
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML / PDF).
**Verdict:** ADOPT | ADAPT | REJECT — one sentence.

## 1. Research question
What question does the paper answer? One paragraph.

## 2. Dataset / schema
Every dataset used: name, size (rows/periods), time range, schema (key columns), access (public URL / request / proprietary). If proprietary and unreplicable, say so.

## 3. Method / model
Architecture and algorithm, in enough detail that a competent engineer could reimplement. Training procedure, hyperparameters where given.

## 4. Equations & assumptions
The actual mathematics, copied faithfully. List every stated assumption. If the paper states no equations, write "No equations stated" — never invent.

## 5. Features / target
Input features (exact list as given), target variable, label definition, prediction horizon.

## 6. Validation design
Train/validation/test splits (dates), backtesting protocol, baselines compared, metrics reported. Note whether splits are time-ordered.

## 7. Numerical results / baselines
Every key number quoted EXACTLY as in the paper (metric values, confidence intervals, sample sizes). Distinguish the paper's claims from your interpretation.

## 8. Code / data availability
Links as stated. If none stated, write "None stated".

## 9. Leakage & limitations
Lookahead bias, survivorship bias, data snooping, overfitting risk, unstated assumptions, sample-size concerns, external validity to NFL. Be adversarial.

## 10. GSE overlap
What GSE already does in this space — cite specific repo files/docs where possible. Is this duplicate, extension, or new capability?

## 11. GSE implementation spec
Concrete build plan: data sources (nflverse, FTN charting, odds APIs...), feature engineering steps, model choice, training protocol, serving/inference design, estimated effort.

## 12. Reproducible test
How to test this with GSE's data: exact dataset, exact metric, exact baseline to beat, time window. Must be runnable, not aspirational.

## 13. Acceptance / rejection gate
Numeric criteria: adopt if X beats baseline by Y on test window Z; reject otherwise. State the gate before running the test.

## 14. Improvement experiment
One concrete follow-up experiment that goes beyond the paper — what would you try next, and why it might beat the paper's approach.
```

## Rules
- Quote numbers exactly; never round silently. Cite the paper section or table when possible.
- Distinguish paper claims from your own inference in every section.
- If a section's information is absent from the paper, write "Not stated in paper" — never fill gaps with guesses.
- GSE overlap must reference the existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md) so nothing duplicates Garrett's existing work.
- File naming: `NNNN-slug.md` (NNNN = zero-padded manifest index 0001–0500). Slug = first 5-6 words of title, lowercase, hyphens.
