import requests
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
}

# Try NFL.com/stats API - the stats pages often load data from an API
# Let's try to get depth-specific completion data
nfl_stats_url = 'https://www.nfl.com/stats/player-stats/category/passing/2025/reg/all/passingcompletionpercentage/desc'

try:
    resp = requests.get(nfl_stats_url, headers=headers, timeout=30)
    print(f"NFL.com/stats response status: {resp.status_code}")
    print(f"Response length: {len(resp.text)}")
    text = resp.text
    # Look for data patterns
    if 'xCOMP' in text or 'cpoe' in text.lower():
        print("Found CPOE/xCOMP data")
    print(text[1000:4000])
except Exception as e:
    print(f"Error: {e}")
