# GSE — War-Game 2026: Best-Website Battle Plan

**Question this answers:** If we are going to war to be *the best overall website of 2026* — A+ on
engine, trust, design, wow-factor, all of it — have we battle-tested it, forecast the failures,
predicted the wins *and* the losses, and pre-built a plan for both?

**Method:** Adversarial synthesis. This does **not** re-author the existing strategy corpus — it
pressure-tests it and fills the one gap the directive names that isn't yet a discrete artifact:
**win/loss scenario planning.** Grounded in direct repo read (cited by path) + the existing docs.
**Labels:** `verified` (read in repo) · `inferred` (derived, not run) · `recommended` · `red-team`
(deliberately adversarial — argue the bear case).

**Companion docs (do not duplicate — extend):** `COMPETITIVE_INTELLIGENCE.md` (the moat thesis),
`RISK_AND_FAILURE_REGISTER.md` (failure forecast), `PRODUCTION_QUALITY_AUDIT.md` (A→A+ web punch list),
`AUTONOMOUS_OPERATING_SYSTEM.md` (agent ops), `REPO_INTELLIGENCE_REPORT.md` (verified architecture).

> **Two founder decisions block clean framing and must be resolved first (`verified`,
> `RISK_AND_FAILURE_REGISTER.md` lines 43–48):**
> 1. **Brand: GSE vs GSN.** Code, domain, and all Codex docs ship **Galaxy Sports Edge (GSE)**;
>    "GSN" survives only in the operator brief. Pick one before any public/brand work. This doc uses GSE.
> 2. **Deploy status is unconfirmed** — treat as **not live** until verified. Production deploy is a hard stop.

---

## 0. Headline verdict (blunt)

GSE is an **A-grade trust engine wearing an A−-grade web app, defending a moat that is real but
invisible at launch and slow to compound.** The architecture is genuinely best-in-class on the one
axis that matters for *this* product — *provable* calibration on tamper-evident records — and nearly
every competitor is beatable there (`COMPETITIVE_INTELLIGENCE.md` §3). But "best website of 2026" is
not won by being *correct*; it is won by being correct **and** unmissable. Today GSE is correct and
quiet. The gap to A+ is not more architecture — it is (a) **proving an edge the market doesn't already
price** (CLV+), (b) **making the glass-box trust experience the hero, not a gated page**, and (c) the
production punch-list already written in `PRODUCTION_QUALITY_AUDIT.md`. None of the three is a research
problem; all are execution.

---

## 1. Red-team the moat — where "trust through calibration" actually breaks

The moat thesis (`COMPETITIVE_INTELLIGENCE.md` §0, §3) is correct and I would not change it. But an
advisor who only repeats your thesis is useless. Here is the bear case, so you can plan against it.

**R-1 — The moat is a *lagging* asset; at launch you look identical to the pick sites you mock.**
Public calibration needs ~100+ settled picks before it means anything (`LAUNCH_TONIGHT.md` Day 21–30;
`PERFORMANCE_STATS_ENABLED` gated off). For the first month the differentiator is **literally
invisible** — the site honestly shows an empty track record while every uncalibrated competitor shows
"68% accuracy." You are bringing a calibration curve to an attention fight. `red-team`
→ *Plan:* the launch hero cannot be the (empty) scoreboard. It must be the **method + the glass-box**
("here is exactly how we grade, and why we refuse to fake it") — sell the *doctrine* until the *record*
exists. (`recommended`, ties to §4 scenario "Brand wins / model unproven".)

**R-2 — The moat is replicable; it is brand + execution, not defensible technology.**
OddsJam, Unabated, or Pikkit could ship a public model-calibration page in a quarter. Nothing here is
patent-grade. The defensibility is *being first and loudest about honesty* and compounding a record
nobody can retro-fake (`isBootstrap` fencing, immutable `PickSignalSnapshot` — `verified` via
`packages/prediction-engine/src/signal-snapshot.ts`). That is a **time-and-trust** moat, not a tech
moat. `red-team` → *Plan:* treat the public **accountability cadence** (quarterly model report, loss
autopsies as a live feed) as the actual product velocity — the thing that's expensive to copy is the
*habit*, not the page.

**R-3 — Trust is asymmetric and brittle: one corrupted score destroys it.** This is the single most
important difference between GSE and the commerce project. A storefront that mis-renders is an
annoyance; a *calibrated-honesty brand* that records a LOSS as a WIN during a live slate has betrayed
its entire promise. P0 risk #1 (away-favored spread mis-grade) was exactly this class and is fixed
(`verified`, `scoring.ts` + `spread-line-convention.test.ts`), but the residual settlement SPOF
(P0 #2 residual: no "stale unsettled picks" alert) keeps the failure mode *open*. `red-team` → *Plan:*
**settlement reliability is not a P0 among others — it is the moat's life-support.** Ship the stale-pick
JARVIS-RED alert before any growth spend. (`recommended`, elevates `RISK_AND_FAILURE_REGISTER.md` #2 residual.)

**R-4 — Single-founder + AI-ops is leverage *and* a fragility.** The autonomous back office
(`AUTONOMOUS_OPERATING_SYSTEM.md`) is genuinely strong — six drafting agents, hard human gate
(`externalActions: "NONE"`, `verified` `agents.ts:8`), append-only decision log. But the same design
means **a human must be in the loop for every external action**, and there is exactly one human. During
a heavy Sunday NFL slate, settlement + content + support + anomaly review all spike at once. `red-team`
→ *Plan:* pre-define the **degradation order** — what GSE stops doing first under load (content, then
support drafts) so settlement + freshness never starve. Make JARVIS surface it.

---

## 2. The existential competitive threat (name it, don't flinch)

`COMPETITIVE_INTELLIGENCE.md` §1 correctly identifies prediction markets (Kalshi ~$23.8B volume, sports
~90%) as the structural disruptor. The war-game sharpening:

**The closing line is the boss fight.** GSE's product is a *fair probability*. But a liquid market's
**closing line is already a near-efficient estimate of fair probability** — decades of research say it
is the hardest baseline in sports to beat. So the brutal dichotomy:

- A calibrated model that **matches** the market is *honest but commercially worthless* — you're
  re-deriving, for a fee, what Kalshi prints for free.
- A calibrated model that **beats** the close (positive CLV, sustained) is *gold* — but rare, and hard
  to prove over small samples.

This is why **CLV (closing-line value) is not a "P1 nice-to-have" — it is the make-or-break proof of
whether there is a business at all.** The engine already has the seam: opening lines are stored, and
`packages/prediction-engine/src/clv.ts` exists (`verified`). `red-team` → *Plan:* capture closing lines
at lock and compute CLV per pick/sport **before** flipping `PERFORMANCE_STATS_ENABLED`. The first public
number should not be win-rate (noisy, market-dependent) — it should be **CLV**, the sharp's gold
standard. If CLV is consistently ≤ 0, you find out *privately, during silent collection*, and pivot
(see §4) instead of launching a paid product on a non-edge.

**The unowned white space (where you can actually be first):** every venue and tool answers "what's the
fair price *here*?" Nobody owns the **venue-agnostic, evidence-grounded, anti-overclaim trust layer**
that sits *above* sportsbooks **and** Kalshi/Polymarket and says "here's the fair probability, here's
the evidence, and here's our audited record of being right." That is the one defensible category, and
GSE's doctrine is the only one built to occupy it honestly (`COMPETITIVE_INTELLIGENCE.md` §3 move 2).

---

## 3. Predicted WINS and LOSSES — the scenario tree (plan for both)

The directive's core unmet ask. Two axes decide GSE's fate. **Axis X: does the model demonstrably beat
the close (CLV+ over a real sample)? Axis Y: does the trust/transparency brand capture attention &
distribution?** Four outcomes — each with a *pre-built* plan so we are never improvising.

```
                      MODEL HAS EDGE (CLV+)              MODEL ~ MARKET (CLV ≤ 0)
                ┌──────────────────────────────┬──────────────────────────────┐
  BRAND         │  ① THE CALIBRATED AUTHORITY   │  ③ THE HONEST TOOLBELT        │
  CATCHES       │  (win-win — the dream)        │  (attention, no pick-edge)    │
                │                               │  *most likely real outcome*   │
                ├──────────────────────────────┼──────────────────────────────┤
  BRAND         │  ② THE QUIET EDGE             │  ④ CLEAN SHUTDOWN             │
  STAYS QUIET   │  (great model, no audience)   │  (no edge, no audience)       │
                └──────────────────────────────┴──────────────────────────────┘
```

**① Win-Win — "The Calibrated Authority."** Model beats the close *and* the honesty brand catches.
*Plan:* pour everything into the moat — quarterly public accountability report, expand the
**venue-agnostic probability API** for Kalshi/Polymarket traders (`COMPETITIVE_INTELLIGENCE.md` §4 P2),
raise Elite to advanced analytics. This is the only quadrant where "our picks win" is a sellable claim,
and the calibration record is what makes it un-fakeable. *Leading indicator:* CLV+ over ≥ 200 settled
picks **and** organic share velocity on the loss-autopsy / model-court content.

**② Model wins, brand quiet — "The Quiet Edge."** Real edge, no audience. *Plan:* pivot the center of
gravity from B2C picks to **B2B/data** — sell the fair-value feed (the API seam from ① already exists),
or an affiliate model. *Pre-build now so the pivot is a config flag, not a rebuild:* keep the fair-value
computation cleanly separable from the storefront (it already is — engine lives in `packages/`, `verified`).

**③ Brand wins, model unproven — "The Honest Toolbelt" (plan for this hardest, it's the modal case).**
You earn attention, but honest calibration shows ~market performance, and the integrity doctrine
**forbids overclaiming an edge you can't defend** (`CLAUDE.md` rules 1–2; `COMPETITIVE_INTELLIGENCE.md`
§3 "what NOT to do"). The trap: pressure to fake the number to match the hype. The doctrine is the
guardrail that stops you. *Plan:* monetize **transparency and tools**, not "our picks win" — CLV
tracking for the **user's own** bets (Pikkit-style verified tracking fused with our model second-opinion
— nobody does this combo, see §5), line-shopping, the evidence-grounded "ask the model why" agent,
education. You become the **trusted utility** of the betting public, which is a real, durable business
that *doesn't require beating the market*. This quadrant is why GSE survives even without a pick edge —
**the integrity doctrine is itself the hedge.**

**④ Lose-Lose — "Clean Shutdown."** No edge, no audience. *Plan:* the gates and the no-overclaim doctrine
mean **nobody was defrauded** — you wind down with reputation intact and the engine/IP reusable. The
downside is bounded *by design*. Most startups can't say that; GSE can.

**The strategic punchline:** GSE's honesty doctrine is usually framed as a *trust* play. It is also a
**risk-management** play — it caps the downside in quadrants ③ and ④. You have, accidentally, built a
business whose worst case is "honest utility" or "clean exit," never "sued pick-scam." Lean into that.

---

## 4. A vs A+ — honest grade by layer, and the exact A+ gap

| Layer | Grade today | Evidence | The A+ gap (the *specific* delta) |
|---|---|---|---|
| **Prediction engine / trust core** | **A** | Real Poisson, Kelly, calibration, CLV, tamper-evident snapshots (`packages/prediction-engine/src/*`, `verified`) | Persist **modeled win-probability split from the confidence UX score** (P1 #3, MODEL_VERSION-gated) + **sustained CLV+ over a real season**. Until CLV+ is proven, the core is "A-credible," not "A+ proven." |
| **Autonomous ops** | **A−** | 6 agents, hard human gate, decision log, cost ledger (`AUTONOMOUS_OPERATING_SYSTEM.md`, `verified`) | Flip cheap surfaces to Haiku + enable prompt caching (infra shipped, not switched — `RISK` #6); ship the **degradation-order** load plan (§1 R-4). |
| **Production web quality** | **A−** | Test-enforced metadata, double security headers, freshness-aware health probe (`PRODUCTION_QUALITY_AUDIT.md` §8, `verified`) | The audit's own P0/P1: **RUM/web-vitals beacon** (CWV currently unmeasured in field), **CSP+HSTS**, **track-record/Article JSON-LD**, `www`-vs-apex `SITE_URL` fix, skip-link + `axe` in CI, `global-error.tsx` + `loading.tsx` skeletons. |
| **Design / wow-factor** | **B+ (inferred)** | Interactive galaxy canvas hero, plasma/ion/UV system, reduced-motion honored globally (`verified` per audit §1, §3) | A data product hidden behind gates reads as "tasteful dashboard," not "breathtaking." A+ = make the **glass-box evidence experience itself** the spectacle (§5). |
| **Reliability of the moat** | **B (this is the scary one)** | Settlement SPOF residual still open (`RISK` #2), single odds provider w/ `MIN_BOOKMAKERS=2` (`RISK` #10) | Stale-pick alert (R-3) + odds **failover provider**. Trust brittleness means this B caps the whole platform until fixed. |

**Verdict:** the platform is **A on the axis nobody else even attempts (provable calibration)** and
**A− on craft**, but **gated by a B on moat-reliability** and **unproven on the one number that decides
the business (CLV).** "Everything at A+" is reachable, and the path is already 70% written across your
own docs — it just isn't *sequenced as a war plan*. §6 sequences it.

---

## 5. Frontier wow — "things people/AI haven't thought of" (for a *prediction* product)

The directive wants first-of-its-kind. For a betting-intelligence product, novelty that's also
*on-brand* (honest, evidence-grounded) and *feasible on this stack*:

1. **The glass-box pick as the hero, not a gated table.** Every pick already carries a `factorBreakdown`
   + immutable `SourceSnapshot` (`verified`). Make the **"ask the model why" agent** — grounded *only*
   in that evidence, structurally unable to fabricate, and required to *show uncertainty* — the front
   door. Competitors' AI agents hallucinate confidence; yours **cites and qualifies**. Novel *because*
   it's constrained. (`recommended`; `COMPETITIVE_INTELLIGENCE.md` §3 move 3.) **Feasibility: M.**
2. **Loss autopsies as the content engine.** Everyone hides losses; GSE has `LossAutopsy` as a
   first-class model (`verified`). Ship a **public live feed of "here's a pick we lost and what the
   model learned."** The thing the entire industry buries becomes your most shareable surface. **Novel.
   Feasibility: S.**
3. **Grade the user's OWN bets — against the close AND against our model.** Pikkit verifies *users*;
   GSE verifies *the model*. **Nobody fuses them.** "Connect your bets; we'll show your CLV and where our
   model agreed or disagreed." This is simultaneously a *growth* loop (personal, viral) and a *trust*
   proof (you're betting on your model in public, on the user's slip). **Novel combo. Feasibility: L.**
4. **The anti-engagement signal — "this edge is gone."** Line-movement-aware: tell the user when their
   edge has *evaporated* and to **not bet**. In an industry being sued for addictive design, a product
   that actively says "stand down" is radical, defensible, and press-worthy. **Novel posture.
   Feasibility: M** (line-movement fields exist, `verified`).
5. **Venue-agnostic fair-value feed for prediction-market traders.** Expose the vig-free probability as
   a product for Kalshi/Polymarket, not just a spread pick. First mover in the trust layer above the
   markets (`COMPETITIVE_INTELLIGENCE.md` §4 P2). **Feasibility: M.**

These are ranked: **#1 and #2 are the launch wow** (cheap, on-brand, differentiating *while the track
record is still empty* — directly answers R-1). #3–#5 are the moat-expanders for quadrant ① / ③.

---

## 6. The battle plan — sequenced, reconciled, no duplication

Ordered by *moat-integrity first, then proof, then attention, then polish.* Each item references the
doc that owns the detail — this is the **sequence**, not a re-spec.

**Phase 0 — Protect the moat (before any growth spend):**
- Settlement stale-pick alert → JARVIS RED (`RISK` #2 residual). *The moat's life-support.*
- Odds **failover** provider / thin-market penalty (`RISK` #10, MODEL_VERSION-gated).

**Phase 1 — Prove the edge (during silent collection, privately):**
- **CLV capture at lock + private CLV dashboard** (`clv.ts` exists). Decide quadrant ①/③ *before* launch.
- Probability/confidence split (`RISK` #3, MODEL_VERSION bump).

**Phase 2 — Make the truth the hero (launch wow, while record is thin):**
- Glass-box "ask why" agent + **loss-autopsy public feed** (§5 #1–#2). This is the R-1 answer.
- Track-record/`Organization` JSON-LD on `/performance` (`PRODUCTION_QUALITY_AUDIT.md` §10 — the named
  safe code win).

**Phase 3 — Earn the A+ craft grade:**
- The production audit P0/P1: web-vitals RUM beacon, HSTS then CSP, `SITE_URL` unify, skip-link + `axe`,
  `global-error.tsx` + `loading.tsx`, Lighthouse CI budgets (LCP ≤ 2.0s / CLS ≤ 0.1).

**Phase 4 — Expand the moat (quadrant-dependent, post-proof):**
- User-bet CLV grading (§5 #3), anti-engagement signal (§5 #4), venue-agnostic probability API (§5 #5).

---

## 7. Integrity note on this artifact

This is **strategy/analysis only — zero code touched, zero tests run, nothing deployed.** That is
deliberate: GSE's own non-negotiable is "a task is NOT complete until tests pass, types pass, build
succeeds" (`CLAUDE.md`), and a heavily copy-/policy-test-gated trust platform must not take an unverified
commit from a one-shot pass. The two highest-leverage **safe** code wins are already specified with exact
shapes and verification steps in `PRODUCTION_QUALITY_AUDIT.md` §10 (track-record JSON-LD) and
`AUTONOMOUS_OPERATING_SYSTEM.md` §7 (model-router + caching seam) — both behavior-preserving, both
copy-scan-safe. Hand either to an implementing session that can run `typecheck + test + build` green.

**Open founder decisions surfaced (need your call):** (1) GSE vs GSN brand; (2) confirm/deny deploy
status; (3) which scenario-③ monetization to pre-build (user-bet CLV vs tools vs education) — this is the
one bet I'd want your steer on, because it's the modal outcome.
