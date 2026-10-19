from grok_eq_first_acceptable_rank import first_acceptable_rank

def test_first_at_pos1():
    assert first_acceptable_rank([1, 0, 1]) == 1

def test_first_later():
    assert first_acceptable_rank([0, 0, 1, 0]) == 3

def test_none_acceptable():
    assert first_acceptable_rank([0, 0, 0]) is None

def test_fail_bad_type():
    assert first_acceptable_rank("not list") is None
    assert first_acceptable_rank(None) is None

def test_fail_bad_value():
    assert first_acceptable_rank([0, 2, 1]) is None
    assert first_acceptable_rank([0, "a"]) is None
