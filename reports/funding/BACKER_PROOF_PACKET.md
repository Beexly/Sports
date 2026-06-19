# Backer Proof Packet — Galaxy Sports Edge

**One line:** Sports intelligence for people who are done being sold certainty.
**What it is:** A calibrated-signal + decision-discipline platform. Not a sportsbook.
**Live view (real numbers):** `/cockpit/funding`.

> This packet holds to the company's own bar: no fabricated revenue, users, returns,
> or track record. Traction is real or it's honestly zero/unknown. The moat is proof.

---

## 1. The thesis

The sports-prediction market is saturated with touts selling certainty — "locks,"
guaranteed records, cherry-picked screenshots. The trust is gone. Galaxy Sports Edge
inverts the model: we publish **calibrated** signals (a pick labeled ~65% should win
~65%), we show the **factor trail**, we publish a **No-Bet** call when the edge isn't
there, and we prove it against the **closing line (CLV)**. The differentiator is the
one thing almost nobody publishes: an auditable record of being honestly calibrated.

## 2. Why now

- Real odds data is cheaply available (licensed API already wired).
- The honest-calibration angle is unoccupied — competitors can't pivot to it without
  exposing their own records.
- The entire stack can run at **$0/month** until traction is proven, so the company
  can reach proof before spending a dollar.

## 3. What's built (and self-runs)

A production-grade Next.js 14 / TypeScript / Postgres platform:

- **Data → score → settle loop** on real sportsbook odds (ingestion, scoring,
  settlement, CLV capture) — runs on a schedule, no human input.
- **Reality Engine** — devig (Shin), isotonic calibration, CLV grading, no-bet gate,
  edge-type taxonomy, pick-autopsy, sovereign-edge-index. Built, tested, deliberately
  **inert** until the data proves them out (no premature claims).
- **Free multi-provider LLM pool** — Jarvis (the operating intelligence) and content
  generation run on a keyless free pool at $0, with paid fallback only if needed.
- **Universal Spend Governor** — zero-spend by default; a proof-gated upgrade ladder
  that earns spend through real traction, not assertion.
- **Autonomy Map** — the recurring operating loop is majority self-driving; only
  money-out / publish / model-change levers wait for the owner.
- **Revenue system** — Founding Desk, tiered subscriptions, Ask Galaxy lead wedge,
  server-side paywall, Stripe billing, customer-proof funnel.
- **Compliance spine** — rights-gated scraping clearance (no evasion), responsible-
  gaming throughout, explicitly not-a-sportsbook, no fabricated data (guardrail-enforced).

Two independent read-only audits (honesty/compliance + security/abuse) returned **no
critical or high findings**.

## 4. Operating posture (the capital-efficiency story)

| Dimension | State |
|---|---|
| Monthly infra spend | **$0** by default (free pools + free tiers) |
| Recurring ops self-driving | **majority** (see `/cockpit/autonomy`) |
| LLM cost | $0 — keyless free pool |
| Data cost | $0 — licensed key already set, quota-governed |
| Paid acquisition | **off** until the funnel proves out |

The company is engineered to reach proof of demand and proof of calibration **before**
it needs outside money — which makes any raise about acceleration, not survival.

## 5. Traction (real or honestly zero)

Pre-launch, these are honest zeros — not hidden, not inflated. Live counts at
`/cockpit/funding`:
- Paid members
- Email subscribers
- Ask Galaxy submissions

The proof-gated upgrade ladder (`reports/finance/SPEND_GOVERNOR_POLICY.md`) ties each
spend increase to a verified milestone (10 paid members / 100 emails / 25 Ask Galaxy /
$100 revenue / a sponsor). Backers can watch the same signals the system spends against.

## 6. The path to the win-rate record

The win-rate pillar is gated on **real accumulation**, not a switch: once ≥100
learning-eligible picks have settled (with the Odds runner live), the calibrator is
validated out-of-sample, and — only if it passes — the conviction tier activates via a
founder-gated MODEL_VERSION bump + audit entry. There is no path to faking it; the
honesty *is* the product.

## 7. The bars we never cross

- No fabricated performance, revenue, users, or testimonials.
- Win-rate claims gated on held-out calibration proof.
- Model changes founder-gated; never automatic.
- Zero-spend default; proof-gated paid spend; ads blocked pre-funnel.
- Not a sportsbook; rights-gated data; responsible-gaming throughout.

---

*Use of this packet: it is a factual operating snapshot, not a financial projection.
Any forward-looking number must be labeled as such. The live, real-signal version is
the cockpit Funding view.*
