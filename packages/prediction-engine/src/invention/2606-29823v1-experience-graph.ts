/**
 * Experience Graph: the data foundation for the self-improving discovery
 * loop — arXiv 2606.29823v1 ("Experience Graphs: The Data Foundation for
 * Self-Improving Agents (Trellis)").
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes
 * predictions and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: persistent experience graph over nodes
 * (attempt / artifact / reward / comparison / reflection) connected by
 * derived_from and supersedes edges. Agents query the graph ("what was
 * the frontier last night?"), recover from crashes by resuming the
 * frontier instead of re-running, and mine it for experience (bad
 * implementations, dead lanes, recurring failure reflections).
 *
 * Improvement (record): Build the GSE experience graph (Postgres/SQLite)
 * as the discovery loop's substrate: nodes
 * attempt/artifact/reward/comparison/reflection with
 * derived_from/supersedes edges; query-based access ('what was the
 * frontier last night?' answered <2 min), crash recovery from the frontier
 * query (<5 min, zero duplicate backtests), and a weekly automated
 * experience-mining job flagging bad implementations (sibling
 * underperformance), dead lanes, and recurring failure reflections.
 *
 * NOTE on persistence: this module is an in-memory graph with JSON
 * export/import (exportGraph/importGraph). Swap the two functions for a
 * Postgres/SQLite adapter in the discovery harness; the graph logic and
 * the acceptance gate are persistence-agnostic. No schema changes here.
 *
 * ACCEPTANCE GATE: ADOPT as the loop's substrate if: analyst query-time
 * test passes (<2 min), crash recovery <5 min with zero duplicate backtests
 * over 3 induced crashes, replay fidelity 5/5, and storage stays <10 GB
 * after 30 nights. (Gate requires the nightly discovery loop; run via the
 * harness.)
 */

export type NodeKind =
  | "attempt"
  | "artifact"
  | "reward"
  | "comparison"
  | "reflection";

export type EdgeKind = "derived_from" | "supersedes";

export interface ExperienceNode {
  readonly id: string;
  readonly kind: NodeKind;
  readonly lane: string;
  /** ISO timestamp of creation. */
  readonly createdAt: string;
  /** Content hash / idempotency key — crash recovery dedups on this. */
  readonly idempotencyKey: string;
  readonly payload: Record<string, unknown>;
  /** Attempt status: pending | done | failed. */
  readonly status: "pending" | "done" | "failed";
}

export interface ExperienceEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: EdgeKind;
}

export interface ExperienceMiningReport {
  /** Artifacts whose sibling attempts in the same lane scored higher. */
  readonly siblingUnderperformers: string[];
  /** Lanes with no gate-passing artifact in the last N nights. */
  readonly deadLanes: string[];
  /** Reflection themes recurring >= minRepeats times. */
  readonly recurringFailureThemes: { readonly theme: string; readonly count: number }[];
}

export class ExperienceGraph {
  private nodes = new Map<string, ExperienceNode>();
  private edges: ExperienceEdge[] = [];

  /** Add a node; idempotent on idempotencyKey (crash-safety: no dupes). */
  addNode(node: ExperienceNode): ExperienceNode {
    for (const existing of this.nodes.values()) {
      if (existing.idempotencyKey === node.idempotencyKey) return existing;
    }
    this.nodes.set(node.id, node);
    return node;
  }

  addEdge(edge: ExperienceEdge): void {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
      throw new Error(`edge references unknown node: ${edge.from} -> ${edge.to}`);
    }
    if (
      !this.edges.some(
        (e) => e.from === edge.from && e.to === edge.to && e.kind === edge.kind,
      )
    ) {
      this.edges.push(edge);
    }
  }

  getNode(id: string): ExperienceNode | undefined {
    return this.nodes.get(id);
  }

  nodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Frontier query ("what was the frontier last night?"): the newest
   * attempt/artifact per lane created before `before`, i.e. where a
   * crashed loop should resume. Synchronous and in-memory: well under the
   * 2-minute analyst query budget.
   */
  frontier(before: string): ExperienceNode[] {
    const latest = new Map<string, ExperienceNode>();
    for (const n of this.nodes.values()) {
      if (n.kind !== "attempt" && n.kind !== "artifact") continue;
      if (n.createdAt >= before) continue;
      const cur = latest.get(n.lane);
      if (!cur || n.createdAt > cur.createdAt) latest.set(n.lane, n);
    }
    return [...latest.values()];
  }

  /**
   * Crash recovery: attempts left `pending` at crash time. Because
   * addNode dedups on idempotencyKey, re-submitting the pending attempts
   * produces zero duplicate backtests. Returns the resume list.
   */
  pendingAttempts(): ExperienceNode[] {
    return [...this.nodes.values()].filter(
      (n) => n.kind === "attempt" && n.status === "pending",
    );
  }

  markDone(id: string): void {
    const n = this.nodes.get(id);
    if (n) this.nodes.set(id, { ...n, status: "done" });
  }

  /** Replay fidelity: does re-adding every node produce an identical graph? */
  exportGraph(): string {
    return JSON.stringify({
      nodes: [...this.nodes.values()],
      edges: this.edges,
    });
  }

  static importGraph(json: string): ExperienceGraph {
    const data = JSON.parse(json) as {
      nodes: ExperienceNode[];
      edges: ExperienceEdge[];
    };
    const g = new ExperienceGraph();
    for (const n of data.nodes) g.nodes.set(n.id, n);
    g.edges = [...data.edges];
    return g;
  }

  /** Approximate in-memory storage footprint (bytes) for the <10GB gate. */
  estimatedBytes(): number {
    return new TextEncoder().encode(this.exportGraph()).length;
  }

  /**
   * Weekly experience mining: (1) sibling underperformance — artifacts
   * with a same-lane sibling scoring higher; (2) dead lanes — no
   * gate-passing artifact within the last `deadAfterNights`; (3) recurring
   * failure reflections by theme.
   */
  mineExperiences(
    gateThreshold: number,
    nights: { readonly date: string }[],
    minRepeats = 3,
  ): ExperienceMiningReport {
    const byLane = new Map<string, ExperienceNode[]>();
    for (const n of this.nodes.values()) {
      if (n.kind !== "artifact") continue;
      const list = byLane.get(n.lane) ?? [];
      list.push(n);
      byLane.set(n.lane, list);
    }
    const scoreOf = (n: ExperienceNode): number =>
      typeof n.payload["score"] === "number" ? n.payload["score"] : 0;

    const siblingUnderperformers: string[] = [];
    const deadLanes: string[] = [];
    const cutoff =
      nights.length > 0 ? nights[nights.length - 1]!.date : "0000-00-00";
    for (const [lane, arts] of byLane) {
      const best = Math.max(...arts.map(scoreOf));
      for (const a of arts) {
        if (scoreOf(a) < best) siblingUnderperformers.push(a.id);
      }
      const recentGatePass = arts.some(
        (a) => scoreOf(a) >= gateThreshold && a.createdAt >= cutoff,
      );
      if (!recentGatePass) deadLanes.push(lane);
    }

    const themes = new Map<string, number>();
    for (const n of this.nodes.values()) {
      if (n.kind !== "reflection" || n.status === "done") continue;
      const theme =
        typeof n.payload["theme"] === "string" ? n.payload["theme"] : null;
      if (theme) themes.set(theme, (themes.get(theme) ?? 0) + 1);
    }
    const recurringFailureThemes = [...themes.entries()]
      .filter(([, c]) => c >= minRepeats)
      .map(([theme, count]) => ({ theme, count }));

    return { siblingUnderperformers, deadLanes, recurringFailureThemes };
  }
}

function uuid(): string {
  return `exp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function makeAttempt(
  lane: string,
  idempotencyKey: string,
  payload: Record<string, unknown> = {},
  createdAt: string = new Date().toISOString(),
): ExperienceNode {
  return {
    id: uuid(),
    kind: "attempt",
    lane,
    createdAt,
    idempotencyKey,
    payload,
    status: "pending",
  };
}

export function makeArtifact(
  lane: string,
  idempotencyKey: string,
  score: number,
  payload: Record<string, unknown> = {},
  createdAt: string = new Date().toISOString(),
): ExperienceNode {
  return {
    id: uuid(),
    kind: "artifact",
    lane,
    createdAt,
    idempotencyKey,
    payload: { ...payload, score },
    status: "done",
  };
}

export function makeReflection(
  lane: string,
  theme: string,
  payload: Record<string, unknown> = {},
  createdAt: string = new Date().toISOString(),
): ExperienceNode {
  return {
    id: uuid(),
    kind: "reflection",
    lane,
    createdAt,
    idempotencyKey: uuid(),
    payload: { ...payload, theme },
    status: "pending",
  };
}

/**
 * Gate-check helper from the record: analyst query <2 min, crash recovery
 * <5 min with zero duplicate backtests, replay fidelity 5/5, storage <10GB.
 */
export function passesExperienceGate(input: {
  readonly querySeconds: number;
  readonly recoverySeconds: number;
  readonly duplicateBacktests: number;
  readonly replayFidelity: number;
  readonly storageBytes: number;
}): boolean {
  return (
    input.querySeconds < 120 &&
    input.recoverySeconds < 300 &&
    input.duplicateBacktests === 0 &&
    input.replayFidelity >= 5 &&
    input.storageBytes < 10 * 1024 * 1024 * 1024
  );
}
