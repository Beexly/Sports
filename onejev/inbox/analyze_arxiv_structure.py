"""Structural analysis of the arxiv-sweep fulltext corpus BEFORE extracting.

Three facts determine the extractor design, and all three are assumptions I must
verify rather than guess:

1. LINE STRUCTURE. `head -40` of one paper printed the whole document, which
   suggests each .txt is a single enormous line. A line-based scanner would
   then either swallow the entire file or reject it.
2. DUAL FORMS. Each equation appears twice: rendered Unicode ('p \u2061 ( \ud835\udc37
   ) = ...' with invisible-function-application operators) AND LaTeX source
   ('p(\\mathbf{X})=\\mathcal{L}(Y\\mid\\mathbf{X})'). The LaTeX twin is the
   canonical one; the rendered twin is spacing-corrupted.
3. EQUATION NUMBERING. Display equations carry trailing '(1)', '(12)' markers,
   which give a reliable anchor and let us count the true yield.
"""
import glob, os, random, re, statistics

FT = 'C:/Users/Garrett/_research/agent-bus/research/arxiv-sweep/fulltext'
files = sorted(glob.glob(os.path.join(FT, '*.txt')))
print('files:', len(files))

# --- 1. line structure -----------------------------------------------------
rng = random.Random(7)
smp = rng.sample(files, 40)
line_counts = []
for f in smp:
    with open(f, encoding='utf-8', errors='replace') as fh:
        lc = sum(1 for _ in fh)
    line_counts.append(lc)
print('\n1. LINE STRUCTURE (40-paper sample)')
print('   median lines/paper : %d' % statistics.median(line_counts))
print('   min / max lines    : %d / %d' % (min(line_counts), max(line_counts)))
print('   papers that are 1 line: %d of 40' % sum(1 for c in line_counts if c == 1))

# --- 2. dual forms ---------------------------------------------------------
LATEX_RUN = re.compile(r'\\[A-Za-z]{2,}')
FUNCTION_APP = '\u2061'
print('\n2. DUAL FORMS')
have_fn_app = 0
for f in smp[:12]:
    t = open(f, encoding='utf-8', errors='replace').read()
    if FUNCTION_APP in t:
        have_fn_app += 1
print('   papers containing U+2061 (invisible fn-apply): %d of 12' % have_fn_app)
for f in smp[:3]:
    t = open(f, encoding='utf-8', errors='replace').read()
    runs = LATEX_RUN.findall(t)
    print('   %-22s latex-control-runs=%d' % (os.path.basename(f)[:22], len(runs)))

# --- 3. equation numbering -------------------------------------------------
EQNUM = re.compile(r'\((\d{1,3})\)\s*(?=[A-Z(\\[ ]|$)')
print('\n3. EQUATION NUMBERING (12-paper sample)')
tot_num = []
for f in smp[:12]:
    t = open(f, encoding='utf-8', errors='replace').read()
    n = len(EQNUM.findall(t))
    tot_num.append(n)
print('   numbered display equations: median %d, max %d'
      % (statistics.median(tot_num), max(tot_num)))
print('   extrapolated to 1113 papers: ~%d'
      % int(statistics.mean(tot_num) * len(files)))

# how much of a paper is LaTeX vs prose?
print('\n4. LATEX DENSITY')
for f in smp[:3]:
    t = open(f, encoding='utf-8', errors='replace').read()
    latex_chars = sum(len(m.group(0)) for m in LATEX_RUN.finditer(t))
    print('   %-22s chars=%7d latex-runs=%5d ratio=%.1f%%'
          % (os.path.basename(f)[:22], len(t), len(LATEX_RUN.findall(t)),
             100.0 * len(LATEX_RUN.findall(t)) / max(1, len(t))))

# where does the LaTeX live -- is it always adjacent to a rendered twin?
print('\n5. SAMPLE EXTRACTABLE LATEX SEGMENT')
f = smp[0]
t = open(f, encoding='utf-8', errors='replace').read()
seg = re.search(r'[^.]{0,80}\\[A-Za-z]{2,}[^.]{0,120}', t)
print('   ' + (seg.group(0)[:200] if seg else 'none'))