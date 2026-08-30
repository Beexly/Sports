import { describe, expect, it, vi } from "vitest";
import {
  azureFoundryConfig,
  callAzureFoundryClaudeMessages,
  isAzureFoundryProviderSelected,
  resolveAzureFoundryModelId,
} from "./azure-foundry";

const ENV = {
  CLAUDE_PROVIDER: "azure",
  AZURE_FOUNDRY_RESOURCE: "gse-foundry",
  AZURE_FOUNDRY_API_KEY: "az-key",
  AZURE_FOUNDRY_MODEL_MAP: JSON.stringify({ "claude-sonnet-4-6": "claude-sonnet-4-6" }),
} as const;

describe("azureFoundryConfig", () => {
  it("builds messages URL from resource name", () => {
    const c = azureFoundryConfig({
      AZURE_FOUNDRY_RESOURCE: "myres",
      AZURE_FOUNDRY_API_KEY: "k",
    });
    expect(c?.messagesUrl).toBe("https://myres.services.ai.azure.com/anthropic/v1/messages");
  });

  it("accepts base URL ending in /anthropic", () => {
    const c = azureFoundryConfig({
      AZURE_FOUNDRY_BASE_URL: "https://myres.services.ai.azure.com/anthropic",
      AZURE_FOUNDRY_API_KEY: "k",
    });
    expect(c?.messagesUrl).toBe("https://myres.services.ai.azure.com/anthropic/v1/messages");
  });

  it("rejects invalid resource names", () => {
    expect(
      azureFoundryConfig({
        AZURE_FOUNDRY_RESOURCE: "https://evil.example",
        AZURE_FOUNDRY_API_KEY: "k",
      }),
    ).toBeNull();
  });
});

describe("isAzureFoundryProviderSelected", () => {
  it("requires provider + map + endpoint + key", () => {
    expect(isAzureFoundryProviderSelected(ENV)).toBe(true);
    expect(isAzureFoundryProviderSelected({ ...ENV, CLAUDE_PROVIDER: "azure-foundry" })).toBe(true);
    expect(isAzureFoundryProviderSelected({ ...ENV, CLAUDE_PROVIDER: "bedrock" })).toBe(false);
    expect(isAzureFoundryProviderSelected({ ...ENV, AZURE_FOUNDRY_MODEL_MAP: "" })).toBe(false);
  });
});

describe("resolveAzureFoundryModelId", () => {
  it("maps from JSON map only", () => {
    expect(resolveAzureFoundryModelId("claude-sonnet-4-6", ENV)).toBe("claude-sonnet-4-6");
    expect(() => resolveAzureFoundryModelId("claude-opus-4-8", ENV)).toThrow(/No Azure Foundry model/);
  });
});

describe("callAzureFoundryClaudeMessages", () => {
  it("posts Messages API shape and prefixes ledger model name", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: "text", text: "foundry-ok" }],
        usage: { input_tokens: 3, output_tokens: 4 },
      }),
      text: async () => "",
    }));

    const result = await callAzureFoundryClaudeMessages(
      {
        anthropicModelId: "claude-sonnet-4-6",
        system: "S",
        user: "U",
        maxTokens: 64,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
      ENV,
    );

    expect(result.text).toBe("foundry-ok");
    expect(result.modelName).toBe("azure-foundry/claude-sonnet-4-6");
    expect(result.inputTokens).toBe(3);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://gse-foundry.services.ai.azure.com/anthropic/v1/messages");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["api-key"]).toBe("az-key");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
  });
});
