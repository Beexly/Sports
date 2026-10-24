# app.underdogsports.com — Pick'em API surface (client-code extraction)

Extracted: 2026-10-10 · Method: static analysis of the shipped webpack bundle only.
No login, no Authorization header, no live API calls to authenticated endpoints.

## What was pulled

| Item | Value |
|---|---|
| HTML | `https://app.underdogsports.com/` → HTTP 200, 15,750 B → `ud_home_fresh.html` |
| Entry scripts | `/runtime.f710abdfb87d84c3.js`, `/critical.6355f38f54d6a803.js`, `/main.4fd922eb96a7dbec.js` |
| Chunk map | webpack `c.u` in runtime: 187 lazy chunks (102 named + 85 id-only) → `chunk_manifest.json` |
| Filename template | `({name||chunkId}) + "." + {hash} + ".js"` (verified against live 200s) |
| Lazy chunks fetched | **187/187**, 5,150,568 B, all HTTP 200, saved in `chunks/` |
| Total JS analyzed | 190 files (187 lazy + 3 entry) |

## Hosts & URL composition (module 63149, saved as `api_client_63149.js`)

```
N = host + (version segment) + path
host  = apiEndpoint  https://api.underdogfantasy.com
        statsEndpoint https://stats.underdogfantasy.com   (when underdogAPIEndpoint == "stats")
        "exclude"     -> path used as-is (absolute URLs)
version = "/" + underdogAPIVersion, default "v1", unless "exclude"
```

Observed versions in real call sites: `beta/v2, v1, v2, v3, v4, v5, v7, v10, exclude, default(v1)`.

Headers: `Accept/Content-Type: application/json`, `Authorization: <Bearer>`,
`Client-Device-Id`, `Client-Type: web`, `Client-Version`, `Client-Request-Id` (uuid),
`Referring-Link`, `User-Latitude/-Longitude/-Location-Token/-Geo-Comply-License-Key`,
optional `Sardine-Session-Key`, and `UD-User-ID` only on `/entry_slips/estimate`.
Auto-appended query: `state_config_id`, `product`, `product_experience_id`.
Array serialization: `arr[]=v1&arr[]=v2`; `/entry_slips/estimate` uses `arrayFormat:"indices"`
→ `options[0][id]=…&options[0][type]=…`.
Errors: `throw new ApiError({...response.data.error, http_status_code: error.http_status_code ?? response.status})`.

Auth (for reference, not exercised): `POST https://login.underdogsports.com/oauth/token`,
`client_id=cQvYz1T2BAFbix4dYR37dyD9O0Thf1s`, `audience=https://api.underdogfantasy.com`,
`grant_type=password`, `scope=offline_access`.

## Pick'em endpoints (31 recorded → `pickem_api_surface.json`)

### Lines & markets
| Method | Path | Request | Response (client-observed) |
|---|---|---|---|
| GET | `/v1/over_under_lines` | `appearance_ids[]`, `over_under_ids[]`, `sport_id` | `data.over_under_lines[]` |
| GET | `/beta/v2/live_over_under_lines` | `appearance_ids[]`, `sport_id` | same family, merged by `sourceEndpoint` tag |
| GET | `/v1/knockouts/markets` | `over_under_option_id` | `knockout_markets[]{id, over_under_option_id, threshold_probability, payout_multiplier, status}`, `max_odds_display`, `match_details{side}` |
| GET | `/v1/lobbies/content/market_price_history` | `chart_type=ranked_market`, `target_id`, `target_type`, `over_under_option_id` | `series[]{key,name,styles{…series_color…}}`, `data.timepoints[]`, `data.series_values{key:(number\|null)[]}` |
| GET | `/v3/over_unders/{id}/alternate_projections` | path id | `data.projections[]{id, stable_id, is_main, stat_value, options[]}` |
| GET | `/v1/power_ups/{puId}/restricted_over_unders/{ouId}` | `over_under_line_id` | `data.over_under_line` |
| GET | `/power_ups/{puId}/options` | path id | `data{appearances, games, entry_eligible_lines, entry_eligible_sport_ids, selection_eligible_lines, selection_eligible_sport_ids, players, solo_games}` |
| GET | `/v1/user/power_ups/{puId}` | path id | `data.power_up{current_max_payout_multiplier, initial_max_payout_multiplier, loss_count, unboosted_power_up_multiplier}` |

### Lobby / discovery
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/v1/lobbies/scaffolds/{home\|matches\|players\|rewards\|sport_groups\|sports}` | `ct_token=w2`, `include_prediction_markets=true`, plus provider params | zod schema `{key, sections:[{key,title,subtitle,content_type,view_type,primary_content,style{layout,scroll},data_source{path,url}}], options, fetched_at}` |
| GET | `/lobby`, `/v2/lobby` | `sport_id?` (v2) | lobby payload |
| GET | `/v2/pickem_search/search_results` | `sport_id` (uppercased), `algolia_object_id` | `data{appearances, games, opened_lines_count, over_under_lines, players, solo_games, trending_players}` |

### Entry slip flow (quote → confirm → submit)
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/v3/entry_slips/estimate` | query `estimate_request_id?, features[], fee?, fee_source, options[] (indices), power_up_id?`; header `UD-User-ID?` | `data{status ("pending" → poll), estimate_request_id, async_config{polling_interval_seconds, timeout_seconds, wait_seconds}, subscriptions, errors[], flex, odds/unmodified_odds/combo_fantasy_component_odds, max_fee, max_multiplier, max_prediction_selection_count, max_selection_count, min_fee, min_selection_count, pool_styles[], combinability_rules, predictions_quote{fees,promo_bonus_payout,removed_bonus_stake,total_cost,total_quantity,winning_payout}}` |
| POST | `/v2/entry_requests` | query `features[]`; json `{combo_fantasy_price_expected?, confirmed?, estimate_request_id?, flex_losses?, pickem_pool_style_id?, fee, fee_source, idempotency_id, options[]{id,power_up_id,type}, power_up_id?, prediction_contract_quantity?, price_expected?}` | `data{id, async_config{…}, contract_count_computed_fractional, detail, idempotency_id, odds_computed, odds_expected, reject_reason, status, title}` |
| GET | `/v2/entry_requests/{idempotencyId}` | path id, AbortSignal | same shape; polled after `wait_seconds` |
| POST | `/v5/entry_slips` | query `confirmed?, features[]`; json `{entry_slip{fee, fee_source, options[], total_multiplier, power_up_id?, insured, pickem_pool_style_id?}}` | entry slip envelope |
| GET | `/v10/user/active_entry_slips` | `page` | `data{appearances, entry_slips, over_under_options, over_under_lines, over_unders, games, players, providers, solo_games}`, `meta` |
| GET | `/v10/user/settled_entry_slips` | `page` | same envelope |
| GET | `/v7/entry_slips/{shareId}/share` | path id | `data{active{over_under_lines}, appearances, entry_slip, games, over_under_options, over_unders, players, shared{over_under_lines}, solo_games}` |
| POST | `/v2/entry_slips/{id}/share_link` | path id | share link |
| POST | `/entry_slips/{id}/cancellation` | path id (entrySlipId or fantasyComponentId) | cancellation result |
| GET | `/v4/entry_slips/payout_outcome` | `features[], fee_source, options[], power_up_id?` | payout matrix by pick count |
| GET+POST | `/v1/entry_slips/{id}/cash_out_requests` | path id | `{availability, cash_out_selections_hash, channel, display_text, estimate_request_id, odds, payout, payout_minimum, total_fees}` |
| GET | `/user/entry_slip_limits` | – | `[{id, max_fee, max_appearance_fee, sport_id, user_override}]` (confidence: medium) |

### Pools, leaderboard, settings, realtime
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `https://stats.underdogfantasy.com/v2/pickem_pool_styles` | – | `data.pickem_pool_styles[]` v1: `{id,title,active,default,fees,prize_percentage,options[{id,entry_count,fee,insured_payout_option{…},max_entries,payout_option{…},prizes{feeKey:{default{max_payout,avg_payout},insured{…}}},prize_percentage,selection_count}]}` |
| GET | `https://stats.underdogfantasy.com/v3/pickem_pool_styles` | – | `data.pickem_pool_styles[]` v2: `{id,active,default,base_fee,fees,max_fee,prize_per_point,rake,title,total_fees}` |
| GET | `/pickem_pools/{pickEmPoolId}/leaderboard` | `page` | `data.pickem_pool_leaderboard[]`, `data.meta` |
| GET | `/user/pickem_pools/entry_slips/{entrySlipId}` | path id | pool entry payload |
| GET | `/picks/{pickId}/swaps` | path id | swap rows |
| PATCH | `/user/gameplay_settings` | `{gameplay_settings{payout_default, auto_accept_projection_changes, auto_accept_prediction_market_projection_changes:'always'\|'never', prediction_odds_change_tolerance?, global_odds_format?, user_pm_banner_prompted_at, user_prompted_at}}` | updated settings |
| POST | `/v1/authorizations/pusher_channels` | pusher-js private-channel auth (`channel_name`, `socket_id`), headers `Authorization`, `client-device-id` | pusher auth signature |
| GET | `/v2/predictions_suitability_questionnaire` | – | questionnaire items `{position, question}` |

### Core response object shapes (from normalizers)

- **over_under_line** (mappers `1799` + `36513` + `80850`): `id, contract_url, contract_terms_url,
  display_mode, expires_at, live_event, live_event_stat, non_discounted_stat_value, options[],
  over_under{}, over_under_id, provider_id, provider_type, rank, sort_by, stable_id, stat_value,
  status, updated_at`
- **over_under_option**: `id, choice (higher|lower), choice_display, choice_id, lookup_id,
  odds{fantasy:{type,multiplier}, prediction}, payout_multiplier, rfq_combinable,
  selection_header, selection_subheader, status, type` — when `odds` is null the client synthesises
  it from `payout_multiplier` for the three sources above
- **over_under**: `id, appearance_stat{id,appearance_id,display_stat,graded_by,pickem_stat_id,stat},
  boost{…}, category, display_mode(default|moneyline|spread|table), has_alternates, multi_provider,
  option_priority, prediction_market, scoring_type_id, team_divider, title`
- **entry_slip** (mapper `aW`, 60+ snake_case fields): `id, aggregate_fee, aggregate_fee_components,
  badges, boost_id, boost_payout, cancellation_expires_at, cash_out, champion_points, created_at,
  current_max_payout_multiplier, current_max_unmodified_payout_multiplier, current_max_odds,
  current_unmodified_max_odds, display_result, end_at, entry_count, entry_style_id,
  fantasy_component, fee, free_entry, image_url, initial_max_payout_multiplier,
  initial_max_odds, insurance_fallbacks, insured, minimum_shift_configuration, payout, payout_at,
  payout_option_id, payout_shifts, pickem_pool_entry{id,payout,pickem_pool_id,pool_entry_count},
  pickem_pool_style_id, pickem_pool_style_option_id, post_submission_offer, power_up,
  prediction, prediction_component, prize_max_payout, projected_payout, product, rebooted,
  selection_count, selection_groups, settled_message, settled_payout_option_id,
  settled_pickem_pool_style_option_id, share_id, share_link, start_at, state, state_free_entry,
  status, subtitle, tax_status, type, user{id,profile_color,profile_icon_url,username,badges},
  username`
- **scaffold**: see table above (zod-validated, unknown `view_type` are logged and dropped).

### Realtime
Pusher (`pusher-js 8.3.0`), channel **`private-user-{userId}`**, private-channel auth via
`POST https://api.underdogfantasy.com/v1/authorizations/pusher_channels`. App key/cluster triples:
`038c354984811c43f658/us2` (default), `20a471bda08375856801/us3` (secondary),
`d65207c183930ff953dc/mt1` (tertiary). Estimate events carry `estimate_request_id`, which the
client feeds back into `GET /v3/entry_slips/estimate`.

### Client routes (NOT API — React Router, for disambiguation)
`/pick-em/{pageType}/{sportId}` with `pageType ∈ {higher-lower, tokens, search}`; query params
`filter_id, filter_type ∈ {Custom, MarketGroup, PickemStat}, match_id, match_type, selected_id,
selected_type, sport_group_filter_id, sport_group_id (uuid)`.
Other pages: `/pick-em/live`, `/pick-em/active`, `/pick-em/completed`, knockouts route.

## Inventory of every API call found (not just pick'em)
- `api_call_objects.json` — 427 brace-matched `ZP/request({...})` object literals (raw)
- `api_inventory.json` — same, normalized: method, path, api_version, host, param keys, data keys
- `request_call_sites.json` — 343 `method`+`url` adjacent-pattern matches with context
- Distinct (method, url, version, host) tuples: **183**

## Not verified / needs a logged-in session
- No live payloads were captured; all response shapes are inferred from consumer/normalizer code.
- `/user/**` endpoints, entry-slip mutation endpoints, and pool leaderboards require a Bearer token;
  confirming their live payloads needs an authenticated session (allowed only with explicit consent).
- `/user/entry_slip_limits` response shape is medium-confidence (mapper `a1` found, alias not resolved).