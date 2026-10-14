# DFS INGEST — SIGNAL FORMAT SPEC (2026-10-13)

Spec for `intelligence/ingestion/dfs/ingest_dfs.py` and the artifacts it lands under
`docs/data-sources/research/2026-10-13/dfs/`. This is the contract the trainer feed and the DFS
optimizer stack read; it is deliberately narrow — **every field below is produced by code that
ran today**, nothing is aspirational.

Run: `python intelligence/ingestion/dfs/ingest_dfs.py` (keyless, stdlib-only, no credentials).
Offline/replay: `--no-live` (repo assets only). Output dir override: `--out-dir`.

---

## 0. What ran today (verified)

| source | endpoint | status | bytes | handle |
|---|---|---|---|---|
| DK robots policy | `https://www.draftkings.com/robots.txt` | 200 | 357 | `6088db3c6503b639…` |
| DK DFS lobby | `https://www.draftkings.com/lobby/getcontests?sport=NFL` | 200 | 4,909,996 | `fb1eb8eb98a95ffc…` |
| Google News RSS ×4 | `news.google.com/rss/search?q=…` | 200 | 117,271 / 102,257 / 57,169 / 103,165 | per-feed sha in `requests[]` |

Live record totals for the 2026-10-13 run — `total: 517` across 10 record types
(`ownership_projection 7`, `chalk_flag 16`, `leverage_spot 31`, `stack_correlation 20`,
`value_curve_point 40`, `positional_scarcity 5`, `punt_play 15`, `contest_shape 96` (bounded sample
of 6,386 parsed rows), `payout_structure_point 60`, `narrative_mention 227`). Request count: **6**.

### Robots discipline (non-negotiable)

`robots.txt` disallows `/lineup/`, `/contest/`, `/draft/`, `/account/`, `/mycontests/`,
`/contests/gamecenter/`, `/_assets/`, `/_landing/`, `/_raptor/`, `/lobby-classic/`, `/missions/`,
`/video/`. The ingester fetches **only** `/lobby/getcontests` (allowed) and records the disallowed
set in `robots_policy.disallow_paths_present` + `disallowed_paths_not_called`.

> **Consequence to state plainly:** per-player salary/ownership for *today's* slate is **not**
> available from this lane. `/lineup/getavailableplayers` (the DK player pool) sits under the
> disallowed `/lineup/` prefix — a 200 response is reachable, but we do not call it. Salary comes
> from the repo artifact `data/gse-dataset/current/DKSalaries-Week3-SunMon.csv` (an older as-of),
> and ownership comes only from public narrative. This is a real gap, emitted in `gaps[]`, not a
> silent substitution.

---

## 1. Record envelope

Every record is a flat JSON object whose first field is `record_type` — the discriminator the
trainer switches on. Common provenance fields:

| field | type | meaning |
|---|---|---|
| `record_type` | string | one of the 10 types in §2 |
| `source_type` | string | `live_endpoint` \| `public_article` \| `repo_artifact` \| `repo_artifact_calibration` |
| `provenance` | string | repo-relative path or URL the value came from |
| `as_of_utc` | string | ISO-8601 UTC stamp when the record was built |
| `confidence` | string | evidence grade; **never** omitted on a derived value |

**Hard rules.** (1) A number without `provenance` is a bug. (2) A projection is labelled a
projection; a realized/measured value is labelled realized. (3) An unavailable value is `null`
plus a `gaps[]` line — never a zero, never an estimate standing in for a measurement. (4) Counts in
`record_counts` are the true totals; sample arrays may be bounded and say so in `contest_census`.

---

## 2. Record types

### 2.1 `ownership_projection`
Public-stated or repo-measured ownership. **8 records today.**

```jsonc
{
  "record_type": "ownership_projection",
  "player_hint": "Justin Fields",          // roster-validated name, or null
  "player_match_method": "roster_match",   // roster_match | heuristic_headline_guess |
                                           // roster_artifact_named_row | none
  "is_roster_player": true,                // true ONLY for roster_match / named artifact row
  "projected_ownership_pct": [1.8],        // as quoted; list because a headline can carry several
  "realized_ownership_pct": 12.4,          // present only on calibration rows
  "abs_error_pct": 3.1,                    // present only on calibration rows
  "evidence": "…Justin Fields At 1.8% Won $1M…",   // verbatim substring, never a paraphrase
  "site_hint": "draftkings",               // draftkings | fanduel | null
  "source_type": "public_article",
  "confidence": "low_quote_in_headline",   // or "measured_pair_in_repo"
  "source": "google_news_rss",
  "feed": "google_news_dfs_ownership",
  "feeds": ["google_news_dfs_ownership"],  // all feeds that returned this headline
  "feed_count": 1,
  "source_url": "https://news.google.com/rss/articles/CBMi…",
  "source_urls": ["…"],
  "headline": "…", "publisher": "Stokastic", "published": "Wed, 19 Aug 2026 07:00:00 GMT",
  "dedupe_key": "headline_lower",
  "as_of_utc": "2026-10-13T21:21:40.334686+00:00"
}
```

Percentages are quoted from the source text, not modelled. `confidence:
"low_quote_in_headline"` means exactly that — a headline mention, no article body read. The
`projected_ownership_pct` value is **not** a calibrated GSE projection.

### 2.2 `chalk_flag`
```jsonc
{ "record_type": "chalk_flag", "subject": "Ja'Marr Chase", "player_match_method": "roster_match",
  "is_roster_player": true, "flag": "chalk_anchor", "ownership_pct": null,
  "basis": "public_narrative_keyword", "source_type": "public_article", … }
```
`flag` is always `chalk_anchor` in this lane. Absence of a chalk flag is **not** evidence of low
ownership — the lane only sees what publishers wrote about. 16 records today.

### 2.3 `leverage_spot`
Two distinct provenances share this type — **always branch on `source_type`/`confidence`**:

```jsonc
// (a) narrative: a public article calls a play contrarian
{ "record_type": "leverage_spot", "subject": "Christian McCaffrey",
  "flag": "contrarian_candidate", "ownership_pct": null,
  "basis": "public_narrative_keyword", "source_type": "public_article",
  "confidence": "unstated" }             // ownership unknown → the "spot" is unquantified

// (b) proxy: repo salary export, no ownership input
{ "record_type": "leverage_spot", "subject": "Rachaad White", "salary": 5600,
  "points_per_1k_salary": 2.41, "flag": "contrarian_candidate_proxy",
  "ownership_pct": null, "basis": "below_slate_median_salary_ranked_by_points_per_1k",
  "confidence": "proxy_no_ownership_input", "source_type": "repo_artifact",
  "note": "ownership unknown in the salary export; verify against a live ownership source before trusting" }
```
Never treat a `_proxy` leverage spot as a leverage measurement. 31 records today.

### 2.4 `stack_correlation`
Derived from the shipped model in `apps/web/lib/fantasy/dfs-correlation.ts` — **not re-derived**.
The loadings are parsed out of the source file and echoed in `dk_loadings_used`.

```jsonc
{ "record_type": "stack_correlation", "leg_a": "QB", "leg_b": "RB",
  "relation": "same_team_stack",       // same_team_pair | same_team_stack | bring_back_cross_team
  "same_team": true, "loading": 0.217,
  "loading_basis": "team_load dot team_load + game_load dot game_load",
  "provenance": "apps/web/lib/fantasy/dfs-correlation.ts",
  "note": "positive: legs score together; the number the correlation-aware builder needs" }
```
Loadings in use: `TEAM_LOAD {QB .55, WR .50, TE .42, RB .28}`, `GAME_LOAD {QB .35, WR .35, TE .30,
RB .18}`, `DST_OPP_LOAD .45`, `DST_GAME_LOAD .30`. 20 records today. If the parse fails the field
is `[]` and a `gaps[]` line says so — **never** a guessed loading.

### 2.5 `value_curve_point` / 2.6 `positional_scarcity` / 2.7 `punt_play`
From the salary export only. `avg_points_per_game` is the export's own column, not a GSE projection;
`points_per_1k_salary` is computed. `punt_play.basis = "cheapest_quartile_by_points_per_1k"`.
40 / 5 / 15 records today.

### 2.8 `contest_shape`
Contest geometry → contest-selection and duplication risk. 96-record bounded sample; full census in
the CSV.

```jsonc
{ "record_type": "contest_shape", "contest_id": 196672011, "draft_group_id": 154941,
  "game_type": "Classic", "field_cap": 416171, "entry_fee_usd": 0.5,
  "max_entries_per_user": 150, "single_entry": false, "start_est": "Sun 1:00PM",
  "size_class": "large",               // small (<1000) | medium | large
  "mode_advice": "gpp",                // cash | gpp — derived from field size + paid places
  "late_swap_eligible": true, "basis": "…", "as_of_utc": "…" }
```
Today's census: 6,386 contests — `Classic 2383`, `Showdown Captain Mode 2199`,
`Madden Showdown Captain Mode 876`, `Madden Classic 294`, `Tiers 166`, `Single Stat – Total Yards
121`, `Snake Showdown 117`, `Single Stat – Touchdowns 116`, `Snake 80`, `Best Ball 27`;
median field cap **10**, max **999,999,999**.

### 2.9 `payout_structure_point`
```jsonc
{ "record_type": "payout_structure_point", "contest_id": 196653900, "field_cap": 161764,
  "entry_fee_usd": 20, "prize_pool_usd": 2750000.0, "top_prize_usd": 2750000.0,
  "top_prize_share": 1.0, "implied_rake_at_cap": 0.15, "top_heavy": true, "basis": "…" }
```
`implied_rake_at_cap = 1 − prize_pool / (entry_fee × field_cap)` — the *implied* rake if the contest
fills; `null` when the fee or cap is 0/unknown. Observed implied rakes cluster at **0.10 and 0.15**.
60 records today.

### 2.10 `narrative_mention`
Tagged headline with no numeric payload: `tags[]` from `{stack, value, late_swap, chalk, leverage,
general}`. 227 records today. This is the unmodelled remainder — keep it for narrative context,
never train a number off it.

---

## 3. Dedupe contract

The same article is returned by more than one Google News query. Records are collapsed on
`dedupe_key = "headline_lower"`; merged records carry `feeds[]`, `source_urls[]`, `feed_count`, and
`feed` set to the alphabetically-first feed for compatibility. Counting pre-dedupe is a bug —
today's raw item total was 302, the deduped narrative payload is 227 + 31 + 16 + 7.

---

## 4. Name validation

`player_hint` / `subject` is a name only when `is_roster_player == true`, which requires either a
`roster_match` against `data/gse-dataset/current/DKSalaries-*.csv` names or a named row in the
calibration CSV. Headline-only guesses keep `player_match_method:
"heuristic_headline_guess"` and are filtered against a column-furniture stop set (publishers,
"Main Slate", "GPPs", team abbreviations, section words). After filtering, **zero** unresolved
heuristic guesses remain in today's run — anything unnamed is `null`, which is the honest state.

---

## 5. Artifacts landed

`docs/data-sources/research/2026-10-13/dfs/`

| file | what |
|---|---|
| `ingest_dfs.py` | the ingester (also mirrored at `intelligence/ingestion/dfs/ingest_dfs.py`) |
| `dfs-signals-digest.json` | full typed digest, 517 records, 24 top-level keys |
| `dfs-signals-digest.md` | human-readable render (counts, headline, gaps, sample records) |
| `dk-contests-census.csv` | 6,386 contest rows — the un-bounded census |
| `dk-lobby-raw-meta.json` | URL, fetch time, byte count, sha256 handle, robots policy |
| `google_news_dfs_{ownership,chalk,leverage,stacks}.xml` | raw RSS, verbatim |

Multi-MB raw lobby JSON is **not** committed; `dk-lobby-raw-meta.json` carries its sha256 as the
provenance handle. Reprocessing offline: `python ingest_dfs.py --no-live` (repo assets only) — the
live contest census will then be empty rather than stale-silently.

---

## 6. Known gaps (open)

1. **No live per-player salary or ownership for today's slate** — the DK player-pool endpoint is
   robots-disallowed (§0). Salary as-of is the Week-3 export; ownership is narrative-only.
2. **Ownership percentages are headline quotes**, not measured field ownership. Calibration exists
   only for 6 historical player rows (`docs/dfs/research/2026-10-01/full-tables/…`).
3. **`implied_rake_at_cap` assumes a full field.** Realized rake depends on fill, which moves until
   lock; `fill_pct_at_pull` is in the census for exactly this reason.
4. **`late_swap_eligible` is derived from start time only**, not from an actual DK late-swap flag.
