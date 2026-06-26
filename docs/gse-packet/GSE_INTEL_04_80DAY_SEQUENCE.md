> Companion deep-dive to **GSE_INTELLIGENCE_CORE_AND_FLYWHEEL.md** · Galaxy Sports Edge · 2026-06-23

# Galaxy Sports Edge — 80-Day Operating Sequence

> ⚠ **Correction — `GSE_INTEL_00_RIGOR_PASS.md` C3 is authoritative.** The launch keystone is a **historical walk-forward backtest on nflverse regular-season data (1999+)** — buildable *now* — **not** preseason calibration. Preseason starters play ~a quarter, so that distribution can't calibrate a regular-season projection; use preseason only as a pipeline dress-rehearsal. Flip `canPublishProjections` on the historical-backtest evidence (the driver is stood up in `scripts/backtest/`), not on a hunch.

**Strategy in one sentence:** Ship the already-built $49 Fantasy tier on real nflverse season-long data THIS WEEK to monetize peak draft season, then spend the 80 days to kickoff building the one thing that can't be bought — a publicly backtested, calibration-frozen weekly projection — so the Sept 9 "ribbon-cutting" launches behind a headline no competitor can fake.

**Owner:** Garrett (solo). **Today:** Tue Jun 23 2026. **Kickoff / loud launch:** Wed Sep 9 2026 (~78 days). **Branch of record:** `claude/sweet-fermi-sk9gws`.

**Reading the tags:** **[OWNER]** = only Garrett can do it (keys, Stripe, EIN, DNS). **[INFRA]** = provisioning/cutover. **[DATA]** = the calibration/clearance pipeline. **[CODE]** = a small, safe change inside the guardrails.

---

## Part 1 — THE ONE THING THIS WEEK

**Do this and nothing else competes with it: turn on the revenue loop that is already wired, on real season-long data, while America is drafting best-ball teams.** The loop is 100% built (Stripe price wiring → webhook tier-map → checkout → FANTASY entitlement → depth-gated free trial → Best Ball engine + `/fantasy/bestball` + nav + pricing card). The only reason $0 has come in is that the live Stripe prices don't exist and the real-data flag is off. Both are owner toggles measured in minutes, not engineering. Draft season is a **perishable** window — it largely ends by early September. Every day dark is draft-season revenue that does not come back.

**Decision: soft-launch the real-data Best Ball / Draft product on the $49/yr Fantasy tier by Friday Jun 26. Quiet launch — no big announcement, no paid ads. The goal is the first 10–25 paying members and a working funnel, not noise.** Price stays **$49/yr** (annual, founder rate — anchors "intelligence tool," not a $5/mo impulse SKU, and front-loads cash into the runway). Weekly projections stay labeled **"Preview"** and ungated-from-claims until cleared (Part 3) — sell what is true today (season-long projections + Best Ball optimization), promise the weekly engine as the headline upgrade.

### Exact ordered steps (Fri Jun 26 target)

1. **[OWNER] Create live Stripe Fantasy prices (~15 min).** In Stripe **live mode** → Product "GSE Fantasy" → recurring price **$49.00 / year**. Copy the `price_…` id. (Create a second monthly `$6/mo` price *only* if you want a fallback SKU later — not required to launch; annual-only keeps the message clean.)
2. **[OWNER] Set production env (~10 min).** In Vercel **Production**: `STRIPE_FANTASY_PRICE_ID=price_…` (match the exact var the webhook tier-map reads — grep `STRIPE_FANTASY` in the repo before pasting), confirm `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` are live-mode, and set **`PROJECTIONS_PROVIDER`** to the nflverse value that flips on the real season-long projection (`graded-pool.ts`). Set analytics tokens (Cloudflare + Clarity) so the funnel is measured from member #1.
3. **[OWNER] Verify the Stripe webhook endpoint** points at the production domain and is subscribed to `checkout.session.completed` + `customer.subscription.*`. Send one Stripe test event; confirm a 2xx.
4. **[OWNER] Rotate the Anthropic key** (content surfaces only — not on the revenue path, but do it now so it isn't a launch-day fire). Confirm `PUBLIC_BLOG_ENABLED` is in the state you intend; the deploy gate WARNs (not FAILs) when blog is off.
5. **[CODE] One smoke pass (≤1 hr, optional but recommended).** Confirm with real `PROJECTIONS_PROVIDER` set: `/fantasy/bestball` renders nflverse season-long numbers (not the illustrative pool), the free trial gates at the configured depth, and the upgrade CTA routes to a live-mode checkout. Run `trust-gate.mjs`, `model-freeze.mjs`, `draft-only.mjs` green. Do **not** touch `canPublishProjections` — weekly stays `false`.
6. **[OWNER] Buy one real money-path check.** Subscribe yourself in live mode with a real card, confirm the webhook promotes your account FREE→FANTASY and the gated depth/weekly-preview behaves. Refund yourself. **This is the single most important pre-launch test** — a broken checkout on launch day is the only catastrophic failure.
7. **[OWNER] Flip `/launch` live + do a quiet announce.** Post the fantasy OG card to X **@GalaxySportsAI** + IG/Threads/FB **galaxysportsedge** with one line: *"Real-data Best Ball optimizer is live — founder pricing $49/yr."* DM it to 20–30 people you know who play best-ball/draft. No ad spend. Capture emails (capture-only — `draft-only.mjs` blocks sends; that's fine, you're building the list, not mailing it yet).

**Revenue metric this week:** first **$245–$1,225** booked (5–25 members × $49). **Funnel metric:** checkout conversion measured and non-zero. That is proof the machine runs end-to-end with real money — everything in Parts 2–3 compounds on top of a funnel that already converts.

---

## Part 2 — THE 80-DAY ARC (soft-launch → Sept 9 ribbon-cutting)

The arc has one spine: **monetize draft season now on what's true (season-long), and use the preseason games as a live laboratory to legitimately earn the weekly-projection headline for the loud launch.** Milestones are dated; each lists Goal / Deliverables / Dependency / Metric.

### M0 — Soft-launch live (Jun 23–26) — *peak draft season*
- **Goal:** Revenue loop on, real data, first paying members.
- **Deliverables:** Part-1 steps 1–7 complete; `/launch` live; analytics measuring.
- **Depends on:** [OWNER] Stripe prices + `PROJECTIONS_PROVIDER` + tokens + key rotation.
- **Metric:** first 5–25 Fantasy subs; checkout conversion measured.

### M1 — Draft-season harvest + funnel tightening (Jun 27 – Jul 11)
- **Goal:** Maximize the perishable draft window; make the free→paid path convert.
- **Deliverables:** (1) Best Ball value-board polish — one screen a drafter checks live mid-draft (rankings + your derived opponent-adjusted EPA slice from `lib/metrics/*` as the visible differentiator). (2) A pinned, honest "what's free / what's $49 / what's coming Sept 9 (the weekly engine)" comparison on the pricing page. (3) 2–3 social proof artifacts (a real Best Ball lineup the optimizer built, annotated).
- **Depends on:** M0 live; `lib/metrics` slice 1 already shipped.
- **Metric:** 25–60 cumulative subs; trial→paid conversion ≥ 5–8%.

### M2 — Pre-commit the weekly model (Jul 12 – Aug 1) — *the keystone starts*
- **Goal:** Lock the weekly model so its preseason predictions are credible (no hindsight).
- **Deliverables:** (1) Freeze `weekly-model.ts` logic + inputs; tag the exact code/data version. (2) Stand up the prediction-capture path that writes each week's start/sit/projection rows **with `generated_at` BEFORE games**, stored immutably (still `canPublishProjections:false`, still labeled Preview). (3) Write the empty `docs/calibration-proposals/<slug>.md` shell with the acceptance thresholds pre-declared (MAE/Brier targets) so the bar is set before you see results.
- **Depends on:** [DATA] capture pipeline; `calibration/compute.ts` exists.
- **Metric:** model frozen + first pre-committed projection set timestamped pre-game.

### M3 — Oracle/R2 cutover *iff* it pays for itself (Aug 1 – Aug 8)
- **Goal:** Move always-on work off metered serverless **only because volume now justifies it.**
- **Deliverables:** [INFRA] Oracle Always-Free VPS running Redis + `workers/data-refresh`; cron cutover from Vercel to VPS; Cloudflare R2 as the data lake the capture pipeline writes to. Keep marginal cost ≈ $0.
- **Depends on:** [INFRA]; only fire if member count / data volume makes the serverless bill real. If not, **defer** — see Part 5.
- **Metric:** data-refresh cron green on VPS; serverless spend flat or down.

### M4 — Preseason backtest round 1 (Aug 6 HOF Game → Aug 11)
- **Goal:** First real out-of-sample evidence on frozen predictions.
- **Deliverables:** (1) Grade the Aug 6 Hall of Fame Game projections via `calibration/compute.ts` → real MAE/Brier. (2) Draft the CalibrationProposal with **observed** numbers (status `DRAFT`, not yet `IMPLEMENTED`). (3) Internal go/no-go read vs the pre-declared threshold.
- **Depends on:** M2 capture; HOF game played.
- **Metric:** first MAE/Brier computed on pre-committed projections; on/off track vs threshold.

### M5 — Preseason backtest round 2 + sample build (Aug 13 → Aug 28)
- **Goal:** Accumulate enough out-of-sample weeks to justify clearing.
- **Deliverables:** (1) Grade Aug 13 + subsequent preseason slates → expanding backtest. (2) Update the proposal with the growing sample. (3) Build the public "calibration / methodology" surface (the proof page) — *staged but not flipped.*
- **Depends on:** M4; preseason games played.
- **Metric:** ≥ 3 graded pre-committed projection sets; MAE/Brier trending at/under threshold.

### M6 — Clear projections (Aug 29 – Sep 5) — *the headline goes live behind the gate*
- **Goal:** Legitimately flip `canPublishProjections` and stage the launch.
- **Deliverables:** (1) Finalize CalibrationProposal → **status `IMPLEMENTED`** (Part 3). (2) Flip `canPublishProjections:true`. (3) Stage the loud-launch surfaces: weekly start/sit + waivers + trade now PAID, calibration proof page public, pricing reframed around the now-cleared weekly engine. Hold the public announce for Sep 9.
- **Depends on:** [DATA] proposal implemented; `model-freeze.mjs` green.
- **Metric:** guardrails green with projections cleared; launch surfaces staged.

### M7 — RIBBON-CUTTING (Sep 9, NFL kickoff) — *loud launch*
- **Goal:** Convert the season-opening attention spike with the calibrated-projection headline.
- **Deliverables:** (1) Public launch across X/IG/Threads/FB + email **capture** push (still no automated send — manual/owner email only; `draft-only` blocks engine sends). (2) Headline: *"Our weekly projections are publicly backtested — here's the calibration."* (3) Pricing live with weekly engine as the paid centerpiece; Week 1 start/sit ships on the cleared model.
- **Depends on:** M6 cleared; Part-1 funnel proven since June.
- **Metric:** launch-week subs step-change; first PRO/ELITE upgrades off the weekly suite.

### M8 — In-season Frontier modules (Sep 9 → ongoing)
- **Goal:** Layer the high-value forecasting modules where their value actually lands — in-season.
- **Deliverables:** Ship Forecasting Frontier modules (opportunity/role, injury/return hazard, game-script, breakout/regression) and GSE Intelligence Core pieces **incrementally, each behind the same freeze→backtest→clear gate.** None of these block Sept 9.
- **Depends on:** kickoff; per-module calibration.
- **Metric:** retention + upgrade rate week over week; each module shipped only after it clears.

---

## Part 3 — CRITICAL PATH TO "CLEARED PROJECTIONS" (the keystone)

This is the minimal mechanical sequence that legitimately flips `canPublishProjections:true`. It is gated by `scripts/guardrails/model-freeze.mjs`, which refuses a `MODEL_VERSION` change in `packages/prediction-engine/src/constants.ts` (today `v5.0.0`) **unless** the working tree also contains an IMPLEMENTED `CalibrationProposal` matching the new version — either a `seed.ts` row (`status:"IMPLEMENTED"` + matching `modelVersion`) **or** a `docs/calibration-proposals/<slug>.md` with front-matter `modelVersion:` + `status: IMPLEMENTED`. That guardrail is the lock; the steps below are the key.

1. **FREEZE (by ~Jul 25).** Lock `weekly-model.ts` + `weekly-model-loader.ts` logic and inputs. Pre-declare the acceptance bar in the proposal shell **before** seeing results — e.g. **projection MAE ≤ ~5.0 fantasy pts/player/wk** and **Brier ≤ ~0.18–0.20** on binary start/sit calls (tune to the metric `calibration/compute.ts` emits; the point is the number is fixed in advance, not reverse-fit).
2. **PRE-COMMIT (Aug 6 HOF → Aug 13 preseason → on into Week 1).** For every slate, write projection rows with `generated_at` **before kickoff**, immutable. No edits after games. This is what makes the backtest honest and is the whole reason preseason exists in this plan.
3. **BACKTEST (Aug 7 onward, rolling).** Run `calibration/compute.ts` over the pre-committed rows → real out-of-sample MAE/Brier. Require a **minimum sample** before clearing: aim for **≥ 3 graded slates / ≥ ~150–200 player-projection observations** so the numbers aren't one-game noise. (Preseason volume is thin; if sample is short by late Aug, clear on a **conservative** read and widen with Week 1 — but never clear on a single slate.)
4. **PROPOSE (by ~Sep 3).** Author `docs/calibration-proposals/weekly-v5.1.0.md` (or seed row) with: the **observed** MAE/Brier, the pre-declared threshold, the sample size, the date range, the frozen model version it validates, and the proposed `MODEL_VERSION` bump. Set `status: IMPLEMENTED` only when observed clears the pre-declared bar.
5. **FLIP (Sep 4–5).** Bump `MODEL_VERSION` (e.g. `v5.0.0`→`v5.1.0`) **in the same change** as the IMPLEMENTED proposal so `model-freeze.mjs` stays green; set `canPublishProjections:true`. CI guardrails must pass. Weekly start/sit, waivers, trade move from "Preview" to PAID.
6. **HEADLINE (Sep 9).** The calibration proof page is now true and public — *that* is the ribbon-cutting message. The keystone unlocks the full paid suite **and** the only marketing claim a competitor can't fabricate: a timestamped, pre-committed, publicly graded track record.

**If the model misses the bar:** do **not** clear. Launch Sept 9 on season-long (still real, still paid) + weekly as honest "Preview, calibrating in-season," and clear mid-September once Week 1–2 real games close the sample. The discipline *is* the brand — clearing on bad numbers destroys the one durable asset.

---

## Part 4 — WHAT TO EXPLICITLY NOT DO NOW (defer, with rationale)

- **Real-money contests / DFS** — founder+legal+EIN gated, regulatory surface; DEFERRED by doctrine. Not a soft-launch revenue path.
- **Computer-vision / broadcast charting** — months of work; value lands well after kickoff; zero impact on the Sept 9 headline.
- **Deep-learning / neural projection models** — the frozen statistical model + honest calibration beats an uncalibrated fancy model for trust *and* for the headline. Defer until you have a real track record to improve on.
- **Multi-sport (NBA/MLB/etc.)** — NFL is the season that's happening; splitting focus now forfeits the perishable draft window. One sport, done credibly, first.
- **Coverage-map UI** — internal clearance tooling, not a member-facing surface; ship data behind the gate, not a map of what's cleared.
- **Email/SMS SENDING** — `draft-only.mjs` blocks all engine send paths by design. Capture emails now; sending is a post-launch, owner-initiated decision. Do **not** wire SendGrid/Resend/Twilio to beat the guardrail.
- **Full R2 data lake before launch** — provision only when capture volume needs it (M3), not as pre-work. Until then the DB-independent `graded-pool.ts` path already serves real data.
- **GSE Intelligence Core + Forecasting Frontier full build before Sept 9** — most of their value is in-season (M8). Ship them incrementally behind the freeze→clear gate; none block the launch.
- **Brand re-litigation (GSE vs GSN)** — pick **GSE / Galaxy Sports Edge** (matches the live handles @GalaxySportsAI + galaxysportsedge and the shipped OG card) and stop. Re-deciding the name burns a launch window you don't have.

---

## Part 5 — RUNWAY-AWARE OPS

Founder is unemployed and burning cash, so the operating rule is: **marginal cost stays ≈ $0 until a line item demonstrably pays for itself.**

- **Order of [INFRA] that matters:** (1) **Nothing** beyond current serverless until M0 revenue exists. (2) **Oracle Always-Free VPS** (Redis + `workers/data-refresh`) — fire at **M3 only if** member volume / data-refresh frequency makes the Vercel bill real; Always-Free tier = $0, so the cost is your time, spend it only when it buys lower spend or capability you need for capture. (3) **Cloudflare R2 data lake** — fire when the pre-commit capture pipeline (M2/M3) needs durable immutable storage at volume; until then store lean. (4) Cron cutover follows the VPS, not before.
- **Cost Phase 0 is already banked** (deploy-gating, SourceSnapshot hash-only + prune, CDN fail-safe) — don't re-spend effort there.
- **Revenue-first sequencing:** the $49 annual tier front-loads cash (a 25-member week = ~$1,225 booked today, not dripped monthly) — that is the runway that funds the 80 days. Annual pricing is itself a runway decision, not just a positioning one.
- **Spend triggers, not calendar:** provision when (members × value) or (data volume × refresh need) crosses the line, never "because it's August." If draft-season revenue underperforms, the VPS/R2 work waits and you launch Sept 9 on the existing serverless + `graded-pool.ts` path — which already works.

---

## Part 6 — HANDOFF CHECKLIST (dated, sequenced, tied to milestones)

**This week — M0 (by Fri Jun 26):**
- [ ] [OWNER] Create live Stripe **$49/yr** Fantasy price; copy `price_…`.
- [ ] [OWNER] Set Vercel **Production** `STRIPE_FANTASY_PRICE_ID` (match webhook var) + confirm live `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`.
- [ ] [OWNER] Set **`PROJECTIONS_PROVIDER`** to the nflverse value (flips real season-long `graded-pool.ts`).
- [ ] [OWNER] Set analytics tokens (Cloudflare + Clarity).
- [ ] [OWNER] Rotate **Anthropic** key; confirm `PUBLIC_BLOG_ENABLED` state.
- [ ] [OWNER] Verify Stripe webhook → production domain; send test event → 2xx.
- [ ] [CODE] Smoke: real-data Best Ball renders; trial gates at depth; guardrails green; **do not** touch `canPublishProjections`.
- [ ] [OWNER] Live-card self-subscribe → confirm FREE→FANTASY promotion → refund.
- [ ] [OWNER] Flip `/launch`; quiet announce on X/IG/Threads/FB + 20–30 DMs.

**Jul 12 – Aug 1 — M2 (keystone start):**
- [ ] [DATA] Freeze `weekly-model.ts` + inputs; tag version.
- [ ] [DATA] Stand up pre-commit capture (rows `generated_at` pre-game, immutable; still Preview / `canPublishProjections:false`).
- [ ] [DATA] Write `docs/calibration-proposals/<slug>.md` shell with **pre-declared** MAE ≤ ~5.0 / Brier ≤ ~0.18–0.20 thresholds.

**Aug 1 – Aug 8 — M3 (only if it pays for itself):**
- [ ] [INFRA] Oracle Always-Free VPS: Redis + `workers/data-refresh`.
- [ ] [INFRA] Cloudflare R2 data lake for capture.
- [ ] [INFRA] Cron cutover Vercel → VPS. *(Skip all three if volume doesn't justify.)*

**Aug 6 – Aug 28 — M4/M5 (backtest):**
- [ ] [DATA] Grade Aug 6 HOF Game via `calibration/compute.ts` → MAE/Brier (proposal `DRAFT`).
- [ ] [DATA] Grade Aug 13 + preseason slates → expand sample to ≥ 3 slates / ~150–200 obs.
- [ ] [CODE] Stage (don't flip) the public calibration/methodology proof page.

**Aug 29 – Sep 5 — M6 (clear):**
- [ ] [DATA] Finalize proposal → **`status: IMPLEMENTED`** with observed numbers + sample + dates.
- [ ] [CODE] Bump `MODEL_VERSION` (`v5.0.0`→`v5.1.0`) **in the same change**; flip `canPublishProjections:true`; `model-freeze.mjs` green.
- [ ] [OWNER] EIN + affiliate-operator approval finalized; domain/DNS confirmed on **galaxysportsedge.com**; brand locked **GSE**.

**Sep 9 — M7 (ribbon-cutting):**
- [ ] [OWNER] Public launch + email **capture** push (no engine send).
- [ ] [CODE] Weekly start/sit ships on cleared model; pricing centered on weekly engine; calibration page public.

---

## If you only do FIVE things in 80 days

1. **This week:** [OWNER] create the live $49/yr Stripe price + flip `PROJECTIONS_PROVIDER` + self-test the money path + quiet-launch the real-data Best Ball product. Capture draft season **now**.
2. **By Jul 25:** [DATA] freeze the weekly model and start writing **pre-committed, pre-game, immutable** projection rows — the honesty that makes the backtest real.
3. **Aug 6 → Aug 28:** [DATA] backtest the frozen model on HOF + preseason via `calibration/compute.ts` to a minimum sample (≥3 slates) against a **pre-declared** MAE/Brier bar.
4. **By Sep 5:** [DATA/CODE] land the IMPLEMENTED CalibrationProposal, bump `MODEL_VERSION` in the same change, and flip `canPublishProjections:true` — the keystone that unlocks the full paid suite.
5. **Sep 9:** [OWNER] loud launch behind the one headline nobody can fake — *"publicly backtested, calibration-frozen weekly projections"* — with the funnel you've been converting since June.
