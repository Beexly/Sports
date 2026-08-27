# PROPOSED SOURCE-RIGHTS REGISTRY ENTRIES — NOT SELF-APPROVED (per doc 1 §1 / clarification)
# Status per source: PROPOSED. NOT added to apps/web/lib/scraping/source-rights-registry.ts.
# NOT self-approved. Founder/legal must approve before any automation. checkClearance() governs.
# Source = DATA. James Cook rule holds (attributed only; never re-serve proprietary).

## R1 — Sportradar API (tracking / advanced stats)
- PROPOSED STATUS: permission_required (commercial use prohibited without executed Order Form).
- TERMS FOUND (developer.sportradar.com Master T&C, read 2026-08-27):
  - License is "non-exclusive, worldwide, fully paid-up, royalty-free, perpetual (archiving only), REVOCABLE."
  - §1.19: Customer "is not authorized, and agrees not to, use the Products in connection with any COMMERCIAL use or any use involving publication or display of the Data or Content."
  - No reverse engineering / decompiling underlying algorithms (§License Restrictions ii).
  - NBA/NHL/MLB official data only via signed Order Form, subject to league terms.
  - Overage $100 / 1,000 API calls; pricing custom (reddit anecdote ~$1,250/mo UNVERIFIED — do not cite as fact).
- VERDICT: rights-gated. Tracking/advanced stats = NGS-class. PROPOSED permission_required. Do NOT automate.
- ACTION NEEDED: founder signs Order Form OR we stay with CC-BY nflverse + ESPN public.

## R2 — SkillCorner (football tracking + event data)
- PROPOSED STATUS: permission_required (commercial tracking-data program; no public pricing — request quote).
- TERMS: not yet fully read (site is marketing/contact-gated). Tracking + event data for football (and American football per skillcorner.com/us/sports/american-football).
- VERDICT: rights-gated tracking class (~NGS / Sportradar). PROPOSED permission_required. Do NOT automate until terms read + approved.
- ACTION NEEDED: read full ToS; founder commercial decision.

## R3 — PFF (Pro Football Focus) grades / charting
- PROPOSED STATUS: excluded (for grades/derived metrics) per James Cook rule. Pricing not public.
- RATIONALE: PFF grades are proprietary derived analysis; re-serving or pipeline-dependent scraping violates the legal line (doc 1 §1). Attributed citation ("PFF grades X as ...") allowed; feature pipeline dependent on continuous re-scrape NOT allowed.
- VERDICT: excluded for grades. PROPOSED excluded.
- ACTION NEEDED: none (excluded by standing law).

## R4 — MLB StatsAPI (already in doc 1 approved_* list)
- PROPOSED STATUS: IF not present in registry -> approved_api (public MLB StatsAPI with key; facts-only).
- NOTE: doc 1 §2 lists "MLB StatsAPI" among approved_* sources. Verify entry exists in source-rights-registry.ts; if present, no action. If absent, append as approved_api (public, facts-only, no login bypass).
- VERDICT: likely already cleared; confirm, don't self-approve if missing — flag to founder.

---
PROPOSED TOTAL: 4 (R1 Sportradar permission_required, R2 SkillCorner permission_required, R3 PFF excluded, R4 MLB StatsAPI confirm-approved).
NONE added to registry. NONE automated. All held for founder/legal approval per doc 1 §1.
