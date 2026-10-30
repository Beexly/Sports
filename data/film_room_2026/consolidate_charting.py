#!/usr/bin/env python3
"""
Consolidate VL analysis results into film charting JSON per game.
Reads vl_analysis_*.json files and produces structured film charting data
in the existing film_room schema.
"""

import json
import os
import glob
import re
from datetime import datetime
from pathlib import Path

FRAME_DIR = "C:/Users/Garrett/Sports/data/film_room_2026/_bootstrap"
OUTPUT_DIR = "C:/Users/Garrett/Sports/data/film_room_2026"

def parse_vl_analysis(analysis_text):
    """Parse structured VL analysis text into fields."""
    fields = {}
    lines = analysis_text.strip().split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('(1)'):
            fields['play_type'] = line.split(':', 1)[1].strip() if ':' in line else line
        elif line.startswith('(2)'):
            fields['possession_team'] = line.split(':', 1)[1].strip() if ':' in line else line
        elif line.startswith('(3)'):
            fields['visible_players'] = line.split(':', 1)[1].strip() if ':' in line else line
        elif line.startswith('(4)'):
            fields['formation'] = line.split(':', 1)[1].strip() if ':' in line else line
        elif line.startswith('(5)'):
            fields['coverage_shell'] = line.split(':', 1)[1].strip() if ':' in line else line
        elif line.startswith('(6)'):
            fields['game_situation'] = line.split(':', 1)[1].strip() if ':' in line else line
        elif line.startswith('(7)'):
            fields['trench_qb_detail'] = line.split(':', 1)[1].strip() if ':' in line else line
    return fields

def extract_snap_timestamp(frame_name):
    """Extract timestamp from frame filename (e.g., chicar_0001.jpg at 1/3 fps)."""
    match = re.search(r'(\d+)', frame_name)
    if match:
        frame_num = int(match.group(1))
        # Approximate: 1/3 fps means 3 seconds per frame
        seconds = (frame_num - 1) * 3
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes:02d}:{secs:02d}"
    return "00:00"

def consolidate_game(game_name, analysis_file):
    """Consolidate VL analysis for a single game into film charting JSON."""
    with open(analysis_file, 'r') as f:
        results = json.load(f)

    snaps = []
    for item in results:
        frame_name = item['frame']
        analysis = item.get('analysis', '')
        error = item.get('error')

        parsed = parse_vl_analysis(analysis) if analysis and not error else {}
        timestamp = extract_snap_timestamp(frame_name)

        snap_entry = {
            "frame": frame_name,
            "timestamp": timestamp,
            "analysis": parsed,
            "error": error,
            "has_visual_data": analysis is not None and not error
        }
        snaps.append(snap_entry)

    # Sort by frame number
    snaps.sort(key=lambda x: int(re.search(r'(\d+)', x['frame']).group(1)) if re.search(r'(\d+)', x['frame']) else 0)

    charting = {
        "game": game_name,
        "total_snaps": len(snaps),
        "snaps_with_visual_data": sum(1 for s in snaps if s["has_visual_data"]),
        "consolidated_at": datetime.utcnow().isoformat() + "Z",
        "snaps": snaps
    }

    return charting

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    analysis_files = sorted(glob.glob(os.path.join(FRAME_DIR, "vl_analysis_*.json")))

    all_game_charting = []

    for af in analysis_files:
        basename = os.path.basename(af)
        # Extract game name from filename: vl_analysis_chi_vs_car.json -> chi_vs_car
        game_name = basename.replace("vl_analysis_", "").replace(".json", "")
        if game_name == "sample":
            continue
        if game_name == "blocking_scheme":
            continue

        print(f"Consolidating {game_name}...")
        charting = consolidate_game(game_name, af)

        # Save per-game charting JSON
        out_path = os.path.join(OUTPUT_DIR, f"film_charting_{game_name}.json")
        with open(out_path, 'w') as f:
            json.dump(charting, f, indent=1)

        print(f"  {charting['total_snaps']} snaps, {charting['snaps_with_visual_data']} with visual data -> {out_path}")
        all_game_charting.append(charting)

    # Save master charting file
    master = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total_games": len(all_game_charting),
        "total_snaps": sum(g["total_snaps"] for g in all_game_charting),
        "games": {g["game"]: {
            "total_snaps": g["total_snaps"],
            "snaps_with_visual_data": g["snaps_with_visual_data"],
            "charting_file": f"film_charting_{g['game']}.json"
        } for g in all_game_charting}
    }

    master_path = os.path.join(OUTPUT_DIR, "film_charting_master.json")
    with open(master_path, 'w') as f:
        json.dump(master, f, indent=1)

    print(f"\nMaster charting saved to {master_path}")
    print(f"Total games: {master['total_games']}, Total snaps: {master['total_snaps']}")

if __name__ == "__main__":
    main()
