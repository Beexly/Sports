/**
 * Pure argument parsing and the dry-run / execute decision for
 * scripts/ops/adjudicate-stale-picks.ts. No I/O, no database, no process.exit:
 * the script owns those, this module owns the decisions so the tests can
 * exercise them directly.
 */

export const SUPPORTED_ACTION = "unpublish";

export type AdjudicateArgs = {
  /** Only true when --execute was passed. Anything else is a dry run. */
  execute: boolean;
  json: boolean;
  action: string;
  /** Restricts the shared selection to these pick ids (empty = every selected row). */
  pickIds: string[];
};

export type ParsedAdjudicateArgs = { ok: true; args: AdjudicateArgs } | { ok: false; error: string };

const DEFAULTS: AdjudicateArgs = { execute: false, json: false, action: SUPPORTED_ACTION, pickIds: [] };

/**
 * Accepts: --execute, --dry-run (explicit default), --json,
 * --pick <id> / --pick=<id> (repeatable), --action <name> / --action=<name>.
 * Any other token is an error so a typo can never widen the set silently.
 */
export function parseAdjudicateArgs(argv: readonly string[]): ParsedAdjudicateArgs {
  const args: AdjudicateArgs = { ...DEFAULTS, pickIds: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? "";
    const eq = token.indexOf("=");
    const flag = eq === -1 ? token : token.slice(0, eq);
    const inlineValue = eq === -1 ? null : token.slice(eq + 1);
    const takeValue = (): string | null => {
      if (inlineValue !== null) return inlineValue.trim();
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) return null;
      i += 1;
      return next.trim();
    };
    switch (flag) {
      case "--execute":
        if (inlineValue !== null) return { ok: false, error: `${flag} takes no value` };
        args.execute = true;
        break;
      case "--dry-run":
        if (inlineValue !== null) return { ok: false, error: `${flag} takes no value` };
        args.execute = false;
        break;
      case "--json":
        if (inlineValue !== null) return { ok: false, error: `${flag} takes no value` };
        args.json = true;
        break;
      case "--pick": {
        const id = takeValue();
        if (!id) return { ok: false, error: "--pick requires a pick id" };
        if (!args.pickIds.includes(id)) args.pickIds.push(id);
        break;
      }
      case "--action": {
        const action = takeValue();
        if (!action) return { ok: false, error: "--action requires a value" };
        args.action = action;
        break;
      }
      default:
        return { ok: false, error: `unknown argument ${JSON.stringify(token)}` };
    }
  }
  return { ok: true, args };
}

/**
 * One sentence, or null when the action is the supported one. VOID is owned by
 * the settlement outbox (PickSettlementEvent), so this tool refuses it instead
 * of writing a half-contract.
 */
export function actionRejection(action: string): string | null {
  if (action === SUPPORTED_ACTION) return null;
  return (
    `adjudicate-stale-picks: --action ${action} is not implemented here because the settlement outbox ` +
    `owns the PickSettlementEvent contract (a VOID must be written through that lane, with its ` +
    `pick_settlement_events row), so this tool only supports --action ${SUPPORTED_ACTION}.`
  );
}

export type AdjudicationPlan = {
  mode: "dry-run" | "execute";
  ids: string[];
  headline: string;
};

export function dryRunHeadline(count: number): string {
  return `DRY RUN: nothing written; pass --execute to unpublish these ${count} picks`;
}

export function executeHeadline(count: number): string {
  return `EXECUTE: unpublishing ${count} pick(s) (isPublished=false; no other column touched, no row removed)`;
}

/** The only path to mode "execute" is args.execute === true. */
export function planAdjudication(args: Pick<AdjudicateArgs, "execute">, ids: readonly string[]): AdjudicationPlan {
  const list = [...ids];
  if (args.execute) return { mode: "execute", ids: list, headline: executeHeadline(list.length) };
  return { mode: "dry-run", ids: list, headline: dryRunHeadline(list.length) };
}
