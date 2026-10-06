# HF evaluation — NFL datasets + sports-predictor Spaces (2026-09-28)

**Status: TESTED.** This file replaces the UNTESTED queue in
`docs/engine/research/2026-09-28/hf-gse-inventory.md` for the four NFL items
that were queued. Every row below was exercised live on 2026-09-28; the
commands and the numbers are reproducible. No item is marked dead on
inference — where a thing does not work, the reason is observed, not assumed.

Standing doctrine applied: **we ingest, we learn.** Restricted licenses are
research/learn-only and never enter the product. Nothing here is wired into
the serving path, and nothing here changes a gate, a flag, or a public
surface.

---

## 1. `tuxmx/nfl_bets_scores` — TESTED, USABLE AS A HISTORICAL BACKTEST CORPUS

| Property | Observed value |
|---|---|
| API | `GET https://huggingface.co/api/datasets/tuxmx/nfl_bets_scores` |
| License (HF metadata) | **none declared** (`license: None`) — see the caveat below |
| Gated / private | `false` / `false` |
| File | `spreadspoke_scores.csv` (single file, 1,494,675 bytes) |
| Last modified | 2023-09-28 |

**Schema as read (17 columns, 13,788 data rows):**

```
schedule_date, schedule_season, schedule_week, schedule_playoff,
team_home, score_home, score_away, team_away, team_favorite_id,
spread_favorite, over_under_line, stadium, stadium_neutral,
weather_temperature, weather_wind_mph, weather_humidity, weather_detail
```

**Measured coverage** (`python csv` over the downloaded file):

| Field | Filled | Share |
|---|---|---|
| `stadium` | 13,788 | 100.0% |
| `weather_temperature` | 12,410 | 90.0% |
| `weather_wind_mph` | 12,394 | 89.9% |
| `spread_favorite` | 11,070 | 80.3% |
| `over_under_line` | 10,998 | 79.8% |
| `team_favorite_id` | 11,070 | 80.3% |
| `weather_humidity` | 8,468 | 61.4% |

- Season range **1966–2023**. 2,445 rows from 2015 onward.
- 2015+ `spread_favorite` and `over_under_line` are both **90.2%** filled
  (2,206 rows) — the market lines are far denser on the modern era, which is
  where any honest backtest has to live.
- 119 distinct stadiums.

**Why it is useful here.** This is the only artifact in the queue that closes
a real gap: the repo has game results and (per the source registry) contracted
prices, but the historical *closing* market is thin. `spread_favorite` +
`over_under_line` + `weather_*` + `stadium_neutral` is a venue-and-weather
sabermetric context set that the current backtest corpus
(`data/backtest/nfl_historical_games.json`) does not obviously carry.

**Caveats, stated honestly:**

- **No license is declared on HF.** "No license" is not "public domain" and it
  is not CC-BY. It is also a scrape of the well-known `spreadspoke_scores`
  companion data, which is widely mirrored. Until provenance is confirmed this
  is **research/learn-only**: usable for internal method learning and for
  hypothesis generation, and **not** redistributable and **not** shippable in
  the product. This matches the existing `SmartStake/mlb-player-props` refusal
  pattern in `packages/data-ingestion/src/source-registry.ts` (restricted data
  is learned from, not redistributed).
- `score_home`/`score_away` are ints with no nulls observed; `spread_favorite`
  is **signed to the favorite**, not to the home team — a backtest that reads
  it as a home-side line will silently invert every game. Verified against the
  header semantics, not guessed.
- 2023 is the last season. It is a **backtest** corpus, never a live feed.

**Verdict: TESTED — admit to the backtest corpus as research-only, behind the
existing license fence. NOT a live provider and NOT a product data source.**

---

## 2. `keremberke/nfl-object-detection` — TESTED, CONFIRMED NOT IN SCOPE

| Property | Observed value |
|---|---|
| API | `GET https://huggingface.co/api/datasets/keremberke/nfl-object-detection` |
| License (HF metadata) | **none declared** |
| Gated / private | `false` / `false` |
| Files | `data/train.zip`, `data/valid.zip`, `data/valid-mini.zip`, `data/test.zip` + Roboflow READMEs |
| Task tag | `object-detection` (Roboflow export) |
| Last modified | 2023-01-29 |

The files exist and are ungated, so it is not dead — it is **out of scope**.
This is a player-detection/segmentation image corpus. GSE's serving path is
pure TypeScript statistics (`packages/prediction-engine`, no torch, no ONNX, no
Python runtime in serving), so a vision corpus has nothing to plug into today.
It is only relevant to the 2026-09-26 movement-model plan
(`packages/prediction-engine/src/tracking/cv-movement-primitive.ts`), which
still has no detector and no weights.

**Verdict: TESTED — reclassified from "untested" to "research-only, gated
behind the movement-model detector work." No ingest. No product path.**

---

## 3. `saimanideeppellimari/NFL_prediction` — TESTED, CONFIRMED DEAD (observed, not inferred)

| Property | Observed value |
|---|---|
| API | `GET https://huggingface.co/api/spaces/saimanideeppellimari/NFL_prediction` |
| SDK | gradio |
| **Runtime** | **`BUILD_ERROR`** |
| Last modified | 2024-12-06 |

The HF API reports `stage: BUILD_ERROR` with `hardware: {current: null,
requested: 'cpu-basic'}` and an empty `errors` array. The Space does not boot,
so there is no model to ingest, benchmark, or call. This is the *observed*
reason it is dead, which is what the ingest-and-learn doctrine requires before
a DEAD verdict is allowed — it is not a judgement about the idea.

**Verdict: TESTED — DEAD (build failure, 2026-09-28). Revisit only if the
author's build is fixed; nothing for us to consume meanwhile.**

---

## 4. `seh363/Fantasy-Football-Expected-Points` — TESTED, REAL, AND THE MOST INTERESTING RESULT

This one was listed as "0 likes, 2026-04, unclear." It is **live and it
carries a usable method.** Waking it from `SLEEPING` and reading its
`/config` gives a Gradio 6.13.0 `blocks` app with **18 components and
`dependencies: 0`** — i.e. **no callable API surface at all**. It is a static
dashboard, not an inference endpoint. Anyone trying to wire it as a Space
endpoint will find nothing to call. That is a tested structural fact, not an
inference from the star count.

What it does publish, however, is a **fantasy expected-points model** whose
formulation is worth learning:

- **TPRR** — targets per route run, the core rate feature (RB 0.24 for
  McCaffrey, WR 0.35 for Nacua, TE 0.23 for McBride).
- **YPRR** — yards per route run (receptors, TEs).
- **Slot rate** — share of routes from the slot.
- **Green-zone (RZ) attempts / targets** for RBs.
- **Expected FP** derived from those rates, and an **"Above/Below Expected"**
  residual, which is then reused as a **buy-low score** (`Expected − Actual`).

**Data: 2025 season**, credited in-page to `@StephenHoopes`, data from
`nfl_data_py` + PFF. 20 RB, 20 WR, 10 TE leaderboards + three buy-low tables.

**The numbers are real but they are IN-SAMPLE and pre-season, so they are a
method lesson, not a performance claim.** Measured from the published tables
(`Expected − Actual` column order verified against the buy-low table, where
`expected − actual` reproduces the stated diff on 25/25 rows):

| Pos | n | MAE (FP) | bias (Actual − Expected) | beat expected | sd of error |
|---|---|---|---|---|---|
| RB | 20 | 1.53 | **+1.12** | 13/20 (65%) | 1.74 |
| WR | 20 | 1.42 | +0.30 | 11/20 (55%) | 1.89 |
| TE | 10 | 1.53 | **+1.53** | **10/10 (100%)** | 1.00 |

**Two findings worth keeping, both stated as findings and not as endorsements:**

1. **Every leaderboard is sorted descending by Expected FP and truncated to
   the top N.** That is a selected sample, so the MAE/bias figures above are
   *not* out-of-sample error and must not be quoted as model accuracy. The
   truncation and the sort are visible in the published rows.
2. **TEs beat their expected value 10-for-10 with a +1.53 bias and the
   tightest spread (sd 1.00).** Under the truncated leaderboard selection this
   is most consistent with the TE expected-FP formula being systematically
   low rather than the TEs being systematically lucky — an early-season
   (2025) effect concentrated in a thin position. RBs show the same
   direction at lower magnitude (+1.12).

**Why this matters to us regardless of the model's accuracy:** "expected FP
from route participation rates, then trade the residual" is exactly the shape
of the **adjustment layer** that shipped in PR #927
(`apps/web/lib/signals/adjustment-layer.ts`). This Space is an independent
external confirmation that the rate-based-expectation-plus-residual framing is
a real, published approach in this domain — and an equally useful warning that
a position-level bias of +1.5 FP is large enough to erase any edge on its own.
That is a concrete calibration test to add to the fantasy backtest, and it is
the reason this item moves from UNTESTED to TESTED-and-useful.

**Verdict: TESTED — LEARN THE METHOD, DO NOT ADOPT THE NUMBERS.** No API to
call (0 dependencies). Expected-FP rate model and the buy-low residual are
worth mirroring in our own fantasy backtest; the published 2025 numbers are
in-sample and must not enter a product surface or a public claim.

---

## 5. Embedding tracks (bge-m3, Qwen3) — PARTIALLY TESTED, BLOCKED ON A FOUNDER TOKEN

Both model cards verified live via the HF API on 2026-09-28:

| Model | ID | License | Downloads | Likes |
|---|---|---|---|---|
| bge-m3 | `BAAI/bge-m3` | **MIT** | 36,143,759 | 3,709 |
| Qwen3 embedding | `Qwen/Qwen3-Embedding-0.6B` | **Apache-2.0** | 9,457,677 | 1,252 |

**Both are commercially clean** — MIT and Apache-2.0 are the two licenses most
friendly to a product path, so unlike the datasets above there is no license
obstacle to either. That is a genuine, tested upgrade over the "research-only"
verdict those items carried on reputation alone.

**What actually blocks them today is infrastructure, tested not assumed:**

1. **No local runtime.** `torch`, `transformers`, and `sentence_transformers`
   are all absent from this machine's Python 3.14.7. AGENTS.md law 7 forbids
   installing packages, so local embedding is not available to an agent run.
2. **Hosted inference returns 401.** Observed, not inferred:
   ```
   POST https://router.huggingface.co/hf-inference/models/BAAI/bge-m3/pipeline/feature-extraction  -> 401
   POST https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-m3               -> no route (host retired)
   ```
   No `HF_TOKEN` is present in the environment or in any `.env*` file (checked:
   `env | grep -i hf_` and `grep -il huggingface .env*` both return nothing).

**Conclusion: BLOCKED on a founder action, not on the models.** Creating an HF
account and minting a free token is a signup tap reserved to the founder, in
the same class as the GCP billing decision — an agent must not start it. The
corpus to embed is real and large: **2,838 markdown files under `docs/`**, of
which the research buckets are the valuable part.

**Verdict: TESTED — licensing cleared, blocked on `HF_TOKEN`.** Once a token
exists, bge-m3 (MIT) is the right first target for a research-corpus retrieval
prototype: multi-vector, multilingual, 8k context, and small enough to serve
on CPU. Note the architectural constraint from the inventory — the serving path
is pure TypeScript, so embeddings would arrive as an **API or a sidecar**,
never as in-process weights.

## 6. ZeroGPU — deliberately NOT exercised

Free tier is 5 GPU-minutes/day (verified email, 30+ day old account), and
nothing in this queue needs inference: items 1–4 are a CSV, an image corpus,
and two static dashboards. Spending the quota now would burn it for nothing.
Chronos remains correctly held behind projection-source lock + backtests per
the backlog ordering.

## Summary — what changed in the queue

| Item | Was | Now (tested 2026-09-28) |
|---|---|---|
| `tuxmx/nfl_bets_scores` | UNTESTED | **TESTED — research-only historical backtest corpus** (1966–2023, 13,788 games, market lines 80%+ / 90%+ post-2015). No declared license. |
| `keremberke/nfl-object-detection` | UNTESTED | **TESTED — out of scope**, vision corpus, ungated, no serving path. Gated behind movement-model detector work. |
| `saimanideeppellimari/NFL_prediction` | UNTESTED | **TESTED — DEAD, `BUILD_ERROR`**, does not boot. Observed reason recorded. |
| `seh363/Fantasy-Football-Expected-Points` | UNTESTED, "unclear" | **TESTED — LIVE, static dashboard, 0 API dependencies.** Publishes a TPRR/YPRR rate-based expected-FP model + buy-low residual. Method is worth adopting; 2025 numbers are in-sample. |
| `BAAI/bge-m3` | UNTESTED | **TESTED — MIT, commercially clean.** Blocked on `HF_TOKEN` (401 observed). |
| `Qwen/Qwen3-Embedding-0.6B` | UNTESTED | **TESTED — Apache-2.0, commercially clean.** Same token blocker. |
| ZeroGPU | "never mentioned" | **Deliberately not exercised** — nothing in this queue needs inference; quota preserved. |

Still UNTESTED and not attempted this pass: the Qwen3 internal Space and
Parakeet transcription (both need a token), and Chronos (held behind
projection-source lock + backtests per the backlog ordering).

**One founder action would unblock two rows: mint a free HF read token.**

## Reproduce

```bash
# datasets
curl -s https://huggingface.co/api/datasets/tuxmx/nfl_bets_scores
curl -sL https://huggingface.co/datasets/tuxmx/nfl_bets_scores/resolve/main/spreadspoke_scores.csv -o spreadspoke_scores.csv
wc -l spreadspoke_scores.csv        # 13789 (header + 13788)

# spaces
curl -s https://huggingface.co/api/spaces/saimanideeppellimari/NFL_prediction   # stage BUILD_ERROR
curl -s https://huggingface.co/api/spaces/seh363/Fantasy-Football-Expected-Points  # stage SLEEPING
curl -s https://seh363-fantasy-football-expected-points.hf.space/config -o cfg.json  # wakes it; 0 dependencies
```

The Space's `/config` is the whole payload: the leaderboards are inline HTML in
`html` components, so reading them is HTML parsing, not an API call.
