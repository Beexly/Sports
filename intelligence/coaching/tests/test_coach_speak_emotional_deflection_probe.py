"""TDD Test Suite for Coach-Speak Emotional Deflection Probes (RyanCodrai/gemma-emotional-probes).

Validates:
1. Emotion-deflection linear probe scoring on press conference quotes.
2. Injury concealment stress detection.
3. Bounded situational overlay output for Stage 4 Master Situational Reasoning Aggregator (|delta_log_odds| <= 0.15).
"""

import pytest


def test_emotional_deflection_probe_detection():
    from intelligence.coaching.coach_speak_emotional_deflection_probe import (
        extract_coach_emotional_deflection,
    )
    
    # Evasive, deflecting coach-speak quote (high deflection, low accountability)
    evasive_text = (
        "We're looking at everything. It's not on any one guy. The film is what it is, "
        "and we just have to execute better in all three phases. We'll evaluate that as a staff."
    )
    
    probe_result = extract_coach_emotional_deflection(evasive_text, speaker="Eberflus")
    assert probe_result["speaker"] == "Eberflus"
    assert probe_result["deflection_score"] >= 0.65
    assert probe_result["injury_concealment_stress"] >= 0.0
    assert "stage4_situational_log_odds" in probe_result
    assert abs(probe_result["stage4_situational_log_odds"]) <= 0.15


def test_grounded_accountability_quote():
    from intelligence.coaching.coach_speak_emotional_deflection_probe import (
        extract_coach_emotional_deflection,
    )
    
    # Direct, accountable quote (low deflection, clear scheme acknowledgment)
    direct_text = (
        "I called a bad game on third down. They brought zero and we didn't hot-route the slant. "
        "That's completely on my play-calling and we're fixing the protection rules on Wednesday."
    )
    
    probe_result = extract_coach_emotional_deflection(direct_text, speaker="LaFleur")
    assert probe_result["speaker"] == "LaFleur"
    assert probe_result["deflection_score"] <= 0.35
    assert probe_result["accountability_score"] >= 0.70
