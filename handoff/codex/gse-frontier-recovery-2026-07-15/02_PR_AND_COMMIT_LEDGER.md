# PR and Commit Ledger

## Replacement PR

- Draft PR [#112](https://github.com/Beexly/Sports/pull/112): `codex/gse-frontier-recovery-2026-07-13` -> `main`
- Base SHA: `3ce5c4a198df7f9baac37888de4f28297e24f581`
- Implementation head at PR creation: `0e89e797ea49728cca959513d97d98f3d5639eb5`
- PR was reported mergeable by the GitHub connector. It remains draft pending final CI and owner review.

## Branch commits after current main

| Commit | Purpose |
|---|---|
| `518e9516` | Start execution ledger |
| `3c8df41e` | Fail closed on production stub DB |
| `c6ac24e7` | Fail closed on stale sport prices |
| `ebd2c55c` | Enforce Game Room entitlements at projection boundary |
| `ec6fba42` | Close P0 trust and market/proof gaps |
| `e3afefd9` | Reconcile settlement and proof invariants |
| `a02b5aa2` | Reconcile schedule, outage, and team identity |
| `3fb81ae3` | Preserve honest public read failures |
| `da682a4d` | Enforce Cockpit admin guard on every page |
| `a9ec8906` | Close CI, scanner, secret, and deploy-skip bypasses |
| `c49a69f7` | Record stale PR reconciliation |
| `2724e78a` | Gate public fantasy tools on real data |
| `0e89e797` | Add governed intelligence playback and consumer projections |

## PR #76-#101 dispositions

| PRs | Final disposition |
|---|---|
| #76, #78, #79, #82, #91 | `SUPERSEDED_CLOSED` |
| #77, #88, #90, #96 | `REJECTED_CLOSED` |
| #80, #81, #83-#87, #89, #92-#95 | `EXTRACTED_REBUILT_CLOSED`; receipt comment points to #112 |
| #97-#100 | `MERGED_IN_MAIN` before this recovery lane |
| #101 | `OWNER_GATED_HOLD`; left open, unmerged, no migration applied |

PRs #110 and #111 were created after the audited #76-#101 range and were deliberately left untouched. Unrelated PRs #52 and #2 were also untouched. No branch was deleted.
