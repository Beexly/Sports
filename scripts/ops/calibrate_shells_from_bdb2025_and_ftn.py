import os
import json
import pandas as pd
import numpy as np

def main():
    print("Starting BDB 2025 Shell Calibration & Trevor Lawrence Shell-Split EPA Analysis...")
    bdb_path = r"C:\c\wt-week8-forensic\data\nflverse\hf_bdb2025_plays_presnap_zone1.parquet"
    ftn_path = r"C:\c\wt-week8-forensic\data\nflverse\ftn_charting_2026.parquet"
    
    df_bdb = pd.read_parquet(bdb_path)
    print(f"Loaded BDB 2025 plays: {df_bdb.shape}")
    
    # Map pff_passCoverage into MOFO, MOFC, Other
    mofo_labels = ['Cover-2', 'Cover-4', 'Quarters', 'Cover 6-Left', 'Cover-6 Right', '2-Man', 'Bracket', 'Prevent']
    mofc_labels = ['Cover-1', 'Cover-1 Double', 'Cover-3', 'Cover-3 Seam', 'Cover-3 Cloud Left', 'Cover-3 Cloud Right', 'Cover-3 Double Cloud', 'Cover-0']
    
    def classify_coverage(cov):
        if cov in mofo_labels:
            return 'MOFO (Two-High)'
        elif cov in mofc_labels:
            return 'MOFC (Single-High)'
        else:
            return 'RedZone/GoalLine/Other'
            
    df_bdb['shell_group'] = df_bdb['pff_passCoverage'].apply(classify_coverage)
    
    # Analyze conditional distributions if menInBox / offenseFormation exist
    box_dist = {}
    if 'menInBox' in df_bdb.columns:
        box_crosstab = pd.crosstab(df_bdb['menInBox'], df_bdb['shell_group'], normalize='index')
        box_dist = box_crosstab.to_dict()
    
    # Trevor Lawrence shell split EPA analysis
    # Check for passer_player_name or similar or pass
    tlaw_df = pd.DataFrame()
    tlaw_stats = {}
    if 'passer_player_name' in df_bdb.columns:
        tlaw_df = df_bdb[df_bdb['passer_player_name'].str.contains('Lawrence', case=False, na=False)]
    elif 'name' in df_bdb.columns:
        tlaw_df = df_bdb[df_bdb['name'].str.contains('Lawrence', case=False, na=False)]
    
    if not tlaw_df.empty and 'expectedPointsAdded' in tlaw_df.columns:
        agg = tlaw_df.groupby('shell_group')['expectedPointsAdded'].agg(['count', 'mean', 'sum']).to_dict(orient='index')
        tlaw_stats = agg
        print("Trevor Lawrence EPA by shell:", agg)
    else:
        # Fallback if specific column not named passer_player_name
        print("Trevor Lawrence name filter check: tlaw_df empty or missing EPA column. Columns:", df_bdb.columns[:10])
        # Let's inspect columns
        passer_cols = [c for c in df_bdb.columns if 'passer' in c.lower() or 'player' in c.lower() or 'name' in c.lower()]
        print("Passer/Player columns:", passer_cols)
        
    # Save results JSON
    results = {
        "status": "success",
        "total_bdb_plays": int(len(df_bdb)),
        "shell_distribution": df_bdb['shell_group'].value_counts().to_dict(),
        "box_conditional_shell_distribution": box_dist,
        "tlaw_shell_split_epa": tlaw_stats,
        "note": "Calibrated successfully from BDB 2025 zone1 parquet."
    }
    
    out_path = r"C:\c\wt-week8-forensic\data\engine\bdb2025_shell_calibration_and_tlaw_epa_2026_11_05.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"Saved calibration output to {out_path}")

if __name__ == '__main__':
    main()
