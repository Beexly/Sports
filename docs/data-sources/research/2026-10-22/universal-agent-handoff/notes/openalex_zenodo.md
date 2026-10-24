# OpenAlex + Zenodo — literature route, and one usable dataset

## OpenAlex
`api.openalex.org/works?search=` is open but shares a **$0.10/day per-IP budget** without a key.
One call succeeded ("nfl dataset", 11,837 hits, 5 returned) before every later call — including with
`mailto=` throttling — returned **429**. A free key at `openalex.org/settings/api` raises it to
$1/day; that is the gate.

The single successful page still paid: it surfaces a Zenodo record that matters.

## Zenodo record 22982913 — BetBetter teaching dataset
"Bet Better Teaching Dataset 2026: sports results, model projections and closing prices". CC BY 4.0,
6,131 settled markets, 12 sports, 134 market types, 18 May 2025 – 18 Sep 2026, with a codebook.
Files pulled (CSV + codebook), CSV re-parsed (comment-prefixed header lines; 4,740 rows usable).

Columns: league, season, game_date, teams, scores, margin, total, home_win, model_home_margin,
model_total, model_home_win_prob, closing_home_handicap, closing_total_line.

**NFL slice is thin and must be described as such:** 95 games, model columns present but **empty for
NFL**, closing lines on only 16. MLB (2,703) and NBA (838) dominate. So this is a calibration anchor
for NFL closing lines, not a projection benchmark — the codebook says blank means "not available",
not zero.

## Route worth keeping
OpenAlex → DOI → Zenodo/figshare record API → files. Zenodo serves metadata and file bytes with no
auth once you have the record id, so literature search becomes a dataset acquisition path rather
than just reading.
