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
    notes: "CC-BY-4.0: attribution required in all outputs, no share-alike. (The one exception, nflverse FTN charting/participation data, is CC-BY-SA-4.0 and is not ingested here.)",
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
      "attribution). The HOSTED free API tier is non-commercial / fair-use only. For production either " +
      "self-host the open data or take Open-Meteo's commercial tier. Verify endpoint schemas live before building the adapter.",
    vendor_contact: "https://open-meteo.com",
    notes:
      "Free, no key, no sign-up. Game-time weather (wind/precip/temp) for outdoor venues, a free quality " +
      "input for totals/passing models. Facts only (no copyrighted expression). Attribution required.",
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

  {
    source_id: "sleeper-api",
    source_name: "Sleeper API",
    source_url: "https://api.sleeper.app",
    terms_url: "https://docs.sleeper.com/",
    robots_url: null,
    jurisdiction: "US",
    source_type: "fantasy_platform",
    status: "approved_public_logged_off",
    automation_allowed: true,
    public_logged_off_allowed: true,
    // Conservative: the docs require attribution for trending data and contain no
    // explicit COMMERCIAL-display/redistribution grant. We use Sleeper for internal
    // derived analytics + cached facts (with attribution); raw commercial display
    // stays gated until the ToS is confirmed (see unlock_condition).
    commercial_display_allowed: false,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text: "Player movement data via the Sleeper API.",
    personal_data_risk: "none",
    copyright_expression_risk: "none",
    database_right_risk: "low",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-06-22",
    reviewed_by: "internal",
    evidence_urls: ["https://docs.sleeper.com/"],
    unlock_condition:
      "Confirm Sleeper's Terms permit commercial DISPLAY/redistribution of player + trending " +
      "data, then set commercial_display_allowed=true. Until then: internal derived analytics " +
      "and cached facts only, with attribution.",
    vendor_contact: null,
    notes:
      "Free, no-key, read-only public API. Facts only: player metadata, injury status, current " +
      "team, and trending add/drop counts (the unique free ownership signal). Cache the ~5MB " +
      "all-players payload at most once/day per the docs; attribution is required for trending. " +
      "FIRM RULE: never logos/headshots, and never the SOLE basis of a paid feature. The paid " +
      "draft/best-ball value derives from the nflverse graded pool + user-CSV ADP; Sleeper is " +
      "enrichment. The older source-registry marks this commercialUse:false, honored here.",
  },

  {
    source_id: "ffverse-ffopportunity",
    source_name: "ffverse ffopportunity (Expected Fantasy Points data)",
    source_url: "https://github.com/ffverse/ffopportunity",
    terms_url: "https://github.com/ffverse/ffopportunity#readme",
    robots_url: null,
    jurisdiction: "US",
    source_type: "open_dataset",
    status: "approved_open_license",
    automation_allowed: true,
    public_logged_off_allowed: true,
    // TRUE license: the ffopportunity README states the models AND the expected
    // points DATA are CC-BY-SA-4.0 (share-alike) — NOT the plain CC-BY-4.0 of the
    // core nflverse releases. Share-alike is the license class this platform
    // excludes for published derivatives (same grounds as nflverse's FTN charting
    // data): publishing derived outputs could obligate us to share-alike-license
    // our own derived work. So published derivation is NOT cleared:
    // commercial_display stays false; internal analysis / internal derived
    // analytics remain allowed under the open license.
    commercial_display_allowed: false,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text: "Expected points data from ffverse/ffopportunity (CC-BY-SA-4.0)",
    personal_data_risk: "low",
    copyright_expression_risk: "none",
    database_right_risk: "none",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-07-16",
    reviewed_by: "internal",
    evidence_urls: [
      "https://github.com/ffverse/ffopportunity#readme",
      "https://creativecommons.org/licenses/by-sa/4.0/",
    ],
    unlock_condition:
      "Legal review concluding CC-BY-SA-4.0 share-alike does not attach to our derived " +
      "customer-facing outputs, OR written permission / alternate license from ffverse. " +
      "Until then: internal/owner surfaces only; the PUBLISHED graded pool must exclude " +
      "the xFP basis (it defaults to the pure CC-BY-4.0 player-model basis).",
    vendor_contact: "https://github.com/ffverse/ffopportunity/issues",
    notes:
      "ep_weekly_{season}.csv release assets (tag latest-data). Previously mis-filed under " +
      "the nflverse CC-BY-4.0 envelope; corrected 2026-07-16. The SA (share-alike) clause is " +
      "why published derivation is not cleared while the question is open — the same posture " +
      "as FTN charting data. Attribution required in all internal outputs.",
  },

  // ── Approved: licensed API ───────────────────────────────────────────────────
  // Rate-term note (2026-07-16): the adapter honors the once/day term with a 24h
  // live cache PLUS a short negative cache for source-error results (see
  // lib/fantasy/adp-source.ts, FFC_ERROR_CACHE_TTL_MS). Both caches are
  // per-instance (in-process) memory — a serverless fleet can still make up to
  // one call per cold instance per TTL. Acceptable against FFC's soft "don't
  // call frequently" ask; a shared cache is the upgrade path if fleet fan-out grows.
  {
    source_id: "ffc-adp",
    source_name: "Fantasy Football Calculator ADP REST API",
    source_url: "https://fantasyfootballcalculator.com/api/v1/adp",
    terms_url: "https://help.fantasyfootballcalculator.com/article/42-adp-rest-api",
    robots_url: null,
    jurisdiction: "US",
    source_type: "fantasy_platform",
    status: "approved_api",
    automation_allowed: true,
    public_logged_off_allowed: true,
    commercial_display_allowed: true,
    storage_allowed: true,
    derived_analytics_allowed: true,
    model_training_allowed: false,
    attribution_required: true,
    attribution_text: "ADP data via FantasyFootballCalculator.com",
    personal_data_risk: "none",
    copyright_expression_risk: "none",
    database_right_risk: "low",
    technical_controls_detected: false,
    cease_and_desist_received: false,
    reviewed_at: "2026-07-16",
    reviewed_by: "internal",
    evidence_urls: [
      "https://help.fantasyfootballcalculator.com/article/42-adp-rest-api",
    ],
    unlock_condition: null,
    vendor_contact: "https://fantasyfootballcalculator.com/contact",
    notes:
      "Official docs: 'Use of the ADP REST API is free for personal and commercial use.' " +
      "Attribution requested as a link/mention (honored via attribution_text on every " +
      "surface). The data updates ONCE PER DAY — the docs ask integrators not to call " +
      "frequently, so the adapter MUST cache for >= 24h (see lib/fantasy/adp-source.ts). " +
      "No key required. Facts only: aggregated draft-position numbers + bye weeks.",
  },

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
      "Upstream data source unknown. It may relay Sportradar/Stats Perform (secondary liability risk). " +
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
      "Adapter built (lib/data-sources/free-adapters/fpl.ts) and gated. DO NOT ingest until written " +
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
      "Owner-directed evaluation of Jeff Mans' weekly show as its own source. SiriusXM corporate " +
      "licensing is PARKED per owner and is NOT this entry; SiriusXM-distributed content stays under " +
      "siriusxm-streaming. This entry covers ONLY the openly syndicated podcast feed (Podbean host; " +
      "ELITE+ Podcast Network / FantasyGuru). The show's picks and analysis are proprietary " +
      "predictions. Data-rules forbid extracting them as inputs, so the value lane is pundit-claim " +
      "ACCOUNTABILITY (paraphrased claim, pundit, date), which the Airwave source policy already " +
      "allows manually at LOW risk for podcast_rss. Automated capture/transcription stays OFF until " +
      "the questionnaire and license land. Episode metadata (titles, dates) are facts; audio is " +
      "copyrighted expression, hence high expression risk. Contact via fantasyguru.com.",
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
      "Conditions permit our commercial use. The terms page is JS-rendered and was NOT machine-" +
      "verifiable, so it needs a human/legal read. Free tier = 1,000 calls/mo; paid tiers ($1-$30/mo) " +
      "raise the limit. On confirmation: flip status → approved_api, enable automation/storage/derived " +
      "flags, and verify each endpoint's real schema live before building the adapter (no guessed columns).",
    vendor_contact: "https://collegefootballdata.com/key",
    notes:
      "Intended use: the QB college→NFL scheme-transition signal (college passing/scheme FACTS only), " +
      "feeding projection/feature work, never any proprietary ratings or outputs. CFBD is a freemium " +
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
      "create/train/improve ANY AI service. A paid subscription does NOT unlock automation. " +
      "ONLY legal lane without a license: a human listens on their own subscription and manually " +
      "logs short factual claims (pundit, claim, date) into Airwave intake: facts with " +
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
      "RSS feed's episode METADATA may qualify for approved_public_logged_off, facts only). " +
      "Step 3: best path is direct permission from Jeff Mans / the show's outlet, which " +
      "unlocks deeper integration and is likely attainable for an independent show.",
    vendor_contact: null,
    notes:
      "Owner-flagged candidate (POLISH_BACKLOG #6) as the licensable alternative to " +
      "SiriusXM corporate (parked per owner). Episode CONTENT is copyrighted expression: " +
      "the only lane today is the same manual listener log as SiriusXM: a human listens " +
      "to the public show and manually logs short factual claims (pundit, claim, date) " +
      "into Airwave intake. No recordings, no transcripts, no automated capture until " +
      "the unlock condition is met.",
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
