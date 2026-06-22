# GSE 2026 — Universal Decision Intelligence: Handoff

Implementation-ready handoff for the next agent. Everything below is verified state, not aspiration.

## TL;DR

A new, coherent decision-intelligence layer landed at `apps/web/lib/gse/*` (12 typed modules) with
51 passing tests, 10 internal cockpit browse-pages, and 16 research docs. The whole app typechecks
(`tsc --noEmit` exit 0), lints clean (`--max-warnings=0`), and the brand-safety (2113) + cockpit
(259) suites stay green. Nothing public changed; nothing claims to be live that isn't.

## Current Intelligence Architecture Map

| System | Current state | Data used | Trust state | Public/Internal | Gap | Next action |
|---|---|---|---|---|---|---|
| Data Excellence | Contracts + scorers shipped | none (pure) | honest (illustrative labeled) | internal | not wired to ingestion | feed `scoreDataQuality` from the real pipeline |
| Decision Ontology | 53 entities + edges (contract) | none | conceptual | internal | not mapped to Prisma | reconcile ~15 live entities first |
| Evidence Engine | Scorers + 10 templates + verdict | none | honest | internal→dashboard | generalizes courtroom, not wired | back `/today` Signal Courtroom with it |
| Claim Safety | Gate + rights-risk shipped | reuses trust-claims + scraping registry | enforced | internal (guards public) | not yet called pre-render everywhere | call before any public claim renders |
| Cognitive Model | Modes + commands + 2 scorers | none | honest | internal | needs real user data | instrument decision history (consented) |
| Jarvis Copilot | 13 mode contracts + readiness | none | honest | internal | formalizes `lib/jarvis`, not merged | map contracts onto live Jarvis |
| Memory Policy | 6 policies + usefulness scorer | none | enforced-by-design | internal | not enforced at write time | enforce policy in the real memory store |
| Agent Orchestration | 23 roles + 6 objects + trust | none | earned-not-declared | internal | no live runs | stand up 5 core agents |
| Revenue OS | Funnel + readiness + copy lib | reuses pricing-phases | trust-gated | internal | no live funnel data | wire funnel events |
| Product OS | Opportunity/launch/moat/roadmap | none | honest | internal | manual inputs | feed real idea backlog |
| Page Intelligence | 21 page contracts + scorer | none | honest | internal | declared, not measured live | emit contract fields from real pages |
| Scoring Core | 20-system registry + primitive | none | honest | mixed | — | done; extend as systems grow |

## File ledger

**New typed contracts (`apps/web/lib/gse/`, ~4,250 LOC incl. tests):**
`gse-scoring-systems.ts`, `data-excellence.ts`, `decision-ontology.ts`, `evidence-engine.ts`,
`claim-safety.ts`, `cognitive-operating-model.ts`, `jarvis-decision-copilot.ts`, `memory-policy.ts`,
`agent-orchestration.ts`, `revenue-intelligence-os.ts`, `product-operating-system.ts`,
`thinking-page-contracts.ts`, `index.ts` (barrel), `gse-contracts.test.ts` (51 tests).

**New cockpit pages (`apps/web/app/cockpit/`):** `_gse/shell.tsx` (shared, private folder),
`decision-os/`, `data-excellence/`, `decision-graph/`, `evidence-engine/`, `jarvis-os/`, `agents-os/`,
`revenue-os/`, `product-os/`, `page-intelligence/`, `claim-safety/`. Modified: `cockpit/layout.tsx`
(added the "Decision OS" nav section — required by the nav-coverage test).

**New docs (`docs/research/`):** 16 `GSE_2026_*.md` + `_overnight/UNIVERSAL_DECISION_LAB_SESSION_LOG.md`.

## How to extend safely

1. **Add a scoring system:** append a `ScoringSystemSpec` to `GSE_SCORING_SYSTEMS`, implement a
   `scoreX(): GseScore` via `makeScore`, add a test. Keep one-way dependency on `gse-scoring-systems`.
2. **Add a cockpit page:** create `app/cockpit/<name>/page.tsx` (pure, DB-free, use `_gse/shell`),
   then add its `href` to `NAV` in `layout.tsx` or the nav-coverage test fails. Use `next/link` for
   internal links.
3. **Add a page contract:** append to `PAGE_CONTRACTS`; its `jarvisMode` must be a real `JARVIS_MODES`
   id (tested).
4. **Never** re-implement the banned-phrase list — import `scanForBannedPhrases` from `lib/trust-claims`.
   **Never** add evasion to any contract here.

## Verification commands (all currently pass)

```
npm run typecheck --workspace=apps/web          # tsc --noEmit, exit 0
npx vitest run lib/gse/gse-contracts.test.ts    # 51 passed
npm run test:brand-safety --workspace=apps/web  # 2113 passed
npm run test:cockpit --workspace=apps/web       # 259 passed
npx eslint lib/gse app/cockpit/_gse ... --max-warnings=0   # clean
```

Note: a fresh clone needs `npm install` and `npm run db:generate` first — without the generated
Prisma client, unrelated files report type errors (no GSE file is affected).

## Open items for the owner (only if they choose)

- Reconcile the Free-tier description drift between `lib/pricing/value-architecture.ts` and CLAUDE.md
  (pre-existing; not touched this sprint).
- Decide which 5 agents and ~15 ontology entities form the live V1 (see red-team review).
