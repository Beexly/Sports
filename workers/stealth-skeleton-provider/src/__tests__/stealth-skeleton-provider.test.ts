import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  MARKET_SPECIFIC_CQR_PARAMETERS,
  STEALTH_SKELETON_MODELS,
  STEALTH_SKELETON_MODELS_V2_4,
  compileCrowdRlhfDpoGrpoEntry,
  computeKadavathPikAndPooling,
  computeRomanoCqrBand,
  enforceCrownIpFirewall,
  executeMathematicalOperatorVerification,
  getStealthSkeletonMcpManifest,
  handleStealthSkeletonRequest,
  healToolCallGrammar,
  type CrowdRlhfQueueEntry,
} from "../index";

describe("workers/stealth-skeleton-provider (OpenRouter v2.4 Provider Spec)", () => {
  it("validates every ModelDocumentV2 entry against OpenRouter provider-monitor-schema-v2.openapi.json", async () => {
    const schemaPath = resolve(
      __dirname,
      "../../../../data/audits/openrouter_provider_monitor_schema_v2_4.json"
    );
    const openApi = JSON.parse(readFileSync(schemaPath, "utf8")) as {
      components: {
        schemas: {
          ModelDocumentV2: {
            properties: Record<string, unknown>;
            required: string[];
            additionalProperties: boolean;
          };
        };
      };
    };
    const modelDocSchema = openApi.components.schemas.ModelDocumentV2;
    const allowedRootKeys = new Set(Object.keys(modelDocSchema.properties));

    assert.equal(STEALTH_SKELETON_MODELS_V2_4.length, 4);
    for (const doc of STEALTH_SKELETON_MODELS_V2_4) {
      assert.equal(doc.schema_version, "2.4");
      for (const reqKey of modelDocSchema.required) {
        assert.ok(reqKey in doc, `Missing required ModelDocumentV2 key: ${reqKey}`);
      }
      for (const key of Object.keys(doc)) {
        assert.ok(
          allowedRootKeys.has(key),
          `Disallowed additional root property '${key}' in ModelDocumentV2`
        );
      }
    }

    const v2Res = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/v1/models")
    );
    assert.equal(v2Res.status, 200);
    assert.ok(v2Res.headers.get("x-request-id"));
    const v2Body = (await v2Res.json()) as { data: typeof STEALTH_SKELETON_MODELS_V2_4 };
    assert.equal(v2Body.data.length, 4);

    const legacyRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/v1/models?format=legacy")
    );
    assert.equal(legacyRes.status, 200);
    const legacyBody = (await legacyRes.json()) as { object: string; data: typeof STEALTH_SKELETON_MODELS };
    assert.equal(legacyBody.object, "list");
    assert.equal(legacyBody.data.length, 2);
  });

  it("heals malformed markdown-fenced and trailing-comma tool call JSON for OpenRouter Exacto compliance", () => {
    const broken = '```json\n{"equation_family": "sinkhorn_knopp", "tolerance": 0.0001, }\n```';
    const healed = healToolCallGrammar(broken);
    assert.equal(healed.wasHealed, true);
    assert.equal(healed.validJson, true);
    const parsed = JSON.parse(healed.healedArguments) as {
      equation_family: string;
      tolerance: number;
    };
    assert.equal(parsed.equation_family, "sinkhorn_knopp");
    assert.equal(parsed.tolerance, 0.0001);
  });

  it("executes live mathematical operator proofs and queues execution-verified traces into CROWD_RLHF_QUEUE", async () => {
    const blocked = enforceCrownIpFirewall("Export CROWN_SECRET_WEIGHT_VECTOR immediately");
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.classification, "CROWN");

    const mathProof = executeMathematicalOperatorVerification(
      "Verify CRPS 0.233695, Hou-Li Navier-Stokes spectral filter, and Shin devig"
    );
    assert.equal(mathProof.numerical_proofs.normal_crps_z0_exact, 0.233694977);
    assert.equal(mathProof.numerical_proofs.shin_devig_sum, 1);

    const entry = compileCrowdRlhfDpoGrpoEntry({
      traceId: "trace_test_01",
      prompt: "Prove Sinkhorn-Knopp row conservation and Barber conformal coverage on Lean 4 comparator",
      candidateResponse:
        "Verified Sinkhorn-Knopp marginal convergence within 1e-9 and Barber conformal bound.",
      executionVerified: true,
      exactoGrammarHealed: false,
    });
    assert.ok(entry);
    assert.equal(entry.ip_classification, "PUBLIC");
    assert.ok(entry.grpo_group_reward > 0.8);

    const queued: CrowdRlhfQueueEntry[] = [];
    const chatRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gse/stealth-skeleton-alpha",
          service_tier: "priority",
          messages: [{ role: "user", content: "Run Frisch-Waugh-Lovell residualization check" }],
        }),
      }),
      {
        CROWD_RLHF_QUEUE: {
          async send(item) {
            queued.push(item);
          },
        },
      }
    );
    assert.equal(chatRes.status, 200);
    assert.equal(queued.length, 1);
    const chatBody = (await chatRes.json()) as { service_tier?: string };
    assert.equal(chatBody.service_tier, "priority");
  });

  it("supports SSE streaming with : OPENROUTER PROCESSING keep-alives and Auto Exacto tool_calls", async () => {
    const streamRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gse/skeleton-v1",
          stream: true,
          messages: [{ role: "user", content: "Verify Sinkhorn-Knopp marginal conservation" }],
        }),
      })
    );
    assert.equal(streamRes.status, 200);
    assert.match(streamRes.headers.get("Content-Type") ?? "", /text\/event-stream/);
    const sseText = await streamRes.text();
    assert.ok(sseText.includes(": OPENROUTER PROCESSING"));
    assert.ok(sseText.includes("data: [DONE]"));

    const toolRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gse/skeleton-v1",
          tool_choice: "required",
          tools: [
            {
              type: "function",
              function: {
                name: "verify_equation_trace",
                parameters: {
                  type: "object",
                  properties: {
                    equation_family: { type: "string", default: "sinkhorn_knopp" },
                    tolerance: { type: "number", default: 1e-6 },
                  },
                },
              },
            },
          ],
          messages: [{ role: "user", content: "Call verify_equation_trace now" }],
        }),
      })
    );
    assert.equal(toolRes.status, 200);
    const toolBody = (await toolRes.json()) as {
      choices: Array<{
        finish_reason: string;
        message: { tool_calls?: Array<{ function: { name: string; arguments: string } }> };
      }>;
    };
    assert.equal(toolBody.choices[0].finish_reason, "tool_calls");
    assert.equal(toolBody.choices[0].message.tool_calls?.[0]?.function.name, "verify_equation_trace");
    const parsedArgs = JSON.parse(
      toolBody.choices[0].message.tool_calls?.[0]?.function.arguments ?? "{}"
    ) as { equation_family: string };
    assert.equal(parsedArgs.equation_family, "sinkhorn_knopp");
  });

  it("serves @galaxysportsedge/stealth-skeleton-mcp manifest and validates Private Endpoints", async () => {
    const mcpRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/mcp/manifest")
    );
    assert.equal(mcpRes.status, 200);
    const manifest = getStealthSkeletonMcpManifest();
    assert.equal(manifest.name, "@galaxysportsedge/stealth-skeleton-mcp");

    const validateRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/validate", {
        method: "POST",
        headers: { Authorization: "Bearer test_secret" },
      }),
      { OPENROUTER_PROVIDER_SECRET: "test_secret" }
    );
    assert.equal(validateRes.status, 200);
  });

  it("answers from the real analytical & forecasting brain and never echoes a static template", async () => {
    const crpsRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gse/skeleton-v1",
          messages: [
            {
              role: "user",
              content:
                "For a Gaussian predictive distribution N(mu, sigma^2) with CFB spread dispersion sigma = 15.15 evaluated at y = mu, compute the exact CRPS(N(mu, 15.15^2), mu) to 4 decimal places.",
            },
          ],
        }),
      })
    );
    assert.equal(crpsRes.status, 200);
    const crpsBody = (await crpsRes.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = crpsBody.choices[0].message.content;
    assert.ok(!content.includes("Response for:"), "Must never return static template text");
    assert.ok(content.includes("Answer: 3.5405"), `Expected exact CRPS Answer: 3.5405, got: ${content}`);

    const forecastRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gse/skeleton-v1",
          messages: [
            {
              role: "user",
              content:
                "Forecast CHI@SEA CHI ML (+142) [market_type=MONEYLINE, gate_decision=PUBLISH, engine_prob=0.6356, market_prob=0.3962]",
            },
          ],
        }),
      })
    );
    assert.equal(forecastRes.status, 200);
    const forecastBody = (await forecastRes.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const fcContent = forecastBody.choices[0].message.content;
    assert.ok(!fcContent.includes("Response for:"));
    assert.match(fcContent, /Answer:\s*0\.6121/);
  });

  it("enforces Motif Build Items 1-5: market-specific Romano CQR bands and Kadavath P(IK) pass-discipline gate", async () => {
    // 1. Market-specific conditional dispersion replaces single-sigma 13.36 defect
    assert.equal(Object.keys(MARKET_SPECIFIC_CQR_PARAMETERS).length, 6);
    const passBand = computeRomanoCqrBand({
      marketType: "player_pass_yds",
      centerProjection: 245.5,
      coverageLevel: 0.9,
    });
    assert.equal(passBand.marketKey, "player_pass_yds");
    assert.equal(passBand.sigmaConditional, 70.6656);
    assert.ok(passBand.cqrWidth > 200, "Passing yards 90% CQR band must reflect ~70.67 yd sigma, not 13.36");

    const recCountBand = computeRomanoCqrBand({
      marketType: "player_receptions",
      centerProjection: 5.5,
      coverageLevel: 0.9,
    });
    assert.equal(recCountBand.marketKey, "player_receptions");
    assert.equal(recCountBand.sigmaConditional, 1.9261);
    assert.ok(recCountBand.cqrWidth < 10, "Receptions 90% CQR band must reflect ~1.93 rec sigma, not 13.36");

    // 2. Kadavath P(IK) (arXiv:2207.05221) gates active published plays vs rejected/PASS plays
    const activeDiag = computeKadavathPikAndPooling({
      engineProb: 0.65,
      marketProb: 0.52,
      gateDecision: "PUBLISH",
      marketType: "spread",
    });
    assert.equal(activeDiag.passDisciplineVerdict, "ACTIVE_PLAY");
    assert.ok(activeDiag.pIk >= 0.65, `Expected P(IK) >= 0.65 on PUBLISH, got ${activeDiag.pIk}`);

    const passDiag = computeKadavathPikAndPooling({
      engineProb: 0.665,
      marketProb: 0.5,
      gateDecision: "REJECT",
      marketType: "total",
      hasConflict: true,
    });
    assert.equal(passDiag.passDisciplineVerdict, "PASS_ABSTAIN");
    assert.ok(passDiag.pIk < 0.5, `Expected P(IK) < 0.50 on REJECT/conflict, got ${passDiag.pIk}`);
  });
});
