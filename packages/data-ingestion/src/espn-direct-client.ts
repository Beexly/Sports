import { isIngestible } from "./source-registry.js";

/**
 * Read-only adapters for the ESPN public site JSON.
 *
 * The Firecrawl Alexandria catalog describes these upstream contracts, but
 * Alexandria is not the direct ESPN adapter: it is a separate paid capability
 * layer. This module calls ESPN directly and never spends Firecrawl credits.
 */
export const ESPN_DIRECT_SOURCE_ID = "espn-public-api";
export const ESPN_DIRECT_SITE_HOSTS = [
  "https://site.web.api.espn.com",
  "https://site.api.espn.com",
] as const;

export interface EspnDirectInjury {
  readonly team: string;
  readonly teamId: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly status: string;
  readonly detail: string;
  readonly date: string;
}

export interface EspnDirectInjuryResult {
  readonly sourceId: string;
  readonly rows: readonly EspnDirectInjury[];
  readonly error: string | null;
}

export interface EspnDirectPayloadResult {
  readonly sourceId: string;
  readonly payload: unknown;
  readonly error: string | null;
}

export interface EspnDirectFetchOptions {
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

export interface EspnDirectScheduleOptions {
  readonly season?: number;
  readonly offset?: number;
  readonly limit?: number;
}

export interface EspnDirectRosterOptions {
  readonly offset?: number;
  readonly limit?: number;
}

type RecordLike = Record<string, unknown>;

function record(value: unknown): RecordLike | null {
  return value !== null && typeof value === "object" ? (value as RecordLike) : null;
}

function requiredText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

function query(options: Readonly<Record<string, number | undefined>>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export function espnDirectBaseUrl(sport: string, league: string): string {
  return `${ESPN_DIRECT_SITE_HOSTS[0]}/apis/site/v2/sports/${pathSegment(sport)}/${pathSegment(league)}`;
}

export function espnDirectEventSummaryPath(
  sport: string,
  league: string,
  eventId: string,
): string {
  return `/apis/site/v2/sports/${pathSegment(sport)}/${pathSegment(league)}/summary?event=${encodeURIComponent(eventId)}`;
}

export function espnDirectTeamSchedulePath(
  sport: string,
  league: string,
  teamId: string,
  options: EspnDirectScheduleOptions = {},
): string {
  return `/apis/site/v2/sports/${pathSegment(sport)}/${pathSegment(league)}/teams/${pathSegment(teamId)}/schedule${query({
    season: options.season,
    offset: options.offset,
    limit: options.limit,
  })}`;
}

export function espnDirectRosterPath(
  sport: string,
  league: string,
  teamId: string,
  options: EspnDirectRosterOptions = {},
): string {
  return `/apis/site/v2/sports/${pathSegment(sport)}/${pathSegment(league)}/teams/${pathSegment(teamId)}/roster${query({
    offset: options.offset,
    limit: options.limit,
  })}`;
}

export function espnDirectTeamsPath(sport: string, league: string): string {
  return `/apis/site/v2/sports/${pathSegment(sport)}/${pathSegment(league)}/teams`;
}

export function parseEspnDirectInjuries(payload: unknown): EspnDirectInjury[] {
  const root = record(payload);
  const teamRows = Array.isArray(root?.injuries) ? root.injuries : [];
  const output: EspnDirectInjury[] = [];

  for (const teamValue of teamRows) {
    const team = record(teamValue);
    const teamName = requiredText(team?.displayName);
    const teamId = requiredText(team?.id);
    const injuries = Array.isArray(team?.injuries) ? team.injuries : [];
    if (!teamName || !teamId) continue;

    for (const injuryValue of injuries) {
      const injury = record(injuryValue);
      const athlete = record(injury?.athlete);
      const playerName = requiredText(athlete?.displayName);
      const playerId = requiredText(athlete?.id);
      if (!playerName || !playerId) continue;

      output.push({
        team: teamName,
        teamId,
        playerId,
        playerName,
        status: requiredText(injury?.status) ?? "",
        detail: requiredText(injury?.shortComment) ?? "",
        date: requiredText(injury?.date) ?? "",
      });
    }
  }
  return output;
}

async function fetchJsonThroughHosts(
  path: string,
  options: EspnDirectFetchOptions,
): Promise<{ payload: unknown; url: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  const errors: string[] = [];

  try {
    for (const host of ESPN_DIRECT_SITE_HOSTS) {
      const url = `${host}${path}`;
      try {
        const response = await fetchImpl(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          errors.push(`${new URL(url).host} HTTP ${response.status}`);
          continue;
        }
        return { payload: (await response.json()) as unknown, url };
      } catch (error) {
        errors.push(`${new URL(url).host} ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error(errors.join("; ") || "all ESPN hosts failed");
  } finally {
    clearTimeout(timer);
  }
}

function directGateError(): string {
  return `[espn-direct] Source ${ESPN_DIRECT_SOURCE_ID} is not cleared for ingestion.`;
}

async function fetchEspnDirectPayload(
  path: string,
  options: EspnDirectFetchOptions,
): Promise<EspnDirectPayloadResult> {
  if (!isIngestible(ESPN_DIRECT_SOURCE_ID)) {
    return { sourceId: ESPN_DIRECT_SOURCE_ID, payload: null, error: directGateError() };
  }
  try {
    const { payload } = await fetchJsonThroughHosts(path, options);
    return { sourceId: ESPN_DIRECT_SOURCE_ID, payload, error: null };
  } catch (error) {
    return {
      sourceId: ESPN_DIRECT_SOURCE_ID,
      payload: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function fetchEspnDirectEventSummary(
  sport: string,
  league: string,
  eventId: string,
  options: EspnDirectFetchOptions = {},
): Promise<EspnDirectPayloadResult> {
  return fetchEspnDirectPayload(espnDirectEventSummaryPath(sport, league, eventId), options);
}

export async function fetchEspnDirectTeamSchedule(
  sport: string,
  league: string,
  teamId: string,
  options: EspnDirectScheduleOptions & EspnDirectFetchOptions = {},
): Promise<EspnDirectPayloadResult> {
  return fetchEspnDirectPayload(espnDirectTeamSchedulePath(sport, league, teamId, options), options);
}

export async function fetchEspnDirectRoster(
  sport: string,
  league: string,
  teamId: string,
  options: EspnDirectRosterOptions & EspnDirectFetchOptions = {},
): Promise<EspnDirectPayloadResult> {
  return fetchEspnDirectPayload(espnDirectRosterPath(sport, league, teamId, options), options);
}

export async function fetchEspnDirectTeams(
  sport: string,
  league: string,
  options: EspnDirectFetchOptions = {},
): Promise<EspnDirectPayloadResult> {
  return fetchEspnDirectPayload(espnDirectTeamsPath(sport, league), options);
}

export async function fetchEspnDirectInjuries(
  league: string,
  options: EspnDirectFetchOptions = {},
): Promise<EspnDirectInjuryResult> {
  if (!isIngestible(ESPN_DIRECT_SOURCE_ID)) {
    return { sourceId: ESPN_DIRECT_SOURCE_ID, rows: [], error: directGateError() };
  }
  try {
    const { payload } = await fetchJsonThroughHosts(
      `/apis/site/v2/sports/football/${pathSegment(league)}/injuries?limit=1000`,
      options,
    );
    return {
      sourceId: ESPN_DIRECT_SOURCE_ID,
      rows: parseEspnDirectInjuries(payload),
      error: null,
    };
  } catch (error) {
    return {
      sourceId: ESPN_DIRECT_SOURCE_ID,
      rows: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
