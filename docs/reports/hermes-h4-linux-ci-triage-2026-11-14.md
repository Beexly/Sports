# Hermes H4/H5 — Linux/CI Python Test Triage (GCP Stage-B wall)

Source: antigravity msg 094e (2026-11-14T19:13Z) — VM01 full pytest wall
(tests/ + intelligence/tests/, 602s): 1,683 passed / 181 failed / 26 skipped / 8 errors.
Method: targeted root-cause triage on the hermes branch, no full-wall re-run.
Local verifier: pytest 9.1.1, worktree Sports-phase2-wt @ origin/main. $0.00 spend.

## FIXED — verified grounded repairs (commit 768cf9d01)

Root cause (one bug class): bare `from tests import fixtures/helpers` and
`from research...` resolve to the ROOT `tests/` and `research/` packages, shadowing
`intelligence/tests` and `intelligence/research`. Fix = explicit `intelligence.*`
package imports.

| File | GCP issue | Local result after fix |
|---|---|---|
| intelligence/tests/test_reasoning_engine.py | 10 failed (AttributeError t1_request/t1_context) | 11/11 pass |
| intelligence/tests/test_grounded_span.py | 1 collection error (research.grounded_span) | 1/1 pass |
| intelligence/tests/e2e/test_t1_real_e2e.py | 1 collection error (tests.helpers) | collects 9 tests |

12 wall issues cleared at root cause. These reproduce on main (not platform-specific),
so the fix lands on both main and the feat/GCP branch.

## ENVIRONMENT-GATED — not fixable from Windows/main (need antigravity GCP env)

- tests/e2e/test_round2_gap_audit_and_google_skills_e2e.py (36) and
  tests/e2e/test_session_3cd84455_and_agy_skills_e2e.py (33): both pin features to
  `/home/antigravity/.agents/teamwork/PROJECT.md` (F1-F18) and the google/skills repo —
  antigravity GCP-Linux-only spec files absent here. Need that environment to triage.
- tests/e2e/test_tier5_adversarial_plugins_and_guardrails_challenger.py (15): spawns
  `node -e` / shell subprocesses; fails with FileNotFoundError on Windows (PATH/binary).
  Linux failure mode not reproducible here.
- intelligence/tests/test_coaching_gates.py (4 errors on GCP): collects 4 tests cleanly on
  main/Windows — the GCP errors are feat-branch/Linux-specific (pandas/pyarrow gate path).

## DEPENDENCY-GATED — missing module, will not fabricate

- tests/test_scientific_and_agentic_15_repo_engine.py (1 error): `No module named
  'toolregistry'` — toolregistry exists only in docs/audits, not as code. Needs the actual
  module/dependency before it can collect.
- tests/test_decisions_api_dual_oracle.py (1 error): feat-branch-only file (not on main);
  triage on the feat branch.

## Remaining failed files (small counts, not yet triaged)

test_gse_connected_workflow_v2_full_repo (5), test_week9_dual_slate_dfs (5),
test_red_team_7vector_forensic_audit (4), test_workflow_runner (4),
test_dfs_5000_page_corpus_and_7_equations (3), test_structured_workflow_runner (3),
test_twelve_repo_frontier_integration (3), test_week8_forensic_fixes (3), and ~10 files
at 2-3 each. Many are DFS/workflow/forensic suites that likely need the live data feeds
or the GCP env; triage continues against the feat branch where the GCP wall ran.

## Handoff

The import-shadowing class is the highest-leverage fix and is done + verified. The large
e2e counts (36/33/15) are environment-gated on antigravity's GCP PROJECT.md / node / skills
and should be triaged IN that environment, not duplicated here. No fabricated fixes.