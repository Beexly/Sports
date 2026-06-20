# Flagship 2026 — Revision R2 Progress Report (Concision-First)

> Governing law for R2: **Concise is intelligent. The data is the intelligence — layout, aesthetic, and restraint carry the authority, not volume of words and sections.** Every surface answers "what can we remove or merge" first.

Branch: `claude/blissful-hamilton-d7edx1` (off `design/2026-flagship`). All gates green per step: `typecheck + lint + test + build`.

## Why R2 exists

The owner reviewed the first preview and the verdict was blunt — "the whole website is too convoluted… still nowhere near what I'm asking for." The earlier effort shipped docs + the logo + a nav pass, but the **product itself was never rebuilt**. R2 re-points the work at subtraction and ships the actual surfaces.

## What shipped (each its own commit)

| # | Change | What the owner asked | Status |
|---|---|---|---|
| R2-1 | **One hype cold-open** | "Intro looks like shit — make it HYPE (2009 CoD montage)" | ✅ |
| R2-2 | **Home: ~14 blocks → 6** | "Front page has insanely much info — nobody knows what to do" | ✅ |
| R2-3 | **Nav condensed + Proof its own door** | "Condense Players/Intelligence/Fantasy; move the Proof Room out" | ✅ |
| R2-4 | **The Beat → cinematic broadcast (Nova)** | "The Beat looks the exact same — nothing happened" | ✅ |
| R2-5 | **Nova explainer guide on every page** | "Put a video on every page explaining how to use it, with our reporters" | ✅ |
| R2-6 | **Players: one lab, lenses grouped** | "Just have the player tab… we don't need all 11" | ✅ |

### R2-1 · One hype cold-open
The "2009 CoD montage" the owner wanted **already existed** (`MontageEntrance`) but was buried in front of a slow 15.6s doctrine intro and the owner was reacting to that slow one. Retired the slow intro; promoted the montage to the **sole** front door — now ~3.6s over a real motion bed (`home-hero-cosmos.mp4`), climaxing on the brand mark + "We detect. You decide." Removed the fabricated HUD stats ("TRUST SCORE 96.4%"). Reduced-motion → instant; one Skip; once per session.

### R2-2 · Home radical concision
Cut from ~14 stacked blocks to **6**: cold-open → clean hero (thesis + two CTAs) → **4-door Signal Map** (Board · Players · Intelligence · Fantasy & Daily, each with one *live, real-sourced* number) → the one "two readings" teaching beat → No-Bet beat → one proof strip → responsible close. The relocated chapters (Galaxy Twin, Market Mirage, Decision Autopsy, Parlay MRI, Cost of Noise, Receipts, the telemetry card, the live ribbon) already live on their dedicated pages — nothing was lost, the front door just stopped shouting. Every number derives from a real loader with honest fallbacks.

### R2-3 · Nav condensed + Proof relocated
Players collapses to a **single door** (its 11 lenses are in-page now). Intelligence drops the 5-item Proof Room sub-group → it's just the engine room. Fantasy & Daily trims to the live, hand-in-hand tools. **Proof** is pulled out of Intelligence into its **own door** → a new branded hub at **`/calibration`** ("The Proof Room · Galaxy Calibration") gathering calibration, CLV, the trust ledger, proof of record, accountability, and the CLV tracker. Mobile mirrors it exactly. No routes deleted (no dead links).

### R2-4 · The Beat → broadcast
The Beat now opens with **GalaxyBroadcast**: Nova reports the week's top signals on location with a broadcast lower-third, teleprompter, and segment rundown, over a cinematic motion backdrop. The graded impact feed is preserved below as **"The Signal Ledger."** Built entirely on the existing Nova persona + `buildBroadcast()` script engine — **no paid generation**. Nova stays a stylized mark (never a photoreal face); the synthetic-presenter disclosure is always on screen.

### R2-5 · Nova explainer on every page
A reusable, auto-mounted guide: an unobtrusive "How this page works · 0:40" pill appears only where a registry entry exists (home, board, players, intelligence, proof, fantasy, the beat). Clicking opens an accessible modal where Nova steps you through the surface one captioned beat at a time. **Code-native — zero spend, reduced-motion safe, nothing autoplays.** When a real Nova video is produced + approved, drop its asset id and it's preferred, with these beats as the permanent fallback.

### R2-6 · Players — one lab, lenses grouped
Replaced the flat 11-tab strip with a grouped lens rail: **Player Lab** and **Edge Signals** lead as prominent buttons; the nine deeper views are labeled lens groups (Usage · Advanced · Status & market). Same URL model, no data regression. Trend Lab is re-surfaced here as a sibling lab.

## Pending (next in this revision)

- **R2-7** — Intelligence + Fantasy & Daily in-page concision; place Market Mirage / Parlay MRI / Cost of Noise as education on Intelligence.
- **R2-8** — Site-wide subtraction sweep (Board, House, Observatory, Pricing, Academy, cockpit).
- **R2-5 redirects** — full content consolidation + redirects from the legacy proof routes into `/calibration`.
- **Higgsfield (deferred, needs approval)** — real Nova broadcast/intro/explainer video; everything has a code-native fallback so nothing breaks if it never runs.

## What needs the owner's eyes (visual approval)

1. The cold-open energy (is the montage the right kind of HYPE, or push further?).
2. The 4-door Signal Map as the home's spine.
3. The Beat broadcast treatment (Nova lower-third + teleprompter).
4. The Nova explainer pill placement (bottom-left) and tone.

## Verify it yourself

- Home `/` — one cold-open, then a calm, six-block page.
- `/the-beat` — the broadcast up top, the ledger below.
- Any page — the bottom-left "How this page works" pill.
- `/calibration` — the new Proof door.
- `/players` — grouped lenses, not 11 tabs.
