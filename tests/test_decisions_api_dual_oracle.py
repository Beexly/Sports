"""Tests for OpenRouter Decisions API Dual-Oracle Bridge (`google/gemini-decision-1` + `~typesafe/jev-latest`)."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

HERMES_JEV_PATH = Path(r"C:\Users\Garrett\hermes-jev-skills")
if HERMES_JEV_PATH.exists() and str(HERMES_JEV_PATH) not in sys.path:
    sys.path.insert(0, str(HERMES_JEV_PATH))

from intelligence.foundry_bridge.decisions_api_dual_oracle import (  # noqa: E402
    GEMINI_DECISION_1_MODEL,
    JEV_LATEST_MODEL,
    ask_decisions_api,
    ask_dual_oracle,
    encode_multimodal_attachment,
    jensen_shannon_divergence,
    jev_client,
    jev_keystore,
    validate_decisions_questions,
)


def test_validate_questions_accepts_255_and_rejects_256() -> None:
    choice_255 = {f"opt_{i}": f"Option {i}" for i in range(255)}
    score_255 = [f"lvl_{i}" for i in range(255)]
    ok = validate_decisions_questions(
        {
            "play": jev_client.choice("Select optimal play call from full playbook.", choice_255),
            "confidence_tier": jev_client.score("Score structural matchup edge from 0 to 254.", score_255),
            "go_for_it": jev_client.noul("Does going for it raise expected win probability?"),
        }
    )
    assert len(ok["play"]["criteria"]) == 255
    assert len(ok["confidence_tier"]["criteria"]) == 255

    with pytest.raises(ValueError, match="max allowed is 255"):
        validate_decisions_questions(
            {"too_many": jev_client.choice("Pick one of 256 options.", {f"k_{i}": f"v_{i}" for i in range(256)})}
        )

    with pytest.raises(ValueError, match="max allowed is 255"):
        validate_decisions_questions(
            {"too_deep": jev_client.score("Score across 256 levels.", [f"l_{i}" for i in range(256)])}
        )

    with pytest.raises(ValueError, match="has no instructions"):
        validate_decisions_questions({"bad_q": {"type": "noul", "instructions": "  "}})


def test_encode_multimodal_attachment_variants() -> None:
    csv_att = encode_multimodal_attachment(b"team,epa\nDET,0.14\nNE,0.03\n", label="ne_det.csv")
    assert csv_att["type"] == "file"
    assert csv_att["mime_type"] == "text/csv"
    assert csv_att["data_url"].startswith("data:text/csv;base64,")

    pdf_att = encode_multimodal_attachment(b"%PDF-1.7\n%mock", mime_type="application/pdf", label="playbook.pdf")
    assert pdf_att["type"] == "file"
    assert pdf_att["data_url"].startswith("data:application/pdf;base64,")

    img_att = encode_multimodal_attachment(b"\x89PNG\r\n\x1a\n", label="film_frame.png")
    assert img_att["type"] == "image_url"
    assert img_att["mime_type"] == "image/png"

    url_att = encode_multimodal_attachment(
        "", public_url="https://example.com/charts/week10.png", label="week10.png"
    )
    assert url_att["type"] == "image_url"
    assert url_att["url"] == "https://example.com/charts/week10.png"


def test_jensen_shannon_divergence_properties() -> None:
    p = {"A": 0.7, "B": 0.2, "C": 0.1}
    q = {"A": 0.1, "B": 0.3, "C": 0.6}
    assert jensen_shannon_divergence(p, p) == pytest.approx(0.0, abs=1e-12)
    assert jensen_shannon_divergence(p, q) == pytest.approx(jensen_shannon_divergence(q, p), abs=1e-12)
    assert 0.0 < jensen_shannon_divergence(p, q) < 1.0
    assert jensen_shannon_divergence({"A": 1.0, "B": 0.0}, {"A": 0.0, "B": 1.0}) == pytest.approx(1.0, abs=1e-12)


def test_dual_oracle_consensus_and_epistemic_veto() -> None:
    captured_states = {}

    def mock_transport(body: bytes, headers: dict, timeout: float) -> bytes:
        req = json.loads(body.decode("utf-8"))
        model = req["model"]
        captured_states[model] = req["state"]
        if model == JEV_LATEST_MODEL:
            return json.dumps(
                {
                    "model": JEV_LATEST_MODEL,
                    "answers": {
                        "off_call": {
                            "type": "choice",
                            "choice": "quick_rpo",
                            "probabilities": {"quick_rpo": 0.90, "deep_pa": 0.10},
                            "confidence": 0.90,
                        },
                        "pressure_lvl": {
                            "type": "score",
                            "score": 3.6,
                            "probabilities": {"0": 0.0, "1": 0.05, "2": 0.10, "3": 0.05, "4": 0.80},
                            "confidence": 0.80,
                            "legend": {"0": "low", "1": "mild", "2": "mod", "3": "high", "4": "extreme"},
                        },
                        "aggressive": {"type": "noul", "noul": 0.85},
                    },
                }
            ).encode("utf-8")
        return json.dumps(
            {
                "model": GEMINI_DECISION_1_MODEL,
                "answers": {
                    "off_call": {
                        "type": "choice",
                        "choice": "deep_pa",
                        "probabilities": {"quick_rpo": 0.15, "deep_pa": 0.85},
                        "confidence": 0.85,
                    },
                    "pressure_lvl": {
                        "type": "score",
                        "score": 1.0,
                        "probabilities": {"0": 0.30, "1": 0.45, "2": 0.20, "3": 0.05, "4": 0.0},
                        "confidence": 0.45,
                    },
                    "aggressive": {"type": "noul", "noul": 0.20},
                },
            }
        ).encode("utf-8")

    questions = {
        "off_call": jev_client.choice(
            "Select highest EV offensive concept against disguised blitz.",
            {"quick_rpo": "Quick game / RPO", "deep_pa": "Slow play-action vertical"},
        ),
        "pressure_lvl": jev_client.score(
            "Rate immediate pocket collapse severity.", ["low", "mild", "mod", "high", "extreme"]
        ),
        "aggressive": jev_client.noul("Should offense keep passing on 1st down?"),
    }
    csv_att = encode_multimodal_attachment(b"down,epa\n1,0.12\n", label="sample.csv")
    out = ask_dual_oracle(
        {"down": 1, "ydstogo": 10},
        questions,
        gemini_attachments=[csv_att],
        divergence_veto_threshold=0.18,
        transport=mock_transport,
    )

    assert isinstance(captured_states[JEV_LATEST_MODEL], dict)
    assert isinstance(captured_states[GEMINI_DECISION_1_MODEL], list)
    assert captured_states[GEMINI_DECISION_1_MODEL][1]["type"] == "file"
    assert out["any_epistemic_veto"] is True
    assert out["comparisons"]["off_call"]["epistemic_veto"] is True
    assert out["comparisons"]["off_call"]["js_divergence"] > 0.35
    # Verify consensus shrinks toward uniform (0.5) rather than blindly taking average
    raw_avg_quick = 0.5 * (0.90 + 0.15)
    cons_quick = out["consensus"]["off_call"]["probabilities"]["quick_rpo"]
    assert abs(cons_quick - 0.5) < abs(raw_avg_quick - 0.5)
    assert out["consensus"]["pressure_lvl"]["shrink_factor"] < 0.70

    # Ensure TypeSafe Jev refuses binary attachments
    with pytest.raises(ValueError, match="does not accept binary multimodal attachments"):
        ask_decisions_api({"down": 1}, questions, model=JEV_LATEST_MODEL, attachments=[csv_att], transport=mock_transport)


def test_live_dual_oracle_with_ne_det_matchup_csv() -> None:
    if os.environ.get("GSE_RUN_LIVE_DECISIONS_API") != "1":
        pytest.skip("Live OpenRouter Decisions API check is fail-closed unless GSE_RUN_LIVE_DECISIONS_API=1")
    old_env = os.environ.pop("OPENROUTER_API_KEY", None)
    try:
        has_key = bool(
            jev_keystore._from_file("openrouter")
            or jev_keystore._from_hermes_env("openrouter")
            or jev_keystore.resolve("openrouter")
        )
        if not has_key:
            pytest.skip("No OpenRouter Decisions API keystore credential available")

        csv_path = REPO_ROOT / "docs" / "data-sources" / "research" / "2026-11-14" / "morning-sweep-tables" / "gridiron-matchup-ne-det-2026.csv"
        if csv_path.is_file():
            csv_text = csv_path.read_text(encoding="utf-8")
        else:
            csv_text = subprocess.check_output(
                ["git", "show", "e1508322c:docs/research/2026-11-14/full-tables/gridiron-matchup-ne-det-2026.csv"],
                cwd=str(REPO_ROOT),
                text=True,
                encoding="utf-8",
            )
        csv_att = encode_multimodal_attachment(csv_text.encode("utf-8"), mime_type="text/csv", label="gridiron-matchup-ne-det-2026.csv")
        state = {
            "matchup": "NE @ DET (Week 10 Munich neutral site)",
            "situation": "3rd & 5 at DET 41, Q2 4:10, tied 10-10",
            "context_note": "Evaluate relative offensive efficiency vs defensive pressure and explosive allowance.",
        }
        questions = {
            "offensive_leverage": jev_client.choice(
                "Which offense owns the cleaner down-to-down efficiency edge on 3rd & medium?",
                {"NE": "New England Patriots", "DET": "Detroit Lions", "BALANCED": "Balanced / neutral"},
            ),
            "explosive_environment": jev_client.score(
                "Rate probability tier of an explosive 15+ yard play across the game script",
                ["very_low", "low", "moderate", "high", "very_high"],
            ),
            "passing_lean": jev_client.noul("Does situational structure favor above-average dropback volume?"),
        }
        res = ask_dual_oracle(
            state,
            questions,
            gemini_attachments=[csv_att],
            timeout=20.0,
            divergence_veto_threshold=0.25,
        )
        assert res["jev"]["answers"]["offensive_leverage"]["choice"] in {"NE", "DET", "BALANCED"}
        assert res["gemini"]["answers"]["offensive_leverage"]["choice"] in {"NE", "DET", "BALANCED"}
        assert res["gemini"]["answers"]["explosive_environment"]["spread_reported"] is True
        assert 0.0 <= res["max_js_divergence"] <= 1.0
        assert sum(res["consensus"]["offensive_leverage"]["probabilities"].values()) == pytest.approx(1.0, abs=1e-4)
    finally:
        if old_env is not None:
            os.environ["OPENROUTER_API_KEY"] = old_env
