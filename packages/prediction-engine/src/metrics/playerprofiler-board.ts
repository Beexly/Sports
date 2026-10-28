/**
 * PlayerProfiler big_board — typed consensus-ranking prior.
 *
 * Source: playerprofiler.com/wp-admin/admin-ajax.php?action=big_board, captured
 * unauthenticated, 73,511 bytes. Attribution: "PlayerProfiler big_board capture".
 *
 * SHA-256 of the captured body is already in telemetry and is NOT re-appended here:
 *   522fc601ba795898e7acd1f473d47416dc40e1aa99dc2e174469e7b54fb3c246
 *
 * The payload carries its own source list. Those ten names are the sources; no
 * weight is invented for any of them. `Final Index` and `Total` are RANK INDICES,
 * not probabilities and not EPA. A lower index is better; the payload's own first
 * row carries index 1.0.
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

export const PP_ATTRIBUTION = "PlayerProfiler big_board capture";
export const PP_SHA256 =
  "522fc601ba795898e7acd1f473d47416dc40e1aa99dc2e174469e7b54fb3c246";
export const PP_CAPTURE =
  "artifacts/api-captures/playerprofiler.com/playerprofiler_com_wp_admin_admin_ajax_php_action_big_board.json";

/** The ten source ranks the payload itself names, in payload order. */
export const PP_SOURCES = [
  "CBS",
  "PFF",
  "Draft Network",
  "ESPN",
  "Pro Football Network",
  "PlayerProfiler",
  "DraftCountdown",
  "BleacherReport",
  "Sharp Football",
  "Roster Watch",
] as const;

export type PpSource = (typeof PP_SOURCES)[number];

export interface PpBoardEntry {
  readonly player: string;
  readonly playerId: string;
  readonly position: string;
  /** Composite rank index. Not a probability, not an EPA. Lower is better. */
  readonly finalIndex: number | null;
  /** Per-source rank, null where the source did not rank the player. */
  readonly ranks: Readonly<Partial<Record<PpSource, number>>>;
  readonly total: number | null;
  readonly attribution: typeof PP_ATTRIBUTION;
}

export interface PpBoard {
  readonly capturePath: string;
  readonly sha256: string;
  readonly attribution: typeof PP_ATTRIBUTION;
  readonly sources: readonly PpSource[];
  readonly entries: readonly PpBoardEntry[];
}

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Parse a captured big_board payload.
 *
 * The capture is `{ success: true, data: [...] }`. A row without a Player is
 * skipped rather than emitted empty.
 */
export function parseBigBoard(payload: unknown, capturePath: string = PP_CAPTURE): PpBoard {
  const root = payload as { data?: unknown } | null;
  const rows = Array.isArray(root?.data) ? (root!.data as Record<string, unknown>[]) : [];

  const entries: PpBoardEntry[] = [];
  for (const r of rows) {
    const player = str(r["Player"]);
    if (!player) continue;
    const ranks: Partial<Record<PpSource, number>> = {};
    for (const s of PP_SOURCES) {
      const v = num(r[s]);
      if (v !== null) ranks[s] = v;
    }
    entries.push({
      player,
      playerId: str(r["Player_ID"]),
      position: str(r["Position"]),
      finalIndex: num(r["Final Index"]),
      ranks,
      total: num(r["Total"]),
      attribution: PP_ATTRIBUTION,
    });
  }

  return {
    capturePath,
    sha256: PP_SHA256,
    attribution: PP_ATTRIBUTION,
    sources: PP_SOURCES,
    entries,
  };
}

/** Read the capture from disk and parse it. */
export async function loadBigBoard(capturePath: string = PP_CAPTURE): Promise<PpBoard> {
  const abs = capturePath === PP_CAPTURE ? resolve(REPO_ROOT, PP_CAPTURE) : capturePath;
  const text = await readFile(abs, "utf8");
  return parseBigBoard(JSON.parse(text), capturePath);
}

/**
 * Look a player up by id for a cross-source rank signal.
 *
 * Returns null when the board does not carry the player — the caller keeps its own
 * gap rather than receiving a fabricated rank.
 */
export function consensusFor(board: PpBoard, playerId: string): PpBoardEntry | null {
  return board.entries.find((e) => e.playerId === playerId) ?? null;
}
