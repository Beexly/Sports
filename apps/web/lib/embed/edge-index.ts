/**
 * Free Edge Index embed — distribution surface (Session orbit / DEC-017).
 *
 * Public, no auth. Edge Index is free by design; confidence and factor trail
 * are never loaded here. Fail-closed: missing game → honest empty badge.
 * Pure projection over loadGameRoom FREE entitlements.
 */
import { MODEL_VERSION, toEdgeIndex } from "@sports/prediction-engine";
import { loadGameRoom } from "@/lib/game-room/load";

export interface EdgeIndexEmbedData {
  readonly gameId: string;
  readonly matchup: string;
  readonly sport: string;
  readonly edgeIndex: number | null;
  readonly modelVersion: string;
  readonly bootstrap: boolean;
  readonly honestEmpty: boolean;
  readonly emptyReason: string | null;
  readonly siteUrl: string;
}

const SITE = "https://www.galaxysportsedge.com";

export function formatEdgeIndex(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const n = Math.round(value);
  if (n > 0) return `+${n}`;
  return String(n);
}

export function buildEmbedSnippet(gameId: string, origin = SITE): string {
  const src = `${origin.replace(/\/$/, "")}/embed/edge-index/${encodeURIComponent(gameId)}`;
  return `<iframe src="${src}" title="Galaxy Edge Index" width="320" height="120" loading="lazy" style="border:0;border-radius:12px;overflow:hidden;background:#0a0a0b"></iframe>`;
}

/**
 * Load embed payload. Always FREE entitlements (no confidence, no line movement).
 */
export async function loadEdgeIndexEmbed(gameId: string): Promise<EdgeIndexEmbedData> {
  const id = gameId?.trim() ?? "";
  if (!id) {
    return {
      gameId: "",
      matchup: "Unknown matchup",
      sport: "",
      edgeIndex: null,
      modelVersion: MODEL_VERSION,
      bootstrap: false,
      honestEmpty: true,
      emptyReason: "Missing game id",
      siteUrl: SITE,
    };
  }

  const room = await loadGameRoom(id, {
    canSeeFactorBreakdown: false,
    canSeeLineMovement: false,
  });

  if (!room) {
    return {
      gameId: id,
      matchup: "Game not found",
      sport: "",
      edgeIndex: null,
      modelVersion: MODEL_VERSION,
      bootstrap: false,
      honestEmpty: true,
      emptyReason: "Game not found or not available",
      siteUrl: SITE,
    };
  }

  const raw = room.node.marketPulse.edgeIndex;
  const edgeIndex =
    typeof raw === "number" ? toEdgeIndex(raw) : raw === null ? null : toEdgeIndex(Number(raw));
  const bootstrap = room.node.marketPulse.gatedByBootstrap;
  const honestEmpty = edgeIndex === null || bootstrap;

  return {
    gameId: id,
    matchup: room.node.matchup,
    sport: room.node.sport,
    edgeIndex: bootstrap ? null : edgeIndex,
    modelVersion: MODEL_VERSION,
    bootstrap,
    honestEmpty,
    emptyReason: bootstrap
      ? "Bootstrap / gated — index withheld"
      : edgeIndex === null
        ? "No Edge Index yet"
        : null,
    siteUrl: SITE,
  };
}
