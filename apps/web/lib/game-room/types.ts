import type { GameIntelligenceNode, MonetizationSurface } from "@/lib/intelligence-graph";
import type {
  DecisionChangeCertificate,
  EpistemicDelta,
  IntelligenceEvent,
  PublicationState,
} from "@/lib/intelligence-playback";
import type { PickPremortemNote } from "@/lib/premortem/build";

export interface GameRoomTimelineItem {
  readonly id: string;
  readonly label: string;
  readonly source: string;
  readonly fetchedAt: string;
  readonly status: "LIVE" | "STALE" | "BOOTSTRAP";
}

export interface GameRoomMemory {
  readonly status: "PREGAME" | "SETTLED_WIN" | "SETTLED_LOSS" | "SETTLED_PUSH";
  readonly body: string;
  readonly settledAt: string | null;
}

export interface GameRoomPlayback {
  readonly digest: string;
  readonly publication: PublicationState;
  readonly events: readonly IntelligenceEvent[];
  readonly deltas: readonly EpistemicDelta[];
  readonly changeCertificate: DecisionChangeCertificate;
}

export interface GameRoomData {
  readonly node: GameIntelligenceNode;
  readonly slateWeather: {
    readonly sport: string;
    readonly gameCount: number;
    readonly averageEvidenceScore: number;
    readonly bootstrapGameCount: number;
  };
  readonly timeline: readonly GameRoomTimelineItem[];
  readonly premortem: PickPremortemNote | null;
  readonly lenses: readonly MonetizationSurface[];
  readonly memory: GameRoomMemory;
  readonly playback: GameRoomPlayback | null;
}

export interface GameRoomViewer {
  readonly canSeePremiumPicks: boolean;
  readonly canSeeConfidence: boolean;
  readonly canSeeFactorBreakdown: boolean;
  readonly canSeeLineMovement: boolean;
}
