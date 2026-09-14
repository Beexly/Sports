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

## Submission chain (theorist = DeepSeek, lab = Motif VM)

| File | What it is |
|------|------------|
| `deepseek-move37-phase6-response-01.md` | Original Phase-6 response (T1–T10 + 4 white-space proposals, 52-row self-audit) |
| `deepseek-phase6-sendback-03.md` | Lab's adversarial send-back #03 (what was wrong, what must be repaired) |
| `deepseek-phase6-repair-02-response.md` | REPAIR-02 (superseded; Prelec repair with γ on (0,2]) |
| `deepseek-phase6-repair-03-response.md` | **REPAIR-03 — current submission** (α on (0,1.5], primary-source-verified Prelec, T3/T7/T9 prior art, W5–W8 proposals, §7 calibration) |
| `deepseek-move37-repair-01.md` | Earlier REPAIR-01 (CARA utility repair, accepted all blocking findings) |
| `deepseek-irl-sendback-02.md` | IRL send-back #02 |
| `deepseek-irl-repair-note.md` | IRL repair note |

## Lab execution + audit

| File | What it is |
|------|------------|
| `move37_irl_prelec.py` | REPAIR-03 IRL script (Prelec probability-weighting; VERBATIM from theorist — do not run without auditing: contains the `max_iter` constructor defect and the `100−yl+8` / `100−yl−40` field-orientation defects) |
| `move37_irl_cara_fix1.py` | Fix-1 CARA script (lab execution copy, header documents the two sign-bug fixes) |
| `move37_irl_cara_fix1_run.log` | Fix-1 run output: train NLL 0.6438, (α̂,β̂) = (−1.70, 22.0), test log-loss 0.6073, accuracy 73.70% vs position baseline 79.07% → **NULL** |
| `move37_irl_audit_2026-09-13.md` | Lab audit of the IRL design (2026-09-13) |
| `round05-verification-report.md` | Lab verification of the round-05 analysis |

## Minis program

| File | What it is |
|------|------------|
| `minis-move37-retest-prompt.md` | Pass-1 / Pass-2 retest prompt for Minis agents: independently re-run everything, document in AGENTS.md, then adversarially test again |
| `minis-overnight-compounding-grout-prompt.md` | Overnight battery prompt (13 contextual compounds, tool-gain gate, 8-gate compound contract) |
| `minis-overnight-deep-report-2026-09-14.md` | **Overnight battery report: 0/13 passed — game-level branch closed** |
| `minis-props-followup-prompt.md` | Props-space follow-up prompt (L1 cold/wind × play-action, L2 revenge, L3 unavailability pricing gap, L5 pooled closure) |
| `minis-grout-prompt-v4-gate-amendment.md` | v4 gate repairs (SUPPORTED veto semantics, numeric 5b, post-hoc cap, Gate R split) |
| `repair-03-lab-report.md` | Lab's REPAIR-03 audit + cheapest-kill repair order (IRL killed, W8 killed as named, T9 borderline) |

## Reading order for a new agent

1. The MOVE-37 section of the repo `AGENTS.md` (current status, all kills — now includes the overnight battery and props pivot).
2. `minis-overnight-deep-report-2026-09-14.md` (the program's most consequential finding: 0/13, game-level closed).
3. `deepseek-phase6-repair-03-response.md` (current theorist submission — note the corrected §7).
4. `repair-03-lab-report.md` (lab's audit of REPAIR-03: what was killed, what needs repair).
5. `deepseek-phase6-sendback-03.md` (what the audit demanded).
6. `minis-props-followup-prompt.md` (current active work: props-space lab).

**Standing rule:** DeepSeek has no code-execution environment. Its numbers are
SPEC until the lab measures them. Never publish a theorist claim as a finding.
