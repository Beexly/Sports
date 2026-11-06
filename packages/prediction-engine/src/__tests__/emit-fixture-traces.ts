/**
 * Emit three reasoning traces from the public scorer.
 * Every number comes from scoreGame + buildReasoningTrace on a constructed
 * OddsInput. These are fixtures. They are not picks.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { scoreGame } from "../scoring.js";
import { buildReasoningTrace } from "../reasoning-trace.js";
import { SKELLAM_COVER_SOURCE } from "../skellam.js";
import type { OddsInput } from "@sports/types";

const TEN = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "wynn", "bet365", "espnbet", "fanatics",
];

const ml: OddsInput = {
  gameId: "fixture-ml-not-a-pick",
  homeTeam: "Chiefs",
  awayTeam: "Eagles",
  commenceTime: new Date("2026-04-15T18:00:00Z"),
  sport: "NFL",
  bookmakerOdds: TEN.map((bookmaker) => ({
    bookmaker,
    market: "H2H" as const,
    homePrice: -800,
    awayPrice: 650,
  })),
  context: {
    bookmakerCoverageMax: 10,
    independentFairValues: [
      { source: "kalshi", homeFairProb: 0.93, awayFairProb: 0.07 },
      { source: "poisson", homeFairProb: 0.92, awayFairProb: 0.08 },
    ],
  },
};

const spread: OddsInput = {
  gameId: "fixture-spread-not-a-pick",
  homeTeam: "Bruins",
  awayTeam: "Leafs",
  commenceTime: new Date("2026-04-15T18:00:00Z"),
  sport: "NHL",
  bookmakerOdds: TEN.slice(0, 5).map((bookmaker) => ({
    bookmaker,
    market: "SPREADS" as const,
    spread: -1.5,
    homeSpreadPrice: -110,
    awaySpreadPrice: -110,
  })),
  context: {
    bookmakerCoverageMax: 5,
    independentFairValues: [
      { source: SKELLAM_COVER_SOURCE, homeFairProb: 0.71, awayFairProb: 0.29 },
    ],
  },
};

const total: OddsInput = {
  gameId: "fixture-total-not-a-pick",
  homeTeam: "Chiefs",
  awayTeam: "Eagles",
  commenceTime: new Date("2026-04-15T18:00:00Z"),
  sport: "NFL",
  bookmakerOdds: TEN.map((bookmaker) => ({
    bookmaker,
    market: "TOTALS" as const,
    total: 47.5,
    overPrice: -110,
    underPrice: -110,
  })),
  context: { bookmakerCoverageMax: 10 },
};

const AT = new Date("2026-04-15T12:00:00Z");
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "data", "reasoning-traces");
mkdirSync(outDir, { recursive: true });

const envelope = {
  source: "fixture",
  license: "not-applicable",
  real_pick: false,
  registry_signals_shown: false,
  note: "Constructed OddsInput run through scoreGame and buildReasoningTrace. Not a settled game, not a published pick, not backed by a registry signal. No calibrator was supplied and none was fit.",
};

for (const [name, input, pickType] of [
  ["moneyline", ml, "MONEYLINE"],
  ["spread", spread, "SPREAD"],
  ["total", total, "TOTAL"],
] as const) {
  const picks = scoreGame(input, AT);
  const pick = picks.find((p) => p.pickType === pickType);
  if (!pick) {
    writeFileSync(join(outDir, `${name}.json`), JSON.stringify({
      ...envelope,
      bet_type: pickType,
      pick: null,
      gaps: [`scoreGame returned no ${pickType} pick. Got: ${picks.map((p) => p.pickType).join(", ") || "none"}. No pick was invented.`],
    }, null, 2));
    console.log(name, "NULL", picks.map((p) => p.pickType).join(",") || "none");
    continue;
  }
  const trace = buildReasoningTrace(pick, input);
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify({
    ...envelope,
    bet_type: pick.pickType,
    pick_id: pick.gameId,
    selection: pick.selection,
    confidence: pick.confidence,
    trace,
  }, null, 2));
  console.log(name, pick.pickType, pick.selection, "confidence", pick.confidence);
}
