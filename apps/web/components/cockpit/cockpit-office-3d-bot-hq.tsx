"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

export type OfficeTabMode =
  | "office-3d"
  | "omniroute-world"
  | "hermes-bot-hq"
  | "unified";

export interface WorkstationPod {
  id: string;
  deskNumber: number;
  deskLabel: string;
  agentName: string;
  model: string;
  status:
    | "ACTIVE_ROUTING"
    | "SIMULATING"
    | "PROVING"
    | "MONITORING_INJURIES"
    | "GRADING_BOARD"
    | "RENDERING";
  task: string;
  activeToolCall: string;
  thoughtBubble: string;
  memoryState: string;
  gridPos: { col: number; row: number; x: number; y: number };
  accentHex: string;
  accentClass: string;
  toolCalls: readonly {
    id: string;
    tool: string;
    latencyMs: number;
    status: "OK" | "STREAMING";
    summary: string;
  }[];
  logs: readonly string[];
}

export interface OmniRouteNode {
  id: string;
  layer: "INGRESS" | "MODELS" | "PLUGINS" | "LANES";
  label: string;
  subtitle: string;
  protocol: string;
  scoreLabel: string;
  costLabel: string;
  x: number;
  y: number;
}

export interface HermesBusMessage {
  id: string;
  timestamp: string;
  fromAgent: string;
  toAgent: string;
  channel: string;
  topic: string;
  payload: string;
  receiptHash: string;
}

export const WORKSTATION_PODS: readonly WorkstationPod[] = [
  {
    id: "ws-hq-core",
    deskNumber: 1,
    deskLabel: "HQ Core Desk",
    agentName: "Jarvis x Jynx Orchestrator",
    model: "gse/skeleton-stealth",
    status: "ACTIVE_ROUTING",
    task: "Coordinating 5-stage NFL Week 9 slate, DFS core, and live Cockpit commands",
    activeToolCall: "mcp.orchestrate_slate(week=9, stages=5)",
    thoughtBubble:
      "Routing Week 9 situational priors across all 6 desks via 288-bit context mask.",
    memoryState:
      "Episodic + Semantic Vault synced · 288-bit context mask active · 86.62/100 composite",
    gridPos: { col: 0, row: 0, x: 180, y: 120 },
    accentHex: "#38bdf8",
    accentClass: "border-accent-500/60 bg-accent-950/30 text-accent-400",
    toolCalls: [
      {
        id: "tc-101",
        tool: "mcp.buildContextMask",
        latencyMs: 14,
        status: "OK",
        summary: "288-bit situational context mask compiled pre-simulation",
      },
      {
        id: "tc-102",
        tool: "jarvis.dispatchFleetPacket",
        latencyMs: 22,
        status: "STREAMING",
        summary: "Broadcasting Week 9 ruling constraints to 5 specialist desks",
      },
    ],
    logs: [
      "[HQ-01] Stage 1 injury & coaching context verified across active NFL Week 9 slate.",
      "[HQ-02] Stage 2 Master Situational Reasoning overlay locked prior to trajectory engine.",
      "[HQ-03] Roster guardrail verified: Geno Smith = NYJ QB · Mike Evans = SF WR.",
    ],
  },
  {
    id: "ws-film-sim",
    deskNumber: 2,
    deskLabel: "Film & Simulation Desk",
    agentName: "Motif & JEV Snap Simulator",
    model: "gse/skeleton-forecast",
    status: "SIMULATING",
    task: "Running 10,000-world situational trajectories & 81 Motif pull-master dossiers",
    activeToolCall: "jevkit.client.ask(model='~typesafe/jev-latest', snaps=175)",
    thoughtBubble:
      "Simulating Q1 15:00 through Q4 0:00 snap-by-snap with Stage 2 trench priors baked in.",
    memoryState:
      "81 Motif pull-master dossiers · 10,000 worlds x 175 snaps = 1,750,000 snap vectors",
    gridPos: { col: 1, row: 0, x: 500, y: 120 },
    accentHex: "#a855f7",
    accentClass: "border-plasma/60 bg-plasma/15 text-plasma",
    toolCalls: [
      {
        id: "tc-201",
        tool: "jevkit.client.ask",
        latencyMs: 185,
        status: "STREAMING",
        summary: "Sequential snap transition probabilities + pressure_disruption noul",
      },
      {
        id: "tc-202",
        tool: "gse_coach_mind_simulator.run_vectors",
        latencyMs: 310,
        status: "OK",
        summary: "1,750,000 correlated snap vectors generated (zero Gaussian shortcuts)",
      },
    ],
    logs: [
      "[SIM-01] Loaded 81 Motif film dossiers + PROE/pressure_answer/script_elasticity.",
      "[SIM-02] Snap-by-snap Jev distributions driving 10,000 situational game worlds.",
      "[SIM-03] Half-time script elasticity and 4Q trench fatigue decay tensors applied.",
    ],
  },
  {
    id: "ws-math-conformal",
    deskNumber: 3,
    deskLabel: "Math & Conformal Desk",
    agentName: "Argon Deep Research & Council",
    model: "gse/skeleton-math-pro & gse/skeleton-council",
    status: "PROVING",
    task: "5,367 equations + 25 graduate books (BK-01..BK-25) + Sinkhorn-Knopp L1=2.66e-7",
    activeToolCall: "sinkhorn_reallocate_weights(epsilon=1e-3, l1_tol=1e-7)",
    thoughtBubble:
      "Converging Sinkhorn-Knopp optimal transport L1=2.66e-7 + Romano CQR intervals.",
    memoryState:
      "5,367 equations wired · 25 graduate textbooks (BK-01..BK-25) · James-Stein cap 0.35",
    gridPos: { col: 2, row: 0, x: 820, y: 120 },
    accentHex: "#34d399",
    accentClass: "border-emerald-500/60 bg-emerald-950/30 text-emerald-400",
    toolCalls: [
      {
        id: "tc-301",
        tool: "mcp.stageC_spectralOrthogonalize",
        latencyMs: 19,
        status: "OK",
        summary: "Spectral cluster orthogonalization across 6 situational families",
      },
      {
        id: "tc-302",
        tool: "sinkhorn_reallocate_weights",
        latencyMs: 27,
        status: "OK",
        summary: "Optimal transport marginal convergence residual L1=2.66e-7",
      },
    ],
    logs: [
      "[MATH-01] 5,367-equation router + 25 graduate books (BK-01..BK-25) active in memory.",
      "[MATH-02] Positive-Part James-Stein shrinkage capped at |delta log-odds| <= 0.35.",
      "[MATH-03] Barber weighted conformal prediction + FWL market residualization verified.",
    ],
  },
  {
    id: "ws-sports-med",
    deskNumber: 4,
    deskLabel: "Sports Medicine Bay",
    agentName: "GSI Biomechanics & Trauma Agent",
    model: "gse/skeleton-stealth",
    status: "MONITORING_INJURIES",
    task: "Tracking RTP high-ankle/hamstring curves & 4Q trench contact load; Geno Smith (NYJ), Mike Evans (SF)",
    activeToolCall: "gsi.biomechanics_rtp_curve(active_gp_only=true)",
    thoughtBubble:
      "Auditing per-player active GP denominators + RTP kinematics: Geno Smith (NYJ), Mike Evans (SF).",
    memoryState:
      "Active player_gp denominator rule locked · Geno Smith = NYJ QB · Mike Evans = SF WR",
    gridPos: { col: 0, row: 1, x: 180, y: 300 },
    accentHex: "#fbbf24",
    accentClass: "border-caution/60 bg-caution/15 text-caution",
    toolCalls: [
      {
        id: "tc-401",
        tool: "gsi.verifyActiveRosterDenominators",
        latencyMs: 16,
        status: "OK",
        summary: "Enforced player_gp denominator; Geno Smith = NYJ QB, Mike Evans = SF WR",
      },
      {
        id: "tc-402",
        tool: "gsi.computeTrenchContactDecay",
        latencyMs: 31,
        status: "STREAMING",
        summary: "Computing 2H pass-rush survival decay vs OL anchor injuries",
      },
    ],
    logs: [
      "[GSI-01] Roster truth verified: Geno Smith = NYJ QB · Mike Evans = SF WR.",
      "[GSI-02] High-ankle & hamstring RTP deceleration curves applied to route separation.",
      "[GSI-03] Never dividing injured/returning players by team GP; strict player_gp active.",
    ],
  },
  {
    id: "ws-trading-dfs",
    deskNumber: 5,
    deskLabel: "Trading & DFS Floor",
    agentName: "360 Market & Optimal Lineup Agent",
    model: "gse/skeleton-forecast",
    status: "GRADING_BOARD",
    task: "Season Ledger 47-19-1 (+24.92u) | Base 38-13-1 (+22.85u) · 14-player DFS Core Pool locked",
    activeToolCall: "calibration.signCallSheetTickets(markets=77)",
    thoughtBubble:
      "Auditing 1Q-4Q, 1H/2H, Kicking, IDP & Props against Class B de-vig Conjunction Gate.",
    memoryState:
      "Official Season Ledger 47-19-1 (+24.92u) | Base 38-13-1 (+22.85u) · 14-player DFS Core",
    gridPos: { col: 1, row: 1, x: 500, y: 300 },
    accentHex: "#22d3ee",
    accentClass: "border-cyan-400/60 bg-cyan-950/30 text-cyan-300",
    toolCalls: [
      {
        id: "tc-501",
        tool: "calibration.signCallSheetTickets",
        latencyMs: 42,
        status: "OK",
        summary: "Stage 5 Class B market de-vig & conjunction gate PASS discipline enforced",
      },
      {
        id: "tc-502",
        tool: "dfs.lockOptimalCorePool",
        latencyMs: 29,
        status: "OK",
        summary: "14-player Week 9 DFS Core Pool + Milly Maker leverage stacks locked",
      },
    ],
    logs: [
      "[TRD-01] Official Season Ledger of Record: 47-19-1 (+24.92u) | Base 38-13-1 (+22.85u).",
      "[TRD-02] Full 360-degree board scan active across 1Q-4Q, 1H/2H, Kicking, IDP, and TDs.",
      "[TRD-03] Sub-threshold edges marked PASS (publishAllowed: false) via no-bet-gate.",
    ],
  },
  {
    id: "ws-creative-studio",
    deskNumber: 6,
    deskLabel: "Creative Studio Desk",
    agentName: "Muse Autonomous Content & Video Agent",
    model: "gse/skeleton-flash",
    status: "RENDERING",
    task: "Generating Week 9 Friday X cards, IG slides, and QB progression chalkboard reels",
    activeToolCall: "muse.renderChalkboardReel(week=9, format='1080x1920')",
    thoughtBubble:
      "Rendering sharp football-film matchup cards · public picks behind paywall.",
    memoryState:
      "Human-copy brand filter active · zero internal math jargon on public cards",
    gridPos: { col: 2, row: 1, x: 820, y: 300 },
    accentHex: "#f472b6",
    accentClass: "border-pink-400/60 bg-pink-950/30 text-pink-300",
    toolCalls: [
      {
        id: "tc-601",
        tool: "muse.verifyPublicCopyGuard",
        latencyMs: 11,
        status: "OK",
        summary: "0/100 banned jargon · paywall gate verified before social export",
      },
      {
        id: "tc-602",
        tool: "muse.renderChalkboardReel",
        latencyMs: 140,
        status: "STREAMING",
        summary: "Rendering Week 9 QB progression & pressure survival reels",
      },
    ],
    logs: [
      "[MUSE-01] Friday X cards and IG slides queued with natural football-film copy.",
      "[MUSE-02] Official sides, totals, props, and SGP legs strictly protected behind paywall.",
      "[MUSE-03] Chalkboard canvas telemetry synced with Motif Desk #2.",
    ],
  },
];

export const OMNIROUTE_NODES: readonly OmniRouteNode[] = [
  // Ingress Gateways
  {
    id: "node-ingress-cockpit",
    layer: "INGRESS",
    label: "Cockpit UI",
    subtitle: "Owner OS & 3D Office Deck",
    protocol: "HTTPS / React 18 Server+Client",
    scoreLabel: "100/100 Auth",
    costLabel: "$0.00",
    x: 90,
    y: 70,
  },
  {
    id: "node-ingress-jynx",
    layer: "INGRESS",
    label: "/api/cockpit/jarvis/jynx-brain",
    subtitle: "Primary Orchestrator Endpoint",
    protocol: "POST JSON / Streaming",
    scoreLabel: "100/100 Wired",
    costLabel: "$0.00",
    x: 90,
    y: 165,
  },
  {
    id: "node-ingress-openrouter",
    layer: "INGRESS",
    label: "OpenRouter Provider (/v1/chat/completions)",
    subtitle: "OpenAI-Compatible Universal Gateway",
    protocol: "REST / SSE Stream",
    scoreLabel: "86.62/100 Scale",
    costLabel: "$0.00 Free Lane",
    x: 90,
    y: 260,
  },
  {
    id: "node-ingress-mcp",
    layer: "INGRESS",
    label: "OpenRouter MCP Server (/mcp JSON-RPC 2.0)",
    subtitle: "Universal Tool & Equation Bus",
    protocol: "JSON-RPC 2.0",
    scoreLabel: "32/32 Tools",
    costLabel: "$0.00",
    x: 90,
    y: 355,
  },
  // 5 Native GSE Stealth-Skeleton Models
  {
    id: "node-model-stealth",
    layer: "MODELS",
    label: "gse/skeleton-stealth",
    subtitle: "Flagship Situational & Biomechanics Brain",
    protocol: "86.62/100 Composite Scale",
    scoreLabel: "86.62/100",
    costLabel: "$0.00",
    x: 370,
    y: 55,
  },
  {
    id: "node-model-council",
    layer: "MODELS",
    label: "gse/skeleton-council",
    subtitle: "4-Voice Adversarial Conjunction Arbiter",
    protocol: "86.62/100 Composite Scale",
    scoreLabel: "86.62/100",
    costLabel: "$0.00",
    x: 370,
    y: 135,
  },
  {
    id: "node-model-forecast",
    layer: "MODELS",
    label: "gse/skeleton-forecast",
    subtitle: "10,000-World PBP & 360 Market Calibrator",
    protocol: "86.62/100 Composite Scale",
    scoreLabel: "86.62/100",
    costLabel: "$0.00",
    x: 370,
    y: 215,
  },
  {
    id: "node-model-math",
    layer: "MODELS",
    label: "gse/skeleton-math-pro",
    subtitle: "5,367-Equation & Sinkhorn-Knopp Prover",
    protocol: "86.62/100 Composite Scale",
    scoreLabel: "86.62/100",
    costLabel: "$0.00",
    x: 370,
    y: 295,
  },
  {
    id: "node-model-flash",
    layer: "MODELS",
    label: "gse/skeleton-flash",
    subtitle: "Low-Latency PBP Parser & Creative Studio",
    protocol: "86.62/100 Composite Scale",
    scoreLabel: "86.62/100",
    costLabel: "$0.00",
    x: 370,
    y: 375,
  },
  // Intelligence & RAG Plugins
  {
    id: "node-plugin-pageindex",
    layer: "PLUGINS",
    label: "PageIndex Vectorless Tree RAG (10/10 Recall)",
    subtitle: "Hierarchical AST + Paper Index",
    protocol: "MCP Plugin",
    scoreLabel: "10/10 Recall",
    costLabel: "$0.00",
    x: 650,
    y: 45,
  },
  {
    id: "node-plugin-gitingest",
    layer: "PLUGINS",
    label: "Gitingest Repo Digest",
    subtitle: "Full Codebase Context Compiler",
    protocol: "MCP Plugin",
    scoreLabel: "100/100 Sync",
    costLabel: "$0.00",
    x: 650,
    y: 112,
  },
  {
    id: "node-plugin-equations",
    layer: "PLUGINS",
    label: "5,367-Equation MCP Router",
    subtitle: "288-Bit Mask -> Spectral -> Jacobian",
    protocol: "MCP Plugin",
    scoreLabel: "5,367 Active",
    costLabel: "$0.00",
    x: 650,
    y: 180,
  },
  {
    id: "node-plugin-sinkhorn",
    layer: "PLUGINS",
    label: "Sinkhorn-Knopp Optimal Transport",
    subtitle: "Marginal Coupler (L1=2.66e-7)",
    protocol: "Vectorized Math",
    scoreLabel: "L1=2.66e-7",
    costLabel: "$0.00",
    x: 650,
    y: 248,
  },
  {
    id: "node-plugin-cqr",
    layer: "PLUGINS",
    label: "Romano CQR Calibration",
    subtitle: "Barber Weighted Conformal Intervals",
    protocol: "Conformal Head",
    scoreLabel: "90/100 Cov",
    costLabel: "$0.00",
    x: 650,
    y: 316,
  },
  {
    id: "node-plugin-gsi",
    layer: "PLUGINS",
    label: "GSI Biomechanics Engine",
    subtitle: "RTP Curves & Trench Fatigue Load",
    protocol: "Medical Telemetry",
    scoreLabel: "32/32 Teams",
    costLabel: "$0.00",
    x: 650,
    y: 384,
  },
  // Zero-Waste Execution Lanes
  {
    id: "node-lane-free",
    layer: "LANES",
    label: "Free Workhorse Lane ($0.00)",
    subtitle: "OpenRouter Free + Local MiMo Tier",
    protocol: "Zero-Waste Router",
    scoreLabel: "0 bps Spend",
    costLabel: "$0.00",
    x: 910,
    y: 110,
  },
  {
    id: "node-lane-vector",
    layer: "LANES",
    label: "Local Vectorized Engine ($0.00)",
    subtitle: "NumPy / DuckDB / 1.75M Snaps Sub-Second",
    protocol: "Local Compute",
    scoreLabel: "1,750,000 Snaps",
    costLabel: "$0.00",
    x: 910,
    y: 215,
  },
  {
    id: "node-lane-failover",
    layer: "LANES",
    label: "Multi-Cloud Failover (Bedrock -> Azure -> Vertex)",
    subtitle: "Circuit-Breaker Protected Resiliency",
    protocol: "3-Cloud Mesh",
    scoreLabel: "99.98/100 SLA",
    costLabel: "Standby",
    x: 910,
    y: 320,
  },
];

const INITIAL_BUS_MESSAGES: readonly HermesBusMessage[] = [
  {
    id: "bus-01",
    timestamp: "02:21:04 UTC",
    fromAgent: "Jarvis x Jynx Orchestrator",
    toAgent: "Motif & JEV Snap Simulator",
    channel: "brain/agent-bus#stage2-priors",
    topic: "SITUATIONAL_PRIORS_LOCKED",
    payload:
      "288-bit mask + 80-rule firewall compiled for Week 9 slate. Proceed with 10,000-world JEV snap simulation.",
    receiptHash: "0x9f4a..c812",
  },
  {
    id: "bus-02",
    timestamp: "02:21:19 UTC",
    fromAgent: "GSI Biomechanics & Trauma Agent",
    toAgent: "360 Market & Optimal Lineup Agent",
    channel: "brain/agent-bus#injury-rtp",
    topic: "ROSTER_DENOMINATOR_AUDIT",
    payload:
      "Active player_gp denominators verified. Roster ruling confirmed: Geno Smith = NYJ QB, Mike Evans = SF WR.",
    receiptHash: "0x7b2d..e104",
  },
  {
    id: "bus-03",
    timestamp: "02:21:42 UTC",
    fromAgent: "Argon Deep Research & Council",
    toAgent: "Motif & JEV Snap Simulator",
    channel: "brain/agent-bus#sinkhorn-ot",
    topic: "OPTIMAL_TRANSPORT_CONVERGED",
    payload:
      "5,367 equations + 25 graduate books (BK-01..BK-25) coupled. Sinkhorn-Knopp L1=2.66e-7 verified.",
    receiptHash: "0x3e81..a940",
  },
  {
    id: "bus-04",
    timestamp: "02:22:08 UTC",
    fromAgent: "360 Market & Optimal Lineup Agent",
    toAgent: "Jarvis x Jynx Orchestrator",
    channel: "brain/agent-bus#ledger-truth",
    topic: "CONJUNCTION_GATE_RECEIPT",
    payload:
      "Official Season Ledger 47-19-1 (+24.92u) | Base 38-13-1 (+22.85u) synced. 14-player DFS Core Pool locked.",
    receiptHash: "0x5c19..f208",
  },
  {
    id: "bus-05",
    timestamp: "02:22:31 UTC",
    fromAgent: "Muse Autonomous Content & Video Agent",
    toAgent: "Jarvis x Jynx Orchestrator",
    channel: "brain/agent-bus#creative-deck",
    topic: "SOCIAL_REELS_READY",
    payload:
      "Week 9 Friday X cards, IG slides, and QB progression chalkboard reels rendered with human copy guardrails.",
    receiptHash: "0x8a60..d771",
  },
];

export function CockpitOffice3dBotHq({
  fullScreen = false,
}: {
  fullScreen?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<OfficeTabMode>("office-3d");
  const [selectedPodId, setSelectedPodId] = useState<string>(
    WORKSTATION_PODS[0]?.id ?? "pod-jarvis-jynx"
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    OMNIROUTE_NODES[4]?.id ?? "node-stealth"
  );
  const [pitchDeg, setPitchDeg] = useState<number>(54);
  const [yawDeg, setYawDeg] = useState<number>(-18);
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [packetsRunning, setPacketsRunning] = useState<boolean>(true);
  const [taskInput, setTaskInput] = useState<string>(
    "Run Week 9 360-degree prop & situational audit on selected workstation"
  );
  const [dispatchStatus, setDispatchStatus] = useState<{
    loading: boolean;
    message: string | null;
    timestamp: string | null;
  }>({
    loading: false,
    message: null,
    timestamp: null,
  });
  const [broadcastInput, setBroadcastInput] = useState<string>(
    "SYNC_ALL_DESKS: Verify Stage 2 situational priors + 47-19-1 (+24.92u) ledger pin"
  );
  const [busMessages, setBusMessages] =
    useState<readonly HermesBusMessage[]>(INITIAL_BUS_MESSAGES);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedPod = (
    WORKSTATION_PODS.find((p) => p.id === selectedPodId) ?? WORKSTATION_PODS[0]
  )!;
  const selectedNode = (
    OMNIROUTE_NODES.find((n) => n.id === selectedNodeId) ?? OMNIROUTE_NODES[0]
  )!;

  // HTML5 Canvas animated inter-agent packet particles for the 3D office floor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    let animFrame = 0;
    let tick = 0;

    const renderFrame = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw isometric floor grid lines
      ctx.strokeStyle = "rgba(56, 189, 248, 0.10)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw inter-desk bus lanes and animated packet particles
      const hub = WORKSTATION_PODS[0]!.gridPos;
      WORKSTATION_PODS.slice(1).forEach((pod, idx) => {
        if (!ctx) return;
        ctx.strokeStyle = "rgba(168, 85, 247, 0.28)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(hub.x, hub.y);
        ctx.lineTo(pod.gridPos.x, pod.gridPos.y);
        ctx.stroke();

        const rawProgress = tick * 0.012 + idx * 0.19;
        const progress = rawProgress - Math.floor(rawProgress);
        const px = hub.x + (pod.gridPos.x - hub.x) * progress;
        const py = hub.y + (pod.gridPos.y - hub.y) * progress;

        ctx.fillStyle = pod.accentHex;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      if (packetsRunning) {
        tick += 1;
        animFrame = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    return () => {
      if (animFrame) {
        window.cancelAnimationFrame(animFrame);
      }
    };
  }, [packetsRunning]);

  async function handleDispatchToAgent() {
    const trimmed = taskInput.trim();
    if (!trimmed) return;
    setDispatchStatus({
      loading: true,
      message: null,
      timestamp: null,
    });

    const nowLabel = new Date().toLocaleTimeString();
    try {
      const response = await fetch("/api/cockpit/jarvis/jynx-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `[${selectedPod.deskLabel} · ${selectedPod.agentName}] ${trimmed}`,
          agentId: selectedPod.id,
          desk: selectedPod.deskLabel,
          model: selectedPod.model,
          source: "cockpit-office-3d-bot-hq",
        }),
      });

      let replyText = `Task routed to ${selectedPod.agentName} (${selectedPod.model}) via Jynx Brain.`;
      if (response && response.ok) {
        const data = (await response.json().catch(() => null)) as {
          reply?: string;
          answer?: string;
          message?: string;
        } | null;
        if (data?.reply || data?.answer || data?.message) {
          replyText = String(data.reply ?? data.answer ?? data.message);
        }
      }

      setDispatchStatus({
        loading: false,
        message: replyText,
        timestamp: nowLabel,
      });

      setBusMessages((prev) => [
        {
          id: `bus-${Date.now()}`,
          timestamp: nowLabel,
          fromAgent: "Owner Cockpit",
          toAgent: selectedPod.agentName,
          channel: "brain/agent-bus#direct-dispatch",
          topic: "WORKSTATION_TASK_DISPATCH",
          payload: `${trimmed} -> Ack: ${replyText.slice(0, 120)}`,
          receiptHash: "0x4f92..e811",
        },
        ...prev,
      ]);
    } catch {
      const fallbackMsg = `Queued on ${selectedPod.deskLabel} (${selectedPod.model}): "${trimmed}"`;
      setDispatchStatus({
        loading: false,
        message: fallbackMsg,
        timestamp: nowLabel,
      });
    }
  }

  async function handleBroadcastCommand() {
    const trimmed = broadcastInput.trim();
    if (!trimmed) return;
    const nowLabel = new Date().toLocaleTimeString();

    try {
      await fetch("/api/cockpit/jarvis/jynx-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `[HERMES_BOT_HQ_BROADCAST] ${trimmed}`,
          source: "hermes-bot-hq-broadcast",
        }),
      }).catch(() => null);
    } catch {
      // Non-blocking telemetry broadcast
    }

    setBusMessages((prev) => [
      {
        id: `bus-bcast-${Date.now()}`,
        timestamp: nowLabel,
        fromAgent: "Hermes Bot HQ Command",
        toAgent: "ALL_6_WORKSTATIONS",
        channel: "brain/agent-bus#fleet-broadcast",
        topic: "FLEET_DIRECTIVE_SYNC",
        payload: trimmed,
        receiptHash: "0x1d88..b309",
      },
      ...prev,
    ]);
  }

  return (
    <section
      data-testid="cockpit-office-3d-bot-hq"
      aria-label="Hermes 3D Agent Office, OmniRoute Universal API World, and Bot HQ"
      className="relative overflow-hidden rounded-3xl border border-titanium/60 bg-carbon/90 shadow-2xl shadow-black/40"
    >
      {/* Top Command Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-titanium/40 bg-obsidian/70 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-ion-white">
                Hermes Agent Office-3D · Bot HQ · OmniRoute API World
              </h2>
              <span className="rounded border border-accent-500/40 bg-accent-950/40 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-accent-400">
                6/6 Desks Active
              </span>
              <span className="rounded border border-plasma/40 bg-plasma/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-plasma">
                86.62/100 Composite Scale
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-ion-3">
              Season Ledger{" "}
              <span className="font-semibold text-emerald-400">
                47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)
              </span>{" "}
              · Roster Ruling:{" "}
              <span className="text-ion-2">
                Geno Smith = NYJ QB · Mike Evans = SF WR
              </span>{" "}
              · Zero-Waste Compute: <span className="text-accent-400">$0.00</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {fullScreen ? (
            <Link
              href="/cockpit"
              className="rounded-xl border border-titanium/50 bg-obsidian/80 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-ion-2 hover:border-accent-500/50 hover:text-ion-white"
            >
              Back to Cockpit Overview
            </Link>
          ) : (
            <Link
              href="/cockpit/bot-hq"
              data-testid="open-full-bot-hq-link"
              className="rounded-xl border border-accent-500/50 bg-accent-950/30 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-accent-400 hover:bg-accent-950/60"
            >
              Expand Full-Screen Bot HQ
            </Link>
          )}
        </div>
      </div>

      {/* 3 Interactive View Tabs + Unified Toggle */}
      <div
        role="tablist"
        aria-label="Agent Office and API World View Tabs"
        className="flex flex-wrap items-center gap-2 border-b border-titanium/30 bg-obsidian/40 px-5 py-2.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "office-3d"}
          data-testid="tab-office-3d"
          onClick={() => setActiveTab("office-3d")}
          className={[
            "rounded-xl border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors",
            activeTab === "office-3d"
              ? "border-accent-500/70 bg-accent-950/50 text-accent-400"
              : "border-titanium/40 bg-obsidian/60 text-ion-2 hover:text-ion-white",
          ].join(" ")}
        >
          1 · 3D Isometric Agent Office (office-3d)
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "omniroute-world"}
          data-testid="tab-omniroute-world"
          onClick={() => setActiveTab("omniroute-world")}
          className={[
            "rounded-xl border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors",
            activeTab === "omniroute-world"
              ? "border-plasma/70 bg-plasma/20 text-plasma"
              : "border-titanium/40 bg-obsidian/60 text-ion-2 hover:text-ion-white",
          ].join(" ")}
        >
          2 · OmniRoute Universal API & MCP Plugin World
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "hermes-bot-hq"}
          data-testid="tab-hermes-bot-hq"
          onClick={() => setActiveTab("hermes-bot-hq")}
          className={[
            "rounded-xl border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors",
            activeTab === "hermes-bot-hq"
              ? "border-emerald-500/70 bg-emerald-950/40 text-emerald-400"
              : "border-titanium/40 bg-obsidian/60 text-ion-2 hover:text-ion-white",
          ].join(" ")}
        >
          3 · Hermes Bot HQ Bus & Fleet Telemetry (hermes-bot-hq)
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "unified"}
          data-testid="tab-unified-all"
          onClick={() => setActiveTab("unified")}
          className={[
            "ml-auto rounded-xl border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors",
            activeTab === "unified"
              ? "border-caution/70 bg-caution/20 text-caution"
              : "border-titanium/40 bg-obsidian/60 text-ion-3 hover:text-ion-white",
          ].join(" ")}
        >
          Unified 3-Deck View
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* ===================================================================
            TAB 1: 3D ISOMETRIC AGENT OFFICE (office-3d)
           =================================================================== */}
        <div
          data-testid="panel-office-3d"
          className={
            activeTab === "office-3d" || activeTab === "unified"
              ? "block space-y-4"
              : "hidden"
          }
        >
          {/* Camera Orbit / Tilt / Zoom Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-titanium/40 bg-obsidian/50 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-ion-2">
              <span className="font-bold uppercase tracking-widest text-accent-400">
                Isometric 3D Camera Rig
              </span>
              <label className="flex items-center gap-1.5">
                <span>Pitch: {pitchDeg}deg</span>
                <input
                  type="range"
                  min={25}
                  max={70}
                  value={pitchDeg}
                  aria-label="Camera pitch angle"
                  onChange={(e) => setPitchDeg(Number(e.target.value))}
                  className="h-1.5 w-20 accent-sky-400"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span>Yaw: {yawDeg}deg</span>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  value={yawDeg}
                  aria-label="Camera yaw angle"
                  onChange={(e) => setYawDeg(Number(e.target.value))}
                  className="h-1.5 w-20 accent-sky-400"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span>Zoom: {zoomScale}/100</span>
                <input
                  type="range"
                  min={80}
                  max={115}
                  value={zoomScale}
                  aria-label="Camera zoom scale"
                  onChange={(e) => setZoomScale(Number(e.target.value))}
                  className="h-1.5 w-20 accent-sky-400"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPitchDeg(54);
                  setYawDeg(-18);
                  setZoomScale(100);
                }}
                className="rounded-lg border border-titanium/40 bg-carbon/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-ion-2 hover:text-ion-white"
              >
                Reset Isometric
              </button>
              <button
                type="button"
                onClick={() => {
                  setPitchDeg(68);
                  setYawDeg(0);
                  setZoomScale(96);
                }}
                className="rounded-lg border border-titanium/40 bg-carbon/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-ion-2 hover:text-ion-white"
              >
                Top Tactical
              </button>
              <button
                type="button"
                onClick={() => setPacketsRunning((v) => !v)}
                className="rounded-lg border border-accent-500/40 bg-accent-950/30 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-accent-400"
              >
                {packetsRunning ? "Packets: Flowing" : "Packets: Paused"}
              </button>
            </div>
          </div>

          {/* 3D Floor + Workstation Inspector Split */}
          <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
            {/* 3D Isometric Spatial Office Floor */}
            <div
              data-testid="office-3d-isometric-stage"
              className="relative overflow-hidden rounded-2xl border border-titanium/50 bg-obsidian/80 p-4"
              style={{ perspective: "1200px" }}
            >
              {/* Background Canvas for Packet Particles & Floor Grid */}
              <canvas
                ref={canvasRef}
                width={1000}
                height={420}
                aria-label="3D Agent Office inter-desk packet canvas"
                className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
              />

              {/* 3D Transformed Isometric Plane */}
              <div
                data-testid="office-3d-transform-plane"
                className="relative grid grid-cols-1 gap-4 transition-transform duration-300 sm:grid-cols-2 xl:grid-cols-3"
                style={{
                  transformStyle: "preserve-3d",
                  transform: `rotateX(${Math.round(pitchDeg * 0.22)}deg) rotateZ(${Math.round(yawDeg * 0.15)}deg) scale(${(zoomScale / 100).toFixed(2)})`,
                }}
              >
                {WORKSTATION_PODS.map((pod) => {
                  const isSelected = pod.id === selectedPod.id;
                  return (
                    <button
                      key={pod.id}
                      type="button"
                      data-testid={`workstation-pod-${pod.id}`}
                      onClick={() => setSelectedPodId(pod.id)}
                      className={[
                        "group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all",
                        isSelected
                          ? "border-accent-400 bg-carbon/95 shadow-lg shadow-sky-500/10 ring-1 ring-accent-400/50"
                          : "border-titanium/50 bg-carbon/80 hover:border-titanium",
                      ].join(" ")}
                      style={{
                        transform: isSelected
                          ? "translateZ(18px)"
                          : "translateZ(6px)",
                      }}
                    >
                      {/* Desk Header + Animated Status Indicator */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ion-3">
                            Desk #{pod.deskNumber} · {pod.deskLabel}
                          </span>
                          <span
                            className={[
                              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest",
                              pod.accentClass,
                            ].join(" ")}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full animate-pulse"
                              style={{ backgroundColor: pod.accentHex }}
                            />
                            {pod.status}
                          </span>
                        </div>

                        <h3 className="mt-1.5 text-sm font-bold text-ion-white">
                          {pod.agentName}
                        </h3>

                        <p className="mt-0.5 font-mono text-[10px] text-accent-400">
                          Model: {pod.model}
                        </p>

                        {/* Live Thought Bubble */}
                        <div className="mt-2.5 rounded-xl border border-titanium/40 bg-obsidian/70 px-3 py-2">
                          <p className="font-mono text-[8px] uppercase tracking-widest text-ion-3">
                            Live Thought Bubble
                          </p>
                          <p className="mt-0.5 text-[11px] italic text-ion-1">
                            &ldquo;{pod.thoughtBubble}&rdquo;
                          </p>
                        </div>

                        {/* Active Task */}
                        <p className="mt-2.5 text-xs leading-relaxed text-ion-2">
                          {pod.task}
                        </p>
                      </div>

                      {/* Active Tool Call Badge */}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-titanium/30 pt-2.5">
                        <span className="truncate rounded bg-obsidian/90 px-2 py-0.5 font-mono text-[9px] text-plasma">
                          Tool: {pod.activeToolCall}
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-ion-3 group-hover:text-ion-white">
                          Inspect
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Agent Workstation Inspector Drawer */}
            <aside
              data-testid="agent-workstation-inspector-drawer"
              aria-label="Live Agent Workstation Inspector Drawer"
              className="flex flex-col justify-between rounded-2xl border border-titanium/50 bg-obsidian/75 p-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-titanium/30 pb-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-accent-400">
                      Live Agent Workstation Inspector Drawer
                    </p>
                    <h3
                      data-testid="inspector-agent-name"
                      className="mt-0.5 text-base font-bold text-ion-white"
                    >
                      {selectedPod.deskLabel} · {selectedPod.agentName}
                    </h3>
                  </div>
                  <span
                    className={[
                      "rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest",
                      selectedPod.accentClass,
                    ].join(" ")}
                  >
                    {selectedPod.status}
                  </span>
                </div>

                {/* Model & Memory State */}
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-titanium/30 bg-carbon/70 p-3 text-xs">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ion-3">
                      Assigned Stealth Model:{" "}
                    </span>
                    <span
                      data-testid="inspector-agent-model"
                      className="font-mono font-semibold text-accent-400"
                    >
                      {selectedPod.model}
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ion-3">
                      Memory State:{" "}
                    </span>
                    <span className="text-ion-1">{selectedPod.memoryState}</span>
                  </div>
                </div>

                {/* Active Tool Calls */}
                <div>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ion-3">
                    Active Tool Calls ({selectedPod.toolCalls.length})
                  </p>
                  <div className="mt-1.5 space-y-1.5">
                    {selectedPod.toolCalls.map((tc) => (
                      <div
                        key={tc.id}
                        className="rounded-xl border border-titanium/30 bg-carbon/60 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="font-semibold text-plasma">
                            {tc.tool}
                          </span>
                          <span className="text-ion-3">
                            {tc.status} · {tc.latencyMs}ms
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-ion-2">
                          {tc.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Log Stream */}
                <div>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ion-3">
                    Workstation Live Log Stream
                  </p>
                  <div className="mt-1.5 space-y-1 rounded-xl border border-titanium/30 bg-black/50 p-2.5 font-mono text-[10px] text-ion-2">
                    {selectedPod.logs.map((line, i) => (
                      <p key={i} className="leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dispatch Task to Agent Action */}
              <div className="mt-4 border-t border-titanium/30 pt-3">
                <label
                  htmlFor="workstation-task-input"
                  className="block font-mono text-[9px] font-bold uppercase tracking-widest text-ion-2"
                >
                  Dispatch Directive to {selectedPod.agentName}
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="workstation-task-input"
                    data-testid="workstation-task-input"
                    type="text"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-titanium/50 bg-carbon/90 px-3 py-1.5 font-mono text-xs text-ion-white focus:border-accent-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    data-testid="dispatch-task-to-agent-btn"
                    disabled={dispatchStatus.loading}
                    onClick={handleDispatchToAgent}
                    className="rounded-xl border border-accent-500/60 bg-accent-950/60 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent-400 hover:bg-accent-900/60 disabled:opacity-50"
                  >
                    {dispatchStatus.loading
                      ? "Dispatching..."
                      : "Dispatch Task to Agent"}
                  </button>
                </div>
                {dispatchStatus.message && (
                  <div
                    data-testid="workstation-dispatch-receipt"
                    className="mt-2 rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-3 py-2 font-mono text-[10px] text-emerald-300"
                  >
                    [{dispatchStatus.timestamp}] {dispatchStatus.message}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>

        {/* ===================================================================
            TAB 2: OMNIROUTE UNIVERSAL API & MCP PLUGIN WORLD
           =================================================================== */}
        <div
          data-testid="panel-omniroute-world"
          className={
            activeTab === "omniroute-world" || activeTab === "unified"
              ? "block space-y-4"
              : "hidden"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-titanium/40 bg-obsidian/50 px-4 py-3">
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-plasma">
                OmniRoute Universal API & MCP Plugin World Topology
              </h3>
              <p className="mt-0.5 text-xs text-ion-2">
                Live node-graph connecting Ingress Gateways, 5 Native GSE
                Stealth-Skeleton Models (86.62/100 Composite Scale),
                Intelligence & RAG Plugins, and Zero-Waste Execution Lanes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[10px]">
              <span className="rounded border border-accent-500/40 bg-accent-950/30 px-2.5 py-1 text-accent-400">
                Ingress: 4 Gateways
              </span>
              <span className="rounded border border-plasma/40 bg-plasma/15 px-2.5 py-1 text-plasma">
                Models: 5 Native (86.62/100)
              </span>
              <span className="rounded border border-emerald-500/40 bg-emerald-950/30 px-2.5 py-1 text-emerald-400">
                Plugins: 6 RAG/Math Nodes
              </span>
              <span className="rounded border border-caution/40 bg-caution/15 px-2.5 py-1 text-caution">
                Zero-Waste Lanes: $0.00
              </span>
            </div>
          </div>

          {/* Interactive SVG Topology Mesh */}
          <div className="overflow-x-auto rounded-2xl border border-titanium/50 bg-obsidian/90 p-4">
            <svg
              viewBox="0 0 1000 430"
              className="h-64 w-full min-w-[720px]"
              aria-label="OmniRoute Universal API topology graph"
            >
              {/* Routing edges from Ingress -> Models -> Plugins -> Lanes */}
              {OMNIROUTE_NODES.filter((n) => n.layer === "INGRESS").flatMap(
                (ing) =>
                  OMNIROUTE_NODES.filter((n) => n.layer === "MODELS").map(
                    (mod) => (
                      <line
                        key={`${ing.id}-${mod.id}`}
                        x1={ing.x + 80}
                        y1={ing.y}
                        x2={mod.x - 70}
                        y2={mod.y}
                        stroke="rgba(56, 189, 248, 0.22)"
                        strokeWidth="1.2"
                      />
                    )
                  )
              )}
              {OMNIROUTE_NODES.filter((n) => n.layer === "MODELS").flatMap(
                (mod) =>
                  OMNIROUTE_NODES.filter((n) => n.layer === "PLUGINS").map(
                    (plg) => (
                      <line
                        key={`${mod.id}-${plg.id}`}
                        x1={mod.x + 80}
                        y1={mod.y}
                        x2={plg.x - 80}
                        y2={plg.y}
                        stroke="rgba(168, 85, 247, 0.22)"
                        strokeWidth="1.2"
                      />
                    )
                  )
              )}
              {OMNIROUTE_NODES.filter((n) => n.layer === "PLUGINS").flatMap(
                (plg) =>
                  OMNIROUTE_NODES.filter((n) => n.layer === "LANES").map(
                    (lane) => (
                      <line
                        key={`${plg.id}-${lane.id}`}
                        x1={plg.x + 85}
                        y1={plg.y}
                        x2={lane.x - 75}
                        y2={lane.y}
                        stroke="rgba(52, 211, 153, 0.25)"
                        strokeWidth="1.4"
                      />
                    )
                  )
              )}

              {/* SVG Node Boxes */}
              {OMNIROUTE_NODES.map((node) => {
                const isSelected = node.id === selectedNode.id;
                const stroke =
                  node.layer === "INGRESS"
                    ? "#38bdf8"
                    : node.layer === "MODELS"
                      ? "#a855f7"
                      : node.layer === "PLUGINS"
                        ? "#34d399"
                        : "#fbbf24";
                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={node.x - 80}
                      y={node.y - 22}
                      width={160}
                      height={44}
                      rx={8}
                      fill={isSelected ? "rgba(15,23,42,0.98)" : "rgba(15,23,42,0.82)"}
                      stroke={stroke}
                      strokeWidth={isSelected ? 2.4 : 1.2}
                    />
                    <text
                      x={node.x}
                      y={node.y - 4}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.label.slice(0, 25)}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 11}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {node.scoreLabel} · {node.costLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 4-Column Layer Cards for Full Accessibility & Inspection */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                ["INGRESS", "Ingress Gateways"],
                ["MODELS", "5 Native GSE Stealth-Skeleton Models"],
                ["PLUGINS", "Intelligence & RAG Plugins"],
                ["LANES", "Zero-Waste Execution Lanes"],
              ] as const
            ).map(([layerKey, layerTitle]) => (
              <div
                key={layerKey}
                className="rounded-2xl border border-titanium/40 bg-obsidian/60 p-3.5"
              >
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-ion-2">
                  {layerTitle}
                </h4>
                <div className="mt-2.5 space-y-2">
                  {OMNIROUTE_NODES.filter((n) => n.layer === layerKey).map(
                    (node) => (
                      <button
                        key={node.id}
                        type="button"
                        data-testid={`omniroute-node-${node.id}`}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={[
                          "w-full rounded-xl border p-2.5 text-left transition-colors",
                          node.id === selectedNode.id
                            ? "border-accent-400 bg-carbon/95"
                            : "border-titanium/30 bg-carbon/60 hover:border-titanium/70",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-bold text-ion-white">
                            {node.label}
                          </span>
                          <span className="rounded bg-obsidian/80 px-1.5 py-0.5 font-mono text-[9px] text-accent-400">
                            {node.scoreLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-ion-2">
                          {node.subtitle}
                        </p>
                        <p className="mt-1 font-mono text-[9px] text-ion-3">
                          {node.protocol} · Cost: {node.costLabel}
                        </p>
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===================================================================
            TAB 3: HERMES BOT HQ BUS & FLEET TELEMETRY (hermes-bot-hq)
           =================================================================== */}
        <div
          data-testid="panel-hermes-bot-hq"
          className={
            activeTab === "hermes-bot-hq" || activeTab === "unified"
              ? "block space-y-4"
              : "hidden"
          }
        >
          {/* 1-Click Broadcast Command Bar */}
          <div className="rounded-2xl border border-emerald-500/40 bg-obsidian/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Hermes Bot HQ Command Deck (hermes-bot-hq) · Inter-Agent Bus
                </h3>
                <p className="mt-0.5 text-xs text-ion-2">
                  Live agent-bus packet stream, active subagent roster, task
                  completion receipts, and 1-click fleet broadcast.
                </p>
              </div>
              <span className="font-mono text-[10px] text-emerald-400">
                Ledger Pin: 47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                data-testid="hermes-broadcast-input"
                aria-label="Hermes Bot HQ fleet broadcast command"
                value={broadcastInput}
                onChange={(e) => setBroadcastInput(e.target.value)}
                className="min-w-[240px] flex-1 rounded-xl border border-titanium/50 bg-carbon/90 px-3 py-2 font-mono text-xs text-ion-white focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="button"
                data-testid="hermes-broadcast-btn"
                onClick={handleBroadcastCommand}
                className="rounded-xl border border-emerald-500/60 bg-emerald-950/60 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300 hover:bg-emerald-900/60"
              >
                Broadcast to All 6 Agents
              </button>
            </div>
          </div>

          {/* Bus Feed + Subagent Roster */}
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            {/* Inter-Agent Message Bus Feed */}
            <div
              data-testid="hermes-agent-bus-feed"
              className="rounded-2xl border border-titanium/40 bg-obsidian/60 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-ion-2">
                  Live Inter-Agent Message Bus Feed (brain/agent-bus)
                </h4>
                <span className="font-mono text-[10px] text-ion-3">
                  {busMessages.length} receipts verified
                </span>
              </div>

              <div className="space-y-2.5">
                {busMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-xl border border-titanium/30 bg-carbon/75 p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
                      <span className="font-bold text-accent-400">
                        {msg.fromAgent} -&gt; {msg.toAgent}
                      </span>
                      <span className="text-ion-3">
                        {msg.timestamp} · Receipt {msg.receiptHash}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[9px]">
                      <span className="rounded bg-obsidian/80 px-1.5 py-0.5 text-plasma">
                        {msg.channel}
                      </span>
                      <span className="rounded bg-emerald-950/40 px-1.5 py-0.5 text-emerald-400">
                        {msg.topic}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-ion-1">{msg.payload}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Subagent Roster & Completion Receipts */}
            <div
              data-testid="hermes-subagent-roster"
              className="rounded-2xl border border-titanium/40 bg-obsidian/60 p-4"
            >
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-ion-2">
                Active Subagent Roster & Task Completion Receipts
              </h4>
              <div className="mt-3 space-y-2">
                {WORKSTATION_PODS.map((pod) => (
                  <div
                    key={pod.id}
                    className="rounded-xl border border-titanium/30 bg-carbon/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-ion-white">
                        {pod.agentName}
                      </span>
                      <span className="font-mono text-[9px] text-emerald-400">
                        {pod.status}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-accent-400">
                      {pod.deskLabel} · {pod.model}
                    </p>
                    <p className="mt-1 text-[11px] text-ion-2">{pod.task}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
