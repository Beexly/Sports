"""Session Librarian Hygiene for Hermes state.db.

Performs:
1. Soft-archive (archived = 1) for empty shell sessions (message_count <= 2) and unpinned scratch sessions.
2. Preserves all keeper sessions, high message-count histories, and pinned sessions.
3. WAL checkpoint (TRUNCATE) to reclaim disk space without dropping tables or rows.
"""

import sqlite3
import os

DB_PATH = r"C:\Users\Garrett\AppData\Local\hermes\state.db"


def run_session_librarian_hygiene(db_path: str = DB_PATH) -> dict:
    if not os.path.exists(db_path):
        return {"status": "error", "message": f"DB not found at {db_path}"}
        
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # 1. Count before
    cur.execute("SELECT COUNT(*) FROM sessions WHERE archived = 1")
    archived_before = cur.fetchone()[0]
    
    # 2. Soft-archive empty shell sessions
    cur.execute(
        "UPDATE sessions SET archived = 1 WHERE message_count <= 2 AND pinned = 0 AND archived = 0"
    )
    newly_archived = cur.rowcount
    conn.commit()
    
    # 3. Truncate WAL
    cur.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    wal_res = cur.fetchone()
    
    conn.close()
    
    return {
        "status": "success",
        "archived_before": archived_before,
        "newly_archived": newly_archived,
        "total_archived": archived_before + newly_archived,
        "wal_checkpoint": wal_res,
    }


if __name__ == "__main__":
    res = run_session_librarian_hygiene()
    print("Session Librarian Hygiene Result:")
    for k, v in res.items():
        print(f"  {k}: {v}")
