import numpy as np
from sheet_identities import dpo_7, ppo_clip_7, lora_3, aci_2

def test_ppo():
    assert ppo_clip_7(1.5, 1, 0.2) == 1.2
    assert ppo_clip_7(1.5, 1, 0) is None
    assert ppo_clip_7(float("nan"), 1, 0.2) is None

def test_dpo():
    v = dpo_7(0.0, -1.0, -1.0, -1.0, 0.1)
    assert v is not None
    assert dpo_7(0.0, 0.0, 0.0, 0.0, 0) is None

def test_lora():
    W0 = np.eye(2)
    x = np.array([1.0, 0.0])
    B = np.eye(2)
    A = np.eye(2)
    out = lora_3(W0, x, B, A)
    assert np.allclose(out, [2.0, 0.0])

def test_aci():
    assert aci_2(0.1, 0.05, 0.1, 1) == 0.1 + 0.05 * (0.1 - 1)
    assert aci_2(0.1, 0, 0.1, 1) is None
