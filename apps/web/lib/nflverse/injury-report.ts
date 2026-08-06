import {
  assertIngestible,
  fetchWithFailover,
  nflverseUrl,
  parseCsv,
  resolveFootballStatsSeason,
  withMirrors,
} from "@sports/data-ingestion";

/**
 * NFL injury report — official team-submitted availability designations
 * (Out / Doubtful / Questionable) and practice status, read-only from the
 * openly-licensed nflverse `injuries` release (CC-BY-4.0).
 *
 * Integrity:
 *   - playerId is source `gsis_id` only (never invented).
 *   - Default season is the completed REG floor (through 2025 until a newer
 *     injuries file exists). Missing current-season file → try prior season
 *     with an explicit note, or empty state — never fabricate designations.
 *   - Upstream as of 2026-08: injuries_2026.csv often 404; 2025 remains the
 *     honest last complete report season for product surfaces.
 */

export type ReportStatus = "Out" | "Doubtful" | "Questionable" | "Other";

export interface InjuryRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly position: string;
  readonly reportStatus: ReportStatus;
  readonly reportStatusRaw: string;
  readonly primaryInjury: string;
  readonly practiceStatus: string;
}

export interface NflverseInjuryReport {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly week: number | null;
  readonly sourceRows: number;
  readonly counts: { readonly out: number; readonly doubtful: number; readonly questionable: number };
  readonly rows: readonly InjuryRow[];
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
  /** True when the served season differs from the requested/default season. */
  readonly usedFallbackSeason?: boolean;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const SEVERITY: Record<ReportStatus, number> = { Out: 0, Doubtful: 1, Questionable: 2, Other: 3 };
const MAX_ROWS = 160;

let injuryCache: { readonly expiresAt: number; readonly value: NflverseInjuryReport } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function classifyStatus(raw: string): ReportStatus {
  const v = raw.trim().toLowerCase();
  if (v === "out") return "Out";
  if (v === "doubtful") return "Doubtful";
  if (v === "questionable") return "Questionable";
  return "Other";
}

async function fetchCsv(url: string, fetcher: FetchLike, timeoutMs: number): Promise<readonly CsvRecord[]> {
  const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
  return parseCsv(await response.text()).records;
}

export function resetInjuryReportCacheForTests(): void {
  injuryCache = null;
}

export async function loadNflverseInjuryReport({
  season,
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
  now = new Date(),
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
  now?: Date;
} = {}): Promise<NflverseInjuryReport> {
  assertIngestible("nflverse");

  const resolved =
    season !== undefined
      ? { season, reason: "caller override" }
      : resolveFootballStatsSeason(now);
  const requestedSeason = resolved.season;

  const cacheNow = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && injuryCache && injuryCache.expiresAt > cacheNow) {
    return injuryCache.value;
  }

  // Per-season files; fall back one year if the requested season isn't published.
  const candidates = [requestedSeason, requestedSeason - 1];
  let lastError: unknown = null;

  for (const candidate of candidates) {
    const url = nflverseUrl("injuries", candidate);
    try {
      const records = await fetchCsv(url, fetcher, timeoutMs);
      if (records.length === 0) throw new Error("empty injuries file");

      const week = records.reduce((max, row) => Math.max(max, toNumber(row["week"])), 0);
      const latest = records.filter((row) => toNumber(row["week"]) === week);

      const rows: InjuryRow[] = latest
        .map((row): InjuryRow => {
          const reportStatusRaw = row["report_status"] ?? "";
          return {
            playerId: row["gsis_id"] ?? "",
            playerName:
              row["full_name"] ||
              `${row["first_name"] ?? ""} ${row["last_name"] ?? ""}`.trim() ||
              "UNKNOWN",
            team: row["team"] ?? "",
            position: row["position"] ?? "",
            reportStatus: classifyStatus(reportStatusRaw),
            reportStatusRaw,
            primaryInjury: row["report_primary_injury"] || row["practice_primary_injury"] || "",
            practiceStatus: row["practice_status"] ?? "",
          };
        })
        .filter((row) => row.reportStatus !== "Other" || row.practiceStatus.trim() !== "")
        .sort(
          (a, b) =>
            SEVERITY[a.reportStatus] - SEVERITY[b.reportStatus] ||
            a.team.localeCompare(b.team) ||
            a.playerName.localeCompare(b.playerName),
        )
        .slice(0, MAX_ROWS);

      const counts = {
        out: rows.filter((r) => r.reportStatus === "Out").length,
        doubtful: rows.filter((r) => r.reportStatus === "Doubtful").length,
        questionable: rows.filter((r) => r.reportStatus === "Questionable").length,
      };

      const usedFallbackSeason = candidate !== requestedSeason;
      const note = usedFallbackSeason
        ? `Serving season ${candidate} injury designations (requested/default ${requestedSeason} file missing or empty upstream). Official team-submitted facts from the latest week in that file — not a prediction of who will play, and not current-season invents.`
        : "Official team-submitted injury designations as published, from the latest week in the source file. These are reported facts, not a prediction of availability.";

      const value: NflverseInjuryReport = {
        generatedAt: new Date().toISOString(),
        status: "live",
        season: candidate,
        week: week || null,
        sourceRows: records.length,
        counts,
        rows,
        note,
        sourceUrl: url,
        error: null,
        usedFallbackSeason,
      };
      if (cacheTtlMs > 0 && fetcher === fetch) injuryCache = { expiresAt: cacheNow + cacheTtlMs, value };
      return value;
    } catch (error) {
      lastError = error;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season: requestedSeason,
    week: null,
    sourceRows: 0,
    counts: { out: 0, doubtful: 0, questionable: 0 },
    rows: [],
    note:
      "The injury report could not load for the requested season or the prior season. Empty state shown — no fabricated Out/Doubtful/Questionable designations. Upstream injuries files are per-season; 2026 may be unpublished until in-season reports begin.",
    sourceUrl: nflverseUrl("injuries", requestedSeason),
    error: lastError instanceof Error ? lastError.message : "UNKNOWN",
    usedFallbackSeason: false,
  };
}
