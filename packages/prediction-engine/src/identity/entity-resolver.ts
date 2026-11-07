/**
 * Wave 4 (W4-02): Canonical Runtime Entity Resolver (`packages/prediction-engine/src/identity/entity-resolver.ts`)
 *
 * Reads `data/identity/canonical_entities.jsonl` and enforces zero-tolerance entity resolution
 * across all 32 NFL teams, 32 venues, 96 coaches, 17 referee crews, and 5,300+ NFL players.
 *
 * Standing 2026 Rulings Enforced:
 *  - Geno Smith -> NYJ QB (historical SEA tenure closed 2025-03-12)
 *  - Mike Evans -> SF WR (historical TB tenure closed 2026-03-11)
 *  - Chris Godwin -> TB WR, injury_status_2026_w09: "OUT", pulled_play_guard_status: "PULLED_NOV_1_EXCLUDED"
 */

import fs from "node:fs";
import path from "node:path";

export interface HistoricalTenure {
  readonly team: string;
  readonly valid_from_date: string;
  readonly valid_to_date: string;
  readonly position?: string;
}

export interface CanonicalEntityRecord {
  readonly canonical_id: string;
  readonly gsis_id: string;
  readonly espn_id: string;
  readonly pfr_id: string;
  readonly canonical_slug: string;
  readonly entity_type: "team" | "venue" | "coach" | "official" | "player";
  readonly full_name: string;
  readonly aliases: readonly string[];
  readonly position: string;
  readonly "2026_active_team": string;
  readonly valid_from_date: string;
  readonly valid_to_date: string;
  readonly ruling_authority: string;
  readonly pulled_play_guard_status: string;
  readonly injury_status_2026_w09?: string;
  readonly historical_tenures?: readonly HistoricalTenure[];
}

export interface ResolveEntityOptions {
  readonly expectedTeam?: string | null;
  readonly asOfDate?: string;
  readonly entityType?: "team" | "venue" | "coach" | "official" | "player" | null;
  readonly allowPulledOrInactive?: boolean;
}

export class EntityResolutionContaminationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntityResolutionContaminationError";
    Object.setPrototypeOf(this, EntityResolutionContaminationError.prototype);
  }
}

const TEAM_ABBR_CANON: Readonly<Record<string, string>> = {
  WSH: "WAS",
  JAC: "JAX",
  LA: "LAR",
  STL: "LAR",
  SD: "LAC",
  SDG: "LAC",
  OAK: "LV",
  LVR: "LV",
  GNB: "GB",
  KAN: "KC",
  NOR: "NO",
  NWE: "NE",
  SFO: "SF",
  TAM: "TB",
  BLT: "BAL",
  CLV: "CLE",
  HST: "HOU",
  ARZ: "ARI",
  AZ: "ARI",
};

export function normalizeTeamCode(team?: string | null): string {
  if (!team) return "";
  const u = String(team).trim().toUpperCase();
  return TEAM_ABBR_CANON[u] ?? u;
}

export function normalizeLookupKey(value: string): string {
  let raw = String(value ?? "").trim();
  if (!raw) return "";
  raw = raw.replace(/\s*\([A-Z]{2,3}(?:\s+[A-Z0-9]+)?\)\s*$/, "");
  if (raw.includes(",") && !/^(VENUE_|TEAM_|PLAYER_|COACH_|OFFICIAL_)/i.test(raw)) {
    const parts = raw.split(",", 2).map((p) => p.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      raw = `${parts[1]} ${parts[0]}`;
    }
  }
  return raw
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/[.']/g, "")
    .replace(/[^a-z0-9_\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveCanonicalEntitiesFilePath(): string {
  const candidates = [
    path.resolve(process.cwd(), "data/identity/canonical_entities.jsonl"),
    path.resolve(process.cwd(), "../../data/identity/canonical_entities.jsonl"),
    path.resolve(process.cwd(), "../../../data/identity/canonical_entities.jsonl"),
  ];
  if (typeof __dirname !== "undefined") {
    candidates.push(
      path.resolve(__dirname, "../../../../data/identity/canonical_entities.jsonl"),
      path.resolve(__dirname, "../../../../../data/identity/canonical_entities.jsonl"),
    );
  }
  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      return cand;
    }
  }
  throw new EntityResolutionContaminationError(
    `Missing canonical_entities.jsonl across searched paths: ${candidates.join(", ")}`,
  );
}

interface EntityLookupCache {
  readonly records: readonly CanonicalEntityRecord[];
  readonly byCanonicalId: ReadonlyMap<string, CanonicalEntityRecord>;
  readonly byGsisId: ReadonlyMap<string, CanonicalEntityRecord>;
  readonly byKey: ReadonlyMap<string, readonly CanonicalEntityRecord[]>;
}

let _cache: EntityLookupCache | null = null;

function getCache(): EntityLookupCache {
  if (_cache) return _cache;
  const filePath = resolveCanonicalEntitiesFilePath();
  const content = fs.readFileSync(filePath, "utf-8");
  const records: CanonicalEntityRecord[] = [];
  const byCanonicalId = new Map<string, CanonicalEntityRecord>();
  const byGsisId = new Map<string, CanonicalEntityRecord>();
  const byKey = new Map<string, CanonicalEntityRecord[]>();

  const addKey = (k: string, ent: CanonicalEntityRecord): void => {
    const nk = normalizeLookupKey(k);
    if (!nk) return;
    const list = byKey.get(nk);
    if (list) {
      list.push(ent);
    } else {
      byKey.set(nk, [ent]);
    }
  };

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const ent = JSON.parse(trimmed) as CanonicalEntityRecord;
    records.push(ent);
    if (ent.canonical_id) {
      byCanonicalId.set(ent.canonical_id.toUpperCase(), ent);
      addKey(ent.canonical_id, ent);
    }
    if (ent.gsis_id) {
      byGsisId.set(ent.gsis_id.toUpperCase(), ent);
      addKey(ent.gsis_id, ent);
    }
    if (ent.canonical_slug) {
      addKey(ent.canonical_slug, ent);
    }
    if (ent.full_name) {
      addKey(ent.full_name, ent);
    }
    for (const al of ent.aliases ?? []) {
      addKey(al, ent);
    }
  }

  _cache = { records, byCanonicalId, byGsisId, byKey };
  return _cache;
}

export function loadCanonicalEntities(): readonly CanonicalEntityRecord[] {
  return getCache().records;
}

function isTeamValidOnDate(
  ent: CanonicalEntityRecord,
  expectedTeam: string,
  asOfDate: string,
): boolean {
  const normExpected = normalizeTeamCode(expectedTeam);
  const activeTeam = normalizeTeamCode(ent["2026_active_team"]);
  const vFrom = ent.valid_from_date || "1900-01-01";
  const vTo = ent.valid_to_date || "2099-12-31";

  if (normExpected === activeTeam && vFrom <= asOfDate && asOfDate <= vTo) {
    return true;
  }

  for (const tenure of ent.historical_tenures ?? []) {
    const hTeam = normalizeTeamCode(tenure.team);
    const hFrom = tenure.valid_from_date || "1900-01-01";
    const hTo = tenure.valid_to_date || "2025-03-12";
    if (normExpected === hTeam && hFrom <= asOfDate && asOfDate <= hTo) {
      return true;
    }
  }

  return false;
}

export function resolveEntity(
  nameOrId: string,
  optionsOrExpectedTeam?: ResolveEntityOptions | string | null,
  asOfDate = "2026-11-06",
  entityType?: "team" | "venue" | "coach" | "official" | "player" | null,
  allowPulledOrInactive = false,
): CanonicalEntityRecord {
  const raw = String(nameOrId ?? "").trim();
  if (!raw) {
    throw new EntityResolutionContaminationError("Empty entity identifier passed to resolveEntity().");
  }

  let expectedTeam: string | null | undefined;
  let resolvedAsOfDate = asOfDate;
  let resolvedEntityType = entityType;
  let resolvedAllowInactive = allowPulledOrInactive;

  if (optionsOrExpectedTeam && typeof optionsOrExpectedTeam === "object") {
    expectedTeam = optionsOrExpectedTeam.expectedTeam;
    resolvedAsOfDate = optionsOrExpectedTeam.asOfDate ?? "2026-11-06";
    resolvedEntityType = optionsOrExpectedTeam.entityType ?? null;
    resolvedAllowInactive = optionsOrExpectedTeam.allowPulledOrInactive ?? false;
  } else {
    expectedTeam = optionsOrExpectedTeam;
  }

  const cache = getCache();
  const uRaw = raw.toUpperCase();
  let candidates: CanonicalEntityRecord[] = [];

  const byCid = cache.byCanonicalId.get(uRaw);
  const byGsis = cache.byGsisId.get(uRaw);
  if (byCid) {
    candidates = [byCid];
  } else if (byGsis) {
    candidates = [byGsis];
  } else {
    const nk = normalizeLookupKey(raw);
    candidates = [...(cache.byKey.get(nk) ?? [])];
  }

  if (resolvedEntityType) {
    candidates = candidates.filter((c) => c.entity_type === resolvedEntityType);
  }

  if (candidates.length === 0) {
    throw new EntityResolutionContaminationError(
      `UNRESOLVED_ENTITY: '${nameOrId}' (entity_type=${resolvedEntityType ?? "any"}) not found in canonical_entities.jsonl.`,
    );
  }

  const seen = new Set<string>();
  let deduped = candidates.filter((c) => {
    if (seen.has(c.canonical_id)) return false;
    seen.add(c.canonical_id);
    return true;
  });

  const exactFn = deduped.filter((c) => c.full_name.toLowerCase() === raw.toLowerCase());
  if (exactFn.length > 0) {
    deduped = exactFn;
  }

  let chosen: CanonicalEntityRecord;
  if (expectedTeam) {
    const normExp = normalizeTeamCode(expectedTeam);
    const matchingTeam = deduped.filter((c) => isTeamValidOnDate(c, normExp, resolvedAsOfDate));
    if (matchingTeam.length === 0) {
      const primary = deduped[0];
      throw new EntityResolutionContaminationError(
        `OUT_OF_WINDOW_TEAM_PAIRING: '${primary.full_name}' (${primary.canonical_id}) paired with team '${normExp}' as of ${resolvedAsOfDate}, but active 2026 team is '${primary["2026_active_team"]}' (valid_from=${primary.valid_from_date}).`,
      );
    }
    chosen = matchingTeam[0];
  } else if (!resolvedEntityType && raw.length <= 3) {
    const teamCands = deduped.filter((c) => c.entity_type === "team");
    chosen = teamCands.length > 0 ? teamCands[0] : deduped[0];
  } else {
    chosen = deduped[0];
  }

  const guard = chosen.pulled_play_guard_status || "CLEAR";
  const injW09 = (chosen.injury_status_2026_w09 || "ACTIVE").toUpperCase();
  const enforceStage0 =
    optionsOrExpectedTeam && typeof optionsOrExpectedTeam === "object"
      ? Boolean((optionsOrExpectedTeam as { enforceStage0InjuryGate?: boolean }).enforceStage0InjuryGate)
      : false;
  if (resolvedAsOfDate >= "2026-11-01" && !resolvedAllowInactive) {
    if (guard === "PULLED_NOV_1_EXCLUDED") {
      throw new EntityResolutionContaminationError(
        `PULLED_PLAY_CONTAMINATION_GUARD: '${chosen.full_name}' (${chosen.canonical_id}) is blocked by pulled_play_guard_status='${guard}' (injury_status_2026_w09='${injW09}').`,
      );
    }
    if (
      enforceStage0 &&
      (guard === "STAGE0_EXCLUDED_IR_OR_OUT" ||
        injW09 === "OUT" ||
        injW09 === "IR" ||
        injW09 === "INJURED RESERVE" ||
        injW09 === "OUT_FOR_SEASON")
    ) {
      throw new EntityResolutionContaminationError(
        `STAGE0_INACTIVE_CONTAMINATION_GUARD: '${chosen.full_name}' (${chosen.canonical_id}) is inactive/excluded on Week 9 board (status='${injW09}', guard='${guard}').`,
      );
    }
  }

  return chosen;
}

export function validateRosterPairing(
  nameOrId: string,
  claimedTeam: string,
  asOfDate = "2026-11-06",
  allowPulledOrInactive = false,
): CanonicalEntityRecord {
  return resolveEntity(nameOrId, {
    expectedTeam: claimedTeam,
    asOfDate,
    allowPulledOrInactive,
  });
}

export function validateDatasetRowEntities(
  row: Readonly<Record<string, unknown>>,
  asOfDate = "2026-11-06",
  allowPulledOrInactive = false,
): { valid: true; asOfDate: string; resolvedEntities: Record<string, string> } {
  let rowDate = String(row.as_of_date ?? row.gameday ?? row.game_date ?? asOfDate);
  const seasonStr = String(row.season ?? "");
  if ((seasonStr === "2024" || seasonStr === "2023" || seasonStr === "2022") && rowDate === "2026-11-06") {
    rowDate = `${seasonStr}-12-31`;
  }

  const resolvedEntities: Record<string, string> = {};
  const teamFields = ["team", "home_team", "away_team", "posteam", "defteam", "recent_team", "opponent_team"];
  for (const tf of teamFields) {
    const val = row[tf];
    if (typeof val === "string" && val.trim() && !["NA", "NULL", "NONE", "2TM", "3TM", "UNK"].includes(val.trim().toUpperCase())) {
      const tmEnt = resolveEntity(val, { asOfDate: rowDate, entityType: "team", allowPulledOrInactive: true });
      resolvedEntities[tf] = tmEnt.canonical_id;
    }
  }

  const rawClaimedTeam = (row.team ?? row.recent_team ?? row.posteam ?? null) as string | null;
  const claimedTeam =
    rawClaimedTeam && !["NA", "NULL", "NONE", "2TM", "3TM", "UNK"].includes(String(rawClaimedTeam).trim().toUpperCase())
      ? String(rawClaimedTeam).trim()
      : null;

  const playerIdent = (row.gsis_id ??
    row.player_display_name ??
    row.full_name ??
    row.player_name ??
    row.player ??
    row.name) as string | undefined;

  if (typeof playerIdent === "string" && playerIdent.trim()) {
    const pEnt = resolveEntity(playerIdent.trim(), {
      expectedTeam: claimedTeam,
      asOfDate: rowDate,
      entityType: /^(TEAM_|VENUE_|COACH_|OFFICIAL_)/i.test(playerIdent) ? null : "player",
      allowPulledOrInactive,
    });
    resolvedEntities.player = pEnt.canonical_id;
  }

  return {
    valid: true,
    asOfDate: rowDate,
    resolvedEntities,
  };
}
