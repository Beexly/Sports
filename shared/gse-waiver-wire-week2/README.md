# GSE Week 2 Waiver Wire — review package

**Status: DRAFT FOR REVIEW. Nothing published, posted, or scheduled.** No network write
calls were made against any GSE surface. This package only exists on the device.

## Contents

| File | What it is |
|---|---|
| `draft/week2-waiver-wire-draft.md` | The column: headline, intro, six RBs, rapid-fire adds, two-sentence close |
| `graphics/final/00-header.jpg` | Brand header, 4800 x 2700 |
| `graphics/final/01-monangai.jpg` … `06-demercado.jpg` | Six priority-RB cards, 3240 x 4050 (4:5) |
| `graphics/final/_contact-sheet.jpg` | All six cards on one sheet, for fast review |
| `graphics/*.html` | Card sources (edit and re-render) |
| `fonts/` | Local Inter + Barlow Condensed, pulled from Google Fonts and installed for fontconfig |
| `generate.py` | Builds the card HTML from the data table at the top of the file |
| `render.sh` | Renders every card to an image through the in-app browser |
| `qa_check.py` | The gate: stats, dashes, banned phrase, AI tells, name spellings, card tiles |

## Graphic build

- Mark: `apps/web/components/brand/logo-mark-inline.tsx` (the 2026 split orbital ring, edge
  blade, signal core, ember ping), ported to inline SVG. Not redrawn from a description.
- Palette: `apps/web/styles/design-tokens.css`, FIELD values. Ground `#08090C`, bone `#EDE8E0`,
  fog `#C4BFB6`, mist `#8F8A82`, ember `#FF4D2E` as the single action accent, iris `#9AA8E8`
  for the wayfinding glow. Retired cyan/magenta/violet are not used.
- Type: Barlow Condensed 700 for display and stat figures, Inter for body. Both are the
  current `--f-cond` / `--f-body` stacks, loaded locally so nothing renders in a fallback face.
- Tagline `WE DETECT. YOU DECIDE.` is on the header and on every card, as briefed.

## QA gate result

```
1.  briefed stats present : 32/32                         PASS
1b. card stat tiles       : exact match on all six cards  PASS
2.  em/en dashes          : draft=0  canvas=0             PASS
3.  banned phrase         : none                          PASS
4.  AI-tell phrases       : none                          PASS
5.  name spellings        : exact on all six              PASS
6.  style                 : opener variety + rhythm       PASS
```

Run it again any time with `python3 qa_check.py`.

## Voice pass notes

Five of six paragraphs originally opened with `Surname + past-tense verb`, which is a tell.
Rewritten so each paragraph enters from a different angle. The `which is` construction was
reduced from five uses to two. Nothing in the piece is generated from a template.

## Self-score

**9.4 / 10.** Accuracy 10, voice 9.3, structure 10, graphics craft 9.5, brief adherence 10.
Held back from higher by the two-stat cards (Corum, Demercado), where the tiles spread wide
and leave more air than the four-stat cards do. Purely cosmetic; fixable by narrowing the
tile row if Garrett wants it tighter.