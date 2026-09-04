# Wave 1 — Consolidate the landing (H-N1)

Order (§2, pre-made): #695 → #696 → #697 → #698 → #699 → #694 → #692 onto hermes/night-2026-09-04.

Topology verified 2026-09-04:
- #695 claude/fix-nflverse-spread-sign → main (17c)
- #696 claude/replay-sport-parameter → stacked on #695
- #697 claude/retract-70-target → stacked on #695
- #698 claude/replay-discrimination → stacked on #695
- #699 claude/baee-prior-art → main (1c, independent)
- #694 claude/fix-soccer-threeway-moneyline → main (1c, independent)
- #692 claude/fix-espn-settlement-date-boundary → main (2c, independent)

Rules:
- Verify block after EACH merge: typecheck (tsc 0), lint, guardrails 26/26 via scripts/ops/run-all.mjs (or per-guard fallback), test:fast from apps/web (=251).
- Conflicts expected on docs/ops/AGENT_LEDGER.md and ops docs between the three #695-stacked siblings → resolve per merge-reconciler skill, classify hunks, keep both intents.
- Never touch scripts/guardrails/** or .github/workflows/** (A2).
- End: one draft PR hermes/night-2026-09-04 → main; ledger row H-N1 DONE with SHAs; night-log line; push -u origin.
- After PR: re-add soccer scoring assertion named in historical-replay-sport-key.test.ts (assertion that historical_replay treats sport like its live counterpart), run that suite.

If a merge cannot be made clean and honest: mark row BLOCKED with evidence, move to next wave item — never fake DONE.
