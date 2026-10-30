import re
text = open(r'C:\Users\Garrett\Downloads\numpybook_extracted.txt', encoding='utf-8').read()
outfile = r'C:\Users\Garrett\Downloads\numpybook_contexts.txt'
open(outfile, 'w').close()

def context(term, chars=500):
    with open(outfile, 'a', encoding='utf-8') as f:
        for m in re.finditer(re.escape(term), text, re.IGNORECASE):
            s = max(0, m.start()-chars)
            e = min(len(text), m.end()+chars)
            f.write(f'===== {term} @ {m.start()} =====\n')
            f.write(text[s:e])
            f.write('\n\n')

for term in ['Kaiser', 'bessel', 'vonmises', 'unwrap', 'noncentral', 'gumbel', 'weibull', 'hypergeometric', 'piecewise', 'searchsorted', 'bincount', 'tensorsolve', 'tensorinv', 'tensordot', 'ogrid', 'subdtype', 'getfield', 'expm1', 'log1p', 'setbufsize', 'cov']:
    context(term, 500)
print('Done writing contexts')
