/**
 * Airwave Intelligence Intake — GSE / GSN Output Map.
 *
 * Maps claim candidates to typed GSE (sports intelligence) and GSN (editorial/
 * media content) outputs. Every output type carries:
 *   - what audience it serves
 *   - what review and rights gating is required
 *   - whether the source pointer stays private
 *   - what the operator must do next
 *   - a caveat where relevant
 *
 * RULES:
 *   1. No output goes to PUBLIC_AFTER_REVIEW without operator_status=APPROVED.
 *   2. UNFALSIFIABLE claims cannot produce pick_evidence_candidate for GSE.
 *   3. Source pointer is always private in any output.
 *   4. All GSE and GSN outputs default to INTERNAL_ONLY or REVIEW_QUEUE.
 *   5. PUBLIC_AFTER_REVIEW requires both APPROVED status and valid rights.
 */

import type {
  ClaimCandidate,
  ClaimCandidateClaimType,
} from "./claim-extraction-contract";

/** Audience tier for an output item. */
export type OutputAudience =
  | "INTERNAL_ONLY"
  | "REVIEW_QUEUE"
  | "PUBLIC_AFTER_REVIEW";

/** GSE output types — map to sports intelligence, picks, betting, DFS. */
export type GseOutputType =
  | "pick_evidence_candidate"
  | "player_usage_alert"
  | "injury_readiness_alert"
  | "dfs_value_signal"
  | "market_narrative_note"
  | "confidence_caveat"
  | "risk_flag"
  | "no_bet_reason_candidate"
  | "watchlist_item"
  | "model_context_note";

/** GSN output types — map to editorial, content, media briefing. */
export type GsnOutputType =
  | "daily_show_brief"
  | "podcast_segment_idea"
  | "article_story_lead"
  | "social_clip_idea"
  | "guest_topic_tracker"
  | "hot_take_ledger_candidate"
  | "editorial_research_note"
  | "newsletter_blurb"
  | "segment_map_item"
  | "host_claim_receipt";

export type OutputRule<T extends GseOutputType | GsnOutputType> = {
  readonly outputType: T;
  readonly label: string;
  readonly allowedAudience: OutputAudience;
  readonly requiredReviewStatus: readonly ClaimCandidate["operator_status"][];
  readonly requiredRightsStatus: readonly ClaimCandidate["rights_status"][];
  readonly sourcePointerPrivate: true;
  readonly allowedForGSE: boolean;
  readonly allowedForGSN: boolean;
  readonly nextOperatorAction: string;
  readonly caveat: string;
};

export type ClaimOutputMapping = {
  readonly claimId: string;
  readonly claimType: ClaimCandidateClaimType;
  readonly gseOutputs: readonly OutputRule<GseOutputType>[];
  readonly gsnOutputs: readonly OutputRule<GsnOutputType>[];
  readonly publicSafe: boolean;
  readonly reviewRequired: boolean;
  readonly blockedReasons: readonly string[];
};

export type OutputReadinessSummary = {
  readonly totalCandidates: number;
  readonly gseReady: number;
  readonly gsnReady: number;
  readonly publicSafe: number;
  readonly reviewQueue: number;
  readonly internalOnly: number;
  readonly blocked: number;
  readonly forbiddenActions: readonly string[];
};

/** GSE output rules per claim type. */
const GSE_OUTPUT_RULES: Record<ClaimCandidateClaimType, readonly OutputRule<GseOutputType>[]> = {
  injury_read: [
    {
      outputType: "injury_readiness_alert",
      label: "Injury readiness alert",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED", "SETTLED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Verify injury claim against official source. Approve for GSE model input.",
      caveat: "Cross-reference with official injury report before using as pick evidence.",
    },
    {
      outputType: "pick_evidence_candidate",
      label: "Pick evidence candidate (injury-based)",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Confirm with official source before approving as pick evidence.",
      caveat: "On-air injury reads require corroboration from official team or beat source.",
    },
    {
      outputType: "watchlist_item",
      label: "Watchlist item (injury flag)",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["REVIEW", "APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED", "PERMISSION_REQUIRED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Add to watch list. Monitor for official confirmation.",
      caveat: "Internal only until corroborated.",
    },
  ],
  availability_read: [
    {
      outputType: "injury_readiness_alert",
      label: "Availability / readiness alert",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED", "SETTLED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Confirm availability with official team source.",
      caveat: "Availability reads from broadcast may lag official game-time decisions.",
    },
    {
      outputType: "pick_evidence_candidate",
      label: "Pick evidence (availability)",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Cross-reference with injury report. Approve for evidence.",
      caveat: "Must be corroborated before GSE model use.",
    },
  ],
  role_change: [
    {
      outputType: "player_usage_alert",
      label: "Player role / usage alert",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Verify role change with depth chart or official report.",
      caveat: "Broadcast role claims should be confirmed before affecting pick model.",
    },
    {
      outputType: "watchlist_item",
      label: "Watchlist: role change candidate",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["REVIEW", "APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED", "PERMISSION_REQUIRED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Monitor for official confirmation before promotion.",
      caveat: "Internal only until depth chart verified.",
    },
  ],
  ranking_tier: [
    {
      outputType: "model_context_note",
      label: "Model context note (ranking)",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Add to model context as a soft signal. Do not use as sole evidence.",
      caveat: "Broadcast tier claims are editorial; treat as a soft context signal only.",
    },
  ],
  dfs_value: [
    {
      outputType: "dfs_value_signal",
      label: "DFS value signal",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Verify DFS value claim against current salary and projections.",
      caveat: "DFS value reads can be stale by game time. Timestamp and re-verify.",
    },
  ],
  waiver_note: [
    {
      outputType: "player_usage_alert",
      label: "Waiver wire / add-drop note",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Cross-reference with official depth chart and waiver wire data.",
      caveat: "Broadcast waiver reads may reflect pundit opinion, not actual add priority.",
    },
  ],
  matchup_note: [
    {
      outputType: "model_context_note",
      label: "Matchup context note",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Add as context signal for the relevant game node.",
      caveat: "Matchup notes are editorial; weight accordingly.",
    },
  ],
  depth_chart_note: [
    {
      outputType: "player_usage_alert",
      label: "Depth chart update",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Verify against official depth chart source before use.",
      caveat: "Broadcast depth chart reads should be corroborated with official source.",
    },
  ],
  usage_trend: [
    {
      outputType: "player_usage_alert",
      label: "Usage trend signal",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Cross-reference with snap count / target share data.",
      caveat: "Broadcast usage trends should be backed by hard usage data.",
    },
  ],
  market_signal: [
    {
      outputType: "market_narrative_note",
      label: "Market narrative note",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Pair with The Odds API line data. Do not use standalone.",
      caveat: "Broadcast market signals are editorial; pair with hard odds data.",
    },
    {
      outputType: "model_context_note",
      label: "Market context note (GSE model)",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["REVIEW", "APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Add to model context layer for the relevant game.",
      caveat: "Soft signal only.",
    },
  ],
  odds_context: [
    {
      outputType: "market_narrative_note",
      label: "Odds context note",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Pair with live odds from The Odds API.",
      caveat: "Broadcast odds context must be time-stamped; lines move.",
    },
  ],
  coaching_note: [
    {
      outputType: "model_context_note",
      label: "Coaching/scheme context note",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Add as soft context; do not use as sole evidence.",
      caveat: "Coaching notes are editorial.",
    },
  ],
  weather_context: [
    {
      outputType: "risk_flag",
      label: "Weather risk flag",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Cross-reference with official weather data for game site.",
      caveat: "Broadcast weather reads are editorial; verify with official forecast.",
    },
    {
      outputType: "no_bet_reason_candidate",
      label: "No-bet reason candidate (weather)",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: true,
      allowedForGSN: false,
      nextOperatorAction: "Verify with official weather data before recording as no-bet reason.",
      caveat: "Internal only until corroborated.",
    },
  ],
  unfalsifiable_hot_take: [
    {
      outputType: "confidence_caveat",
      label: "Confidence caveat (unfalsifiable take)",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["REVIEW", "APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED", "PERMISSION_REQUIRED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction:
        "Record in hot-take ledger. Cannot become pick evidence without review.",
      caveat:
        "UNFALSIFIABLE: this claim cannot become GSE pick evidence. Route to GSN hot-take ledger only.",
    },
  ],
  narrative_only: [
    {
      outputType: "model_context_note",
      label: "Narrative context note (internal)",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Use for GSN editorial context only. Not GSE evidence.",
      caveat: "Narrative-only claims are not actionable for GSE pick models.",
    },
  ],
};

/** GSN output rules per claim type. */
const GSN_OUTPUT_RULES: Record<ClaimCandidateClaimType, readonly OutputRule<GsnOutputType>[]> = {
  injury_read: [
    {
      outputType: "daily_show_brief",
      label: "Daily show brief: injury update",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Verify with official source. Add to daily brief after approval.",
      caveat: "Paraphrase only. Do not attribute verbatim quote to source.",
    },
    {
      outputType: "host_claim_receipt",
      label: "Host claim receipt (injury)",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Tag speaker and show. Submit to host claim receipt ledger.",
      caveat: "Accountability ledger use only. No verbatim quote.",
    },
  ],
  availability_read: [
    {
      outputType: "daily_show_brief",
      label: "Daily show brief: availability note",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Add to daily brief after review and official corroboration.",
      caveat: "Verify availability with official source before publishing.",
    },
  ],
  role_change: [
    {
      outputType: "article_story_lead",
      label: "Article story lead: role change",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Assign to editorial. Cross-reference before publishing.",
      caveat: "Verify role change with official source.",
    },
    {
      outputType: "podcast_segment_idea",
      label: "Podcast segment: role change analysis",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["REVIEW", "APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Pitch to podcast team for next episode.",
      caveat: "Paraphrase only in script.",
    },
  ],
  ranking_tier: [
    {
      outputType: "newsletter_blurb",
      label: "Newsletter blurb: ranking tier",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Write newsletter blurb based on paraphrased claim. Review before send.",
      caveat: "GSN editorial use. Paraphrase; do not quote broadcast.",
    },
  ],
  dfs_value: [
    {
      outputType: "daily_show_brief",
      label: "Daily brief: DFS value note",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Include in daily brief if backed by data.",
      caveat: "DFS value reads can be stale; timestamp matters.",
    },
    {
      outputType: "podcast_segment_idea",
      label: "Podcast segment: DFS value breakdown",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["REVIEW", "APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Pitch segment with corroborated data.",
      caveat: "Verify value claim before scripting.",
    },
  ],
  waiver_note: [
    {
      outputType: "newsletter_blurb",
      label: "Newsletter: waiver wire note",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Include in waiver wire section after corroboration.",
      caveat: "Verify add priority with official waiver wire data.",
    },
  ],
  matchup_note: [
    {
      outputType: "podcast_segment_idea",
      label: "Podcast segment: matchup analysis",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["REVIEW", "APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Develop matchup analysis segment with data backing.",
      caveat: "Editorial synthesis. Paraphrase broadcast input; add data.",
    },
    {
      outputType: "segment_map_item",
      label: "Segment map item: matchup",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["REVIEW"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED", "PERMISSION_REQUIRED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Map to show segment planning board.",
      caveat: "Internal segment planning only.",
    },
  ],
  depth_chart_note: [
    {
      outputType: "daily_show_brief",
      label: "Daily brief: depth chart update",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Verify with official depth chart. Include in brief.",
      caveat: "Official corroboration required before publishing.",
    },
  ],
  usage_trend: [
    {
      outputType: "article_story_lead",
      label: "Article lead: usage trend story",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Assign story to editorial. Back with snap/target data.",
      caveat: "Back usage trends with hard data in article.",
    },
  ],
  market_signal: [
    {
      outputType: "newsletter_blurb",
      label: "Newsletter: market signal brief",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Pair with line movement data. Include in market section.",
      caveat: "Pair with hard odds data. Broadcast signals are editorial.",
    },
    {
      outputType: "guest_topic_tracker",
      label: "Guest topic tracker: market narrative",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["REVIEW"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED", "PERMISSION_REQUIRED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Add to guest topic backlog for market-focused episodes.",
      caveat: "Internal planning use only.",
    },
  ],
  odds_context: [
    {
      outputType: "newsletter_blurb",
      label: "Newsletter: odds context note",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Verify with current line. Include with timestamp.",
      caveat: "Timestamp required. Lines move.",
    },
  ],
  coaching_note: [
    {
      outputType: "editorial_research_note",
      label: "Editorial research note: coaching",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["REVIEW", "APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "File in editorial research. May inform future segment.",
      caveat: "Coaching notes are editorial; soft context signal.",
    },
  ],
  weather_context: [
    {
      outputType: "social_clip_idea",
      label: "Social clip idea: weather story",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Pitch social weather story with official forecast.",
      caveat: "Verify with official forecast before posting.",
    },
  ],
  unfalsifiable_hot_take: [
    {
      outputType: "hot_take_ledger_candidate",
      label: "Hot take ledger candidate",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["REVIEW", "APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction:
        "Add to the hot-take ledger. Tag as unfalsifiable. Cannot become pick evidence.",
      caveat:
        "UNFALSIFIABLE claim. Cannot produce pick evidence for GSE. Hot-take ledger only.",
    },
    {
      outputType: "podcast_segment_idea",
      label: "Podcast segment: hot take accountability",
      allowedAudience: "REVIEW_QUEUE",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Develop 'take accountability' segment angle.",
      caveat:
        "Paraphrase only. Frame around accountability, not the original source.",
    },
  ],
  narrative_only: [
    {
      outputType: "editorial_research_note",
      label: "Editorial research note: narrative",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["APPROVED"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "File in editorial research context. GSN use only.",
      caveat: "Narrative-only. No GSE use.",
    },
    {
      outputType: "guest_topic_tracker",
      label: "Guest topic: narrative storyline",
      allowedAudience: "INTERNAL_ONLY",
      requiredReviewStatus: ["REVIEW"],
      requiredRightsStatus: ["OWNED", "PUBLIC", "LICENSED", "PERMISSION_REQUIRED"],
      sourcePointerPrivate: true,
      allowedForGSE: false,
      allowedForGSN: true,
      nextOperatorAction: "Add narrative thread to guest topic backlog.",
      caveat: "Internal only.",
    },
  ],
};

/** Map a claim candidate to its applicable GSE output rules. */
export function mapClaimToGseOutputs(
  candidate: ClaimCandidate,
): readonly OutputRule<GseOutputType>[] {
  const rules = GSE_OUTPUT_RULES[candidate.claim_type] ?? [];
  return rules.filter((rule) => {
    const statusOk = rule.requiredReviewStatus.includes(candidate.operator_status);
    const rightsOk = rule.requiredRightsStatus.includes(candidate.rights_status);
    const notForbiddenUnfalsifiable =
      !(candidate.claim_type === "unfalsifiable_hot_take" && rule.outputType === "pick_evidence_candidate");
    return statusOk && rightsOk && notForbiddenUnfalsifiable;
  });
}

/** Map a claim candidate to its applicable GSN output rules. */
export function mapClaimToGsnOutputs(
  candidate: ClaimCandidate,
): readonly OutputRule<GsnOutputType>[] {
  const rules = GSN_OUTPUT_RULES[candidate.claim_type] ?? [];
  return rules.filter((rule) => {
    const statusOk = rule.requiredReviewStatus.includes(candidate.operator_status);
    const rightsOk = rule.requiredRightsStatus.includes(candidate.rights_status);
    return statusOk && rightsOk;
  });
}

/** Map a claim candidate to all applicable GSE and GSN outputs. */
export function mapClaimToAllOutputs(candidate: ClaimCandidate): ClaimOutputMapping {
  const gseOutputs = mapClaimToGseOutputs(candidate);
  const gsnOutputs = mapClaimToGsnOutputs(candidate);

  const blockedReasons: string[] = [];
  if (!candidate.public_safe) {
    blockedReasons.push("public_safe=false: claim is not cleared for public output.");
  }
  if (candidate.operator_status === "DRAFT") {
    blockedReasons.push("operator_status=DRAFT: requires operator review before output.");
  }
  if (candidate.rights_status === "HELD") {
    blockedReasons.push("rights_status=HELD: rights are held; no output permitted.");
  }
  if (candidate.rights_status === "PERMISSION_REQUIRED") {
    blockedReasons.push(
      "rights_status=PERMISSION_REQUIRED: explicit permission needed before output.",
    );
  }

  return {
    claimId: candidate.id,
    claimType: candidate.claim_type,
    gseOutputs,
    gsnOutputs,
    publicSafe: candidate.public_safe,
    reviewRequired: !candidate.public_safe || candidate.operator_status !== "APPROVED",
    blockedReasons,
  };
}

/** Summarize output readiness across a set of claim candidates. */
export function summarizeOutputReadiness(
  candidates: readonly ClaimCandidate[],
): OutputReadinessSummary {
  let gseReady = 0;
  let gsnReady = 0;
  let publicSafe = 0;
  let reviewQueue = 0;
  let internalOnly = 0;
  let blocked = 0;

  for (const candidate of candidates) {
    const mapping = mapClaimToAllOutputs(candidate);
    const hasGse = mapping.gseOutputs.length > 0;
    const hasGsn = mapping.gsnOutputs.length > 0;

    if (mapping.blockedReasons.length > 0) {
      blocked += 1;
    } else {
      if (hasGse) gseReady += 1;
      if (hasGsn) gsnReady += 1;
    }

    if (candidate.public_safe) publicSafe += 1;

    const allOutputs = [
      ...mapping.gseOutputs,
      ...mapping.gsnOutputs,
    ] as OutputRule<GseOutputType | GsnOutputType>[];

    if (allOutputs.some((o) => o.allowedAudience === "REVIEW_QUEUE")) {
      reviewQueue += 1;
    } else if (allOutputs.some((o) => o.allowedAudience === "INTERNAL_ONLY")) {
      internalOnly += 1;
    }
  }

  return {
    totalCandidates: candidates.length,
    gseReady,
    gsnReady,
    publicSafe,
    reviewQueue,
    internalOnly,
    blocked,
    forbiddenActions: [
      "pick_evidence_from_unfalsifiable_claim",
      "auto_publish_any_output",
      "source_pointer_in_public_output",
      "verbatim_quote_in_output",
      "public_output_without_approval",
    ],
  };
}
