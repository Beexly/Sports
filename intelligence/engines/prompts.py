# Provenance: Garrett 2026-10-02 directive — "put our brain in another engine."
# Prompt contract for LLM specialists. Every prompt forces grounding:
# cite the provided numbers, flag inference as INFERENCE with a breaking
# condition, output strict JSON. Spec: reasoning-depth-spec.md §§4–6.

"""Prompts for the LLM specialists. The model reasons; our data grounds it."""

from __future__ import annotations

import json

SYSTEM_GROUNDING = """You are a specialist in the GSE NFL intelligence engine. You are given VERIFIED DATA below.

HARD RULES:
1. Every numeric claim you make MUST cite a value from the VERIFIED DATA. Never invent statistics.
2. Anything you infer beyond the data MUST be labeled "INFERENCE" and MUST include a breaking_condition: the observable fact that would prove it wrong.
3. Causal claims require a mechanism, not just correlation.
4. Output ONLY valid JSON matching the requested schema. No prose outside the JSON.
"""

L3_SCHEMA_HINT = """{
  "chains": [
    {
      "id": "string",
      "links": [
        {
          "id": "string",
          "cause": "string",
          "mechanism": "string",
          "outcome": "string",
          "verification": "CORPUS|COMPUTED|INFERENCE",
          "breaking_conditions": [{"metric": "string", "op": "<|>|<=|>=|==", "threshold": number}],
          "load_bearing": true
        }
      ]
    }
  ]
}"""


def build_l3_prompt(question: str, observations: dict, profiles: dict,
                    market: dict, legs: list[dict]) -> str:
    data = {
        "question": question,
        "verified_observations": observations,
        "verified_profiles": profiles,
        "market": market,
        "bet_legs": legs,
    }
    return (SYSTEM_GROUNDING
            + "\nBuild explicit cause -> mechanism -> outcome causal chains that answer the question "
            + "using ONLY the verified data. Mark each link CORPUS (from the data), COMPUTED "
            + "(derived by arithmetic you show), or INFERENCE (your judgment, with breaking_condition).\n\n"
            + "THESIS DISCIPLINE (critical): the bet legs are a STACK — they win or lose together "
            + "on a shared causal premise. You MUST identify the single load-bearing link that ALL "
            + "legs depend on (give it a clear id like 'pit_pressure_lands').\n"
            + "BE CONCISE: output ONE chain with at most THREE links. Short cause/mechanism/outcome "
            + "strings (under 20 words each).\n"
            + "Then state its BREAKING "
            + "CONDITION: the observable fact that, being TRUE, PROVES the thesis DEAD.\n\n"
            + "HOW TO GET THE INEQUALITY RIGHT (follow these 3 steps exactly):\n"
            + "Step 1 — NEED: state what the thesis NEEDS to be true (e.g. 'the thesis needs the QB to hold the ball so pressure lands').\n"
            + "Step 2 — DATA: state what the verified data SHOWS (e.g. 'the data shows ttt_seconds = 2.1, a quick release').\n"
            + "Step 3 — BREAK: if the DATA contradicts the NEED, the breaking condition points the SAME WAY as the data. "
            + "The QB throws FAST (2.1s), so the thesis dies when time-to-throw is SHORT: "
            + "{\"metric\": \"ttt_seconds\", \"op\": \"<\", \"threshold\": 2.3}. "
            + "Check: 2.1 < 2.3 is TRUE, therefore the thesis is DEAD. "
            + "NEVER write the inequality so that the observed data makes it FALSE — that would mean the thesis survives, contradicting the data.\n\n"
            + "VERIFIED DATA:\n" + json.dumps(data, indent=1, default=str)
            + "\n\nOutput JSON schema:\n" + L3_SCHEMA_HINT)


L4_SCHEMA_HINT = """{
  "breaking_conditions_met": true,
  "breaking_evidence": [{"link_id": "string", "metric": "string", "observed": number, "threshold": number, "met": true}],
  "correlated_theses": [{"thesis_id": "string", "leg_ids": ["string"], "shared_link_id": "string"}],
  "thesis_verdicts": {"thesis_id": "KILL|SURVIVE"},
  "counter_argument": "string (steelman the other side with numbers from the data)",
  "pre_mortem": "string (it is Monday and this card went 0-4: what happened, per the data)"
}"""


def build_l4_prompt(chains: list[dict], legs: list[dict],
                    observed_values: dict) -> str:
    data = {
        "causal_chains": chains,
        "bet_legs": legs,
        "observed_values": observed_values,
    }
    return (SYSTEM_GROUNDING
            + "\nYou are the ADVERSARY. Your job is to KILL weak theses, not defend them.\n"
            + "1. For each breaking condition on each load-bearing link: is it already met by the observed values? Say which.\n"
            + "2. Group bet legs that share a causal link into ONE correlated thesis each. Legs sharing a link are ONE bet, not independent edges.\n"
            + "3. Verdict each thesis KILL (a breaking condition is met, or the load-bearing link is INFERENCE without support) or SURVIVE.\n"
            + "4. Write the strongest counter-argument using the data, then a pre-mortem.\n\n"
            + "VERIFIED DATA:\n" + json.dumps(data, indent=1, default=str)
            + "\n\nOutput JSON schema:\n" + L4_SCHEMA_HINT)


L5_SCHEMA_HINT = """{
  "recommendation": "REJECT|PROCEED|NO_BET",
  "recommendation_reason": "string",
  "layer_verdicts": {
    "offensive_line": "string",
    "scheme": "string",
    "qb_behavior": "string"
  },
  "weak_link_disclosure": "string or null",
  "checklist_summary": {"qb_behavior": "CLEAR|...", "coaching_scheme": "...", "offensive_line": "...", "trust_signals": "...", "scheme_matchup": "..."}
}"""


def build_l5_prompt(question: str, l3_chains: list[dict], l4_report: dict,
                    checklist: dict, live_signals: list[str]) -> str:
    data = {
        "question": question,
        "l3_chains": l3_chains,
        "l4_adversary_report": l4_report,
        "checklist": checklist,
        "live_signals": live_signals,
    }
    return (SYSTEM_GROUNDING
            + "\nYou are the SYNTHESIZER. Produce the final recommendation.\n"
            + "Evaluate in Garrett's hierarchy order: offensive line FIRST, then scheme/coaching, then QB behavior. "
            + "Record a verdict for each layer.\n"
            + "If the L4 adversary killed the thesis, the recommendation MUST be REJECT.\n"
            + "Disclose any weak link (INFERENCE or SINGLE_SOURCE load-bearing claim).\n\n"
            + "VERIFIED DATA:\n" + json.dumps(data, indent=1, default=str)
            + "\n\nOutput JSON schema:\n" + L5_SCHEMA_HINT)


def extract_json(text: str) -> dict:
    """Defensive JSON extraction: strip fences, find first {...} block."""
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t[3:]
        if t.rstrip().endswith("```"):
            t = t.rstrip()[:-3]
    start = t.find("{")
    end = t.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"No JSON object found in model output: {text[:200]!r}")
    return json.loads(t[start:end + 1])
