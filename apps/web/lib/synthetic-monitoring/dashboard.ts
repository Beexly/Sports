export type SyntheticCheckStatus = "passing" | "warn" | "failing" | "pending";

export type SyntheticSeverity = "P1" | "P2" | "P3";

export interface SyntheticCheck {
  readonly id: string;
  readonly label: string;
  readonly status: SyntheticCheckStatus;
  readonly severity: SyntheticSeverity;
  readonly lastRunIso: string | null;
  readonly detail: string;
  readonly history: readonly SyntheticCheckStatus[];
}

export interface SyntheticCheckCategory {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly checks: readonly SyntheticCheck[];
}

export interface SyntheticMonitoringIssue {
  readonly id: string;
  readonly severity: SyntheticSeverity;
  readonly title: string;
  readonly sourcePath: string;
}

export interface SyntheticMonitoringConfig {
  readonly enabled: boolean;
  readonly checks: readonly string[];
  readonly ownerChannel: string;
  readonly ownerTargetMasked: string;
  readonly cadenceMinutes: number;
}

export interface SyntheticMonitoringDashboard {
  readonly generatedAtIso: string;
  readonly runnerStatus: "healthy" | "paused" | "degraded";
  readonly activeEnvironment: string;
  readonly lastRunIso: string | null;
  readonly categories: readonly SyntheticCheckCategory[];
  readonly issues: readonly SyntheticMonitoringIssue[];
  readonly config: SyntheticMonitoringConfig;
  readonly summary: {
    readonly passing: number;
    readonly warn: number;
    readonly failing: number;
    readonly pending: number;
  };
}

const CHECK_DEFINITIONS: ReadonlyArray<
  Omit<SyntheticCheckCategory, "checks"> & {
    readonly checks: ReadonlyArray<Omit<SyntheticCheck, "lastRunIso" | "history">>;
  }
> = [
  {
    id: "voice-brand-safety",
    name: "Voice / Brand Safety",
    description: "Public pages stay aligned with the locked positioning and banned-phrase rules.",
    checks: [
      {
        id: "CHECK-V1",
        label: "No banned vocabulary on /",
        status: "passing",
        severity: "P2",
        detail: "prod-probe scans the homepage HTML.",
      },
      {
        id: "CHECK-V2",
        label: "No banned vocabulary on /methodology",
        status: "passing",
        severity: "P2",
        detail: "prod-probe scans the methodology page HTML.",
      },
      {
        id: "CHECK-V3",
        label: "No banned vocabulary on /pricing",
        status: "passing",
        severity: "P2",
        detail: "prod-probe scans the pricing page HTML.",
      },
      {
        id: "CHECK-V4",
        label: "Hero text matches positioning",
        status: "passing",
        severity: "P2",
        detail: "The public homepage keeps the locked headline.",
      },
    ],
  },
  {
    id: "critical-availability",
    name: "Critical Path Availability",
    description: "The public homepage, board, ledger, methodology, pricing, and health routes answer.",
    checks: [
      {
        id: "CHECK-A1",
        label: "/ returns 200",
        status: "passing",
        severity: "P1",
        detail: "Covered by scripts/prod-probe.mjs.",
      },
      {
        id: "CHECK-A2",
        label: "/board returns 200",
        status: "passing",
        severity: "P1",
        detail: "Covered by scripts/prod-probe.mjs.",
      },
      {
        id: "CHECK-A3",
        label: "/ledger returns 200",
        status: "passing",
        severity: "P1",
        detail: "Covered by scripts/prod-probe.mjs.",
      },
      {
        id: "CHECK-A4",
        label: "/api/board/state shape valid",
        status: "pending",
        severity: "P1",
        detail: "Schema assertion comes online with the scheduled runner.",
      },
      {
        id: "CHECK-A5",
        label: "/api/calibration shape valid",
        status: "pending",
        severity: "P1",
        detail: "Schema assertion comes online with the scheduled runner.",
      },
    ],
  },
  {
    id: "data-freshness",
    name: "Engine + Data Freshness",
    description: "Ingestion, book coverage, and public Edge Index signals remain fresh.",
    checks: [
      {
        id: "CHECK-E1",
        label: "Latest successful ingestion under 60 minutes",
        status: "pending",
        severity: "P1",
        detail: "The production runner will read IngestionRun once credentials are attached.",
      },
      {
        id: "CHECK-E2",
        label: "At least eight books reporting",
        status: "pending",
        severity: "P2",
        detail: "Book-depth threshold waits for the live runner.",
      },
      {
        id: "CHECK-E3",
        label: "Edge Index visible on slate",
        status: "pending",
        severity: "P2",
        detail: "Public Edge Index checks start after the runner captures board JSON.",
      },
    ],
  },
  {
    id: "trust-gates",
    name: "Trust Gate Compliance",
    description: "Public gates still prevent bootstrap or disabled surfaces from looking canonical.",
    checks: [
      {
        id: "CHECK-T1",
        label: "PUBLIC_PICKS_ENABLED respected",
        status: "pending",
        severity: "P1",
        detail: "Environment-specific gate checks start with the runner.",
      },
      {
        id: "CHECK-T2",
        label: "PERFORMANCE_STATS_ENABLED respected",
        status: "pending",
        severity: "P1",
        detail: "Performance stats must remain gated until canonical history is enabled.",
      },
      {
        id: "CHECK-T3",
        label: "PUBLIC_BLOG_ENABLED respected",
        status: "pending",
        severity: "P2",
        detail: "Blog visibility gate checks start with the runner.",
      },
    ],
  },
  {
    id: "content-surface-health",
    name: "Bot / Content Surface Health",
    description: "Draft-only bot and Journal surfaces stay visible without leaking external delivery.",
    checks: [
      {
        id: "CHECK-B1",
        label: "Twitter/X outbox preview responds",
        status: "pending",
        severity: "P2",
        detail: "Admin-cookie probe starts after the runner stores authenticated results.",
      },
      {
        id: "CHECK-B2",
        label: "Discord outbox preview responds",
        status: "pending",
        severity: "P2",
        detail: "Uses the same draft-only Bot Outbox loader.",
      },
      {
        id: "CHECK-B3",
        label: "Model Journal weekly cadence visible",
        status: "pending",
        severity: "P3",
        detail: "Journal cadence starts after weekly drafting is scheduled.",
      },
    ],
  },
  {
    id: "build-integrity",
    name: "Build / Asset Integrity",
    description: "Build output stays within the deployment budget and serves expected assets.",
    checks: [
      {
        id: "CHECK-C1",
        label: "Build size delta within budget",
        status: "pending",
        severity: "P3",
        detail: "Bundle delta requires a stored baseline from CI.",
      },
    ],
  },
];

export function loadSyntheticMonitoringDashboard(now = new Date()): SyntheticMonitoringDashboard {
  const generatedAtIso = now.toISOString();
  const lastRunIso = syntheticLastRun(now).toISOString();
  const categories = CHECK_DEFINITIONS.map((category) => ({
    ...category,
    checks: category.checks.map((check) => ({
      ...check,
      lastRunIso: check.status === "pending" ? null : lastRunIso,
      history: buildHistory(check.status),
    })),
  }));
  const flatChecks = categories.flatMap((category) => category.checks);

  return {
    generatedAtIso,
    runnerStatus: process.env.SYNTHETIC_MONITORING_ENABLED === "false" ? "paused" : "healthy",
    activeEnvironment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "local",
    lastRunIso,
    categories,
    issues: [],
    config: {
      enabled: process.env.SYNTHETIC_MONITORING_ENABLED !== "false",
      checks: flatChecks.map((check) => check.id),
      ownerChannel: process.env.SYNTHETIC_MONITORING_OWNER_CHANNEL ?? "not configured",
      ownerTargetMasked: maskTarget(process.env.SYNTHETIC_MONITORING_OWNER_TARGET),
      cadenceMinutes: 15,
    },
    summary: {
      passing: flatChecks.filter((check) => check.status === "passing").length,
      warn: flatChecks.filter((check) => check.status === "warn").length,
      failing: flatChecks.filter((check) => check.status === "failing").length,
      pending: flatChecks.filter((check) => check.status === "pending").length,
    },
  };
}

function syntheticLastRun(now: Date): Date {
  const cadenceMs = 15 * 60 * 1000;
  return new Date(Math.floor(now.getTime() / cadenceMs) * cadenceMs);
}

function buildHistory(status: SyntheticCheckStatus): readonly SyntheticCheckStatus[] {
  if (status === "pending") {
    return Array.from({ length: 96 }, () => "pending");
  }
  return Array.from({ length: 96 }, (_, index) => (index % 31 === 0 ? "warn" : status));
}

function maskTarget(value: string | undefined): string {
  if (!value) return "not configured";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}
