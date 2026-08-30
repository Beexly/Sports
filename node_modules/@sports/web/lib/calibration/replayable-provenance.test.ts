import { describe, expect, it } from "vitest";
import {
  buildReplayableProvenanceFeed,
  createReplayableProvenanceEvent,
  verifyReplayableHashChain,
  type ReplayableHashChainEvent,
} from "./replayable-provenance";

function appendEvent(
  chain: readonly ReplayableHashChainEvent[],
  input: Omit<Parameters<typeof createReplayableProvenanceEvent>[0], "previousHash">
): readonly ReplayableHashChainEvent[] {
  const previousHash = chain.length === 0 ? null : chain[chain.length - 1]!.hash;
  return [...chain, createReplayableProvenanceEvent({ ...input, previousHash })];
}

describe("replayable provenance", () => {
  it("replays calibration from a valid hash chain", () => {
    let chain: readonly ReplayableHashChainEvent[] = [];
    chain = appendEvent(chain, {
      id: "commit-p1",
      occurredAt: "2026-09-01T16:00:00.000Z",
      payload: {
        generatedAt: "2026-09-01T16:00:00.000Z",
        kind: "pre-game-commit",
        modelVersion: "v5.1.0",
        payloadHash: "projection-inputs-p1",
        pickId: "pick-1",
      },
      sequence: 1,
      type: "PREGAME_COMMIT",
    });
    chain = appendEvent(chain, {
      id: "settle-p1",
      occurredAt: "2026-09-08T05:00:00.000Z",
      payload: {
        confidence: 72,
        dataQualityScore: 91,
        kind: "settled-pick",
        pickId: "pick-1",
        pickType: "spread",
        result: "WIN",
        sport: "NFL",
      },
      sequence: 2,
      type: "SETTLED_PICK",
    });
    chain = appendEvent(chain, {
      id: "settle-p2",
      occurredAt: "2026-09-08T05:01:00.000Z",
      payload: {
        confidence: 58,
        kind: "settled-pick",
        pickId: "pick-2",
        pickType: "total",
        result: "LOSS",
        sport: "NFL",
      },
      sequence: 3,
      type: "SETTLED_PICK",
    });

    const feed = buildReplayableProvenanceFeed(chain, new Date("2026-09-08T06:00:00.000Z"));

    expect(feed.chain.valid).toBe(true);
    expect(feed.chain.tipHash).toBe(chain[2]!.hash);
    expect(feed.calibration.sampleSize).toBe(2);
    expect(feed.rows).toHaveLength(2);
    expect(feed.status).toBe("FLAGGED_OFF");
    expect(feed.enabled).toBe(false);
    expect(feed.draftOnly).toBe(true);
    expect(feed.priced).toBe(false);
  });

  it("rejects tampered payloads and withholds calibration", () => {
    const first = createReplayableProvenanceEvent({
      id: "settle-p1",
      occurredAt: "2026-09-08T05:00:00.000Z",
      payload: {
        confidence: 70,
        kind: "settled-pick",
        pickId: "pick-1",
        result: "WIN",
      },
      previousHash: null,
      sequence: 1,
      type: "SETTLED_PICK",
    });
    const tampered: ReplayableHashChainEvent = {
      ...first,
      payload: {
        confidence: 95,
        kind: "settled-pick",
        pickId: "pick-1",
        result: "WIN",
      },
    };

    const verification = verifyReplayableHashChain([tampered]);
    const feed = buildReplayableProvenanceFeed([tampered]);

    expect(verification.valid).toBe(false);
    expect(verification.errors.join(" ")).toContain("payloadHash mismatch");
    expect(feed.chain.valid).toBe(false);
    expect(feed.calibration.sampleSize).toBe(0);
    expect(feed.rows).toHaveLength(0);
  });

  it("can be shadow-ready only when explicitly enabled by caller", () => {
    const feed = buildReplayableProvenanceFeed([], new Date("2026-09-08T06:00:00.000Z"), {
      enabled: true,
      flagKey: "TEST_REPLAY_FLAG",
    });

    expect(feed.status).toBe("SHADOW_READY");
    expect(feed.flagKey).toBe("TEST_REPLAY_FLAG");
    expect(feed.priced).toBe(false);
    expect(feed.draftOnly).toBe(true);
  });
});
