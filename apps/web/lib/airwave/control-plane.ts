/**
 * Airwave control plane.
 *
 * Pure, read-only status model for the transcript/media intelligence layer.
 * It describes which inputs are useful, which gates hold them, and what each
 * lane would produce. It does not fetch transcripts, read spreadsheets, write
 * rows, archive audio, or publish anything.
 */

import {
  ALL_ADAPTERS,
  captureGate,
  readAirwaveEnv,
  type AirwaveEnv,
  type SourceAdapter,
} from "./pipeline";

type Env = Record<string, string | undefined>;

export type AirwaveLaneStatus =
  | "open"
  | "held"
  | "missing-config"
  | "legal-hold"
  | "manual-review";

export type AirwaveInputLane = {
  readonly key: string;
  readonly name: string;
  readonly status: AirwaveLaneStatus;
  readonly source: string;
  readonly cadence: string;
  readonly cost: "owned" | "free" | "licensed" | "manual";
  readonly envVars: readonly string[];
  readonly configured: boolean;
  readonly gateOpen: boolean;
  readonly output: string;
  readonly operatorAction: string;
  readonly complianceNote: string;
};

export type AirwaveControlPlane = {
  readonly generatedAt: string;
  readonly env: AirwaveEnv;
  readonly summary: {
    readonly lanes: number;
    readonly open: number;
    readonly held: number;
    readonly configured: number;
    readonly legalHolds: number;
    readonly manualReview: number;
  };
  readonly lanes: readonly AirwaveInputLane[];
  readonly adapters: readonly {
    readonly kind: SourceAdapter["kind"];
    readonly label: string;
    readonly held: boolean;
    readonly reason: string;
  }[];
  readonly spreadsheetContract: readonly {
    readonly column: string;
    readonly purpose: string;
    readonly required: boolean;
  }[];
  readonly policy: {
    readonly exposesSecretValues: false;
    readonly capturesOnRequest: false;
    readonly archivesRawAudio: false;
    readonly autoPublishes: false;
    readonly storesVerbatimQuotes: false;
  };
};

const SHEET_ENV = [
  "AIRWAVE_TRANSCRIPT_IMPORT_ENABLED",
  "AIRWAVE_TRANSCRIPT_SHEET_ID",
  "AIRWAVE_TRANSCRIPT_WORKSHEET_NAME",
  "AIRWAVE_TRANSCRIPT_FILE_PATH",
] as const;

const YOUTUBE_ENV = ["AIRWAVE_YOUTUBE_FEEDS_ENABLED"] as const;
const PODCAST_ENV = ["AIRWAVE_PODCAST_RSS_ENABLED"] as const;
const BEAT_ENV = ["AIRWAVE_BEAT_REPORTS_ENABLED"] as const;
const STUDIO_ENV = ["AIRWAVE_STUDIO_HANDOFF_ENABLED"] as const;

export const AIRWAVE_SPREADSHEET_CONTRACT = [
  { column: "aired_at_ct", purpose: "When the segment aired in Central Time.", required: true },
  { column: "show", purpose: "Program, podcast, or stream name.", required: true },
  { column: "segment", purpose: "Hour, clip, chapter, or show block label.", required: true },
  { column: "speaker", purpose: "Host, guest, reporter, or desk label.", required: true },
  { column: "paraphrased_claim", purpose: "Derived claim text; never a verbatim quote.", required: true },
  { column: "sport", purpose: "League or sport namespace.", required: true },
  { column: "entity", purpose: "Player, team, matchup, market, or cohort touched by the claim.", required: true },
  { column: "claim_type", purpose: "Pick, injury read, role change, ranking, trend, or hot take.", required: true },
  { column: "confidence", purpose: "Emphatic, lean, or hedged language band.", required: true },
  { column: "rights_status", purpose: "Owned, public, licensed, permission-required, or held.", required: true },
  { column: "source_pointer", purpose: "Private reference only; stripped from public DTOs.", required: false },
  { column: "operator_status", purpose: "Draft, review, approved, rejected, or settled.", required: true },
] as const;

function isOn(env: Env, key: string): boolean {
  return env[key] === "true";
}

function hasValue(env: Env, key: string): boolean {
  const value = env[key];
  return typeof value === "string" && value.trim().length > 0;
}

function adapterFor(kind: SourceAdapter["kind"]): SourceAdapter {
  const adapter = ALL_ADAPTERS.find((item) => item.kind === kind);
  if (!adapter) {
    throw new Error(`Unknown Airwave adapter: ${kind}`);
  }
  return adapter;
}

function laneStatus(args: {
  enabled: boolean;
  configured: boolean;
  gateAllowed: boolean;
  requiresLegalAck?: boolean;
  legalAck?: boolean;
  manualReview?: boolean;
}): AirwaveLaneStatus {
  if (args.manualReview) return "manual-review";
  if (!args.configured) return "missing-config";
  if (!args.enabled) return "held";
  if (args.requiresLegalAck && !args.legalAck) return "legal-hold";
  return args.gateAllowed ? "open" : "held";
}

function lane(args: {
  key: string;
  name: string;
  source: string;
  cadence: string;
  cost: AirwaveInputLane["cost"];
  envVars: readonly string[];
  configured: boolean;
  gateOpen: boolean;
  status: AirwaveLaneStatus;
  output: string;
  operatorAction: string;
  complianceNote: string;
}): AirwaveInputLane {
  return args;
}

export function readAirwaveControlPlane(
  env: Env = process.env,
  now = new Date(),
): AirwaveControlPlane {
  const airwaveEnv = readAirwaveEnv(env);
  const youtubeGate = captureGate(adapterFor("youtube"), airwaveEnv);
  const podcastGate = captureGate(adapterFor("podcast"), airwaveEnv);
  const satelliteGate = captureGate(adapterFor("satellite-radio"), airwaveEnv);

  const transcriptConfigured =
    hasValue(env, "AIRWAVE_TRANSCRIPT_SHEET_ID") || hasValue(env, "AIRWAVE_TRANSCRIPT_FILE_PATH");
  const transcriptImportOn = isOn(env, "AIRWAVE_TRANSCRIPT_IMPORT_ENABLED");
  const youtubeConfigured = isOn(env, "AIRWAVE_YOUTUBE_FEEDS_ENABLED");
  const podcastConfigured = isOn(env, "AIRWAVE_PODCAST_RSS_ENABLED");
  const beatConfigured = isOn(env, "AIRWAVE_BEAT_REPORTS_ENABLED");
  const studioConfigured = isOn(env, "AIRWAVE_STUDIO_HANDOFF_ENABLED");

  const lanes = [
    lane({
      key: "transcript-spreadsheet",
      name: "Transcript spreadsheet intake",
      source: "Owner-provided show transcript or translation sheet",
      cadence: "Manual or scheduled import after operator approval",
      cost: "owned",
      envVars: SHEET_ENV,
      configured: transcriptConfigured,
      gateOpen: airwaveEnv.enabled && transcriptImportOn && transcriptConfigured,
      status: laneStatus({
        enabled: airwaveEnv.enabled && transcriptImportOn,
        configured: transcriptConfigured,
        gateAllowed: airwaveEnv.enabled && transcriptImportOn,
      }),
      output: "Draft PunditClaim rows, breaking-news notes, and entity tags.",
      operatorAction: transcriptConfigured
        ? "Keep import off until the sheet/file columns and rights_status values are reviewed."
        : "Add the sheet id, worksheet name, or local transcript file path, then dry-run the import contract.",
      complianceNote: "Derived claims only. Do not store raw audio or verbatim transcript text in the public ledger.",
    }),
    lane({
      key: "public-youtube",
      name: "Public YouTube show feed",
      source: "Freely published video feeds",
      cadence: "Show schedule blocks inside the Airwave airing window",
      cost: "free",
      envVars: YOUTUBE_ENV,
      configured: youtubeConfigured,
      gateOpen: youtubeConfigured && youtubeGate.allowed,
      status: laneStatus({
        enabled: airwaveEnv.enabled,
        configured: youtubeConfigured,
        gateAllowed: youtubeGate.allowed,
      }),
      output: "Candidate segments for claim extraction and source corroboration.",
      operatorAction: youtubeConfigured
        ? "Run dry-run extraction before letting any segment enter review."
        : "Pick a short whitelist of shows and store feed ids before enabling.",
      complianceNote: "Respect platform terms and fair-use boundaries; never re-host video or long quotes.",
    }),
    lane({
      key: "podcast-rss",
      name: "Podcast RSS feed",
      source: "Public podcast episodes and show notes",
      cadence: "Episode drops, then segment-level claim extraction",
      cost: "free",
      envVars: PODCAST_ENV,
      configured: podcastConfigured,
      gateOpen: podcastConfigured && podcastGate.allowed,
      status: laneStatus({
        enabled: airwaveEnv.enabled,
        configured: podcastConfigured,
        gateAllowed: podcastGate.allowed,
      }),
      output: "Long-form context, trend claims, and game/player mentions.",
      operatorAction: podcastConfigured
        ? "Score sample episodes for precision before increasing coverage."
        : "Whitelist RSS feeds with clear public distribution rights.",
      complianceNote: "Persist paraphrased claims and objective metadata only.",
    }),
    lane({
      key: "siriusxm-context",
      name: "SiriusXM listening context",
      source: "Founder-owned listening/transcript workflow",
      cadence: "Owner-approved windows only",
      cost: "licensed",
      envVars: ["AIRWAVE_ENABLED", "AIRWAVE_SIRIUSXM_LEGAL_ACK", ...SHEET_ENV],
      configured: transcriptConfigured && transcriptImportOn,
      gateOpen: transcriptConfigured && transcriptImportOn && satelliteGate.allowed,
      status: laneStatus({
        enabled: airwaveEnv.enabled,
        configured: transcriptConfigured && transcriptImportOn,
        gateAllowed: satelliteGate.allowed,
        requiresLegalAck: true,
        legalAck: airwaveEnv.siriusxmLegalAck,
      }),
      output: "Founder-reviewed show context and claim candidates.",
      operatorAction: airwaveEnv.siriusxmLegalAck
        ? "Keep a human review gate before any named-person scorecard."
        : "Do not automate satellite-radio capture until legal acknowledgement is explicit.",
      complianceNote: "Permission-sensitive. No scraper, no redistribution, no archive. Treat as held unless counsel/owner opens it.",
    }),
    lane({
      key: "beat-reporter-mesh",
      name: "Beat reporter mesh",
      source: "Licensed, official, or manually reviewed beat reports",
      cadence: "Breaking report, practice report, injury update, depth-chart change",
      cost: "licensed",
      envVars: BEAT_ENV,
      configured: beatConfigured,
      gateOpen: beatConfigured && airwaveEnv.enabled,
      status: beatConfigured && airwaveEnv.enabled ? "open" : "manual-review",
      output: "Reliability-tiered news events for The Beat and pick evidence trails.",
      operatorAction: beatConfigured
        ? "Map each report to player/team/market impact with citation metadata."
        : "Keep local beat names and paywalled text out until a licensed source is selected.",
      complianceNote: "Cite source/outlet, summarize facts, and do not reproduce full articles.",
    }),
    lane({
      key: "studio-handoff",
      name: "Galaxy Studio handoff",
      source: "Approved claims, game nodes, and content briefs",
      cadence: "After operator review only",
      cost: "owned",
      envVars: STUDIO_ENV,
      configured: studioConfigured,
      gateOpen: studioConfigured && airwaveEnv.enabled,
      status: "manual-review",
      output: "Draft scripts, newsletters, reels, and editorial briefs.",
      operatorAction: "Keep exports manual. The studio can prepare assets, but it must not publish to external channels.",
      complianceNote: "Manual export only; external posting integrations stay absent by design.",
    }),
  ] as const;

  return {
    generatedAt: now.toISOString(),
    env: airwaveEnv,
    summary: {
      lanes: lanes.length,
      open: lanes.filter((item) => item.status === "open").length,
      held: lanes.filter((item) => item.status === "held" || item.status === "missing-config").length,
      configured: lanes.filter((item) => item.configured).length,
      legalHolds: lanes.filter((item) => item.status === "legal-hold").length,
      manualReview: lanes.filter((item) => item.status === "manual-review").length,
    },
    lanes,
    adapters: ALL_ADAPTERS.map((adapter) => {
      const gate = captureGate(adapter, airwaveEnv);
      return {
        kind: adapter.kind,
        label: adapter.label,
        held: !gate.allowed,
        reason: gate.reason,
      };
    }),
    spreadsheetContract: AIRWAVE_SPREADSHEET_CONTRACT,
    policy: {
      exposesSecretValues: false,
      capturesOnRequest: false,
      archivesRawAudio: false,
      autoPublishes: false,
      storesVerbatimQuotes: false,
    },
  };
}
