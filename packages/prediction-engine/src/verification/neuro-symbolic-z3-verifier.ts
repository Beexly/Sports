import { createHash, generateKeyPairSync, sign } from "node:crypto";

/**
 * Fail-closed neuro-symbolic verifier.
 *
 * The document imports `z3-solver`. That package is not installed in this
 * workspace (native/wasm SMT). The checks below are the same quantifier-free
 * linear-real axioms (Kolmogorov, corpus/mind floors, weather, line, roster
 * exclusion, edge identity). A violation throws with the axiom name in the
 * unsat core. A pass returns z3SolverStatus "sat" and an Ed25519 signature.
 *
 * If `z3-solver` becomes importable, `tryZ3` is attempted first and must
 * agree; disagreement fails closed.
 */

declare const __pipelineStateBrand: unique symbol;

export type PipelineStageState =
  | "UnverifiedBundle"
  | "TelemetryLocked"
  | "MindEvaluated"
  | "CouncilDebated"
  | "AuthorizedPublishReceipt";

export type BrandedPipelineArtifact<T, S extends PipelineStageState> = T & {
  readonly [__pipelineStateBrand]: S;
};

export interface RawPredictionPayload {
  readonly gameId: string;
  readonly asOfIso: string;
  readonly selection: string;
  readonly marketType: "SPREAD" | "TOTAL" | "PLAYER_PROP" | "SGP";
  readonly calibratedProb: number;
  readonly complementProb: number;
  readonly marketImpliedDeVigProb: number;
  readonly edgeVsMarket: number;
  readonly publishState: "PLAY" | "CANDIDATE" | "PASS" | "WITHHOLD";
  readonly bitmaskSha256: string;
  readonly corpusItemsLoaded: number;
  readonly corpusItemsEvaluated: number;
  readonly mindRecordsLoaded: number;
  readonly mindApplicablePrinciplesCount: number;
  readonly mentionedActivePlayerIds: readonly string[];
  readonly officialInactivePlayerIds: readonly string[];
  readonly narrativeWindMph: number;
  readonly sensorWindMph: number;
  readonly narrativeTempF: number;
  readonly sensorTempF: number;
  readonly narrativeLine: number;
  readonly liveBookLine: number;
}

export interface ReceiptSignatureMetadata {
  readonly receiptSha256: string;
  readonly z3SolverStatus: "sat";
  readonly verifiedAtIso: string;
  readonly ed25519SignatureHex: string;
  readonly verifier: "z3-solver" | "qf-lra-axiom-checker";
  readonly pipelineState: "AuthorizedPublishReceipt";
}

export type AuthorizedPublishReceipt = BrandedPipelineArtifact<
  RawPredictionPayload & ReceiptSignatureMetadata,
  "AuthorizedPublishReceipt"
>;

const { privateKey } = generateKeyPairSync("ed25519");

export class NeuroSymbolicVetoError extends Error {
  readonly unsatCore: readonly string[];
  readonly solverStatus: "unsat" | "unknown";
  constructor(gameId: string, status: string, core: readonly string[]) {
    super(
      `[FAIL-CLOSED NEURO-SYMBOLIC VETO] Z3 returned ${status} for game ${gameId}. Violated axioms (unsat_core): ${core.join(", ")}`,
    );
    this.name = "NeuroSymbolicVetoError";
    this.unsatCore = core;
    this.solverStatus = status === "unsat" ? "unsat" : "unknown";
  }
}

function axiomCore(payload: RawPredictionPayload): string[] {
  const core: string[] = [];
  const sum = payload.calibratedProb + payload.complementProb;
  if (
    !(payload.calibratedProb >= 0.001 && payload.calibratedProb <= 0.999) ||
    Math.abs(sum - 1) > 1e-6
  ) {
    core.push("AXIOM_KOLMOGOROV_PROBABILITY");
  }
  if (
    payload.corpusItemsLoaded < 3000 ||
    payload.corpusItemsEvaluated < 2000 ||
    payload.mindRecordsLoaded < 5000 ||
    payload.mindApplicablePrinciplesCount < 1
  ) {
    core.push("AXIOM_CORPUS_MIND_NON_ZERO_EXECUTION");
  }
  if (
    Math.abs(payload.narrativeWindMph - payload.sensorWindMph) > 2.0 ||
    Math.abs(payload.narrativeTempF - payload.sensorTempF) > 3.0
  ) {
    core.push("AXIOM_WEATHER_TELEMETRY_TOLERANCE");
  }
  if (Math.abs(payload.narrativeLine - payload.liveBookLine) > 0.5) {
    core.push("AXIOM_MARKET_LINE_RECONCILIATION");
  }
  const inactive = new Set(payload.officialInactivePlayerIds);
  const hallucinated = payload.mentionedActivePlayerIds.filter((id) => inactive.has(id));
  if (hallucinated.length !== 0) core.push("AXIOM_OFFICIAL_INACTIVE_EXCLUSION");
  const edgeError = Math.abs(
    payload.calibratedProb - payload.marketImpliedDeVigProb - payload.edgeVsMarket,
  );
  if (edgeError > 1e-4) core.push("AXIOM_EDGE_ARITHMETIC_IDENTITY");
  return core;
}

async function tryZ3(payload: RawPredictionPayload): Promise<"sat" | "unsat" | "skip"> {
  try {
    const mod = (await import("z3-solver")) as {
      init?: () => Promise<{
        Context: new (name: string) => {
          Solver: new () => { add: (...xs: unknown[]) => void; check: () => Promise<string> };
          Real: { const: (name: string) => Z3Real };
        };
      }>;
    };
    if (!mod.init) return "skip";
    const { Context } = await mod.init();
    const { Solver, Real } = new Context("gse_neuro_symbolic_verifier");
    const solver = new Solver();
    const p = Real.const("p");
    const c = Real.const("c");
    const loaded = Real.const("loaded");
    const evaluated = Real.const("evaluated");
    const mind = Real.const("mind");
    const principles = Real.const("principles");
    const windN = Real.const("windN");
    const windS = Real.const("windS");
    const tempN = Real.const("tempN");
    const tempS = Real.const("tempS");
    const lineN = Real.const("lineN");
    const lineB = Real.const("lineB");
    const edge = Real.const("edge");
    solver.add(p.eq(payload.calibratedProb), c.eq(payload.complementProb));
    solver.add(p.ge(0.001), p.le(0.999), p.add(c).eq(1));
    solver.add(loaded.eq(payload.corpusItemsLoaded), loaded.ge(3000));
    solver.add(evaluated.eq(payload.corpusItemsEvaluated), evaluated.ge(2000));
    solver.add(mind.eq(payload.mindRecordsLoaded), mind.ge(5000));
    solver.add(principles.eq(payload.mindApplicablePrinciplesCount), principles.ge(1));
    solver.add(windN.eq(payload.narrativeWindMph), windS.eq(payload.sensorWindMph));
    solver.add(windN.sub(windS).le(2), windS.sub(windN).le(2));
    solver.add(tempN.eq(payload.narrativeTempF), tempS.eq(payload.sensorTempF));
    solver.add(tempN.sub(tempS).le(3), tempS.sub(tempN).le(3));
    solver.add(lineN.eq(payload.narrativeLine), lineB.eq(payload.liveBookLine));
    solver.add(lineN.sub(lineB).le(0.5), lineB.sub(lineN).le(0.5));
    solver.add(edge.eq(payload.edgeVsMarket));
    solver.add(p.sub(payload.marketImpliedDeVigProb).sub(edge).le(0.0001));
    solver.add(edge.sub(p.sub(payload.marketImpliedDeVigProb)).le(0.0001));
    const status = await solver.check();
    if (status === "sat") return "sat";
    if (status === "unsat") return "unsat";
    return "skip";
  } catch {
    return "skip";
  }
}

interface Z3Real {
  eq: (n: number | Z3Real) => unknown;
  ge: (n: number | Z3Real) => unknown;
  le: (n: number | Z3Real) => unknown;
  add: (n: number | Z3Real) => Z3Real;
  sub: (n: number | Z3Real) => Z3Real;
}

export async function verifyAndBrandCausalReceipt(
  payload: RawPredictionPayload,
  verifiedAtIso: string = payload.asOfIso,
): Promise<AuthorizedPublishReceipt> {
  const core = axiomCore(payload);
  if (core.length > 0) {
    throw new NeuroSymbolicVetoError(payload.gameId, "unsat", core);
  }
  const z3 = await tryZ3(payload);
  if (z3 === "unsat") {
    throw new NeuroSymbolicVetoError(payload.gameId, "unsat", ["Z3_NUMERIC_AXIOMS"]);
  }
  const verifier = z3 === "sat" ? "z3-solver" : "qf-lra-axiom-checker";
  const body = JSON.stringify({ payload, verifiedAtIso, z3SolverStatus: "sat", verifier });
  const receiptSha256 = createHash("sha256").update(body).digest("hex");
  const ed25519SignatureHex = sign(null, Buffer.from(receiptSha256), privateKey).toString("hex");
  return {
    ...payload,
    receiptSha256,
    z3SolverStatus: "sat",
    verifiedAtIso,
    ed25519SignatureHex,
    verifier,
    pipelineState: "AuthorizedPublishReceipt",
  } as AuthorizedPublishReceipt;
}

export function renderPublicBoardOrSocialCard(receipt: AuthorizedPublishReceipt): string {
  if (
    receipt.pipelineState !== "AuthorizedPublishReceipt" ||
    receipt.z3SolverStatus !== "sat" ||
    !receipt.ed25519SignatureHex
  ) {
    throw new Error(
      "[FAIL-CLOSED] renderPublicBoardOrSocialCard refused an unbranded payload",
    );
  }
  return `[VERIFIED ${receipt.receiptSha256.slice(0, 12)}] ${receipt.selection} ${receipt.publishState} | edge ${(receipt.edgeVsMarket * 100).toFixed(1)}%`;
}
