import json
import re

with open('docs/arxiv-program/research/2026-10-17/ALL_FOOTBALL_PAPERS_310_AUDIT.json', 'r', encoding='utf-8') as f:
    papers = json.load(f)

print(f"Loaded {len(papers)} football papers.")

# Define football domains
domains = {
    "1_BETTING_MARKET_ODDS_SPREADS_EFFICIENCY": {
        "desc": "Betting market efficiency, oddsmaker bias, point spreads, moneylines, over/under totals, closing line value (CLV), public bias",
        "keywords": ['betting', 'odds', 'spread', 'moneyline', 'wagering', 'vig', 'bookmaker', 'oddsmaker', 'market efficiency', 'clv', 'gambling', 'closing line', 'arbitrage'],
        "papers": []
    },
    "2_IN_GAME_WIN_PROBABILITY_EXPECTED_POINTS_4TH_DOWN": {
        "desc": "In-game win probability (WP/WPA), Expected Points Added (EPA), 4th down decision-making, field goal vs punt, clock management, game states",
        "keywords": ['win probability', 'expected points', 'epa', 'fourth down', '4th down', 'field goal', 'punt', 'decision-making', 'time management', 'clock', 'go for it', 'wp'],
        "papers": []
    },
    "3_PASS_COVERAGE_SECONDARY_ROUTE_RUNNING": {
        "desc": "Defensive coverage shells (Cover 1, 2, 3, 4, Man/Zone), safety rotation, receiver route recognition, separation, target prediction, DB reaction",
        "keywords": ['coverage', 'secondary', 'cornerback', 'safety', 'route', 'receiver', 'separation', 'pass coverage', 'catch', 'interception', 'target', 'defensive back'],
        "papers": []
    },
    "4_TRENCH_WARFARE_PASS_RUSH_OL_PROTECTION": {
        "desc": "Offensive line pass blocking, blitz pickup, stunt identification, pass rush pressure, sacks, pocket strain, time to throw, trench geometry",
        "keywords": ['pass rush', 'pass protection', 'offensive line', 'lineman', 'sack', 'pressure', 'blitz', 'pocket', 'trench', 'blocker', 'rusher', 'strain'],
        "papers": []
    },
    "5_BALL_CARRIER_RUSHING_TACKLING_EXPECTED_YARDS": {
        "desc": "Running back vision, rushing lanes, Expected Rushing Yards, tackling probability, broken tackles, yards after contact, box count, run defense",
        "keywords": ['rushing', 'ball carrier', 'run', 'tackle', 'tackling', 'yards after contact', 'rush yards', 'running back', 'broken tackle'],
        "papers": []
    },
    "6_QUARTERBACK_EVALUATION_PASSING_DECISION_MAKING": {
        "desc": "QB processing, completion probability over expected (CPOE), throw accuracy, turnover-worthy plays, air yards, progressions, passer rating",
        "keywords": ['quarterback', 'passing', 'completion', 'cpoe', 'passer', 'throw', 'interception', 'air yards', 'accuracy', 'qb'],
        "papers": []
    },
    "7_SPECIAL_TEAMS_FIELD_GOALS_PUNTING_KICKOFFS": {
        "desc": "Field goal success probability, punter hang time and distance, kickoff returns, special teams EPA, field position equity",
        "keywords": ['field goal', 'punter', 'punt', 'kickoff', 'kicker', 'special teams', 'returner', 'hang time', 'touchback'],
        "papers": []
    },
    "8_PLAYER_VALUATION_WAR_DRAFT_CONTRACTS_ROSTER": {
        "desc": "Wins Above Replacement (WAR), player value, NFL draft analytics, contract value, roster construction, aging curves, talent translation",
        "keywords": ['war', 'draft', 'roster', 'valuation', 'contract', 'salary cap', 'combine', 'aging', 'replacement level', 'player evaluation', 'nflwar'],
        "papers": []
    },
    "9_INJURIES_FATIGUE_CONCUSSION_BIOMECHANICS": {
        "desc": "Concussion detection and kinematics, helmet impact dynamics, lower-extremity injury risk, turf vs natural grass, workload and fatigue, short rest",
        "keywords": ['injury', 'concussion', 'helmet', 'fatigue', 'biomechanics', 'impact', 'head impact', 'turf', 'rest', 'kinematics'],
        "papers": []
    },
    "10_TEAM_RATINGS_POWER_RANKINGS_SITUATIONAL_CONTEXT": {
        "desc": "Elo ratings, Bradley-Terry models, home field advantage, schedule strength, travel fatigue, weather impact, momentum, playoff simulation",
        "keywords": ['elo', 'power ranking', 'home field', 'bradley-terry', 'schedule', 'travel', 'momentum', 'playoff', 'team rating', 'rankings', 'season simulation']
    }
}

for d in domains:
    domains[d]["papers"] = []

for p in papers:
    title = p.get('title', '')
    abstract = p.get('abstract', '')
    text = (title + " " + abstract).lower()
    
    matched_domains = []
    for d_name, d_info in domains.items():
        score = 0
        for kw in d_info["keywords"]:
            if re.search(r'\b' + re.escape(kw) + r'\b', text):
                score += 1
        if score > 0:
            matched_domains.append((d_name, score))
            
    if matched_domains:
        # Sort by score and assign to top domain(s)
        matched_domains.sort(key=lambda x: x[1], reverse=True)
        top_d = matched_domains[0][0]
        p['primary_domain'] = top_d
        p['all_matched_domains'] = [m[0] for m in matched_domains]
        domains[top_d]["papers"].append(p)
    else:
        p['primary_domain'] = "10_TEAM_RATINGS_POWER_RANKINGS_SITUATIONAL_CONTEXT"
        p['all_matched_domains'] = ["10_TEAM_RATINGS_POWER_RANKINGS_SITUATIONAL_CONTEXT"]
        domains["10_TEAM_RATINGS_POWER_RANKINGS_SITUATIONAL_CONTEXT"]["papers"].append(p)

print("\n=== DOMAIN BREAKDOWN ===")
for d_name, d_info in domains.items():
    print(f"{d_name}: {len(d_info['papers'])} papers")

with open('docs/arxiv-program/research/2026-10-17/ALL_FOOTBALL_PAPERS_CATEGORIZED.json', 'w', encoding='utf-8') as f:
    json.dump(domains, f, indent=2)
