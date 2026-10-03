import { beforeEach, describe, expect, it } from "vitest";
import {
  CRAWL_DELAY_MS,
  FANTASYPROS_ECR_ATTRIBUTION,
  FANTASYPROS_ECR_BASE,
  FANTASYPROS_ECR_SOURCE_ID,
  FantasyProsEcrClient,
  FantasyProsEcrError,
  __resetFantasyProsCrawlDelay,
} from "../fantasypros-ecr-client.js";
import { assertIngestible } from "../source-registry.js";

const ECR_FIXTURE = `<!doctype html><html><head><title>PPR Cheatsheet</title></head><body>
<script>
var ecrData = {
  "players": [
    {
      "player_id": 17564,
      "player_name": "Ja'Marr Chase",
      "player_team_id": "CIN",
      "player_position_id": "WR",
      "pos_rank": 1,
      "tier": 1,
      "rank_ecr": 1,
      "rank_min": 1,
      "rank_max": 4,
      "rank_ave": 1.55,
      "rank_std": 1.07,
      "bye_week": 10,
      "owned_avg": 99.8,
      "rank_delta": 0
    }
  ],
  "metadata": { "label": "PPR", "timestamp": 1787433600 }
};
</script>
</body></html>`;

function okFetch(body: string): typeof fetch {
  return (async (_url: unknown) => new Response(body, { status: 200 })) as unknown as typeof fetch;
}

beforeEach(() => {
  // Keep tests fast: the 5s robots crawl-delay is pinned by assertion below,
  // never exercised as a real wait in this suite.
  __resetFantasyProsCrawlDelay();
});

describe("FantasyPros ECR", () => {
  it("exposes the registry identity, base, and attribution", () => {
    expect(FANTASYPROS_ECR_SOURCE_ID).toBe("fantasypros-ecr");
    expect(FANTASYPROS_ECR_BASE).toBe("https://www.fantasypros.com/nfl/rankings");
    expect(FANTASYPROS_ECR_ATTRIBUTION).toBe("Expert consensus rankings via FantasyPros.");
    expect(assertIngestible("fantasypros-ecr").baseUrl).toBe(FANTASYPROS_ECR_BASE);
  });

  it("pins the robots crawl-delay at 5 seconds", () => {
    expect(CRAWL_DELAY_MS).toBe(5000);
  });

  it("parses the verified fixture to exact values", async () => {
    const client = new FantasyProsEcrClient(okFetch(ECR_FIXTURE));
    const { players, meta } = await client.getEcrPpr();
    expect(players).toHaveLength(1);

    const chase = players[0];
    expect(chase?.playerName).toBe("Ja'Marr Chase");
    expect(chase?.rankEcr).toBe(1);
    expect(chase?.rankAve).toBe(1.55);
    expect(chase?.rankStd).toBe(1.07);
    expect(chase?.ownedAvg).toBe(99.8);
    expect(chase?.team).toBe("CIN");
    expect(chase?.position).toBe("WR");

    expect(meta.label).toBe("PPR");
    expect(meta.lastUpdatedTs).toBe(1787433600);
  });

  it("returns empty players on a missing or malformed ecrData, no throw", async () => {
    const missing = new FantasyProsEcrClient(okFetch("<html><body>no ecrData here</body></html>"));
    await expect(missing.getEcrPpr()).resolves.toEqual({ players: [], meta: { label: null, lastUpdatedTs: null } });

    // SECOND fetch in one test body. The crawl-delay timestamp is MODULE-level,
    // so the beforeEach reset only covers the first call: without this line the
    // second getEcrPpr waits out the full 5,000ms politeness window and the test
    // lands exactly on vitest's 5,000ms default timeout. Measured at 5001-5010ms
    // across runs, which is a coin flip, not a slow machine. Both assertions are
    // unchanged; this only stops the suite from exercising a real wait the
    // beforeEach comment already says it never exercises.
    __resetFantasyProsCrawlDelay();

    const malformed = new FantasyProsEcrClient(okFetch("<script>var ecrData = {broken;</script>"));
    await expect(malformed.getEcrPpr()).resolves.toEqual({ players: [], meta: { label: null, lastUpdatedTs: null } });
  });

  it("throws FantasyProsEcrError with status on HTTP 500", async () => {
    const fetch500 = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    const client = new FantasyProsEcrClient(fetch500);
    try {
      await client.getEcrPpr();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(FantasyProsEcrError);
      expect((err as FantasyProsEcrError).status).toBe(500);
    }
  });

  it("assertIngestible rejects unknown sources", () => {
    expect(() => assertIngestible("no-such-source")).toThrow();
  });
});
