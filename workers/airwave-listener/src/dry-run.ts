/**
 * Airwave Listener Worker — Dry Run (v1)
 *
 * Safe, read-only plan reporter. No audio capture, no stream access,
 * no database writes. Reads schedule contracts and intake gates from
 * environment variables and reports what would happen if gates were open.
 *
 * Run: npx ts-node --project tsconfig.json src/dry-run.ts
 *
 * WHAT THIS SCRIPT DOES:
 *   - Reads CH87 schedule contract (sample placeholders until operator provides data)
 *   - Checks intake gates from environment
 *   - Reports current window status, active/next show block, and plan
 *
 * WHAT THIS SCRIPT DOES NOT DO:
 *   - Does not capture audio
 *   - Does not access SiriusXM endpoints
 *   - Does not write to any database
 *   - Does not generate any claims
 *   - Does not activate any listener
 */

import {
  createChannel87ScheduleContract,
  summarizeChannel87Schedule,
  CH87_WINDOW,
  CH87_TIMEZONE,
} from "../../../apps/web/lib/airwave/channel-87-schedule";
import {
  buildAirwaveIntakePlan,
} from "../../../apps/web/lib/airwave/intake-contract";
import {
  getAirwaveSourcePolicies,
  summarizeSourcePolicyReadiness,
  type SourcePolicyGates,
} from "../../../apps/web/lib/airwave/source-policy";

// ─── Read gates from environment ──────────────────────────────────────────────

const env = process.env as Record<string, string | undefined>;

const gates: SourcePolicyGates = {
  airwaveEnabled: env.AIRWAVE_ENABLED === "true",
  siriusxmLegalAck: env.AIRWAVE_SIRIUSXM_LEGAL_ACK === "true",
  transcriptImportEnabled: env.AIRWAVE_TRANSCRIPT_IMPORT_ENABLED === "true",
  youtubeEnabled: env.AIRWAVE_YOUTUBE_ENABLED === "true",
  podcastEnabled: env.AIRWAVE_PODCAST_ENABLED === "true",
  beatReportsEnabled: env.AIRWAVE_BEAT_REPORTS_ENABLED === "true",
  studioHandoffEnabled: env.AIRWAVE_STUDIO_HANDOFF_ENABLED === "true",
};

// ─── Current time ─────────────────────────────────────────────────────────────

const now = new Date();

// Approximate CT offset: UTC-6 (CST) / UTC-5 (CDT).
// For dry-run purposes, we use a coarse offset.
// A production implementation would use a proper timezone library.
const isDst = (() => {
  const jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
  return now.getTimezoneOffset() < Math.max(jan, jul);
})();
const ctOffsetHours = isDst ? -5 : -6;
const nowCt = new Date(now.getTime() + ctOffsetHours * 60 * 60 * 1000);
const hourCt = nowCt.getUTCHours();

// ─── Schedule + intake plan ───────────────────────────────────────────────────

const scheduleContract = createChannel87ScheduleContract();
const scheduleSummary = summarizeChannel87Schedule(scheduleContract.shows, nowCt);
const intakePlan = buildAirwaveIntakePlan(env, now, [...scheduleContract.shows]);
const policies = getAirwaveSourcePolicies();
const policySummary = summarizeSourcePolicyReadiness(policies, gates);

// ─── Report ───────────────────────────────────────────────────────────────────

const line = "─".repeat(60);

console.log();
console.log(line);
console.log("  AIRWAVE LISTENER — DRY RUN REPORT");
console.log(`  Generated: ${now.toISOString()}`);
console.log(`  CT Time:   ${nowCt.toISOString()} (UTC${ctOffsetHours})`);
console.log(`  CT Hour:   ${hourCt}:00`);
console.log(line);

console.log();
console.log("GATES");
console.log(`  Master (AIRWAVE_ENABLED):           ${gates.airwaveEnabled ? "OPEN ✓" : "CLOSED ✗"}`);
console.log(`  SiriusXM legal ack:                 ${gates.siriusxmLegalAck ? "GRANTED ✓" : "NOT GRANTED ✗"}`);
console.log(`  Transcript import:                  ${gates.transcriptImportEnabled ? "ENABLED ✓" : "DISABLED ✗"}`);
console.log(`  YouTube:                            ${gates.youtubeEnabled ? "ENABLED ✓" : "DISABLED ✗"}`);
console.log(`  Podcast:                            ${gates.podcastEnabled ? "ENABLED ✓" : "DISABLED ✗"}`);
console.log(`  Beat reports:                       ${gates.beatReportsEnabled ? "ENABLED ✓" : "DISABLED ✗"}`);
console.log(`  Studio handoff:                     ${gates.studioHandoffEnabled ? "ENABLED ✓" : "DISABLED ✗"}`);

console.log();
console.log("CHANNEL 87 WINDOW");
console.log(`  Window:     ${CH87_WINDOW.startHour}:00–${CH87_WINDOW.endHour}:00 ${CH87_TIMEZONE}`);
console.log(`  Status:     ${scheduleSummary.windowOpen ? "OPEN — within capture window" : "CLOSED — outside capture window"}`);
console.log(`  Timezone:   ${CH87_TIMEZONE}`);

console.log();
console.log("CHANNEL 87 SCHEDULE");
console.log(`  Total shows:      ${scheduleSummary.totalShows}`);
console.log(`  Sample-only:      ${scheduleSummary.sampleOnlyShows} (replace with operator-verified data)`);
console.log(`  Held shows:       ${scheduleSummary.heldShows}`);

if (scheduleSummary.currentShow) {
  console.log();
  console.log("CURRENT SHOW BLOCK");
  console.log(`  Show:       ${scheduleSummary.currentShow.showName}`);
  console.log(`  Hosts:      ${scheduleSummary.currentShow.expectedHosts.join(", ")}`);
  console.log(`  Sports:     ${scheduleSummary.currentShow.sportFocus.join(", ")}`);
  console.log(`  Fantasy:    ${scheduleSummary.currentShow.fantasyFocus ? "YES" : "NO"}`);
  console.log(`  Betting:    ${scheduleSummary.currentShow.bettingRelevance ? "YES" : "NO"}`);
  console.log(`  Confidence: ${scheduleSummary.currentShow.sourceConfidence}`);
  console.log(`  Rights:     ${scheduleSummary.currentShow.rightsStatus}`);
  console.log(`  Note:       ${scheduleSummary.currentShow.operatorNotes}`);
} else {
  console.log();
  console.log("CURRENT SHOW BLOCK: (none — outside window or no show scheduled)");
}

if (scheduleSummary.nextShow) {
  console.log();
  console.log("NEXT SHOW BLOCK");
  console.log(`  Show:       ${scheduleSummary.nextShow.showName}`);
  console.log(`  Starts:     ${scheduleSummary.nextShow.startsAtCt} CT`);
  console.log(`  Hosts:      ${scheduleSummary.nextShow.expectedHosts.join(", ")}`);
}

console.log();
console.log("INTAKE PLAN");
console.log(`  Mode:                   ${intakePlan.channel87.laneStatus}`);
console.log(`  Legal ack required:     ${intakePlan.channel87.requiresLegalAck ? "YES" : "NO"}`);
console.log(`  Legal ack granted:      ${intakePlan.channel87.legalAckGranted ? "YES" : "NO"}`);
console.log(`  Next action:            ${intakePlan.channel87.nextOperatorAction}`);

console.log();
console.log("SOURCE POLICY SUMMARY");
console.log(`  Total sources:          ${policySummary.total}`);
console.log(`  Active sources:         ${policySummary.active}`);
console.log(`  Ready sources:          ${policySummary.ready}`);
console.log(`  Designed (not ready):   ${policySummary.designed}`);
console.log(`  Held sources:           ${policySummary.held}`);
console.log(`  Legal holds:            ${policySummary.legalHolds}`);
console.log(`  GSE-ready sources:      ${policySummary.gseReady}`);
console.log(`  GSN-ready sources:      ${policySummary.gsnReady}`);

if (intakePlan.nextOperatorActions.length > 0) {
  console.log();
  console.log("NEXT OPERATOR ACTIONS");
  intakePlan.nextOperatorActions.forEach((action, i) => {
    console.log(`  ${i + 1}. ${action}`);
  });
}

console.log();
console.log("GSE OUTPUT READINESS (if gates were open)");
console.log(`  Pick evidence candidates:  ${intakePlan.gseOutputReadiness.pickEvidenceCandidates ? "READY" : "NOT READY"}`);
console.log(`  Injury alerts:             ${intakePlan.gseOutputReadiness.injuryAlerts ? "READY" : "NOT READY"}`);
console.log(`  Market signals:            ${intakePlan.gseOutputReadiness.marketSignals ? "READY" : "NOT READY"}`);
console.log(`  Usage alerts:              ${intakePlan.gseOutputReadiness.usageAlerts ? "READY" : "NOT READY"}`);
console.log(`  Model context notes:       ${intakePlan.gseOutputReadiness.modelContextNotes ? "READY" : "NOT READY"}`);
console.log(`  Summary: ${intakePlan.gseOutputReadiness.summary}`);

console.log();
console.log("GSN OUTPUT READINESS (if gates were open)");
console.log(`  Show briefs:               ${intakePlan.gsnOutputReadiness.showBriefs ? "READY" : "NOT READY"}`);
console.log(`  Segment ideas:             ${intakePlan.gsnOutputReadiness.segmentIdeas ? "READY" : "NOT READY"}`);
console.log(`  Editorial notes:           ${intakePlan.gsnOutputReadiness.editorialNotes ? "READY" : "NOT READY"}`);
console.log(`  Hot take ledger:           ${intakePlan.gsnOutputReadiness.hotTakeLedger ? "READY" : "NOT READY"}`);
console.log(`  Newsletter blurbs:         ${intakePlan.gsnOutputReadiness.newsletterBlurbs ? "READY" : "NOT READY"}`);
console.log(`  Summary: ${intakePlan.gsnOutputReadiness.summary}`);

console.log();
console.log("COMPLIANCE POSTURE");
console.log("  No audio captured:              YES (dry-run only)");
console.log("  No stream accessed:             YES (dry-run only)");
console.log("  No database writes:             YES (dry-run only)");
console.log("  No claims generated:            YES (dry-run only)");
console.log("  No SiriusXM endpoints accessed: YES (no automated endpoint calls)");
console.log("  No verbatim transcripts:        YES (no transcription in dry-run)");
console.log("  No DRM bypass:                  YES (dry-run has no capture layer)");

console.log();
console.log(line);
console.log("  DRY RUN COMPLETE — no side effects produced.");
console.log(line);
console.log();
