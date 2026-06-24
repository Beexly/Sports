export type FinalAssetRoom = "rookie-plaza" | "beat-wall" | "blacktop" | "depths";

export type FinalAssetKind =
  | "environment-glb"
  | "character-glb"
  | "prop-glb"
  | "ui-texture"
  | "audio"
  | "vfx";

export type FinalAssetSourceType = "procedural-fallback" | "licensed-open-asset" | "higgsfield-generated" | "custom-authored";

export interface FinalAssetSlot {
  readonly id: string;
  readonly room: FinalAssetRoom;
  readonly kind: FinalAssetKind;
  readonly label: string;
  readonly runtimePath: string;
  readonly fallbackBlueprintId: string;
  readonly sourceType: FinalAssetSourceType;
  readonly requiredForLaunch: boolean;
  readonly accepted: boolean;
  readonly licenseReviewed: boolean;
  readonly ipReviewed: boolean;
  readonly performanceReviewed: boolean;
  readonly notes: string;
}

export interface FinalAssetReadiness {
  readonly totalSlots: number;
  readonly acceptedSlots: number;
  readonly requiredSlots: number;
  readonly acceptedRequiredSlots: number;
  readonly readyForPublicLaunch: boolean;
  readonly blockers: readonly string[];
}

export const GALAXY_FINAL_ASSET_SLOTS: readonly FinalAssetSlot[] = [
  {
    id: "rookie-plaza-environment-glb",
    room: "rookie-plaza",
    kind: "environment-glb",
    label: "Rookie Plaza authored environment shell",
    runtimePath: "/assets/galaxy/rookie-plaza/environment.glb",
    fallbackBlueprintId: "rookie-plaza-procedural-floor",
    sourceType: "procedural-fallback",
    requiredForLaunch: true,
    accepted: false,
    licenseReviewed: false,
    ipReviewed: false,
    performanceReviewed: false,
    notes: "Replaces the designed primitive grid, rails, gates, and light mast kit after GLB review.",
  },
  {
    id: "rookie-character-set-glb",
    room: "rookie-plaza",
    kind: "character-glb",
    label: "Rookie and NPC character silhouettes",
    runtimePath: "/assets/galaxy/rookie-plaza/characters.glb",
    fallbackBlueprintId: "npc-signal-totems",
    sourceType: "procedural-fallback",
    requiredForLaunch: true,
    accepted: false,
    licenseReviewed: false,
    ipReviewed: false,
    performanceReviewed: false,
    notes: "Must avoid athlete likeness, team marks, casino styling, and ripped game assets.",
  },
  {
    id: "beat-wall-instrument-glb",
    room: "beat-wall",
    kind: "environment-glb",
    label: "Beat Broadcast Wall authored instrument",
    runtimePath: "/assets/galaxy/beat/broadcast-wall.glb",
    fallbackBlueprintId: "beat-ledger-instrument",
    sourceType: "procedural-fallback",
    requiredForLaunch: true,
    accepted: false,
    licenseReviewed: false,
    ipReviewed: false,
    performanceReviewed: false,
    notes: "Replaces procedural backplane, rings, towers, and route trails after visual QA.",
  },
  {
    id: "blacktop-court-texture",
    room: "blacktop",
    kind: "ui-texture",
    label: "Signal Sprint court texture and buzzer FX",
    runtimePath: "/assets/galaxy/blacktop/signal-sprint-court.webp",
    fallbackBlueprintId: "signal-sprint-court",
    sourceType: "procedural-fallback",
    requiredForLaunch: false,
    accepted: false,
    licenseReviewed: false,
    ipReviewed: false,
    performanceReviewed: false,
    notes: "Can remain procedural for internal QA; final pack improves trailer/screenshots.",
  },
  {
    id: "beat-audio-bed",
    room: "beat-wall",
    kind: "audio",
    label: "Beat room pulse bed",
    runtimePath: "/assets/galaxy/beat/pulse-bed.webm",
    fallbackBlueprintId: "beat-ledger-instrument",
    sourceType: "procedural-fallback",
    requiredForLaunch: false,
    accepted: false,
    licenseReviewed: false,
    ipReviewed: false,
    performanceReviewed: false,
    notes: "Optional until an accepted rights-safe audio source exists.",
  },
] as const;

export function summarizeFinalAssetReadiness(slots: readonly FinalAssetSlot[] = GALAXY_FINAL_ASSET_SLOTS): FinalAssetReadiness {
  const required = slots.filter((slot) => slot.requiredForLaunch);
  const blockers = required
    .filter((slot) => !isFinalAssetSlotAccepted(slot))
    .map((slot) => slot.id);

  return {
    totalSlots: slots.length,
    acceptedSlots: slots.filter(isFinalAssetSlotAccepted).length,
    requiredSlots: required.length,
    acceptedRequiredSlots: required.filter(isFinalAssetSlotAccepted).length,
    readyForPublicLaunch: blockers.length === 0,
    blockers,
  };
}

export function isFinalAssetSlotAccepted(slot: FinalAssetSlot): boolean {
  return slot.accepted && slot.licenseReviewed && slot.ipReviewed && slot.performanceReviewed;
}
