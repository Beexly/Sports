#!/usr/bin/env python3
"""
GSE Engine API — minimal HTTP service for board predictions.

Endpoints:
  GET /health       → service status
  GET /board/nfl    → NFL Week 5 board (honest baseline/diagnostic labels)
  GET /board/cfb    → CFB model card + status (between slates)

Every response includes generated_at. No pick/bet/edge language.
Run: python3 api.py  (serves on port 8899)
"""
import json
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify

app = Flask(__name__)

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

def _load_json(path):
    with open(path) as f:
        return json.load(f)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "gse-engine-api",
        "timestamp": _now_iso(),
    })

@app.route("/board/nfl", methods=["GET"])
def board_nfl():
    """NFL Week 5 board — real Pinnacle lines, honest labels."""
    try:
        from live_board import live_board
    except ImportError as e:
        return jsonify({
            "status": "ERROR",
            "generated_at": _now_iso(),
            "error": f"live_board module not available: {e}",
        }), 500

    # Load stamped closing lines
    lines_path = os.path.join(DATA_DIR, "nfl_closing_lines.json")
    games_path = os.path.join(DATA_DIR, "nfl_games.json")

    try:
        games_data = _load_json(games_path)
        games = games_data.get("games", games_data) if isinstance(games_data, dict) else games_data
    except FileNotFoundError:
        # Fallback: derive games from closing lines
        lines_data = _load_json(lines_path)
        lg = lines_data.get("games", []) if isinstance(lines_data, dict) else lines_data
        games = [{"id": g["id"], "home": g["home"], "away": g["away"], "start": g.get("start")} for g in lg]

    warehouse = {
        "closing_lines": lines_path,
        # Overlays: paths that don't exist yet → refused gracefully → baseline
        "situational_graph": os.path.join(DATA_DIR, "situational_graph.json"),
        "eq_overlays": os.path.join(DATA_DIR, "eq_overlays.json"),
        "ppa_overlay": os.path.join(DATA_DIR, "ppa_overlay.json"),
    }

    try:
        board = live_board(games, warehouse)
    except ValueError as e:
        # CollegeGuard refusal
        return jsonify({
            "status": "REFUSED",
            "generated_at": _now_iso(),
            "reason": str(e)[:500],
        }), 200
    except Exception as e:
        return jsonify({
            "status": "ERROR",
            "generated_at": _now_iso(),
            "error": str(e)[:500],
        }), 500

    # Enrich with API metadata
    board["api"] = "gse-engine-api"
    board["endpoint"] = "/board/nfl"
    return jsonify(board)

@app.route("/board/cfb", methods=["GET"])
def board_cfb():
    """CFB board — model card + honest status. CFB plays Saturdays; this is the between-slate state."""
    model_card_path = os.path.join(DATA_DIR, "MODEL_CARD_v1.json")
    try:
        card = _load_json(model_card_path)
    except FileNotFoundError:
        card = {
            "model": "cfb_model_v1",
            "sigma_spread": 15.185,
            "hfa": 3.929,
            "holdout_crps_close": 8.3314,
            "verdict": "close holds; PPA diagnostic; no production change",
            "note": "embedded fallback — MODEL_CARD_v1.json not found",
        }

    return jsonify({
        "status": "BETWEEN_SLATES",
        "generated_at": _now_iso(),
        "api": "gse-engine-api",
        "endpoint": "/board/cfb",
        "label": "CFB plays Saturdays. Model card below is the frozen fitted state.",
        "model_card": card,
        "kill_ledger_entries": 12,
        "honest_note": "No live CFB board on Sundays. Saturday slate returns next week.",
    })

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "service": "gse-engine-api",
        "endpoints": ["/health", "/board/nfl", "/board/cfb"],
        "generated_at": _now_iso(),
    })

# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8899))
    print(f"GSE Engine API starting on port {port}...", flush=True)
    app.run(host="0.0.0.0", port=port, debug=False)
