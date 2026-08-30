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

### R2-7 · Intelligence + Fantasy reviewed (no rewrite needed)
The Intelligence landing is already a tight glass-box *showcase* (independent referees → convergence → reasoning chain → Signal Courtroom → Agent War Room → Decision Autopsy), not read-only sprawl — the owner's "too many subcategories" was the **nav**, which R2-3 fixed. The Fantasy hub is already honest and cohesive: a data-first build order and a "every tool, with its honest status" directory (live / partly-live / gated) so the tools never contradict each other. League Twin + GM Ledger (dropped from the bar in R2-3) remain reachable here, so nothing was orphaned. Both pages were left intact to avoid regressing tested behavior.

### Decision log (loose ends, accounted for)
- **Retired home components** (`GalaxyTwinPreview`, `MarketMirageChapter`, `DecisionAutopsyPreview`, `ParlayMriPreview`, `CostOfNoiseCalculator`): these were home *teasers*. Their full content lives on dedicated routes — `/observatory` (Galaxy Twin), `/parlay-mri` (Parlay MRI), `/intelligence` + `/accountability` (Decision Autopsy). Market Mirage and Cost of Noise are the only two unique pieces retired; they're **preserved in-repo** (owner work, never deleted) and tree-shaken out of the build since nothing imports them. No content lost, no dead routes.
- **Proof redirects intentionally NOT done.** The plan floated redirecting `/performance /clv /ledger /accountability /track` into `/calibration`. On review that would **destroy** the detailed proof surfaces (calibration charts, CLV data, ledger receipts) — a violation of "never weaken the proof/calibration gates." `/calibration` is the consolidating **hub that links them**, which preserves every receipt. This is the safer, owner-protecting choice.

## Grading (re-scored vs. the Phase-0 baseline, 1–5)

| Surface | Visual intel | Interaction | Hierarchy | Concision | Nav clarity | Before→After |
|---|---|---|---|---|---|---|
| Home `/` | 4 | 4 | 5 | 5 | 5 | **3/2/3 → 4/4/5** |
| Cold-open | 5 | 3 | — | 5 | — | static slow intro → one hype montage |
| The Beat | 5 | 4 | 4 | 4 | — | **3/3/3 → 5/4/4** |
| Players | 4 | 4 | 4 | 5 | 5 | 11 subtabs → one lab, grouped lenses |
| Nav | — | 4 | 5 | 5 | 5 | **1→5** doors; Proof its own door |
| Proof (`/calibration`) | 4 | 3 | 5 | 5 | 5 | scattered 5 routes → one branded hub |
| Explainers (site-wide) | 4 | 5 | — | — | — | none → Nova guide on every page |

## Final verification (all green)

```
typecheck   PASS  (all workspaces)
lint        PASS  (eslint --max-warnings=0)
tests       PASS  (398 files · 5,558 tests)
build       PASS  (191 routes; only the pre-existing require-in-the-middle dep warning)
trust-gate  PASS  (928 files · no banned/tout phrases)
```

New guard tests this revision: `the-beat-broadcast`, `page-explainer-system`, `nav-route-integrity`, plus re-pointed home contracts. Accessibility invariants (reduced-motion fallback, no-autoplay, keyboard-reachable controls, opt-in guides) are enforced by test, not just intent.

## Deferred (needs owner approval — hard stop respected)

- **Higgsfield generation** — real Nova broadcast/intro/explainer *video*. Everything ships on existing assets with code-native fallbacks, so nothing breaks if it never runs. No spend without a written brief + placement + estimate + brand/IP review + approval.
- **Deeper subtraction** of the remaining content pages (Board / House / Pricing) — these are substantive product surfaces, not clutter; flagged for a focused pass only if the owner wants it, to avoid regressing tested behavior.

## Verdict

The six surfaces the owner called out are rebuilt, the IA is genuinely condensed, every loose end is accounted for, and **all gates are green with the safety/proof/disclosure rules strengthened, not weakened.** This qualifies for the owner's visual review on the preview.

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
