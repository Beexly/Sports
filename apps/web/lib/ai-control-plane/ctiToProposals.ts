/**
 * LSRQC KERNEL v1 — ON-POLICY proposal emitter + predicate-key wiring +
 * anti-staleness rescore (closed self-refinement loop, on top of the
 * CTI-candidate miner + the versioned SrqcVersion envelope).
 *
 * WHAT THIS IS. `emitProposalsFromOpenCtis` turns open `cti_candidate` rows
 * (each a proof-forbidden abstract transition `{before, action, after}` mined
 * one step from an IndInv violation) into `ind_inv_proposal` rows — HINDSIGHT
 * SKILLS proposing to STRENGTHEN the currently-active certificate so it forbids
 * that `(before, action)` pair. Each proposal carries executable
 * `predicateKeys` and, when observed windows are supplied, ranking statistics
 * (`strength`/`support`/`variance`) from the pure `multiWindowStats`.
 *
 * ON-POLICY GATE (do not remove). A proposal is a strengthening of the CURRENT
 * certificate, so it can only be minted against a LIVE active baseline. If
 * `getActiveSrqcVersion` returns null, this emits ZERO proposals and returns 0.
 * `activeVersionAtMint` stamps which baseline each proposal was minted against.
 *
 * POSTURE (do not let this drift): PROPOSAL / RANKING INPUT ONLY. This writes
 * ONLY `ind_inv_proposal` rows. It NEVER edits a `.tla` file, NEVER calls
 * `activateSrqcVersion`, and changes NO control-plane decision. Only the
 * explicit human/script `acceptProposalAndActivate` flow flips a version.
 *
 * IDEMPOTENCY. Each proposal carries a `sourceWindowHash` = sha256 over
 * canonical(before)|action|canonical(after), and the table has a UNIQUE
 * (sourceWindowHash, activeVersionAtMint). The INSERT is `ON CONFLICT DO
 * NOTHING RETURNING id`, and only rows actually inserted are counted.
 */

import { createHash } from "node:crypto";

import type { ControlSqlClient } from "./control-store";
import { getActiveSrqcVersion } from "./formal-incident";
import type { AbstractControlState } from "./srqc-projection";
import { multiWindowStats } from "./violation-delta";
import type { IndInvPred } from "./violation-delta";

/** The skill class of a minted proposal. */
export type SkillKind = "workflow" | "failure_avoidance" | "strengthen";

interface OpenCtiRow {
  readonly id: string;
  readonly before: unknown;
  readonly action: string;
  readonly after: unknown;
}

/** Read defensively from an unknown JSONB value into an abstract state (or
 *  null when the shape is not recognizable). */
function toAbstractState(value: unknown): AbstractControlState | null {
  if (value === null || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  const {
    invocationId,
    claimPhase,
    exposurePhase,
    pendingCountClass,
    fingerprintBound,
    hasRejectedFp,
  } = s;
  if (
    typeof invocationId !== "string" ||
    typeof claimPhase !== "string" ||
    typeof exposurePhase !== "string" ||
    typeof pendingCountClass !== "string" ||
    typeof fingerprintBound !== "boolean" ||
    typeof hasRejectedFp !== "boolean"
  ) {
    return null;
  }
  return {
    invocationId,
    claimPhase: claimPhase as AbstractControlState["claimPhase"],
    exposurePhase: exposurePhase as AbstractControlState["exposurePhase"],
    pendingCountClass:
      pendingCountClass as AbstractControlState["pendingCountClass"],
    fingerprintBound,
    hasRejectedFp,
  };
}

/**
 * The executable IndInv keys a CTI's forbidden successor implies:
 *   - a GE2 successor              ⇒ ["GE2_FORBIDDEN"]
 *   - a rejected-unbound successor ⇒ ["REJECTED_IMPLIES_BOUND"]
 *   - anything else                ⇒ ["STRENGTHEN_GENERIC"] (advisory)
 */
export function predicateKeysForCti(after: AbstractControlState): string[] {
  if (after.pendingCountClass === "GE2") return ["GE2_FORBIDDEN"];
  if (after.hasRejectedFp && !after.fingerprintBound) {
    return ["REJECTED_IMPLIES_BOUND"];
  }
  return ["STRENGTHEN_GENERIC"];
}

/**
 * Map executable predicate keys to the concrete STRENGTHENED IndInv conjuncts
 * they add on TOP of the baseline (each flags near-miss states the baseline
 * allows). STRENGTHEN_GENERIC is purely advisory and contributes no predicate.
 *   - GE2_FORBIDDEN          forbids an OPEN state one StartPending from GE2
 *                            (claim OPEN with exactly ONE pending).
 *   - REJECTED_IMPLIES_BOUND strengthens to forbid ANY rejected fingerprint,
 *                            not merely an unbound one.
 */
export function predsFromKeys(keys: readonly string[]): IndInvPred[] {
  const preds: IndInvPred[] = [];
  for (const key of keys) {
    if (key === "GE2_FORBIDDEN") {
      preds.push(
        (s) => !(s.claimPhase === "OPEN" && s.pendingCountClass === "ONE"),
      );
    } else if (key === "REJECTED_IMPLIES_BOUND") {
      preds.push((s) => !s.hasRejectedFp);
    }
    // STRENGTHEN_GENERIC → no extra predicate (advisory only).
  }
  return preds;
}

/** The skill class implied by a CTI's forbidden successor: a GE2 (money-safety)
 *  reach is a failure to avoid; anything else is a generic strengthening. */
export function skillKindFromCti(after: AbstractControlState): SkillKind {
  return after.pendingCountClass === "GE2" ? "failure_avoidance" : "strengthen";
}

/** Fixed-field canonical serialization of a projected abstract state — the SAME
 *  idea cti-miner.ts uses so the derived window hash is stable across runs and
 *  independent of JSONB key order. */
function canonicalState(value: unknown): string {
  const s = (value ?? {}) as Record<string, unknown>;
  return JSON.stringify([
    s["invocationId"] ?? null,
    s["claimPhase"] ?? null,
    s["exposurePhase"] ?? null,
    s["pendingCountClass"] ?? null,
    s["fingerprintBound"] ?? null,
    s["hasRejectedFp"] ?? null,
  ]);
}

/** sha256 over canonical(before)|action|canonical(after). */
function sourceWindowHash(row: OpenCtiRow): string {
  return createHash("sha256")
    .update(canonicalState(row.before))
    .update("|")
    .update(row.action)
    .update("|")
    .update(canonicalState(row.after))
    .digest("hex");
}

/**
 * Emit one ON-POLICY `ind_inv_proposal` per open `cti_candidate`, minted
 * against the active certificate baseline. Returns the number of NEW proposals
 * inserted (idempotent — a re-run mints zero). Returns 0 with no writes when no
 * certificate is active (the on-policy gate).
 *
 * When `windows` (recent projected abstract-state windows) is supplied, each
 * proposal's ranking stats (`strength`/`support`/`variance`) are computed via
 * the pure `multiWindowStats` under the proposal's own strengthened predicates;
 * otherwise they default to 0 and can be filled later by `rescoreOpenProposals`.
 */
export async function emitProposalsFromOpenCtis(
  sql: ControlSqlClient,
  windows?: readonly (readonly AbstractControlState[])[],
): Promise<number> {
  const active = await getActiveSrqcVersion(sql);
  if (active === null) {
    // On-policy gate: with no active baseline there is nothing to strengthen.
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        kind: "srqc_proposal_skip",
        reason: "no_active_srqc_version",
        at: new Date().toISOString(),
      }),
    );
    return 0;
  }

  const openCandidates = await sql.query<OpenCtiRow>(
    `SELECT "id", "before", "action", "after"
       FROM "cti_candidate"
      WHERE "status" = 'open'
      ORDER BY "createdAt" ASC`,
    [],
  );

  let inserted = 0;
  for (const candidate of openCandidates) {
    const after =
      toAbstractState(candidate.after) ??
      // Fall back to a benign shape so key/skill derivation is total; a
      // malformed row still mints an advisory proposal.
      ({
        invocationId: "",
        claimPhase: "OPEN",
        exposurePhase: "NONE",
        pendingCountClass: "ZERO",
        fingerprintBound: true,
        hasRejectedFp: false,
      } as AbstractControlState);

    const keys = predicateKeysForCti(after);
    const skillKind = skillKindFromCti(after);
    const stats =
      windows !== undefined
        ? multiWindowStats(windows, predsFromKeys(keys))
        : { strength: 0, support: 0, variance: 0 };

    const windowHash = sourceWindowHash(candidate);
    const predicateText =
      `Strengthen IndInv v${active.version}: forbid abstract action ` +
      `${candidate.action} out of state ${JSON.stringify(candidate.before)} — ` +
      `it reaches forbidden successor ${JSON.stringify(candidate.after)}.`;

    const rows = await sql.query<{ id: string }>(
      `INSERT INTO "ind_inv_proposal"
         ("id", "ctiCandidateIds", "predicateKeys", "proposedPredicateText",
          "skillKind", "sourceWindowHash", "activeVersionAtMint",
          "strength", "support", "variance", "status")
       VALUES (gen_random_uuid()::text, $1::text[], $2::text[], $3, $4, $5, $6,
               $7, $8, $9, 'open')
       ON CONFLICT ("sourceWindowHash", "activeVersionAtMint") DO NOTHING
       RETURNING "id"`,
      [
        [candidate.id],
        keys,
        predicateText,
        skillKind,
        windowHash,
        active.version,
        stats.strength,
        stats.support,
        stats.variance,
      ],
    );
    if (rows.length > 0) inserted += 1;
  }

  return inserted;
}

interface OpenProposalRow {
  readonly id: string;
  readonly predicateKeys: string[];
  readonly activeVersionAtMint: number;
}

/**
 * PROP3 ANTI-STALENESS RESCORE. For each OPEN proposal, recompute its ranking
 * stats (`strength`/`support`/`variance`) under CURRENT traffic `windows` and
 * UPDATE the row (also bumps `updatedAt`). Returns the number of proposals
 * rescored.
 *
 * ██ Ranking consumers MUST prefer proposals whose `activeVersionAtMint ===
 * currentVersion`. ██ A proposal minted under an OLDER certificate generation
 * has a STALE rank (Prop3): its strengthening may already be subsumed or
 * irrelevant under the current certificate. This function does NOT delete or
 * auto-reject stale proposals — it only rescores them and leaves the
 * version-staleness for the ranking consumer to weigh (a `srqc_rescore_stale`
 * note is logged per stale proposal).
 */
export async function rescoreOpenProposals(
  sql: ControlSqlClient,
  windows: readonly (readonly AbstractControlState[])[],
  currentVersion: number,
): Promise<number> {
  const proposals = await sql.query<OpenProposalRow>(
    `SELECT "id", "predicateKeys", "activeVersionAtMint"
       FROM "ind_inv_proposal"
      WHERE "status" = 'open'`,
    [],
  );

  let rescored = 0;
  for (const p of proposals) {
    const keys = Array.isArray(p.predicateKeys) ? p.predicateKeys : [];
    const stats = multiWindowStats(windows, predsFromKeys(keys));
    await sql.query(
      `UPDATE "ind_inv_proposal"
          SET "strength" = $2, "support" = $3, "variance" = $4,
              "updatedAt" = now()
        WHERE "id" = $1`,
      [p.id, stats.strength, stats.support, stats.variance],
    );
    rescored += 1;
    if (p.activeVersionAtMint !== currentVersion) {
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          kind: "srqc_rescore_stale",
          proposalId: p.id,
          activeVersionAtMint: p.activeVersionAtMint,
          currentVersion,
          at: new Date().toISOString(),
        }),
      );
    }
  }
  return rescored;
}
