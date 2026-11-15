import sqlite3
c = sqlite3.connect(r"C:\Users\Garrett\Sports\foundry\foundry.db")
c.execute("UPDATE corpus_queue SET status='DELEGATED_GCP' WHERE status='PENDING' AND substr(sha256,1,1) >= '8'")
c.commit()
print("Local Qwen4 Shard-A Pending:", c.execute("SELECT COUNT(*) FROM corpus_queue WHERE status='PENDING'").fetchone()[0])
print("Delegated to GCP Shard-B:", c.execute("SELECT COUNT(*) FROM corpus_queue WHERE status='DELEGATED_GCP'").fetchone()[0])
