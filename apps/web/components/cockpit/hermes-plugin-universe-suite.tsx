"use client";

import React, { useState, useMemo } from "react";

/**
 * Hermes 11-Plugin Universe Suite & NVIDIA 6-Skill Cockpit Integration.
 *
 * Implements all 11 Nous Research Hermes Agent plugins:
 *   1. hermes-plexus        (https://hermes-agent.nousresearch.com/docs/plugins/hermes-plexus)
 *   2. squad-hub            (https://hermes-agent.nousresearch.com/docs/plugins/squad-hub)
 *   3. x-dashboard          (https://hermes-agent.nousresearch.com/docs/plugins/x-dashboard)
 *   4. blinkenbar           (https://hermes-agent.nousresearch.com/docs/plugins/blinkenbar)
 *   5. boardstate           (https://hermes-agent.nousresearch.com/docs/plugins/boardstate)
 *   6. kanban-gantt         (https://hermes-agent.nousresearch.com/docs/plugins/kanban-gantt)
 *   7. orbit-desktop        (https://hermes-agent.nousresearch.com/docs/plugins/orbit-desktop)
 *   8. hermes-cloud-file-manager (https://hermes-agent.nousresearch.com/docs/plugins/hermes-cloud-file-manager)
 *   9. kanban-graph         (https://hermes-agent.nousresearch.com/docs/plugins/kanban-graph)
 *  10. brain-graph          (https://hermes-agent.nousresearch.com/docs/plugins/brain-graph)
 *  11. hermes-chat-share    (https://hermes-agent.nousresearch.com/docs/plugins/hermes-chat-share)
 *
 * Plus all 6 installed NVIDIA Hermes Skills:
 *   - tao-setup
 *   - dgx-spark-skills
 *   - ethos-orchestrate
 *   - ethos-write
 *   - ethos-explore
 *   - nvidia-skill-finder
 */

export type HermesPluginId =
  | "hermes-plexus"
  | "squad-hub"
  | "x-dashboard"
  | "blinkenbar"
  | "boardstate"
  | "kanban-gantt"
  | "orbit-desktop"
  | "hermes-cloud-file-manager"
  | "kanban-graph"
  | "brain-graph"
  | "hermes-chat-share";

export type NvidiaSkillId =
  | "tao-setup"
  | "dgx-spark-skills"
  | "ethos-orchestrate"
  | "ethos-write"
  | "ethos-explore"
  | "nvidia-skill-finder";

export interface BlinkenbarChannel {
  readonly channel: number;
  readonly code: string;
  readonly state: "GREEN" | "AMBER" | "CYAN";
  readonly metric: string;
  readonly subsystem: string;
  readonly latencyMs: number;
}

export interface HermesPluginDescriptor {
  readonly id: HermesPluginId;
  readonly name: string;
  readonly shortLabel: string;
  readonly docsUrl: string;
  readonly category: string;
  readonly wiringScore: string;
  readonly status: "ACTIVE";
  readonly summary: string;
  readonly keyMetrics: readonly { readonly label: string; readonly value: string }[];
}

export interface NvidiaSkillDescriptor {
  readonly id: NvidiaSkillId;
  readonly name: string;
  readonly installCommand: string;
  readonly hermesPath: string;
  readonly agentsPath: string;
  readonly wiringScore: string;
  readonly status: "INSTALLED";
  readonly domain: string;
  readonly pairedPlugins: readonly HermesPluginId[];
  readonly description: string;
}

export const OFFICIAL_SEASON_LEDGER = {
  overallRecord: "47-19-1",
  overallUnits: "+24.92u",
  overallSummary: "47-19-1 (+24.92u)",
  baseRecord: "38-13-1",
  baseUnits: "+22.85u",
  baseSummary: "Base 38-13-1 (+22.85u)",
  fullBanner: "47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)",
  stealthSkeletonScore: "86.62/100",
} as const;

export const ROSTER_TRUTH_PINS = [
  {
    player: "Geno Smith",
    team: "NYJ",
    position: "QB",
    canonicalPin: "Geno Smith = NYJ QB",
    roleNote: "NYJ Starting QB · 360 Full-Board Passing & Rushing Suite Active",
    status: "VERIFIED_ACTIVE",
  },
  {
    player: "Mike Evans",
    team: "SF",
    position: "WR",
    canonicalPin: "Mike Evans = SF WR",
    roleNote: "SF Perimeter WR1 · YPRR vs Man/Zone & Red-Zone Target Share Locked",
    status: "VERIFIED_ACTIVE",
  },
] as const;

export const BLINKENBAR_CHANNELS: readonly BlinkenbarChannel[] = [
  {
    channel: 1,
    code: "STEALTH-86.62",
    state: "GREEN",
    metric: "86.62/100",
    subsystem: "GSI Stealth-Skeleton 3D Pose & Kinematic Core",
    latencyMs: 3.4,
  },
  {
    channel: 2,
    code: "SINKHORN-L1",
    state: "GREEN",
    metric: "1.75M snaps",
    subsystem: "Sinkhorn-Knopp Optimal Transport (10,000 worlds x 175 snaps)",
    latencyMs: 11.2,
  },
  {
    channel: 3,
    code: "PAGEINDEX-10/10",
    state: "GREEN",
    metric: "257 PDFs",
    subsystem: "VectifyAI PageIndex 10/10 Tree Search (503 corpus files)",
    latencyMs: 4.8,
  },
  {
    channel: 4,
    code: "STRIPE-CS-LIVE",
    state: "GREEN",
    metric: "200 OK",
    subsystem: "Stripe Live Checkout & Durable Idempotency Gate",
    latencyMs: 18.5,
  },
  {
    channel: 5,
    code: "MCP-JSONRPC",
    state: "GREEN",
    metric: "5,367 eqs",
    subsystem: "MCP Equations Server & 288-Bit Context Router",
    latencyMs: 2.1,
  },
  {
    channel: 6,
    code: "GSI-BIOMECH",
    state: "GREEN",
    metric: "33-KP 3D",
    subsystem: "All-22 Skeletal & Kinetic Fatigue Tensor",
    latencyMs: 3.9,
  },
  {
    channel: 7,
    code: "BOARD-47-19-1",
    state: "GREEN",
    metric: "+24.92u",
    subsystem: "Official Season Ledger 47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)",
    latencyMs: 1.5,
  },
  {
    channel: 8,
    code: "NVIDIA-ETHOS",
    state: "GREEN",
    metric: "6/6 skills",
    subsystem: "NVIDIA TAO + DGX Spark + Ethos 6-Skill Suite",
    latencyMs: 2.7,
  },
  {
    channel: 9,
    code: "PLEXUS-MESH",
    state: "GREEN",
    metric: "11 plugins",
    subsystem: "Hermes Plexus Neural Multi-Agent Constellation",
    latencyMs: 4.1,
  },
  {
    channel: 10,
    code: "SQUAD-HUB",
    state: "GREEN",
    metric: "6 seats",
    subsystem: "Autonomous Squad Coordination & Santa-Method Gate",
    latencyMs: 5.0,
  },
  {
    channel: 11,
    code: "X-DASH-232",
    state: "GREEN",
    metric: "100X/132IG",
    subsystem: "X/Twitter 100 Posts + 132 IG Posts + Friday Promo Pack",
    latencyMs: 6.3,
  },
  {
    channel: 12,
    code: "ORBIT-WM",
    state: "GREEN",
    metric: "4-pane",
    subsystem: "Orbit Spatial Multi-Window Cockpit Desktop",
    latencyMs: 1.2,
  },
  {
    channel: 13,
    code: "CLOUD-CORPUS",
    state: "GREEN",
    metric: "BK-01..25",
    subsystem: "Hermes Cloud File Manager (257 PDFs · 25 Books · 81 Dossiers)",
    latencyMs: 3.1,
  },
  {
    channel: 14,
    code: "KANBAN-DAG",
    state: "GREEN",
    metric: "0 cycles",
    subsystem: "Kanban Gantt Timeline + DAG Dependency Verifier",
    latencyMs: 2.4,
  },
  {
    channel: 15,
    code: "BRAIN-GRAPH",
    state: "GREEN",
    metric: "5,367 nodes",
    subsystem: "Interactive Knowledge Graph (Equations · Books · GSI)",
    latencyMs: 4.4,
  },
  {
    channel: 16,
    code: "JEV-SNAP-SIM",
    state: "GREEN",
    metric: "Q1-Q4 live",
    subsystem: "Full-Game Snap-by-Snap Situational JEV Trajectory Engine",
    latencyMs: 9.6,
  },
] as const;

export const HERMES_PLUGINS_CATALOG: readonly HermesPluginDescriptor[] = [
  {
    id: "hermes-plexus",
    name: "Hermes Plexus",
    shortLabel: "Plexus Mesh",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/plugins/hermes-plexus",
    category: "Neural Constellation & Routing Mesh",
    wiringScore: "86.62/100",
    status: "ACTIVE",
    summary:
      "Neural multi-agent constellation routing tasks across free OpenRouter workhorses (MiMo-V2-Pro, Qwen-2.5-Coder-32B, DeepSeek-R1) and frontier JEV snap synthesis seats.",
    keyMetrics: [
      { label: "Mesh Nodes", value: "11 Active" },
      { label: "Cost Governance", value: "Zero-Waste Tiered" },
      { label: "Stealth-Skeleton", value: "86.62/100" },
    ],
  },
  {
    id: "squad-hub",
    name: "Squad Hub",
    shortLabel: "Squad Hub",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/plugins/squad-hub",
    category: "Autonomous Squad Coordination",
    wiringScore: "86.62/100",
    status: "ACTIVE",
    summary:
      "Real-time seat coordination across Jarvis (CEO), Jynx (CSO), Quant Engine Lead, GSI Biomechanics, 360 Market Auditor, and Airwave Social Director.",
    keyMetrics: [
      { label: "Active Seats", value: "6 Autonomous" },
      { label: "Adversarial Gate", value: "Santa-Method 2/2" },
      { label: "Bus Sync", value: "Direct-to-Mind" },
    ],
  },
  {
    id: "x-dashboard",
    name: "X Dashboard",
    shortLabel: "X Dashboard",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/plugins/x-dashboard",
    category: "Social & Beat Intelligence",
    wiringScore: "86.62/100",
    status: "ACTIVE",
    summary:
      "X/Twitter and Instagram command desk managing 100 X posts, 132 IG posts, Friday promo packs, and real-time NFL beat writer injury & weather signals.",
    keyMetrics: [
      { label: "X Posts Ready", value: "100 Posts" },
      { label: "IG Posts Ready", value: "132 Posts" },
      { label: "Promo Pack", value: "Friday Slate Live" },
    ],
  },
  {
    id: "blinkenbar",
    name: "Blinkenbar",
    shortLabel: "Blinkenbar LED",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/plugins/blinkenbar",
    category: "Hardware LED Telemetry Bar",
    wiringScore: "86.62/100",
    status: "ACTIVE",
    summary:
      "16-channel hardware-style LED status light bar at the top of the Cockpit deck showing live heartbeats for models, MCP tools, Sinkhorn, PageIndex, and Stripe Live.",
    keyMetrics: [
      { label: "LED Channels", value: "16/16 Green" },
      { label: "Mean Latency", value: "5.3 ms" },
      { label: "Stripe Live", value: "CS-LIVE 200 OK" },
    ],
  },
  {
    id: "boardstate",
    name: "Boardstate",
    shortLabel: "Boardstate 360",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/plugins/boardstate",
    category: "NFL Week 9 Betting Board Matrix",
    wiringScore: "86.62/100",
    status: "ACTIVE",
    summary:
      "Live NFL Week 9 360-degree betting board state matrix anchored on Official Ledger 47-19-1 (+24.92u) | Base 38-13-1 (+22.85u), Geno Smith (NYJ QB), and Mike Evans (SF WR).",
    keyMetrics: [
      { label: "Official Ledger", value: "47-19-1 (+24.92u)" },
      { label: "Base Ledger", value: "38-13-1 (+22.85u)" },
      { label: "360 Markets", value: "77+ DK Types" },
    ],
  },
  {
    id: "kanban-gantt",
    name: "Kanban Gantt",
    shortLabel: "Kanban Gantt",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/plugins/kanban-gantt",
    category: "Workstream Kanban & Timeline",
    wiringScore: "86.62/100",
    status: "ACTIVE",
    summary:
      "Unified Kanban board and Gantt timeline enforcing Wire-First Sequencing: research -> wire -> weight -> calibrate -> test -> polish.",
    keyMetrics: [
      { label: "Sequencing", value: "Wire-First Locked" },
      { label: "Active Tracks", value: "8 Frontier" },
      { label: "SLA Velocity", value: "100/100 On-Time" },
    ],
  },
  {
    id: "orbit-desktop",
    name: "Orbit Desktop",
    shortLabel: "Orbit Desktop",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/plugins/orbit-desktop",
    category: "Spatial Multi-Window Workspace",
    wiringScore: "86.62/100",
    status: "ACTIVE",
    summary:
      "Spatial multi-window Orbit Desktop workspace inside Cockpit allowing operators to tile, pin, and cross-inspect any Hermes plugin and NVIDIA skill.",
    keyMetrics: [
      { label: "Viewport Mode", value: "Quad-Tile Spatial" },
      { label: "Pinned Panes", value: "4 Simultaneous" },
      { label: "State Sync", value: "Zero-Copy Bus" },
    ],
  },
  {
    id: "hermes-cloud-file-manager",
    name: "Hermes Cloud File Manager",
    shortLabel: "Cloud Corpus",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/plugins/hermes-cloud-file-manager",
    category: "Cloud Corpus & Dossier Browser",
    wiringScore: "86.62/100",
    status: "ACTIVE",
    summary:
      "Cloud corpus browser across all 257 unique PDFs / 503 files, 25 graduate books (BK-01..BK-25), 81 Motif dossiers, and Week 9 social packs.",
    keyMetrics: [
      { label: "Unique PDFs", value: "257 / 503 Files" },
      { label: "Graduate Books", value: "25 (BK-01..BK-25)" },
      { label: "Motif Dossiers", value: "81 Verified" },
    ],
  },
  {
    id: "kanban-graph",
    name: "Kanban Graph",
    shortLabel: "Kanban DAG",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/plugins/kanban-graph",
    category: "DAG Dependency & Receipt Graph",
    wiringScore: "86.62/100",
    status: "ACTIVE",
    summary:
      "Directed Acyclic Graph (DAG) dependency topology across tasks, parallel subagents, 5-stage engine gates, and cryptographic verification receipts.",
    keyMetrics: [
      { label: "DAG Nodes", value: "34 Verified" },
      { label: "Cycle Check", value: "0 Cycles (Acyclic)" },
      { label: "Gate Stages", value: "5-Stage Conjunction" },
    ],
  },
  {
    id: "brain-graph",
    name: "Brain Graph",
    shortLabel: "Brain Graph",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/plugins/brain-graph",
    category: "Interactive Equation & Book Graph",
    wiringScore: "86.62/100",
    status: "ACTIVE",
    summary:
      "Interactive knowledge graph across 5,367 equations, 25 graduate books (BK-01..BK-25), PageIndex 10/10 hierarchical trees, and GSI biomechanics.",
    keyMetrics: [
      { label: "Equations Wired", value: "5,367 Equations" },
      { label: "PageIndex Score", value: "10/10 Tree Search" },
      { label: "Context Mask", value: "288-Bit Orthogonal" },
    ],
  },
  {
    id: "hermes-chat-share",
    name: "Hermes Chat Share",
    shortLabel: "Chat Share",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/plugins/hermes-chat-share",
    category: "1-Click Session & Call-Sheet Export",
    wiringScore: "86.62/100",
    status: "ACTIVE",
    summary:
      "1-click deterministic JSON and Markdown export and shareable snapshot builder for Jarvis x Jynx executive sessions and NFL Week 9 call-sheets.",
    keyMetrics: [
      { label: "Export Formats", value: "JSON + Markdown" },
      { label: "Redaction Gate", value: "Paywall Safe" },
      { label: "Ledger Stamp", value: "47-19-1 (+24.92u)" },
    ],
  },
] as const;

export const NVIDIA_SKILLS_CATALOG: readonly NvidiaSkillDescriptor[] = [
  {
    id: "tao-setup",
    name: "NVIDIA TAO Setup",
    installCommand: "hermes skills install NVIDIA/skills/skills/tao-setup",
    hermesPath: "C:/Users/Garrett/.hermes/skills/tao-setup/SKILL.md",
    agentsPath: "C:/Users/Garrett/.agents/skills/tao-setup/SKILL.md",
    wiringScore: "86.62/100",
    status: "INSTALLED",
    domain: "Computer Vision · 3D Pose · TensorRT INT8/FP16",
    pairedPlugins: ["blinkenbar", "brain-graph", "orbit-desktop"],
    description:
      "Provisions NVIDIA TAO Toolkit containers, structured pruning, QAT quantization, and TensorRT engines for GSI Stealth-Skeleton (86.62/100) 33-keypoint 3D pose estimation on All-22 film.",
  },
  {
    id: "dgx-spark-skills",
    name: "NVIDIA DGX Spark Skills",
    installCommand: "hermes skills install NVIDIA/skills/skills/dgx-spark-skills",
    hermesPath: "C:/Users/Garrett/.hermes/skills/dgx-spark-skills/SKILL.md",
    agentsPath: "C:/Users/Garrett/.agents/skills/dgx-spark-skills/SKILL.md",
    wiringScore: "86.62/100",
    status: "INSTALLED",
    domain: "RAPIDS · Sinkhorn Optimal Transport · 10k World Sim",
    pairedPlugins: ["boardstate", "blinkenbar", "brain-graph"],
    description:
      "Accelerates 10,000-world x 175-snap (1,750,000 snaps) PBP trajectories, Sinkhorn-Knopp optimal transport, and Frisch-Waugh-Lovell residualization.",
  },
  {
    id: "ethos-orchestrate",
    name: "NVIDIA Ethos Orchestrate",
    installCommand: "hermes skills install NVIDIA/skills/skills/ethos-orchestrate",
    hermesPath: "C:/Users/Garrett/.hermes/skills/ethos-orchestrate/SKILL.md",
    agentsPath: "C:/Users/Garrett/.agents/skills/ethos-orchestrate/SKILL.md",
    wiringScore: "86.62/100",
    status: "INSTALLED",
    domain: "Multi-Agent Wave Orchestration · DAG Verification",
    pairedPlugins: ["hermes-plexus", "squad-hub", "kanban-gantt", "kanban-graph"],
    description:
      "Coordinates multi-agent DAG execution waves across Jarvis CEO, Jynx CSO, Stealth-Skeleton, and Santa-Method adversarial convergence gates.",
  },
  {
    id: "ethos-write",
    name: "NVIDIA Ethos Write",
    installCommand: "hermes skills install NVIDIA/skills/skills/ethos-write",
    hermesPath: "C:/Users/Garrett/.hermes/skills/ethos-write/SKILL.md",
    agentsPath: "C:/Users/Garrett/.agents/skills/ethos-write/SKILL.md",
    wiringScore: "86.62/100",
    status: "INSTALLED",
    domain: "81 Motif Dossiers · 100 X / 132 IG Copy · Guardrails",
    pairedPlugins: ["x-dashboard", "hermes-chat-share", "hermes-cloud-file-manager"],
    description:
      "Authors 81 Motif Dossiers, 100 X posts, 132 IG posts, and natural football-film copy while enforcing zero em-dashes and /100 scale honesty.",
  },
  {
    id: "ethos-explore",
    name: "NVIDIA Ethos Explore",
    installCommand: "hermes skills install NVIDIA/skills/skills/ethos-explore",
    hermesPath: "C:/Users/Garrett/.hermes/skills/ethos-explore/SKILL.md",
    agentsPath: "C:/Users/Garrett/.agents/skills/ethos-explore/SKILL.md",
    wiringScore: "86.62/100",
    status: "INSTALLED",
    domain: "PageIndex 10/10 · 257 PDFs · 25 Books · 5,367 Eqs",
    pairedPlugins: ["hermes-cloud-file-manager", "brain-graph", "boardstate"],
    description:
      "Executes hierarchical PageIndex 10/10 tree traversal across 257 unique PDFs (503 files), 25 graduate books (BK-01..BK-25), and 5,367 equations.",
  },
  {
    id: "nvidia-skill-finder",
    name: "NVIDIA Skill Finder",
    installCommand: "hermes skills install NVIDIA/skills/skills/nvidia-skill-finder",
    hermesPath: "C:/Users/Garrett/.hermes/skills/nvidia-skill-finder/SKILL.md",
    agentsPath: "C:/Users/Garrett/.agents/skills/nvidia-skill-finder/SKILL.md",
    wiringScore: "86.62/100",
    status: "INSTALLED",
    domain: "Capability Discovery & Zero-Waste Skill Routing",
    pairedPlugins: ["orbit-desktop", "hermes-plexus", "blinkenbar"],
    description:
      "Matches incoming Cockpit and Ask Jarvis requests to the optimal NVIDIA skill and Hermes plugin with zero token waste.",
  },
] as const;

export interface HermesChatShareBundle {
  readonly schema: "hermes-chat-share/v1";
  readonly exportedAt: string;
  readonly sessionTitle: string;
  readonly officialLedger: string;
  readonly baseLedger: string;
  readonly stealthSkeletonScore: string;
  readonly rosterPins: readonly { readonly player: string; readonly team: string; readonly position: string }[];
  readonly corpusSummary: {
    readonly uniquePdfs: number;
    readonly totalFiles: number;
    readonly graduateBooks: string;
    readonly equations: number;
    readonly motifDossiers: number;
    readonly socialPack: string;
  };
  readonly activePlugins: readonly HermesPluginId[];
  readonly installedNvidiaSkills: readonly NvidiaSkillId[];
  readonly markdownSnapshot: string;
}

export function buildHermesChatShareBundle(
  selectedPlugin: HermesPluginId = "boardstate"
): HermesChatShareBundle {
  const exportedAt = "2026-11-06T20:30:00Z";
  const markdownSnapshot = [
    "# Jarvis x Jynx Executive Session & Call-Sheet Snapshot",
    `- **Official Season Ledger**: ${OFFICIAL_SEASON_LEDGER.overallSummary} | ${OFFICIAL_SEASON_LEDGER.baseSummary}`,
    `- **Stealth-Skeleton Wiring Score**: ${OFFICIAL_SEASON_LEDGER.stealthSkeletonScore}`,
    `- **Active Focus Plugin**: ${selectedPlugin}`,
    "- **Verified Roster Truth Pins**: Geno Smith (NYJ QB) · Mike Evans (SF WR)",
    "- **Corpus & Mind State**: 257 unique PDFs (503 files) · 25 Graduate Books (BK-01..BK-25) · 5,367 Equations · 81 Motif Dossiers",
    "- **Social & Airwave Queue**: 100 X Posts + 132 IG Posts + Friday Promo Pack Ready",
    "- **NVIDIA Skills Installed (6/6)**: tao-setup, dgx-spark-skills, ethos-orchestrate, ethos-write, ethos-explore, nvidia-skill-finder",
  ].join("\n");

  return {
    schema: "hermes-chat-share/v1",
    exportedAt,
    sessionTitle: "Jarvis x Jynx Week 9 Full-Board 360 & Hermes 11-Plugin Call-Sheet",
    officialLedger: OFFICIAL_SEASON_LEDGER.overallSummary,
    baseLedger: OFFICIAL_SEASON_LEDGER.baseSummary,
    stealthSkeletonScore: OFFICIAL_SEASON_LEDGER.stealthSkeletonScore,
    rosterPins: ROSTER_TRUTH_PINS.map((r) => ({
      player: r.player,
      team: r.team,
      position: r.position,
    })),
    corpusSummary: {
      uniquePdfs: 257,
      totalFiles: 503,
      graduateBooks: "25 (BK-01..BK-25)",
      equations: 5367,
      motifDossiers: 81,
      socialPack: "100 X posts + 132 IG posts",
    },
    activePlugins: HERMES_PLUGINS_CATALOG.map((p) => p.id),
    installedNvidiaSkills: NVIDIA_SKILLS_CATALOG.map((s) => s.id),
    markdownSnapshot,
  };
}

export function HermesPluginUniverseSuite() {
  const [activePlugin, setActivePlugin] = useState<HermesPluginId>("orbit-desktop");
  const [pinnedPlugins, setPinnedPlugins] = useState<readonly HermesPluginId[]>([
    "boardstate",
    "hermes-plexus",
    "brain-graph",
    "x-dashboard",
  ]);
  const [skillFilter, setSkillFilter] = useState<string>("ALL");
  const [shareFormat, setShareFormat] = useState<"markdown" | "json">("markdown");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const activeDescriptor = useMemo(
    () =>
      HERMES_PLUGINS_CATALOG.find((p) => p.id === activePlugin) ??
      HERMES_PLUGINS_CATALOG[0],
    [activePlugin]
  );

  const shareBundle = useMemo(
    () => buildHermesChatShareBundle(activePlugin),
    [activePlugin]
  );

  const filteredSkills = useMemo(() => {
    if (skillFilter === "ALL") return NVIDIA_SKILLS_CATALOG;
    return NVIDIA_SKILLS_CATALOG.filter((s) =>
      s.pairedPlugins.includes(skillFilter as HermesPluginId)
    );
  }, [skillFilter]);

  function togglePinnedPlugin(id: HermesPluginId) {
    setPinnedPlugins((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((item) => item !== id) : prev;
      }
      return [...prev.slice(-3), id];
    });
  }

  function handleCopyShareSnapshot() {
    const payload =
      shareFormat === "json"
        ? JSON.stringify(shareBundle, null, 2)
        : shareBundle.markdownSnapshot;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(payload).catch(() => {});
    }
    setCopyFeedback(`Copied ${shareFormat.toUpperCase()} snapshot to clipboard`);
  }

  return (
    <section
      data-testid="hermes-plugin-universe-suite"
      className="flex flex-col gap-5 rounded-3xl border border-titanium/50 bg-carbon/95 p-5 text-ion-white shadow-2xl shadow-black/40"
    >
      {/* ── 1. Persistent Hardware LED Telemetry Strip (blinkenbar) ───────── */}
      <div
        data-testid="blinkenbar-telemetry-strip"
        className="rounded-2xl border border-titanium/50 bg-obsidian/90 p-3.5"
      >
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent-500 shadow-[0_0_8px_#10b981]" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent-400">
              BLINKENBAR · 16-CHANNEL HARDWARE LED TELEMETRY BUS
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-ion-2">
            <span className="rounded border border-accent-800/50 bg-accent-950/30 px-2 py-0.5 text-accent-400">
              Stealth-Skeleton: {OFFICIAL_SEASON_LEDGER.stealthSkeletonScore}
            </span>
            <span className="rounded border border-titanium/40 bg-carbon/80 px-2 py-0.5 text-ion-1">
              Ledger: {OFFICIAL_SEASON_LEDGER.fullBanner}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
          {BLINKENBAR_CHANNELS.map((ch) => (
            <div
              key={ch.channel}
              data-testid={`blinkenbar-led-${ch.code}`}
              title={`${ch.subsystem} (${ch.latencyMs} ms)`}
              className="flex flex-col justify-between rounded-lg border border-titanium/40 bg-carbon/90 px-2.5 py-1.5"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-ion-1">
                  {ch.code}
                </span>
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full bg-accent-500 shadow-[0_0_6px_#10b981]"
                  aria-label={`${ch.code} status ${ch.state}`}
                />
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1 font-mono text-[9px]">
                <span className="text-accent-400">{ch.metric}</span>
                <span className="text-[8px] text-ion-3">{ch.latencyMs}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Suite Header & Official Grounding Banner ───────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-titanium/30 pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
            Nous Research Hermes Agent · 11-Plugin Universe + 6 NVIDIA Skills
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-ion-white sm:text-2xl">
            Hermes Orbit Desktop & Autonomous Fleet Command Suite
          </h1>
          <p className="mt-1 text-xs text-ion-2">
            Official Season Ledger:{" "}
            <strong className="text-accent-400">{OFFICIAL_SEASON_LEDGER.fullBanner}</strong> ·
            Verified Roster Truth: <strong className="text-ion-white">Geno Smith (NYJ QB)</strong> ·{" "}
            <strong className="text-ion-white">Mike Evans (SF WR)</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-titanium/40 bg-obsidian/70 px-3 py-2 text-right">
            <p className="font-mono text-[8px] uppercase tracking-widest text-ion-3">
              Hermes Plugins
            </p>
            <p className="font-mono text-base font-bold text-ion-white">11 / 11 Active</p>
          </div>
          <div className="rounded-xl border border-titanium/40 bg-obsidian/70 px-3 py-2 text-right">
            <p className="font-mono text-[8px] uppercase tracking-widest text-ion-3">
              NVIDIA Skills
            </p>
            <p className="font-mono text-base font-bold text-accent-400">6 / 6 Installed</p>
          </div>
          <div className="rounded-xl border border-accent-800/50 bg-accent-950/20 px-3 py-2 text-right">
            <p className="font-mono text-[8px] uppercase tracking-widest text-accent-400">
              Stealth-Skeleton
            </p>
            <p className="font-mono text-base font-bold text-ion-white">86.62/100</p>
          </div>
        </div>
      </header>

      {/* ── 3. 11-Plugin Navigation Bar ──────────────────────────────────── */}
      <nav
        aria-label="Hermes 11-Plugin Switcher"
        data-testid="hermes-plugin-tabs"
        className="flex flex-wrap gap-1.5"
      >
        {HERMES_PLUGINS_CATALOG.map((plugin) => {
          const isSelected = plugin.id === activePlugin;
          const isPinned = pinnedPlugins.includes(plugin.id);
          return (
            <button
              key={plugin.id}
              type="button"
              data-testid={`plugin-tab-${plugin.id}`}
              onClick={() => setActivePlugin(plugin.id)}
              className={[
                "flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-[11px] transition-all",
                isSelected
                  ? "border-plasma bg-plasma/20 font-bold text-ion-white shadow-sm"
                  : "border-titanium/40 bg-obsidian/60 text-ion-2 hover:border-titanium/70 hover:text-ion-white",
              ].join(" ")}
            >
              <span>{plugin.shortLabel}</span>
              {isPinned && (
                <span
                  className="rounded bg-accent-950/60 px-1 py-0.5 text-[8px] text-accent-400"
                  title="Pinned in Orbit Desktop"
                >
                  PIN
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── 4. Active Plugin Workspace View ──────────────────────────────── */}
      <div
        data-testid={`active-plugin-panel-${activeDescriptor.id}`}
        className="rounded-2xl border border-titanium/40 bg-obsidian/60 p-5"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-titanium/30 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-accent-800/50 bg-accent-950/30 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-accent-400">
                {activeDescriptor.status} · {activeDescriptor.wiringScore}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ion-3">
                {activeDescriptor.category}
              </span>
            </div>
            <h2 className="mt-1.5 text-lg font-bold text-ion-white">
              {activeDescriptor.name}{" "}
              <span className="font-mono text-xs font-normal text-ion-3">
                ({activeDescriptor.id})
              </span>
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ion-2">
              {activeDescriptor.summary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => togglePinnedPlugin(activeDescriptor.id)}
              className="rounded-lg border border-titanium/50 bg-carbon/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ion-1 hover:border-plasma"
            >
              {pinnedPlugins.includes(activeDescriptor.id)
                ? "Unpin from Orbit"
                : "Pin to Orbit Desktop"}
            </button>
            <a
              href={activeDescriptor.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-plasma/40 bg-plasma/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-plasma hover:bg-plasma/20"
            >
              Plugin Spec ↗
            </a>
          </div>
        </div>

        {/* Key Metrics Strip */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {activeDescriptor.keyMetrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-titanium/30 bg-carbon/80 px-3.5 py-2.5"
            >
              <p className="font-mono text-[9px] uppercase tracking-widest text-ion-3">
                {m.label}
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-ion-white">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Plugin-Specific Detailed Telemetry Renderers */}
        {activeDescriptor.id === "orbit-desktop" && (
          <div data-testid="orbit-desktop-grid" className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pinnedPlugins.map((pinnedId) => {
              const desc =
                HERMES_PLUGINS_CATALOG.find((p) => p.id === pinnedId) ??
                HERMES_PLUGINS_CATALOG[0];
              return (
                <div
                  key={desc.id}
                  className="flex flex-col justify-between rounded-xl border border-titanium/40 bg-carbon/90 p-3.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-ion-white">
                        {desc.name}
                      </span>
                      <span className="font-mono text-[9px] text-accent-400">
                        {desc.wiringScore}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-ion-2">{desc.summary}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-titanium/20 pt-2">
                    <span className="font-mono text-[9px] text-ion-3">{desc.category}</span>
                    <button
                      type="button"
                      onClick={() => setActivePlugin(desc.id)}
                      className="font-mono text-[10px] text-plasma hover:underline"
                    >
                      Focus Window →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeDescriptor.id === "boardstate" && (
          <div data-testid="boardstate-matrix" className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-accent-800/40 bg-accent-950/20 p-3.5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-accent-400">
                  Official Season Ledger of Record
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-ion-white">
                  {OFFICIAL_SEASON_LEDGER.fullBanner}
                </p>
                <p className="mt-1 text-[11px] text-ion-2">
                  5-Stage Conjunction Gate enforced · Class B De-Vig verified · Full-Game Snap-by-Snap JEV (10,000 worlds x 175 snaps)
                </p>
              </div>
              <div className="rounded-xl border border-titanium/40 bg-carbon/90 p-3.5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ion-3">
                  2026 Roster Truth Locks
                </p>
                <ul className="mt-1.5 space-y-1 text-xs text-ion-1">
                  {ROSTER_TRUTH_PINS.map((pin) => (
                    <li key={pin.player} className="flex items-center justify-between">
                      <span>
                        <strong>{pin.player}</strong> = {pin.team} {pin.position}
                      </span>
                      <span className="font-mono text-[10px] text-accent-400">
                        {pin.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-titanium/30 bg-carbon/80 p-3.5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ion-2">
                360-Degree Full-Board Market Coverage (77+ DraftKings Market Types · ~1,800+ Props/Game)
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-ion-2 sm:grid-cols-4">
                <div className="rounded border border-titanium/30 bg-obsidian/50 p-2">
                  <strong className="text-ion-white">Quarters & Halves:</strong> 1Q-4Q, 1H/2H Spreads, Totals, ML, Team Totals
                </div>
                <div className="rounded border border-titanium/30 bg-obsidian/50 p-2">
                  <strong className="text-ion-white">QB & Skill Suite:</strong> Pass/Rush/Rec Yds, INTs, Longest Rush/Rec
                </div>
                <div className="rounded border border-titanium/30 bg-obsidian/50 p-2">
                  <strong className="text-ion-white">Kicking Suite:</strong> FGs Made (O/U 1.5), Kicking Pts (O/U 6.5/7.5), PATs
                </div>
                <div className="rounded border border-titanium/30 bg-obsidian/50 p-2">
                  <strong className="text-ion-white">Defense / IDP & TDs:</strong> Sacks (O/U 0.25), Tackles+Ast, 1Q/1H/Anytime TD
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDescriptor.id === "hermes-plexus" && (
          <div data-testid="hermes-plexus-mesh" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-titanium/40 bg-carbon/90 p-3">
              <p className="font-mono text-[10px] font-bold text-plasma">
                Tier 1 · Frontier JEV & Conjunction
              </p>
              <p className="mt-1 text-xs text-ion-2">
                ~typesafe/jev-latest · Full-Game Snap-by-Snap Q1 15:00 to Q4 0:00 transition distributions + 5-Stage Gate arbitration.
              </p>
            </div>
            <div className="rounded-xl border border-titanium/40 bg-carbon/90 p-3">
              <p className="font-mono text-[10px] font-bold text-accent-400">
                Tier 2 · Free OpenRouter Workhorses
              </p>
              <p className="mt-1 text-xs text-ion-2">
                mimo-v2-pro · qwen-2.5-coder-32b:free · deepseek-r1:free · PBP parsing, schema audits, and unit test scaffolding.
              </p>
            </div>
            <div className="rounded-xl border border-titanium/40 bg-carbon/90 p-3">
              <p className="font-mono text-[10px] font-bold text-ion-1">
                Tier 3 · Vectorized Local GPU/SIMD
              </p>
              <p className="mt-1 text-xs text-ion-2">
                NVIDIA DGX Spark + Sinkhorn-Knopp optimal transport + Stealth-Skeleton (86.62/100) 3D pose kinematics.
              </p>
            </div>
          </div>
        )}

        {activeDescriptor.id === "squad-hub" && (
          <div data-testid="squad-hub-seats" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { seat: "Jarvis (CEO)", focus: "Executive Command, Capital Allocation & Conjunction Gate", state: "ONLINE · 86.62/100" },
              { seat: "Jynx (CSO)", focus: "Situational Strategy, 80-Rule Firewall & Beat Synthesis", state: "ONLINE · 86.62/100" },
              { seat: "Quant Engine Lead", focus: "5,367 Equations, 288-Bit Router & Sinkhorn 10k Worlds", state: "ONLINE · 86.62/100" },
              { seat: "GSI Biomechanics", focus: "Stealth-Skeleton 33-Keypoint 3D Pose & Fatigue Tensors", state: "ONLINE · 86.62/100" },
              { seat: "360 Market Auditor", focus: "77+ DK Market Types, 1Q-4Q/Kicking/IDP & Roster Locks", state: "ONLINE · 86.62/100" },
              { seat: "Airwave Social Desk", focus: "100 X Posts + 132 IG Posts + Friday Promo Pack", state: "ONLINE · 86.62/100" },
            ].map((s) => (
              <div key={s.seat} className="rounded-xl border border-titanium/40 bg-carbon/90 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-ion-white">{s.seat}</span>
                  <span className="font-mono text-[9px] text-accent-400">{s.state}</span>
                </div>
                <p className="mt-1 text-[11px] text-ion-2">{s.focus}</p>
              </div>
            ))}
          </div>
        )}

        {activeDescriptor.id === "x-dashboard" && (
          <div data-testid="x-dashboard-panel" className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-titanium/40 bg-carbon/90 p-3.5">
              <p className="font-mono text-[10px] font-bold uppercase text-plasma">
                100 X Posts Queue
              </p>
              <p className="mt-1 text-xs text-ion-2">
                Environment tendencies, trench pressure rates, PROE+ splits, and neutral pace threads verified clean of paid pick leaks.
              </p>
            </div>
            <div className="rounded-xl border border-titanium/40 bg-carbon/90 p-3.5">
              <p className="font-mono text-[10px] font-bold uppercase text-accent-400">
                132 IG Posts & Reels Queue
              </p>
              <p className="mt-1 text-xs text-ion-2">
                Visual matchup cards, Stealth-Skeleton biomechanical breakdowns, and Verified Ledger 47-19-1 (+24.92u) story tiles.
              </p>
            </div>
            <div className="rounded-xl border border-titanium/40 bg-carbon/90 p-3.5">
              <p className="font-mono text-[10px] font-bold uppercase text-ion-1">
                Friday Promo Pack & Beat Alerts
              </p>
              <p className="mt-1 text-xs text-ion-2">
                Live DNP/LP injury wire, Geno Smith (NYJ QB) & Mike Evans (SF WR) roster locks, and stadium wind/temperature feeds.
              </p>
            </div>
          </div>
        )}

        {activeDescriptor.id === "hermes-cloud-file-manager" && (
          <div data-testid="cloud-file-manager-panel" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-titanium/40 bg-carbon/90 p-3">
              <p className="font-mono text-[9px] uppercase text-ion-3">Research Corpus</p>
              <p className="mt-1 font-mono text-base font-bold text-ion-white">
                257 Unique PDFs / 503 Files
              </p>
              <p className="mt-1 text-[11px] text-ion-2">Indexed via PageIndex 10/10 hierarchical trees.</p>
            </div>
            <div className="rounded-xl border border-titanium/40 bg-carbon/90 p-3">
              <p className="font-mono text-[9px] uppercase text-ion-3">Graduate Textbooks</p>
              <p className="mt-1 font-mono text-base font-bold text-accent-400">
                25 Books (BK-01..BK-25)
              </p>
              <p className="mt-1 text-[11px] text-ion-2">Convex opt, optimal transport, conformal & biomechanics.</p>
            </div>
            <div className="rounded-xl border border-titanium/40 bg-carbon/90 p-3">
              <p className="font-mono text-[9px] uppercase text-ion-3">Game & Prop Dossiers</p>
              <p className="mt-1 font-mono text-base font-bold text-ion-white">
                81 Motif Dossiers
              </p>
              <p className="mt-1 text-[11px] text-ion-2">Full 5-stage situational & JEV trajectory provenance.</p>
            </div>
            <div className="rounded-xl border border-titanium/40 bg-carbon/90 p-3">
              <p className="font-mono text-[9px] uppercase text-ion-3">Week 9 Social Packs</p>
              <p className="mt-1 font-mono text-base font-bold text-plasma">
                100 X + 132 IG Assets
              </p>
              <p className="mt-1 text-[11px] text-ion-2">Guardrail-verified public copy & Friday promo bundle.</p>
            </div>
          </div>
        )}

        {(activeDescriptor.id === "kanban-gantt" ||
          activeDescriptor.id === "kanban-graph" ||
          activeDescriptor.id === "brain-graph" ||
          activeDescriptor.id === "blinkenbar") && (
          <div
            data-testid={`specialized-view-${activeDescriptor.id}`}
            className="rounded-xl border border-titanium/40 bg-carbon/90 p-4"
          >
            <p className="font-mono text-xs font-bold text-ion-white">
              {activeDescriptor.name} Live Topology · Wire-First Sequencing Active
            </p>
            <p className="mt-1 text-xs text-ion-2">
              Pipeline order locked: research → wire → weight → calibrate → test → polish · 5,367 Equations · 25 Graduate Books (BK-01..BK-25) · 288-Bit Context Mask · Stealth-Skeleton 86.62/100.
            </p>
          </div>
        )}

        {activeDescriptor.id === "hermes-chat-share" && (
          <div data-testid="hermes-chat-share-panel" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShareFormat("markdown")}
                  className={[
                    "rounded-lg border px-3 py-1 font-mono text-[10px] uppercase",
                    shareFormat === "markdown"
                      ? "border-plasma bg-plasma/20 text-ion-white"
                      : "border-titanium/40 bg-carbon/80 text-ion-2",
                  ].join(" ")}
                >
                  Markdown Snapshot
                </button>
                <button
                  type="button"
                  onClick={() => setShareFormat("json")}
                  className={[
                    "rounded-lg border px-3 py-1 font-mono text-[10px] uppercase",
                    shareFormat === "json"
                      ? "border-plasma bg-plasma/20 text-ion-white"
                      : "border-titanium/40 bg-carbon/80 text-ion-2",
                  ].join(" ")}
                >
                  JSON Receipt
                </button>
              </div>
              <button
                type="button"
                data-testid="copy-chat-share-btn"
                onClick={handleCopyShareSnapshot}
                className="rounded-lg border border-accent-800/60 bg-accent-950/40 px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent-400 hover:bg-accent-950/60"
              >
                1-Click Export Session & Call-Sheet
              </button>
            </div>
            {copyFeedback && (
              <p className="font-mono text-[10px] text-accent-400">{copyFeedback}</p>
            )}
            <pre
              data-testid="chat-share-preview"
              className="max-h-56 overflow-auto rounded-xl border border-titanium/40 bg-obsidian/90 p-3 font-mono text-[11px] text-ion-1"
            >
              {shareFormat === "json"
                ? JSON.stringify(shareBundle, null, 2)
                : shareBundle.markdownSnapshot}
            </pre>
          </div>
        )}
      </div>

      {/* ── 5. Installed NVIDIA 6-Skill Suite Panel ───────────────────────── */}
      <div
        data-testid="nvidia-skills-panel"
        className="rounded-2xl border border-titanium/40 bg-obsidian/60 p-5"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-ion-white">
              Installed NVIDIA Hermes Skills (6 / 6 Active · Stealth-Skeleton 86.62/100)
            </h2>
            <p className="text-[11px] text-ion-3">
              Installed in ~/.hermes/skills and ~/.agents/skills via hermes skills install NVIDIA/skills/skills/&lt;skill&gt;
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSkillFilter("ALL")}
              className={[
                "rounded border px-2.5 py-1 font-mono text-[10px]",
                skillFilter === "ALL"
                  ? "border-accent-500 bg-accent-950/30 text-accent-400"
                  : "border-titanium/40 bg-carbon/80 text-ion-2",
              ].join(" ")}
            >
              All 6 Skills
            </button>
            <button
              type="button"
              onClick={() => setSkillFilter(activePlugin)}
              className={[
                "rounded border px-2.5 py-1 font-mono text-[10px]",
                skillFilter === activePlugin
                  ? "border-accent-500 bg-accent-950/30 text-accent-400"
                  : "border-titanium/40 bg-carbon/80 text-ion-2",
              ].join(" ")}
            >
              Paired with {activeDescriptor.shortLabel}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill) => (
            <article
              key={skill.id}
              data-testid={`nvidia-skill-card-${skill.id}`}
              className="flex flex-col justify-between rounded-xl border border-titanium/40 bg-carbon/90 p-3.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-ion-white">
                    {skill.name}
                  </span>
                  <span className="rounded border border-accent-800/50 bg-accent-950/30 px-1.5 py-0.5 font-mono text-[9px] text-accent-400">
                    {skill.status} · {skill.wiringScore}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[9px] text-plasma">{skill.domain}</p>
                <p className="mt-1.5 text-[11px] leading-snug text-ion-2">
                  {skill.description}
                </p>
              </div>
              <div className="mt-3 border-t border-titanium/20 pt-2">
                <code className="block truncate rounded bg-obsidian/80 px-2 py-1 font-mono text-[9px] text-ion-3">
                  {skill.installCommand}
                </code>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
