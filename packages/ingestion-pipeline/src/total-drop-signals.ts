/**
 * Attach a withheld TOTAL to the existing GameSignal row so the ops coverage
 * loader can name the gate. Not a Pick field and not a publish-path change.
 */
import {
  TOTAL_DROP_SIGNAL_KEY,
  TOTAL_DROP_SIGNAL_SOURCE,
  type TotalDropReason,
} from "@sports/prediction-engine";

export interface TotalDropSignalPlan {
  readonly gameId: string;
  readonly action: "upsert" | "delete";
  readonly reason?: TotalDropReason;
}

export function planTotalDropSignals(
  inputs: readonly { readonly gameId: string }[],
  scored: readonly {
    readonly picks: readonly { readonly pickType: string }[];
    readonly dropReasons: readonly { readonly market: string; readonly reason: TotalDropReason | string }[];
  }[],
  confirmedGameIds: ReadonlySet<string>,
): TotalDropSignalPlan[] {
  const plans: TotalDropSignalPlan[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    if (!input || !confirmedGameIds.has(input.gameId)) continue;
    const result = scored[i];
    const publishedTotal = result?.picks.some((pick) => pick.pickType === "TOTAL") ?? false;
    const drop = result?.dropReasons.find((reason) => reason.market === "TOTAL");
    if (!publishedTotal && drop && isTotalDropReason(drop.reason)) {
      plans.push({ gameId: input.gameId, action: "upsert", reason: drop.reason });
    } else {
      plans.push({ gameId: input.gameId, action: "delete" });
    }
  }
  return plans;
}

const TOTAL_DROP_REASONS: readonly TotalDropReason[] = [
  "fewer_than_min_books",
  "no_two_sided_prices",
  "line_integrity",
  "tiebreak_no_vote",
  "consensus_below_floor",
  "confidence_below_floor",
];

function isTotalDropReason(value: string): value is TotalDropReason {
  return (TOTAL_DROP_REASONS as readonly string[]).includes(value);
}

export interface TotalDropSignalDb {
  gameSignal: {
    upsert(args: {
      where: { gameId_sourceName_signalKey: { gameId: string; sourceName: string; signalKey: string } };
      create: {
        gameId: string;
        sourceCategory: "OTHER";
        sourceName: string;
        signalKey: string;
        signalValue: { reason: TotalDropReason };
        fetchedAt: Date;
        trustLevel: number;
        isBootstrap: false;
      };
      update: { signalValue: { reason: TotalDropReason }; fetchedAt: Date };
    }): Promise<unknown>;
    deleteMany(args: {
      where: { gameId: string; sourceName: string; signalKey: string };
    }): Promise<unknown>;
  };
}

/** Non-fatal: a label write must not fail a pick cycle that already committed. */
export async function persistTotalDropSignals(
  db: TotalDropSignalDb,
  plans: readonly TotalDropSignalPlan[],
  fetchedAt: Date,
  logPrefix: string,
): Promise<void> {
  for (const plan of plans) {
    try {
      if (plan.action === "upsert" && plan.reason) {
        await db.gameSignal.upsert({
          where: {
            gameId_sourceName_signalKey: {
              gameId: plan.gameId,
              sourceName: TOTAL_DROP_SIGNAL_SOURCE,
              signalKey: TOTAL_DROP_SIGNAL_KEY,
            },
          },
          create: {
            gameId: plan.gameId,
            sourceCategory: "OTHER",
            sourceName: TOTAL_DROP_SIGNAL_SOURCE,
            signalKey: TOTAL_DROP_SIGNAL_KEY,
            signalValue: { reason: plan.reason },
            fetchedAt,
            trustLevel: 0.2,
            isBootstrap: false,
          },
          update: {
            signalValue: { reason: plan.reason },
            fetchedAt,
          },
        });
      } else {
        await db.gameSignal.deleteMany({
          where: {
            gameId: plan.gameId,
            sourceName: TOTAL_DROP_SIGNAL_SOURCE,
            signalKey: TOTAL_DROP_SIGNAL_KEY,
          },
        });
      }
    } catch (err) {
      console.warn(
        `${logPrefix} total-drop signal ${plan.action} failed for ${plan.gameId}: ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
