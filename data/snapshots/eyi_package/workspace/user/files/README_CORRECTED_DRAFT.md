# MOVE-37 research corpus

Curated text/code/log evidence for the GSE machine-discovery lane (PROJECT
MOVE-37), 2026-09-13 → 2026-09-14. This directory holds everything a Minis
agent or future worker needs to independently re-test the work — theorist
submissions verbatim, lab execution scripts, run logs, audit notes, and the
Minis retest prompt. Nothing here is derived from memory; every claim traces
to a file in this directory or a named run.

**What is NOT here (by design):** the 6 GB local discovery directory
(`~/workspace/gse-discovery/`, incl. `symbolic-regression/` data and venvs)
and raw parquet datasets. Only curated, human-readable evidence lives in the
repo.

> **CORRECTED DRAFT — 2026-09-14, independent audit pass.** This file fixes
> two documentation defects the audit found in the original README: (1) the
> file table below omitted 6 of ~19 real corpus files; (2) "Reading order"
> step 1 pointed at a "MOVE-37 section of AGENTS.md" that has never existed
> — confirmed by direct grep against the live repo (0 hits for "MOVE-37"
> across 1,583 tracked `.md` files) and independently re-confirmed by
> `minis-overnight-deep-report-2026-09-14.md`'s own Failures Log running the
> same grep. This draft has NOT been pushed to the branch — it is a
> corrected reference for the founder/maintainer to review and land.

## Submission chain (theorist = DeepSeek, lab = Motif VM)

| File | What it is |
|------|------------|
| `deepseek-move37-phase6-response-01.md` | Original Phase-6 response (T1–T10 + 4 white-space proposals, 52-row self-audit). **Zero executed results** — every number in it is a pre-registered threshold, prediction, or design input, not an observed outcome. |
| `deepseek-phase6-sendback-03.md` | Lab's adversarial send-back #03 (what was wrong, what must be repaired) |
| `deepseek-phase6-repair-02-response.md` | REPAIR-02 (superseded; Prelec repair with γ on (0,2]) |
| `deepseek-phase6-repair-03-response.md` | **REPAIR-03 — current submission** (α on (0,1.5], primary-source-verified Prelec, T3/T7/T9 prior art, W5–W8 proposals, §7 calibration). Contains a confirmed table-row corruption at §7 (W1's label paired with W4's actual value) and repeats two unresolved defects from repair-02 (T9 kill-margin exceeds the only pilot effect size measured so far; the "7×–13×" EV-derating claim doesn't reconcile with its own worked ratios). |
| `deepseek-move37-repair-01.md` | Earlier REPAIR-01 (CARA utility repair for a *separate* IRL/WP-1 thread — **not** a repair of phase6-response-01; the two threads are easy to conflate because both went through multiple rounds) |
| `deepseek-irl-sendback-02.md` | IRL send-back #02 |
| `deepseek-irl-repair-note.md` | IRL repair note — **as delivered, still does not close the blocking defect**: the WP-branch orientation bugs and an unnormalized-CARA scale ridge survive verbatim into the next round (see `move37_irl_cara_fix1_run.log`: verdict NULL) |
| `deepseek-move37-navier-stokes-method-brief.md` | Theorist brief translating the (reported, not independently verified) Sept-2026 OpenAI Navier-Stokes claim into a discovery-method upgrade. First pass. |
| `deepseek-phase6-navier-stokes-translation-02.md` | Second-pass Navier-Stokes method translation (Six-Gate Verifier design). Both NS documents should carry an explicit "reported, not independently verified" caveat on the underlying OpenAI claim — they currently do not. |
| `minis-overnight-compounding-grout-prompt.md` | Overnight props-lane research brief/prompt to the Minis grout crew |
| `minis-overnight-deep-report-2026-09-14.md` | Overnight props-lane deep report — includes the L1 (cold/wind × passing exposure) fully pre-registered, unexecuted spec, and a Failures Log independently confirming the AGENTS.md MOVE-37-section gap |
| `minis-props-followup-prompt.md` | Props-lane follow-up prompt repeating L1 as the top-priority queue item |

## Lab execution + audit

| File | What it is |
|------|------------|
| `move37_irl_prelec.py` | REPAIR-03 IRL script (Prelec probability-weighting; VERBATIM from theorist — **does not run as delivered**: `GradientBoostingRegressor(max_iter=...)` is not a valid constructor argument for that class — `do not run without fixing this constructor call first`, in addition to the previously-known field-orientation defects) |
| `move37_irl_cara_fix1.py` | Fix-1 CARA script (lab execution copy, header documents the two sign-bug fixes). Verdict gate has its own defect: criterion c2 (α in the pre-registered range) is computed and printed but never read by the boolean PROVISIONAL_PASS gate. |
| `move37_irl_cara_fix1_run.log` | Fix-1 run output: train NLL 0.6438, (α̂,β̂) = (−1.70, 22.0), test log-loss 0.6073, accuracy 73.70% vs position baseline 79.07% → **NULL** |
| `move37_irl_audit_2026-09-13.md` | Lab audit of the IRL design (2026-09-13) — independently confirms the CRRA domain-blocker math |
| `round05-verification-report.md` | Lab verification of the round-05 analysis — catches a real bootstrap-CI defect and **5 separate citation-attribution errors** in the theorist's literature review (fabricated DOI, 2 wrong-author attributions, 1 title-mistaken-for-author, 1 blog-post-as-paper) |
| `repair-03-lab-report.md` | Lab's full adversarial audit of REPAIR-03 — the source for most of the confirmed defects above (T9 margin, EV-derating table, WP-branch bugs, N-40/N-41/N-42 citation issues) |

## Minis program

| File | What it is |
|------|------------|
| `minis-move37-retest-prompt.md` | Pass-1 / Pass-2 retest prompt for Minis agents: independently re-run everything, document in AGENTS.md, then adversarially test again. **As of this audit, no artifact matching either named commit section exists anywhere in the repo** — the retest this prompt calls for has not been completed against its own definition of done. |

## Reading order for a new agent

1. ~~The MOVE-37 section of the repo `AGENTS.md`~~ **This section does not exist.** Start instead with this README, then item 2 below. (If a MOVE-37 AGENTS.md section is created in the future, restore this step.)
2. `deepseek-phase6-repair-03-response.md` (current theorist submission) **together with** `repair-03-lab-report.md` (the lab's audit of it — read them side by side, not the theorist doc alone; several of its claims do not survive the lab's own read).
3. `deepseek-phase6-sendback-03.md` (what the audit demanded).
4. `minis-move37-retest-prompt.md` (your instructions, if you are a Minis agent) — note its two required AGENTS.md commit sections have not yet been produced.

**Standing rule:** DeepSeek has no code-execution environment. Its numbers are
SPEC until the lab measures them. Never publish a theorist claim as a finding.

**New standing rule (added by 2026-09-14 audit):** a claim about "the current
state" of any thread in this corpus (IRL, T3/T7/T9, props) must be checked
against the *chronologically last* artifact in that thread, not any single
file in isolation — this audit found two cases where an isolated single-file
read produced a technically-true-for-that-file but stale-for-the-thread
conclusion (see `move37-audit-corrections-ledger.md` for both cases).
