import { assertIngestible, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

/**
 * NFL injury report — the official team-submitted availability designations
 * (Out / Doubtful / Questionable) and practice status, read-only from the
 * openly-licensed nflverse `injuries` release (CC-BY-4.0). Availability is the
 * single highest-value non-market driver of game outcomes. These are reported
 * facts as published by teams — not our prediction of who will play.
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

/**
 * The regular/post-season marker. The nflreadr dictionary documents this as
 * `season_type`, but the published release CSV ships the column as `game_type`
 * (both carry REG / POST). We read either so the filter is robust to the name.
 */
function seasonType(row: CsvRecord): string {
  return (row["season_type"] ?? row["game_type"] ?? "").trim().toUpperCase();
}

async function fetchCsv(url: string, fetcher: FetchLike, timeoutMs: number): Promise<readonly CsvRecord[]> {
  const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
  return parseCsv(await response.text()).records;
}

export function resetInjuryReportCacheForTests(): void {
  injuryCache = null;
}

export async function loadNflverseInjuryReport({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflverseInjuryReport> {
  assertIngestible("nflverse");

  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && injuryCache && injuryCache.expiresAt > now) {
    return injuryCache.value;
  }

  // injuries are per-season files; fall back one year if the requested season isn't published.
  const candidates = [season, season - 1];
  let lastError: unknown = null;

  for (const candidate of candidates) {
    const url = nflverseUrl("injuries", candidate);
    try {
      const records = await fetchCsv(url, fetcher, timeoutMs);
      if (records.length === 0) throw new Error("empty injuries file");

      // Restrict to REGULAR-season rows before picking the "latest week". In the
      // offseason the source file's max week is a POST week (19-22, only the few
      // playoff teams), which would silently blank availability for every other
      // team downstream. If the file carries no season-type marker at all we fall
      // back to every row rather than emptying the report.
      const regular = records.filter((row) => seasonType(row) === "REG");
      const scoped = regular.length > 0 ? regular : records;

      const week = scoped.reduce((max, row) => Math.max(max, toNumber(row["week"])), 0);
      const latest = scoped.filter((row) => toNumber(row["week"]) === week);

      const rows: InjuryRow[] = latest
        .map((row): InjuryRow => {
          const reportStatusRaw = row["report_status"] ?? "";
          return {
            playerId: row["gsis_id"] ?? "",
            playerName: row["full_name"] || `${row["first_name"] ?? ""} ${row["last_name"] ?? ""}`.trim() || "UNKNOWN",
            team: row["team"] ?? "",
            position: row["position"] ?? "",
            reportStatus: classifyStatus(reportStatusRaw),
            reportStatusRaw,
            primaryInjury: row["report_primary_injury"] || row["practice_primary_injury"] || "",
            practiceStatus: row["practice_status"] ?? "",
          };
        })
        // Keep rows that carry an actual designation or a practice note.
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

      const value: NflverseInjuryReport = {
        generatedAt: new Date().toISOString(),
        status: "live",
        season: candidate,
        week: week || null,
        sourceRows: records.length,
        counts,
        rows,
        note: "Official team-submitted injury designations as published, from the latest regular-season week in the source file. These are reported facts, not a prediction of availability.",
        sourceUrl: url,
        error: null,
      };
      if (cacheTtlMs > 0 && fetcher === fetch) injuryCache = { expiresAt: now + cacheTtlMs, value };
      return value;
    } catch (error) {
      lastError = error;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season,
    week: null,
    sourceRows: 0,
    counts: { out: 0, doubtful: 0, questionable: 0 },
    rows: [],
    note: "The injury report could not load. The product shows an empty state instead of fabricated availability.",
    sourceUrl: nflverseUrl("injuries", season),
    error: lastError instanceof Error ? lastError.message : "UNKNOWN",
  };
}
