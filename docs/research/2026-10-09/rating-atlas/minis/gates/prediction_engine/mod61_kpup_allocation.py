#!/usr/bin/env python3
"""
Module 61: decision/2507-05994v1-kpup-allocation.ts
arXiv: 2507.05994 — k-periodic universal portfolio allocation

Faithful Python port of the TypeScript module's core functions + acceptance gate evaluator.

GATE: Tests a k-periodic universal portfolio (k = 7 day-of-week or situational buckets,
each learning its own allocation) against flat fractional Kelly.
Pass = "ADAPT if on walk-forward (k chosen on 2023, evaluated 2024-2025) the k-PUP
bankroll multiple exceeds flat fractional-Kelly by >=10% with max drawdown no worse
than 1.2x the baseline's."
Fail = under 10% multiple gain, or drawdown beyond 1.2x.

Status: wired as eval code. NOT EVALUATED on real walk-forward data yet.
"""
from dataclasses import dataclass
from typing import List
import math


@dataclass
class Bet:
    id: str
    bucket: int          # k-periodic bucket index (0..k-1), e.g. day-of-week
    edge: float          # estimated edge (expected log-wealth contribution)
    won: bool
    payout: float        # decimal payout on win (e.g. 1.91 for -110)


def fractional_kelly_stake(edge: float, payout: float, frac: float = 0.5) -> float:
    """Flat fractional-Kelly stake as a fraction of bankroll."""
    if payout <= 1.0 or edge <= 0:
        return 0.0
    b = payout - 1.0
    p = (1.0 + edge / b) / 2.0  # implied win prob from edge under even-money framing
    p = max(0.01, min(0.99, p))
    kelly = (p * b - (1 - p)) / b
    return max(0.0, frac * kelly)


def run_flat_kelly(bets: List[Bet], frac: float = 0.5) -> List[float]:
    """Bankroll path under flat fractional Kelly. Returns equity curve."""
    bank = 1.0
    curve = [bank]
    for bet in bets:
        stake = fractional_kelly_stake(bet.edge, bet.payout, frac) * bank
        stake = min(stake, 0.25 * bank)  # sanity cap
        if bet.won:
            bank += stake * (bet.payout - 1.0)
        else:
            bank -= stake
        curve.append(bank)
    return curve


def run_kpup(bets: List[Bet], k: int, frac: float = 0.5) -> List[float]:
    """k-periodic universal portfolio: per-bucket stake multiplier learned online.

    Each bucket tracks its own realized log-wealth; the bucket multiplier tilts
    toward buckets with better recent performance (universal-portfolio style).
    """
    bank = 1.0
    curve = [bank]
    bucket_logw = [0.0] * k
    bucket_n = [0] * k
    for bet in bets:
        b = bet.bucket % k
        # bucket tilt: softmax over bucket log-wealth, centered at 1.0 mean
        mx = max(bucket_logw)
        w = [math.exp(x - mx) for x in bucket_logw]
        tilt = (w[b] / (sum(w) / k))
        tilt = max(0.25, min(4.0, tilt))
        stake = fractional_kelly_stake(bet.edge, bet.payout, frac) * bank * tilt
        stake = min(stake, 0.25 * bank)
        if bet.won:
            bank += stake * (bet.payout - 1.0)
            bucket_logw[b] += math.log1p(stake * (bet.payout - 1.0) / bank) if bank > 0 else 0.0
        else:
            bank -= stake
            if bank > 0 and stake > 0:
                bucket_logw[b] += math.log(max(1e-9, 1.0 - stake / (bank + stake)))
        bucket_n[b] += 1
        curve.append(max(bank, 1e-9))
    return curve


def max_drawdown(curve: List[float]) -> float:
    peak = curve[0]
    dd = 0.0
    for x in curve:
        peak = max(peak, x)
        dd = max(dd, (peak - x) / peak if peak > 0 else 0.0)
    return dd


def choose_k(train_bets: List[Bet], candidates: List[int], frac: float = 0.5) -> int:
    """Choose k on the 2023 training block by best bankroll multiple."""
    best_k, best_mult = candidates[0], -1.0
    for k in candidates:
        curve = run_kpup(train_bets, k, frac)
        mult = curve[-1] / curve[0]
        if mult > best_mult:
            best_k, best_mult = k, mult
    return best_k


def evaluate_gate(train_bets: List[Bet], eval_bets: List[Bet],
                  k_candidates: List[int] = None, frac: float = 0.5) -> dict:
    """Run the acceptance gate. REFUSE on empty inputs or no winning k."""
    if k_candidates is None:
        k_candidates = [1, 3, 7, 14]
    if not train_bets or not eval_bets:
        return {"verdict": "REFUSE", "reason": "empty train or eval bet set"}
    k = choose_k(train_bets, k_candidates, frac)
    kpup_curve = run_kpup(eval_bets, k, frac)
    kelly_curve = run_flat_kelly(eval_bets, frac)
    kpup_mult = kpup_curve[-1] / kpup_curve[0]
    kelly_mult = kelly_curve[-1] / kelly_curve[0]
    gain = (kpup_mult - kelly_mult) / kelly_mult if kelly_mult > 0 else 0.0
    kpup_dd = max_drawdown(kpup_curve)
    kelly_dd = max_drawdown(kelly_curve)
    dd_ratio = (kpup_dd / kelly_dd) if kelly_dd > 0 else (0.0 if kpup_dd == 0 else float("inf"))
    passes = gain >= 0.10 and dd_ratio <= 1.2
    return {
        "module": "2507-05994v1-kpup-allocation",
        "verdict": "PASS" if passes else "FAIL",
        "k_chosen_on_train": k,
        "k_candidates": k_candidates,
        "kpup_bankroll_multiple": round(kpup_mult, 4),
        "kelly_bankroll_multiple": round(kelly_mult, 4),
        "multiple_gain": round(gain, 4),
        "multiple_gain_required": 0.10,
        "kpup_max_drawdown": round(kpup_dd, 4),
        "kelly_max_drawdown": round(kelly_dd, 4),
        "drawdown_ratio": round(dd_ratio, 4) if dd_ratio != float("inf") else "inf",
        "drawdown_ratio_max": 1.2,
        "n_train": len(train_bets),
        "n_eval": len(eval_bets),
    }


if __name__ == "__main__":
    import random
    random.seed(61)
    # Synthetic: bucket 2 (e.g. a soft day) has genuine edge, others are noise.
    def mk(n, edge_fn):
        bets = []
        for i in range(n):
            b = i % 7
            edge = edge_fn(b)
            p = 0.5 + edge / 2.0
            bets.append(Bet(f"b{i}", b, edge, random.random() < p, 1.91))
        return bets
    train = mk(1200, lambda b: 0.06 if b == 2 else 0.005)
    evalu = mk(2000, lambda b: 0.06 if b == 2 else 0.005)
    print(evaluate_gate(train, evalu))
