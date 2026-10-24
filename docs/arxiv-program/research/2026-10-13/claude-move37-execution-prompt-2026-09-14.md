# Claude prompt — MOVE-37 execution queue (2026-09-14)

Paste this into Claude along with the two attached files:
`move37-audit-corrections-ledger.md` and `README_CORRECTED_DRAFT.md`.

---

You are the heavy executor for PROJECT MOVE-37 (Garrett's GSE machine-discovery
lane). Motif is the architect and adversarial auditor; DeepSeek is the theorist
(no execution environment — its numbers are SPEC until you measure them). An
independent two-pass audit just finished. Your job: execute its ordered fix list.
Nothing below is optional except the one item marked skipped.

## Inputs

- Attached: `move37-audit-corrections-ledger.md` — the SINGLE source of truth.
  It supersedes every earlier fix list. Work section E (13 items) in order.
- Attached: `README_CORRECTED_DRAFT.md` — corrected corpus README, ready to land.
- Corpus branch: `docs/move37-research-corpus` in repo `Beexly/Sports`
  (`docs/research/move37/`). Read the current README there first so you see
  exactly what the audit corrected.
- Frozen lab data snapshot: `~/workspace/gse-discovery/data_snapshot_20260913`.
  If you cannot reach it, STOP and report that as a hard blocker. Do NOT
  re-fetch nflverse from scratch and do NOT fabricate a result.

## Non-negotiable rules

1. Never present a theorist number as a finding. Only your measured runs count.
2. Every number you report traces to a run log committed next to the report.
3. No placeholders, no stubs, no TODOs. A script is not "ready" until it
   executes cold end-to-end in your environment.
4. Original corpus documents are evidence — never rewrite history. Corrections
   go in as addenda/errata files or ledger entries, originals untouched.
5. Commit everything to `docs/move37-research-corpus`. No merges, no pushes to
   any other branch. Never touch `gse-grok-build-sandbox`.
6. Honest nulls beat heroic saves. If a family dies, kill it on the record.

## Execution order

**Phase 1 — cheap fixes (no lab data needed)**

- E.8 first: one-line import probe — can a Rips filtration / persistence
  diagram be computed under the allowed-imports constraint
  (nflreadpy, scikit-learn, numpy, pandas only; NO ripser/gudhi/giotto-tda)?
  Report the verdict. If infeasible, recommend T7 be killed or rescoped before
  anyone spends its 400-null-run budget.
- E.1: institute the import-and-construct dry-run gate. Write it as a small
  script in the corpus, then RUN it against every theorist-delivered script
  (`move37_irl_prelec.py`, `move37_irl_cara_fix1.py`, the repair-03 Prelec
  script). It must catch the known `GradientBoostingRegressor(max_iter=...)`
  crash — demonstrate that, don't just assert it.
- E.2: extract the WP-branch orientation logic (kick/FG/punt spot arithmetic,
  conversion-gain constant) into ONE canonical helper module with unit tests.
  The ~5-yard constant must be COMPUTED via groupby/mean on the training
  sample, not hardcoded.
- E.3: fix the "verdict computes 4 criteria but the boolean gate only reads 3"
  bug in both `move37_irl_cara_fix1.py` and the repair-03 Prelec script — add
  the excluded criterion (c2) back into the gate.
- E.4: land the corrected README (commit the attached draft AS the corpus
  README.md) and commit the audit ledger itself as
  `move37-audit-corrections-ledger.md`.
- E.5: the "10x EV derating" table is dead as a measured factor. Add an errata
  note in the corpus labeling it a budgeting heuristic only, citing the
  ledger's arithmetic (W1≈1.4x, IRL≈2.9x, only W2≈13x).
- E.6: already closed by the audit (Ötting 32(4); 71.5% arXiv vs 71.6%
  published). Committing the ledger records it. No extra work.
- E.11: create `move37-code-regression-ledger.md` — every defect caught across
  both audit passes as a checkable assertion. Each future script resubmission
  must pass the ledger's checks before it can be called "ready."
- E.13: one groupby on the schedules table — verify the "16 games per
  team-season" T3 assumption against actual post-2020 schedules (17-game
  seasons exist since 2021). Report the count.
- E.12: SKIPPED — founder-only. The 9 open skeleton-approval questions in
  `minis-overnight-deep-report-2026-09-14.md` §6 need Garrett, not you.
  Note them as blocked-on-founder in your final report.

**Phase 2 — lab executions (frozen snapshot only)**

- E.9: the geometry-repaired IRL Prelec rerun. Fix ALL FOUR sign/orientation
  bugs at once per `repair-03-lab-report.md` §2.4's exact prescription, plus
  the constructor bug (E.1) and the gate bug (E.3), using the canonical helper
  from E.2. Run cold. Report the verdict against the pre-registered criteria
  with the full run log.
- E.10: T9 feasibility/overlap gate — propensity AUC, outcome-model R²,
  positivity checks — BEFORE any causal-forest fitting. Report whether the
  family survives. State the 0.0158-vs-0.02 gap honestly: 0.0158 is a
  confounded OLS association, not a causal estimate, so phrase it as "the only
  estimate so far falls short," not "no realistic outcome could clear it."
- E.7: execute lab-handoff spec L1 (cold/wind × passing exposure) from
  `minis-overnight-deep-report-2026-09-14.md` — fully pre-registered,
  blind-executable. Produce the report + run log + verdict.

**Deliverable:** all commits on the corpus branch, plus a final report file
committed there summarizing per-item status (done / blocked / killed), the
verdict of each execution with its run log, and anything blocked on Garrett.
Then post the summary to the agent bus as usual.
