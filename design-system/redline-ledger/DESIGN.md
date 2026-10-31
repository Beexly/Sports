# Galaxy Sports Edge — REDLINE LEDGER

## Direction

REDLINE LEDGER is a late-edition sports broadsheet where bone-on-black reporting, one ember revision mark, documentary contact-print imagery, and tabular evidence meet in an unforgiving editorial grid.

The system is data-forward but human. It uses editorial scale, asymmetry, registration marks, and real field materials instead of sports-tech clichés. A card exists only when a pick, player, roster, or packaged slate genuinely benefits from that boundary.

## Color

| Token | Hex | Rule |
|---|---|---|
| ground | `#08090C` | Main canvas |
| panel | `#12141A` | Contact print / secondary surface |
| panel-2 | `#191C23` | Selected surface |
| line | `#31353F` | Hairline structure |
| bone | `#EDE8E0` | Primary dark-surface text |
| fog | `#C4BFB6` | Secondary dark-surface text |
| mist | `#8F8A82` | Metadata |
| ember | `#FF4D2E` | Only accent: key number, active state, primary action |
| ember-ink | `#1A0703` | Text on ember |
| paper | `#F4F1EB` | Salary ledger |
| ink | `#101114` | Paper text |
| paper-line | `#D8D0C4` | Paper rules |
| ember-on-paper | `#C22E1A` | Accessible accent text on paper |

One accent maximum. Negative meaning uses a minus sign and neutral text, not another color. No gradients, glass, glow, purple, indigo, or violet.

## Typography

- Display and player names: **Big Shoulders**, 600/700. Condensed and decisive; never ultra-light, outlined, stretched, or italicized.
- Body, UI, tables, and all numbers: **IBM Plex Sans**, 400/500/600. Clear at 12–14px with tabular lining figures.
- Scale: 12, 13, 16, 20, 26, 33, 42, 54, 69px. Hero may reach 96px+ as a deliberate editorial exception.
- Limit 2–3 weights per surface. Use size and weight before color.
- No all-caps body copy, generic broadcast lower-thirds, heavy italics, or tight player-name tracking.

## Mandatory numeric CSS

```css
.tabular-nums,
.num,
.projection,
.salary,
.score,
.edge,
.ownership,
.lineup-table td:nth-child(n+3),
.card .primary-number,
.card .secondary-stat {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
  text-align: right;
  white-space: nowrap;
}

.primary-number {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
  font-weight: 600;
  font-size: 1.25rem;
  text-align: right;
  white-space: nowrap;
  min-width: 4.5ch;
}

.num-col {
  text-align: right;
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
  white-space: nowrap;
}
```

Use IBM Plex Sans for every number. Right-align comparable figures. Fixed numeric columns prevent layout shift. Three projections or salaries must be comparable vertically in under two seconds at card size and on mobile.

## Spacing, shape, elevation

- 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.
- Desktop 12-column grid; asymmetric 7/5 hero; maximum content width 1440px.
- Radius 0 on editorial surfaces, 2px on controls, full round only for functional status dots.
- Elevation 0: solid. Elevation 1: 1px line. Elevation 2: 2px line and 4px hard offset. No blur or glow.
- Touch targets are at least 44×44px.

## Component rules

### Pick proof

Matchup and selection lead. Model probability, de-vig market probability, and edge form one aligned numeric group. Edge is arithmetic, not a win promise. Show source and snapshot.

### DFS card and lineup

Player name and position stay left. Salary is a larger right-aligned tabular figure. A lineup table uses fixed Slot / Player / Salary columns. The total must equal the sum of rows.

### Held notice

Evaluated and published counts are equally explicit. Give the concrete reason. Never convert missing evidence into a pick.

### Product and content cards

Use only for a real package or editorial finding. Vary composition by story; do not manufacture a row of identical icon cards.

### OG and social

Keep identity and primary figure readable at thumbnail size. Generate layout and type in the browser, never in the image model. Use the same tokens and source data in every crop.

## Motion

Use 100–220ms opacity, color, and small transform feedback. Remove displacement under `prefers-reduced-motion`; preserve short state/color transitions. No scroll-jacking, parallax, auto-marquee, or decorative continuous motion. Any auto-playing sequence over five seconds requires pause control; the exported story is a finite six-second file, not an auto-playing web loop.

## Imagery

Use documentary 35mm/contact-print material: chalk, turf, laces, worn paper, empty sidelines. Reject spheres, pseudo-text, logos, glossy 3D, synthetic cinematic lighting, and off-palette output. Crop and tone only as editorial direction, then inspect the result again. Designed fallbacks are preferable to a failed generation.

## Data integrity

The included examples are source-locked to October 30, 2026 and labeled historical. Mike Evans is SF WR. Geno Smith is NYJ QB. Never revive stale tags from the source transcript. No performance claim, record, price, or probability may be added without provenance.
