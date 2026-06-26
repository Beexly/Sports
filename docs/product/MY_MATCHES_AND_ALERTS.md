# My Matches & Alerts (Edge Watchlist)

**Module:** `packages/decision-field-runtime/src/watchlist-alerts.ts`
**Surface:** a future watchlist UI (fixture-only model today)
**Status:** fixture-only.

## What it is

Scores24's "My Matches" + notifications exist to pull you back to bet. GSE's watchlist is
proof-native retention: a user follows matches, players, teams, markets, prediction trials, stat
passports, trends, or worldlines, and **every alert explains why it fired and links to its proof.**
No "bet now," no manufactured urgency, and the user controls frequency.

## The alert

`buildAlert(args)` → `WatchlistAlert` with `subjectKind`, `subjectId`, `type`, a mandatory `reason`
(why it fired), a mandatory `proofRef` (link to its evidence), an `urgency` derived from the alert
type, and a fixture watermark. Construction **throws** if there is no reason, no proof reference, or
if the reason contains bet-now pressure language (`/bet now | place (your) bet | act fast | don't
miss | hurry/`).

`AlertType` ∈ lineup changed · market opened/moved/matured · prediction-trial settled · stat-passport
updated · authority upgraded · claim downgraded · data-source stale · good-pass confirmed. Urgency is
justified by the data (only a few types are `TIME_SENSITIVE`), never manufactured.

## Frequency is the user's

`applyFrequency(alerts, settings)` respects `maxPerDay`, `quietHours`, `mutedTypes`, and
`onlyTimeSensitive`. The default budget is modest (6/day). The product optimizes for the user's
calm, not for re-engagement.

## A notable, GSE-only alert type

`GOOD_PASS_CONFIRMED` — we notify you when *passing* was the right call. A retention system that
celebrates restraint is the opposite of a betting funnel.

## Invariants

- Every alert has a reason and a proof reference, or it does not get built.
- No bet-now / urgency-manufacturing language, enforced at construction.
- The user's frequency settings always win.

## Tests

`__tests__/n5-layers.test.ts` (Alerts block): every fixture alert has a reason + proof, a bet-now
reason is rejected at construction, frequency settings filter the batch.
