from reasoning_engine.mint_gate import mint_after_mind


def test_unasked_game_passes():
    assert mint_after_mind("INVALID", {"qb_behavior": "DATA-GAP"}, asked=False)["action"] == "pass"


def test_invalid_withholds_without_a_half():
    decision = mint_after_mind("INVALID", {}, asked=True)
    assert decision["action"] == "withhold"
    assert "probability" not in decision
    assert "0.5" not in decision["reason"]


def test_data_gap_withholds_even_on_a_draft_label():
    decision = mint_after_mind(
        "ANALYSIS-DRAFT — not for publication",
        {"offensive_line": "CLEAR", "qb_behavior": "DATA-GAP"},
        asked=True,
    )
    assert decision["action"] == "withhold"
    assert "qb_behavior" in decision["reason"]


def test_clear_trace_passes_and_still_has_no_probability():
    decision = mint_after_mind(
        "FINAL",
        {"offensive_line": "CLEAR", "coaching_scheme": "CLEAR", "qb_behavior": "CLEAR"},
        asked=True,
    )
    assert decision == {"action": "pass", "reason": "a trace does not mint a probability"}
    assert "probability" not in decision
