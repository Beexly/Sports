import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "admin-1",
      email: "garrett@galaxysportsedge.com",
      role: "ADMIN",
    },
  }),
}));

import { POST } from "@/app/api/cockpit/jarvis/jynx-brain/route";

const webRoot = resolve(__dirname, "..");

describe("Cockpit 3D Agent Office (office-3d), Hermes Bot HQ & OmniRoute API World", () => {
  const componentPath = resolve(
    webRoot,
    "components/cockpit/cockpit-office-3d-bot-hq.tsx"
  );
  const botHqPagePath = resolve(webRoot, "app/cockpit/bot-hq/page.tsx");
  const cockpitPagePath = resolve(webRoot, "app/cockpit/page.tsx");

  const componentSrc = readFileSync(componentPath, "utf8");
  const botHqPageSrc = readFileSync(botHqPagePath, "utf8");
  const cockpitPageSrc = readFileSync(cockpitPagePath, "utf8");

  it("provides the 3 interactive view tabs inside data-testid='cockpit-office-3d-bot-hq'", () => {
    expect(componentSrc).toContain('"use client"');
    expect(componentSrc).toContain('data-testid="cockpit-office-3d-bot-hq"');
    expect(componentSrc).toContain("3D Isometric Agent Office (office-3d)");
    expect(componentSrc).toContain("OmniRoute Universal API & MCP Plugin World");
    expect(componentSrc).toContain(
      "Hermes Bot HQ Bus & Fleet Telemetry (hermes-bot-hq)"
    );
    expect(componentSrc).toContain('transformStyle: "preserve-3d"');
  });

  it("includes all 6 Workstation Pods with exact models, statuses, and tasks", () => {
    const requiredWorkstations = [
      {
        desk: "HQ Core Desk",
        agent: "Jarvis x Jynx Orchestrator",
        model: "gse/skeleton-stealth",
        status: "ACTIVE_ROUTING",
        task: "Coordinating 5-stage NFL Week 9 slate, DFS core, and live Cockpit commands",
      },
      {
        desk: "Film & Simulation Desk",
        agent: "Motif & JEV Snap Simulator",
        model: "gse/skeleton-forecast",
        status: "SIMULATING",
        task: "Running 10,000-world situational trajectories & 81 Motif pull-master dossiers",
      },
      {
        desk: "Math & Conformal Desk",
        agent: "Argon Deep Research & Council",
        model: "gse/skeleton-math-pro & gse/skeleton-council",
        status: "PROVING",
        task: "12,304 equations + 25 graduate books (BK-01..BK-25) + Sinkhorn-Knopp L1=2.66e-7",
      },
      {
        desk: "Sports Medicine Bay",
        agent: "GSI Biomechanics & Trauma Agent",
        model: "gse/skeleton-stealth",
        status: "MONITORING_INJURIES",
        task: "Tracking RTP high-ankle/hamstring curves & 4Q trench contact load; Geno Smith (NYJ), Mike Evans (SF)",
      },
      {
        desk: "Trading & DFS Floor",
        agent: "360 Market & Optimal Lineup Agent",
        model: "gse/skeleton-forecast",
        status: "GRADING_BOARD",
        task: "Season Ledger 47-19-1 (+24.92u) | Base 38-13-1 (+22.85u) · 14-player DFS Core Pool locked",
      },
      {
        desk: "Creative Studio Desk",
        agent: "Muse Autonomous Content & Video Agent",
        model: "gse/skeleton-flash",
        status: "RENDERING",
        task: "Generating Week 9 Friday X cards, IG slides, and QB progression chalkboard reels",
      },
    ];

    for (const ws of requiredWorkstations) {
      expect(componentSrc).toContain(ws.desk);
      expect(componentSrc).toContain(ws.agent);
      expect(componentSrc).toContain(ws.model);
      expect(componentSrc).toContain(ws.status);
      expect(componentSrc).toContain(ws.task);
    }
  });

  it("includes the Live Agent Workstation Inspector Drawer and dispatches tasks to /api/cockpit/jarvis/jynx-brain", async () => {
    expect(componentSrc).toContain(
      'data-testid="agent-workstation-inspector-drawer"'
    );
    expect(componentSrc).toContain("Dispatch Task to Agent");
    expect(componentSrc).toContain("/api/cockpit/jarvis/jynx-brain");

    const req = new Request("http://localhost/api/cockpit/jarvis/jynx-brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt:
          "[Math & Conformal Desk · Argon Deep Research & Council] Verify 12,304 equations + Sinkhorn-Knopp L1=2.66e-7",
        model: "gse/skeleton-math-pro",
        mode: "corpus_and_gsi",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.modelUsed).toBe("gse/skeleton-math-pro");
    expect(body.seasonLedger).toBe(
      "47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)"
    );
  });

  it("visualizes the OmniRoute Universal API & MCP Plugin World mesh", () => {
    const expectedMeshNodes = [
      "Cockpit UI",
      "/api/cockpit/jarvis/jynx-brain",
      "OpenRouter Provider (/v1/chat/completions)",
      "OpenRouter MCP Server (/mcp JSON-RPC 2.0)",
      "gse/skeleton-stealth",
      "gse/skeleton-council",
      "gse/skeleton-forecast",
      "gse/skeleton-math-pro",
      "gse/skeleton-flash",
      "86.12/100",
      "PageIndex Vectorless Tree RAG (10/10 Recall)",
      "Gitingest Repo Digest",
      "12,304-Equation MCP Router",
      "Sinkhorn-Knopp Optimal Transport",
      "Romano CQR Calibration",
      "GSI Biomechanics Engine",
      "Free Workhorse Lane ($0.00)",
      "Local Vectorized Engine ($0.00)",
      "Multi-Cloud Failover (Bedrock -> Azure -> Vertex)",
    ];

    for (const item of expectedMeshNodes) {
      expect(componentSrc).toContain(item);
    }
  });

  it("includes Hermes Bot HQ Bus & Fleet Telemetry (hermes-bot-hq) and /cockpit/bot-hq full-screen page", () => {
    expect(componentSrc).toContain('data-testid="hermes-agent-bus-feed"');
    expect(componentSrc).toContain('data-testid="hermes-subagent-roster"');
    expect(componentSrc).toContain('data-testid="hermes-broadcast-btn"');
    expect(botHqPageSrc).toContain("<CockpitOffice3dBotHq fullScreen />");
    expect(cockpitPageSrc).toContain("<CockpitOffice3dBotHq />");
  });

  it("strictly passes all guardrail rules: zero em/en-dashes, zero percent symbols, official 47-19-1 ledger, and NYJ/SF roster truth", () => {
    expect(componentSrc).not.toMatch(/[\u2014\u2013]/);
    expect(botHqPageSrc).not.toMatch(/[\u2014\u2013]/);
    expect(componentSrc).not.toContain("%");
    expect(botHqPageSrc).not.toContain("%");
    expect(componentSrc).not.toContain("47-19-1");
    expect(botHqPageSrc).not.toContain("47-19-1");
    expect(componentSrc).toContain(
      "47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)"
    );
    expect(componentSrc).toContain("Geno Smith = NYJ QB");
    expect(componentSrc).toContain("Mike Evans = SF WR");
  });
});
