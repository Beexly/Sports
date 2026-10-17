# Cognitive / behavioral ingestion — signal format spec (domain 2.4)

**Run:** 2026-10-13 · **NFL week in view:** 6 · **Spec owner:** domain 2.4 ingestion lane
**Implementation:** `intelligence/ingestion/cognitive/ingest_cognitive.py` (live layer) +
`intelligence/ingestion/cognitive/derived_local.py` (local-derived layer)
**Landed digest:** `docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json`
(`generated_utc` = `2026-10-13T22:14:26.910326+00:00`, week 6, 8 keyless requests, 0 errors)

---

## 1. Signal record format (the contract the reasoning engine consumes)

Every record is one JSON object. Records are grouped in the digest by
`signals.<family>`; each object carries its own `signal_type`, so a consumer can
also read `signals.*[]` as one flat stream and dispatch on `signal_type`.

### 1.1 Universal envelope — present on **every** record

| field | type | required | example | meaning |
|---|---|---|---|---|
| `signal_id` | `string` | yes | `"local-scheme_shift-ARI-early_down_pass_rate"` | Stable id, unique within a run. Live layer: `ps-news-GB-0`. |
| `signal_type` | `enum` | yes | `"scheme_shift"` | Family discriminator. See §2 for the closed set. |
| `team` | `string` | yes | `"ARI"` | Team abbreviation; `"LEAGUE"` when the text is league-wide. |
| `player` | `string` | yes | `"J.Brissett"` or `""` | Empty string when the signal is team- or league-level. Never `null`. |
| `generated_utc` | `string` (ISO-8601 UTC) | yes | `"2026-10-13T22:07:39.241166+00:00"` | When this record was produced. |
| `provenance` | `object` | yes | see §1.2 | Source identity + method + confidence. |
| `evidence_excerpt` | `string` | yes | `"early-down pass rate; keyless proxy for…"` | Human-readable justification. `""` when the metric is self-describing. |

### 1.2 `provenance` object

Two source kinds exist. A consumer must read `source_kind` before trusting
`source_url`: for local artifacts `source_url` is `""` and `source_path` is set.

| field | type | live layer | local-derived layer |
|---|---|---|---|
| `source_url` | `string` | keyless endpoint URL, e.g. `"https://site.api.espn.com/apis/site/v2/sports/football/nfl/news"` | `""` |
| `source_path` | `string` | `""` | repo-relative artifact, e.g. `"intelligence\\coaching\\data\\weekly_tendencies.csv"` |
| `source_kind` | `enum` | `"espn_site_api"` \| `"google_news_rss"` | `"local_nflverse_artifact"` |
| `artifact_sha256` | `string` | `""` | sha256 of the artifact as read, e.g. `"42e4104c5014c70df7f7ca0831a4106495ae8a5902bcd0f581b866b38d595b26"` |
| `retrieved_utc` | `string` (ISO-8601 UTC) | fetch time | run time |
| `method` | `string` | e.g. `"headline_description_lexicon_v1"` | e.g. `"weekly_tendencies_csv_v1"` |
| `confidence` | `enum` | `"high"` \| `"medium"` \| `"low"` | `"medium"` |
| `unverified` | `bool` | `true` when the method is a heuristic on partial text | `false` unless the artifact was absent |
| `unverified_reason` | `string` | e.g. `"headline/description text only; no transcript or full-article text"` | `""` |
| `note` | `string` | `""` | description of what the artifact is |

### 1.3 Trend-stat block — present on every trend/break family

`scheme_shift`, `tendency_break`, `snap_trend_break`, `target_trend_break`,
`fourth_down_trend` all carry the same baseline-comparison block:

| field | type | example | meaning |
|---|---|---|---|
| `metric` | `string` | `"early_down_pass_rate"` | Metric name inside the family. |
| `unit` | `enum` | `"rate"` \| `"share"` \| `"yards"` \| `"plays"` \| `"timeouts"` \| `"mahalanobis"` | Unit of `last_value`/`delta`. |
| `series` | `array<{week:int, value:float}>` | `[{"week":1,"value":0.5179},{"week":2,"value":0.5588},{"week":3,"value":0.6333}]` | Weekly points used. |
| `baseline_mean` | `float\|null` | `0.5408` | Mean of the comparison window. |
| `baseline_n` | `int` | `24` | Number of points in the comparison window. |
| `baseline_reliability` | `enum` | `"ok"` \| `"insufficient_n_lt_6"` | `ok` only when `baseline_n >= 6`. |
| `last_value` | `float\|null` | `0.6333` | Most recent point. |
| `delta` | `float\|null` | `0.0925` | `last_value - baseline_mean`. |
| `z_score` | `float\|null` | `0.89` | `delta / sd(baseline)`. |
| `direction` | `enum` | `"up"` \| `"down"` \| `"flat"` \| `"more_aggressive"` \| `"less_aggressive"` | Sign of the move. |
| `break_detected` | `bool` | `false` | Confirmed break only: `|z|>=2` **and** `|delta|>=min_effect` **and** `baseline_reliability=="ok"`. |
| `break_candidate` | `bool` | `false` | Same thresholds but short baseline — a candidate, **not** a confirmed regime break. |
| `status` | `enum` | `"break"` \| `"break_candidate"` \| `"no_break"` \| `"no_baseline"` \| `"insufficient_history"` | Graded verdict. |
| `min_effect` | `float` | `0.10` | Effect-size floor used for this metric. |

> **Rule:** a large `z_score` computed from a 2–3 point baseline is not evidence.
> Those are reported as `break_candidate` and must not be treated as `break`.

### 1.4 Shared run-level envelope (digest top level)

```json
{
  "generated_utc": "2026-10-13T22:14:26.910326+00:00",
  "domain": "2.4 cognitive/behavioral",
  "week": 6,
  "spec": "docs/ops/COGNITIVE-INGEST-2026-10-13.md",
  "counts": { "...": 0 },
  "sources": [ {"label": "espn_news", "url": "…", "ok": true, "http_status": 200, "bytes": 184603} ],
  "requests_used": 8,
  "errors": [],
  "unavailable_or_partial": [ {"metric": "…", "status": "…", "reason": "…"} ],
  "local_derived_layer": {"enabled": true, "zero_network_requests": true, "artifacts": [], "counts": {}},
  "signals": { "presser_sentiment": [], "depth_chart_move": [], "…": [] }
}
```

---

## 2. Family definitions (closed set for this run)

### 2.1 `presser_sentiment`

Coach/coordinator presser tone + word choice from headline/description text.

```json
{
  "signal_id": "ps-news-GB-0",
  "signal_type": "presser_sentiment",
  "team": "GB",
  "player": "",
  "generated_utc": "2026-10-13T22:07:39.241166+00:00",
  "provenance": {
    "source_url": "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news",
    "source_path": "",
    "source_kind": "espn_site_api",
    "artifact_sha256": "",
    "retrieved_utc": "2026-10-13T22:07:39.241166+00:00",
    "method": "headline_description_lexicon_v1",
    "confidence": "medium",
    "unverified": true,
    "unverified_reason": "headline/description text only; no transcript or full-article text",
    "note": ""
  },
  "evidence_excerpt": "Micah Parsons: Jayden Daniels probably 'cost my man Dan Quinn his job'. …",
  "coach": "Dan Quinn",
  "polarity": -1.0,
  "sentiment_label": "negative",
  "positive_hits": 0,
  "negative_hits": 1,
  "hedge_hits": 2,
  "hedge_rate": 0.0526,
  "word_choice_flags": [],
  "doc_count": 1,
  "text_scope": "headline_description",
  "published_utc": "2026-10-13T22:05:42Z"
}
```

| field | type | notes |
|---|---|---|
| `coach` | `string` | Regex-extracted speaker; `""` when not identified. |
| `polarity` | `float` | `[-1.0, 1.0]`, lexicon sum normalised by term hits. |
| `sentiment_label` | `enum` | `"positive"` \| `"neutral"` \| `"negative"` (thresholds ±0.25). |
| `positive_hits` / `negative_hits` | `int` | Raw lexicon term counts. |
| `hedge_hits` | `int` | Hedging/uncertainty term count ("probably", "might", "we'll see"). |
| `hedge_rate` | `float` | `hedge_hits / total words`. |
| `word_choice_flags` | `array<enum>` | e.g. `["depth_talk","aggression_talk","scheme_talk","injury_talk"]`. |
| `doc_count` | `int` | Documents aggregated into the row. |
| `text_scope` | `enum` | `"headline_description"` — **not** a transcript. |

### 2.2 `coach_speak_delta`

Tone change vs the stored prior-run baseline (`_baseline_coach_speak.json`).
`metric ∈ {polarity, hedge_rate}`; `current_value`, `baseline_value`, `delta`,
`direction`, `baseline_date`, `doc_count`, `status`
(`ok` | `baseline_established`).

### 2.3 `depth_chart_move`

Two producers, same schema: headline-derived candidates (live layer) and
snapshot diffs (local layer). `corroborated` + `corroborated_by[]` record when the
two agree.

```json
{
  "signal_id": "local-depth_chart_move-CAR-Damien Lewis",
  "signal_type": "depth_chart_move",
  "team": "CAR",
  "player": "Damien Lewis",
  "generated_utc": "2026-10-13T22:07:39.241166+00:00",
  "provenance": {
    "source_path": "intelligence\\coaching\\data\\depth_charts_2026.parquet",
    "source_kind": "local_nflverse_artifact",
    "artifact_sha256": "3fd46981b17dc781d93b320fa810213b…",
    "method": "depth_charts_parquet_v1",
    "confidence": "medium", "unverified": false, "unverified_reason": "", "source_url": ""
  },
  "position": "Base 3-4 D", "pos_slot": "…",
  "move_type": "demotion",
  "old_rank": 1.0, "new_rank": 3.0, "rank_delta": -2.0,
  "snapshot_prev_utc": "2026-10-01T14:25:58Z",
  "snapshot_cur_utc": "2026-10-02T06:02:14Z",
  "corroborated": false, "corroborated_by": [],
  "source_artifact": "depth_charts_2026.parquet",
  "note": "depth-chart snapshot diff; not a coach statement"
}
```

| field | type | notes |
|---|---|---|
| `move_type` | `enum` | `promotion` \| `demotion` \| `added_to_chart` \| `removed_from_chart` \| `practice_squad_elevation` \| `activation_return` \| `release` \| `signing` \| `injury_forced` \| `role_watch` \| `truncation_note` \| `no_change_detected`. |
| `old_rank` / `new_rank` | `float\|null` | Position-rank in the two snapshots; `null` for add/remove. |
| `rank_delta` | `float\|null` | `old_rank - new_rank`; positive = moved up the chart. |
| `corroborated_by` | `array<string>` | e.g. `["espn_injuries:status=Questionable"]`, `["local_depth_chart:demotion@2026-10-02T06:02:14Z"]`. |

### 2.4 `snap_trend_break` (play-participation **proxy**)

```json
{
  "signal_id": "local-snap_trend_break-ARI-play_participation_share",
  "signal_type": "snap_trend_break",
  "team": "ARI", "player": "J.Brissett",
  "metric": "play_participation_share", "unit": "share",
  "series": [{"week": 1, "value": 0.4681}, {"week": 2, "value": 0.4722}, {"week": 3, "value": 0.5421}],
  "last_value": 0.5421, "delta": 0.0732, "z_score": 64.7,
  "baseline_n": 2, "baseline_reliability": "insufficient_n_lt_6",
  "break_detected": false, "break_candidate": false, "status": "no_break",
  "proxy": true,
  "unverified_note": "no snap-count feed; this is an appearance-count proxy",
  "provenance": {"source_path": "intelligence\\coaching\\data\\play_by_play_2026.parquet",
                 "source_kind": "local_nflverse_artifact", "artifact_sha256": "ad20b929…",
                 "method": "play_by_play_parquet_v1", "confidence": "medium", "unverified": false}
}
```

`proxy: true` is mandatory on this family — the value is the player's share of the
team's offensive plays, **not** a snap count. True snap counts require the nflverse
`snap_counts` release or a licensed feed.

### 2.5 `scheme_shift`

```json
{
  "signal_id": "local-scheme_shift-ARI-early_down_pass_rate",
  "signal_type": "scheme_shift",
  "team": "ARI", "player": "",
  "metric": "early_down_pass_rate", "unit": "rate",
  "series": [{"week": 1, "value": 0.5179}, {"week": 2, "value": 0.5588}, {"week": 3, "value": 0.6333}],
  "baseline_mean": 0.5408, "baseline_n": 24, "baseline_reliability": "ok",
  "last_value": 0.6333, "delta": 0.0925, "z_score": 0.89, "direction": "up",
  "break_detected": false, "break_candidate": false, "status": "no_break",
  "min_effect": 0.10,
  "baseline_basis": "pooled prior-season same-week window",
  "weeks_observed": 3,
  "source_artifact": "weekly_tendencies.csv"
}
```

Metrics emitted per team: `early_down_pass_rate`, `shotgun_rate`, `no_huddle_rate`
(formation/personnel frequency is unavailable keyless — these are the labelled proxies).

### 2.6 `tendency_break`

Same trend-stat block as `scheme_shift`. Three producers:

| metric | source | baseline_basis |
|---|---|---|
| `pass_rate_all`, `quick_game_rate`, `avg_air_yards` | `weekly_tendencies.csv` | pooled prior-season same-week window |
| `pass_after_run_contrast` | `sequencing.csv` | within-season SE (`contrast_se`); `n_pairs >= 30` gate |
| `week_over_week_adjustment` | `adjustments.csv` | Mahalanobis `pct_rank` of the change magnitude; flags at `>=0.95` or `<=0.05` |
| `target_share` | `play_by_play_2026.parquet` | prior weeks of the same season (carries `player`) |

```json
{
  "signal_id": "local-tendency_break-ARI-pass_rate_all",
  "signal_type": "tendency_break",
  "team": "ARI", "player": "",
  "metric": "pass_rate_all", "unit": "rate",
  "series": [{"week": 1, "value": 0.5507}, {"week": 2, "value": 0.6383}, {"week": 3, "value": 0.6625}],
  "baseline_mean": 0.5821, "baseline_n": 24, "baseline_reliability": "ok",
  "last_value": 0.6625, "delta": 0.0804, "z_score": 0.91, "direction": "up",
  "break_detected": false, "break_candidate": false, "status": "no_break",
  "min_effect": 0.10, "source_artifact": "weekly_tendencies.csv",
  "baseline_basis": "pooled prior-season same-week window"
}
```

### 2.7 `target_trend_break`

Identical to `tendency_break` with `metric="target_share"` plus `player` and
`targets_total`. Flagged when target share moves `>= 0.05` at `|z| >= 2` on a
reliable baseline.

### 2.8 `fourth_down_trend`

```json
{
  "signal_id": "local-fourth_down_trend-ARI-go4th_rate",
  "signal_type": "fourth_down_trend",
  "team": "ARI", "player": "",
  "metric": "go4th_rate", "unit": "rate", "season": 2026, "n_4th": 23,
  "last_value": 0.13043478260869565, "baseline_mean": 0.2447, "baseline_n": 4,
  "delta": -0.1143, "z_score": -2.168, "direction": "less_aggressive",
  "break_detected": true, "status": "ok",
  "note": "go4th_rate = go-for-it share of 4th-down plays; baseline = prior seasons"
}
```

`direction ∈ {more_aggressive, less_aggressive, flat}` (±0.02 band). Emitted both
season-to-date (`off_tendencies.csv`) and week-by-week (`play_by_play_2026.parquet`).

### 2.9 `timeout_usage`

`metric="timeouts_per_game"`, `unit="timeouts"`, `value`, `n_games`, and
`share_before_2mw` where the artifact provides it. Challenge outcomes are **not**
in nflverse pbp and are emitted as a gap, never as a number.

### 2.10 `spot_pattern` (bye position)

```json
{
  "signal_id": "local-spot_pattern-BUF",
  "signal_type": "spot_pattern",
  "team": "BUF", "player": "", "week": 6,
  "opponent": "", "next_opponent": "…",
  "flags": ["post_bye_authoritative"],
  "pre_bye": false, "post_bye": true, "on_bye": false,
  "bye_authoritative": true,
  "schedule_weeks_covered": [1, 2, 3],
  "status": "ok",
  "unverified": false, "unverified_reason": ""
}
```

Flag values: `pre_bye`, `post_bye`, `on_bye` (derived from the local schedule) and
`on_bye_authoritative`, `post_bye_authoritative` (from the ESPN scoreboard bye
list). A bye is **never** inferred for a week the schedule artifact does not
cover — those records carry `status="insufficient_schedule_coverage"`.

### 2.11 `game_context_flag`

Trap-game / look-ahead / road-letdown / bye flags with `opponent_win_pct`,
`next_opponent_win_pct`, `team_win_pct` and booleans
`look_ahead_risk`, `trap_spot`, `on_bye_this_week`, `on_bye_next_week`, `pre_bye`.
Provenance confidence is `low` — the win-pct thresholds are heuristics.

---

## 3. Timestamps and determinism

* Every record carries `generated_utc` and `provenance.retrieved_utc` (ISO-8601 UTC, second/microsecond precision).
* Local-derived records additionally carry the artifact `sha256`, so any value can be
  recomputed from the exact bytes that produced it. Re-running the local layer on the
  same artifact hash is deterministic; the live layer is not (feeds move).
* `_baseline_coach_speak.json` and `_baseline_team_week_metrics.json` persist
  prior-run means so `coach_speak_delta` exists from the next run onward.

---

## 4. What this run produced (2026-10-13, week 6)

| signal_type | records | source |
|---|---|---|
| `presser_sentiment` | 119 | ESPN NFL news API + Google News RSS presser query |
| `coach_speak_delta` | 50 | vs prior-run baseline |
| `depth_chart_move` | 74 | 41 headline-derived + 33 snapshot-diff |
| `scheme_shift` | 96 | local `weekly_tendencies.csv` (8 confirmed breaks) |
| `tendency_break` | 158 | local weekly/sequencing/adjustments/targets (21 breaks) |
| `snap_trend_break` | 96 | local pbp participation share (**proxy**) |
| `target_trend_break` | 128 | local pbp target share |
| `fourth_down_trend` | 64 | local season + weekly go4th_rate |
| `timeout_usage` | 23 | local `timeouts.csv` (11 teams) + pbp flags (32 teams) |
| `spot_pattern` | 32 | local schedule + ESPN bye list |
| `game_context_flag` | 32 | ESPN scoreboard |

**Live sources used:** ESPN NFL news API, Google News RSS presser query, ESPN
scoreboard (week 5/6/7), ESPN injuries — 8 keyless requests, 0 errors.
**Local layer:** 0 network requests; 8 in-repo nflverse artifacts, each hashed.

### Honest gaps (recorded in the digest, not papered over)

* `challenge_success_rate` — **unavailable**. No keyless review-outcome field.
* `snap_count_trend_break` — **proxy** only; no keyless snap-count feed exists.
* `scheme_formation_frequency` — **partial**; formation/personnel needs charting data.
* `timeout_usage` — **partial coverage**: `timeouts.csv` has 11 of 32 teams for 2026.
* `spot_pattern` — **partial coverage**: `schedule.csv` covers weeks 1–3 only, so
  local pre/post-bye inference is unavailable for week 6; ESPN byes are used instead.
* `depth_chart_move` — **stale**: the artifact's newest snapshot pair
  (`2026-10-02T06:02:14Z` → `2026-10-02T13:49:21Z`) has no rank changes; the moves
  reported come from the older pair (`2026-10-01T14:25:58Z` → `2026-10-02T06:02:14Z`).
  A fresher depth-chart source is needed for current-week moves.
* Live ESPN summary `plays` arrays were empty for the two completed games sampled,
  so the live layer contributed 0 to the weekly scheme/tendency families; the local
  layer carried those families instead. `play_by_play_week_rows` is `[]` in the digest.

---

### Trainer feed append

```
$ python brain/feeds/append_day_feed.py --date 2026-10-13 \
      --dirs docs/data-sources/research/2026-10-13/cognitive
[append_day_feed] added=0 dupes_skipped=4 failed=0 -> C:\Users\Garrett\Sports\brain\feeds\2026-10-13\trainer_feed.jsonl
```

All four artifacts (`cognitive_signals.json`, `cognitive_signals.md`,
`_baseline_coach_speak.json`, `_baseline_team_week_metrics.json`) are present in the
feed — verified by parsing `brain/feeds/2026-10-13/trainer_feed.jsonl` (3,874 records,
4 of them under `…/cognitive/`). The tool dedupes **by path only**, so re-running after
regenerating the digest reports `added=0`: the feed's copies are the **21:19 UTC
revision** (`presser_sentiment=116`), while the file on disk is the **22:14 UTC
revision** (`presser_sentiment=119`). This is a known lag, not a failure — the feed row
for `cognitive_signals.json` carries `appended_utc: 2026-10-13T21:30:07Z`. Refreshing a
path in place would require either a `--force` flag on `append_day_feed.py` (does not
exist) or rewriting the 234 MB JSONL (deliberately avoided — another worker appends to
it). Treat the on-disk digest as authoritative for this run.

## 5. Reproduce

```bash
cd C:/Users/Garrett/Sports
python intelligence/ingestion/cognitive/ingest_cognitive.py \
    --out-dir docs/data-sources/research/2026-10-13/cognitive
```

Flags: `--week N`, `--news-limit N`, `--max-games N`, `--timeout S`, `--no-raw`,
`--no-local` (skip the local-derived layer), `--max-moves-per-team N`.

`--no-local` is the zero-artifact mode: it issues the same 8 keyless requests and
emits only the live families. The default is `--local`.
