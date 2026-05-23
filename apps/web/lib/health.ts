export type HealthReport = {
  ok: true;
  service: "galaxy-sports-edge-web";
  checkedAt: string;
  environment: string;
  gitSha: string | null;
};

export function buildHealthReport(
  now = new Date(),
  env: Record<string, string | undefined> = process.env,
): HealthReport {
  return {
    ok: true,
    service: "galaxy-sports-edge-web",
    checkedAt: now.toISOString(),
    environment: env.VERCEL_ENV ?? env.NODE_ENV ?? "unknown",
    gitSha: env.VERCEL_GIT_COMMIT_SHA ?? null,
  };
}
