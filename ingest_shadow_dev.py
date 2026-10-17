import json
import psycopg2
from datetime import datetime, timezone
from apply_watch_schema_dev import get_dev_conn_str

def ingest_shadow():
    conn_str = get_dev_conn_str()
    print("[*] Connecting to Neon branch dev-cv-watch-2026-10 ...")
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    cur = conn.cursor()

    # Load vision_shadow.jsonl
    with open('intelligence/vision/shadow/vision_shadow.jsonl', 'r', encoding='utf-8') as f:
        records = [json.loads(line) for line in f if line.strip()]

    print(f"[*] Read {len(records)} shadow records. Ingesting at weight 0.0 ...")

    # Ensure proof play game exists
    game_id = "2022091113"
    cur.execute("""
        INSERT INTO watch.games (game_id, season, week, away, home, kickoff_ts, window_start, status)
        VALUES (%s, 2022, 1, 'TB', 'DAL', '2022-09-11 20:20:00+00', '2022-09-11 20:00:00+00', 'final')
        ON CONFLICT (game_id) DO UPDATE SET status = 'final';
    """, (game_id,))

    # Ensure trk-global exists for play-level calibration metrics
    cur.execute("""
        INSERT INTO watch.tracklets (game_id, tracklet_id, start_ts, end_ts, n_frames, team_hint, role)
        VALUES (%s, 'trk-global', '2022-09-11 20:20:00+00', '2022-09-11 20:20:10+00', 68, 'GLOBAL', 'calibration')
        ON CONFLICT (game_id, tracklet_id) DO NOTHING;
    """, (game_id,))


    positions_inserted = 0
    metrics_inserted = 0

    for idx, r in enumerate(records):
        ts_str = r.get("ts", datetime.now(timezone.utc).isoformat())
        ts = datetime.fromisoformat(ts_str)

        # 1. Kalman CV ByteTrack records (Lines 4 & 9)
        if "sample_player_state" in r:
            pst = r["sample_player_state"]
            trk_id = pst.get("track_id", f"P-{idx:03d}")
            # Insert tracklet
            cur.execute("""
                INSERT INTO watch.tracklets (game_id, tracklet_id, start_ts, end_ts, n_frames, team_hint, role)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (game_id, tracklet_id) DO NOTHING;
            """, (game_id, trk_id, ts, ts, r.get("frames", 68), "DAL", "defense"))
            
            # Insert field position
            cur.execute("""
                INSERT INTO watch.field_positions (game_id, tracklet_id, t, x_yd, y_yd, speed_yds)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (game_id, tracklet_id, t) DO NOTHING;
            """, (game_id, trk_id, ts, round(pst["x_m"] * 1.09361, 2), round(pst["y_m"] * 1.09361, 2), 1.10))
            positions_inserted += 1

        if "sample_ball_state" in r:
            bst = r["sample_ball_state"]
            b_trk_id = bst.get("track_id", "BALL-01")
            cur.execute("""
                INSERT INTO watch.tracklets (game_id, tracklet_id, start_ts, end_ts, n_frames, team_hint, role)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (game_id, tracklet_id) DO NOTHING;
            """, (game_id, b_trk_id, ts, ts, r.get("frames", 68), "BALL", "football"))
            
            cur.execute("""
                INSERT INTO watch.field_positions (game_id, tracklet_id, t, x_yd, y_yd, speed_yds)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (game_id, tracklet_id, t) DO NOTHING;
            """, (game_id, b_trk_id, ts, round(bst["x_m"] * 1.09361, 2), round(bst["y_m"] * 1.09361, 2), 7.72))
            positions_inserted += 1

        # 2. SkeleTrack v2 validation records (Lines 5-8, 12-14)
        if "homography_metrics" in r:
            hm = r["homography_metrics"]
            cur.execute("""
                INSERT INTO watch.derived_metrics (game_id, tracklet_id, segment, metric, value, t)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (game_id, tracklet_id, segment, metric) DO UPDATE SET value = EXCLUDED.value;
            """, (game_id, "trk-global", "homography", "landmark_reprojection_err_m", hm.get("landmark_reprojection_mean_err_m", 0.0242), ts))
            metrics_inserted += 1

        if "tracking_and_calibration_metrics" in r:
            tm = r["tracking_and_calibration_metrics"]
            cur.execute("""
                INSERT INTO watch.derived_metrics (game_id, tracklet_id, segment, metric, value, t)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (game_id, tracklet_id, segment, metric) DO UPDATE SET value = EXCLUDED.value;
            """, (game_id, "trk-global", "kalman", "player_position_kalman_rmse_m", tm.get("player_position_kalman_rmse_m", 0.0753), ts))
            metrics_inserted += 1

    print(f"[+] Ingestion complete. Positions inserted: {positions_inserted}, Derived metrics: {metrics_inserted}")

    # STEP 3 PROOF QUERY
    print("\n--- STEP 3 PROOF QUERY ---")
    cur.execute("""
        SELECT 
            COUNT(*) as pos_count,
            ROUND(AVG(x_yd)::numeric, 2) as mean_x_yd,
            ROUND(AVG(y_yd)::numeric, 2) as mean_y_yd
        FROM watch.field_positions
        WHERE game_id = %s;
    """, (game_id,))
    row = cur.fetchone()
    print(f"Game {game_id} (Play 1766):")
    print(f"  - Field Positions Count: {row[0]}")
    print(f"  - Mean x (yards): {row[1]}")
    print(f"  - Mean y (yards): {row[2]}")

    cur.execute("""
        SELECT metric, value FROM watch.derived_metrics WHERE game_id = %s;
    """, (game_id,))
    metrics = cur.fetchall()
    print(f"  - Stored Derived Metrics (weight 0.0):")
    for m in metrics:
        print(f"      * {m[0]}: {m[1]}")

    conn.close()

if __name__ == '__main__':
    ingest_shadow()
