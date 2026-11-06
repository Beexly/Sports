#!/usr/bin/env python3
"""
Verification suite for Track A (Formal MADR Architecture Decision Records `0001..0006` + `README.md`)
and Track B (Multi-Channel Video, Social Follower Flywheel, Week 9 Plays, DraftKings/FanDuel DFS &
Ad/Affiliate Revenue Engine).
"""

from __future__ import annotations

import json
from pathlib import Path
import re

REPO_ROOT = Path(__file__).resolve().parents[2]
ETC_RE = re.compile(r"\betc" + r"\.", re.IGNORECASE)
SECRET_TOKENS = ("pcsk_", "phx_", "phc_", "2Gs3", "xai-")

BANNED_PUBLIC_JARGON = (
    "22,750,000 snap evaluations",
    "10-Layer Autonomous Engine",
    "Romano CQR",
    "Optimal Transport",
    "10,000 worlds",
    "tau_hat",
    "TNF card 14-6",
    "31-11 banner is retracted",
    "Cholesky",
    "Sinkhorn",
)


def test_madr_architecture_decision_records_complete() -> None:
    adr_dir = REPO_ROOT / "docs" / "adr"
    readme_p = adr_dir / "README.md"
    assert readme_p.is_file(), "Missing docs/adr/README.md"
    readme_txt = readme_p.read_text(encoding="utf-8")
    assert not ETC_RE.search(readme_txt)

    expected_adrs = [
        "0001-uncompressed-ingest-and-learn-coupled-5api-omniscience.md",
        "0002-situational-first-5-stage-pre-projection-and-jev-simulation-pipeline.md",
        "0003-gsi-cross-domain-sports-medicine-and-decision-intelligence-expansion.md",
        "0004-hardware-aware-laptop-execution-pinecone-hybrid-and-bazel-monorepo.md",
        "0005-week9-plays-360-board-and-draftkings-fanduel-dfs-engine.md",
        "0006-multi-channel-video-social-follower-growth-and-ad-affiliate-revenue-engine.md",
    ]
    required_sections = (
        "## Status",
        "## Context",
        "## Decision Drivers",
        "## Considered Options",
        "## Decision",
        "## Rationale",
        "## Consequences",
        "## Implementation Notes",
        "## References",
    )
    for fname in expected_adrs:
        assert fname in readme_txt, f"{fname} not linked in docs/adr/README.md"
        p = adr_dir / fname
        assert p.is_file(), f"Missing ADR {fname}"
        txt = p.read_text(encoding="utf-8")
        for sec in required_sections:
            assert sec in txt, f"Missing section {sec} in {fname}"
        assert not ETC_RE.search(txt), f"Forbidden literal found in {fname}"
        for tok in SECRET_TOKENS:
            assert tok not in txt, f"Secret token {tok} found in {fname}"


def test_video_social_dfs_and_revenue_engine_and_paywall_guardrails() -> None:
    from intelligence.ops.gse_video_social_and_revenue_growth_engine import (
        build_week9_video_social_dfs_and_revenue_packet,
        main as run_video_revenue_engine,
    )

    rc = run_video_revenue_engine()
    assert rc == 0

    packet = build_week9_video_social_dfs_and_revenue_packet()
    rec = packet["official_verified_record"]
    assert rec["record"] == "62-23-1"
    assert rec["win_pct"] == 72.9
    assert rec["net_units"] == 26.50
    assert rec["pre_week_8_segment"]["record"] == "16-5-0"
    assert rec["week_8_audited_settlement"]["record"] == "46-18-1"

    guard = packet["paywall_and_copy_guardrails"]
    assert guard["public_free_picks_leaked"] == 0
    assert guard["internal_math_jargon_in_public_copy"] == 0
    assert guard["paywall_gate_enforced"] is True
    assert guard["adsense_publisher_id"] == "ca-pub-8151105906877749"
    assert guard["posthog_cloud_project_id"] == "516325"

    videos = packet["short_form_video_production_packets"]
    assert len(videos) == 5
    for v in videos:
        assert v["contains_free_pick_leak"] is False
        assert v["contains_internal_math_jargon"] is False
        blob = json.dumps(v)
        for banned in BANNED_PUBLIC_JARGON:
            assert banned.lower() not in blob.lower(), f"Banned jargon '{banned}' in {v['video_id']}"

    streams = packet["revenue_stream_attribution_matrix"]
    assert len(streams) == 7
    stream_blob = json.dumps(streams)
    for partner in ("ca-pub-8151105906877749", "8111208", "zwniodg", "whop.com", "CapperTek", "/packages"):
        assert partner in stream_blob, f"Missing revenue partner {partner}"

    out_json = REPO_ROOT / "data" / "engine" / "week9_video_social_dfs_and_revenue_master_packet_2026_11_06.json"
    out_md = REPO_ROOT / "docs" / "dfs" / "research" / "2026-11-06" / "WEEK9_PLAYS_DFS_VIDEO_AND_REVENUE_EXECUTION_PACKET.md"
    ts_mod = REPO_ROOT / "apps" / "web" / "lib" / "content-os" / "video-and-revenue-engine.ts"

    for fpath in (out_json, out_md, ts_mod):
        assert fpath.is_file(), f"Missing {fpath}"
        txt = fpath.read_text(encoding="utf-8")
        assert not ETC_RE.search(txt), f"Forbidden literal found in {fpath}"
        for banned in BANNED_PUBLIC_JARGON:
            assert banned.lower() not in txt.lower(), f"Banned public jargon '{banned}' in {fpath.name}"
