"""
Prop discrepancy & Pinnacle shade engine
========================================

Reads the two edge sheets, fits a distribution to each book's line environment,
prices the PrizePicks line against the standard flex breakeven rates, and ranks
the board by expected value with a quarter-Kelly stake.

INPUTS (both verified present; the two copies on disk are byte-identical)
------------------------------------------------------------------------
docs/props/research/2026-10-11/edge_sheet_pp_vs_dk_v2.csv
    player, stat, dk_mu, dk_sigma, dk_main, pp_primary, pp_alts, z, p_over_at_pp
    21 player rows. `dk_mu`/`dk_sigma` are the mean and standard deviation of
    DraftKings' own distribution for that stat; `pp_primary` is the PrizePicks
    line; `p_over_at_pp` is the sheet's own P(over) under a NORMAL at the PP line.

docs/props/research/2026-10-11/dk_vs_pinnacle_shade_2026-10-10.csv
    game, dk_sp_h, pin_sp_h, dk_total, pin_total, total_shade
    14 game rows of LINE VALUES ONLY.

THE BLOCKER, STATED UP FRONT — READ BEFORE TRUSTING ANY NUMBER BELOW
-------------------------------------------------------------------
The task asks this engine to "de-vig sharp book lines (Pinnacle two-way lines
using multiplicative and Shin de-vigging)". **Neither input file contains a
price.** The shade file carries a spread and a total per game — line values such
as -7.5 and 41.5 — and no juice, no moneyline, no two-way quote on either side.
De-vigging is the act of removing the bookmaker's margin from a set of PRICES;
with no prices there is no margin to remove and no implied probability to
recover.

So the de-vig implementation below is real, complete and unit-tested against
closed-form and independently root-solved benchmarks — and it is UNEXERCISED ON
TODAY'S DATA, because today's data cannot exercise it. It will engage the moment
a sheet carries two-way prices. This is reported rather than papered over: the
alternative would be to assume a juice, invent two prices from one line, and
then present an invented margin as a measured one.

What the shade file CAN support is a line-shade SENSITIVITY, and that is what
`shade_scenario` implements: it rescales a player's expected volume by the
Pinnacle/DraftKings total ratio for that player's game and reports the resulting
change in probability and EV. The scaling coefficient is stated explicitly
because it is a modelling choice, not a measurement. It is reported BESIDE the
primary number, never folded into it.

Usage
-----
    python intelligence/props/prop_discrepancy_engine.py
    python intelligence/props/prop_discrepancy_engine.py --breakeven 2-pick
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
from scipy import optimize, stats

REPO_ROOT = Path(__file__).resolve().parents[2]
PROPS_DIR = REPO_ROOT / "docs" / "props" / "research" / "2026-10-11"
EDGE_SHEET = PROPS_DIR / "edge_sheet_pp_vs_dk_v2.csv"
SHADE_SHEET = PROPS_DIR / "dk_vs_pinnacle_shade_2026-10-10.csv"
OUTBOX_JSON = REPO_ROOT / "outbox" / "props_ev_board_latest.json"
OUTBOX_MD = REPO_ROOT / "outbox" / "props_ev_board_latest.md"

# ---------------------------------------------------------------------------
# Breakeven rates and the payout tables behind them
# ---------------------------------------------------------------------------

#: Per-leg breakeven probability, i.e. the hit rate at which the entry is exactly
#: EV-neutral. Taken as given from the standard PrizePicks/Underdog structures.
BREAKEVENS: Dict[str, float] = {
    "5-flex": 0.542,
    "2-pick": 0.571,
}

#: PrizePicks 5-pick flex payouts (total return multiples). Kept here so the
#: 0.542 breakeven can be DERIVED rather than quoted -- see
#: breakeven_from_flex_payouts() and its unit test.
FLEX_5_PAYOUTS: Dict[int, float] = {5: 10.0, 4: 2.0, 3: 0.4}

#: Underdog 2-pick flex pays 1.75x total return on 2/2, 0 otherwise.
TWO_PICK_RETURN: float = 1.75


def breakeven_from_flex_payouts(payouts: Dict[int, float], n: int) -> float:
    """
    Solve for the per-leg hit probability p at which a flex entry is exactly
    EV-neutral: sum_k C(n,k) p^k (1-p)^(n-k) * payout_k = 1.

    This exists so the breakeven constants are checkable rather than assumed.
    For FLEX_5_PAYOUTS it returns 0.542 to three decimals, which is where the
    published 54.2% figure comes from.
    """
    def ev(p: float) -> float:
        total = 0.0
        for k, mult in payouts.items():
            total += stats.binom.pmf(k, n, p) * mult
        return total - 1.0

    return float(optimize.brentq(ev, 0.01, 0.99, xtol=1e-14))


def breakeven_from_return(total_return: float) -> float:
    """
    Per-leg breakeven for a flat-multiplier entry: a 1.75x total return means a
    0.75 profit per unit, so p * 0.75 = (1 - p) gives p = 1/1.75 = 0.5714.
    """
    profit = total_return - 1.0
    return 1.0 / (1.0 + profit)


# ---------------------------------------------------------------------------
# De-vigging
# ---------------------------------------------------------------------------

def american_to_implied(price: float) -> float:
    """Raw implied probability of an American price, margin included."""
    if price >= 100:
        return 100.0 / (price + 100.0)
    if price <= -100:
        return (-price) / ((-price) + 100.0)
    raise ValueError(f"not a valid American price: {price}")


def implied_to_fair_odds(prob: float) -> float:
    """American price for a given probability (fair or otherwise)."""
    if not 0.0 < prob < 1.0:
        raise ValueError(f"probability out of range: {prob}")
    if prob >= 0.5:
        return -100.0 * prob / (1.0 - prob)
    return 100.0 * (1.0 - prob) / prob


def multiplicative_devig(raw: Sequence[float]) -> np.ndarray:
    """
    Normalize implied probabilities by their sum. Equivalently, divide each by
    the booksum. Exact and assumption-light; it treats the margin as
    proportional, which is the standard first-order correction.
    """
    arr = np.asarray(raw, dtype=float)
    total = float(arr.sum())
    if total <= 0:
        raise ValueError("implied probabilities must be positive")
    if total < 1.0 - 1e-9:
        raise ValueError("booksum below 1: arbitrage or wrong inputs")
    return arr / total


def shin_devig(raw: Sequence[float]) -> Tuple[np.ndarray, float]:
    """
    Shin (1993) insider-trading de-vig. Returns (fair probabilities, z), where z
    is the estimated share of insider money.

    Shin's model asserts that the book's quoted probabilities satisfy

        pi_i = ( (z^2 + 4(1 - z) * pi_i_true^2 / B) ^ (1/2) - z ) / (2 (1 - z))

    with B = sum of the book's quoted probabilities, and solves for the z that
    makes the recovered true probabilities sum to 1. That z is found here by a
    bracketed root-solve on the sum-to-one condition rather than by any closed
    form, so the answer is the model's, not an algebraic shortcut's.

    Properties the tests pin: z == 0 reproduces multiplicative exactly, a
    symmetric book returns 0.5/0.5, and the correction always moves favourites
    up and longshots down relative to raw.
    """
    arr = np.asarray(raw, dtype=float)
    B = float(arr.sum())
    if np.any(arr <= 0):
        raise ValueError("implied probabilities must be positive")
    if B < 1.0 - 1e-12:
        raise ValueError("booksum below 1: arbitrage, not a de-viggable book")
    if B <= 1.0 + 1e-12:
        # A margin-free book carries no insider premium to recover: z = 0 and the
        # fair probabilities ARE the quoted ones. Returning here rather than
        # raising, because a fair book is a legitimate input (the +100/+100
        # benchmark) whereas B < 1 is genuine arbitrage.
        return arr / B, 0.0

    def recovered(z: float) -> np.ndarray:
        if z <= 0.0:
            return arr / B
        disc = z * z + 4.0 * (1.0 - z) * (arr * arr) / B
        return (np.sqrt(np.maximum(disc, 0.0)) - z) / (2.0 * (1.0 - z))

    def gap(z: float) -> float:
        return float(recovered(z).sum() - 1.0)

    # gap(0) = 0 by construction, and gap grows with z for a real book, so the
    # root is bracketed on (tiny positive, just under 1).
    lo, hi = 1e-12, 1.0 - 1e-9
    if gap(lo) * gap(hi) > 0:
        # No interior root: the book's margin is already consistent with z = 0.
        return arr / B, 0.0
    z = float(optimize.brentq(gap, lo, hi, xtol=1e-15, rtol=1e-15))
    return recovered(z), z


def devig_two_way(price_a: float, price_b: float, method: str = "shin") -> Dict[str, object]:
    """
    De-vig a two-way market given both American prices. This is the entry point
    the shade sheet would feed if it carried prices.
    """
    raw = np.array([american_to_implied(price_a), american_to_implied(price_b)], dtype=float)
    if method == "shin":
        fair, z = shin_devig(raw)
    elif method == "multiplicative":
        fair, z = multiplicative_devig(raw), 0.0
    else:
        raise ValueError(f"unknown de-vig method: {method}")
    return {
        "raw": raw.tolist(),
        "booksum": float(raw.sum()),
        "fair": fair.tolist(),
        "z": z,
        "method": method,
    }


# ---------------------------------------------------------------------------
# Distributions
# ---------------------------------------------------------------------------

CONTINUOUS_STATS = {"pass_yards", "rush_yards", "rush_rec_yards", "receiving_yards"}
COUNT_STATS = {"pass_tds", "rush_tds", "receiving_tds", "receptions", "rebounds", "assists"}


@dataclass
class NormalFit:
    """Mean/sigma normal, the same family the source sheet uses for its own P(over)."""

    mu: float
    sigma: float
    family: str = "normal"

    def p_over(self, line: float) -> float:
        return float(1.0 - stats.norm.cdf(line, loc=self.mu, scale=self.sigma))

    def p_under(self, line: float) -> float:
        return float(stats.norm.cdf(line, loc=self.mu, scale=self.sigma))


@dataclass
class LognormalFit:
    """
    Lognormal matched to (mean, sd) by method of moments. The right family for a
    non-negative continuous yardage stat: it cannot produce mass below zero, and
    its right skew matches how yardage actually distributes.
    """

    mu: float
    sigma: float
    family: str = "lognormal"

    def __post_init__(self) -> None:
        if self.mu <= 0 or self.sigma < 0:
            raise ValueError("lognormal fit needs mean > 0 and sd >= 0")
        ratio2 = (self.sigma / self.mu) ** 2
        self.sigma_ln = math.sqrt(math.log1p(ratio2))
        self.mu_ln = math.log(self.mu) - 0.5 * self.sigma_ln**2

    def p_over(self, line: float) -> float:
        if line <= 0:
            return 1.0
        return float(1.0 - stats.norm.cdf((math.log(line) - self.mu_ln) / self.sigma_ln))

    def p_under(self, line: float) -> float:
        return 1.0 - self.p_over(line)


@dataclass
class NegBinFit:
    """
    Negative binomial matched to (mean, variance) by method of moments, for
    discrete counts (touchdowns, receptions, rebounds). Overdispersion is the
    point: a Poisson forces variance == mean, which is false for counting stats
    that cluster.

    Only defined for variance > mean. A variance at or below the mean is reported
    as such rather than silently coerced onto a Poisson.
    """

    mean: float
    var: float
    family: str = "negbin"

    def __post_init__(self) -> None:
        if self.mean <= 0:
            raise ValueError("negbin needs a positive mean")
        if self.var <= self.mean:
            # Variance at or under the mean is under-dispersed: no negative
            # binomial fits it (r would be infinite or negative). Raising a typed
            # error rather than letting a ZeroDivisionError escape, and never
            # silently coercing onto a Poisson, which would overstate the edge in
            # a tail.
            raise ValueError(
                f"negbin needs variance > mean (overdispersion); got mean={self.mean}, var={self.var}"
            )
        self.r = self.mean**2 / (self.var - self.mean)
        self.p = self.r / (self.r + self.mean)

    def p_over(self, line: float) -> float:
        # P(X > line) with the strict inequality the market means by "over".
        k = math.floor(line)
        return float(1.0 - stats.nbinom.cdf(k, self.r, self.p))

    def p_under(self, line: float) -> float:
        return 1.0 - self.p_over(line)


@dataclass
class PoissonFit:
    """
    Poisson with a given mean. Used as the equi-dispersed limit of the negative
    binomial, and as the explicit fallback for an UNDER-dispersed count stat
    (variance below the mean), which no negative binomial can represent.

    `underdispersed` is surfaced rather than hidden: a count stat less variable
    than Poisson is a real situation for rare, near-binary events, and a caller
    that silently treated it as Poisson-without-comment would be overstating how
    well the family fits.
    """

    mean: float
    family: str = "poisson"
    underdispersed: bool = False

    def p_over(self, line: float) -> float:
        return float(1.0 - stats.poisson.cdf(math.floor(line), self.mean))

    def p_under(self, line: float) -> float:
        return 1.0 - self.p_over(line)


def fit_for_stat(stat: str, mu: float, sigma: float):
    """
    Route a stat to its distribution family.

    Counts go to the negative binomial when they are over-dispersed (the usual
    case) and to a flagged Poisson when they are not, so an under-dispersed count
    degrades honestly instead of raising inside the board build.
    """
    key = stat.strip().lower()
    if key in COUNT_STATS:
        if sigma**2 > mu:
            return NegBinFit(mean=mu, var=sigma**2)
        return PoissonFit(mean=mu, underdispersed=True)
    if key in CONTINUOUS_STATS:
        return LognormalFit(mu=mu, sigma=sigma)
    raise ValueError(f"unknown stat type: {stat}")


# ---------------------------------------------------------------------------
# Staking and edge
# ---------------------------------------------------------------------------

def ev_per_unit(p_win: float, breakeven: float) -> float:
    """
    Expected profit per unit staked for a single leg, from the breakeven rate.

    A breakeven b implies profit odds of (1 - b)/b (because b * profit = 1 - b at
    EV zero). So EV = p * (1 - b)/b - (1 - p).
    """
    profit_odds = (1.0 - breakeven) / breakeven
    return p_win * profit_odds - (1.0 - p_win)


def kelly_fraction(p_win: float, breakeven: float, fraction: float = 0.25) -> float:
    """
    Kelly stake as a fraction of bankroll, then scaled down.

    Full Kelly for profit odds b is f* = (p(1+b) - 1)/b. Negative Kelly means no
    stake, and it is clamped at 0 rather than reported as a short position.
    """
    profit_odds = (1.0 - breakeven) / breakeven
    full = (p_win * (1.0 + profit_odds) - 1.0) / profit_odds
    if full <= 0:
        return 0.0
    return float(full * fraction)


# ---------------------------------------------------------------------------
# Board construction
# ---------------------------------------------------------------------------

@dataclass
class PropRow:
    player: str
    stat: str
    dk_mu: float
    dk_sigma: float
    dk_main: float
    pp_line: float
    pp_alts: int
    sheet_z: float
    sheet_p_over: float
    game: Optional[str] = None
    shade: Optional[float] = None


def read_edge_sheet(path: Path) -> List[PropRow]:
    rows: List[PropRow] = []
    with path.open(encoding="utf-8-sig", newline="") as fh:
        for rec in csv.DictReader(fh):
            rows.append(
                PropRow(
                    player=rec["player"].strip(),
                    stat=rec["stat"].strip(),
                    dk_mu=float(rec["dk_mu"]),
                    dk_sigma=float(rec["dk_sigma"]),
                    dk_main=float(rec["dk_main"]),
                    pp_line=float(rec["pp_primary"]),
                    pp_alts=int(float(rec["pp_alts"])),
                    sheet_z=float(rec["z"]),
                    sheet_p_over=float(rec["p_over_at_pp"]),
                )
            )
    return rows


def read_shade_sheet(path: Path) -> Dict[str, Dict[str, float]]:
    """game -> {dk_sp, pin_sp, dk_total, pin_total, total_shade}"""
    out: Dict[str, Dict[str, float]] = {}
    with path.open(encoding="utf-8-sig", newline="") as fh:
        for rec in csv.DictReader(fh):
            out[rec["game"].strip()] = {
                "dk_sp": float(rec["dk_sp_h"]),
                "pin_sp": float(rec["pin_sp_h"]),
                "dk_total": float(rec["dk_total"]),
                "pin_total": float(rec["pin_total"]),
                "total_shade": float(rec["total_shade"]),
            }
    return out


#: player -> game, taken from each club's Week 6 fixture. Declared explicitly so
#: the join is auditable rather than inferred from name similarity.
PLAYER_GAME: Dict[str, str] = {
    "james cook": "BUF@LAR",
    "daniel jones": "IND@PIT",
    "joe burrow": "CIN@MIA",
    "geno smith": "CLE@NYJ",
    "dandre swift": "CHI@GB",
    "tyler shough": "MIN@NO",
    "jordan love": "CHI@GB",
    "trevor lawrence": "PHI@JAX",
    "aaron rodgers": "IND@PIT",
    "jared goff": "DET@ARI",
    "kirk cousins": "MIN@NO",
    "jameis winston": "NYG@WAS",
    "jayden daniels": "NYG@WAS",
    "michael penix": "BAL@ATL",
    "jacoby brissett": "DET@ARI",
    "malik willis": "CLE@NYJ",
    "jalen hurts": "PHI@JAX",
    "jahmyr gibbs": "DET@ARI",
    "aaron jones": "MIN@NO",
    "tyler huntley": "BAL@ATL",
    "bijan robinson": "BAL@ATL",
}


def shade_scenario(row: PropRow, shade: Dict[str, float]) -> Dict[str, float]:
    """
    Line-shade sensitivity, NOT a de-vigged market probability.

    Pinnacle's total is treated as the sharper estimate of the scoring
    environment, so the player's expected volume is rescaled by the ratio
    pin_total / dk_total and the probability is recomputed. The ratio is a
    stated modelling coefficient, not a measurement, and the result is reported
    beside the primary number rather than inside it.
    """
    ratio = shade["pin_total"] / shade["dk_total"]
    scaled = fit_for_stat(row.stat, row.dk_mu * ratio, row.dk_sigma * ratio)
    return {
        "total_ratio": ratio,
        "mu_scaled": row.dk_mu * ratio,
        "p_over_scaled": float(scaled.p_over(row.pp_line)),
    }


def build_board(
    props: Sequence[PropRow],
    shades: Dict[str, Dict[str, float]],
    market: str = "5-flex",
    alt_scenario: str = "2-pick",
) -> Dict[str, object]:
    breakeven = BREAKEVENS[market]
    board: List[Dict[str, object]] = []

    for row in props:
        fit = fit_for_stat(row.stat, row.dk_mu, row.dk_sigma)
        p_over = float(fit.p_over(row.pp_line))
        p_under = float(fit.p_under(row.pp_line))

        normal = NormalFit(row.dk_mu, row.dk_sigma)
        p_over_normal = float(normal.p_over(row.pp_line))
        p_under_normal = 1.0 - p_over_normal

        # The side the model likes best, and its EV at the given breakeven.
        if p_over >= p_under:
            side, p_win = "OVER", p_over
        else:
            side, p_win = "UNDER", p_under

        ev = ev_per_unit(p_win, breakeven)
        ev_alt = ev_per_unit(p_win, BREAKEVENS[alt_scenario])

        # THE FALSIFIER. The source sheet's own P(over) is normal-based, so if the
        # skewed family reports a large edge that the normal does not, the edge is
        # a property of the family swap and not of the market. `ev_pct_normal`
        # recomputes the same bet on the normal basis, and `edge_survives_normal`
        # is what the tier gate reads.
        p_win_normal = max(p_over_normal, p_under_normal)
        ev_normal = ev_per_unit(p_win_normal, breakeven)

        game = PLAYER_GAME.get(row.player)
        shade = shades.get(game) if game else None
        scenario = shade_scenario(row, shade) if shade else None

        board.append(
            {
                "player": row.player,
                "stat": row.stat,
                "game": game,
                "pp_line": row.pp_line,
                "dk_main": row.dk_main,
                "dk_mu": row.dk_mu,
                "dk_sigma": row.dk_sigma,
                "distribution": fit.family,
                "p_over": p_over,
                "p_under": p_under,
                "side": side,
                "p_win": p_win,
                "ev_pct": ev * 100.0,
                "ev_pct_alt_market": ev_alt * 100.0,
                "kelly_quarter": kelly_fraction(p_win, breakeven),
                "sheet_p_over": row.sheet_p_over,
                "p_over_normal": p_over_normal,
                "p_win_normal": p_win_normal,
                "ev_pct_normal": ev_normal * 100.0,
                "edge_survives_normal": bool(ev_normal > 0),
                "distribution_choice_delta": p_over - p_over_normal,
                "shade": (
                    None
                    if shade is None
                    else {
                        "total_shade": shade["total_shade"],
                        "spread_shade": shade["pin_sp"] - shade["dk_sp"],
                        **scenario,
                    }
                ),
            }
        )

    board.sort(key=lambda r: r["ev_pct"], reverse=True)
    for i, r in enumerate(board, start=1):
        r["rank"] = i
        r["tier"] = confidence_tier(r, breakeven)

    return {
        # Doctrine stamp, mirroring intelligence/sgp/price_from_real_prices.py:
        # every emitted board carries its gate metadata so no downstream
        # consumer (watchdog announcer, page surface, bus reader) can mistake
        # model diagnostics for a cleared pick or an edge claim.
        "label": "DIAGNOSTIC",
        "is_pick": False,
        "is_edge_claim": False,
        "rvc_cleared": False,
        "caveat": (
            "DIAGNOSTIC ONLY — residual-versus-close has NOT cleared. EV and "
            "Kelly figures on this board are model diagnostics computed from "
            "price-less input sheets, not picks, edges, or recommendations."
        ),
        "market": market,
        "breakeven": breakeven,
        "alt_market": alt_scenario,
        "alt_breakeven": BREAKEVENS[alt_scenario],
        "n_props": len(board),
        "n_positive_ev": sum(1 for r in board if r["ev_pct"] > 0),
        "board": board,
    }


def confidence_tier(row: Dict[str, object], breakeven: float) -> str:
    """
    Tiers by margin over breakeven AND survival of the distributional swap.

    A positive EV that exists only under one distributional assumption is not the
    same finding as one that survives both, so the gate reads the normal-basis EV
    as well as the family-basis EV.

    A  -> EV >= +5%, families agree on the side, AND EV is positive on the
          normal basis too
    B  -> EV >= +2% with the same two conditions
    C  -> positive EV that fails either condition (side flips, or the edge does
          not survive the normal basis), or EV < +2%
    PASS -> no edge at this breakeven
    """
    ev = float(row["ev_pct"])
    p_over = float(row["p_over"])
    p_over_normal = float(row["p_over_normal"])
    agree = (p_over >= 0.5) == (p_over_normal >= 0.5)
    survives = bool(row.get("edge_survives_normal", False))
    if ev <= 0:
        return "PASS"
    if not agree:
        return "C"
    if not survives:
        # The skewed family manufactures this edge; the normal basis does not
        # see it. Capped below investment grade rather than promoted.
        return "C"
    if ev >= 5.0:
        return "A"
    if ev >= 2.0:
        return "B"
    return "C"


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def render_markdown(result: Dict[str, object], top_n: int = 20) -> str:
    lines = [
        "# Props EV board",
        "",
        "> **DIAGNOSTIC ONLY** — residual-versus-close has NOT cleared. "
        "Not picks, edges, or recommendations.",
        "",
        f"Market: **{result['market']}** (breakeven {result['breakeven']:.3f}) · "
        f"alt: {result['alt_market']} (breakeven {result['alt_breakeven']:.3f})",
        "",
        f"{result['n_props']} props scored · {result['n_positive_ev']} at positive EV.",
        "",
        "## Top 20 by EV",
        "",
        "| # | Player | Stat | Side | PP line | p(win) model | p(win) book-normal | EV% | EV% normal basis | ¼-Kelly | Tier | Shade |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in result["board"][:top_n]:
        shade = r["shade"]
        shade_txt = "—" if not shade else f"{shade['total_shade']:+.1f}"
        lines.append(
            f"| {r['rank']} | {r['player'].title()} | {r['stat']} | {r['side']} | "
            f"{r['pp_line']:g} | {r['p_win']:.3f} | {r['p_win_normal']:.3f} | "
            f"{r['ev_pct']:+.1f}% | {r['ev_pct_normal']:+.1f}% | "
            f"{r['kelly_quarter']*100:.2f}% | {r['tier']} | {shade_txt} |"
        )
    lines += [
        "",
        "## Reading this board",
        "",
        "* **p(win)** is a MODEL probability from the distribution fitted to "
        "DraftKings' own mean and sigma for that stat — not a de-vigged market "
        "probability. Neither source sheet carries a price, so no market "
        "probability can be recovered from them.",
        "* **EV%** is per unit staked, from the breakeven rate, using profit odds "
        "(1-b)/b. ¼-Kelly is the stake fraction; it is 0.00% whenever EV is negative.",
        "* **Tier** requires the normal and lognormal to agree on the side. A row "
        "whose side depends on the distribution family is capped at C.",
        "* **Shade** is the Pinnacle-minus-DraftKings total, shown as context. It "
        "is NOT folded into EV; the sensitivity version is in the JSON.",
        "* No price appears anywhere in the inputs, so this board prices PP "
        "against a model, not against a sharp market.",
        "",
    ]
    return "\n".join(lines)


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Prop discrepancy & Pinnacle shade engine")
    parser.add_argument("--edge-sheet", default=str(EDGE_SHEET))
    parser.add_argument("--shade-sheet", default=str(SHADE_SHEET))
    parser.add_argument("--breakeven", default="5-flex", choices=sorted(BREAKEVENS))
    parser.add_argument("--top", type=int, default=20)
    args = parser.parse_args(argv)

    edge_path = Path(args.edge_sheet)
    shade_path = Path(args.shade_sheet)
    for p in (edge_path, shade_path):
        if not p.exists():
            print(f"[props] MISSING input: {p}")
            return 2

    props = read_edge_sheet(edge_path)
    shades = read_shade_sheet(shade_path)

    derived = breakeven_from_flex_payouts(FLEX_5_PAYOUTS, 5)
    print(f"[props] edge sheet: {edge_path.name} — {len(props)} props")
    print(f"[props] shade sheet: {shade_path.name} — {len(shades)} games")
    print(f"[props] breakeven check: 0.542 stated vs {derived:.6f} derived from the flex payout table")
    print(f"[props] 2-pick breakeven: stated {BREAKEVENS['2-pick']:.3f} vs "
          f"{breakeven_from_return(TWO_PICK_RETURN):.6f} derived from a {TWO_PICK_RETURN}x return")

    unpriced = "no prices in either input"
    print(f"[props] de-vig status: IMPLEMENTED, UNEXERCISED — {unpriced}")
    print(f"[props] games with shade: {len(shades)}; props joined to a game: "
          f"{sum(1 for r in props if r.player in PLAYER_GAME)}")

    result = build_board(props, shades, market=args.breakeven)
    md = render_markdown(result, top_n=args.top)

    OUTBOX_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTBOX_JSON.write_text(json.dumps(result, indent=2), encoding="utf-8")
    OUTBOX_MD.write_text(md, encoding="utf-8")

    print()
    header = f"{'#':>3} {'player':<18} {'stat':<16} {'side':<6} {'line':>7} {'p(win)':>7} {'EV%':>8} {'¼Kelly':>8} tier"
    print(header)
    print("-" * len(header))
    for r in result["board"][: args.top]:
        print(
            f"{r['rank']:>3} {r['player']:<18} {r['stat']:<16} {r['side']:<6} "
            f"{r['pp_line']:>7g} {r['p_win']:>7.3f} {r['ev_pct']:>+8.2f} "
            f"{r['kelly_quarter']*100:>7.2f}% {r['tier']}"
        )

    tiers: Dict[str, int] = {}
    for r in result["board"]:
        tiers[r["tier"]] = tiers.get(r["tier"], 0) + 1
    n_under = sum(1 for r in result["board"] if r["side"] == "UNDER")
    n_survive = sum(1 for r in result["board"] if r["edge_survives_normal"])
    print()
    print(f"[props] tiers: {tiers}")
    print(f"[props] positive EV: {result['n_positive_ev']} of {result['n_props']}")
    print(f"[props] side split: UNDER {n_under} / OVER {result['n_props'] - n_under}")
    print(
        f"[props] WARNING 1: a one-sided board is the signature of a modelling artifact, not of "
        f"{n_under} independent mispricings."
    )
    print(
        f"[props] WARNING 2: only {n_survive} of {result['n_props']} edges stay positive on the "
        f"book's OWN normal basis. The rest are created by the family swap."
    )
    print(f"[props] wrote {OUTBOX_JSON}")
    print(f"[props] wrote {OUTBOX_MD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
