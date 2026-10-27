def test_schur_concave_inequality():
    from grok_eq_schur_concave_inequality import schur_concave_inequality
    # success: holds
    assert schur_concave_inequality(0.3, 0.4) is True
    assert schur_concave_inequality(0.5, 0.5) is True
    # violated
    assert schur_concave_inequality(0.6, 0.4) is False
    # fail-closed
    assert schur_concave_inequality(None, 0.5) is None
    assert schur_concave_inequality(0.5, float('nan')) is None
    assert schur_concave_inequality('a', 0.1) is None
    print("all tests passed")

if __name__ == "__main__":
    test_schur_concave_inequality()
