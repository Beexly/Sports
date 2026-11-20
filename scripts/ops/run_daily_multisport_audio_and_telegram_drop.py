#!/usr/bin/env python3
"""
Daily Multi-Sport Audio (Fish Audio s2.1-pro-free) & Telegram Proof Room Drop
(`scripts/ops/run_daily_multisport_audio_and_telegram_drop.py`)
=============================================================================

Builds today's plain-English, paywall-safe multi-sport matchup environment script,
validates it against banned math jargon / percentage confidence / leaked picks,
synthesizes a live MP3 via `scripts/ops/fish-audio-tts.mjs` (`s2.1-pro-free`
through 2026-11-30), and formats / verifies `@GalaxySportsEdge_bot` delivery.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.calibration.train_multisport_nhl_nba_walkforward import (  # noqa: E402
    DEFAULT_OUT_PATH as MULTISPORT_HEADS_PATH,
    run_walkforward_nhl_and_nba_calibration,
)
from scripts.ops.gse_telegram_whop_broadcaster import (  # noqa: E402
    _read_env_value_from_file,
    format_daily_multisport_environment_teaser,
    resolve_telegram_bot_token,
    send_telegram,
    verify_telegram_bot_identity,
)

_BANNED_AUDIO_RE = re.compile(
    r"\b(?:10,?000\s*worlds?|22,?750,?000\s*snaps?|Romano\s*CQR|Sinkhorn|Cholesky|tau_hat|JEV|10[- ]layer\s+autonomous\s+engine|62-23-1|31-11|14-6)\b"
    r"|%"
    r"|\bOFFICIAL\s+VIP\s+TICKET\b"
    r"|\b(?:OVER|UNDER)\s+\d+(?:\.\d+)?\b[\s\S]{0,60}\b\d+(?:\.\d+)?u\b",
    re.IGNORECASE,
)


def assert_guardrail_clean_daily_script(script: str) -> str:
    cleaned = " ".join(script.split()).strip()
    if not cleaned:
        raise ValueError("Daily audio script must not be empty.")
    m = _BANNED_AUDIO_RE.search(cleaned)
    if m:
        raise ValueError(f"Audio script failed guardrail check (matched '{m.group(0)}').")
    return cleaned


def build_daily_multisport_script(
    nfl_heads: Mapping[str, Any],
    multisport_heads: Mapping[str, Any],
) -> tuple[str, list[dict[str, Any]]]:
    fams = nfl_heads.get("families", {}) if isinstance(nfl_heads, dict) else {}
    eligible_nfl = [k.replace("_", " ") for k, v in fams.items() if v.get("eligible_for_play") is True]
    mp = multisport_heads.get("moneypuck_live_environment", {})
    top_nhl_teams = mp.get("top_teams_xg_share") or []
    top_nhl_goalies = mp.get("top_goalies_gsax") or []

    nhl_line = "In hockey, five-on-five expected goal share and starting goalie goals saved above expected remain on shadow watch."
    if top_nhl_teams and top_nhl_goalies:
        t0 = top_nhl_teams[0]
        g0 = top_nhl_goalies[0]
        nhl_line = (
            f"In NHL environment tracking, {t0.get('team')} leads recent five-on-five shot quality "
            f"near {int(round(float(t0.get('xg_share', 0.5)) * 100))} out of 100 while {g0.get('name')} paces goalies "
            f"at plus {g0.get('gsax')} goals saved above expected."
        )

    nfl_str = ", ".join(eligible_nfl[:4]) if eligible_nfl else "core workload spots"
    script = (
        "Welcome to the Galaxy Sports Edge daily multi-sport matchup briefing. "
        f"Across NFL Week eleven prep, our calibrated board stays selective on proven lanes like {nfl_str}, "
        "passing on noisy tail and secondary markets whenever prices drift away from neutral value. "
        "On the NBA slate, we track back-to-back rest, westward travel miles, and three-in-four fatigue spots "
        "inside our overnight paper-learning loop, holding all official picks quarantined until out-of-sample thresholds clear. "
        f"{nhl_line} "
        "All official member cards and pre-kickoff verified receipts live in the Galaxy Sports Edge Whop Proof Room."
    )
    clean_script = assert_guardrail_clean_daily_script(script)

    briefs = [
        {
            "sport": "NFL",
            "readiness_tier": "TIER_A_CALIBRATED_SNIPER",
            "confidence_score": 68,
            "environment_summary": f"Selective Week 11 calibrated lanes ({nfl_str}); strict pass discipline on quarantined tails.",
        },
        {
            "sport": "NBA",
            "readiness_tier": multisport_heads.get("sports", {}).get("NBA", {}).get("readiness", {}).get("readiness_tier", "TIER_B_ENVIRONMENT_INTEL_AND_PAPER_LEARNING"),
            "environment_summary": "Tracking rest differential, westward travel, and 3-in-4 fatigue inside nightly paper loop.",
        },
        {
            "sport": "NHL",
            "readiness_tier": multisport_heads.get("sports", {}).get("NHL", {}).get("readiness", {}).get("readiness_tier", "TIER_B_ENVIRONMENT_INTEL_AND_PAPER_LEARNING"),
            "environment_summary": nhl_line,
        },
    ]
    return clean_script, briefs


def run_daily_drop(
    *,
    fetch_live: bool = False,
    synthesize_audio: bool = False,
    send_to_telegram: bool = False,
    receipt_path: Optional[Path] = None,
    multisport_out_path: Optional[Path] = None,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    nfl_path = REPO_ROOT / "data" / "calibration" / "prop_family_calibration_heads_2026.json"
    nfl_heads = json.loads(nfl_path.read_text(encoding="utf-8")) if nfl_path.is_file() else {}
    ms_heads = run_walkforward_nhl_and_nba_calibration(
        fetch_live_moneypuck=fetch_live,
        out_path=multisport_out_path or MULTISPORT_HEADS_PATH,
    )

    script, briefs = build_daily_multisport_script(nfl_heads, ms_heads)
    teaser = format_daily_multisport_environment_teaser(briefs)

    audio_out = REPO_ROOT / "data" / "ops" / "audio" / "gse_daily_briefing_2026_11_20.mp3"
    audio_result: dict[str, Any] = {"ok": False, "status": "SKIPPED", "model": "s2.1-pro-free"}
    if synthesize_audio:
        proc = subprocess.run(
            ["node", str(REPO_ROOT / "scripts" / "ops" / "fish-audio-tts.mjs"), "--text", script, "--out", str(audio_out)],
            cwd=str(REPO_ROOT),
            text=True,
            capture_output=True,
            timeout=60,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            try:
                audio_result = json.loads(proc.stdout.strip())
            except json.JSONDecodeError:
                audio_result = {"ok": True, "status": "RAW_STDOUT", "raw": proc.stdout.strip()[:200]}
        else:
            audio_result = {"ok": False, "status": f"EXIT_{proc.returncode}", "error": (proc.stderr or proc.stdout).strip()[:240]}

    tg_token = resolve_telegram_bot_token()
    tg_identity = verify_telegram_bot_identity(tg_token) if tg_token else {"ok": False, "configured": False}
    chat_id = (
        os.environ.get("TELEGRAM_FREE_CHAT_ID", "").strip()
        or (_read_env_value_from_file(REPO_ROOT / ".env.local", ("TELEGRAM_FREE_CHAT_ID",)) or "")
    )
    tg_sent = False
    if send_to_telegram and tg_token and chat_id:
        tg_sent = send_telegram(chat_id, teaser, tg_token)

    receipt = {
        "schema": "gse_daily_multisport_drop_v1",
        "generated_at_utc": now.isoformat(),
        "script": script,
        "telegram_teaser": teaser,
        "audio_synthesis": audio_result,
        "telegram_bot_identity": tg_identity,
        "telegram_free_chat_configured": bool(chat_id),
        "telegram_dispatched": tg_sent,
    }
    target_receipt = receipt_path or (REPO_ROOT / "data" / "ops" / "daily_multisport_audio_and_telegram_receipt_2026.json")
    target_receipt.parent.mkdir(parents=True, exist_ok=True)
    target_receipt.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    return receipt


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Daily multi-sport audio + Telegram Proof Room drop")
    parser.add_argument("--fetch-live", action="store_true")
    parser.add_argument("--synthesize-audio", action="store_true")
    parser.add_argument("--send-telegram", action="store_true")
    args = parser.parse_args()
    out = run_daily_drop(
        fetch_live=args.fetch_live,
        synthesize_audio=args.synthesize_audio,
        send_to_telegram=args.send_telegram,
    )
    print(
        f"[DAILY DROP] Audio={out['audio_synthesis'].get('status')} (bytes={out['audio_synthesis'].get('bytes', 0)}) | "
        f"TelegramOk={out['telegram_bot_identity'].get('ok')} | Dispatched={out['telegram_dispatched']}"
    )
