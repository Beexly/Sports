/**
 * Airwave Intelligence Intake — Source Policy System.
 *
 * Each source category is represented as a policy record describing what the
 * source is, who it serves (GSE / GSN / BOTH), what its current operational
 * status is, what rights posture it carries, and what is allowed or forbidden
 * when using it as an Airwave input.
 *
 * HARD RULES (non-negotiable, enforced in code + tests):
 *   1. satellite_radio_context requires a human legal acknowledgement.
 *   2. satellite_radio_context may never archive raw audio.
 *   3. satellite_radio_context may never store public verbatim transcripts.
 *   4. satellite_radio_context may never auto-publish.
 *   5. No source may auto-publish by default.
 *   6. Source pointers (clip refs, file paths, feed URLs) are private fields.
 *   7. Paraphrased claims are the durable public unit — verbatim text is not.
 *   8. Public-source lanes still require operator review before any external
 *      publication.
 */

export type AirwaveSourceId =
  | "public_youtube"
  | "podcast_rss"
  | "beat_report"
  | "official_team_feed"
  | "official_league_feed"
  | "odds_market_context"
  | "operator_transcript_import"
  | "founder_local_listening"
  | "satellite_radio_context"
  | "studio_handoff";

export type AirwaveSourceKind =
  | "public_youtube"
  | "podcast_rss"
  | "beat_report"
  | "official_team_feed"
  | "official_league_feed"
  | "odds_market_context"
  | "operator_transcript_import"
  | "founder_local_listening"
  | "satellite_radio_context"
  | "studio_handoff";

export type IntendedUse = "GSE" | "GSN" | "BOTH";

/**
 * Operational status of a source lane.
 *
 * HELD      — source is identified but gated (legal, config, or policy hold).
 * DESIGNED  — architecture and contracts are defined; no runtime config yet.
 * MANUAL    — usable only through manual operator action (no automation).
 * READY     — configured and reviewed; may be enabled when gates open.
 * ACTIVE    — fully open and running (requires gate + safe source + config).
 */
export type SourceStatus = "HELD" | "DESIGNED" | "MANUAL" | "READY" | "ACTIVE";

export type SourceCost = "FREE" | "OWNED" | "LICENSED" | "MANUAL";

export type RightsStatusDefault =
  | "PUBLIC"
  | "OWNED"
  | "LICENSED"
  | "PERMISSION_REQUIRED"
  | "HELD";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AirwaveSourcePolicy = {
  readonly id: AirwaveSourceId;
  readonly label: string;
  readonly sourceKind: AirwaveSourceKind;
  readonly intendedUse: IntendedUse;
  readonly status: SourceStatus;
  readonly cost: SourceCost;
  readonly rightsStatusDefault: RightsStatusDefault;
  /** Requires a human-signed legal acknowledgement before any use. */
  readonly requiresLegalAck: boolean;
  /** All outputs require human operator review before external exposure. */
  readonly requiresHumanReview: boolean;
  /** Whether the system may capture (record) content from this source. */
  readonly canCapture: boolean;
  /** Whether the system may transcribe captured content. */
  readonly canTranscribe: boolean;
  /** Whether captured audio may be archived long-term. Hard NO for satellite. */
  readonly canStoreRawAudio: false;
  /** Whether full verbatim transcripts may be stored publicly. Hard NO for satellite. */
  readonly canStoreVerbatimTranscript: false;
  /** Whether paraphrased claims derived from this source may be stored. */
  readonly canStoreParaphrase: boolean;
  /** Whether derived outputs may be published publicly after review. */
  readonly canPublishPublicly: boolean;
  /** Whether the system may auto-publish without operator approval. Always false. */
  readonly canAutoPublish: false;
  /** What outputs this source is allowed to produce. */
  readonly allowedOutputs: readonly string[];
  /** What is explicitly forbidden for this source. */
  readonly forbiddenOutputs: readonly string[];
  /** Fields that must remain private (never public). */
  readonly privateFields: readonly string[];
  /** Fields that may be surfaced publicly after review. */
  readonly publicFields: readonly string[];
  /** What an operator must do next for this source to advance. */
  readonly operatorAction: string;
  /** Legal / compliance note for this source. */
  readonly complianceNote: string;
  readonly riskLevel: RiskLevel;
  /** Where the rights/policy posture claim comes from. */
  readonly proofSource: string;
};

export type SourcePolicyGates = {
  readonly airwaveEnabled: boolean;
  readonly siriusxmLegalAck: boolean;
  readonly transcriptImportEnabled: boolean;
  readonly youtubeEnabled: boolean;
  readonly podcastEnabled: boolean;
  readonly beatReportsEnabled: boolean;
  readonly studioHandoffEnabled: boolean;
};

export type SourcePolicySummary = {
  readonly total: number;
  readonly active: number;
  readonly ready: number;
  readonly manual: number;
  readonly designed: number;
  readonly held: number;
  readonly legalHolds: number;
  readonly gseReady: number;
  readonly gsnReady: number;
  readonly forbiddenActions: readonly string[];
};

const AIRWAVE_SOURCE_POLICIES: readonly AirwaveSourcePolicy[] = [
  {
    id: "public_youtube",
    label: "Public YouTube show feed",
    sourceKind: "public_youtube",
    intendedUse: "BOTH",
    status: "DESIGNED",
    cost: "FREE",
    rightsStatusDefault: "PUBLIC",
    requiresLegalAck: false,
    requiresHumanReview: true,
    canCapture: true,
    canTranscribe: true,
    canStoreRawAudio: false,
    canStoreVerbatimTranscript: false,
    canStoreParaphrase: true,
    canPublishPublicly: true,
    canAutoPublish: false,
    allowedOutputs: [
      "paraphrased_claim",
      "entity_tag",
      "gse_signal_candidate",
      "gsn_editorial_note",
      "review_queue_item",
    ],
    forbiddenOutputs: [
      "raw_audio_archive",
      "verbatim_transcript_public",
      "auto_publish",
      "direct_clip_redistribution",
    ],
    privateFields: ["source_pointer", "clip_ref", "feed_url", "video_id"],
    publicFields: ["paraphrased_claim", "sport", "entity", "claim_type", "aired_at_ct", "show"],
    operatorAction:
      "Whitelist a short list of show feed IDs. Run dry-run extraction on a sample episode. Review precision before enabling at scale.",
    complianceNote:
      "Freely published. Respect YouTube ToS and fair-use limits. No re-hosting of video or long quotes. Paraphrase only.",
    riskLevel: "LOW",
    proofSource:
      "YouTube Terms of Service; fair use principles for factual sports commentary extraction.",
  },
  {
    id: "podcast_rss",
    label: "Podcast RSS feed",
    sourceKind: "podcast_rss",
    intendedUse: "BOTH",
    status: "DESIGNED",
    cost: "FREE",
    rightsStatusDefault: "PUBLIC",
    requiresLegalAck: false,
    requiresHumanReview: true,
    canCapture: true,
    canTranscribe: true,
    canStoreRawAudio: false,
    canStoreVerbatimTranscript: false,
    canStoreParaphrase: true,
    canPublishPublicly: true,
    canAutoPublish: false,
    allowedOutputs: [
      "paraphrased_claim",
      "entity_tag",
      "gse_signal_candidate",
      "gsn_segment_idea",
      "review_queue_item",
    ],
    forbiddenOutputs: [
      "raw_audio_archive",
      "verbatim_transcript_public",
      "auto_publish",
      "full_episode_redistribution",
    ],
    privateFields: ["source_pointer", "clip_ref", "rss_url", "episode_guid"],
    publicFields: ["paraphrased_claim", "sport", "entity", "claim_type", "aired_at_ct", "show"],
    operatorAction:
      "Whitelist RSS feeds with clear public distribution rights. Score sample episodes for precision before expanding coverage.",
    complianceNote:
      "Public distribution; persist paraphrased claims and objective metadata only. No full episode re-hosting.",
    riskLevel: "LOW",
    proofSource: "RSS feed public distribution; fair use for factual claims extraction.",
  },
  {
    id: "beat_report",
    label: "Beat reporter mesh",
    sourceKind: "beat_report",
    intendedUse: "BOTH",
    status: "MANUAL",
    cost: "LICENSED",
    rightsStatusDefault: "LICENSED",
    requiresLegalAck: false,
    requiresHumanReview: true,
    canCapture: false,
    canTranscribe: false,
    canStoreRawAudio: false,
    canStoreVerbatimTranscript: false,
    canStoreParaphrase: true,
    canPublishPublicly: true,
    canAutoPublish: false,
    allowedOutputs: [
      "paraphrased_claim",
      "injury_alert",
      "role_change_note",
      "depth_chart_update",
      "gse_evidence_candidate",
      "review_queue_item",
    ],
    forbiddenOutputs: [
      "raw_audio_archive",
      "full_article_reproduction",
      "auto_publish",
      "paywalled_text_republication",
    ],
    privateFields: ["source_pointer", "reporter_name", "outlet_url", "paywall_content"],
    publicFields: ["paraphrased_claim", "sport", "entity", "claim_type", "aired_at_ct"],
    operatorAction:
      "Select a licensed beat source. Map each report type to player/team/market impact. Add citation metadata before staging for review.",
    complianceNote:
      "Cite source/outlet. Summarize facts; do not reproduce full articles or paywalled text.",
    riskLevel: "MEDIUM",
    proofSource: "License agreement or attribution terms from beat source outlet.",
  },
  {
    id: "official_team_feed",
    label: "Official team news feed",
    sourceKind: "official_team_feed",
    intendedUse: "GSE",
    status: "DESIGNED",
    cost: "FREE",
    rightsStatusDefault: "PUBLIC",
    requiresLegalAck: false,
    requiresHumanReview: true,
    canCapture: false,
    canTranscribe: false,
    canStoreRawAudio: false,
    canStoreVerbatimTranscript: false,
    canStoreParaphrase: true,
    canPublishPublicly: true,
    canAutoPublish: false,
    allowedOutputs: [
      "injury_status_note",
      "roster_change_note",
      "practice_status_note",
      "gse_evidence_candidate",
      "review_queue_item",
    ],
    forbiddenOutputs: ["raw_audio_archive", "verbatim_press_release_republication", "auto_publish"],
    privateFields: ["source_pointer", "internal_feed_url"],
    publicFields: ["paraphrased_claim", "sport", "entity", "claim_type", "aired_at_ct"],
    operatorAction:
      "Identify official team social/news sources per league. Ingest as structured event data, not raw text.",
    complianceNote: "Official public communications. Summarize; do not reproduce full press releases.",
    riskLevel: "LOW",
    proofSource: "Official team public communications channels.",
  },
  {
    id: "official_league_feed",
    label: "Official league data feed",
    sourceKind: "official_league_feed",
    intendedUse: "GSE",
    status: "DESIGNED",
    cost: "LICENSED",
    rightsStatusDefault: "LICENSED",
    requiresLegalAck: false,
    requiresHumanReview: false,
    canCapture: false,
    canTranscribe: false,
    canStoreRawAudio: false,
    canStoreVerbatimTranscript: false,
    canStoreParaphrase: true,
    canPublishPublicly: true,
    canAutoPublish: false,
    allowedOutputs: [
      "structured_game_data",
      "injury_status",
      "official_lineup",
      "gse_model_input",
      "review_queue_item",
    ],
    forbiddenOutputs: ["raw_audio_archive", "auto_publish", "data_sublicensing"],
    privateFields: ["api_key", "license_id", "raw_feed_payload"],
    publicFields: ["game_id", "sport", "entity", "status_type", "effective_at"],
    operatorAction:
      "Evaluate nflverse (free, nflfastR/nflreadr) as the canonical NFL data direction. The Odds API covers markets. ESPN public API is a no-key fallback.",
    complianceNote:
      "License terms govern redistribution. nflverse (CC BY-SA 4.0 data) and The Odds API are current approved sources.",
    riskLevel: "LOW",
    proofSource: "nflverse license (CC BY-SA 4.0); The Odds API terms; ESPN public API fair use.",
  },
  {
    id: "odds_market_context",
    label: "Odds / market context feed",
    sourceKind: "odds_market_context",
    intendedUse: "GSE",
    status: "READY",
    cost: "LICENSED",
    rightsStatusDefault: "LICENSED",
    requiresLegalAck: false,
    requiresHumanReview: false,
    canCapture: false,
    canTranscribe: false,
    canStoreRawAudio: false,
    canStoreVerbatimTranscript: false,
    canStoreParaphrase: true,
    canPublishPublicly: true,
    canAutoPublish: false,
    allowedOutputs: [
      "line_snapshot",
      "market_movement_note",
      "consensus_signal",
      "gse_model_input",
      "gsn_market_brief",
    ],
    forbiddenOutputs: ["raw_audio_archive", "auto_publish", "data_sublicensing"],
    privateFields: ["api_key", "raw_odds_payload"],
    publicFields: ["line", "movement_direction", "sport", "game_id", "as_of"],
    operatorAction:
      "The Odds API is currently the primary odds source. Add ESP public API as a resilience fallback to prevent silent staleness during outages.",
    complianceNote:
      "The Odds API license terms. Do not sublicense raw odds data. Derive signals; publish summaries.",
    riskLevel: "LOW",
    proofSource: "The Odds API subscription terms.",
  },
  {
    id: "operator_transcript_import",
    label: "Operator-imported transcript (CSV/TSV)",
    sourceKind: "operator_transcript_import",
    intendedUse: "BOTH",
    status: "MANUAL",
    cost: "MANUAL",
    rightsStatusDefault: "OWNED",
    requiresLegalAck: false,
    requiresHumanReview: true,
    canCapture: false,
    canTranscribe: false,
    canStoreRawAudio: false,
    canStoreVerbatimTranscript: false,
    canStoreParaphrase: true,
    canPublishPublicly: true,
    canAutoPublish: false,
    allowedOutputs: [
      "paraphrased_claim",
      "entity_tag",
      "gse_signal_candidate",
      "gsn_editorial_note",
      "review_queue_item",
    ],
    forbiddenOutputs: [
      "raw_audio_archive",
      "verbatim_transcript_public",
      "auto_publish",
      "full_quote_publication",
    ],
    privateFields: ["source_pointer", "file_path", "raw_row_text"],
    publicFields: ["paraphrased_claim", "sport", "entity", "claim_type", "aired_at_ct", "show"],
    operatorAction:
      "Use the 12-column spreadsheet contract (see control-plane). Set rights_status and operator_status on each row. Stage for review via the cockpit.",
    complianceNote:
      "Operator owns this data. Paraphrase only; never import or publish verbatim quotes. Source pointer stays private.",
    riskLevel: "LOW",
    proofSource: "Operator ownership; internal import contract (AIRWAVE_SPREADSHEET_CONTRACT).",
  },
  {
    id: "founder_local_listening",
    label: "Founder local listening (manual notes)",
    sourceKind: "founder_local_listening",
    intendedUse: "BOTH",
    status: "DESIGNED",
    cost: "OWNED",
    rightsStatusDefault: "OWNED",
    requiresLegalAck: true,
    requiresHumanReview: true,
    canCapture: false,
    canTranscribe: false,
    canStoreRawAudio: false,
    canStoreVerbatimTranscript: false,
    canStoreParaphrase: true,
    canPublishPublicly: true,
    canAutoPublish: false,
    allowedOutputs: [
      "manual_paraphrased_note",
      "show_context_note",
      "claim_candidate",
      "review_queue_item",
    ],
    forbiddenOutputs: [
      "raw_audio_archive",
      "verbatim_quote_publication",
      "auto_publish",
      "scraper_activation",
      "credential_automation",
    ],
    privateFields: ["source_pointer", "personal_notes", "show_segment_time"],
    publicFields: ["paraphrased_claim", "sport", "entity", "claim_type", "aired_at_ct", "show"],
    operatorAction:
      "Founder listens live on a personally-owned subscription. Notes claims manually. Imports via CSV/TSV using the spreadsheet contract. Legal acknowledgement required before notes feed public-facing outputs.",
    complianceNote:
      "Founder-owned listening of a subscription service. No scraping, no credential sharing, no DRM bypass, no automated recording. Notes are personal observation. Paraphrase before any publication.",
    riskLevel: "MEDIUM",
    proofSource:
      "Personal subscription ownership; Airwave legal gate (AIRWAVE_SIRIUSXM_LEGAL_ACK required).",
  },
  {
    id: "satellite_radio_context",
    label: "Satellite radio context (SiriusXM-class)",
    sourceKind: "satellite_radio_context",
    intendedUse: "BOTH",
    status: "HELD",
    cost: "LICENSED",
    rightsStatusDefault: "PERMISSION_REQUIRED",
    requiresLegalAck: true,
    requiresHumanReview: true,
    canCapture: false,
    canTranscribe: false,
    canStoreRawAudio: false,
    canStoreVerbatimTranscript: false,
    canStoreParaphrase: true,
    canPublishPublicly: false,
    canAutoPublish: false,
    allowedOutputs: [
      "paraphrased_claim_after_legal_review",
      "show_context_note_private",
      "review_queue_item_internal",
    ],
    forbiddenOutputs: [
      "raw_audio_archive",
      "verbatim_transcript_public",
      "auto_publish",
      "scraper_activation",
      "credential_automation",
      "drm_bypass",
      "stream_ripping",
      "account_automation",
      "any_output_before_legal_ack",
    ],
    privateFields: [
      "source_pointer",
      "clip_ref",
      "account_credentials",
      "stream_url",
      "channel_id",
      "segment_audio",
    ],
    publicFields: [],
    operatorAction:
      "This lane is HELD. Do not automate satellite-radio capture. Legal acknowledgement (AIRWAVE_SIRIUSXM_LEGAL_ACK) must be explicitly set by a human. Manual transcript import via the spreadsheet contract is the safe first step.",
    complianceNote:
      "SiriusXM-class satellite radio. Terms of service prohibit recording, redistribution, and automation. No scraping. No DRM bypass. No stream ripping. No account automation. Founder personal subscription for live listening only. Paraphrase in notes; import via CSV.",
    riskLevel: "HIGH",
    proofSource:
      "SiriusXM Subscriber Agreement; Airwave legal gate (AIRWAVE_SIRIUSXM_LEGAL_ACK); docs/ai/airwave/SIRIUSXM_CHANNEL_87_LISTENER_PROTOCOL.md.",
  },
  {
    id: "studio_handoff",
    label: "Galaxy Studio handoff",
    sourceKind: "studio_handoff",
    intendedUse: "GSN",
    status: "MANUAL",
    cost: "OWNED",
    rightsStatusDefault: "OWNED",
    requiresLegalAck: false,
    requiresHumanReview: true,
    canCapture: false,
    canTranscribe: false,
    canStoreRawAudio: false,
    canStoreVerbatimTranscript: false,
    canStoreParaphrase: true,
    canPublishPublicly: false,
    canAutoPublish: false,
    allowedOutputs: [
      "draft_script",
      "newsletter_brief",
      "segment_idea",
      "social_clip_brief",
      "editorial_note",
    ],
    forbiddenOutputs: [
      "auto_publish",
      "external_channel_post",
      "raw_audio_archive",
      "verbatim_quote_publication",
    ],
    privateFields: ["internal_brief", "source_pointer", "draft_content"],
    publicFields: [],
    operatorAction:
      "Manual export only. Studio prepares assets from approved claims. No automatic publishing to external channels.",
    complianceNote:
      "All Galaxy Studio outputs are internal until operator manually approves for publication. No external publishing integrations.",
    riskLevel: "LOW",
    proofSource: "Internal ownership; no external platform integration by design.",
  },
];

/** Returns all source policies. */
export function getAirwaveSourcePolicies(): readonly AirwaveSourcePolicy[] {
  return AIRWAVE_SOURCE_POLICIES;
}

/** Returns the policy for a specific source ID. */
export function getSourcePolicy(id: AirwaveSourceId): AirwaveSourcePolicy | undefined {
  return AIRWAVE_SOURCE_POLICIES.find((policy) => policy.id === id);
}

/**
 * Pure gate check: can this source advance to ACTIVE status?
 * Returns an object describing the decision and all blocking reasons.
 */
export function canSourceBecomeActive(
  policy: AirwaveSourcePolicy,
  gates: SourcePolicyGates,
): { allowed: boolean; blockedReasons: string[] } {
  const reasons: string[] = [];

  if (!gates.airwaveEnabled) {
    reasons.push("AIRWAVE_ENABLED is not set: master switch is off.");
  }

  if (policy.requiresLegalAck && !gates.siriusxmLegalAck) {
    reasons.push(
      `${policy.label} requires a human legal acknowledgement (AIRWAVE_SIRIUSXM_LEGAL_ACK).`,
    );
  }

  if (policy.status === "HELD") {
    reasons.push(`Source is explicitly HELD: ${policy.operatorAction}`);
  }

  switch (policy.id) {
    case "public_youtube":
      if (!gates.youtubeEnabled) {
        reasons.push("AIRWAVE_YOUTUBE_FEEDS_ENABLED is not set.");
      }
      break;
    case "podcast_rss":
      if (!gates.podcastEnabled) {
        reasons.push("AIRWAVE_PODCAST_RSS_ENABLED is not set.");
      }
      break;
    case "beat_report":
      if (!gates.beatReportsEnabled) {
        reasons.push("AIRWAVE_BEAT_REPORTS_ENABLED is not set.");
      }
      break;
    case "operator_transcript_import":
      if (!gates.transcriptImportEnabled) {
        reasons.push("AIRWAVE_TRANSCRIPT_IMPORT_ENABLED is not set.");
      }
      break;
    case "studio_handoff":
      if (!gates.studioHandoffEnabled) {
        reasons.push("AIRWAVE_STUDIO_HANDOFF_ENABLED is not set.");
      }
      break;
    case "satellite_radio_context":
      if (!gates.siriusxmLegalAck) {
        reasons.push("Satellite radio requires explicit legal acknowledgement. Lane is permanently HELD until set.");
      }
      break;
    default:
      break;
  }

  return { allowed: reasons.length === 0, blockedReasons: reasons };
}

/**
 * Returns a summary of source policy readiness across all policies given the
 * current set of runtime gates.
 */
export function summarizeSourcePolicyReadiness(
  policies: readonly AirwaveSourcePolicy[],
  gates: SourcePolicyGates,
): SourcePolicySummary {
  const counts = {
    total: policies.length,
    active: 0,
    ready: 0,
    manual: 0,
    designed: 0,
    held: 0,
    legalHolds: 0,
    gseReady: 0,
    gsnReady: 0,
  };

  for (const policy of policies) {
    const gateCheck = canSourceBecomeActive(policy, gates);
    if (policy.status === "ACTIVE") counts.active += 1;
    if (policy.status === "READY") counts.ready += 1;
    if (policy.status === "MANUAL") counts.manual += 1;
    if (policy.status === "DESIGNED") counts.designed += 1;
    if (policy.status === "HELD") counts.held += 1;
    if (policy.requiresLegalAck && !gates.siriusxmLegalAck) counts.legalHolds += 1;
    if (
      gateCheck.allowed &&
      (policy.intendedUse === "GSE" || policy.intendedUse === "BOTH")
    ) {
      counts.gseReady += 1;
    }
    if (
      gateCheck.allowed &&
      (policy.intendedUse === "GSN" || policy.intendedUse === "BOTH")
    ) {
      counts.gsnReady += 1;
    }
  }

  const forbiddenActions: string[] = [
    "raw_audio_archive (all sources)",
    "verbatim_transcript_public (all sources)",
    "auto_publish (all sources)",
    "satellite_radio_scraping",
    "credential_automation",
    "drm_bypass",
    "stream_ripping",
    "account_automation",
    "any_satellite_output_before_legal_ack",
    "source_pointer_in_public_output",
  ];

  return { ...counts, forbiddenActions };
}
