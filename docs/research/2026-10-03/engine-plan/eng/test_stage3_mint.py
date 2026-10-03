"""Named stage-3 tests. Not a wildcard."""
import math
import stage3_mint as m

def test_js_41():
    assert abs(m.js_41([0.5, 0.5], [0.5, 0.5], [0.5, 0.5])) < 1e-12
    assert abs(m.js_41([1, 0], [0, 1], [0.5, 0.5]) - 1) < 1e-9
    assert abs(m.js_41_ln([1, 0], [0, 1], [0.5, 0.5]) - math.log(2)) < 1e-9
    assert m.js_41([1, 0], [0, 1], [0.7, 0.5]) is None
    assert abs(m.js_equal([1, 0], [0, 1]) - 1) < 1e-9

def test_js_51():
    assert abs(m.js_51([[0.5, 0.5]] * 3, [0.5, 0.3, 0.2])) < 1e-12
    assert m.js_51([[1, 0], [0, 1]], [0.6, 0.5]) is None

def test_chen_h():
    assert m.chen_h(math.e, 0.5) is not None
    assert m.chen_h(math.e, 0) is None
    assert m.chen_h(math.e, 1) is None
    assert abs(m.chen_kendall([1, 1], [2, 1], 0.1, 3) - 0.3) < 1e-12

def test_divos():
    assert abs(m.divos_next_goal(1, 1, 1, 0, "home") - 0.5 * (1 - math.exp(-2))) < 1e-12
    assert m.divos_next_goal(1, 1, 1, 1, "away") == 0
    odd, even = m.divos_odd_even(1, 1)
    assert abs(odd - math.exp(-2) * math.cosh(2)) < 1e-12
    assert abs(even - math.exp(-2) * math.sinh(2)) < 1e-12
    assert odd != even

def test_aldous_bass():
    assert abs(m.aldous_sigma(0.5) - 1 / math.pi) < 1e-12
    assert abs(m.aldous_sigma(0)) < 1e-12 and abs(m.aldous_sigma(1)) < 1e-12
    assert m.aldous_sigma(float("nan")) is None
    assert abs(m.bass_sigma(0.5) - 1 / math.sqrt(2 * math.pi)) < 1e-12
    assert m.bass_sigma(0) is None
    assert abs(m.aldous_sigma(0.5) - m.bass_sigma(0.5)) > 1e-6

def test_dpo_ppo_lora_aci():
    assert m.dpo_7(0, 0, 0, 0, 0.1) is not None and m.dpo_7(0, 0, 0, 0, 0) is None
    assert abs(m.ppo_clip_7(1.5, 1, 0.2) - 1.2) < 1e-12
    assert m.lora_3([[1, 0], [0, 1]], [1, 0], [[0, 0], [0, 0]], [[1, 0], [0, 1]]) == [1, 0]
    assert abs(m.aci_2(0.1, 0.05, 0.1, 1) - (0.1 + 0.05 * (0.1 - 1))) < 1e-12
    assert m.aci_2(0.1, 0, 0.1, 0) is None

def test_mint_reader():
    assert m.get("js_41") is m.js_41
    assert m.get("herbrich_hinge") is None
    assert "js_41" in m.ids() and "herbrich_hinge" not in m.ids()
    assert m.source("js_41")["footer"] == 147
