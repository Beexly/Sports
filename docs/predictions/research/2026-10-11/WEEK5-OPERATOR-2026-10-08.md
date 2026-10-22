# Week 5 operator document

Written 2026-10-08, about 15:36 CT. This is the Super Heavy closer. Motif was not sent a task from this turn. The fleet is not live.

Tonight, before lock: Tampa Bay Buccaneers at Dallas Cowboys, 8:15 PM ET, AT&T Stadium. Sunday, not tonight: Eagles at Jaguars, London, 9:30 AM ET. A public line is not our line.

## 1. What the engine does

Five steps. Same every time.

1. Number. Read the close and the stat. Yards per route, pressure rate, the total. This is the baseline everyone else has.
2. Situation. Read what changed for this game. Out, pitch count, Thursday, wind, short week, 0-4 against 2-2. A September number does not know this.
3. Tier. Keep the source. Official injury report is Tier 1. Licensed odds are Tier 2. A beat writer is Tier 3. A line move is Tier 4 and is not proof of sharp money. X chatter is Tier 5 and cannot be a pick reason. A model paragraph is Tier 6 and is never evidence. Doctrine file: `docs/brain/source-hierarchy.md`. First line of that file: doctrine only. Not implemented.
4. Join. The number, the this-week fact, and the tier, on one `game_id` or `player_id`.
5. Abstain. If any of the three is missing, or the fact is stale, no play. Write the reason as the facts used.

Eligibility is a separate lock. Floors in `apps/web/lib/ops/calibration-eligibility.ts`: 100 own settled rows on the deployed version, Brier at most 0.22, ECE at most 0.05, Murphy reliability at most 0.05, then 3 green ticks. Deployed v5.3.0 has 13 own settled rows. Oct 3 tick: Brier 0.2031 clears, ECE 0.0538 does not. The board can show work. It cannot claim a record.

## 2. Connected, dark, blocked

Connected means a claim on the bus and a result Motif can accept. Nothing in this list is connected.

Installed but dark:

- SiriusXM channel 87, YouTube, and X notes in the Motif benchmark-sweep workspace. They inform the packet. They do not change a projection.
- Three Together LoRAs, completed 2026-10-04, no endpoint: `ft-9fabcf3e-389f`, `ft-1f8bc7d5-a098`, `ft-1fe4ef0b-c215`. Leave them.
- `docs/brain/source-hierarchy.md` on main. Doctrine only.
- Brain ingestion merged, PR #1025. Wiring backlog of 2026-10-06 still has 38 items off the path.
- OpenCode inventory exists on the Windows box at `outbox/from-opencode/gse-local-2026-09-17.md`. It is not on Beexly/agent-bus. A bus search found no such file. Motif task 4 is blocked until that file is pasted or pushed.

Blocked on Garrett:

- Motif send. Held until this document. The prompt is already written. This turn did not send it.
- `kaggle.json` not found. File-level Kaggle checks stay blocked.
- Branches with no upstream need an owner call: `gse-b1`, `Sports-ncaaf-cal`, `Sports-round2`, `Sports-wt-gselive`, `Sports-wt-shadow`.
- Database password was rotated. This turn did not reconnect. Do not paste a connection string into a chat.

## 3. Dashboard and database proof

Read only. No redeploy.

sports-web project `prj_ZAFYsTbVviP2iiSZdzQcloZVHkBL`. Production domains: `www.galaxysportsedge.com` and `sports-web-nine.vercel.app`. Last READY production deploy is `dpl_FaSLArfSBw2d7E31rfQsJ2dz52nA`, created 2026-10-03 14:32:41 UTC, commit `79f09e9887cd43d1701ab59da7c7fd295f080011`, message "docs: land stranded local research (batch)". URL `sports-6u1aupy2p-pick-pilot-s-projects.vercel.app`. That deploy is a rollback candidate.

Every production deploy after that, through 2026-10-08, is ERROR. Latest error is `dpl_CVP7qsm9WweuB2mVNbJmGdQprJ7v`, 2026-10-08 15:22:31 UTC, commit `bbf8908e`, message "x-intel: 2026-10-08 AM(2) full-table CSVs". Build log: password authentication failed for `neondb_owner`. The migrate gate failed closed. Failed deploys do not replace the READY one, so the Oct 3 build is still what should be serving. The live board is the Oct 3 deploy, not today's main. The rotated database password has not been written into the Vercel env. That is a Garrett step. Do not paste the password into a task.

Cron invocations since Oct 3 were not readable from this turn. Do not mark the cron dead. Mark it unverified. The schedule on main is still `refresh-odds` at `*/15` and `calibration-metrics` at minute 40 every 6 hours. `7,22,37,52` is `autonomy-cycle`, not the writer. The schedule edit on `fix/cron-writers-2026-10-08` is not merged.

Database counts were not re-read. The password was rotated. The last verified read, from before the rotation, was signals 122,570 with last `capturedAt` 2026-10-03 20:00:05 UTC, and `jarvis_memory_events` last write 2026-10-03 20:38:06 UTC. Those numbers are stale until Motif reads them again. No connection string in this file.

## 4. OpenCode branches

Do not merge tonight. Do not push the 1.53 GB zip.

Read and extract claims into the tier schema:

- `Sports-wt-engineplan`, 416 commits ahead of `origin/main`. This is the situational work.
- `projects/Sports`, 115 ahead.
- `Sports-live`, 76 ahead.
- `Sports` `docs/surf-21-round`, 20 ahead.
- `Sports-flash-0918`, 13 ahead.
- `Sports-pick-gate`, 13 ahead.
- `Desktop/Sports-langfuse`, 13 ahead.

Leave until a secret scan, 4 commits unpushed against their own upstream: `.cagent/Sports` `design/frontier-2026-09` times 2, `Sports-flash-0918` times 1, `Sports-wt-brier` times 1.

Owner call, no upstream: `gse-b1`, `Sports-ncaaf-cal`, `Sports-round2`, `Sports-wt-gselive`, `Sports-wt-shadow`.

Raw corpus, do not train, do not promote to Hindsight: `C:\Users\Garrett\.gemini\antigravity-cli\`, about 100 session databases, newest 15:16 today. The earlier inventory only saw `antigravity\`.

## 5. Week 5 feed map

Bucs at Cowboys first. Library until a sentence names a player or a game, has a tier, and has a retrieved time.

- SiriusXM channel 87 week 5. Library. A host sentence is not Tier 1.
- YouTube 2026-10-07. Library.
- X intel 2026-10-06 and 2026-10-07. Tier 5 unless a credentialed reporter is named and corroborated. Cannot be a pick reason alone.
- Lines and weather. Tier 4 for the line, Tier 2 only if it came from the licensed feed. Not proof of sharp money.
- DraftKings salaries. Slate context. Not a projection input tonight.
- 19-page Week 5 DFS packet. A packet, not a consumer.

Sunday slate stays a library until the Thursday page exists. London is Eagles at Jaguars, 9:30 AM ET Sunday. Do not build it tonight.

Stale: anything retrieved before 2026-10-03 20:38 UTC is a note, not a live fact, until the writers move.

## 6. The missing consumer

The signals table has a writer. `apps/web/lib/ops/signal-weight-tuner.ts` exists and says so in its own header: the weight step had zero non-test callers. An attached fact still does not change a projection.

Smallest path, not built tonight: a shadow row `adjustment_shadow` with `game_id`, `player_id`, tier, fact, delta, source, retrieved time. Motif accepts the row. The board shows it as a footnote. It is not added to the published number until eligibility is green. Do not wire it to a public pick before Sunday lock.

## 7. Do not do before Sunday lock

- Do not publish a record, a hit rate, or a line that says we beat the book.
- Do not lower n=100.
- Do not start a Together endpoint.
- Do not merge `Sports-wt-engineplan`.
- Do not train on the Antigravity databases.
- Do not redeploy sports-web to chase a green build.
- Do not paste a database URL or a Together key into a task.
- Do not reopen the org chart.

Writer movement was not verified this turn. The fleet is not live.
