# SPEC-B — Pick Spec: From Locked-Mean Distributions to Emittable Products

Status: RATIFIED · Freeze state: FREEZE-1 (executed 2026-10-15)
Ratified: 2026-10-15 by Garrett Baxley (owner), bundle item (3) — the product gate is DECOUPLED from the CRPS gate (§7.3 resolved YES): products gate on their own bettable metrics (§3) and on the product break-even bar (the break-even mapping artifact is pending at FREEZE-1 and binds at FINAL; see FREEZE-1.json).
Governs: what the engine may emit, how distributions become prices, and how NO_BET is a product.
Principle: the engine never pretends a symmetric locked-mean distribution has a side.
Freeze record: FREEZE-1.json (this directory) — sha256 hashes of this file, SPEC-A, RULING-C1, and the hypothesis ledger.

## 1. What a dispersion/key-number model can honestly price
1.1 Alternate lines: P(margin > L) and P(margin < L) for any line L ≠ μ. The model prices these directly from the predictive CDF. Honest because the price comes from the distribution's shape, not from a claimed edge on the spread.
1.2 Key-number and push-probability products: P(margin = k) for key numbers k ∈ {3, 7, 10, ...} from the atom masses; push probability P(margin = L) at the offered line. These are pure shape products.
1.3 Teasers: P(margin within [L−t, L+t]) for teaser adjustment t, priced from the CDF. Only offered where the model's tail estimates are calibrated (see §5).
1.4 Totals analogues: the same machinery applies to totals if a totals distribution is built; until then, totals products are SPEC GAP (no totals model exists in the record).
1.5 Abstention as a product: NO_BET is an emittable output meaning "the model's edge does not clear the bar." It is scored as a product (§6).

## 2. Distribution → price mapping (per bet type)
2.1 For a predictive CDF F and offered line L with decimal odds o: fair probability p = 1 − F(L) (over) or F(L) (under); model price = p with no margin. The emitted price includes the operator margin as a separate, declared layer.
2.2 Key-number product: price = atom mass at k, i.e., P(margin = k) from the fitted atoms.
2.3 Push handling: pushes are priced as P(|margin − L| < 0.5) returned as stake. The push probability is quoted, not hidden.
2.4 Every mapping is implemented in code and hashed at freeze. No hand-pricing.

## 3. Bettable metric per type (scored alongside CRPS, pre-declared)
3.1 Alternate lines: mean log-loss on the binary outcome (cover/not) at the offered lines, plus calibration curves.
3.2 Key-number/push: Brier score on the atom events.
3.3 Teasers: log-loss on the teaser outcome.
3.4 Abstention: abstention rate, and CRPS on emitted vs. vetoed games (descriptive); the product metric is the realized yield of emitted bets vs. a pre-declared baseline yield.
3.5 All bettable metrics are computed on the SCORING set only, with the same bootstrap uncertainty as §4 of SPEC-A.

## 4. What the engine may NEVER emit
4.1 A spread side (home/away cover pick) derived from a symmetric locked-mean distribution. With μ = spread and symmetry, P(home covers) = P(away covers) = 0.5 minus push mass; emitting a side from this is fabrication.
4.2 Exception and prohibition: key-number atoms make the distribution asymmetric around a half-point line, producing a real predicted side. SPEC-B §4.2 FORBIDS emitting it anyway, because the asymmetry comes from the atom placement (a modeling choice), not from measured edge. A side may only be emitted when the bettable metric (§3) clears its own gate on that product.
4.3 No "lean," "tilt," or "confidence" language that implies a side without a priced product behind it.

## 5. RVC clearance labels
5.1 Labels: RVC-RED (no product clears; nothing emittable), RVC-AMBER (some products clear; emit only cleared products), RVC-GREEN (all offered products clear their bettable gates). (RATIFIED 2026-10-15: tier names adopted as drafted.)
5.2 A label attaches per game, per product. The engine's output is the set of (product, price, label) triples plus NO_BET where applicable.
5.3 Label definitions and thresholds are frozen in this spec. Changing a threshold voids the freeze (SPEC-A §10.4).

## 6. NO_BET as a product (honest framing)
6.1 What NO_BET says: "At the current line and our model's uncertainty, no offered product clears the bar. That is the model's output."
6.2 Why it is a product, not an apology: abstention is the model's highest-value output when the market is efficient. A NO_BET that saves a customer a −EV bet is worth more than a forced pick.
6.3 Customer-facing framing: "No bet — the numbers don't clear our bar this week. We'll flag it when they do." Never: "we're not sure" or "the model is uncertain" (uncertainty is priced into every product; NO_BET is a decision, not a confession).

## 7. Strategic notes
7.1 The archiver captures spread and total lines only. Alt-line, moneyline, buy-point, and teaser prices are not archived. Until the archiver captures product prices, SPEC-B products cannot be scored — this is the binding constraint on the pick track.
> FREEZE-1 RECORD NOTE (2026-10-15): §7.1's premise changed the day of ratification. Moneyline was already captured by the archiver's main-line leg, and the archiver's keyed leg (The Odds API alternate markets, credit-capped) live-captured alternate spread/total ladders on 2026-10-15 (178 rows; buy-points are ladder rungs and ride with them). Teaser prices remain uncaptured — no source exposes a teaser market to the archiver. §7.1's text is retained as ratified-drafted; the constraint it names is re-assessed at FINAL.
7.2 Totals products are SPEC GAP: no totals distribution exists in the record.
7.3 RESOLVED — DECOUPLED = YES (RATIFIED 2026-10-15): the product gate is decoupled from the CRPS gate. Products gate on their own bettable metrics (§3) without requiring the CRPS gate (SPEC-A §4) to clear first, and — where a product's bar is expressed against the break-even mapping — on the product break-even bar (mapping artifact pending at FREEZE-1; binds at FINAL). The CRPS gate remains the bar for the scored-construction track's research ledger; it is not an emission precondition for products that clear their own gates. Draft rationale (retained): a dispersion model can price alt-lines honestly even while its margin-CRPS improvement is small; coupling the gates multiplies the timeline by the slower of the two.
