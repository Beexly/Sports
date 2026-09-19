/**
 * source-atlas-harvester.ts — Structured Harvester for the 1,500+ Source Nodes in data/source-atlas.
 *
 * Connects the raw knowledge graph and source atlas registry to the GSE ingestion and signal pipeline.
 * Maps sources by sport, league, team, content type, and natural signal family.
 */

import * as fs from "fs";
import * as path from "path";
import { SignalFamily } from "@sports/types";

export interface SourceAtlasEntry {
  readonly source_id: string;
  readonly canonical_name: string;
  readonly aliases: readonly string[];
  readonly primary_url: string;
  readonly domain: string;
  readonly source_family: string;
  readonly source_class: string;
  readonly source_category: string;
  readonly sport_scope: readonly string[];
  readonly league_scope: readonly string[];
  readonly team_scope: readonly string[];
  readonly content_types: readonly string[];
  readonly access_method: string;
  readonly legal_gate_status: string;
  readonly adapter_status: string;
  readonly priority_score: number;
  readonly value_score: number;
  readonly freshness_score: number;
}

export interface SourceAtlasRegistryData {
  readonly generated_at: string;
  readonly source_count: number;
  readonly sources: readonly SourceAtlasEntry[];
}

let cachedRegistry: SourceAtlasRegistryData | null = null;

function resolveAtlasPath(customPath?: string): string {
  if (customPath && fs.existsSync(customPath)) return customPath;
  const candidates = [
    path.resolve(process.cwd(), "data/source-atlas/source_registry.json"),
    path.resolve(process.cwd(), "../data/source-atlas/source_registry.json"),
    path.resolve(process.cwd(), "../../data/source-atlas/source_registry.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // No candidate exists on disk. Return the first as the reported path so the
  // caller's error names a concrete location rather than undefined. Indexing is
  // checked because noUncheckedIndexedAccess widens it to string | undefined,
  // and a silent undefined here would surface later as an unreadable path.
  const [firstCandidate] = candidates;
  if (firstCandidate === undefined) {
    throw new Error("source-atlas: no registry path candidates were configured");
  }
  return firstCandidate;
}

/**
 * Loads the source atlas registry into memory with caching.
 */
export function loadSourceAtlas(customPath?: string): SourceAtlasRegistryData {
  if (cachedRegistry) return cachedRegistry;
  const filePath = resolveAtlasPath(customPath);
  if (!fs.existsSync(filePath)) {
    return {
      generated_at: new Date().toISOString(),
      source_count: 0,
      sources: [],
    };
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    cachedRegistry = JSON.parse(raw) as SourceAtlasRegistryData;
    return cachedRegistry;
  } catch (err) {
    console.error(`[source-atlas-harvester] Failed to parse ${filePath}:`, err);
    return {
      generated_at: new Date().toISOString(),
      source_count: 0,
      sources: [],
    };
  }
}

/**
 * Filters sources by league scope (e.g. 'NFL', 'MLB', 'NBA', 'NCAAF').
 */
export function getSourcesByLeague(league: string, customPath?: string): readonly SourceAtlasEntry[] {
  const atlas = loadSourceAtlas(customPath);
  const target = league.toUpperCase();
  return atlas.sources.filter((s) => s.league_scope.map((l) => l.toUpperCase()).includes(target));
}

/**
 * Filters sources by specific team scope or team nickname.
 */
export function getSourcesByTeam(team: string, customPath?: string): readonly SourceAtlasEntry[] {
  const atlas = loadSourceAtlas(customPath);
  const target = team.toLowerCase();
  return atlas.sources.filter((s) =>
    s.team_scope.some((t) => t.toLowerCase() === target || t.toLowerCase().includes(target))
  );
}

/**
 * Maps source categories to the natural Signal Families.
 */
export function mapSourceToSignalFamily(entry: SourceAtlasEntry): SignalFamily {
  const cat = (entry.source_category || "").toLowerCase();
  const content = entry.content_types.map((c) => c.toLowerCase());

  if (cat.includes("odds") || cat.includes("market") || content.includes("odds")) {
    return "MARKET";
  }
  if (cat.includes("weather") || cat.includes("wind") || cat.includes("stadium")) {
    return "MICROCLIMATE";
  }
  if (cat.includes("injury") || cat.includes("tendency") || cat.includes("coaching") || cat.includes("rest")) {
    return "SITUATIONAL";
  }
  if (cat.includes("trench") || cat.includes("line") || cat.includes("blocking") || cat.includes("pass_rush")) {
    return "TRENCHES";
  }
  if (cat.includes("luck") || cat.includes("fumble") || cat.includes("turnover")) {
    return "LUCK";
  }
  if (cat.includes("narrative") || cat.includes("sentiment") || cat.includes("beat")) {
    return "NARRATIVE";
  }
  if (cat.includes("orderbook") || cat.includes("liquidity") || cat.includes("depth")) {
    return "MARKET_MICROSTRUCTURE";
  }
  return "EFFICIENCY";
}

/**
 * Returns sources mapped to a specific SignalFamily.
 */
export function getSourcesByFamily(family: SignalFamily, customPath?: string): readonly SourceAtlasEntry[] {
  const atlas = loadSourceAtlas(customPath);
  return atlas.sources.filter((s) => mapSourceToSignalFamily(s) === family);
}
