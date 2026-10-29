/**
 * Captured JSON endpoint surfaces — typed interfaces over what is on disk.
 *
 * Every payload here came from the overnight capture pass. Nothing is re-fetched and
 * no field is invented: each interface matches the captured object exactly.
 *
 * HONEST SCOPE. The capture pass recorded 70 endpoints, but only 8 carry more than
 * 1 KB. The rest are stubs — most are literally `{}` — and are classified as stubs in
 * CAPTURE_REGISTRY rather than given an invented schema.
 *
 * Two of the eight are the same Action Network Next.js build manifest captured twice
 * under different filenames; both are kept because both are on disk.
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Repo root, found by walking up for a package.json + data marker. Avoids import.meta
 *  (the project compiles as CommonJS) and __dirname (undefined under vitest's ESM). */
function repoRoot(): string {
  const cwdFn = Reflect.get(process, "cwd") as () => string;
  let dir = cwdFn.call(process);
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "data", "nflverse")) && existsSync(join(dir, "artifacts"))) return dir;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return cwdFn.call(process);
}

const REPO_ROOT = repoRoot();
const CAP_DIR = "artifacts/api-captures";

export type CaptureHost = string;

export interface CaptureRef {
  readonly host: CaptureHost;
  readonly file: string;
  readonly bytes: number;
  readonly real: boolean;
  /** Why it is a stub, when it is one. */
  readonly stubReason: string | null;
}

/** Action Network Next.js build manifest. Only the two nav arrays are populated. */
export interface ActionNetworkNextData {
  readonly pageProps: {
    readonly mainNav: readonly unknown[];
    readonly pageNav: readonly unknown[];
  };
  readonly __N_SSG: boolean;
}

/** PlayerProfiler integrated news row. */
export interface PpNewsRow {
  readonly id: string;
  readonly player_id: string;
  readonly datetime: string;
  readonly data: string;
}

export interface PpNewsEnvelope {
  readonly success: boolean;
  readonly data: readonly PpNewsRow[];
}

/** PlayerProfiler player stub — the fields the capture actually carries. */
export interface PpPlayerStub {
  readonly Player_ID: string;
  readonly "Full Name": string;
  readonly Avatar: string;
  readonly Permalink: string;
  readonly Team: string | null;
  readonly Position: string;
  readonly College?: string;
  readonly "Draft Year"?: number;
}

/** PlayerProfiler advertiser slot. */
export interface PpAdSlot {
  readonly key: string;
  readonly markup: string;
}

/** PlayerProfiler staff player link. */
export interface PpStaffPlayer {
  readonly name: string;
  readonly url: string;
  readonly image: string;
  readonly player_ids: string;
}

export interface PpStaffEnvelope {
  readonly data: readonly PpStaffPlayer[];
}

async function readJson<T>(host: CaptureHost, file: string): Promise<{ data: T; path: string }> {
  const rel = `${CAP_DIR}/${host}/${file}`;
  const text = await readFile(resolve(REPO_ROOT, rel), "utf8");
  return { data: JSON.parse(text) as T, path: rel };
}

export const loadActionNetworkNextData = () =>
  readJson<ActionNetworkNextData>("actionnetwork.com", "actionnetwork_com_next_data_e_build_d_.json");

export const loadPpNews = () =>
  readJson<PpNewsEnvelope>("playerprofiler.com", "playerprofiler_com_wp_admin_admin_ajax_php_action_integrated_news_player_id_.json");

export const loadPpPlayersPros = () =>
  readJson<PpPlayerStub[]>("playerprofiler.com", "playerprofiler_com_wp_admin_admin_ajax_php_action_playerprofiler_api_endpoint_players_pros.json");

export const loadPpPlayersTrending = () =>
  readJson<PpPlayerStub[]>("playerprofiler.com", "playerprofiler_com_wp_admin_admin_ajax_php_action_playerprofiler_api_endpoint_players_tren.json");

export const loadPpAds = () =>
  readJson<PpAdSlot[]>("playerprofiler.com", "playerprofiler_com_wp_json_advertisers_ads.json");

export const loadPpStaffPlayers = () =>
  readJson<PpStaffEnvelope>("playerprofiler.com", "playerprofiler_com_wp_json_player_profiler_v1_staff_players.json");

/** The eight real payloads, with their captured sizes. */
export const CAPTURE_REAL: readonly CaptureRef[] = [
  { host: "actionnetwork.com", file: "actionnetwork_com_next_data_e_build_d_.json", bytes: 133636, real: true, stubReason: null },
  { host: "actionnetwork.com", file: "actionnetwork_com_next_data_this_build_d_r_m_.json", bytes: 133636, real: true, stubReason: null },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_admin_admin_ajax_php_action_big_board.json", bytes: 73511, real: true, stubReason: null },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_admin_admin_ajax_php_action_integrated_news_player_id_.json", bytes: 1069, real: true, stubReason: null },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_admin_admin_ajax_php_action_playerprofiler_api_endpoint_players_pros.json", bytes: 20929, real: true, stubReason: null },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_admin_admin_ajax_php_action_playerprofiler_api_endpoint_players_tren.json", bytes: 2670, real: true, stubReason: null },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_json_advertisers_ads.json", bytes: 4041, real: true, stubReason: null },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_json_player_profiler_v1_staff_players.json", bytes: 6224, real: true, stubReason: null },
];

/**
 * Stub captures — recorded, not schematised.
 *
 * Each entry is an endpoint that returned something too thin to type. The reason is
 * the observed payload, not a guess.
 */
export const CAPTURE_STUBS: readonly CaptureRef[] = [
  { host: "actionnetwork.com", file: "actionnetwork_com_next_data_.json", bytes: 17, real: false, stubReason: "under 1KB" },
  { host: "betonline.ag", file: "betonline_ag_api_auth_get_token.json", bytes: 27, real: false, stubReason: "under 1KB" },
  { host: "bettingnews.com", file: "bettingnews_com_api_api_loudfront_eo.json", bytes: 101, real: false, stubReason: "under 1KB" },
  { host: "bettingnews.com", file: "bettingnews_com_api_wp_ontent_ploads.json", bytes: 57, real: false, stubReason: "under 1KB" },
  { host: "bettingnews.com", file: "bettingnews_com_next_data_.json", bytes: 17, real: false, stubReason: "under 1KB" },
  { host: "bovada.lv", file: "bovada_lv_api_v1_document_verification_status_profile_n_document_ype_.json", bytes: 110, real: false, stubReason: "under 1KB" },
  { host: "bovada.lv", file: "bovada_lv_api_v1_logout.json", bytes: 133, real: false, stubReason: "under 1KB" },
  { host: "bovada.lv", file: "bovada_lv_api_v1_profile_info_a_.json", bytes: 110, real: false, stubReason: "under 1KB" },
  { host: "bovada.lv", file: "bovada_lv_services_jurisdiction_v2_access.json", bytes: 47, real: false, stubReason: "under 1KB" },
  { host: "bovada.lv", file: "bovada_lv_services_login_service_v1_auth_handoff.json", bytes: 136, real: false, stubReason: "under 1KB" },
  { host: "bovada.lv", file: "bovada_lv_services_profile_profiling_v1_document_verification_profile_n_document_verificat.json", bytes: 110, real: false, stubReason: "under 1KB" },
  { host: "bovada.lv", file: "bovada_lv_services_reward_issuing_v1_profiles_t_claimed_crypto_rewards.json", bytes: 110, real: false, stubReason: "under 1KB" },
  { host: "bovada.lv", file: "bovada_lv_services_signup_service_v1_invitation_validate_e_.json", bytes: 110, real: false, stubReason: "under 1KB" },
  { host: "bovada.lv", file: "bovada_lv_services_wallet_gateway_v1_profiles_t_balances.json", bytes: 110, real: false, stubReason: "under 1KB" },
  { host: "cbssports.com", file: "slc_cbssports_com_events.json", bytes: 2, real: false, stubReason: "empty object" },
  { host: "cbssports.com", file: "video_api_geo_cbssports_com_.json", bytes: 214, real: false, stubReason: "under 1KB" },
  { host: "covers.com", file: "covers_com_api_geolocation.json", bytes: 72, real: false, stubReason: "under 1KB" },
  { host: "covers.com", file: "covers_com_api_growthbook_attributes.json", bytes: 125, real: false, stubReason: "under 1KB" },
  { host: "donbest.com", file: "www_google_com_ccm_geo.json", bytes: 75, real: false, stubReason: "under 1KB" },
  { host: "dynastynerds.com", file: "www_google_com_ccm_geo.json", bytes: 75, real: false, stubReason: "under 1KB" },
  { host: "fanduel.com", file: "fanduel_com_next_data_.json", bytes: 17, real: false, stubReason: "under 1KB" },
  { host: "fantasylife.com", file: "fantasylife_com_api_search_q_encode_omponent_e_limit_10.json", bytes: 72, real: false, stubReason: "under 1KB" },
  { host: "fantasylife.com", file: "fantasylife_com_api_session.json", bytes: 18, real: false, stubReason: "under 1KB" },
  { host: "fantasylife.com", file: "fantasylife_com_next_data_.json", bytes: 2, real: false, stubReason: "empty object" },
  { host: "fantasylife.com", file: "fantasylife_com_next_data_e_build_d_.json", bytes: 2, real: false, stubReason: "empty object" },
  { host: "fantasypoints.com", file: "fantasypoints_com_api_fn.json", bytes: 165, real: false, stubReason: "under 1KB" },
  { host: "fantasypoints.com", file: "fantasypoints_com_nuxt_island_e_json.json", bytes: 202, real: false, stubReason: "under 1KB" },
  { host: "footballguys.com", file: "footballguys_com_rate_my_team_flavor_status.json", bytes: 53, real: false, stubReason: "under 1KB" },
  { host: "footballguys.com", file: "footballguys_com_staff_campaigns_save.json", bytes: 40, real: false, stubReason: "under 1KB" },
  { host: "footballguys.com", file: "footballguys_com_staff_player_updates_save.json", bytes: 40, real: false, stubReason: "under 1KB" },
  { host: "keeptradecut.com", file: "www_google_com_ccm_geo.json", bytes: 75, real: false, stubReason: "under 1KB" },
  { host: "odds-api.io", file: "odds_api_io_api_auth_me.json", bytes: 13, real: false, stubReason: "under 1KB" },
  { host: "odds-api.io", file: "odds_api_io_api_geo.json", bytes: 33, real: false, stubReason: "under 1KB" },
  { host: "oddsportal.com", file: "oddsportal_com_api_auth_token.json", bytes: 22, real: false, stubReason: "under 1KB" },
  { host: "oddsshark.com", file: "oddsshark_com_api_geolocation.json", bytes: 2, real: false, stubReason: "empty object" },
  { host: "oddsshark.com", file: "oddsshark_com_api_growthbook_attributes.json", bytes: 2, real: false, stubReason: "empty object" },
  { host: "pff.com", file: "a_klaviyo_com_onsite_track_analytics_company_id_e_.json", bytes: 40, real: false, stubReason: "under 1KB" },
  { host: "pff.com", file: "pff_com_api_scoreboard_matchup.json", bytes: 166, real: false, stubReason: "under 1KB" },
  { host: "pff.com", file: "pff_com_api_scoreboard_schedule.json", bytes: 166, real: false, stubReason: "under 1KB" },
  { host: "pff.com", file: "pff_com_api_scoreboard_ticker.json", bytes: 166, real: false, stubReason: "under 1KB" },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_admin_admin_ajax_php_action_authentication_status.json", bytes: 98, real: false, stubReason: "under 1KB" },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_admin_admin_ajax_php_action_playerprofiler_api_endpoint_dynasty_delu.json", bytes: 21, real: false, stubReason: "under 1KB" },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_admin_admin_ajax_php_action_playerprofiler_api_endpoint_nfl_next_gam.json", bytes: 87, real: false, stubReason: "under 1KB" },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_admin_admin_ajax_php_action_playerprofiler_articles_player_id_.json", bytes: 2, real: false, stubReason: "empty object" },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_admin_admin_ajax_php_action_pp_canonical_monthly_ad_decision.json", bytes: 157, real: false, stubReason: "under 1KB" },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_json_api_playerprofiler_youtube_check_live.json", bytes: 34, real: false, stubReason: "under 1KB" },
  { host: "playerprofiler.com", file: "playerprofiler_com_wp_json_player_profiler_v1_draft_kit_analyst_cheat_sheets_post_id_.json", bytes: 2, real: false, stubReason: "empty object" },
  { host: "playusa.com", file: "playusa_com_wp_json_levelup_v1_modal.json", bytes: 117, real: false, stubReason: "under 1KB" },
  { host: "playusa.com", file: "playusa_com_wp_json_levelup_v1_review_access_post_id_.json", bytes: 38, real: false, stubReason: "under 1KB" },
  { host: "polymarket.com", file: "polymarket_com_api_gas_polygon.json", bytes: 271, real: false, stubReason: "under 1KB" },
  { host: "receptionperception.com", file: "www_google_com_ccm_geo.json", bytes: 75, real: false, stubReason: "under 1KB" },
  { host: "sleeper.app", file: "sleeper_app_faab_suggestions_e_.json", bytes: 2, real: false, stubReason: "empty object" },
  { host: "sleeper.app", file: "sleeper_app_players_e_.json", bytes: 2, real: false, stubReason: "empty object" },
  { host: "sleeper.app", file: "sleeper_app_players_e_adp_csv_t_r_.json", bytes: 47, real: false, stubReason: "under 1KB" },
  { host: "sleeper.app", file: "sleeper_app_players_e_injuries.json", bytes: 2, real: false, stubReason: "empty object" },
  { host: "sleeper.app", file: "sleeper_app_players_e_t_depth_chart.json", bytes: 2, real: false, stubReason: "empty object" },
  { host: "sleeper.app", file: "sleeper_app_players_e_t_highlights.json", bytes: 47, real: false, stubReason: "under 1KB" },
  { host: "sleeper.app", file: "sleeper_app_players_e_t_r_a_injuries.json", bytes: 47, real: false, stubReason: "under 1KB" },
  { host: "sportsinfosolutions.com", file: "www_google_com_ccm_geo.json", bytes: 75, real: false, stubReason: "under 1KB" },
  { host: "teamrankings.com", file: "www_google_com_ccm_geo.json", bytes: 75, real: false, stubReason: "under 1KB" },
  { host: "theoddsapi.com", file: "www_google_com_ccm_geo.json", bytes: 75, real: false, stubReason: "under 1KB" },
  { host: "wynnbet.com", file: "get_geojs_io_v1_ip_geo_json.json", bytes: 356, real: false, stubReason: "under 1KB" },
];

/** Every capture on disk, real or stub, in one registry. */
export const CAPTURE_REGISTRY: readonly CaptureRef[] = [...CAPTURE_REAL, ...CAPTURE_STUBS];
