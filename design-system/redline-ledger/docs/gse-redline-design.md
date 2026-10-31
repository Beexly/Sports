# Galaxy Sports Edge — REDLINE LEDGER Design Specification

**Date:** 2026-10-30  
**Status:** Approved for autonomous execution by explicit user mandate  
**Scope:** GSE-only website concept, design tokens, active cards, DFS table, OG/social exports, and a separate design package copied into the approved sports repository.

## Intent

Build a number-first sports intelligence surface that feels edited and directed by a person, not generated around a product logo. The design keeps the newer FIELD DNA found in `C:\Users\Garrett\gse-hero-r3f`—near-black, bone, and ember—while replacing generic telemetry and dashboard patterns with the grammar of a late-edition broadsheet and a marked-up statistics proof.

**One-sentence direction:** REDLINE LEDGER is a late-edition sports broadsheet where bone-on-black reporting, one ember revision mark, documentary contact-print imagery, and tabular evidence meet in an unforgiving editorial grid.

## Goals

- Make player identity and the primary number identifiable in under two seconds at 320px and in social crops.
- Use real source-locked Week 8 examples from the user-supplied Halloween document; no fabricated picks, salaries, records, or performance claims.
- Produce a working React + Tailwind site, active cards, downloadable static socials, and short motion.
- Generate real Higgsfield assets with tightly directed media, palette, era, and bans; typeset all meaningful text outside the image model.
- Add the final design package to the approved sports repository without changing production routes or canonical tokens.

## Non-goals and anti-goals

- No Signal Origin, FrameFit, Charcuterie Chick, or non-sports work.
- No indigo/violet/purple system, gradients, glassmorphism, glow decoration, glossy 3D, generic AI presenter, or floating pill hero.
- No Inter, Geist, Roboto, three identical feature cards, icon-plus-blurb sections, or all-caps body copy.
- No generated text or numbers inside Higgsfield imagery.
- No fabricated “live” behavior. The concept uses a source-locked Oct 30, 2026 snapshot and labels it.

## Research basis

- FIELD tokens and current brand copy: `C:\Users\Garrett\gse-hero-r3f\apps\web\styles\design-tokens.css`, `apps/web/lib/brand.ts`, and `DESIGN.md`.
- Older component history and rejected cosmic/glow language: `C:\Users\Garrett\Desktop\Sports-langfuse\design-system` and `apps/web/styles/design-tokens.css`.
- Week 8 source data: `C:\Users\Garrett\Downloads\Halloween CFB & NFL.docx`.
- Requested external resources reviewed: `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`, `https://github.com/VoltAgent/awesome-design-md`, `https://github.com/nexu-io/open-design`.
- Useful patterns retained: semantic tokens, resilient text, machine-readable DESIGN.md guidance, portable design packages, deterministic MP4 export thinking. No brand layouts copied.

## Design tokens

### Color

| Token | Value | Role |
|---|---:|---|
| ground | `#08090C` | Main canvas |
| panel | `#12141A` | Contact-print and table surface |
| panel-2 | `#191C23` | Selected row / secondary surface |
| line | `#31353F` | Rules and structure |
| bone | `#EDE8E0` | Primary dark-surface text |
| fog | `#C4BFB6` | Secondary dark-surface text |
| mist | `#8F8A82` | Metadata only |
| ember | `#FF4D2E` | One accent: selected figure, active rule, primary action |
| ember-ink | `#1A0703` | Text on ember |
| paper | `#F4F1EB` | DFS salary ledger |
| ink | `#101114` | Primary paper text |
| paper-line | `#D8D0C4` | Paper rules |
| ember-on-paper | `#C22E1A` | Accessible ember text on paper |

One accent only. Negative values use a minus sign and neutral ink, not a second hue. Depth comes from solid surfaces and hairlines; glow is forbidden.

### Type

- Display / player names: **Big Shoulders**, weights 600 and 700. Distinctive condensed proportions, never ultra-light, stretched, outlined, or italicized.
- Body / UI / all numbers: **IBM Plex Sans**, weights 400, 500, 600. Technical but readable at 12–14px; true tabular lining figures.
- Scale: 12, 13, 16, 20, 26, 33, 42, 54, 69px; hero may reach 96px responsively. The working ratio is approximately 1.28.
- Only 2–3 weights per surface. Emphasis comes from size and weight before color.

### Spacing, shape, elevation

- 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.
- Desktop 12-column grid; hero 7/5 split; content max 1440px; readable prose max 68ch.
- Radius 0 on editorial surfaces, 2px on controls, 999px only for functional status dots.
- Elevation 0: solid surface. Elevation 1: 1px line. Elevation 2: 2px line plus a 4px hard offset, never blur or glow.
- Motion 100–220ms for controls, opacity/color only under reduced motion; no parallax, scroll-jacking, or auto-marquee.

### Mandatory numeric rule

All comparable numbers use `font-variant-numeric: tabular-nums lining-nums`, `font-feature-settings: "tnum" 1, "lnum" 1`, right alignment, and no wrapping. Card primary numbers have a 4.5ch minimum width. The DFS table uses fixed numeric columns and right alignment. Numbers are set in IBM Plex Sans, not the display face.

## Page architecture

1. **Masthead:** GSE lockup, source snapshot date, Board / DFS / Method navigation, one action.
2. **Asymmetric hero:** “THE LINE / IS ONLY / THE START.” plus one CTA; documentary field image and a source-locked pick proof, not a floating product mockup.
3. **The Week 8 ledger:** large editorial pick rows with edge rank, model probability, market probability, and post-reasoning edge. Filters change real visible content.
4. **Held is a finding:** full-width CFB statement, 47 games evaluated / 0 published, with the missing-spine explanation from the source.
5. **Salary ledger:** paper section with the nine-player 13-game flagship GPP roster and salary-exact total.
6. **Method:** three numbered editorial passes—internal simulation, market comparison, publish or hold—not three cards.
7. **Asset desk:** working card previews and actual PNG/MP4 downloads.
8. **Footer:** provenance, responsible-play link, and 1-800-GAMBLER.

## Component contracts

- `PickProof`: source, matchup, selection, price, model probability, market probability, edge, and rank. No win-rate or guarantee language.
- `DfsCard`: player, team, position, salary, and archetype; salary total must equal the sum of rows.
- `LineupTable`: nine rows in fixed Pos / Player / Salary columns; numeric columns right-aligned.
- `HeldNotice`: evaluated count, published count, and concrete reason.
- `AssetDownload`: valid local filename, accessible label, and download attribute.
- `FilterTabs`: native buttons with `aria-pressed`, keyboard focus, and immediate state feedback.

## Source-locked content

- CHI ML +142: model 63.56%, market 39.62%, edge +23.94%.
- KC ML -118: model 73.82%, market 51.74%, edge +22.08%.
- NYJ ML -122: model 72.28%, market 52.61%, edge +19.67%.
- DFS 13-game flagship GPP: Caleb Williams $6,100; James Cook III $7,900; Jonah Coleman $4,300; Jaxon Smith-Njigba $9,100; Zay Flowers $7,200; Rome Odunze $4,600; Dallas Goedert $4,700; Kalif Raymond $3,600; Falcons DST $2,500. Total $50,000.
- CFB: 47 games evaluated, 0 published; source says the college JEV spine and active injury tables are not wired.
- Identity corrections: Mike Evans = SF WR; Geno Smith = NYJ QB. Do not repeat stale tags from the document.

## Higgsfield art direction

Use Soul 2.0 for eight stills and one six-second documentary motion clip if credits permit. Every prompt must specify medium, exact palette `#08090C #EDE8E0 #FF4D2E #C4BFB6`, a real 1970s sports contact-sheet or 1990s newspaper photo-desk tradition, and bans on purple/indigo, gradients, glossy 3D, synthetic studio light, text, logos, holograms, floating objects, and polished commercial stock aesthetics. Images show field materials, empty sidelines, stat-desk artifacts, and worn football details. All typography is overlaid in code. Generated images are toned/cropped into a consistent contact-print treatment and reviewed before use.

## Export system

- OG: 1200×630 PNG.
- X feed: 1600×900 PNG.
- Instagram portrait: 1080×1350 PNG.
- Square card: 1080×1080 PNG.
- Story/motion: 1080×1920 MP4, six seconds, silent, H.264, with browser-typeset overlay.
- Each static export gets a visual review at full size and thumbnail scale; all numbers use browser CSS tabular figures.

## Verification gates

- Unit/component tests for filters, salary sum, identity corrections, download links, and accessible states.
- Source scan rejects forbidden hexes/font families/effects and stale Mike Evans or Geno Smith tags.
- Visual review at 320, 390, 768, 1024, and 1440px; no overlap or horizontal overflow.
- Axe WCAG scan, keyboard checks, broken-image check, reduced-motion screenshots, production build.
- Full-size and thumbnail review of every exported asset; ffprobe on motion.
- Fresh final reviewer examines the complete deliverable; important findings are corrected.

## Repository integration

Copy only the completed standalone design package and documentation into `C:\Users\Garrett\gse-hero-r3f\design-system\redline-ledger`. Do not alter existing modified files, production routes, canonical tokens, environment files, package locks, or git history. No commits or pushes.

## Rulings

- The newer `gse-hero-r3f` FIELD system is the visual predecessor; the older cosmic system is reference-only — it matches the latest repo doctrine and the user’s no-purple rule.
- The site is a source-locked concept, not a live product — user data must not be fabricated and the supplied snapshot is sufficient for realistic cards.
- Higgsfield imagery is permitted by the specific asset requirement despite the general “no AI images” wording — only tightly directed, reviewed, non-synthetic-looking assets ship.
- Git commits are omitted — the user approved file changes but did not request commits, and existing repos contain unrelated work to preserve.
