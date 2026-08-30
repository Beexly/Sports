# THE GREEN BOARD DOCTRINE — a true 70%, proven in public

> The goal, at full size: GSE sells picks that win at a TRUE ~70% rate — not a
> marketing number, a mathematical property — on a website that is the first of
> its kind on earth: the place where you WATCH probability become record.
> Every claim below traces to cross-model-verified numbers
> (`docs/ops/calibration/2026-08-28-res-night-verified/`, exact replication by a
> second model) or to code already in this repo.

## Why a true 70% is real (the verified math)

1. The de-vigged market is almost perfectly calibrated: REL 0.0013, ECE 0.031
   on 1,935 real games — and calibration is FLAT precisely in the 0.55–0.80
   probability range (942 games), with true-probability events observed up to
   0.937. The market hands us genuine ~70%-probability events every day.
2. Calibration is a guarantee machine: a board whose picks average calibrated
   p ≈ 0.72 REALIZES ≈70% wins over a season by necessity. The frauds fake 70%
   on coin-flips; we ENGINEER 70% by firing only where 70% is true — then use
   situational selection to land above it.
3. Honest variance, stated up front: at p̄=0.72, 100 picks → 95% CI ≈ ±9 pts;
   500 picks → ≈ ±4. The site SHOWS the interval. Nobody else dares.

## THE PROOF STACK — the identity, front and center (founder directive 2026-08-28)

The five things no other sports company on earth does are not a feature list —
they ARE the brand, and they lead every surface. The homepage hero IS the
Proof Stack; every page reinforces one of its five planks:

1. **Calibrated, not claimed** — our published calibration curve proves the
   probabilities are true; check us.
2. **Cryptographic receipts** — every pick hash-committed at publish; deleting
   or backdating is impossible, not just unlikely.
3. **The interval rides with the rate** — we print the error bars; only fake
   numbers fear error bars.
4. **The SITREP dossier** — the full situational case behind every pick,
   receipt-attached.
5. **Public autopsies** — every loss examined in the open; the industry hides
   losses, we compound trust with them.

House line, everywhere: *"Everyone claims. We prove. We didn't join the claims
war — we ended it."* If a page does not visibly serve one of the five planks,
it is decoration and gets cut.

## The two tiers (founder decision: brand the mechanism, not a fixed number)

- **GREEN** — calibrated p ≥ 0.70. The daily board, 2–5 picks. Realizes ~72%
  by construction.
- **GSE PRIME** — calibrated p ≥ 0.80. Rare by design (some days: none — and
  the empty state says so proudly). The scarcity weapon: "PRIME fires only
  when winning is at least 80% mathematically true."
- The Record reports realized rate PER TIER, interval attached. No fixed
  percentage is ever promised in copy — the tiers and the live record ARE the
  claim.
- **Selection alpha — the self-learning ambition:** the situational engine's
  job is realized ≥ expected + 2pts per tier (our 74% picks win 76%). GB-4
  measures it from day one; it is the internal KPI the engine trains against,
  and — once sustained and verified — the loudest sentence on the site.

## PROBABILITY-PRICED ACCESS (founder directive 2026-08-28 — the business model)

The first pricing model where THE PRICE IS THE PROBABILITY, AND THE
PROBABILITY IS PROVEN. Only possible here: charging by confidence band
requires the confidence to be true, and only our bands are calibrated,
receipted, and auditable. Bands (shaped by real supply — verified events
exist up to p≈0.94, thin at the top):

| Band | What it is | Sold on | Access |
|---|---|---|---|
| EDGE (any p) | mispriced lines, value dogs | ROI / CLV proof | Elite |
| GREEN (0.70–0.80) | the daily certainty board | per-tier win record | Pro |
| GSE PRIME (0.80–0.90) | rare, loud, receipted | per-tier win record | Elite |
| RARE AIR (0.90+) | a handful per month; scarcity IS the product | the receipt itself | capped seats / per-drop (founder-priced) |

Load-bearing mechanics:
1. **Band stamped in the receipt.** Membership = calibrated p at publish,
   inside the hash commitment. Promoting a 72% pick into a premium band is
   cryptographically impossible, not just against policy.
2. **The Band Report Card.** Monthly, per paid band, auto-published:
   promised range vs realized rate (with interval, n). An invoice with proof
   attached — no subscription business on earth audits itself to its
   customers. Variance months are answered by the interval + autopsies, never
   by silence.
3. **Certainty of information, never certainty of profit.** Top bands pay
   short odds; copy sells "the closest thing to knowing," staking guidance
   stays conservative, responsible-gaming rails intact. This framing is what
   lets premium pricing survive every critic.
4. Fits the existing Stripe architecture: extends the Pro/Elite ladder
   (per-band entitlements) + one new capped product for RARE AIR; founding
   rates and grandfathering unchanged.

## The two boards (one product, two crowns)

- **GREEN BOARD** — the win-rate crown. Fires only when every gate passes.
  High true win rate, capital-preservation staking guidance, the number people
  feel. Free sees yesterday's graded greens; Pro sees today's.
- **EDGE BOARD** — the ROI/CLV crown (Elite). Props and soft markets through
  the fire gate + event-odds (credit-capped), graded on CLV and units. Green
  wins often; Edge wins money; both wear receipts.

## THE GREEN GATE — a pick must EARN green (all five, no exceptions)

| Gate | Test | Source (already in repo) |
|---|---|---|
| G1 Probability | calibrated p* ≥ 0.70 from de-vigged multi-book consensus | normalizer + de-vig (verified path) |
| G2 Market depth | ≥2 fresh books, freshness SLA green | MIN_BOOKMAKERS, freshness gate |
| G3 Independent assent | Elo/Poisson/FPI within dissent band (no independent screams "trap") | build-independent-fair-values |
| G4 Situation clean | SITREP veto score clear (below) | covariate bus + enrichGameContext |
| G5 Integrity | line lock + proof receipt minted at publish | clv lock + pick_proof_receipt / slate_commitment tables |

p* = de-vigged consensus, nudged only by G3/G4 within a bounded band — never
stretched. The threshold is tuned so the BOARD AVERAGE sits ≥0.72.

## THE SITREP — situational understanding as a named, inspectable system

Garrett's thesis made rigorous: we don't out-predict the market head-on (verified:
no blend beats the close); we OUT-SELECT it — separating the clean 72% from the
trap 65% wearing a 72% price. Every factor is a signed score with provenance,
and every pick ships with its full dossier. Factor families, each mapped to
data ALREADY ingested:

1. **Schedule & body** — rest differential, short week, travel miles/timezones,
   altitude, sandwich/lookahead/letdown spots, revenge flags. (schedules,
   enrichGameContext)
2. **Personnel** — injury clusters by position group, QB/starter status, line
   continuity, snap-share shifts. (nflverse injuries/depth_charts/snap_counts)
3. **Environment** — wind/precip/temp for totals, roof/surface. (open-meteo,
   cleared)
4. **Market behavior** — open→now line path, reverse-line-movement flag,
   book disagreement at lock. (OddsLineSnapshot phases, bookDisagreementAtLock)
5. **Asymmetric motivation** — elimination/division stakes, locked seeding =
   rest-risk, garbage-time/kneel distortions in the priors. (kneel/garbage
   work, PR #557 lineage)
6. **Matchup shape** — pace clash, trench mismatch, archetype edges. (HB
   modules, covariate bus, PFeatureSet)

Output per pick: `SITREP { score, flags[], boosts[], provenance[] }` — G4 vetoes
green when any hard flag fires or the net score < threshold. THE DOSSIER IS THE
DIFFERENTIATOR: no service on earth shows you WHY at this depth, receipt-attached.

## THE WEBSITE — first of its kind, five signature experiences

1. **THE DROP.** Green picks publish at one fixed time daily, countdown-staged,
   each with locked line, timestamp, SITREP dossier, and a cryptographic
   receipt (slate hash committed at publish — the pick_proof_receipt +
   slate_commitment tables exist; surface them). Tamper-proof by construction:
   the first pick site where "we called it" is a verifiable object.
2. **THE RECORD.** A live ticker: win rate WITH its confidence band, units, and
   CLV — three numbers, never separated, drillable by sport/market/month.
   Losses stay forever. The record is the homepage.
3. **THE GREEN ROOM.** The gates visualized live: watch candidates flow
   through G1→G5, most dying honestly (grey), a few earning green. Nobody has
   ever shown picks EARNING their place. This is the theater of discipline —
   and it's just rendering state the engine already computes.
4. **THE CALIBRATION WALL.** Our public reliability curve updating with every
   settle: "when we say 72%, it wins 72% of the time — check." The 70% claim's
   proof, live, permanent. First service to publish its own calibration as the
   product.
5. **THE AUTOPSY.** Every green loss gets a public post-mortem within 24h: what
   the SITREP said, what happened, what (if anything) we change. Losses become
   trust; trust becomes the moat.

## HONESTY RAILS (unchanged, load-bearing)

No win-rate claim in copy until n clears the check-claims floor; CI always
displayed beside the rate; "record in progress" framing pre-milestone;
PERFORMANCE_STATS flips only under the paired-vs-market law; staking guidance
capped conservative; responsible-gaming surfaces stay. The rails are not the
brake on the moonshot — they are why the moonshot is believable.

## BUILD MAP (assigned; every phase lands on existing code)

- **G-1 (now): the predicate + the board.** `greenBoardEligible(pick)` in
  packages/prediction-engine (G1–G3 from existing fields; G4 v1 = hard vetoes:
  rest≤-2 diff, QB out, wind>20 for totals, RLM flag), selective-publish lane
  `GREEN`, board page + drop time + record ticker with CI. Owner: hermes build,
  claude verify (clean-room re-implementation of the predicate math).
- **G-2: SITREP v1 renderer** — per-pick dossier from covariate bus fields +
  autopsy template + Calibration Wall page (reuse calibration-metrics output).
- **G-3: receipts on stage** — surface pick_proof_receipt/slate_commitment
  (post-migrate) as the verify-this-pick UI + public hash log.
- **G-4: Green Room live view** — gate-state visualization from the existing
  pipeline events.
- **G-5: Edge Board/Elite** — fire-gate props + CLV ledger public views (after
  the lock-provenance integrity work).
- **Volume & clock:** MLB alone offers multiple ≥0.68 events daily; 2–5 greens/
  day → first 100 graded in ~4–6 weeks → the milestone event: "100 picks,
  every one receipt-verified, N% — the only record like it on earth."

## The sentence over the door

**Everyone else claims 70%. We are the first to make 70% a property of the
system — chosen by calibration, filtered by situations, locked by receipts,
graded in public — and dare the world to check.**
