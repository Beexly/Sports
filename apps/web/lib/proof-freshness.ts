export type ProofSurfaceKey = "methodology" | "loss-room" | "passes" | "ledger";

export type ProofSurfaceFreshnessConfig = {
  surface: ProofSurfaceKey;
  label: string;
  updatedAt: string;
  maxStaleDays: number;
};

export type ProofSurfaceFreshness = ProofSurfaceFreshnessConfig & {
  ageDays: number;
  status: "fresh" | "stale";
};

export const proofSurfaceFreshnessConfig: readonly ProofSurfaceFreshnessConfig[] = [
  {
    surface: "methodology",
    label: "Methodology",
    updatedAt: "2026-05-23T00:00:00.000Z",
    maxStaleDays: 30,
  },
  {
    surface: "loss-room",
    label: "Loss Room",
    updatedAt: "2026-05-23T00:00:00.000Z",
    maxStaleDays: 7,
  },
  {
    surface: "passes",
    label: "Pass List",
    updatedAt: "2026-05-23T00:00:00.000Z",
    maxStaleDays: 7,
  },
  {
    surface: "ledger",
    label: "Ledger",
    updatedAt: "2026-05-23T00:00:00.000Z",
    maxStaleDays: 7,
  },
];

const DAY_MS = 86_400_000;

function calculateAgeDays(updatedAt: string, now: Date): number {
  const updatedTime = new Date(updatedAt).getTime();
  const ageMs = now.getTime() - updatedTime;

  if (!Number.isFinite(updatedTime) || ageMs <= 0) {
    return 0;
  }

  return Math.floor(ageMs / DAY_MS);
}

export function getProofSurfaceFreshness(
  surface: ProofSurfaceKey,
  now = new Date(),
): ProofSurfaceFreshness {
  const config = proofSurfaceFreshnessConfig.find(
    (item) => item.surface === surface,
  );

  if (!config) {
    throw new Error(`Unknown proof surface: ${surface}`);
  }

  const ageDays = calculateAgeDays(config.updatedAt, now);

  return {
    ...config,
    ageDays,
    status: ageDays > config.maxStaleDays ? "stale" : "fresh",
  };
}

export function listProofSurfaceFreshness(now = new Date()) {
  return proofSurfaceFreshnessConfig.map((surface) =>
    getProofSurfaceFreshness(surface.surface, now),
  );
}
