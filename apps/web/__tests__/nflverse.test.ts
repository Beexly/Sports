import { describe, it, expect } from "vitest";
import {
  fetchNflversePlayerStats,
  fetchNflverseInjuries,
  fetchNflverseRosters,
  NFLVERSE_ATTRIBUTION,
  NFLVERSE_LICENSE,
  nflverseUrls,
} from "@/lib/data-sources/nflverse";

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockTextFetcher(text: string, status = 200) {
  return async (_url: string) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
  });
}

function failingFetcher(): (_url: string) => Promise<never> {
  return async () => { throw new Error("Network failure"); };
}

const SAMPLE_PLAYER_STATS_CSV = `player_id,player_display_name,recent_team,season,week,season_type,position,passing_yards,rushing_yards,receiving_yards,touchdowns,carries,targets,receptions,fantasy_points_ppr
00-0023436,Patrick Mahomes,KC,2025,1,REG,QB,320,15,0,3,5,0,0,28.5
00-0036355,Tyreek Hill,MIA,2025,1,REG,WR,0,0,125,1,0,10,8,25.5`;

const SAMPLE_INJURIES_CSV = `gsis_id,full_name,team,season,week,report_status,practice_status,primary_injury
00-0036355,Tyreek Hill,MIA,2025,6,Questionable,Limited Participation,Ankle`;

const SAMPLE_ROSTER_CSV = `gsis_id,full_name,team,position,depth_chart_position,season,status,years_exp
00-0023436,Patrick Mahomes,KC,QB,QB,2025,Active,8
00-0036355,Tyreek Hill,MIA,WR,WR,2025,Active,9`;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("nflverse Data Adapter", () => {
  describe("constants and attribution", () => {
    it("NFLVERSE_ATTRIBUTION includes required CC-BY-4.0 text", () => {
      expect(NFLVERSE_ATTRIBUTION).toMatch(/nflverse/);
      expect(NFLVERSE_ATTRIBUTION).toMatch(/CC-BY-4\.0/);
    });

    it("NFLVERSE_LICENSE is CC-BY-4.0", () => {
      expect(NFLVERSE_LICENSE).toBe("CC-BY-4.0");
    });

    it("nflverseUrls builds correct player stats URL for 2025", () => {
      expect(nflverseUrls.playerStats(2025)).toMatch(/player_stats_2025\.csv/);
      expect(nflverseUrls.playerStats(2025)).toMatch(/nflverse-data/);
    });

    it("nflverseUrls builds correct injuries URL", () => {
      expect(nflverseUrls.injuries(2025)).toMatch(/injuries_2025\.csv/);
    });

    it("nflverseUrls builds correct rosters URL", () => {
      expect(nflverseUrls.rosters(2025)).toMatch(/roster_2025\.csv/);
    });
  });

  describe("fetchNflversePlayerStats", () => {
    it("returns player rows on success", async () => {
      const result = await fetchNflversePlayerStats(2025, mockTextFetcher(SAMPLE_PLAYER_STATS_CSV));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.source).toBe("nflverse");
        expect(result.license).toBe("CC-BY-4.0");
        expect(result.dataQuality).toBe("authoritative-free");
        expect(result.season).toBe(2025);
      }
    });

    it("parses player stats fields correctly", async () => {
      const result = await fetchNflversePlayerStats(2025, mockTextFetcher(SAMPLE_PLAYER_STATS_CSV));
      if (result.ok) {
        const mahomes = result.data[0]!;
        expect(mahomes.playerName).toBe("Patrick Mahomes");
        expect(mahomes.recentTeam).toBe("KC");
        expect(mahomes.position).toBe("QB");
        expect(mahomes.passingYards).toBe(320);
        expect(mahomes.touchdowns).toBe(3);
        expect(mahomes.fantasyPointsPpr).toBe(28.5);
        expect(mahomes.week).toBe(1);
      }
    });

    it("returns error on network failure", async () => {
      const result = await fetchNflversePlayerStats(2025, failingFetcher());
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe("network-error");
        expect(result.source).toBe("nflverse");
        expect(result.season).toBe(2025);
      }
    });

    it("returns error on HTTP 404", async () => {
      const result = await fetchNflversePlayerStats(2020, mockTextFetcher("Not Found", 404));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(404);
      }
    });

    it("includes attribution on every result", async () => {
      const result = await fetchNflversePlayerStats(2025, mockTextFetcher(SAMPLE_PLAYER_STATS_CSV));
      if (result.ok) {
        expect(result.attribution).toMatch(/CC-BY-4\.0/);
      }
    });

    it("includes cacheMaxAgeSeconds", async () => {
      const result = await fetchNflversePlayerStats(2025, mockTextFetcher(SAMPLE_PLAYER_STATS_CSV));
      if (result.ok) {
        expect(result.cacheMaxAgeSeconds).toBeGreaterThan(0);
      }
    });
  });

  describe("fetchNflverseInjuries", () => {
    it("returns injury rows on success", async () => {
      const result = await fetchNflverseInjuries(2025, mockTextFetcher(SAMPLE_INJURIES_CSV));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(1);
      }
    });

    it("parses injury fields correctly", async () => {
      const result = await fetchNflverseInjuries(2025, mockTextFetcher(SAMPLE_INJURIES_CSV));
      if (result.ok) {
        const row = result.data[0]!;
        expect(row.playerName).toBe("Tyreek Hill");
        expect(row.team).toBe("MIA");
        expect(row.reportStatus).toBe("Questionable");
        expect(row.primaryInjury).toBe("Ankle");
        expect(row.week).toBe(6);
      }
    });

    it("returns error on network failure", async () => {
      const result = await fetchNflverseInjuries(2025, failingFetcher());
      expect(result.ok).toBe(false);
    });
  });

  describe("fetchNflverseRosters", () => {
    it("returns roster rows on success", async () => {
      const result = await fetchNflverseRosters(2025, mockTextFetcher(SAMPLE_ROSTER_CSV));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.license).toBe("CC-BY-4.0");
      }
    });

    it("parses roster fields correctly", async () => {
      const result = await fetchNflverseRosters(2025, mockTextFetcher(SAMPLE_ROSTER_CSV));
      if (result.ok) {
        const mahomes = result.data[0]!;
        expect(mahomes.playerName).toBe("Patrick Mahomes");
        expect(mahomes.position).toBe("QB");
        expect(mahomes.team).toBe("KC");
        expect(mahomes.yearsExp).toBe(8);
        expect(mahomes.status).toBe("Active");
      }
    });

    it("returns error on network failure", async () => {
      const result = await fetchNflverseRosters(2025, failingFetcher());
      expect(result.ok).toBe(false);
    });

    it("rosters have longer cache TTL than injuries", async () => {
      const rostResult = await fetchNflverseRosters(2025, mockTextFetcher(SAMPLE_ROSTER_CSV));
      const injResult = await fetchNflverseInjuries(2025, mockTextFetcher(SAMPLE_INJURIES_CSV));
      if (rostResult.ok && injResult.ok) {
        expect(rostResult.cacheMaxAgeSeconds).toBeGreaterThan(injResult.cacheMaxAgeSeconds);
      }
    });
  });
});
