# Provenance: Garrett 2026-10-02 directive — "put our brain in another engine."
# Harness contract tests. Mock backend only — no network. Asserts: grounded
# claims, INFERENCE flagged, trace shape valid, fallback on backend failure,
# JSON extraction robustness, grounding audit.

"""engines/ contract tests (mock backend, no network)."""

from __future__ import annotations

import json

import pytest

from engines.backends import (
    BackendResult,
    BackendUnavailable,
    LLMBackend,
    QuotaExhausted,
)
from engines.harness import LLMEngine, build_t1_context, build_t1_request
from engines.llm_specialists import audit_grounding
from engines.prompts import extract_json
from reasoning import ReasoningDepth


class MockBackend(LLMBackend):
    name = "mock"

    def __init__(self, script: dict):
        self.script = script  # tool_name -> response text or Exception
        self.calls: list[str] = []

    def generate(self, prompt, system="", max_tokens=1024, temperature=0.2):
        self.calls.append(prompt[:40])
        for tool, resp in self.script.items():
            if tool in prompt or True:
                break
        # route by which tool is being called (prompt content markers)
        if "causal chains" in prompt:
            resp = self.script.get("l3", "{}")
        elif "ADVERSARY" in prompt:
            resp = self.script.get("l4", "{}")
        elif "SYNTHESIZER" in prompt:
            resp = self.script.get("l5", "{}")
        else:
            resp = "{}"
        if isinstance(resp, Exception):
            raise resp
        return BackendResult(text=resp, latency_s=0.1, backend_name="mock")


L3_OK = json.dumps({
    "chains": [{
        "id": "funnel",
        "links": [{
            "id": "pit_pressure_lands",
            "cause": "PIT pass rush vs CLE interior OL down 2 starters",
            "mechanism": "Monken compensates with quick game (0.639 rate, 6.12 air yards)",
            "outcome": "pressure cannot land; Flacco gets ball out in 2.1s",
            "verification": "COMPUTED",
            "breaking_conditions": [{"metric": "ttt_seconds", "op": "<", "threshold": 2.3}],
            "load_bearing": True,
        }],
    }],
})

L4_OK = json.dumps({
    "breaking_conditions_met": True,
    "breaking_evidence": [],
    "correlated_theses": [],
    "thesis_verdicts": {},
    "counter_argument": "PIT could stunt into quick-game windows (INFERENCE)",
    "pre_mortem": "Quick game held; funnel died on schedule.",
})

L5_OK = json.dumps({
    "recommendation": "REJECT",
    "recommendation_reason": "breaking condition met pre-kickoff (ttt 2.1 < 2.3)",
    "layer_verdicts": {"offensive_line": "CLE down 2 starters",
                       "scheme": "Monken quick game neutralizes rush",
                       "qb_behavior": "Flacco 2.1s release"},
    "weak_link_disclosure": None,
    "checklist_summary": {},
})


class TestExtractJson:
    def test_plain(self):
        assert extract_json('{"a": 1}') == {"a": 1}

    def test_fenced(self):
        assert extract_json('```json\n{"a": 2}\n```') == {"a": 2}

    def test_prose_around(self):
        assert extract_json('Here you go: {"a": 3} hope it helps') == {"a": 3}

    def test_no_json_raises(self):
        with pytest.raises(ValueError):
            extract_json("no json here at all")


class TestAuditGrounding:
    def test_grounded_numbers_pass(self):
        r = audit_grounding("ttt is 2.1 and quick game 0.639", [2.1, 0.639, 6.12])
        assert r["ungrounded"] == []

    def test_ungrounded_numbers_flagged(self):
        r = audit_grounding("sack rate 34.7 is elite", [2.1, 0.639])
        assert "34.7" in r["ungrounded"]

    def test_years_exempt(self):
        r = audit_grounding("in the 2026 season", [2.1])
        assert "2026" not in r["ungrounded"]


class TestHarnessContract:
    def _engine(self):
        return LLMEngine(MockBackend({"l3": L3_OK, "l4": L4_OK, "l5": L5_OK}))

    def test_funnel_killed_through_llm_chains(self):
        res = self._engine().run_t1()
        assert res.error == "", res.error
        assert res.funnel_killed is True
        assert res.legs_bundled is True

    def test_recommendation_reject(self):
        res = self._engine().run_t1()
        assert res.recommendation == "REJECT"

    def test_no_hallucinated_numbers(self):
        res = self._engine().run_t1()
        assert res.hallucinated_numbers == [], res.hallucinated_numbers

    def test_latency_recorded(self):
        res = self._engine().run_t1()
        assert res.latency_s.get("total", 0) >= 0
        assert "llm_l3_chains" in res.latency_s


class TestFallback:
    def test_backend_failure_falls_back_loudly(self):
        eng = LLMEngine(MockBackend({"l3": BackendUnavailable("down")}))
        res = eng.run_t1()
        assert res.fallback_used is True
        assert "down" in res.fallback_reason

    def test_quota_exhaustion_falls_back_loudly(self):
        eng = LLMEngine(MockBackend({"l3": QuotaExhausted("empty")}))
        res = eng.run_t1()
        assert res.fallback_used is True
        assert "quota" in res.fallback_reason.lower()

    def test_deterministic_fallback_annotates_trace(self):
        eng = LLMEngine(MockBackend({"l3": BackendUnavailable("down")}))
        trace = eng.run_t1_deterministic_fallback()
        assert getattr(trace, "llm_fallback", False) is True
        assert trace.depth == ReasoningDepth.L5


class TestFixtures:
    def test_t1_request_shape(self):
        req = build_t1_request()
        assert len(req.legs) == 4
        assert req.game.away == "PIT"

    def test_t1_context_grounding_values(self):
        ctx = build_t1_context()
        assert ctx.observations["ttt_seconds"] == 2.1
        assert ctx.observations["quick_game_rate"] == 0.639
