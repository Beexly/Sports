import Foundation

/// American-odds arithmetic, kept pure and in one file so it can be tested
/// without a network, a view, or a running app.
///
/// The two-way de-vig here is deliberately the *proportional* method, because
/// that is the method the backend names in its own contract: `winProbability`
/// comes back as `{ basis: "market_devig", method: "proportional", books: n }`.
/// Re-deriving it client-side is only legitimate if the app uses the same
/// method, otherwise the app and the API disagree about the same number and
/// the app is quietly lying.
enum OddsMath {

    // MARK: - Conversion

    /// Implied probability of the bet **as quoted**, including the vig.
    /// `-110` → 110/210 ≈ 0.5238. `+145` → 145/245 ≈ 0.5918.
    /// Nil for a zero line, which is not a price.
    static func impliedProbability(american: Int) -> Double? {
        guard american != 0 else { return nil }
        return american > 0
            ? Double(american) / (Double(american) + 100)
            : Double(-american) / (Double(-american) + 100)
    }

    /// The vig embedded in a single price: how far the quoted probability sits
    /// above 0.5 on an even matchup. Nil for a zero line.
    static func overround(american: Int) -> Double? {
        guard let implied = impliedProbability(american: american) else { return nil }
        return (implied * 2) - 1
    }

    /// American price for a probability, rounded to the nearest 5 — the
    /// increment every retail book quotes at. Nil outside (0, 1).
    static func americanFromProbability(_ probability: Double) -> Int? {
        guard probability > 0, probability < 1 else { return nil }
        let decimal = 1 / probability
        let raw = decimal >= 2
            ? (decimal - 1) * 100
            : -100 / (decimal - 1)
        return Int((raw / 5).rounded() * 5)
    }

    /// Proportional two-way de-vig: given the raw implied probabilities of two
    /// outcomes, return the first outcome's *vig-free* probability.
    ///
    /// Quoted prices in a two-way market sum to more than 1; dividing both by
    /// that sum removes the margin in proportion to size. Nil when either side
    /// has no probability, or when the inputs are out of range.
    static func devigTwoWay(probabilityA: Double, probabilityB: Double) -> Double? {
        guard probabilityA > 0, probabilityB > 0 else { return nil }
        let total = probabilityA + probabilityB
        guard total > 0 else { return nil }
        let fair = probabilityA / total
        guard fair > 0, fair < 1 else { return nil }
        return fair
    }

    // MARK: - Stakes

    /// Profit on a win, excluding the returned stake.
    ///
    /// `+145` on 100 → +145.00 (payout 245.00). `-110` on 100 → +90.91
    /// (payout 190.91). This is *not* the implied probability: a price and its
    /// payout are different quantities, and conflating them understates every
    /// positive-price bet by its own margin.
    static func profit(stake: Double, american: Int) -> Double {
        guard american != 0 else { return 0 }
        if american > 0 {
            return stake * (Double(american) / 100)
        }
        return stake * (100 / Double(-american))
    }

    /// Total returned on a win, including the stake.
    static func payout(stake: Double, american: Int) -> Double {
        stake + profit(stake: stake, american: american)
    }

    /// Win rate a bettor must hold to break even at this price, as a percentage.
    ///
    /// Break-even is where expected value is zero: `p * payout(1) - 1 = 0`, so
    /// `p = 1 / payout(1)`. It is *not* the implied probability, and the two
    /// only agree below evens: `-110` implies 110/210 ≈ 52.38% and breaks even
    /// at the same 52.38%, while `+145` implies 145/245 ≈ 59.18% but breaks
    /// even at 100/245 ≈ 40.82%. Returning the implied probability here made
    /// every positive-price bet look like it needed a win rate it does not.
    static func breakEvenWinRate(american: Int) -> Double? {
        guard let decimal = payout(stake: 1, american: american), decimal > 0 else {
            return nil
        }
        return (1 / decimal) * 100
    }

    /// Expected value per unit staked, given the model's fair probability for
    /// the selection and the price offered. Positive means the price beats the
    /// model, which is the entire premise of the app.
    static func expectedValue(fairProbability: Double, american: Int) -> Double? {
        guard fairProbability > 0, fairProbability < 1 else { return nil }
        return (fairProbability * payout(stake: 1, american: american)) - 1
    }

    /// The gap in percentage points between the model's fair probability and
    /// the market's implied probability.
    ///
    /// This is *not* a percentage return, and the two must not be read as
    /// interchangeable. For a single quoted line they cannot even disagree in
    /// sign: `expectedValue` is `payout(1) * (fair - implied)`, so the vig
    /// scales the number without ever flipping it. Ten points of edge is ten
    /// points of edge whether the line is -110 or -200, while the same ten
    /// points are worth very different money at each. Where the distinction
    /// does bite is comparing the model against a *different*, cheaper line
    /// than the one quoted — positive against one price, negative against the
    /// other. The UI labels this "vs market", never "edge %".
    static func edgePoints(fairProbability: Double, american: Int) -> Double? {
        guard let implied = impliedProbability(american: american) else { return nil }
        return (fairProbability - implied) * 100
    }
}
