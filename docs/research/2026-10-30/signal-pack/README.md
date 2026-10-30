# GSE Signal Pack — 2026-10-30

Working, tested implementations of the NFL analytics methods Garrett's
watchlist accounts publish as chart images. Every signal is computed
in-house from public data (nflverse play-by-play + rosters; Pro
Football Reference advanced tables) with its definition written down
next to the numbers. Borrowed charts are never imported — only their
methods are, and each one is checked against the originating post's
published numbers where numbers exist (see `outputs/CHECKS.md`:
1 MATCH, 1 MATCH on count, 1 exact divergence, 1 mechanism
reproduction, 3 method replications where the post published no
checkable numbers, 1 documented gap).

**Window:** Weeks 1–7 — the complete weeks in the nflverse release of
2026-10-30 and the window every originating post used. Week 8 exists
in the release only as the Oct 29 Thursday game (1 of 14 games);
`build_tables.py` uses every complete week it finds, so re-running
after nflverse posts the rest of Week 8 extends all tables to 1–8
with no code change.

## Run it

```bash
pip install -r requirements.txt
python -m gse_signal_pack.build_tables   # fetches data on first run, writes outputs/
python -m pytest tests/ -q               # 8 tests, all on real data
```

Raw downloads cache in `data/` (not committed; regenerable from the
URLs in `gse_signal_pack/data.py`).

## The signals, and where each one plugs in

GSE's weekly layer order: usage → health → matchups → situations →
venues/weather/refs → everything else → market last. The published
reasoning trail is the product; each signal below names the layer it
feeds and the reasoning surface it belongs on.

| # | Signal | Source method | Engine layer | Reasoning surface it feeds |
|---|---|---|---|---|
| 1 | Red-zone expected TD share allowed, by position | @KoalatyStats | **Matchups** | TD-scorer reasoning: which position a defense is structurally set up to concede RZ TDs to. Variance-stripped propensity, so it can be stated in the trail as a structural claim, not a hot streak. Mirror it on offense for the two-sided RZ map |
| 2 | Missed tackles by defense | @sfdata9ers (PFR) / @PattonAnalytics | **Matchups** | Hidden-yards reasoning: ball-carriers vs sloppy-tackling defenses gain yards the box score credits to the runner. Weekly PFR pull (updates Wednesdays). Broken-tackles half is a documented gap — no public team source |
| 3 | QB throwaway rate | @sfdata9ers | **Matchups** (QB evaluation) | Separates QB self-preservation from protection failure; pairs with the sack-fault split (his "Sacks Taken: QB Fault or Not?" chart) in pressure matchup reasoning. Post's digits **diverged** from PFR — use the in-house PFR table, labeled |
| 4 | RB rushing EPA/attempt leaderboard | @boxscorescout | **Usage → Matchups** | RB efficiency independent of volume: the rushing side of the matchup card, and a check on whether a back's production is line-driven or self-created when read with signal 2 |
| 5 | Big plays vs success rate quadrant | @ghatz_28 | **Matchups** | Offense identity in one frame: efficient+explosive (Q1) vs boom-or-bust (Q2) changes how a total and a defense's quarter splits (signal 6) should be reasoned about |
| 6 | Defensive EPA/play by quarter | @sfdata9ers | **Situations** | Late-game defensive decay/strength (e.g. MIN's Q4 split) feeds 2H and live reasoning and the 1H-card breakout: a defense that fades is a second-half fact, not a full-game one |
| 7 | Paired-flip playoff leverage | @Timo_NFL | **Everything else** (season context) + a standing audit rule | Any leverage/rooting-interest number GSE ever publishes uses paired-flip or frozen ratings — never an outcome filter on a dynamic-rating sim. Also the audit question for third-party sim outputs: *which construction produced this number?* |

## Check summary (full ledger: `outputs/CHECKS.md`)

- **S1 RZ xTD share** — method replicated; post published no text numbers.
- **S2 Missed tackles** — **MATCH**: DET 12 fewest (#1), DEN 56 / CLE 51 / PHI 49 worst cluster, PFR-verified. Broken tackles: gap, not faked.
- **S3 Throwaway rate** — **DIVERGED**: PFR gives Nix 9.7% (#1), Young 9.4%, Daniels 7.9% per dropback vs the post's Young 12.7% / Nix 11.5% / Daniels 11.2%. Same top group, different charter (likely PFF), not reproducible publicly.
- **S4 RB EPA/att** — **MATCH on the qualification count**: exactly 39 RBs at a 45-attempt floor, as the chart states.
- **S5 Quadrant** — method replicated under stated definitions (EPA>0 success; explosive pass ≥16 / rush ≥12).
- **S6 Def EPA by quarter** — method replicated; full 32×4 table now owned.
- **S7 Paired-flip** — mechanism **REPRODUCED**: naive filter 0.437 vs paired-flip 0.321 = 1.36× inflation, inside Timo's measured 1.3–1.6× band; the filter manufactures 0.026 leverage for a near-dead team whose paired figure is 0.015.

## Layout

- `gse_signal_pack/data.py` — public-data loaders (nflverse, PFR) + parsers
- `gse_signal_pack/signals.py` — signals 1–6
- `gse_signal_pack/leverage.py` — signal 7 (paired-flip construction + synthetic demo)
- `gse_signal_pack/build_tables.py` — builds `outputs/` (CSV + summary per signal)
- `tests/` — pytest: shape/ranking sanity on real data + the leverage mechanism tests
- `outputs/` — generated tables, per-signal summaries, `CHECKS.md`
