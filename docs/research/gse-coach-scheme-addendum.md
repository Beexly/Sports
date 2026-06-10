# GSE Coach and Scheme Intelligence Addendum

Generated: 2026-06-09
Repo: C:\Users\Garrett\Sports

## Bottom Line

GSE has the right doctrine and build cards for coach/scheme intelligence, but it does not yet have a production-ready coach, coordinator, play-caller, scheme, or tendency dataset. The next step is to turn the existing world-model direction into a governed coach/scheme layer that can answer:

- Who is the head coach, offensive coordinator, defensive coordinator, and likely play caller?
- What offensive and defensive scheme family do they come from?
- What did their teams actually call by situation over the last two to three seasons?
- What are they strong or weak against after opponent, roster, and game-state adjustment?
- Which parts are measured from public play-by-play, which parts require charting, and which parts are only an analyst inference?

## What We Already Have

- Existing GSE doctrine already mentions coach, coordinator, scheme, team, player, venue, and season entities in the entity graph.
- Existing research and product docs already call for coordinator-change impact, scheme-fit context, and coach-speak parsing.
- Existing build queues already include canonical NFL entity graph work, coordinator tendency fingerprints, fourth-down coach priors, roster continuity/system fit, coach-speak parsing, and scheme-fit development.
- This pass adds shared TypeScript contracts for coach staff assignments, play-call splits, and scheme tendency profiles in packages/types.

## What We Do Not Have Yet

- No verified 32-team 2026 coach/coordinator/staff seed table in the repo.
- No historical coach-tenure table linking teams, seasons, roles, and play-caller confidence.
- No computed run/pass tendency tables from nflverse play-by-play.
- No defensive front/coverage/blitz/motion/personnel data contract tied to an approved charting source.
- No UI surface that exposes scheme intelligence with confidence, source, and staleness controls.

## Source-Backed 2026 Staff Context

- NFL.com reports that seven teams fully revamped the head coach, offensive coordinator, and defensive coordinator trio for 2026, which makes staff continuity a major 2026 signal rather than background context.
- Fantasy Life framed the 2026 offensive carousel as unusually large, identifying only a small group of teams with full HC/OC/DC continuity and 17 offenses with some play-calling or philosophy discontinuity.
- CBS Sports reported 21 new offensive coordinators, 14 new defensive coordinators, and 17 new offensive play callers entering 2026.
- ESPN's Mike Clay projection guide was updated June 2, 2026 and includes a current coaching-staff page that can seed the first source-ledger pass.

## Current Example Signals Worth Modeling

- Raiders/Klint Kubiak lineage: NFL.com connected Kubiak's recent Seattle offense to high WR target concentration, intermediate/deeper target depth, multiple-RB usage, and outside-run frequency. GSE should store those as historical-team signals with a roster-translation caveat.
- Titans/Robert Saleh and Brian Daboll: NFL.com described a defensive transition from a 3-4 base to a Saleh/Gus Bradley 4-3 world, while Daboll brings a high-variance QB-development and deep-passing resume.
- Giants/John Harbaugh and Matt Nagy: NFL.com flagged likely shifts away from pure 11-personnel reliance toward more two-TE/two-RB and extended-dropback structures.
- Browns/Todd Monken: NFL.com tied recent Baltimore offense under Monken to heavy run-action, multiple-RB usage, long time-to-throw, efficient air-yard output, and explosive passing.
- Dolphins/Jeff Hafley and Bobby Slowik: NFL.com flagged a defensive transition toward zone-heavy structure, lower blitz rate than the prior system, and a different front/coverage mix.

## Product Rule

The public product should never say "Coach X is pass-heavy" unless GSE can show:

1. The coach's role and play-caller confidence.
2. The team/season sample window.
3. The situation being measured.
4. The source and transform version.
5. Whether the claim is observed, derived, or analyst-inferred.

## Sources

- [nflverse nflreadr reference](https://nflreadr.nflverse.com/reference/) - Public data-loader surface for play-by-play, participation, depth charts, injuries, Next Gen Stats, FTN charting loaders, and dictionaries.
- [nflfastR load_pbp](https://www.nflfastr.com/reference/load_pbp.html) - Public play-by-play loader with down, play type, game state, shotgun/no-huddle and related columns.
- [nflfastR clean_pbp](https://www.nflfastr.com/reference/clean_pbp.html) - Adds standardized derived play flags such as pass, rush, success, first down, passer, rusher, and receiver.
- [NFL.com 2026 coaching staffs article](https://www.nfl.com/news/2026-nfl-draft-expectations-for-7-teams-with-new-coaching-staffs) - Source-backed examples for new staffs, scheme transition notes, and recent tendency stats.
- [Fantasy Life 2026 coaching changes](https://www.fantasylife.com/articles/fantasy/2026-nfl-coaching-changes-klint-kubiak-john-harbaugh-and-fantasy-football-impact-of-new-play-callers) - Useful public fantasy framing around offensive turnover, play caller discontinuity, and new situations.
- [CBS Sports 2026 coordinator grades](https://www.cbssports.com/nfl/news/nfl-coaching-grades-2026-offensive-defensive-coordinator-hires/) - Public coordinator-turnover summary and new OC/DC hire inventory.
- [ESPN Mike Clay 2026 NFL Projection Guide](https://g.espncdn.com/s/ffldraftkit/26/NFLDK2026_CS_ClayProjections2026.pdf) - Updated June 2, 2026 guide with current coaching staffs and fantasy projection context.
- [GitHub Trending today](https://github.com/trending) - Daily popular repositories reviewed for GSE platform/agent implications.
- [GitHub Trending weekly](https://github.com/trending?since=weekly) - Weekly popular repositories reviewed for durable tooling patterns.
- [GitHub Trending monthly](https://github.com/trending?since=monthly) - Monthly popular repositories reviewed for broader agent and knowledge-system patterns.
