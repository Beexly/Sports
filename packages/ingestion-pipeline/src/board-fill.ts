/**
 * Autonomous board fill — odds refresh + independent signal slate.
 * Call in-process from crons (no founder click). Never invents odds.
 */
import { refreshOdds, type RefreshOddsResult } from "./refresh-odds.js";
import { generateSignalSlate, type SignalSlateResult } from "./generate-signal-slate.js";

export type BoardFillResult = {
  readonly ok: boolean;
  readonly odds: RefreshOddsResult;
  readonly signals: SignalSlateResult;
  readonly note: string;
};

export async function runBoardFillPipeline(opts?: {
  readonly sport?: string;
  readonly logPrefix?: string;
}): Promise<BoardFillResult> {
  const logPrefix = opts?.logPrefix ?? "[board-fill]";
  const odds = await refreshOdds(opts?.sport ? { sport: opts.sport } : {});
  const signals = await generateSignalSlate({ logPrefix: `${logPrefix}:signal` });
  const ok = odds.ok || signals.picksUpserted > 0;
  const note =
    `odds ok=${odds.ok} sports=${odds.okCount}/${odds.totalCount}; ` +
    `signals upserted=${signals.picksUpserted} games=${signals.gamesConsidered}`;
  console.log(`${logPrefix} ${note}`);
  return { ok, odds, signals, note };
}
