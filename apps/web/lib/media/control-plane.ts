/**
 * Media control plane.
 *
 * Read-only model for how Galaxy turns data into reviewed media assets. It
 * stitches together Airwave, The Beat, Content, Studio, and the public blog
 * gate without reading external services or publishing anything.
 */

import { readAirwaveControlPlane } from "@/lib/airwave";
import { listTemplates } from "@/lib/content-engine";
import { NATIONAL_INSIDERS, TEAM_BEATS } from "@/lib/news/wire";
import { providerStatuses } from "@/lib/integrations/providers";

type Env = Record<string, string | undefined>;

export type MediaLaneStatus =
  | "ready"
  | "draft-only"
  | "db-dependent"
  | "founder-gated"
  | "blocked"
  | "manual-export";

export type MediaLane = {
  readonly key: string;
  readonly name: string;
  readonly status: MediaLaneStatus;
  readonly source: string;
  readonly output: string;
  readonly gate: string;
  readonly operatorAction: string;
  readonly riskBoundary: string;
};

export type MediaControlPlane = {
  readonly generatedAt: string;
  readonly summary: {
    readonly lanes: number;
    readonly ready: number;
    readonly draftOnly: number;
    readonly founderGated: number;
    readonly manualExport: number;
    readonly publicBlogEnabled: boolean;
  };
  readonly lanes: readonly MediaLane[];
  readonly templateSummary: {
    readonly total: number;
    readonly publicDefault: number;
    readonly internalDefault: number;
    readonly requiresPerformanceGate: number;
    readonly requiresResponsibleGaming: number;
    readonly requiresAffiliateDisclosure: number;
  };
  readonly sourceSummary: {
    readonly nationalInsidersSeeded: number;
    readonly teamBeatDesks: number;
    readonly teamBeatSlots: number;
    readonly airwaveLanes: number;
    readonly airwaveOpen: number;
    readonly configuredProviders: number;
    readonly totalProviders: number;
  };
  readonly policy: {
    readonly autoPublishes: false;
    readonly postsToSocial: false;
    readonly sendsUserComms: false;
    readonly exposesSecretValues: false;
    readonly fabricatesReports: false;
  };
};

function isOn(env: Env, key: string): boolean {
  return env[key] === "true";
}

export function readMediaControlPlane(
  env: Env = process.env,
  now = new Date(),
): MediaControlPlane {
  const publicBlogEnabled = isOn(env, "PUBLIC_BLOG_ENABLED");
  const airwave = readAirwaveControlPlane(env, now);
  const templates = listTemplates();
  const providers = providerStatuses(env);
  const studioProvider = providers.find((provider) => provider.key === "avatar-tts");
  const contentProvider = providers.find((provider) => provider.key === "odds");

  const lanes: readonly MediaLane[] = [
    {
      key: "airwave-claims",
      name: "Airwave claim intake",
      status: airwave.summary.open > 0 ? "draft-only" : "founder-gated",
      source: "Transcript sheets, public feeds, and permission-sensitive listening context.",
      output: "Draft claim rows, breaking-news notes, and entity tags for review.",
      gate: `AIRWAVE_ENABLED=${String(airwave.env.enabled)}`,
      operatorAction: "Review rights_status and source provenance before any claim feeds content.",
      riskBoundary: "No raw audio archive, no verbatim transcript text, no named-person public scorecard by default.",
    },
    {
      key: "beat-wire",
      name: "Beat reporter source mesh",
      status: isOn(env, "AIRWAVE_BEAT_REPORTS_ENABLED") ? "draft-only" : "founder-gated",
      source: `${NATIONAL_INSIDERS.length} seeded national insiders plus ${TEAM_BEATS.length} team desks.`,
      output: "Reliability-tiered news events for The Beat, fantasy alerts, and pick evidence.",
      gate: "AIRWAVE_BEAT_REPORTS_ENABLED",
      operatorAction: "Use official or licensed feeds for local beat detail; do not invent beat names.",
      riskBoundary: "Summarize facts with source attribution; do not reproduce paywalled article text.",
    },
    {
      key: "content-drafts",
      name: "Ava content drafts",
      status: "draft-only",
      source: `${templates.length} approved content templates and content-engine readiness rules.`,
      output: "Daily briefs, methodology notes, responsible-play copy, and internal recaps.",
      gate: "Content readiness verdict per draft",
      operatorAction: "Keep drafts in review until source coverage, compliance, and performance gates pass.",
      riskBoundary: "Approval is internal only; public surfacing requires a separate audited action.",
    },
    {
      key: "studio-assets",
      name: "Galaxy Studio assets",
      status: studioProvider?.configured ? "manual-export" : "founder-gated",
      source: "Game Intelligence Room nodes, citations, and template-backed creator packages.",
      output: "Markdown exports, creator scripts, newsletter blocks, titles, and reels scripts.",
      gate: studioProvider?.envVar ?? "AVATAR_TTS_VENDOR",
      operatorAction: "Generate only from real game nodes and export manually after scanner review.",
      riskBoundary: "No external posting path. Copy/save controls are manual export only.",
    },
    {
      key: "public-blog",
      name: "Public blog gate",
      status: publicBlogEnabled ? "ready" : "blocked",
      source: "Approved content drafts with source coverage and public-blog readiness gate.",
      output: "Public blog posts only when the platform gate is open.",
      gate: "PUBLIC_BLOG_ENABLED",
      operatorAction: publicBlogEnabled
        ? "Require final editorial review before public surfacing."
        : "Keep public blog disabled until public picks and content prerequisites are satisfied.",
      riskBoundary: "No auto-publish from cockpit or worker while the gate is closed.",
    },
    {
      key: "legacy-media-queue",
      name: "Legacy media item queue",
      status: "db-dependent",
      source: "cockpit_media_items table when the local DB is reachable.",
      output: "Older media briefs and QA/compliance metadata.",
      gate: "DATABASE_URL / DIRECT_URL",
      operatorAction: "Treat row count as UNKNOWN when the local DB cannot be reached.",
      riskBoundary: "scheduledFor is metadata only; no worker reads it to publish.",
    },
    {
      key: "odds-backed-briefs",
      name: "Odds-backed briefs",
      status: contentProvider?.configured ? "draft-only" : "founder-gated",
      source: "Odds and board state provider slots.",
      output: "Line movement notes, stale-source warnings, and slate context.",
      gate: contentProvider?.envVar ?? "THE_ODDS_API_KEY",
      operatorAction: "Draft only from real odds rows; suppress stale or missing context.",
      riskBoundary: "Do not write market claims when odds are missing or stale.",
    },
  ];

  return {
    generatedAt: now.toISOString(),
    summary: {
      lanes: lanes.length,
      ready: lanes.filter((lane) => lane.status === "ready").length,
      draftOnly: lanes.filter((lane) => lane.status === "draft-only").length,
      founderGated: lanes.filter((lane) => lane.status === "founder-gated").length,
      manualExport: lanes.filter((lane) => lane.status === "manual-export").length,
      publicBlogEnabled,
    },
    lanes,
    templateSummary: {
      total: templates.length,
      publicDefault: templates.filter((template) => template.defaultVisibility === "PUBLIC").length,
      internalDefault: templates.filter((template) => template.defaultVisibility === "INTERNAL").length,
      requiresPerformanceGate: templates.filter((template) => template.requiresPerformanceGate).length,
      requiresResponsibleGaming: templates.filter((template) => template.requiresResponsibleGaming).length,
      requiresAffiliateDisclosure: templates.filter((template) => template.requiresAffiliateDisclosure).length,
    },
    sourceSummary: {
      nationalInsidersSeeded: NATIONAL_INSIDERS.length,
      teamBeatDesks: TEAM_BEATS.length,
      teamBeatSlots: TEAM_BEATS.reduce((sum, team) => sum + team.slots, 0),
      airwaveLanes: airwave.summary.lanes,
      airwaveOpen: airwave.summary.open,
      configuredProviders: providers.filter((provider) => provider.configured).length,
      totalProviders: providers.length,
    },
    policy: {
      autoPublishes: false,
      postsToSocial: false,
      sendsUserComms: false,
      exposesSecretValues: false,
      fabricatesReports: false,
    },
  };
}
