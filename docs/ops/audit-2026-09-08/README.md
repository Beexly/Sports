# Audit 2026-09-08 — provenance, and how much to trust each file

## What this directory is

Ten read-only audit dimensions commissioned in the 2026-09-08 launch-decision session,
each run by a separate agent against `/home/user/Sports`, plus one file written by hand.
Every agent was instructed: read-only except its own report, never propose flipping a
gate or weakening a guard, and never state a number it did not observe.

## TRUST LEVEL — read this before acting on anything here

| File | Provenance | Verified? |
|---|---|---|
| `production-truth-2026-09-08.md` | Written by hand from live reads of the production truth surface and an anonymous `/api/picks`. Every figure is quoted from a response body. | **Yes, directly.** Confounds are stated in the file. |
| every other `*.md` | Written by an audit agent from a repo read. | **NOT independently verified at the time each file was written.** |

The agent reports are the **pre-verification** draft. Each dimension's top findings are
put through a separate adversarial refutation pass whose job is to kill them, and the
findings that survive are reported to the founder in session. **A finding in one of
these files is a candidate, not a fact.** Before acting on any of them, open the
`file:line` it cites and confirm the behavior is reachable in production. Several
findings in past passes did not survive that step.

## Known context every reader needs

These audits were run while three larger problems were already established and
unrepaired. Do not read a clean dimension report as "the platform is fine."

1. **C-247** — 25/169 MLB, 14/48 MLS and 2/37 NCAAF stored FINAL scores are contradicted
   by the ESPN feed they were ingested from; 68 settled published picks sit on them and
   8 moneyline results are the opposite of what happened.
   See `docs/ops/SCORE_INTEGRITY_2026-09-08.md`.
2. **The edge doctrine is inert.** Public selection runs on `|p - 0.5| >= 0.12` and 89
   per cent of published moneyline picks carry no market probability at all.
   See `docs/ops/EDGE_DOCTRINE_AUDIT_2026-09-08.md`.
3. **Our own bake-off names the market as the best score we have.**
   See `production-truth-2026-09-08.md` section 1.

## The recurring defect class in this codebase

A count, label, badge or flag whose stated meaning is not what it measures. C-241,
C-246, C-250, C-251 and C-252 are all instances, and C-250 was committed inside the very
tool built to detect the class. Assume more exist. Red-check every guard by mutating the
fix and confirming the test fails.
