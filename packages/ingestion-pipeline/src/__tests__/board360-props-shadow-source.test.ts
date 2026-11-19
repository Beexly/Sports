import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBoard360PropsShadowSource } from "../board360-props-shadow-source.js";
import { runPropsSlateShadow, PROPS_SLATE_SHADOW_ENABLED_ENV } from "../props-slate-shadow.js";

describe("createBoard360PropsShadowSource", () => {
  const tempFiles: string[] = [];

  afterEach(() => {
    while (tempFiles.length > 0) {
      const f = tempFiles.pop()!;
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  });

  it("loads only two-sided player props and skips single-sided / team lines", async () => {
    const tmpFile = path.join(os.tmpdir(), `board360-shadow-test-${Date.now()}.json`);
    tempFiles.push(tmpFile);
    fs.writeFileSync(
      tmpFile,
      JSON.stringify({
        generated_utc: "2026-11-15T20:29:57Z",
        game_boards: {
          "PIT@CIN": {
            suites: {
              skill_full_game: [
                {
                  athlete: "Chase Brown",
                  team: "CIN",
                  position: "RB",
                  market: "Total Rushing Yards (incl. overtime)",
                  line: 68.5,
                  overOdds: -115,
                  underOdds: -115,
                  two_sided_valid: true,
                  source: "DraftKings",
                },
                {
                  athlete: "Tee Higgins",
                  team: "CIN",
                  position: "WR",
                  market: "Total Receiving Yards (incl. overtime)",
                  line: 72.5,
                  overOdds: -110,
                  underOdds: null,
                  two_sided_valid: false,
                  source: "DraftKings",
                },
              ],
              quarters_halves: [
                {
                  athlete: "",
                  team: "CIN",
                  market: "Point Spread",
                  line: -3.5,
                  overOdds: -110,
                  underOdds: -110,
                  two_sided_valid: true,
                  source: "DraftKings",
                },
              ],
            },
          },
        },
      }),
      "utf8",
    );

    const source = createBoard360PropsShadowSource({
      boardFilePath: tmpFile,
      resolveRateHistory: async ({ playerId, propType, line }) => ({
        playerId,
        propType,
        line,
        samples: [
          { total: 48, games: 10 },
          { total: 64, games: 10 },
          { total: 55, games: 10 },
          { total: 79, games: 10 },
          { total: 41, games: 10 },
          { total: 72, games: 10 },
          { total: 60, games: 10 },
          { total: 88, games: 10 },
        ],
      }),
    });

    const lines = await source.loadPropLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]!.prop.playerName).toBe("Chase Brown");
    expect(lines[0]!.prop.opponent).toBe("PIT");
    expect(lines[0]!.prop.propType).toBe("rushing_yards");

    const shadowRun = await runPropsSlateShadow({
      env: { [PROPS_SLATE_SHADOW_ENABLED_ENV]: "1" } as NodeJS.ProcessEnv,
      source,
      projectedMean: 66.0,
      projectedStdDev: 18.0,
    });
    expect(shadowRun.shadow).toBe(true);
    expect(shadowRun.weight).toBe(0);
    expect(shadowRun.source).toBe("game_boards_360");
    expect(shadowRun.result?.propsConsidered).toBe(1);
  });
});
