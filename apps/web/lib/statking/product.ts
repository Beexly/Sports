import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "../..");
const fallbackRoot = process.cwd();
function readJson<T>(relativePath: string, fallbackValue?: T): T {
  const primary = path.join(root, relativePath);
  const fallback = path.join(fallbackRoot, relativePath);
  const file = fs.existsSync(primary) ? primary : fallback;
  if (!fs.existsSync(file)) {
    // A single missing snapshot must never crash the build/prerender. Callers
    // that pass a fallback get an honest empty state; the rest fail loudly with
    // an actionable message instead of a cryptic ENOENT.
    if (fallbackValue !== undefined) {
      console.warn(`[statking] missing data file ${relativePath} — using empty fallback`);
      return fallbackValue;
    }
    throw new Error(
      `[statking] required data file not found: ${relativePath}. Regenerate with \`npm run statking:product\` / \`npm run statking:all\`.`,
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export interface StatKingPlayer {
  player_id: string; name: string; team: string; position: string; status: string;
  galaxy_player_index: number; fantasy_edge: number; usage_score: number; efficiency_score: number;
  volatility_score: number; role_score: number; trend_score: number; data_confidence: number;
  hidden_value_score: number; mirage_risk: number; missing_data: string[]; source_lineage: string[];
  ppr_points_per_game: number; standard_points_per_game: number; half_ppr_points_per_game: number;
}
export interface StatKingTeam { team_id: string; name: string; points_for: number; points_against: number; offensive_environment: number; defensive_environment: number; fantasy_environment: number; pace_proxy: number; data_confidence: number; }
export interface WeeklyStat { player_id: string; week: number; fantasy_points_ppr: number; touches: number; targets: number; pass_attempts: number; receptions: number; yards: number; }
export interface SourceRecord { source_id: string; canonical_name: string; source_family: string; source_category: string; source_mode: string; legal_gate_status: string; priority_score: number; next_action: string; }
export interface MediaItem { item_id: string; platform: string; source_name: string; title: string; rights_mode: string; activation_status: string; source_trust: number; detected_players: string[]; detected_teams: string[]; topics: string[]; signal_candidate: string; next_action: string; }

export function loadPlayers(): StatKingPlayer[] { return readJson<{players: StatKingPlayer[]}>("data/statking/snapshots/players.json").players; }
export function loadTeams(): StatKingTeam[] { return readJson<{teams: StatKingTeam[]}>("data/statking/snapshots/teams.json").teams; }
export function loadWeeklyStats(): WeeklyStat[] { return readJson<{rows: WeeklyStat[]}>("data/statking/snapshots/player_weekly_stats.json").rows; }
export function loadSources(): SourceRecord[] { return readJson<{sources: SourceRecord[]}>("data/source-atlas/source_registry.json").sources; }
export function loadSummary() { return readJson<{source_count:number; candidate_capacity:number; candidate_count:number; discovery_query_count:number; metric_count:number; systems:string[]}>("data/statking/hardening_summary.json"); }
export function loadAudit() { return readJson<{summary: Record<string, number>; items: Array<{system:string; status:string; priority:string; next_fix:string}>}>("data/statking/real_vs_stubbed_audit.json"); }
export function loadCoverage() { return readJson<{players_sampled:number; teams:number; missing_high_impact:string[]; coverage_by_data_type: Record<string,string>}>("data/statking/coverage/coverage_report.json", {players_sampled:0, teams:0, missing_high_impact:[], coverage_by_data_type:{}}); }
export function loadActiveMetricManifest() { return readJson<{active_calculated_count:number; total_manifest_count:number; metrics:Array<{metric_key:string; name:string; status:string; entity_type:string; visible_status:string}>}>("data/statking/active_metric_manifest.json"); }
export function loadSourceTargets() { return readJson<{top_50_easiest_wins:any[]; top_50_highest_moat_sources:any[]; top_50_requires_license:any[]}>("data/statking/source_targets_top_50.json"); }
export function loadMediaItems(): MediaItem[] { return readJson<{items: MediaItem[]}>("data/statking/snapshots/media_items.json").items; }
export function loadBacktests() { return readJson<{runs:Array<Record<string, unknown>>}>("data/statking/backtests/backtest_summary.json"); }
export function loadComps() { return readJson<{rows:Array<{player_id:string; comparisons:Array<{player_id:string; name:string; similarity_score:number; shared_features:string[]}>}>}>("data/statking/snapshots/player_comps.json").rows; }
export function loadArchetypes() { return readJson<{rows:Array<{player_id:string; archetype:string; confidence:number; explanation:string}>}>("data/statking/snapshots/player_archetypes.json").rows; }

export function getPlayer(id: string): StatKingPlayer | undefined { return loadPlayers().find((p) => p.player_id === id); }
export function rankPlayers(sort: keyof StatKingPlayer = "galaxy_player_index"): StatKingPlayer[] { return [...loadPlayers()].sort((a,b) => Number(b[sort]) - Number(a[sort])); }
export function comparePlayers(aId: string, bId: string) {
  const a = getPlayer(aId) ?? loadPlayers()[0]!; const b = getPlayer(bId) ?? loadPlayers()[1]!;
  const categories = ["galaxy_player_index","usage_score","efficiency_score","fantasy_edge","volatility_score","data_confidence"] as const;
  return { a, b, categories: categories.map((key) => ({ key, a: a[key], b: b[key], winner: key === "volatility_score" ? (a[key] < b[key] ? a.name : b.name) : (a[key] >= b[key] ? a.name : b.name) })) };
}
export function askStatKing(query: string) {
  const q = query.toLowerCase(); const players = loadPlayers();
  if (q.includes("rb") && q.includes("usage")) return { title: "Best RB by usage", rows: players.filter(p=>p.position==="RB").sort((a,b)=>b.usage_score-a.usage_score).slice(0,5) };
  if (q.includes("volatile") || q.includes("volatility")) return { title: "Most volatile players", rows: players.sort((a,b)=>b.volatility_score-a.volatility_score).slice(0,5) };
  if (q.includes("hidden")) return { title: "Hidden value players", rows: players.sort((a,b)=>b.hidden_value_score-a.hidden_value_score).slice(0,5) };
  if (q.includes("mirage")) return { title: "Mirage risk players", rows: players.sort((a,b)=>b.mirage_risk-a.mirage_risk).slice(0,5) };
  if (q.includes("youtube")) return { title: "Top YouTube sources", rows: loadMediaItems().filter(i=>i.platform==="youtube").slice(0,5) };
  if (q.includes("source") || q.includes("activation")) return { title: "Sources needing activation", rows: loadSourceTargets().top_50_easiest_wins.slice(0,5) };
  return { title: "Best players by Galaxy Player Index", rows: rankPlayers().slice(0,5) };
}
export function loadIntegrityStatus() { return readJson<{commands:Array<Record<string, unknown>>; final_recommendation:string; merge_safety:string}>("data/statking/integrity/integrity_status.json"); }
export function loadRightsLedger() { return readJson<{rights_count:number; rights:Array<Record<string, unknown>>}>("data/statking/rights/rights_ledger.json"); }
export function loadRightsGateReport() { return readJson<Record<string, unknown>>("data/statking/rights/rights_gate_report.json"); }
export function loadActivationRoi() { return readJson<Record<string, Array<Record<string, unknown>>>>("data/statking/source_activation_roi.json"); }
export function loadKingGapMap() { return readJson<{gaps:Array<Record<string, unknown>>}>("data/statking/crown/king_gap_map.json"); }
export function loadProofReport() { return readJson<Record<string, unknown>>("data/statking/proof/proof_report.json"); }
export function loadMetricReliability() { return readJson<{metrics:Array<Record<string, unknown>>}>("data/statking/proof/metric_reliability.json"); }
export function loadGeneratedExplanations() { return readJson<{explanations:Array<Record<string, unknown>>}>("data/statking/explanations/generated_explanations.json"); }
export function loadReadinessScores() { return readJson<{pages:Array<Record<string, unknown>>}>("data/statking/readiness/product_readiness_score.json"); }
export function loadUiContracts() { return readJson<{contracts:Array<Record<string, unknown>>}>("data/statking/ui/page_data_contracts.json"); }
export function loadOwnedSignals() { return { notes: readJson<{notes:Array<Record<string, unknown>>}>("data/statking/owned-signals/internal_analyst_notes.json").notes, feedback: readJson<{signals:Array<Record<string, unknown>>}>("data/statking/owned-signals/user_feedback_signals.json").signals, suggestions: readJson<{suggestions:Array<Record<string, unknown>>}>("data/statking/owned-signals/source_suggestions.json").suggestions }; }
export function loadPlatformMedia(platform: 'youtube' | 'reddit' | 'podcasts' | 'rss') { const file = platform === 'youtube' ? 'youtube_channels' : platform === 'reddit' ? 'reddit_communities' : platform === 'podcasts' ? 'podcasts' : 'rss_feeds'; return readJson<{items:Array<Record<string, unknown>>}>(`data/statking/media/${file}.json`).items; }
export function loadExpertRegistry() { return readJson<{experts:Array<Record<string, unknown>>}>("data/statking/experts/expert_registry.json").experts; }
