# Watchdog Exposure & Claim Hardening — FairPredicts, FTC substantiation, and the Kalshi dependency

**Date:** 2026-08-25
**Scope:** competitive/regulatory research + a hardening delta. **No application code changed.**
**Standard:** every external claim carries a source URL and a confidence marker. A document about
honesty standards has to meet them. Where the evidence is thin, the finding is "I could not
establish this" — not a confident narrative assembled from one press quote.

**Confidence markers used throughout:**

| Marker | Meaning |
|---|---|
| **CONFIRMED** | Multiple independent sources, or primary/authoritative source (statute, regulator, our own code). |
| **REPORTED** | Single source, or multiple outlets all traceable to one original report. |
| **UNVERIFIED** | Asserted by an interested party, or I could not establish it at all. |

---

## 0. One-line verdict

**FairPredicts itself is largely a false alarm for GSE — but the standard it advertises is not.**

FairPredicts is an exchange-focused pressure group in a lobbying war over CFTC-vs-state
jurisdiction. GSE is not an exchange, is not CFTC-regulated, and is not on anyone's list.
The exchange-economics critique (volume vs. handle vs. NGR, parlay "stat-padding",
market-maker-vs-retail mixing) is **not transferable** and pretending otherwise would be its
own version of the sin being criticised.

What *is* transferable is the through-line — **operators publish the metric that flatters them,
and categorise away what doesn't** — and that is a live, expensive exposure for GSE, but the
enforcement risk comes from the **FTC**, not from a prediction-market watchdog. The controlling
precedent is not Kalshi. It is `FTC v. WealthPress` (2023): a **subscription trading-advice
service**, sold on a **negative-option auto-renewal**, penalised **$1.7M** for performance claims
it could not substantiate. That is GSE's business model with the sport swapped out.

And GSE's honesty infrastructure is already unusually strong — `public-performance-policy.ts`,
`display-guard.ts`, `/proof`, the four-leg substantiation rule. **The gap is not the ledger.
The gap is the Edge Index**, which is presented as a calibrated 0–100 rating and is
arithmetically incapable of exceeding 50. Fixing that is the whole ballgame.

---

## Part 1 — What FairPredicts actually is

### 1.0 Source access — stated plainly

I could **not** read either primary source:

- `x.com/FairPredicts` → **HTTP 402**
- `https://fairpredicts.com/` → **HTTP 403** (verified again during this research)

Per repo scraping posture and the rules of this task, **no bypass was attempted** — no cache
tricks, no alternate front-ends, no archive mirrors used as evasion. Everything below is from
legitimately-reachable secondary sources. Several major outlets (NBC News, The Hill, Benzinga)
also returned 403 to direct fetches; where that happened I relied on search-result summaries of
those articles and on outlets that *were* reachable (Yogonet, CryptoBriefing, CasinoBeats,
InGame), and I have marked confidence accordingly.

**This matters for one specific reason:** FairPredicts' own published *standards* — the criteria
by which it judges whether "conduct matches claims" — are exactly what I could not reach. I am
therefore working from what it *says about itself in press statements*, not from a methodology
document. If such a document exists, I have not seen it.

### 1.1 What it is — CONFIRMED

- A **political nonprofit** positioning itself as a **prediction market watchdog**, launched in
  **May 2026**. Multiple outlets.
  [Yogonet](https://www.yogonet.com/international/news/2026/05/19/121071-fairpredicts-launches-ad-campaign-in-dc-targeting-kalshi-ahead-of-senate-hearing) ·
  [CryptoBriefing](https://cryptobriefing.com/fairpredicts-ad-campaign-kalshi-prediction-markets/) ·
  [CasinoBeats](https://casinobeats.com/2026/05/26/kalshi-launches-group-to-defend-against-gambling-industry-lies-amid-smear-campaign/)
- Ran a **six-figure ad campaign in Washington, D.C.** — Metro stations, mobile box trucks,
  social — **timed to a Senate Commerce hearing**. Multiple outlets, as above.
- Its self-description, quoted identically across outlets: *"a nonpartisan market integrity
  watchdog with one clear mission: holding Kalshi and other prediction market operators
  accountable for the growing gap between what they tell the public and what they actually do."*
  ([Yogonet](https://www.yogonet.com/international/news/2026/05/19/121071-fairpredicts-launches-ad-campaign-in-dc-targeting-kalshi-ahead-of-senate-hearing))
- Its campaign tagline is **"Kalshi Lies."**
  ([CasinoBeats](https://casinobeats.com/2026/05/26/kalshi-launches-group-to-defend-against-gambling-industry-lies-amid-smear-campaign/))
- **Kalshi sent it a cease-and-desist**, alleging *"publication, dissemination, and paid promotion
  of false, misleading, defamatory, and commercially disparaging statements."*
  ([CasinoBeats](https://casinobeats.com/2026/05/26/kalshi-launches-group-to-defend-against-gambling-industry-lies-amid-smear-campaign/) ·
  [Casino.org](https://www.casino.org/news/kalshi-tells-kalshilies-com-to-cease-and-desist/))

### 1.2 Who funds it — **UNVERIFIED, and this is the finding**

**I could not establish who funds or backs FairPredicts. Nobody has.**

- FairPredicts **would not comment** on funding. As a political nonprofit it is **not required to
  disclose donors**. (Reported consistently across coverage of the NBC News original.)
- **Kalshi alleges** casino/sportsbook backing — spokeswoman Elizabeth Diana: *"Smells like a
  casino-led effort"*; Kalshi says it has *"reason to believe"* the sites are funded by *"parties
  with direct competitive or financial interests."*
  ([CasinoBeats](https://casinobeats.com/2026/05/26/kalshi-launches-group-to-defend-against-gambling-industry-lies-amid-smear-campaign/))
  This is **an adversary's assertion in an active legal dispute**, not evidence. Mark it
  **UNVERIFIED**.
- No leadership, board, founder, or staff name appears in any source I could reach. **UNVERIFIED.**
- No 501(c)(4) filing, EIN, or registration record surfaced. **UNVERIFIED.**

**Do not resolve this ambiguity in either direction.** An industry-funded astroturf group and a
genuine watchdog warrant different responses, and the honest state of the evidence is that we
cannot tell which this is. Note the symmetry that makes the whole fight unreadable: Kalshi
responded by launching **its own** advocacy group, **Americans for Fair Markets** — and at the
time of the CasinoBeats report, **neither side had fully disclosed funding**.
([CasinoBeats](https://casinobeats.com/2026/05/26/kalshi-launches-group-to-defend-against-gambling-industry-lies-amid-smear-campaign/) ·
[Kalshi's own announcement](https://news.kalshi.com/p/americans-for-fair-markets-prediction-markets-advocacy))

### 1.3 What standards it applies — **UNVERIFIED**

I found **no published methodology, scorecard, rubric, or research report** from FairPredicts.
Its site is 403 to me and no secondary source quotes a standards document.

What coverage attributes to it is thematic, not methodological:
- **sports betting expansion**, and
- **the possibility of traders profiting from nonpublic political or government information**.
  ([CryptoBriefing](https://cryptobriefing.com/fairpredicts-ad-campaign-kalshi-prediction-markets/))

**Conclusion: FairPredicts is, on the public record available to me, an advertising campaign with
a mission statement — not a research organisation with a published standard.** That is not a
dismissal; a campaign can still set the frame journalists and regulators use. But it means there
is no rubric to comply with, and "what would FairPredicts say about GSE" cannot be answered by
reading their criteria, because I could not establish that they have any.

### 1.4 The regulatory pressure it connects to — CONFIRMED

Real, and much bigger than FairPredicts:

- **Senate Commerce**, Subcommittee on Consumer Protection, Technology, and Data Privacy, held a
  hearing on gambling and prediction markets in **May 2026**. Witnesses included **Patrick McHenry**
  (Coalition for Prediction Markets), **Bill Miller** (American Gaming Association), **Mary Beth
  Thomas** (Tennessee Sports Wagering Council), **Scott Sadin** (Integrity Compliance 360), and
  **Harry Levant**. Senators focused heavily on **youth exposure and social-media advertising** —
  Sen. Hickenlooper on influencer marketing, Sen. Blackburn on under-age reach. The hearing ended
  **without resolution**.
  ([InGame, 2026-05-20](https://www.ingame.com/senate-commerce-sports-betting-integrity-hearing/))
- **State gaming regulators vs. CFTC preemption** is the actual war. Nevada, New Jersey, Maryland,
  Ohio, Tennessee and New York have issued cease-and-desist letters to Kalshi; Kalshi has
  generally been winning on federal-preemption grounds — a **Third Circuit** panel held 2-1 in
  April 2026 that sports event contracts are "swaps" under the CEA and that field/conflict
  preemption shields them from state gambling law.
  ([Holland & Knight](https://www.hklaw.com/en/insights/publications/2026/04/federal-appeals-court-cftc-jurisdiction-over-sports-event-contracts) ·
  [Paul, Weiss](https://www.paulweiss.com/insights/client-memos/a-divided-third-circuit-holds-that-the-cftc-has-exclusive-jurisdiction-over-sports-related-event-contracts) ·
  [National Law Review](https://natlawreview.com/article/eventful-proceedings-kalshis-6th-circuit-battle-latest-chapter-regulatory-war))
- The **CFTC issued a proposed rule on event contracts on 2026-06-10**, amending Rule 40.11.
  ([Congress.gov CRS LSB11441](https://www.congress.gov/crs-product/LSB11441))
- **Kalshi spent nearly $500,000 in 2026 alone** lobbying Congress and the CFTC. **REPORTED**
  (NBC News original, echoed downstream).

### 1.5 The metric critique — CONFIRMED, and correctly summarised

The substantive analytical critique is **not FairPredicts'**. It is **Steve Ruddock's**
(Straight to the Point, **2026-05-28**), quoting **Jon Aguiar**. Reachable and verified directly:

- **"Combos" (parlays) are 20–25% of Kalshi's trading volume**, and each leg counts toward volume
  independently — Aguiar's *"the ultimate stat-padding kind of offering."*
- Kalshi **classifies parlays outside "sports" as "exotics"**, despite most being sports-related —
  obscuring the true share of sports activity.
- **Volume is the wrong metric**: *"Every contract is counted as $1"* even when traders churn the
  same position. The meaningful measures are **net gaming revenue (NGR) and customer deposits**.
- **Institutional market-makers (e.g. Susquehanna) are mixed in** with retail in Kalshi's numbers,
  while comparison datasets (Morgan Stanley) look at retail only — which is enough to explain
  contradictory conclusions.

([Straight to the Point](https://straighttothepoint.substack.com/p/numbers-do-lie))

The parent brief's summary of this piece is accurate. The one correction worth making: **attribute
it to Ruddock/Aguiar, not to FairPredicts.** They are separate. Conflating a named analyst's
substantive critique with an anonymous ad campaign's slogan would be sloppy in exactly the way
this document is supposed to avoid.

---

## Part 2 — What transfers to GSE, and what does not

GSE is a **subscription picks/analytics product**. It is not an exchange, holds no customer
funds, takes no positions, and has no NGR. Being rigorous about this is not defensiveness — it is
the same discipline the critique demands.

### 2.1 Does NOT transfer

| Critique | Why it doesn't apply to GSE |
|---|---|
| Volume vs. handle vs. NGR | **Exchange economics.** GSE has subscription revenue, not handle. There is no GSE metric that stands in for NGR. Importing this framing would be theatre. |
| Parlay/"Combos" volume inflation | GSE does not run a book or take wagers. Nothing to inflate. |
| Market-maker vs. retail mixing | No order flow at all. |
| Reclassifying sports as "exotics" | No product taxonomy exists that could hide revenue this way. |
| CFTC jurisdiction, state gaming cease-and-desists, CEA preemption | GSE offers **information**, not contracts or wagers. The entire Kalshi legal war is jurisdictionally irrelevant to a picks subscription. |
| FairPredicts specifically targeting GSE | GSE is not a prediction market operator. There is **no evidence** of watchdog attention to picks subscriptions, and I found none. |

**Say this out loud to anyone who raises FairPredicts internally: it is less relevant to GSE than
it first appears.** Roughly 70% of the specific critique is exchange plumbing GSE does not have.

### 2.2 DOES transfer — and this is where GSE is weakest

**(a) "Advertising claims must match conduct" — fully applicable.**
This is not a prediction-market principle. It is **Section 5 of the FTC Act**, and it binds every
advertiser regardless of gaming or CFTC status.

**(b) Metric selection and denominator choice on a published track record — fully applicable.**
This is exactly the Ruddock critique, and it is the *native* failure mode of a picks product.
The industry's standard tricks are well documented: *"deleted losing posts, edited tweets after
a halftime blowout, monthly record resets, 'premium' tiers that hide losers in a free feed, and
pushes counted as wins."*
([Vetting a Sports Handicapper](https://www.tonyspicks.com/2026/05/02/vetting-a-sports-handicapper-5-red-flags-before-you-pay-a-subscription/) ·
longer-form documentation of tout deception in
[Sports Handle, 2019](https://sportshandle.com/buyer-beware-sports-betting-touts/), which also
notes there is *"no regulatory body that holds touts accountable"* at state level.)

Note that GSE's calibration bug — **counting a PUSH as half a win** — is a *novel variant* of the
single most-cited tout deception in the literature. A hostile analyst would not need to
understand our code to land that punch.

**(c) Structurally unreachable thresholds and an uncalibrated "calibrated" score — fully
applicable, and worse than a metric-selection problem.** Metric selection is choosing the
flattering true number. An Edge Index that cannot exceed 50 while grade bands sit at 50/65/80 is
not a flattering choice — it is a scale that does not mean what the copy says it means.

### 2.3 The actual legal exposure: FTC, not CFTC

**FTC advertising substantiation — CONFIRMED, primary source.**
The FTC Policy Statement Regarding Advertising Substantiation requires that firms
*"have substantiation before disseminating a claim"* — post-hoc evidence does not cure the
violation. Reasonableness is judged on *"the type of claim, the product, the consequences of a
false claim, the benefits of a truthful claim, the cost of developing substantiation for the
claim, and the amount of substantiation experts in the field believe is reasonable."* And
critically: **where an ad states an express level of support, *"the Commission expects the firm to
have at least the advertised level of substantiation."***
([FTC Policy Statement Regarding Advertising Substantiation](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation))

> **Read that last sentence against GSE's copy.** "Calibrated confidence" is an express claim
> about the *level of substantiation*, not about the outcome. Saying a score is *calibrated*
> while calibration is default-OFF is precisely the failure mode that clause names. It is a
> worse posture than claiming a high win rate, because the claim is about the evidence itself.

**FTC v. WealthPress (2023) — CONFIRMED, primary source. This is the closest precedent to GSE.**
An investment-advice company selling recommendations *"based on a specific 'system' or 'strategy'
created by a purported expert"*, sold through *"a negative option feature – an annual subscription
that is renewed unless the consumer cancels"*, charging *"hundreds or even thousands of dollars."*
The FTC alleged it **could not show the services were likely to reap substantial profits**.
Outcome: **$1.2M+ for consumer refunds plus a $500,000 civil penalty** (~$1.7M total), and an
order **prohibiting any earnings claim without written substantiation in hand**.
([FTC press release](https://www.ftc.gov/news-events/news/press-releases/2023/01/ftc-suit-requires-investment-advice-company-wealthpress-pay-17-million-deceiving-consumers) ·
[complaint PDF](https://www.ftc.gov/system/files/ftc_gov/pdf/2123002WealthPressComplaint.pdf) ·
[case page](https://www.ftc.gov/legal-library/browse/cases-proceedings/212-3002-wealthpress-inc-et-al-ftc-v))

The civil penalty was available because WealthPress had received a **Notice of Penalty Offenses**
concerning money-making opportunities.
([FTC business blog](https://www.ftc.gov/business-guidance/blog/2023/01/if-your-company-received-ftc-notice-penalty-offenses-take-notice-action))

**Structural match to GSE: subscription ✓ · auto-renewal ✓ · expert "system/strategy" framing ✓ ·
quantified performance claims ✓ · consumer-money-at-risk domain ✓.** The only material difference
is that GSE's picks are advisory rather than executed trades — which is also true of WealthPress.

**FTC Endorsement Guides, 16 CFR Part 255 — CONFIRMED.** Revised 2023-06-29, effective
2023-07-26. Relevant to GSE if it ever runs testimonials, affiliates, influencer promotion, or
user reviews: disclosures must be *"difficult to miss"*, material connections must be disclosed,
and the Guides now reach **intermediary liability** and **consumer-review integrity**.
([eCFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255) ·
[Federal Register final rule](https://www.federalregister.gov/documents/2023/07/26/2023-14795/guides-concerning-the-use-of-endorsements-and-testimonials-in-advertising) ·
[Arnold & Porter analysis](https://www.arnoldporter.com/en/perspectives/advisories/2023/07/ftc-endorsement-guides))

**Ongoing FTC posture — CONFIRMED.** *Operation AI Comply* (announced 2024-09-25) targets
*"false or exaggerated claims about an AI product's offerings"* and has continued across
administrations.
([FTC press release](https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes) ·
[FTC blog](https://www.ftc.gov/business-guidance/blog/2024/09/operation-ai-comply-continuing-crackdown-overpromises-ai-related-lies) ·
[Benesch, one-year review](https://www.beneschlaw.com/insight/one-year-in-ftcs-operation-ai-comply-continues-under-new-administration-signaling-enduring-enforcement-focus/))
GSE markets AI-assisted prediction. Any "our AI predicts X" framing sits inside this initiative's
stated scope.

---

## Part 3 — The hardening spec (delta, not rebuild)

### 3.0 What already exists — assessed first, as instructed

**This is genuinely good, and materially better than the sector norm.** The recommendation set
below is deliberately small because of it.

| Asset | File | What it already does |
|---|---|---|
| Public performance policy | `apps/web/lib/performance/public-performance-policy.ts` | Headline is **CLV, or explicitly NOT_READY — win rate is not a member of the union**, enforced by a derivation function with no access to win/loss inputs. Rate is `wins/(wins+losses)`; **pushes and voids are population, not denominator**. Clopper-Pearson exact interval with the confidence level derived from `band.alpha` so the label cannot drift. Seed picks (`v5.0.0-seed`) excluded. Bootstrap excluded. Three named blockers gate exposure. |
| Four-leg display guard | `apps/web/lib/ledger/display-guard.ts` | No metric renders without **coverage denominator + Wilson/CP lower bound + CLV backing + walk-forward provenance**. Throws on assert; returns null on the render path. |
| Glass Ledger contract | `apps/web/lib/ledger/ledger-view.ts` | Founder-gated (`PUBLISH_LEDGER`), and the gate **does not unlock fabricated numbers** — it unlocks page *shape* only. Currently resolves to an honest empty state. |
| Proof of Record | `apps/web/app/proof/page.tsx` | Per-pick Merkle leaf + published root, generation-time commitment, per-row CLV verdict, and — importantly — **outage state is distinguished from empty state**, so a DB failure never renders as "no picks exist". Copy explicitly promises wins, losses, pushes and voids all appear. |
| Doctrine | `docs/ops/COMPETITIVE_DOCTRINE.md` | "Four-field substantiation before any public performance number"; "No-Bet is product". |

**A hostile analyst attacking GSE's *ledger* would mostly come away empty-handed.** The exposure
is not there.

### 3.1 The exposure is the Edge Index — verified at code level

This is the finding that matters, and I verified the arithmetic end-to-end rather than accepting
the brief's summary.

- `removeVig()` (`packages/prediction-engine/src/scoring.ts:70`) is **proportional
  normalisation**: `{ home: homeProb/total, away: awayProb/total }`.
- Therefore for the picked side, `fairProb = offeredProb / total`.
- `computeEdgeScore()` (`scoring.ts:280`) sets `rawEdge = pickedSideFairProb − offeredProb`
  `= offeredProb × (1/total − 1)`, which is **≤ 0 for every `total ≥ 1`** — i.e. for every
  honestly-vigged two-way market.
- When `total < 1` (sub-vig, crossed/stale/mixed-format books) `rawEdge` *could* be positive —
  but the inconsistent-market guard at `scoring.ts:308` explicitly zeroes it:
  `if (twoSidedImpliedSum < 1 && rawEdge > 0) rawEdge = 0;`
- **Therefore `rawEdge ≤ 0` unconditionally.**
- `normalized = clamp((rawEdge + 0.05)/0.10, 0, 1)`; `edgeScore = round(normalized × 100)`
  (`scoring.ts:314`, `:538`, `:747`, `:942`), which is exactly
  **`EdgeIndex = clamp(50 + 1000 × rawEdge, 0, 100)`**.

**Conclusion — CONFIRMED by construction: the Edge Index can never exceed 50.** It reaches 50 only
at `total = 1.0` exactly (a zero-vig sportsbook, which does not exist). A vanilla −110/−110 market
maps to ~26 — a number the codebase's own docstring already states.

Three consequences the code makes concrete:

1. **Lower book vig mechanically scores higher.** `rawEdge = offeredProb × (1/total − 1)`. The
   Edge Index is, to first order, **a measurement of the book's hold**, presented as our
   assessment of the play. A −105/−105 market outranks a −115/−115 market on the same game with
   the same model opinion.
2. **`computePickGrade` is effectively dead above LEAN.** It lives at
   `packages/types/src/index.ts:217–223` with hardcoded cutoffs
   (`≥85 & ≥80 → ELITE_PLAY`, `≥75 & ≥65 → STRONG_PLAY`, `≥65 & ≥50 → SOLID_PLAY`) and is called
   from all three scorers (`scoring.ts:539`, `:748`, `:943`). With `edgeScore ≤ 50`,
   **`ELITE_PLAY` and `STRONG_PLAY` are unreachable and `SOLID_PLAY` requires an exact 50.**
   In practice every engine-scored pick grades **LEAN**.
3. **A downstream gate is therefore dead code.** `packages/ingestion-pipeline/src/process-sport.ts:806–809`
   promotes a pick to Featured only when
   `pickGrade === "ELITE_PLAY" || (pickGrade === "STRONG_PLAY" && confidence >= 80)` — a branch
   the engine can never satisfy.

Two further inconsistencies found while verifying:

- **`GRADE_THRESHOLDS` in `packages/prediction-engine/src/constants.ts:36–41` is dead
  configuration** — grep shows the symbol is referenced **only at its own definition**. The live
  thresholds are the duplicated literals in `packages/types/src/index.ts`. Two sources of truth,
  one of them inert.
- **Two different, incompatible grade ladders exist.**
  `packages/ingestion-pipeline/src/generate-signal-slate.ts:78–80` grades on **confidence alone**
  (`≥80 → STRONG_PLAY`, `≥65 → SOLID_PLAY`), with no edge term. So the badge "Strong Play" means
  *two different things* depending on which pipeline produced the row — and only one of the two
  ladders can actually emit it. **This is a categorisation inconsistency of exactly the kind the
  Ruddock critique names**, and it is ours, not Kalshi's.

### 3.2 Already in flight — do not re-report as unfixed

Checked against `origin/main` (`bb0e7dfc0`) and the open branches:

- **PR #620** `claude/edge-index-copy-and-invariant` — *"remove fabricated Edge Index loss rate,
  pin the honest-market invariant."* Touches `app/faq/page.tsx`,
  `components/home/annotated-sample-signal.tsx`, and adds
  `edge-index-honest-market-invariant.test.ts` (381 lines) + `edge-index-copy-truth.test.ts`
  (261 lines). **This removes the unbacked "71 → loses ~29 in 100" line and pins the ≤50
  invariant in tests.** Open/draft, not merged.
- **PR #619** `claude/push-handling-in-rates` — *"exclude pushes from published win rates."*
  Open/draft, not merged.
- **Merged already on main:** `ff6a7a69f` *"stop claiming unconditional calibration pre-PROVEN"*,
  `ff4626fec` *"remove unbacked real-time alert claims"*, `e938004de` *"close the numeric-claims
  SAFE_CONTEXT bypass"*, plus the LQ13–LQ15 grounding commits.

**Net: the copy-level fixes are largely handled or in flight. What is NOT addressed by any open
PR is the scale itself and the grade ladder.** #620 pins the invariant and fixes the copy; it
does not change the fact that a "0–100 confidence rating" uses only the bottom half of its range,
nor that two grade ladders disagree, nor that `GRADE_THRESHOLDS` is dead.

### 3.3 Recommendations, ranked by (reputational exposure × ease)

Each: **claim at risk → what a hostile analyst says → concrete change → effort.**
Effort is engineer-days for someone fluent in this codebase.

---

#### R1 — Rescale or rename the Edge Index. **Exposure: CRITICAL · Effort: 1–2d (rename) / 3–5d (rescale)**

- **Claim at risk:** "calibrated 0–100 confidence rating."
- **Hostile read:** *"Their headline number is arithmetically capped at 50, so half the advertised
  scale is decoration. And because `rawEdge = offeredProb × (1/total − 1)`, a higher score
  literally means the sportsbook charged less vig. They are selling you a hold measurement as a
  model opinion."* This one lands without any inside knowledge — it is reproducible from the
  public FAQ plus one −110/−110 line.
- **Change — pick one, and only one:**
  - **(a) Rename + re-document (cheaper, honest).** Stop calling it a confidence rating. Call it
    what it is — a **relative pricing-edge index on a 0–50 observed range** — and publish the
    formula, the ceiling, and the vig relationship on the methodology page. Then rebase the
    displayed range so 0–50 fills the bar rather than implying a missing top half.
  - **(b) Rescale (better, costlier).** Map `rawEdge` onto a range whose endpoints are actually
    attainable, and **re-derive the grade cutoffs from the new distribution** rather than leaving
    literals at 50/65/80.
- **Do not do (c):** leave the scale and just soften the copy. That is cosmetic.
- **Depends on:** merging #620 first, so the invariant test exists before the scale moves.

#### R2 — Collapse the grade ladders to one, delete the dead one. **Exposure: HIGH · Effort: 1d**

- **Claim at risk:** the badge words "Solid Play" / "Strong Play" / "Elite Play."
- **Hostile read:** *"'Strong Play' means confidence ≥80 on one pipeline and an impossible
  edge ≥65 on another. The same badge is two different products, and on the main pipeline the top
  two tiers can never be earned. Their 'Featured' promotion gate keys off a grade the engine
  cannot emit."*
- **Change:** one grade function, one threshold table. Delete `GRADE_THRESHOLDS` from
  `constants.ts` (unreferenced) **or** make `computePickGrade` read it — never both. Reconcile
  `generate-signal-slate.ts:78–80` to the same ladder, or rename its output so it is visibly a
  different thing. Fix or remove the dead Featured branch at `process-sport.ts:806–809`.
- **Makes GSE more honest, not merely more presentable.** A grade a user can never see is a
  broken promise even if nobody complains.

#### R3 — One methodology page: every published number, defined. **Exposure: HIGH · Effort: 3–4d**

This is the parent brief's central hypothesis, and having read the code I think it is **right but
smaller than assumed** — most of the machinery is built; what is missing is the *page*.

- **Claim at risk:** all of them, collectively.
- **Hostile read:** *"Every number has a footnote somewhere in a TSX file. There is no single
  place a reader can check what the denominator is."*
- **Change:** a `/methodology` page (or a section on `/proof`) that, **for each published metric**,
  states: **definition · exact denominator · exclusions · sample size · interval and method · the
  code path that produces it**. It should be assembled *from the policy objects*, not written by
  hand, so it cannot drift:
  - Win rate → `publicPerformancePolicy.disclaimer` already contains the exact sentence.
    **Render it, don't retype it.**
  - Push/void → state plainly that pushes and voids are **in the population, not the rate**, and
    show the counts (`canonicalPushes`, `canonicalVoids` are already on the policy object).
  - **The unflattering ones must be there too:** the count of bootstrap picks excluded, the count
    of seed picks excluded, the model versions in the sample (`modelVersions` is already carried),
    and the fact that **PUSH is structurally unreachable for spreads/totals**, so a 0 in that
    column is a property of the market type, not a record.
  - Edge Index → the formula, the ≤50 ceiling, the vig relationship.
  - CLV → `beatCloseRatePct` definition, `gradedSampleSize`, the CP interval, and the 52.4%
    break-even reference.
- **Why it beats a defensive posture:** the four-leg guard already *refuses* to render an
  unsubstantiated number. Publishing the rules turns a private invariant into a checkable public
  commitment — which is the only version a watchdog cannot dismiss as marketing.

#### R4 — Audit every hardcoded numeral in customer-facing copy. **Exposure: HIGH · Effort: 2d**

- **Claim at risk:** any surviving "71 Edge Index loses ~29 times in 100"-shaped sentence.
- **Hostile read:** *"This number appears nowhere in their code. They made it up."* Under the FTC
  substantiation standard, a specific quantified performance claim with **no backing computation**
  is the textbook violation — and *WealthPress* shows the remedy includes a civil penalty.
- **Change:** #620 fixes the known instance; the `no-fake-percentages` tripwire already exists and
  `e938004de` closed a bypass in it. **Extend the tripwire to all customer-facing routes and make
  it CI-blocking**, so any future hardcoded percentage in `app/**` or `components/**` fails the
  build rather than relying on review.
- **This is the cheapest genuine risk reduction on the list.**

#### R5 — Make "calibrated" a gated word, in code. **Exposure: HIGH · Effort: 1–2d**

- **Claim at risk:** "calibrated confidence" in tier/pricing copy while calibration is default-OFF.
- **Hostile read:** *"They advertise a level of substantiation they do not have"* — which is the
  exact clause in the FTC Policy Statement (*"the Commission expects the firm to have at least the
  advertised level of substantiation"*).
- **Change:** `ff6a7a69f` already stopped the unconditional pre-PROVEN claim. Go further: make the
  word structural rather than editorial. Introduce a single `calibrationClaimAllowed` predicate
  reading the same gate the calibration pipeline reads, and have pricing/tier copy render a
  calibrated-vs-uncalibrated string **from that predicate**. Follow the precedent already set by
  `PERFORMANCE_HEADLINE_KINDS`: make the dishonest state **unrepresentable** rather than merely
  discouraged.

#### R6 — Surface the PUSH column's meaning. **Exposure: MEDIUM · Effort: 0.5d**

- **Claim at risk:** a public PUSH column that reads 0 forever.
- **Hostile read:** *"Zero pushes across the whole record? Either they're absorbing pushes into
  wins and losses, or the column is fake."* Given that "pushes counted as wins" is the canonical
  tout tell, a permanent 0 invites the worst inference available.
- **Change:** where PUSH is structurally unreachable for a market type, **label the cell as
  not-applicable rather than zero**, and say why in one line. `/proof` already promises "wins,
  losses, pushes, voids. None quietly removed" — a permanent 0 quietly contradicts that promise.
- **Honesty, not cosmetics:** it replaces a misleading number with a true statement.

#### R7 — Fix the calibration PUSH-as-half-a-win. **Exposure: MEDIUM (rising to CRITICAL at publication) · Effort: covered by #619**

- **Claim at risk:** `observedWinRate` in the calibration report.
- **Hostile read:** *"They count a push as half a win. That inflates observed accuracy in exactly
  the buckets where the model is least decisive."* Note the asymmetry: `public-performance-policy.ts`
  gets this **right** (pushes are population, not denominator) while calibration got it **wrong** —
  so the two published surfaces disagree with each other.
- **Change:** merge **#619**. Then add a cross-surface consistency test asserting the calibration
  denominator equals `eligibleForRateCount`, so the two can never drift apart again.
- **Exposure is MEDIUM only because calibration is not yet published.** It becomes CRITICAL the
  moment `PERFORMANCE_STATS_ENABLED` or the FOUNDING→PROVEN gate flips. **Merge before, not after.**

#### R8 — Endorsement/affiliate hygiene, pre-emptive. **Exposure: LOW today · Effort: 1d**

- **Claim at risk:** none yet — GSE runs no testimonials or influencer program that I found.
- **Change:** write the Part 255 rules down before the first affiliate exists: material-connection
  disclosure that is *"difficult to miss"*, no incentivised reviews, no filtered testimonials.
  Cheap now, expensive to retrofit. Note also the Senate hearing's heavy focus on **under-age
  social reach** — a GSE social/bot presence should have an age-gating posture on file even
  though no regulator is looking.

---

### 3.4 Explicitly labelled cosmetic — do NOT ship these as fixes

Stated so nobody mistakes them for hardening:

- **Adding "past performance does not guarantee future results" more places.** It is already in
  `publicMessage` and `disclaimer`. A disclaimer **does not cure an unsubstantiated claim** under
  the FTC standard — substantiation must exist *before dissemination*. More boilerplate is zero
  risk reduction.
- **Softening Edge Index adjectives while leaving the scale.** Renaming "calibrated" to "proprietary"
  changes nothing about a number capped at half its advertised range.
- **A "transparency" badge, seal, or trust-signal graphic.** Adds a claim; adds no substantiation.
- **Publishing methodology prose that is hand-written rather than generated from the policy
  objects.** It will drift within two sprints, and drifted methodology is worse than none.

### 3.5 Ranked summary

| # | Recommendation | Exposure | Effort | Honest or cosmetic |
|---|---|---|---|---|
| R1 | Rescale or rename the Edge Index | CRITICAL | 1–5d | Honest |
| R2 | One grade ladder; delete the dead table | HIGH | 1d | Honest |
| R4 | CI-blocking tripwire on hardcoded numerals | HIGH | 2d | Honest |
| R5 | Make "calibrated" structurally gated | HIGH | 1–2d | Honest |
| R3 | Single methodology page, generated from policy objects | HIGH | 3–4d | Honest |
| R7 | Merge #619 + cross-surface denominator test | MED→CRIT | in flight | Honest |
| R6 | PUSH column reads N/A, not 0 | MEDIUM | 0.5d | Honest |
| R8 | Part 255 / age-gating posture on file | LOW | 1d | Preventive |

**If only one thing ships: R1.** It is the only claim on the site that a stranger can falsify from
public information in ten minutes.

---

## Part 4 — The Kalshi dependency

### 4.1 Does GSE record market depth or liquidity? **No. Verified.**

`IndependentMarketFairValue` (`packages/types/src/index.ts:392–397`) has exactly four fields:

```ts
export interface IndependentMarketFairValue {
  source: string;                 // e.g. "kalshi"
  homeFairProb?: number | null;
  awayFairProb?: number | null;
  capturedAt?: string;            // ISO; the CLV "as-of" timestamp
}
```

**No spread. No depth. No volume. No open interest. No book count.** Once a Kalshi quote crosses
this boundary it is **structurally indistinguishable** from an Elo fit, a Poisson rate model, or
an ESPN FPI logistic. That is the whole finding.

There is a **partial** liquidity gate upstream, and it is better than nothing:

- `gateKalshiListing()` (`packages/data-ingestion/src/kalshi-listing-quote.ts`) refuses
  `missing_two_way`, `inverted_book`, `wide_spread`, `out_of_range`, `last_trade_only`,
  `not_live`, and **never accepts a trade print (`last_price`) as a quote** — only a two-way mid.
  That last point is genuinely strong and matches the Ruddock critique's own logic about volume
  vs. real pricing.
- `DEFAULT_LISTING_MAX_SPREAD = 0.1`.

But three problems:

1. **The gate's output is discarded.** `impliedYesProbability()` (`kalshi-client.ts:164–173`)
   returns `g.usable ? g.q : null` — **throwing away `g.spread`, `g.source`, and `g.refuse`.**
   The liquidity signal is computed and deleted in the same expression.
2. **0.10 is very wide for this use.** A 10-cent two-way spread on a binary means the mid can sit
   ±5pp from either side of the book. GSE's own publish threshold is
   **`SPEAK_EDGE = 0.025` (2.5pp)** (`edge-engine.ts:48`). **A quote admitted at the maximum
   tolerated spread carries twice the uncertainty of the entire edge being claimed from it.**
3. **The overround is computed and then dropped.** `KalshiFairValue.overround` exists
   (`kalshi-client.ts:104`) and is exactly the "how balanced is this book" number — but
   `toIndependentFairValue()` (`:541–572`) does not carry it through.

### 4.2 Does thinness weaken the derived edge — and would GSE know? **Yes, and no.**

- `assessIndependentEdge()` (`scoring.ts:173–188`) builds estimates as
  `independents.push({ source: fv.source, prob })`.
- `IndependentEstimate` (`edge-engine.ts:53–60`) **already declares
  `readonly weight?: number; /** Relative trust weight (default 1). */`**
- **Nothing in the codebase ever sets it.** Every source is weighted 1.0.

So a Kalshi mid derived from a 9-cent spread on a market nobody is trading counts **exactly as
much** as one from a penny-wide, deeply-traded market — and exactly as much as a 2000-game Elo
fit. Worse, because agreement drives the multiplier
(`CONFIRMS ×1.0 / SPLIT ×0.5 / CONTRADICTS ×0 / SOLO ×0.6`), **a noisy thin quote that happens to
agree can promote a pick from SOLO ×0.6 to CONFIRMS ×1.0** — a 67% uplift in credited edge
sourced from noise.

**Would GSE know? No.** Nothing persists per-market Kalshi liquidity, so there is no way to ask
retrospectively "did our thin-market Kalshi quotes underperform our thick-market ones?" The data
to answer it is destroyed at ingestion.

**The good news: the seam already exists.** `weight?: number` is declared and honoured by
`assessEdge`. This is a plumbing job, not a redesign.

### 4.3 The NaN-poisoned argmax — CONFIRMED, and worse than a wrong-event bug

`findEventTickerBySeries()` (`kalshi-client.ts:377–440`):

```ts
const delta = Math.abs(Date.parse(occ) - commenceMs);
if (delta > MAX_MARKET_START_SKEW_MS) continue;
score = -delta;
```

If `occurrence_datetime` is present but unparseable, `Date.parse` yields `NaN`:

1. **The skew guard silently fails open.** `NaN > MAX_MARKET_START_SKEW_MS` is `false`, so the
   `continue` never fires. The 12-hour "don't attach the next game's market" protection is
   **bypassed for exactly the malformed rows it most needs to catch.**
2. **The argmax latches.** `score = -NaN = NaN`; `score += 2e12` stays `NaN`. On the first
   candidate `!best` is true, so `best = { eventTicker, score: NaN }`. Every subsequent
   comparison `score > best.score` is `NaN`-compared and returns `false`. **`best` is pinned to
   the NaN candidate for the remainder of the loop** — including across other series in
   `seriesList` — and better candidates are silently discarded.

Net effect: one malformed timestamp can attach **the wrong event's markets** to a game, and the
resulting fair value flows into `independentFairValues` **carrying no marker that anything went
wrong**. It is indistinguishable downstream from a good quote.

**Recommended fix (code, not this PR):** guard `Number.isFinite(Date.parse(occ))` before use;
treat non-finite as "no occurrence data" and fall through to `parseKalshiEventTail`; and make the
argmax reject non-finite scores explicitly (`Number.isFinite(score) && (!best || score > best.score)`).
Repo precedent exists — #616 and #620 both applied the same fail-closed `Number.isFinite` pattern
to the confidence publish gate for identical reasons.

**Effort: 0.5d + tests. Exposure: HIGH** — this one produces *wrong published numbers*, not merely
overclaimed ones.

### 4.4 What to capture

Additive, no behavioural change until something reads it:

1. **Widen `IndependentMarketFairValue`** with an optional quality block — `spread`, `overround`,
   `quoteSource` (`yes_bid_ask` vs `yes_bid_no_bid_complement`), and `resolvePath`
   (`constructed` vs `series_search`). Every one of these values **is already computed today and
   then discarded.** This is capture, not new measurement.
2. **Stop discarding the gate result** — return the full `ListingQuote` from
   `impliedYesProbability`, or thread `spread`/`source` alongside it.
3. **Carry `overround` through `toIndependentFairValue`.**
4. **Then populate `weight`.** With spread captured, a monotone map (tight → 1.0, near-max →
   ~0.3) fills the field the edge engine already honours. **Do steps 1–3 first and let data
   accumulate before tuning the map** — otherwise the weights are guesses, which is precisely the
   failure this document is about.
5. **Add per-quote provenance to the pick receipt** so `/proof` rows can show which independents
   backed a pick and how liquid they were. This turns R3's methodology page from a description
   into a checkable record.
6. **Tighten `DEFAULT_LISTING_MAX_SPREAD`** once the distribution is visible. A defensible target
   is a spread materially below `SPEAK_EDGE = 0.025`, since a quote whose uncertainty exceeds the
   edge being claimed cannot honestly support that claim. **Do not tighten before measuring** —
   it may drop coverage sharply, and that trade-off should be made against real numbers.

### 4.5 Concentration risk

Kalshi is **one exchange under active, unresolved regulatory pressure** — multi-state
cease-and-desists, a divided Third Circuit, a live CFTC rulemaking (2026-06-10), Senate attention,
and an adversarial public-relations war it is fighting on two fronts (see Part 1.4).

Mitigating factors, all verified in code:

- GSE's **own doctrine already de-rates it**: *"Pinnacle CLV primary; Kalshi/Polymarket
  corroboration only"* (`docs/ops/COMPETITIVE_DOCTRINE.md`, item 8).
- Kalshi is **one of nine** independent sources in `buildIndependentFairValues()` — prefetched,
  Kalshi, ESPN FPI, ClubElo, Poisson/Dixon-Coles, Skellam, MLB standings, Elo, NFL EPA — and
  **four of the nine are computed entirely from our own stored data** (Poisson/Dixon–Coles,
  Skellam, Elo, NFL EPA), with no exchange involved.
- Every Kalshi path **soft-fails to null** (`build-independent-fair-values.ts:209–212`), and
  `isIngestible("kalshi")` fail-closes on a rights change without a code deploy.
- The client is **read-only by construction**: no API key, no signing, no `/portfolio` or
  `/orders`, and no code path that can place an order.

**Assessment: the availability risk is well-handled and the compliance posture is good.**

**The unhandled risk is quality, not availability.** If Kalshi's sports markets are thin or
market-maker-dominated — which is the *substantive* half of the Ruddock critique, and the half
that is actually about pricing rather than PR — GSE has **no instrument to detect it**, because it
throws away the only liquidity signal it collects. §4.4 is the fix, and it is cheap.

One genuinely transferable lesson from Part 1, stated precisely: **the critique of Kalshi is that
it published the flattering aggregate and categorised away the rest.** GSE's version of that
mistake is not volume — it is treating nine structurally different signals as one interchangeable
`prob` field, and publishing an "independent edge" that does not distinguish a deep exchange from
a thin one.

---

## Sources

**FairPredicts, Kalshi, and the regulatory fight**

- Yogonet — [FairPredicts launches ad campaign in D.C. targeting Kalshi](https://www.yogonet.com/international/news/2026/05/19/121071-fairpredicts-launches-ad-campaign-in-dc-targeting-kalshi-ahead-of-senate-hearing) (2026-05-19)
- CryptoBriefing — [FairPredicts ad campaign against Kalshi](https://cryptobriefing.com/fairpredicts-ad-campaign-kalshi-prediction-markets/)
- CasinoBeats — [Kalshi launches group to defend against 'gambling industry lies'](https://casinobeats.com/2026/05/26/kalshi-launches-group-to-defend-against-gambling-industry-lies-amid-smear-campaign/) (2026-05-26)
- Casino.org — [Kalshi tells KalshiLies.com to cease and desist](https://www.casino.org/news/kalshi-tells-kalshilies-com-to-cease-and-desist/)
- Kalshi — [Americans for Fair Markets announcement](https://news.kalshi.com/p/americans-for-fair-markets-prediction-markets-advocacy)
- InGame — [Senate Commerce sports betting integrity hearing](https://www.ingame.com/senate-commerce-sports-betting-integrity-hearing/) (2026-05-20)
- Straight to the Point (Steve Ruddock) — ["Numbers Do Lie"](https://straighttothepoint.substack.com/p/numbers-do-lie) (2026-05-28)
- Holland & Knight — [Federal appeals court: CFTC jurisdiction likely exclusive](https://www.hklaw.com/en/insights/publications/2026/04/federal-appeals-court-cftc-jurisdiction-over-sports-event-contracts)
- Paul, Weiss — [Divided Third Circuit on exclusive CFTC jurisdiction](https://www.paulweiss.com/insights/client-memos/a-divided-third-circuit-holds-that-the-cftc-has-exclusive-jurisdiction-over-sports-related-event-contracts)
- National Law Review — [Kalshi's 6th Circuit battle](https://natlawreview.com/article/eventful-proceedings-kalshis-6th-circuit-battle-latest-chapter-regulatory-war)
- Congress.gov CRS — [CFTC proposed rule on prediction markets (LSB11441)](https://www.congress.gov/crs-product/LSB11441)
- **Not reachable (403/402), no bypass attempted:** `https://fairpredicts.com/`, `https://x.com/FairPredicts`, nbcnews.com, thehill.com, benzinga.com.

**FTC — advertising law**

- [FTC Policy Statement Regarding Advertising Substantiation](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation)
- [FTC v. WealthPress — press release](https://www.ftc.gov/news-events/news/press-releases/2023/01/ftc-suit-requires-investment-advice-company-wealthpress-pay-17-million-deceiving-consumers) · [complaint (PDF)](https://www.ftc.gov/system/files/ftc_gov/pdf/2123002WealthPressComplaint.pdf) · [case page](https://www.ftc.gov/legal-library/browse/cases-proceedings/212-3002-wealthpress-inc-et-al-ftc-v)
- [FTC — Notice of Penalty Offenses guidance](https://www.ftc.gov/business-guidance/blog/2023/01/if-your-company-received-ftc-notice-penalty-offenses-take-notice-action)
- [16 CFR Part 255 — Endorsement Guides (eCFR)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255) · [Federal Register final rule (2023-07-26)](https://www.federalregister.gov/documents/2023/07/26/2023-14795/guides-concerning-the-use-of-endorsements-and-testimonials-in-advertising) · [Arnold & Porter advisory](https://www.arnoldporter.com/en/perspectives/advisories/2023/07/ftc-endorsement-guides)
- [FTC — Operation AI Comply announcement](https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes) · [FTC blog](https://www.ftc.gov/business-guidance/blog/2024/09/operation-ai-comply-continuing-crackdown-overpromises-ai-related-lies) · [Benesch one-year review](https://www.beneschlaw.com/insight/one-year-in-ftcs-operation-ai-comply-continues-under-new-administration-signaling-enduring-enforcement-focus/)
- [FTC — Advertising FAQs: A Guide for Small Business](https://www.ftc.gov/business-guidance/resources/advertising-faqs-guide-small-business)

**Sector context — tout deception patterns**

- Sports Handle — [Buyer Beware: Sports Betting Touts In The Era Of Legalization](https://sportshandle.com/buyer-beware-sports-betting-touts/) (Matt Schmitto, 2019-07-10)
- [Vetting a Sports Handicapper: 5 Red Flags](https://www.tonyspicks.com/2026/05/02/vetting-a-sports-handicapper-5-red-flags-before-you-pay-a-subscription/) (2026-05-02)

**Internal code read (all verified this session, at `origin/main` `bb0e7dfc0`)**

`apps/web/lib/performance/public-performance-policy.ts` ·
`apps/web/lib/ledger/display-guard.ts` ·
`apps/web/lib/ledger/ledger-view.ts` ·
`apps/web/app/proof/page.tsx` ·
`packages/prediction-engine/src/scoring.ts` ·
`packages/prediction-engine/src/edge-engine.ts` ·
`packages/prediction-engine/src/constants.ts` ·
`packages/types/src/index.ts` ·
`packages/data-ingestion/src/kalshi-client.ts` ·
`packages/data-ingestion/src/kalshi-listing-quote.ts` ·
`packages/ingestion-pipeline/src/build-independent-fair-values.ts` ·
`packages/ingestion-pipeline/src/process-sport.ts` ·
`packages/ingestion-pipeline/src/generate-signal-slate.ts` ·
`docs/ops/COMPETITIVE_DOCTRINE.md`
