from grok_eq_score_driven_rating_update import score_driven_rating_update

def test_score_driven_rating_update_fail_closed():
    # Valid update
    assert score_driven_rating_update(1500, 16, 0.25) == 1504.0
    # Fail-closed cases
    assert score_driven_rating_update(1500, 0, 0.25) is None
    assert score_driven_rating_update(1500, -1, 0.25) is None
    assert score_driven_rating_update(float('nan'), 16, 0.25) is None
    assert score_driven_rating_update(1500, 16, float('inf')) is None
    assert score_driven_rating_update('bad', 16, 0.25) is None
    assert score_driven_rating_update(1500, None, 0.25) is None

if __name__ == '__main__':
    test_score_driven_rating_update_fail_closed()
    print('ok')
