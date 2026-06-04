# Managed Leagues & the Glass-Box GM Autopilot

> Integrate real fantasy leagues and offer a *spectrum* of team management — from
> pure advice to a fully remote GM — that is A++, first-of-its-kind, and
> defensible because of HOW it does it, not just that it does it.

## The thesis

People pay anything for value, and the value here is **control + trust at the
same time**. Today you must choose: keep control (advisor apps) or hand it off
(opaque concierge services). Nobody lets you delegate *and* see, prove, reverse,
and learn from every move. That gap is the product.

## Competitor teardown — build from, then surpass

| Product | What it does well | Where it caps out | What we take → how we surpass |
|---|---|---|---|
| **LeagueSync** | Aggregates ESPN/Yahoo/Sleeper into one app; cross-league start/sit, waiver, trade advice | One-shot advisor — it suggests, you execute, it forgets. No record, no teaching, no accountability | Take the multi-league sync. Surpass: every read is committed to the **GM Ledger** (process-graded, tamper-evident) and feeds **GM IQ** |
| **Draft / Draft Hero** | Live draft sync, best-available, tiers, pick recommendations | Brilliant for 90 minutes, silent for 25 weeks; no season-long accountability | Take live-draft sync. Surpass: the **Draft Assistant** is one node of a season-long OS that remembers and grades the draft later |
| **propsfinder.app** | Scans props, surfaces edges vs. projections | A finder — hides its reasoning, can't prove its record | Take props-edge detection. Surpass: **Pick'em Edge** shows the distribution, the alt-line EV, and the entry math; record is ledgered |
| **LineStar DFS** | Salary-cap optimizer + research | Black-box optimizer; right *math*, no *why* | Already surpassed by the **DFS Optimizer**: right objective per contest, leverage, full glass-box reasoning + DK-CSV import |

**Pattern across all four:** they are *one-shot advisors*. None **act**, **explain
before acting**, keep a **provable record**, or **teach** you. That is our wedge.

## The first-of-its-kind: the GM Autopilot delegation dial

A single dial from "just suggest" to "run my whole team," where every autonomous
action is **explained before it happens → committed to the GM Ledger → reversible
→ teaches you**. Built (`/fantasy/autopilot`, `lib/fantasy/autonomy.ts`).

| Level | Name | We do | You do | Approval |
|---|---|---|---|---|
| L0 | Manual | Show the board | Everything | — |
| L1 | Advisor | Rank moves with the why | Decide & submit | advisory |
| L2 | Co-pilot | Draft + queue the moves | One-tap approve each | per-action |
| L3 | Autopilot | Execute after a veto window | Veto anything | veto-window |
| L4 | Full remote GM | Run waivers/lineups/trade exploration to your strategy | Set strategy; read the weekly report | report-only |

### Why it's defensible (the four guarantees no competitor offers together)
1. **Explained before acting** — you see the move and the rationale *before* it happens.
2. **Provable record** — every action is a leaf in your tamper-evident GM Ledger; the AI can't cherry-pick its own track record any more than you can.
3. **Reversible / clearly flagged** — each action is tagged reversible (lineup) or committing (FAAB), so consequences are never hidden.
4. **It teaches** — every move drills a pattern; your **GM IQ** climbs even when the AI drives. The Autopilot is a *coach*, not a *replacement*.

## Doctrine gates (binding)

- This layer **proposes and records**. Executing on a real ESPN/Yahoo/Sleeper
  account is an outward action with consequences → **founder/consent-gated**,
  behind OAuth + compliance, never autonomous. (Honors no-autonomous-action.)
- Levels 2–4 are flagged `founderGated` in code; the demo never touches a real
  league. Real-money leagues get the extra real-money gate.
- League sync starts **read-only** (Sleeper has a public read API; Yahoo OAuth;
  ESPN unofficial) before any write-back is ever enabled.

## Architecture & build state

- **Built:** `lib/fantasy/autonomy.ts` (levels, `proposeActions`, `executionNotice`
  — reuses lineup/waiver/trade engines) + 6 tests; `components/fantasy/gm-autopilot.tsx`
  (dial + glass-box action queue + League Sync surface + consent gating);
  `/fantasy/autopilot`; flagship on the hub + nav.
- **Next (founder-gated):** real OAuth connectors (Sleeper → ESPN → Yahoo),
  read-only roster import → drive the Autopilot off a real roster, then a
  human-approved write-back path with the GM Ledger as the audit log.
- **Reuses:** League Twin (spatial view), GM Ledger (accountability), GM Academy
  (teaching), The Beat (news triage), the prediction engine (the calls).
