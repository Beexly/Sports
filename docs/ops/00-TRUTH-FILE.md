# GSE / GSI Truth File — v1 (2026-11-11)

Every agent and every scheduled routine reads this before writing anything a customer, funder or partner will see.
If a fact is not here, it is not usable. If something here is wrong, fix it here first.

## 1. Entities

| Entity | What it is | Use it for |
|---|---|---|
| **Galaxy Sports Network LLC** | Texas for-profit LLC, DBA Galaxy Sports Edge (GSE), galaxysportsedge.com | All sales; any SBIR or federal prime application; accelerators |
| **GSI** (name unconfirmed, see below) | Texas nonprofit corporation, filing #15043440630001, EIN 43-2804773. IRS Form 1023 filed, determination **pending** | Named as an affiliation only, always with "501(c)(3) application pending" |
| **Garrett Baxley, individual** | Founder | Individual grants and fellowships (funds may lawfully cover living costs) |

**Open conflict to resolve:** the handoff calls the nonprofit "Galaxy **Science** Institute"; the live `llms.txt` on
galaxysportsedge.com calls it "Galaxy **Sports** Institute". Until Garrett confirms the name on the Texas
Certificate of Formation, write only "GSI" plus the filing number.

Never write: "Golden Ratio Technologies", "Golden State Insights", "62-23-1", "501(c)(3) approved", "determined".

## 2. The record — what the live site shows today (and Glass Ledger reconciliation)

- Official Staked Main/Derivative Ledger (Weeks 8–9 settled): derived deterministically by `python scripts/audit/recompute_public_ledger.py` where `sum(component_legs) == headline_record`.
- Secondary All-In View (including route-gated props and MNF slips): displayed separately as an explicit secondary table with its own exact sample size `n`, wins, losses, and pushes.
- **Rule:** no win-rate percentage headline (`71.2%`) in any copy, application, or DM until 200+ fired bets with closing-line backing are accumulated. Say "every pick is on the public ledger, wins and losses" and link `/calibration` + `scripts/audit/recompute_public_ledger.py`.

## 3. Claims

**Usable today:** the product exists and is live; 30+ API endpoints; the pick history is public, losses included;
`sheaf_integrity` runs (`python3 demo.py` flags `E001` as `self_consistent_wrong_vs_ledger`, tests pass, benchmark scripts run on synthetic fixtures); pre-kickoff SHA-256 commitments via `/api/gse/v1/truth/commit` and `scripts/audit/recompute_public_ledger.py`.

**Not usable until someone can run or check it:** "refutes ETH"; "FPR 0.0 / detection 1.0" without the words
"on our synthetic fixtures"; "6.5-hour pre-shock sepsis interception"; "0.18 ms #3-SAT verifier" (not found in
`project-tree`); equation counts as evidence of quality.

## 4. Positioning

GSE is the trust layer for forecasts, human and AI, with the NFL as the proving ground. Own the measurement
standard, not the traffic. Source: `gse-competitive-intel/_MASTER-gse-strategic-dossier.md`.
No sportsbook affiliate links. Plain language. Losses shown as readily as wins.

## 5. Programs, as verified 2026-11-11

- **Emergent Ventures:** rejects AI-written applications; AI allowed for proofreading only. Garrett writes it himself. One application per person and project. Form: mercatus.tfaforms.net/5099527
- **1517 Medici Project:** $1,000 stipend, for students and dropouts, rolling.
- **O'Shaughnessy Fellowships:** 2026 cycle closed 2026-04-30. Next cycle not announced.
- **Stripe:** lists "sports forecasting or odds-making with a monetary or material prize" as prohibited. Treat retail picks revenue on Whop; reserve Stripe for clean B2B SaaS (creator ledger verification, AI contamination-free live benchmark, enterprise multi-system integrity audits).

## 6. What the engine may do alone

Find, draft, monitor, rank, package, report. It does not send, submit, post, pay or deploy. It queues; Garrett taps.

## 7. Garrett confirms

1. Legal name of the nonprofit.
2. Which record scope he wants highlighted on external dossiers.
3. Whether `project-tree` is meant to remain public under the new proprietary source-available license.
