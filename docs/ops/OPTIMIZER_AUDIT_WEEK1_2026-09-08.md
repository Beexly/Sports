# Fantasy optimizer audit before NFL 2026 Week 1

**Method:** 7 optimizer modules audited in parallel, each finding then handed to an
independent adversarial verifier instructed to refute it from the code. 14 agents,
1.8M tokens, 317 tool calls, ~30 minutes. 51 raw findings, **27 survived**
verification (5 HIGH, 11 MEDIUM, 11 LOW, 0 CRITICAL). The rest were refuted or
withdrawn as overstated, which is the point of running the second pass.

**Measured against:** production on 2026-09-08, ~48h before first kickoff.
`depth_chart_entries` empty, `injuries` ending 2025 week 22, `player_game_stats`
max season 2025, `Player.recentTeam` denormalized from 2025. See
`NFL_WEEK1_DATA_READINESS_2026-09-08.md` for why (C-198).

## The structural answer

Every one of the seven modules came back **MIXED** or **NOT_DATA_DEPENDENT**, and
they all say the same thing:

> With the founder gate OFF - `PROJECTIONS_PROVIDER` unset, which is today's
> default - every optimizer runs on an explicitly fictional player pool and
> labels it as such. Nothing about a real player is fabricated. **The moment
> that gate is set, the same code emits confident, real-name Week-1 advice
> built on last season's data, with no freshness or season label a user would
> see, no depth-chart consult, and `injury` hard-wired to "healthy" on every
> live row.**

So the optimizers are safe today because they are switched off, not because they
are ready. **Flipping `PROJECTIONS_PROVIDER` for Week 1 without the fixes below
would ship fabricated advice under real player names.** That is the decision this
audit exists to inform.

Two findings are independent of the gate - they are wrong on any pool - and both
are fixed in this change (C-203, C-204).

## Fixed here

- **C-203 props sign flip.** `readProp` returned `edgeOver` regardless of the
  recommended side, so a priced UNDER reported and RANKED on the over's edge. A
  genuinely +EV under printed as negative edge. Every existing priced test used a
  mean above the line, so `side` was always "over" and the flip was invisible.
- **C-204 exposure denominator and dropped locks.** `generateLineups` divided
  usage by lineups built SO FAR, so after lineup 1 every used player measured
  1/1 against a 0.6 cap - that does not cap exposure at 60%, it forces lineup 2
  to be fully disjoint from lineup 1. The same rule swept up LOCKED players, so a
  pinned player silently vanished from every lineup after the first. The existing
  lock test called `optimizeOne` once and never passed locks to `generateLineups`.

All three new tests were verified against the pre-fix code and fail on it.

## Everything else, unfixed and reported

| HIGH | bestball | `apps/web/lib/fantasy/bestball.ts:226` | Stack detection and its user-visible reason string join on the 2025 team code |
| HIGH | dfs-optimizer | `apps/web/lib/fantasy/dk-import.ts:110` | Projections, floor/ceiling and ownership for real players are invented coefficients |
| HIGH | waivers | `apps/web/lib/fantasy/waivers.ts:41` | Studio page serves the ungated live waiver pool to anon viewers under an "illustrative/fictional players" note |
| HIGH | waivers | `apps/web/lib/fantasy/waivers.ts:14` | Waiver pool is defined as "everyone except the top 14 in the NFL" — it recommends adding and dropping elite players |
| HIGH | waivers | `apps/web/lib/fantasy/waivers.ts:45` | There is always a Priority target demanding 34% of FAAB, because the tier is relative to the best available score |
| MEDIUM | bestball | `apps/web/lib/fantasy/bestball.ts:57` | "Ceiling" and "Spike upside" are fixed rescales of "Projection" on the live pool, presented as three independent measurements |
| MEDIUM | bestball | `apps/web/lib/fantasy/bestball.ts:142` | byeFragility treats an unknown bye (0) as "never on bye", so a missing FFC join renders as a clean bill of health |
| MEDIUM | dfs-optimizer | `apps/web/components/fantasy/dfs-optimizer.tsx:62` | The data-honesty banner is hidden precisely when real player names load |
| MEDIUM | dfs-optimizer | `apps/web/lib/fantasy/dfs-optimizer.ts:424` | generateLineups silently drops a pinned player from every lineup after the first |
| MEDIUM | dfs-optimizer | `apps/web/lib/fantasy/dfs-optimizer.ts:424` | The 60% exposure cap actually forces lineup 2 to be fully disjoint from lineup 1 |
| MEDIUM | dfs-optimizer | `apps/web/lib/fantasy/dfs-optimizer.ts:96` | No game/team constraint: a Showdown CSV import yields a lineup DraftKings rejects |
| MEDIUM | dfs-optimizer | `apps/web/lib/fantasy/dfs-optimizer.ts:168` | Stacked solve on a real ~900-row DK slate allocates ~170MB per solve on the main thread |
| MEDIUM | props | `apps/web/lib/fantasy/props.ts:114` | Priced UNDER props report and rank on the OVER edge, sign-flipped |
| MEDIUM | waivers | `apps/web/lib/fantasy/waivers.ts:21` | Live waiver scoring is blind to injuries by construction, and the board shows no injury at all |
| MEDIUM | waivers | `apps/web/app/fantasy/waivers/page.tsx:35` | Live pool carries no season or freshness label on this page: the badge is hard-defaulted to "illustrative" while the note claims real grades |
| MEDIUM | waivers | `apps/web/lib/integrations/graded-pool.ts:451` | The provider's only freshness stamp is the fetch clock, and the season silently falls back to 2025 |
| LOW | bestball | `apps/web/lib/fantasy/bestball.ts:261` | evaluateBestBallRoster carries no season or freshness field, so 2025-basis numbers render with no caveat |
| LOW | bestball | `apps/web/lib/fantasy/bestball.ts:209` | max(8, vor+40) collapses the entire late-draft pool to one base score, letting the 1.18 stack bonus invert value |
| LOW | bestball | `apps/web/lib/fantasy/bestball.ts:228` | The "High-ceiling spike-week upside" reason cannot fire for RB/QB on live rows and is a team-QB proxy for WR/TE |
| LOW | dfs-optimizer | `apps/web/app/fantasy/dfs/page.tsx:57` | Optimizer never consumes the live salary board the page claims it prices |
| LOW | props | `apps/web/components/fantasy/props-edge.tsx:140` | The conviction bar and the board's ranking are both wired to `edge`, which is exactly 0 for all 12 shipped props |
| LOW | props | `apps/web/lib/fantasy/props.ts:141` | POWER_PAYOUT prints a third party's payout table with no source and no as-of date, and the page disclaimer does not cover it |
| LOW | props | `apps/web/lib/fantasy/props.ts:157` | evalEntry multiplies legs as independent and the shipped slate contains the same player twice, yet the UI labels the product "True odds" |
| LOW | props | `apps/web/app/fantasy/props/page.tsx:29` | The props page suppresses the honest illustrative/live badge while showing a pulsing live dot and present-tense live copy |
| LOW | props | `apps/web/lib/fantasy/props.ts:168` | No timestamp, week, or freshness gate anywhere in the module or its page |
| LOW | waivers | `apps/web/lib/fantasy/waivers.ts:17` | Every scoring and bid coefficient is unsourced, and the trend/usage inputs are 2025 quantities described in the present tense |
| LOW | waivers | `apps/web/components/fantasy/waiver-board.tsx:40` | A partially-loaded live pool of 1-14 players renders an empty target list with no empty state |

## The five HIGH findings, in plain terms

1. **`dk-import.ts:110` - invented projections on real names.** On a DK Week-1
   salary export `AvgPointsPerGame` is 0 or blank for every rookie and everyone
   without a prior-season average, so the projection falls back to `salary / 420`
   - a pure salary transform with an invented constant, attached to a real player.
   There is no dk-import test file at all.
2. **`waivers.ts:41` - the studio page serves the ungated live pool to anonymous
   visitors** under a note calling the players fictional. Paid live rows, wrong
   caveat, no auth.
3. **`waivers.ts:14` - the waiver pool is "everyone outside the top 14 in the
   NFL"**, so elite players are presented as available adds and as drop
   candidates.
4. **`waivers.ts:45` - there is always a Priority target at 34% FAAB**, because
   the tier is relative to the best available score. No absolute threshold exists,
   so the board can never say "nothing here is worth a bid".
5. **`bestball.ts:226` - stack detection joins on the 2025 team code.** Correlation
   is `a.team === b.team` off a denormalized `recent_team`, so every player who
   changed teams since February stacks with the wrong quarterback, and the
   user-visible reason string says so out loud.

## What I did not do

Nothing was gated, flipped, or disabled. The 25 unfixed findings are reported
rather than fixed because most of them are one of: a founder decision about what
the fantasy product should claim, a change to what a paid surface exposes, or a
rewrite of a scoring heuristic whose coefficients are unsourced and need a real
basis rather than a different invented one.

The single highest-leverage fix is not in this list: it is a **freshness gate in
the shared player-data layer** that refuses to serve a projection when the season
behind it is not the season being played. Every module inherits its staleness from
that one loader (`lib/integrations/projections.ts` to `graded-pool.ts`), whose only
freshness stamp today is the fetch clock - the season silently falls back to 2025.
That is one change protecting seven surfaces, and it is the right thing to build
before the gate is flipped.
