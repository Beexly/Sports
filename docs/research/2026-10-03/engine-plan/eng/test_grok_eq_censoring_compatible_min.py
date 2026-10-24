def test_censoring_compatible_min():
    from grok_eq_censoring_compatible_min import censoring_compatible_min
    # success
    assert censoring_compatible_min([1.0, 2.5, 0.3]) == 0.3
    assert censoring_compatible_min([5]) == 5.0
    # fail-closed
    assert censoring_compatible_min([]) is None
    assert censoring_compatible_min([1, float('nan')]) is None
    assert censoring_compatible_min([1, float('inf')]) is None
    assert censoring_compatible_min(None) is None
    assert censoring_compatible_min(['a', 1]) is None
    print("all tests passed")

if __name__ == "__main__":
    test_censoring_compatible_min()
