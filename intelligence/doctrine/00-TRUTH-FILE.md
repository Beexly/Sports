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

## 2. The record — what the live site shows today

Read from galaxysportsedge.com/calibration by automated fetch on 2026-11-11. Code agents should confirm each line.

- Headline: **47-19-1, 71.2%, +24.92 units**.
- Second line on the same page: **"Base 38-13-1, +22.85u" with gated props**.
- The three ledger legs shown (16-5-0, 14-6-1, 6-2-0) add up to **36-13-1**, not 47-19-1. The page does not explain the gap.
- Graded plays: 50, of which 21 carry a stake.
- Sealed board: 573 evaluated, 295 published, 278 passed.
- Calibration, expected vs realized: 65% → 57% (n=423); 75% → 66% (n=247); 85% → 68% (n=59). The model is overconfident in every bucket.
- Brier score 0.2484 against 0.25 for a coin flip.
- No closing-line-value figure. No description of how picks are sealed. No link to a script that recomputes the record.

**Rule until the page reconciles:** no win-rate headline in any copy, application or DM. Say "every pick is on
the public ledger, wins and losses" and link the ledger. The 71.2% figure is not used.

The company's own July dossier sets the bar for a hit-rate claim at 200+ fired bets with closing-line backing.

## 3. Claims

**Usable today:** the product exists and is live; 30+ API endpoints; the pick history is public, losses included;
`sheaf_integrity` runs (tests pass, demo returns in about 0.2 s, benchmark scripts run on synthetic fixtures).

**Not usable until someone can run or check it:** "refutes ETH"; "FPR 0.0 / detection 1.0" without the words
"on our synthetic fixtures"; "6.5-hour pre-shock sepsis interception"; "0.18 ms #3-SAT verifier" (not found in
`project-tree`); equation counts as evidence of quality; "verified", "audited" or "cryptographically sealed" until
the hashes and a recompute script are public.

## 4. Positioning

GSE is the trust layer for forecasts, human and AI, with the NFL as the proving ground. Own the measurement
standard, not the traffic. Source: `gse-competitive-intel/_MASTER-gse-strategic-dossier.md`.
No sportsbook affiliate links. Plain language. Losses shown as readily as wins.

## 5. Programs, as verified 2026-11-11

- **Emergent Ventures:** rejects AI-written applications; AI allowed for proofreading only. Garrett writes it himself. One application per person and project. Form: mercatus.tfaforms.net/5099527
- **1517 Medici Project:** $1,000 stipend, for students and dropouts, rolling.
- **O'Shaughnessy Fellowships:** 2026 cycle closed 2026-04-30. Next cycle not announced.
- **Stripe:** lists "sports forecasting or odds-making with a monetary or material prize" as prohibited. How that applies to a picks subscription is not settled; treat picks revenue through Stripe as at risk.

## 6. What the engine may do alone

Find, draft, monitor, rank, package, report. It does not send, submit, post, pay or deploy. It queues; Garrett taps.

## 7. Garrett confirms

1. Legal name of the nonprofit.
2. Which record is correct, and why the page shows three.
3. Whether `project-tree` is meant to be public. It is public on GitHub with no license file, which matters for any patent plan.
