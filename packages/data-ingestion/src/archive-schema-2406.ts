/**
 * NFL archive DB schema descriptors (games, pbp, rosters, injuries, odds, transcripts)
 *
 * Research port: arXiv:2406.01273
 * Normalized lane: nlp | Doctrine: PROPRIETARY_EDGE
 *
 * Structured archive descriptors for the NFL pipeline port: games, play-by-play, rosters, injuries, odds/CLV history, commentary transcripts (Whisper on Game Pass audio). Table descriptors + required-column validation for loaders; the validator's ablation contribution is a live-data concern.
 *
 * ACCEPTANCE GATE: ACCEPTED (ADAPT): open-source reproducible pipeline + controlled ablation isolating the validator's contribution + honest failure documentation. Schema validation must pass before any archive load.
 */

export interface ArchiveTable {
  name: string;
  description: string;
  requiredColumns: string[];
  grain: string;
}

export const NFL_ARCHIVE_TABLES: ArchiveTable[] = [
  { name: "games", description: "game-level results and metadata", requiredColumns: ["game_id", "season", "week", "home_team", "away_team"], grain: "one row per game" },
  { name: "play_by_play", description: "nflverse play-by-play", requiredColumns: ["play_id", "game_id", "down", "ydstogo", "yardline_100", "epa"], grain: "one row per play" },
  { name: "rosters", description: "weekly roster snapshots", requiredColumns: ["player_id", "season", "week", "team"], grain: "one row per player-week" },
  { name: "injuries", description: "injury reports", requiredColumns: ["player_id", "season", "week", "status"], grain: "one row per player-week report" },
  { name: "odds_history", description: "odds and CLV history", requiredColumns: ["game_id", "book", "market", "price", "captured_at"], grain: "one row per book-market snapshot" },
  { name: "commentary_transcripts", description: "Whisper transcripts of broadcast audio", requiredColumns: ["game_id", "start_s", "end_s", "text", "confidence"], grain: "one row per segment" },
];

export interface LoadValidation {
  table: string;
  ok: boolean;
  missingColumns: string[];
  rowCount: number;
}

/** Validate a loaded frame against the archive descriptor. */
export function validateLoad(tableName: string, columns: string[], rowCount: number): LoadValidation {
  const table = NFL_ARCHIVE_TABLES.find((t) => t.name === tableName);
  if (!table) return { table: tableName, ok: false, missingColumns: [], rowCount };
  const have = new Set(columns);
  const missingColumns = table.requiredColumns.filter((c) => !have.has(c));
  return { table: tableName, ok: missingColumns.length === 0, missingColumns, rowCount };
}


/** Live-data gate: stays off until archive schema validated against the NFL archive before any load. */
export const GSE_ARCHIVE_SCHEMA_ENABLED = false;
