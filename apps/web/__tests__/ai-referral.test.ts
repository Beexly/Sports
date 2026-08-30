import { describe, it, expect } from "vitest";
import { classifyAiReferrer } from "@/lib/analytics/ai-referral";
import { ANALYTICS_EVENTS, isAnalyticsEvent, track } from "@/lib/analytics/events";

describe("classifyAiReferrer", () => {
  it("classifies each known assistant host", () => {
    expect(classifyAiReferrer("https://chatgpt.com/c/abc123")).toBe("chatgpt");
    expect(classifyAiReferrer("https://chat.openai.com/")).toBe("chatgpt");
    expect(classifyAiReferrer("https://www.perplexity.ai/search?q=x")).toBe("perplexity");
    expect(classifyAiReferrer("https://claude.ai/chat/xyz")).toBe("claude");
    expect(classifyAiReferrer("https://gemini.google.com/app")).toBe("gemini");
    expect(classifyAiReferrer("https://copilot.microsoft.com/")).toBe("copilot");
  });

  it("is case-insensitive on host", () => {
    expect(classifyAiReferrer("https://CHATGPT.COM/")).toBe("chatgpt");
  });

  it("matches subdomains of a known host", () => {
    expect(classifyAiReferrer("https://edge.chatgpt.com/x")).toBe("chatgpt");
  });

  it("returns null for an ordinary web referrer", () => {
    expect(classifyAiReferrer("https://www.google.com/search?q=x")).toBeNull();
    expect(classifyAiReferrer("https://news.ycombinator.com/")).toBeNull();
  });

  it("returns null for a host that merely CONTAINS a known name (not a real subdomain)", () => {
    // A lookalike host must not be classified — e.g. "notchatgpt.com" is
    // neither equal to nor a subdomain of "chatgpt.com".
    expect(classifyAiReferrer("https://notchatgpt.com/")).toBeNull();
    expect(classifyAiReferrer("https://chatgpt.com.evil.example/")).toBeNull();
  });

  it("returns null for missing, empty, or malformed input", () => {
    expect(classifyAiReferrer(null)).toBeNull();
    expect(classifyAiReferrer(undefined)).toBeNull();
    expect(classifyAiReferrer("")).toBeNull();
    expect(classifyAiReferrer("   ")).toBeNull();
    expect(classifyAiReferrer("not a url")).toBeNull();
  });
});

describe("ai_referral analytics event — cookieless, no-op wiring", () => {
  it("is a known event name", () => {
    expect(isAnalyticsEvent("ai_referral")).toBe(true);
    expect(ANALYTICS_EVENTS.ai_referral.length).toBeGreaterThan(0);
  });

  it("track() stays a pure no-op — no network, returns the normalized payload", () => {
    const result = track("ai_referral", { source: "chatgpt" });
    expect(result).toEqual({ event: "ai_referral", context: { source: "chatgpt" } });
  });

  it("the doc string states the no-identity, no-cookie posture", () => {
    expect(ANALYTICS_EVENTS.ai_referral.toLowerCase()).toContain("no per-visitor identity".toLowerCase());
  });
});
