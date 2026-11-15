# Wave 2 builder: 13-game external charting cross-verification matrix + trainer feed.
# Inputs: wave2_external_metrics.json (FTN/PBP/CSV/statyx/gridiron aggregates),
#         wave2_engine_side.json (dossier stage1a tendencies, Nov 13 generation).
# All statements ASCII; windows labeled; gaps flagged, never filled with guesses.
import json, os, re, sys, collections

WT = r"C:\Users\Garrett\Sports-worktrees\hermes-sunday-watch-2026-11-15"
SCRATCH = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch"
os.chdir(WT); sys.path.insert(0, WT)
from intelligence.foundry_bridge.sovereign_to_cognitive_router_wiring import classify_text_to_family

M = json.load(open(os.path.join(SCRATCH,"wave2_external_metrics.json")))
E = json.load(open(os.path.join(SCRATCH,"wave2_engine_side.json")))
eng = {g["matchup"]: g for g in E}

ORDER = ["NE @ DET","BUF @ NYJ","CAR @ NO","HOU @ CLE","JAX @ TEN","KC @ ATL","LAR @ ARI",
         "MIA @ IND","MIN @ GB","PIT @ CIN","SEA @ LV","SF @ DAL","LAC @ BAL"]
KICK = {"NE @ DET":"08:30 CST Munich (Allianz Arena, outdoor hybrid grass)"}

def f4(x): return "n/a" if x is None else f"{x:.4f}"
def f1(x): return "n/a" if x is None else f"{x:.1f}"
def pct(x): return "n/a" if x is None else f"{100*x:.1f} pct"
def num(x):
    if x is None or x=="": return None
    try: return float(x)
    except Exception: return None

def card_key(m): return m.replace(" @ "," vs ")

COACHES = {"CLE":"Todd Monken (HC, 2026 registry)","PIT":"Mike McCarthy (HC, 2026 registry)",
           "SF":"Kyle Shanahan (HC, 2026 registry)"}

BANNED = ["JEV","Sinkhorn","Cholesky","10,000 worlds","1,750,000","22,750,000","Romano",
          "tau_hat","Optimal Transport","62-23-1","31-11","14-6","57.0%","66.0%","67.8%"]
def clean(s):
    s = s.encode("ascii","ignore").decode("ascii")
    for b in BANNED:
        s = s.replace(b, "[scrubbed]")
    return s

md = []
md.append("# Week 10 External Charting and Matchup Cross-Verification Matrix")
md.append("")
md.append("Date: 2026-11-15 (overnight watch, Wave 2). Author: Hermes, inline execution.")
md.append("Worktree: Sports-worktrees/hermes-sunday-watch-2026-11-15, branch")
md.append("feat/hermes-overnight-mind-and-munich-watch-2026-11-15.")
md.append("Engine side: data/engine/connected_workflow_dossier_*_week10.json stage1a")
md.append("(2026-11-13 generation; refresh pending Antigravity's regenerated push).")
md.append("")
md.append("## Source windows (read this before any delta)")
md.append("")
md.append("| Source | Window | Notes |")
md.append("|---|---|---|")
md.append("| Engine stage1a coaching tendencies | PROE verified identical to weeks 1-3 CSV mirror (NE -0.014225, DET 0.01749); pace/blitz/man per stage1a build | neutral script wp 0.35-0.65, early downs, EB shrink k=290 |")
md.append("| proe_early_neutral.csv / off_tendencies.csv / def_tendencies.csv | 2026 weeks 1-3 | LAR missing from 2026 rows (25 of 26 slate teams present) |")
md.append("| play_by_play_2026.parquet (local nflverse mirror) | 2026 weeks 1-7 | pass_oe is nflverse model, percentage points |")
md.append("| ftn_charting_2026.parquet joined to PBP on play_id | 2026 weeks 1-7 | 18,019 of 18,019 rows joined; box/blitz/PA/RPO/screen/no-huddle |")
md.append("| statyx man-vs-zone splits | week 10 snapshot, 2026-11-12 | player-level, roster-mapped to teams (0 unmapped) |")
md.append("| PFF yards per rush vs 8+ box | 2026-11-14 snapshot | player-level |")
md.append("| gridiron matchup cards | 2026-11-14 snapshot | 12 of 13 games; LAC @ BAL card absent |")
md.append("")
md.append("Definitional cautions: engine neutral pace uses the wp-band neutral script;")
md.append("the PBP external pace uses |score diff| <= 7, qtr <= 3, consecutive same-drive")
md.append("snaps, 0 < delta <= 45 s. Pressure-to-sack survival external is a PROXY")
md.append("(1 - sacks/(qb_hits+sacks)); qb_hits undercount true pressures, so the proxy")
md.append("UNDERSTATES survival vs the engine's charted-pressure denominator. Man/zone")
md.append("YPRR is offense-facing (statyx); engine dc_man_rate is defense-facing; they")
md.append("are complementary, not interchangeable. No Tuesday presser transcripts exist")
md.append("in this worktree: coach-speak hypotheses below are tendency-derived and")
md.append("labeled as such, never quoted.")
md.append("")

feed = []
def add_rec(game_no, matchup, situation, statement, family_hint):
    fam = classify_text_to_family(statement, domain="football")
    feed.append({
        "schema": "gse.trainer.drive_situational.v1",
        "book": "week10-external-charting-matchup-matrix-2026-11-15",
        "page": game_no,
        "kind": "crosscheck_signal",
        "family": fam,
        "situation": clean(f"{matchup} - {situation}"),
        "statement": clean(statement),
    })

summary_rows = []
for i, m in enumerate(ORDER, 1):
    g = eng.get(m)
    A, H = m.split(" @ ")
    ct = g["tendencies"] if g else {}
    ea, eh = ct.get(A, {}), ct.get(H, {})
    md.append(f"## {i}. {m}" + (f" - {KICK[m]}" if m in KICK else ""))
    md.append("")
    if not g:
        md.append("ENGINE DOSSIER MISSING - external only.")
    # engine table
    md.append("### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)")
    md.append("")
    md.append("| Metric | " + A + " | " + H + " |")
    md.append("|---|---|---|")
    for label, key, fmt in [("PROE (fraction)","proe",f4),("Neutral pace (sec)","neutral_pace_sec",f1),
        ("DC blitz rate","dc_blitz_rate",f4),("DC man rate","dc_man_rate",f4),
        ("OL pressure allowed","ol_pressure_allowed",f4),("Sack rate allowed","sack_rate_allowed",f4),
        ("PA rate","pa_rate",f4),("RPO rate","rpo_rate",f4),("Screen rate","screen_rate",f4),
        ("Motion rate","motion_rate",f4)]:
        md.append(f"| {label} | {fmt(ea.get(key))} | {fmt(eh.get(key))} |")
    surv_a = 1 - ea["sack_rate_allowed"]/ea["ol_pressure_allowed"] if ea.get("ol_pressure_allowed") else None
    surv_h = 1 - eh["sack_rate_allowed"]/eh["ol_pressure_allowed"] if eh.get("ol_pressure_allowed") else None
    md.append(f"| Pressure-to-sack survival (engine) | {f4(surv_a)} | {f4(surv_h)} |")
    md.append("")
    add_rec(i, m, "engine stage1a baseline",
        f"Engine stage1a weeks 1-3 fit: {A} PROE {f4(ea.get('proe'))}, pace {f1(ea.get('neutral_pace_sec'))} s, "
        f"blitz {f4(ea.get('dc_blitz_rate'))}, man {f4(ea.get('dc_man_rate'))}, pressure allowed {f4(ea.get('ol_pressure_allowed'))}, "
        f"sack allowed {f4(ea.get('sack_rate_allowed'))}. {H} PROE {f4(eh.get('proe'))}, pace {f1(eh.get('neutral_pace_sec'))} s, "
        f"blitz {f4(eh.get('dc_blitz_rate'))}, man {f4(eh.get('dc_man_rate'))}, pressure allowed {f4(eh.get('ol_pressure_allowed'))}, "
        f"sack allowed {f4(eh.get('sack_rate_allowed'))}.", "market")
    # external cross-check table
    md.append("### External cross-check")
    md.append("")
    md.append("| Metric | Team | Engine | External | External window | Read |")
    md.append("|---|---|---|---|---|---|")
    hyps = []
    for t, e in [(A, ea), (H, eh)]:
        opp = H if t==A else A
        eo = M["off_pbp"].get(t, {}); ed = M["def_ftn"].get(t, {}); ef = M["off_ftn_flags"].get(t, {})
        pc = M["proe_csv26"].get(t, {}); ot = M["off_tendencies_csv26"].get(t, {})
        mz = M["man_zone_week10"].get(t, {}); b8 = M["box8_week10"].get(t, {})
        # PROE
        c_proe = num(pc.get("proe")); e_proe = e.get("proe")
        pbp_poe = eo.get("proe_pass_oe_mean")
        read = "aligned" if (c_proe is not None and e_proe is not None and abs(c_proe-e_proe)<0.01) else "check"
        md.append(f"| PROE (fraction) | {t} | {f4(e_proe)} | {f4(c_proe)} (mirror) / {f1(pbp_poe)} pp (nflverse) | w1-3 / w1-7 | {read} |")
        if c_proe is not None and e_proe is not None:
            if (c_proe>0)!=(e_proe>0) and max(abs(c_proe),abs(e_proe))>0.01:
                hyps.append(f"PROE sign divergence {t}: engine {f4(e_proe)} vs weeks 1-3 mirror {f4(c_proe)} (se {pc.get('proe_se','n/a')}). Test: {t} neutral early-down pass rate vs LOYO expectation in the first half; a sustained sign flip vs the mirror invalidates the engine's script prior for this game.")
            else:
                hyps.append(f"PROE continuity {t}: engine {f4(e_proe)} vs mirror {f4(c_proe)} (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe {f1(pbp_poe)} pp is the drift witness.")
        # pace
        p_pace = eo.get("neutral_pace_sec"); e_pace = e.get("neutral_pace_sec")
        d = (p_pace - e_pace) if (p_pace is not None and e_pace is not None) else None
        md.append(f"| Neutral pace (sec) | {t} | {f1(e_pace)} | {f1(p_pace)} (n={eo.get('n_pace_samples','n/a')}) | w1-7 score-band | definitional gap {f1(d)} s |")
        if d is not None and abs(d) > 3:
            hyps.append(f"Pace gap {t}: engine wp-band pace {f1(e_pace)} s vs score-band PBP pace {f1(p_pace)} s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near {f1(p_pace)} s the engine's tempo-driven volume props are overstated.")
        # 1H pass rate (external only)
        md.append(f"| 1H pass rate | {t} | n/a (no stage1a field) | {f4(eo.get('pass_rate_1h'))} | w1-7 | external-only |")
        # survival
        p_surv = eo.get("pressure_to_sack_survival_proxy"); e_surv = surv_a if t==A else surv_h
        md.append(f"| Pressure-to-sack survival | {t} | {f4(e_surv)} | {f4(p_surv)} (proxy: sacks {eo.get('sacks','n/a')}, hits {eo.get('qb_hits','n/a')}) | w1-7 | proxy understates |")
        if p_surv is not None and e_surv is not None and abs(p_surv-e_surv) > 0.08:
            hyps.append(f"Pressure survival {t}: engine {f4(e_surv)} vs hit-based proxy {f4(p_surv)} (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: {t} sacks per dropback Sunday; above the engine's {f4(e.get('sack_rate_allowed'))} gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.")
        # blitz
        p_blitz = ed.get("blitz_rate"); e_blitz = e.get("dc_blitz_rate")
        md.append(f"| Blitz rate (defense) | {t} | {f4(e_blitz)} | {f4(p_blitz)} (FTN, n={ed.get('n_pass_charted','n/a')}) | w1-7 | {'check' if (p_blitz is not None and e_blitz is not None and abs(p_blitz-e_blitz)>0.08) else 'aligned'} |")
        if p_blitz is not None and e_blitz is not None and abs(p_blitz-e_blitz) > 0.08:
            hyps.append(f"Blitz divergence {t} defense: engine {f4(e_blitz)} (weeks 1-3) vs FTN {f4(p_blitz)} (weeks 1-7). Test: {opp} dropbacks vs {t} blitz count in the first half; the weeks 4-7 FTN window is the fresher witness.")
        # box
        md.append(f"| Box defenders (defense) | {t} | {'5.108 (JAX only in dossier report)' if t=='JAX' else ('4.985 (BAL only in dossier report)' if t=='BAL' else 'n/a (report truncated)')} | mean {f1(ed.get('mean_box_defenders'))}, heavy>=8 {pct(ed.get('heavy_box_rate_ge8'))}, light<=6 {pct(ed.get('light_box_rate_le6'))} | w1-7 FTN | external-only |")
        hb = ed.get("heavy_box_rate_ge8")
        if hb is not None and hb >= 0.08 and b8.get("players"):
            top = b8["players"][0]
            hyps.append(f"Heavy-box tendency {t} defense: {pct(hb)} of charted rushes faced 8+ box (weeks 1-7). Test: {opp} rush efficiency vs 8+ box; PFF leader {top['player']} ({top['ypr']} ypr vs 8+ box, 2026-11-14) is the swing player.")
        elif ed.get("light_box_rate_le6") is not None and ed["light_box_rate_le6"] >= 0.55:
            hyps.append(f"Light-box tendency {t} defense: {pct(ed['light_box_rate_le6'])} of charted rushes faced <=6 box (weeks 1-7). Test: {opp} early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.")
        # man/zone YPRR
        md.append(f"| Man/zone YPRR (offense) | {t} | dc_man_rate {f4(e.get('dc_man_rate'))} (defense-side) | man {f4(mz.get('yprr_man'))} (n={mz.get('man_routes',0):.0f}), zone {f4(mz.get('yprr_zone'))} (n={mz.get('zone_routes',0):.0f}) | statyx w10 | complementary |")
        ym, yz = mz.get("yprr_man"), mz.get("yprr_zone")
        if ym is not None and yz is not None and abs(ym-yz) >= 0.4 and (mz.get("man_routes",0)+mz.get("zone_routes",0)) >= 80:
            better = "man" if ym>yz else "zone"
            small = " SMALL SAMPLE: one coverage side under 60 routes; treat as directional only." if min(mz.get("man_routes",0), mz.get("zone_routes",0)) < 60 else ""
            hyps.append(f"Coverage split {t} offense: route-weighted YPRR man {f4(ym)} vs zone {f4(yz)} (statyx week 10).{small} Test: {t} target distribution vs {opp} coverage; {opp} engine man rate {f4(ct.get(opp,{}).get('dc_man_rate'))} suggests the {better} split is the exploitable side if the coverage call holds.")
        # PA/RPO/screen vs FTN
        md.append(f"| PA / RPO / screen (offense) | {t} | {f4(e.get('pa_rate'))} / {f4(e.get('rpo_rate'))} / {f4(e.get('screen_rate'))} | {f4(ef.get('play_action_rate'))} / {f4(ef.get('rpo_rate'))} / {f4(ef.get('screen_rate'))} | w1-3 / w1-7 FTN | drift check |")
        add_rec(i, m, f"{t} external charting cross-check",
            f"{t} weeks 1-7 PBP: 1H pass rate {f4(eo.get('pass_rate_1h'))}, neutral pace {f1(p_pace)} s, "
            f"nflverse pass_oe {f1(pbp_poe)} pp, survival proxy {f4(p_surv)}. FTN defense: mean box {f1(ed.get('mean_box_defenders'))}, "
            f"heavy box {pct(hb)}, blitz {f4(p_blitz)}. Statyx week 10 offense: YPRR man {f4(ym)} vs zone {f4(yz)}. "
            f"Engine weeks 1-3: PROE {f4(e_proe)}, pace {f1(e_pace)} s, blitz {f4(e_blitz)}, man {f4(e.get('dc_man_rate'))}.", "charting")
    # matchup card
    ck = card_key(m)
    card = M["matchup_cards"].get(ck)
    md.append("")
    if card:
        md.append("### Gridiron matchup card (2026-11-14 snapshot)")
        md.append("")
        md.append("| Metric | Off rank | Off value | Def allowed rank | Def allowed value |")
        md.append("|---|---|---|---|---|")
        for r in card:
            md.append(f"| {r['metric']} ({r['offense_team']}) | {r['off_rank']} | {r['off_value']} | {r['def_allowed_rank']} | {r['def_allowed_value']} |")
    else:
        md.append("### Gridiron matchup card: ABSENT for this game (12 of 13 cards landed). GAP - do not infer ranks.")
    # hypotheses
    md.append("")
    md.append("### Testable hypotheses (tendency-derived; no presser transcripts in worktree)")
    md.append("")
    coaches = [f"{t}: {COACHES[t]}" for t in (A,H) if t in COACHES]
    if coaches:
        md.append("Coach registry (2026 rows): " + "; ".join(coaches) + ".")
    else:
        md.append("Coach registry: no 2026 row for either team; hypotheses are charted-tendency derived, not coach-speak quotes.")
    md.append("")
    if not hyps:
        hyps.append(f"Volume baseline {m}: both offenses' weeks 1-7 pass rates ({f4(M['off_pbp'].get(A,{}).get('pass_rate_all'))} / {f4(M['off_pbp'].get(H,{}).get('pass_rate_all'))}) set the neutral-script expectation; test first-half pass rate against these before trusting any game-script prop.")
    for j, h in enumerate(hyps[:5], 1):
        md.append(f"H{i}.{j}. {h}")
        add_rec(i, m, f"hypothesis H{i}.{j}", h, "hypothesis")
    # gaps line
    gaps = []
    if A not in M["proe_csv26"]: gaps.append(f"{A} missing from coaching CSV 2026")
    if H not in M["proe_csv26"]: gaps.append(f"{H} missing from coaching CSV 2026")
    if not card: gaps.append("gridiron matchup card absent")
    for t in (A,H):
        mzg = M["man_zone_week10"].get(t, {})
        if (mzg.get("man_routes",0)+mzg.get("zone_routes",0)) == 0:
            gaps.append(f"{t} absent from statyx week10 man/zone splits")
    gaps.append("defense man-rate external 2026 empty in def_tendencies.csv (engine-only)")
    md.append("")
    md.append("Gaps: " + "; ".join(gaps) + ".")
    md.append("")
    summary_rows.append((m, len(hyps[:5]), "; ".join(gaps[:2])))
    add_rec(i, m, "data gaps", "External coverage gaps for this game: " + "; ".join(gaps) + ". Windows: engine w1-3, PBP/FTN w1-7, statyx/gridiron w10 snapshots.", "gaps")

md.append("## Summary")
md.append("")
md.append("| Game | Hypotheses | Primary gaps |")
md.append("|---|---|---|")
for m, n, g in summary_rows:
    md.append(f"| {m} | {n} | {g} |")
md.append("")
md.append("Companion trainer feed: brain/feeds/2026-11-15/hermes_week10_charting_signals.jsonl")
md.append(f"(schema gse.trainer.drive_situational.v1, {len(feed)} records).")
md.append("All numbers trace to the source windows above; nothing is imputed across windows.")
md.append("Stage-5 action is NOT taken from this matrix: it is research cross-verification.")
md.append("Live-market re-verify and the conjunction gate remain Wave 3's job.")

out_md = "docs/predictions/research/2026-11-15/week10-external-charting-matchup-matrix.md"
os.makedirs(os.path.dirname(out_md), exist_ok=True)
text = clean("\n".join(md)) + "\n"
open(out_md, "w", encoding="ascii", newline="\n").write(text)

out_jsonl = "brain/feeds/2026-11-15/hermes_week10_charting_signals.jsonl"
with open(out_jsonl, "w", encoding="ascii", newline="\n") as f:
    for r in feed:
        f.write(json.dumps(r, ensure_ascii=True) + "\n")

# validation
errs = []
seen = set()
for ln, line in enumerate(open(out_jsonl, encoding="ascii"), 1):
    if any(ord(c)>127 for c in line): errs.append((ln,"non_ascii"))
    r = json.loads(line)
    k = (r["book"], r["situation"])
    if k in seen: errs.append((ln,"dupe"))
    seen.add(k)
    for b in BANNED:
        if b in line: errs.append((ln,"banned:"+b))
for ln, line in enumerate(open(out_md, encoding="ascii"), 1):
    if any(ord(c)>127 for c in line): errs.append((ln,"md_non_ascii"))
    for b in BANNED:
        if b in line: errs.append((ln,"md_banned:"+b))
print("md bytes:", os.path.getsize(out_md), "feed records:", len(feed), "errors:", errs[:8], "total", len(errs))
print("families:", dict(collections.Counter(r["family"] for r in feed)))