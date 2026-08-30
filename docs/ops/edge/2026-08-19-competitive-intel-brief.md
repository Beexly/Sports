# Competitive-intel corpus — decision brief

Source: `Beexly/gse-competitive-intel` (633 files), read-only. Full agent analysis
in session transcript; this is the distilled, decision-bearing extract with
verification status on each claim.

**Headline: the corpus is NOT in conflict with tonight's "honest calibration, no
proven edge" result. Its most authoritative layer was written from that premise
and named this exact outcome as the most likely one.** The conflicts are confined
to a stale sub-layer, ~8 specific recommendations, and one live product decision.

---

## 1. The finding that matters most — independent confirmation at scale

**BettingPros (Marzen Media, same owner as FantasyPros) ran GSE's exact thesis
with real money and real data, lost, and publicly quit.** Their own published
records (scraped, sourced):

| Market | Bets | Win rate | Units | ROI |
|---|---|---|---|---|
| MLB all picks | 6,106 | 52.5% | **−103u** | −1.7% |
| NBA all picks | 33,661 | 51.0% | **−99.48u** | −0.3% |
| NFL 5-star slice | 1,707 | 54.7% | +81u | +4.7% |

In **Feb 2026 they publicly abandoned proprietary modeling**: *"Most EV tools…
build proprietary models… here's what nobody tells you: your model is probably
wrong… No projections. No models. Just market inefficiency."* They pivoted to
sharp-book-consensus line shopping.

**Read this carefully: that is tonight's resolution ≈ 0 finding, independently
reproduced at ~40,000 bets by a better-resourced operator.** It is the single
strongest external evidence we have, and it points the same direction as our
Brier decomposition, the Bickel & Kim prior update, and the flat suppression
curve. Four independent routes, one conclusion.

**But it also hands us the wedge:** their NBA page carrying a −99.48u aggregate
is *captioned* "we are consistently winning," and every marketing surface
headlines the best star-tier slice. That is the honesty seam — *we lead with our
full record; they lead with their best slice* — and it requires only a record,
not a good one.

---

## 2. THE DECISION THAT CANNOT WAIT — affiliate

**This is a live contradiction between the corpus and what we are currently
building, and I contributed to it last night.**

The corpus stakes the entire moat on **zero affiliate**, repeatedly and in the
strongest terms:
- Handoff §1: *"**No affiliate.** No sportsbook CPA funnels… **Ever.** (This is
  the moat — a competitor funded by affiliate CANNOT copy it.)"*
- Master dossier §4.5: *"Incentive-inversion locked into the corporate form:
  zero affiliate… the one claim capital can't copy without abandoning its
  revenue."*
- Capstone: *"the moment GSE books meaningful affiliate revenue it becomes the
  thing it attacks… **stop straddling.**"*

Meanwhile the live product is building an affiliate/partner surface (C-17 widget
design, R-7 sportsbook affiliate applications — which I drafted and dispatched).

The one sanctioned carve-out in the whole corpus (`_scores24-verified-playbook`,
tagged `[later]`): US-regulated operators only, labeled disclosure on every link,
21+ gating, editorial visibly separated from commercial, **only under legal
counsel**.

**Founder decision required, one direction, not deferrable:**
(a) build affiliate strictly inside that carve-out **and delete every
"zero affiliate / we never send you to a book" claim from marketing**, or
(b) kill the surface.

The corpus's red team names **straddling — keeping the claim while taking the
money — as the fatal outcome.** Note the strategic logic bites harder now: the
"we profit only when our number is right" pitch is already strained when the
number carries little information; adding affiliate revenue makes it false.

---

## 3. VERIFIED IN OUR OWN CODE — the confidence gate

The corpus flagged that `kelly.ts` gates on confidence, violating its core
modeling doctrine (*"fire on calibrated edge e = p − q, never on confidence
κ = max(p, 1−p)"* — because a 90%-confident favorite has zero edge, the line
already prices it).

**Verified true, and the real problem is subtler than stated:**
- `packages/prediction-engine/src/kelly.ts:154-155` gates on
  `confidence < MIN_CONFIDENCE_FOR_STAKE` **AND** `edgeScore < MIN_EDGE_FOR_STAKE`.
  Because it is an AND with an edge gate, it does **not** fire on chalk the way
  the corpus feared. What it does instead is **discard edge-positive picks purely
  for low confidence** — which, given calibrated probabilities, is exactly where
  variance-adjusted value can live.
- More concerning, `kelly.ts:181`: `inferredEdge = (pick.edgeScore / 100) * 0.05`
  — a "bounded +5% edge proxy", with line 70 conceding the probability is an
  *"ESTIMATE derived from edgeScore and the offered (break-even) probability."*
  **Given tonight's finding that confidence is substantially a market-structure
  echo, this chain may be sizing stakes off market structure rather than any
  independent edge.** Opened as C-26.

---

## 4. DANGEROUS — do not act on, do not let an agent read uncritically

1. **The "≥70% win-rate north star" is STALE and still live in five files**
   (`gse-competitive-intel/README.md:18`, `_expansion-targets.md:6`,
   `rotowire-engine-teardown.md:256`, and two fantasyguru docs). Superseded
   2026-06-30 → *"prove CLV edge, do not claim it until it clears breakeven."*
   The five files were written AFTER the walk-back and still carry it. **Any
   agent or copy generator reading them will emit a forbidden claim.**
2. **`_competitor-mistakes-lessons.md:18`** literally scripts the marketing line
   *"We get you a proven edge."* Forbidden outright.
3. **All "publish a proven win rate" recommendations** in
   `_fantasypros-verified-playbook.md` (lines 21, 37, 43, 50, 52, 80, 83).
   Replace "win rate" with "calibration + honest aggregate" everywhere.
4. **`_s24_pred_scraper.py` — NEVER EXECUTE, never port, never use as a
   template.** It hits `scores24.live/graphql` with harvested session cookies and
   a token. Our own source-rights registry classifies scores24.live as
   `permission_required` (written consent from Kiito OÜ). Running it would breach
   the Scraping Clearance Engine and the session-token reuse edges toward
   access-control circumvention.
5. **PII**: the scores24 owner's name appears in two teardown files. Never
   republish or derive public content from them without a re-scrub.
6. **Charging for CLV at Elite ($24.99) while CLV measurement is under repair.**
   The corpus designates CLV-vs-Pinnacle as the *internal proof bar, never a
   marketing number*. Highest-risk paid surface in the product right now.

---

## 5. What survives intact, and is the actual strategy

The corpus's base case — not its consolation prize — is: **the ledger + tools
layer is the floor that has value at 50.9%.** Capstone, verbatim: *"This ceiling
is reachable WITHOUT ever proving a market-beating edge, because the product is
the transparency itself."*

Surviving fully: the Glass Ledger (publish-before-kickoff, hash-chained,
independently re-computable, designed to be shown *while losing*);
calibration-led public proof (explicitly chosen because it makes an honest
sub-breakeven number credible and FTC-safe); the honest-aggregate wedge vs
BettingPros; free "Beat the Model" skill contest; `e = p − q` doctrine; data
legality posture; FTC/ROSCA discipline; the correlation-honest parlay guardrail
(explicitly ~0 CLV, valued as an education asset — this is what "Parlay MRI"
already is).

**The documented opening, precisely:** nobody in the category publishes a
calibrated reliability curve for their own number. Not FantasyPros (ordinal,
field-relative), not BettingPros (unit P/L, no calibration), not scores24
(nothing), not PFF, not OddsJam. nfelo publishes accuracy and CLV but not
calibration. **Our ECE 0.0044 is publishable, true, differentiating, and
FTC-safe.**

**And the corpus's own honest caveat on that opening**, which we should hold
alongside it: *"trust/accountability is not what the paying sports-picks buyer
actually buys… the people who genuinely value a calibration curve are sharps who
already run OddsJam/Pinnacle themselves"*, and *"'We publish our record' is
copyable in a weekend by anyone with data and capital."* The defensible part is
not the claim — it is the **timestamped start date**, which capital cannot
retroactively buy.

**Pricing mismatch worth noting:** the corpus anchors the serious-bettor cohort
at $199–299/mo (OddsJam-proven) and asks *"what exactly is a subscriber paying
$20/month for today?"* We are at $14.99/$24.99 — priced at the mass-tout
audience the corpus says will not buy honesty, while selling the honesty product.

---

## 6. Corpus epistemic health

These are multi-agent LLM synthesis documents ("156 agents, 5 workstreams") and
they carry their own adversarial verdicts: FantasyPros 13 confirmed / 9 partial /
1 refuted; scores24 18 confirmed / 11 partial / 1 refuted. The corpus caught
fabrication **inside itself** (`_fantasypros-verified-playbook.md:121`).

**Operating rule: treat any claim not tagged `confirmed` as a lead, not a fact.**

Known internal contradictions — do not build on the losing side: scores24 page
count (600k asserted vs "low-hundreds-of-thousands" in its own primary findings);
scores24 financials (capstone says profitable at 98% margin, playbook cites a
2025 annual report showing a **−188,915 EUR loss**); FantasyPros "GOAT tier"
(asserted new, refuted by later adversarial pass); `llms.txt` (rated `[now]` in
two lists, rated *fatal* by the red team — no answer engine has confirmed it
influences retrieval); programmatic SEO (recommended in one file, cratered by AI
Overviews per another).

**Strongest single evidence artifact in the corpus: `nfelo-performance.md`** — a
raw scrape of nfelo's real season-by-season table (66.61% SU, 56.97% ATS vs
open, 53.70% ATS vs close, +5.61% CLV/play since 2009). Real data, not synthesis.
That is the benchmark, and note that even nfelo — honest, respected, a decade of
data — sits at 53.70% against the close.

---

## 7. The three things that matter

1. **The strategy survives tonight and was built for tonight.** Nothing needs
   re-strategizing. The ledger/tools floor is the base case.
2. **The affiliate contradiction is the one unresolved live conflict.** Decide it
   in one direction this week and make the marketing match.
3. **Run the information probe before another engineering hour goes into the edge
   program.** The corpus's `I(features; Y | Q_close)` probe and our C-21
   grouping-loss gate are the same question by two routes: is there
   market-orthogonal information at all? It costs a day and determines what this
   company is.
