#!/usr/bin/env python3
"""
QA gate for the GSE Week 2 waiver wire column.
Checks: (1) every briefed stat present verbatim, (2) zero em/en dashes,
(3) zero 'sports intelligence', (4) no AI-tell phrases, (5) name spellings.
"""
import re, sys, os, json

BASE = "/var/minis/shared/gse-waiver-wire-week2"
draft = open(f"{BASE}/draft/week2-waiver-wire-draft.md").read()
html = "".join(open(f"{BASE}/graphics/{f}").read()
               for f in sorted(os.listdir(f"{BASE}/graphics")) if f.endswith(".html"))
canvas_text = re.sub(r"<[^>]+>", " ", html)          # visible-ish text
canvas_text = re.sub(r"\s+", " ", canvas_text)
draft_flat = re.sub(r"\s+", " ", draft)

# --- (1) briefed stats: every string must appear verbatim somewhere -----------
STATS = [
    "10 carries into 100 yards", "61-yard run", "Ben Johnson",
    "10 carries for 54 yards", "Kyren Williams",
    "eight carries for 24", "two catches for 44", "Kenneth Walker III",
    "out-carried Christian McCaffrey 14 to 10", "65 yards", "one catch for five",
    "17 to 11 carry edge over Jeremiyah Love", "61 yards", "two catches for nine",
    "two carries for seven yards", "five snaps", "Javonte Williams",
    "9 targets, 8 catches, 138 yards, 2 touchdowns", "Jalen Coker",
    "8 targets, 6 catches, 147 yards, 2 touchdowns", "Christian Watson",
    "8 targets, 8 catches, 78 yards, 2 touchdowns", "Isaiah Likely",
    "9 targets, 7 catches, 69 yards, 1 touchdown", "Devaughn Vele",
    "35 of 56", "410 yards, 3 touchdowns, 2 interceptions", "Tyler Shough",
    "16 of 20", "230 yards and 3 touchdowns", "54 rushing yards", "Jaxson Dart",
]
low = draft_flat.lower()
missing_stats = [s for s in STATS if s.lower() not in low]

# --- (1b) rendered card tiles must equal the briefed line exactly -------------
TILES = {
    "10-rb-monangai.html": ["10", "100", "1"],
    "11-rb-corum.html": ["10", "54"],
    "12-rb-johnson.html": ["8", "24", "2", "44"],
    "13-rb-black.html": ["14", "65", "1", "5"],
    "14-rb-allgeier.html": ["17", "61", "2", "9"],
    "15-rb-demercado.html": ["2", "7"],
}
tile_problems = []
for fn, vals in TILES.items():
    h = open(f"{BASE}/graphics/{fn}").read()
    got = re.findall(r'class="num"[^>]*>([0-9]+)<', h)
    if got != vals:
        tile_problems.append(f"{fn}: rendered {got} != {vals}")

# --- (2) dashes --------------------------------------------------------------
EM, EN = "\u2014", "\u2013"
dashes_draft = [m.start() for m in re.finditer(f"[{EM}{EN}]", draft)]
dashes_html = [m.start() for m in re.finditer(f"[{EM}{EN}]", canvas_text)]

# --- (3) banned phrase -------------------------------------------------------
BANNED = ["sports intelligence", "sports-intelligence"]
banned_hits = [b for b in BANNED if b in draft.lower() or b in canvas_text.lower()]

# --- (4) AI tells ------------------------------------------------------------
TELLS = ["delve", "dive in", "let's dive", "in the ever-evolving", "it's not just",
         "in conclusion", "game-changer", "unlock the", "elevate your",
         "testament to", "when it comes to", "at the end of the day",
         "navigate the", "plethora", "tapestry", "crucial to note",
         "as an ai", "i hope this helps", "here's the thing"]
tell_hits = [t for t in TELLS if t in draft.lower()]

# --- (5) names ---------------------------------------------------------------
NAMES = {  # surname -> full display name that must appear exactly once
    "Monangai": "Kyle Monangai", "Corum": "Blake Corum",
    "Johnson": "Emmett Johnson", "Black": "Kaelon Black",
    "Allgeier": "Tyler Allgeier", "Demercado": "Emari Demercado",
}
name_problems = []
for sur, full in NAMES.items():
    if full not in draft_flat:
        name_problems.append(f"draft missing '{full}'")
    if full.upper() not in canvas_text.upper().replace("  ", " ") and \
       full.replace(" ", "") not in canvas_text.replace(" ", ""):
        name_problems.append(f"graphics missing '{full}'")

# --- (6) style audit: opener variety + sentence rhythm -----------------------
body = draft.split("## Priority adds, in order")[1].split("## Consensus adds")[0]
paras = [p.strip() for p in body.split("\n### ") if p.strip()]
prose = [" ".join(p.split("\n")[1:]).strip() for p in paras]   # drop the heading line
first_word = [re.sub(r"[^A-Za-z]", "", q.split()[0]).lower() for q in prose if q]
sentences = [x.strip() for x in re.split(r"(?<=[.!?]) ", draft_flat) if len(x.split()) > 2]
lens = sorted(len(x.split()) for x in sentences)
openers_uniq = len(set(first_word))
print(f"6. style: paragraph first words -> {first_word}")
print(f"   unique first words    : {openers_uniq}/{len(first_word)}"
      + ("  PASS" if openers_uniq >= len(first_word) - 1 else "  REVIEW"))
print(f"   sentence words min/med/max: {lens[0]}/{lens[len(lens)//2]}/{lens[-1]}"
      + ("  PASS" if lens[-1] - lens[0] >= 20 else "  FLAT"))

# --- report ------------------------------------------------------------------
print("=" * 62)
print("QA GATE")
print("=" * 62)
print(f"1. briefed stats present : {len(STATS)-len(missing_stats)}/{len(STATS)}"
      + (f"  MISSING: {missing_stats}" if missing_stats else "  PASS"))
print(f"1b. card stat tiles      : {tile_problems if tile_problems else 'exact  PASS'}")
print(f"2. em/en dashes          : draft={len(dashes_draft)} canvas={len(dashes_html)}"
      + ("  PASS" if not dashes_draft and not dashes_html else "  FAIL"))
print(f"3. banned phrase         : {banned_hits if banned_hits else 'none  PASS'}")
print(f"4. AI-tell phrases       : {tell_hits if tell_hits else 'none  PASS'}")
print(f"5. name spellings        : {name_problems if name_problems else 'all exact  PASS'}")
print(f"   draft words: {len(draft.split())}")
print(f"   canvas files: {len([f for f in os.listdir(f'{BASE}/graphics') if f.endswith('.html')])}")
ok = not (missing_stats or tile_problems or dashes_draft or dashes_html or banned_hits
          or tell_hits or name_problems)
print("=" * 62)
print("RESULT:", "ALL CHECKS PASS" if ok else "FAILURES ABOVE")
sys.exit(0 if ok else 1)