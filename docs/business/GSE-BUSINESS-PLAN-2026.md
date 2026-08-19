# Galaxy Sports Edge — Business Plan (2026, v1)

Written 2026-08-19/20 from the full body of tonight's verified research:
the L-14 census, the L-15/L-16 kills, the round-1–7 adversarial research
program, the competitive-intel corpus, and the live codebase. Every claim
here traces to something tested, not something hoped.

---

## 1. What GSE is

**GSE is the proof layer for sports prediction.**

Every competitor the founder named — BettingPros, Dimers, FTN, FantasyGuru,
DraftKings' content arm — publishes numbers a customer cannot verify.
BettingPros captions a −99.48-unit record "consistently winning." Nobody in
the category publishes a calibration curve, a per-book pricing history, or
a track record that starts before the games it claims. That is the hole in
the entire industry, and it is not a feature gap — it is a structural one:
an affiliate-funded competitor CANNOT adopt radical verification, because
their revenue depends on the customer losing at the book they route to.

GSE's identity in one sentence for every surface, pitch, and page:

> **"We show our work. Nobody else in sports can."**

Being "BettingPros + Dimers + DK-without-the-bets + FTN" does not mean
copying their features. It means offering their product classes — picks,
tools, props context, fantasy, odds intelligence — **on top of a proof
spine none of them can bolt on afterward.**

## 2. The moat — what is genuinely ours and cannot be taken

Honesty about protectability, because false comfort here is fatal:

**Cannot be copied at any price:**
1. **The start date.** The append-only archive began 2026-05-22; the
   hash-chained public record begins at launch. A competitor with $100M
   can copy the idea in a weekend; they cannot buy May–August 2026. Every
   day of operation widens this permanently. This is the core moat and it
   compounds automatically.
2. **The incentive structure.** No sportsbook/DFS affiliate revenue
   (decision F-6, resolved below) is the claim capital can't copy without
   abandoning its revenue — the general non-gambling partner program is a
   separate, non-conflicted line and is not part of this pledge.
3. **The negative knowledge.** L-15/L-16 proved book-shade screens,
   copy-the-sharp-book signals, and steam-chasing are noise at public-data
   cadence. Competitors SELL those. We know they are noise, with
   pre-registered receipts. That knowledge shapes what we build and what
   we can credibly debunk in content — a permanent editorial edge.

**Protectable with cheap action (founder tasks, §7):**
4. The **GSE TruthMetrics™** family — branded names on our metrics
   (trademark filing, ~$250–350/class USPTO). Ideas aren't ownable; names
   and accumulated published series are.
5. The raw archive as a **trade secret**: publish metric OUTPUTS, never
   raw snapshot data; API access is keyed, rate-limited, and ToS-bound
   against resale/scraping. Our own source-rights registry discipline
   applied in reverse.

**Not protectable, and we don't pretend:** the concept of publishing
calibration. Defense is the start date plus velocity, not secrecy.

## 3. The product — GSE TruthMetrics on a full product surface

The named metric family (all computable from assets we already hold; L-18
produces the first two this week):

| GSE name | What it is | Source |
|---|---|---|
| **BookGrade** | Per-book, per-market price quality vs consensus close — "overs at Book X cost you 0.4%" | L-18 BPQI |
| **PulseScore** | How live each book's prices actually are | L-18 BURS |
| **Consensus Clock** | When the market made up its mind on each game | dispersion half-life |
| **Line DNA** | The full price-path fingerprint of every game, visualized | archive paths |
| **The Glass Ledger** | Hash-chained, published-before-kickoff pick record + calibration curves | existing pipeline |
| **Parlay MRI / Trend Lab / Slate Twin / Edge Index** | already built | live code |

Tier mapping (keeps the existing ladder and prices — no repricing chaos):

- **Free** — the proof surfaces ARE the funnel: public Glass Ledger,
  calibration curve, one daily BookGrade highlight, 2-pick teaser. Free
  users can verify us without paying; that verification is the marketing.
- **Pro $14.99/$99** — full board, all TruthMetrics, Line DNA per game,
  Trend Lab, Parlay MRI.
- **Elite $24.99/$179** — alerts, CLV ledger, BookGrade full history +
  API-lite (personal use).
- **Fantasy $4.99/$49** — fantasy suite; NFL-season content engine.
- **B2B (Q4, after 90+ days of published series):** TruthMetrics API for
  media/tools — the archive licensed as derived data, never raw.

## 4. The honest-claims doctrine (legal survival + brand)

Every surface states measured facts; no surface implies an edge we have
not certified. "Book X priced overs 0.3pp above consensus" — yes.
"Exploitable/fade/guaranteed" — never (trust-gate already enforces the
banned lexicon in CI). If L-17 or the C-41 prospective track ever
certifies under the pre-registered e-process, the claim upgrades with the
receipts attached; until then the edge program stays a research line, not
a marketing line. This doctrine is what lets us publish aggressively while
FTC-exposed competitors cannot follow.

## 5. Revenue math (solo founder, near-zero cost base)

Fixed costs ≈ hosting + APIs (tens of dollars/mo); agents (Hermes) are
free; no staff. Break-even is therefore trivially low, and every sub is
margin:

| Milestone | Mix | MRR |
|---|---|---|
| Survival | 67 Pro | ~$1,000 |
| Rent + bills | 150 Pro + 20 Elite | ~$2,750 |
| Full-time replaced | 400 Pro + 60 Elite + 100 Fantasy | ~$8,000 |

NFL season (kickoff ~Sep 10) is the single largest acquisition window of
the year. The plan's whole sequencing exists to be live, honest, and
NFL-ready before Week 1.

**F-6 DECIDED 2026-08-20: no sportsbook or DFS affiliate revenue,
permanently — not a blanket ban on partnerships.** The intel corpus stakes
the moat on the conflict of getting paid to route losers to books, and the
red team named straddling as the fatal outcome; the proof-layer identity
collapses only in that specific category, where the operator profits when
the user loses money betting. It does not extend to non-gambling partner
categories (creator tools, sports-data APIs, cloud/AI tools, local
sponsors) that carry no such conflict and that the codebase already
separates by risk class (`HIGH_RISK_PARTNER_CATEGORIES = [sportsbook,
dfs]`). C-17 (sportsbook odds widget) and R-7 (sportsbook affiliate
applications) are killed; the widget key stays unused; the general
disclosed-partner program (`/partners`, zero live partners today) stays
intact under its existing structural-separation and compliance guards.
"We do not carry sportsbook or DFS affiliate links" is now a published,
dated pledge on `/how-we-make-money` and `/terms`.

## 6. Execution — 30/60/90, mapped to agents

**Days 0–7 (now):** browser: redeploy `main` (the standing blocker) →
archive + NFL collection go live. Hermes: L-17 (edge verdict, either way)
and L-18 (BookGrade/PulseScore numbers). Claude: C-31 fixes, then the
BookGrade + Glass Ledger public pages from L-18 output. Founder: deploy
approval, trademark filing for "Galaxy Sports Edge" + "TruthMetrics" +
"Glass Ledger." F-6 DECIDED — no code path pending on it.

**Days 8–30:** NFL Week-1 launch: Line DNA for every NFL game, Consensus
Clock on the slate, fantasy content engine on, daily honest-record posts
(the BettingPros-contrast wedge). Weekly census cron keeps label counts
and archive health public. Publish the TruthMetrics definitions page
(methodology transparency, implementation private).

**Days 31–90:** accumulate the NFL archive nobody else will have from
Week 1 · C-41 prospective moneyline track runs silently with frozen rules
· Elite alerting matures · first B2B conversations once the published
series is 90 days deep. If L-17 certified a path-geometry signal, it
enters the Glass Ledger as a preregistered track — never as marketing
copy first.

## 7. Founder action list (only things agents cannot do)

1. Vercel redeploy (today — everything gates on it).
2. F-6 one-way decision (recommended: zero-affiliate pledge).
3. USPTO trademark filings (names above).
4. LLC/insurance check for publishing betting-adjacent analytics in TN.
5. Stripe live-mode verification after deploy (one test checkout).

## 8. What we do not do

No edge claims without certification. No affiliate money (if §5 stands).
No new mechanism studies on the closed 19-minute corpus. No raw-archive
publication or resale. No pricing games — the ladder holds until the
PROVEN milestone per the pricing-phases source of truth. No fabricated
anything — the ledger guard, trust-gate, and this plan are one system.

---

*This plan supersedes scattered strategy notes. The ledger tracks
execution; the master plan (docs/ops/MASTER-PLAN-2026-08-19.md) remains
the night-ops view. Review after L-17/L-18 land and after NFL Week 1.*
