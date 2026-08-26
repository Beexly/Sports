# STATE — live state and founder queue

Updated 2026-08-26 by session `claude/gse-week1-launch-bh0nqo` (PR #674).
Hard cap ~60 lines. The ledger and the public-surface-truth endpoint outrank
this file; where they disagree with it, they win.

## Ground truth

- **NFL Week 1 kicks off Sept 3-7.** Capture cleanly or lose it permanently.
- **The historical game-level edge space is measured empty** (C-75). Retrospective,
  close-relative ATS/totals/ML on free data is finished. Do not re-run variants.
- **The falsifier now has a 9-cell acceptance grid** (planted / noise / inverted
  x n=100/1k/5k), built this session, 13/13 green. Its binding gate is SHUFFLE
  power, not the e-process: a planted 0.066 LLR/row edge is KILLED at n=100 and
  n=1,000 and SURVIVOR at n=5,000, while logM already clears log(1/alpha) at n=100.
- **`falsifyBind`'s leakage gate is blind to selection leakage.** It compares
  `knownAtWeek >= outcomeWeek` — integer week indices — and returned PASS on a
  sample selected on its own outcome variable. Real gap in the instrument.
- **An independent, market-free `modelProb` now exists and mints** into a verified
  pick-proof receipt (C-28's bottleneck). Zero market inputs by comment-stripped
  grep. `tau=50`, `minTotalN=100`, pre-registered as named constants.
- **Player-level persistence, measured over 9 season pairs** from the licensed
  nflverse NGS mirror: `avg_separation` r=+0.588, `targets` r=+0.504, sign stable
  in all nine. **Bound it:** +0.512 survivorship-corrected, +0.427 on the
  unfiltered population. The brief's 0.900 figures are season-level TEAM
  aggregates at n=5 and do not carry to player level.
- **`targets` is KILLED, not a survivor.** Corrected for its own base rate (0.7071
  vs the hard-coded q=0.5), logM falls 91.08 -> 2.91, below the 2.996 bar. A
  zero-signal constant model scores 88.17. `avgSeparation` survives that
  correction (77.32 -> 73.52) but is UNPRICED and ~2% independent of persistence.
- **No priced test has ever been run.** There are no historical player-prop lines
  in the repo. Door B is neither opened nor closed.
- **The product surface is 235 routes and none of the Week-1 path is
  routing-gated** — middleware protects only /dashboard, /admin, /cockpit.

## Founder queue (max 3)

1. **CLOSE stamping has never fired.** Measured 2026-08-20: NFL 9,768 INTERIM
   snapshot rows and **0 CLOSE**; MLB 11,174 / 0. The archive is live and
   accumulating while the closing line — the thing a CLV track is built on — is
   never captured. Known contributor: the FREE settlement path has no
   line-archive call at all, so any settle that falls to it stamps nothing.
   Blocking for Sept 3.
2. **Approve licensed acquisition of historical player-prop lines.**
   `getHistoricalEventOdds` (`odds-api-client.ts:409`, "player props after
   2023-05-03") exists, is licensed, the paid key is live — and it has **zero
   callers**. This one input converts every coin-flip measurement in this session
   into a market measurement. It is the highest-leverage unblocked item.
3. **`LIVE_BOARD` is wired to nothing on the board render path.** `liveBoardOn` is
   hard-coded `false` at `lib/board/state.ts:139,261,351,469,499`. Flipping the
   env var today would change nothing. Founder-YES flag, so not fixed by an agent.

## Quarantined — awaiting verification

- **Three scraped sources: `checkClearance()` = allowed=false, SOURCE_NOT_REGISTERED**
  (`nextgenstats.nfl.com`, `pro-football-reference.com`,
  `predictions.draftkings.com`). None ingested. PFR is a direct registry conflict
  ("PFR = Cloudflare, do not scrape; use nflverse mirror") that a vendor got
  through anyway. The DraftKings capture includes two **account-gated** files
  (`my-trades_open`, `my-trades_settled`) — hard stop under CLAUDE.md. Memo:
  `reports/rights/2026-08-26-scraped-sources-clearance-memo.md` (proposed, not applied).
- **`marketFairMethodTag` has zero non-test callers** — every production receipt
  commits `"none"`. The precedent C-78 was modelled on has never carried a value.
- **C-36 live acceptance unverified**: no `DATABASE_URL`/odds key in-container.
  `week1Capture` on `/api/ops/public-surface-truth` makes it checkable post-deploy.

## In flight

- **PR #674** (`claude/gse-week1-launch-bh0nqo`) — draft, watched. Hermes merge +
  C-74 falsifier + C-36 wiring guard + modelProb + acceptance grid + Proof nav.
- **PR #672** (`claude/sonnet-max-leverage-prompt-433yia`) — open draft,
  `mergeable_state: clean`, 209 files. Not merged by an agent; needs a human.
- **CI cannot run — verified, not assumed.** The last `ci.yml` run repo-wide on
  ANY branch is run 4299 at 2026-08-26T17:44Z (this PR, on the pre-fix sha).
  Nothing has run since 17:54Z, including `claude/gse-business-prompts-zexw2w`,
  which had been green every ~40min until then. Consistent with the Actions
  free pool being exhausted 2026-08-26. A push with no `[skip ci]`
  (`96ba65ab6`) still produced no run, so `[skip ci]` is NOT the cause — that
  was a plausible mechanism I published as fact and then corrected on the PR.
  The local verify block is the gate. Absence of a CI signal on this head is
  neither pass nor fail.
- Practice note that still stands: `[skip ci]` is evaluated on the HEAD commit
  of a push, so a docs commit carrying it will suppress the run for code
  commits pushed alongside it. Never `[skip ci]` the head of a mixed push.
