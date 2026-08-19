# Galaxy Fantasy — the Fantasy-Football OS (North Star)

> Captured 2026-06-04. The fantasy side of Galaxy Sports Edge, built to the same
> doctrine and the same "decision-intelligence OS" thesis as `decision-os-vision.md`.
> Extends, never contradicts, the binding guardrails there.

## Thesis

Every fantasy product is a projections list with a waiver button. Galaxy Fantasy is
a **decision-intelligence OS for your roster**: it doesn't just tell you who to
start — it shows the reasoning, models the league as a living system, grades your
decisions on process not luck, and trains you to be a better manager. The same
glass-box trust thesis, applied to fantasy.

## The two first-of-kind systems (the moat)

1. **The League Twin** — a spatial digital twin of your roster and league. Players
   are star systems; projection is brightness, volatility is the halo, usage/role
   is size; correlation/stacks are orbital ties; a bye week is an eclipse; an
   injury or scheme change is an impact-event shockwave that re-prices the
   neighbourhood; waiver targets drift in as incoming objects. You navigate your
   team as a physics galaxy. **Nobody renders a fantasy roster this way.**

2. **The GM Ledger + Process Grade** — every roster decision (draft pick, waiver
   claim, FAAB bid, trade, start/sit) is committed to a tamper-evident Merkle
   record *before* the games, then graded on **process, not outcome** (was it the
   right call with the information available?). Over a season this builds a
   calibrated, un-cherry-pickable **GM Rating**, and the GM Academy trains it on
   historical decision points. **Nobody grades fantasy managers on pre-committed
   process vs. luck.** It makes "I would've started him" impossible to fake.

## The tools (the table stakes, done glass-box)

- **Draft Assistant** — tiers, ADP vs. VOR, best-available, positional runs, bye
  conflicts, roster-construction guidance, live pick recommendations.
- **Waiver & FAAB Advisor** — ranked adds, FAAB bid % by league budget, drop
  candidates, the *why* on every move.
- **Lineup Optimizer / Start-Sit** — optimal lineup, start/sit with matchup,
  volatility (floor/ceiling), and the leverage of each call.
- **Trade Analyzer** — value both sides, fairness, roster-fit, rest-of-season
  schedule, win-now vs. dynasty.
- **Bye-Week Planner** — map byes across the roster, flag the weeks you're thin.
- **Scheme & Coaching Intelligence** — coaching changes, scheme shifts, and how a
  single change cascades through fantasy values (impact propagation).
- **DFS Lineup MRI** — the Parlay-MRI paradigm for DFS: correlation/stacking,
  ownership/leverage, ceiling/floor "genes", and a structural verdict.
- **Best Ball** tooling — draft-only roster construction, stack/leverage, spike
  weeks.
- **Contests** — best ball, survivor, pick'em, DFS, squares surfaces.

## Galaxy Studios (production · marketing · retention · monetization)

A content-generation pipeline that turns the OS into media: weekly Galaxy Brief,
waiver-wire writeups, start/sit transmissions, draft recaps — generated as text
drafts the team finalises. (Video/podcast = pipeline scaffolding + scripts; never
auto-published.)

## DOCTRINE GATES (binding)

- **Illustrative data only.** No real NFL projections/ADP source is wired; the
  player pool is clearly-labelled illustrative until a real source is connected
  behind a gate. Never present illustrative as live truth.
- **Real money is founder-gated.** DFS entries, contest payouts, and especially
  **squares (chance-based)** ship as designed experiences with illustrative data
  and explicit "founder activation + legal/compliance review required" gating —
  NO autonomous payments, NO live real-money/chance go-live. Skill contests (best
  ball, pick'em, survivor, DFS optimizers) are the safe core.
- **Studios never auto-publishes** externally; it drafts, humans ship.
- **League sync (Sleeper/ESPN/Yahoo)** needs OAuth/keys → scaffolded, founder-wired.
- Reduced-motion, accessibility, and lint/types/tests-green, same as decision-OS.

## Build status (verified 2026-08-15)
Status reflects what is actually committed and testable, not the original wish list.
Source: file existence + test counts + clearance gating in the repo at `ec8acddc`
(`feat(web): complete finished products; keep foundation dark`) and
`f9c5ff5d` (`fix(web): zero unfinished public product surfaces`).

Legend: **BUILT** = shipped, tested, surfaced, founder/legally gated as designed.
**PARTIAL** = engine present + tested, but gated behind a founder-gated real-data
feed (projections) or OAuth; not live as paying advice. **NOT BUILT** = only
described in the vision, no committed code.

| System / Tool | Status | What's committed | Gate |
|---|---|---|---|
| **League Twin** | BUILT (gated layer) | `lib/fantasy/league-twin.ts` + 8 tests + `league-twin-galaxy.tsx` + `/fantasy/league-twin` | Advice tier waits on live projections; spatial view renders a real Sleeper roster |
| **GM Ledger + Process Grade** | BUILT | `lib/fantasy/gm-ledger.ts` + 6 tests (real SHA-256 Merkle root, inclusion proof, tamper detect) + `gm-ledger-view.tsx` + `/fantasy/gm-ledger` | Live decision history needs user roster events |
| **GM Academy** | BUILT (gated) | `lib/fantasy/academy.ts` + 11 tests + `gm-academy.tsx` + `/fantasy/academy` | Teaches off committed Ledger decisions |
| **GM Autopilot** | BUILT (gated surface) | `lib/fantasy/autonomy.ts` + 6 tests + `gm-autopilot.tsx` + `/fantasy/autopilot` | L2–L4 `founderGated` in code; proposes/records, never autonomous account writes |
| **Draft Assistant** | BUILT | `lib/fantasy/draft.ts` + 21 tests + `draft-assistant.tsx` + `/fantasy/draft` | Tiers/VOR/scarce ADP run on cleared or illustrative pool depending on provider flag |
| **Waiver & FAAB Advisor** | BUILT (gated) | `lib/fantasy/waivers.ts` + 5 tests + `waiver-board.tsx` + `/fantasy/waivers` | Needs roster sync + projections + market context |
| **Lineup Optimizer / Start-Sit** | BUILT | `lib/fantasy/lineup.ts` + 6 tests + `lineup-optimizer.tsx` + `/fantasy/lineup` | Gated on live projections until backtest clears |
| **Trade Analyzer** | BUILT | `lib/fantasy/trade.ts` + 6 tests + `trade-analyzer.tsx` + `/fantasy/trade` | Needs live player values + roster context |
| **DFS Lineup MRI** | BUILT | `lib/fantasy/dfs-optimizer.ts` + 22 tests + `dfs-optimizer.tsx` + `/fantasy/dfs` | Salaries/projections stay gated; solver verified |
| **Best Ball** | BUILT | `lib/fantasy/bestball.ts` + 16 tests + `bestball-board.tsx` + `/fantasy/bestball` | Illustrative pool now; real the moment projections flip |
| **Scheme & Coaching Intelligence** | BUILT | `lib/fantasy/scheme.ts` + 7 tests + `scheme-intel.tsx` + `/fantasy/scheme` | Cascades fantasy value from coaching changes |
| **Pick'em Edge / Props** | BUILT | `lib/fantasy/props.ts` + 10 tests + `props-edge.tsx` + `/fantasy/props` | Alt-line EV + entry math; needs live pick'em lines |
| **Bye-Week Planner** | BUILT (folded in) | No standalone file; bye logic lives in `draft.ts` and `bestball.ts` (enrichment) + surfaced on the Draft/Best Ball pages | — |
| **Contest Bay (pick'em paper)** | BUILT | `lib/contests/` + 9 tests (`contests-paper-board.test.ts`) + `/fantasy/contests` | Free skill-only paper board; no entry fee, no prize pool, no real money |
| **DFS contest** | NOT BUILT | Referenced in the vision ("DFS … surfaces"); only the optimizer exists, not a contest entry/product | Held at the design layer |
| **Squares** | NOT BUILT | No committed squares product; the word appears only as statistical terminology (chi-square) and UI copy ("wrong read, right result. The most dangerous square") | Deferred + founder/legal-gated |
| **Survivor** | NOT BUILT | No committed survivor product; "survivor" appears only as a DB pre-filter comment | Deferred |
| **Best Ball tooling** | BUILT | See row above | — |
| **Read-only league sync (Sleeper)** | BUILT (live) | `lib/integrations/sleeper.ts` + `sleeper-sync.ts` + `sleeper-connect.tsx` (read-only, GET-only) + `/fantasy/connect` | ESPN/Yahoo OAuth still founder-gated; Sleeper is public read-only |
| **Studio Brief / weekly media** | BUILT | `lib/fantasy/studio.ts` + 4 tests + `studio.ts` + `studio-brief.tsx` + `/fantasy/studio` | Drafts only; humans ship — never auto-publishes |
| **The Beat (news triage)** | BUILT | `lib/fantasy/host.ts` + 9 tests + `the-beat/page.tsx` | News triage into the OS |
| **DK CSV import** | BUILT | `lib/fantasy/dk-import.ts` + 6 tests + `dk-import-panel.tsx` | DFS salary ingestion |
| **Free trial (depth-limited, server-side)** | BUILT | `lib/fantasy/free-trial.ts` + 8 tests | Enforced server-side; paid rows never serialized to client |

**Net:** the two first-of-a-kind systems (League Twin, GM Ledger + Process Grade) are
BUILT and tested; the full tool table is BUILT and tested; the real-money/chance
surfaces (DFS contest, Squares, Survivor) are NOT BUILT — exactly as the doctrine
gates require (real-money and squares ship only as designed experiences behind
founder + legal/compliance review, never autonomously).

## Architecture

Routes under `/fantasy/*`; shared illustrative data + pure logic in `lib/fantasy/`;
a "Fantasy ▾" nav dropdown. Reuses the brand system, the Twin's raw-three.js
pattern, the Parlay-MRI/Genome pattern, and the proof-of-record Merkle engine.

## Build order

1. Data model (`lib/fantasy/players.ts`) + hub (`/fantasy`) + nav.
2. Draft Assistant · Waiver/FAAB · Lineup Optimizer · Trade Analyzer · Bye Planner.
3. DFS Lineup MRI · Best Ball · Scheme Intelligence · Contests · Studios.
4. **First-of-kind: League Twin · GM Ledger + Process Academy.**
5. Tests (the pure logic) + production build.
