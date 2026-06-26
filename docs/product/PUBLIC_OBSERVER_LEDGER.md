# Public Observer Ledger

**Modules:**
`packages/decision-field-runtime/src/{public-observer-ledger,highlight-passport,public-consensus-lag}.ts`
· `packages/data-intelligence/src/{serpapi-google-sports,entity-graph,public-observer-providers}.ts`
· adapter `meaning/morphology-adapters.ts` `publicObserverToClaimObject`
**Status:** fixture-only. No network, no API key, no Google scraping. On fixture data every compiled
public-observer claim binds at Source-reality → `INFO_ONLY`.

## The frame

GSE already keeps five ledgers — **Reality, Belief, Decision, Authority, Learning**. The Public Observer
Ledger is the **sixth**. It records one thing and one thing only:

> what dominant discovery systems **show the public** about a sports event.

Google's sports one-box, SERP snippets, the live score widget, the standings one-box, knowledge-graph
entities, and the highlight carousel are not the scoreboard — they are a *rendering* of the scoreboard,
captured by an observer, with its own latency, coverage, and rights. The ledger calls this **public
DISPLAY truth**. It is never official truth, never a settlement source, never a price, never a trigger.

> **FINAL STANDARD:** GSE must not treat Google Sports as a source of truth. GSE treats it as a
> public observer.

SerpApi / Google Sports is **one observer in the Observer Arena** — alongside the official/licensed
feed, the market, and GSE itself. The arena's job is to measure the *gap* between what the public sees
and what is actually known, never to import the public view as fact.

## What the ledger may do / may never do

| Allowed (derived use) | Forbidden |
|---|---|
| Discover entities (kgmid → identity candidate) | Settle or grade an event |
| Measure public latency (Chronos clock chain) | Be a production source without cross-check |
| Measure public visibility / coverage | Be a rights-cleared media source |
| Flag public-vs-official disagreement | A reason to scrape Google directly |
| Link a highlight for review (rights-gated) | A trading / betting trigger |

Every record is born with `authorityImpact: "PUBLIC_OBSERVER_ONLY"`, `canSettle: false`, and an
intrinsic `authorityCeiling` of `WATCH`. A public display can, at most, inform a *watch* — never a
public action.

## The record — `PublicObserverRecord`

`buildPublicObserverRecord(input)` captures a single observation. The capture time
(`capturedAtLabel`) is **required** — a public capture without a capture time is meaningless for
latency, so the builder throws if it is missing. The record carries: the observer identity
(`observerId`, `providerName`, `engine`, `query`, `location`), the public-facing fields exactly as
shown (`publicTitle`, `publicStatus`, `publicScore`, `publicTime`, `publicRanking`,
`publicStandings`), the named entities (`teams`, `athletes`, `venue`), the `kgmids` anchors, any
`highlights` (lifted into rights-gated passports — never raw URLs), the `rightsEnvelope`, and
`fixtureWatermarked: true`.

The rights posture is fixed by `PUBLIC_OBSERVER_RIGHTS`: status `permission_required`, legal verdict
`RIGHTS_REVIEW`, `commercialDisplayAllowed: false`, `derivedUseAllowed: true`,
`ownerApprovalRequired: true`. Facts (scores, standings, fixtures, timestamps, references) may inform
GSE's own derived signals; the *display itself* may not be re-published commercially without review.

### Compiled into the Meaning Compiler

A record becomes a governed `ClaimObject` of `objectType: "PUBLIC_OBSERVER_RESULT"` via
`publicObserverToClaimObject`. The adapter sets `sourceKind: WEB_EVIDENCE`, time knowability
`SOURCE_UNCLEAR`, `suppressesAction: true`, decision state `DATA_CONFLICT`, and a fixture authority
vector at the record's ceiling. The compiler then caps it at `INFO_ONLY` — the public observer cannot
out-rank the canonical engines, by construction.

## Sub-instrument 1 — Public Consensus Lag (the Chronos clock chain)

`public-consensus-lag.ts` measures *how late the public scoreboard is*. A `ChronosRecord` holds five
clocks for one event:

> event happened → official source observed → market moved → public observer (Google) shown →
> GSE compiled

`computeChronosLags()` derives the lag family — `publicConsensusLag` (public shown − official source),
`publicScoreboardDelay` (public shown − event), `publicVsMarketLag`, `marketVsOfficialLag`,
`gseVsPublicLag`. A missing clock yields `null` (unknown), never `0`. The report is stamped
`canImplyEdge: false` and `canCreateAction: false` — **lag is a clock fact, not a betting signal**.

The fixture (a 55:00 goal): event `3300s` → source `3302s` → market `3304s` → public `3310s` → GSE
`3314s`, giving a public consensus lag of `+8s` and a public scoreboard delay of `+10s`.

Three visibility statistics turn a record into a coverage measure (all `0..1`, deterministic):
`googleVisibilityIndex` (how rich the public result is), `knowledgeGraphCoverage` (fraction of named
entities that carry a kgmid), and `serpSportsConfidence` (a fixed blend of the two).
`publicObserverDisagreement` flags when the public display differs from a known official score (`null`
when either is unknown).

## Sub-instrument 2 — Entity Passport (the kgmid bridge)

`entity-graph.ts` resolves identity using Google's Knowledge Graph machine id (`kgmid`) as an anchor.
A kgmid is a strong *identity* anchor and a weak *current-truth* claim — so the ladder is explicit:

| Status | Reached by | Confidence |
|---|---|---|
| `DISCOVERED` | `createEntityCandidateFromGoogleSports` (kgmid only) | `0.4` |
| `ALIAS_ONLY` | `linkProviderEntityToGseEntity` (a provider id + alias) | sub-canonical |
| `CANONICAL` | `crossVerifyEntity` (matching official name) | high |
| `CONFLICTED` | cross-verify against a *mismatched* official name | — |

`resolveEntityAlias` resolves an alias **only with sport/league context**, and refuses an ambiguous
alias (returns `null`) rather than guess. `detectEntityConflict` flags an alias mapped to more than one
entity — conflicts are surfaced, never auto-merged. A kgmid helps identity; it does not prove current
roster, score, or status.

## Sub-instrument 3 — Highlight Passport (rights-gated)

`highlight-passport.ts` treats a discovered highlight as a *reference*, never an owned asset.
`buildHighlightPassport` opens gates only when rights clear: `displayAllowed`/`embedAllowed` require
`EMBED_ALLOWED` or `LICENSED`; `thumbnailReusable` requires `LICENSED`; `summaryAllowed` requires at
least `LINK_ALLOWED`. On `UNKNOWN` rights every gate is closed ("link review only; do not display,
embed, download, or rehost"); on `BLOCKED`, "do not use". `publicSafe` is always `false` for a
fixture/discovery highlight, and `attributionRequired` is always `true`. **Discovery is never
ownership.**

## The Provider Trial Court verdict

`public-observer-providers.ts` classifies providers by **role**, not just cost, and machine-checks the
hard rules (`validateProviderClassifications`):

- **SerpApi Google Sports** → Public Observer / Entity Discovery / Latency Discovery. `canSettle: false`,
  `canBeLive: false`, ceiling `WATCH`. Not official truth.
- **public-api lists / awesome-lists** → Discovery Source Only. They find candidates; they are never
  promoted to a LIVE source directly.
- **Cloudbet** (and any sportsbook execution API) → `DO_NOT_USE_FOR_EXECUTION`. `canExecute: false`.

Invariants enforced for every entry: a public observer can never settle; a discovery-only source can
never be LIVE; execution sources must be `DO_NOT_USE_FOR_EXECUTION`; **no provider may execute**; and a
LIVE-capable provider must declare a fact-supply path first.

## Where it surfaces

The **Public Observers** view at `/meaning/preview?view=observers` renders all three sub-instruments
from fixtures: the Chronos clock chain with its lag family, the observer-visibility cards (each marked
"can settle: never"), the entity ladder built live from the soccer fixture's kgmids, and the
rights-gated highlight cards. Everything is fixture-watermarked and capped at `INFO_ONLY`.

## Invariants (machine-checked)

> All seven are proven by `__tests__/public-observer-conservation.theorem.test.ts` — the **Sixth-Ledger
> Conservation Theorem**, a sibling of the authority-tensor and Meaning-Compiler conservation theorems.
> Its keystone (T4): every authority cap the compiler records on a public-observer claim *is*
> `composeAuthority`'s meet — the sixth ledger composes the canonical engine, it never forks it.

1. A public-observer record without a capture time cannot be built.
2. `canSettle` is `false` and `authorityImpact` is `PUBLIC_OBSERVER_ONLY` — structurally, not by policy.
3. A compiled public-observer claim caps at `INFO_ONLY` on fixtures.
4. Chronos lag carries `canImplyEdge: false` / `canCreateAction: false`; a missing clock is `null`.
5. A kgmid alone never reaches canonical confidence; an ambiguous alias is refused.
6. A highlight on `UNKNOWN` rights is non-displayable, non-embeddable, non-reusable, non-public.
7. No provider executes; SerpApi never settles; public-api lists are never LIVE; Cloudbet is execution-gated.
