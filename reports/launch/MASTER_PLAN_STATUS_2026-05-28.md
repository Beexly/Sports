# Master Plan Status — 2026-05-28

**Branch:** `claude/determined-keller-dUcdG`
**Doctrine source:** `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Latest commits:** `63a8e8e` (Market Gravity + Picks GEO) · `318ea37` (Rumor Radar + Brain GEO) · `779b438` (homepage JSON-LD + ADR 007)

---

## 1. Shipped ✅

### Public launch surface

| Item | Evidence |
|---|---|
| `/intelligence` — Sports OS Intelligence Network landing | Route compiles |
| `/fantasy` — Fantasy Intelligence PREVIEW | Route compiles |
| `/market-gravity` — Market Gravity PREVIEW | Route compiles |
| `/brain` — Research Brain BETA/GATED | Route compiles |
| `/rumor-radar` — Rumor Radar PREVIEW | Route compiles |
| `/developer` — Developer & API WAITLIST | Route compiles |
| `StateBadge` 7-state primitive | `apps/web/components/ui/state-badge.tsx` |
| Sitemap: all routes registered via routes-catalog | `apps/web/lib/routes-catalog.ts` |
| `scripts/smoke-launch.mjs` 42-assertion suite | `npm run test:smoke` 42/42 |
| Brand-safety: 813/813 passing | `npm run test:brand-safety` |
| Trust guardrail: 285 files, 0 banned phrases | `npm run guard:trust` |
| lint / typecheck / build green (85 routes) | All CI checks pass |
| Architecture docs: 16+ component specs | `docs/brain/`, `docs/intelligence/` |
| Routes catalog as single source of truth | `apps/web/lib/routes-catalog.ts` |

### GEO cluster — shipped

| Page | JSON-LD type | Commit |
|---|---|---|
| `/intelligence/how-it-works` | TechArticle | `4a826bc` |
| `/intelligence/source-hierarchy` | TechArticle | `4a826bc` |
| `/intelligence/glossary` | FAQPage (20 terms) | `4a826bc` |
| `/fantasy/how-start-sit-works` | TechArticle | `a1e3287` |
| `/fantasy/usage-trends` | FAQPage (5 Q&As) | `a1e3287` |
| `/fantasy/scheme-fit` | TechArticle | `a1e3287` |
| `/market-gravity/how-it-works` | TechArticle | `63a8e8e` |
| `/market-gravity/line-movement` | FAQPage (5 Q&As) | `63a8e8e` |
| `/market-gravity/book-disagreement` | TechArticle | `63a8e8e` |
| `/picks/how-picks-are-scored` | TechArticle | `63a8e8e` |
| `/picks/confidence-scores` | FAQPage (5 Q&As) | `63a8e8e` |
| `/rumor-radar/how-it-works` | TechArticle | `318ea37` |
| `/rumor-radar/source-tiers` | FAQPage (4 Q&As) | `318ea37` |
| `/brain/how-brain-works` | TechArticle | `318ea37` |
| `/brain/evidence-vault-explained` | TechArticle | `318ea37` |

### Infrastructure / docs — shipped

| Item | Notes |
|---|---|
| Brand-token sweep | 522 replacements, 75 files. `bg-carbon` / `border-mineral` / `text-ion-blue` site-wide |
| `apps/web/public/llms.txt` | AI-crawler index (ChatGPT / Perplexity / Claude) |
| ADR 004 — Signal Ledger MVP | `docs/adr/004-signal-ledger-mvp.md` (Proposed) |
| ADR 005 — Claim Governance | `docs/adr/005-claim-governance.md` (Proposed) |
| ADR 006 — Entity Graph MVP | `docs/adr/006-entity-graph-mvp.md` (Proposed) |
| ADR 007 — Source Acquisition Mesh | `docs/adr/007-source-acquisition-mesh.md` (Proposed) |
| Homepage: WebSite + Organization + SoftwareApplication JSON-LD | commit `779b438` |
| Homepage: Intelligence Surfaces section | Four platform surfaces with cluster links |
| `/methodology`: TechArticle JSON-LD + cluster links | Commit pending |

---

## 2. Outstanding — blocked on owner approval

| Item | Blocking what | Change proposal |
|---|---|---|
| Evidence Vault MVP (Phase 4) | Fantasy live, Brain, Signal Ledger | ADR 003 (Proposed — Codex authored) |
| Signal Ledger MVP (Phase 6) | Brain Q&A, pick provenance, calibration page | ADR 004 (Proposed) |
| Claim Governance engine | Public unrestricted Brain access | ADR 005 (Proposed) |
| Entity Graph MVP | Fantasy War Room live, Brain cross-entity | ADR 006 (Proposed) |
| Source Acquisition Mesh | Rumor Radar live data | ADR 007 (Proposed) |
| Internal Ask the Brain route (Phase 7) | Gated Q&A testing | Depends on Phases 4 + 6 |

---

## 3. Outstanding — blocked on owner env config

| Item | Action required |
|---|---|
| Production deploy | 14 env vars + `vercel --prod --project=sports` |
| Stripe checkout | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs, webhook endpoint |
| Live sports data | `THE_ODDS_API_KEY` |
| AI layer | `ANTHROPIC_API_KEY` |
| Queue / workers | `REDIS_URL` |

---

## 4. Outstanding — code-only, no approvals needed

| Item | Effort | Leverage | Notes |
|---|---|---|---|
| Journal content articles | ~4h | High | `/journal` is live but empty. 3–5 intelligence methodology essays would add search authority |
| FAQ expansion | ~2h | Medium | `/faq` has JSON-LD but could expand from basic to 15–20 Q&As covering the full platform |
| Pricing page improvements | ~2h | Commercial | Tier comparison table, feature matrix, FAQ on the page |
| `/intelligence/calibration` placeholder | ~1h | Low | Gated by data but can have a "coming soon" page with GEO schema |
| Performance page JSON-LD | ~1h | GEO | `/performance` has no schema markup |
| Observatory/Edge Map GEO schema | ~1h | GEO | `/observatory` has no JSON-LD |
| About page improvements | ~2h | Trust / commercial | Thin page, could add Organization JSON-LD and team philosophy |

---

## 5. Suggested next moves

**Highest leverage (code-only):**
1. Journal content — 3 intelligence essays (how to read line movement, what confidence calibration means, why most picks don't publish) — these earn links and topical authority
2. Pricing page improvements — commercial conversion page should be best-in-class
3. Performance + Observatory JSON-LD — low-effort GEO wins on existing surfaces

**Owner-action required to unblock Phase 4+:**
- Approve ADR 003 (Evidence Vault) → cascade unblocks Phases 4–9
- Set 14 production env vars → enables preview deploy for QA
