# World-Class Redesign — Plan & Session Log

**Date:** 2026-07-23 (updated same day — session 2, cockpit/admin cleanup)
**Scope:** galaxysportsedge.com (this repo). Full site, marketing + product UI.

## 0. Reality check before planning further work

The premise of "redesign the whole site" undersells what's already here. This is
**not** a boilerplate Next.js app that needs a ground-up visual rebuild. It already
has:

- A mature three-tier design-token system (`apps/web/styles/design-tokens.css`,
  mirrored in `tailwind.config.ts`) — primitives → semantic aliases → legacy
  repointed aliases. Six type families, a 4px spacing grid, motion durations,
  full reduced-motion support.
- A distinctive, well-executed brand concept ("cosmic intelligence terminal" —
  Bloomberg Terminal / F1 telemetry / NASA Mission Control reference set),
  documented in `DESIGN.md` and `design-system/README.md`.
- Art-directed, cinematic marketing surfaces: the homepage, `/board`, and
  `/pricing` already use a particle-canvas hero, generated AI atmosphere plates
  (`apps/web/public/immersive/`), and honest degraded/empty states baked into
  the markup — not generic SaaS boilerplate.
- A prior director-level design audit (`BRAND_AND_DESIGN_SYSTEM.md`, 2026-06-01)
  that already did the hard diagnostic work and named the real gap:
  **execution inconsistency between the polished marketing/trust surfaces and
  older product surfaces**, not a missing system or weak brand.

So "make it look world class" is mostly **finish the system's own doctrine
everywhere**, not invent one. That reframing matters for how the rest of this
work should be spent (and for not wasting Higgsfield/token budget re-generating
things that are already good).

## 1. What this session did (verified safe, presentation-only)

The 2026-06-01 audit's P0 item — re-skinning `calibration-panel.tsx` off raw
casino green/red — had **already been fixed** by the time of this session (not
by me; it was done sometime in the last ~7 weeks). Verified: `pick-card.tsx`
and `components/performance/*` are now fully token-clean.

What was still off-token and got fixed this session (customer-facing surfaces
only — no data, copy, or business logic touched):

| File | Fix |
|---|---|
| `components/gsn/waitlist-form.tsx` | red-*/emerald-* → `alert`/`verify` tokens (9 spots) |
| `components/ui/billing-notice-banner.tsx` | amber-* → `caution` token |
| `app/dashboard/page.tsx` | emerald-*/white → `verify`/`carbon` tokens (upgrade-success banner) |
| `components/ui/manage-subscription-button.tsx` | red-400 → `alert` |
| `components/push/push-alert-opt-in.tsx` | red-400 → `alert` |
| `components/pricing/subscribe-button.tsx` | red-800/950/300 → `alert` |
| `app/journal/[slug]/page.tsx` | yellow-300/white → `caution`/`ion-white` |
| `app/picks/page.tsx` | yellow-* (sample-data + paywall banners) → `caution`; purple-* (Elite upsell) → `ultraviolet` |
| `app/blog/[slug]/page.tsx`, `app/blog/page.tsx`, `app/brief/page.tsx` | yellow-400/900 → `caution` |
| `tailwind.config.ts` | dead/drifted `confidence.high` hex (`#FF3BC7`) repointed to match canonical `--conf-elite` plasma (`#FF38C7`); scale confirmed unused in any component before touching it |

Every customer-facing `app/**` and `components/**` file (excluding `cockpit/`
and `admin/`) is now free of raw Tailwind casino-color classes. Verified with:

```
grep -rEn '\b(bg|text|border|...)-(gray|green|yellow|emerald|orange|red|blue-[0-9]|purple|...)-[0-9]' app components --include="*.tsx" | grep -v /cockpit/ | grep -v /admin/
```
→ zero remaining hits outside two flagged exceptions (§2).

## 1b. Session 2 (same day) — cockpit/admin cleanup + the rest of the tail

Session 1 above only swept a narrower hue list (missed `rose`, `orange`, `pink`,
`sky`, `teal`, `fuchsia`, and had a regex bug that silently failed to match
`blue-NNN`/`cyan-NNN` three-digit shades). Session 2 fixed the full 51-file
`cockpit/`+`admin/` surface off every casino hue, **and** went back and found
real misses in already-"finished" customer-facing files:

- `app/picks/page.tsx` — a second Elite-upsell block using raw `blue-*` (now
  `ultraviolet`, matching the one already fixed in session 1), plus a
  cyan/fuchsia dual-accent pick-type selector (now `orbital-cyan`/`plasma`).
- `app/room/[gameId]/page.tsx`, `app/journal/page.tsx`, `app/ledger/page.tsx`,
  `components/cipher/cipher-terminal.tsx` — raw `cyan-*` accent color, now
  `orbital-cyan`.

**Extended `palette-cohesion.test.ts`** (previously gray/slate only) to scan
the full casino-hue list across `app/**`+`components/**`, with an explicit,
commented `ALLOWLIST` for every intentional exception below — so none of this
work can silently regress.

## 2. Explicitly deferred (needs a decision, not a quick swap)

- **`components/players/player-lab-table.tsx`** (8 spots), **`app/intelligence/
  engines/registry.tsx`** (9 spots), and **`components/ui/source-error.tsx`**
  (1 spot) use a deliberate `text-emerald-700` / `text-rose-700` / `text-amber-700`
  / `text-sky-700` "good/bad/warn/info" pairing on the **light/paper** surface,
  with an in-code comment noting they're "paper-darkened for AA on white."
  `DESIGN.md`'s paper scale already has AA-verified `plasma-on-light` /
  `orbital-cyan-on-light` / `ultraviolet-on-light` tokens but **no
  `verify-on-light` / `alert-on-light` / `caution-on-light` equivalent yet**.
  Swapping these needs new tokens picked for AA contrast on `--paper`, not a
  find-and-replace — a real (small) design decision. Recommend: add
  `verify-on-light`/`alert-on-light`/`caution-on-light` to `design-tokens.css` +
  `tailwind.config.ts` (same method as the existing on-light triad), then
  repoint these ~18 spots. All are allowlisted in `palette-cohesion.test.ts`
  with this same rationale.
- **`app/cockpit/api-costs/page.tsx`** budget-status ladder (`green → yellow →
  orange → red → hard_cap`, 5 distinct escalation tiers) — `orange` sits
  between `caution` and `alert` and encodes a real, meaningful tier the token
  system has no slot for. Collapsing it into either neighbor would destroy
  that distinction. Needs a product-owner decision (new `caution-deep`-style
  escalation token, or accept a 4-tier system and merge orange into caution).
  Allowlisted, not fixed.
- **`app/auth/signin/page.tsx`** white background Google button + its ambient
  gradient — left as-is on purpose. White bg is Google's own brand requirement
  for "Sign in with Google" buttons, not a doctrine violation. Allowlisted.
- **`app/cockpit/bot-outbox/page.tsx`** TWITTER/DISCORD channel badges — sky/
  indigo are the platforms' own brand colors, not status semantics. Allowlisted.
- **Governance naming flag from the stale audit** ("resolve GSN vs GSE") turned
  out to be a non-issue on re-check: `lib/brand.ts` already defines `GSN_*` as
  a distinct, intentional brand (Galaxy Sports Network — the newsletter/content
  arm) separate from `BRAND_NAME = "Galaxy Sports Edge"`. No action needed.

## 3. Recommended next phases (for cheaper-model / later sessions)

Ordered by leverage. Each is independently scoped so a different session/model
can pick one up without re-deriving context — read this file + the relevant
`grep` command to re-establish scope.

1. **Add `verify-on-light`/`alert-on-light`/`caution-on-light` tokens, repoint
   `player-lab-table.tsx` + `engines/registry.tsx` + `source-error.tsx`.**
   Small, closes the last real token gap. (~30-45 min)
2. **Decide the API-costs budget-ladder orange tier** (see §2) — a genuine
   design/product call, not engineering work.
3. **Committing the sport-vertical plates (session 3 handoff — 5-minute task).**
   Session 3 audited the existing plates (all fine — the small files are just
   well-compressed dark gradients, no banding) and found the real gap: the
   sport verticals and fantasy suite had NO plate treatment. Four on-brand
   plates were generated with Higgsfield (Soul Cinema, 2048×1152, 16:9) and
   the pages are already wired gradient-first (zero-risk: they render their
   gradients until the stills are committed). The renders live in the owner's
   Higgsfield library — this sandbox's network policy blocks the Higgsfield
   CDN, so they could not be downloaded here. To finish from any machine with
   normal egress:

   | Manifest id (already wired) | Page | Higgsfield still job id | Higgsfield motion job id |
   |---|---|---|---|
   | `nflverse-gridiron` | /nflverse | `895d7eaf-6e5d-4b2b-927d-4f5eb2edbe12` | attempted, timed out client-side before the daily video quota hit — check the Higgsfield library for whether it finished server-side; if not, regenerate (image-to-video, `kling3_0_turbo`, `start_image` = the still job id above) once quota resets |
   | `nhl-icefield` | /nhl | `d2e23623-25a2-476c-9f61-38035b4b9d24` | same as above — attempted, unconfirmed |
   | `mlb-diamond` | /mlb | `b57c8530-eb7f-4274-995a-6a0e5e8346a0` | not generated — hit `grace_daily_limit_reached` on this one |
   | `fantasy-constellation` | /fantasy | `f6ad9d93-95e9-4d21-8bcc-d9282de709ba` | **done** — `33cf956e-eb5e-44c6-982b-903471038fed` (5s, 720p, kling3_0_turbo, subtle ambient drift, silent loop) |

   Steps: download each still PNG (and the one completed motion MP4) from the
   Higgsfield library → convert the still
   (`npx sharp-cli -i in.png -o out.webp --format webp --quality 72`) →
   commit as `apps/web/public/immersive/<manifest-id>.webp` (and
   `<manifest-id>.mp4` for the fantasy one, already generated) → add
   `still: "/immersive/<manifest-id>.webp"` (+ `motion: "/immersive/<manifest-id>.mp4"`
   for fantasy) to that id's entry in `apps/web/lib/visual-production/asset-manifest.ts`.
   Nothing else to touch. Session 4 hit Higgsfield's free-tier daily video-
   generation cap after 1 clip — regenerate the other 3 motion plates once
   the quota resets (same prompts/start-image pattern, documented above).

4. **Asset refresh via Higgsfield** (now free, all models/tools) — this is
   genuinely additive, not a rebuild:
   - Audit `lib/visual-production/asset-manifest.ts` for any plate marked
     stale/placeholder/lowest-tier and regenerate at higher quality.
   - Sport/data-vertical pages (`/nflverse`, `/nhl`, `/mlb`, `/players/*`) and
     the fantasy suite (`/fantasy/*`) were not in the original audit's file
     sample — worth a quick screenshot pass to check they hit the same bar as
     home/board/pricing before spending generation budget there.
   - **Guardrail:** Higgsfield is for generating *presentation* assets (hero
     art, atmosphere plates, illustrations, video) that get committed into this
     repo — never for its own hosting/deploy tools. This repo's CI/CD and this
     git branch are the only deploy path per the platform's operating rules.
   - **Guardrail:** any AI-written copy (blog, journal, marketing) must stay
     inside `CLAUDE.md`'s non-negotiables — no fabricated stats, no invented
     win rates or testimonials, brand-voice banned-word list in `lib/brand.ts:225-233`
     still applies. Content generation is copy/structure only; numbers still
     come from `loadPublicCalibrationReport()` / real data, never from the model.
5. **P3 items from the 2026-06-01 audit** still open and low-risk: extract a
   shared `<CalibrationViz>` (dedupe the homepage curve vs. `/performance`
   panel), document the dark-only-mode decision as an ADR, floor any remaining
   11px `ion-2` meta text to `ion-1` for AA.

## 4. What NOT to touch without a product decision

Per `CLAUDE.md` non-negotiables and this session's read of the codebase:
`loadBoardState`, `loadPublicCalibrationReport`, entitlement/feature-gate logic
(`lib/pricing/feature-gates.ts`), and anything that computes a confidence score,
win rate, or CLV number. Visual/layout changes only — never touch what data is
fetched, how it's computed, or how paywalls gate.
