# Competitive intelligence — DFS/fantasy engine teardowns

Public-source, license-clean teardowns of the two products Garrett flagged, plus
the engineering that turns the findings into a GSE edge. **No competitor
proprietary data was ingested** — only public methodology pages, public patents,
public reviews, and open-data blueprints. Every mechanical claim in the
teardowns is tagged `(documented)` / `(inferred)` / `(speculative)`.

| Doc | What it is |
|---|---|
| [rotowire-engine-teardown.md](./rotowire-engine-teardown.md) | How RotoWire's projection / ranking / auction / ADP / mock-draft / draft-assistant engines work, + a license-clean build blueprint. Their weakness: sold on *authority*, never *calibrated in public*. |
| [linestar-teeth-dossier.md](./linestar-teeth-dossier.md) | LineStar / BetFully patent-invalidity & prior-art, claim-by-claim design-around, engine teardown, weakness/churn dossier, corporate/tech/regulatory map, GSE battle plan. |
| [dfs-optimizer-edge.md](./dfs-optimizer-edge.md) | The engineering follow-through: exact (provable) optimizer + correlation-aware GPP selection that beat LineStar's patented point-sum heuristic — with a head-to-head benchmark. |

## The through-line

RotoWire sells **authority**; LineStar sells a **patent**. **Neither proves
accuracy in public.** GSE's wedge is the one thing they both skip — *proving*
edge on open data they don't own, with a glass-box every step. The DFS optimizer
upgrade is a concrete instance: provably-optimal cash lineups and
correlation-aware tournament selection, each a clean design-around of the
BetFully patents (confirm FTO with counsel).

## Key LineStar facts (verified)

- Patents **US 9,744,450 / 9,751,010 / 10,478,721 / 11,660,533**, earliest
  priority **2015-09-18** (provisional 62/220,665), expiry ~**2036**. Inventors
  Peter & Erik Groset + William Switzer → Fantasy Sports Company → **BetFully,
  Inc.** (name change 2021).
- The '721 optimizer patent **lapsed for non-payment (2023)** and was
  reinstated; the portfolio has **never been litigated**; the site now runs a
  **"Contact for Licensing"** posture → IP-monetization, not enforcement.
- The claimed optimizer is a **randomized-column greedy heuristic** with a
  **point-sum** objective — not exact, not correlation-aware.

*Correction logged during research: an earlier note that arXiv:1604.01455
predated their priority was wrong — the 2015-09-18 provisional precedes it. The
prior-art angle only lives if that provisional fails a §112/§120 written-
description test (a counsel question).*
