"""
NFL Discrete Margin Key-Number Mixture Engine
=============================================
Grounded in:
- Stern, H. (1991). On the Probability of Winning a Football Game.
  The American Statistician 45(3), 179-183.
- Glickman, M. E. & Stern, H. S. (1998). A State-Space Model for National
  Football League Scores. JASA 93(441), 25-35.

Eliminates Gaussian spread pricing distortion by modeling NFL point margins as
a mixture of a continuous Stern-normal bulk distribution and discrete point
masses at historical NFL key numbers (3, 7, 6, 10, 14, 4) in both directions.
"""

from __future__ import annotations
import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Sequence, Any


# Classic NFL key-number magnitudes in order of historical frequency
NFL_KEY_NUMBERS = [3, 7, 6, 10, 14, 4]

# Signed landing spots: a home win and away win by each key number
NFL_SIGNED_KEY_NUMBERS = [-14, -10, -7, -6, -4, -3, 3, 4, 6, 7, 10, 14]

# Historical empirical frequencies across modern NFL era (1994-2025, ~8,000 games)
# Margins landing on key numbers (both signs combined):
# 3: 14.8%, 7: 9.2%, 6: 5.9%, 10: 5.7%, 14: 4.8%, 4: 3.8%
HISTORICAL_KEY_MASS_PRIORS: Dict[int, float] = {
    3: 0.076, -3: 0.072,  # 14.8% total on 3
    7: 0.048, -7: 0.044,  # 9.2% total on 7
    6: 0.031, -6: 0.028,  # 5.9% total on 6
    10: 0.030, -10: 0.027, # 5.7% total on 10
    14: 0.025, -14: 0.023, # 4.8% total on 14
    4: 0.020, -4: 0.018,  # 3.8% total on 4
}

MIN_SAMPLES_FOR_MARGIN_MIXTURE = 40
KEY_MASS_LAPLACE_ALPHA = 0.5
SQRT_2PI = math.sqrt(2 * math.pi)


def _normal_cdf(z: float) -> float:
    """Standard normal cumulative distribution function (error function approximation)."""
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def _normal_pdf(x: float, mu: float, sigma: float) -> float:
    """Gaussian probability density function."""
    if sigma <= 0.0:
        return 0.0
    z = (x - mu) / sigma
    return math.exp(-0.5 * z * z) / (sigma * SQRT_2PI)


@dataclass(frozen=True)
class KeyNumberMass:
    margin: int
    count: int
    mass: float


@dataclass(frozen=True)
class CoverProbability:
    home: float
    away: float
    push: float

    @property
    def home_cover_pct(self) -> float:
        return self.home * 100.0

    @property
    def away_cover_pct(self) -> float:
        return self.away * 100.0

    @property
    def push_pct(self) -> float:
        return self.push * 100.0


@dataclass(frozen=True)
class NflMarginMixtureFit:
    verdict: str  # "fitted", "prior_calibrated", "insufficient_data"
    n: int
    mu: float
    sigma: float
    continuous_weight: float
    key_masses: Tuple[KeyNumberMass, ...]
    reason: str


class NFLDiscreteMarginEngine:
    """
    Sovereign NFL Discrete Margin Distribution Engine.
    Combines continuous Stern-normal latent margin with empirical point masses
    to compute exact cover, push, and against-the-spread (ATS) fair odds.
    """

    @classmethod
    def prior_calibrated_fit(cls, expected_margin: float, sigma: float = 13.4) -> NflMarginMixtureFit:
        """
        Builds a prior-calibrated Stern-normal mixture centered on `expected_margin`.
        Uses empirical NFL historical key masses and allocates remaining probability
        mass to the continuous Stern-normal component.
        """
        key_masses: List[KeyNumberMass] = []
        total_discrete_mass = 0.0

        for k in NFL_SIGNED_KEY_NUMBERS:
            mass = HISTORICAL_KEY_MASS_PRIORS.get(k, 0.0)
            key_masses.append(KeyNumberMass(margin=k, count=int(mass * 1000), mass=mass))
            total_discrete_mass += mass

        continuous_weight = max(0.05, 1.0 - total_discrete_mass)
        return NflMarginMixtureFit(
            verdict="prior_calibrated",
            n=8000,
            mu=float(expected_margin),
            sigma=float(sigma),
            continuous_weight=continuous_weight,
            key_masses=tuple(key_masses),
            reason=f"Prior-calibrated Stern-normal(mu={expected_margin:.2f}, sigma={sigma:.2f}) with 12 key masses."
        )

    @classmethod
    def fit_from_margins(cls, margins: Sequence[float], fallback_mu: float = 0.0) -> NflMarginMixtureFit:
        """
        Fits mixture from empirical sample of home margins (homeScore - awayScore).
        Applies Laplace smoothing across signed key numbers and estimates residual
        Gaussian standard deviation on the non-key margins.
        """
        clean = [float(m) for m in margins if math.isfinite(m)]
        n = len(clean)

        if n < MIN_SAMPLES_FOR_MARGIN_MIXTURE:
            # Fall back to prior calibration with observed mean or fallback_mu
            mu = sum(clean) / n if n > 0 else fallback_mu
            return cls.prior_calibrated_fit(expected_margin=mu)

        counts: Dict[int, int] = {k: 0 for k in NFL_SIGNED_KEY_NUMBERS}
        leftover: List[float] = []

        for m in clean:
            rounded = int(round(m))
            if rounded in counts and abs(m - rounded) < 1e-4:
                counts[rounded] += 1
            else:
                leftover.push(m) if hasattr(leftover, 'push') else leftover.append(m)

        k_count = len(NFL_SIGNED_KEY_NUMBERS)
        denom = n + KEY_MASS_LAPLACE_ALPHA * k_count

        key_masses: List[KeyNumberMass] = []
        for k in NFL_SIGNED_KEY_NUMBERS:
            cnt = counts[k]
            mass = (cnt + KEY_MASS_LAPLACE_ALPHA) / denom
            key_masses.append(KeyNumberMass(margin=k, count=cnt, mass=mass))

        total_discrete_mass = sum(km.mass for km in key_masses)
        continuous_weight = max(0.0, 1.0 - total_discrete_mass)

        continuous_sample = leftover if len(leftover) >= 2 else clean
        mu = sum(continuous_sample) / len(continuous_sample)
        var = sum((x - mu) ** 2 for x in continuous_sample) / (len(continuous_sample) - 1)
        sigma = math.sqrt(var) if var > 0.0 else 13.4

        return NflMarginMixtureFit(
            verdict="fitted",
            n=n,
            mu=mu,
            sigma=sigma,
            continuous_weight=continuous_weight,
            key_masses=tuple(key_masses),
            reason=f"Fitted Stern-normal(mu={mu:.2f}, sigma={sigma:.2f}) from N={n} samples."
        )

    @classmethod
    def key_mass_at(cls, fit: NflMarginMixtureFit, margin: int) -> float:
        """Returns the discrete point mass at exact integer margin."""
        for km in fit.key_masses:
            if km.margin == margin:
                return km.mass
        return 0.0

    @classmethod
    def mixture_cdf(cls, fit: NflMarginMixtureFit, threshold: float) -> float:
        """Evaluates mixture cumulative distribution function: P(Margin <= threshold)."""
        if fit.sigma <= 0.0:
            return 0.5
        z = (threshold - fit.mu) / fit.sigma
        p_cont = fit.continuous_weight * _normal_cdf(z)
        p_disc = sum(km.mass for km in fit.key_masses if km.margin <= threshold)
        return min(1.0, max(0.0, p_cont + p_disc))

    @classmethod
    def cover_probability(
        cls,
        fit: NflMarginMixtureFit,
        spread_home: float
    ) -> CoverProbability:
        """
        Calculates exact cover probabilities for HOME spread.
        Convention: spread_home < 0 means Home is favored (e.g. -3.5).
        Home covers iff Margin + spread_home > 0 (i.e. Margin > -spread_home).
        Push occurs when Margin == -spread_home (only possible on integer spreads).
        """
        threshold = -spread_home
        is_integer = abs(threshold - round(threshold)) < 1e-4
        push_margin = int(round(threshold)) if is_integer else None

        # Push mass is the discrete point mass at exactly -spread_home
        push_prob = cls.key_mass_at(fit, push_margin) if push_margin is not None else 0.0

        # Continuous probability that Margin > threshold:
        z = (threshold - fit.mu) / fit.sigma
        cont_home = fit.continuous_weight * (1.0 - _normal_cdf(z))

        # Discrete point masses where margin > threshold
        disc_home = sum(km.mass for km in fit.key_masses if km.margin > threshold)

        home_prob = cont_home + disc_home
        # Away covers the remainder:
        away_prob = max(0.0, 1.0 - home_prob - push_prob)

        # Normalize to ensure sum == 1.0
        total = home_prob + away_prob + push_prob
        if total > 0.0 and abs(total - 1.0) > 1e-6:
            home_prob /= total
            away_prob /= total
            push_prob /= total

        return CoverProbability(home=home_prob, away=away_prob, push=push_prob)

    @classmethod
    def density_weighted_cover_probability(
        cls,
        expected_margin: float,
        spread_home: float,
        sigma: float = 13.4
    ) -> CoverProbability:
        """
        Calculates exact cover probabilities for HOME spread using latent density-weighted
        key-number inflation.
        Accurately scales discrete point masses based on the expected game margin mu,
        ensuring that heavy favorites or underdogs properly cluster around key scores.
        """
        # Calculate empirical key multipliers over baseline Gaussian
        weights: Dict[int, float] = {}
        for k, pri in HISTORICAL_KEY_MASS_PRIORS.items():
            p_g = _normal_cdf((k + 0.5) / sigma) - _normal_cdf((k - 0.5) / sigma)
            if p_g > 0.0:
                weights[k] = pri / p_g

        # Discrete integer convolution over [-55, +55] point margins
        probs: Dict[int, float] = {}
        for m in range(-55, 56):
            p_g = _normal_cdf((m + 0.5 - expected_margin) / sigma) - _normal_cdf((m - 0.5 - expected_margin) / sigma)
            w = weights.get(m, 1.0)
            probs[m] = p_g * w

        tot = sum(probs.values())
        if tot > 0.0:
            for m in probs:
                probs[m] /= tot

        threshold = -spread_home
        is_int = abs(threshold - round(threshold)) < 1e-4
        push_m = int(round(threshold)) if is_int else None

        push_prob = probs.get(push_m, 0.0) if push_m is not None else 0.0
        home_prob = sum(p for m, p in probs.items() if m > threshold)
        away_prob = sum(p for m, p in probs.items() if m < threshold)

        # Normalize to ensure sum == 1.0
        tot_cover = home_prob + away_prob + push_prob
        if tot_cover > 0.0 and abs(tot_cover - 1.0) > 1e-6:
            home_prob /= tot_cover
            away_prob /= tot_cover
            push_prob /= tot_cover

        return CoverProbability(home=home_prob, away=away_prob, push=push_prob)

    @classmethod
    def naive_gaussian_cover(cls, expected_margin: float, spread_home: float, sigma: float = 13.4) -> CoverProbability:
        """
        Naive continuous Gaussian benchmark: ignores key number point masses.
        Demonstrates the pricing distortion on 3, 7, and 10.
        """
        threshold = -spread_home
        z = (threshold - expected_margin) / sigma
        home_cover = 1.0 - _normal_cdf(z)
        return CoverProbability(home=home_cover, away=1.0 - home_cover, push=0.0)

    @classmethod
    def evaluate_spread_alpha(
        cls,
        expected_margin: float,
        market_spread: float,
        sigma: float = 13.4
    ) -> Dict[str, Any]:
        """
        Quantifies the edge alpha gained by modeling discrete key-number mass
        versus naive Gaussian pricing.
        """
        fit = cls.prior_calibrated_fit(expected_margin, sigma=sigma)
        mixture_cover = cls.cover_probability(fit, market_spread)
        gaussian_cover = cls.naive_gaussian_cover(expected_margin, market_spread, sigma=sigma)

        home_diff = (mixture_cover.home - gaussian_cover.home) * 100.0
        threshold = -market_spread
        is_key = int(round(threshold)) in NFL_SIGNED_KEY_NUMBERS if abs(threshold - round(threshold)) < 1e-4 else False

        return {
            "market_spread": market_spread,
            "expected_margin": expected_margin,
            "mixture_home_cover": mixture_cover.home,
            "mixture_away_cover": mixture_cover.away,
            "mixture_push": mixture_cover.push,
            "gaussian_home_cover": gaussian_cover.home,
            "gaussian_away_cover": gaussian_cover.away,
            "key_number_alpha_pct": home_diff,
            "is_on_key_number": is_key,
            "key_margin": int(round(threshold)) if is_key else None
        }
