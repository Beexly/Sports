# College football data sources — verified findings, 2026-09-04

Supersedes the CFBD assessment in `docs/ops/OVERNIGHT_NCAAF_2026-09-04.md` § 2.3.

Every clause below marked **VERIFIED HERE** was fetched and read in this session.
Everything else is labelled with what is actually known. The distinction matters:
a wrong licence read is the one error that can cost the company the product.

---

## 1. CFBD terms — read directly, and they are permissive

**VERIFIED HERE** — fetched `https://collegefootballdata.com/terms`, effective
**2026-08-12**. The registry's standing objection that the page is "JS-rendered and
was NOT machine-verifiable" is **stale**: it reads fine now.

Verbatim, the clauses that matter to us:

> "Commercial use is permitted. Your subscription tier determines your API usage
> quota, not whether you may use the API commercially."

> "privately cache, store, normalize, and retain API responses"

> "retain API Data retrieved while your access was active in a private historical
> corpus after API access or a subscription ends"

> \[you may perform] "historical analysis, backtesting, feature engineering, and
> model training"

> "publish and commercialize independently created analyses, models, model weights,
> predictions, projections, rankings, visualizations, and other Derived Outputs"

And the prohibition:

> "You may not sell, sublicense, publish, or provide API Data as a standalone dataset
> or bulk download" … "operate a raw feed, public database mirror, proxy, substitute
> API, or substantially equivalent data service."

**That maps cleanly onto how this platform already works.** `.claude/rules/scraping.md`
permits extracting facts and publishing *derived signals we generate*, and bars
republishing source expression. CFBD's permitted list is our operating model almost
word for word; its prohibited list is a thing we have no interest in doing.

### The registry entry still should NOT be flipped yet

`source-rights-registry.ts:735` has two unlock conditions, and reading the terms only
satisfies part of one:

1. **Obtain a free CFBD API key** — *not done*.
2. **Confirm the terms permit our commercial use**, via "a human/legal read" —
   the text is now in hand and quoted above, but the condition names a **human**
   read, and an agent's fetch is not that.

So the correct state remains `vendor_candidate`, all flags `false`. What has changed
is that the human read is now a two-minute job against the quotes above rather than
a research project. **Flipping the status is the founder's call, not an agent's.**

---

## 2. CFBD does not label a closing line — but may carry both ends of the move

**VERIFIED HERE** — fetched the `GameLine` schema
(`CFBD/cfbd-python/docs/GameLine.md`). Complete field list:

```
provider · spread · formatted_spread · spread_open ·
over_under · over_under_open · home_moneyline · away_moneyline
```

- **No field is described as a closing line.**
- **There is no timestamp** indicating when a line was captured.
- No field carries a description at all in the generated docs.

Two readings, and the difference decides whether CFBD is worth the integration:

- If unsuffixed `spread` / `over_under` are the **final (closing)** numbers, then CFBD
  gives us `spread_open` **and** the close on the same row — **both ends of the line
  move**. That is strictly more than nflverse offers for the NFL, where we have the
  close only and every backfilled pick therefore grades `MATCHED_CLOSE` with CLV
  structurally unmeasurable. CFBD would make CLV — the un-fakeable proof metric —
  measurable for NCAAF *before* it is measurable for NFL.
- If unsuffixed means "most recent seen, whenever that was," the pair is not a clean
  open/close and CLV computed from it would be a number we could not defend.

**This is the one open question worth resolving before spending anything on CFBD,**
and it is answerable with a free key and one request: pull `/lines` for a completed
game and compare the unsuffixed value against a known closing number. Do not
integrate on the assumption; do not compute CLV from these two fields until the
answer is in.

---

## 3. sportsdataverse `espn_cfb_betting` — has the label, lacks the licence

From the research log (**not independently verified here**): the release describes
itself as *"closing betting lines and odds"*, 23 seasons (2004–2026), 48 assets,
286 KB, last asset written 2026-08-27.

Two disqualifiers as things stand:

- **No licence.** No dataset licence or commercial-use clause on the release page, and
  the sibling `cfbfastR-cfb-data` repo's `LICENSE` path returns 404. Under
  `.claude/rules/scraping.md` an absent licence is not a permissive one. This is the
  blocker, not a nit.
- **No moneyline.** `home_moneyline` / `away_moneyline` NOT OBSERVED. The engine
  scores three markets; this source can only feed two.

It also has no team names in the betting table — `home_team` / `away_team` require a
join on `game_id` to schedules.

Worth pursuing *only* if someone establishes the licence. It is the only candidate
that explicitly claims closing lines, which is exactly what NCAAF calibration needs.

---

## 4. Correcting a finding that keeps recurring: nflverse DOES carry closing lines

The research log records, for `nflverse/nflverse-data`:
`spreadLine: NOT OBSERVED`, `totalLine: NOT OBSERVED`, `homeMoneyline: NOT OBSERVED`,
`awayMoneyline: NOT OBSERVED`, and closing lines "NOT VERIFIED".

**This is wrong, and it is the third time it has been recorded.** It is disproved by
data this repo pulled and used the same day:

- `games.csv` carries `spread_line`, `total_line`, `home_moneyline`, `away_moneyline`
  on **7,276 rows** with finals attached.
- The entire 27-season replay in `docs/data/NFL_REPLAY_CALIBRATION_2026-09-04.md`
  (15,939 settled picks) was computed from exactly those columns.
- The spread-sign verification measured `corr(spread_line, result) = +0.4260` across
  those rows.

The cause is consistent each time: the reviewer opens the **play-by-play** release or
the `nflreadr` README. The lines live in the **`schedules` / `games.csv`** release —
Lee Sharpe's `nfldata`, mirrored at
`https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv`.

The consequence of leaving this uncorrected is that it argues for licensing a college
source to solve a problem nflverse already solves for the NFL.

---

## 5. Calibration research worth acting on

Five papers came back. Ranked by what is implementable inside a frozen deterministic
model, which is the only kind of change this engine accepts:

1. **Variable-Based Calibration** (Kelly & Smyth) — *has code*
   (`markellekelly/variable-wise-calibration`). Train a decision tree on **one**
   chosen variable, then fit a per-leaf calibrator. **This is the direct fix for the
   defect already on record: no code path conditions calibration on sport.** Split on
   sport (or on favourite strength), calibrate per leaf, freeze, and report
   variable-based calibration error alongside ordinary ECE — which would have caught
   "every calibration sample is non-football" automatically.
2. **Foulley, football forecast verification** — reliability, Brier decomposition and
   discrimination on held-out chronological data. This is the formal version of what
   the replay doc reports by hand; adopting its decomposition makes the published
   number comparable to the literature.
3. **Conformal prediction beyond exchangeability** (Barber, Candès, Ramdas,
   Tibshirani) — recency-weighted quantiles for temporal drift. Directly relevant:
   nfelo's 2009-2024 close-game ATS was 55.06% but **2024 alone was 45.3%**. Drift is
   real in this domain and an unweighted historical quantile hides it.
4. **Dirichlet calibration** (Kull et al.) — *has code*. Multiclass, so it is the
   principled answer to the **soccer three-way** market that PR #694 currently
   suppresses because our de-vig is two-way. Not a launch item; the correct long-term
   fix.
5. **Temporal Probability Calibration** (Leathart & Polaczuk) — per-horizon
   calibration maps. Relevant only once we price lines at multiple horizons, which
   requires an open/close archive we do not yet have.

All five calibrate a **frozen** model's outputs rather than changing its scoring, so
none of them require a `MODEL_VERSION` bump to evaluate — only to deploy.

---

## 6. What this changes

- CFBD's rights position is **much better than the registry currently records**, and
  the blocking objection ("terms not machine-verifiable") is factually stale.
- The remaining CFBD unknown is **line semantics, not legality** — and it is a
  free-tier, one-request question.
- The NCAAF closing-line corpus problem is **not solved**: CFBD may not label a close,
  and the one source that does claim closing lines has no licence.
- nflverse remains the only fully cleared, complete, lines-plus-scores corpus we hold,
  and it is NFL only.
