/**
 * Airwave Intelligence Intake — Intake Plan Contract.
 *
 * Describes what intake modes exist, what gates govern each, and builds a
 * complete intake plan for the current environment. This is a pure, read-only
 * planning module — it inspects gates and returns a plan; it does NOT capture,
 * import, transcribe, or publish anything.
 *
 * RULES:
 *   1. Default mode is OFF / HELD.
 *   2. LOCAL_LISTENER and SATELLITE modes require legal acknowledgement.
 *   3. MANUAL_IMPORT can be READY if transcript import is configured and reviewed.
 *   4. ACTIVE requires explicit gate + safe source + configured contract.
 *   5. Raw audio archive is forbidden in all modes.
 *   6. Public verbatim transcripts are forbidden in all modes.
 *   7. Operator review is required before any public output.
 */

import type { SourcePolicyGates } from "./source-policy";
import type { ShowBlock } from "./channel-87-schedule";

export type IntakeMode =
  | "OFF"
  | "DRY_RUN"
  | "MANUAL_IMPORT_READY"
  | "MANUAL_IMPORT_HELD"
  | "LOCAL_LISTENER_DESIGNED"
  | "LOCAL_LISTENER_HELD"
  | "LOCAL_LISTENER_READY"
  | "ACTIVE";

export type IntakeLaneState = {
  readonly laneId: string;
  readonly label: string;
  readonly mode: IntakeMode;
  readonly gseOutputReady: boolean;
  readonly gsnOutputReady: boolean;
  readonly blockedReasons: readonly string[];
  readonly nextOperatorAction: string;
};

export type GseOutputReadiness = {
  readonly pickEvidenceCandidates: boolean;
  readonly injuryAlerts: boolean;
  readonly marketSignals: boolean;
  readonly usageAlerts: boolean;
  readonly modelContextNotes: boolean;
  readonly summary: string;
};

export type GsnOutputReadiness = {
  readonly showBriefs: boolean;
  readonly segmentIdeas: boolean;
  readonly editorialNotes: boolean;
  readonly hotTakeLedger: boolean;
  readonly newsletterBlurbs: boolean;
  readonly summary: string;
};

export type AirwaveIntakePlan = {
  readonly generatedAt: string;
  readonly currentWindowOpen: boolean;
  readonly channel87: {
    readonly laneStatus: IntakeMode;
    readonly windowStartHour: number;
    readonly windowEndHour: number;
    readonly timezone: string;
    readonly requiresLegalAck: boolean;
    readonly legalAckGranted: boolean;
    readonly nextOperatorAction: string;
  };
  readonly sourcePolicySummary: {
    readonly totalSources: number;
    readonly readySources: number;
    readonly heldSources: number;
    readonly legalHolds: number;
  };
  readonly gates: {
    readonly masterEnabled: boolean;
    readonly siriusxmLegalAck: boolean;
    readonly transcriptImportEnabled: boolean;
    readonly youtubeEnabled: boolean;
    readonly podcastEnabled: boolean;
    readonly beatReportsEnabled: boolean;
    readonly studioHandoffEnabled: boolean;
  };
  readonly lanes: readonly IntakeLaneState[];
  readonly allowedActions: readonly string[];
  readonly blockedReasons: readonly string[];
  readonly nextOperatorActions: readonly string[];
  readonly gseOutputReadiness: GseOutputReadiness;
  readonly gsnOutputReadiness: GsnOutputReadiness;
  readonly privateFields: readonly string[];
  readonly forbiddenActions: readonly string[];
  readonly dryRunPlan: {
    readonly canDryRun: boolean;
    readonly dryRunDescription: string;
    readonly whatWouldCapture: readonly string[];
    readonly whatIsHeld: readonly string[];
  };
  readonly legalHoldSummary: {
    readonly laneCount: number;
    readonly heldLanes: readonly string[];
    readonly unlockRequirements: readonly string[];
  };
  readonly policy: {
    readonly canWriteDatabase: false;
    readonly canArchiveRawAudio: false;
    readonly canStoreVerbatimTranscript: false;
    readonly canAutoPublish: false;
    readonly canCaptureWithoutGate: false;
  };
};

function getCurrentHourUtc(now: Date): number {
  return now.getUTCHours();
}

/** Returns true when the UTC hour falls within 05:00-23:00 CT (UTC-5/6 offset handled by caller). */
function isWindowOpen(now: Date): boolean {
  const hourCt = getCurrentHourUtc(now);
  // Approximate: 05:00–23:00 CT = 10:00–04:00 UTC (CDT) / 11:00–05:00 UTC (CST)
  // For gate purposes: window is open if UTC hour is 10-23 or 0-4
  // Simplified: use 05:00-23:00 range as the 18-hour window
  return hourCt >= 10 && hourCt <= 23 || hourCt <= 4;
}

function buildGseReadiness(gates: SourcePolicyGates): GseOutputReadiness {
  const anyReady =
    gates.airwaveEnabled &&
    (gates.transcriptImportEnabled || gates.youtubeEnabled || gates.podcastEnabled || gates.beatReportsEnabled);

  return {
    pickEvidenceCandidates: anyReady,
    injuryAlerts: gates.beatReportsEnabled && gates.airwaveEnabled,
    marketSignals: gates.airwaveEnabled,
    usageAlerts: anyReady,
    modelContextNotes: anyReady,
    summary: anyReady
      ? "At least one intake lane is configured. GSE signal candidates can enter the review queue."
      : "No intake lane is active. GSE outputs are held until at least one source is configured and enabled.",
  };
}

function buildGsnReadiness(gates: SourcePolicyGates): GsnOutputReadiness {
  const anyReady =
    gates.airwaveEnabled &&
    (gates.transcriptImportEnabled || gates.youtubeEnabled || gates.podcastEnabled);

  return {
    showBriefs: gates.studioHandoffEnabled && gates.airwaveEnabled,
    segmentIdeas: anyReady,
    editorialNotes: anyReady,
    hotTakeLedger: anyReady,
    newsletterBlurbs: gates.studioHandoffEnabled && gates.airwaveEnabled,
    summary: anyReady
      ? "At least one intake lane is configured. GSN editorial candidates can enter the review queue."
      : "No intake lane is active. GSN outputs are held until at least one source is configured and enabled.",
  };
}

function buildLaneState(args: {
  laneId: string;
  label: string;
  gates: SourcePolicyGates;
  enabled: boolean;
  configured: boolean;
  requiresLegalAck: boolean;
  gseOutputReady: boolean;
  gsnOutputReady: boolean;
  nextOperatorAction: string;
}): IntakeLaneState {
  const reasons: string[] = [];

  if (!args.gates.airwaveEnabled) {
    reasons.push("AIRWAVE_ENABLED is off — master switch holds all lanes.");
  }
  if (!args.configured) {
    reasons.push("Lane is not configured. No config keys are set.");
  }
  if (args.requiresLegalAck && !args.gates.siriusxmLegalAck) {
    reasons.push("Legal acknowledgement (AIRWAVE_SIRIUSXM_LEGAL_ACK) is required.");
  }
  if (!args.enabled && args.configured && args.gates.airwaveEnabled) {
    reasons.push("Lane-specific enable flag is not set.");
  }

  let mode: IntakeMode = "OFF";
  if (reasons.length === 0) {
    mode = "ACTIVE";
  } else if (!args.configured && args.requiresLegalAck) {
    mode = args.gates.siriusxmLegalAck ? "LOCAL_LISTENER_DESIGNED" : "LOCAL_LISTENER_HELD";
  } else if (!args.configured) {
    mode = "MANUAL_IMPORT_HELD";
  } else if (args.requiresLegalAck && !args.gates.siriusxmLegalAck) {
    mode = "LOCAL_LISTENER_HELD";
  } else if (args.configured && !args.enabled) {
    mode = "MANUAL_IMPORT_HELD";
  } else if (args.configured && args.enabled && !args.gates.airwaveEnabled) {
    mode = "MANUAL_IMPORT_HELD";
  }

  return {
    laneId: args.laneId,
    label: args.label,
    mode,
    gseOutputReady: args.gseOutputReady && mode === "ACTIVE",
    gsnOutputReady: args.gsnOutputReady && mode === "ACTIVE",
    blockedReasons: reasons,
    nextOperatorAction: args.nextOperatorAction,
  };
}

/**
 * Build a complete Airwave intake plan for the current environment.
 * Pure, read-only: inspects env flags and returns a plan structure.
 * Does not capture, import, write, or publish.
 */
export function buildAirwaveIntakePlan(
  env: Record<string, string | undefined> = {},
  now: Date = new Date(),
  scheduleBlocks: readonly ShowBlock[] = [],
): AirwaveIntakePlan {
  const gates: SourcePolicyGates = {
    airwaveEnabled: env["AIRWAVE_ENABLED"] === "true",
    siriusxmLegalAck: env["AIRWAVE_SIRIUSXM_LEGAL_ACK"] === "true",
    transcriptImportEnabled: env["AIRWAVE_TRANSCRIPT_IMPORT_ENABLED"] === "true",
    youtubeEnabled: env["AIRWAVE_YOUTUBE_FEEDS_ENABLED"] === "true",
    podcastEnabled: env["AIRWAVE_PODCAST_RSS_ENABLED"] === "true",
    beatReportsEnabled: env["AIRWAVE_BEAT_REPORTS_ENABLED"] === "true",
    studioHandoffEnabled: env["AIRWAVE_STUDIO_HANDOFF_ENABLED"] === "true",
  };

  const transcriptConfigured =
    (env["AIRWAVE_TRANSCRIPT_SHEET_ID"]?.trim() ?? "").length > 0 ||
    (env["AIRWAVE_TRANSCRIPT_FILE_PATH"]?.trim() ?? "").length > 0;

  const windowOpen = isWindowOpen(now);

  const gseReadiness = buildGseReadiness(gates);
  const gsnReadiness = buildGsnReadiness(gates);

  const lanes: IntakeLaneState[] = [
    buildLaneState({
      laneId: "manual-transcript-import",
      label: "Manual transcript import (CSV/TSV)",
      gates,
      enabled: gates.transcriptImportEnabled,
      configured: transcriptConfigured,
      requiresLegalAck: false,
      gseOutputReady: true,
      gsnOutputReady: true,
      nextOperatorAction: transcriptConfigured
        ? "Verify contract columns and rights_status values. Stage rows for review."
        : "Set AIRWAVE_TRANSCRIPT_FILE_PATH or AIRWAVE_TRANSCRIPT_SHEET_ID, then enable AIRWAVE_TRANSCRIPT_IMPORT_ENABLED.",
    }),
    buildLaneState({
      laneId: "public-youtube",
      label: "Public YouTube show feed",
      gates,
      enabled: gates.youtubeEnabled,
      configured: gates.youtubeEnabled,
      requiresLegalAck: false,
      gseOutputReady: true,
      gsnOutputReady: true,
      nextOperatorAction: gates.youtubeEnabled
        ? "Run dry-run extraction before enabling at scale."
        : "Set AIRWAVE_YOUTUBE_FEEDS_ENABLED=true and whitelist show feed IDs.",
    }),
    buildLaneState({
      laneId: "podcast-rss",
      label: "Podcast RSS feed",
      gates,
      enabled: gates.podcastEnabled,
      configured: gates.podcastEnabled,
      requiresLegalAck: false,
      gseOutputReady: true,
      gsnOutputReady: true,
      nextOperatorAction: gates.podcastEnabled
        ? "Score sample episodes before expanding coverage."
        : "Set AIRWAVE_PODCAST_RSS_ENABLED=true and whitelist RSS feeds.",
    }),
    buildLaneState({
      laneId: "channel-87-siriusxm",
      label: "Channel 87 (SiriusXM Fantasy Sports Radio)",
      gates,
      enabled: false,
      configured: transcriptConfigured && gates.transcriptImportEnabled,
      requiresLegalAck: true,
      gseOutputReady: true,
      gsnOutputReady: true,
      nextOperatorAction: gates.siriusxmLegalAck
        ? "Legal ACK set. Import CH87 notes manually via CSV/TSV. No automation."
        : "Set AIRWAVE_SIRIUSXM_LEGAL_ACK after legal review. Import founder notes via spreadsheet contract.",
    }),
    buildLaneState({
      laneId: "beat-reporter-mesh",
      label: "Beat reporter mesh",
      gates,
      enabled: gates.beatReportsEnabled,
      configured: gates.beatReportsEnabled,
      requiresLegalAck: false,
      gseOutputReady: true,
      gsnOutputReady: false,
      nextOperatorAction: gates.beatReportsEnabled
        ? "Map each beat report type to player/team impact. Add citation metadata."
        : "Set AIRWAVE_BEAT_REPORTS_ENABLED=true. Select a licensed beat source.",
    }),
    buildLaneState({
      laneId: "studio-handoff",
      label: "Galaxy Studio handoff",
      gates,
      enabled: gates.studioHandoffEnabled,
      configured: gates.studioHandoffEnabled,
      requiresLegalAck: false,
      gseOutputReady: false,
      gsnOutputReady: true,
      nextOperatorAction: gates.studioHandoffEnabled
        ? "Manual export only. Approve claims before studio use."
        : "Set AIRWAVE_STUDIO_HANDOFF_ENABLED=true when ready for GSN editorial handoff.",
    }),
  ];

  const heldLanes = lanes.filter((l) => l.mode !== "ACTIVE").map((l) => l.label);
  const legalHoldLanes = lanes
    .filter((l) => l.blockedReasons.some((r) => r.includes("Legal acknowledgement")))
    .map((l) => l.label);

  const allowedActions: string[] = [
    "Inspect source policy readiness (read-only)",
    "Review CH87 schedule contract (read-only)",
    "Validate transcript CSV/TSV contract (read-only)",
    "Review claim extraction contract",
    "Map claims to GSE/GSN outputs in review queue",
    "Run dry-run capture plan (no actual capture)",
    "Import manual transcript notes via spreadsheet contract",
  ];

  const forbiddenActions: string[] = [
    "raw_audio_archive",
    "verbatim_transcript_storage_public",
    "auto_publish",
    "satellite_radio_scraping",
    "credential_automation",
    "drm_bypass",
    "stream_ripping",
    "account_automation",
    "source_pointer_in_public_output",
    "capture_without_gate",
    "active_mode_without_legal_ack_for_satellite",
  ];

  const nextOperatorActions: string[] = lanes
    .filter((l) => l.mode !== "ACTIVE")
    .map((l) => l.nextOperatorAction);

  if (!gates.siriusxmLegalAck) {
    nextOperatorActions.push(
      "Review legal posture for satellite radio. Sign off AIRWAVE_SIRIUSXM_LEGAL_ACK to unlock CH87 import lane.",
    );
  }

  const activeLaneCount = lanes.filter((l) => l.mode === "ACTIVE").length;

  return {
    generatedAt: now.toISOString(),
    currentWindowOpen: windowOpen,
    channel87: {
      laneStatus: gates.siriusxmLegalAck ? "MANUAL_IMPORT_READY" : "LOCAL_LISTENER_HELD",
      windowStartHour: 5,
      windowEndHour: 23,
      timezone: "America/Chicago",
      requiresLegalAck: true,
      legalAckGranted: gates.siriusxmLegalAck,
      nextOperatorAction: gates.siriusxmLegalAck
        ? "Import CH87 founder notes via CSV/TSV spreadsheet contract. No automation."
        : "Set AIRWAVE_SIRIUSXM_LEGAL_ACK after legal review to unlock manual import lane.",
    },
    sourcePolicySummary: {
      totalSources: 10,
      readySources: activeLaneCount,
      heldSources: heldLanes.length,
      legalHolds: legalHoldLanes.length,
    },
    gates: {
      masterEnabled: gates.airwaveEnabled,
      siriusxmLegalAck: gates.siriusxmLegalAck,
      transcriptImportEnabled: gates.transcriptImportEnabled,
      youtubeEnabled: gates.youtubeEnabled,
      podcastEnabled: gates.podcastEnabled,
      beatReportsEnabled: gates.beatReportsEnabled,
      studioHandoffEnabled: gates.studioHandoffEnabled,
    },
    lanes,
    allowedActions,
    blockedReasons: heldLanes.length > 0
      ? [`${heldLanes.length} lane(s) are held. See individual lane blockedReasons.`]
      : [],
    nextOperatorActions,
    gseOutputReadiness: gseReadiness,
    gsnOutputReadiness: gsnReadiness,
    privateFields: [
      "source_pointer",
      "clip_ref",
      "file_path",
      "feed_url",
      "account_credentials",
      "stream_url",
      "raw_transcript_text",
    ],
    forbiddenActions,
    dryRunPlan: {
      canDryRun: true,
      dryRunDescription:
        "Dry-run reports which lanes would capture and why each is held. No actual capture occurs.",
      whatWouldCapture: activeLaneCount > 0
        ? lanes.filter((l) => l.mode === "ACTIVE").map((l) => l.label)
        : [],
      whatIsHeld: heldLanes,
    },
    legalHoldSummary: {
      laneCount: legalHoldLanes.length,
      heldLanes: legalHoldLanes,
      unlockRequirements:
        legalHoldLanes.length > 0
          ? [
              "Set AIRWAVE_SIRIUSXM_LEGAL_ACK=true after legal review of satellite radio terms.",
              "Document the legal basis for founder listening on personal subscription.",
              "Confirm paraphrase-only posture with counsel.",
            ]
          : [],
    },
    policy: {
      canWriteDatabase: false,
      canArchiveRawAudio: false,
      canStoreVerbatimTranscript: false,
      canAutoPublish: false,
      canCaptureWithoutGate: false,
    },
  };
}
