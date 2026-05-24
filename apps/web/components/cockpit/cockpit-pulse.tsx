import Link from "next/link";
import { headers } from "next/headers";
import * as fs from "fs/promises";
import * as path from "path";

const TELEMETRY_PATH = path.resolve(process.cwd(), "_logs/telemetry.jsonl");
const WINDOW_MS = 86_400_000;

const RATES: Record<string, { in: number; out: number }> = {
  "claude-3-5-haiku-20241022": { in: 0.80, out: 4.00 },
  "claude-3-5-sonnet-20241022": { in: 3.00, out: 15.00 },
  "claude-opus-4-5": { in: 15.00, out: 75.00 },
  "claude-opus-4-20250514": { in: 15.00, out: 75.00 },
};
const DEFAULT_RATE = { in: 3.00, out: 15.00 };

async function readDailyCost(): Promise<number> {
  try {
    const raw = await fs.readFile(TELEMETRY_PATH, "utf8");
    const now = Date.now();
    let total = 0;
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as {
          model: string;
          inputTokens: number;
          outputTokens: number;
          timestamp: string;
        };
        if (now - new Date(entry.timestamp).getTime() >= WINDOW_MS) continue;
        const rate = RATES[entry.model] ?? DEFAULT_RATE;
        total += (entry.inputTokens / 1_000_000) * rate.in;
        total += (entry.outputTokens / 1_000_000) * rate.out;
      } catch {
        // skip malformed lines
      }
    }
    return total;
  } catch {
    return 0;
  }
}

async function readSourceHealth(): Promise<{
  open: number;
  total: number;
  hasWarning: boolean;
  hasBlocking: boolean;
}> {
  try {
    const hdrs = await headers();
    const host = hdrs.get("host") ?? "localhost:3000";
    const proto = host.startsWith("localhost") ? "http" : "https";
    const res = await fetch(`${proto}://${host}/api/cockpit/readiness`, {
      cache: "no-store",
    });
    if (!res.ok) return { open: 0, total: 0, hasWarning: false, hasBlocking: true };
    const json = (await res.json()) as {
      data?: { gates?: Record<string, boolean | string> };
    };
    const gates = json.data?.gates ?? {};
    const entries = Object.values(gates).filter((v) => typeof v === "boolean");
    const total = entries.length;
    const open = entries.filter(Boolean).length;
    return { open, total, hasWarning: open < total, hasBlocking: open === 0 && total > 0 };
  } catch {
    return { open: -1, total: -1, hasWarning: false, hasBlocking: false };
  }
}

export default async function CockpitPulse() {
  const [health, dailyCost] = await Promise.all([readSourceHealth(), readDailyCost()]);

  const healthUnknown = health.open === -1;
  const healthColor = healthUnknown
    ? "bg-gray-700/60 text-gray-400 border-gray-700"
    : health.hasBlocking
    ? "bg-red-950/40 text-red-300 border-red-900/50"
    : health.hasWarning
    ? "bg-yellow-950/40 text-yellow-300 border-yellow-900/50"
    : "bg-green-950/40 text-green-300 border-green-900/50";

  const costColor =
    dailyCost > 5.0
      ? "text-red-300"
      : dailyCost > 4.0
      ? "text-amber-300"
      : "text-gray-400";

  const quickLinks = [
    { label: "Calibration", href: "/cockpit/calibration" },
    { label: "History", href: "/cockpit/history" },
    { label: "Content", href: "/cockpit/content" },
    { label: "Brief", href: "/cockpit/brief" },
    { label: "Memory", href: "/cockpit/pick-memory" },
  ];

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 flex items-center justify-between gap-4 flex-wrap">
      {/* Source Health */}
      <Link href="/cockpit/calibration" className={`rounded-full border px-3 py-1 text-xs font-medium ${healthColor}`}>
        {healthUnknown
          ? "health unknown"
          : `${health.open}/${health.total} gates open`}
      </Link>

      {/* Token Spend */}
      <span className={`text-xs font-mono ${costColor}`}>
        ${dailyCost.toFixed(2)} today
      </span>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2">
        {quickLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full border border-gray-700 bg-gray-800/60 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-700/80 transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
