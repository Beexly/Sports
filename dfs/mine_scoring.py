"""Mine DK app.js + all chunks for fantasy scoring engine equations."""
import httpx, re, json

CHUNKS = ['9348.a34c2840cbcf31e4071b','3185.c1860346d01764491642','4577.a211258016768a79a8b9',
          '4736.a184c37791c00b844648','397.13e0fcdc799f7ec92c47','578.0fc542b8209e61a0d31f',
          '286.96a1528de65fcd9852ab','584.a003f052b52ec8176a39','2282.7de757f0f89231244a2f',
          '5941.86b9bbb70d62a9e2aa9c','1980.425e86063201aacb1620','3585.585dbe4de46db3050a9e',
          '9896.988158090ec6ee62b47c','3200.aae739dfa3b030ac9fa2','9198.6a0d2214cca83c7d3e97',
          '1009.5eb21d6f9792ad459f03','2546.357d4d4065fbebc25a47','363.5a67f3f63a25152d7790',
          '4716.0b4dece1f197dfe5f8d2','6749.b79356d6c5c5a6e4f1bd','9265.42271d21fc3fbd3bf499',
          '1091.a8aa422c3b7097b01fcf']

KEYS = ['scoring', 'pointPer', 'PassingYd', 'RushingYd', 'ReceivingYd', 'FantasyPoints',
        'Touchdown', 'scoringRules', 'scoringType', 'statValue', 'per25', 'per10',
        'passYards', 'rushYards', 'recYards', 'bonusRushing', 'bonusReceiving',
        'bonusPassing', '300YdBonus', '100YdBonus', 'fumbleLost', 'interception']

findings = {}
with httpx.Client(http2=True, timeout=40) as c:
    for name, url in [('app.js', 'https://d9sojbwwxq62r.cloudfront.net/dkjs/app.js?revision=2430')] + \
                     [(ch.split('.')[0], f'https://d9sojbwwxq62r.cloudfront.net/dkjs/{ch}.js') for ch in CHUNKS]:
        try:
            t = c.get(url).text
            counts = {}
            for k in KEYS:
                n = len(re.findall(re.escape(k), t, re.I))
                if n:
                    counts[k] = n
            if counts.get('scoring', 0) > 2 or counts.get('pointPer', 0) > 0 or counts.get('statValue', 0) > 0:
                open(f'dfs/chunks/{name}.js', 'w').write(t)
                findings[name] = {'size': len(t) // 1024, 'counts': counts}
                print(f'{name}: {len(t)//1024}KB — candidate scoring module')
                for k, v in sorted(counts.items(), key=lambda x: -x[1])[:8]:
                    print(f'    {k}: {v}')
        except Exception as e:
            print(name, 'fail', str(e)[:50])

json.dump(findings, open('dfs/engine_mining_index.json', 'w'), indent=1)
print('\nsaved dfs/engine_mining_index.json')
