import sys
sys.path.insert(0, '.')
from grok_eq_temperature_scaled_token_prob import temperature_scaled_token_prob

def test_finite():
    # exp(0 / 1) / 1 = 1
    assert abs(temperature_scaled_token_prob(0.0, 1.0, 1.0) - 1.0) < 1e-9
    # exp(1 / 1) / exp(1) = 1
    assert abs(temperature_scaled_token_prob(1.0, 1.0, 2.718281828) - 1.0) < 1e-6

def test_nonfinite():
    assert temperature_scaled_token_prob(float('nan'), 1.0, 1.0) is None
    assert temperature_scaled_token_prob(1.0, float('inf'), 1.0) is None
    assert temperature_scaled_token_prob(1.0, 1.0, float('nan')) is None

def test_bad_temp():
    assert temperature_scaled_token_prob(1.0, 0.0, 1.0) is None
    assert temperature_scaled_token_prob(1.0, -1.0, 1.0) is None

def test_bad_sum():
    assert temperature_scaled_token_prob(1.0, 1.0, 0.0) is None
    assert temperature_scaled_token_prob(1.0, 1.0, -1.0) is None

def test_nonnumeric():
    assert temperature_scaled_token_prob('a', 1.0, 1.0) is None
    assert temperature_scaled_token_prob(1.0, None, 1.0) is None
    assert temperature_scaled_token_prob(1.0, 1.0, 'v') is None

if __name__ == '__main__':
    test_finite()
    test_nonfinite()
    test_bad_temp()
    test_bad_sum()
    test_nonnumeric()
    print('all tests passed')
