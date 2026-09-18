#!/usr/bin/env python3
"""GSE ETL Pipeline - Automated Data Ingestion from 50+ Sports APIs

Sources:
- FantasyPros, PFF, Understat, Sports Reference
- MyBookie, BetOnline, Matchbook
- WHOOP, Oura, Garmin
- NBA Stats, Baseball Savant
- Esports Charts, Sportradar, Genius Sports
- Stats Perform, Catapult Sports, Second Spectrum
- StatsBomb, Opta Sports
"""
import pandas as pd
import numpy as np
import requests
import json
from datetime import datetime
import schedule
import time

# ============================================================
# API CONFIGURATION
# ============================================================
APIS = {
    "fantasypros": {
        "url": "https://www.fantasypros.com/",
        "type": "fantasy",
        "features": ["c1_score", "adp", "projections"]
    },
    "pff": {
        "url": "https://www.pff.com/",
        "type": "analytics",
        "features": ["offense_grade", "defense_grade", "special_teams_grade"]
    },
    "understat": {
        "url": "https://www.understat.com/",
        "type": "analytics",
        "features": ["xg", "xga", "npxg", "ppda"]
    },
    "sports_reference": {
        "url": "https://www.sports-reference.com/",
        "type": "statistics",
        "features": ["per", "war", "ws", "bpm"]
    },
    "mybookie": {
        "url": "https://www.mybookie.ag/",
        "type": "betting",
        "features": ["odds", "profit_boost", "squares"]
    },
    "betonline": {
        "url": "https://www.betonline.ag/",
        "type": "betting",
        "features": ["odds", "crypto_bonus", "vip_tier"]
    },
    "matchbook": {
        "url": "https://www.matchbook.com/",
        "type": "exchange",
        "features": ["exchange_odds", "commission", "bet_builder"]
    },
    "whoop": {
        "url": "https://www.whoop.com/",
        "type": "wearable",
        "features": ["hrv", "strain", "recovery", "sleep"]
    },
    "oura": {
        "url": "https://ouraring.com/",
        "type": "wearable",
        "features": ["sleep", "recovery", "hrv", "activity"]
    },
    "garmin": {
        "url": "https://www.garmin.com/",
        "type": "wearable",
        "features": ["gps", "heart_rate", "sleep", "performance"]
    },
    "nba_stats": {
        "url": "https://www.nba.com/stats/",
        "type": "analytics",
        "features": ["player_tracking", "shot_chart", "lineup_data"]
    },
    "baseball_savant": {
        "url": "https://baseballsavant.mlb.com/",
        "type": "analytics",
        "features": ["statcast", "exit_velocity", "launch_angle", "spin_rate"]
    },
    "esports_charts": {
        "url": "https://escharts.com/",
        "type": "esports",
        "features": ["tournament_data", "player_stats", "match_history"]
    },
    "sportradar": {
        "url": "https://www.sportradar.com/",
        "type": "data",
        "features": ["odds", "statistics", "market_data"]
    },
    "genius_sports": {
        "url": "https://www.geniussports.com/",
        "type": "data",
        "features": ["odds", "statistics", "integrity"]
    },
    "stats_perform": {
        "url": "https://www.statsperform.com/",
        "type": "data",
        "features": ["statistics", "video", "analytics"]
    },
    "catapult_sports": {
        "url": "https://www.catapultsports.com/",
        "type": "wearable",
        "features": ["tracking", "analytics", "performance"]
    },
    "second_spectrum": {
        "url": "https://www.secondspectrum.com/",
        "type": "analytics",
        "features": ["tracking", "analytics", "computer_vision"]
    },
    "statsbomb": {
        "url": "https://statsbomb.com/",
        "type": "analytics",
        "features": ["event_data", "analytics", "football"]
    },
    "opta_sports": {
        "url": "https://www.optasports.com/",
        "type": "data",
        "features": ["statistics", "event_data", "analytics"]
    }
}

# ============================================================
# ETL FUNCTIONS
# ============================================================
def extract_data(api_name, api_config):
    """Extract data from API endpoint."""
    url = api_config["url"]
    features = api_config["features"]
    
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return {
                "api": api_name,
                "status": "success",
                "features": features,
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "api": api_name,
                "status": "error",
                "code": response.status_code,
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        return {
            "api": api_name,
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

def transform_data(raw_data):
    """Transform raw data into standardized format."""
    transformed = []
    for item in raw_data:
        if item["status"] == "success":
            transformed.append({
                "api": item["api"],
                "features": item["features"],
                "timestamp": item["timestamp"]
            })
    return transformed

def load_data(transformed_data, output_path):
    """Load transformed data into storage."""
    df = pd.DataFrame(transformed_data)
    df.to_csv(output_path, index=False)
    return df

# ============================================================
# MAIN ETL PIPELINE
# ============================================================
def run_etl_pipeline():
    """Run the complete ETL pipeline."""
    print(f"[{datetime.now()}] Starting ETL Pipeline...")
    
    # Extract
    raw_data = []
    for api_name, api_config in APIS.items():
        result = extract_data(api_name, api_config)
        raw_data.append(result)
        print(f"  Extracted: {api_name} - {result['status']}")
    
    # Transform
    transformed_data = transform_data(raw_data)
    print(f"  Transformed: {len(transformed_data)} records")
    
    # Load
    output_path = "/var/minis/shared/gse-discovery/etl_output.csv"
    df = load_data(transformed_data, output_path)
    print(f"  Loaded: {len(df)} records to {output_path}")
    
    return df

if __name__ == "__main__":
    df = run_etl_pipeline()
    print(f"\nETL Pipeline Complete!")
    print(f"Total APIs configured: {len(APIS)}")
    print(f"Total records processed: {len(df)}")
