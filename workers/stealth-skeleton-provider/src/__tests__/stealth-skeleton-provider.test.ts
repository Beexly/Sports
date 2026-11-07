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
  resolveOpenRouterTrafficRouting,
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

    assert.equal(STEALTH_SKELETON_MODELS_V2_4.length, 9);
    for (const doc of STEALTH_SKELETON_MODELS_V2_4) {
      assert.equal(doc.schema_version, "2.4");
      assert.equal(doc.quantization, "fp8");
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
    assert.equal(v2Body.data.length, 9);

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

  it("enforces OpenRouter Traffic Routing (sort, data_collection: deny, max_price, order) and returns x_gse_skeleton.openrouter_traffic_routing", async () => {
    const latencyRoute = resolveOpenRouterTrafficRouting("gse/skeleton-v1", {
      sort: "latency",
      data_collection: "deny",
      order: ["gse-sovereign-primary", "legacy-slow-node"],
      ignore: ["legacy-slow-node"],
      quantizations: ["fp16"],
    });
    assert.equal(latencyRoute.resolved_model, "gse/skeleton-flash");
    assert.equal(latencyRoute.routing_lane, "latency_flash_lane");
    assert.equal(latencyRoute.zero_data_retention_enforced, true);
    assert.deepEqual(latencyRoute.order, ["gse-sovereign-primary"]);

    const throughputRoute = resolveOpenRouterTrafficRouting("gse/skeleton-v1", {
      sort: "throughput",
    });
    assert.equal(throughputRoute.resolved_model, "gse/skeleton-v1-fast");
    assert.equal(throughputRoute.parallel_speculative_lanes, 4);

    const priceRoute = resolveOpenRouterTrafficRouting("gse/skeleton-v1", {
      sort: "price",
      max_price: { prompt: 0, completion: 0, request: 0 },
    });
    assert.equal(priceRoute.resolved_model, "gse/stealth-skeleton-alpha");
    assert.equal(priceRoute.max_price.zero_cost_enforced, true);

    const queued: CrowdRlhfQueueEntry[] = [];
    const res = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gse/stealth-skeleton-alpha",
          provider: {
            sort: "latency",
            data_collection: "deny",
            order: ["gse-sovereign-primary", "deepinfra-fp16"],
            ignore: ["deepinfra-fp16"],
            max_price: { prompt: 0.0005, completion: 0.0015 },
          },
          messages: [{ role: "user", content: "Verify CRPS(N(0,1), 0)" }],
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
    assert.equal(res.status, 200);
    // Zero prompt retention enforced when data_collection === "deny"
    assert.equal(queued.length, 0);
    const body = (await res.json()) as {
      model: string;
      x_gse_skeleton: {
        openrouter_traffic_routing: typeof latencyRoute;
        declared_zdr: boolean;
      };
    };
    assert.equal(body.model, "gse/skeleton-flash");
    assert.equal(body.x_gse_skeleton.declared_zdr, true);
    assert.equal(body.x_gse_skeleton.openrouter_traffic_routing.sort, "latency");
    assert.equal(body.x_gse_skeleton.openrouter_traffic_routing.data_collection, "deny");
    assert.deepEqual(body.x_gse_skeleton.openrouter_traffic_routing.order, ["gse-sovereign-primary"]);
  });

  it("serves OpenRouter Provider Integration metadata on GET /v1/models and SLA/Sinkhorn/PageIndex health on GET /v1/providers/health", async () => {
    const modelsRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/v1/models")
    );
    assert.equal(modelsRes.status, 200);
    const modelsBody = (await modelsRes.json()) as {
      data: Array<{
        id: string;
        quantization: string;
        architecture: { modality: string; tokenizer: string; instruct_type: string };
        top_provider: { context_length: number; max_completion_tokens: number; is_moderated: boolean };
        supported_parameters: string[];
      }>;
    };
    assert.equal(modelsBody.data.length, 9);
    for (const model of modelsBody.data) {
      assert.equal(model.quantization, "fp8");
      assert.equal(model.architecture.modality, "text->text");
      assert.equal(model.architecture.tokenizer, "GSE-Hybrid-BPE");
      assert.equal(model.architecture.instruct_type, "chatml");
      assert.equal(model.top_provider.context_length, 131072);
      assert.equal(model.top_provider.max_completion_tokens, 16384);
      assert.equal(model.top_provider.is_moderated, false);
      assert.ok(Array.isArray(model.supported_parameters));
      assert.ok(model.supported_parameters.includes("tools"));
    }

    const healthRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/v1/providers/health")
    );
    assert.equal(healthRes.status, 200);
    const healthBody = (await healthRes.json()) as {
      status: string;
      sla_status: {
        status: string;
        uptime_target: number;
        ttft_p95_ms: number;
        throughput_tokens_per_sec: number;
        exacto_tool_calling_accuracy: number;
      };
      sinkhorn_convergence_health: { converged: boolean; l1_marginal_residual: number };
      pageindex_readiness: { ready: boolean; section_count: number };
      active_model_ids: string[];
    };
    assert.equal(healthBody.status, "ok");
    assert.equal(healthBody.sla_status.status, "HEALTHY");
    assert.notEqual(healthBody.sla_status.ttft_p95_ms, 142);
    assert.notEqual(healthBody.sla_status.throughput_tokens_per_sec, 188);
    assert.equal(healthBody.sla_status.exacto_tool_calling_accuracy, 1);
    assert.equal(healthBody.sinkhorn_convergence_health.converged, true);
    assert.ok(healthBody.sinkhorn_convergence_health.l1_marginal_residual < 1e-6);
    assert.equal(healthBody.pageindex_readiness.ready, true);
    assert.equal(healthBody.active_model_ids.length, 9);
  });

  it("serves JSON-RPC 2.0 Model Context Protocol on GET /mcp and POST /mcp (initialize, tools/list, tools/call) and routes all 5 gse/skeleton-* models without coercion", async () => {
    const getMcpRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/mcp")
    );
    assert.equal(getMcpRes.status, 200);
    const getMcpBody = (await getMcpRes.json()) as {
      protocolVersion: string;
      serverInfo: { name: string; version: string };
      tools: Array<{ name: string }>;
    };
    assert.equal(getMcpBody.protocolVersion, "2024-11-05");
    assert.equal(getMcpBody.serverInfo.name, "gse-stealth-skeleton-mcp");
    assert.equal(getMcpBody.tools.length, 10);

    const initRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      })
    );
    assert.equal(initRes.status, 200);
    const initBody = (await initRes.json()) as {
      jsonrpc: string;
      id: number;
      result: {
        protocolVersion: string;
        serverInfo: { name: string; version: string };
        capabilities: { tools: Record<string, unknown> };
      };
    };
    assert.equal(initBody.result.protocolVersion, "2024-11-05");
    assert.equal(initBody.result.serverInfo.name, "gse-stealth-skeleton-mcp");
    assert.equal(initBody.result.serverInfo.version, "2.4.0");
    assert.deepEqual(initBody.result.capabilities, { tools: {} });

    const listRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
        }),
      })
    );
    assert.equal(listRes.status, 200);
    const listBody = (await listRes.json()) as {
      result: { tools: Array<{ name: string }> };
    };
    assert.deepEqual(
      listBody.result.tools.map((t) => t.name),
      [
        "evaluate_game_5stage_jev",
        "query_pageindex_corpus",
        "audit_sinkhorn_marginals",
        "generate_dfs_showdown_optimal",
        "generate_autonomous_social_pack",
        "gse_skeleton_reason",
        "gse_predict_game_360",
        "gse_build_dfs_lineup",
        "gse_generate_content_pack",
        "gsi_evaluate_biomechanics_trauma",
      ]
    );

    for (const modelId of [
      "gse/skeleton-stealth",
      "gse/skeleton-math-pro",
      "gse/skeleton-forecast",
      "gse/skeleton-council",
      "gse/skeleton-flash",
    ]) {
      const mRes = await handleStealthSkeletonRequest(
        new Request("https://stealth.galaxysportsedge.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: "user", content: "Run specialist model pass on DET@GB" }],
          }),
        })
      );
      assert.equal(mRes.status, 200);
      const mBody = (await mRes.json()) as {
        model: string;
        choices: Array<{ message: { content: string } }>;
      };
      assert.equal(mBody.model, modelId, `Model ${modelId} must not be coerced to alpha`);
      assert.ok(mBody.choices[0].message.content.includes(modelId));
    }

    const callRes = await handleStealthSkeletonRequest(
      new Request("https://stealth.galaxysportsedge.com/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "gse_predict_game_360",
            arguments: {
              matchup: "DET@GB",
              market_type: "player_pass_yds",
              engine_prob: 0.66,
              market_prob: 0.52,
              center_projection: 258.5,
              gate_decision: "PUBLISH",
            },
          },
        }),
      })
    );
    assert.equal(callRes.status, 200);
    const callBody = (await callRes.json()) as {
      result: { isError: boolean; content: Array<{ type: string; text: string }> };
    };
    assert.equal(callBody.result.isError, false);
    assert.equal(callBody.result.content[0].type, "text");
    const parsedToolOutput = JSON.parse(callBody.result.content[0].text) as {
      tool: string;
      matchup: string;
      romano_cqr_90_band: { marketKey: string; sigmaConditional: number };
      sinkhorn_marginal_audit: { converged: boolean };
    };
    assert.equal(parsedToolOutput.tool, "gse_predict_game_360");
    assert.equal(parsedToolOutput.matchup, "DET@GB");
    assert.equal(parsedToolOutput.romano_cqr_90_band.marketKey, "player_pass_yds");
    assert.equal(parsedToolOutput.romano_cqr_90_band.sigmaConditional, 70.6656);
    assert.equal(parsedToolOutput.sinkhorn_marginal_audit.converged, true);
  });
});
