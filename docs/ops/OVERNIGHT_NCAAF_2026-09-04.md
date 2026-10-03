# Overnight run — NCAAF/NFL calibration, 2026-09-04

Written by the architect session for the 2026-09-05 launch. Two dispatch prompts
(Firecrawl recon, Hermes/GLM build order) sit at the bottom. Everything above them
is the verified fact base they depend on — each line traces to a file read or a
command run in this session, and anything unverified is labelled `NOT VERIFIED`.

---

## 1. The one thing that decides tonight

**Play-by-play is not a calibration corpus.** Calibrating a *picks* model means
replaying the frozen model against the price it would have bet and grading the
result. That needs **closing lines**. Play-by-play carries plays, not prices.

So of the two college assets in hand:

| Asset | What it is | Calibrates picks? |
|---|---|---|
| `cfb_pbp_2025_all.csv` (local) | 2025 college play-by-play | **No** — no lines. Feature/covariate fuel only. |
| Kaggle `robbypeery/college-football-data-2025` | `NOT VERIFIED` — contents unread | Only if it ships closing spread/total/ML per game |

Both are genuinely useful — as **features** feeding the model's inputs. Neither is
the thing that produces an NCAAF reliability curve. That still needs a lines corpus.

**The overnight win that is actually available is NFL**, and it is a large one — see §3.

---

## 2. Verified state

### 2.1 The replay engine already exists and is one line from being sport-agnostic

`packages/prediction-engine/src/historical-replay.ts` (430 lines) exports
`assemblePreGameFeatures`, `buildHistoricalOddsInput`, `scoreHistoricalGame`,
`settleHistoricalPick`, `replayAndSettleGame`, `backfillPickKey`, `LookaheadLeakError`.
It splits a raw schedule row into two disjoint, type-separated halves so the scorer
structurally cannot see a score, and it reuses the **frozen** `scoreGame` unchanged.

Its input type `RawScheduleRow` is already generic in shape:
`gameKey · season · week · gameType · homeTeam · awayTeam · commenceTime ·
spreadLine · totalLine · homeMoneyline · awayMoneyline · restHome · restAway`.

Nothing in that list is NFL-specific. The **only** NFL coupling in the module is:

```
packages/prediction-engine/src/historical-replay.ts:234
    sport: "americanfootball_nfl",
```

plus a comment at :425 anchoring a week-stepper to the NFL September start.

**Consequence: NCAAF replay needs no new engine. It needs (a) that literal turned
into a parameter, and (b) a CFB lines corpus mapped onto `RawScheduleRow`.**

### 2.2 The calibration script carries a false claim in its own header

`scripts/run-historical-calibration.mjs:11-13`:

> "Why this is the honest 'run calibration': our own PICK model can't be calibrated
> until real settled picks exist (none do yet)."

That was true before `historical-replay.ts` landed. It is false now — the replay
module exists precisely to manufacture settled picks from history without lookahead.
The script itself is fine (it calibrates the **market**, which is the baseline the
engine must beat). Only the header sentence is wrong, and it is load-bearing: it is
the sentence that has twice caused this program to defer NFL calibration.

**Fix the comment. Do not weaken the script.**

### 2.3 CFBD is blocked on a terms read, not only on money

`apps/web/lib/scraping/source-rights-registry.ts:735` — `collegefootballdata`:

```
status: "vendor_candidate"
automation_allowed: false      public_logged_off_allowed: false
commercial_display_allowed: false   storage_allowed: false
derived_analytics_allowed: false    model_training_allowed: false
```

`unlock_condition` (verbatim, abridged): obtain a free CFBD API key **AND** confirm
the Terms & Conditions permit our commercial use — "The terms page is JS-rendered and
was NOT machine-verifiable, so it needs a human/legal read."

**Correction to an earlier statement of mine.** I previously said NCAAF was "a
$10/month subscription, not a rights step." That was half right and the wrong half
matters. The $10/mo Tier-3 buys **throughput** (free tier is 1,000 calls/mo). The
registry blocker is the **terms confirmation**, which is a human read — and until it
lands, every flag stays false and the ingestion guardrail
(`scripts/guardrails/*` tying ingestion code to this registry) will refuse the adapter.

Paying without reading does not unblock it. Reading without paying probably does,
for a backfill sized to the free tier.

### 2.4 nflverse is fully cleared, right now

Same registry, line 111: `nflverse` → `status: "approved_open_license"`, CC-BY-4.0,
attribution `"Data from nflverse (https://github.com/nflverse), CC-BY-4.0"`. The
approval explicitly covers nflverse's own compiled releases (pbp, player_stats,
**games**). `games.csv` carries every game since 1999 with **closing** spread, total
and both moneylines, plus finals.

That is a ~7,000-game, 27-season, no-lookahead, already-cleared corpus sitting behind
a URL the repo already fetches.

---

## 3. What the night should actually produce

Ranked by value ÷ risk, all of it inside the existing frozen model:

1. **NFL replay calibration over nflverse 1999-present.** Cleared data, existing
   engine, no new rights work. Produces the first real reliability curve, ECE and
   Brier decomposition for *our picks* rather than for the market. This is the
   FOUNDING → PROVEN proof gate's actual input.
2. **Parameterize `historical-replay.ts:234`.** ~5 lines + a test. Turns NCAAF into
   a data-drop rather than an engineering project.
3. **Land PR #692** (ESPN scoreboards targeted by US Eastern day, not UTC). Still
   unmerged. Highest value-to-risk ratio of anything open: without it, late-window
   games settle against the wrong scoreboard day.
4. **Ingest the college PBP as features**, behind a clearance entry — not as a
   calibration corpus.
5. **Fix the `run-historical-calibration.mjs` header.** One comment. Stops the
   program deferring calibration a third time.

What the night will **not** produce, and claiming otherwise would violate rule 8 and
AGENTS.md law 4: a *validated, out-of-sample, multi-season NCAAF* calibration. That
needs a college closing-lines corpus we do not yet hold, and out-of-sample validation
needs held-out seasons. Overnight gets NCAAF **wired and honest**, with NFL **proven**.

---

## 4. Prompt A — Firecrawl recon (GitHub · arXiv · awesome lists)

> **Mission.** Find the corpora and methods that let Galaxy Sports Edge calibrate a
> college-football picks model, and find the open-source state of the art we are
> currently behind. Report only what you actually opened.
>
> **Ranking rubric — apply to every candidate, lead with tier 1.**
> - **Tier 1 (only this changes tonight):** carries **closing** spread / total /
>   moneyline for **NCAAF**, ideally 2013→present, at game granularity, under a
>   license permitting commercial derived use. Nothing else is tier 1. Play-by-play
>   without prices is **tier 2 by definition**, however large.
> - **Tier 2:** NCAAF features (efficiency, pace, drive, recruiting, returning
>   production), NFL corpora beyond nflverse, or a method we lack.
> - **Tier 3:** everything else. Cap tier 3 at ten lines total.
>
> **For every tier-1 or tier-2 hit, report exactly these fields.** Any field you did
> not personally verify by opening the page: write `NOT VERIFIED`. Do not infer a
> license from a repo's reputation.
> ```
> url · what it is (one line) · LICENSE file text (name + the actual clause on
> commercial + derivative use) · does it carry CLOSING lines (yes/no/partial —
> and the column names you saw) · sports · season coverage (first→last, observed,
> not claimed in the README) · update cadence + last commit date · format
> (csv/parquet/api) · approximate size · how it maps onto RawScheduleRow
> (gameKey, season, week, homeTeam, awayTeam, commenceTime, spreadLine,
> totalLine, homeMoneyline, awayMoneyline)
> ```
>
> **Seeds — verify each exists before reporting it; several may not.**
> - GitHub orgs: `nflverse`, `sportsdataverse`, `CFBD` / collegefootballdata,
>   `openfootball`, `greerreNFL` (nfelo)
> - GitHub search, run each and page at least three deep:
>   `college football closing line dataset`, `NCAAF spread historical csv`,
>   `cfbfastR`, `cfbd api client`, `sports betting closing line value`,
>   `sportsbook historical odds archive`, `NFL calibration isotonic`,
>   `elo college football`, `power ratings college football open source`
> - Awesome lists: `josephmisiti/awesome-machine-learning`,
>   `academic/awesome-datascience`, plus a GitHub search for
>   `awesome sports analytics`, `awesome sports betting`, `awesome football data`.
>   awesomeopensource.com is a mirror — resolve every hit back to its **GitHub**
>   repo and verify there; do not report the mirror as a source.
> - arXiv (`stat.AP`, `stat.ML`, `cs.LG`, `econ.EM`), last 5 years, and prefer
>   papers whose code is public: `calibration of sports forecasts`,
>   `probability calibration isotonic beta`, `closing line value efficiency`,
>   `betting market efficiency college football`, `Bayesian hierarchical
>   college football ratings`, `conformal prediction sports`,
>   `expected calibration error debiased`. For each: title · authors · link ·
>   **the one method we could implement inside a frozen deterministic model** ·
>   code link or `NO CODE`.
>
> **Hard constraints — these are not style notes.**
> - **No credentialed access.** Do not create accounts, do not log in, do not
>   accept a ToS on our behalf, do not download anything behind a paywall or a
>   click-through licence. Public, logged-off pages only.
> - **Report the licence, never route around it.** If a source is exactly what we
>   need but its terms forbid commercial derived use, that is a *finding*, reported
>   as such. It is not an obstacle to solve.
> - **CFBD specifically:** open <https://collegefootballdata.com/terms> and quote
>   the commercial-use clause **verbatim**. That page is JS-rendered and previously
>   defeated machine reading — if you cannot read the rendered text, say
>   `TERMS UNREADABLE` and stop. Do not summarise what you think it says. Separately
>   confirm from the pricing/tier page whether the API exposes **opening and closing**
>   lines or only one snapshot; CLV needs the close. Quote the endpoint list.
> - No claim without a URL you opened. An honest `NOT VERIFIED` is worth more to us
>   than a confident guess — a wrong licence read is the one error that can cost the
>   company the product.

---

## 5. Prompt B — Hermes / GLM build order

> **Context you need and cannot see.** `packages/prediction-engine/src/historical-replay.ts`
> already implements no-lookahead replay against the frozen `scoreGame`. Its input
> type `RawScheduleRow` is sport-agnostic in every field. The single NFL coupling is
> the string literal at **line 234**, `sport: "americanfootball_nfl"`. You are not
> building a replay engine. You are feeding one.
>
> Five tasks, in this order. **One task = one commit**, staged by name, tagged
> `[hermes-<task-id>]`. Verify block before every commit: `npm run typecheck` →
> `npm run lint` → `npx vitest run <this task's test file>`, real exit codes, never
> piped away. Claim each row in `docs/ops/AGENT_LEDGER.md` in the same commit that
> begins it.
>
> ### T1 — Parameterize the replay sport *(highest leverage, ~5 lines)*
> Add an optional `sportKey` to the replay input, defaulting to
> `"americanfootball_nfl"` so every existing caller and test is byte-identical.
> Thread it to line 234. Update the :425 week-stepper comment to say it is
> NFL-calendar-specific.
> **Test:** replaying one row with `sportKey: "americanfootball_ncaaf"` produces a
> pick whose `sport` is NCAAF, *and* an existing NFL fixture still produces the
> identical pick object it produces today. The second half is the important half —
> it proves you changed nothing that ships.
> **Risk:** low. Default-preserving. **Never** bump `MODEL_VERSION` for this.
>
> ### T2 — Run the NFL replay calibration for real
> Replay nflverse `games.csv` (1999→present, already cleared: registry line 111,
> `approved_open_license`, CC-BY-4.0) through `replayAndSettleGame`. Emit, as a
> committed artifact under `docs/data/`:
> reliability curve (10 bins), ECE (adaptive **and** debiased), Brier with its
> three-way decomposition (reliability / resolution / uncertainty), n per bin, and
> the same numbers **split by season** so we can see drift.
> Hold out the **most recent two seasons** and report in-sample and out-of-sample
> separately. An in-sample-only number is not a calibration result and must not be
> published as one.
> **If the engine turns out to be badly calibrated, report that number.** A published
> bad number is an asset; a suppressed one is the end of the company. Do not tune
> anything to improve it in this task.
>
> ### T3 — Correct the false header
> `scripts/run-historical-calibration.mjs:11-13` claims our pick model "can't be
> calibrated until real settled picks exist (none do yet)." `historical-replay.ts`
> falsifies that. Rewrite those three lines to say what the script actually does —
> it calibrates the **market** closing line, which is the baseline the engine must
> beat — and point at the replay module for engine calibration. **Comment only. Do
> not touch the script's logic.**
>
> ### T4 — The college play-by-play, as features and only as features
> The owner has `C:\Users\Garrett\Downloads\cfb_pbp_2025_all.csv` on the Windows box
> you run on. The architect session runs in a Linux container and cannot see it —
> this task is yours because you can actually read the file.
> 1. Report its real shape first: `head -3`, the full column list, row count, the
>    season/week range **observed in the data**, and whether **any** column carries a
>    spread, total or moneyline. Report before you build.
> 2. Provenance chain: this file came from Kaggle
>    `robbypeery/college-football-data-2025`. Open that dataset page, read its
>    **licence** and its stated upstream source, and quote both. A Kaggle re-upload
>    inherits its upstream's rights — it does not launder them.
> 3. Only then, add a `source-rights-registry.ts` entry. Status is whatever the
>    licence actually supports — `approved_open_license` **only** if you read a real
>    open licence; `vendor_candidate` with every flag `false` otherwise. If the
>    licence is absent or unclear, that is `vendor_candidate`. Do not guess upward.
> 4. Treat it as **feature** input (efficiency, pace, drive outcomes), never as a
>    calibration corpus — it has no prices, so it cannot grade a pick.
> **Two attempts, then BLOCKED with the exact error.**
>
> ### T5 — CFBD, terms first
> Do **not** build the adapter and do **not** pay for a tier. Produce a one-page
> decision memo: the verbatim commercial-use clause from
> <https://collegefootballdata.com/terms>, whether the API exposes opening **and**
> closing lines, the season coverage of its lines endpoint, and the free tier's
> 1,000-calls/month budget against the number of calls a 2013→2024 backfill needs.
> If the terms are unreadable, write `TERMS UNREADABLE` and stop. The registry entry
> stays `vendor_candidate` until a human signs off — you do not flip it.
>
> **Laws that bind this run.** Never modify `packages/db/prisma/**`,
> `.github/workflows/**`, `scripts/guardrails/**`, `.claude/**`, any `.env*`,
> `package-lock.json`. Never flip a gate or env flag. Never fabricate a number.
> Never `--no-verify`. Never weaken a guard to pass a test. Push only to
> `hermes/ncaaf-calibration-2026-09-04`; open it as a **draft** PR.

---

## 6. Honest scope line

Overnight delivers: NFL picks calibrated on 27 real seasons with an out-of-sample
split, the replay engine sport-agnostic, the college PBP ingested as cleared features,
and a CFBD go/no-go memo grounded in the actual terms text.

Overnight does not deliver a validated multi-season NCAAF calibration. That needs a
college closing-lines corpus we do not hold tonight, and out-of-sample validation
needs held-out seasons. Saying otherwise at launch would be the one kind of claim
this product cannot survive making.
