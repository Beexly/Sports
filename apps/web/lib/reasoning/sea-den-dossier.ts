import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface PremiseRecord {
  readonly premise_id: string;
  readonly game_id: string;
  readonly census_ids: readonly string[];
  readonly edge_ids: readonly string[];
  readonly layer: string;
  readonly TRIGGER: string;
  readonly AFFECTED: string;
  readonly DIRECTION: string;
  readonly MAGNITUDE?: string;
  readonly p: number;
  readonly confidence_class: string;
  readonly non_stat_context: boolean;
  readonly visible_at: string;
  readonly stamp_source: string;
  readonly resolution_criterion: string;
}

export interface NonStatHighlight {
  readonly premise_id: string;
  readonly category: string;
  readonly summary: string;
  readonly stamp_source: string;
}

export interface DossierV2 {
  readonly schema: string;
  readonly version: number;
  readonly prev_version_sha256: string;
  readonly game_id: string;
  readonly season: number;
  readonly week: number;
  readonly matchup: string;
  readonly kickoff_utc: string;
  readonly pit_cutoff_utc: string;
  readonly server_stamped_at: string;
  readonly retro: boolean;
  readonly emission_status: "ZERO_OBJECT";
  readonly walk_forward_gate: {
    readonly path: string;
    readonly passed: boolean;
    readonly baseline_crps: number;
    readonly best_verified_crps: number;
    readonly bar_crps: number;
    readonly banner: string;
  };
  readonly t0_line_move_forecast: {
    readonly status: string;
    readonly direction: string | null;
    readonly earliest_observed_at: string;
    readonly latest_observed_at?: string;
    readonly observed_window_move?: {
      readonly spread_open_to_latest: string;
      readonly total_open_to_latest: string;
      readonly moneyline_open_to_latest: string;
    };
    readonly reason: string;
  };
  readonly graph_summary: {
    readonly graph_instance: string;
    readonly total_edges: number;
    readonly total_nodes: number;
    readonly edges_by_type: Readonly<Record<string, number>>;
  };
  readonly situational_stack_summary: {
    readonly rest_travel_altitude: string;
    readonly injury_context: string;
    readonly short_week_physical_prior_game: string;
    readonly market_microstructure: string;
    readonly new_layer_added: string;
  };
  readonly non_stat_premises_highlighted: readonly NonStatHighlight[];
  readonly premise_count: number;
  readonly non_stat_premise_count: number;
  readonly active_census_ids: readonly string[];
  readonly premises: readonly PremiseRecord[];
}

export interface DepthLadderSummary {
  readonly generated_at: string;
  readonly game_id: string;
  readonly dossier_version: number;
  readonly dossier_sha256: string;
  readonly total_catalog_signals: number;
  readonly live_wired_signals_count: number;
  readonly shadow_ledger_rows_count: number;
  readonly accounting_check_279: number;
  readonly rung_counts: {
    readonly L0: number;
    readonly L1: number;
    readonly L2: number;
    readonly L3: number;
    readonly L4: number;
    readonly L5: number;
    readonly BLOCKED: number;
  };
  readonly upgrades_count: number;
  readonly upgrades: readonly {
    readonly census_id: string;
    readonly name: string;
    readonly from_rung: string;
    readonly to_rung: string;
    readonly reason: string;
    readonly stamped_at: string;
  }[];
}

function repoRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith("apps\\web") || cwd.endsWith("apps/web")) {
    return join(cwd, "..", "..");
  }
  return cwd;
}

export function loadSeaDenDossier(): {
  readonly dossier: DossierV2;
  readonly depthLadder: DepthLadderSummary;
  readonly dossierSha256: string;
} {
  const root = repoRoot();
  const dossierPath = join(
    root,
    "introspection",
    "dossiers",
    "2026",
    "06",
    "2026_06_SEA_DEN",
    "v2.json",
  );
  const depthPath = join(root, "introspection", "depth_ladder_2026-10-15.json");
  const dossier = JSON.parse(readFileSync(dossierPath, "utf8")) as DossierV2;
  const depthLadder = JSON.parse(
    readFileSync(depthPath, "utf8"),
  ) as DepthLadderSummary;
  return {
    dossier,
    depthLadder,
    dossierSha256: depthLadder.dossier_sha256,
  };
}
