# Bradley-Terry "Condition-4.1" — verification report

Scope: read-only per prompt. No repo modified. Searched `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26`, the named calibration file, and briefs quoting the condition.

## Attribution (corrects the prompt's framing)

pass2-glm's own output (`pass2-glm.md` line 62, this scratch dir) sources Condition-4.1 to "the 1494 brief", i.e. the Dynamic Bradley-Terry paper **arXiv:2003.00083v1** (Bong, Li, Shrotriya, Rinaldo, AISTATS 2020, *Nonparametric Estimation in the Dynamic Bradley-Terry Model*) — **not** to arXiv:2110.03874 (BTL UQ).

No tree searched contains a "Condition 4.1" in connection with 2110.03874. That paper's numbered §4 items, per its corpus brief (`…arxiv-deep__1819-uncertainty-quantification-in-the-bradley-terry-luce.brief.md` in the same zip), are Prop 4.1 (CLT), Prop 4.3 (rank CI), Props 4.4/4.5 (ℓ₂ risk), Thm 4.7 (minimax) — no quoted condition.

## The condition text (verbatim quotes)

**Source 1 — GSE drive tree.** Inside `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26\corpus-intelligence-2026-10-02.zip`, entry `corpus-intelligence/briefs/c10/r26/1494-dynamic-bradley-terry.md.brief.md`:

> "Existence/uniqueness: Ford (1957) condition adapted — Condition 4.1: every partition of teams has an i→j edge with X̃_ij(t)>0 (strong connectivity of smoothed comparison graph); Theorem 4.1. W.h.p.: P(Cond 4.1 holds ∀t) ≥ 1 − 4N²exp(−NTp_min/2) (Thm 5.1)."

> "Existence check (Condition 4.1 strong connectivity) as cheap principled guardrail before fitting any pairwise rating, esp. early-season: [TRUST-SIGNAL]"

> "…adopt the Condition 4.1 connectivity guardrail before publishing any pairwise rating."

This is the only brief in all 4,414 zip entries quoting "Condition 4.1".

**Source 2 — Sports repo deep-read ledger** (same paper, fuller wording): `C:\Users\Garrett\Sports-wt-pick-gate\docs\arxiv-program\research\2026-09-21\arxiv-deep\1494-dynamic-bradley-terry.md`, lines 16 and 43:

> "Existence/uniqueness: Ford (1957) condition adapted to smoothed data — Condition 4.1: every partition of teams has an i→j edge with X̃_ij(t)>0 (⇔ strong connectivity of the smoothed comparison graph); Theorem 4.1 gives uniqueness at time t."

> "Existence check: before fitting any pairwise rating at a time point, verify Condition 4.1 (strong connectivity of the comparison graph); if it fails, the MLE doesn't exist and the rating is arbitrary — smooth or regularize rather than publish. This is a cheap, principled guardrail for early-season ratings."

**Source 3 — wave report** (same repo): `…arxiv-program\phase2\wave-reports\wave3-reader-3b3.json`, paper 2003.00083v1 entry:

> "Ford (1957) condition adapted to smoothed data (Condition 4.1, strong connectivity) for existence/uniqueness"

## On the "(connectivity / sample gate)" gloss

"Connectivity" is verbatim-supported. "Sample" enters only via the paired probability bound quoted above — P(Cond 4.1 holds ∀t) ≥ 1 − 4N²exp(−NTp_min/2) (Thm 5.1) — where sample size N·T and density p_min govern how surely the connectivity holds. No tree text calls Condition 4.1 itself a "sample gate". The `MIN_ADOPTION_GAMES = 40` floor in `2110-03874-bradley-terry-uq.ts:32` is repo doctrine, not the paper's condition.

## ABSENT from the trees

- **The paper's own typeset wording of Condition 4.1**: ABSENT. No `2003.00083v1.pdf` in the drive folder (nearest ID present is `2003.12185v1.pdf`), no 2003.00083 fulltext in any zip, none in the Sports repo tree. Everything above is the briefs'/ledger's quotation of it, not the paper's own text.
- **2110.03874 full text**: ABSENT from the drive (no matching PDF; `arxiv-sweep-2026-10-02.zip` fulltext holds other 2110.* papers only; `raw_bradley_terry.json` contains no 03874 entry).
- Any "Condition 4.1" quote in the named file `2110-03874-bradley-terry-uq.ts`: ABSENT (it quotes the paper's mechanism and its own acceptance gate, no numbered condition).

## Search caveats

- 30+ `.gdoc` files in the drive root are unreadable virtual files ("Incorrect function", OS error 1) and could not be searched.
- rg found no "bradley"/"2110.03874" matches in any readable plain file in the drive tree outside the zips; subdirectories (`repo-intel`, the four repo checkouts) were also searched — no matches.
