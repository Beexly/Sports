"""Coach-Speak Emotional Deflection Probe.

Applies emotional concept and deflection probe methodology (inspired by RyanCodrai/gemma-emotional-probes
and Anthropic April 2026 'Emotion Concepts and their Function in a Large Language Model') to NFL press
conference and interview transcripts.

Operationalizes THE LEARNING LOOP ('Interviews/coach-speak are testable signals — stated Tuesday vs observed Sunday')
and THE STACK Layer 2 ('hyper-intelligent situational/emotional reasoning overlay').
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

DEFLECTION_CUES = [
    r"not on any one guy",
    r"execute better",
    r"look at the film",
    r"film is what it is",
    r"evaluate that as a staff",
    r"looking at everything",
    r"all three phases",
    r"we'll see",
    r"day-to-day",
    r"missed assignments",
]

ACCOUNTABILITY_CUES = [
    r"on my play-calling",
    r"bad game",
    r"on me",
    r"my fault",
    r"didn't put (the guys|them) in a position",
    r"fixing the protection",
    r"completely on (me|my)",
    r"bad call",
]

INJURY_STRESS_CUES = [
    r"working through something",
    r"soreness",
    r"evaluating with the trainers",
    r"hope to have him",
    r"see how he feels (tomorrow|on wednesday|on friday)",
    r"game-time decision",
]


def extract_coach_emotional_deflection(
    transcript: str,
    speaker: str,
    role: str = "HEAD_COACH",
) -> Dict[str, Any]:
    """Score interview text for emotional deflection, accountability, and injury concealment stress."""
    text_lower = transcript.lower()
    
    # Deflection score based on regex matches and generic coach-speak density
    deflect_matches = sum(1 for pattern in DEFLECTION_CUES if re.search(pattern, text_lower))
    account_matches = sum(1 for pattern in ACCOUNTABILITY_CUES if re.search(pattern, text_lower))
    injury_matches = sum(1 for pattern in INJURY_STRESS_CUES if re.search(pattern, text_lower))
    
    # Deflection score bounded in [0.0, 1.0]
    if deflect_matches > 0 and account_matches == 0:
        deflection_score = min(1.0, 0.50 + 0.15 * deflect_matches)
    elif account_matches > 0:
        deflection_score = max(0.0, 0.35 - 0.15 * account_matches)
    else:
        deflection_score = 0.50
        
    accountability_score = max(0.0, min(1.0, 1.0 - deflection_score))
    injury_concealment_stress = min(1.0, 0.25 * injury_matches)
    
    # Bounded situational log-odds overlay for Stage 4:
    # High deflection / evasion on Tuesday/Wednesday signals unpreparedness or schematic stress:
    # maps deflection > 0.60 to negative log-odds shift, capped at [-0.15, +0.15].
    raw_delta = (accountability_score - deflection_score) * 0.15
    stage4_delta = max(-0.15, min(0.15, raw_delta))
    
    return {
        "speaker": speaker,
        "role": role,
        "deflection_score": round(deflection_score, 3),
        "accountability_score": round(accountability_score, 3),
        "injury_concealment_stress": round(injury_concealment_stress, 3),
        "stage4_situational_log_odds": round(stage4_delta, 4),
        "deflection_cues_found": deflect_matches,
        "accountability_cues_found": account_matches,
    }
