/**
 * Dynamic context enrichment for GameContext / reasoning path.
 * Pulls keyless ESPN injuries + NWS weather and derives OL/DL/DB continuity deltas.
 * CFBD is optional via CFBD_API_KEY (graceful fallback).
 * No synthetic data. Leave fields at baseline when source is absent.
 */

export interface InjuryRecord {
  teamName: string;
  playerName: string;
  position: string;
  status: string;
  shortComment: string;
}

export interface ContinuityDeltas {
  olContinuityDelta: number;
  dlContinuityDelta: number;
  dbContinuityDelta: number;
  outOl: number;
  qOl: number;
  outDl: number;
  qDl: number;
  outDb: number;
  qDb: number;
}

const OL_POS = new Set(["OL", "OT", "OG", "C", "G"]);
const DL_POS = new Set(["DE", "DT", "EDGE", "NT", "OLB", "DL"]);
const DB_POS = new Set(["CB", "S", "FS", "SS", "DB", "NB"]);

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function computeContinuityDeltas(injuries: InjuryRecord[]): ContinuityDeltas {
  let outOl = 0, qOl = 0, outDl = 0, qDl = 0, outDb = 0, qDb = 0;
  for (const inj of injuries) {
    const pos = (inj.position || "").toUpperCase();
    const isOut = inj.status === "Out" || inj.status === "Injured Reserve" || inj.status === "Doubtful";
    const isQ = inj.status === "Questionable";
    if (OL_POS.has(pos)) {
      if (isOut) outOl++; else if (isQ) qOl++;
    } else if (DL_POS.has(pos)) {
      if (isOut) outDl++; else if (isQ) qDl++;
    } else if (DB_POS.has(pos)) {
      if (isOut) outDb++; else if (isQ) qDb++;
    }
  }
  return {
    olContinuityDelta: clamp(-(outOl * 0.15 + qOl * 0.08), -1, 0),
    dlContinuityDelta: clamp(-(outDl * 0.15 + qDl * 0.08), -1, 0),
    dbContinuityDelta: clamp(-(outDb * 0.15 + qDb * 0.08), -1, 0),
    outOl, qOl, outDl, qDl, outDb, qDb,
  };
}

export async function fetchEspnInjuries(sport: "nfl" | "college-football"): Promise<InjuryRecord[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/${sport}/injuries`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as { injuries?: Array<{ displayName?: string; injuries?: Array<{ status?: string; shortComment?: string; athlete?: { displayName?: string; position?: { abbreviation?: string } } }> }> };
    const out: InjuryRecord[] = [];
    for (const team of data.injuries ?? []) {
      const teamName = team.displayName ?? "";
      for (const inj of team.injuries ?? []) {
        out.push({
          teamName,
          playerName: inj.athlete?.displayName ?? "",
          position: inj.athlete?.position?.abbreviation ?? "",
          status: inj.status ?? "",
          shortComment: inj.shortComment ?? "",
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchNwsWeather(lat: number, lon: number): Promise<{ temperatureF?: number; windSpeedMph?: number; precipitationRateMmHr?: number }> {
  try {
    const pointsRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
    if (!pointsRes.ok) return {};
    const points = await pointsRes.json() as { properties?: { forecastHourly?: string } };
    const hourlyUrl = points.properties?.forecastHourly;
    if (!hourlyUrl) return {};
    const hourlyRes = await fetch(hourlyUrl);
    if (!hourlyRes.ok) return {};
    const hourly = await hourlyRes.json() as { properties?: { periods?: Array<{ temperature?: number; windSpeed?: string; probabilityOfPrecipitation?: { value?: number } }> } };
    const period = hourly.properties?.periods?.[0];
    if (!period) return {};
    const windMatch = period.windSpeed?.match(/(\d+)/);
    return {
      temperatureF: period.temperature,
      windSpeedMph: windMatch ? Number(windMatch[1]) : undefined,
      precipitationRateMmHr: period.probabilityOfPrecipitation?.value != null ? (period.probabilityOfPrecipitation.value / 100) * 2 : undefined,
    };
  } catch {
    return {};
  }
}
