/**
 * Airwave Intelligence Intake — Intelligence Control Plane.
 *
 * Extended read-only status model that surfaces the full GSE/GSN intelligence
 * intake posture: source policies, CH87 lane, intake plan, claim readiness,
 * and GSE/GSN output readiness.
 *
 * This module deliberately does NOT replace or break the existing control-plane.ts.
 * It composes existing models into a richer surface for cockpit, API, and operator use.
 *
 * RULES: read-only, no secrets exposed, no source pointers leaked, no live capture.
 */

import { readAirwaveControlPlane, type AirwaveControlPlane } from "./control-plane";
import {
  getAirwaveSourcePolicies,
  summarizeSourcePolicyReadiness,
  type SourcePolicySummary,
  type SourcePolicyGates,
} from "./source-policy";
import {
  createChannel87ScheduleContract,
  summarizeChannel87Schedule,
  type Channel87ScheduleContract,
  type Channel87ScheduleSummary,
} from "./channel-87-schedule";
import {
  buildAirwaveIntakePlan,
  type AirwaveIntakePlan,
} from "./intake-contract";

type Env = Record<string, string | undefined>;

export type IntelligenceControlPlane = {
  readonly generatedAt: string;
  /** The base Airwave control plane (existing lanes, adapters, spreadsheet contract). */
  readonly base: AirwaveControlPlane;
  /** Source policy summary across all 10 Airwave source categories. */
  readonly sourcePolicySummary: SourcePolicySummary;
  /** Channel 87 schedule contract (read-only, manual/sample data). */
  readonly channel87Contract: Channel87ScheduleContract;
  /** Channel 87 schedule summary for the current moment. */
  readonly channel87Summary: Channel87ScheduleSummary;
  /** Full intake plan for the current environment. */
  readonly intakePlan: AirwaveIntakePlan;
  /** GSE output readiness surface. */
  readonly gseOutputReadiness: AirwaveIntakePlan["gseOutputReadiness"];
  /** GSN output readiness surface. */
  readonly gsnOutputReadiness: AirwaveIntakePlan["gsnOutputReadiness"];
  /** Summary of what is safe to run now vs. what requires gate/review. */
  readonly operatorSurface: {
    readonly currentWindowOpen: boolean;
    readonly ch87LaneStatus: AirwaveIntakePlan["channel87"]["laneStatus"];
    readonly ch87RequiresLegalAck: true;
    readonly legalAckGranted: boolean;
    readonly manualImportReady: boolean;
    readonly sourcePolicyActive: number;
    readonly sourcePolicyHeld: number;
    readonly legalHolds: number;
    readonly nextOperatorActions: readonly string[];
    readonly forbiddenActions: readonly string[];
    /** Fields that must never appear in any public output. */
    readonly privateFields: readonly string[];
  };
  readonly policy: {
    readonly exposesSecretValues: false;
    readonly exposesLocalFilePaths: false;
    readonly exposesSourcePointers: false;
    readonly capturesOnRequest: false;
    readonly archivesRawAudio: false;
    readonly storesVerbatimTranscripts: false;
    readonly autoPublishes: false;
  };
};

function buildGates(env: Env): SourcePolicyGates {
  return {
    airwaveEnabled: env["AIRWAVE_ENABLED"] === "true",
    siriusxmLegalAck: env["AIRWAVE_SIRIUSXM_LEGAL_ACK"] === "true",
    transcriptImportEnabled: env["AIRWAVE_TRANSCRIPT_IMPORT_ENABLED"] === "true",
    youtubeEnabled: env["AIRWAVE_YOUTUBE_FEEDS_ENABLED"] === "true",
    podcastEnabled: env["AIRWAVE_PODCAST_RSS_ENABLED"] === "true",
    beatReportsEnabled: env["AIRWAVE_BEAT_REPORTS_ENABLED"] === "true",
    studioHandoffEnabled: env["AIRWAVE_STUDIO_HANDOFF_ENABLED"] === "true",
  };
}

/**
 * Build the full intelligence control plane for the current environment.
 * Pure, read-only. Composes all Airwave intelligence intake models.
 */
export function readIntelligenceControlPlane(
  env: Env = process.env,
  now: Date = new Date(),
): IntelligenceControlPlane {
  const base = readAirwaveControlPlane(env, now);
  const gates = buildGates(env);
  const policies = getAirwaveSourcePolicies();
  const sourcePolicySummary = summarizeSourcePolicyReadiness(policies, gates);
  const channel87Contract = createChannel87ScheduleContract();
  const channel87Summary = summarizeChannel87Schedule(channel87Contract.shows, now);
  const intakePlan = buildAirwaveIntakePlan(env, now, channel87Contract.shows);

  const transcriptConfigured =
    (env["AIRWAVE_TRANSCRIPT_SHEET_ID"]?.trim() ?? "").length > 0 ||
    (env["AIRWAVE_TRANSCRIPT_FILE_PATH"]?.trim() ?? "").length > 0;
  const transcriptImportOn = env["AIRWAVE_TRANSCRIPT_IMPORT_ENABLED"] === "true";
  const manualImportReady = transcriptConfigured && transcriptImportOn && gates.airwaveEnabled;

  const nextOperatorActions: string[] = [
    ...intakePlan.nextOperatorActions,
  ];

  if (!gates.siriusxmLegalAck) {
    nextOperatorActions.push(
      "CH87 (SiriusXM) lane is HELD. Complete legal review and set AIRWAVE_SIRIUSXM_LEGAL_ACK to unlock manual import.",
    );
  }

  if (!gates.airwaveEnabled) {
    nextOperatorActions.push(
      "Master switch is OFF (AIRWAVE_ENABLED=false). Set to true to activate any lane.",
    );
  }

  return {
    generatedAt: now.toISOString(),
    base,
    sourcePolicySummary,
    channel87Contract,
    channel87Summary,
    intakePlan,
    gseOutputReadiness: intakePlan.gseOutputReadiness,
    gsnOutputReadiness: intakePlan.gsnOutputReadiness,
    operatorSurface: {
      currentWindowOpen: intakePlan.currentWindowOpen,
      ch87LaneStatus: intakePlan.channel87.laneStatus,
      ch87RequiresLegalAck: true,
      legalAckGranted: gates.siriusxmLegalAck,
      manualImportReady,
      sourcePolicyActive: sourcePolicySummary.active,
      sourcePolicyHeld: sourcePolicySummary.held,
      legalHolds: sourcePolicySummary.legalHolds,
      nextOperatorActions,
      forbiddenActions: intakePlan.forbiddenActions,
      privateFields: intakePlan.privateFields,
    },
    policy: {
      exposesSecretValues: false,
      exposesLocalFilePaths: false,
      exposesSourcePointers: false,
      capturesOnRequest: false,
      archivesRawAudio: false,
      storesVerbatimTranscripts: false,
      autoPublishes: false,
    },
  };
}
