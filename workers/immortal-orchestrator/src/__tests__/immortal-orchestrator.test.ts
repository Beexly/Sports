import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTONOMOUS_FLEET_DEFAULT_NODES,
  ImmortalControlAgent,
  WEEKLY_NFL_LIFECYCLE_PHASES,
  buildJulesSelfHealingDispatch,
  handleImmortalOrchestratorRequest,
  verifyX402UsdcMicropayment,
} from "../index";

describe("workers/immortal-orchestrator", () => {
  it("tracks all 8 autonomous worker nodes (Metamus, Hermes, OpenDots 5173, OpenBot, OpenTag, OpenMuse, Jules, Immortal Cron)", () => {
    const agent = new ImmortalControlAgent();
    assert.equal(agent.listHeartbeats().length, 8);
    assert.equal(AUTONOMOUS_FLEET_DEFAULT_NODES.length, 8);
    assert.equal(WEEKLY_NFL_LIFECYCLE_PHASES.length, 6);
  });

  it("enforces Situational-First sequencing so Stage 3 JEV simulation cannot run before Stage 1-2 Situational Priors", () => {
    const agent = new ImmortalControlAgent();
    const prematureSim = agent.advanceLifecyclePhase("PHASE_3_STAGE_3_JEV_10K_TRAJECTORIES");
    assert.equal(prematureSim.ok, false);
    assert.match(prematureSim.error ?? "", /SITUATIONAL-FIRST violation/);

    assert.equal(agent.advanceLifecyclePhase("PHASE_1_TUESDAY_0400_CT_MASTER_LOCK").ok, true);
    assert.equal(agent.advanceLifecyclePhase("PHASE_2_STAGE_1_2_SITUATIONAL_FIRST").ok, true);
    assert.equal(agent.advanceLifecyclePhase("PHASE_3_STAGE_3_JEV_10K_TRAJECTORIES").ok, true);
    assert.equal(agent.advanceLifecyclePhase("PHASE_4_T90M_INACTIVES_SINKHORN").ok, true);
    assert.equal(agent.advanceLifecyclePhase("PHASE_5_STAGE_4_5_CONFORMAL_AND_GATE").ok, true);
    assert.equal(agent.advanceLifecyclePhase("PHASE_6_POSTGAME_SETTLEMENT_AND_RLHF").ok, true);
  });

  it("enforces x402 Base Mainnet $0.15 USDC micropayment challenge or $499/mo Syndicate Seat key", async () => {
    const challengeRes = await handleImmortalOrchestratorRequest(
      new Request("https://immortal.galaxysportsedge.com/syndicate/feed", { method: "POST" }),
      { SYNDICATE_SEAT_API_KEY: "seat_secret_499" }
    );
    assert.equal(challengeRes.status, 402);
    const body = (await challengeRes.json()) as { network: string; amount_usdc: string };
    assert.equal(body.network, "eip155:8453");
    assert.equal(body.amount_usdc, "0.15");

    const usdcCheck = verifyX402UsdcMicropayment({
      x402ReceiptHeader: "0x" + "a".repeat(64),
    });
    assert.equal(usdcCheck.authorized, true);
    assert.equal(usdcCheck.mode, "X402_USDC_MICROPAYMENT");
  });

  it("builds Google Jules v1alpha autonomous self-healing dispatch payloads", () => {
    const dispatch = buildJulesSelfHealingDispatch({
      failingCheck: "trust-gate",
      branch: "main",
      diagnosticSummary: "Sample diagnostic",
    });
    assert.equal(dispatch.endpoint, "https://jules.googleapis.com/v1alpha/sessions");
    assert.equal(dispatch.payload.automationMode, "AUTO_CREATE_PR");
  });
});
