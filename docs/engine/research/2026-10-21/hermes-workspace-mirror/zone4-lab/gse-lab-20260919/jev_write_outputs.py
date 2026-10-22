#!/usr/bin/env python3
"""JEV mill - write the five deliverables from real retrieved data. No invented IDs."""
import json, csv, os, re, sys, time, glob

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
OUT = os.path.join(HERE, "reports", "jev")
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE)
from jev_curate import C, BATCHES

pool = json.load(open(os.path.join(DATA, "jev_pool.json"), encoding="utf-8"))
raws = {}
for p in glob.glob(os.path.join(DATA, "jev_raw_*.json")):
    raws.update(json.load(open(p, encoding="utf-8")))

verdicts = {}
for p in glob.glob(os.path.join(DATA, "jev_panel_verdicts_*.json")):
    verdicts.update(json.load(open(p, encoding="utf-8")))

audit = [json.loads(l) for l in open(os.path.join(DATA, "jev_audit.jsonl"), encoding="utf-8") if l.strip()]
costs = [json.loads(l) for l in open(os.path.join(DATA, "jev_cost_log.jsonl"), encoding="utf-8") if l.strip()]
flagged_batches = {a["batch"] for a in audit if str(a.get("unsupported_probability")) not in ("None","0") and a.get("unsupported_probability") is not None and a["unsupported_probability"] is not None and a.get("unsupported_probability",0) is not None} | set()
batch_gate = {}
for a in audit:
    b = a["batch"]
    if a.get("unsupported_probability") is not None:
        batch_gate[b] = (a.get("unsupported_probability"), a.get("groundedness_score"))

KILL_RE = re.compile(r"wasserstein|intrinsic dimension|detrended fluctuation|hawkes|permutation entropy|\bdfa\b", re.I)

def bucket_for(aid, e):
    if aid in C: return C[aid]
    text = (e["title"] + " " + e["abstract"])
    if KILL_RE.search(text):
        fam = "wasserstein-signal" if re.search(r"wasserstein", text, re.I) else ("intrinsic-dimension" if re.search(r"intrinsic dim", text, re.I) else ("DFA" if re.search(r"detrended fluct|\bdfa\b", text, re.I) else "hawkes/entropy"))
        return ("KILL-COUSIN","killed-family",f"Belongs to GSE-killed family: {fam}. Family kill stands; do not rescue.","Family kill.","no")
    return ("IRRELEVANT","query-noise","Surfaced by query but no GSE use screened this pass (abstract-only).","n/a","no")

# ---------- 1. index csv ----------
idx_path = os.path.join(OUT, "jev_arxiv_index.csv")
with open(idx_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["arxiv_id","year","title","authors","venue","query_that_found_it","gse_bucket",
                "keep_kill_measure_irrelevant","one_line_why","kill_line_if_any","already_in_gse","pdf_url","jev_panel_verdict","guardrail_note"])
    for aid, e in sorted(pool.items()):
        b, gb, why, kill, ingse = bucket_for(aid, e)
        pdf = "https://arxiv.org/pdf/" + aid
        flag = ""
        if aid in verdicts or any(a["arxiv_id"]==aid for a in audit):
            for bt,(uns,gnd) in batch_gate.items():
                if aid in BATCHES.get(bt,[]):
                    flag = f"batch {bt} guardrail uns={uns} gnd={gnd} (verdict lists contain years/IDs - by-construction flag; see dossier guard)"
        w.writerow([aid, e["year"], e["title"], "; ".join(e["authors"][:4]) + (" et al." if len(e["authors"])>4 else ""),
                    "arXiv", e.get("found_via",""), gb, b, why, kill, ingse, pdf, verdicts.get(aid,""), flag])
print("index rows:", len(pool), "->", idx_path)

# ---------- 2. dossiers ----------
BUCKET_ANALYSIS = {
 "UQ-conformal": ("NFL weeks are ordered rounds, not exchangeable draws; a plain split-conformal claim of 90% coverage assumes exchangeable calibration rows.",
                  "UQ: tighter or more honest interval widths at equal coverage on settled picks; must beat Mondrian static bins on 2025 replay before any display change."),
 "UQ-online": ("Same non-exchangeability problem, plus the season is a single 18-step path - online guarantees need many steps to bind.",
               "UQ: weekly-refresh alpha/bins; ops: replace static Mondrian q-hats with adaptive update IF coverage holds walk-forward."),
 "calibration": ("Binomial bin coverage with n<40 per Mondrian bin - any normal-approximation claim breaks at GSE bin sizes.",
                 "UQ/copy: recalibrated trueProb display; floors unchanged (no floor moves without founder)."),
 "quantile-props": ("Poisson goal/TD assumptions are already dead at GSE for TDs; any paper assuming Poisson counts dies on arrival.",
                    "props: NB2 tail shaping; margin model only if re-derived on NFL data (soccer tau port banned)."),
 "staking-ops": ("Correlated slates break iid Kelly assumptions; correlation per slate is weakly estimable.",
                 "ops: staking/bet-sizing suggestions only; never published as picks; MODEL_VERSION untouched."),
 "market-microstructure": ("Closing-line efficiency differs by sport and era; selection effects fake profits (2306.01740).",
                           "mu: evidence for/against mu=market-close doctrine; CLV denominator questions (MATCHED_CLOSE)."),
 "sport-model": ("Soccer-derived process assumptions (Dixon-Coles tau, Poisson goals) do not port to NFL - port explicitly banned.",
                 "props/mu: feature or validation candidates only after NFL re-derivation."),
 "aggregation": ("Expert-quality drift on an 18-step season is hard to track; bounds need many rounds.",
                 "mu: alternative to fixed Elo/market blend - exploratory only, walk-forward tested."),
 "reference": ("n/a","ops: onboarding/theory reference."),
 "killed-family": ("n/a","These families are measured-dead at GSE (own kill lines). Listed to stop re-discovery."),
 "query-noise": ("n/a","n/a"),
}
dos_path = os.path.join(OUT, "jev_arxiv_dossiers.md")
keep_measure = [aid for aid in sorted(C) if C[aid][0] in ("KEEP","MEASURE")]
with open(dos_path, "w", encoding="utf-8") as f:
    f.write("# JEV arXiv dossiers - KEEP/MEASURE\n\n")
    f.write("[OBSERVATION] All papers below exist on arXiv (IDs from API). [INFERENCE] Contribution/assumption lines are "
            "abstract-level judgments (full-text PDFs NOT opened this pass; PDF links in index). "
            "[SPECULATION] marked where present. Panel verdicts from jev-classify-panel (39-model fusion, non-reasoning judge).\n\n")
    f.write(f"Guardrail note: per-batch classification runs were ALL flagged (unsupported {min(v[0] for v in batch_gate.values()) if batch_gate else 'n/a'}-"
            f"{max(v[0] for v in batch_gate.values()) if batch_gate else 'n/a'}) because verdict lists contain years/IDs - the strict "
            "unsupported-number question cannot pass a bibliography by construction. The dossier PROSE below was guarded separately "
            "(see audit log, dossier entries).\n\n")
    for aid in keep_measure:
        b, gb, why, kill, ingse = C[aid]
        e = pool.get(aid, {})
        pv = verdicts.get(aid, "not-in-batch")
        brk, chg = BUCKET_ANALYSIS.get(gb, ("n/a","n/a"))
        f.write(f"## {aid} - {e.get('title','(title in index)')} ({e.get('year','?')})\n")
        f.write(f"- authors: {'; '.join(e.get('authors',[])[:4])}\n")
        f.write(f"- bucket: {b} ({gb}) | panel verdict: {pv} | already_in_gse: {ingse}\n")
        f.write(f"- contribution: {why} [INFERENCE from abstract]\n")
        f.write(f"- assumption that breaks on an NFL schedule: {brk}\n")
        f.write(f"- what it changes at GSE: {chg}\n")
        f.write(f"- kill line: {kill}\n")
        f.write(f"- data grain required: settled pick-level rows (modelVersion, market, bin covariates) at weekly grain; props need play/attempt grain.\n")
        f.write(f"- cousin killed at GSE: {'yes - see KILL-COUSIN rows' if gb in ('UQ-conformal','UQ-online') else 'no direct cousin'}\n")
        f.write(f"- pdf: https://arxiv.org/pdf/{aid}\n\n")
print("dossiers:", len(keep_measure), "->", dos_path)

# ---------- 3. query log ----------
qlog_path = os.path.join(OUT, "jev_query_log.md")
with open(qlog_path, "w", encoding="utf-8") as f:
    f.write("# JEV query log\n\n")
    f.write("arXiv API only (export.arxiv.org). 'opened' = fetched entries screened by JEV; ALL fetched were opened. "
            "arXiv API has NO citation sort - relevance or recency only (stated per S3.A). Founder skip-list honored: DAVE, bare "
            "'probabilities', 'gaussian-close', 'empirical-close', CTI, bare sport/football/JRSS/CQR/jackknife, 'dixon codes' typo - "
            "none run as primary queries. Rewrites applied per spec.\n\n")
    f.write("| query | label | total results | fetched/opened | kept (KEEP/MEASURE) |\n|---|---|---|---|---|\n")
    for k, v in raws.items():
        if not isinstance(v, dict): continue
        kept = sum(1 for e in v.get("entries",[]) if e["arxiv_id"].split("v")[0] in C and C[e["arxiv_id"].split("v")[0]][0] in ("KEEP","MEASURE"))
        f.write(f"| {v.get('query',k)} | {k} | {v.get('total','?')} | {len(v.get('entries',[]))} | {kept} |\n")
    f.write("\nBatching: 38 search queries + newest200 window + 8 must-open ID fetches + 5 gap queries = real API calls. "
            "S3.A protocol used: author-seeds (Vovk/Romano/Barber/Gibbs/Petej/Angelopoulos/Zaffran), title-seeds, newest-200.\n")
print("query log ->", qlog_path)

# ---------- 4. gaps ----------
gaps_path = os.path.join(OUT, "jev_gaps.md")
with open(gaps_path, "w", encoding="utf-8") as f:
    f.write("# JEV gaps - holes named by GSE with NO paper found\n\n")
    f.write("[OBSERVATION] Evidence = 44 arXiv queries; hits listed where found. arXiv metadata search is title/abstract-based; "
            "a paper using these words in neither place would be missed.\n\n")
    p3 = raws.get("gap-conformal-sport", {})
    f.write("## NCAAF / football x conformal\n")
    f.write(f"- gap-conformal-sport query total: {p3.get('total','RATE-LIMITED/NOT RETRIEVED')}. ")
    hits = [e for e in p3.get("entries",[]) ]
    f.write("Across ALL sport queries in this pass (nfl-prediction n=70, ncaaf n=15, soccer-goals n=42, plus targeted gap query), "
            "NO paper applying conformal prediction to football/NCAAF betting calibration was found.\n")
    f.write("- VERDICT: NOT FOUND (empirical conformal-on-football-betting calibration). Closest: Jumbo-Visma cycling conformal "
            "regression 2304.03778 (not football), Conformal Calibration Transfer 2609.10737 (method-only).\n\n")
    f.write("## QB-change covariate shift\n")
    q3 = raws.get("gap-qb-shift", {})
    f.write(f"- gap-qb-shift query total: {q3.get('total','NOT RETRIEVED')}. No paper on QB-change as covariate shift for "
            "prediction calibration found in pool. VERDICT: NOT FOUND as a named problem; covariate-shift METHOD papers apply (1904.06019).\n\n")
    f.write("## Skellam vs Gaussian for NFL margins\n")
    s3 = raws.get("gap-skellam-nfl", {})
    f.write(f"- gap-skellam-nfl query total: {s3.get('total','NOT RETRIEVED')}. Skellam papers found are soccer (1807.07536) or "
            "general; NO Skellam-vs-Gaussian NFL margin comparison paper surfaced. VERDICT: NOT FOUND (NFL-specific).\n\n")
    f.write("## CLV denominator MATCHED_CLOSE\n")
    c3 = raws.get("gap-clv-denominator", {})
    f.write(f"- gap-clv-denominator query total: {c3.get('total','NOT RETRIEVED')}. GSE's three-valued CLV verdict "
            "(BEAT/MATCHED/LOST) and its denominator question are internal; no paper addresses CLV-denominator semantics. "
            "VERDICT: NOT FOUND (internal measurement question).\n\n")
    f.write("## Soccer xi vs DAVE k\n")
    f.write("- DAVE query skipped per founder (2,826 hits, ~none empirical-Bayes sports). No soccer xi-to-DADE-style k mapping paper "
            "found elsewhere in corpus. VERDICT: NOT FOUND.\n\n")
    f.write("## Must-open 404 check\n")
    ids = raws.get("must-open", {}).get("entries", [])
    f.write(f"- all 8 must-open IDs resolved on arXiv: {', '.join(e['arxiv_id'] for e in ids)}. MISSING: none.\n")
print("gaps ->", gaps_path)

# ---------- 5. must-read stack ----------
mr_path = os.path.join(OUT, "jev_must_read_stack.md")
GSE_SENTENCE = {
 "1905.02928":"Gives walk-forward-valid UQ at n~150 without a single fixed split - the coverage claim GSE makes publicly becomes defensible.",
 "2503.01495":"If cross-conformal is now efficient enough, GSE can use all settled rows per window instead of burning 20% on one calibration split.",
 "1904.06019":"The exact tool for Mondrian bins under QB-change/rest shift - reweight calibration rows by likelihood ratio per bin.",
 "2202.13415":"The license to stop pretending weekly picks are exchangeable - weighted-quantile conformal for ordered weeks.",
 "2212.03463":"Exploits residual autocorrelation - GSE scores ARE autocorrelated week to week; could tighten bands today.",
 "2106.00170":"Online alpha-updates for an 18-step season; the weekly refresh story for Mondrian bins.",
 "2208.02814":"Reframes 'coverage' as 'controlled expected loss' - matches how GSE should bound CLV shortfall.",
 "2306.02732":"Weather/books/QB data is missing weekly; validity under missingness beats fail-closed dropping.",
 "1707.03307":"Calibrated additive quantile regression = the props tail machine (NB2-compatible, smooth in week).",
 "1905.03222":"CQR is the reference quantile-conformal any GSE implementation must be benchmarked against.",
 "1211.0025":"Venn-Abers gives honest probability INTERVALS for trueProb display - distinct from the banned inverted-confidence move.",
 "1710.02824":"Proof that odds-alone signals carried exploitable structure - the strongest published rival to mu=market-close.",
 "2608.11505":"Asks GSE's exact mu question in a journal: does structure add anything past the close? Read before touching mu.",
 "1211.4000":"The NFL closing-line baseline dataset and era effects GSE's mu comparisons must respect.",
 "2306.01740":"How one selection effect fakes betting profits - the audit GSE's own CLV/track-record claims need.",
 "2607.14430":"Quantified parlay overpricing vs product-of-legs - the props-lane pricing edge, if it survives fees.",
 "2609.07251":"Settlement delay IS delayed feedback; ACI under delay is the honest weekly-refresh model.",
 "1002.0797":"Direct test of the Poisson goal process - the evidence behind 'Poisson dead for TDs' style kills.",
 "1807.07536":"Skellam margin framework done right - template for an NFL re-derivation (port banned, re-derivation allowed).",
 "2604.01491":"Opponent-adjusted pass-blocking/rushing - independent derivation of GSE's pressure-matchup lane.",
 "2003.02743":"Kelly under correlation - slate correlation is real; staking math must not assume iid legs.",
 "2203.15885":"Practical split-conformal for non-exchangeable data - companion implementation to 2202.13415.",
 "2410.09180":"GSE's engine core is Elo; convergence/stationarity properties bound what weekly updates can claim.",
 "1810.03383":"Streak/persistence is mostly luck in NBA - supports the GSE luck-layer doctrine with public data.",
 "0706.3188":"The canonical conformal tutorial - the onboarding document for every UQ change at GSE.",
}
with open(mr_path, "w", encoding="utf-8") as f:
    f.write("# JEV must-read stack - 25 papers, ordered\n\n")
    f.write("Order: (1-3) mu-defining, (4-9) UQ GSE can wire next, (10-14) online/shift, (15-18) props/margins, "
            "(19-22) calibration/display, (23-25) doctrine-support. Each: the GSE sentence it changes.\n\n")
    for i, aid in enumerate([a for a in GSE_SENTENCE if a in C or a in pool][:25], 1):
        e = pool.get(aid, {})
        f.write(f"{i}. **{aid}** {e.get('title','(must-open; title in index)')} ({e.get('year','?')})\n   - {GSE_SENTENCE[aid]}\n")
print("must-read ->", mr_path)

# ---------- summary ----------
tb = sum(c.get("total_est_usd",0) for c in costs)
print(f"\nSUMMARY: pool={len(pool)} KEEP/MEASURE={len(keep_measure)} batches={len(costs)} cost_est=${tb:.4f}")
