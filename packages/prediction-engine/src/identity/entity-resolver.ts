import * as fs from "node:fs";
import * as path from "node:path";

export class EntityResolutionContaminationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntityResolutionContaminationError";
  }
}

export interface CanonicalEntityRecord {
  entity_type: "player" | "coach" | "team" | "venue" | "official";
  canonical_id: string;
  canonical_name: string;
  valid_from: string;
  valid_to: string;
  current_team_id: string;
  position: string;
  source_ids: Record<string, string>;
  aliases?: string[];
  forbidden_2026_teams?: string[];
}

function normalizeTeam(team: string): string {
  const t = team.trim().toUpperCase();
  const map: Record<string, string> = {
    JAC: "JAX",
    WSH: "WAS",
    LA: "LAR",
    OAK: "LV",
    SD: "LAC",
    STL: "LAR",
  };
  return map[t] ?? t;
}

export class CanonicalEntityResolver {
  private byId = new Map<string, CanonicalEntityRecord>();
  private byName = new Map<string, CanonicalEntityRecord[]>();

  constructor(entitiesJsonlPath?: string) {
    const repoRoot = path.resolve(__dirname, "../../../..");
    const targetPath =
      entitiesJsonlPath ?? path.join(repoRoot, "data", "identity", "canonical_entities.jsonl");
    if (fs.existsSync(targetPath)) {
      const lines = fs.readFileSync(targetPath, "utf-8").split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const rec = JSON.parse(line) as CanonicalEntityRecord;
          this.byId.set(rec.canonical_id, rec);
          const nkey = rec.canonical_name.trim().toLowerCase();
          const list = this.byName.get(nkey) ?? [];
          list.push(rec);
          this.byName.set(nkey, list);
          for (const alias of rec.aliases ?? []) {
            const akey = alias.trim().toLowerCase();
            if (!akey) continue;
            const alist = this.byName.get(akey) ?? [];
            alist.push(rec);
            this.byName.set(akey, alist);
          }
        } catch {
          continue;
        }
      }
    }
  }

  public resolveEntity(params: {
    nameOrId: string;
    entityType?: CanonicalEntityRecord["entity_type"];
    teamId?: string;
    asOfDate?: string;
  }): CanonicalEntityRecord {
    const key = params.nameOrId.trim();
    const asOf = params.asOfDate ?? "2026-11-06";
    if (!key) {
      throw new EntityResolutionContaminationError("Empty entity identifier passed to resolveEntity");
    }

    let candidates: CanonicalEntityRecord[] = [];
    const byIdMatch = this.byId.get(key);
    if (byIdMatch) {
      candidates = [byIdMatch];
    } else {
      candidates = this.byName.get(key.toLowerCase()) ?? [];
    }

    if (params.entityType) {
      candidates = candidates.filter((c) => c.entity_type === params.entityType);
    }

    if (candidates.length === 0) {
      throw new EntityResolutionContaminationError(
        `Unresolved entity '${params.nameOrId}' (type=${params.entityType ?? "any"}, team=${params.teamId ?? "any"}, asOf=${asOf})`
      );
    }

    const windowMatches = candidates.filter(
      (c) => (c.valid_from || "1900-01-01") <= asOf && asOf <= (c.valid_to || "2099-12-31")
    );
    if (windowMatches.length === 0) {
      throw new EntityResolutionContaminationError(
        `Temporal window violation for '${params.nameOrId}' on asOf=${asOf}`
      );
    }

    if (params.teamId) {
      const normTeam = normalizeTeam(params.teamId);
      for (const cand of windowMatches) {
        const curTeam = normalizeTeam(cand.current_team_id || "");
        const forbidden = (cand.forbidden_2026_teams ?? []).map(normalizeTeam);
        if (asOf.startsWith("2026") && forbidden.includes(normTeam)) {
          throw new EntityResolutionContaminationError(
            `Standing 2026 Roster Contamination Error: '${cand.canonical_name}' paired with forbidden team '${normTeam}' on ${asOf} (canonical 2026 team is '${curTeam}')`
          );
        }
        if (curTeam === normTeam || curTeam === "NFL" || curTeam === "ALL") {
          return cand;
        }
      }
      const expected = Array.from(new Set(windowMatches.map((c) => c.current_team_id))).join(", ");
      throw new EntityResolutionContaminationError(
        `Entity-Team Contamination Error for '${params.nameOrId}' on ${asOf}: asserted team '${normTeam}' does not match canonical team(s) [${expected}]`
      );
    }

    return windowMatches[0]!;
  }
}
