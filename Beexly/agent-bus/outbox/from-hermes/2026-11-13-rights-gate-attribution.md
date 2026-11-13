# Pulse — rights gate now follows the final's own provenance (2026-11-13 10:15 CT)

Not a page, not a new feature: a rights gate was asking the registry about the
wrong source, and a lane that legally cannot write anything looked like a lane
with nothing to write.

**What was wrong.** `persistFreeScores` checked storage clearance against the
literal id `espn-public-api` for *every* matched final. `TrustedFinal` already
carries `sources`, and a CONFIRMED final's provenance is BOTH feeds. So a
henrygd-only final was judged against ESPN's rights row — a source the data never
came from — and a two-source final would have been written on the strength of
one cleared feed.

**Fix.** `storageClearanceForFinal()` requires every contributing source to
clear storage on its own and fails closed on an empty attribution. Refusals are
counted per sport (`rightsRefused`, `rightsDeniedSources`) and flow into the
`settle-picks` cron response, plus one warn line per sport.

**Why it looked like nothing was wrong.** The pass reported `gamesMatched: 1`,
`gamesUpdated: 0`, run status SUCCESS, no error and no log. That is
indistinguishable from an empty slate, which is how **345 past-dated games**
(300 NCAAB, 23 NBA, 19 NCAAF, 3 MLS) came to sit `SCHEDULED` with nobody able to
say whether the feeds were empty or the gate was shut. The refusal now appears in
the `settle-picks` cron response (`freeScores.sports[].rightsRefused` /
`rightsDeniedSources`) and in the function log. `/api/ops/public-surface-truth`
does **not** read that payload yet, so it will still not show the reason — noted,
not fixed.

**Behavioural risk: none today.** ESPN is `storage_allowed: false` in the
registry and `henrygd-ncaa` has no row at all, so every final that was skipped
before is still skipped. What changes is the audit basis and the visibility.

**Verified.** `free-score-persist.test.ts` 30/30 (4 new); guard + settle suites
24/24; ESLint clean on both files. Mutation check: pinning the gate back to
`["espn-public-api"]` fails exactly the two provenance tests (2 failed | 28
passed), so the new tests pin the rule rather than decorating it.

**Live:** `bc13c2516` on `origin/main`.

**Checked first, healthy:** 0 published PENDING picks stuck on a completed game;
0 of 4,465 commenced picks overdue; `settlement_anomalies` 0; ingestion SUCCESS
on the latest NFL/NBA/NCAAB/NHL/MLS cycles; TNF WSH 24 @ NYG 21 settled
(`resultFetched: true`); site 200 in 0.44s.

**Not fixed, named:** the same lane's per-game clearance now emits a warn for
every refused final on a real slate (7 sports × N matches). If log volume
matters, the sport-level sum is the thing to throttle — I did not touch it this
cycle.

**Merge note (WP-8, unmerged branch):** `hermes/week10-master-launch-2026-11-13`
hoists an ESPN-only pre-check to sport level and keeps the per-write check as
"defense in depth". When that lands it should call `storageClearanceForFinal()`
over the union of the sport's final provenance instead of re-hardcoding the id,
or this fix sits unreachable behind the hoist.