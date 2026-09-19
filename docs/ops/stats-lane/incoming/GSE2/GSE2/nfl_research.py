import urllib.request
import json
import re

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

def fetch_url(url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8', errors='replace')

# 1. Try ESPN API for depth-specific passing data
# ESPN has a stats API
try:
    url = 'https://www.espn.com/nfl/stats/player/_/view/statistics/passing/depth-of-target'
    html = fetch_url(url)
    print(f"ESPN depth-of-target page: {len(html)} chars")
    # Look for data
    if 'depth' in html.lower() or 'air yards' in html.lower():
        print("Found depth/air yards content")
    # Extract JSON data from the page
    json_match = re.search(r'window\.__espn\{\}.*?"stats":\[.*?\]', html)
    if json_match:
        print(f"Found ESPN JSON data, length: {len(json_match.group())}")
    else:
        print("No JSON data found in ESPN page")
    print(f"First 2000 chars: {html[:2000]}")
except Exception as e:
    print(f"ESPN error: {e}")

print("\n" + "="*80 + "\n")

# 2. Try NFL.com/stats with pass distance filter
try:
    url = 'https://www.nfl.com/stats/player-stats/category/passing/2024/reg/all/passingcompletionpercentage/desc'
    html = fetch_url(url)
    print(f"NFL.com/stats page: {len(html)} chars")
    print(f"First 2000 chars:\n{html[:2000]}")
except Exception as e:
    print(f"NFL.com/stats error: {e}")
