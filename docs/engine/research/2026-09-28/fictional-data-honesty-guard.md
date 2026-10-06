# Fictional data on public surfaces: two defects and a guard for the class (2026-09-28)

**Bucket: engine.** This is about the honesty contract between what the engine
knows and what a customer reads, which is the engine's problem, not a copy
problem.

## What I went looking for

The `ILLUSTRATIVE_DFS` fallback is on the backlog as a Phase 1 blocker: the DFS
optimizer's `activeDfsSlate()` returns a fictional player pool because no licensed
salary feed is registered. The instinct is to treat that as "blocked, waiting on a
feed." Reading it instead showed the provider is honestly constructed
(`live: false`, labelled "Illustrative slate") and the optimizer component already
banners "These are fictional players" whenever nothing real is imported. The
fallback is not the defect.

So I looked for the defect *class* instead: **a public page that renders invented
data without saying so, or that says something false about its own provenance.**

## Two real defects

**1. `/fantasy/dfs` told paying customers their real board was fake.**

```tsx
note="Running on a sample slate until a live salary feed is connected. The math is real; the player pool is illustrative."
```

That was a constant prop. `live` is computed three lines above it from the feed's
own status, and the note ignored `live` entirely. The moment a licensed feed
connected, the page kept printing "sample slate" and "the player pool is
illustrative" directly above a table of real DraftKings salaries and real player
names.

Note the direction. Law 8 is usually read as "do not pass fiction off as fact."
This was the inverse: the product was underselling itself to customers who had
paid for real data. A disclosure that is wrong in the safe direction is still
wrong, and it is worse in one specific way: it trains the team to distrust their
own honesty copy, which is the resource that makes every other claim credible.

Fixed by deriving the note from `live`.

**2. `/fantasy/nba` put a live-dot above invented players, and could rank for it.**

Fictional by construction, so no state flag is correct there. But it carried:

- a `live-dot` next to "Validator demo", and
- no `robots` directive, while its four sibling fictional slates
  (`/fantasy/dfs`, `/fantasy/props`, `/fantasy/lineup`, `/fantasy/draft`) all
  carry `robots: { index: false }`.

A live dot is a visual claim that a surface is live. Pairing it with invented
players is the counterfeit signal law 8 exists to prevent, and it survived review
because the dot is markup rather than copy. The page was not in the sitemap, which
is weaker than unindexable: a direct crawl still reaches it.

Fixed both: noindex, and the eyebrow now says "fictional data" with no live-dot.

## The guard, and the three false positives that shaped it

`apps/web/__tests__/fictional-data-honesty.test.ts` plus
`apps/web/__tests__/dfs-honesty-contract.test.ts`, 11 tests. The first draft
reported 15 offenders. Reading each one individually, **three were wrong** and the
guard was the thing at fault:

| Reported | Reality |
|---|---|
| `/mlb` | Entirely REAL Lahman data. "all Data" inside `loadLahmanMlbTeams` is a function name. |
| `/cockpit/nova/founder` | Says "nothing here is placeholder data", which asserts the opposite of what the guard read. |
| `/intelligence`, `/airwave` | Both honest in body copy. `/intelligence` renders `ILLUSTRATIVE_BRIEF` with `illustrative: true`, and `SignalCourtroom` prints an "Illustrative" badge off that flag. |

The first fix I attempted was to demand `robots noindex` from every fiction-bearing
page. That is wrong as a rule and it is worth recording why: it reports the honest
pages and misses the dishonest ones. `/mlb` would have been noindexed. A guard that
generates false positives gets disabled, and a disabled guard protects nothing.

The shipped version separates two questions that I had merged:

- **May fiction render?** Yes, if the page says so. That is the render test, and
  the allow-list is 10 pages, each verified by reading it, with a second test that
  re-checks the disclosure still exists in source so the list cannot outlive its
  reason.
- **May it rank?** A separate concern, deliberately not smeared across the above.

Two implementation details that are load-bearing:

- **Comments are stripped before matching.** Without it the guard matches itself
  and every future fix: the `/fantasy/nba` live-dot is gone, but the comment
  explaining why contains both "live-dot" and "fictional". A guard that a good code
  comment can defeat is a guard that gets switched off.
- **Paths are normalized to forward slashes.** `path.relative` returns backslashes
  on Windows, which silently missed every allow-list entry on a dev machine while
  passing in CI.

Non-vacuity proven by injection: a scratch page rendering `DFS_SLATE` with no
disclosure turned the suite red, and removing it turned it green.

## What this does not prove

The guard reads page sources. It does not follow imports, so a component that
receives fixture data as a prop from a module three levels down is only caught if
the page itself names a fixture symbol. That is the same blind spot the
route-level surface sweep has, and the same fix applies: walk the graph, not the
file. It also cannot tell a disclosure that a customer reads from one buried in a
component's prop chain.

Separately, and unresolved: `/airwave` renders fictional personas behind a
`live-dot` with the disclosure 120 lines further down. The dot is still a live
claim over invented data. I recorded it in `LABELED_SURFACES` rather than
changing it, because the disclosure is real and the page is a deliberate demo. That
is a judgment call worth revisiting, not a settled fact.
