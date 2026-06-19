# Surface Consolidation Map — Phase 0

**Goal:** collapse 170 public surfaces into one confident front door + a tight,
intent-based nav, with depth behind progressive disclosure. The audit's decisive
finding: **the founder voice is clean and strong — the problem is pure sprawl.** So we
consolidate wayfinding and merge duplicates; we do **not** rewrite the voice.

**Status:**
- ✅ **Front door sharpened** (`apps/web/app/page.tsx`) — see §3.
- ✅ **Nav tightened** (`apps/web/components/ui/nav.tsx` + `mobile-nav.tsx`) — see §2.
- ⏳ **Route merges / redirects** — recommended below; they change URL behavior, so they
  need a running app + Playwright to verify no flow breaks. Reserved for the local session.

---

## 1. The 10-second test (LOCKED acceptance criterion)

A first-time visitor, within 10 seconds on `/`, can state:
- **What GSE is:** *Sports intelligence — calibrated signals from live market data, with
  receipts for every pick and the discipline to say "no bet" when the math doesn't support it.*
- **Who it's for:** *People who make sports decisions (bettors, DFS, fantasy) and want to
  see the reasoning, test it, and not pay for picks from services that hide losses.*
- **Where to click, by intent:** (1) **Enter today's board** (action), (2) **See a sample
  read** (proof/education), (3) **Join the Founding Desk** (convert).

The hero now leads with one plain positioning line ("Sports intelligence — not a
sportsbook"), the noise→signal headline, the two primary CTAs, and a three-reason trust
strip (closing-line value / calibrated confidence / the No-Bet gate). Live telemetry sits
just below as proof. **Verify with Playwright in the local session** (scripted first-visit
task + screenshot).

---

## 2. Minimum-viable nav (SHIPPED)

Top bar, 13 → 10 top-level items, no item appearing twice:
- **Primary:** Board · The House
- **Menus:** Players · Intelligence · Fantasy · Company
- **Tail:** The Beat · Academy · Pricing · Founding Desk
- DFS folded into Fantasy (Daily (DFS) group); Contests → Fantasy; Ask Galaxy →
  Intelligence/The Desk; `/gsn` duplicate removed (The Beat is canonical).
- Mobile nav mirrors this exactly.

---

## 3. Kill / Merge / Keep — by intent cluster

KEEP = core front-door path · MERGE = redirect into canonical · HIDE = keep code, drop
from nav. Items marked **(redirect)** need runtime verification (local session).

| Cluster | Decision |
|---|---|
| **Picks/Board** — /board, /picks, /today | KEEP `/board`. **MERGE `/picks` → `/board` (redirect)**. Move `/today` (Mission Control) behind auth / dashboard. |
| **Proof & Accountability** — /accountability, /reliability, /proof, /performance, /clv, /ledger, /vault | KEEP `/accountability` as the public door + `/clv` (sharp indicator). HIDE `/reliability`, `/proof` from nav → fold as sections within `/accountability`. `/performance`, `/ledger` stay as deep links. |
| **Intelligence vs Stats** — /intelligence/*, /stats/* | KEEP `/intelligence/engines` as the canonical engine browser. **Demote the entire `/stats/*` tree** to a "data & sources" sub-area; it parallels `/intelligence/*` and confuses the taxonomy. Not in nav. |
| **Players** — /players/*, /stats/players | KEEP `/players` (Player Lab). **MERGE `/stats/players` → `/players` (redirect)**. |
| **Fantasy** — /fantasy/*, /optimizer | KEEP Draft/Lineup/Waivers/Trade/DFS/Contests in nav. HIDE autopilot, baseline, league-twin, gm-ledger, academy, scheme, studio (keep code). `/optimizer` shown as "All-in-One". |
| **Trending/Media** — /trends, /the-beat, /gsn, /brief | KEEP `/trends`, `/the-beat`. **HIDE `/gsn` (done in nav) — redirect `/gsn` → `/the-beat`**. Clarify `/brief` (likely redirect to `/the-beat` or `/founding-desk`). |
| **Market** — /observatory, /parlay-mri, /no-bet | KEEP all three (distinct, clean). |
| **Decision/Education** — /ask-galaxy, /founding-desk, /academy, /trust-room, /sample-desk | KEEP `/founding-desk`, `/ask-galaxy`, `/academy` in reach. HIDE `/trust-room`, `/sample-desk` from top bar → link from `/founding-desk` + Intelligence/The Desk (sample-desk is now the hero's "See a sample read"). |
| **Company/Legal** — /about, /methodology, /integrations, /partners, /media-kit, /press, /contact, /creator-network, /podcast, /shop, /terms, /privacy, /affiliate-disclosure, /responsible-play | KEEP About/Methodology/Integrations + Company menu (Partners, Media Kit, Press, Podcast, Shop). Legal (terms/privacy/affiliate/responsible-play) → footer only. |
| **Content** — /blog, /newsletter | KEEP `/blog`. `/newsletter` stays (real signup) but is reached from Founding Desk / Intelligence, not the top bar. |
| **Revenue** — /pricing, /founding-desk, /promotions | KEEP `/pricing`, `/founding-desk`. HIDE `/promotions` from nav. |
| **Sports hubs** — /house, /mlb, /nhl, /weather | KEEP `/house` (NFL). HIDE `/mlb`, `/nhl` (stubs) → sport selector within `/house`. `/weather` → component, not a nav page. |
| **Misc** — /stack, /changelog, /track, /faq, /data, /cipher, /nflverse, /human, /vs/tout-services, /preview/*, /journal/*, /room/* | KEEP `/stack` (Intelligence menu), `/changelog` (from Accountability), `/track` (CLV tracker). HIDE the rest from nav (niche/internal/gated); audit each for redirect-or-delete in the local session. |

**Net:** ~170 visible surfaces → ~20 nav-visible + the canonical deep destinations; the
rest stay in code, reachable by deep link, off the wayfinding path.

---

## 4. Zero-AI-smell scan — RESULT: CLEAN

The main public pages (home, about, founding-desk, methodology) show **no** AI-template
tells (no "unleash/supercharge/seamless/leverage/dive in/in today's fast-paced world",
no reflexive triads, no hollow superlatives, no em-dash salad). The voice reads
operator-written, not machine-written. **Maintain this bar**; use these pages as the
reference voice for any new copy. (Trust-gate already blocks tout phrases separately.)

---

## 5. Reserved for the local session (needs a running app + Playwright)

These change URL behavior or need visual/perf verification, so they belong in the
full-tooling local run:
1. **Redirects** (Next.js `redirects()`): `/picks → /board`, `/stats/players → /players`,
   `/gsn → /the-beat`, and a decision on `/brief`. Verify no internal link or flow breaks.
2. **Move `/today` behind auth** (it's a personalized dashboard).
3. **Playwright proof** of the 10-second test + the primary flows, with screenshots.
4. **Lighthouse/perf budget** (LCP < 2.0s, CLS < 0.05, perf ≥ 95) on `/`, `/board`,
   `/founding-desk`, `/pricing`.
5. **a11y audit** (axe) — zero serious/critical; AA+ contrast; keyboard nav.
6. **The branded welcome video** (reporter + Higgsfield) for the onramp — generate, then
   PUBLISHING the final cut is a Founder Action.

---

*This map is the consolidation contract. The front door + nav are done; the route merges
and visual/perf proofs are queued for the local session with the full skill arsenal.*
