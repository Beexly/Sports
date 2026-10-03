import { getSource } from "@sports/data-ingestion";

/**
 * DFS salary ingestion — the LEGAL, MULTI-SOURCE route to DraftKings salaries.
 *
 * DraftKings' Terms of Use bar automated commercial collection of their data, so
 * we do NOT scrape DK's hidden API (declared `forbidden` in the source registry).
 * DK salaries flow through LICENSED DFS data providers. Because these are
 * third-party feeds of unofficial-to-us data, we pull from EVERY configured
 * provider in parallel and RECONCILE them: a salary is trusted when providers
 * agree, and any disagreement is flagged rather than silently picked. One feed
 * can be stale or wrong; cross-checked feeds keep the number accurate and current.
 *
 * Configure one or more provider keys (a founder spend/legal decision) and the
 * board lights up; until then it stays honestly gated.
 */

export type ProviderId = "sportsdataio" | "fantasydata";

interface ProviderConfig {
  readonly id: ProviderId;
  readonly label: string;
  readonly envVar: string;
  readonly baseUrl: string;
}

const PROVIDERS: readonly ProviderConfig[] = [
  { id: "sportsdataio", label: "SportsDataIO", envVar: "SPORTSDATAIO_API_KEY", baseUrl: "https://api.sportsdata.io" },
  { id: "fantasydata", label: "FantasyData", envVar: "FANTASYDATA_API_KEY", baseUrl: "https://api.fantasydata.net" },
];

// Salaries within this fraction of each other are treated as agreement.
const AGREEMENT_TOLERANCE = 0.02;
const TOP_N = 80;

export interface DfsProviderStatus {
  readonly id: ProviderId;
  readonly label: string;
  readonly status: "live" | "error" | "not-configured";
  readonly rowCount: number;
  readonly error: string | null;
}

export interface DfsSalaryRow {
  readonly name: string;
  readonly team: string;
  readonly position: string;
  /** Consensus salary (median across reporting providers). */
  readonly salary: number;
  readonly salariesByProvider: Readonly<Record<string, number>>;
  readonly providerCount: number;
  /** single = one source; agree = sources within tolerance; disagree = mismatch flagged. */
  readonly agreement: "single" | "agree" | "disagree";
  readonly spread: number;
}

export interface DfsSalaries {
  readonly generatedAt: string;
  readonly status: "live" | "gated" | "source-error";
  readonly operator: "DraftKings";
  readonly date: string;
  readonly providers: readonly DfsProviderStatus[];
  readonly connectedProviders: number;
  readonly rows: readonly DfsSalaryRow[];
  readonly discrepancies: number;
  readonly canPublishPicks: false;
  readonly gate: {
    readonly connected: boolean;
    readonly requiredEnv: readonly string[];
    readonly legalNote: string;
    readonly refusedNote: string;
    readonly licensedProviders: readonly string[];
  };
  readonly error: string | null;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface SlatePlayer {
  readonly OperatorPlayerName?: string;
  readonly OperatorPosition?: string;
  readonly OperatorSalary?: number | null;
  readonly Team?: string | null;
}
interface Slate {
  readonly Operator?: string;
  readonly DfsSlatePlayers?: readonly SlatePlayer[];
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

let cache: { readonly expiresAt: number; readonly value: DfsSalaries } | null = null;

function sportsDataDate(d: Date): string {
  return `${d.getUTCFullYear()}-${MONTHS[d.getUTCMonth()]}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!;
}

function gateInfo(connected: boolean): DfsSalaries["gate"] {
  return {
    connected,
    requiredEnv: PROVIDERS.map((p) => p.envVar),
    legalNote:
      "DraftKings salaries are ingested only through licensed DFS data providers. Configure one or more provider keys; with two or more, salaries are cross-checked for accuracy.",
    refusedNote:
      getSource("draftkings-unofficial")?.reason ??
      "We do not scrape DraftKings' hidden API; their Terms of Use prohibit automated commercial collection.",
    licensedProviders: PROVIDERS.map((p) => p.id),
  };
}

function parseDraftKingsRows(slates: readonly Slate[]): Map<string, { name: string; team: string; position: string; salary: number }> {
  const out = new Map<string, { name: string; team: string; position: string; salary: number }>();
  for (const slate of slates) {
    if ((slate.Operator ?? "").toLowerCase() !== "draftkings") continue;
    for (const player of slate.DfsSlatePlayers ?? []) {
      const name = player.OperatorPlayerName?.trim();
      const salary = typeof player.OperatorSalary === "number" ? player.OperatorSalary : 0;
      if (!name || salary <= 0) continue;
      const key = `${name.toLowerCase()}|${(player.Team ?? "").toLowerCase()}`;
      const prev = out.get(key);
      if (!prev || salary > prev.salary) {
        out.set(key, { name, team: player.Team ?? "", position: player.OperatorPosition ?? "", salary });
      }
    }
  }
  return out;
}

async function fetchProvider(
  provider: ProviderConfig,
  key: string,
  date: string,
  fetcher: FetchLike,
): Promise<Map<string, { name: string; team: string; position: string; salary: number }>> {
  const url = `${provider.baseUrl}/v3/nfl/projections/json/DfsSlatesByDate/${date}?key=${key}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetcher(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`${provider.label} feed failed (${response.status})`);
    const slates = (await response.json()) as Slate[];
    return parseDraftKingsRows(slates);
  } finally {
    clearTimeout(timer);
  }
}

function reconcile(
  perProvider: ReadonlyArray<{ id: ProviderId; rows: Map<string, { name: string; team: string; position: string; salary: number }> }>,
): DfsSalaryRow[] {
  const merged = new Map<
    string,
    { name: string; team: string; position: string; byProvider: Record<string, number> }
  >();
  for (const { id, rows } of perProvider) {
    for (const [key, row] of rows) {
      const entry = merged.get(key) ?? { name: row.name, team: row.team, position: row.position, byProvider: {} };
      entry.byProvider[id] = row.salary;
      if (!entry.position && row.position) entry.position = row.position;
      merged.set(key, entry);
    }
  }

  const result: DfsSalaryRow[] = [];
  for (const entry of merged.values()) {
    const salaries = Object.values(entry.byProvider);
    const min = Math.min(...salaries);
    const max = Math.max(...salaries);
    const spread = max - min;
    const consensus = median(salaries);
    const agreement: DfsSalaryRow["agreement"] =
      salaries.length < 2 ? "single" : spread <= max * AGREEMENT_TOLERANCE ? "agree" : "disagree";
    result.push({
      name: entry.name,
      team: entry.team,
      position: entry.position,
      salary: consensus,
      salariesByProvider: entry.byProvider,
      providerCount: salaries.length,
      agreement,
      spread,
    });
  }
  return result.sort((a, b) => b.salary - a.salary).slice(0, TOP_N);
}

export function resetDfsSalariesCacheForTests(): void {
  cache = null;
}

export async function loadDfsSalaries({
  date,
  keys,
  fetcher = fetch,
  cacheTtlMs = 30 * 60 * 1000,
  now = new Date(),
}: {
  date?: string;
  /** Override provider keys (tests). Defaults to reading each provider's env var. */
  keys?: Partial<Record<ProviderId, string | undefined>>;
  fetcher?: FetchLike;
  cacheTtlMs?: number;
  now?: Date;
} = {}): Promise<DfsSalaries> {
  const nowMs = now.getTime();
  const live = fetcher === fetch;
  if (cacheTtlMs > 0 && live && cache && cache.expiresAt > nowMs) {
    return cache.value;
  }

  const resolvedDate = date ?? sportsDataDate(now);
  const configured = PROVIDERS.map((p) => ({
    provider: p,
    key: keys?.[p.id] ?? process.env[p.envVar],
  }));
  const connected = configured.filter((c) => Boolean(c.key));

  if (connected.length === 0) {
    return {
      generatedAt: now.toISOString(),
      status: "gated",
      operator: "DraftKings",
      date: resolvedDate,
      providers: PROVIDERS.map((p) => ({ id: p.id, label: p.label, status: "not-configured", rowCount: 0, error: null })),
      connectedProviders: 0,
      rows: [],
      discrepancies: 0,
      canPublishPicks: false,
      gate: gateInfo(false),
      error: null,
    };
  }

  const settled = await Promise.allSettled(
    connected.map((c) => fetchProvider(c.provider, c.key!, resolvedDate, fetcher)),
  );

  const statuses: DfsProviderStatus[] = [];
  const okProviders: Array<{ id: ProviderId; rows: Map<string, { name: string; team: string; position: string; salary: number }> }> = [];
  connected.forEach((c, i) => {
    const r = settled[i]!;
    if (r.status === "fulfilled") {
      statuses.push({ id: c.provider.id, label: c.provider.label, status: "live", rowCount: r.value.size, error: null });
      okProviders.push({ id: c.provider.id, rows: r.value });
    } else {
      statuses.push({
        id: c.provider.id,
        label: c.provider.label,
        status: "error",
        rowCount: 0,
        error: r.reason instanceof Error ? r.reason.message : "UNKNOWN",
      });
    }
  });
  // Providers that weren't configured are reported as not-configured.
  for (const p of PROVIDERS) {
    if (!connected.some((c) => c.provider.id === p.id)) {
      statuses.push({ id: p.id, label: p.label, status: "not-configured", rowCount: 0, error: null });
    }
  }

  const rows = reconcile(okProviders);
  const discrepancies = rows.filter((r) => r.agreement === "disagree").length;
  const anyLive = okProviders.length > 0;

  const value: DfsSalaries = {
    generatedAt: now.toISOString(),
    status: anyLive ? "live" : "source-error",
    operator: "DraftKings",
    date: resolvedDate,
    providers: statuses,
    connectedProviders: connected.length,
    rows,
    discrepancies,
    canPublishPicks: false,
    gate: gateInfo(true),
    error: anyLive ? null : "All configured DFS providers failed.",
  };
  if (cacheTtlMs > 0 && live && anyLive) cache = { expiresAt: nowMs + cacheTtlMs, value };
  return value;
}
