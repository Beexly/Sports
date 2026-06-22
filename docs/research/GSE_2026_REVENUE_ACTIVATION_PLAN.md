# GSE — Revenue Activation Plan (decisions made, ship-ready)

**Owner ask:** start making money without sacrificing quality. **This doc makes the pending decisions
and lays the honest path to the first dollar.** It assumes the proof-spine branch (built on the real
`packages/prediction-engine` primitives) is trunk; `lib/gse` lands on top later as the decision/UX layer.

---

## 1. Decisions (ratified — stop waiting on these)

1. **Brand:** **Galaxy Sports Edge (GSE)** is canonical (`brand.ts`). GSN = the media/content sub-brand;
   StatKing = the NFL-stats lens. Sweep every other floating name to a tagline or sub-brand. One name on
   the storefront.
2. **Price:** `pricing-phases.ts` is the single source of truth — **Free $0 / Pro $14.99·mo ($99·yr) /
   Elite $24.99·mo ($179·yr)**, FOUNDING phase. Delete the two stale price claims the map found.
3. **Trunk branch:** the proof-spine branch (ships on production primitives) is trunk for revenue.
4. **Sequence:** **revenue path beats moat depth.** The first dollar is gated on infra + Stripe + an
   honest payable funnel — NOT on finishing the OOS promoter or the deeper moat. Those continue in the
   background and never block checkout.

## 2. The honest money model (this is the "without sacrificing quality" part)

| We SELL (true on day one) | We NEVER sell |
|---|---|
| The **tools**: full factor trail, line-movement context, devig fair prices, evidence + counter-case courtroom, your own closing-line-value tracker | A win rate / ROI we haven't proven |
| The **founding ride**: $14.99 held for life while we prove the record in the open | Fake urgency, fake social proof, "guaranteed" anything |
| **Proof in public**: every pick pre-committed (hashed) before kickoff, graded vs the close, on the record | A published win-rate before the settled-sample floor |
| **Free tier** as the trust funnel: one honest pick/day + watch the record accrue | Outcome promises of any kind |

The pitch in one line: **"See the work behind every pick — and watch us prove it in the open."** You're
selling decision quality + early-access + a price held for life, funded by members who want the ride.
The calibrated win-rate claim turns on *only* when the floor is hit — that's the brand, not a limitation.

## 3. Ship-ready copy (claim-safe — passes the banned-phrase scanner)

**Hero:** See the work behind every pick — and watch us prove it in the open.
**Sub:** Galaxy Sports Edge shows the evidence, the counter-case, and what would make each call wrong.
Every pick is committed to the record before kickoff and graded against the closing line. No hype, no
hindsight.
**Free CTA:** Start free — one pick a day, no card.
**Pro card ($14.99/mo):** Every pick, the full factor trail, line-movement context, fair-price devig,
and your own closing-line-value tracker. Cancel any time.
**Founding line:** Founding members keep $14.99/mo for life. The price rises only when the public record
hits its first proof milestone — earned, not before.
**Proof page header:** Pre-committed before kickoff. Graded against the close. Audit every pick.
**Honesty disclosure (always on):** Picks are informational analysis, not guarantees. Odds move, data
can be incomplete, sports involve risk. Past results do not predict future results.

## 4. Critical path to the first dollar

**OWNER-ONLY (the real bottleneck — no agent can do these):**
1. Provision prod **DB + Redis + env vars**; deploy and verify the app loads.
2. Create **Stripe live prices** ($14.99 / $24.99 + annual) and set `STRIPE_*` secrets + webhook secret.
3. **Rotate the cleartext API keys** the map found (agents can scrub them from the repo; only you can
   rotate the live keys).
4. Ratify §1 decisions (brand=GSE, price=pricing-phases.ts) in one reply so agents sweep the contradictions.

**AGENT-BUILDABLE NOW (make everything ready so money flows the instant the above lands):**
5. Honest **landing + pricing + checkout funnel** using §3 copy (claim-safety gate on every string).
6. **Wire the receipt-mint into live pick creation** so proof-in-public starts accruing from pick #1.
7. The **public proof page**: the commit-reveal process is visible day one (pre-committed slate + hash);
   the calibrated win-rate stays gated until the floor — both are honest.
8. **Funnel analytics events** (visit → free signup → activation → upgrade) so you can see what converts.
9. Scrub leaked keys from the repo + move to env.

## 5. First 14 days (to first dollars)

- **D1–2 (owner):** deploy prod, Stripe live prices, rotate keys, ratify §1.
- **D1–4 (agents):** ship the honest funnel (§3) + wire receipt-mint into live picks + proof page (process
  visible) + analytics. Keep every suite green.
- **D3+:** publish one pre-committed pick/day on the free tier; the proof feed (hash before kickoff,
  grade after) becomes the build-in-public marketing — it costs nothing and is pure quality.
- **D5–14:** invite a small founding cohort (your network + one honest post: "we're building the first
  publicly-auditable pick record; found it at $14.99 for life"). The aha that converts free→Pro: *watch a
  pre-committed pick settle and the record update.* Target the first handful of founding Pros.

## 6. First-100-paying-users play (honest, no dark patterns)

- **Build-in-public proof feed** = the growth loop (shareable, auditable hashes; no fabrication possible).
- **Founding-member counter** = real scarcity (the rate genuinely ends at the proof milestone, per the
  ladder — not a fake timer).
- **Free→Pro on value**, not fear: free proves trust; Pro unlocks the tools + the full board.
- **Affiliate later, never instead:** sportsbook affiliate (CPA only, disclosed, geo-gated, walled off
  from picks) is a *post-proof* revenue add — it must never bias a recommendation.
- **B2B "True Line"/calibration licensing** = a 2027 move, only after the record is established.

## 7. The one directive for the building session

> Revenue beats moat depth. In order, each shipped + tested + green: (1) wire the receipt-mint into live
> pick creation (proof starts accruing); (2) ship the honest landing/pricing/checkout funnel from §3
> through the claim-safety gate; (3) the public proof page (commit-reveal process visible day one,
> win-rate gated past the floor); (4) funnel analytics; (5) scrub leaked keys to env. The OOS promoter,
> champion/challenger, and deeper moat continue AFTER the funnel is payable — they never block checkout.
> Owner-gated items (prod infra, Stripe live prices, key rotation) are flagged for the owner, not built.

**Bottom line:** the moat is already deep enough to sell honestly today. The thing between you and the
first dollar is **infra + Stripe + an honest funnel** — not more features. Clear that, let the proof
accrue in public, and you make money *because of* the quality, not despite it.
