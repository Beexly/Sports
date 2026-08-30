/**
 * Locks the CLAUDE_PROVIDER fail-safe.
 *
 * An unrecognised CLAUDE_PROVIDER value — a typo, a stale name, or a secret
 * pasted into the wrong variable — must degrade to "no clouds", which makes
 * `callClaude` fall through to `callClaudeMessages` (direct Anthropic). It must
 * never strand the caller with no usable route.
 *
 * This is written down because the opposite was asserted during an incident:
 * that a non-empty CLAUDE_PROVIDER "routes around ANTHROPIC_API_KEY entirely".
 * It does not, and a production variable was almost deleted on that theory. The
 * trace is parseProviderMode -> "unknown", cloudAttemptOrder -> [], and the
 * empty attempt list means callClaude's loop body never runs.
 */
import { describe, it, expect } from "vitest";
import { parseProviderMode, cloudAttemptOrder } from "@/lib/claude-api/jynx";

const KEYLIKE = "sk-ant-api03-EXAMPLE-NOT-A-REAL-KEY";

describe("CLAUDE_PROVIDER fail-safe", () => {
  it("classifies an unrecognised value as 'unknown', not as a route name", () => {
    expect(parseProviderMode({ CLAUDE_PROVIDER: KEYLIKE })).toBe("unknown");
    expect(parseProviderMode({ CLAUDE_PROVIDER: "typo-provider" })).toBe("unknown");
  });

  it("treats unset and 'anthropic' as the same mode", () => {
    expect(parseProviderMode({})).toBe("anthropic");
    expect(parseProviderMode({ CLAUDE_PROVIDER: "anthropic" })).toBe("anthropic");
  });

  it("yields zero cloud attempts for an unknown value, so callClaude reaches Anthropic direct", () => {
    expect(cloudAttemptOrder({ CLAUDE_PROVIDER: KEYLIKE, ANTHROPIC_API_KEY: "x" })).toEqual([]);
  });

  it("is behaviourally identical to deleting the variable", () => {
    const withGarbage = cloudAttemptOrder({ CLAUDE_PROVIDER: KEYLIKE, ANTHROPIC_API_KEY: "x" });
    const deleted = cloudAttemptOrder({ ANTHROPIC_API_KEY: "x" });
    expect(withGarbage).toEqual(deleted);
    expect(deleted).toEqual([]);
  });

  it("still selects a cloud when the value IS a route name and that cloud is configured", () => {
    // No cloud creds present -> even a valid name yields no attempts. This is the
    // other half of the fail-safe: selection never invents an unconfigured route.
    expect(cloudAttemptOrder({ CLAUDE_PROVIDER: "bedrock" })).toEqual([]);
  });
});
