import urllib.request
import json

url = 'https://www.galaxysportsedge.com/api/picks?sport=americanfootball_nfl'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        picks = data.get('picks', [])
        print(f"Total picks returned by API: {len(picks)}")
        for p in picks:
            intel = p.get('intelligence')
            no_bet = intel.get('noBet') if intel else None
            fb = p.get('factorBreakdown', {})
            gid = p.get('game', {})
            matchup = f"{gid.get('awayTeam')} @ {gid.get('homeTeam')}"
            print(f"ID: {p.get('id')} | Matchup: {matchup} | Type: {p.get('pickType')} | Selection: {p.get('selection')} | noBet: {no_bet} | reasoningLen: {len(p.get('reasoning', ''))} | edgeScore: {p.get('edgeScore')}")
            print(f"   has injuryEvidence in pick: {'injuryEvidence' in p}, in fb: {'injuryEvidence' in fb}")
            print(f"   has continuityDeltas in pick: {'continuityDeltas' in p}, in fb: {'continuityDeltas' in fb}")
except Exception as e:
    print('Error fetching API:', e)
