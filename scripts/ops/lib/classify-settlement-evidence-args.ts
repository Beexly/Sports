/**
 * Argument parsing, the Prisma `where` and the `select` for
 * scripts/ops/classify-settlement-evidence.ts, split out so the test can import
 * them without executing the CLI's main(). No write call lives here or in the
 * CLI; the tool is read-only by construction.
 */
import type { DetectorPickType } from "../../../apps/web/lib/ops/settlement-contradiction";

export type ClassifyArgs = {
  readonly type: DetectorPickType | "all";
  readonly json: boolean;
  readonly allRows: boolean;
  readonly pickIds: readonly string[];
};

export const PICK_TYPES: readonly DetectorPickType[] = ["MONEYLINE", "SPREAD", "TOTAL"];

export function parseClassifyArgs(
  argv: readonly string[],
): { ok: true; args: ClassifyArgs } | { ok: false; error: string } {
  let type: ClassifyArgs["type"] = "TOTAL";
  let json = false;
  let allRows = false;
  const pickIds: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]!;
    const eq = tok.indexOf("=");
    const flag = eq === -1 ? tok : tok.slice(0, eq);
    const inline = eq === -1 ? undefined : tok.slice(eq + 1);
    const takeValue = (): string | null => {
      if (inline !== undefined) return inline;
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) return null;
      i += 1;
      return next;
    };
    switch (flag) {
      case "--type": {
        const v = takeValue();
        if (v === null) return { ok: false, error: "--type requires a value" };
        const upper = v.toUpperCase();
        if (upper === "ALL") type = "all";
        else if ((PICK_TYPES as readonly string[]).includes(upper)) type = upper as DetectorPickType;
        else return { ok: false, error: `--type must be one of ${PICK_TYPES.join(", ")} or all` };
        break;
      }
      case "--pick": {
        const v = takeValue();
        if (v === null) return { ok: false, error: "--pick requires a pick id" };
        if (!pickIds.includes(v)) pickIds.push(v);
        break;
      }
      case "--json":
        if (inline !== undefined) return { ok: false, error: "--json takes no value" };
        json = true;
        break;
      case "--all-rows":
        if (inline !== undefined) return { ok: false, error: "--all-rows takes no value" };
        allRows = true;
        break;
      default:
        return { ok: false, error: `unknown argument "${tok}"` };
    }
  }
  return { ok: true, args: { type, json, allRows, pickIds } };
}

/** Prisma `where` for the population: published, settled, non-bootstrap, by market. */
export function classifyWhere(args: Pick<ClassifyArgs, "type" | "pickIds">): {
  isPublished: true;
  isBootstrap: false;
  result: { in: Array<"WIN" | "LOSS" | "PUSH"> };
  pickType?: DetectorPickType;
  id?: { in: string[] };
} {
  return {
    isPublished: true,
    isBootstrap: false,
    result: { in: ["WIN", "LOSS", "PUSH"] },
    ...(args.type === "all" ? {} : { pickType: args.type }),
    ...(args.pickIds.length ? { id: { in: [...args.pickIds] } } : {}),
  };
}

/** Everything the classifier reads, and nothing else. */
export const CLASSIFY_SELECT = {
  id: true,
  pickType: true,
  selection: true,
  line: true,
  clvLockLine: true,
  result: true,
  settledAt: true,
  game: {
    select: {
      homeTeamName: true,
      awayTeamName: true,
      homeScore: true,
      awayScore: true,
      sport: { select: { key: true } },
    },
  },
  settlementEvent: { select: { payload: true, settledAt: true } },
} as const;
