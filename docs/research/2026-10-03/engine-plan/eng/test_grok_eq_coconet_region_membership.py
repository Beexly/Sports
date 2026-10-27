def test_coconet_region_membership():
    from grok_eq_coconet_region_membership import coconet_region_membership
    # success: inside
    assert coconet_region_membership(0.5, 1.0) is True
    assert coconet_region_membership(1.0, 1.0) is True
    # outside
    assert coconet_region_membership(1.5, 1.0) is False
    # fail-closed
    assert coconet_region_membership(None, 1.0) is None
    assert coconet_region_membership(0.5, float('nan')) is None
    assert coconet_region_membership('bad', 1.0) is None
    print("all tests passed")

if __name__ == "__main__":
    test_coconet_region_membership()
