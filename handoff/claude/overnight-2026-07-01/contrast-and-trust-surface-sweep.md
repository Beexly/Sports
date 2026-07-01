# Contrast + trust-surface sweep — proof report

**Branch:** `claude/launch-review-fixes` · **Owner-merge-gated** (nothing pushed, no live gates touched)
**Scope:** the shared data-kit dark-surface bug class + trust-surface color hygiene on public pages.

This continues the launched-app review. Method throughout: **verify against the
actual code/render surface, never assume** — including proving one flagged
finding was *not* a real bug.

---

## 1. Shared data-kit was not dark-surface-aware (REAL bug — fixed)

Two consolidated pages render on the dark cosmic surface (`bg-carbon`) but the
shared kit only had a light "paper" surface:

- **`/players`** (`PlayerLabTable`): the component already passed dark identifier
  tokens (`text-ion-white`) while its `DataTable` rendered a **white** paper
  surface — white-on-white, **~1.07:1**. Its tone/badge cells (buy/sell, injury,
  DFS agreement) were hardcoded to paper `emerald-700/rose-700/amber` (~2:1 on
  eclipse).
- **`/intelligence/engines`** (`EngineView`): painted paper ink on the dark page.
  The section `<h2>` was `text-ink` **#0E1320** on carbon **#0D1117** =
  **~1.05:1 — invisible black-on-black**, with white data-cards floating on dark.

### Fix (commit `dfd5fc29`)
- `lib/intelligence/colors.ts` — `toneClass` / `toneRowClass` and the
  buySell/consensus/confidence/lift/hitRate/signed wrappers take an optional
  `variant` (`"paper"` default, so all ~14 existing paper board callers are
  untouched). Dark → `verify`/`alert` text + `bg-verify/10` / `bg-alert/10` row
  tints (instead of the glaring `bg-emerald-50` pastel on dark).
- `components/ui/data-table.tsx` — row-tint now threads `variant`.
- `components/ui/kpi-card.tsx` — toned value now follows the surface (was paper
  tone on a dark card even when `variant="dark"`).
- `components/players/player-lab-table.tsx` — `TABLE_TOKENS` gains variant-aware
  `good/bad/warn` + status-badge tokens; every tone site routes through them.
- `components/intelligence/engine-view.tsx` — full paper→dark token conversion,
  dark-bound `tc/sc/hc/lc` aliases, `variant="dark"` on every DataTable / KpiCard
  / SourceError.
- `app/players/page.tsx`, `app/intelligence/engines/page.tsx` — `SourceError`
  error-state was rendering as a light card on the dark page; now `variant="dark"`.

**Bug-class swept clean:** the shared `@/components/ui/data-table` has exactly two
consumers (both fixed); `KpiCard`/`SourceError` have three usages total (all
fixed). A repo grep for paper tokens (`text-ink`, `-on-light`, `paper-*`) outside
the kit's own `paper` variant branches is clean except registry prose (below).

## 2. Registry explainer prose used paper accents on the dark page (REAL — fixed)

`app/intelligence/engines/registry.tsx` — 4× `text-orbital-cyan-on-light`
(#06748A, ~2.4:1) inside `explainer.definition` fields (render via
`MetricExplainer variant="dark"`) and 1× `text-ink` (#0E1320) inside a
`description` (renders via `PageHero variant="dark"`). Both components are only
ever used with `variant="dark"`, so these inline overrides were unconditionally
low-contrast. → `text-orbital-cyan` / `text-ion-white`.

## 3. Trust-surface color hygiene (fixed)

- `lib/utils.ts` `confidenceLabel()` returned raw Tailwind
  `green-600/blue-600/yellow-600/gray-500`. Its `.color` field is **currently
  consumed nowhere** (only `.label` is used) — a latent casino-color landmine, not
  a live bug. Modernized to `verify / orbital-cyan / caution / ion-2` so it's
  correct-by-construction if ever wired up.
- `app/picks/page.tsx` fetch-error card + `app/auth/{signin,error}` error states
  used raw `red-*`. These are semantically-correct *error* states (not casino
  loss-red), but now use the `alert` token to match the board's other error
  banners. WIN=`orbital-cyan` / LOSS=`alert` on the actual pick surfaces was
  already handled in an earlier batch.

## 4. Verified NOT a bug (flagged as suspected fake-freshness)

`lib/board/state.ts:341` stamps `lastRefresh: now` in the DB-error `catch` branch.
Traced the consumer: `app/board/page.tsx` renders a prominent **"Data store
unreachable"** alert banner (lines 58–67) + the `BoardHealthBadge` (carrying
`meta.dataError="DB_UNREACHABLE"`) + all-zero counts whenever that branch fires.
The failure is surfaced honestly; the timestamp is response-generation time, not
masked freshness. **No change made** — nulling it would ripple the type for zero
trust gain. (All four `lastRefresh` stamps are legitimate: demo/stale-suppressed,
bootstrap success, normal success, and this honestly-flagged error path.)

---

## Validation
- `tsc --noEmit` (apps/web) — clean across every step.
- `scripts/guardrails/trust-gate.mjs` — clean (1058 files, no banned phrases).
- Unit: `colors.test.ts` (+ new dark-variant regression block) & `data-table.test.ts`.

## Left for the founder (genuinely human-gated / judgment)
- Sub-12px fonts: many are intentional mono eyebrows — needs per-instance design
  judgment, not a blanket enlarge.
- `noindex` on thin SEO pages: which pages count as "thin" is a product/SEO call.
- Internal `/cockpit/*` & `/admin/*` green/red status coding: conventional and
  appropriate for internal tooling; intentionally left as-is.
