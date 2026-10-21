"""
test_glicko2_trueskill.py
Canonical unit tests verifying:
1. Glickman (2001) standard benchmark:
   - Initial: rating 1500, RD 200, vol 0.06
   - Opponents: (1400, 30), (1550, 100), (1700, 300) with outcomes [1, 0, 0]
   - Expected post-update: rating ~ 1464.05, RD ~ 151.52, vol ~ 0.059996
2. Illinois root-finding convergence for volatility sigma'
3. Idle period RD inflation: 200 -> 200.27
4. Ford (1957) connected graph condition for BTL (fail-closed null return on disconnected/undefeated)
5. TrueSkill factor graph update with non-linear V(t, eps) and W(t, eps) functions
"""
import math
import pytest
from glicko2_trueskill_engine import (
    CanonicalGlicko2Engine,
    GlickoPlayer,
    BradleyTerryLuceEngine,
    TrueSkillFactorGraphEngine,
)

def test_canonical_glicko2_glickman_benchmark():
    engine = CanonicalGlicko2Engine(tau=0.5)
    player = GlickoPlayer(rating=1500.0, rd=200.0, volatility=0.06)

    opponents = [
        (GlickoPlayer(rating=1400.0, rd=30.0), 1.0),
        (GlickoPlayer(rating=1550.0, rd=100.0), 0.0),
        (GlickoPlayer(rating=1700.0, rd=300.0), 0.0),
    ]

    updated = engine.update_rating(player, opponents)

    # Glickman's published values: rating 1464.05, RD 151.52, vol 0.059996
    assert math.isclose(updated.rating, 1464.05, abs_tol=0.2)
    assert math.isclose(updated.rd, 151.52, abs_tol=0.2)
    assert math.isclose(updated.volatility, 0.059996, abs_tol=1e-4)

def test_glicko2_idle_inflation():
    engine = CanonicalGlicko2Engine(tau=0.5)
    player = GlickoPlayer(rating=1500.0, rd=200.0, volatility=0.06)

    # An idle period with no matches inflates RD
    idle = engine.update_rating(player, [])
    assert idle.rating == 1500.0
    # phi_star = sqrt(phi^2 + sigma^2) -> RD_star = min(350, phi_star * 173.7178) ~= 200.27
    assert idle.rd > 200.0
    assert math.isclose(idle.rd, 200.27, abs_tol=0.2)

def test_btl_fail_closed_on_undefeated():
    teams = ["Chiefs", "Raiders", "Broncos"]
    # Undefeated team: A beat B, B beat C, but nobody beat A
    pairwise_wins = {
        ("Chiefs", "Raiders"): 2,
        ("Raiders", "Broncos"): 1,
    }
    strengths = BradleyTerryLuceEngine.solve_mle_or_fail_closed(teams, pairwise_wins)
    # Undefeated graph cannot establish finite BTL MLE -> must fail closed (return None)
    assert strengths is None

def test_btl_connected_graph():
    teams = ["Chiefs", "Bills", "Ravens"]
    # Strongly connected graph: Chiefs beat Bills, Bills beat Ravens, Ravens beat Chiefs
    pairwise_wins = {
        ("Chiefs", "Bills"): 3,
        ("Bills", "Ravens"): 2,
        ("Ravens", "Chiefs"): 1,
    }
    strengths = BradleyTerryLuceEngine.solve_mle_or_fail_closed(teams, pairwise_wins)
    assert strengths is not None
    assert "Chiefs" in strengths
    assert "Bills" in strengths
    assert "Ravens" in strengths
    assert strengths["Chiefs"] > strengths["Bills"]

def test_trueskill_belief_update():
    (w_mu, w_sig), (l_mu, l_sig) = TrueSkillFactorGraphEngine.update_duel(25.0, 8.33, 25.0, 8.33)
    assert w_mu > 25.0
    assert l_mu < 25.0
    assert w_sig < 8.33
    assert l_sig < 8.33

if __name__ == "__main__":
    test_canonical_glicko2_glickman_benchmark()
    test_glicko2_idle_inflation()
    test_btl_fail_closed_on_undefeated()
    test_btl_connected_graph()
    test_trueskill_belief_update()
    print("All Glicko-2 & TrueSkill canonical tests passed successfully!")
