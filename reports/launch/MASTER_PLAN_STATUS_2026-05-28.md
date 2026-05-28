# Master Plan Status — 2026-05-28

**Branch:** `claude/determined-keller-dUcdG`
**Doctrine source:** `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Validation source:** `reports/launch/CODEX_LAUNCH_VALIDATION_REPORT_2026-05-28.md`
**Latest commits:** `5d591a8` (GEO timestamps) · `4a826bc` (GEO cluster) · `befe039` (routes catalog) · `3a6f376` (status refresh)

---

## 1. Shipped ✅ (strikethrough = done)

### Public launch surface (code-side complete, awaiting owner deploy)

| Item | Evidence |
|---|---|
| ~~`/intelligence` — Sports OS Intelligence Network landing~~ | Route compiles, commit `8942f94` |
| ~~`/fantasy` — Fantasy Intelligence PREVIEW~~ | Route compiles, commit `3595be3` |
| ~~`/market-gravity` — Market Gravity PREVIEW~~ | Route compiles, commit `3595be3` |
| ~~`/brain` — Research Brain BETA/GATED~~ | Route compiles, commit `3595be3` |
| ~~`/rumor-radar` — Rumor Radar PREVIEW~~ | Route compiles, commit `3595be3` |
| ~~`/developer` — Developer & API WAITLIST~~ | Route compiles, commit `3595be3` |
| ~~`StateBadge` 7-state primitive~~ | `apps/web/components/ui/state-badge.tsx`, 9 tests passing |
| ~~Sitemap: all 8 new routes registered~~ | `apps/web/app/sitemap.ts`, smoke assertion §6 |
| ~~openGraph metadata on all new surfaces~~ | Each new `page.tsx`, smoke assertion §6 |
| ~~FAQ JSON-LD FAQPage schema on `/faq`~~ | Smoke assertion §6 |
| ~~Public-copy scanner coverage on new surfaces~~ | `+5` targets in both scanner tests |
| ~~`scripts/smoke-launch.mjs` 40-assertion suite~~ | `npm run test:smoke` 40/40 |
| ~~Brand-safety: 749/749 passing~~ | `npm run test:brand-safety` |
| ~~Trust guardrail: 269 files, 0 banned phrases~~ | `npm run guard:trust` |
| ~~lint / typecheck / build green~~ | Commit `f688da6` validation log |
| ~~Architecture docs: all 16 component specs written~~ | `docs/brain/` (11 docs), `docs/intelligence/` (5 docs) |
| ~~Nav updated: `/intelligence` as lead item (desktop + mobile)~~ | `nav.tsx`, `mobile-nav.tsx` |
| ~~Codex launch validation report~~ | `reports/launch/CODEX_LAUNCH_VALIDATION_REPORT_2026-05-28.md` |
| ~~Routes catalog as single source of truth~~ | `apps/web/lib/routes-catalog.ts`, commit `befe039` |
| ~~`/intelligence/how-it-works` — pipeline GEO hub~~ | TechArticle JSON-LD, commit `4a826bc` |
| ~~`/intelligence/source-hierarchy` — six-tier taxonomy GEO hub~~ | TechArticle JSON-LD, commit `4a826bc` |
| ~~`/intelligence/glossary` — 20 canonical terms~~ | FAQPage JSON-LD per term, commit `4a826bc` |
| ~~Last-updated timestamps on existing GEO pages~~ | methodology, observatory, responsible-play, vs/tout-services — commit `5d591a8` |
| ~~ADR 004 — Signal Ledger MVP change proposal~~ | `docs/adr/004-signal-ledger-mvp.md` (Proposed — awaiting owner approval) |
| ~~ADR 005 — Claim Governance change proposal~~ | `docs/adr/005-claim-governance.md` (Proposed — awaiting owner approval) |
| ~~`/llms.txt` AI-crawler index~~ | `apps/web/public/llms.txt` — canonical content map for ChatGPT / Perplexity / Claude crawlers |

---

## 2. Outstanding — blocked on owner approval

These require an Accepted ADR before any code is written.

| Item | Blocking what | Change proposal |
|---|---|---|
| **Evidence Vault MVP** (Phase 4) | Fantasy live, Brain, Signal Ledger | ADR 003 (Codex in flight) — doctrine `docs/brain/evidence-vault.md` |
| **Signal Ledger MVP** (Phase 6) | Brain Q&A, pick provenance, calibration page | ADR 004 (Proposed) — doctrine `docs/brain/signal-ledger.md` |
| **Claim Governance engine** | Public unrestricted Brain access, runtime claim gating | ADR 005 (Proposed) — doctrine `docs/brain/claim-governance.md` |
| **Source Acquisition Mesh** | Rumor Radar live data, weak-signal engine | `docs/brain/source-acquisition-mesh.md` — also blocked on source-policy approval |
| **Entity Graph** | Fantasy War Room live, Brain cross-entity answers | `docs/brain/entity-graph.md` |
| **Internal Ask the Brain route** (Phase 7) | Gated Q&A testing | Depends on Phases 4 + 6 |

---

## 3. Outstanding — blocked on owner env config

No code changes needed; infrastructure only.

| Item | Env vars / actions required |
|---|---|
| **Production deploy** | All 14 vars (see `CLAUDE.md` + Codex report Section 7), `vercel --prod --project=sports` |
| **Stripe checkout wiring** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_ELITE_PRICE_ID`, webhook endpoint registered |
| **Live sports data** (Odds API) | `THE_ODDS_API_KEY` |
| **AI layer** (Claude API) | `ANTHROPIC_API_KEY` |
| **Queue / workers** | `REDIS_URL` |

---

## 4. Outstanding — blocked on live data (after env config)

Once provider keys are set, these surfaces can progress from PREVIEW → LIVE.

| Surface | Current state | What unlocks it |
|---|---|---|
| Fantasy Intelligence `/fantasy` | PREVIEW — demo data | Odds API key + evidence vault (Phase 4) |
| Market Gravity `/market-gravity` | PREVIEW — demo data | Odds API key |
| Research Brain `/brain` | BETA/GATED | Evidence Vault + Claim Governance + internal Q&A validation |
| Rumor Radar `/rumor-radar` | PREVIEW — hardcoded demo signals | Source Acquisition Mesh approval + live signal feed |

---

## 5. What can be improved (code-only, no approvals needed)

These are deferred items that can be picked up in any session without owner schema
approval. Ordered by leverage:

| Item | Effort | Leverage | Notes |
|---|---|---|---|
| ~~**Routes-catalog refactor**~~ | ~~~3h~~ | ~~DX~~ | ✅ Shipped in commit `befe039` — `apps/web/lib/routes-catalog.ts` is now single source for sitemap, nav, and smoke. |
| ~~**Topical authority cluster pages**~~ | ~~~4h~~ | ~~AI-search / GEO~~ | ✅ Shipped in commit `4a826bc` — `/intelligence/how-it-works`, `/source-hierarchy`, `/glossary` with TechArticle + FAQPage JSON-LD. |
| ~~**Last-updated timestamps on existing GEO pages**~~ | ~~~30m~~ | ~~GEO freshness~~ | ✅ Shipped in commit `5d591a8` — methodology, observatory, responsible-play, vs/tout-services. |
| ~~**Fantasy GEO sub-cluster**~~ | ~~~4h~~ | ~~GEO + topical authority~~ | ✅ Shipped — `/fantasy/how-start-sit-works`, `/fantasy/usage-trends`, `/fantasy/scheme-fit` with TechArticle + FAQPage JSON-LD. Commit `a1e3287`. |
| ~~**`/llms.txt` AI-crawler index**~~ | ~~~30m~~ | ~~GEO / AI search~~ | ✅ Shipped — `apps/web/public/llms.txt` with citation guidance for ChatGPT / Perplexity / Claude. Commit `58c7b37`. |
| **Brand-token sweep** | ~3h site-wide | Visual polish | Replace `bg-gray-950 / border-gray-800 / text-cyan-300` with `bg-carbon / border-mineral / text-ion-blue` across ALL pages. ~1,100 class references, pure visual. |
| **Signature-component extraction** | ~8h+ | DX + reuse | Pick Provenance Timeline, Source Health Panel, standalone Contradiction Alert, Fantasy War Room Card, Rumor Radar Card — defer until live data integration justifies the abstraction. |
| **Fantasy intelligence sub-cluster** | ~4h | GEO + topical authority | `/fantasy/how-start-sit-works`, `/fantasy/usage-trends`, `/fantasy/scheme-fit` — extends the GEO cluster into fantasy. Block: /fantasy itself is PREVIEW with demo data; expanding it risks looking further along than it is. |
| **Calibration transparency page** | blocked | High | `/intelligence/calibration` needs real model accuracy data → requires Evidence Vault + settled-pick history. |

---

## 6. Suggested next move

**If owner has set env vars:** **Production deploy** — run `vercel --project=sports` for
preview QA, then `vercel --prod --project=sports`.

**For next intelligence milestone:** **Evidence Vault pre-implementation change proposal** —
write the ADR (`docs/adr/pre-implementation-change-proposal-template.md`), get owner
approval, then Phase 4 can start. This unblocks Phases 4–9 in cascade.

**For visual polish push:** **Brand-token sweep** — aligns all surfaces (new + existing)
to the Galaxy Sports Edge design palette as a single site-wide pass. Recommended only
in a dedicated session because the regression surface spans 1,338+ lines.

**For continued GEO push:** **Fantasy sub-cluster pages** — only after the /fantasy
surface has at least one live data path, to avoid looking further along than the
actual data supports.
