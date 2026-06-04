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
