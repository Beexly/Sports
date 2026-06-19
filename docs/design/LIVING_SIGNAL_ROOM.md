# The Living Signal Room — GSE creative direction (2026)

> **Thesis:** the best sports-intelligence site of 2026 does not show you a *picture*
> of an intelligence room. **It is the instrument.** Galaxy draws its own pipeline,
> live, from real state — honest when empty, alive when it isn't, impossible to
> screenshot-copy because it is reactive.

This doc is the creative source of truth. It extends the "Signal Room" handoff and
makes one decisive call the handoff did not: **how** the room reaches the screen.

---

## 1. The leap (what makes it best-of-2026, not just pretty)

The handoff proposed generating cinematic hero images (Higgsfield) and laying them
across the site. That was the right *feeling*, the wrong *medium* for 2026:

- **AI-rendered hero images are commoditised.** By 2026 every premium SaaS front door
  is a dark nebula render. It reads as "AI slop," ages in months, and anyone can
  screenshot it. It is not a moat.
- **The brand brief is already a code brief.** "Show intelligence through structure,
  not words." "All systems visually connect." "Signal lines move with purpose." That
  is a *live instrument*, not a still frame.
- **The honest, un-copyable, $0 path wins.** Render the room **in the browser from the
  real pipeline**. It moves only when real rows move; it sits at rest when the board is
  empty. You cannot fake it, cannot screenshot its truth, and it costs nothing to run.

**Rule:** generated imagery is *reference and texture*, never the identity. The identity
is code-native, data-driven, and reduced-motion safe.

---

## 2. Token correction (the handoff drifted — fix before you paint)

The handoff's palette listed **"amber = risk."** In this repo amber is **deprecated**:
`--amber` auto-redirects to `--ion-blue` (cyan). Authoring amber risk markers would be
off-brand. The real semantics (`apps/web/styles/design-tokens.css`):

| Intent | Token | Hex |
|---|---|---|
| Verified signal / cleared | `--orbital-cyan` | `#00E5FF` |
| Contradiction / held / stopped | `--plasma` (ion magenta) | `#FF2DD6` |
| Depth / weak signal / intake | `--ultraviolet` | `#7A5CFF` |
| Incomplete data / review | `--caution` | `#FFB454` |
| Critical alert (rare) | `--alert` | `#FF6470` |
| Precision text | `--ion-white` | `#F6F7FA` |
| Control / canvas | `--obsidian` | `#050608` |

No casino green. No rainbow. No cheap neon. Amber is never authored anew.

---

## 3. Shipped — the Signal Room (homepage centerpiece)

Section `00.5` on `/`, between the hero and chapter 01. Files:
`lib/signal-room/scene.ts` (pure model) + `components/home/signal-room.tsx` (renderer)
+ `__tests__/signal-room.test.ts`.

The instrument: **source mesh → evidence → decision core → no-bet gate → board**, with
**market gravity** above the core and the **calibration ring** below it. It is wired to
the *same* loader values as the hero board card (`scoringNow`, `publishedToday`,
`gatedTodayRows`, `calibration.sampleSize`).

**Honesty is structural, not a caption:**
- The scene is a **pure function of real counts.** Signals only move in "active" mode
  (real live rows). An empty board → "quiet" mode: stations glow faintly (they exist),
  but nothing is in flight and the gate is at rest. *Restraint made literal.*
- Visible flow is capped for legibility; the **real count is preserved** for labels.
- The calibration ring fills to the public sample (`/30`) and only reads "ready" at the
  floor — it never implies a record it hasn't earned.

**Discipline (non-negotiable for every motion surface):** `prefers-reduced-motion` →
one static, meaningful frame; `IntersectionObserver` → animate only on screen;
`devicePixelRatio`-aware; full cleanup on unmount; canvas `aria-hidden` with the honest
summary exposed as text + a decoded colour legend.

---

## 4. The elevated system — roadmap (each slice honest, code-native, green-gated)

1. **Signal Room — homepage centerpiece.** ✅ Shipped.
2. **Parametric room atmospheres.** Replace static `GeneratedPlate` stills with a
   code-native atmosphere primitive each room *tunes* (War Room = pressure, Film Room =
   focus, Observatory = field, No-Bet gate = stillness). Additive + flag-guarded; the
   existing plates stay as fallback until each room's field is proven.
3. **Live status sigil.** A compact instrument (the Signal Room distilled to a glyph)
   that reads real state — a recurring identity mark for section seams / share cards.
4. **Motion identity.** Signal-line section transitions (a conduit "carries" you between
   chapters), all reduced-motion safe, all token-coloured.
5. **Code-native OG/share generation.** Programmatic share images from real state via the
   existing OG route pattern — **no paid image generation**.
6. **Audio identity — DEFERRED (spec only).** No browser in CI to verify; autoplayed
   audio is a UX anti-pattern. Specify ambient beds + UI ticks; wire only behind an
   explicit, muted-by-default opt-in in a browser session.

---

## 5. Invariants

- **No fabricated state, ever.** Motion implies real activity; quiet implies none. Honest
  empty states over decoration.
- **No paid spend.** `OWNER_VISUAL_SPEND_APPROVED` is off. Do not fire new generation
  jobs. Already-generated handoff assets are sunk-cost *reference* only — the identity
  must not depend on them.
- **No new runtime dependency** for visuals (canvas/SVG/CSS native). No WebGL framework
  added; existing shaders stay as-is.
- **Reduced-motion + a11y first.** Every animated surface degrades to a static frame and
  exposes honest text.
- **Green gate before every commit:** `tsc` · `vitest` · `trust-gate` · `model-freeze` ·
  `next build`.
- **No weakening** of trust, responsible-gaming, rights, or owner-approval posture.
