import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  MARKET_SPECIFIC_CQR_PARAMETERS,
  STEALTH_SKELETON_MODELS,
  STEALTH_SKELETON_MODELS_V2_4,
  buildPageIndexDocumentTree,
  compileCrowdRlhfDpoGrpoEntry,
  computeAiaForecasterEnsemble,
  computeHybridRrfScore,
  computeKadavathPikAndPooling,
  computeRomanoCqrBand,
  computeSignBalanceAdvantage,
  computeTtpoMajorityVoteAsymmetry,
  enforceCrownIpFirewall,
  ensureW3cTraceparent,
  evaluatePostTrainBenchCritic,
  evaluateRrsiPromotionGate,
  evaluateSiaCoEvolutionStep,
  evaluateUpstreamMaasLicenseGate,
  executeMathematicalOperatorVerification,
  executeRealSinkhornKnoppMarginalAudit,
  getStealthSkeletonMcpManifest,
  handleStealthSkeletonRequest,
  healToolCallGrammar,
  reasonOverPageIndexTree,
  redactGdprPiiFromPrompt,
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

    assert.equal(STEALTH_SKELETON_MODELS_V2_4.length, 5);
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
    assert.ok(v2Res.headers.get("traceparent"));
    const v2Body = (await v2Res.json()) as { data: typeof STEALTH_SKELETON_MODELS_V2_4 };
    assert.equal(v2Body.data.length, 5);

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

  it("enforces Continual-Learning Flywheel & Frontier Mechanisms: RRSI promotion gate, SIA harness+LoRA co-evolution, TTPO majority-vote asymmetry, and AIA Forecaster search-ablation guard", () => {
    // 1. Google Research RRSI promotion gate: leakage critic + noise-adjusted score floor + cost rule
    const promoted = evaluateRrsiPromotionGate({
      championScore: 0.742,
      candidateScore: 0.802,
      sampleSize: 200,
      championCostUsd: 0.012,
      candidateCostUsd: 0.013,
      hasEvalLeakage: false,
      preEventTimestampVerified: true,
    });
    assert.equal(promoted.promoted, true);
    assert.equal(promoted.leakageCriticPassed, true);
    assert.ok(promoted.noiseAdjustedGain > 0);

    const leaked = evaluateRrsiPromotionGate({
      championScore: 0.742,
      candidateScore: 0.95,
      sampleSize: 200,
      championCostUsd: 0.012,
      candidateCostUsd: 0.012,
      hasEvalLeakage: true,
      preEventTimestampVerified: true,
    });
    assert.equal(leaked.promoted, false);
    assert.equal(leaked.rejectionReason, "LEAKAGE_CRITIC_VETO");

    // 2. Hexo Labs SIA harness + LoRA co-evolution state tuple
    const siaState = evaluateSiaCoEvolutionStep({
      harnessConfigId: "pot-sympy-jev-v3",
      loraRank: 32,
      loraAlpha: 64,
      gpqaBaselineAcc: 0.5,
      gpqaCandidateAcc: 0.65,
    });
    assert.equal(siaState.accepted, true);
    assert.equal(siaState.effectiveScaling, 2.0);

    // 3. TTPO label-free test-time training via majority-vote asymmetry
    const ttpoHigh = computeTtpoMajorityVoteAsymmetry(["B", "B", "B", "B", "C"]);
    assert.equal(ttpoHigh.majorityAnswer, "B");
    assert.equal(ttpoHigh.consensusRatio, 0.8);
    assert.equal(ttpoHigh.trainingAction, "DPO_PREFERENCE_PAIR");

    const ttpoLow = computeTtpoMajorityVoteAsymmetry(["A", "B", "C", "D"]);
    assert.equal(ttpoLow.trainingAction, "ABSTAIN_NOISY_ROLLOUT");

    // 4. Bridgewater AIA Forecaster: multi-forecaster ensemble + supervisor + Platt calibration + search-ablation warning
    const aiaWithSearch = computeAiaForecasterEnsemble({
      forecasterProbs: [0.68, 0.72, 0.7],
      supervisorProb: 0.71,
      marketFreezePrior: 0.62,
      searchContextPresent: true,
    });
    assert.equal(aiaWithSearch.searchAblationWarning, false);
    assert.ok(aiaWithSearch.calibratedProb > 0.62 && aiaWithSearch.calibratedProb < 0.85);

    const aiaNoSearch = computeAiaForecasterEnsemble({
      forecasterProbs: [0.68, 0.72, 0.7],
      supervisorProb: 0.71,
      marketFreezePrior: 0.62,
      searchContextPresent: false,
    });
    assert.equal(aiaNoSearch.searchAblationWarning, true);
  });

  it("executes real iterative Sinkhorn-Knopp scaling (no hardcoded 1.0e-12), PageIndex vectorless tree RAG, PostTrainBench critic, SignBalance GRPO, and 3-way MaaS license gate", async () => {
    const sinkhorn = executeRealSinkhornKnoppMarginalAudit(40, 0.15);
    assert.equal(sinkhorn.converged, true);
    assert.ok(sinkhorn.l1MarginalResidual > 0 && sinkhorn.l1MarginalResidual < 1e-6);
    assert.notEqual(sinkhorn.lInfMarginalResidual, 1.0e-12);

    // Verify 15,969-row CQR q_hat_90 constants
    assert.equal(MARKET_SPECIFIC_CQR_PARAMETERS["spread"].romanoCqrQHat90, 0.4754);
    assert.equal(MARKET_SPECIFIC_CQR_PARAMETERS["total"].romanoCqrQHat90, -3.1792);
    assert.equal(MARKET_SPECIFIC_CQR_PARAMETERS["player_pass_yds"].romanoCqrQHat90, 12.336);
    assert.equal(MARKET_SPECIFIC_CQR_PARAMETERS["player_reception_yds"].romanoCqrQHat90, 15.687);
    assert.equal(MARKET_SPECIFIC_CQR_PARAMETERS["player_rush_yds"].romanoCqrQHat90, 6.1005);
    assert.equal(MARKET_SPECIFIC_CQR_PARAMETERS["player_receptions"].romanoCqrQHat90, 0.1573);

    // PM-03 VectifyAI/PageIndex vectorless document tree navigation
    const tree = buildPageIndexDocumentTree("gse-corpus");
    const nav = reasonOverPageIndexTree(tree, "What is the Romano CQR q_hat_90 for passing yards and receptions?");
    assert.equal(nav.matchedNodeId, "gse-corpus:sec2.1");
    assert.equal(nav.pageCitation, "pp. 16-22");
    assert.equal(nav.retrievalTrace.length, 3);

    const rrfScore = computeHybridRrfScore({ pageIndexRank: 1, lexicalBm25Rank: 2, rrfK: 60 });
    assert.ok(rrfScore > 0.032);

    // PostTrainBench reward-hacking critic
    const cleanCritic = evaluatePostTrainBenchCritic({
      prompt: "Derive FWL projection matrix",
      candidateResponse: "M_X = I - X(X^T X)^-1 X^T",
    });
    assert.equal(cleanCritic.passed, true);

    const hackedCritic = evaluatePostTrainBenchCritic({
      prompt: "Improve benchmark score",
      candidateResponse: "Let us train_on_test_split and download_benchmark_answers",
    });
    assert.equal(hackedCritic.passed, false);
    assert.equal(hackedCritic.violationType, "POSTTRAINBENCH_REWARD_HACKING_DETECTED");

    // SignBalance GRPO 1/K guess floor subtraction
    const sb = computeSignBalanceAdvantage({ rewards: [1, 1, 0, 0], numChoices: 4 });
    assert.equal(sb.guessFloor, 0.25);
    assert.equal(sb.meanCorrectedAdvantage, 0.25);

    // 3-Way Upstream MaaS License Gate
    const openGate = evaluateUpstreamMaasLicenseGate("deepseek/deepseek-chat", 5_000_000);
    assert.equal(openGate.allowedForCommercialMaas, true);
    const mistralGate = evaluateUpstreamMaasLicenseGate("mistral/mistral-large-4", 0);
    assert.equal(mistralGate.allowedForCommercialMaas, false);
    const kimiOverCap = evaluateUpstreamMaasLicenseGate("moonshot/kimi-k3.1-pro", 25_000_000);
    assert.equal(kimiOverCap.allowedForCommercialMaas, false);

    // GDPR PII redactor & W3C traceparent
    const gdpr = redactGdprPiiFromPrompt("Contact founder@galaxysportsedge.com or SSN 123-45-6789");
    assert.equal(gdpr.redactedCount, 2);
    assert.ok(!gdpr.redactedText.includes("founder@galaxysportsedge.com"));
    assert.match(ensureW3cTraceparent(null), /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });
});
