/**
 * Release Candidate State Machine.
 *
 * Distinct from `lib/galaxy/kernel/launch-modes.ts` (which controls
 * runtime capability gates) — this layer encodes the maturity stage
 * of the release itself.
 *
 * A release state is what the operator picks. The launch mode is the
 * derived runtime posture.
 *
 * Set via env: `GALAXY_RELEASE_STATE`. Default: `internal-calibration`.
 *
 * See docs/ops/RELEASE_CANDIDATE_STATE.md and docs/ops/contingency/
 * for the surrounding playbooks.
 */

export type ReleaseState =
  | "development"
  | "internal-calibration"
  | "preview"
  | "private-beta"
  | "public-demo"
  | "release-candidate"
  | "production";

export interface ReleaseStateCapabilities {
  readonly state: ReleaseState;
  /** Public picks render on /picks and /today. */
  readonly publicPicks: boolean;
  /** Live odds feed wired and rendering. */
  readonly liveOdds: boolean;
  /** Performance stats surface allowed to display. */
  readonly performanceStats: boolean;
  /** Stripe payment paths active. */
  readonly payments: boolean;
  /** Telemetry events actually ingested vs no-oped. */
  readonly telemetry: boolean;
  /** Coach shell visible. */
  readonly coachShell: boolean;
  /** Coach uses live AI (vs canned responses). */
  readonly coachLiveAi: boolean;
  /** Reports surface renders to public. */
  readonly reports: boolean;
  /** Command Center accessible to public. */
  readonly commandCenter: boolean;
  /** Galaxy Demo tour route accessible. */
  readonly demoMode: boolean;
  /** OG artifact endpoints render to public. */
  readonly artifacts: boolean;
  /** Sitemap and robots.txt allow indexing. */
  readonly robotsIndex: boolean;
  /** Source maps shipped in browser bundles. */
  readonly sourceMaps: boolean;
  /** Admin / cockpit surfaces visible to authenticated admins. */
  readonly adminVisible: boolean;
  /** Detailed error pages with stack traces visible. */
  readonly verboseErrors: boolean;
  /** Cron jobs run scheduled tasks. */
  readonly cron: boolean;
  /** Studio surfaces accessible to operator. */
  readonly studio: boolean;
  /** Promotional copy / CTAs allowed on public surfaces. */
  readonly promotions: boolean;
  /** Sitemap includes commercial routes. */
  readonly sitemapPublic: boolean;
}

const DEFAULT_CAPABILITIES: Omit<ReleaseStateCapabilities, "state"> = {
  publicPicks: false,
  liveOdds: false,
  performanceStats: false,
  payments: false,
  telemetry: false,
  coachShell: false,
  coachLiveAi: false,
  reports: false,
  commandCenter: false,
  demoMode: false,
  artifacts: false,
  robotsIndex: false,
  sourceMaps: false,
  adminVisible: false,
  verboseErrors: false,
  cron: false,
  studio: false,
  promotions: false,
  sitemapPublic: false,
};

export const RELEASE_STATE_CAPABILITIES: Readonly<Record<ReleaseState, ReleaseStateCapabilities>> = {
  development: {
    ...DEFAULT_CAPABILITIES,
    state: "development",
    coachShell: true,
    commandCenter: true,
    demoMode: true,
    artifacts: true,
    adminVisible: true,
    verboseErrors: true,
    cron: false,
    studio: true,
    sourceMaps: true,
  },
  "internal-calibration": {
    ...DEFAULT_CAPABILITIES,
    state: "internal-calibration",
    coachShell: true,
    commandCenter: true,
    demoMode: true,
    artifacts: true,
    adminVisible: true,
    verboseErrors: false,
    cron: true,
    studio: true,
  },
  preview: {
    ...DEFAULT_CAPABILITIES,
    state: "preview",
    publicPicks: false,
    liveOdds: false,
    telemetry: true,
    coachShell: true,
    commandCenter: true,
    demoMode: true,
    artifacts: true,
    cron: true,
    studio: true,
    adminVisible: true,
  },
  "private-beta": {
    ...DEFAULT_CAPABILITIES,
    state: "private-beta",
    publicPicks: true,
    liveOdds: true,
    performanceStats: true,
    telemetry: true,
    coachShell: true,
    commandCenter: true,
    demoMode: true,
    artifacts: true,
    reports: true,
    cron: true,
    studio: true,
    adminVisible: true,
  },
  "public-demo": {
    ...DEFAULT_CAPABILITIES,
    state: "public-demo",
    publicPicks: false,
    telemetry: true,
    coachShell: true,
    commandCenter: true,
    demoMode: true,
    artifacts: true,
    reports: false,
    sitemapPublic: true,
    cron: true,
    promotions: true,
  },
  "release-candidate": {
    ...DEFAULT_CAPABILITIES,
    state: "release-candidate",
    publicPicks: true,
    liveOdds: true,
    performanceStats: true,
    payments: false,
    telemetry: true,
    coachShell: true,
    coachLiveAi: false,
    commandCenter: true,
    reports: true,
    artifacts: true,
    cron: true,
    studio: true,
    adminVisible: true,
  },
  production: {
    ...DEFAULT_CAPABILITIES,
    state: "production",
    publicPicks: true,
    liveOdds: true,
    performanceStats: true,
    payments: true,
    telemetry: true,
    coachShell: true,
    coachLiveAi: false, // remains false until C65 readiness pass
    commandCenter: true,
    reports: true,
    artifacts: true,
    robotsIndex: true,
    sitemapPublic: true,
    cron: true,
    studio: true,
    promotions: true,
  },
};

const KNOWN_STATES: ReadonlySet<string> = new Set<string>(Object.keys(RELEASE_STATE_CAPABILITIES));

export function isReleaseState(value: string): value is ReleaseState {
  return KNOWN_STATES.has(value);
}

/** Read the active release state from env. Defaults to internal-calibration. */
export function getActiveReleaseState(): ReleaseState {
  const raw = process.env.GALAXY_RELEASE_STATE;
  if (raw && isReleaseState(raw)) return raw;
  return "internal-calibration";
}

/** Read the capability map for the active release state. */
export function getActiveReleaseCapabilities(): ReleaseStateCapabilities {
  return RELEASE_STATE_CAPABILITIES[getActiveReleaseState()];
}

/** Invariants the matrix must satisfy. Used by tests. */
export function assertReleaseStateInvariants(): void {
  for (const state of Object.keys(RELEASE_STATE_CAPABILITIES) as ReleaseState[]) {
    const caps = RELEASE_STATE_CAPABILITIES[state];
    // Coach live AI defaults to false everywhere until C65 owner approval.
    if (caps.coachLiveAi) {
      throw new Error(`coachLiveAi must default to false at RC; offender: ${state}`);
    }
    // Payments off everywhere except release-candidate (off) and production (on).
    if (caps.payments && state !== "production") {
      throw new Error(`payments may only default true in production; offender: ${state}`);
    }
    // Public picks off in internal-calibration and development.
    if (caps.publicPicks && (state === "development" || state === "internal-calibration")) {
      throw new Error(`publicPicks must default false in ${state}`);
    }
  }
}
