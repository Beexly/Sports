/**
 * GSE GALILEO — Galaxy Market Twin (Invention 1).
 *
 * A game's market is not a list of prices; it is a belief system with structure. This turns
 * a MarketSurface (+ optional flesh/attention context) into a typed GRAPH: game, team,
 * player, book, market, outcome, timestamp, event (injury/news/weather) and role-state nodes,
 * connected by typed relationship edges (a prop belongs to a player, a market implies a team
 * total, a QB prop relates to its receiver props, an injury affects a role state, a book
 * lagged consensus, …).
 *
 * The output is NOT a pick. It is a market-state object other instruments inspect — the twin
 * the rest of Galileo reasons over. Built on the tested market-physics primitives; pure.
 */

import {
  type MarketSurface,
  type MarketInstance,
  getInstance,
} from "../market-physics/market-surface.js";
import { impliedTeamTotals } from "../market-physics/coherence.js";

export type NodeKind =
  | "game"
  | "team"
  | "player"
  | "book"
  | "market"
  | "outcome"
  | "timestamp"
  | "event"
  | "role_state";

export interface TwinNode {
  readonly id: string;
  readonly kind: NodeKind;
  readonly label: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export type EdgeKind =
  | "player_of_team"
  | "prop_of_player"
  | "book_offered"
  | "line_moved_at"
  | "market_implies_team_total"
  | "qb_relates_receiver"
  | "rb_relates_script"
  | "alt_relates_main"
  | "event_affects_role"
  | "market_moved_after_event"
  | "book_lagged_consensus";

export interface TwinEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: EdgeKind;
  readonly data?: Readonly<Record<string, unknown>>;
}

/** Flesh + attention context that enriches the structural graph (all optional). */
export interface TwinContext {
  readonly homeTeam?: string;
  readonly awayTeam?: string;
  /** player → team, for player_of_team edges. */
  readonly playerTeam?: Readonly<Record<string, string>>;
  /** QB player key → his receiver player keys, for qb_relates_receiver edges. */
  readonly qbReceivers?: Readonly<Record<string, readonly string[]>>;
  /** RB player keys whose props relate to game script. */
  readonly scriptRbs?: readonly string[];
  /** Shock/news events: { id, type, timestamp, affectsPlayer? }. */
  readonly events?: ReadonlyArray<{ id: string; type: string; timestamp: string; affectsPlayer?: string }>;
  /** Books flagged as having lagged consensus (from book-dna), for annotation edges. */
  readonly laggedBooks?: readonly string[];
}

export interface MarketTwin {
  readonly gameId: string;
  readonly nodes: readonly TwinNode[];
  readonly edges: readonly TwinEdge[];
  getNode(id: string): TwinNode | undefined;
  neighbors(id: string, kind?: EdgeKind): TwinEdge[];
}

const nodeId = {
  game: (g: string) => `game:${g}`,
  team: (t: string) => `team:${t}`,
  player: (p: string) => `player:${p}`,
  book: (b: string) => `book:${b}`,
  market: (key: string) => `market:${key}`,
  outcome: (key: string, o: string) => `outcome:${key}:${o}`,
  event: (id: string) => `event:${id}`,
  role: (p: string) => `role:${p}`,
};

function marketKind(inst: MarketInstance): boolean {
  return inst.market.startsWith("alternate_");
}

/** Build the typed market-twin graph from a surface and optional flesh/attention context. */
export function buildMarketTwin(surface: MarketSurface, context: TwinContext = {}): MarketTwin {
  const nodes = new Map<string, TwinNode>();
  const edges: TwinEdge[] = [];
  const addNode = (n: TwinNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
  };
  const addEdge = (e: TwinEdge) => edges.push(e);

  // game + teams
  addNode({ id: nodeId.game(surface.gameId), kind: "game", label: surface.gameId });
  for (const t of [context.homeTeam, context.awayTeam].filter((x): x is string => !!x)) {
    addNode({ id: nodeId.team(t), kind: "team", label: t });
    addEdge({ from: nodeId.team(t), to: nodeId.game(surface.gameId), kind: "rb_relates_script", data: { role: t === context.homeTeam ? "home" : "away" } });
  }

  // books
  for (const b of surface.books) addNode({ id: nodeId.book(b), kind: "book", label: b });

  // markets + outcomes + book_offered + players
  for (const inst of surface.instances) {
    const mId = nodeId.market(inst.key);
    addNode({ id: mId, kind: "market", label: inst.key, data: { market: inst.market, noVig: inst.noVig } });
    if (inst.player) {
      const pId = nodeId.player(inst.player);
      addNode({ id: pId, kind: "player", label: inst.player });
      addEdge({ from: mId, to: pId, kind: "prop_of_player" });
      const team = context.playerTeam?.[inst.player];
      if (team) {
        addNode({ id: nodeId.team(team), kind: "team", label: team });
        addEdge({ from: pId, to: nodeId.team(team), kind: "player_of_team" });
      }
    }
    for (const o of inst.outcomes) {
      const oId = nodeId.outcome(inst.key, o.outcome);
      addNode({ id: oId, kind: "outcome", label: `${inst.key} ${o.outcome}`, data: { consensusPoint: o.consensusPoint, consensusPrice: o.consensusPrice, bestPrice: o.bestPrice } });
      addEdge({ from: oId, to: mId, kind: "prop_of_player" });
      for (const bq of o.byBook) {
        addEdge({ from: nodeId.book(bq.book), to: oId, kind: "book_offered", data: { point: bq.point, price: bq.price, timestamp: bq.timestamp } });
        addEdge({ from: oId, to: nodeId.outcome(inst.key, o.outcome), kind: "line_moved_at", data: { book: bq.book, timestamp: bq.timestamp } });
      }
    }
    // alt_relates_main: alternate ladders relate to their main market.
    if (marketKind(inst)) {
      const mainKey = inst.key.replace("alternate_", "");
      if (getInstance(surface, mainKey)) addEdge({ from: mId, to: nodeId.market(mainKey), kind: "alt_relates_main" });
    }
  }

  // market_implies_team_total
  const tt = impliedTeamTotals(surface);
  if (tt && context.homeTeam && context.awayTeam) {
    addNode({ id: nodeId.team(context.homeTeam), kind: "team", label: context.homeTeam });
    addNode({ id: nodeId.team(context.awayTeam), kind: "team", label: context.awayTeam });
    addEdge({ from: nodeId.market("total"), to: nodeId.team(context.homeTeam), kind: "market_implies_team_total", data: { impliedTotal: tt.homeTotal } });
    addEdge({ from: nodeId.market("total"), to: nodeId.team(context.awayTeam), kind: "market_implies_team_total", data: { impliedTotal: tt.awayTotal } });
  }

  // qb_relates_receiver
  for (const [qb, recs] of Object.entries(context.qbReceivers ?? {})) {
    for (const r of recs) {
      addEdge({ from: nodeId.market(qb), to: nodeId.market(r), kind: "qb_relates_receiver" });
    }
  }

  // events + event_affects_role + market_moved_after_event
  for (const ev of context.events ?? []) {
    addNode({ id: nodeId.event(ev.id), kind: "event", label: ev.type, data: { timestamp: ev.timestamp } });
    if (ev.affectsPlayer) {
      addNode({ id: nodeId.role(ev.affectsPlayer), kind: "role_state", label: `${ev.affectsPlayer} role` });
      addEdge({ from: nodeId.event(ev.id), to: nodeId.role(ev.affectsPlayer), kind: "event_affects_role" });
      // markets of the affected player are candidate-moved-after-event.
      for (const inst of surface.instances.filter((i) => i.player === ev.affectsPlayer)) {
        addEdge({ from: nodeId.event(ev.id), to: nodeId.market(inst.key), kind: "market_moved_after_event", data: { eventTime: ev.timestamp } });
      }
    }
  }

  // book_lagged_consensus annotations
  for (const b of context.laggedBooks ?? []) {
    if (surface.books.includes(b)) addEdge({ from: nodeId.book(b), to: nodeId.game(surface.gameId), kind: "book_lagged_consensus" });
  }

  const nodeList = [...nodes.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  return {
    gameId: surface.gameId,
    nodes: nodeList,
    edges,
    getNode: (id) => nodes.get(id),
    neighbors: (id, kind) => edges.filter((e) => (e.from === id || e.to === id) && (!kind || e.kind === kind)),
  };
}

/** Convenience id builders so callers/tests can address nodes without string-templating. */
export const twinId = nodeId;
