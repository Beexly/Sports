# Close-out tracks A–D (2026-08-10)

Integrity: no PERFORMANCE_STATS flip, no invented PROVEN/ROI.

## Track A — edge / PROVEN (engineering) — **DONE for shipable spine; Brier still RED**

| Item | Status | Evidence |
|---|---|---|
| Persist independent trueProb on **new** picks | **Live** | process-sport + generate-signal-slate write `independentEdge.trueProb` / rankingSource |
| Backfill settled sample | **Live** | `GET /api/cron/backfill-independent-trueprob` + calibration-metrics batch (250/tick) |
| Independent coverage ≫ 0% | **~65% ML/SPREAD** | n≈291; bake-off cov vs eligible denom; RPCP residual aligned |
| Separation > 0 (independent) | **+0.038** | confidence still negative (noise) |
| bestScore = independent | **Plan yes** | proven-path plan; RPCP aligned |
| Pause list advisory | **Fixed 2026-08-10** | pause = Res≈0 ∪ significance-dead; apply OFF |
| Re-run calibration-metrics | **Live** | ECE **0.039 ≤ 0.05**; Brier **0.247 > 0.22** only RED reason; green streak 0 |
| Odds-insert dual-path visibility | **Live** | public-surface-truth.oddsInserting.dualPath + 429 notes |
| Rundown inserts advance clock | **Blocked external** | HTTP **429** free tier; daySpan=2 + abort + cascade skip shipped |

### How backfill works

1. Settled WIN/LOSS published non-seed missing `independentEdge.trueProb`
2. Rebuild independents (Kalshi/FPI/ClubElo/Poisson/Elo) — never invent
3. Map trueProb to **published team side** (ML + SPREAD team-win; not ATS)
4. Merge JSON only — never rewrite selection/result/confidence

### Calibration interpretation (live)

| Metric | Live | Floor | Read |
|---|---|---|---|
| n (eligibility) | ~339 | 100 | OK |
| Brier | 0.247 | ≤0.22 | **only RED** |
| ECE | 0.039 | ≤0.05 | **pass** |
| Murphy REL | ~0.002 | ≤0.05 | **pass** |
| Murphy RES | conf 0.002 / indep 0.008 | raise | ranking still thin |
| separation | conf −0.005 / indep +0.038 | >0 | independent ranks |
| consecutiveGreen | 0 | K=3 | no publish |
| bottleneck | dead_groups | — | pause Res≈0 ∪ sig-dead (apply OFF) |

**PROVEN still OFF.** Sample + ECE alone ≠ PROVEN. Projected RES under pause+selective still short of Brier floor math.

### Odds-insert visibility

- Kill-switch clock: last SUCCESS with `oddsInserted > 0` (July 25 still honest)
- Dual path keys: Odds ABSENT / Rundown `THERUNDOWN_API`
- Zero-odds SUCCESS does **not** advance market clock
- 429 notes surface; signal board independent of market clock

Optional denser books: set Production `THE_ODDS_API_KEY` (aliases OK).

---

## Track B — revenue — **rails live; conversion is founder**

| Item | Status | Evidence |
|---|---|---|
| Money path env | **Ready** | 6/6 price slots + Stripe secret + webhook secret |
| Stripe webhook host | **Healthy** | only galaxysportsedge.com; no foreign hosts |
| Checkout API | **Auth required** | POST 401 without session — correct |
| Pricing → Sign in → plans | **Live** | /pricing 200; CTAs Sign in / See plans |
| Waitlist capture | **Live** | POST /api/waitlist → 200 queued (full payload) |
| Founding Payment Link | **Script ready** | `scripts/ops/create-founding-payment-link.mjs` (founder STRIPE_SECRET_KEY) |
| End-to-end card charge | **Founder** | Must sign in + complete Stripe Checkout once |

### Founder conversion checklist (cannot be automated without secrets)

1. Sign in at https://www.galaxysportsedge.com/auth/signin  
2. Open /pricing → choose tier → complete Checkout (test or live)  
3. Confirm Stripe Dashboard webhook events: `checkout.session.completed`, `customer.subscription.*`, optionally `checkout.session.expired`  
4. Sticky seat: `STRIPE_SECRET_KEY=… node scripts/ops/create-founding-payment-link.mjs --tier FANTASY --interval month` → post URL on X / waitlist email  

---

## Track C — ops hardening

| Item | Status | Notes |
|---|---|---|
| GH Actions External Cron | **Dead (no runners)** | Private repo minutes / billing — not recoverable from code |
| Scheduler SoT | **Vercel-only accepted** | vercel.json crons + platform header dual auth |
| Cron auth dual (board fill) | **Live** | Bearer **or** x-vercel-cron on VERCEL=1 |
| Cron auth autonomy execute | **Hardened** | Bearer-only when execute enabled (anti-spoof) |
| CRON_REQUIRE_BEARER | **Optional** | set `true` when Vercel Bearer injection verified |
| Autonomy cannot flip gates | **Confirmed** | allow-list free crons only; PERFORMANCE_STATS requiresOwner; executor skips ownerQueue |

### Documented decision: Vercel-only scheduling

External Cron workflow remains for when Actions minutes return. Until then production truth is Vercel cron matrix in `vercel.json`. Do not rebuild schedulers.

---

## Track D — polish (non-blocking)

| Item | Status |
|---|---|
| Pick cards home/away | **OK** — API returns `game.homeTeam` / `awayTeam` |
| Free daily cap (2 of 37) | Intentional upgrade pressure |
| Content archives | Thin (2 podcast / 3 newsletter) — free-lane drafts optional |
| Brand / Higgsfield | Assets candidates exist; nav wiring optional |
| Product boards STATKING/… | Secondary to ranking Brier |

---

## Bottom line

| Claim | Truth |
|---|---|
| Signal board live | **Yes** |
| Money rails live | **Yes** |
| Integrity gates holding | **Yes** (PERF_STATS off, PROVEN unpublished) |
| Defensible ranking / PROVEN | **Not yet** (Brier RED; RES thin) |
| Full market board | **Not yet** (Rundown 429 / Odds key ABSENT) |
| Closed revenue loop | **Founder checkout once** |
| Dead-group pause ready | **Advisory keys now listed; apply still OFF** |

Highest remaining engineering leverage: Brier ↓ via independent settles + selective + dead-group pause when founder enables apply + sport models — **not** new product surfaces. See [LEVERAGE_LOOP_2026-08-10.md](./LEVERAGE_LOOP_2026-08-10.md).
