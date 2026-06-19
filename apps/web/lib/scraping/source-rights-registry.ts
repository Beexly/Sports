/**
 * Source Rights Registry — canonical record of every data source's legal posture.
 *
 * DESIGN PRINCIPLE: Scraping is not banned. It is rights-gated.
 *   - approved_public_logged_off: publicly accessible, no login, no anti-bot bypass → may extract facts
 *   - permission_required: terms prohibit automated use → must obtain consent before automation
 *   - manual_research_only: humans may read the UX/taxonomy; no automated extraction
 *   - vendor_candidate: commercial provider offering API/feed — evaluate licensing
 *   - excluded: legal review has determined no safe path exists
 *
 * Every extraction job MUST check this registry via the Clearance Engine before running.
 * Every extracted record MUST carry a RightsSnapshot captured at extraction time.
 */

// ─── Status ───────────────────────────────────────────────────────────────────

export type SourceRightsStatus =
  | "approved_public_logged_off"   // Public access, no login, no contract, facts only
  | "approved_api"                 // Licensed API with explicit commercial terms
  | "approved_open_license"        // CC0/CC-BY/CC-BY-SA/Apache/MIT open dataset
  | "approved_written_permission"  // Written contract or explicit permission received
  | "vendor_candidate"             // Commercial provider — evaluate API/licensing
  | "manual_research_only"         // Human UX/taxonomy review only; no automated extraction
  | "permission_required"          // Terms prohibit automation without consent
  | "blocked_technical_controls"   // Anti-bot / IP-block / CAPTCHA — cannot proceed
  | "excluded";                    // No safe path; permanently excluded

// ─── Risk levels ──────────────────────────────────────────────────────────────

export type RiskLevel = "none" | "low" | "medium" | "high" | "unknown";

// ─── Source type ──────────────────────────────────────────────────────────────

export type SourceType =
  | "sports_scores_aggregator"
  | "sports_data_api"
  | "open_dataset"
  | "news_aggregator"
  | "official_league_site"
  | "odds_provider"
  | "fantasy_platform"
  | "broadcast_media"
  | "social_media"
  | "government_registry"
  | "research_repo"
  | "other";

// ─── Source Rights Entry ──────────────────────────────────────────────────────

export type SourceRightsEntry = {
  readonly source_id: string;
  readonly source_name: string;
  readonly source_url: string;
  readonly terms_url: string | null;
  readonly robots_url: string | null;
  readonly jurisdiction: string;
  readonly source_type: SourceType;
  readonly status: SourceRightsStatus;

  // Permission flags
  readonly automation_allowed: boolean;
  readonly public_logged_off_allowed: boolean;
  readonly commercial_display_allowed: boolean;
  readonly storage_allowed: boolean;
  readonly derived_analytics_allowed: boolean;
  readonly model_training_allowed: boolean;
  readonly attribution_required: boolean;
  readonly attribution_text: string | null;

  // Risk flags
  readonly personal_data_risk: RiskLevel;
  readonly copyright_expression_risk: RiskLevel;
  readonly database_right_risk: RiskLevel;
  readonly technical_controls_detected: boolean;
  readonly cease_and_desist_received: boolean;

  // Evidence
  readonly reviewed_at: string;
  readonly reviewed_by: string;
  readonly evidence_urls: readonly string[];

  // Pathway
  readonly unlock_condition: string | null;
  readonly vendor_contact: string | null;
  readonly notes: string;
};

// ─── Rights Snapshot ─────────────────────────────────────────────────────────

export type RightsSnapshot = {
  readonly source_id: string;
  readonly source_url: string;
  readonly status: SourceRightsStatus;
  readonly automation_allowed: boolean;
  readonly public_logged_off_allowed: boolean;
  readonly commercial_display_allowed: boolean;
  readonly storage_allowed: boolean;
  readonly derived_analytics_allowed: boolean;
  readonly model_training_allowed: boolean;
  readonly attribution_required: boolean;
  readonly attribution_text: string | null;
  readonly reviewed_at: string;
  readonly snapshotted_at: string;
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const SOURCE_RIGHTS_REGISTRY: readonly SourceRightsEntry[] = [
  // ── Approved: open license ──────────────────────────────────────────────────
  {
    source_id: "nflverse",
    source_name: "nflverse",
    source_url: "https://github.com/nflverse/nflverse-data",
    terms_url: "https://github.com/nflverse/nflverse-data/blob/master/LICENSE",
    robots_url: null,
    jurisdiction: "US",
    source_type: "open_dataset",
    status: "approved_open_license",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: true,
    attribution_required: true,
    attribution_text: "Data from nflverse (https://github.com/nflverse), CC-BY-4.0",
    personal_data_risk: "low",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-10",
    reviewed_by: "internal",
    evidence_urls: ["https://github.com/nflverse/nflverse-data/blob/master/LICENSE"],
    unlock_condition: null,
    vendor_contact: null,
    notes: "CC-BY-4.0 — attribution required in all outputs, no share-alike. (The one exception, nflverse FTN charting/participation data, is CC-BY-SA-4.0 and is not ingested here.)",
  },

  {
    source_id: "open-meteo",
    source_name: "Open-Meteo",
    source_url: "https://open-meteo.com",
    terms_url: "https://open-meteo.com/en/terms",
    robots_url: null,
    jurisdiction: "DE",
    source_type: "open_dataset",
    status: "approved_open_license",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: true,
    attribution_required: true,
    attribution_text: "Weather data by Open-Meteo.com (CC-BY-4.0)",
    personal_data_risk: "none",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-15",
    reviewed_by: "internal",
    evidence_urls: ["https://open-meteo.com/en/terms", "https://open-meteo.com/en/license"],
    unlock_condition:
      "Free path for a commercial product: the underlying data is CC-BY-4.0 (commercial use OK with " +
      "attribution). The HOSTED free API tier is non-commercial / fair-use only — for production either " +
      "self-host the open data or take Open-Meteo's commercial tier. Verify endpoint schemas live before building the adapter.",
    vendor_contact: "https://open-meteo.com",
    notes:
      "Free, no key, no sign-up. Game-time weather (wind/precip/temp) for outdoor venues — a free quality " +
      "input for totals/passing models. Facts only (no copyrighted expression). Attribution required.",
  },

  {
    source_id: "wikidata",
    source_name: "Wikidata",
    source_url: "https://www.wikidata.org",
    terms_url: "https://www.wikidata.org/wiki/Wikidata:Licensing",
    robots_url: null,
    jurisdiction: "INT",
    source_type: "open_dataset",
    status: "approved_open_license",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: true,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "low",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: ["https://www.wikidata.org/wiki/Wikidata:Licensing"],
    unlock_condition: null,
    vendor_contact: null,
    notes:
      "CC0 public-domain dedication. Entity-resolution layer — links player/team/venue IDs across our other " +
      "sources via SPARQL (query.wikidata.org). Facts only; respect the query service's rate limits and cache results.",
  },

  {
    source_id: "openfootball",
    source_name: "openfootball / football.json",
    source_url: "https://github.com/openfootball",
    terms_url: "https://github.com/openfootball/football.json",
    robots_url: null,
    jurisdiction: "INT",
    source_type: "open_dataset",
    status: "approved_open_license",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: true,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "none",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: ["https://github.com/openfootball/football.json"],
    unlock_condition: null,
    vendor_contact: null,
    notes:
      "Public-domain (free/libre/open) football (soccer) schedules + results as JSON, including the 2026 World Cup. " +
      "Facts only — fixtures, scores, groups. Good free coverage for the soccer slate.",
  },

  {
    source_id: "hifld-venues",
    source_name: "HIFLD Open — venue/stadium geodata",
    source_url: "https://hifld-geoplatform.opendata.arcgis.com",
    terms_url: "https://hifld-geoplatform.opendata.arcgis.com",
    robots_url: null,
    jurisdiction: "US",
    source_type: "open_dataset",
    status: "approved_open_license",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: true,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "none",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: ["https://hifld-geoplatform.opendata.arcgis.com"],
    unlock_condition: null,
    vendor_contact: null,
    notes:
      "US federal public-domain (HIFLD Open) stadium/venue coordinates — authoritative lat/lon that feeds the " +
      "weather lookups (Open-Meteo / NWS). Facts only.",
  },

  {
    source_id: "retrosheet",
    source_name: "Retrosheet",
    source_url: "https://www.retrosheet.org",
    terms_url: "https://www.retrosheet.org/notice.txt",
    robots_url: null,
    jurisdiction: "US",
    source_type: "open_dataset",
    status: "approved_open_license",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: true,
    attribution_required: true,
    attribution_text:
      "The information used here was obtained free of charge from and is copyrighted by Retrosheet (https://www.retrosheet.org).",
    personal_data_risk: "low",
    copyright_expression_risk: "low",
    database_right_risk: "low",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: ["https://www.retrosheet.org/notice.txt"],
    unlock_condition: null,
    vendor_contact: null,
    notes:
      "Permissive: Retrosheet permits free use/sale/redistribution PROVIDED the exact attribution notice above " +
      "appears in all outputs (see notice.txt). Complete MLB play-by-play 1910–present — deep baseline for " +
      "baseball calibration. The attribution string is MANDATORY wherever this data (or anything derived) is shown.",
  },

  // ── Approved: public logged-off API ─────────────────────────────────────────
  {
    source_id: "espn-public-api",
    source_name: "ESPN Public API (unofficial)",
    source_url: "https://site.api.espn.com",
    terms_url: "https://www.espn.com/espn/tos",
    robots_url: null,
    jurisdiction: "US",
    source_type: "sports_scores_aggregator",
    status: "approved_public_logged_off",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: true,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text: "Scores data via ESPN",
    personal_data_risk: "none",
    copyright_expression_risk: "low",
    database_right_risk: "low",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-11",
    reviewed_by: "internal",
    evidence_urls: ["https://www.espn.com/espn/tos"],
    unlock_condition:
      "Upgrade to commercial_display_allowed requires ESPN official data license agreement.",
    vendor_contact: "https://syndication.espn.com",
    notes:
      "Unofficial public endpoint. No key required. Facts (scores, schedules, rosters) are " +
      "not copyrightable. Structured data feed may carry database rights risk in EU. " +
      "commercial_display_allowed=false until licensed. Treat as fallback only; rate-limit aggressively.",
  },

  // ── Approved: licensed API ───────────────────────────────────────────────────
  {
    source_id: "the-odds-api",
    source_name: "The Odds API",
    source_url: "https://the-odds-api.com",
    terms_url: "https://the-odds-api.com/legalstuff.html",
    robots_url: null,
    jurisdiction: "AU",
    source_type: "odds_provider",
    status: "approved_api",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: false,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "none",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-01",
    reviewed_by: "internal",
    evidence_urls: ["https://the-odds-api.com/legalstuff.html"],
    unlock_condition: null,
    vendor_contact: "https://the-odds-api.com/contact.html",
    notes: "Paid API. Subscription in place. Confirmed commercial display and storage rights.",
  },

  // ── Permission required ──────────────────────────────────────────────────────
  {
    source_id: "scores24-live",
    source_name: "Scores24.live (Kiito OÜ)",
    source_url: "https://scores24.live",
    terms_url: "https://scores24.live/en/p-rules",
    robots_url: "https://scores24.live/robots.txt",
    jurisdiction: "EE",
    source_type: "sports_scores_aggregator",
    status: "permission_required",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "low",
    copyright_expression_risk: "medium",
    database_right_risk: "medium",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-11",
    reviewed_by: "internal",
    evidence_urls: [
      "https://scores24.live/en/p-rules",
      "https://scores24.live/en/p-about",
    ],
    unlock_condition:
      "Written permission, API agreement, data license, or partnership terms from Kiito OÜ. " +
      "Contact: support@scores24.live",
    vendor_contact: "support@scores24.live",
    notes:
      "ToS §4.2 explicitly forbids 'automated programs to interact with the Site and its Services'. " +
      "Any use beyond personal use requires Company consent. Commercial use requires prior written permission. " +
      "Upstream data source unknown — may relay Sportradar/Stats Perform (secondary liability risk). " +
      "Manual UX research, feature taxonomy, field taxonomy, and competitor analysis are ALLOWED. " +
      "Outreach via support@scores24.live or personal-data@scores24.live required before any automation.",
  },

  // ── Permission required ──────────────────────────────────────────────────────
  {
    source_id: "fpl-api",
    source_name: "Fantasy Premier League API (Premier League / FAPL)",
    source_url: "https://fantasy.premierleague.com/api/",
    terms_url: "https://www.premierleague.com/en/terms-and-conditions",
    robots_url: "https://fantasy.premierleague.com/robots.txt",
    jurisdiction: "UK",
    source_type: "fantasy_platform",
    status: "permission_required",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "low",
    copyright_expression_risk: "medium",
    database_right_risk: "high",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-15",
    reviewed_by: "internal",
    evidence_urls: [
      "https://www.premierleague.com/en/terms-and-conditions",
    ],
    unlock_condition:
      "Prior written approval from the Football Association Premier League Limited. " +
      "Contact: info@premierleague.com. Alternatively, use a licensed EPL data provider " +
      "(e.g. football-data.org free tier allows non-commercial use; commercial requires their API plan).",
    vendor_contact: "info@premierleague.com",
    notes:
      "PL Terms of Use (Intellectual Property Rights section) explicitly prohibit: (1) commercial use " +
      "of Website/App data, (2) creating a database from downloaded material, (3) redistribution without " +
      "prior written approval. UK database right (sui generis) applies even to factual compilations. " +
      "Adapter built (lib/data-sources/free-adapters/fpl.ts) and gated — DO NOT ingest until written " +
      "consent obtained or a licensed alternative source is used. EPL is not yet a core Sport type; " +
      "adding it is gated on this clearance.",
  },

  // ── Vendor candidate ─────────────────────────────────────────────────────────
  {
    source_id: "score24-com",
    source_name: "Score24.com",
    source_url: "https://score24.com",
    terms_url: null,
    robots_url: null,
    jurisdiction: "unknown",
    source_type: "sports_data_api",
    status: "vendor_candidate",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "unknown",
    copyright_expression_risk: "unknown",
    database_right_risk: "unknown",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-11",
    reviewed_by: "internal",
    evidence_urls: [],
    unlock_condition:
      "Complete vendor questionnaire. Negotiate commercial terms. " +
      "Obtain written API/data license agreement before ingestion.",
    vendor_contact: null,
    notes:
      "Commercial sports data provider. Priority: high. Offers API/feed/widget products. " +
      "Pending vendor questionnaire and commercial terms review. " +
      "All flags remain false until contract signed.",
  },
  {
    source_id: "jeff-mans-one-mans-opinion",
    source_name: "One MANS Opinion with Jeff Mans (public podcast feed)",
    source_url: "https://manspod.podbean.com/",
    terms_url: "https://www.podbean.com/site/static/termsOfUse",
    robots_url: null,
    jurisdiction: "US",
    source_type: "broadcast_media",
    status: "vendor_candidate",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text: "Claim made by Jeff Mans on One MANS Opinion (manual listener log)",
    personal_data_risk: "low",
    copyright_expression_risk: "high",
    database_right_risk: "low",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-12",
    reviewed_by: "internal",
    evidence_urls: [
      "https://manspod.podbean.com/",
      "https://podcasts.apple.com/us/podcast/one-mans-opinion-with-jeff-mans/id1500323362",
      "https://www.fantasyguru.com/elite-plus-podcasts/",
    ],
    unlock_condition:
      "Complete vendor questionnaire (docs/legal/VENDOR_QUESTIONNAIRE_JEFF_MANS.md) and obtain " +
      "written license/partnership terms from Fantasy Guru / Jeff Mans for automated ingestion " +
      "or derived analytics.",
    vendor_contact: "https://www.fantasyguru.com",
    notes:
      "Owner-directed evaluation of Jeff Mans' weekly show as its own source — SiriusXM corporate " +
      "licensing is PARKED per owner and is NOT this entry; SiriusXM-distributed content stays under " +
      "siriusxm-streaming. This entry covers ONLY the openly syndicated podcast feed (Podbean host; " +
      "ELITE+ Podcast Network / FantasyGuru). The show's picks and analysis are proprietary " +
      "predictions — data-rules forbid extracting them as inputs, so the value lane is pundit-claim " +
      "ACCOUNTABILITY (paraphrased claim, pundit, date), which the Airwave source policy already " +
      "allows manually at LOW risk for podcast_rss. Automated capture/transcription stays OFF until " +
      "the questionnaire and license land. Episode metadata (titles, dates) are facts; audio is " +
      "copyrighted expression — hence high expression risk. Contact via fantasyguru.com.",
  },
  {
    source_id: "collegefootballdata",
    source_name: "CollegeFootballData.com (CFBD)",
    source_url: "https://collegefootballdata.com",
    terms_url: "https://collegefootballdata.com/terms",
    robots_url: null,
    jurisdiction: "US",
    source_type: "sports_data_api",
    status: "vendor_candidate",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text: "College data via CollegeFootballData.com",
    personal_data_risk: "none",
    copyright_expression_risk: "low",
    database_right_risk: "low",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-15",
    reviewed_by: "internal",
    evidence_urls: [
      "https://collegefootballdata.com/key",
      "https://collegefootballdata.com/api-tiers",
      "https://collegefootballdata.com/terms",
    ],
    unlock_condition:
      "Obtain a free CFBD API key (https://collegefootballdata.com/key) AND confirm the Terms & " +
      "Conditions permit our commercial use — the terms page is JS-rendered and was NOT machine-" +
      "verifiable, so it needs a human/legal read. Free tier = 1,000 calls/mo; paid tiers ($1–$30/mo) " +
      "raise the limit. On confirmation: flip status → approved_api, enable automation/storage/derived " +
      "flags, and verify each endpoint's real schema live before building the adapter (no guessed columns).",
    vendor_contact: "https://collegefootballdata.com/key",
    notes:
      "Intended use: the QB college→NFL scheme-transition signal (college passing/scheme FACTS only), " +
      "feeding projection/feature work — never any proprietary ratings or outputs. CFBD is a freemium " +
      "API (free key required, Bearer token; cfbfastR is the MIT R wrapper). Its stated philosophy is " +
      "'free and open data,' but commercial terms are not machine-verified, so ALL flags stay false and " +
      "ingestion is BLOCKED until a key + terms-confirmation land. No schema is guessed: the adapter is " +
      "deferred until a key lets us verify endpoints live (the no-fake-data rule).",
  },

  // ── Permission required ──────────────────────────────────────────────────────
  {
    source_id: "siriusxm-streaming",
    source_name: "SiriusXM Streaming (incl. Fantasy Sports Radio)",
    source_url: "https://www.siriusxm.com/player/home",
    terms_url: "https://www.siriusxm.com/customer-agreement",
    robots_url: null,
    jurisdiction: "US",
    source_type: "broadcast_media",
    status: "permission_required",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text: "Claim heard on SiriusXM (manual listener log)",
    personal_data_risk: "low",
    copyright_expression_risk: "high",
    database_right_risk: "high",
    technical_controls_detected: true,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-12",
    reviewed_by: "internal",
    evidence_urls: ["https://www.siriusxm.com/customer-agreement"],
    unlock_condition:
      "Written license or partnership agreement with Sirius XM Radio LLC covering automated capture, transcription, or AI analysis.",
    vendor_contact: null,
    notes:
      "Customer Agreement (2025-06-05) §9(d): personal, non-commercial use only; " +
      "§9(l) AI Matters: no scraping/extraction, and Services data may not be used to " +
      "create/train/improve ANY AI service — a paid subscription does NOT unlock automation. " +
      "ONLY legal lane without a license: a human listens on their own subscription and manually " +
      "logs short factual claims (pundit, claim, date) into Airwave intake — facts with " +
      "attribution, no recordings, no transcripts, no automated capture.",
  },

  // ── Manual research only ─────────────────────────────────────────────────────
  {
    source_id: "jeff-mans-weekly-show",
    source_name: "Jeff Mans weekly show (public podcast/YouTube distribution)",
    source_url: "https://www.youtube.com/results?search_query=jeff+mans",
    terms_url: "https://www.youtube.com/static?template=terms",
    robots_url: null,
    jurisdiction: "US",
    source_type: "broadcast_media",
    status: "manual_research_only",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text: "Claim heard on Jeff Mans' show (manual listener log)",
    personal_data_risk: "low",
    copyright_expression_risk: "high",
    database_right_risk: "low",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-12",
    reviewed_by: "internal",
    evidence_urls: [],
    unlock_condition:
      "Step 1: locate the show's OFFICIAL public distribution endpoints (podcast RSS, " +
      "YouTube channel) and record them in evidence_urls. Step 2: counsel review of the " +
      "host platform's terms (YouTube ToS restricts automated access; an official podcast " +
      "RSS feed's episode METADATA may qualify for approved_public_logged_off — facts only). " +
      "Step 3: best path is direct permission from Jeff Mans / the show's outlet, which " +
      "unlocks deeper integration and is likely attainable for an independent show.",
    vendor_contact: null,
    notes:
      "Owner-flagged candidate (POLISH_BACKLOG #6) as the licensable alternative to " +
      "SiriusXM corporate (parked per owner). Episode CONTENT is copyrighted expression: " +
      "the only lane today is the same manual listener log as SiriusXM — a human listens " +
      "to the public show and manually logs short factual claims (pundit, claim, date) " +
      "into Airwave intake. No recordings, no transcripts, no automated capture until " +
      "the unlock condition is met.",
  },

  // ── Permission required — new candidates ────────────────────────────────────
  {
    source_id: "the-athletic",
    source_name: "The Athletic (NYT Sports)",
    source_url: "https://theathletic.com",
    terms_url: "https://theathletic.com/pages/terms-of-service/",
    robots_url: "https://theathletic.com/robots.txt",
    jurisdiction: "US",
    source_type: "news_aggregator",
    status: "permission_required",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "low",
    copyright_expression_risk: "high",
    database_right_risk: "medium",
    technical_controls_detected: true,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: [
      "https://theathletic.com/pages/terms-of-service/",
    ],
    unlock_condition:
      "Written licensing agreement with The Athletic Media Company (now a NYT subsidiary). " +
      "Contact: partnerships@theathletic.com. Note: content is paywalled; only publicly " +
      "accessible article titles and metadata (publication date, headline, author) may be " +
      "reviewed manually as facts. Any automated extraction or paywall bypass is prohibited.",
    vendor_contact: "partnerships@theathletic.com",
    notes:
      "Subscription-only sports journalism. ToS prohibit scraping, crawling, or automated " +
      "access. Article bodies are copyrighted expression — data-rules forbid extraction. " +
      "The only permitted lane today is a human reading publicly accessible headlines/bylines " +
      "as factual references (author, date, topic — not article body). " +
      "Potential value: injury context, coaching signals, lineup news — facts only, " +
      "sourced via manual research note. No automation until a licensing agreement is in place.",
  },

  {
    source_id: "tapology",
    source_name: "Tapology (MMA/combat sports event database)",
    source_url: "https://www.tapology.com",
    terms_url: "https://www.tapology.com/terms",
    robots_url: "https://www.tapology.com/robots.txt",
    jurisdiction: "US",
    source_type: "sports_scores_aggregator",
    status: "permission_required",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "low",
    copyright_expression_risk: "medium",
    database_right_risk: "medium",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: [
      "https://www.tapology.com/terms",
    ],
    unlock_condition:
      "Written permission or API/data licensing agreement from Tapology. " +
      "Contact via tapology.com contact form. Confirm commercial use rights, " +
      "storage rights, and derived-analytics rights before any automation.",
    vendor_contact: "https://www.tapology.com/contact",
    notes:
      "Community-driven MMA/combat sports event and fighter database. ToS prohibit " +
      "automated scraping and commercial use without consent. The database of fight " +
      "records, event schedules, and fighter records is a factual compilation, but " +
      "Tapology's curation effort may carry database-right risk in the EU. " +
      "Value: UFC/MMA fight cards, fighter records, odds history — inputs for the " +
      "combat-sports prediction track. All extraction stays blocked behind the Clearance " +
      "Engine until written permission is obtained. Manual research note (human review " +
      "of public pages) is the only permitted lane today.",
  },

  {
    source_id: "nfl-schedule-api",
    source_name: "NFL.com Schedule (public JSON endpoint)",
    source_url: "https://www.nfl.com/schedules/",
    terms_url: "https://www.nfl.com/legal/terms-and-conditions/",
    robots_url: "https://www.nfl.com/robots.txt",
    jurisdiction: "US",
    source_type: "official_league_site",
    status: "permission_required",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "none",
    copyright_expression_risk: "medium",
    database_right_risk: "medium",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: [
      "https://www.nfl.com/legal/terms-and-conditions/",
    ],
    unlock_condition:
      "Written license or data partnership with the NFL. The Odds API (already approved_api) " +
      "and nflverse (approved_open_license) are the preferred substitutes for schedule facts — " +
      "evaluate those first. If direct NFL data is needed, contact NFL Data Solutions " +
      "(nfldata@nfl.com) for licensing terms.",
    vendor_contact: "nfldata@nfl.com",
    notes:
      "NFL.com ToS prohibit scraping or automated access to site content for commercial use. " +
      "Schedule facts (teams, dates, times, venues) are not copyrightable, but the NFL's " +
      "structured database compilation may carry additional rights. " +
      "Preferred paths: The Odds API for game lines/schedules (already approved), nflverse " +
      "for historical play-by-play. This entry documents the official site as a candidate " +
      "only; no automation is enabled. Manual research note (human reads the schedule page) " +
      "is permitted for one-off fact checks.",
  },

  {
    source_id: "pro-football-reference",
    source_name: "Pro Football Reference (Sports Reference LLC)",
    source_url: "https://www.pro-football-reference.com",
    terms_url: "https://www.sports-reference.com/data_use.html",
    robots_url: "https://www.pro-football-reference.com/robots.txt",
    jurisdiction: "US",
    source_type: "sports_data_api",
    status: "permission_required",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "none",
    copyright_expression_risk: "low",
    database_right_risk: "medium",
    technical_controls_detected: true,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: [
      "https://www.sports-reference.com/data_use.html",
      "https://www.sports-reference.com/sharing.html",
    ],
    unlock_condition:
      "Obtain a Sports Reference commercial data license (sports-reference.com/data_use.html). " +
      "The data_use page explicitly states automated scraping is not permitted; contact " +
      "sr-data@sports-reference.com for commercial licensing terms. Preferred substitute: " +
      "nflverse (CC-BY-4.0, approved_open_license) covers most of the same historical stats.",
    vendor_contact: "sr-data@sports-reference.com",
    notes:
      "Sports Reference explicitly prohibits automated scraping in its data_use policy and " +
      "rate-limits heavily. Their robots.txt disallows most automated paths. The underlying " +
      "statistics are facts, but the compiled database carries database-right risk. " +
      "Value: historical career stats, advanced splits, game logs — but nflverse is the " +
      "preferred free path for NFL historical data. No automation until licensed.",
  },

  {
    source_id: "jersey-number-db",
    source_name: "Jersey Number Database (candidate — source TBD)",
    source_url: "https://www.prosportstransactions.com",
    terms_url: null,
    robots_url: null,
    jurisdiction: "US",
    source_type: "other",
    status: "manual_research_only",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "none",
    copyright_expression_risk: "low",
    database_right_risk: "low",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: [],
    unlock_condition:
      "Step 1: Identify the most appropriate free/open-licensed jersey-number source " +
      "(prosportstransactions.com for transaction facts; nflverse roster data includes " +
      "jersey numbers under CC-BY-4.0 and is the preferred path). " +
      "Step 2: Human legal/terms review of whichever source is selected. " +
      "Step 3: If nflverse covers the need, no new source entry is required — use the " +
      "existing approved_open_license entry instead. Update this entry's source_url and " +
      "terms_url once the authoritative source is identified.",
    vendor_contact: null,
    notes:
      "Jersey number facts (player, team, number, season) are not copyrightable. " +
      "Preferred path: nflverse roster data (CC-BY-4.0, approved_open_license) already " +
      "includes player numbers. This entry exists to document the category for tracking. " +
      "If nflverse does not cover a sport, evaluate the specific source before automation. " +
      "No source URL or terms confirmed — manual human research only until resolved.",
  },

  // ── Approved: public government API ─────────────────────────────────────────
  {
    source_id: "nws-weather-api",
    source_name: "National Weather Service API (weather.gov)",
    source_url: "https://api.weather.gov",
    terms_url: "https://www.weather.gov/disclaimer",
    robots_url: "https://api.weather.gov/robots.txt",
    jurisdiction: "US",
    source_type: "open_dataset",
    status: "approved_api",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: true,
    attribution_required: true,
    attribution_text: "Weather data from the U.S. National Weather Service (weather.gov) — public domain",
    personal_data_risk: "none",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: [
      "https://www.weather.gov/disclaimer",
      "https://www.weather.gov/documentation/services-web-api",
      "https://api.weather.gov/openapi.json",
    ],
    unlock_condition: null,
    vendor_contact: "https://www.weather.gov/contact",
    notes:
      "U.S. federal government API. All NWS data is U.S. Government Work (17 U.S.C. §105) " +
      "— in the public domain; no copyright restrictions on facts. No API key required; " +
      "free for any use including commercial. The API follows the OpenAPI spec and provides " +
      "hourly/7-day forecasts by lat/lon point and grid cell. " +
      "Use case: game-time weather (temperature, wind speed/direction, precipitation " +
      "probability) for outdoor NFL/MLB/CFB venues — a free, reliable input for the " +
      "already-built weather factor in the prediction engine. Rate limits are generous " +
      "for reasonable automated use; set a User-Agent header per NWS API guidelines. " +
      "Covers US venues only; use Open-Meteo (approved_open_license) for non-US venues. " +
      "Attribution strongly encouraged (government source attribution is standard practice).",
  },

  // ── Approved: new open-license and API sources (S4) ─────────────────────────
  {
    source_id: "nhl-api",
    source_name: "NHL Official API (api-web.nhle.com)",
    source_url: "https://api-web.nhle.com/v1",
    terms_url: null,
    robots_url: null,
    jurisdiction: "US",
    source_type: "sports_data_api",
    status: "approved_public_logged_off",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: false,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text: "NHL data via api-web.nhle.com (unofficial, community-documented endpoint)",
    personal_data_risk: "none",
    copyright_expression_risk: "low",
    database_right_risk: "low",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: ["https://github.com/Zmalski/NHL-API-Reference"],
    unlock_condition:
      "Upgrade commercial_display_allowed requires an official NHL data license. " +
      "Preferred path for display: derive facts from The Odds API (approved_api) which already " +
      "carries commercial display rights.",
    vendor_contact: null,
    notes:
      "Keyless REST API; no official ToS published but community-maintained documentation widely " +
      "used for research. Provides full play-by-play, shot coordinates, live feeds, rosters, " +
      "schedules, standings. No login required. commercial_display_allowed=false until licensed — " +
      "use for derived analytics only (facts are not copyrightable; structured compilation may " +
      "carry database rights). Wire via clearance engine only.",
  },

  {
    source_id: "balldontlie",
    source_name: "BALLDONTLIE API (balldontlie.io)",
    source_url: "https://api.balldontlie.io",
    terms_url: "https://www.balldontlie.io/home.html#terms",
    robots_url: null,
    jurisdiction: "US",
    source_type: "sports_data_api",
    status: "approved_api",
    automation_allowed: true,
    public_logged_off_allowed: false,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text: "Data provided by BALLDONTLIE (balldontlie.io)",
    personal_data_risk: "low",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: ["https://www.balldontlie.io/home.html#terms"],
    unlock_condition: null,
    vendor_contact: "https://www.balldontlie.io",
    notes:
      "Free tier: 5 req/min, 100 req/day, API key required (free signup, no CC). Multi-sport: " +
      "NBA, NFL, MLB, NHL, WNBA, NCAAF, NCAAB, soccer, MMA, tennis, golf, F1. " +
      "Play-by-play only on paid GOAT tier. API key env: BALLDONTLIE_API_KEY. " +
      "Adapter INERT until key provided — zero risk.",
  },

  {
    source_id: "thesportsdb",
    source_name: "TheSportsDB (thesportsdb.com)",
    source_url: "https://www.thesportsdb.com/api/v1/json",
    terms_url: "https://www.thesportsdb.com/api.php",
    robots_url: null,
    jurisdiction: "UK",
    source_type: "sports_data_api",
    status: "approved_api",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: false,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text:
      "Data courtesy of TheSportsDB (thesportsdb.com) — community crowd-sourced sports database",
    personal_data_risk: "low",
    copyright_expression_risk: "low",
    database_right_risk: "low",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: ["https://www.thesportsdb.com/api.php"],
    unlock_condition:
      "Upgrade commercial_display_allowed requires Patreon tier ($9/mo) per TheSportsDB API terms. " +
      "Free tier (test key '1' or free signup) restricts commercial display.",
    vendor_contact: "https://www.thesportsdb.com/api.php",
    notes:
      "Free tier uses test key '1'. Full access via free signup. 30 req/min free tier. " +
      "Multi-sport including NFL, NBA, NHL, MLB, soccer. V2 livescores require paid Patreon ($9/mo). " +
      "Community crowd-sourced — verify data quality against primary sources before prediction use. " +
      "API key env: THESPORTSDB_API_KEY.",
  },

  {
    source_id: "clearsports",
    source_name: "ClearSports API (clearsportsapi.com)",
    source_url: "https://api.clearsportsapi.com",
    terms_url: "https://clearsportsapi.com/terms",
    robots_url: null,
    jurisdiction: "US",
    source_type: "sports_data_api",
    status: "approved_api",
    automation_allowed: true,
    public_logged_off_allowed: false,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text: "Sports data provided by ClearSports API (clearsportsapi.com)",
    personal_data_risk: "none",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: ["https://clearsportsapi.com/terms"],
    unlock_condition: null,
    vendor_contact: "https://clearsportsapi.com",
    notes:
      "Free 1,000 API calls/month, no credit card required. NFL, NBA, NHL, MLB, soccer. " +
      "Bearer token auth. Clean REST schema. Covers odds, stats, injuries, news, schedules. " +
      "API key env: CLEARSPORTS_API_KEY. Adapter INERT until key provided — zero risk.",
  },

  {
    source_id: "oddspapi",
    source_name: "OddsPapi (oddspapi.io)",
    source_url: "https://api.oddspapi.io",
    terms_url: "https://oddspapi.io/terms",
    robots_url: null,
    jurisdiction: "US",
    source_type: "odds_provider",
    status: "vendor_candidate",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text: "Historical odds data via OddsPapi (oddspapi.io)",
    personal_data_risk: "none",
    copyright_expression_risk: "none",
    database_right_risk: "low",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: ["https://oddspapi.io/terms"],
    unlock_condition:
      "Complete vendor questionnaire (docs/legal/VENDOR_QUESTIONNAIRE_ODDSPAPI.md). " +
      "Confirm commercial use, storage, and derived-analytics rights. " +
      "On approval: flip to approved_api and enable relevant flags.",
    vendor_contact: "https://oddspapi.io",
    notes:
      "Free tier: 250 req/month, no CC required. Includes Pinnacle historical closing lines — " +
      "the primary free path to CLV backtesting. 350+ bookmakers. Historical data included on all " +
      "tiers including free. Primary use case: closing-line value (CLV) calibration audit. " +
      "API key env: ODDSPAPI_API_KEY. All flags remain false until vendor questionnaire complete.",
  },

  {
    source_id: "transfermarkt-datasets",
    source_name: "Transfermarkt Datasets (github.com/dcaribou/transfermarkt-datasets)",
    source_url: "https://raw.githubusercontent.com/dcaribou/transfermarkt-datasets/main",
    terms_url: "https://github.com/dcaribou/transfermarkt-datasets/blob/main/LICENSE",
    robots_url: null,
    jurisdiction: "INT",
    source_type: "open_dataset",
    status: "approved_open_license",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: true,
    attribution_required: true,
    attribution_text:
      "Football data from Transfermarkt Datasets by David Caribou " +
      "(github.com/dcaribou/transfermarkt-datasets) — CC0-1.0 (Public Domain)",
    personal_data_risk: "low",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: [
      "https://github.com/dcaribou/transfermarkt-datasets/blob/main/LICENSE",
    ],
    unlock_condition: null,
    vendor_contact: null,
    notes:
      "CC0-1.0 public domain dedication. 79,000+ games, 37,000+ players, 1.8M+ appearances, " +
      "valuations, transfers. 12 relational tables (players, clubs, games, appearances, " +
      "player_valuations, transfers, game_events, club_games, game_lineups). " +
      "Updated weekly. GitHub direct download, no key required. " +
      "Best soccer player/match/valuation dataset in the free tier.",
  },

  {
    source_id: "openligadb",
    source_name: "OpenLigaDB (api.openligadb.de)",
    source_url: "https://api.openligadb.de",
    terms_url: null,
    robots_url: null,
    jurisdiction: "DE",
    source_type: "sports_data_api",
    status: "approved_open_license",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: true,
    attribution_required: true,
    attribution_text:
      "Football data from OpenLigaDB (api.openligadb.de) — community open sports database",
    personal_data_risk: "none",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: ["https://github.com/OpenLigaDB/OpenLigaDB-Samples"],
    unlock_condition: null,
    vendor_contact: null,
    notes:
      "Keyless REST API. Community open sports database; no restrictions documented. " +
      "Coverage: Bundesliga, 2. Bundesliga, DFB Pokal, Champions League results. " +
      "Returns JSON: match results, standings, schedules, goal scorers. " +
      "Coverage strongest for German football. Suitable for soccer feature enrichment.",
  },

  {
    source_id: "nfl-data-py",
    source_name: "nflverse / nfl_data_py (nflverse.nflverse.com)",
    source_url: "https://github.com/nflverse/nfl_data_py",
    terms_url: "https://github.com/nflverse/nfl_data_py/blob/main/LICENSE",
    robots_url: null,
    jurisdiction: "US",
    source_type: "open_dataset",
    status: "approved_open_license",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text:
      "NFL data from nflverse (nflverse.nflverse.com). Code: MIT License. " +
      "Data: CC-BY-SA 4.0. Attribution required; share-alike applies to data outputs.",
    personal_data_risk: "low",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-19",
    reviewed_by: "internal",
    evidence_urls: [
      "https://github.com/nflverse/nfl_data_py/blob/main/LICENSE",
      "https://github.com/nflverse/nflverse-data/blob/master/LICENSE",
    ],
    unlock_condition:
      "model_training_allowed=false because some nflverse data tables are CC-BY-SA 4.0 (share-alike). " +
      "Upgrade to model_training requires confirming outputs comply with CC-BY-SA share-alike " +
      "or obtaining explicit permission from nflverse maintainers.",
    vendor_contact: null,
    notes:
      "NFL play-by-play back to 1999 with EPA, WPA. Schedule data includes surface (turf type), " +
      "roof, stadium, temp, wind per game — best free source for venue surface/conditions. " +
      "import_officials() provides historical referee assignments by game — direct input for referee signal. " +
      "Python package: nfl-data-py. No API key required — pulls from GitHub-hosted datasets. " +
      "IMPORTANT: Data is CC-BY-SA 4.0 (share-alike) — derived data outputs must carry the same license " +
      "or be presented as analytics/transformations with attribution. Distinct from nflverse-data " +
      "(nflverse CC-BY-4.0 entry) which is a separate package. Both are registered.",
  },

  // ── Excluded ─────────────────────────────────────────────────────────────────
  {
    source_id: "siriusxm-activator",
    source_name: "parker-stephens/siriusxm-activator",
    source_url: "https://github.com/parker-stephens/siriusxm-activator",
    terms_url: null,
    robots_url: null,
    jurisdiction: "US",
    source_type: "broadcast_media",
    status: "excluded",
    automation_allowed: false,
    public_logged_off_allowed: false,
    commercial_display_allowed: false,
    storage_allowed: false,
    derived_analytics_allowed: false,
    model_training_allowed: false,
    attribution_required: false,
    attribution_text: null,
    personal_data_risk: "high",
    copyright_expression_risk: "high",
    database_right_risk: "high",
    technical_controls_detected: true,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-10",
    reviewed_by: "internal",
    evidence_urls: [],
    unlock_condition: null,
    vendor_contact: null,
    notes: "Circumvents paid SiriusXM activation. PERMANENTLY EXCLUDED. No path to approval.",
  },
];

// ─── Registry access ──────────────────────────────────────────────────────────

export function getSourceRightsEntry(sourceId: string): SourceRightsEntry | undefined {
  return SOURCE_RIGHTS_REGISTRY.find((s) => s.source_id === sourceId);
}

export function getSourcesByStatus(status: SourceRightsStatus): readonly SourceRightsEntry[] {
  return SOURCE_RIGHTS_REGISTRY.filter((s) => s.status === status);
}

export function getApprovedSources(): readonly SourceRightsEntry[] {
  return SOURCE_RIGHTS_REGISTRY.filter((s) =>
    s.status === "approved_public_logged_off" ||
    s.status === "approved_api" ||
    s.status === "approved_open_license" ||
    s.status === "approved_written_permission",
  );
}

export function getVendorCandidates(): readonly SourceRightsEntry[] {
  return SOURCE_RIGHTS_REGISTRY.filter((s) => s.status === "vendor_candidate");
}

export function getPermissionRequiredSources(): readonly SourceRightsEntry[] {
  return SOURCE_RIGHTS_REGISTRY.filter((s) => s.status === "permission_required");
}

export function snapshotRights(entry: SourceRightsEntry, now = new Date()): RightsSnapshot {
  return {
    source_id: entry.source_id,
    source_url: entry.source_url,
    status: entry.status,
    automation_allowed: entry.automation_allowed,
    public_logged_off_allowed: entry.public_logged_off_allowed,
    commercial_display_allowed: entry.commercial_display_allowed,
    storage_allowed: entry.storage_allowed,
    derived_analytics_allowed: entry.derived_analytics_allowed,
    model_training_allowed: entry.model_training_allowed,
    attribution_required: entry.attribution_required,
    attribution_text: entry.attribution_text,
    reviewed_at: entry.reviewed_at,
    snapshotted_at: now.toISOString(),
  };
}

/** Registry summary for cockpit display. */
export function getRegistrySummary() {
  const total = SOURCE_RIGHTS_REGISTRY.length;
  const byStatus = {
    approved_public_logged_off: 0,
    approved_api: 0,
    approved_open_license: 0,
    approved_written_permission: 0,
    vendor_candidate: 0,
    manual_research_only: 0,
    permission_required: 0,
    blocked_technical_controls: 0,
    excluded: 0,
  };
  for (const s of SOURCE_RIGHTS_REGISTRY) {
    byStatus[s.status] += 1;
  }
  return { total, byStatus };
}
