"""Fetch a creator's reels via instagram-cli. Returns list of reel dicts."""
import json
import subprocess

ACCOUNT_ID = "17841418736470338"  # galaxysportsnetwork


def fetch_reels(username, limit=50, account_id=ACCOUNT_ID):
    cmd = [
        "instagram-cli", "posts",
        "--account-id", account_id,
        "--username", username,
        "--post-types", "REEL",
        "--sort-order", "desc",
        "--limit", str(limit),
    ]
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if out.returncode != 0:
        raise RuntimeError(f"instagram-cli failed: {out.stderr[:500]}")
    data = json.loads(out.stdout)
    reels = []
    for p in data.get("posts", []):
        reels.append({
            "post_id": p.get("post_id"),
            "url": p.get("url"),
            "caption": (p.get("post_caption") or "")[:2000],
            "likes": p.get("likes", 0),
            "comments": p.get("comments", 0),
            "created_at": p.get("created_at"),
            "username": p.get("username"),
        })
    return reels


if __name__ == "__main__":
    import sys
    reels = fetch_reels(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 10)
    print(json.dumps(reels, indent=1)[:2000])
    print(f"\n{len(reels)} reels")
