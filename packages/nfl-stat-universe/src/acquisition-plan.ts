/**
 * NFL STAT UNIVERSE — portfolio-driven acquisition plan (pure, testable).
 *
 * The operational core behind `npm run galileo:plan`. Given a portfolio name, a budget, and the
 * candidate set, it ACTUALLY constrains everything to that portfolio: the candidates it prices, the
 * keys it requires, the fact classes it unlocks, and the decision states it can catalogue. It validates
 * its inputs (unknown portfolio / bad budget → a nonzero exit code) and reads no environment or network.
 * The CLI is a thin wrapper that checks key PRESENCE and formats this result.
 */

import {
  type BudgetCandidate,
  type BudgetPlan,
  type FactType,
  type FactClass,
  factClassOf,
  planApiBudget,
} from "@sports/data-intelligence";
import { type DecisionState, ALL_DECISION_STATES, STAT_CONTRACTS } from "@sports/decision-field-runtime";
import { PROVIDER_PORTFOLIOS, portfolioByName, type ProviderPortfolio } from "./provider-portfolio.js";
import { FACT_SUPPLY_GRAPH } from "./decision-state-matrix.js";

/** Which env key each source needs (presence is checked by the CLI; values are never read). */
export const SOURCE_ENV_KEY: Readonly<Record<string, string>> = {
  the_odds_api: "THE_ODDS_API_KEY",
  sportsgameodds: "SPORTSGAMEODDS_KEY",
  fantasydata: "FANTASYDATA_KEY",
  sportsdataio: "SPORTSDATAIO_KEY",
  sportradar: "SPORTRADAR_KEY",
  yahoo_oauth: "YAHOO_CLIENT_ID",
};

/** Yahoo is a consented user feed — optional; the licensed market/projection feeds are required. */
const OPTIONAL_KEY_SOURCES = new Set(["yahoo_oauth"]);

export interface AcquisitionPlanInput {
  readonly portfolioName: string;
  readonly budget: number;
  readonly candidates: readonly BudgetCandidate[];
}

export interface AcquisitionPlanError {
  readonly ok: false;
  readonly exitCode: number;
  readonly error: string;
}

export interface AcquisitionPlanReport {
  readonly ok: true;
  readonly exitCode: 0;
  readonly portfolio: ProviderPortfolio;
  readonly candidateSourceIds: readonly string[];
  readonly requiredKeys: readonly string[];
  readonly optionalKeys: readonly string[];
  readonly budget: BudgetPlan;
  readonly factClassesUnlocked: readonly FactClass[];
  readonly decisionStatesCatalogued: readonly DecisionState[];
  readonly note: string;
}

export type AcquisitionPlanResult = AcquisitionPlanError | AcquisitionPlanReport;

/** Resolve a portfolio by exact name, slug, or substring (deterministic, first match by declared order). */
export function resolvePortfolio(name: string): ProviderPortfolio | undefined {
  const exact = portfolioByName(name);
  if (exact) return exact;
  const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = norm(name);
  return (
    PROVIDER_PORTFOLIOS.find((p) => norm(p.name) === target) ??
    PROVIDER_PORTFOLIOS.find((p) => norm(p.name).includes(target) && target.length >= 3)
  );
}

/** Build the portfolio-scoped acquisition plan. Pure: no env, no network, no spend. */
export function buildAcquisitionPlan(input: AcquisitionPlanInput): AcquisitionPlanResult {
  if (!Number.isFinite(input.budget) || input.budget < 0) {
    return { ok: false, exitCode: 2, error: `Invalid budget "${input.budget}" — must be a finite number ≥ 0.` };
  }
  const portfolio = resolvePortfolio(input.portfolioName);
  if (!portfolio) {
    return { ok: false, exitCode: 2, error: `Unknown portfolio "${input.portfolioName}". Known: ${PROVIDER_PORTFOLIOS.map((p) => p.name).join(", ")}.` };
  }

  const inPortfolio = new Set(portfolio.sourceIds);
  // Constrain the candidate set to the portfolio — this is the real filter, not a label.
  const candidates = input.candidates.filter((c) => inPortfolio.has(c.sourceId));
  const budget = planApiBudget(candidates, input.budget);

  // Keys derived from the portfolio's sources (required vs optional).
  const keyedSources = portfolio.sourceIds.filter((s) => SOURCE_ENV_KEY[s]);
  const requiredKeys = [...new Set(keyedSources.filter((s) => !OPTIONAL_KEY_SOURCES.has(s)).map((s) => SOURCE_ENV_KEY[s]!))];
  const optionalKeys = [...new Set(keyedSources.filter((s) => OPTIONAL_KEY_SOURCES.has(s)).map((s) => SOURCE_ENV_KEY[s]!))];

  // Facts/classes/states the portfolio's sources could supply (catalogued — not live).
  const factsInPortfolio = new Set<FactType>(FACT_SUPPLY_GRAPH.filter((p) => inPortfolio.has(p.sourceId)).map((p) => p.factType));
  const factClassesUnlocked = [...new Set([...factsInPortfolio].map(factClassOf))].sort();
  const decisionStatesCatalogued = ALL_DECISION_STATES.filter((s) =>
    STAT_CONTRACTS[s].requiredGroups.every((g) => g.anyOf.some((f) => factsInPortfolio.has(f))),
  );

  return {
    ok: true,
    exitCode: 0,
    portfolio,
    candidateSourceIds: candidates.map((c) => c.sourceId),
    requiredKeys,
    optionalKeys,
    budget,
    factClassesUnlocked,
    decisionStatesCatalogued,
    note: `${portfolio.name} (${portfolio.tier}) — ${candidates.length} candidate(s) in scope; ${decisionStatesCatalogued.length}/${ALL_DECISION_STATES.length} decision states catalogue-able.`,
  };
}
