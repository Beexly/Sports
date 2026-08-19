/**
 * Autonomous board fill — free ESPN game seed + odds refresh + signal slate.
 * Call in-process from crons (no founder click). Never invents odds.
 */
import {
  oddsApiKeyPresence,
  rundownApiKeyPresence,
} from "@sports/data-ingestion";
import { refreshOdds, type RefreshOddsResult } from "./refresh-odds.js";
import { generateSignalSlate, type SignalSlateResult } from "./generate-signal-slate.js";
import { seedGamesFromEspn, type SeedGamesFromEspnResult } from "./seed-games-from-espn.js";

export type BoardFillResult = {
  readonly ok: boolean;
  readonly seed: SeedGamesFromEspnResult;
  readonly odds: RefreshOddsResult;
  readonly signals: SignalSlateResult;
  readonly quoteKeys: {
    readonly oddsPresent: boolean;
    readonly oddsMatchedEnv: string | null;
    readonly rundownPresent: boolean;
    readonly rundownMatchedEnv: string | null;
  };
  readonly note: string;
};

export async function runBoardFillPipeline(opts?: {
  readonly sport?: string;
  readonly logPrefix?: string;
}): Promise<BoardFillResult> {
  const logPrefix = opts?.logPrefix ?? "[board-fill]";
  const oddsPresence = oddsApiKeyPresence();
  const rundownPresence = rundownApiKeyPresence();

  // 1) Always seed upcoming games from free ESPN so signal path is not empty
  // when quote keys are missing or Game table is cold.
  const seed = await seedGamesFromEspn({ logPrefix: `${logPrefix}:espn-seed` });

  // 2) Odds dual-path (soft-fails honestly when keys absent)
  const odds = await refreshOdds(opts?.sport ? { sport: opts.sport } : {});

  // 3) Independent signal slate (no book labels)
  const signals = await generateSignalSlate({
    logPrefix: `${logPrefix}:signal`,
    // games already seeded; avoid nested re-seed loop
    skipSeed: true,
  });

  const ok = odds.ok || signals.picksUpserted > 0 || seed.upserted > 0;
  const note =
    `seed upserted=${seed.upserted}; ` +
    `odds ok=${odds.ok} sports=${odds.okCount}/${odds.totalCount}; ` +
    `signals upserted=${signals.picksUpserted} games=${signals.gamesConsidered}; ` +
    `keys odds=${oddsPresence.present ? oddsPresence.matchedEnv : "ABSENT"} ` +
    `rundown=${rundownPresence.present ? rundownPresence.matchedEnv : "ABSENT"}`;
  console.log(`${logPrefix} ${note}`);
  return {
    ok,
    seed,
    odds,
    signals,
    quoteKeys: {
      oddsPresent: oddsPresence.present,
      oddsMatchedEnv: oddsPresence.matchedEnv,
      rundownPresent: rundownPresence.present,
      rundownMatchedEnv: rundownPresence.matchedEnv,
    },
    note,
  };
}
