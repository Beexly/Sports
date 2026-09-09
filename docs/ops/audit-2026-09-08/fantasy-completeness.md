# Fantasy Suite Audit, page by page

Dimension: THE FANTASY SUITE, PAGE BY PAGE
Date: 2026-09-08
Mode: read-only. No source edited, no git write, no command that mutates state.
Scope: every directory under `apps/web/app/fantasy/*`, the components and libs each page renders,
the shared `FantasyShell` / `ProjectionsBadge` claim machinery, and the pricing copy that sells the suite.

---

## What I checked (with commands run)

Enumeration and rendering mode:

```bash
find /home/user/Sports/apps/web/app/fantasy -type f | sort
cd /home/user/Sports/apps/web/app/fantasy && wc -l */page.tsx page.tsx error.tsx opengraph-image.tsx */loading.tsx
cd /home/user/Sports/apps/web/app/fantasy && grep -n "dynamic\|revalidate\|force-static\|use client\|fetchCache" page.tsx */page.tsx
grep -rn "maxDuration" apps/web/app/fantasy/
```

Files read in full or in the cited ranges:

- All 17 page files: `app/fantasy/page.tsx`, and `academy|autopilot|baseline|bestball|connect|contests|dfs|draft|gm-ledger|league-twin|lineup|props|scheme|studio|trade|waivers/page.tsx`
- `app/fantasy/opengraph-image.tsx`, `app/fantasy/error.tsx`
- `components/fantasy/fantasy-shell.tsx`, `components/integrations/projections-badge.tsx`
- `lib/integrations/projections.ts`, `lib/integrations/providers.ts`, `lib/integrations/projections-server.ts` (lines 107-146, 239-246), `instrumentation.ts`
- `lib/fantasy/players.ts` (1-140, 185-190), `lib/fantasy/free-trial.ts`, `lib/fantasy/gm-ledger.ts`, `lib/fantasy/props.ts`, `lib/fantasy/scheme.ts` (grep), `lib/fantasy/league-twin.ts` (55-124), `lib/fantasy/dk-import.ts`, `lib/fantasy/dfs-slate.ts` (1-40), `lib/fantasy/competitive-baseline.ts`
- `lib/integrations/pickem.ts`, `lib/contests/store.ts` (1-80, 244-303), `lib/contests/week.ts` (1-80), `lib/launch/public-surface-gate.ts` (24-40)
- `lib/data-sources/live-evidence.ts` (100-198)
- `components/fantasy/`: `sleeper-connect.tsx`, `gm-autopilot.tsx`, `gm-ledger-view.tsx` (1-90), `waiver-board.tsx`, `scheme-intel.tsx`, `props-edge.tsx`, `dfs-optimizer.tsx` (1-120), `dk-import-panel.tsx`, `draft-assistant.tsx` (26-215), `bestball-board.tsx` (grep), `lineup-optimizer.tsx` (1-45), `trade-analyzer.tsx` (1-40), `gm-academy.tsx` (1-70), `studio-host.tsx` (1-50), `studio-brief.tsx` (1-40), `league-twin-lazy.tsx`, `league-twin-galaxy.tsx` (1-50), `fantasy-upsell.tsx`, `live-pool-empty.tsx`
- `components/ui/nav.tsx` (40-80), `app/pricing/page.tsx` (105-150, grep), `middleware.ts` (70-95)
- `app/api/sleeper/leagues/route.ts`, `lib/pricing/tier-access.ts`, `packages/types/src/index.ts` (grep)
- `apps/web/__tests__/fantasy-badge-provenance.test.ts` (full), `fantasy-real-data-surface.test.ts` (full)
- `app/globals.css` (125-150) for `.live-dot`
- `scripts/guardrails/commercial-copy-scan.mjs` (grep for the banned tout list)

Commands whose output I saw:

```bash
node scripts/guardrails/commercial-copy-scan.mjs        # "OK - scanned 443 file(s); no unsafe commercial copy."
npm run lint:brand                                      # 19 files, 3785 tests passed
grep -rn "FANTASY_PUBLIC_TOOLS_ENABLED" --include=*.ts --include=*.tsx --include=*.mjs --include=*.md .
grep -rn "canUseFantasyFull" apps/web --include=*.ts --include=*.tsx | grep -v __tests__
grep -rn "registerPickemProvider" apps/web --include=*.ts --include=*.tsx
grep -n "localStorage\|sessionStorage\|fetch(" apps/web/components/fantasy/*.tsx
grep -rn "from \"@/components/fantasy" apps/web/__tests__/
ls apps/web/lib/fantasy/*.test.ts
```

I did NOT run `npm run build`, `npm run test`, `npm run typecheck`, or any deploy or database command.

---

## Findings

### 1. BLOCKER: the shared OpenGraph card for every `/fantasy/*` route makes an unconditional "real data" claim over a fictional pool

`apps/web/app/fantasy/opengraph-image.tsx`:
- line 11: `export const alt = "... Galaxy Fantasy: Draft & Best Ball on real, cleared data"`
- line 84: headline text `Draft & Best Ball on real, cleared data.`
- line 97: `Roster ceiling, QB stacks, bye structure, with the reasoning. No fabricated projections.`
- line 116: `Real grades, not fabricated projections.`

This is the only `opengraph-image` under `app/fantasy` (verified by `find`), so in the App Router it is the
social card for `/fantasy` and every nested tool route that does not define its own, which is all of them.

What the pages actually render when the projections gate is off: `lib/fantasy/players.ts:9-12` states the
doctrine in its own words, "explicitly illustrative. Player NAMES are fictional ... This is a demonstration
of the intelligence, not live projections", over the 35 hand-authored players at `lib/fantasy/players.ts:76-114`.
The gate is `PROJECTIONS_PROVIDER` (`lib/integrations/providers.ts:29`), read through
`isConfigured("projections")` in `lib/integrations/projections.ts:89,94`; with it unset,
`resolveToolPoolAsync()` returns `undefined` and every tool falls to `PLAYERS`. The repo's own copy asserts
that state: `app/fantasy/page.tsx:129` renders the readiness tile `Projections / gated`, and
`app/fantasy/connect/page.tsx:19` says "Live recommendations on real players require a licensed projections
source (founder-gated)".

The whole `ProjectionsBadge` apparatus exists so this claim is made conditionally and per request
(`components/integrations/projections-badge.tsx:8-24` documents exactly that reasoning). A static edge-runtime
`ImageResponse` cannot be conditional, so the card asserts unconditionally the one thing the badge was built
to refuse to assert, and it is the artifact that travels furthest, into link previews the reader cannot
cross-check against the page.

Why it matters: this is CLAUDE.md rule 2 and AGENTS.md law 8 on the surface most likely to be seen out of
context. It also directly contradicts the same route's own `metadata.description`
(`app/fantasy/page.tsx:30`: "No fictional projections are presented as live advice").

Proposed fix: rewrite the card so it states the mechanism rather than the data state, e.g. headline
"Draft and Best Ball, with the reasoning shown" and footer "Every number carries its source." Do not
attempt to make the image conditional; the point is to remove a claim the image cannot qualify.
Risk of fix: none to behavior. It is four string constants plus the `alt` export. It will change the
social preview for existing shared links.

### 2. BLOCKER: the paid Fantasy tier is sold as "on real, cleared data" while the only two boards it gates run on the fictional pool

`apps/web/app/pricing/page.tsx:111` lists as the first Fantasy-tier feature:
`{ label: "Draft Assistant + Best Ball, on real, cleared data", included: true }`, and line 142 repeats it in
the plan description: "The fantasy suite: the Draft Assistant and Best Ball board on real, cleared data."

The enforcement is real but it is enforcement over fictional rows. `app/fantasy/draft/page.tsx:23-26` and
`app/fantasy/bestball/page.tsx:25-28` call `poolForViewer(pool, viewer.canUseFantasyFull)`.
`lib/fantasy/free-trial.ts:47-53` returns `pool` unchanged when `pool` is `undefined`, which is the state when
the projections gate is off, so the server-side trim is a no-op. What still applies is the client cap:
`components/fantasy/draft-assistant.tsx:76-77` and `bestball-board.tsx:68-69` slice the board to
`FREE_BOARD_DEPTH = 12` (`lib/fantasy/free-trial.ts:20`) and `draft-assistant.tsx:62` drops recommendations
from 4 to 1. The upsell that then renders (`components/fantasy/fantasy-upsell.tsx:11,20`) reads "the full
board, every recommendation, and the complete roster analysis are part of the Fantasy suite" over a
"Unlock the full suite . from $49/yr" button.

So while the gate is off, the paid Fantasy tier's delivered increment is rows 13 and beyond of a board of
35 invented players, plus three more recommendations about them. The pricing copy's "on real, cleared data"
is unconditional; the data is conditional.

NOT VERIFIED: which value `PROJECTIONS_PROVIDER` currently holds in production. I did not read any `.env`
file (law 2 denies it) and did not search for credentials. Every statement above is about what the code does
in each state, plus the repo's own assertions at `app/fantasy/page.tsx:129` and
`app/fantasy/connect/page.tsx:19` that the source is founder-gated today.

Why it matters: rule 1, rule 2, and the product's stated premise. A subscriber can verify in one click that
the names on the board are not real players.

Proposed fix (copy only, no gate touched): make the pricing feature conditional on the same resolution the
tool pages use, or restate it as what is true in both states, e.g. "Draft Assistant and Best Ball, with the
full board and every recommendation" plus a separate line "Live player projections activate when the
licensed source is connected." Alternatively suppress the FANTASY plan's purchase CTA until
`isConfigured("projections")` is true. Do not change the flag or the entitlement.
Risk of fix: the conditional-copy route puts a runtime read on the pricing page, which is already
`force-dynamic`? NOT VERIFIED, I did not read the pricing page's rendering directives. The
restated-copy route has no runtime risk.

### 3. MAJOR: `/fantasy/autopilot` and `/fantasy/connect` prerender a badge whose text depends on runtime provider state, and the C-251 guard has a hole that lets them through

`components/integrations/projections-badge.tsx:60`:
`const live = meta.live && pool !== "illustrative";`

For `pool === "none"` this reduces to `live === meta.live`, which is pure runtime state
(`getLiveProjectionsMeta()` reads the process-global registry, `lib/integrations/projections.ts:107-111`).
The badge then renders either "Projections: live . <basis> . <attribution>" or "Projections: illustrative .
a licensed source is founder-gated" (lines 70-89).

Two pages pass `projectionsPool={"none"}`, keep the badge on (`projectionsBadge` defaults `true`,
`components/fantasy/fantasy-shell.tsx:25`), and declare no `dynamic` export and no `async` component:
- `app/fantasy/autopilot/page.tsx:12,22` (`export default function AutopilotPage()`, no `dynamic`)
- `app/fantasy/connect/page.tsx:12,22` (`export default function ConnectPage()`, no `dynamic`)

Next will therefore prerender both at build time, baking the build machine's provider status into a claim
about the reader's request. That is precisely the C-251 defect, in the same shape, on two more pages.

The guard misses it by an incorrect premise. `apps/web/__tests__/fantasy-badge-provenance.test.ts:167-171`:

```
// Only pages whose badge is CONDITIONAL are making a live claim. A page
// hardcoding "illustrative" or "none" says the same thing whenever it is
// rendered, so prerendering it is harmless.
const conditional = /projectionsPool=\{[^}]*\?[^}]*\}/.test(src);
if (!conditional) continue;
```

That comment is true for `"illustrative"`, because line 60 of the badge forces `live` false regardless of the
registry. It is false for `"none"`, where the badge output is entirely determined by runtime state. The guard
groups the two together and skips both.

Direction of error: the frozen value today is the safe one ("founder-gated"). The harm arrives on the day the
provider is enabled, when two pages keep telling readers a licensed source is not connected. That is the same
"a config change with nothing in the code to catch it" hazard the badge's own header comment names
(`projections-badge.tsx:16-19`).

Proposed fix: add `export const dynamic = "force-dynamic";` and make both components `async` (matching the
five sibling tool pages), and widen the guard's `conditional` test to treat `projectionsPool={"none"}` as a
live claim as well. This strengthens the guard; it does not weaken it.
Risk of fix: both pages lose static prerendering. Neither does server work today (`SleeperConnect` and
`GmAutopilot` are `"use client"` with no server data), so the cost is per-request render of a small shell.

### 4. MAJOR: `/fantasy/studio` can render a "real" badge directly above a note that says the data is illustrative

`app/fantasy/studio/page.tsx:56` sets `note={`${ILLUSTRATIVE_NOTE} Studios generates broadcast scripts ...`}`
unconditionally, where `ILLUSTRATIVE_NOTE` (`lib/fantasy/players.ts:188-189`) reads "Illustrative player
universe: fictional players, illustrative projections. A demonstration of the intelligence, not live data."

Line 63 sets `projectionsPool={pool ? "real" : "illustrative"}`.

When the projections gate is on, the hero renders "Projections: live" while the note beneath the tool says
"fictional players, illustrative projections". This is the exact defect C-239 corrected on
`/fantasy/scheme`, and the correction's own reasoning is written out at `app/fantasy/scheme/page.tsx:32-35`:
"The page's own `note` is ILLUSTRATIVE_NOTE unconditionally, so declaring 'real' also put the badge in direct
contradiction with the sentence beside it." Studio kept the conditional badge and the unconditional note.

The dedicated guard cannot see it: `fantasy-badge-provenance.test.ts:135-143` only asserts that pages using
`resolveToolPoolAsync` key the badge on `pool`, which studio does. Nothing compares the badge to the note.

Why it matters: a reader given two contradictory statements about the same rows on the same screen cannot
tell which to believe, and one of them is false in every state.

Proposed fix: make the note conditional on the same `pool` value the badge uses, mirroring
`app/fantasy/waivers/page.tsx:37` (`note={pool ? LIVE_NOTE : ILLUSTRATIVE_NOTE}`).
Risk of fix: low. One expression on one page; the live-side wording needs review because the brief also
contains scheme scenarios and ledger rows that stay illustrative regardless.

### 5. MAJOR: after a DraftKings CSV import, real athletes carry modeled projections and ownership with no persistent on-screen label

`lib/fantasy/dk-import.ts:108-116` synthesises, for every real player parsed out of the user's DK export:

```
const proj = avg > 0 ? Math.round(avg * 10) / 10 : Math.round(salary / 420);
const floor = Math.round(proj * 0.45);
const ceiling = Math.round(proj * 1.85);
const valuePer1k = proj / (salary / 1000);
const own = Math.max(0.02, Math.min(0.45, 0.03 + (valuePer1k - 2) * 0.04));
```

`own` is a closed-form function of points per dollar. `ceiling` and `floor` are fixed multiples. When the CSV
has no AvgPointsPerGame column, `proj` is `salary / 420`, a pure salary-to-points transform.

Those numbers are then rendered as first-class figures against real names:
`components/fantasy/dfs-optimizer.tsx:164` "Total ownership {m.totalOwn}%", line 166 "Leverage
{m.leverageScore}", line 226 a per-player leverage column.

The honest labelling exists but does not persist where the numbers are:
- `components/fantasy/dfs-optimizer.tsx:62` gates the whole "sample slate / these are fictional players"
  banner behind `{!imported && ...}`, so importing a real slate REMOVES the data-honesty banner.
- `components/fantasy/dk-import-panel.tsx:83-87` carries the "projections, floor/ceiling, and ownership are
  modeled here" sentence inside a block gated on `{open && ...}` (line 56), the collapsible import panel a
  user closes after importing.
- `dk-import-panel.tsx:30` puts it in a transient status line rendered in the same collapsed block.
- `lib/fantasy/dk-import.ts:63` returns a `modeled: boolean` field for exactly this purpose;
  `grep -rn "modeled" components/fantasy/` shows nothing consumes it.

Net effect: the state with fictional players carries a loud permanent warning; the state with real players and
invented ownership carries none. The disclosure is inverted relative to the risk.

Why it matters: rule 2, no fabricated stats, and it is the only place in the fantasy suite where a synthetic
number attaches to a named real athlete.

Proposed fix: consume `DkParseResult.modeled` and render a persistent caution strip whenever `imported` is
true, e.g. "Imported slate: real players and salaries from your CSV. Projections, floor, ceiling and ownership
are modeled from DK average points, not a licensed feed." Label the ownership and leverage columns "modeled"
in the imported state.
Risk of fix: none to computation. Display only.

### 6. MAJOR: the fantasy hub promises a gate that the suite it links to does not enforce

`app/fantasy/page.tsx:99-107`:
"Real roster first. No fake projections. ... if the data is not real, the advice stays locked.
... projection-driven recommendations open only after the live data layer clears."

Line 152-153: "it still cannot unlock projection-driven lineup, waiver, trade, DFS, or pick'em advice until
those provider feeds are live."

But every one of those tools renders complete projection-driven output right now, one click away, on
`PLAYERS`: `/fantasy/waivers` (ranked adds plus dollar FAAB bids, `components/fantasy/waiver-board.tsx:63`),
`/fantasy/trade` (fairness verdicts), `/fantasy/lineup` (optimal lineup and leverage), `/fantasy/dfs`
(full lineups), `/fantasy/props` (sides, alt lines, entry EV). Each of those pages discloses honestly in its
own `note`; the hub asserts a gate that does not exist.

The same directory's status column contradicts the pages a second way. `app/fantasy/page.tsx:60-64` marks
"Waiver & FAAB", "Trade Analyzer", "Pick'em Edge", "League Twin" and "GM Ledger" as `gated`, and
`STATUS_TONE.gated` renders them in muted `text-ion-2` (line 70). None of the five is gated; all five render
a working tool. "Best Ball" at line 58 gets this right ("Runs on the illustrative pool now"), which shows the
correct wording already exists in the file.

And the surrounding copy at lines 220-221 says "One directory, no dead ends", while the directory lists 8
entries covering 5 of the 16 `/fantasy/*` routes; academy, autopilot, contests, dfs, draft, lineup, props,
scheme, studio and baseline are absent from it.

Why it matters: the hub is the entry point and the page a skeptical reader lands on first. It currently
overstates the discipline (claiming a gate) and understates the product (calling working tools gated) in the
same table.

Proposed fix: replace "the advice stays locked" with what is true, e.g. "if the data is not real we say so on
every screen, and the advice runs on a labelled sample until the feed clears"; change the five `gated` rows
to a status that distinguishes "runs on the illustrative pool" from "not built"; either complete the
directory or drop the "no dead ends" phrasing.
Risk of fix: `apps/web/__tests__/fantasy-real-data-surface.test.ts:26-29` asserts the page matches
`/No fake projections/` and `/projection-driven lineup, waiver, trade, DFS, or pick'em/` and `/gated/`. Those
assertions must be updated alongside the copy, and updating them is not weakening a guard as long as the
replacement assertions are at least as specific. That should be reviewed rather than assumed.

### 7. MAJOR: `.live-dot`, a pulsing live indicator, renders on the eyebrow of all 14 shell pages, including twelve that are explicitly illustrative

`components/fantasy/fantasy-shell.tsx:74-79` renders, unconditionally:

```
<p className={`eyebrow inline-flex items-center gap-2 ...`}>
  <span className="live-dot" />
  {eyebrow}
</p>
```

`app/globals.css:128-143` defines it, in its own comment, as the "Live-status dot (the brand's pulse)": an
animated plasma dot with a 2.4s infinite pulse.

Result: `/fantasy/league-twin`, `/fantasy/scheme`, `/fantasy/props`, `/fantasy/dfs`, `/fantasy/academy`,
`/fantasy/autopilot`, `/fantasy/gm-ledger`, `/fantasy/studio` and the five tool pages all show a pulsing live
indicator roughly 100 pixels above a badge that reads "Projections: illustrative" or a note that reads
"fictional players, illustrative projections".

A related instance inside the page: `components/fantasy/studio-host.tsx` renders a red pill reading "Live"
with a red dot on the broadcast frame, unconditionally, on a page whose note is `ILLUSTRATIVE_NOTE`.

Neither is caught by `npm run lint:brand` or `scripts/guardrails/commercial-copy-scan.mjs`, both of which I
ran and both of which pass. They scan copy strings; a live-status affordance carried in a CSS class is
invisible to them.

Why it matters: a pulsing live dot is a data-freshness claim rendered as design. On a suite whose central
honesty mechanism is a badge that says "illustrative", the surrounding chrome says the opposite.

Proposed fix: drive the dot from the same `projectionsPool` value the badge already receives, showing it only
when the page's own claim is live; keep a static, non-pulsing bullet otherwise. Give `StudioHost`'s "Live"
pill the same treatment or relabel it "On air (draft)".
Risk of fix: low. One conditional in `fantasy-shell.tsx`, one in `studio-host.tsx`. Visual regression only.

### 8. MAJOR: `/fantasy/contests` can never lock and can never settle, because the slate is rebuilt from `now` on every request

`lib/contests/week.ts:52-76`. `buildContestWeek(now)` sets each fixture's kickoff to `isoOffset(now, 2)` and
onward, then `locksAt = games[0].kickoff`, that is `now + 2 days`, recomputed per render.
`lib/contests/store.ts:244-248` calls it with a fresh `new Date()` every time.

Consequences that follow directly:
- `week.status` is computed from `const open = now < new Date(locksAt)` (`week.ts:76`), which is always true,
  so the board is permanently `open`.
- The close guard at `lib/contests/store.ts:301` (`if (week.status !== "open" || now >= new Date(week.locksAt))`)
  can never fire.
- The page renders `Closes . {new Date(week.locksAt).toLocaleString()}` (`app/fantasy/contests/page.tsx:45`),
  a date that moves two days further away on every page load.
- The leaderboard's `score` column shows `—` unless an operator manually writes a settlement row, since
  nothing in the codebase settles these fixtures (the six labels are `Practice A . KC vs BUF` etc., synthetic
  matchups, `week.ts:60-66`, correctly disclaimed at lines 57-58 as "NOT a claim about this week's real NFL
  schedule").

The page's own headline promise is "Pick home or away on every game. Close entries before first kickoff.
Climb a pure accuracy leaderboard" (`app/fantasy/contests/page.tsx:36-38`) and "This is a completed free paper
product". Two of those three mechanics cannot happen.

Mitigating: the route is dark. `app/fantasy/contests/page.tsx:20` calls `notFound()` unless
`isContestsPublic()`, which requires `CONTESTS_PUBLIC=true` (`lib/launch/public-surface-gate.ts:28-30`,
documented default OFF at lines 25-26). I am not proposing that flag be touched. This is a finding about what
would be true if it were opened.

Proposed fix: anchor `weekId`, kickoffs and `locksAt` to the ISO week boundary rather than to `now`, so the
week has a fixed close time, and remove the word "completed" from the page copy until a settlement path
exists.
Risk of fix: touches an entry-accepting surface. `gameId` is already week-anchored so existing entries would
keep matching; the close time changing from "always two days out" to a fixed instant is the intended change.
Should be reviewed against `lib/contests/store.ts` and its tests before landing.

### 9. MAJOR: nothing a user does anywhere in the fantasy suite is persisted

```bash
grep -n "localStorage\|sessionStorage\|fetch(" apps/web/components/fantasy/*.tsx
```

returns exactly three hits, all in `sleeper-connect.tsx` (lines 60, 83, 108), all reads. Across 21 components
there is no write of any kind: no `localStorage`, no `sessionStorage`, no POST, no server action.

Concretely, a reload discards: the draft you were mid-way through (`draft-assistant.tsx:48-51`, `mine`/`gone`/
`order` in `useState`), your best-ball roster, your FAAB budget, your trade sides, your DFS locks, fades and
generated lineups, your Academy answers and GM IQ (`gm-academy.tsx:27`), your Autopilot approvals
(`gm-autopilot.tsx:27`), and your Sleeper league connection, which must be re-entered by username on every
visit.

For a draft assistant in particular this is decisive: a real draft runs 90 minutes to three hours across
picks, and any tab reload, phone lock or navigation loses the entire board state.

Why it matters: this is the largest single gap between the suite as it exists and a shippable subscription
product, and it applies uniformly to all 16 routes.

Proposed fix: per-tool session persistence for the draft board and best-ball board first (draft state is the
one with real duration), then the connected Sleeper league. Server persistence needs a schema change and is
law 2 territory, so scope it as a founder decision; browser-local persistence for the draft board is not.
Risk of fix: state restoration must not restore a live pool's rows into an illustrative session or vice
versa. Key any stored state to the resolved pool identity.

### 10. MAJOR: the Autopilot tells the user their approval was recorded to the GM Ledger, and nothing is recorded

`components/fantasy/gm-autopilot.tsx:120`: on approve, the row renders
`"✓ Approved: queued to your GM Ledger"`.
Line 135: `"Approving here records the decision to your GM Ledger (process-graded, tamper-evident) and would
queue it for submission only once live league write-back is enabled for your account."`

Both sentences are present tense about the ledger and future tense only about the league. The decision state
is `useState<Map<string, "approved" | "skipped">>` (line 27) and there is no fetch in the file. Nothing is
written to the GM Ledger, which is itself a fixed array of seven hand-authored decisions
(`lib/fantasy/gm-ledger.ts:45-53`) with no insert path anywhere in the codebase.

The page-level note (`app/fantasy/autopilot/page.tsx:19`) says "Illustrative", and line 136 of the component
says "This demo never touches a real league", but neither retracts the specific claim that the approval was
recorded.

Proposed fix: change both strings to the conditional the rest of the page uses, e.g. "Approved. Once your
league is connected and the ledger is live, approvals like this are committed before kickoff and graded on
process."
Risk of fix: none. Two strings.

### 11. MAJOR: the fantasy hub renders a QB-age effect size against the wrong denominator, and omits the p-value and sample it already has in hand

`app/fantasy/page.tsx:178-182`:

```
<EvidenceMetric
  label="Accepted research"
  value={qbAgeLiftLabel}                                   // formatPercent(evidence.summary.qbAge34Lift)
  detail={`${formatCount(evidence.summary.cohortObservations)} team-week observations for QB-age/RB target share.`}
/>
```

`qbAge34Lift` is specific to one cohort: `lib/data-sources/live-evidence.ts:117`
(`trend?.trends.find((item) => item.cohort === "QB age 34+")`) then line 172
(`qbAge34Lift: roundNullable(qbAge34?.relativeDelta ?? null)`).
`cohortObservations` is the whole study: line 170, `trend?.quality.observationsUsed`.

So the tile pairs the "QB age 34+" cohort's lift with the observation count of every cohort combined. The
cohort's own n is available on the same object and unused: `qbAge34Sample` (line 173), as is its significance,
`qbAge34PValue` (line 174). The sibling tile "Rejected narratives" (page lines 183-187) does render its
`birthdayUsageConclusion` verdict string, so the asymmetry is within one grid of four.

Why it matters: the tile is labelled "Accepted research" and is the hub's proof-of-real-data exhibit. An
effect size shown under an inflated denominator, with the p-value withheld, is the failure mode this product
exists to avoid.

Proposed fix: render `qbAge34Sample` in the detail line instead of `cohortObservations`, and surface
`qbAge34PValue` beside the lift. Both are already on the object.
Risk of fix: none to data. Two field references.

### 12. MAJOR: only 3 of 21 fantasy components have any rendering test

```bash
grep -rn "from \"@/components/fantasy" apps/web/__tests__/
```
returns `DraftAssistant` and `BestBallBoard` (`__tests__/fantasy-display-flags.test.tsx`) and `DfsOptimizer`
(`__tests__/dfs-exposure-bound-disclosed.test.tsx`). Nothing else.

Untested at the render layer: `SleeperConnect` (the only live-data surface in the suite, and the only one
with network error paths), `WaiverBoard`, `TradeAnalyzer`, `LineupOptimizer`, `PropsEdge`, `GmAcademy`,
`GmAutopilot`, `GmLedgerView`, `SchemeIntel`, `StudioHost`, `StudioBrief`, `LeagueTwinGalaxy`,
`DkImportPanel`, `OptimizerWorkspace`, `FantasyUpsell`, `LivePoolEmpty`, `FantasyShell`,
`ProjectionsBadge` is covered separately by `__tests__/projections-badge-pool.test.tsx`.

The pure-logic layer is by contrast very well covered: 21 of the 23 non-test files in `lib/fantasy/` have a
colocated `.test.ts` (`ls apps/web/lib/fantasy/*.test.ts`). The gap is entirely in the layer where the claims
live, which is why findings 5, 7 and 10 above are all display defects over correct math.

Why it matters: CLAUDE.md rule 6. Every finding in this report except 8 and 11 is a defect a render test
would catch.

Proposed fix: start with `SleeperConnect` (loading, not-found, source-error, empty-leagues, resolved-roster,
availability-overlay-failure), then `DkImportPanel` plus `DfsOptimizer` in the imported state, then a
`FantasyShell` test asserting the live indicator matches `projectionsPool`.
Risk of fix: none. Additive.

### 13. MINOR: the Pick'em Edge conviction bar is driven by `edge`, which is zero on every shipped row and can go negative

`components/fantasy/props-edge.tsx`, in `PropRow`, under a block commented `{/* pick + conviction */}`:

```
<div className="h-full rounded-full" style={{ width: `${Math.round(r.edge * 100)}%`, background: tone }} />
```

`PropRead` carries both `edge` and `conviction` as distinct fields, and `lib/fantasy/props.ts:85-88`
documents the distinction in the strongest terms: "`conviction` |2p-1| . conviction, not value. Do not rank on
this", and `edge` "or 0 when unpriced".

None of the six shipped props (`lib/fantasy/props.ts:175-182`) carries `overAmerican`/`underAmerican`, so
`priced` is false and `edge` is `0` for all six (`props.ts:105-125`). The bar therefore renders at 0% width on
every row today: a dead visual element under a "conviction" label. When a licensed feed does supply two-way
quotes, `edge` can be negative on a recommended side, producing a negative CSS width.

The row's text is honest: `props.ts:127-129` writes "Unpriced: no two-way book quote, so this is not an edge.
Conviction NN%." The bar contradicts the label above it and the number in the text beside it.

Proposed fix: bind the bar to `r.conviction` to match its own label, or hide it when `!r.priced`.
Risk of fix: none.

### 14. MINOR: the pick'em provider seam is a module-scoped `let`, the exact pattern `projections.ts` moved off `globalThis` to avoid

`lib/integrations/pickem.ts:28`: `let liveProvider: PickemProvider | null = null;`

`lib/integrations/projections.ts:66-73` explains at length why this cannot work under Next: "Next.js compiles
instrumentation.ts and the app's server components separately, so a module-level variable set during startup
registration would be invisible to the page that reads it (different module instance). A process-global slot
is the single source of truth both sides share."

`pickem.ts` was written to "mirror the projections provider exactly" (its header, line 4) and kept the shape
that was deliberately abandoned. Today this is latent:
`grep -rn "registerPickemProvider" apps/web` finds only the definition and its own test file, so nothing
registers a pick'em provider from anywhere. It becomes real on the day one is wired through
`instrumentation.ts`.

Proposed fix: move the pick'em registry to the same `globalThis` slot pattern, with its own key.
Risk of fix: low, and the projections module is the working reference implementation.

### 15. MINOR: `/fantasy/baseline` publishes as "current truth" a gate that was deleted

`lib/fantasy/competitive-baseline.ts:113`:
`currentTruth: "Controls exist in the DFS tool; public tool access remains gated by \`FANTASY_PUBLIC_TOOLS_ENABLED\`."`

`apps/web/middleware.ts:80-84` states the gate is gone: "NOTE: the old FANTASY_PUBLIC_TOOLS_ENABLED
middleware gate is gone." A repo-wide grep finds the identifier only in that comment, in this string, in two
test files, and in `handoff/LOCAL_BRINGUP.md`. Nothing reads it.

This is already logged as FAN-14 in `docs/ops/LAUNCH_FINISH_LINE_2026-09-05.md:598` and is still present.

The page renders these strings under a column header literally titled "Current truth"
(`app/fantasy/baseline/page.tsx:122-125`), and a five-tile summary of counts by status
(lines 68-72) derived from the same constants, so a stale row also shifts a published count.

Proposed fix: replace that `currentTruth` with what is enforced now, which per
`app/fantasy/dfs/page.tsx` is: the DFS tool is public, the salary feed is gated on `DFS_PROVIDER`
(`lib/integrations/providers.ts:36`), and the optimizer runs on the sample slate or a user CSV.
Risk of fix: none. One string.

### 16. MINOR: the fantasy hub does four sequential network reads with 15s timeouts each and declares no `maxDuration`

`app/fantasy/page.tsx:10` is `force-dynamic`, line 83 awaits
`loadSourceLiveEvidence({ timeoutMs: 15000 })`. That helper awaits four loaders one at a time
(`lib/data-sources/live-evidence.ts:103-106`: `readiness`, then `usage`, then `trend`, then `birthday`), each
passed the same 15s timeout. Worst case is roughly 60 seconds of sequential upstream waiting on a cold
instance. The result cache is module-scoped with a 15-minute TTL (line 196), so it is per serverless instance
and every cold start pays the full cost.

`grep -rn "maxDuration" apps/web/app/fantasy/` shows the five heavy tool pages each declare
`export const maxDuration = 60` with the comment "heavy nflverse load ... needs headroom beyond the default".
The hub, which does comparable work, declares none. `apps/web/vercel.json` contains no `functions` block
setting a default.

Two related gaps in the same family:
- `app/fantasy/studio/page.tsx:47` awaits `resolveToolPoolAsync()`, the same graded-pool load the five tool
  pages give 60 seconds for, and declares no `maxDuration`. Today this is cheap because
  `lib/integrations/projections-server.ts:111` returns immediately when the projections gate is off; it
  becomes the heavy path the moment the gate opens.
- `app/api/sleeper/leagues/route.ts:13` keeps `const resultCache = new Map()` with a TTL check but no
  eviction, so the map grows once per distinct `username:season` for the life of the instance.

Proposed fix: run the four loaders with `Promise.allSettled` rather than sequentially (the code already wraps
each in a `settle` helper, so the change is mechanical), and add `export const maxDuration = 60` to the hub
and to studio. Add a size cap or periodic sweep to the Sleeper route cache.
Risk of fix: parallelising the four loaders raises peak concurrent upstream requests from 1 to 4 against
nflverse. That is the intended trade and should be confirmed against any rate posture in
`.claude/rules/scraping.md` before landing.

### 17. MINOR: three pages carry an unfalsifiable "First of its kind" superlative

`app/fantasy/gm-ledger/page.tsx:17`, `app/fantasy/league-twin/page.tsx:16`,
`app/fantasy/autopilot/page.tsx:15` all set an eyebrow ending in `. First of its kind`.

`npm run lint:brand` and `node scripts/guardrails/commercial-copy-scan.mjs` both pass, so this is a coverage
gap rather than a guard failure. It is a claim about the entire market that no measurement in this repo
supports, on a product whose positioning is that every claim traces to something readable.

Proposed fix: replace with a claim about the mechanism, which is both stronger and checkable, e.g.
"The GM Ledger . committed before kickoff, graded on process", "The League Twin . your roster as a system",
"GM Autopilot . every move explained before it happens".
Risk of fix: none. Three strings.

### 18. MINOR: the GM Ledger's "published root" is computed at render from a constant array, and the page says it was published before outcomes

`components/fantasy/gm-ledger-view.tsx:75-78`: "All {n} decisions are leaves of a SHA-256 Merkle tree. The
root is published before outcomes, so the record can be proven, not edited."

`lib/fantasy/gm-ledger.ts:133-135` computes that root from `DECISIONS`, a seven-element frozen constant
(lines 45-53) whose `committedAt` timestamps are literals in the file. There is no anchoring, no external
publication, no timestamp authority. The cryptography is genuine (`merkleRoot`, `inclusionProof`,
`verifyInclusion` from `@sports/prediction-engine`, and the tamper demo at lines 141-145 is a real
recomputation), but "published before outcomes" is a claim about ordering in time that a hash of a constant
cannot support.

`GM_LEDGER_DISCLAIMER` (`gm-ledger.ts:172-173`) is careful and correct: "The SHA-256 Merkle commitment,
inclusion proof, calibration, and tamper detection are computed live; the decisions themselves are a
demonstration." The sentence inside the component goes further than the disclaimer beneath it.

Proposed fix: change to "The root is computed over the committed fields only, so any later edit to a decision
breaks it. In the live product the root is published before kickoff." That keeps the demonstrated property and
moves the temporal claim into the future tense where it belongs.
Risk of fix: none. One string.

### 19. MINOR: two nav descriptions promise more than the linked tools deliver

`components/ui/nav.tsx:60`: Draft Assistant, "Draft tiers, player values & live pick guidance". The word
"live" is the one the badge on the destination page is specifically built to withhold.

`components/ui/nav.tsx:72`: Pick'em Edge, "Underdog & PrizePicks line edges, graded". Two problems: every
shipped prop is unpriced so `edge` is 0 (finding 13), and nothing in the codebase grades or settles a pick'em
prop. `grep` for a props settlement path found none; the six fixtures have no result field
(`lib/fantasy/props.ts:26-42`).

Proposed fix: "Draft tiers, player values and pick guidance with the reasoning"; "Underdog and PrizePicks
lines, with our number beside theirs".
Risk of fix: none. Two strings.

### 20. MINOR: `SchemeIntel` renders real players for one paint and fictional ones thereafter, a known and still-open split

`app/fantasy/scheme/page.tsx:22-41` documents this in full and I confirmed the mechanism:
`components/fantasy/scheme-intel.tsx:18` calls `applyScheme(scenario)` with no pool, and
`lib/fantasy/scheme.ts:93` defaults that parameter to `activePlayerPool()`. As a `"use client"` component it
is still server-rendered for the first paint, where the process-global registry can be live; in the browser
the registry is empty (`lib/integrations/projections.ts:74-79`) and it falls back to `PLAYERS`.

The badge was corrected to say "illustrative" unconditionally, which makes the page's claim safe. What
remains is a React hydration mismatch: the server HTML and the client tree contain different player names,
so React discards and re-renders, and a reader on a slow connection sees real names replaced by fictional
ones. The page's `note` is `ILLUSTRATIVE_NOTE` throughout, so nothing on screen explains the swap.

`fantasy-badge-provenance.test.ts:75-133` guards the badge side of this and explicitly passes SchemeIntel
because the page no longer claims "real". Nothing guards the mismatch itself.

Proposed fix: resolve the pool on the server page and pass it to `SchemeIntel` as a prop, the shape
`WaiverBoard`, `TradeAnalyzer` and `LineupOptimizer` already use. The page comment at lines 36-40 correctly
identifies this as a feature change rather than a correction; it should get its own ledger row.
Risk of fix: signature change on `SchemeIntel`, and the badge would then become conditional, which per
finding 3 requires `force-dynamic` and an `async` component on that page.

### 21. MINOR: `LeagueTwin.illustrative` is computed but never read, and cannot be anything but `true`

`lib/fantasy/league-twin.ts:44` declares `readonly illustrative: boolean;` and line 124 sets it to
`!isLiveProjections()`. `buildLeagueTwin` runs only in the browser, because
`components/fantasy/league-twin-lazy.tsx:22-25` loads the galaxy with `{ ssr: false }`. In the browser
`getLiveProvider()` reads an empty `globalThis` slot and `process.env.PROJECTIONS_PROVIDER` is a server-only
variable, so `isLiveProjections()` is false in every case and the field is always `true`.
`grep -n "illustrative" components/fantasy/league-twin-galaxy.tsx` finds no consumer.

The page badge is hardcoded `"illustrative"` and its comment (`app/fantasy/league-twin/page.tsx:22`) already
states this page "cannot show real players, whatever the provider is doing", so the claim is correct. The
dead field is a trap for the next reader, who could reasonably conclude the twin has a live path.

Proposed fix: remove the field, or replace it with a comment pointing at the `ssr: false` constraint.
Risk of fix: none, if nothing outside the galaxy reads it. `lib/fantasy/league-twin.test.ts` may assert on it;
check before removing.

---

## What I checked and found CORRECT

- **`ProjectionsBadge`'s fail-closed logic.** `components/integrations/projections-badge.tsx:60`,
  `const live = meta.live && pool !== "illustrative"`, correctly refuses to say "live" over a fictional pool
  even when a licensed source is registered. Making `pool` a required prop with no default
  (`fantasy-shell.tsx:56`, guarded at `fantasy-badge-provenance.test.ts:61-73`) moves the assertion to the
  compiler and is a genuinely good design.
- **The five tool pages derive badge and note from one value.** `draft`, `bestball`, `lineup`, `waivers` and
  `trade` all compute `pool` once and use it for `note`, `attribution` and `projectionsPool`
  (e.g. `app/fantasy/waivers/page.tsx:37,41,47`), so those three cannot disagree. Guarded at
  `fantasy-badge-provenance.test.ts:135-143`.
- **`LivePoolEmpty` is the right doctrine.** `components/fantasy/live-pool-empty.tsx:11` refuses to fall back
  to illustrative data when the live source is empty, and `waiver-board.tsx:40`, `draft-assistant.tsx:95`,
  `lineup-optimizer.tsx:34` all wire it.
- **The server-side trim is genuinely server-side.** `lib/fantasy/free-trial.ts` documents rule 3 correctly
  and `poolForViewer` is called in the page before any data crosses to the client
  (`app/fantasy/draft/page.tsx:26`). The client cap is presentation only, and both components default
  `canUseFantasyFull = false` (fail closed).
- **`/fantasy/connect` is real.** Sleeper's public API, read-only, server-proxied, rate-limited at 20 requests
  per IP per minute (`app/api/sleeper/leagues/route.ts:19`), with a 60s result cache, honest error strings
  for source-error and not-found, and a connector matrix that states the legal status of each platform rather
  than promising them. The availability overlay is real injury and weather data via
  `/api/human/roster-availability` and is explicitly labelled "never a body claim"
  (`sleeper-connect.tsx:182`).
- **The DFS sample-slate banner, in the un-imported state.** `dfs-optimizer.tsx:62-73` is exactly the right
  disclosure: caution tone, the word "fictional" in bold, and the reason ("so no fake stats ever attach to a
  real athlete"). The problem is only that it disappears in the imported state (finding 5).
- **The DFS salary board's gated state.** `app/fantasy/dfs/page.tsx:85-94` says "No licensed salary feed is
  connected right now, so no real salaries are shown" and shows nothing rather than something invented.
- **The DK CSV path is the legal one.** `lib/fantasy/dk-import.ts:4-7` and `dk-import-panel.tsx:84` are
  correct that this is a user-provided export, no login, no scraping, and the code contains no hidden
  endpoint.
- **Pick'em unpriced labelling.** `lib/fantasy/props.ts:127-129` writes "Unpriced: no two-way book quote, so
  this is not an edge" on every row that lacks a quote, and the module header (lines 12-13) states the
  discipline explicitly: edge is `p - q`, never `|2p-1|`. `readProp` also correctly negates `edgeOver` for
  under recommendations (lines 113-122, C-203).
- **The entry builder does not hide the independence math.** `props-edge.tsx` renders "Combined probability is
  the product of each leg on our recommended side, the reason big entries rarely pay", and the verdict pill
  carries "(illustrative, not a guarantee)".
- **The Studio's draft-only posture.** `studio-brief.tsx:31-32` renders a permanent "Draft . not published"
  badge and "Nothing is auto-published", and `studio-host.tsx:37` carries a persistent "Synthetic presenter"
  disclosure.
- **`/fantasy/academy` is coursework and says so.** `academy/page.tsx:20-22` sets `projectionsBadge={false}`
  and `projectionsPool="none"` with the correct reason. No data claim on the page.
- **The illustrative pool's own doctrine.** `lib/fantasy/players.ts:9-12` is unambiguous, and the fictional
  names are the right call: no estimate ever attaches to a real person.
- **`lib/fantasy` test coverage.** 21 of 23 non-test modules have a colocated test, including two property
  tests for the DFS optimizer. The math layer is in good shape.
- **The `/fantasy` error boundary.** `app/fantasy/error.tsx` renders full branded chrome (there is no
  `fantasy/layout.tsx`), captures to Sentry, and shows a digest reference in production rather than a raw
  message.
- **The banned four-letter betting word.** `grep -i lock apps/web/lib/positioning-vocab.json` returns nothing,
  and `scripts/guardrails/commercial-copy-scan.mjs:171-179` targets tout usage ("lock of the day", "lock it
  in") rather than the word. The DFS "locks and fades" copy (`app/fantasy/dfs/page.tsx:34`) is roster-
  construction vocabulary and is correctly out of scope. I am proposing no change there.
- **Both copy guards pass.** `node scripts/guardrails/commercial-copy-scan.mjs` reports 443 files clean;
  `npm run lint:brand` reports 19 files, 3785 tests passed. Findings 1, 7, 17 and 19 are coverage gaps in
  those guards, not regressions in them.

---

## Rendering mode, tier gate, and data source, per page

| Route | Data | Says so where a user sees it | Rendering | Tier gate |
|---|---|---|---|---|
| `/fantasy` | Real (nflverse live evidence) | Yes, but claims a gate it does not enforce (finding 6) | force-dynamic, no `maxDuration` (16) | none |
| `/fantasy/connect` | **Real** (Sleeper public API) | Yes | **Prerendered**, badge frozen (3) | none |
| `/fantasy/draft` | Illustrative today, live-capable | Yes, badge + note from one value | force-dynamic, `maxDuration` 60 | **yes**, board depth 12 + 1 rec + upsell |
| `/fantasy/bestball` | Illustrative today, live-capable | Yes, badge + note from one value | force-dynamic, `maxDuration` 60 | **yes**, same |
| `/fantasy/lineup` | Illustrative today, live-capable | Yes | force-dynamic, `maxDuration` 60 | server trim only, invisible to the user |
| `/fantasy/waivers` | Illustrative today, live-capable | Yes | force-dynamic, `maxDuration` 60 | server trim only, invisible |
| `/fantasy/trade` | Illustrative today, live-capable | Yes | force-dynamic, `maxDuration` 60 | server trim only, invisible |
| `/fantasy/dfs` | Illustrative slate, or the user's real DK CSV | Yes when sample, **no** when imported (5) | force-dynamic, no `maxDuration` | none |
| `/fantasy/props` | Illustrative, 6 unpriced fixtures | Yes, per row | force-dynamic | none |
| `/fantasy/studio` | Illustrative content, conditional badge | **Contradicts itself when live** (4) | force-dynamic, no `maxDuration` (16) | none |
| `/fantasy/scheme` | Illustrative in the browser, live for one paint (20) | Yes | Prerendered, badge hardcoded so safe | none |
| `/fantasy/league-twin` | Illustrative, structurally cannot be live | Yes | Prerendered, client-only galaxy | none |
| `/fantasy/gm-ledger` | 7 hardcoded decisions, real crypto | Yes, but see 18 | Prerendered, deterministic so safe | none |
| `/fantasy/autopilot` | Illustrative, writes nothing (10) | Partly, contradicted at lines 120/135 | **Prerendered**, badge frozen (3) | none |
| `/fantasy/academy` | Coursework, no player rows | Yes | Prerendered, badge off so safe | none |
| `/fantasy/baseline` | Hand-authored status constants | Yes, one row stale (15) | Prerendered, static constants so safe | none |
| `/fantasy/contests` | 6 synthetic "Practice" fixtures | Yes on the slate, no on the mechanics (8) | force-dynamic; `notFound()` unless `CONTESTS_PUBLIC` | none |

## Ranking: closest to a world-class shippable product, down to demo

1. **`/fantasy/connect`.** The only page whose content is real user data end to end. Real API, real roster,
   real availability overlay, rate limited, honest about what it cannot connect. Missing: persistence (9), the
   badge tells a real-data page that projections are illustrative, prerendered claim (3), no rendering test
   (12), unbounded route cache (16). This is the page to build the suite outward from.
2. **`/fantasy/dfs`.** The DK CSV import makes it genuinely usable on tonight's real slate, which no other
   page can say. Optimizer is deterministic, has two library test files plus a disclosure test. Missing:
   persistent modeled-data label after import (5), no lineup export (so a user retypes 20 lineups into DK by
   hand), no simulation or correlation model, no persistence, no tier gate.
3. **`/fantasy/draft`** and 4. **`/fantasy/bestball`.** The best-engineered pages in the suite: conditional
   badge and note from a single value, real FFC ADP join on the live path, user ADP CSV override, honest empty
   state, a real tier gate. Missing: the pool is fictional today while pricing says otherwise (2), no draft
   persistence across a reload which is disqualifying for a live draft (9), no league settings (scoring
   format, roster size and superflex are not configurable), no keeper or dynasty support.
5. **`/fantasy/lineup`**, 6. **`/fantasy/waivers`**, 7. **`/fantasy/trade`.** Sound engines, well-tested libs,
   honest badges. Missing: the roster is a sample rather than your roster, because none of them consumes the
   Sleeper connection that already exists two routes away; that single wire-up would move all three up several
   places. No visible tier treatment, no persistence.
8. **`/fantasy/baseline`.** Complete and honest as a document, and genuinely useful as a build-order map. It
   is not a product surface, and one row states a removed gate as current truth (15).
9. **`/fantasy/props`.** The math is careful and the unpriced labelling is exemplary. But six fixtures, edge
   identically zero, a conviction bar wired to the wrong field (13), a provider seam that will not register
   under Next (14), and nothing grades results despite the nav promising "graded" (19).
10. **`/fantasy/studio`.** Real generation over the whole OS, correct draft-only posture. Held back by a
    badge that can contradict its own note (4), an always-on red "Live" pill, and no `maxDuration` on a page
    that awaits the heavy pool load.
11. **`/fantasy/gm-ledger`.** The cryptography is real and the process-over-outcome idea is the most
    distinctive thing in the suite. It is not a product: there is no path by which a user's decision enters
    the ledger, so it is a proof of a mechanism, well presented.
12. **`/fantasy/academy`.** Complete as coursework, honest, no data claims. Not a product because the GM IQ it
    builds is discarded on reload (9).
13. **`/fantasy/scheme`.** Five hand-written scenarios, a known unfixed server-to-client player swap (20), and
    a source-confidence percentage that is an authored per-tier constant (`lib/fantasy/scheme.ts:104`).
14. **`/fantasy/league-twin`.** Technically impressive and genuinely novel to look at. Structurally incapable
    of ever showing a real roster while it loads with `ssr: false` and reads a browser-side registry.
15. **`/fantasy/autopilot`.** A mock with a claim problem: it tells you your approval was recorded and records
    nothing (10). Every level of the delegation dial does the same thing.
16. **`/fantasy/contests`.** Dark by default, and if opened, a board that never locks and never settles (8).
17. **`/fantasy` (the hub).** Ranked last deliberately, not because it is the least built but because it is
    the entry point and it is the page most at odds with the rest: it promises a gate the suite does not
    enforce, labels five working tools "gated", publishes an effect size against the wrong denominator, and
    can time out on a cold instance.

---

## What I could not check and why

- **The actual value of `PROJECTIONS_PROVIDER`, `DFS_PROVIDER`, `PICKEM_LINES_PROVIDER`, `CONTESTS_PUBLIC`
  in production.** `.env*` is Read-denied for agent sessions (AGENTS.md law 2) and I did not search for
  credentials (law 3). Every claim about the gated state is stated as "when the gate is off / on", and cites
  the repo's own assertions that the projections source is founder-gated today
  (`app/fantasy/page.tsx:129`, `app/fantasy/connect/page.tsx:19`). Which state production is in: NOT VERIFIED.
- **Which fantasy routes Next actually prerenders.** I did not run `npm run build`, so the static-versus-
  dynamic conclusions in finding 3 and the table are derived from the absence of a `dynamic` export, the
  absence of `async` on the component, and the absence of any dynamic API in the page. That is the same
  inference `__tests__/fantasy-badge-provenance.test.ts:161-182` makes. A build manifest would confirm it.
  NOT VERIFIED by build output.
- **Runtime behavior of any page.** I did not start a dev server, render a page, or exercise the Sleeper
  connect flow, the DK import, or the optimizer. All findings are from source. In particular the hydration
  mismatch in finding 20 is inferred from the code paths and the page's own comment, not observed in a
  browser.
- **Whether the fantasy tests currently pass.** I ran `npm run lint:brand` (green) and the commercial copy
  scan (green). I did not run `npm run test`, `npm run typecheck`, `npm run build`, or `npm run guardrails`.
- **`/optimizer`.** `components/fantasy/optimizer-workspace.tsx` lives in the fantasy component tree and the
  hub links to it as a fantasy tool, but the route is `app/optimizer`, outside the stated scope of this
  dimension. I read only its `canUseFantasyFull` wiring (line 76) to confirm the tier gate reaches it.
- **The Stripe purchase path for the FANTASY plan.** Out of dimension. I verified only the pricing copy
  (`app/pricing/page.tsx:110-146`) and the ladder values (`lib/pricing/pricing-phases.ts:78`), not whether a
  Fantasy checkout session can currently be created.
- **`lib/fantasy/league-twin.test.ts` contents**, referenced in finding 21 as a thing to check before removing
  the dead `illustrative` field. I listed the file but did not read it.
- **Accessibility and contrast** across the suite. Not this dimension; the League Twin's `aria-hidden` canvas
  plus accessible manifest pattern (`league-twin/page.tsx:20`) looked deliberate but I did not audit it.
- **The score-integrity problem (C-247).** Out of dimension and founder-owned. Nothing in the fantasy suite
  reads the `games` table, so it is not implicated here.
