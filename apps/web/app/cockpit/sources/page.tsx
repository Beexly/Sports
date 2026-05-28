import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@sports/db";

export const dynamic = "force-dynamic";

export default async function CockpitSourcesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/cockpit");
  }

  const sources = await db.dataSource.findMany({
    orderBy: [{ tier: "asc" }, { slug: "asc" }],
    include: {
      healthEvents: {
        orderBy: { eventAt: "desc" },
        take: 5,
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Source Mesh</h1>
          <p className="mt-1 text-sm text-gray-400">
            {sources.length} registered source{sources.length !== 1 ? "s" : ""}.
            License approval required before any source polls.
          </p>
        </div>
        <Link
          href="/cockpit"
          className="rounded-lg border border-mineral px-3 py-2 text-xs text-gray-300 hover:bg-gray-900/60"
        >
          ← Back
        </Link>
      </div>

      {sources.length === 0 ? (
        <div className="rounded-xl border border-mineral bg-gray-900/40 p-8 text-center">
          <p className="text-sm text-gray-400">
            No sources registered yet. Register via POST /api/cockpit/sources
            with action: &quot;register&quot;.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sources.map((source) => {
            const lastEvent = source.healthEvents[0];
            const isHealthy = !source.circuitOpen && source.consecutiveFails === 0;
            const statusColor = source.circuitOpen
              ? "text-red-400 border-red-900"
              : !source.licenseApproved
                ? "text-yellow-400 border-yellow-900"
                : !source.isActive
                  ? "text-gray-400 border-gray-700"
                  : isHealthy
                    ? "text-emerald-400 border-emerald-900"
                    : "text-orange-400 border-orange-900";

            const statusLabel = source.circuitOpen
              ? "CIRCUIT OPEN"
              : !source.licenseApproved
                ? "NEEDS LICENSE"
                : !source.isActive
                  ? "INACTIVE"
                  : isHealthy
                    ? "HEALTHY"
                    : `${source.consecutiveFails} FAILS`;

            return (
              <div
                key={source.id}
                className="rounded-xl border border-mineral bg-gray-900/40 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-gray-500">
                        Tier {source.tier}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <h2 className="mt-1 text-base font-semibold text-white">
                      {source.displayName}
                    </h2>
                    <p className="text-xs text-gray-500">{source.slug}</p>
                  </div>

                  <div className="shrink-0 text-right text-xs text-gray-500">
                    <p>Poll interval: {source.pollIntervalMs / 1000}s</p>
                    <p>TTL: {source.ttlSeconds}s</p>
                    <p>RPM limit: {source.rateLimitRpm}</p>
                  </div>
                </div>

                {lastEvent && (
                  <div className="mt-3 rounded-lg border border-mineral/50 bg-gray-950/40 px-3 py-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
                      Last event
                    </p>
                    <p className="mt-1 text-xs text-gray-300">
                      <span className="font-mono">{lastEvent.eventType}</span>
                      {lastEvent.latencyMs !== null && (
                        <span className="ml-2 text-gray-500">
                          {lastEvent.latencyMs}ms
                        </span>
                      )}
                      {lastEvent.recordCount !== null && (
                        <span className="ml-2 text-gray-500">
                          {lastEvent.recordCount} records
                        </span>
                      )}
                      {lastEvent.errorMessage && (
                        <span className="ml-2 text-red-400">
                          {lastEvent.errorMessage.slice(0, 80)}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-600">
                      {lastEvent.eventAt.toISOString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
