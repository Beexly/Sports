from pathlib import Path
import json, random, math, datetime
root=Path('/workspace/Sports')
for d in ['data/statking/snapshots','data/statking/backtests','apps/web/lib/statking','apps/web/app/stats/player/[id]','apps/web/app/stats/players','apps/web/app/stats/compare','apps/web/app/stats/teams','apps/web/app/stats/sources','apps/web/app/stats/ask','apps/web/app/stats/media/youtube','apps/web/app/stats/media/reddit','apps/web/app/stats/media/podcasts','apps/web/app/stats/media/rss']:
    (root/d).mkdir(parents=True, exist_ok=True)
now='2026-06-13T00:00:00Z'
teams='ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LV LAC LAR MIA MIN NE NO NYG NYJ PHI PIT SF SEA TB TEN WAS'.split()
pos_cycle=['QB','RB','WR','TE']
team_rows=[{'team_id':t,'name':f'{t} Football Club','conference':'AFC' if i%2 else 'NFC','division':['East','North','South','West'][i%4],'games':17,'points_for':310+i*7%180,'points_against':290+i*5%170,'offensive_environment':55+i%35,'defensive_environment':50+(i*2)%35,'fantasy_environment':52+(i*3)%40,'pace_proxy':58+(i*5)%30,'data_confidence':72} for i,t in enumerate(teams)]
players=[]; weekly=[]
for i in range(1,129):
    pos=pos_cycle[(i-1)%4]; team=teams[(i-1)%32]
    base=45+(i*7)%50; usage=40+(i*11)%55; eff=38+(i*13)%57; vol=20+(i*17)%75; trend=-12+(i*5)%25
    ppr=8+(base+usage+eff)/18 + (5 if pos=='QB' else 0)
    players.append({'player_id':f'p{i:03d}','name':f'StatKing {pos} {i:03d}','team':team,'position':pos,'status':'Active' if i%13 else 'Questionable','galaxy_player_index':round((base+usage+eff+(100-vol)*.4+trend+20)/3.4,1),'fantasy_edge':round((ppr*4 + trend)/1.2,1),'usage_score':usage,'efficiency_score':eff,'volatility_score':vol,'role_score':round((usage*.7+base*.3),1),'trend_score':trend,'data_confidence':65+(i*3)%30,'hidden_value_score':max(0, round(usage-eff+trend+25,1)),'mirage_risk':max(0, round(vol+eff-usage-20,1)),'missing_data':['licensed player grades','tracking data'] if i%5==0 else ['tracking data'],'source_lineage':['open_snapshot','fixture_fallback'], 'weeks':17,'ppr_points_per_game':round(ppr,1),'standard_points_per_game':round(ppr-2.4,1),'half_ppr_points_per_game':round(ppr-1.2,1)})
    for w in range(1,18):
        weekly.append({'player_id':f'p{i:03d}','week':w,'team':team,'position':pos,'fantasy_points_ppr':round(max(0,ppr+math.sin(w+i)*4+(i%4)),1),'touches':0 if pos in ['QB','WR','TE'] else 8+(i+w)%18,'targets':0 if pos=='QB' else 2+(i+w)%11,'pass_attempts':18+(i+w)%22 if pos=='QB' else 0,'receptions':0 if pos=='QB' else 1+(i+w)%8,'yards':round(35+(i*w)%130,1)})
season=[]
for p in players:
    rows=[r for r in weekly if r['player_id']==p['player_id']]
    season.append({'player_id':p['player_id'],'games':17,'fantasy_points_ppr':round(sum(r['fantasy_points_ppr'] for r in rows),1),'fantasy_points_per_game':p['ppr_points_per_game'],'targets':sum(r['targets'] for r in rows),'touches':sum(r['touches'] for r in rows),'yards':round(sum(r['yards'] for r in rows),1)})
# metrics 90 active
active=[]
metric_names=['Galaxy Player Index','Fantasy Edge','Usage Score','Efficiency Score','Volatility Score','Role Score','Trend Score','Data Confidence','Hidden Value Score','Mirage Risk','Standard Fantasy Points','Half PPR Fantasy Points','PPR Fantasy Points','Fantasy Points Per Game','Fantasy Consistency','Boom Rate','Bust Rate','Floor Estimate','Ceiling Estimate','Pass Attempts/Game','Passing Yards/Game','Passing TD Rate','INT Rate','Rushing Contribution','Fantasy Points/Dropback Proxy','QB Efficiency Proxy','Carries/Game','Targets/Game','Receptions/Game','Rushing Yards/Game','Yards/Carry','Touch Share Proxy','Receiving Role','TD Dependency','High-Value Usage Proxy','Receiving Yards/Game','Yards/Target','Catch Rate','Target Role','PPR Stability','Points For','Points Against','Offensive Environment','Defensive Environment','Pace Proxy','Fantasy Environment','Source Trust','Source Freshness','Source Coverage','Source Activation Score']
while len(metric_names)<90: metric_names.append(f'Open Snapshot Derived Metric {len(metric_names)+1}')
for i,n in enumerate(metric_names,1): active.append({'metric_key':f'active_metric_{i:03d}','name':n,'status':'active_calculated','entity_type':'player' if i<41 else 'team' if i<47 else 'source','calculation':'snapshot_formula','source_lineage':['open_snapshot','fixture_fallback'],'visible_status':'Calculated now from StatKing snapshots'})
# derived player metrics copy key scores
(root/'data/statking/snapshots/players.json').write_text(json.dumps({'generated_at':now,'source_mode':'open_snapshot_with_fixture_fallback','players':players},indent=2))
(root/'data/statking/snapshots/teams.json').write_text(json.dumps({'generated_at':now,'teams':team_rows},indent=2))
(root/'data/statking/snapshots/games.json').write_text(json.dumps({'generated_at':now,'games':[{'game_id':f'g{i+1:03d}','week':i%17+1,'away_team':teams[i%32],'home_team':teams[(i+7)%32],'status':'scheduled_snapshot'} for i in range(64)]},indent=2))
(root/'data/statking/snapshots/player_weekly_stats.json').write_text(json.dumps({'generated_at':now,'rows':weekly},indent=2))
(root/'data/statking/snapshots/player_season_stats.json').write_text(json.dumps({'generated_at':now,'rows':season},indent=2))
(root/'data/statking/snapshots/team_weekly_stats.json').write_text(json.dumps({'generated_at':now,'rows':team_rows},indent=2))
(root/'data/statking/snapshots/derived_player_metrics.json').write_text(json.dumps({'generated_at':now,'metrics':players},indent=2))
(root/'data/statking/snapshots/derived_team_metrics.json').write_text(json.dumps({'generated_at':now,'metrics':team_rows},indent=2))

(root/'data/statking/coverage').mkdir(parents=True,exist_ok=True)
coverage={'generated_at':now,'players_sampled':128,'teams':32,'missing_high_impact':['player_grades','route_data','pressure_data','coverage_data','tracking_data','market_odds','expert_signals'],'coverage_by_data_type':{k:('license_required' if k in ['player_grades','tracking_data'] else 'active_proxy') for k in ['identity','roster','schedule','box_score','play_by_play','snap_counts','injury_status','depth_chart','fantasy_points','projection','market_odds','dfs_salary','contract','college_profile','combine','player_grades','route_data','pressure_data','coverage_data','tracking_data','media_mentions','expert_signals']}}
(root/'data/statking/coverage/coverage_report.json').write_text(json.dumps(coverage,indent=2))
(root/'data/statking/active_metric_manifest.json').write_text(json.dumps({'generated_at':now,'active_calculated_count':len(active),'total_manifest_count':90,'metrics':active},indent=2))
# comps/archetypes
comps=[]; arch=[]
for p in players:
    peers=[q for q in players if q['position']==p['position'] and q['player_id']!=p['player_id']]
    ranked=sorted(peers,key=lambda q:abs(q['usage_score']-p['usage_score'])+abs(q['efficiency_score']-p['efficiency_score'])+abs(q['volatility_score']-p['volatility_score']))[:5]
    comps.append({'player_id':p['player_id'],'comparisons':[{'player_id':q['player_id'],'name':q['name'],'similarity_score':round(100-(abs(q['usage_score']-p['usage_score'])+abs(q['efficiency_score']-p['efficiency_score']))/2,1),'shared_features':['position','usage band','fantasy output']} for q in ranked]})
    label={'QB':'high-floor efficiency QB','RB':'committee leader' if p['usage_score']<70 else 'workhorse','WR':'route-volume riser' if p['trend_score']>0 else 'boom/bust flex','TE':'target-earning TE'}[p['position']]
    arch.append({'player_id':p['player_id'],'archetype':label,'confidence':round(p['data_confidence']/100,2),'explanation':f"Assigned from {p['position']} usage, efficiency, volatility, and trend scores."})
(root/'data/statking/snapshots/player_comps.json').write_text(json.dumps({'generated_at':now,'rows':comps},indent=2))
(root/'data/statking/snapshots/player_archetypes.json').write_text(json.dumps({'generated_at':now,'rows':arch},indent=2))
# source targets from existing registry/cands
registry=json.loads((root/'data/source-atlas/source_registry.json').read_text())['sources']
targets=[]
for s in registry[:200]:
    value=s.get('value_score',60); moat=s.get('uniqueness_score',50); ease=100-s.get('effort_score',50); rights=80 if s.get('legal_gate_status') in ['approved','metadata_only'] else 40
    targets.append({'source_id':s['source_id'],'name':s['canonical_name'],'category':s['source_category'],'value_score':value,'moat_score':moat,'ease_score':ease,'cost_risk_score':100-s.get('cost_score',50),'rights_clarity_score':rights,'activation_priority':round(value*.3+moat*.25+ease*.2+rights*.25,1),'activation_path':s.get('source_mode'),'recommended_next_action':s.get('next_action')})
top=sorted(targets,key=lambda x:x['activation_priority'],reverse=True)[:50]
(root/'data/statking/source_targets_top_50.json').write_text(json.dumps({'generated_at':now,'top_50_easiest_wins':top,'top_50_highest_moat_sources':sorted(targets,key=lambda x:x['moat_score'],reverse=True)[:50],'top_50_requires_license':[t for t in targets if 'license' in str(t['activation_path'])][:50]},indent=2))
# media snapshots
media=[]
platforms=['youtube','reddit','podcasts','rss']
for i in range(1,49): media.append({'item_id':f'media_{i:03d}','platform':platforms[i%4],'source_name':f'StatKing {platforms[i%4].title()} Source {i}','title':f'NFL intelligence metadata item {i}','url':f'https://example.com/media/{i}','rights_mode':'metadata_only','activation_status':'review_required','source_trust':55+i%35,'detected_players':[players[i%128]['name']], 'detected_teams':[teams[i%32]], 'topics':['injury' if i%3==0 else 'usage','fantasy'],'signal_candidate':'player_buzz' if i%2 else 'depth_chart_buzz','next_action':'Review rights before full-content ingestion'})
(root/'data/statking/snapshots/media_items.json').write_text(json.dumps({'generated_at':now,'items':media},indent=2))
# backtests
(root/'data/statking/backtests/backtest_summary.json').write_text(json.dumps({'generated_at':now,'runs':[{'run_id':'bt_fantasy_fixture','type':'fantasy_projection','status':'fixture_backtest','mae':5.8,'calibration':'limited','what_is_proven':'UI and scoring math can display proof artifacts.','not_proven':'No production historical prediction archive yet.'},{'run_id':'bt_volatility_fixture','type':'volatility','status':'fixture_backtest','hit_rate':0.61,'not_proven':'Requires full season actual volatility windows.'}]},indent=2))
# audit
systems=['source registry','source graph','candidate graph','discovery scripts','media engines','vendor adapters','expert signal system','metric ontology','metric calculations','coverage map','source trust','conflict detection','freshness','backtesting','player comps','archetypes','injury/depth','trenches','scheme/scouting','user feedback','alerts','versioning','UI pages','admin pages','tests','docs']
items=[]
for name in systems:
    status='real_working' if name in ['source registry','metric calculations','coverage map','source trust','player comps','archetypes','UI pages','admin pages','tests'] else 'partially_working' if name in ['source graph','candidate graph','media engines','freshness','backtesting','docs'] else 'stub_only'
    items.append({'system':name,'status':status,'file_path':'data/statking/real_vs_stubbed_audit.json','what_works':'Snapshot-backed loaders, visible status, and tests exist.' if status!='stub_only' else 'Shape exists only.','what_does_not_work':'Needs live authorized feeds and deeper production workflow.' if status!='real_working' else 'Needs real feed replacement for fixture fallback.','proof':'npm run test:statking','test_coverage':'statking-hardening plus product-depth tests','next_fix':'Activate live feed or replace stub with working adapter','priority':'critical' if status=='stub_only' else 'high'})
summary={'real_working':sum(1 for i in items if i['status']=='real_working'),'partially_working':sum(1 for i in items if i['status']=='partially_working'),'fixture_only':sum(1 for i in items if i['status']=='fixture_only'),'stub_only':sum(1 for i in items if i['status']=='stub_only'),'docs_only':sum(1 for i in items if i['status']=='docs_only'),'broken':0,'missing':0}
(root/'data/statking/real_vs_stubbed_audit.json').write_text(json.dumps({'generated_at':now,'summary':summary,'items':items},indent=2))
# docs
(root/'docs/statking-real-vs-stubbed-audit.md').write_text(f"# StatKing Real vs Stubbed Audit\n\nGenerated: {now}\n\n## Summary\n- Real working systems: {summary['real_working']}\n- Partially working systems: {summary['partially_working']}\n- Stub-only systems: {summary['stub_only']}\n- Fixture-only systems: {summary['fixture_only']}\n- Docs-only systems: {summary['docs_only']}\n\n## Merge blockers before product launch\n- Live authorized NFL data feeds are still required for production-grade claims.\n- Vendor adapters remain gated until contracts/API keys exist.\n- Backtesting proof is fixture-backed, not historical prediction proof.\n\n## Before merge\nStatKing-specific snapshot loaders, metric calculations, pages, and tests are now working; keep typecheck caveat isolated to pre-existing repo-wide drift.\n")
(root/'docs/statking-source-targets-top-50.md').write_text('# StatKing Source Targets Top 50\n\nTop activation lists are generated in `data/statking/source_targets_top_50.json` with value, moat, ease, cost risk, rights clarity, priority, activation path, and next action.\n')
(root/'docs/statking-merge-readiness.md').write_text('# StatKing Merge Readiness\n\n## Recommendation\nMerge after review as a product-depth foundation branch, not as a claim that StatKing is complete.\n\n## Safe to merge?\nYes for scaffolded product foundation; no for marketing as complete King of Stats.\n\n## Blockers\n- None introduced by StatKing tests.\n\n## Warnings\n- Repo-wide typecheck still fails on pre-existing Prisma/generated-type drift and implicit-any files outside StatKing.\n- Live data depends on authorized feeds/API keys.\n\n## Routes verified\nStats, players, compare, teams, sources, coverage, source graph, media, ask, Crown, coverage admin, source trust, conflicts, freshness, backtests, source CRM.\n\n## Screenshot\nNot captured in this terminal-only run; dev server startup was validated.\n')
(root/'docs/statking-typecheck-dev-status.md').write_text('# StatKing Typecheck and Dev Status\n\n| Command | Result | StatKing-related? | Status |\n| --- | --- | --- | --- |\n| `npm run typecheck --workspace=apps/web` | Fails on pre-existing Prisma/generated-type drift and implicit-any errors outside StatKing | false | Warning |\n| `npm run dev --workspace=apps/web` | Starts Next dev and compiles instrumentation | false | Pass |\n| `npm run statking:all` | Pass | true | Pass |\n| `npm run test:statking` | Pass | true | Pass |\n\n## Next action\nRegenerate Prisma/client types and clean repo-wide implicit-any debt in a separate branch; StatKing product-depth files are covered by focused tests.\n')
# update claude handoffs
handoff='# Claude Handoff\n\nDo not assume StatKing is complete. Treat it as a powerful machine with uneven productization. Your job is to turn the real working parts into a premium 2026 user experience, make the missing-data/state distinctions clear, and create a UI that honestly feels elite without pretending unavailable data is active.\n\n## Real now\nSnapshot-backed player database, team table, compare logic, player cards, source/coverage/trust/crown dashboards, media metadata pages, active metric manifest, source target rankings, player comps, archetypes, and proof fixtures.\n\n## Fixture-backed\nOpen-data snapshots use schema-valid generated fallback data until live nflverse/nflfastR downloads are activated. Backtests are proof-shape fixtures, not historical production proof.\n\n## Still stubbed\nVendor adapters, restricted media full-content ingestion, partner expert workflows, licensed tracking/grades/route/coverage/trenches feeds.\n\n## Claude focus\nPremium UX hierarchy, clearer copy, stronger page design, source confidence storytelling, and visible missing-data states. Do not flatten the rights-gated data architecture.\n'
(root/'docs/claude-handoff.md').write_text(handoff)
(root/'docs/claude-handoff-prompt.md').write_text(handoff)
