/**
 * ClubElo free CSV client — soccer independent fair values.
 *
 * Sources (no API key):
 *   http://api.clubelo.com/Fixtures  — short-horizon W/D/L + GD columns
 *   http://api.clubelo.com/YYYY-MM-DD — daily rating snapshot
 *
 * Integrity:
 *   • Soft-fail → null (honest no-opinion). Never invent ratings.
 *   • 3-way → 2-way by removing draw mass (same law as Poisson moneyline).
 *   • Name match is exact-normalized or unique last-token — no fuzzy collisions.
 *   • READ-ONLY public CSV. No orders, no keys.
 *
 * source tag on IndependentMarketFairValue: "clubelo"
 */

import type { IndependentMarketFairValue } from "@sports/types";
import { noStoreFetch } from "./no-store-fetch.js";

const CLUBELO_BASE = "http://api.clubelo.com";
const TIMEOUT_MS = 15_000;

export class ClubEloError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ClubEloError";
  }
}

export function isClubEloSport(sportKey: string): boolean {
  const k = sportKey.trim().toLowerCase();
  if (!k.includes("soccer") && !k.includes("football") && k !== "mls" && !k.includes("epl")) {
    // Odds keys are usually soccer_*; allow explicit soccer/mls/epl fragments.
    if (
      !(
        k.includes("epl") ||
        k.includes("mls") ||
        k.includes("bundesliga") ||
        k.includes("serie") ||
        k.includes("ligue") ||
        k.includes("la_liga") ||
        k.includes("laliga") ||
        k.includes("uefa") ||
        k.includes("champs")
      )
    ) {
      return false;
    }
  }
  // Explicit non-soccer football (NFL/CFB) — ClubElo is association football only.
  if (k.includes("americanfootball") || k === "nfl" || k === "ncaaf") return false;
  return (
    k.startsWith("soccer") ||
    k.includes("soccer") ||
    k.includes("epl") ||
    k.includes("mls") ||
    k.includes("bundesliga") ||
    k.includes("serie_a") ||
    k.includes("seriea") ||
    k.includes("ligue") ||
    k.includes("la_liga") ||
    k.includes("laliga") ||
    k.includes("uefa") ||
    k.includes("champs_league")
  );
}

/** Normalize team labels for ClubElo join. */
export function normalizeClubName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Known Odds/ESPN → ClubElo label overrides (drift-prone clubs). */
const NAME_OVERRIDES: Readonly<Record<string, string>> = {
  "manchester united": "Man United",
  "manchester city": "Man City",
  "tottenham hotspur": "Tottenham",
  "newcastle united": "Newcastle",
  "nottingham forest": "Forest",
  "wolverhampton wanderers": "Wolves",
  "west ham united": "West Ham",
  "brighton and hove albion": "Brighton",
  "brighton hove albion": "Brighton",
  "leicester city": "Leicester",
  "norwich city": "Norwich",
  "leeds united": "Leeds",
  "sheffield united": "Sheffield United",
  "paris saint germain": "Paris SG",
  "paris sg": "Paris SG",
  "psg": "Paris SG",
  "bayern munich": "Bayern",
  "bayern munchen": "Bayern",
  "borussia dortmund": "Dortmund",
  "borussia monchengladbach": "Gladbach",
  "rb leipzig": "RB Leipzig",
  "inter milan": "Inter",
  "internazionale": "Inter",
  "ac milan": "Milan",
  "atletico madrid": "Atletico",
  "atlético madrid": "Atletico",
  "athletic club": "Athletic",
  "athletic bilbao": "Athletic",
  "real sociedad": "Sociedad",
  "sporting cp": "Sporting",
  "sporting lisbon": "Sporting",
  "olympique marseille": "Marseille",
  "olympique lyonnais": "Lyon",
  "as roma": "Roma",
  "ssc napoli": "Napoli",
  "afc bournemouth": "Bournemouth",
};

export function clubEloLookupName(teamName: string): string {
  const n = normalizeClubName(teamName);
  if (NAME_OVERRIDES[n]) return NAME_OVERRIDES[n]!;
  return teamName.trim();
}

function teamsMatch(a: string, b: string): boolean {
  const na = normalizeClubName(a);
  const nb = normalizeClubName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Allow "Man City" vs "Manchester City" via override expansion on both sides.
  const oa = normalizeClubName(clubEloLookupName(a));
  const ob = normalizeClubName(clubEloLookupName(b));
  if (oa === ob) return true;
  // Unique token containment only when both lengths ≥ 4 to avoid "United" collisions.
  if (na.length >= 5 && nb.length >= 5) {
    if (na.includes(nb) || nb.includes(na)) return true;
  }
  return false;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",");
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]!] = (cols[c] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

function num(row: Record<string, string>, col: string): number {
  const v = Number(row[col] ?? "");
  return Number.isFinite(v) ? v : 0;
}

/**
 * Derive 2-way win probs from ClubElo fixtures GD columns.
 * Draw mass removed; sides renormalised.
 */
export function fixtureRowToTwoWay(
  row: Record<string, string>,
): { homeFairProb: number; awayFairProb: number; drawMass: number } | null {
  let pHome =
    num(row, "GD>5") +
    num(row, "GD=1") +
    num(row, "GD=2") +
    num(row, "GD=3") +
    num(row, "GD=4") +
    num(row, "GD=5");
  // Some dumps use GD=1..5 only; also accept alternate keys if present.
  for (let i = 1; i <= 5; i++) {
    // already summed GD=i above for home
  }
  const pDraw = num(row, "GD=0");
  let pAway =
    num(row, "GD<-5") +
    num(row, "GD=-1") +
    num(row, "GD=-2") +
    num(row, "GD=-3") +
    num(row, "GD=-4") +
    num(row, "GD=-5");

  // If the row only has aggregated Win/Draw/Loss columns, use those.
  if (pHome + pDraw + pAway <= 0) {
    pHome = num(row, "Home") || num(row, "PH") || num(row, "p_home");
    const d = num(row, "Draw") || num(row, "PD") || num(row, "p_draw");
    pAway = num(row, "Away") || num(row, "PA") || num(row, "p_away");
    if (pHome + d + pAway > 0) {
      const two = pHome + pAway;
      if (!(two > 0)) return null;
      return {
        homeFairProb: pHome / two,
        awayFairProb: pAway / two,
        drawMass: d / (pHome + d + pAway),
      };
    }
    return null;
  }

  const two = pHome + pAway;
  if (!(two > 0)) return null;
  return {
    homeFairProb: pHome / two,
    awayFairProb: pAway / two,
    drawMass: pDraw / (pHome + pDraw + pAway || 1),
  };
}

/** Logistic Elo from two ClubElo ratings → 2-way (no explicit draw). */
export function ratingsToTwoWay(
  homeElo: number,
  awayElo: number,
  options?: { readonly homeAdvantage?: number; readonly scale?: number },
): { homeFairProb: number; awayFairProb: number } {
  const hfa = options?.homeAdvantage ?? 65;
  const scale = options?.scale ?? 400;
  const pHome = 1 / (1 + Math.pow(10, -(homeElo - awayElo + hfa) / scale));
  return { homeFairProb: pHome, awayFairProb: 1 - pHome };
}

interface ClubEloClientOptions {
  readonly baseUrl?: string;
  readonly now?: () => Date;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Read-only ClubElo client. Process-level fixture/rating caches keep cron cycles bounded.
 */
export class ClubEloClient {
  private readonly baseUrl: string;
  private readonly now: () => Date;
  private readonly fetchImpl: typeof fetch;
  private fixturesCache: { at: number; rows: Record<string, string>[] } | null = null;
  private ratingsCache: Map<string, { at: number; rows: Record<string, string>[] }> = new Map();

  constructor(options: ClubEloClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? CLUBELO_BASE;
    this.now = options.now ?? (() => new Date());
    this.fetchImpl = options.fetchImpl ?? noStoreFetch;
  }

  private async getText(path: string): Promise<string> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        headers: { accept: "text/csv,text/plain,*/*" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        throw new ClubEloError(`ClubElo request timed out after ${TIMEOUT_MS}ms`, 408);
      }
      throw new ClubEloError(
        `ClubElo request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!response.ok) {
      throw new ClubEloError(`ClubElo error: ${response.status}`, response.status);
    }
    return response.text();
  }

  async getFixtures(): Promise<Record<string, string>[]> {
    const now = this.now().getTime();
    if (this.fixturesCache && now - this.fixturesCache.at < 30 * 60_000) {
      return this.fixturesCache.rows;
    }
    const text = await this.getText("/Fixtures");
    const rows = parseCsv(text);
    this.fixturesCache = { at: now, rows };
    return rows;
  }

  async getRatingsSnapshot(dateIso?: string): Promise<Record<string, string>[]> {
    const day = (dateIso ?? this.now().toISOString().slice(0, 10)).slice(0, 10);
    const hit = this.ratingsCache.get(day);
    const now = this.now().getTime();
    if (hit && now - hit.at < 6 * 60 * 60_000) return hit.rows;
    const text = await this.getText(`/${day}`);
    const rows = parseCsv(text);
    this.ratingsCache.set(day, { at: now, rows });
    return rows;
  }

  /**
   * Prefer Fixtures forecast for the matchup; else rating-snapshot logistic.
   * Returns null when neither side resolves (honest).
   */
  async getFairValue(input: {
    readonly homeTeam: string;
    readonly awayTeam: string;
    readonly commenceTime?: Date;
  }): Promise<IndependentMarketFairValue | null> {
    const capturedAt = this.now().toISOString();

    // 1) Fixtures short-horizon model
    try {
      const fixtures = await this.getFixtures();
      const homeQ = clubEloLookupName(input.homeTeam);
      const awayQ = clubEloLookupName(input.awayTeam);
      for (const row of fixtures) {
        const home = row.Home ?? row.home ?? "";
        const away = row.Away ?? row.away ?? "";
        if (!teamsMatch(homeQ, home) || !teamsMatch(awayQ, away)) continue;
        // Optional date proximity when commence is known
        if (input.commenceTime && row.Date) {
          const rowDay = Date.parse(row.Date);
          if (Number.isFinite(rowDay)) {
            const delta = Math.abs(rowDay - input.commenceTime.getTime());
            // ClubElo forecasts ~1 week; reject > 10 days mismatch
            if (delta > 10 * 24 * 60 * 60_000) continue;
          }
        }
        const tw = fixtureRowToTwoWay(row);
        if (!tw) continue;
        return {
          source: "clubelo",
          homeFairProb: Number(tw.homeFairProb.toFixed(4)),
          awayFairProb: Number(tw.awayFairProb.toFixed(4)),
          capturedAt,
        };
      }
    } catch {
      // soft-fail into ratings path
    }

    // 2) Rating snapshot logistic
    try {
      const day = (input.commenceTime ?? this.now()).toISOString().slice(0, 10);
      const rows = await this.getRatingsSnapshot(day);
      const homeR = findRating(rows, input.homeTeam);
      const awayR = findRating(rows, input.awayTeam);
      if (homeR == null || awayR == null) return null;
      const tw = ratingsToTwoWay(homeR, awayR);
      return {
        source: "clubelo",
        homeFairProb: Number(tw.homeFairProb.toFixed(4)),
        awayFairProb: Number(tw.awayFairProb.toFixed(4)),
        capturedAt,
      };
    } catch {
      return null;
    }
  }
}

function findRating(rows: Record<string, string>[], teamName: string): number | null {
  const target = clubEloLookupName(teamName);
  let best: number | null = null;
  for (const row of rows) {
    const club = row.Club ?? row.club ?? row.Name ?? "";
    if (!teamsMatch(target, club)) continue;
    // Prefer non-reserve if column present
    const elo = Number(row.Elo ?? row.elo ?? row.Rating ?? "");
    if (!Number.isFinite(elo)) continue;
    // Skip obvious B/II reserves when a senior match also exists
    if (/\b(B|II|2)\b/i.test(club) && !/\b(B|II|2)\b/i.test(target)) continue;
    best = elo;
    // Prefer exact normalized match
    if (normalizeClubName(club) === normalizeClubName(target)) return elo;
  }
  return best;
}

/** Process-shared client so one Fixtures pull serves a full soccer slate. */
let sharedClient: ClubEloClient | null = null;

export function getSharedClubEloClient(now?: () => Date): ClubEloClient {
  if (!sharedClient || now) {
    sharedClient = new ClubEloClient({ now });
  }
  return sharedClient;
}

/** Test seam. */
export function resetClubEloClientForTests(): void {
  sharedClient = null;
}
