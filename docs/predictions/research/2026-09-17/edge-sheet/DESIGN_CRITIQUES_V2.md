# DESIGN CRITIQUES V2 — GSE Edge Sheet Rebuild

## Pass 1: Initial 6-panel render (REJECTED)

**What was built:** Hero efficiency map, 12-metric faceoff, KDE distributions, luck ledger (horizontal bars), unit matchup grid, THE READ footer.

**Critique:**
- Widespread text collisions: header bleed into hero, faceoff rows overlapping, luck panel labels colliding with bars.
- Root cause: `FancyBboxPatch(rounding_size=10)` treated `10` as figure-fraction units (not pixels), creating massive rounded corners that pushed content. Background rendered brown instead of `#08090C`.
- Faceoff was too dense with 12 metrics; row spacing caused value/label overlap.
- Luck ledger horizontal bars: category labels and "exp" values collided.
- Axes hidden behind figure-level cards (z-order issue not yet diagnosed).

**Fix:** Changed to `rounding_size=10/1080` (pixels converted to figure fraction). Corner now exact `#08090C`.

## Pass 2: Collision fixes (REJECTED)

**What was built:** Fixed rounding, redesigned faceoff as table-like percentile tracks.

**Critique:**
- Percentile direction inverted in computation (`pct_rank` ascending vs descending).
- Points/drive sourced from wrong CSV (used team_metrics instead of drive_stats).
- Multiple title/value/axis collisions persisted in hero, faceoff, luck.
- Negative zero displayed as "-0.00" (fmt_epa bug).
- Matchup panel labels overlapped cells.

**Fix:** Corrected `pct_rank` direction, sourced drive stats from `drive_stats_2025.csv`, fixed `fmt_epa` to avoid "-0.00", redesigned faceoff with proper spacing.

## Pass 3: Z-order discovery (REJECTED)

**What was built:** 6 panels rendering, but plot axes invisible.

**Critique:**
- Header overlap persisted.
- Plot axes (ticks, lines, dots) hidden behind figure-level cards.
- Only six chart families; missing rolling form and drive anatomy.
- Root cause verified experimentally: cards at z-order 1 covered axes at default z-order 0. Signal pixels were 0 with card z=1 and 600 with card z=-1.

**Fix:** Cards now use z-order `-1`. Header positions BILLS/vs/LIONS using measured rendered extents instead of estimated character widths.

## Pass 4: Eight-panel restructure (ACCEPTED with iterations)

**What was built:** Full 8-panel layout: hero, 10-metric faceoff, distributions, luck, form lines, drive anatomy, matchup grid, footer.

**Critique (iteration 4a):**
- Hero annotations (15pt) too large for 90px chart; DET label overlapped x-axis label.
- Dist/luck takeaways overlapped (DejaVu width underestimated: 70 chars × 8.8px, not 5.8px).
- Form takeaway too long, overlapped drive takeaway; missing "DET" label.
- Matchup subtitle overlapped cell labels.
- Drive BUF/DET labels collided with axis labels.

**Fixes (4b):**
- Hero: replaced leader-line callouts with top-right legend (fig.text, not ax.text — ax.text with transAxes caused garbled rendering).
- Shortened all takeaways; measured DejaVu widths properly.
- Matchup: moved cells down (cy=1202, chh=46).
- Drive: staggered labels, moved x-label to bottom-left.

**Critique (4c):**
- Hero BUF legend garbled ("double-vision" text). Root cause: `ax1.text` with `transform=ax1.transAxes` + bbox rendered incorrectly near axes top edge. Isolated test rendered cleanly; issue was axes-specific.
- Fix: switched to `fig.text` with figure coordinates. Clean.

## Pass 5: Situational panel (ACCEPTED)

**Decision:** Per brief Part 1: "Panels 5 (form lines), 7 (drive anatomy), 8 (situational small multiples) rotate in as the week's 8th panel... Rule: the sheet ships 7-8 panels, never 9. If two panels say the same thing (hero map and drive anatomy both say 'good team'), cut the weaker."

**Critique of drive anatomy:** Hero already establishes BUF #5 / DET #9 offense ("both good"). Drive anatomy's "both finish drives" was redundant. The situational story was sharper: DET 6.5th percentile in late-and-close (collapse) vs BUF 67.7th.

**What was built:** 2x2 situational small multiples replacing drive anatomy:
- EARLY DOWNS: BUF 94th, DET 87th
- LATE DOWNS: BUF 90th, DET 39th
- LATE AND CLOSE: BUF 68th, DET 6th (signal underline, biggest gap)
- BALL SECURITY: BUF 55th, DET 90th

**Adaptation documented:** Brief specifies red-zone and pressure splits; these are not in the grounded data files. Used late-and-close and ball security (giveaway rate, inverted so right=better) instead. No values fabricated.

**Critique (iteration 5a):**
- Mini labels overlapped subtitle (started at y=1002, subtitle ends at 1007).
- RegularPolygon diamonds rendered at wrong scale.
- Fix: moved rows to y=1010/1054, used "◆" text character for diamonds, 10pt labels.

## Final verdict

The sheet ships 7 content panels + footer (8 total), within the brief's "7-8 panels, never 9" rule. All eight brief chart families are represented except drive anatomy, which was cut per the brief's own redundancy rule in favor of the sharper situational story.

**What works:**
- Metric density: every number has percentile/rank context.
- Visual hierarchy: hero → faceoff → splits → matchup → read flows top to bottom.
- No collisions at 1080×1350; legible at 390px phone width (headlines + key numbers).
- Deterministic: fixed seeds, no random elements.

**What failed during iteration:**
- Figure-fraction vs pixel units (rounding_size bug).
- Z-order: cards covering axes (diagnosed via pixel counting).
- DejaVu width underestimation (caused takeaway overlaps).
- ax.text + transAxes + bbox rendering glitch (fixed with fig.text).
- Over-ambitious panel count (9 panels would violate brief; cut drive anatomy).

**Honest assessment vs "boring PDF":** This is not a boring PDF. The density, the signal-color accents, the percentile tracks, and the situational small multiples give it a distinctive analyst-desk aesthetic. The 390px phone test confirms it works as a social graphic. The weakest panel is the KDE distributions (flat in the short format) — it earns its space via the tail-share labels, but it's the first candidate for rotation in future weeks.

## Pass 4: Systematic collision audit + rebuild (SHIPPED 2026-09-17)

**What was built:** Rewrote `build_edge_sheet_v2.py` around a bbox-audit harness
(`/tmp/audit_sheet.py`: monkeypatches `Figure.text`/`Axes.text`, audits pairwise
text-text overlaps, canvas bounds, and panel containment). Pre-fix baseline:
141 text artists, 24 text-text overlaps, 3 out-of-canvas, 25 containment
violations. Post-fix: 127 text artists, **0 / 0 / 0**.

**Fixes applied:**
- Three-zone header (kicker/week, title+market chip, dateline) with measured
  title extents; dateline restored to full "THURSDAY, SEPTEMBER 17, 2026".
- Faceoff rows: 34px vertical, measured note x-offsets, bracket only when the
  split exceeds 15 pct.
- Dist: real KDE presence (filled alpha, 2.2pt strokes), shaded tail 1.0-2.4,
  tail-share stack at x=1.7 with panel-bbox callouts, "lg" tag split above the axes.
- Luck ledger rebuilt as vertical actual-vs-expected columns (10/10.1 style
  labels) with dashed expected-value ticks; category labels on two lines with
  measured split points.
- Form: 2026 W1 hollow dots with an explicit "2026 W1" marker; takeaway kept
  inside the panel.
- Situational: mini rows 37px, split mini diamonds vertically when within 18px.
- Unit matchups rebuilt with separated subtitle and star-cell Signal edge.
- Footer: full-bleed market-vs-model scale with shaded gap, honesty line and
  attribution with real bottom margin.
- Body font corrected to Liberation Sans (footer stays DejaVu Sans Mono).

**Known limitations:** Hero scatter is a thin strip (87px tall) by layout budget,
not a dramatic centerpiece. Tail-share bottom label touches curve ink (kept
legible via panel-color bbox). Verified no em dashes, no banned phrasing,
brand palette exact, fair margin +6.9 / gap +1.4 preserved.

## v2.2 legibility pass (2026-09-17 ~14:45 CT, Garrett: "clean it up, make it easier to see")

Geometry + type only. No data, copy (one subtitle exception), or computation changes.
fair_margin +6.9 / gap +1.4 identical to v2.1 on rebuild.

1. HERO: 32-team scatter strip replaced with a four-cell two-team comparison
   (BUF/DET x OFF/DEF EPA, 28pt numerals, league ranks #5/#11/#9/#14). Same
   data as the scatter. Subtitle changed "up and right = better" -> "rank of 32"
   (the axes are gone; the old wording would have been wrong). Takeaway and W1
   note share one line in the reserved bottom pad. Panel grew 181->201px;
   header compressed 240->232, faceoff 300->282, matchups 128->124 to fund it;
   inter-panel gaps 6->8px.
2. FACEOFF: value labels now placed dynamically right of their own diamond
   with guaranteed gaps (bx0 = max(0.545, xb + 0.024)); DET labels and the two
   note brackets shift right accordingly. LATE AND CLOSE row was the worst.
3. LUCK LEDGER: bar offsets widened (+-0.17 -> +-0.21), bar width 0.24 -> 0.22;
   "10/10.1" vs "9/10.5" and "13/8.9" vs "12/10.5" now individually readable.
4. PASS-GAME SHAPES: tail-share stack moved to x=1.55, spread vertically
   (0.98/0.70/0.44 ymax); the three boxes no longer touch each other or the edge.
5. TYPE: panel titles 16->17pt, subtitles 12->12.5pt, value labels 10->10.5pt,
   notes 9.5->10pt, luck labels 9->9.5pt, takeaways 12->12.5pt. MIST #8A857C ->
   #96918A for secondary-text contrast. FIELD palette otherwise untouched.

Audit (/tmp/audit_sheet_v22.py, zones updated for new layout, --pad 4):
0 text-text overlaps, 0 out-of-bounds, 0 containment violations (135 artists).
Visual review at full size and 390px: hero reads instantly; faceoff rows are
tight but legible; all panels intact; brand + attribution footer unchanged.
