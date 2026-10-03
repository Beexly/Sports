import math
from sheet_identities import aldous_sigma, bass_sigma

def test_aldous():
    assert abs(aldous_sigma(0.5) - 1 / math.pi) < 1e-12
    assert aldous_sigma(0) == 0 and aldous_sigma(1) == 0
    assert aldous_sigma(float("nan")) is None

def test_bass():
    assert abs(bass_sigma(0.5) - 1 / math.sqrt(2 * math.pi)) < 1e-12
    assert bass_sigma(0) is None and bass_sigma(1) is None
    assert abs(aldous_sigma(0.5) - bass_sigma(0.5)) > 1e-3
