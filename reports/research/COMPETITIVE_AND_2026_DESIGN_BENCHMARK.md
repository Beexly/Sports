# Competitive & 2026 Design Benchmark — Galaxy Sports Edge (GSE)

> **Purpose.** One reference doc to steer a live rebuild aimed at being the *best overall sports-intelligence website of 2026*. GSE is intelligence, not a sportsbook: calibrated signals + decision discipline + receipts. Its moat is honesty — public calibration, closing-line value (CLV), a "No-Bet" discipline, and self-grading in the open.
> **Research window:** 2025–2026 sources prioritized. Every load-bearing claim carries an inline source. Where a figure varied across sources or could not be confirmed, it is flagged.
> **Date compiled:** 2026-06-19.

---

## 0. The thesis in one paragraph

Every credible forecasting brand — political (538), general (Metaculus, Good Judgment), and market (Manifold) — proves itself the same way: **they publish calibration ("when we say X%, it happens ~X% of the time") and a proper score (Brier/log) over a large settled sample, and they show their bad periods too.** Almost no sports-betting competitor does this, because their records would not survive it. That gap *is* GSE's open lane. The betting-native version of a proper score already exists and is respected by sharps — **Closing Line Value (CLV)** — and it lets GSE demonstrate edge on a *small* sample, before it has hundreds of settled results. Combine a Manifold-style calibration plot, a Brier/CLV headline number, sample sizes + timestamps on every stat, and a de-AI'd, fast, accessible front door, and GSE occupies a position no incumbent currently holds: the sports brand that grades itself in public and is right to.

---

## 1. Competitive Teardown

The real incumbents fall into four buckets: **(A) betting media + tools**, **(B) sharp/quant tools**, **(C) fantasy-consensus aggregators**, **(D) verified trackers**, plus the **(E) tout** anti-pattern GSE must visibly repudiate. Prices below are 2025–2026 and noted where sources disagreed.

### A. Betting media + tools

**The Action Network** — *Positioning:* the mainstream betting-media + tools hub (news, odds, bet tracking, public betting %). **Does well:** strong brand and content volume; "PRO Report," public-money %, PRO Projections and Systems; mature bet-syncing UX. **Weak:** it is a *media* business — picks/projections are presented without a unified, public, audited calibration record; heavy upsell. **Pricing:** PRO is commonly cited at ~$19.99/mo or ~$99.99/yr, but pricing has shifted and sources disagree (some list monthly far higher with deep annual discounts) — treat the exact number as volatile and verify at point of comparison ([pricing page](https://www.actionnetwork.com/pricing); [subscription options](https://actionnetworkhq.zendesk.com/hc/en-us/articles/14456167617805-Subscription-options); [oddsplays review](https://oddsplays.com/reviews/action-pro/)).

**Establish The Run (ETR)** — *Positioning:* "the best football information available, period" — expert-led (Evan Silva, Adam Levitan) subscription analytics for NFL DFS, season-long fantasy, and player props. **Does well:** respected analyst voice; projections auto-sync into The Solver optimizer; mature *honest* trust posture — the FAQ explicitly disclaims guarantees ("if you think it's important that someone provides or implies some sort of guarantee about results, you're in the wrong place") ([FAQ](https://establishtherun.com/faq/)). **Standout (partial proof):** ETR actually **publishes multi-season W-L + ROI on its NBA props** with stated methodology (e.g., 2021-22: 751-495, +14.0% ROI; 2023-24: 683-432, +14.73% ROI) and weekly NFL "Props Review" win/loss recaps "for full transparency" ([NBA props overview/FAQ](https://establishtherun.com/nba-etr-player-props-overview-and-faq/)). **Weak:** record is shown only on *sub-products* (props), with **no CLV and no aggregate calibration** on flagship projections; product sprawl / à-la-carte paywall fatigue; brand leans on "subscriber wins $1M" survivorship banners. **Pricing:** NFL Draft Kit $34.99/season; Draft Kit PRO $54.99; Pro + In-Season bundle $299.99; NBA Player Props $89.99/week ([subscribe](https://establishtherun.com/subscribe/)).

**Pinnacle — "Betting Resources" content** — *Positioning:* "the world's sharpest bookmaker" (low ~1.5–3% margin, "winners welcome") using *education* as authority. Their [Betting Resources hub](https://www.pinnacle.com/betting-resources/en) is "the most comprehensive collection of expert betting advice anywhere online" (1,000+ pieces), written by named credible contributors (e.g., Joseph Buchdahl). **Does well:** the masterclass in **content-as-trust** — neutral, no-hard-sell, no-registration tone teaching the hard honest concepts (EV, variance, margins/vig, implied probability). It even publishes a dedicated [CLV explainer](https://www.pinnacle.com/betting-resources/en/educational/what-is-closing-line-value-clv-in-sports-betting) giving the formula (CLV% = Closing Odds / Bet Odds − 1) and calling CLV "the single best predictor of long-term profitability." **Weak (for GSE's purpose):** it teaches the metric but **never publishes its own quantified calibration/CLV report** (not its business); it is a book, not a graded-pick product; and it is **not legally available in the US** — so it can't be GSE's direct competitor. **Lesson:** GSE should out-Pinnacle Pinnacle on honest education, then add the self-scorecard Pinnacle has no reason to show — and serve the US market Pinnacle can't.

**The Athletic (betting/odds coverage)** — *Positioning:* premium sports journalism with betting context woven in. **Does well:** editorial craft, typography, reading experience — the gold standard for *written* sports product. **Weak:** betting content is analysis/narrative, not a calibrated, auditable signal feed; no public accuracy ledger. **Pricing:** general subscription (subscription-news model). **Lesson:** steal the editorial restraint and typographic quality; reject the "no scoreboard on ourselves" posture.

### B. Sharp / quant tools

**Unabated** — *Positioning:* sharp-bettor toolkit (real-time odds screen, devig, the "Unabated Line"). **Does well:** the **Unabated Line** is a vig-free consensus from market-making books (Pinnacle/Circa/Bookmaker), so you can see the sharp price without knowing which book is sharpest; the odds screen highlights negative synthetic hold (green = edge to you) and fades line-move highlights by recency — genuinely good data-density UX ([review](https://www.betsmart.co/tool-reviews/unabated); [no-vig calculator](https://unabated.com/betting-calculators/no-vig-fair-odds-calculator); [game odds screen explainer](https://unabated.com/articles/learn-about-the-game-odds-screen)). **Weak:** steep learning curve; it's a power-tool for pros, not a guided, calibrated intelligence product; no narrative discipline layer. **Pricing:** Props+ tier ~$99/mo (~$83/mo annual) ([review](https://www.betsmart.co/tool-reviews/unabated)).

**Outlier.bet** — *Positioning:* "the last tab you need before placing a bet" — a research/analytics app, explicitly **not** a pick-seller, player-prop-first. **Does well:** clean mobile data tooling with deep splits (last 5/10/20, home/away, vs. specific opponent/defense, without-a-teammate), injury context, best-line surfacing; a +EV feed, arb scanner, and sharp-book odds at the top tier; 7-day free trial ([review](https://www.bettingnews.com/tools/outlier-bet-review/); [Odds Shark](https://www.oddsshark.com/sports-betting-products/outlier)). **Weak:** the differentiating layer (+EV feed, arb scanner, sharp odds) is locked behind the top Pro tier; research utility, not a self-graded forecast — honest by being a tool, not a tout. **Pricing:** Premium $19.99/mo ($199.99/yr), Premium+ $29.99/mo ($299.99/yr), Pro $79.99/mo ($359.99/yr) ([plans](https://help.outlier.bet/en/articles/12556823-choosing-the-right-outlier-plan-for-your-betting-style); [review](https://www.bettingnews.com/tools/outlier-bet-review/)).

**Props.Cash** — *Positioning:* fast player-prop research / "prop & pick finder." **Does well:** best-in-class **data-visualization speed** ("scan 20 props in the time it takes to look up two") and deep filtering — home/away, last 3/5/7/10/20 or custom windows, matchup grade vs. defense at position, with/without a teammate, H2H history; strong value at the price ([props.cash](https://props.cash/); [review](https://www.betsmart.co/tool-reviews/props-cash)). **Weak:** a research surface, not an accountable forecast; no public calibration of *its own* projections. **Pricing:** $19.99/mo or $199.99/yr (~$16.67/mo) ([review](https://www.betsmart.co/tool-reviews/props-cash)).

### C. Fantasy-consensus aggregators

**FantasyPros** — *Positioning:* the consensus authority — **Expert Consensus Rankings (ECR™)**, *and* it ranks the experts themselves by accuracy. **Does well (the public-accuracy reference model):** runs a documented, multi-year **public expert-accuracy competition** with named leaderboards back to ~2009 (150–191 experts), using an "Accuracy Gap" method (predicted vs. realized points, lower-is-better) and publishing named annual winners ([accuracy hub](https://www.fantasypros.com/nfl/accuracy/); [methodology](https://www.fantasypros.com/about/faq/football-draft-accuracy-methodology/)). This public leaderboard is itself a brand-defining trust moat. **Weak (the key nuance):** it grades *third-party experts'* rankings, in fantasy, **with no CLV and no calibration of its own projection** — accountability is pointed outward, not at the house. Tool bugs (sync/auto-pilot) dent trust. **Pricing:** PRO $11.99/mo (~$3.99/mo annual), MVP $16.99/mo, HOF $22.99/mo ([pricing](https://support.fantasypros.com/hc/en-us/articles/25996886459931)).

**BettingPros** — *Positioning:* FantasyPros' betting sibling — "all-in-one betting companion" aggregating 150+ handicappers into **consensus picks** (spreads/totals/props) with a prop analyzer (1–5 star EV grading + cover probability) ([top picks](https://www.bettingpros.com/nfl/top-picks/); [review](https://www.betsmart.co/tool-reviews/betting-pros)). **Does well (partial proof — the betting analog):** unlike most, it **runs public Win%/Units accuracy leaderboards** with documented grading (1–3 units; ranked by Win% for ATS/totals, Units for moneylines) and publishes select records ([accuracy](https://www.bettingpros.com/nfl/accuracy/); [grading docs](https://support.bettingpros.com/hc/en-us/articles/4723735768987)). **Weak:** **no CLV; self-reported, not independently audited;** some reviewers report "zero transparency" on the premium EV tools; sportsbook-promotion conflict ([Ask the Bookie](https://www.askthebookie.com/review/bettingpros/)). More transparent than a tout, short of true CLV-based calibration — *the brand to beat on verifiable accuracy.* **Pricing:** ~$29.99/mo discounting to ~$10/mo annual (sources disagree; free annual via partnered books).

**Rotowire** — *Positioning:* 25-year premium fantasy + betting data incumbent; "Best Picks & Prop Bets," "Smart Money" sharp-action tool ([picks](https://www.rotowire.com/picks/)). **Does well:** daily-refreshed projections; lineup optimizer; its ATC baseball projections are independently validated by FanGraphs ([feature list](https://www.rotowire.com/article/rotowire-premium-subscription-features-benefits-95423)). **Weak:** July 2025 redesign + shift from one-time purchase to subscription drew backlash; actionable analysis paywalled; **markets accuracy heavily but publishes no self-hosted verified accuracy/CLV ledger** on its betting product. **Pricing:** Season-Long ~$7.99–$14.99/mo; DFS $49.99/mo; Smart Money $199.99/mo (figures vary; JS-rendered pages).

### D. Verified trackers (closest in *spirit* to GSE — and partial validators of the thesis)

**Pikkit** — *Positioning:* "real bets, real people" — free multi-book **bet tracker** whose hook is exactly GSE's wedge: every bet is measured against the closing line, "if you're consistently beating the closing line, you're betting like a sharp." **Does well (the un-fakeable mechanism):** **BookSync** auto-imports every bet from 30+ sportsbooks the moment it's placed and — crucially — **Pikkit does NOT allow manual bet entry**, so every stat and leaderboard is verified-by-sync and impossible to fake; CLV tracked automatically ([BookSync](https://pikkit.com/booksync); [CLV tracker](https://pikkit.com/closing-line-value); [review](https://www.betsmart.co/tool-reviews/pikkit)). **Pricing:** free; Pikkit Pro $39.99/mo adds CLV analysis, alerts, exports ([Pro review](https://www.pinnacleoddsdropper.com/blog/pikkit-pro-review)). **Why it matters:** Pikkit proves *demand* for CLV-as-truth and for verified records — but it grades the **user's** bets, not its own forecasts. **GSE's move:** apply Pikkit's "no manual entry / system-synced" honesty to GSE's *own published signals.*

**Juice Reel / betstamp** — verified picks marketplaces / trackers built specifically to kill fake screenshots: Juice Reel runs "the world's first verified picks marketplace where every seller's record is synced and fully transparent — no fake screenshots or inflated stats," and **bans manual entry** so data can't be faked; betstamp offers third-party record verification ([Juice Reel](https://www.juicereel.com/); [betstamp on pick-seller scams](https://betstamp.com/education/this-is-how-pick-sellers-scam-sports-bettor)). **Lesson:** "un-fakeable, synced, public" is the trust primitive of 2025–2026. GSE's records must be *generated and timestamped by the system,* never hand-curated.

### E. The tout anti-pattern (what GSE must visibly NOT be)

Tout / "guaranteed lock" pick-sellers are the distrusted default of the category. Documented tactics: **double-siding** (give opposite picks to different client segments so *someone* always wins and can be marketed); **deleting losing picks / resetting the record** when it turns south; **doctored screenshots and handpicked testimonials**; and **misaligned incentives** (some touts are paid on referred players' *net losses* — they profit when you lose). There is hard fraud precedent — a 2022 federal case involving fake names, "privileged intel," and **$25M+ stolen** ([Birches Health on touts](https://bircheshealth.com/resources/sports-betting-touts); [betstamp on pick-seller scams](https://betstamp.com/education/this-is-how-pick-sellers-scam-sports-bettor); [AARP](https://www.aarp.org/money/scams-fraud/online-sports-betting-scams-flourish/)). **Strategic implication:** the entire category is primed to distrust accuracy claims, and verified-record platforms (betstamp: picks "can never be hidden or deleted"; Juice Reel) already exist *specifically to defeat tout fraud.* GSE's honesty surface is not just nice — an **un-deletable, system-generated, timestamped record is the structural attack** on the tout model.

### The open lane — where GSE wins

The market splits into four honesty postures. **The open lane is the empty fifth row** — and no major player occupies it:

| Posture | Who | What they prove | The gap |
|---|---|---|---|
| Teaches CLV, free, no own record | **Pinnacle** | The concept (best educator) | No self-scorecard; US-inaccessible |
| Verifies the *user's* bets + CLV (un-fakeable sync) | **Pikkit, betstamp, Juice Reel, Action Network** | Individual records can't be faked | No calibrated *house* prediction |
| Grades *third-party experts*, no CLV | **FantasyPros** (gold standard), **BettingPros** | Named public accuracy leaderboards | Not their own model; no CLV; self-reported (BP) |
| Grades *own* picks, partial, no CLV | **ETR** (props only) | Honest multi-year W-L / ROI | No CLV; only on sub-products |
| Hides the record entirely | **The Athletic, Rotowire (betting), touts** | — | No accountability at all |
| **Own model's calibration + CLV, audited, on ALL picks (incl. confidence on free picks)** | **— nobody —** | **—** | **This is GSE's lane** |

**No incumbent publishes its own model's calibration AND CLV, verifiably, across all picks.** Pinnacle teaches the metric but never scores itself; the verified-tracking apps score *users*, not a model; FantasyPros/BettingPros score *third-party experts* without CLV; ETR scores *itself* but only on props and without CLV. That empty quadrant is the lane, and it maps exactly onto GSE's existing design (calibrated 0–100 confidence, confidence shown even on free picks, versioned/auditable picks, public calibration). GSE's job: make the proof so legible and so obviously un-fakeable that its absence everywhere else becomes the story. (Consistent with GSE's named ladder — FOUNDING → PROVEN at ≥100 settled + published calibration → ESTABLISHED at ≥500 settled + verified CLV ≥52.4% → AUTHORITY.)

*Honest limit:* this confirms none of the ~12 reviewed incumbents publish own-model CLV; it cannot prove no obscure service anywhere does (absence of evidence). Several prices are flagged volatile (Action Network PRO, BettingPros tiers, Rotowire annual) where vendor pages were JS-rendered/403-blocked and sources disagreed.

---

## 2. What "Best Overall Website of 2026" Means

### 2.1 Directions that read premium and HUMAN (not AI-template)

As AI floods the web with averaged output, **craft signals** — authorship, restraint, dimension, intentional motion — now read as premium. Designers are described as "negotiating the growing influence of AI without surrendering authorship" and "revisiting tactility, imperfection, and emotion in response to an increasingly synthetic digital environment" ([It's Nice That, graphic trends 2026](https://www.itsnicethat.com/features/forward-thinking-graphic-trends-2026-graphic-design-120126); [Top CSS Gallery — award-gallery trends](https://www.topcssgallery.com/blog/web-design-trends-dominating-award-galleries/)).

- **Editorial typography as the hero.** Almost every award-winning site uses "bold, expressive typography as the hero element"; high-contrast serifs return in editorial contexts; type is doing brand + scanning + AI-summary structuring at once ([DesignMonks typography 2026](https://www.designmonks.co/blog/typography-trends-2026); [WriterDock](https://writerdock.in/blog/bento-grids-and-beyond-7-ui-trends-dominating-web-design-2026)).
- **Bento grids + dark mode** are the established, production-safe layout system — modular tiles where each tile's purpose is obvious but the whole feels unified; high information density without a mobile-performance penalty ([WriterDock](https://writerdock.in/blog/bento-grids-and-beyond-7-ui-trends-dominating-web-design-2026); [Naturaily 2026 trends](https://naturaily.com/blog/web-design-trends)). This fits a data-dense intelligence cockpit exactly.
- **Purposeful motion + micro-interactions**, platform-native (CSS/modern browser APIs) over heavy JS; depth and cinematic transitions treated as experience, not decoration ([Top CSS Gallery](https://www.topcssgallery.com/blog/web-design-trends-dominating-award-galleries/)).
- **Restraint over maximalism.** The reality-check literature is explicit: flashy demo trends (kinetic typography, maximal 3D) "almost never ship in production"; bento + dark mode are what actually held up ([Studio Meyer — what actually held up](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check); [dev.to mirror](https://dev.to/studiomeyer_io/web-design-trends-2026-what-actually-held-up-after-six-months-23p8)). **Quiet earned confidence > density** — directly on GSE's founder voice.
- **Speed is now a premium signal.** "By 2026, speed will become part of the premium user experience itself" ([SpinX](https://www.spinxdigital.com/blog/best-website-design/)) — see §2.5.

### 2.2 Anti-patterns that scream "AI-generated / generic SaaS"

Root cause: **distributional convergence.** LLMs predict the most probable next token, so unconstrained they return "the lowest common denominator of design trends from 2020–2024" — an "aesthetic monoculture" ([925 Studios — AI Slop Web Design](https://www.925studios.co/blog/ai-slop-web-design-guide); [prg.sh — Why Your AI Keeps Building the Same Purple Gradient Website](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)). The named tells GSE must avoid:

- **Purple→blue / indigo gradient hero.** Traces to Tailwind's `bg-indigo-500` default (~5 yrs ago) saturating training data; it signals "no brand decision was made" ([prg.sh](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website); [Braingrid](https://www.braingrid.ai/blog/design-system-optimized-for-ai-coding)).
- **Three identical feature cards** (icon + heading + line), and "card-nesting" (cards inside cards) because the model "knows cards are a common pattern" but not hierarchy ([prg.sh](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)).
- **Vague aspirational hero copy** ("Build the future of work," "Your all-in-one platform") — "statistically averaged platitudes." Contrast with specific human copy: Stripe's "Financial infrastructure for the internet," Linear's "Plan and build products" ([925 Studios](https://www.925studios.co/blog/ai-slop-web-design-guide)).
- **Default type (Inter/Roboto/system).** Inter is the default in nearly every AI tool — using it signals no type decision ([925 Studios](https://www.925studios.co/blog/ai-slop-web-design-guide)).
- **Generic stock/AI imagery** ("diverse group around a laptop," "abstract 3D blobs") with a "plastic quality" ([925 Studios](https://www.925studios.co/blog/ai-slop-web-design-guide)).
- **Glassmorphism overload + uniform sizing** — every element the same 16px radius / 24px padding / 0.1-opacity shadow; flatness *instead of* hierarchy ([prg.sh](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website); [BSWEN anti-patterns guide](https://docs.bswen.com/blog/2026-03-20-ai-generated-ui-anti-patterns/)).
- **Floating-screenshot hero, dead hover states, missing empty/error/loading states** — superficial polish without functional depth ([925 Studios](https://www.925studios.co/blog/ai-slop-web-design-guide); [prg.sh](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)).

**Antidote = authored constraints:** a real semantic color system (not indigo), specific/concrete copy, a deliberate type pairing (avoid Inter/Roboto), real data/screenshots over stock, genuine visual hierarchy, and motion with intent. (Maps onto GSE's existing `color-roles` / `design-tokens` / `check-claims` / states discipline.)

### 2.3 Progressive disclosure for data-dense products (NN/g)

NN/g: progressive disclosure "defers advanced or rarely used features to a secondary screen, making applications easier to learn and less error-prone" — show the few most important options first, reveal specialized options on request ([NN/g — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)). Load-bearing rules:

- **Disclose what users frequently need up front;** make the disclosure control obvious and labeled so it sets clear expectations for what's behind it.
- **Decide placement with data** — task analysis, frequency-of-use, usability testing — not guesswork.
- **Hard limit: never exceed two disclosure levels** — beyond two, "users often get lost moving between the levels."
- Put things "in predictable places, use a clear visual hierarchy, and take advantage of progressive disclosure" ([NN/g — Managing Visual Complexity](https://www.nngroup.com/videos/managing-visual-complexity/)).

Applied to GSE: **lead with the pick + confidence; tier the factor trail / line movement / model version one level down; stop at two levels.** (A circulating "reduces cognitive load by ~55%" stat attributed to NN/g could **not** be confirmed on a primary NN/g page — do not cite it.)

### 2.4 Trust / proof UX — presenting accuracy honestly

**NN/g's four credibility factors** ([NN/g — Trustworthy Design](https://www.nngroup.com/articles/trustworthy-design/); [Communicating Trustworthiness](https://www.nngroup.com/articles/communicating-trustworthiness/)):

1. **Design quality** — "the first step to garnering trust is to make your site appear legitimate and professional"; typos/broken links/slowness degrade credibility (so §2.1 craft and §2.5 speed are *trust* issues).
2. **Up-front disclosure** — show methodology, sample size, pricing transparently; don't bury how confidence is derived. (A study participant rejected a vendor purely because "they don't state the rate here.")
3. **Comprehensive, current content** — show the *process* (factor trail, calibration method), not just a win-rate banner; stale/inconsistent content makes users "instantly lose faith."
4. **Connected to the rest of the web** — "third-party sites are much more credible than anything you can say yourself"; linking out is "a sign of confidence." Prefer externally verifiable proof over self-asserted accuracy.

NN/g also: trust is **slow to build, instant to lose** — "a single violation of trust can destroy years of slowly accumulated credibility," and users leave within ~10–20 seconds unless you prove worth.

**Baymard caution — proof can backfire.** ~19% of shoppers have abandoned checkout because they "didn't trust the website with their credit card information"; but trust signals' effect ranges widely and **poorly-placed signals can *reduce* conversion** by "introducing friction or raising questions users hadn't previously considered" ([Baymard-based summary](https://www.userintuition.ai/reference-guides/trust-ux-badges-proof-and-the-research-behind-them/); [TrustSignals on Baymard](https://www.trustsignals.com/blog/trust-badges-work-and-we-have-the-receipts-to-prove-it)). **Lesson:** a proof element must answer the *specific* doubt the user feels at that moment — not blanket badge-spam. For GSE: real, dated, n-backed numbers with disclosed methodology and limits beat any badge; honesty *is* the conversion strategy.

### 2.5 Performance + Core Web Vitals (2025–2026) — VERIFIED

Confirmed against Google's [web.dev — Defining the Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds):

| Metric | Good | Poor (NI is between) | Measures |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | **≤ 2.5 s** | > 4.0 s | Loading |
| **INP** (Interaction to Next Paint) | **≤ 200 ms** | > 500 ms | Responsiveness |
| **CLS** (Cumulative Layout Shift) | **≤ 0.1** | > 0.25 | Visual stability |

- **Assessment rule:** a metric passes when **≥75% of page views (75th percentile)** hit "good" ([web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds)).
- **INP replaced FID on March 12, 2024** ([web.dev — INP becomes a Core Web Vital](https://web.dev/blog/inp-cwv-march-12); [Google Search Central — Introducing INP](https://developers.google.com/search/blog/2023/05/introducing-inp)).
- **Why it matters:** CWV are a Google ranking signal *and* a perceived-quality proxy; LCP is the hardest to pass in the field (per 2025 Web Almanac coverage, only ~62% of mobile pages hit good LCP) ([OWDT 2025 guide](https://owdt.com/insight/how-to-improve-core-web-vitals/); [corewebvitals.io](https://www.corewebvitals.io/core-web-vitals)). For a data-dense cockpit, **reserve space for async data (no CLS) and keep interaction latency under 200ms** as the dashboard updates.

### 2.6 Accessibility — WCAG 2.2 AA essentials

**WCAG 2.2** became a W3C Recommendation **Oct 2023**; it adds **9 success criteria** over 2.1 and **removes 4.1.1 Parsing** ([W3C — What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)). The new A/AA criteria a 2.2-AA target must satisfy:

- **2.5.8 Target Size (Minimum), AA** — interactive targets **≥ 24×24 CSS px** (or sufficient spacing). *Most likely new gap on cockpit controls.*
- **2.4.11 Focus Not Obscured (Minimum), AA** — a focused element must stay at least partly visible (sticky headers/footers can't fully cover it).
- **2.5.7 Dragging Movements, AA** — any drag needs a single-pointer alternative.
- **3.3.8 Accessible Authentication (Minimum), AA** — no cognitive-function test (puzzles/transcription) to log in without an alternative.
- **3.2.6 Consistent Help** and **3.3.7 Redundant Entry** (both Level A).

**Contrast (carried from 2.1, verified at W3C):**
- **1.4.3 Contrast (Minimum), AA:** **4.5:1** normal text, **3:1** large text (large = 18pt/≈24px or 14pt-bold/≈18.5px); values are **not rounded** — "4.499:1 would not meet 4.5:1" ([W3C — Understanding 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).
- **1.4.11 Non-text Contrast, AA:** **3:1** for UI components, focus indicators, and meaningful graphics ([W3C — Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)).

For GSE's **dark theme**, the **4.5:1 / 3:1 / 3:1** trio is the load-bearing constraint (directly relevant to the existing `contrast` and `color-roles` skills); confidence-color and chart encodings must never rely on color alone.

---

## 3. Accuracy-Proof Presentation — how credible brands prove they're right

The unifying pattern: **credible forecasters do not advertise win rates. They publish *calibration* + a *proper score* over a *large settled sample*, and they show the bad years.** That is the surface GSE should copy.

### 3.1 FiveThirtyEight (538)
Their canonical framing is literally GSE's voice: out of all forecasts giving ~75%, the event "should in fact win about 75 percent of the time over the long run"; their headline piece was ["When We Say 70 Percent, It Really Means 70 Percent"](https://fivethirtyeight.com/features/when-we-say-70-percent-it-really-means-70-percent/) (538 has since folded into ABC; URL now redirects, framing well-documented). They visualize it as a **reliability diagram** (predicted-probability bucket on x, observed frequency on y, 45° diagonal = perfect), broken out **per forecast family** (NBA/NFL/MLB/March Madness separately), benchmark with **Brier scores**, and publish frank "checking our work" retrospectives even after bad years ([How Well Did Our Sports Predictions Hold Up](https://fivethirtyeight.com/features/how-well-did-our-sports-predictions-hold-up-during-a-year-of-chaos/); [The NCAA Bracket: Checking Our Work](https://fivethirtyeight.com/features/the-ncaa-bracket-checking-our-work/)).
**ADOPT:** a public calibration plot as the centerpiece, **per sport**, with a plain-English headline ("When we say 65%, it hits about 65%"), and the radical honesty of publishing down periods.

### 3.2 Metaculus
Public [Track Record](https://www.metaculus.com/questions/track-record/) + [FAQ methodology](https://www.metaculus.com/faq/): a calibration curve plus **proper scores** — **Brier** (their community scored ~0.107–0.111 on resolved binaries, "best accuracy of any public platform" per third-party reviews) **and log score** — and **per-user** track-record pages. UX discipline: they deliberately align charts so **"good" always points the same direction** (Log, Brier, Points all up-and-to-the-right) so a lay reader isn't confused by "lower is better" on one chart.
**ADOPT:** give every public number a **proper score** (Brier and/or log) that can't be gamed by sandbagging confidence; make "good" point the same way on every chart.

### 3.3 Good Judgment / Good Judgment Open / Tetlock
The IARPA-funded Good Judgment Project *defined* modern skill measurement: **Brier score + calibration + accuracy vs. resolved outcomes**; "superforecasters" are *defined by* scores (~**0.15–0.20 Brier**) and beat experts and even prediction markets ([AI Impacts summary](https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/); [Mellers et al., Stanford](https://stanford.edu/~knutson/nfc/mellers15.pdf)). Brier decomposes into **calibration** (honest probabilities) and **resolution** (willingness to move off 50% and still be right). GJ Open ranks forecasters on a public Brier leaderboard.
**ADOPT:** treat **Brier as the headline skill number** (it maps cleanly onto GSE's 0–100 confidence), and use the **calibration-vs-resolution** distinction honestly: GSE must show it is calibrated *and* that it confidently separates strong picks from coin flips (a perfectly-calibrated but always-50% product is useless).

### 3.4 Prediction markets (Manifold / Kalshi / Polymarket)
**Manifold's [public calibration page](https://manifold.markets/calibration) is the cleanest reliability diagram on the web** and the direct model to copy. In their words: *"This chart shows whether events happened as often as we predicted… A dot at 70% on the x-axis should appear at 70% on the y-axis if exactly 70% of those markets resolved yes."* They show a numeric Brier-style score (≈**0.174**, sampled from ~95k trades on binary questions with 15+ traders), split YES/NO bets, give **every user their own** `/<user>/calibration` page, and **candidly disclose a caveat** (large miscalibrated trades get corrected instantly, which can flatter the metric). A 2024-election study scored Kalshi/Polymarket on **log-loss and Brier**, finding Kalshi "almost perfectly accurate" on *calibration* even where directional accuracy diverged — reinforcing that **calibration and "did you pick the winner" are different questions** ([DL News study coverage](https://www.dlnews.com/articles/markets/polymarket-kalshi-prediction-markets-not-so-reliable-says-study/)).
**ADOPT:** build GSE's calibration page **on the Manifold pattern** — diagonal reference line, dots by confidence bucket, hover-to-see-n, one plain sentence ("whether games happened as often as we predicted") — enforce **binary resolution** (every pick → WIN/LOSS/PUSH), and **disclose the metric's caveats in-page.**

### 3.5 Sharp betting — CLV as the domain-native gold standard
**CLV** = the difference between the line you took and the **closing** line. The closing line is the market's most-informed estimate (all sharp money/news absorbed); beating it consistently is *mathematically* a signal of edge **independent of whether the bet won** ([OddsJam](https://oddsjam.com/betting-education/closing-line-value); [VSiN](https://vsin.com/how-to-bet/the-importance-of-closing-line-value/); [Pikkit](https://pikkit.com/blog/how-to-track-closing-line-value-clv-in-sports-betting); [Sharp Football](https://www.sharpfootballanalysis.com/sportsbook/clv-betting/)). The killer arguments for GSE: it is "the single best predictor of long-term success," at ~2,000+ bets beating the close the probability you're genuinely profitable "exceeds 95%," and — rhetorically devastating against touts — **sportsbooks limit/ban the bettors who consistently beat the close**, i.e., the market itself treats CLV as proof of skill.
**Why it's perfect for a young brand:** CLV grades each pick against an objective benchmark, so GSE can **demonstrate edge on a small sample, before it has hundreds of settled W/L results.** It is the betting world's proper score.
**ADOPT — the single most important adoption for this domain:** capture line-at-publish and closing line for every pick; surface **% of picks beating the close** and **average CLV** as a flagship number. (GSE's ladder already gates ESTABLISHED on "verified CLV ≥ 52.4%" — 52.4% being break-even vs. standard −110 juice.)

### 3.6 Definitions for an in-product "How we measure ourselves" page
- **Calibration / reliability diagram** — calibrated = events predicted at X% occur ~X% of the time; plot predicted (x) vs. observed (y), diagonal = perfect, above = underconfident, below = overconfident ([scikit-learn calibration](https://scikit-learn.org/stable/modules/calibration.html); [StatsTest](https://www.statstest.com/calibration-checks-brier-score-reliability-diagrams)).
- **Brier score** — mean squared error of probability vs. 0/1 outcome; 0 perfect, ~0.25 a coin flip, 1 worst; decomposes into reliability + resolution + uncertainty; **strictly proper** (best score only from honest probabilities) ([Brier score — Wikipedia](https://en.wikipedia.org/wiki/Brier_score); [CORP decomposition, arXiv:2008.03033](https://arxiv.org/pdf/2008.03033)).
- **Log score (log loss)** — strictly proper; log of the probability assigned to what actually happened; punishes confident-and-wrong far harder than Brier; lower is better.
- **CLV** — your line vs. the closing line; positive = you beat the market's final, most-informed number (§3.5).
- **Sample size** — calibration, Brier, and CLV are averages; on small samples they're dominated by luck, so **every public stat must show its n, an as-of timestamp, and ideally a confidence interval** — and say so when the sample is still too thin to conclude. (GSE's ladder already encodes this: PROVEN ≥100 settled, ESTABLISHED ≥500 settled.)

**The surface to build:** (1) a Manifold-style per-sport calibration plot with the diagonal + one-line explainer; (2) Brier and/or log as the headline skill number, "good" pointing the same way everywhere; (3) **CLV as the flagship, domain-native proof**; (4) sample size, timestamps, CIs, and the bad periods shown honestly — the radical transparency that *is* the credibility. This maps onto GSE's existing `accuracy`, `calibrate`, `grade-audit`, `check-claims` skills and the public-performance policy.

---

## 4. Actionable Recommendations for GSE (mapped to rebuild phases)

### Phase A — Front door / the 10-second test
NN/g: users leave within ~10–20 seconds unless you prove worth. The hero must, in one screen, say *what GSE is, why to trust it, and show one real receipt.*
- **A1. Specific hero copy, not platitudes.** Name the product in Stripe/Linear style — e.g., "Calibrated sports signals, graded in public." Ban "all-in-one," "next-gen," "unlock your edge" ([925 Studios](https://www.925studios.co/blog/ai-slop-web-design-guide)).
- **A2. Put a real receipt in the hero.** A live mini calibration dot-plot or the current "% beating the close (n=…)" — *actual data*, not a floating screenshot. This simultaneously passes the 10-second test and attacks the tout category (no one else shows this).
- **A3. Lead with one pick + its confidence**, factor trail one level down (progressive disclosure, §2.3).
- **A4. No purple-gradient hero, no three-card row, no stock AI imagery.** (§2.2)

### Phase B — Design system + de-AI
- **B1. Author a semantic color system** (`color-roles`) — *not* indigo/violet defaults; one confidence scale, one win/loss/push scale, all ≥ 4.5:1 (text) / 3:1 (non-text) on the dark theme, never color-only ([W3C 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).
- **B2. Deliberate type pairing — avoid Inter/Roboto/system defaults;** use an editorial display face for headlines + a refined body face, with a fluid type scale ([DesignMonks](https://www.designmonks.co/blog/typography-trends-2026); [925 Studios](https://www.925studios.co/blog/ai-slop-web-design-guide)).
- **B3. Bento layout for the cockpit** — modular tiles, each with one clear job; dark mode; high density without fragmentation ([WriterDock](https://writerdock.in/blog/bento-grids-and-beyond-7-ui-trends-dominating-web-design-2026)).
- **B4. Intentional motion + real states.** Purposeful micro-interactions; ship genuine empty/loading/error/locked states (the absence of these is a top AI-slop tell — and ties to the `states` skill) ([prg.sh](https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website)).
- **B5. Variable-radius/spacing hierarchy** — escape the uniform-16px-radius / 0.1-shadow flatness; use real visual hierarchy.
- **B6. Performance budget as design constraint** — LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75; reserve space for async data so live updates never shift layout (§2.5).
- **B7. WCAG 2.2 AA pass** — 24×24px min targets, focus never obscured by sticky chrome, focus visible at 3:1, no color-only encoding (§2.6).

### Phase C — Progressive disclosure of the intelligence depth
- **C1. Two-tier max** (NN/g): Tier 1 = pick + confidence + tier badge; Tier 2 = factor trail, line movement, model version, CLV-to-date. Never a third level ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)).
- **C2. Labeled, obvious disclosure controls** that preview what's behind them ("See the 5 factors →").
- **C3. Surface the "No-Bet" discipline as a first-class state**, not a gap — a confident "we're passing on this game, here's why" tile is a trust signal unique to GSE.

### Phase D — The accuracy-proof surface (the moat)
- **D1. Ship `/calibration`** — Manifold-pattern reliability diagram, per sport, diagonal reference, hover-for-n, one-line explainer ("whether games happened as often as we predicted") ([Manifold](https://manifold.markets/calibration)).
- **D2. CLV as the flagship metric** — "% of picks beating the close" + "average CLV," computed from real timestamped odds, with n and as-of date ([Pikkit](https://pikkit.com/closing-line-value); [VSiN](https://vsin.com/how-to-bet/the-importance-of-closing-line-value/)).
- **D3. Brier (and/or log) as the headline skill number**, "good" pointing the same way on every chart ([Metaculus FAQ](https://www.metaculus.com/faq/)).
- **D4. Always show n + timestamp + CI**; say plainly when the sample is too thin ("too early to call — 18 settled"). Never publish a stat without its denominator.
- **D5. Un-fakeable records** — system-generated and timestamped, never hand-curated screenshots (the Juice Reel/Pikkit standard) ([Juice Reel](https://www.juicereel.com/)).
- **D6. A "How we measure ourselves" glossary** (§3.6) linked from every stat — calibration, Brier, CLV, sample size, in plain English.
- **D7. Publish the bad periods** (538's "checking our work" posture) — the single most differentiating trust move in the category.

### Phase E — SEO / AEO for a sports-intelligence brand (2026)
Search is splitting into classic SERPs + **answer engines** (Google AI Overviews/AI Mode, ChatGPT Search, Perplexity, Claude). "SEO gets you in the door; AEO gets you cited."
- **E1. Lead every page with a 40–80-word direct answer** under the headline, then expand — this is the extractable unit answer engines cite ([ALM Corp — AEO 2026 playbook](https://almcorp.com/blog/answer-engine-optimization-2026/)).
- **E2. Intent-split pages:** definitional ("what is CLV"), process ("how to read a calibration chart"), comparison ("GSE vs. tout services"), decision ("how to choose a sports-intelligence service"). GSE's glossary + methodology pages are *native* answer-engine bait ([Frase AEO guide](https://www.frase.io/blog/what-is-answer-engine-optimization-the-complete-guide-to-getting-cited-by-ai); [ALM Corp](https://almcorp.com/blog/answer-engine-optimization-2026/)).
- **E3. Structured data that matches visible content** — Article (accurate author/datePublished/dateModified/publisher), Organization, FAQ only for genuine Q&A. "Structured data should clarify the page, not invent information the user cannot see" ([ALM Corp](https://almcorp.com/blog/answer-engine-optimization-2026/)).
- **E4. Original data = citation magnet.** GSE's calibration/CLV numbers are *publishable original research* — exactly what answer engines and journalists cite. Make them quotable, dated, and linkable. This is GSE's biggest AEO asset.
- **E5. E-E-A-T / author identity** — real author pages with credentials and methodology; consistent brand entity terminology across the site; corroborate claims with outbound links (NN/g's "connected to the web" = AEO authority) ([ALM Corp](https://almcorp.com/blog/answer-engine-optimization-2026/)).
- **E6. Freshness by volatility** — odds/calibration pages refresh continuously; methodology pages semi-annually; visible *meaningful* updates, not date-only changes.
- **E7. Crawlability for AI bots** (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) — allow appropriate access; ship clean semantic HTML. **`llms.txt` is optional/low-priority:** it's a proposed standard with growing adoption but, as of late 2025, **no major AI crawler requests it at inference** — implement it cheaply, don't over-invest ([Search Engine Land on llms.txt](https://searchengineland.com/llms-txt-proposed-standard-453676); [AIOSEO](https://aioseo.com/what-is-llms-txt/)).
- **E8. Core Web Vitals as ranking insurance** — pass LCP/INP/CLS at p75 (§2.5); speed is both ranking signal and premium-feel signal.

---

## Top 10 Moves, Ranked

1. **Ship the `/calibration` page (Manifold pattern), per sport, with the diagonal + plain-English explainer.** No competitor has it; it is the entire moat made visible. (§3.4, D1)
2. **Make CLV the flagship proof metric** — "% beating the close" + "avg CLV," from real timestamped odds. It demonstrates edge on a *small* sample and is the sharps' gold standard; sportsbooks ban people for it. (§3.5, D2)
3. **De-AI the front door:** specific hero copy + a *real receipt* in the hero, no purple gradient, no three-card row, no stock imagery. Pass the 10-second test with proof, not polish. (§2.1–2.2, A1–A4)
4. **Author a semantic color + type system** (not indigo/Inter) that hits 4.5:1 / 3:1 on the dark theme and never encodes by color alone. (§2.2, §2.6, B1–B2)
5. **Two-tier progressive disclosure:** pick + confidence first; factor trail / line movement / model version one level down; never a third. (§2.3, C1)
6. **Always show n + timestamp + CI on every stat; publish the bad periods** (538's "checking our work"). Honesty is the conversion strategy. (§3.1, §3.6, D4, D7)
7. **Brier/log as the headline skill number, "good" pointing the same way on every chart** (Metaculus discipline). (§3.2–3.3, D3)
8. **Surface "No-Bet" discipline as a first-class, explained state** — a trust signal no tout can fake. (C3)
9. **Hit Core Web Vitals at p75** (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1) and WCAG 2.2 AA (24×24 targets, focus not obscured) — speed and accessibility are *trust*, not just compliance. (§2.4–2.6, B6–B7)
10. **Win AEO with original data + answer-first pages:** 40–80-word lead answers, intent-split methodology/glossary pages, matching structured data, real author identity. GSE's calibration/CLV numbers are publishable original research and prime citation bait. (§4-E)

---

### Source-quality notes
- **Verified against primary publishers:** Core Web Vitals thresholds and the FID→INP switch ([web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds)); WCAG 2.2 criteria and contrast ratios ([W3C](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)); progressive disclosure and trust factors ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)); Manifold calibration text ([manifold.markets/calibration](https://manifold.markets/calibration)).
- **Flagged as volatile/unverified:** Action Network PRO exact price (sources disagree; verify live); ETR live per-tier pricing (bundle-dependent); the "~55% cognitive-load reduction" stat attributed to NN/g (could not confirm on a primary page — do not cite). 538 article URLs now redirect post-shutdown but the framing/figures are corroborated across sources.
