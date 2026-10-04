# Filter the subagent's sweep list by policy, then group what is left.

import os
from collections import Counter

P = os.path.join(os.environ["LOCALAPPDATA"], "Temp", "corpus_probe", "sweep_list.txt")
SEP = chr(92)

# EXCLUSION IS BY KEYWORD, NOT BY TREE PREFIX.
#
# The first version blocked only "Turner_Case_AI/" and "Documents/Codex". The
# session audit then found 83 Turner paths still in the filtered sweep list,
# because the same matter is scattered across FIVE unrelated trees:
#   .claude/GHuman/Turner/...          OneDrive/Desktop/Turner1/...
#   Claude/Projects/Turner/...         + two more
# Case-insensitive substring match on the whole path, so a new copy anywhere is
# still caught.

BLOCK_TOKENS = (
    "turner",                       # the whole matter, wherever it is copied
    "attorney", "counsel", "case_status",
    "baxley", "corina", "pruzansky",
    "rob wiley", "wiley wheeler", "settlement letter",
    "gse-competitive-intel-export",  # measured 43-58% web furniture
    "firecrawl-scores24",            # measured 91% web furniture
    "onedrive/academy-corpus",       # measured 74% web furniture
    "gse-competitive-intel",         # measured 58% junk / 26% binary
    "sports/docs",                   # already swept
    "sports-wt-engineplan/docs",     # already swept
)

paths = [l.strip() for l in open(P, encoding="utf-8", errors="replace") if l.strip()]
norm = [p.replace(SEP, "/") for p in paths]

blocked = [p for p, n in zip(paths, norm)
           if any(tok in n.lower() for tok in BLOCK_TOKENS)]
bset = set(blocked)
clean = [p for p in paths if p not in bset]

print("sweep_list total          : %d" % len(paths))
print("blocked by policy         : %d" % len(blocked))
c = Counter("/".join(p.replace(SEP, "/").split("/")[:2]) for p in blocked)
for k, v in c.most_common(10):
    print("   %6d  %s" % (v, k))

print("\nREMAINING sweep candidates: %d" % len(clean))
c2 = Counter("/".join(p.replace(SEP, "/").split("/")[:2]) for p in clean)
for k, v in c2.most_common(14):
    print("   %6d  %s" % (v, k))

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_target", "sweep-filtered.txt")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as fh:
    fh.write("\n".join(clean) + "\n")
print("\nwrote %s" % out)