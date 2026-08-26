# PATH FORWARD — 2026-08-26 · The 14-Day Window and the Proof Ladder

> **What this is:** the master plan from today to AUTHORITY pricing, written from a
> verified read of the repo on this date. It honors the full ambition — the
> category-defining honest sports intelligence company — and treats the next 14 days
> as what they are: the year's best revenue window, already half-spent.
>
> **Trust model** (per `2026-08-21-MASTER-HANDOFF.md`): claims below are tagged
> **[VERIFIED]** (checked against the repo/ledger this session) or **[PLAN]**
> (forward-looking intent). Build freely on VERIFIED; re-check anything else before
> it becomes load-bearing.

---

## 1. Where the business actually stands (no shrinkage, no inflation)

**The asset is real and rare.** [VERIFIED against the tree and `AGENT_LEDGER.md`]

- **Production is live and smoke-green** at `www.galaxysportsedge.com` (DOD-1: deploy
  `7294739c`, 13 public pages 200, security headers, health, launch surfaces
  `/fable` · `/kill-ledger` · `/bookgrade` · `/pledge` · `/calibration` all 200).
- **The test wall:** ~11.5k apps/web tests + ~2.4k prediction-engine tests, typecheck 0,
  trust-gate / draft-only / model-freeze guards green in CI.
- **The research stack most paid tout shops don't have:** edge-lab with leak-safe
  as-of store, purged walk-forward + sealed holdout, placebo/MI probes, 7-method devig
  oracle, selective conformal gate, tail-calibration blend, trials registry. H0
  covariate binds landing weekly (latest: #594).
- **The fantasy product is ~built and monetized end-to-end:** Draft Assistant, Best
  Ball engine, $49/yr Founding Fantasy tier wired through types → Prisma → entitlements
  → Stripe checkout → server-side depth-limited free trial. Weekly-projection model v1
  exists, gated behind its backtest (`canPublishProjections:false`).
- **The proof machinery is running:** line archive live and writing (37,402 snapshots
  and growing mid-query — C-62), MVE e-process pre-registered and frozen before any
  computation (C-51/C-59), calibration pipeline + export tooling in place.
- **Process capital:** the agent ledger, coordination law, skills packs, and the
  seat system (build seat + verifier separation) — this is a company that can absorb
  agent-hours without corrupting itself.

**The honest gaps.** [VERIFIED]

- **Revenue is $0 until Stripe goes live.** The Fantasy CTA returns a graceful 503
  without the live price IDs. Every other blocker is downstream of this one.
- **The proof ladder is at FOUNDING.** Settled record ~50.9%; CLV unproven publicly;
  PROVEN needs ≥100 settled + published calibration; ESTABLISHED needs ≥500 + CLV ≥52.4%.
- **Owner-gated infra is pending:** `prisma migrate deploy` (proof receipts +
  slate-commitment tables), THE_ODDS_API_KEY decision, orphan `sports-db` Neon project.
- **MVE is blocked on a working `DATABASE_URL`** (C-59) — the one-shot edge experiment
  is frozen and waiting on founder hands, not on more research.
- **CLOSE-stamp liveness is an open observation** (C-62): if CLOSE counts stay 0 after
  the next MLB settle cycle, the close-stamp path is broken and the CLV ledger's
  denominator is at risk.
- **Local-machine risk:** the working clone (`projects/Sports`) sits on
  `hermes/w2-audit-settlement`, and **no such branch exists on origin** — that audit
  work is unpushed and dies with the laptop. Push it first, before anything else.

---

## 2. The goal, stated at full size

GSE is not a picks site with a paywall. It is the **anti-tout**: the one platform that
publishes its own calibration, its own CLV, its own kill-ledger of what didn't work —
and stakes the brand on the claim no competitor can fake:

> **"We prove, in the open, that we beat the closing line — and we find edge in the
> markets the giants ignore."**

Three engines, one flywheel:

1. **Fantasy tools** — the season-timed revenue engine. Tens of millions pay for good
   tools and never ask "does it beat Vegas?" The suite exists; the window is now.
2. **The proof ladder** — the moat. FOUNDING → PROVEN → ESTABLISHED → AUTHORITY, each
   rung a verified milestone, each step-up shipping added value, founding members
   grandfathered for life. Nobody can shortcut this and nobody can fake it.
3. **The honest brand + Academy** — the compounding audience. Being the one truthful
   voice in a sea of touts is the distribution strategy.

The destination is **AUTHORITY**: multi-season verified ROI, priced accordingly, with
a public proof room that functions as the industry's reference dataset. Everything
below is sequenced toward that — nothing in this plan trades the ambition down.

---

## 3. The clock

**NFL kickoff: September 9. Today: August 26. Fourteen days.** Best-ball and
home-league drafting peaks late August through Labor Day — the highest-intent
fantasy traffic of the entire year is on the doorstep *right now*, and the soft-launch
plan (`docs/strategy/fantasy-launch/LAUNCH_PLAN.md`) counted on converting into this
exact window. Every day the Stripe CTA 503s costs irreplaceable founding members.

---

## 4. Horizon 0 — Open the doors (Aug 26 → Sept 9)

**Objective: first dollar of founding revenue, drafts served on real data, proof
accumulation switched on.** The critical path is founder clicks; agents parallelize
around them.

### 4a. Founder critical path (in order; mostly console, ~half a day total)

| # | Action | Unblocks | Reference |
|---|--------|----------|-----------|
| 0 | `git push -u origin hermes/w2-audit-settlement` from the local clone | Preserves the settlement audit | (local machine) |
| 1 | **Stripe LIVE**: live keys, `npm run stripe:seed`, paste all **6** price IDs (Pro/Elite/Fantasy × monthly/annual), live webhook + matching `STRIPE_WEBHOOK_SECRET` | **All revenue** | `STRIPE_GO_LIVE_CHECKLIST.md` |
| 2 | **THE_ODDS_API_KEY decision**: paid tier, **or** blank it to activate the coded free-settle path (present-but-dead does *not* free-path) | Settlement → settled-pick volume → the ladder | `OPERATOR.md` §1 |
| 3 | `prisma migrate deploy` on next DB-reachable deploy | Proof receipts + slate-commitment tables | `START_HERE.md` |
| 4 | Flip `PROJECTIONS_PROVIDER` to the real nflverse graded pool | Draft tools live on real data with freshness badge | `LAUNCH_PLAN.md` prereq 2 |
| 5 | Supply working `DATABASE_URL` to the MVE branch and re-run one cycle, no retuning | The pre-registered edge experiment (C-59) | `hermes/hf5-mve` |
| 6 | Delete orphan `sports-db` Neon project; confirm `check-deploy-readiness.mjs` green in prod | Cost + config hygiene | `START_HERE.md` |

### 4b. Agent lanes (parallel, draft-only where public-facing)

- **Money-path QA:** `npm run e2e:pricing-smoke` + full checkout walk on live keys the
  moment #1 lands; entitlement reconciliation smoke (`ORBIT_UNLOCK.md` §3).
- **C-62 close-stamp recheck** after the next MLB settle cycle — if CLOSE stays 0,
  root-cause `markClosingSnapshotsIfEnabled` before the season starts. This protects
  the CLV denominator the whole ladder rests on.
- **Launch-surface polish:** states/contrast/responsive passes on `/launch`,
  `/fantasy/*`, pricing, checkout — the pages founding money touches.
- **Organic execution:** draft the `ORGANIC_PLAYBOOK.md` content calendar (draft-only;
  founder publishes) anchored to draft weekend and kickoff.
- **Unblock H0.5:** land K11 (Dirichlet-multinomial kernel slot) on `main` so the
  rz-share bind can proceed; continue H0 covariate binds (priced:false discipline).
- **Weekly-model backtest prep:** stage the backtest + calibration proposal so the
  Phase-B flip decision (`canPublishProjections`) is a one-look founder gate at kickoff.

**Exit criteria for Horizon 0:** first founding subscriptions banked · drafts served on
real data · settlement running (paid or free path) · migrations applied · MVE run once.

---

## 5. Horizon 1 — Loud kickoff → PROVEN (Sept 9 → ~Nov)

**Objective: the ribbon-cutting, the in-season suite, and the first rung.**

1. **Kickoff (Sept 9):** if the weekly-model backtest clears, flip
   `canPublishProjections` → in-season suite goes live (start/sit, waivers, trade) →
   headline: *"the only fantasy projection that publishes its own calibration."* Full
   organic push per the playbook. If the backtest does **not** clear, say so publicly
   — that honesty *is* the brand — and ship the suite on the cleared pool only.
2. **Gate-flip ladder, in order, proof-gated** (`START_HERE.md` C1→C8):
   canonical history → derived history (≥50 games/sport) → **public picks** with
   `FORCE_NO_BET_IF_STALE=true` → performance stats at **≥100 settled** → featured
   promotion → calibration adjustments (only after held-out `calibratedEce ≤ rawEce`
   re-confirms at the real sample) → public blog → precision confidence display.
3. **PROVEN rung:** ≥100 settled + published calibration. NFL + the in-season sports
   supply the volume within weeks of kickoff. This is the ladder's first named
   step-up trigger — announce it, ship the added value with it, grandfather founders.
4. **CLV ledger accumulation:** every pick graded against the archived close
   (T-Q2 wiring is live); Elite's CLV surface (PL8) turns this into paid value while
   it builds the ESTABLISHED evidence base.
5. **Elite activation:** real-time email/push alerts live = the Elite tier earns its
   price gap honestly.

**Exit criteria:** PROVEN announced with receipts · public picks live with stale
auto-suppression · in-season fantasy suite converting · CLV sample compounding weekly.

---

## 6. Horizon 2 — ESTABLISHED → AUTHORITY (Q4 2026 → 2027)

**Objective: the moat becomes the business.**

- **ESTABLISHED:** ≥500 settled + verified CLV ≥52.4%. The edge-lab program (H-phases,
  selective conformal gating, MVE certification at E ≥ 20) is what makes this a
  research outcome rather than a hope. Edge is hunted where it lives — props before
  they sharpen, less-covered markets — never claimed on the dead-efficient mainstream
  spread.
- **Pricing step-ups fire on rungs, never on vibes** — the named ladder is public
  ahead of time; founding members keep their rate for life. That combination
  (pre-announced ladder + grandfathering) converts *waiting* into *urgency* honestly.
- **Affiliate rail activation** (owner program signups per `AFFILIATE_GO_LIVE.md`):
  additive, responsible-gaming-first, never the pitch.
- **The Academy + audience flywheel:** honest betting education, the proof room as
  the industry's reference, The Beat as the experience layer. Audience is what every
  revenue stream converts from.
- **Optionality earned by the proof spine:** B2B API (`B2B_API.md`), the
  fantasy-year-round expansion, community calibration tournaments (D5 scaffold
  already built, draft-only-safe).
- **AUTHORITY:** multi-season verified ROI. The claim, the dataset, and the pricing
  power nobody else in the category can copy without first telling the truth for
  two years.

---

## 7. Operating system (how the fleet executes this without breaking it)

- **The ledger is the memory.** `docs/ops/AGENT_LEDGER.md`, append-only, evidence per
  row, seat separation (builder never verifies own work). `RESUME.md` governs
  interrupted runs.
- **The law stands:** no fake data · server-side paywalls only · secrets via env ·
  strict TS · clearance engine before every extraction · trust-gate on every public
  numeric claim · draft-only for anything public-facing · founder-gated flips stay
  founder-gated (`OPERATOR.md` §4).
- **Verification culture:** the MASTER-HANDOFF trust tags, real exit codes (no
  pipe-masking — the C-54/C-55 lesson), fix the class not the instance, check the
  live page not the report.
- **Local hygiene (from the 2026-08-26 kickoff session):** the live clone is
  `projects/Sports`; multiple dead clones exist, three with no `.git` — any agent
  that guesses a path edits a dead tree and reports success. Name the clone
  explicitly in every local prompt, and push working branches daily.

---

## 8. The scoreboard (reviewed weekly, honestly)

| Metric | Now | Horizon 0 exit | Horizon 1 exit |
|---|---|---|---|
| Founding subscriptions | 0 (CTA 503) | first cohort banked | converting weekly |
| Settled canonical picks | pre-ladder | settlement running | **≥100 → PROVEN** |
| CLV ledger sample | archive live, CLOSE=0 (pending C-62) | close-stamps proven | compounding toward 500 |
| Published calibration | gated | backtest staged | live with freshness stamp |
| Draft-tool activation | soft-launched | real-data drafts served | in-season suite live |
| MVE e-process | pre-registered, blocked | one clean cycle run | checkpoints per pre-reg |

---

*This document follows the house convention: it states what is, what's next, and who
holds each key. Nothing here overrides `CANONICAL.md`, the founder gates, or the
locked decisions — it sequences them.*
