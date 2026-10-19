import { describe, it, expect } from "vitest";
import {
  bucketOf,
  isQualifying,
  computePlaySizeDistributions,
  type PlaySizePlay,
} from "../play-size-distribution.js";

describe("play-size-distribution", () => {
  describe("bucket boundaries", () => {
    it("assigns buckets correctly at exact boundaries", () => {
      expect(bucketOf(-1)).toBe("NEGATIVE");
      expect(bucketOf(0)).toBe("ZERO");
      expect(bucketOf(1)).toBe("SHORT");
      expect(bucketOf(5)).toBe("SHORT");
      expect(bucketOf(6)).toBe("MEDIUM");
      expect(bucketOf(10)).toBe("MEDIUM");
      expect(bucketOf(11)).toBe("CHUNK");
      expect(bucketOf(20)).toBe("CHUNK");
      expect(bucketOf(21)).toBe("EXPLOSIVE");
      expect(bucketOf(99)).toBe("EXPLOSIVE");
    });
  });

  describe("exclusions", () => {
    it("excludes non-qualifying plays", () => {
      // valid
      expect(isQualifying({ playType: "pass", qbKneel: 0, yardsGained: 5, posteam: "A" } as PlaySizePlay)).toBe(true);
      expect(isQualifying({ playType: "run", qbKneel: 0, yardsGained: -2, posteam: "A" } as PlaySizePlay)).toBe(true);

      // no_play or other
      expect(isQualifying({ playType: "no_play", qbKneel: 0, yardsGained: 5, posteam: "A" } as PlaySizePlay)).toBe(false);
      expect(isQualifying({ playType: "punt", qbKneel: 0, yardsGained: 5, posteam: "A" } as PlaySizePlay)).toBe(false);

      // qb_kneel
      expect(isQualifying({ playType: "run", qbKneel: 1, yardsGained: -1, posteam: "A" } as PlaySizePlay)).toBe(false);

      // non-finite yards
      expect(isQualifying({ playType: "pass", qbKneel: 0, yardsGained: NaN, posteam: "A" } as PlaySizePlay)).toBe(false);

      // no posteam
      expect(isQualifying({ playType: "run", qbKneel: 0, yardsGained: 5, posteam: "" } as PlaySizePlay)).toBe(false);
    });
  });

  describe("aggregation logic and floor", () => {
    it("computes counts and respects the 100 play floor", () => {
      // Build 99 plays
      const plays: PlaySizePlay[] = [];
      for (let i = 0; i < 99; i++) {
        plays.push({
          playId: `p${i}`, gameId: "g1", season: 2025, week: 1,
          posteam: "SEA", defteam: "SF", playType: "pass", yardsGained: 5, qbKneel: 0
        });
      }

      const dists99 = computePlaySizeDistributions(plays, 2025, 2);
      const seaOff99 = dists99.find(d => d.teamId === "SEA" && d.grain === "OFFENSE" && d.window === "SEASON_TO_DATE")!;

      expect(seaOff99.qualifyingPlays).toBe(99);
      expect(seaOff99.shortPlays).toBe(99);
      expect(seaOff99.shortShare).toBeNull(); // Floor not met
      expect(seaOff99.explosivePassRate).toBeNull();

      // Add one more play to reach 100
      plays.push({
        playId: "p100", gameId: "g1", season: 2025, week: 1,
        posteam: "SEA", defteam: "SF", playType: "pass", yardsGained: 25, qbKneel: 0
      });

      const dists100 = computePlaySizeDistributions(plays, 2025, 2);
      const seaOff100 = dists100.find(d => d.teamId === "SEA" && d.grain === "OFFENSE" && d.window === "SEASON_TO_DATE")!;

      expect(seaOff100.qualifyingPlays).toBe(100);
      expect(seaOff100.shortPlays).toBe(99);
      expect(seaOff100.explosivePlays).toBe(1);

      // Floor met, shares should be computed
      expect(seaOff100.shortShare).toBe(0.9900);
      expect(seaOff100.explosiveShare).toBe(0.0100);
      expect(seaOff100.bigPlayShare).toBe(0.0100);

      // Partition invariant: shares sum to 1
      const sum = (seaOff100.negativeShare! + seaOff100.zeroShare! + seaOff100.shortShare! +
                   seaOff100.mediumShare! + seaOff100.chunkShare! + seaOff100.explosivePlays / seaOff100.qualifyingPlays); // Use raw counts for sum to avoid rounding errors or use actual bigPlayShare. Since bigPlayShare is EXPLOSIVE and explosiveShare is CHUNK + EXPLOSIVE, the sum of fundamental buckets is negative+zero+short+medium+chunk+bigPlayShare. Wait, explosiveShare includes CHUNK, so sum of negative+zero+short+medium+explosiveShare ? No, explosiveShare is chunk+explosive. Wait, the basic buckets are negative, zero, short, medium, chunk, explosive.

      const basicSum = (seaOff100.negativeShare! + seaOff100.zeroShare! + seaOff100.shortShare! +
                        seaOff100.mediumShare! + seaOff100.chunkShare! + seaOff100.bigPlayShare!);
      expect(Math.abs(basicSum - 1.0)).toBeLessThan(0.0001);

      // Axes assertions
      expect(seaOff100.negativeShare).toBe(seaOff100.negativePlays / seaOff100.qualifyingPlays);
      expect(seaOff100.bigPlayShare).toBe(seaOff100.explosivePlays / seaOff100.qualifyingPlays);
      expect(seaOff100.explosiveShare).toBe((seaOff100.chunkPlays + seaOff100.explosivePlays) / seaOff100.qualifyingPlays);

      // Explosive pass rate (1 explosive pass out of 100 passes)
      expect(seaOff100.explosivePassRate).toBe(0.0100);

      // Defense matches on the same fixture
      const sfDef100 = dists100.find(d => d.teamId === "SF" && d.grain === "DEFENSE_ALLOWED" && d.window === "SEASON_TO_DATE")!;
      expect(sfDef100.qualifyingPlays).toBe(100);
      expect(sfDef100.explosivePlays).toBe(1);
      expect(sfDef100.bigPlayShare).toBe(0.0100);
    });
  });

  describe("point-in-time and rolling windows", () => {
    it("respects point in time boundaries and calculates rolling windows over distinct games", () => {
      const plays: PlaySizePlay[] = [];

      for (let w = 1; w <= 5; w++) {
        for (let i = 0; i < 25; i++) {
          plays.push({
            playId: `p_${w}_${i}`, gameId: `g${w}`, season: 2025, week: w,
            posteam: "SEA", defteam: "SF", playType: "run", yardsGained: w,
            qbKneel: 0
          });
        }
      }

      for (let i = 0; i < 25; i++) {
        plays.push({
          playId: `p_6_${i}`, gameId: `g6`, season: 2025, week: 6,
          posteam: "SEA", defteam: "SF", playType: "run", yardsGained: 6,
          qbKneel: 0
        });
      }

      const dists = computePlaySizeDistributions(plays, 2025, 6);

      const seaOffSeason = dists.find(d => d.teamId === "SEA" && d.grain === "OFFENSE" && d.window === "SEASON_TO_DATE")!;
      expect(seaOffSeason.qualifyingPlays).toBe(125);

      const seaOffRolling4 = dists.find(d => d.teamId === "SEA" && d.grain === "OFFENSE" && d.window === "ROLLING_4")!;
      expect(seaOffRolling4.qualifyingPlays).toBe(100);
      expect(seaOffRolling4.shortPlays).toBe(100);
      expect(seaOffRolling4.shortYards).toBe(25*2 + 25*3 + 25*4 + 25*5);

      const seaOffRolling8 = dists.find(d => d.teamId === "SEA" && d.grain === "OFFENSE" && d.window === "ROLLING_8")!;
      expect(seaOffRolling8.qualifyingPlays).toBe(125);
    });
  });

  describe("determinism", () => {
    it("produces deterministic output including ordering", () => {
      const plays: PlaySizePlay[] = [
        { playId: "1", gameId: "g1", season: 2025, week: 1, posteam: "B", defteam: "A", playType: "pass", yardsGained: 5, qbKneel: 0 },
        { playId: "2", gameId: "g1", season: 2025, week: 1, posteam: "A", defteam: "B", playType: "run", yardsGained: 15, qbKneel: 0 },
      ];

      const run1 = computePlaySizeDistributions(plays, 2025, 2);
      const run2 = computePlaySizeDistributions(plays, 2025, 2);

      expect(run1).toEqual(run2);

      expect(run1[0].teamId).toBe("A");

      for (let i = 0; i < run1.length - 1; i++) {
        const a = run1[i];
        const b = run1[i+1];

        let correctOrder = false;
        if (a.teamId < b.teamId) correctOrder = true;
        else if (a.teamId === b.teamId) {
          if (a.window < b.window) correctOrder = true;
          else if (a.window === b.window) {
            if (a.grain <= b.grain) correctOrder = true;
          }
        }
        expect(correctOrder).toBe(true);
      }
    });
  });
});
