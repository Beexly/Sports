# GSE Edge Sheet v2 — Design Brief

**Worker B deliverable. Read-only blueprint for the builder. Do not copy any publication's layouts; techniques only, our own designs.**

## What this is

A single 1080x1350 portrait PNG, one per NFL game, rendered in Python matplotlib on this Linux VM. Phone-first audience (X, TikTok, Instagram). It must look like it belongs on the best sports data desks: dense with REAL charts, visually stunning, engaging at a glance.

v1 failed because it was a text document wearing a dark theme: three text panels, four bars, takeaways in paragraphs. v2 is a different species. **No paragraph longer than one line anywhere on the sheet. Every insight is drawn ON a chart or it does not ship.**

## Game constants (this sheet)

- Bills (BUF) vs Lions (DET), Week 2 2026
- Tonight, 7:15 PM CT, New Highmark Stadium
- Market line: BUF -5.5
- Data window: 2025 full season (garbage time and kneels removed), plus Week 1 2026 flagged explicitly as one-game sample, not a rating

## Brand: FIELD system (strict)

| Token    | Hex       | Use |
|----------|-----------|-----|
| Ground   | `#08090C` | page background |
| Panel    | `#12141A` | chart cards |
| Bone     | `#EDE8E0` | primary text, BUF identity in charts |
| Fog      | `#C4BFB6` | secondary text, secondary data ink |
| Mist     | `#8A857C` | muted labels, league-average lines, footnotes |
| Signal   | `#FF4D2E` | accent ONLY: DET identity in charts, the single loudest takeaway per sheet, the fair-line delta |
| Fog-gray | `#262A33` | the other 30 teams in league-context plots (de-emphasized, not invisible) |
| Hairline | `#1E2128` | panel borders, dividers |

No gradients. No glow. No drop shadows. No neon. No rounded-chart-junk. Clean, sharp, editorial. Two team colors max on any chart: Bone for BUF, Signal for DET. Everything else is fog or mist.

## Public copy rules (non-negotiable)

No em dashes. No "sports intelligence" phrasing. Human voice. No hashtag walls. Team names in full caps when large (BILLS / LIONS); `BUF` / `DET` abbreviations only inside chart legends and data labels.

---

# PART 1 — THE CHARTS (8 panels)

Each chart answers one question. If a builder cannot state the question, the chart is cut. League context on EVERY number: no stat appears without its league rank, percentile, or average.

### 1. The 32-Team Efficiency Map (HERO VISUAL, largest panel on the sheet)

- **Question:** Where do these two teams actually sit in the league's efficiency hierarchy?
- **Form:** Scatterplot, all 32 teams. X = offensive EPA/play, Y = defensive EPA/play (flip the Y so up = better defense; good corner is top-right, the way the best data desks orient it). 30 teams as small fog-gray dots (`#262A33`, alpha ~0.85, size ~55). BUF as a large Bone dot with a Bone ring; DET as a large Signal dot. Dashed mist crosshairs at league average on both axes. Quadrant shading optional and very subtle (alpha 0.03 Bone in top-right only).
- **Why it earns its space:** This is the single image that makes a phone scroller stop. It says "two real teams inside a real league" in one glance, and it is the visual signature of the whole Edge Sheet series. Every week's sheet has one; readers learn to read it.
- **Annotation discipline (this is the whole game):** Direct-label ONLY BUF and DET with team abbreviation + rank, e.g. `BUF  off #4 / def #9`. Do not label any other team. One takeaway callout, max 12 words, anchored near the two dots with a thin leader line, e.g. "Both live in the contender quadrant. The gap is on defense." If BUF and DET overlap, offset labels with `annotate()` and draw the leader, never let text sit on a dot.
- **Sharpest Bills/Lions angle:** Both were top-8 offenses in 2025; the separation is defensive EPA. The visual question the reader asks is "why is Buffalo -5.5?" and the map answers it spatially.

### 2. The Bar Field: 10-Metric Percentile Faceoff

- **Question:** Across the ten metrics that matter, where is each team elite and where are they exposed?
- **Form:** 10 horizontal rows, one metric per row. Each row: a 0-100 percentile track (thin mist baseline), BUF marker (Bone diamond or tick) and DET marker (Signal diamond or tick) placed at their percentile, value printed at the marker in bold (`+0.13`, `93rd`). League median = thin vertical mist line at 50. Rows: Off EPA/play, Dropback EPA, Rush EPA, Success rate, Explosive play rate, Def EPA/play, Def dropback EPA, Def rush EPA, Points/drive, Turnover luck (actual minus expected, signed).
- **Why it earns its space:** It is the densest honest comparison on the sheet: twenty numbers with league context in the space of a paragraph. Readers scan for the rows where the markers split wide apart. Those splits ARE the matchup story.
- **Sharpest Bills/Lions angle:** Find the 2 rows with the widest BUF/DET split and put a small Signal keyline bracket on exactly those rows with a 6-word note ("rush defense is the mismatch"). Leave the other 8 rows uncommented. Restraint is what makes the annotation land.
- **Execution note:** Sort rows by combined signal (widest split at top), not alphabetically. Metric labels left-aligned in fog 20pt; values right of markers in bold.

### 3. EPA Distribution Curves: How They Actually Score

- **Question:** Is a team's efficiency built on steady drives or on explosive plays?
- **Form:** Two overlapping distribution curves of per-play EPA (dropback plays, 2025 season): BUF in Bone, DET in Signal, both as filled KDE curves at low alpha (~0.25) with a 2.5pt solid stroke on top. League-average curve in dashed mist for reference. X axis clipped to roughly -2 to +2 EPA; annotate the right-tail mass ("explosive-play share") with a small shaded region and a % label per team.
- **Why it earns its space:** Averages lie and this chart is the antidote. Two teams can share +0.13 EPA/play with totally different shapes. This is the chart that makes a stats-literate reader trust the sheet.
- **Sharpest Bills/Lions angle:** Whichever team has the fatter right tail owns the "one play can flip this game" narrative. Put the takeaway ON the tail: "DET lives here: 14.2% of dropbacks gain 1.0+ EPA."
- **Technique:** KDE via `scipy.stats.gaussian_kde` (bw_method ~0.25) on the play-level EPA arrays; if scipy is unavailable, use a fine `np.histogram(density=True)` + light Gaussian smoothing. Never bar histograms here; bars chop the shape into noise. Fill under curve with team color at alpha 0.22, stroke at full.

### 4. Unit vs Unit: Where the Game Gets Decided

- **Question:** Which unit matchup decides tonight?
- **Form:** A 2x2 matchup grid. Quadrants: BUF pass offense vs DET pass defense | BUF rush offense vs DET rush defense | DET pass offense vs BUF pass defense | DET rush offense vs BUF rush defense. Each cell: the two EPA numbers as large bold figures facing each other with a center "VS", cell background tinted by who wins the matchup (winning side's color at alpha 0.10; neutral cells stay panel-dark). One arrow or edge per cell pointing at the winner's side.
- **Why it earns its space:** This is the only panel that simulates the actual game rather than rating the teams in a vacuum. It converts season stats into a tonight story. Casual fans read this panel first; it is the most shareable crop on the sheet.
- **Sharpest Bills/Lions angle:** The cell with the biggest EPA gap gets the Signal treatment and a 5-word verdict ("Lions can't stop the run" or whatever the data says). The other three cells stay quiet. Let the data pick the headline; do not force a narrative the numbers don't support.
- **Execution:** Build with `GridSpec` 2x2 inside the panel, `FancyBboxPatch` per cell with `boxstyle="round,pad=0.02,rounding_size=8"`. Numbers in Noto Sans Display Condensed ExtraBold 44pt. No chart junk inside cells; the numbers ARE the chart.

### 5. Form Lines: 2025 Rolling EPA Into Week 1

- **Question:** Who is actually playing well right now, not last October?
- **Form:** Two lines, 4-week rolling offensive EPA/play across 2025 Weeks 1-18, then a gap marker, then the Week 1 2026 single-game dot for each team (hollow dot, smaller, with a "1-game sample" footnote). BUF Bone line 3pt, DET Signal line 3pt, league average dashed mist 1pt. Shade the final 4 weeks of 2025 slightly to pull the eye to recent form.
- **Why it earns its space:** Season averages hide trajectories. A team that finished the year on a tear is a different bet than one that limped in. This is the "momentum" panel without using the word momentum.
- **Sharpest Bills/Lions angle:** If one team's line inflected up in December while the other's sagged, that IS the Week 2 story and it gets the on-chart annotation. If both were flat, say so in the footnote and keep the panel small; do not manufacture drama.
- **Technique:** Rolling mean on weekly EPA with min_periods=1 at the season start; mark the 2025/2026 seam with a vertical hairline and the label `2026 W1` in mist. Hollow sample dots: `facecolors='none', edgecolors=[teamcolor]`.

### 6. The Luck Ledger: Actual vs Expected Turnovers

- **Question:** How much of last season's record was luck that will not repeat?
- **Form:** Grouped diverging bars, 3 categories (INTs thrown, fumbles lost, INTs taken), each with two bars: actual (solid team color) vs expected (mist outline / hatched). Below, a single net-luck strip: actual-minus-expected converted to approximate points, one signed number per team in large type, colored Signal if the team was lucky (expect regression against them) or Bone/mist if neutral/unlucky. This replaces v1's text table with a visual ledger.
- **Why it earns its space:** Turnover luck is the most predictive "hidden stat" in football and the most misunderstood by casual fans. A visual ledger teaches the concept in five seconds and it directly informs the fair-line read.
- **Sharpest Bills/Lions angle:** If both defenses were INT-lucky in 2025 (v1 suggested BUF 13 actual vs 8.9 expected, DET 12 vs 10.5), the takeaway writes itself: "Both defenses stole extra possessions last year. Expect fewer gifts tonight." That single line reframes the total for a betting audience without ever saying "bet the under."
- **Technique:** Diverging bars from a zero center line; expected bars drawn as outline-only (`facecolor='none', edgecolor=mist, hatch='///'` is cheap-looking, prefer outline only). Annotate only the net points number per team.

### 7. Drive Anatomy: Points Per Drive vs Giveaway Rate

- **Question:** Do they finish drives, and do they hand the ball back?
- **Form:** A second 32-team dot plot, smaller than the hero: X = points per drive (offense), Y = giveaway rate per drive or 3-and-out rate (flip so up = better). Same fog-dot treatment, BUF/DET highlighted, crosshairs at league average. This one reads as "clinical finishing vs sloppiness."
- **Why it earns its space:** EPA/play can flatter teams that move between the 20s and stall. Points per drive is the efficiency stat fans intuitively understand, and pairing it with giveaway rate surfaces the "shootout vs grinder" identity of the game.
- **Sharpest Bills/Lions angle:** If one team pairs elite points/drive with a high giveaway rate, the on-chart note is "explosive but loose." If both are clean, the note is "whoever blinks first loses." Either way it sets up the total.
- **Keep it small:** Half the height of the hero map. Same visual language so the sheet feels like a series, not a collage.

### 8. Situational Edges: Four Small Multiples

- **Question:** Where do the hidden edges live: early downs, late downs, red zone, pressure?
- **Form:** Four mini dot-strip panels in a 2x2 or 1x4 strip: (a) early-down EPA/play, (b) late-down EPA/play, (c) red-zone EPA/play, (d) EPA/dropback under pressure. Each mini: a horizontal 0-100 percentile track with BUF Bone tick and DET Signal tick and the percentile printed. Identical scale on all four (Tufte's rule: comparable panels share axes or the comparison is a lie).
- **Why it earns its space:** This is the "analyst's corner" that rewards the knowledgeable reader and gives the sheet re-read value. Small multiples are the densest honest ink-per-pixel on the page.
- **Sharpest Bills/Lions angle:** Pressure EPA is the single most predictive situational split in football. If there is a big BUF/DET gap under pressure, that mini gets a Signal underline and the other three stay quiet.
- **Technique:** Draw all four from one helper function with shared x-limits (0,100), shared fonts, no per-panel titles longer than 3 words ("UNDER PRESSURE"). Values as `+0.04` signed.

---

# PART 2 — MATPLOTLIB EXECUTION NOTES

## Canvas and environment

- **Figure:** 1080x1350 px. Build at `figsize=(10.8, 13.5), dpi=100` for layout speed, export final at `dpi=200` (2160x2700) and downscale, or design at `figsize=(7.2, 9), dpi=150`. Text sizes below are in points at final render; verify legibility by viewing the PNG at phone width (roughly 390 CSS px wide) before sign-off.
- **Environment warning (builder: read first):** as of 2026-09-17 the system Python's matplotlib import is BROKEN (`ImportError: numpy.core.multiarray failed to import`; system numpy 2.5.3 vs numpy-1.x-compiled matplotlib). v1's `.venv` no longer exists in the edge-sheet directory. Before writing a line of chart code, create a fresh venv (`python3 -m venv ~/workspace/gse-research/edge-sheet/.venv && .venv/bin/pip install matplotlib numpy scipy pandas`) and confirm `import matplotlib` works. Do not fight the system install.
- **Global rcParams:** `figure.facecolor=Ground`, `axes.facecolor=Panel`, `text.color=Bone`, `axes.edgecolor=Hairline`, `xtick.color=Mist`, `ytick.color=Mist`, `font.family` set per element (see Part 3), `axes.grid=False` by default (add back selectively, never globally), `savefig.facecolor=Ground`, `savefig.bbox_inches='tight', pad_inches=0.02` is forbidden here; instead size the figure exactly and use `plt.subplots_adjust` so the export is exactly 1080x1350.

## League-context treatment (the house style)

- 30 non-game teams: `color='#262A33'`, markers `s=45-60`, `alpha=0.9`, `zorder=1`, `linewidths=0`. They must read as a cloud, not as 30 individuals. Never label them.
- BUF: Bone `#EDE8E0`, marker `s=220`, thin Bone edge ring (`edgecolors='#EDE8E0', linewidths=1.5` on a slightly larger invisible-fill dot behind, or just a larger dot). DET: Signal `#FF4D2E`, same sizing. Both `zorder=5`.
- League average: `ax.axvline/axhline(color='#8A857C', ls=(0,(4,4)), lw=1.2, alpha=0.9, zorder=0)` with a tiny mist label `LEAGUE AVG` placed at the line end, 15pt.
- Percentile tracks: draw the track as a 6pt mist-alpha-0.35 line from 0 to 100; median tick as a 14pt vertical mist line; team markers as diamonds (`marker='D'`) sized ~14pt with the value in bold beside it. Diamonds beat circles here because circles get lost on the track.

## Annotation discipline

- **Direct labeling always beats legends.** There is no legend on the sheet except possibly the bar field's BUF/DET key, and even there prefer labeling the markers directly.
- Max 2 annotated takeaways per chart, 1 preferred. Each takeaway: 5-12 words, sentence case, no em dash, placed with `ax.annotate(..., arrowprops=dict(arrowstyle='-', color='#8A857C', lw=1, connectionstyle='arc3,rad=0.1'))`. Leader lines are hairlines, never arrows with heads (arrowheads read as PowerPoint).
- Data labels ON the marks: bar values at bar ends (`va='center'`, bold, 22-24pt), dot values beside dots. Never make the reader interpolate from an axis.
- Footnotes live at the bottom of their own panel in 15-16pt mist, never in a global footer paragraph. Example: "Week 1 2026: one game each. Not a rating."

## Axis minimalism

- Strip every axis that does not carry information: `for s in ax.spines.values(): s.set_visible(False)` then re-enable only the needed baseline (`ax.spines['bottom'].set_visible(True); ax.spines['bottom'].set_color('#1E2128')`).
- Distributions: bottom spine only, 3-4 x-ticks max, no y-ticks at all (density axis is meaningless to readers; the shape is the message).
- Bar rows: no y-axis; row labels are the axis. X-ticks only at meaningful stops (0, 50, 100 for percentiles).
- Scatterplots: keep both axes but thin ticks, 4-5 ticks per axis, mist 16pt. Tick labels formatted short (`+0.1`, `2.0`).
- Gridlines: horizontal only, `color='#1E2128', lw=0.8`, and only when they help read values (bar field: yes, faint; scatterplots: no, the crosshairs do the job).

## Panel construction

- Panels are `FancyBboxPatch` cards: `boxstyle="round,pad=0.015,rounding_size=14"`, `facecolor=Panel`, `edgecolor='#1E2128'`, `lw=1.2`, drawn on Ground. 24-28px gutters between panels. The header band sits directly on Ground (no card) with a 4px Signal rule beneath it, as in v1.
- Panel titles: condensed bold, tracked uppercase (see Part 3), 27-30pt, Bone, top-left inside the card with 28px padding. One-line mist subtitle beneath in 18pt Liberation Sans.
- Build a `panel(ax_left, ax_top, ax_width, ax_height)` helper that returns axes in figure-fraction coordinates; lay out the whole sheet in one `GridSpec`-free pass so panel rhythm is deliberate, not emergent.

## Number formatting conventions

- EPA values: always signed, two decimals: `+0.13`, `-0.05`, `+0.00`. Zero is `+0.00`, never `0` or `-0.00` (guard with `+0.0` epsilon).
- Percentiles: `93rd`, `4th`, `21st` with correct ordinals; below 10th or above 90th may be colored (Signal for extreme DET edges, Bone bold for BUF) to pop.
- Rates: one decimal with % sign: `47.2%`. Points/drive: two decimals: `2.41`.
- Counts: `13 / 8.9 exp` for actual-vs-expected, matching v1's readable convention.
- Never show more precision than the data earns: EPA 2dp, percentiles integer, points/drive 2dp.

---

# PART 3 — TYPOGRAPHY

## What is actually on this VM (verified 2026-09-17 via fc-list)

- **Display/headlines: Noto Sans Display Condensed.** Files present: `NotoSansDisplay-CondensedBold.ttf`, `-CondensedBlack.ttf`, `-CondensedExtraBold.ttf`, `-CondensedSemiBold.ttf` under `/usr/share/fonts/truetype/noto/`. This is the find of the recon: a real condensed grotesque with Black weight, which is exactly the sports-poster voice the sheet needs. Nothing else on the box comes close.
- **Body/labels/data: Liberation Sans** (`LiberationSans-Regular.ttf`, `-Bold.ttf`, `-Italic.ttf`). Arial-metric-compatible, neutral, highly legible at small sizes. Primary workhorse.
- **Mono accents: DejaVu Sans Mono** for the data-source footer and any tabular stat readouts where digit alignment matters.
- **Do not use:** DejaVu Sans for headlines (its wide proportions and soft curves read as Linux-default; it is the fastest way to make the sheet look amateur). Noto Sans CJK / Looped families are irrelevant here.

## Loading the condensed face in matplotlib (do this, don't rely on name matching)

```python
from matplotlib.font_manager import FontProperties
COND_BOLD  = FontProperties(fname='/usr/share/fonts/truetype/noto/NotoSansDisplay-CondensedBold.ttf')
COND_BLACK = FontProperties(fname='/usr/share/fonts/truetype/noto/NotoSansDisplay-CondensedBlack.ttf')
COND_XBOLD = FontProperties(fname='/usr/share/fonts/truetype/noto/NotoSansDisplay-CondensedExtraBold.ttf')
plt.rcParams['font.family'] = 'Liberation Sans'  # default for everything else
```

## Hierarchy at 1080x1350 (phone screen)

Viewed on a phone the sheet is ~390 CSS px wide, so every size below has a legibility floor. Test by scaling the export to 390px wide and reading it at arm's length.

| Element | Face | Size | Notes |
|---|---|---|---|
| Matchup title `BILLS vs LIONS` | Cond Black | 88-96pt | `vs` in Signal, teams in Bone; tight line spacing |
| Week/dateline | Liberation Sans | 22pt | fog, one line: `WEEK 2 · TONIGHT 7:15 PM CT · NEW HIGHMARK STADIUM` |
| Market line chip | Cond Bold | 26pt | Bone on Panel chip: `MARKET  BUF -5.5`; sits in header, right side |
| Panel titles | Cond Bold, tracked caps | 28-30pt | Bone; see tracking trick below |
| Panel subtitles | Liberation Sans | 17-18pt | mist; one line only |
| Hero numbers (unit grid, net luck) | Cond ExtraBold | 44-56pt | signed, Bone or Signal |
| Data labels on marks | Liberation Sans Bold | 21-24pt | Bone; Signal only for the loudest value |
| Axis tick labels | Liberation Sans | 15-17pt | mist; 4-5 ticks max |
| Row labels (bar field) | Liberation Sans | 20pt | fog, left aligned |
| On-chart takeaways | Liberation Sans Bold Italic? No: Regular 19-20pt | 19-20pt | Bone; keep to 5-12 words; italic only for the single loudest takeaway |
| Footnotes / data source | DejaVu Sans Mono | 14-16pt | mist: `DATA: NFLVERSE (CC-BY 4.0)` |

## Letterspacing (tracked caps)

matplotlib has no letter-spacing. Fake it for panel titles only:

```python
def tracked(s, pad=0.5):
    return (' ' * int(pad * 2)).join(list(s))  # tune: single spaces usually enough
ax.text(..., tracked('TRUE EFFICIENCY'), fontproperties=COND_BOLD, size=29)
```

Use sparingly: panel titles and the header kicker only. Never track body text.

## Numerals

Liberation Sans figures are tabular enough for the small label columns on this sheet; where a column of signed EPA values must align perfectly (bar field values), set them right-aligned at a fixed x rather than relying on font metrics. DejaVu Sans Mono is the fallback for any dense stat table, but v2 should have no dense stat tables.

---

# PART 4 — LAYOUT: THE 1350PX CANVAS

## Anti-boring principles

1. **One hero, then descending density.** The eye enters at the matchup title, drops to the hero efficiency map (the biggest, most colorful thing), then scans the bar field, then grazes the small multiples. v1 failed because all three panels had equal visual weight, so the eye never landed anywhere.
2. **Rhythm, not rows.** Alternate panel heights and internal density: big scatter → tight bar field → airy distribution curves → chunky unit grid. If two adjacent panels have the same internal texture (e.g., two dot plots back to back), separate them with something textural (the unit grid or the luck ledger).
3. **Takeaways live ON the charts.** The sheet contains zero standalone insight paragraphs. The v1 "THE READ" text block is replaced by: the fair-line delta drawn as a small visual (market vs model line as two ticks on a number line with the gap shaded Signal and labeled `+1.5`), placed in the footer band next to the data source, max two lines of type.
4. **Every panel earns its rectangle.** If removing a panel loses no insight, cut it. Eight panels is the ceiling; seven is better if one is weak for a given matchup.
5. **Asymmetry signals importance.** The hero map spans full width. The bar field spans full width (it needs the horizontal room). Small multiples pair up in two columns. Nothing is centered "because it looked empty"; whitespace is a frame, not a filler.

## Suggested arrangement (y in px from top, 1080 wide, 28px gutters)

| Band | Height | Content |
|---|---|---|
| Header | 0-190 | Kicker `GSE EDGE SHEET` (tracked, mist) left, `WEEK 2 · 2026` (Signal, Cond Bold) right. Title `BILLS vs LIONS` Cond Black 92pt. Dateline one line, fog 22pt. 4px Signal rule. Market chip `BUF -5.5` right-aligned in header. |
| Hero | 200-560 | Panel 1: 32-team efficiency map. Full width. One takeaway callout on-chart. |
| Faceoff | 575-880 | Panel 2: 10-metric percentile bar field. Full width. Densest panel; keep subtitle to one line. |
| Split row | 895-1120 | Two columns: Panel 3 (EPA distribution curves, left, 530px) + Panel 6 (luck ledger, right, 522px). Distributions are airy, ledger is chunky: good texture contrast. |
| Matchup row | 1135-1290 | Panel 4: unit-vs-unit 2x2 grid. Full width but short; the numbers are huge so it reads instantly. This panel is the most croppable for a standalone post. |
| Footer band | 1300-1350 | Left: fair-line number line (market vs model, gap labeled). Center/right: `WE DETECT. YOU DECIDE.` tracked Cond Bold 20pt + `@GalaxySportsHQ`. Bottom hairline: `DATA: NFLVERSE (CC-BY 4.0)` mono 14pt mist. |

Panels 5 (form lines), 7 (drive anatomy), 8 (situational small multiples) rotate in as the week's 8th panel based on which has the sharpest story; the split row's right column or a second split row accommodates it. **Rule: the sheet ships 7-8 panels, never 9.** If two panels say the same thing (hero map and drive anatomy both say "good team"), cut the weaker.

## The scroll test

Export, scale to 390px wide, and check: (a) the hero map is readable without zooming; (b) exactly one takeaway per panel is legible at a glance; (c) no text block exceeds two lines. If any panel needs zooming to be understood, it is too dense: cut a metric, not the font size.

---

# PART 5 — DO NOT LIST

Techniques that read as cheap, cluttered, or AI-slop in this palette. The builder treats these as hard bans, not suggestions.

1. **No pie or donut charts.** Ever. On a matchup sheet they are decoration, not information.
2. **No radar/spider charts.** Angle distortion makes every team look spiky and identical; the percentile bar field (Panel 2) does the same job honestly. Radars are the fastest "AI generated this" tell in sports graphics.
3. **No 3D effects, bevels, gradients, glows, or drop shadows.** The FIELD system is flat. `FancyBboxPatch` gets `facecolor` and `edgecolor` only; matplotlib's `shadow=True` and `path_effects` with glow are banned.
4. **No dual y-axes.** Two scales on one chart is a lie waiting to happen. Small multiples instead.
5. **No truncated bar axes that exaggerate gaps.** Percentile tracks run 0-100, always. EPA bars start at a meaningful zero or are diverging from zero. If a gap looks small at honest scale, the gap IS small; say so.
6. **No rainbow categorical palettes.** Three colors exist: Bone, Signal, fog. The 30-team cloud is one gray. A fourth color must be justified in the build notes.
7. **No legends where direct labeling works.** If the reader's eye has to travel to a legend and back, the chart failed. Label the marks.
8. **No tick-label soup.** If all 32 team abbreviations appear on any axis, delete that axis. Dots, not labels, for the crowd.
9. **No gridlines on scatterplots, no heavy box spines anywhere.** Hairline `#1E2128` dividers only where they separate content, never as decoration.
10. **No orphan numbers.** Every stat carries league context (rank, percentile, or average line) or it is cut. A naked `+0.13` means nothing on a phone.
11. **No paragraph text.** One-line subtitles, 5-12 word on-chart takeaways, footnotes. The v1 "THE READ" block does not come back in any form.
12. **No em dashes, no "sports intelligence," no hashtag walls, no AI-voice adjectives** ("delve," "landscape," "tapestry," "in the world of"). Human voice, short sentences.
13. **No DejaVu Sans headlines.** It is the Linux-default tell. Condensed Black for display, Liberation Sans for body, no exceptions.
14. **No fake precision.** One-decimal percentages, two-decimal EPA, integer percentiles. `+0.1337` is innumeracy cosplay.
15. **No overlapping text on data.** If a label collides with a dot, bar, or line, move the label with a leader line. Run the scroll test; collisions visible at 390px are ship-blockers.
16. **Do not touch the v1 script or PNG, do not edit `~/workspace/vendor/Sports/AGENTS.md`, no git push, no external sends.** This brief is the blueprint; the builder works from the sibling worker's extended CSVs and this file only.

---

## Builder's pre-flight checklist

- [ ] Fresh venv with working `import matplotlib` (system install is broken as of 2026-09-17)
- [ ] Sibling worker's extended CSVs present (2025 full-season + 2026 Week 1 per-team metrics, percentiles, weekly trends, play-level EPA for distributions)
- [ ] Condensed font files load via explicit `FontProperties(fname=...)`
- [ ] Export is exactly 1080x1350; scroll test at 390px wide passes
- [ ] Every number has league context; every chart has its one question answered on-chart
- [ ] Copy rules: no em dashes, no "sports intelligence," human voice

*Brief version 1.0 — Worker B, 2026-09-17. Techniques studied from public sports data desks (PFF chart builders, next-gen-stats-style matchup graphics, Tufte/Cleveland minimalism principles); all designs original to GSE.*
