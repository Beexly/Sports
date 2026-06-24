import type { CreditEarnReason } from "../credit-constitution.js";
import type { DistrictId } from "../world/districts.js";
import type { WeatherId } from "../world/sports-weather.js";

export interface CampusCoordinate {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type WritebackTarget =
  | "profile"
  | "sports_iq_xp"
  | "galaxy_score"
  | "inventory"
  | "card_state"
  | "watchlist"
  | "quest_state"
  | "season_progress"
  | "crew_contribution"
  | "gse_prompt_history"
  | "reward_wallet"
  | "admin_event";

export interface ProfileWriteback {
  readonly targets: readonly WritebackTarget[];
  readonly reason: CreditEarnReason;
  readonly xp: number;
  readonly credits: number;
  readonly adminEvent: string;
}

export interface RouteTarget {
  readonly districtId: DistrictId;
  readonly href: string;
  readonly label: string;
}

export interface ObjectiveDef {
  readonly id: string;
  readonly label: string;
  readonly kind: "talk" | "route" | "signal_check" | "inventory" | "boss" | "crew" | "inspect";
  readonly targetId: string;
}

export interface QuestDef {
  readonly id: string;
  readonly title: string;
  readonly districtId: DistrictId;
  readonly prerequisites: readonly string[];
  readonly objectives: readonly ObjectiveDef[];
  readonly dialogueTriggers: readonly string[];
  readonly repeatable: "never" | "daily" | "weekly";
  readonly rewards: ProfileWriteback;
  readonly routeTargets: readonly RouteTarget[];
}

export interface MissionDef {
  readonly id: string;
  readonly title: string;
  readonly cadence: "main" | "side" | "daily" | "weekly" | "district" | "crew" | "weather";
  readonly districtId: DistrictId;
  readonly summary: string;
  readonly questIds: readonly string[];
  readonly rewards: ProfileWriteback | null;
  readonly routeTarget: RouteTarget | null;
}

export interface GameSkillDef {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly districtId: DistrictId;
  readonly actions: readonly string[];
  readonly writebackTarget: WritebackTarget;
}

export interface InventoryItemDef {
  readonly id: string;
  readonly name: string;
  readonly kind: "item" | "card" | "badge" | "tool" | "pass";
  readonly source: string;
  readonly use: string;
  readonly linkedDistrictId: DistrictId;
  readonly progressionEffect: string;
  readonly tradeableForCash: false;
  readonly realWorldSubject: false;
}

export interface NpcDef {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly districtId: DistrictId;
  readonly routeTarget: RouteTarget;
  readonly dialogueIds: readonly string[];
  readonly position?: CampusCoordinate;
  readonly interactionRadius?: number;
  readonly animationState?: "idle" | "patrol" | "broadcast" | "guard";
}

export interface DialogueLine {
  readonly id: string;
  readonly npcId: string;
  readonly text: string;
  readonly weatherVariants: Partial<Record<WeatherId, string>>;
  readonly questId?: string;
}

export interface WeatherGameplayEffect {
  readonly weatherId: WeatherId;
  readonly lighting: string;
  readonly npcDialogueTone: string;
  readonly questAvailability: readonly string[];
  readonly cardState: string;
  readonly bossRotation: readonly string[];
  readonly districtPriority: readonly DistrictId[];
  readonly gsePrompt: string;
  readonly broadcastEvent: string;
}

export interface ProgressionAction {
  readonly id: string;
  readonly label: string;
  readonly writeback: ProfileWriteback;
  readonly idempotencyKeyParts: readonly string[];
}

export interface AntiAbuseRule {
  readonly id: string;
  readonly blocks: string;
  readonly enforcement: string;
  readonly adminEvent: string;
}

export interface FutureCitySystem {
  readonly id: string;
  readonly label: string;
  readonly purpose: string;
  readonly firstSafeVersion: string;
  readonly blockedDomains: readonly string[];
}

export interface QuestRuleDef {
  readonly id: string;
  readonly trigger: "talk" | "inspect" | "route" | "signal_check" | "boss_clear" | "blacktop_complete";
  readonly condition: string;
  readonly action: string;
  readonly reward: ProfileWriteback;
  readonly writeback: readonly WritebackTarget[];
  readonly route: RouteTarget;
  readonly repeatable: QuestDef["repeatable"];
  readonly antiAbuse: readonly string[];
}

export interface GameBossDef {
  readonly id: string;
  readonly name: string;
  readonly lesson: string;
  readonly signalPattern: string;
  readonly rewardItemId: string;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly unlockQuestId: string;
  readonly sceneMarkerId: string;
}

export interface BlacktopGameDef {
  readonly id: string;
  readonly title: string;
  readonly mode: "playable" | "preview";
  readonly rules: readonly string[];
  readonly prompts: readonly string[];
  readonly reward: ProfileWriteback;
  readonly xpSkillIds: readonly string[];
  readonly route: RouteTarget;
}

export interface GhostPresenceDef {
  readonly id: string;
  readonly label: string;
  readonly role: string;
  readonly disclosedAs: "ghost" | "ai" | "system";
  readonly path: readonly CampusCoordinate[];
  readonly dialogue: string;
}

export interface DistrictReputationDef {
  readonly districtId: DistrictId;
  readonly label: string;
  readonly startingReputation: number;
  readonly earnedByQuestIds: readonly string[];
}
