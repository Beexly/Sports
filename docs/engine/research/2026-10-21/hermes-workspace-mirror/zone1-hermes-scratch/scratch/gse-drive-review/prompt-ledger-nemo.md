You are the findings ledger keeper. Read-only on the repo; write ONE output file. Different API from the other agents — you are the cross-check.

Read EVERY report file in C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\ (the *-*.md result files and pass1/pass2/stale-* reports — skip prompt-*.md files).

Build the canonical findings ledger: C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\LEDGER-CANONICAL.md

Format: one row per distinct FINDING (dedupe across reports — the same fact reported by two agents is ONE row with both citations):
| # | Finding (one sentence, specific) | Type | Evidence (report file(s) + the underlying file/branch/commit it cites) | Status | Next action |

Types: VERIFIED (two independent sources agree), CLAIMED (one source, uncorroborated), REFUTED (a later pass disproved it — name both), QUEUED (explicitly deferred), FOUNDER-GATED, NEGATIVE-RESULT.

Rules:
- Never merge two different findings into one row to save space; prefer 100 honest rows over 50 compressed ones.
- Where two reports CONTRADICT (e.g. buried-branch existence claims), keep both rows and mark the survivor per the verification report.
- End with three short lists: TOP 10 highest-leverage next actions (each with its evidence row number), REFUTED claims worth never re-litigating, and OPEN items no report closed.
- Do not invent numbers. If a report claims a count you cannot find in it, mark the row CLAIMED.
