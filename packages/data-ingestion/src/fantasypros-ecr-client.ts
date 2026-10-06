/**
 * FantasyPros expert consensus rankings (ECR), PPR cheatsheet
 * (registry id "fantasypros-ecr").
 *
 * VERIFIED LIVE 2026-09-18: HTTP 200, `var ecrData` payload with 560 players
 * x 179 experts. Public free page; the paid API is a separate SKU we do not
 * touch.
 *
 * DEFAULT ON (no env gate): public free page, registry verdict
 * "cleared-with-attribution" with genuinely permissive terms. We still call
 * assertIngestible("fantasypros-ecr") before any network, and public surfaces
 * must carry the attribution text ("Expert consensus rankings via FantasyPros.").
 *
 * POLITENESS: FantasyPros robots.txt asks for a 5s crawl-delay; we honor it
 * with a module-level last-call timestamp. Every getEcrPpr() call waits out
 * the remainder of the 5s window before fetching. CRAWL_DELAY_MS is exported
 * so the delay is pinned and testable.
 *
 * HOW: GET /ppr-cheatsheets.php, brace-match the `var ecrData = {...};`
 * object (regex alone cannot survive nested braces/strings), defensive-parse
 * into EcrPlayer[]. GET only, 15s timeout, User-Agent "GSE-DataIngestion/1.0".
 */

import { assertIngestible } from "./source-registry.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const FANTASYPROS_ECR_SOURCE_ID = "fantasypros-ecr";
export const FANTASYPROS_ECR_BASE = "https://www.fantasypros.com/nfl/rankings";
export const FANTASYPROS_ECR_ATTRIBUTION = "Expert consensus rankings via FantasyPros.";

/** Robots crawl-delay for fantasypros.com: 5 seconds between requests. */
export const CRAWL_DELAY_MS = 5_000;

const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

/** Module-level timestamp of the last ECR fetch, for robots crawl-delay politeness. */
let lastCallTs = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wait out the remainder of the robots crawl-delay window before fetching. */
async function honorCrawlDelay(): Promise<void> {
  const wait = CRAWL_DELAY_MS - (Date.now() - lastCallTs);
  if (wait > 0) await sleep(wait);
  lastCallTs = Date.now();
}

/**
 * Test-only: reset the crawl-delay timestamp so tests stay fast without
 * waiting out the 5s politeness window. Never use in production paths.
 */
export function __resetFantasyProsCrawlDelay(): void {
  lastCallTs = 0;
}

export class FantasyProsEcrError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "FantasyProsEcrError";
  }
}

export interface EcrPlayer {
  readonly playerId: number;
  readonly playerName: string;
  readonly team: string;
  readonly position: string;
  readonly posRank: number | null;
  readonly tier: number | null;
  readonly rankEcr: number | null;
  readonly rankMin: number | null;
  readonly rankMax: number | null;
  readonly rankAve: number | null;
  readonly rankStd: number | null;
  readonly byeWeek: number | null;
  readonly ownedAvg: number | null;
  readonly ecrDelta: number | null;
}

export interface EcrMeta {
  readonly label: string | null;
  readonly lastUpdatedTs: number | null;
}

export interface EcrPprResult {
  readonly players: readonly EcrPlayer[];
  readonly meta: EcrMeta;
}

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function intOrNull(v: unknown): number | null {
  const n = numOrNull(v);
  return n === null ? null : Math.trunc(n);
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/**
 * Locate `var ecrData = {...};` and brace-match the object, respecting
 * string literals (the payload contains apostrophes like "Ja'Marr Chase").
 * Returns null when the marker is absent or the JSON does not parse.
 */
function extractEcrJson(html: string): unknown {
  const marker = html.indexOf("var ecrData");
  if (marker === -1) return null;
  const eq = html.indexOf("=", marker);
  if (eq === -1) return null;
  const start = html.indexOf("{", eq);
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let quote = "";
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (ch === undefined) break;
    if (inStr) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        inStr = false;
      }
    } else if (ch === '"' || ch === "'") {
      inStr = true;
      quote = ch;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function parsePlayer(r: Record<string, unknown>): EcrPlayer | null {
  const playerId = intOrNull(r.player_id);
  const playerName = strOrNull(r.player_name);
  if (playerId === null || !playerName) return null;
  return {
    playerId,
    playerName,
    team: strOrNull(r.player_team_id) ?? strOrNull(r.team) ?? "",
    position: strOrNull(r.player_position_id) ?? strOrNull(r.position) ?? "",
    posRank: intOrNull(r.pos_rank),
    tier: intOrNull(r.tier),
    rankEcr: numOrNull(r.rank_ecr),
    rankMin: numOrNull(r.rank_min),
    rankMax: numOrNull(r.rank_max),
    rankAve: numOrNull(r.rank_ave),
    rankStd: numOrNull(r.rank_std),
    byeWeek: intOrNull(r.bye_week),
    ownedAvg: numOrNull(r.owned_avg),
    ecrDelta: numOrNull(r.rank_delta) ?? numOrNull(r.ecr_delta),
  };
}

function asPlayers(payload: unknown): EcrPlayer[] {
  if (!payload || typeof payload !== "object") return [];
  const raw = (payload as { players?: unknown }).players;
  if (!Array.isArray(raw)) return [];
  const out: EcrPlayer[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const p = parsePlayer(row as Record<string, unknown>);
    if (p) out.push(p);
  }
  return out;
}

function asMeta(payload: unknown): EcrMeta {
  if (!payload || typeof payload !== "object") return { label: null, lastUpdatedTs: null };
  const r = payload as Record<string, unknown>;
  const md = r.metadata && typeof r.metadata === "object" ? (r.metadata as Record<string, unknown>) : null;
  return {
    label: strOrNull(md?.label) ?? strOrNull(r.label),
    lastUpdatedTs: numOrNull(md?.timestamp) ?? numOrNull(r.last_updated) ?? numOrNull(r.timestamp),
  };
}

export class FantasyProsEcrClient {
  constructor(private readonly fetchImpl: typeof fetch = noStoreFetch) {}

  /**
   * PPR ECR cheatsheet. Honors the 5s robots crawl-delay before fetching.
   * Missing/malformed `var ecrData` -> empty players, never a throw.
   */
  async getEcrPpr(): Promise<EcrPprResult> {
    assertIngestible(FANTASYPROS_ECR_SOURCE_ID);
    await honorCrawlDelay();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${FANTASYPROS_ECR_BASE}/ppr-cheatsheets.php`, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
        signal: controller.signal,
      });
      if (!res.ok) throw new FantasyProsEcrError(`FantasyPros ECR HTTP ${res.status}`, res.status);
      const html = await res.text();
      const payload = extractEcrJson(html);
      return { players: asPlayers(payload), meta: asMeta(payload) };
    } finally {
      clearTimeout(timer);
    }
  }
}
