# GSE — R&D SYNTHESIS 2026
> Consolidated overnight R&D for the "best overall website of 2026" push. Three parallel research agents
> (best-of-2026 design · competitor integrations · monetization) + a review of Codex's distilled memory.
> Compiled 2026-06-03. Companion to `WAR_GAME_2026.md` (the battle-test + scenario tree). Citations inline.

---

## 0. THE CONVERGENCE (the one thing to internalize)

Three independent research threads + the war-game all point at **the same single build**:

> **The public, self-incriminating calibration / track-record surface — plus CLV capture — is simultaneously
> the best-of-2026 design showpiece, the embeddable moat/distribution asset, the lowest-risk monetization
> (widget + B2B API), and the trust wedge.**

One artifact serves design **and** moat **and** money **and** trust. That is rare. It maps exactly onto the
existing plan — tasks #8 (CLV), #9 (glass-box hero), #10 (perf/JSON-LD, in progress). **The R&D doesn't
redirect the plan; it massively reinforces it and tells us how to execute it at A+.** Build the glass-box
calibration surface as the hero, make it embeddable, capture CLV underneath it, and expose it as an API.

---

## 1. BEST WEBSITES OF 2026 → lessons for GSE  (research agent, cited)

**Headline:** Don't chase the Awwwards Site-of-the-Year aesthetic (Lando Norris / OFF+BRAND). Steal its
**discipline** — *motion encodes meaning, performance is a hard budget* — and aim at the **Information is
Beautiful Awards**, the right target for a data-truth product, not Awwwards SOTY.

**The single highest-leverage, most defensible move:** a **live, public, filterable calibration curve of every
settled pick** — FiveThirtyEight's "Checking Our Work" as a *product surface*, not a marketing stat. Predicted
prob (x) vs observed frequency (y), 45° perfect-calibration line, your settled-pick dots binned by confidence
band, filterable by sport/season/market. It is self-incriminating math = the strongest possible trust artifact,
and a category first in sports-betting media. (projects.fivethirtyeight.com/checking-our-work)

**Adopt:**
- **Point + interval grammar everywhere** — never a bare probability; always estimate + uncertainty band ("58% ±7"). Uncertainty-forward = honesty, not decoration.
- **"Pick Anatomy" waterfall/sankey** — expand any pick into prior → each signed evidence factor → closing-line comparison → final calibrated number, so the reader watches the probability *get built*. (Borrows The Pudding's guided-then-explorable pattern.)
- **Anti-engagement "honesty brake"** — a "we're not confident here, maybe skip this" state; a cold-streak banner that shows current calibration error *before* new picks; no streak confetti, no urgency timers. Anti-engagement as the brand (calm-tech, Building Humane Tech).
- **Brier-score scoreboard** — a proper-scoring-rule number trending publicly; can't be cherry-picked the way win-rate can.
- **Plain-language explanation over jargon** — "estimated edge from closing-line movement + your last 200 settled picks," not "score: 0.78."

**Pitfalls to avoid** (so we don't lose on the rubric): Usability is **30% of the Awwwards score** and includes load speed; WebGL/3D that fails Core Web Vitals (only ~50% of mobile sites pass CWV — winners budget for it); motion-without-meaning (worse than wasted on a trust product); **color-only** confidence coding fails WCAG (always pair green/amber/red with text/shape); scroll-jacking on data surfaces.

---

## 2. COMPETITOR INTEGRATIONS & ADDITIONS  (research agent, cited)

Beyond "how we beat them" (in `COMPETITIVE_INTELLIGENCE.md`) — *what to plug in and bolt on.*

**Flagship novel combo — "Second Opinion" (rank #1):** sync the user's **real** bets (via **SharpSports
BetSync** — the "Plaid for sportsbooks": normalized BetSlip/BettorAccount across all major US books, webhooks,
SOC 2) and grade *them* on the same rigor we grade ourselves — CLV-vs-close, ROI by sport — **AND overlay
GSE's calibrated model lean on each slip** ("our model leaned the other side at lock," with the factor trail).
Pikkit/Action verify your bets; Rithmm gives a model opinion; **nobody fuses verified user-bet grading with a
calibrated, evidence-grounded house second opinion.** Everything but the sync already exists in the engine.

**Other high-value, doctrine-safe integrations (ranked):**
1. **Embeddable trust/calibration widget** — wrap the existing calibration API as an `<iframe>`/web-component so media/newsletters/creators embed GSE's live Brier/CLV/loss-autopsy scoreboard. Low effort, pure moat, GEO-backlink growth engine. Nobody else has a tamper-evident record worth embedding. *(Must show updated-at + sample size and respect the ≥N-settled governance so a third party can't render a premature claim.)*
2. **Data-feed failover + closing-line capture** — GSE single-sources The Odds API (a trust-brand SPOF, war-game R-10). Add **SportsDataIO** (normalizes opening + closing + every price change) as secondary → failover, cross-validation "contradiction" badge, **and it's the direct unlock for the CLV metric** the repo already wants. (Also Unabated ~$500/mo vig-free line; OpticOdds premium.)
3. **Venue-agnostic fair-value board** — overlay GSE's vig-free probabilities on live **Kalshi** (clean REST, CFTC-regulated) + **Polymarket** (read-only price ingestion avoids wallet complexity) contract prices → new audience (prediction-market traders), zero new modeling. Executes the COMPETITIVE_INTELLIGENCE "trust layer above every venue" thesis.
4. **Responsible-gaming "honest mirror"** — use synced bet data to show net P/L, time, loss-streaks honestly, linked to GeoComply PlayPause / 1-800-GAMBLER. RG as a feature, not a footer. *(A direct PlayPause partnership for a non-operator is speculative — needs a vendor conversation.)*

**The one hazard:** sportsbook **affiliate / CPA odds links** are the doctrine's named tripwire
(`monetization-lanes.md` lists them as a "Never" without legal review). Ship the odds board as *pure utility*
first (best price, ranking independent of payout); gate any affiliate layer behind legal review + FTC/RG
disclosure, or skip it.

*Pricing/availability caveats: SharpSports & OpticOdds pricing are sales-gated (community-reported OpticOdds ~$5k/mo+); Pikkit has no partner API (consumer app — use SharpSports/OpticOdds for sync).*

---

## 3. MONETIZATION — pressure-test + new avenues  (research agent, cited)

**Existing ladder is well-positioned but has two gaps** (verified June-2026 competitor pricing: Rithmm
$29.99, Action PRO $29.99, Pikkit Pro $39.99, Unabated $49–132, OddsJam ~$199):
- Pro **$14.99** deliberately undercuts proven incumbents ~50% — correct for a pre-record trust brand. Keep.
- **Gap 1 — Elite is thin** ($24.99 = Pro + alerts only; a 67% step for a notification toggle). Either narrow to ~$19.99 or add one honest Elite feature now (CLV-per-pick analytics, slate early-access).
- **Gap 2 — No free trial.** A time-boxed Pro trial is table stakes and the single cheapest conversion lever. No doctrine conflict.
- **Doc drift:** `monetization-lanes.md` still shows stale **$19/$49** tiers — reconcile to the live `pricing-phases.ts` ladder.

**Top 3 new avenues to pursue (each scored for integrity risk):**
1. **B2B fair-value / probability API** (risk: LOW) — expose vig-free fair probabilities + calibration to Kalshi/Polymarket traders & devs. Lowest doctrine risk, lowest incremental effort (probabilities already computed), **wins in BOTH scenarios**, largest tailwind (Kalshi >$2B/week, funded Builder-Codes ecosystem). Price in the verified $99–499/mo band.
2. **7-day Pro trial + one honest Elite feature** (risk: LOW) — closes both ladder gaps; cheapest conversion lever.
3. **Embeddable trust/calibration widget** (risk: very LOW — *strengthens* the doctrine) — revenue line + GEO growth + Scenario-B hedge; shares a component with the public calibration page.

**Defer:** sportsbook CPA (doctrine risk), "verified honesty" certification (premature pre-record), fantasy vertical (schema-blocked + distracting).

**The pivot mechanism (key recommendation):** add a **`MONETIZATION_MODE`** config (mirroring the existing
`PRICING_PHASE` env pattern) with `EDGE_AUTHORITY` vs `HONEST_TOOLBELT` that drives homepage hero copy,
pricing emphasis (picks-led vs tools/transparency-led), and which upsells surface — so the scenario pivot
(model has a provable CLV edge vs only matches the market) is **one env var, not a rebuild.** Build the
fair-value probability as a first-class internal service object and the calibration surface as render-once /
embed-anywhere from day one, so the API and widget are an auth+billing layer, not a re-architecture.

---

## 4. ⚠️ CRITICAL — WORKSPACE DIVERGENCE (surfaced from Codex memory review)

Codex (the other agent) has been working on **different physical copies** of both projects than this session:

| Project | This session works in | Codex worked in | Evidence |
|---|---|---|---|
| **GSE** | `C:\Users\Garrett\Sports-deploy-fix` (live monorepo: `packages/`, prediction-engine, Tailwind; commits match galaxysportsedge.com — Edge Index, Founding pricing) | `C:\Users\Garrett\OneDrive\Documents\Galaxy Sports Edge` (smaller scaffold: plain `globals.css`, **no** `packages/`, scripts `dev:web/build:web/validate:monetization/audit:launch`) | Codex memory_summary + MEMORY.md |
| **Lumera / Alter XIV** | `C:\Users\Garrett\Clouds-bruh` | `C:\Users\Garrett\OneDrive\Documents\Alter XIV` (MP1 doc-scaffold + Wix-first) and verified branch `claude/epic-clarke-XPZhF` | Codex memory |

There also appear to be sibling copies: `C:\Users\Garrett\Sports`, `Sports_release_codex`, `Sports-deploy-fix`.
**This is a real risk to "holding structure": fragmented effort across divergent sources of truth.**
**Recommendation:** declare ONE canonical repo per project. Evidence says **`Sports-deploy-fix` is canonical
for GSE** (it matches the deployed live site). Founder decision needed; everything else should be archived or
reconciled to the canonical checkout.

**Useful operational knowledge from Codex's memory (Windows-safe):** use `npm.cmd` (PowerShell exec-policy
blocks `npm.ps1`); retry cert-chain failures with `NODE_OPTIONS=--use-system-ca`; for Alter XIV API
verification use `MEDUSA_ADMIN_DISABLED=true` + `scripts/verify-api.ts`; build/test green ≠ runtime green
(prove migration + boot + regression separately).

---

## 5. THE UNIFIED A+ BUILD (what to do with all of this)

Sequenced, reconciled with `WAR_GAME_2026.md` §6 and the live task list:

1. **Protect the moat** — stale-unsettled-pick alert → JARVIS RED (task #7, in progress this session); odds-feed failover via SportsDataIO (task #11) which *also* gives closing-line capture.
2. **Capture CLV + prove the edge privately** (task #8) — decide EDGE_AUTHORITY vs HONEST_TOOLBELT before going loud.
3. **Build the glass-box calibration surface as the hero, embeddable from day one** (task #9 + §1 here) — live reliability curve, point+interval grammar, Pick Anatomy, anti-engagement brake. This single surface is the design showpiece, the embeddable widget (§2.1), and the public-API seed (§3.1).
4. **Earn the A+ craft grade** (task #10) — web-vitals beacon ✅ + Lighthouse budgets ✅ done this session; remaining CSP/HSTS, skip-link+axe, global-error/loading; honor the usability=30% rubric, no WebGL that fails CWV.
5. **Monetization expansion** — 7-day trial + Elite substance now; `MONETIZATION_MODE` flag; B2B fair-value API as the cross-scenario winner; reconcile the stale $19/$49 doc.
6. **"Second Opinion" flagship** (§2 rank #1) — SharpSports BetSync; the novel combo that nothing else ships.

**Failures & successes forecast:** complete in `WAR_GAME_2026.md` — the 10-risk pre-mortem (settlement
reliability is the moat's life-support; CLV is make-or-break) and the 2×2 win/loss scenario tree (model edge ×
brand catch) with a pre-built plan per quadrant. This R&D adds the *execution detail* for each.
