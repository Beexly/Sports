# -*- coding: utf-8 -*-
"""Gate corpus-intelligence and sports equations against columns already on disk.

Writes blocked.jsonl. Does not score, mint, or touch mind.jsonl / cycle.py.
A function is recorded only when every extracted symbol is an exact column
or play-by-play field. That did not happen for this slice.
"""
import json, os, re
from collections import Counter
import pyarrow.parquet as pq

RESEARCH = r"C:\Users\Garrett\_research\ctx-2026-10-03"
OUT = r"C:\Users\Garrett\Sports-wt-engineplan\eng\mind_eq"
EQ = os.path.join(RESEARCH, "eng", "equations_stated.jsonl")

BANNED = {"h_qb_act", "a_qb_act"}
# Single-token collisions with real columns. These are not the columns.
SHORT_COLLISIONS = {
    "y", "n", "q", "w", "ep", "wp", "id", "div", "sp", "cp", "td", "fg",
    "x", "a", "b", "c", "p", "r", "s", "t", "u", "v", "k", "m", "d", "f",
    "home", "away", "team", "week", "time", "play", "total", "season",
    "result", "drive", "down", "half", "name", "pass", "rush", "wind",
    "rest", "series", "played", "success", "expected", "penalty", "neutral",
}

STOP = {
    "the","and","with","for","where","from","into","via","this","that","than",
    "then","else","when","only","over","under","between","within","without",
    "using","used","use","per","each","all","not","but","are","was","were",
    "been","being","have","has","had","its","their","there","these","those",
    "such","also","into","onto","across","after","before","above","below",
    "about","against","among","while","during","through","because","if",
    "or","of","in","on","to","as","at","by","an","be","is","it","we","no",
    "lemma","algorithm","model","models","layer","layers","loss","losses",
    "trained","training","reported","report","separate","claim","claims",
    "conclusion","count","while","subject","pointwise","formula","stated",
    "explicit","none","true","false","note","notes","see","figure","table",
    "equation","equations","paper","papers","section","appendix","proof",
    "where","given","let","define","defined","denote","denotes","respectively",
    "respectively","holds","hold","such","that","which","whose","into",
    "softmax","relu","dropout","mse","crossentropy","layernorm","clip",
    "normalize","argmax","argmin","exp","log","ln","sin","cos","max","min",
    "sum","sqrt","abs","det","inf","sup","arg","sort","median","mean","std",
    "var","prob","probability","expected","expectation","conditional",
    "continuous","discrete","initial","state","states","time","times",
    "rate","rates","value","values","weight","weights","prior","post",
    "input","inputs","output","outputs","feature","features","channel",
    "channels","sample","samples","number","numbers","size","step","steps",
    "function","functions","parameter","parameters","constant","constants",
    "vector","matrix","matrices","scalar","index","indices","element",
    "elements","set","sets","case","cases","form","forms","type","types",
    "left","right","high","low","upper","lower","positive","negative",
    "linear","nonlinear","adaptive","bin","bins","rank","forecast","forecasts",
    "interpolation","temperature","accuracy","correct","total","evaluated",
    "proposal","sampling","candidate","candidates","budget","threshold",
    "error","errors","confidence","certain","formulation","assigned",
    "drawn","until","reached","reward","search","biased","expansion",
    "acceptance","point","score","scores","draft","drafts","biserial",
    "season","bankroll","profit","payoff","remaining","running","terminal",
    "weeks","framing","state","tweet","tweets","detector","operates",
    "converted","counts","second","per","no","explicit","formula",
}

IDENT = re.compile(
    r"[A-Za-z][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*"
    r"|[θΘαβγδεζηικλμνξπρστυφχψωΑΒΓΔΕΖΗΛΜΝΞΠΣΤΥΦΧΨΩ]"
    r"(?:_?[A-Za-z0-9]+)*"
)

def load_columns():
    cols = set()
    eng = os.path.join(RESEARCH, "eng")
    for fn in os.listdir(eng):
        if fn.endswith(".parquet"):
            cols.update(pq.read_schema(os.path.join(eng, fn)).names)
    cols.update(pq.read_schema(os.path.join(RESEARCH, "pbp", "play_by_play_2024.parquet")).names)
    cols.update(pq.read_schema(os.path.join(RESEARCH, "engine_v1_features.parquet")).names)
    cols.update(pq.read_schema(os.path.join(RESEARCH, "brain", "protection_stress.parquet")).names)
    # FTN charting is on disk but is not an allowed input for a served number.
    ftn = set()
    ftn_path = os.path.join(RESEARCH, "pbp", "ftn_charting_2025.parquet")
    if os.path.exists(ftn_path):
        ftn = set(pq.read_schema(ftn_path).names)
    usable = set()
    for c in cols:
        if c in BANNED:
            continue
        if c in ftn and c not in cols - ftn:
            continue
        if len(c) < 4 or c.lower() in SHORT_COLLISIONS:
            continue
        usable.add(c)
    return usable

def symbols(statement):
    raw = IDENT.findall(statement)
    out = []
    seen = set()
    for t in raw:
        if t in seen:
            continue
        seen.add(t)
        if t.lower() in STOP:
            continue
        if len(t) < 2:
            continue
        if t.lower() in SHORT_COLLISIONS:
            continue
        out.append(t)
    return out

def is_complex(statement):
    s = statement.strip()
    if len(s) < 8:
        return False
    has_eq = "=" in s or "≈" in s
    has_op = any(ch in s for ch in "/+−-·×∑∫") or "ratio" in s.lower() or "weighted" in s.lower()
    # prose gate, not a formula
    if not has_eq and not any(ch in s for ch in "∑∫≈"):
        return False
    # identity / single token copy is not complex
    if has_eq:
        left, _, right = s.partition("=")
        if right.strip() and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", right.strip()):
            return False
    return has_eq and has_op or ("=" in s and len(symbols(s)) >= 2)

def main():
    usable = load_columns()
    rows = []
    with open(EQ, encoding="utf-8") as f:
        for i, line in enumerate(f):
            o = json.loads(line)
            sp = o["source_path"].replace("\\", "/")
            if sp.startswith("research/corpus-intelligence/") or sp.startswith("sports/"):
                rows.append((i, sp, o["statement"]))
    blocked_path = os.path.join(OUT, "blocked.jsonl")
    coded = []
    miss_counter = Counter()
    n_complex = 0
    n_prose = 0
    with open(blocked_path, "w", encoding="utf-8", newline="\n") as out:
        for i, sp, st in rows:
            syms = symbols(st)
            # Names on the left of '=' are being defined, not read from a column.
            lhs = set()
            if '=' in st:
                lhs = set(symbols(st.split('=', 1)[0]))
            inputs = [s for s in syms if s not in lhs]
            present = [s for s in inputs if s in usable]
            missing = [s for s in inputs if s not in usable]
            # RHS operands the stop-list dropped still block a code, they are not columns.
            rhs = st.split('=', 1)[1] if '=' in st else ''
            rhs_raw = IDENT.findall(rhs)
            dropped = []
            for tok in rhs_raw:
                if tok in usable or tok.lower() in STOP or tok in ('n_eff',):
                    continue
                if tok not in missing and tok not in dropped:
                    dropped.append(tok)
            short = [d for d in dropped if d not in present and len(d) < 3]
            missing = missing + [d for d in dropped if d not in present and len(d) >= 3]
            if not missing and not present and short:
                missing = short
            complex_ = is_complex(st)
            lane = "sports" if sp.startswith("sports/") else "corpus-intelligence"
            note = None
            if "EPA_no-pressure" in st or "EPA_sack" in st:
                note = "EPA_no-pressure, EPA_o, and EPA_sack are not columns. clean_epa_baseline, epa_clean, and epa_press were not substituted."
            if re.search(r"Elo[_({]", st) or "Elo " in st:
                note = "Elo subscript / Elo_O style symbol is not the elo column. Not mapped."
            if complex_ and not missing and len(present) >= 2:
                coded.append({"line": i, "source_path": sp, "statement": st, "columns": present})
                continue
            if 'n_eff' in lhs and 'f' in st and 'R(K)' in st:
                note_ne = 'Left-hand n_eff is a kernel effective-sample definition, not the engine n_eff column.'
            else:
                note_ne = None
            if not complex_:
                n_prose += 1
                reason = "not_a_complex_formula"
            else:
                n_complex += 1
                reason = "missing_columns"
                miss_counter.update(m for m in missing if len(m) >= 3 or "_" in m or "-" in m)
            rec = {
                "line": i,
                "lane": lane,
                "source_path": sp,
                "statement": st,
                "complex": complex_,
                "present_columns": present,
                "missing": missing,
                "reason": reason,
            }
            if note_ne:
                note = (note + ' ' if note else '') + note_ne
            if note:
                rec["note"] = note
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
    # functions module: empty on purpose
    fn_path = os.path.join(OUT, "functions.py")
    with open(fn_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(
            '"""Corpus-intelligence and sports equations.\n\n'
            "No function is defined. A function is added only when every symbol\n"
            "in a complex formula is already an exact column or play-by-play field.\n"
            "Short collisions (y, n, q, w, ep, wp, home, away, season, week) are not\n"
            "those columns. EPA_no-pressure is not clean_epa_baseline. An Elo\n"
            "subscript is not the elo column. h_qb_act is banned. FTN charting\n"
            "fields are not inputs. Nothing here is scored.\n"
            '"""\n\n'
            "FUNCTIONS = {}\n"
        )
    summary = {
        "slice": "corpus-intelligence and sports only",
        "equations_file": EQ,
        "owned_lines": len(rows),
        "functions_coded": len(coded),
        "complex_blocked": n_complex,
        "not_complex_recorded": n_prose,
        "blocked_file_rows": n_complex + n_prose,
        "coded": coded,
        "top_missing": miss_counter.most_common(40),
        "refused_mappings": [
            "EPA_no-pressure -> clean_epa_baseline",
            "EPA_o -> epa or epa_press",
            "EPA_sack -> sack",
            "Elo_ij / Elo_O -> elo",
        ],
        "pit_rule_unused": "no function was coded, so no home-minus-away lag was applied",
    }
    with open(os.path.join(OUT, "summary.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("owned", len(rows))
    print("coded", len(coded))
    print("complex_blocked", n_complex)
    print("not_complex", n_prose)
    print("TOP")
    for name, c in miss_counter.most_common(30):
        print(f"{c:5d} {name}")

if __name__ == "__main__":
    main()
