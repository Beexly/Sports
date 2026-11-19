# Revenue Operating Ledger

Updated: **2026-11-18** (Week 11 TNF `IND @ HOU` Launch Readiness & Whop Ladder Alignment)

---

## 1. Whop Merchant Account, Affiliates & Webhook Infrastructure

| Surface / System | Production Configuration | Status |
|---|---|---|
| Whop Merchant Company | `biz_jzvuDvevsatKWi` (`https://whop.com/galaxy-sports-edge/`) | Active |
| Whop Webhook Endpoint | `hook_IfoCqkZf54X6N` -> `https://www.galaxysportsedge.com/api/webhooks/whop` (6 events) | Active |
| Global Affiliate Rate | `30%` recurring commission (`CONTENT_AFFILIATE_OS`) | Active |
| Member / Creator Tier | `40%` partner affiliate split (`CREATOR25` promo lane + partner onboarding) | Active |
| Active Promo Codes (4) | `GALAXY15` (15% off), `SHARP20` (20% off), `REDZONE10` (10% off), `CREATOR25` (25% off) | Active |
| Settlement Accounting Tax Reference | Texas Comptroller Sec. 151.351 (`8.25% * 80% = 6.60%` effective Houston data-processing tax) | Logged |

---

## 2. Active Week 11 & Week 12 Value Ladder SKUs

| Rung | SKU / Offer | Price | Cadence / Structure | Retention & Credit Policy |
|---|---|---|---|---|
| 0 | Open Field Pass (`/props`, `/tools`, `/parlay-mri`) | `$0` | Free public lane | Zero paid picks leaked; free game-environment analytics and transparent pass reasoning |
| 1 | Week 11 TNF `IND @ HOU` Impulse Door | `$9` | One-time slate unlock | Includes `72-hour` full `$9` upgrade credit toward `$39/mo` Pro |
| 2 | Week 12 Thanksgiving 5-Game Slate SKU | `$14` | One-time 5-game pack | Covers `GB @ LAR`, `CHI @ DET`, `PHI @ DAL`, `KC @ BUF`, `DEN @ PIT` |
| 3 | Quant Workbook / Specialty Core Packs | `$19` - `$24` | One-time specialty pass | Defense/IDP (`$19`), Anytime TD (`$24`), Kicking & 1Q/1H (`$24`) |
| 4 | Week 11 Sunday Full Slate / SGP Card | `$29` | One-time 11-game Sunday card | Backed by 30-Day Positive-CLV Pledge |
| 5 | GSE Pro Membership (Founding 100 Seats) | `$39/mo` | Recurring monthly (or `$149` seasonal) | Backed by 30-Day Positive-CLV Pledge (`1.07%` trigger -> `98.94%` retention replacing single-slate refund traps) |
| 6 | GSE Elite Membership (150-Lineup MME DFS) | `$79/mo` | Recurring monthly | Full Classic + Showdown 150-lineup MME DFS portfolio, SGPs, props, and 30-Day Positive-CLV Pledge |
| 7 | White-Label Quantitative Bot Desk | `$149/mo` | Recurring SaaS tier | Self-funding referral flywheel: `13` Pro (`$39/mo`) or `7` Elite (`$79/mo`) `30%` referrals cover monthly seat |

---

## 3. Sponsor & Partnership Governance

- **Approved Sponsor Categories (Non-Gambling Sponsors Only):** Creator tools, Sports data & APIs, Fantasy football tools, Sports cards & memorabilia, Cloud/dev tools, and vetted local business sponsors (`docs/revenue/PARTNER_POLICY.md`).
- **Hard-Refused Categories:** **HARD-REFUSE sportsbook CPA**, sportsbook rev-share, and tout affiliate deals (non-negotiable editorial independence firewall; `/record` and public surfaces remain free of sportsbook affiliate conflicts).

---

## 4. Operating Rules & Live Reconciliation Cadence

| Channel / Asset | Status | Purpose | Live KPI / Constraint |
|---|---|---|---|
| Whop Checkout + Stripe Legacy Bridge | Active | Instant browser + Whop unlock (`/packages`) | Fail-closed when provider env links are absent; zero fake checkout URLs |
| Public Record & Normalized Ledger | Live | `/record`, `/llms.txt`, `/packages` (`79-46-0`, `+81.47u` actual / `+25.82u` 1u flat `-110`) | Recomputed strictly from settlement DB; win rate `%` gated until `200` CLV-backed plays |
| Weekly Revenue Sweep | Scheduled | Every Monday `08:00 CT` reconciliation | Reconcile Whop orders (`biz_jzvuDvevsatKWi`), promo redemptions, and 30-day Positive-CLV Pledge credits |
