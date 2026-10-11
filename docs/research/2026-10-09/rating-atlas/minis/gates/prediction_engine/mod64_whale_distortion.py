#!/usr/bin/env python3
"""
Module 64: decision/2601-20452v1-whale-distortion.ts
arXiv: 2601.20452 — whale-distortion detector + fade-the-whale paper signal

Faithful Python port of the TypeScript module's core functions + acceptance gate evaluator.

GATE: Tests a whale-distortion detector (implied whale capital share behind a line
move) and a fade-the-whale paper signal, on reversion rate and post-vig profitability.
Pass = "ADAPT the detector if whale-flagged line moves reverse at a rate >=10 points
higher than size-matched unflagged moves over a full season AND the fade-the-whale
paper portfolio is profitable after vig."
Fail = under a 10-point reversion gap, or the paper portfolio is not profitable
after vig.

Status: wired as eval code. NOT EVALUATED on real walk-forward data yet.
"""
from dataclasses import dataclass
from typing import List


@dataclass
class LineMove:
    id: str
    move_pts: float          # absolute line movement in points
    whale_share: float       # implied whale capital share behind the move (0..1)
    reversed: bool           # did the move reverse by close (vs the move direction)
    paper_profit: float       # paper P&L fading the move, in units, BEFORE vig
    vig_cost: float = 0.05   # vig cost per paper bet in units


def detect_whale(move: LineMove, share_threshold: float = 0.35,
                 move_threshold: float = 1.0) -> bool:
    """Flag a move as whale-distorted: big move with high implied whale share."""
    return move.whale_share >= share_threshold and move.move_pts >= move_threshold


def reversion_rate(moves: List[LineMove]) -> float:
    if not moves:
        return 0.0
    return sum(1 for m in moves if m.reversed) / len(moves)


def size_matched_control(flagged: List[LineMove],
                         unflagged: List[LineMove]) -> List[LineMove]:
    """Size-match unflagged moves to flagged moves by move size (nearest neighbor)."""
    pool = sorted(unflagged, key=lambda m: m.move_pts)
    matched = []
    used = set()
    for f in sorted(flagged, key=lambda m: m.move_pts):
        best, best_d = None, float("inf")
        for i, u in enumerate(pool):
            if i in used:
                continue
            d = abs(u.move_pts - f.move_pts)
            if d < best_d:
                best, best_d = i, d
        if best is not None:
            used.add(best)
            matched.append(pool[best])
    return matched


def paper_portfolio_profit_after_vig(moves: List[LineMove]) -> float:
    """Total paper profit fading the flagged moves, after vig."""
    return sum(m.paper_profit - m.vig_cost for m in moves)


def evaluate_gate(moves: List[LineMove], share_threshold: float = 0.35,
                  move_threshold: float = 1.0) -> dict:
    """Run the acceptance gate. REFUSE on empty move set or no flagged moves."""
    if not moves:
        return {"verdict": "REFUSE", "reason": "empty line-move set"}
    flagged = [m for m in moves if detect_whale(m, share_threshold, move_threshold)]
    unflagged = [m for m in moves if not detect_whale(m, share_threshold, move_threshold)]
    if not flagged:
        return {"verdict": "REFUSE", "reason": "no whale-flagged moves at threshold"}
    if not unflagged:
        return {"verdict": "REFUSE", "reason": "no unflagged moves for control"}
    control = size_matched_control(flagged, unflagged)
    if not control:
        return {"verdict": "REFUSE", "reason": "size-matched control empty"}
    rev_flagged = reversion_rate(flagged)
    rev_control = reversion_rate(control)
    gap_pp = (rev_flagged - rev_control) * 100.0
    profit = paper_portfolio_profit_after_vig(flagged)
    passes = gap_pp >= 10.0 and profit > 0.0
    return {
        "module": "2601-20452v1-whale-distortion",
        "verdict": "PASS" if passes else "FAIL",
        "share_threshold": share_threshold,
        "move_threshold_pts": move_threshold,
        "n_flagged": len(flagged),
        "n_control": len(control),
        "reversion_rate_flagged": round(rev_flagged, 4),
        "reversion_rate_control": round(rev_control, 4),
        "reversion_gap_pp": round(gap_pp, 3),
        "reversion_gap_required_pp": 10.0,
        "paper_profit_after_vig_units": round(profit, 3),
        "profit_required": ">0",
        "n_moves": len(moves),
    }


if __name__ == "__main__":
    import random
    random.seed(64)
    # Synthetic: whale-flagged moves genuinely reverse more often and fade is profitable.
    moves = []
    for i in range(800):
        whale = random.random() < 0.25
        share = random.uniform(0.4, 0.8) if whale else random.uniform(0.0, 0.3)
        pts = random.uniform(1.0, 3.0)
        rev_p = 0.62 if whale else 0.48
        rev = random.random() < rev_p
        profit = 0.08 if rev else -0.10
        moves.append(LineMove(f"m{i}", pts, share, rev, profit))
    print(evaluate_gate(moves))
