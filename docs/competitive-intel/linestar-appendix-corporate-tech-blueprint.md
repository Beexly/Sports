# LineStar dossier — Appendix (corporate / tech / regulatory + build blueprint)

*Completes the two angles the dossier's automated run dropped on a structured-output retry cap. Everything below is either **(verified)** from a primary source or explicitly flagged as **needs a registry lookup** — nothing is invented.*

## A. Corporate

- **Fantasy Sports Company LLC** — the operator/developer. App Store lists the seller as "Fantasy Sports Company LLC"; the DK app copy says *"Proudly Made in San Diego, CA by Fantasy Sports Co."* Founded **2014** (GitBook/About). **(verified)**
- **BetFully, Inc.** — the trademark + patent assignee. USPTO assignment records a **change of name from Fantasy Sports Company to BetFully, Inc.**, effective **2021-11-03** (recorded 2022-08-24). "LineStar® is a registered trademark of BetFully Inc." **(verified)**
- **Inventors / likely principals:** Peter Groset, Erik Groset, William Switzer (named on all four patents). **(verified)**
- **Brand portfolio** (linestarapp.com footer links): **betfully.com, trackwiz.com, propsoptimizer.com, sportsbettingoddscalculator.com** — a cluster of DFS + betting-tools + affiliate properties. Reads as an **IP + affiliate monetization group**, not a single-product company. **(verified — footer)**

## B. Tech stack (a real modernization gap)

- **DotNetNuke (.NET) CMS** — every static asset is served under `/Portals/0/…`, DNN's signature path. A **2014-era ASP.NET/DNN** stack. **(verified — URL structure)**
- Implication: a modern competitor on Next.js/edge infra out-iterates a DNN monolith on speed, personalization, and real-time surfaces. This is a concrete, exploitable gap (not a knock on their math — their edge is the patent + data, not the web platform).

## C. Regulatory surface

- The product is **real-money-DFS-adjacent** and runs **on-site sportsbook-affiliate promos** ("Get Offer → visit DFS Promo Site"), with 1-800-GAMBLER + state problem-gambling disclosures (MA/NY/CT/MD). **(verified — site)**
- That places them squarely in the **state-by-state DFS legality + responsible-gambling disclosure** regime — precisely the regulatory/brand surface GSE's **skill-based, not real-money** lane is designed to avoid ([[project-gse-gaming-stance]]).

## D. Needs a registry lookup (founder/counsel follow-up — not web-searchable)

Flagged, not fabricated: exact **CA Secretary of State** entity numbers + registered agents/officers, current **headcount**, any **funding**, and **SimilarWeb traffic**. These require the OpenCorporates/CA-SoS portals or a paid traffic API, not open web search.

## E. Build blueprint — now implemented, not theoretical

The "how GSE builds equal-or-better, license-clean" blueprint is no longer a plan — it ships on this branch. See [dfs-optimizer-edge.md](./dfs-optimizer-edge.md). Summary of the open-method path:

- **Optimizer:** provably-optimal branch-and-bound (built) for the gated slate; at production scale, an open MILP solver — **Google OR-Tools (CP-SAT) / HiGHS / CBC** or `pydfs-lineup-optimizer` — is the drop-in. A clean design-around of the randomized-column patent (confirm FTO with counsel).
- **Tournament objective:** the **Hunter–Vielma–Zaman integer-programming method** ([arXiv:1604.01455](https://arxiv.org/abs/1604.01455)) + Monte-Carlo simulation — correlation + ceiling, the thing point-sum can't model (built as `dfs-correlation.ts`).
- **Projection inputs (license-clean):** nflverse / nfl_data_py (snaps, air yards, red-zone, usage) + public Vegas lines → feed the **GSE Rating** as `projected value`.
- **The moat neither competitor has:** publish **proof-of-accuracy / realized ROI**, glass-box, on open data — the wedge from both teardowns.
