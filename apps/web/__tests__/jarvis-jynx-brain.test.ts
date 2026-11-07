import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OUR_STEALTH_SKELETON_MODELS,
  JARVIS_JYNX_BRAIN_MODES,
  runJarvisJynxAutonomousBrain,
  type JarvisJynxBrainMode,
} from "@/lib/jarvis/stealth-skeleton-brain";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "admin-1", email: "garrett@galaxysportsedge.com", role: "ADMIN" },
  }),
}));

import { GET, POST } from "@/app/api/cockpit/jarvis/jynx-brain/route";
import {
  buildPostHogAiGenerationEvent,
  DEFAULT_POSTHOG_GOVERNOR_CONFIG,
} from "@/lib/observability/posthog-grant-governor";
import {
  REGISTERED_BOT_SDK_ADAPTERS,
  executeUniversalBotSdkAdapter,
} from "@/lib/jarvis/autonomous-bot-sdk-adapter";
import {
  GET as GET_BOT_SDK,
  POST as POST_BOT_SDK,
} from "@/app/api/cockpit/jarvis/bot-sdk-adapter/route";
import { askJarvis, JARVIS_INTENT_ORDER, JARVIS_QUESTIONS } from "@/lib/cockpit/ask-jarvis";
import type { OwnerSummary } from "@/lib/cockpit/owner-summary";

const webRoot = resolve(__dirname, "..");

describe("Jarvis x Jynx Autonomous Brain (stealth-skeleton-brain.ts)", () => {
  it("registers all 5 OUR_STEALTH_SKELETON_MODELS", () => {
    expect(OUR_STEALTH_SKELETON_MODELS).toEqual([
      "gse/skeleton-stealth",
      "gse/skeleton-council",
      "gse/skeleton-forecast",
      "gse/skeleton-math-pro",
      "gse/skeleton-flash",
    ]);
  });

  it("synthesizes autonomous output with OUR MODEL default, dynamic composite score, official 47-19-1 ledger, standing roster ruling, and zero Nov 1 pulled plays or leaked picks", () => {
    const res = runJarvisJynxAutonomousBrain({
      prompt: "Run full autonomous GSE website synthesis",
    });

    expect(res.modelUsed).toBe("gse/skeleton-stealth");
    expect(res.jynxRoutingLane).toContain("stealth_skeleton");
    expect(res.compositeScaleScore).toMatch(/^\d+\.\d{2}\/100$/);
    expect(res.seasonLedger).toBe("36-13-1 (73.5%) · +20.14u Verified | All-in 47-19-1 (+24.92u)");
    expect(res.standingRosterRuling).toMatchObject({
      genoSmith: "NYJ QB",
      mikeEvans: "SF WR",
    });
    expect(res.corpusTelemetry.equationsCount).toBe(12304);
    expect(res.corpusTelemetry.graduateBooksCount).toBe(25);
    expect(res.corpusTelemetry.graduateBookRange).toBe("BK-01..BK-25");
    expect(res.corpusTelemetry.uniquePdfsCount).toBe(257);
    expect(res.corpusTelemetry.motifDossiersCount).toBe(81);
    expect(res.corpusTelemetry.socialPostsCount).toEqual({ ig: 132, x: 100 });

    // Never cite voided Nov 5 batch or Nov 1 pulled plays / leaked picks
    const voidedBatch = ["62", "23", "1"].join("-");
    const pulledSpread = ["NYJ", "-1.5"].join(" ");
    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain(voidedBatch);
    expect(serialized).not.toContain("NYJ ML");
    expect(serialized).not.toContain(pulledSpread);
    expect(serialized).not.toContain("NYJ −1.5");
    expect(serialized).not.toContain("Chris Godwin");
    expect(serialized).not.toContain("Jets ($3,100)");
    expect(res.contentPack.xPost).not.toContain("Mark Andrews");
    expect(res.contentPack.chalkboardReelScript).not.toContain("Mark Andrews");
    expect(serialized).toContain("47-19-1");
    expect(serialized).toContain("Geno Smith");
    expect(serialized).toContain("NYJ QB");
    expect(serialized).toContain("Mike Evans");
    expect(serialized).toContain("SF WR");
  });

  it("supports all 5 modes and custom gse/skeleton-* models", () => {
    const modes: JarvisJynxBrainMode[] = [
      "content_making",
      "dfs_picking",
      "bet_predicting",
      "corpus_and_gsi",
      "autonomous_all",
    ];
    expect(JARVIS_JYNX_BRAIN_MODES.map((m) => m.id)).toEqual(modes);

    for (const mode of modes) {
      const out = runJarvisJynxAutonomousBrain({
        prompt: `Test ${mode}`,
        mode,
        model: "gse/skeleton-math-pro",
      });
      expect(out.modeUsed).toBe(mode);
      expect(out.modelUsed).toBe("gse/skeleton-math-pro");
      expect(out.contentPack.xPost.length).toBeGreaterThan(20);
      expect(out.dfsLineupCard.corePlays.length).toBeGreaterThan(0);
      expect(out.betPredictionCard.gatedGameCalls.length).toBeGreaterThan(0);
      expect(out.gsiBiomechanicsOverlay.returnToPlayDegradationNotes.length).toBeGreaterThan(0);
      expect(out.posthogAiObservability?.event).toBe("$ai_generation");
      expect(out.posthogAiObservability?.properties.$ai_model).toBe("gse/skeleton-math-pro");
      expect(out.posthogAiObservability?.properties.gse_posthog_project_id).toBe("516325");
      expect(out.posthogAiObservability?.properties.gse_grant_credit_usd).toBe(50000);
    }
  });

  it("emits governed PostHog $ai_generation LLM observability telemetry under the $50k startup grant governor", () => {
    const evt = buildPostHogAiGenerationEvent({
      traceId: "trc_nim_01",
      model: "gse/skeleton-stealth",
      inputTokens: 128,
      outputTokens: 256,
      latencySeconds: 0.185,
      timeToFirstTokenSeconds: 0.045,
      interTokenLatencyMs: 0.549,
      deterministicHashFraction: 0.04,
    });
    expect(evt.event).toBe("$ai_generation");
    expect(evt.properties.$ai_model).toBe("gse/skeleton-stealth");
    expect(evt.properties.$ai_input_tokens).toBe(128);
    expect(evt.properties.$ai_output_tokens).toBe(256);
    expect(evt.properties.$ai_time_to_first_token).toBeCloseTo(0.045, 5);
    expect(evt.properties.$ai_inter_token_latency_ms).toBeCloseTo(0.549, 4);
    expect(evt.properties.gse_posthog_project_id).toBe(DEFAULT_POSTHOG_GOVERNOR_CONFIG.projectId);
    expect(evt.properties.gse_governor_reason).toBe("SAMPLED_IN");
  });
});

describe("/api/cockpit/jarvis/jynx-brain route", () => {
  it("GET returns 200 OK with Cache-Control: no-store and registered models", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const body = await res.json();
    expect(body.status).toBe("ONLINE");
    expect(body.defaultModel).toBe("gse/skeleton-stealth");
    expect(body.models).toEqual(OUR_STEALTH_SKELETON_MODELS);
    expect(body.seasonLedger).toBe("36-13-1 (73.5%) · +20.14u Verified | All-in 47-19-1 (+24.92u)");
    expect(body.standingRosterRuling).toMatchObject({
      genoSmith: "NYJ QB",
      mikeEvans: "SF WR",
    });
    expect(body.briefing.compositeScaleScore).toMatch(/^\d+\.\d{2}\/100$/);
  });

  it("POST runs runJarvisJynxAutonomousBrain and returns 200 OK JSON", async () => {
    const req = new Request("http://localhost/api/cockpit/jarvis/jynx-brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Build DFS cash core and 360 prop card",
        mode: "dfs_picking",
        model: "gse/skeleton-council",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const body = await res.json();
    expect(body.modelUsed).toBe("gse/skeleton-council");
    expect(body.modeUsed).toBe("dfs_picking");
    expect(body.seasonLedger).toBe("36-13-1 (73.5%) · +20.14u Verified | All-in 47-19-1 (+24.92u)");
    expect(body.dfsLineupCard.corePlays.length).toBeGreaterThan(0);
  });
});

describe("AskJarvisPanel UI & Guardrail Compliance", () => {
  const panelPath = resolve(webRoot, "components/cockpit/ask-jarvis-panel.tsx");
  const panelSrc = readFileSync(panelPath, "utf8");

  it("preserves deterministic intent buttons and answer container", () => {
    expect(panelSrc).toContain('data-testid={`ask-jarvis-btn-${intent}`}');
    expect(panelSrc).toContain('data-testid="ask-jarvis-answer"');
  });

  it("includes Jarvis x Jynx Autonomous Model Console and /api/cockpit/jarvis/jynx-brain sync", () => {
    expect(panelSrc).toContain('data-testid="jarvis-jynx-autonomous-console"');
    expect(panelSrc).toContain('data-testid="jarvis-jynx-model-select"');
    expect(panelSrc).toContain("Run Our Model");
    expect(panelSrc).toContain("/api/cockpit/jarvis/jynx-brain");
  });

  it("contains zero em-dashes, zero en-dashes, and zero percent symbols", () => {
    expect(panelSrc).not.toMatch(/[\u2014\u2013]/);
    expect(panelSrc).not.toContain("%");
  });

  it("executes all deterministic askJarvis intents cleanly alongside the autonomous brain", () => {
    const mockSummary: OwnerSummary = {
      overallColor: "GREEN",
      oneLiner: "Platform operational and ready.",
      picks: {
        today: 8,
        isPublicGateOpen: true,
        publicReadyCount: 8,
        blockedReason: null,
        canonicalPending: 4,
        canonicalSettled: 100,
        bootstrapExcluded: 10,
        totalInSystem: 114,
        publicReadinessExplanation: "8 picks live on the public board.",
      },
      performance: {
        targetPct: 70,
        actualWinRate: 0.579,
        canonicalSampleSize: 100,
        minimumRequired: 25,
        remainingToThreshold: 0,
        isGateOpen: true,
        displaySafe: true,
        gateBlockers: [],
        smallSampleWarning: false,
        record: "55-40-5",
      },
      departments: [
        {
          id: "data-reliability",
          name: "Data & Ingestion",
          agentKey: "SCOUT",
          agentDisplayName: "Scout",
          status: "GREEN",
          oneLiner: "Ingestion healthy",
          actionRequired: false,
          actionDescription: null,
          agentMode: "DRAFT_ONLY",
          drilldownHref: "/cockpit/health",
        },
        {
          id: "settlement-results",
          name: "Settlement & Results",
          agentKey: "TAL",
          agentDisplayName: "Tal",
          status: "GREEN",
          oneLiner: "Settlement healthy",
          actionRequired: false,
          actionDescription: null,
          agentMode: "DRAFT_ONLY",
          drilldownHref: "/cockpit/history",
        },
      ],
      decisions: [],
      criticalWarnings: [],
      advisoryWarnings: [],
      aiOps: {
        available: false,
        reason: "AI Ops telemetry is not yet instrumented.",
        modelLanePolicy: ["Sonnet: primary", "Opus: deep review", "Haiku: fast classification", "Codex: code verification"],
        toInstrumentNext: ["Token spend per run"],
        ccusageNote: "Use ccusage locally.",
        errorTracking: "Sentry not configured.",
      },
      assessedAt: "2026-11-06T12:00:00Z",
      jarvisVersion: "1.0.0",
    };

    for (const intent of JARVIS_INTENT_ORDER) {
      const ans = askJarvis(intent, mockSummary);
      expect(ans.intent).toBe(intent);
      expect(ans.question).toBe(JARVIS_QUESTIONS[intent]);
      expect(ans.answer.length).toBeGreaterThan(0);
    }
  });
});

describe("Universal Autonomous Bot SDK Adapter (OpenMuse, OpenDots, CopilotKit, Antigravity x Hermes, OpenAI-Compat)", () => {
  it("supports all 5 autonomous bot SDK protocols powered by OUR MODEL (gse/skeleton-*)", () => {
    expect(REGISTERED_BOT_SDK_ADAPTERS.map((p) => p.protocol)).toEqual([
      "openmuse-v1",
      "opendots-v1",
      "copilotkit-v1",
      "antigravity-hermes-v1",
      "openai-compat-v1",
    ]);

    for (const proto of REGISTERED_BOT_SDK_ADAPTERS) {
      const envelope = executeUniversalBotSdkAdapter({
        protocol: proto.protocol,
        prompt: `Test ${proto.displayName}`,
        mode: "autonomous_all",
        model: "gse/skeleton-stealth",
      });
      expect(envelope.ok).toBe(true);
      expect(envelope.protocol).toBe(proto.protocol);
      expect(envelope.ourModelUsed).toBe("gse/skeleton-stealth");
      expect(envelope.compositeScaleScore).toMatch(/^\d+\.\d{2}\/100$/);
      expect(envelope.seasonLedgerOfRecord).toBe("36-13-1 (73.5%) · +20.14u Verified | All-in 47-19-1 (+24.92u)");
      expect(envelope.standingRosterRuling).toMatchObject({
        genoSmith: "NYJ QB",
        mikeEvans: "SF WR",
      });
      expect(envelope.brainOutput.answer.length).toBeGreaterThan(20);
    }
  });

  it("GET and POST /api/cockpit/jarvis/bot-sdk-adapter return 200 OK", async () => {
    const getRes = await GET_BOT_SDK();
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.registeredProtocols).toHaveLength(5);

    const postReq = new Request("http://localhost/api/cockpit/jarvis/bot-sdk-adapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        protocol: "copilotkit-v1",
        prompt: "Synthesize Friday slate pack",
        mode: "content_making",
      }),
    });
    const postRes = await POST_BOT_SDK(postReq);
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    expect(postBody.protocol).toBe("copilotkit-v1");
    expect(postBody.protocolEnvelope.coagent_state).toBe("SYNCHRONIZED");
  });
});
