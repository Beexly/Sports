# Codex pickup — Evidence Audit Drawer + interactive galaxy + hardening polish

**Author:** Claude (in cowork sandbox), 2026-05-21
**Working tree:** `C:\Users\Garrett\Documents\Claude\Projects\AI Sports`
**Prior handoffs:** `CODEX_HANDOFF_2.md`, `CODEX_FINAL.md`, `V6_HANDOFF.md`, `CLAUDE_PICKUP.md`.

This is an ambitious pass. Garrett asked for "the best and most intelligent engine/website of 2026" — pushed limits while keeping the integrity rails. Nothing has been deployed; everything is on disk, ready for you to validate + ship.

---

## What changed on disk

### 1) Evidence Audit Drawer — new public feature

The single biggest move: every public pick card now has a **View evidence** button. Click it and a right-anchored drawer opens with the pick's forensic chain — SourceSnapshot list with payload hashes, signal-category topology (LIVE / SHADOW / ABSENT), pick lineage with confidence at scoring + line movement delta + model version, and the gates that were active when the pick was made. Tier-gated server-side: FREE sees counts + topology (drives upgrade), PRO/ELITE sees the full chain.

This locks "Evidence first" from homepage tagline into product behavior. Bloomberg-grade transparency.

Files added:
- `apps/web/app/api/picks/[id]/audit/route.ts` — tier-gated JSON endpoint. Fails closed on `canExposePublicPicks=false` (503), bootstrap picks (404), unpublished picks (404). Bounded SourceSnapshot lookup (take: 25). Never returns raw payload data — only hash prefix + byte count.
- `apps/web/components/picks/evidence-audit-drawer.tsx` — client component. Slide-in drawer, on-brand cinematic styling, focus trap, Escape-to-close, body-scroll lock, reduced-motion-aware animations. No server-only imports; no Kelly/stake/EV references (pinned by test below).
- `apps/web/__tests__/audit-drawer-shape.test.ts` — new brand-safety test. Pins: no banned terms in drawer, no raw payload selection in route, tier branching is present, failure modes (503/404) are exercised, hash truncation is enforced.

Files modified:
- `packages/types/src/index.ts` — added `AuditPayload` union (`AuditPayloadSummary` for FREE, `AuditPayloadDetailed` for PRO/ELITE) plus helper row types.
- `apps/web/components/picks/pick-card.tsx` — imports + renders `<EvidenceAuditDrawer pickId={pick.id} />` at the bottom of every card.
- `apps/web/package.json` — added `__tests__/audit-drawer-shape.test.ts` to the `test:brand-safety` script.

### 2) Interactive galaxy — major upgrade

The hero galaxy is significantly more alive. Same pure-2D-canvas approach (no Three.js — that decision held), but now with:
- Mouse parallax: the whole orbital system drifts toward the cursor up to ~12px with low-pass-filtered easing
- Cursor attractor: nearby particles drift toward the mouse with a soft falloff
- Three depth tiers with 60–160 particles (scaled to viewport area), per-depth parallax response, near-tier twinkle
- Constellation lines between near neighbors that fade by distance
- Three concurrent orbits (UV/cyan/white) at different speeds with their own travelers
- Evidence nodes that ripple when the primary traveler passes them
- Three faint nebula clouds at deepest tier for painterly haze
- DPR support up to 3× for HiDPI crispness

Reduced-motion fallback still renders a beautiful static composition — orbits + particle field at rest + labeled nodes — no animation loop.

File modified:
- `apps/web/components/hero/interactive-galaxy.tsx` — complete rewrite of the draw loop and state. Backward compatible at the import site (same export, same JSX surface).

### 3) Cron schedule + auth (from CLAUDE_PICKUP)

- `vercel.json` — added `crons` array (`/api/cron/refresh-odds` every 30m, `/api/cron/settle-picks` every 15m, `/api/cron/jarvis-snapshot` hourly).
- Verified each cron route fails closed on missing/mismatched `CRON_SECRET`.

### 4) Front-end hardening polish

- `apps/web/app/error.tsx` — production now shows the Next.js error `digest` correlation id only (not the raw message). Dev still shows full message. No stack traces ever surfaced.
- `docs/launch-qa-addendum.md` §10 — added "Front-End hardening polish" section with the items from the Front-End Checklist that weren't already covered.

### 5) Neon serverless driver — feature-flagged scaffold

- `packages/db/src/neon-serverless-adapter.ts` — new helper module, NOT imported anywhere yet. Uses dynamic `import()` for `@neondatabase/serverless` + `@prisma/adapter-neon` so the absent deps don't break the build. Activation steps in the file header and `docs/launch-prep/post-launch-neon-serverless-swap.md`.

### 6) Anthropic key rotation helper (from earlier)

- `scripts/rotate-anthropic-key.mjs` — verifies a new key with a 1-token ping, writes it to `.env.production.local`, and optionally disables the old key via the Admin API.

### 7) Triage + memory

- `docs/uploaded-zip-triage-2026-05-21.md` — full verdict on the 29 reference zips Garrett uploaded. Most flagged as off-domain, three flagged as integrity/legal risks (do not extract). Two integrity-safe items applied (front-end checklist append, Neon serverless docs).

---

## Run these in order — STOP and report at any failure

### Step 1 — Sanity check the diff
```
cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"
git status
git diff --stat
```

Expected new files:
- `apps/web/app/api/picks/[id]/audit/route.ts`
- `apps/web/components/picks/evidence-audit-drawer.tsx`
- `apps/web/__tests__/audit-drawer-shape.test.ts`
- `packages/db/src/neon-serverless-adapter.ts`
- `scripts/rotate-anthropic-key.mjs`
- `docs/uploaded-zip-triage-2026-05-21.md`
- `docs/launch-prep/post-launch-neon-serverless-swap.md`
- `CLAUDE_PICKUP.md`, `CODEX_PICKUP_V2.md` (this file)

Expected modified files:
- `packages/types/src/index.ts`
- `apps/web/components/picks/pick-card.tsx`
- `apps/web/components/hero/interactive-galaxy.tsx`
- `apps/web/app/error.tsx`
- `apps/web/package.json`
- `vercel.json`
- `docs/launch-qa-addendum.md`

### Step 2 — Install + typecheck + tests + build
```
npm install
npm run db:generate
npm run typecheck
npm run lint
npm run test:brand-safety --workspace=apps/web
npm run test --workspace=apps/web
npm run build
```

All MUST pass. If `npm run test` surfaces unrelated debt (cockpit/runbook/seed.ts), document but do not let it block the launch — those failures predate this pass.

### Step 3 — Visual verification of the new drawer
- Run `npm run dev`.
- Visit `http://localhost:3000/picks` (or `/dashboard` when signed in).
- Click "View evidence" on a pick card.
- Verify FREE tier shows the summary view; PRO/ELITE (use `DEV_FAKE_ADMIN=true`) shows the detailed view.
- Verify Escape closes the drawer, body scroll is locked while open, focus lands on the close button.

### Step 4 — Visual verification of the galaxy
- On the homepage, move the cursor around the hero. The orbital system should drift toward the cursor. Particles should respond visibly within their depth tier.
- Enable "Reduce motion" in OS accessibility settings, hard-refresh. The galaxy should render statically with the same composition.

### Step 5 — Credentials + deploy (still required)
Per `CLAUDE_PICKUP.md`, these are unchanged:
- Create Neon Postgres in us-east-1; set `DATABASE_URL` (pooled) + `DIRECT_URL` (direct).
- Create Upstash Redis; set `REDIS_URL`.
- Rotate Anthropic key (or use `scripts/rotate-anthropic-key.mjs` once new key is minted).
- `vercel.cmd env add` each of those to Production.
- `npm.cmd run deploy:ready` — must show all green.
- `npm.cmd run db:push` — additive, safe.
- Trigger one ingestion cycle, confirm `IngestionRun` + `SourceSnapshot` rows are written.
- `vercel.cmd --prod --yes --no-clipboard --scope pick-pilot-s-projects`.
- `npm.cmd run smoke:prod -- --url=https://galaxysportsedge.com`.

### Step 6 — Post-deploy smoke for the new feature
- `curl -i https://galaxysportsedge.com/api/picks/<some-real-pick-id>/audit` — expect either 200 with `{ success: true, audit: { tier: "FREE", ... } }` (no session) or 503 if `canExposePublicPicks` is still off.
- Open the homepage in a clean browser, click any pick's "View evidence" button. Drawer renders with no console errors.

---

## Decisions worth knowing

1. **Why no big-bang Neon driver swap** — the existing `pg` driver works. The serverless driver is a cold-start perf optimization specific to Vercel/edge. Adding required deps blindly would have risked breaking your build before you could test against a real DB. Scaffold is staged; flip on with one env var + one `npm install` post-launch.

2. **Why the drawer surfaces hash prefixes, not raw payloads** — the entire point of the audit is verifiability; an SHA-256 prefix + byte count is sufficient to prove a payload exists without exposing the bytes (which would be a real intel leak for paid tiers' work). Operators can grep the full hash server-side from the DB if they need to verify.

3. **Why the drawer is visible to FREE tier** — it's the upgrade CTA done right. The audit proves the engine is more honest than competitors before asking for money.

4. **Why I didn't merge browser-use / FotMob scraper / SaaS templates** — license issues (FotMob is unauthorized scraping; AGPL in inbox-zero is wrong for commercial), wrong domain (most SaaS templates), or wrong stack era (Bootstrap UIs). See `docs/uploaded-zip-triage-2026-05-21.md`.

5. **One repo was flagged as suspected malware** — `Stake-All-Games-Predictor-Latest-main.zip`. Random PHP filenames, obscured workflow, ASCII-art README only, name designed to draw clicks. Do not extract or execute. Delete when convenient.

---

## What's still on me, in the queue

- After deploy is green, I'd write the **Galaxy IQ Brief** feature — a Haiku-generated per-game brief surfaced as a Pro/Elite premium card, source-attributed to the SourceSnapshot timestamps. This is the next "best of 2026" lever.
- I'd also build a **command palette** (`cmd-K`) — Pinpoint-quality keyboard nav across every page. Distinguishes a paid intelligence platform from a tip sheet.
- And a **personalized watchlist** — pin teams/markets, see edges that touch them first. The hook that turns one-time visitors into daily returners.

These are sketched in my head, not in the repo. When you finish the deploy chain, ping me and we'll pick the next one.
