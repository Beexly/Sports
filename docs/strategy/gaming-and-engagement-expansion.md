# Gaming & Engagement Expansion — Research & Decision (2026-06-03)

**Status:** research + recommended path. Any real-money / sweepstakes launch is **founder + licensed
gaming-counsel gated.** Nothing here is legal advice; gaming law is state-specific and fast-moving.

## TL;DR decision
- **BUILD NOW (low legal risk, on-brand):** a free, **skill-based "Beat the Model" pick'em** — scored by
  calibration (Brier) against our model — with leaderboards, streaks, badges, and a **virtual currency that
  can NEVER be cashed out** and has no secondary market. Monetize via the existing **paid analytics
  subscription** (selling information/tools, not wagering). Engine shipped: `prediction-engine/contest-scoring.ts`.
- **DON'T BUILD NOW:** sweepstakes casino (legally collapsing in 2026) or a real-money sportsbook (not
  feasible for a solo founder). **No chance-based slots** — most legally exposed *and* off-brand for a
  glass-box analytics product.
- **Real-money monetization that fits GSE:** **affiliate / data-partner** — refer to licensed books in legal
  states, sell picks/data. No gaming license required.

## Why (sourced)
**Sweepstakes (collapsing):** 2024–2026 crackdown — MT (SB 555), CT (SB 1235), NJ, NY (SB 5935), CA (AB-831,
eff. 2026-01-01), IN, ME, OK, IA banning/restricting; NY AG stopped 26 operators, MI sued operators; new
statutes extend liability to payment processors, geolocation, and marketing affiliates, and treat redeemable
dual-currency sweeps as illegal gambling **regardless of free entry**. Chance-based casino sweeps are the most
vulnerable. (Venable; igamingbusiness; Snell & Wilmer; NY AG; SBC.)

**Sportsbook (out of reach solo):** no federal license — license per state with a gaming commission; app/fees
$100K–$10M depending on state, surety bonds up to ~$5M, market-access deals (10–25% rev share), reserves,
ongoing tax 6.75%–51%. ~8–12 months and ~$0.5M–$2M+ for ONE Tier-1 state. CA (no measure before ~2028) and TX
(2027 earliest) remain illegal. Credible startup plays: **affiliate/data-partner** (no license) or
**white-label operator** (Altenar/Kambi/BetConstruct etc., big capital). (AGA State of Play; Legal Sports
Report; BettingUSA; igaminglicense.net; GeoComply; Jumio.)

**Skill vs gambling:** gambling = **consideration + chance + prize**; remove any one and it generally isn't
gambling. Skill-predominant, **multi-event** contests with **fixed, disclosed prizes** are defensible (UIGEA
fantasy safe harbor; predominance test in 30+ states). **Tripwires:** (a) cash or cash-redeemable prizes tied
to chance; (b) **single-event yes/no "pick'em"** that mimics sports betting — NY/AZ restricted prop pick'em,
and the CA AG opined (July 2025) paid DFS is illegal betting. Free-to-play with **no cash-out and no secondary
market** is generally not gambling. (Klein Moynihan; Walters Law Group; Vela Wood; Legal Sports Report.)

## Phased path
1. **Phase 1 — now, low risk:** "Beat the Model" free skill pick'em (Brier-scored vs the model), leaderboards,
   streaks, non-redeemable virtual coins. → `contest-scoring.ts` (pure, tested). Multi-event aggregation, no
   chance engine, no cash-out.
2. **Phase 2:** paid analytics subscription tiers (already the model) — information/tools, not wagering.
3. **Phase 3 — counsel-gated:** affiliate / data-partner with licensed books in legal states (revenue, no license).
4. **Phase 4 — counsel + capital gated, optional, SEPARATE sub-brand:** sweepstakes or licensed real-money,
   only in then-legal states, with geofencing/KYC/AML/responsible-gaming, and **never co-branded** with the
   glass-box trust mark. Avoid chance-based slots.

## Hard lines (apply even to free-to-play)
No cash-out of virtual currency; no secondary market; no single-event yes/no wager formats; no chance engine;
age-gate + responsible-gaming page + self-exclusion; never market to minors; no real-money/sweepstakes launch
without licensed gaming counsel, founder sign-off, and per-state controls. Ties to
the no-autonomous-money / human-gated-prod doctrine.
