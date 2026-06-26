/**
 * ENTITY GRAPH / KNOWLEDGE GRAPH BRIDGE (Addendum III).
 *
 * One of the hardest problems in becoming a stat provider is identity resolution: The Odds API says
 * "Man United", a soccer API says "Manchester United F.C.", Google has `/m/050fh`, another provider has
 * its own id. The Entity Passport anchors all of them to ONE GSE entity, using the Google KGMID and
 * provider aliases as anchors.
 *
 * Reuses entity-spine (`gseEntityId`, `ExternalEntityMapping`, `resolveToGse`, `findCollisions`) — this
 * is the cross-provider mapping layer on top of it, not a parallel system. A KGMID helps IDENTITY; it
 * does NOT prove current roster/stat truth. Aliases resolve only with sport/league context, conflicts
 * are never auto-merged, and CANONICAL status requires cross-verification.
 *
 * Pure + deterministic. Spec: docs/product/PUBLIC_OBSERVER_LEDGER.md.
 */

import { gseEntityId, type GseEntityId, type GseEntityKind } from "./entity-spine.js";
import type { SerpApiKgEntity } from "./serpapi-google-sports.js";

export type EntityPassportType = "TEAM" | "PLAYER" | "ATHLETE" | "VENUE" | "LEAGUE" | "TOURNAMENT" | "BOOKMAKER" | "MARKET";

export type EntityPassportStatus = "DISCOVERED" | "ALIAS_ONLY" | "CROSS_VERIFIED" | "CANONICAL" | "CONFLICTED" | "RETIRED";

export interface EntityPassport {
  readonly gseEntityId: GseEntityId;
  readonly entityType: EntityPassportType;
  readonly canonicalName: string;
  readonly sport: string | null;
  readonly league: string | null;
  readonly country: string | null;
  readonly aliases: readonly string[];
  readonly providerIds: Readonly<Record<string, string>>;
  readonly googleKgmid: string | null;
  readonly confidence: number; // 0..1
  readonly sourceRefs: readonly string[];
  readonly rightsStatus: "review_required" | "ok_facts" | "blocked";
  readonly lastVerifiedAt: string | null;
  readonly status: EntityPassportStatus;
}

const KIND_BY_TYPE: Readonly<Record<EntityPassportType, GseEntityKind>> = {
  TEAM: "team", PLAYER: "player", ATHLETE: "player", VENUE: "team", LEAGUE: "league",
  TOURNAMENT: "league", BOOKMAKER: "book", MARKET: "market",
};

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
}

/** Create a DISCOVERED entity candidate from a Google Sports KG entity — a kgmid anchor, not roster truth. */
export function createEntityCandidateFromGoogleSports(kg: SerpApiKgEntity, ctx: { sport?: string | null; league?: string | null; country?: string | null } = {}): EntityPassport {
  const entityType: EntityPassportType = kg.entityType;
  return {
    gseEntityId: gseEntityId(KIND_BY_TYPE[entityType], `${ctx.sport ?? "x"}_${slug(kg.name)}`),
    entityType,
    canonicalName: kg.name,
    sport: ctx.sport ?? null,
    league: ctx.league ?? null,
    country: ctx.country ?? null,
    aliases: [kg.name],
    providerIds: {},
    googleKgmid: kg.kgmid,
    confidence: 0.4, // a kgmid is a strong identity anchor, but unverified for current truth
    sourceRefs: [`serpapi-google-sports:kgmid:${kg.kgmid}`],
    rightsStatus: "review_required",
    lastVerifiedAt: null,
    status: "DISCOVERED",
  };
}

/** Link a provider's entity id to a GSE entity (adds a providerId, advances to ALIAS_ONLY). */
export function linkProviderEntityToGseEntity(passport: EntityPassport, provider: string, providerEntityId: string, alias?: string): EntityPassport {
  const aliases = alias && !passport.aliases.includes(alias) ? [...passport.aliases, alias] : passport.aliases;
  return {
    ...passport,
    providerIds: { ...passport.providerIds, [provider]: providerEntityId },
    aliases,
    confidence: Math.min(0.7, passport.confidence + 0.1),
    status: passport.status === "DISCOVERED" ? "ALIAS_ONLY" : passport.status,
    sourceRefs: [...passport.sourceRefs, `${provider}:${providerEntityId}`],
  };
}

/** Resolve an alias to an entity — ONLY within a matching sport/league context (never blind). */
export function resolveEntityAlias(passports: readonly EntityPassport[], alias: string, ctx: { sport?: string | null; league?: string | null }): EntityPassport | null {
  const a = alias.toLowerCase();
  const matches = passports.filter(
    (p) =>
      p.aliases.some((x) => x.toLowerCase() === a) &&
      (ctx.sport == null || p.sport == null || p.sport === ctx.sport) &&
      (ctx.league == null || p.league == null || p.league === ctx.league),
  );
  // refuse to resolve an ambiguous alias (more than one candidate) — never auto-pick
  return matches.length === 1 ? matches[0]! : null;
}

/** Detect alias conflicts: the same alias anchored to more than one distinct GSE entity. */
export function detectEntityConflict(passports: readonly EntityPassport[]): ReadonlyArray<{ alias: string; entityIds: readonly GseEntityId[] }> {
  const byAlias = new Map<string, Set<GseEntityId>>();
  for (const p of passports) {
    for (const al of p.aliases) {
      const k = al.toLowerCase();
      (byAlias.get(k) ?? byAlias.set(k, new Set()).get(k)!).add(p.gseEntityId);
    }
  }
  const out: { alias: string; entityIds: GseEntityId[] }[] = [];
  for (const [alias, ids] of byAlias) if (ids.size > 1) out.push({ alias, entityIds: [...ids] });
  return out;
}

/** Cross-verify a passport against an official/licensed confirmation — only this can reach CANONICAL. */
export function crossVerifyEntity(passport: EntityPassport, args: { officialName: string; lastVerifiedAt: string }): EntityPassport {
  const confirmed = passport.aliases.some((a) => a.toLowerCase() === args.officialName.toLowerCase()) || passport.canonicalName.toLowerCase() === args.officialName.toLowerCase();
  return {
    ...passport,
    status: confirmed ? "CANONICAL" : "CONFLICTED",
    confidence: confirmed ? Math.max(passport.confidence, 0.9) : passport.confidence,
    lastVerifiedAt: args.lastVerifiedAt,
    rightsStatus: confirmed ? "ok_facts" : passport.rightsStatus,
  };
}

export function entityPassportFor(passports: readonly EntityPassport[], id: GseEntityId): EntityPassport | null {
  return passports.find((p) => p.gseEntityId === id) ?? null;
}
