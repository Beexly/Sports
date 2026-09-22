/**
 * Drive-as-temporal-graph encoding (port the encoding, not the architecture)
 *
 * Research port: arXiv:2308.11142
 * Normalized lane: win_spread_total | Doctrine: PROPRIETARY_EDGE
 *
 * Encodes each NFL drive as a temporal graph: plays are nodes carrying (down, distance, yardline, playType, epa); directed edges link consecutive plays, plus a cross-drive edge from the previous drive's terminal node. Pure feature-builder output consumed downstream by the graph model lane.
 *
 * ACCEPTANCE GATE: ADAPT (run the model port) only if the graph model beats the flat-feature GBM baseline by >= 0.01 AUC AND >= 0.005 log-loss on the pre-registered 2024 holdout. Live-data gate -> GSE_DRIVE_GRAPH_MODEL_ENABLED flag (default false).
 */

export type PlayType = "pass" | "rush" | "kick" | "punt" | "field_goal" | "kneel" | "other";

export interface DrivePlay {
  playId: string;
  driveId: string;
  down: number;
  distance: number;
  yardline: number; // 0..100, 0 = own goal line
  playType: PlayType;
  epa: number;
}

export interface DriveGraphNode {
  playId: string;
  down: number;
  distance: number;
  yardline: number;
  playType: PlayType;
  epa: number;
}

export interface DriveGraphEdge {
  from: string;
  to: string;
  kind: "within_drive" | "cross_drive";
}

export interface DriveTemporalGraph {
  driveId: string;
  nodes: DriveGraphNode[];
  edges: DriveGraphEdge[];
}

/** Build temporal graphs for each drive in chronological play order. */
export function buildDriveTemporalGraphs(plays: DrivePlay[]): DriveTemporalGraph[] {
  const byDrive = new Map<string, DrivePlay[]>();
  for (const p of plays) {
    const list = byDrive.get(p.driveId);
    if (list) list.push(p);
    else byDrive.set(p.driveId, [p]);
  }
  const driveIds = [...byDrive.keys()].sort();
  const graphs: DriveTemporalGraph[] = [];
  let prevTerminal: string | null = null;
  for (const driveId of driveIds) {
    const dps = byDrive.get(driveId) ?? [];
    const nodes: DriveGraphNode[] = dps.map((p) => ({
      playId: p.playId,
      down: p.down,
      distance: p.distance,
      yardline: p.yardline,
      playType: p.playType,
      epa: p.epa,
    }));
    const edges: DriveGraphEdge[] = [];
    const first = nodes[0];
    if (first !== undefined && prevTerminal !== null) {
      edges.push({ from: prevTerminal, to: first.playId, kind: "cross_drive" });
    }
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1];
      const b = nodes[i];
      if (a === undefined || b === undefined) continue;
      edges.push({ from: a.playId, to: b.playId, kind: "within_drive" });
    }
    const last = nodes[nodes.length - 1];
    if (last !== undefined) prevTerminal = last.playId;
    graphs.push({ driveId, nodes, edges });
  }
  return graphs;
}

/**
 * Feature flag for the graph-model lane itself (this module only builds the encoding).
 * The numeric gate (>=0.01 AUC, >=0.005 log-loss vs flat GBM) must clear before flipping.
 */
export const GSE_DRIVE_GRAPH_MODEL_ENABLED = false;

