/**
 * @sports/galaxy-engine — the playable layer's mechanical core.
 *
 * Pure, DB-free, fully unit-tested game logic for Galaxy Dynasty: the Calibration
 * Engine (bible §4.1), the Credit Constitution (§4.2), the Signal Check (§7),
 * identity (archetypes/factions/skills), the Public Trap PvM boss, the Language
 * Law, and the Higgsfield asset-brief pipeline. Persistence + routing live in the
 * app; this package never imports the DB or Next.js.
 */

// Identity
export {
  ARCHETYPES,
  FACTIONS,
  getArchetype,
  getFaction,
  isArchetypeId,
  isFactionId,
} from "./archetypes.js";
export type {
  GalaxyArchetypeId,
  GalaxyFactionId,
  ArchetypeDef,
  FactionDef,
} from "./archetypes.js";

// Skills & perks
export {
  SPORTS_IQ_SKILLS,
  PRIMARY_SKILL_KEY,
  PERK_GATES,
  getSkillDef,
  isSupportedSkill,
  unlockedPerks,
  nextPerk,
} from "./skills.js";
export type { SportsIqSkillDef, PerkGate } from "./skills.js";

// Economy & progression constants
export * from "./constants.js";

// The Credit Constitution
export {
  CASH_OUT_SUPPORTED,
  CREDIT_EARN_REASONS,
  isCreditEarnReason,
  awardCredits,
  validateLedger,
  assertNoCashOut,
} from "./credit-constitution.js";
export type { CreditEarnReason, CreditLedgerEntry } from "./credit-constitution.js";

// The Calibration Engine
export {
  confidenceToProbability,
  brierScore,
  calibrationQuality,
  rewardForSignalCheck,
} from "./calibration.js";
export type { BinaryOutcome, CalibrationReward } from "./calibration.js";

// Leveling
export {
  skillLevelFromXp,
  characterLevelFromXp,
  totalSkillXpForLevel,
} from "./leveling.js";
export type { LevelState } from "./leveling.js";

// Grading adapter (wraps @sports/prediction-engine)
export { gradeSignalPrediction } from "./grading-adapter.js";
export type {
  SignalPredictionInput,
  GameResult,
  SettlementResult,
} from "./grading-adapter.js";

// The Signal Check
export {
  evaluateSignalCheck,
  gradeMarketSignalCheck,
  gradeBinarySignalCheck,
} from "./signal-check.js";
export type {
  SignalCheckSurface,
  SignalCheckOutcome,
  SignalCheckBreakdownRow,
} from "./signal-check.js";

// PvM boss — The Public Trap
export {
  PUBLIC_TRAP_SCENARIOS,
  PUBLIC_TRAP_BOSS_KEY,
  PUBLIC_TRAP_MERCH_SKU,
  evaluatePublicTrapStep,
  evaluatePublicTrapEncounter,
} from "./public-trap.js";
export type {
  TrapSide,
  PublicTrapScenario,
  PublicTrapStepResult,
  PublicTrapEncounterResult,
} from "./public-trap.js";

// The Depths — 5-boss registry (Stage 2)
export {
  BOSSES,
  getBoss,
  buildBossAssetBrief,
  evaluateBossStep,
  evaluateBossEncounter,
} from "./bosses.js";
export type {
  BossSide,
  BossDifficulty,
  BossScenario,
  BossDef,
  BossStepResult,
  BossEncounterResult,
} from "./bosses.js";

// Cosmetics economy (bible §4.2 sanctioned monetization)
export {
  COSMETICS_CATALOG,
  COSMETIC_CATEGORIES,
  getCosmetic,
  cosmeticsByCategory,
  starterCosmetics,
  isCosmeticUnlocked,
} from "./cosmetics.js";
export type {
  CosmeticCategory,
  CosmeticSource,
  CosmeticRequirement,
  CosmeticDef,
  CosmeticSlot,
  CosmeticUnlockContext,
} from "./cosmetics.js";

// Boosts & consumables (Stage 3 revenue — never affects outcomes)
export {
  CONSUMABLES_CATALOG,
  CONSUMABLE_EFFECT_KINDS,
  CONSUMABLE_FORBIDDEN_DOMAINS,
  getConsumable,
  combinedMultiplier,
  isNonOutcomeEffect,
} from "./consumables.js";
export type {
  ConsumableDef,
  ConsumableEffectKind,
  ConsumableSource,
  ActiveEffect,
} from "./consumables.js";

// Crew roles & weekly missions (Stage 2 retention)
export { CREW_ROLES, getCrewRole, isCrewLane } from "./crew-roles.js";
export type { CrewLane, CrewRoleDef } from "./crew-roles.js";

// Galaxy Score — one universal identity metric (bible §3)
export {
  computeGalaxyScore,
  galaxyScoreTier,
  GALAXY_SCORE_MAX,
} from "./galaxy-score.js";
export type { GalaxyScoreInput, GalaxyScore, GalaxyScoreComponent } from "./galaxy-score.js";

// Ranked rating (Stage 2)
export {
  BASE_RATING,
  RATING_TIERS,
  expectedScore,
  updateRating,
  ratingTier,
  ratingTierProgress,
} from "./rating.js";
export type { RatingTier, DuelOutcomeScore } from "./rating.js";

// Signal Duel (async PvP, Stage 2)
export { scoreDuelEntry, resolveDuel } from "./duel.js";
export type { DuelWinner, DuelEntryScore, DuelResolution } from "./duel.js";

// Season Program (Stage 2 "Signal Cup")
export {
  CURRENT_SEASON_KEY,
  CURRENT_SEASON_NAME,
  SEASON_TIERS,
  SEASON_OBJECTIVES,
  objectivesByCadence,
  seasonPointsForXp,
  seasonProgress,
  claimableTiers,
} from "./season.js";
export type {
  SeasonTier,
  SeasonProgress,
  SeasonObjective,
  ObjectiveCadence,
  ObjectiveTrack,
} from "./season.js";

// Brand Language Law
export {
  FORBIDDEN_PUBLIC_TERMS,
  MANDATORY_VISUAL_LINE,
  scanText,
  isBrandSafe,
  assertBrandSafe,
} from "./language-law.js";
export type { ForbiddenTerm, LanguageViolation } from "./language-law.js";

// World graph — districts, sports weather, rooms (world-graph architecture)
export { DISTRICTS, getDistrict, isDistrictId } from "./world/districts.js";
export type { DistrictDef, DistrictId, RoomType } from "./world/districts.js";
export {
  SPORTS_WEATHER,
  getWeather,
  activeWeatherForDay,
  currentDayIndex,
} from "./world/sports-weather.js";
export type { SportsWeather, WeatherId } from "./world/sports-weather.js";
export { ROOM_REGISTRY, getRoom, roomsForDistrict } from "./world/rooms.js";
export type { RoomDef } from "./world/rooms.js";

// Higgsfield asset-brief pipeline
export {
  buildAssetBrief,
  placeholderPalette,
  ASSET_BRIEF_NEGATIVE_PROMPT,
} from "./asset-brief.js";
export type { AssetKind, AssetBriefInput, AssetBrief } from "./asset-brief.js";
