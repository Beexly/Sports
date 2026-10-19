from grok_eq_student_copula_markov import student_copula_markov_condition


def test_holds():
    assert student_copula_markov_condition(2.0, 3.0, 1.5, 4.0) is True


def test_fails_inequality():
    assert student_copula_markov_condition(2.0, 3.0, 1.0, 4.0) is False


def test_fail_none():
    assert student_copula_markov_condition(None, 1.0, 1.0, 1.0) is None


def test_fail_str():
    assert student_copula_markov_condition(1.0, "a", 1.0, 1.0) is None


def test_zero_ok():
    assert student_copula_markov_condition(0.0, 0.0, 0.0, 0.0) is True
