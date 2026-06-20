# Flagship 2026 — R2 Visual QA Checklist

Manual + automated QA for the R2 concision rebuild. Automated checks are enforced by the test suite (file noted); manual checks are for the owner's visual pass on the preview.

## Automated (enforced in CI / `npm run test`)

| Check | Where | Status |
|---|---|---|
| One cold-open; slow doctrine intro retired | `homepage-doctrine-hero.test.ts` | ✅ |
| Home is concise + data-first (no fabricated rows) | `home-signal-anatomy`, `homepage-content`, `data-first-public-surfaces` | ✅ |
| Four doors routed from home with live, real-sourced stats | `homepage-engine-centerpiece`, `home-signal-anatomy` | ✅ |
| Nav: no dead links (desktop + mobile) | `nav-route-integrity.test.ts` | ✅ |
| Nav: 4 doors + Proof + Beat on desktop & mobile (parity) | `nav-route-integrity.test.ts` | ✅ |
| Players is one door; Proof left Intelligence | `nav-route-integrity.test.ts` | ✅ |
| The Beat broadcast wired above the ledger; disclosure always shown | `the-beat-broadcast.test.ts` | ✅ |
| Broadcast: no photoreal likeness, no autoplay media | `the-beat-broadcast.test.ts` | ✅ |
| Explainer: registry coverage, no overclaiming, opt-in + accessible | `page-explainer-system.test.ts` | ✅ |
| Kinetic logo: reduced-motion fallback, no-autoplay, favicon | `brand-kinetic-logo.test.ts` | ✅ |
| No fabricated percentages on customer surfaces | `no-fake-percentages.test.ts` | ✅ |
| No banned/tout language on public surfaces | trust-gate guardrail + `public-copy-scan-strong` | ✅ |

## Manual (owner's visual pass on the preview)

### Arrival
- [ ] First load: the montage cold-open feels like HYPE, not a slow intro.
- [ ] It's ~3.6s, ends on the brand mark + "We detect. You decide.", then dissolves.
- [ ] Skip works; a second visit in the same session does not replay it.
- [ ] With OS "reduce motion" on: no montage, lands straight on the page.

### Home
- [ ] The page reads as ~6 calm blocks, not a wall of sections.
- [ ] The 4-door Signal Map is the spine; each door states one decision + one live number.
- [ ] No telemetry card, no ribbon, no stacked teaching chapters.

### Nav
- [ ] Bar reads: Board · Players · Intelligence · Fantasy & Daily · The Beat · Proof.
- [ ] Players opens the lab directly (no lens dropdown in the bar).
- [ ] Proof opens `/calibration` (the Proof Room), not an Intelligence sub-menu.
- [ ] Mobile menu mirrors the same doors.

### The Beat
- [ ] Opens with the Nova broadcast (lower-third, teleprompter, rundown) over motion.
- [ ] Segment Prev/Next + rundown chips switch the report.
- [ ] The Signal Ledger (graded feed) is preserved below.
- [ ] The synthetic-presenter disclosure is visible.

### Explainer (every main page)
- [ ] A "How this page works · 0:40" pill sits bottom-left.
- [ ] Clicking opens Nova's step-through guide; Back/Next/Got it work; Escape closes.
- [ ] It does not appear on cockpit/admin/auth.

### Players
- [ ] Reads as one lab: Player Lab + Edge Signals lead; the rest are grouped lens chips.
- [ ] Switching a lens loads that view (URL changes), data still loads.
- [ ] Trend Lab is reachable from inside Players.

### Proof
- [ ] `/calibration` gathers calibration, CLV, ledger, proof of record, accountability, tracker.
- [ ] Every linked proof surface still opens.

## Accessibility spot-checks
- [ ] `prefers-reduced-motion`: cold-open skipped, broadcast/backdrop video disabled.
- [ ] No audio or video autoplays with sound on any page.
- [ ] Explainer + broadcast controls are keyboard reachable; focus is visible.
- [ ] Contrast holds on the new dark surfaces (cyan/ion on obsidian).
