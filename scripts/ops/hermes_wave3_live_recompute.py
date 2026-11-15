# Wave 3: Stage-5 live-market recompute + pre-Munich inactives/prop delta doc.
# Holds Nov-13 post-sim probabilities fixed; swaps in live SBR two-sided prices.
# Exact gate math from scripts/ops/gse_connected_game_workflow.py:
#   devig = implied/overround; edge = sim - devig; PLAY iff edge>=0.035 and
#   wilson_lb(sim,10000,z=1.6449) > devig and conf>=65; conf=clamp(50+120*edge,51,72).
# Line moved vs template -> PASS with LINE_MOVED_RESIM_REQUIRED (never force action).
# publishAllowed stays false board-wide: this is a gate watch, not a publication.
import json, os, re, math, glob, datetime, statistics

WT = r"C:\Users\Garrett\Sports-worktrees\hermes-sunday-watch-2026-11-15"
SCRATCH = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch"
W3 = os.path.join(SCRATCH, "wave3")
os.chdir(WT)

Z = 1.6448536269514722
N_SIMS = 10000
def wilson_lb(p, n=N_SIMS, z=Z):
    if n <= 0: return 0.0
    z2 = z*z; denom = 1 + z2/n
    center = p + z2/(2*n)
    margin = z*math.sqrt((p*(1-p) + z2/(4*n))/n)
    return max(0.0, (center-margin)/denom)
def implied(o):
    o = float(o)
    return (-o)/((-o)+100.0) if o < 0 else 100.0/(o+100.0)
def devig(a, b):
    pa, pb = implied(a), implied(b)
    s = pa+pb
    return pa/s, pb/s, s-1.0

def f4(x): return "n/a" if x is None else f"{x:.4f}"
def f1(x): return "n/a" if x is None else f"{x:.1f}"

snap_path = os.path.join(W3, "latest.json")
if not os.path.exists(snap_path):
    snaps = sorted(glob.glob(os.path.join(W3, "snap_*.json")))
    snap_path = snaps[-1] if snaps else None
snap = json.load(open(snap_path, encoding="utf-8")) if snap_path else {"ts_utc":"none","sbr_spread":[],"sbr_total":[],"sbr_ml":[],"espn":[],"munich_summary":None,"errors":["no snapshot"]}

BOOK_PREF = ["draftkings", "fanduel", "betmgm", "caesars", "bet365", "bet_rivers_co", "fanatics", "hardrock"]
def live_row(field, matchup, market):
    rows = [r for r in snap.get(field, []) if r["matchup"] == matchup and r["market"] == market]
    if not rows: return None, 0
    by_book = {r["book"]: r for r in rows}
    for b in BOOK_PREF:
        if b in by_book: return by_book[b], len(rows)
    return rows[0], len(rows)

ORDER = ["NE @ DET","BUF @ NYJ","CAR @ NO","HOU @ CLE","JAX @ TEN","KC @ ATL","LAR @ ARI",
         "MIA @ IND","MIN @ GB","PIT @ CIN","SEA @ LV","SF @ DAL","LAC @ BAL"]
WATCH_PLAYERS = ["Eli Raridon","Mack Hollins","Amon-Ra St. Brown","Jahmyr Gibbs","Sam LaPorta","Drake Maye","Jared Goff"]

results = []
for m in ORDER:
    fp = f"data/engine/connected_workflow_dossier_{m.split(' @ ')[0].lower()}_{m.split(' @ ')[1].lower()}_week10.json"
    if not os.path.exists(fp):
        results.append({"matchup": m, "error": "dossier missing"}); continue
    d = json.load(open(fp, encoding="utf-8"))
    s5 = d.get("stage5_360_conjunction_gate", {})
    tickets = s5.get("game_line_evaluations", [])
    A, H = m.split(" @ ")
    sp, n_sp = live_row("sbr_spread", m, "spread")
    tot, n_tot = live_row("sbr_total", m, "total")
    ml, n_ml = live_row("sbr_ml", m, "moneyline")
    sp_c = (sp or {}).get("current") or {}; tot_c = (tot or {}).get("current") or {}; ml_c = (ml or {}).get("current") or {}
    sp_o = (sp or {}).get("opening") or {}; tot_o = (tot or {}).get("opening") or {}; ml_o = (ml or {}).get("opening") or {}
    evals = []
    # A sim prob is world-specific: if any spread/total line moved vs the template,
    # the ML sim prob is equally stale. Detect first, downgrade ML clears after.
    line_moved_game = False
    for t in tickets:
        if t["market"] == "Spread":
            mt = re.match(r"([A-Z]+) ([+-][\d.]+)", t["selection"])
            team, line = mt.group(1), float(mt.group(2))
            if sp_c:
                lv = float(sp_c["awaySpread"]) if team == A else float(sp_c["homeSpread"])
                if abs(lv - line) > 1e-9: line_moved_game = True
        elif t["market"] == "Total":
            tl = float(t["selection"].split()[1])
            if tot_c and abs(float(tot_c["total"]) - tl) > 1e-9: line_moved_game = True
    for t in tickets:
        mkt, sel, sim_p = t["market"], t["selection"], float(t["post_sim_prob"])
        tmpl_odds = t["american_odds"]
        row = {"market": mkt, "selection": sel, "template_odds": tmpl_odds,
               "post_sim_prob": sim_p, "template_devig": t["market_prob_devig"],
               "template_decision": t["decision"]}
        live_odds = None; live_line = None; tmpl_line = None; side = None
        if mkt == "Spread":
            mt = re.match(r"([A-Z]+) ([+-][\d.]+)", sel)
            team, line = mt.group(1), float(mt.group(2))
            tmpl_line = line
            if sp_c:
                live_line = float(sp_c["awaySpread"]) if team == A else float(sp_c["homeSpread"])
                live_odds = sp_c["awayOdds"] if team == A else sp_c["homeOdds"]
                other_odds = sp_c["homeOdds"] if team == A else sp_c["awayOdds"]
        elif mkt == "Total":
            tmpl_line = float(sel.split()[1])
            if tot_c:
                live_line = float(tot_c["total"])
                live_odds = tot_c["overOdds"] if sel.startswith("Over") else tot_c["underOdds"]
                other_odds = tot_c["underOdds"] if sel.startswith("Over") else tot_c["overOdds"]
        else:  # Moneyline
            team = sel.split()[0]
            if ml_c:
                live_odds = ml_c["awayOdds"] if team == A else ml_c["homeOdds"]
                other_odds = ml_c["homeOdds"] if team == A else ml_c["awayOdds"]
        row["live_line"] = live_line; row["template_line"] = tmpl_line; row["live_odds"] = live_odds
        if live_odds is None:
            row.update({"decision": "PASS", "gate_reason": "NO_LIVE_TWO_SIDED_PRICE", "live_devig": None, "net_edge": None})
        elif tmpl_line is not None and live_line is not None and abs(live_line - tmpl_line) > 1e-9:
            row.update({"decision": "PASS", "gate_reason": f"LINE_MOVED_RESIM_REQUIRED: template {tmpl_line} live {live_line}; Nov-13 sim prob is line-specific",
                        "live_devig": None, "net_edge": None})
        else:
            p_sel, p_other, hold = devig(live_odds, other_odds)
            edge = sim_p - p_sel
            wlb = wilson_lb(sim_p)
            conf = min(72, max(51, int(round(50 + edge*120))))
            is_jax_bal = (m == "JAX @ BAL")  # exact generator rule; no such game on this slate
            clears = (not is_jax_bal) and edge >= 0.035 and wlb > p_sel and conf >= 65
            if clears and mkt == "Moneyline" and line_moved_game:
                row.update({"live_devig": round(p_sel,4), "hold": round(hold,4), "net_edge": round(edge,4),
                            "wilson_lower_90": round(wlb,4), "confidence_score": f"{conf}/100",
                            "decision": "PASS",
                            "gate_reason": f"STALE_SIM_LINE_MOVED: ML sim prob {sim_p:.4f} is from the template-line world; game spread/total moved vs template, so this numerical clear is an artifact, not an edge"})
            else:
                row.update({"live_devig": round(p_sel,4), "hold": round(hold,4), "net_edge": round(edge,4),
                            "wilson_lower_90": round(wlb,4), "confidence_score": f"{conf}/100",
                            "decision": "PLAY-NUMERICALLY (full-engine re-run required before any action)" if clears else "PASS",
                            "gate_reason": "CLEARED_NUMERICALLY_ON_LIVE_PRICE" if clears else
                                f"LIVE_GATE: edge {edge:.4f} vs 0.035, wilson {wlb:.4f} vs devig {p_sel:.4f}, conf {conf}/100 vs 65/100"})
        evals.append(row)
    # template-approved plays (Nov-13 board) and their live-market fate
    tmpl_approved = []
    for t in tickets:
        if t.get("decision") != "PLAY": continue
        ev = next((e for e in evals if e["selection"] == t["selection"]), None)
        if ev is None:
            fate = "NOT_REEVALUATED"
        elif "LINE_MOVED" in ev["gate_reason"]:
            fate = "INVALIDATED_LINE_MOVED (template benchmark, not a live quote)"
        elif ev["gate_reason"] == "NO_LIVE_TWO_SIDED_PRICE":
            fate = "INVALIDATED_NO_LIVE_PRICE"
        elif "STALE_SIM" in ev["gate_reason"]:
            fate = "INVALIDATED_STALE_SIM"
        elif ev["decision"].startswith("PLAY"):
            fate = "NUMERICALLY_CLEARS_ON_LIVE (full-engine re-run required)"
        else:
            fate = "INVALIDATED_LIVE_GATE (edge/wilson/conf fails on live price)"
        tmpl_approved.append({"selection": t["selection"], "template_odds": t["american_odds"],
                              "template_edge": t["net_edge"], "template_conf": t["confidence_score"], "live_fate": fate})
    # open->current move summary
    moves = {}
    if sp_c and sp_o and sp_c.get("homeSpread") is not None and sp_o.get("homeSpread") is not None:
        moves["spread_home"] = {"open": sp_o["homeSpread"], "current": sp_c["homeSpread"], "delta": round(sp_c["homeSpread"]-sp_o["homeSpread"],2)}
    if tot_c and tot_o and tot_c.get("total") is not None and tot_o.get("total") is not None:
        moves["total"] = {"open": tot_o["total"], "current": tot_c["total"], "delta": round(tot_c["total"]-tot_o["total"],2)}
    if ml_c and ml_o and ml_c.get("homeOdds") is not None and ml_o.get("homeOdds") is not None:
        moves["ml_home"] = {"open": ml_o["homeOdds"], "current": ml_c["homeOdds"], "delta": ml_c["homeOdds"]-ml_o["homeOdds"]}
    results.append({"matchup": m, "books_spread": n_sp, "books_total": n_tot, "books_ml": n_ml,
                    "book_used_spread": (sp or {}).get("book"), "book_used_total": (tot or {}).get("book"),
                    "book_used_ml": (ml or {}).get("book"),
                    "template_circuit_breaker": s5.get("circuit_breaker_status"),
                    "template_publish_allowed": s5.get("publishAllowed"),
                    "template_props_two_sided": s5.get("board_summary",{}).get("props_with_two_sided_prices"),
                    "template_approved_plays": tmpl_approved,
                    "evaluations": evals, "open_to_current": moves})

# ---- inactives ----
inact = {"captured": False, "note": "Munich summary not yet captured (inactives window opens ~07:00 CST / 13:00 UTC).", "players": {}}
ms = snap.get("munich_summary")
if ms:
    inj = ms.get("injuries") or []
    inact["captured"] = True
    inact["note"] = "ESPN summary injuries block captured; official inactives are the team-issued list 90 min pre-kick."
    for team_block in inj:
        tname = (team_block.get("team") or {}).get("abbreviation") if isinstance(team_block.get("team"), dict) else team_block.get("team")
        for i in team_block.get("injuries", []):
            nm = i.get("athlete", {}).get("displayName") if isinstance(i.get("athlete"), dict) else i.get("player")
            st = i.get("status")
            if nm: inact["players"][nm] = {"team": tname, "status": st}
    for p in WATCH_PLAYERS:
        if p not in inact["players"]:
            inact["players"][p] = {"team": "NE" if p in ("Eli Raridon","Mack Hollins","Drake Maye") else "DET", "status": "NOT_LISTED (no injury designation in ESPN block)"}

# ---- DFS file presence ----
dfs_path = "data/dfs/week10_munich_ne_det_dk_upload.csv"
dfs_exists = os.path.exists(dfs_path)

out = {"generated_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
       "snapshot_ts": snap.get("ts_utc"), "snapshot_errors": snap.get("errors", []),
       "dk_status": "403 Access Denied (IP reputation) - propBets polling unavailable from this host; SBR 8-book two-sided game lines used instead",
       "prop_status": "SBR carries game lines only; props remain 0 two-sided prices -> prop circuit breaker continues",
       "games": results, "inactives": inact, "dfs_munich_file_present": dfs_exists}
json.dump(out, open(os.path.join(SCRATCH, "wave3_delta.json"), "w"), indent=1)

# ---- markdown ----
md = []
md.append("# Sunday Pre-Munich Live Inactives and Prop Delta (2026-11-15)")
md.append("")
md.append(f"Generated: {out['generated_utc']} | Market snapshot: {snap.get('ts_utc')}")
md.append("Author: Hermes overnight watch, Wave 3. Worktree branch feat/hermes-overnight-mind-and-munich-watch-2026-11-15.")
md.append("")
md.append("## Method and discipline")
md.append("")
md.append("- Live two-sided game lines: SportsbookReview public pages (spread, totals/full-game,")
md.append("  money-line/full-game), 8 books incl. draftkings and fanduel. Book preference:")
md.append("  draftkings > fanduel > betmgm > caesars > bet365 > rivers > fanatics > hardrock.")
md.append("- DraftKings propBets API: 403 Access Denied from this host (IP reputation). Recorded")
md.append("  as BLOCKED, not empty. No paid quota used; Odds API untouched.")
md.append("- Stage-5 recompute holds the Nov-13 post-sim probabilities FIXED and swaps in live")
md.append("  prices. Exact gate: devig = implied/overround; edge = sim - devig; PLAY requires")
md.append("  edge >= 0.035 AND 90 pct Wilson LB (n=10000) > devig AND confidence >= 65/100;")
md.append("  confidence = clamp(50 + 120*edge, 51, 72). Any line moved vs the template is PASS")
md.append("  with LINE_MOVED_RESIM_REQUIRED: a sim prob is line-specific and is never reused")
md.append("  across lines. No fake CLV floors, no forced action.")
md.append("- publishAllowed remains FALSE board-wide. This document is a gate watch. Any")
md.append("  numerical clear still requires the full 5-stage engine + full-game simulation")
md.append("  re-run before publication or action.")
md.append("- Props: no free two-sided prop source reachable (DK blocked; SBR game lines only).")
md.append("  props_with_two_sided_prices stays 0; the prop circuit breaker continues.")
md.append("")
md.append("## NE @ DET Munich gate (08:30 CST, FC Bayern Munich Stadium / Allianz Arena)")
md.append("")
ne = next((g for g in results if g["matchup"]=="NE @ DET"), None)
if ne:
    md.append(f"Books seen: spread {ne['books_spread']}, total {ne['books_total']}, ML {ne['books_ml']}.")
    md.append("")
    md.append("| Ticket | Template line/odds | Live line/odds | Sim prob | Live devig | Edge | Wilson LB | Conf | Decision |")
    md.append("|---|---|---|---|---|---|---|---|---|")
    for e in ne["evaluations"]:
        tl = f"{e['template_line']} / {e['template_odds']}" if e['template_line'] is not None else f"ML / {e['template_odds']}"
        ll = f"{e['live_line']} / {e['live_odds']}" if e['live_line'] is not None else (f"ML / {e['live_odds']}" if e['live_odds'] is not None else "n/a")
        md.append(f"| {e['selection']} | {tl} | {ll} | {f4(e['post_sim_prob'])} | {f4(e.get('live_devig'))} | {f4(e.get('net_edge'))} | {f4(e.get('wilson_lower_90'))} | {e.get('confidence_score','n/a')} | {e['decision']} |")
    md.append("")
    for e in ne["evaluations"]:
        md.append(f"- {e['selection']}: {e['gate_reason']}")
    md.append("")
    if ne["open_to_current"]:
        md.append("Open -> current (book used): " + json.dumps(ne["open_to_current"]))
md.append("")
md.append("### Inactives watch (07:00 CST gate)")
md.append("")
md.append(inact["note"])
md.append("")
md.append("| Player | Team | Status |")
md.append("|---|---|---|")
for p in WATCH_PLAYERS:
    v = inact["players"].get(p, {})
    md.append(f"| {p} | {v.get('team','n/a')} | {v.get('status','NOT_CAPTURED')} |")
md.append("")
starter_out = [p for p,v in inact["players"].items() if str(v.get("status","")).upper() in ("OUT","DOUBTFUL","IR") and p in WATCH_PLAYERS]
if starter_out:
    md.append("STARTER RISK: " + ", ".join(starter_out) + " - Munich DFS upload requires inactive swap review before lock.")
else:
    md.append("No watch-list starter flagged OUT/DOUBTFUL in the captured block (or block not yet captured).")
md.append(f"Munich DFS upload file (data/dfs/week10_munich_ne_det_dk_upload.csv): {'PRESENT' if dfs_exists else 'NOT YET LANDED (Antigravity push pending)'}.")
md.append("")
md.append("## Full 13-game live delta")
md.append("")
for g in results:
    if "error" in g:
        md.append(f"### {g['matchup']}: {g['error']}"); continue
    md.append(f"### {g['matchup']}")
    md.append("")
    md.append(f"Template circuit breaker: {g['template_circuit_breaker']} | template publishAllowed: {g['template_publish_allowed']} | props two-sided: {g['template_props_two_sided']} | books sp/tot/ml: {g['books_spread']}/{g['books_total']}/{g['books_ml']}")
    if g["template_approved_plays"]:
        md.append("")
        md.append("Overnight template-approved plays and their live-market fate:")
        md.append("")
        md.append("| selection | template odds | template edge | template conf | live fate |")
        md.append("|---|---|---|---|---|")
        for ta in g["template_approved_plays"]:
            md.append(f"| {ta['selection']} | {ta['template_odds']} | {ta['template_edge']} | {ta['template_conf']} | {ta['live_fate']} |")
    if g["open_to_current"]:
        md.append("Open -> current: " + json.dumps(g["open_to_current"]))
    md.append("")
    md.append("| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |")
    md.append("|---|---|---|---|---|---|---|---|")
    for e in g["evaluations"]:
        ll = f"{e['live_line']} / {e['live_odds']}" if e['live_line'] is not None else (f"ML / {e['live_odds']}" if e['live_odds'] is not None else "n/a")
        md.append(f"| {e['selection']} | {ll} | {f4(e['post_sim_prob'])} | {f4(e.get('live_devig'))} | {f4(e.get('net_edge'))} | {f4(e.get('wilson_lower_90'))} | {e.get('confidence_score','n/a')} | {e['decision']} |")
    md.append("")
    moved = [e for e in g["evaluations"] if "LINE_MOVED" in e["gate_reason"]]
    noprice = [e for e in g["evaluations"] if e["gate_reason"]=="NO_LIVE_TWO_SIDED_PRICE"]
    if moved: md.append("Line moved vs template (resim required): " + ", ".join(e["selection"] for e in moved) + ".")
    if noprice: md.append("No live two-sided price: " + ", ".join(e["selection"] for e in noprice) + ".")
    md.append("")
md.append("## Board verdict")
md.append("")
n_clear = sum(1 for g in results if "evaluations" in g for e in g["evaluations"] if e["decision"].startswith("PLAY"))
n_tmpl = sum(len(g.get("template_approved_plays",[])) for g in results)
n_tmpl_invalid = sum(1 for g in results for ta in g.get("template_approved_plays",[]) if ta["live_fate"].startswith("INVALIDATED"))
n_tmpl_games = sum(1 for g in results if g.get("template_approved_plays"))
n_halt = sum(1 for g in results if g.get("template_publish_allowed") is False)
md.append(f"- Overnight template board: {n_tmpl} approved plays across {n_tmpl_games} games, ALL priced against generic template benchmarks (+2.5/-2.5, 44.5, +120/-142), with 0 two-sided prop prices board-wide; {n_halt} games circuit-breaker halted (publishAllowed False).")
md.append(f"- Live re-verification invalidates {n_tmpl_invalid}/{n_tmpl} of those template approvals (lines moved or prices absent). They were never live-market plays; none may be published.")
md.append(f"- Numerical gate clears on live prices (full-engine re-run still required): {n_clear}. Moneyline clears on line-moved games are downgraded to PASS (STALE_SIM_LINE_MOVED): a moved line invalidates the sim win probability the ML edge would be measured against.")
md.append("- publishAllowed: FALSE for this watch output. Prop circuit breaker: CONTINUES (0 two-sided prop prices).")
md.append("- Game-line template fallback is replaced by live SBR two-sided prices for evaluation,")
md.append("  but no pick is published or suggested from this watch. PASS is the default; zero fake CLV floors.")
md.append("")
md.append("Snapshot errors: " + ("; ".join(snap.get("errors", [])) or "none"))

text = "\n".join(md) + "\n"
text = text.encode("ascii", "ignore").decode("ascii")
BANNED = ["JEV","Sinkhorn","Cholesky","10,000 worlds","1,750,000","22,750,000","Romano","tau_hat","Optimal Transport","62-23-1","31-11","14-6","57.0%","66.0%","67.8%"]
for b in BANNED: text = text.replace(b, "[scrubbed]")
outmd = "docs/predictions/research/2026-11-15/sunday-pre-munich-live-inactives-and-prop-delta.md"
os.makedirs(os.path.dirname(outmd), exist_ok=True)
open(outmd, "w", encoding="ascii", newline="\n").write(text)
print("delta doc:", outmd, os.path.getsize(outmd), "bytes")
print("games:", len(results), "numerical clears:", n_clear)
print("inactives captured:", inact["captured"], "| dfs file:", dfs_exists)
for g in results[:1]:
    for e in g["evaluations"]: print(" ", e["selection"], e["decision"], e.get("net_edge"))