import re

raw_text = """
https://kalshi.com/ https://us.betrivers.net/?page=all-games&lvar=1 https://www.tvg.com/ https://jack.com/en/sportsbook/prematch https://www.borgataonline.com/en/casino https://cosmobet.one/en/sportsbook/prematch https://stake.com/?c=50046214ff https://betway.com/bwp/sports-welcome/en-us/?utm_source=18648&utm_medium=Affiliate&utm_campaign=Default https://rainbet.com/ https://www.football.com/livescore/en https://sportsbook.draftkings.com/ https://predictions.draftkings.com/en/ https://www.draftkings.com/dfs https://pick6.draftkings.com/ https://vodds.com/ https://www.ballybet.com/ https://www.action247.com/ https://www.actionnetwork.com/ https://sharplines.io/
https://www.covers.com/ https://www.dimers.com/ https://www.oddsshark.com/ https://www.pickswise.com/ https://www.vegasinsider.com/ https://www.scoresandodds.com/ https://www.bettingpros.com/ https://www.betql.co/ https://rotogrinders.com/ https://rotogrinders.com/ https://sharplines.io/ https://polymarket.com/ https://livesportsodds.com/ https://www.oddsportal.com/ https://opticodds.com/ https://www.rotowire.com/betting/sites https://www.sportsbettingdime.com/guides/strategy/best-stats-sites/ https://crazyninjaodds.com/site/tools/positive-ev.aspx https://www.rebelbetting.com/en-us/ev-betting https://www.betsmart.co/articles/positive-ev-betting-tool-find-value-and-beat-the-books https://apps.apple.com/us/app/optimal-bet-ev-sports-betting/id1562901389 https://www.linestarapp.com/ https://www.stokastic.com/ https://www.fantasycruncher.com/ lineuplab.com https://www.dailyfantasyfuel.com/ https://www.sabersim.com/ https://www.pro-football-reference.com/ https://www.novig.us/ https://www.prophetx.co/ https://www.getfliff.com/ https://datarade.ai/data-categories/odds-betting-data/providers
"""

urls = re.findall(r'(https?://[^\s]+|lineuplab\.com)', raw_text)
# Normalize
norm_urls = []
for u in urls:
    if u == 'lineuplab.com':
        u = 'https://lineuplab.com/'
    norm_urls.append(u)

# Dedup preserving order
seen = set()
deduped = []
for u in norm_urls:
    if u not in seen:
        seen.add(u)
        deduped.append(u)

print(f"Total extracted unique URLs: {len(deduped)}")
for i, u in enumerate(deduped, 1):
    print(f"{i:2d}. {u}")
