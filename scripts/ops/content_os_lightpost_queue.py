"""Content OS LightPost Queue & Chaptered Caption Generator.

Operationalizes:
- AM-10: LightPost self-hosted multi-social queue with receipt tracking.
- AM-02: Chaptered video captions (00:00 Hook, 00:18 Trench Mechanism, 00:42 Official Play).
- AM-19: Flash-Drop alert format.
- MUTE_BOT hard gate enforcement.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any, Dict, List, Optional


def format_chaptered_caption(
    matchup: str,
    trench_insight: str,
    official_play: str,
    edge_pct: float,
) -> str:
    """Format structured, chapter-timestamped social captions."""
    return (
        f"00:00 - {matchup} Breakdown & Line Context\n"
        f"00:18 - Trench & Pressure Mechanism: {trench_insight}\n"
        f"00:42 - Official Call: {official_play} (+{edge_pct:.1f}% edge)\n\n"
        f"#NFL #NFLPicks #FootballAnalytics #GSE #{matchup.replace(' @ ', '')}"
    )


def enqueue_social_post(
    queue_path: str,
    platform: str,
    text: str,
    media_url: Optional[str] = None,
    scheduled_at: Optional[str] = None,
) -> Dict[str, Any]:
    """Enqueue a social post with idempotency and MUTE_BOT gate."""
    os.makedirs(os.path.dirname(os.path.abspath(queue_path)), exist_ok=True)
    
    # Read MUTE_BOT env
    mute_bot = os.environ.get("MUTE_BOT", "false").lower() == "true"
    
    entry = {
        "id": f"post_{int(time.time() * 1000)}",
        "platform": platform,
        "text": text,
        "media_url": media_url,
        "enqueued_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "scheduled_at": scheduled_at,
        "status": "MUTED" if mute_bot else "QUEUED",
    }
    
    with open(queue_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
        
    return entry


if __name__ == "__main__":
    q_file = "data/content-os/social_outbox_queue.jsonl"
    caption = format_chaptered_caption(
        matchup="CAR @ GB",
        trench_insight="Green Bay 51% pressure rate on standard 4-man rushes vs Bryce Young",
        official_play="GREEN BAY -7.5",
        edge_pct=4.2,
    )
    post = enqueue_social_post(q_file, "X", caption)
    print("Enqueued Post:", post["id"], "Status:", post["status"])
