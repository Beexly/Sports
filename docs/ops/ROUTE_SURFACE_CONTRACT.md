# Route Surface Contract — Galaxy Sports Edge

**Generated:** 2026-05-29 · **By:** Claude (Opus 4.8) · **Branch:** `claude/awesome-sagan-LOyCa`
**Scope:** 60 page routes · 48 API routes (verified via `find apps/web/app`).

This contract classifies every surface as **Public**, **Internal** (operator/admin,
auth-gated), or **Protected** (engine logic — never a public route). It is the grounding
inventory the Golden Path Proof, Scorecard, and Release Board reference. Re-generate the
lists with:

```
find apps/web/app -name page.tsx
find apps/web/app/api -name route.ts
```

## Classification rules
- **Public**: indexable, no auth required, must carry trust context (methodology +
  responsible-play reachable, freshness, uncertainty, demo/live labels).
- **Internal**: `/cockpit/*`, `/admin/*`, `/dashboard` — operator/owner tools; must never
  expose protected methodology to public props/bundles.
- **Protected**: scoring weights, thresholds, aggregation, prompt chains, calibration
  internals. Live in `packages/prediction-engine` + server libs; **no public route may
  serialize these to client props, JSON, OG artifacts, or share cards.**

---

## Public page routes (29)

`/` · `/about` · `/blog` · `/blog/[slug]` · `/board` · `/brief` · `/changelog` ·
`/contact` · `/faq` · `/journal` · `/journal/[slug]` · `/ledger` · `/methodology` ·
`/observatory` (stub) · `/performance` · `/performance/losses` · `/performance/losses/[id]` ·
`/picks` · `/press` · `/pricing` · `/privacy` · `/promotions` · `/responsible-play` ·
`/room/[gameId]` · `/terms` · `/vault` (stub) · `/vs/tout-services` · `/auth/signin` ·
`/auth/error`

## Internal page routes (31)

`/dashboard` · `/admin` · `/admin/dashboard` · `/admin/picks` · `/admin/posts` ·
`/admin/users` · `/cockpit` + 24 sub-routes (`/cockpit/agents[/…]`, `/cockpit/api-costs`,
`/cockpit/bot-outbox`, `/cockpit/brief`, `/cockpit/calibration`, `/cockpit/content`,
`/cockpit/history`, `/cockpit/jarvis/trend`, `/cockpit/journal[/…]`, `/cockpit/losses`,
`/cockpit/market-twin`, `/cockpit/media`, `/cockpit/promo-desk`, `/cockpit/promotions[/…]`,
`/cockpit/review`, `/cockpit/sources`, `/cockpit/studio`, `/cockpit/synthetic-monitoring`,
`/cockpit/tasks[/…]`).

## API routes (48)
- **Public data:** `/api/board/state`, `/api/board/passes`, `/api/calibration`,
  `/api/performance`, `/api/picks`, `/api/picks/daily-slate`, `/api/picks/[id]/audit`,
  `/api/brief`, `/api/blog`, `/api/health`, `/api/health/synthetic-monitoring`,
  `/api/room/[gameId]/model-court`.
- **Internal:** `/api/cockpit/*` (29), `/api/admin/*` (3), `/api/dev/state`.
- **Scheduled (cron):** `/api/cron/refresh-odds`, `/api/cron/settle-picks`,
  `/api/cron/jarvis-snapshot`.
- **Commerce/auth/webhooks:** `/api/subscriptions/checkout`, `/api/subscriptions/portal`,
  `/api/webhooks/stripe`, `/api/auth/[...nextauth]`, `/api/promotions`.

---

## Public/Internal/Protected invariants (enforced elsewhere; recorded here)
- Public picks gated by `canExposePublicPicks`; performance stats by
  `canExposePerformanceStats`; featured by `canPromoteFeaturedPicks`; Edge Index by
  `canExposeEdgeIndex` (all default-closed → degrade to bootstrap/stub states).
- Banned public language enforced by `scripts/guardrails/trust-gate.mjs` +
  `apps/web/lib/trust-claims.ts` + brand-safety tests. Forbidden vocabulary is owned by
  that registry — do not duplicate the literal list here.
- Protected engine: `packages/prediction-engine` weights/thresholds never reach public
  props. Anthropic calls confined to `apps/web/lib/claude-api/messages.ts`
  (`claude-api-usage.mjs`).

## Open contract gaps (see GOLDEN_PATH_PROOF.md)
- No dedicated public **Coach**, **Parlay MRI**, **Academy**, or **Autopsy** route
  (mapped to existing surfaces; flagged, not built — owner/Codex to schedule).
- `/observatory` and `/vault` are intentional pre-launch stubs (degrade gracefully).
