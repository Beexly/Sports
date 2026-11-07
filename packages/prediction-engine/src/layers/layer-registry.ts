import * as fs from "node:fs";
import * as path from "node:path";

export const ALL_26_LAYER_IDS = [
  "L01_schedule_and_kickoff",
  "L02_totals_and_pace_prior",
  "L03_team_efficiency_baseline",
  "L04_divisional_and_historical",
  "L05_standings_and_incentives",
  "L06_venue_surface_and_weather",
  "L07_officials_and_referee_crew",
  "L08_rest_travel_and_circadian",
  "L09_injuries_and_availability",
  "L10_biomechanics_and_return_to_play",
  "L11_coaching_minds_and_playcallers",
  "L12_trench_matchup_ol_vs_dl",
  "L13_scheme_vs_scheme",
  "L14_player_vs_player",
  "L15_coach_vs_coach",
  "L16_coach_vs_player",
  "L17_player_vs_scheme",
  "L18_scheme_vs_team",
  "L19_pace_and_game_state_clock",
  "L20_usage_snap_route_shares",
  "L21_qb_processing_and_pressure",
  "L22_receiving_separation_and_yac",
  "L23_red_zone_and_goal_line",
  "L24_special_teams_and_field_position",
  "L25_cross_layer_interaction_terms",
  "L26_market_price_check_last",
] as const;

export type LayerId = (typeof ALL_26_LAYER_IDS)[number];

export interface LayerOutputV1 {
  schema_version: "1.0.0";
  layer_id: LayerId;
  layer_number: number;
  game_id: string;
  as_of: string;
  signals: Record<string, unknown>;
  confidence: number;
  provenance: {
    sources: string[];
    equations_executed: number;
    entities_resolved: string[];
  };
  warnings: string[];
}

export interface ContextPacketV1 {
  schema_version: "1.0.0";
  packet_id: string;
  game_id: string;
  home_team: string;
  away_team: string;
  kickoff_utc: string;
  as_of: string;
  temporal_leakage_checked: true;
  entity_resolution_verified: true;
  layers: Record<LayerId, LayerOutputV1>;
  corpus_citations: Array<{
    source_id: string;
    chunk_id: string;
    relevance_reason: string;
  }>;
  completeness: {
    populated_layers: 26;
    total_layers: 26;
    is_complete: true;
  };
}

export function loadContextPacketSync(gameId: string, packetsDir?: string): ContextPacketV1 {
  const repoRoot = path.resolve(__dirname, "../../../..");
  const dir = packetsDir ?? path.join(repoRoot, "data", "context_packets");
  const filePath = path.join(dir, `${gameId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`ContextPacket not found on disk: ${filePath}`);
  }
  const packet = JSON.parse(fs.readFileSync(filePath, "utf-8")) as ContextPacketV1;
  if (packet.as_of >= packet.kickoff_utc) {
    throw new Error(`TemporalLeakageError: as_of (${packet.as_of}) >= kickoff_utc (${packet.kickoff_utc})`);
  }
  for (const lid of ALL_26_LAYER_IDS) {
    if (!packet.layers || !packet.layers[lid]) {
      throw new Error(`IncompleteContextPacketError: missing layer ${lid}`);
    }
  }
  return packet;
}
