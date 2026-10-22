# Stream execution status 2026-10-21

Measured. Not a claim that Streams 1-9 are empirically closed.

## Done this cycle

- Stream 0 harvester ran. Copied text files after secret redaction. SQLite export is counts only. See HERMES-WORKSPACE-SALVAGE-LEDGER-2026-10-21.md.
- Live SQLite counts: sessions 2506, messages 725940, system_prompts 724, async_delegations 51, delivery_obligations 29, verification_events 125, verification_state 700, kanban tasks 3 / task_events 39 / task_attachments 1.
- The plan's 2503 / 725843 / 723 figures were stale. kanban/kanban.db does not exist; the database is AppData/Local/hermes/kanban.db.
- Grok export zip was indexed from the central directory (1807 entries at first listing). Auth, billing, and asset bytes were not extracted.
- Pinhole 2x3 Jacobian, InSituMeasure fail-closed gate, 10 Hz kinematic proxies, and Allen interval relations have unit tests.
- TEAG max, falsifiability floor, collapse weight, Toomre comparison, and non-increasing residual gate have unit tests. No Navier-Stokes residual was measured.

## Not done, and not marked done

- Stream 1 situational corpus merge: the "(2).md" source named in the plan was not on disk. No 80-record corpus was invented.
- Stream 2 paper dossier: not fetched this cycle. Titles were not invented.
- Stream 4 situational call sites were not stubbed into game-context.ts.
- Streams 6-8 were not implemented as untested engine theater.
- Stream 9: gap_closures.json was not hand-edited. A fresh count of that file was 23 closed and 5 partial (GAP-03, GAP-11, GAP-19, GAP-20, GAP-25). The verifier owns those statuses.
- Stream 10 does not spawn hermes.exe. One-shot hermes -z has hung, and a child Hermes would recurse. The supervisor runs one verify cycle only.
- 37 oversize files were not copied, including minified sportsbook bundles and raw warehouse CSVs. Skipping them is intentional.
- 4 harvested `.log` files are gitignored (`*.log`) and stay local: the three `gse-sub-*-tonight.log` files and `dev-design-2026-09-12.log`. Their redacted copies exist on disk; they are not force-added.
- Feature-branch pushes of the other worktrees are not part of this commit. A diff that has not been content-scanned is not pushed.
- Two harvested snapshot files contained an Alibaba access key. They were deleted from this worktree and not committed. Rotate that key. The source copies remain in the Sports checkout.
- A Hugging Face user token in `data/snapshots/eyi_package/workspace/user/files/hf_env.txt` was removed before push. Rotate that token. It was not pushed.
