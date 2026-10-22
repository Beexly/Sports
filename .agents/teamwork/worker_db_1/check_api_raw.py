import urllib.request
import json

url = 'https://www.galaxysportsedge.com/api/picks?sport=americanfootball_nfl'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        body = resp.read().decode('utf-8')
        data = json.loads(body)
        print("Keys:", list(data.keys()))
        print("Status/message/meta:", {k: v for k, v in data.items() if k != 'picks'})
        picks = data.get('picks', [])
        print("Picks count:", len(picks))
except Exception as e:
    print('Error:', e)
