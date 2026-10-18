from grok_eq_mv_otcp_ground_cost import mv_otcp_ground_cost

def test_identity_1d():
    assert mv_otcp_ground_cost([2.0], [1.0], [[1.0]]) == 1.0

def test_scaled():
    assert mv_otcp_ground_cost([2.0], [1.0], [[4.0]]) == 4.0

def test_2d_diag():
    m = [[1.0, 0.0], [0.0, 1.0]]
    assert mv_otcp_ground_cost([1.0, 0.0], [0.0, 0.0], m) == 1.0

def test_bad_not_sym():
    m = [[1.0, 0.5], [0.0, 1.0]]
    assert mv_otcp_ground_cost([1.0, 1.0], [0.0, 0.0], m) is None

def test_bad_neg_diag():
    m = [[-1.0]]
    assert mv_otcp_ground_cost([1.0], [0.0], m) is None

if __name__ == "__main__":
    test_identity_1d()
    test_scaled()
    test_2d_diag()
    test_bad_not_sym()
    test_bad_neg_diag()
    print("5 tests passed")
