import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/ingestion/historical-games", () => ({ ingestHistoricalGames: vi.fn() }));

import { GET } from "@/app/api/cron/backfill-historical-games/route";
import { ingestHistoricalGames } from "@/lib/ingestion/historical-games";

function req(auth?: string): Request {
  return new Request("http://x/api/cron/backfill-historical-games", auth ? { headers: { authorization: auth } } : undefined);
}

describe("GET /api/cron/backfill-historical-games", () => {
  beforeEach(() => {
    (ingestHistoricalGames as Mock).mockReset();
    vi.stubEnv("CRON_SECRET", "secret");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("401s without the bearer secret", async () => {
    expect((await GET(req())).status).toBe(401);
    expect(ingestHistoricalGames).not.toHaveBeenCalled();
  });

  it("runs the backfill and returns its summary", async () => {
    (ingestHistoricalGames as Mock).mockResolvedValue({ status: "ok", rowsWritten: 7000, seasons: 26 });
    const res = await GET(req("Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; seasons: number };
    expect(body.success).toBe(true);
    expect(body.seasons).toBe(26);
  });

  it("502s when ingestion reports a non-ok status", async () => {
    (ingestHistoricalGames as Mock).mockResolvedValue({ status: "source-error", rowsWritten: 0, seasons: 0 });
    expect((await GET(req("Bearer secret"))).status).toBe(502);
  });
});
