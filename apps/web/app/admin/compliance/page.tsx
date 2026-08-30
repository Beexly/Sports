import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CONTROL_LIBRARY, type ControlCheckResult } from "@sports/compliance";
import { listOpenExceptions, loadLastRun } from "@/lib/compliance/store";

// Segment-level admin gate already lives in apps/web/app/admin/layout.tsx
// (session.user.role === "ADMIN", redirect("/") otherwise). This inline
// check is defense-in-depth, matching the convention every other /admin/*
// page in this tree uses (see apps/web/app/admin/page.tsx).
export default async function CompliancePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [lastRun, openExceptions] = await Promise.all([
    loadLastRun(),
    listOpenExceptions(50),
  ]);

  const lastResults: ControlCheckResult[] = Array.isArray(lastRun?.results)
    ? (lastRun.results as unknown as ControlCheckResult[])
    : [];
  const resultsByControl = new Map<string, ControlCheckResult[]>();
  for (const result of lastResults) {
    const bucket = resultsByControl.get(result.controlId) ?? [];
    bucket.push(result);
    resultsByControl.set(result.controlId, bucket);
  }

  return (
    <div className="min-h-screen bg-obsidian p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-ion-white mb-2">Compliance Control Monitor</h1>
          <p className="text-ion-2 text-sm max-w-3xl">
            Internal alignment tooling only. This page does not represent a SOC 2 report or
            an ISO 27001 certificate — see docs/compliance/README.md for the full disclaimer.
          </p>
        </div>

        <div className="bg-carbon border border-titanium rounded-xl p-6">
          <h2 className="text-xl font-semibold text-ion-white mb-4">Last CCM run</h2>
          {lastRun ? (
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${lastRun.ok ? "bg-verify" : "bg-alert"}`} />
              <span className="text-ion-1">
                <strong className="text-ion-white">{lastRun.ok ? "OK" : "FAILING"}</strong>
              </span>
              <span className="text-ion-3 text-sm">{lastRun.at.toLocaleString()}</span>
            </div>
          ) : (
            <p className="text-ion-2">No CCM run has been recorded yet.</p>
          )}
        </div>

        <div className="bg-carbon border border-titanium rounded-xl p-6">
          <h2 className="text-xl font-semibold text-ion-white mb-4">Controls (last run status)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-ion-3 border-b border-titanium">
                  <th className="py-2 pr-4">Control</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Detail</th>
                </tr>
              </thead>
              <tbody>
                {CONTROL_LIBRARY.map((control) => {
                  const checks = resultsByControl.get(control.id) ?? [];
                  const ok = checks.length > 0 ? checks.every((c) => c.ok) : null;
                  const detail = checks.map((c) => c.detail).join("; ") || "No result in last run";
                  return (
                    <tr key={control.id} className="border-b border-titanium/40">
                      <td className="py-2 pr-4 text-ion-white font-mono text-xs">{control.id}</td>
                      <td className="py-2 pr-4 text-ion-1">{control.title}</td>
                      <td className="py-2 pr-4">
                        {ok === null ? (
                          <span className="text-ion-3">unknown</span>
                        ) : ok ? (
                          <span className="text-verify">pass</span>
                        ) : (
                          <span className="text-alert">fail</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-ion-2">{detail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-carbon border border-titanium rounded-xl p-6">
          <h2 className="text-xl font-semibold text-ion-white mb-4">Open exceptions</h2>
          {openExceptions.length === 0 ? (
            <p className="text-ion-2">No open exceptions.</p>
          ) : (
            <ul className="space-y-2">
              {openExceptions.map((exception) => (
                <li key={exception.id} className="text-sm text-ion-1">
                  <span className="font-mono text-xs text-ion-white">{exception.controlId}</span>
                  {" — "}
                  {exception.detail}
                  <span className="text-ion-3 text-xs ml-2">{exception.createdAt.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
