# THE MISSING TEST: a negative control built from KNOWN junk.
#
# WHY THIS FILE EXISTS
# For the whole session the gate had 22 positive cases -- inputs I already knew
# about, all passing. That proves the gate accepts what I expect. It proves
# NOTHING about what it accepts that I did not expect.
#
# The cost of that gap was paid twice:
#   * I reported "62,412 equations" from two corpora that a delegated audit then
#     measured at 14 real equations (99.98% leakage: tracking URLs, mojibake, CSS)
#   * my own 400-doc sweep reported "1,117 equations" whose samples were
#     aria-live="polite", priced=true, has >=3 prior games
#
# Neither was caught by a check. Both were caught by a person reading samples.
#
# This control is built from junk I have ALREADY SEEN IN THE WILD. Every one of
# these strings passed some gate during this session. If any of them is reported
# EQUATION, the gate is broken and no corpus number produced with it is real.

import os
import sys

INBOX = r"C:\Users\Garrett\onejev\inbox"
sys.path.insert(0, INBOX)
from eq_recover_ineq import recover

# (string, note) -- every entry was ACCEPTED by some gate during this session.
NEGATIVES = [
    # HTML / JSX attributes, admitted because they contain '='
    ('aria-live="polite"', "HTML attr"),
    ('className="bg-[var(--eclipse)] border" />', "JSX"),
    ('entityId=&asOf=', "query string"),
    ('pick={pick} />', "JSX prop"),
    ('style={{ backgroundColor: #11161F }} />', "JSX style"),
    ('priced=true', "kebab boolean attr"),
    ('has >=3 prior games', "prose with >="),
    # scraped marketing
    ('[Start a trial100%](https://account.similarweb.com/journey/registration?action=finddisplayads&domain=sco',
     "marketing CTA"),
    ('src="https://www.facebook.com/tr?id=325713081891320&ev=PageView&noscript=1', "tracking pixel"),
    ('![adfox](http://x.com/getCode?p1=cvzcs&p2=frfe)', "ad tracker"),
    ('Diversity & inclusion](https://www.glassdoor.com/Reviews/FantasyPros-Reviews-E4309998.htm?filter.searchC',
     "review scraper"),
    # config / flags
    ('canonicalHistoryStatus=GREEN', "status flag"),
    ('CLAUDE_PROVIDER=bedrock + AWS + BEDROCK_MODEL_MAP', "env config"),
    ('double_build_risk=HIGH', "config flag"),
    ('MARKET_DEPTH_COMPONENT_MAX = 20 (', "component constant"),
    ('type BrainAnswer = {', "TS alias"),
    ('const Q = 1', "code"),
    # CSS
    ('.jpeetO:hover .card { color: rgb(9,10,11); }', "CSS"),
    ('* { margin: 0; padding: 0; box-sizing: border-box; }', "CSS reset"),
    # prose that merely contains '=' or a comparison
    ('scoring 4+3+2+1=10 points', "points scoring"),
    ('Graduate STUDENTS 35 25 40', "table row"),
    ('the engine adds real signal over persistence OOS', "prose"),
    # truncated fragments that previously slipped through
    ('mu}_{i}^{(g)}(t)=\\sum_i x_{i}{\\quad\\text{', "mid-token truncation"),
    ('\\psi^{n,j}', "bare fragment"),
    ('\\neq k^{*}', "bare fragment"),
    # env placeholders
    ('AWS_SECRET_ACCESS_KEY=...', "env placeholder"),
    ('STRIPE_SECRET_KEY=sk_test_...', "secret placeholder"),
    ('GET /api/intelligence/creator-pack?gameId=...', "route"),
]

# These MUST be accepted. A control that only rejects is useless -- it would pass
# a gate that rejects everything.
POSITIVES = [
    'Q(s) = b_{h,L}(s)P(M<s) + b_{v,L}(s)P(M>s)',
    'ℓ(θ|X,Y) = Y_ij log p_ij + (1−Y_ij) log(1−p_ij)',
    '\\hat{C}(p)=\\sigma\\left(a\\cdot logit(p)+b\\right)',
    'CED_α(λX + (1−λ)Y) ≤ λCED_α(X) + (1−λ)CED_α(Y)',
    'P \\leq 1/C',
    'w_{t+1} = w_t + α(1 − w_t)P(y_t=1|x_t)',
    'Brier = REL − RES + UNC',
    'f* = (bp−(1−p))/b',
    'max_{i} |r_i − r_j| = C',
    'P(i beats j) = p_i / (p_i + p_j)',
]


def main():
    bad = 0
    print("NEGATIVE CONTROL -- junk that previously PASSED some gate (%d)" % len(NEGATIVES))
    for s, note in NEGATIVES:
        st = recover(s)["status"]
        ok = st != "EQUATION"
        if not ok:
            bad += 1
        print("  %-5s %-14s %-34s %s" % (
            "PASS" if ok else "LEAK", st, note, s[:52].replace("\n", " ")))

    print("\nPOSITIVE CONTROL -- real math that MUST be kept (%d)" % len(POSITIVES))
    for s in POSITIVES:
        st = recover(s)["status"]
        ok = st == "EQUATION"
        if not ok:
            bad += 1
        print("  %-5s %-14s %s" % (
            "PASS" if ok else "LOST", st, s[:62].replace("\n", " ")))

    print("\nLEAKS: %d   LOSSES: %d" % (
        sum(1 for s, _ in NEGATIVES if recover(s)["status"] == "EQUATION"),
        sum(1 for s in POSITIVES if recover(s)["status"] != "EQUATION")))
    if bad:
        print("VERDICT: GATE IS NOT FIT FOR CORPO[USE] -- %d failures" % bad)
    else:
        print("VERDICT: gate rejects all known junk AND keeps all known math")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())