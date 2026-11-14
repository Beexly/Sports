/**
 * Galaxy Sports Edge — Unit & Property Test Suite
 * Verifies:
 * 1. Shin (1991, 1993) de-vigging accuracy, favorite-longshot bias direction, & invalid odds guards.
 * 2. Empirical NFL SGP correlation matrix anchors (+0.48, +0.42, +0.36, -0.22, -0.38) & PSD repair.
 * 3. Bivariate & Multivariate (2..5 leg) Student-t4 (df=4) + Gaussian Copula joint probabilities
 *    and seeded Monte Carlo cross-validation + JSON export for scipy.stats golden comparison.
 * 4. StoreCreditLedgerService idempotent <= 0.00u post-settlement 100% Store-Credit minting,
 *    break-even (0.00u) edge cases, Stripe gateway idempotency, and $35 All-Access Upgrade Bridge.
 * 5. Public UI compliance guardrails & Pre-Kickoff SHA-256 Commitment Receipt verification.
 */

import * as assert from 'assert';
import {
  ALL_ACCESS_UPGRADE_BRIDGE_CENTS,
  FOUNDING_ALL_ACCESS_MONTHLY_CENTS,
  InMemoryStoreCreditRepository,
  StoreCreditLedgerService,
  americanToDecimal,
  createPreKickoffCommitmentReceipt,
  decimalToAmerican,
  devigSgpLegAmerican,
  ensurePositiveDefiniteCorrelation,
  evaluateParlayMri,
  formatIntegerConviction,
  lookupPairwiseFootballRho,
  scanPublicUiCompliance,
  shinDevigDecimalOdds,
  simulateStudentT4CopulaMonteCarlo,
  studentT4Cdf,
  studentT4Quantile,
  studentT4UpperTailDependence,
  verifyPreKickoffCommitmentReceipt,
  type Door2PackPurchase,
  type OfficialGradedPlay,
  type SgpLegInput,
} from './parlay_mri_and_store_credit';

interface TestResultSummary {
  passed: number;
  assertions: number;
  scipyVectors: Array<{
    name: string;
    marginals: number[];
    psdMatrix: number[][];
    tsGaussianProb: number;
    tsStudentT4Prob: number;
    tsMonteCarloT4Prob: number;
    hiddenHoldPct: number;
  }>;
}

let assertionCount = 0;
function check(condition: boolean, message: string): void {
  assertionCount += 1;
  assert.strictEqual(condition, true, message);
}

function approxEqual(actual: number, expected: number, tol: number, label: string): void {
  assertionCount += 1;
  const diff = Math.abs(actual - expected);
  if (diff > tol || Number.isNaN(actual)) {
    throw new Error(`${label}: expected ${expected} +/- ${tol}, got ${actual} (diff=${diff})`);
  }
}

export async function runAllSuiteTests(): Promise<TestResultSummary> {
  let passedTests = 0;
  const scipyVectors: TestResultSummary['scipyVectors'] = [];

  // -------------------------------------------------------------------------
  // TEST 1: Odds conversion & Shin de-vigging (including PR #448 guards)
  // -------------------------------------------------------------------------
  {
    approxEqual(americanToDecimal(-110), 1 + 100 / 110, 1e-12, '-110 to decimal');
    approxEqual(americanToDecimal(145), 2.45, 1e-12, '+145 to decimal');
    assert.strictEqual(decimalToAmerican(5.25), 425);
    assert.strictEqual(decimalToAmerican(1 + 100 / 110), -110);

    assert.throws(() => americanToDecimal(0), RangeError);
    assert.throws(() => americanToDecimal(-50), RangeError);
    assert.throws(() => americanToDecimal(99), RangeError);
    assert.throws(() => shinDevigDecimalOdds([1.0, 2.0]), RangeError);
    assert.throws(() => shinDevigDecimalOdds([0.85, 2.1]), RangeError);

    const sym = devigSgpLegAmerican(-110, -110);
    approxEqual(sym.shinFairProb, 0.5, 1e-12, '-110/-110 Shin fair prob');
    check(sym.shinZ > 0 && sym.shinZ < 0.1, 'Shin z in (0, 0.1) on -110/-110');

    const singleMinus110 = devigSgpLegAmerican(-110);
    approxEqual(singleMinus110.shinFairProb, 0.5, 1e-6, 'Single -110 default Shin fair prob');

    const dLong = americanToDecimal(145);
    const dFav = americanToDecimal(-175);
    const asym = shinDevigDecimalOdds([dLong, dFav]);
    approxEqual(
      asym.fairProbabilities[0]! + asym.fairProbabilities[1]!,
      1.0,
      1e-12,
      'Shin probabilities sum to 1',
    );
    const multLong = (1 / dLong) / (1 / dLong + 1 / dFav);
    check(
      asym.fairProbabilities[0]! < multLong,
      'Shin assigns lower fair prob to +145 longshot than multiplicative normalization',
    );

    const zeroVig = shinDevigDecimalOdds([2.0, 2.0]);
    assert.strictEqual(zeroVig.methodUsed, 'multiplicative_fallback');
    approxEqual(zeroVig.fairProbabilities[0]!, 0.5, 1e-12, 'Zero-vig fallback');
    passedTests += 1;
  }

  // -------------------------------------------------------------------------
  // TEST 2: Empirical NFL SGP Correlation Matrix Anchors & PSD Repair
  // -------------------------------------------------------------------------
  {
    const qbPassYds: SgpLegInput = {
      legId: '1',
      label: 'QB Pass Yds Over',
      archetype: 'QB_PASS_YDS_OVER',
      teamSide: 'HOME',
      americanOdds: -110,
    };
    const wr1RecYds: SgpLegInput = {
      legId: '2',
      label: 'WR1 Rec Yds Over',
      archetype: 'WR1_REC_YDS_OVER',
      teamSide: 'HOME',
      americanOdds: -110,
    };
    const qbPassTds: SgpLegInput = {
      legId: '3',
      label: 'QB Pass TDs Over',
      archetype: 'QB_PASS_TDS_OVER',
      teamSide: 'HOME',
      americanOdds: 135,
    };
    const teamOver: SgpLegInput = {
      legId: '4',
      label: 'Team Total Over',
      archetype: 'TEAM_TOTAL_OVER',
      teamSide: 'HOME',
      americanOdds: -110,
    };
    const rb1RushAtt: SgpLegInput = {
      legId: '5',
      label: 'RB1 Rush Attempts Over',
      archetype: 'RB1_RUSH_ATT_OVER',
      teamSide: 'HOME',
      americanOdds: -115,
    };
    const favSpread: SgpLegInput = {
      legId: '6',
      label: 'Team Favorite Spread',
      archetype: 'TEAM_FAV_SPREAD',
      teamSide: 'HOME',
      americanOdds: -110,
    };
    const rb1TdIn5: SgpLegInput = {
      legId: '7',
      label: 'RB1 Rush TD Inside 5',
      archetype: 'RB1_RUSH_TD_INSIDE_5',
      teamSide: 'HOME',
      americanOdds: 125,
    };
    const qbTdIn5: SgpLegInput = {
      legId: '8',
      label: 'QB Pass TD Inside 5',
      archetype: 'QB_PASS_TD_INSIDE_5',
      teamSide: 'HOME',
      americanOdds: 145,
    };
    const gameUnder: SgpLegInput = {
      legId: '9',
      label: 'Game Total Under',
      archetype: 'GAME_TOTAL_UNDER',
      teamSide: 'GAME',
      americanOdds: -110,
    };

    assert.strictEqual(lookupPairwiseFootballRho(qbPassYds, wr1RecYds), 0.48);
    assert.strictEqual(lookupPairwiseFootballRho(qbPassTds, teamOver), 0.42);
    assert.strictEqual(lookupPairwiseFootballRho(rb1RushAtt, favSpread), 0.36);
    assert.strictEqual(lookupPairwiseFootballRho(rb1TdIn5, qbTdIn5), -0.22);
    assert.strictEqual(lookupPairwiseFootballRho(gameUnder, qbPassYds), -0.38);

    const brokenMatrix = [
      [1.0, 0.9, 0.9],
      [0.9, 1.0, -0.9],
      [0.9, -0.9, 1.0],
    ];
    const repaired = ensurePositiveDefiniteCorrelation(brokenMatrix);
    check(repaired.projected === true, 'Non-PSD matrix flagged as projected');
    for (let i = 0; i < 3; i += 1) {
      approxEqual(repaired.matrix[i]![i]!, 1.0, 1e-12, `Repaired diagonal [${i}]`);
      check(repaired.cholesky[i]![i]! > 0, `Cholesky diagonal [${i}] strictly positive`);
    }
    passedTests += 1;
  }

  // -------------------------------------------------------------------------
  // TEST 3: Univariate Student-t4 Closed-Form & Multivariate 2..5 Leg Copulas
  // -------------------------------------------------------------------------
  {
    for (const p of [0.05, 0.15, 0.32, 0.5, 0.73, 0.92, 0.98]) {
      const q = studentT4Quantile(p);
      approxEqual(studentT4Cdf(q), p, 1e-12, `Student-t4 CDF(Quantile(${p})) inversion`);
    }

    const tdNeg = studentT4UpperTailDependence(-0.22);
    const tdZero = studentT4UpperTailDependence(0.0);
    const tdPos = studentT4UpperTailDependence(0.48);
    check(tdNeg < tdZero && tdZero < tdPos, 'Student-t4 upper tail dependence increases with rho');
    approxEqual(tdPos, 0.24236011723, 1e-9, 'Exact Student-t4 lambda_U at rho=+0.48');

    // Scenario A: 2-leg Positive Stack (QB Pass Yds + WR1 Rec Yds, rho=+0.48)
    const mri2Pos = evaluateParlayMri({
      legs: [
        { legId: 'l1', label: 'QB Pass Yds Over 254.5', archetype: 'QB_PASS_YDS_OVER', teamSide: 'HOME', americanOdds: -110 },
        { legId: 'l2', label: 'WR1 Rec Yds Over 74.5', archetype: 'WR1_REC_YDS_OVER', teamSide: 'HOME', americanOdds: -110 },
      ],
      quotedSgpAmericanOdds: 140,
    });
    check(
      mri2Pos.studentT4CopulaProb > mri2Pos.naiveIndependentProb,
      'Positive correlation lifts joint probability above naive independent product',
    );
    check(
      mri2Pos.hiddenCorrelationHoldPct >= 15 && mri2Pos.hiddenCorrelationHoldPct <= 30,
      `2-leg positive stack exposes 15-30% hidden hold (${mri2Pos.hiddenCorrelationHoldPct}%)`,
    );

    scipyVectors.push({
      name: '2_leg_positive_qb_wr1',
      marginals: mri2Pos.legs.map((l) => l.shinFairProb),
      psdMatrix: mri2Pos.correlationMatrixPsd.map((r) => [...r]),
      tsGaussianProb: mri2Pos.gaussianCopulaProb,
      tsStudentT4Prob: mri2Pos.studentT4CopulaProb,
      tsMonteCarloT4Prob: simulateStudentT4CopulaMonteCarlo(
        mri2Pos.legs.map((l) => l.shinFairProb),
        ensurePositiveDefiniteCorrelation(mri2Pos.correlationMatrixPsd).cholesky,
        60000,
      ),
      hiddenHoldPct: mri2Pos.hiddenCorrelationHoldPct,
    });

    // Scenario B: 3-leg Shootout Bring-Back SGP (-110, -110, +145) Quoted at +425
    const mri3Quoted425 = evaluateParlayMri({
      legs: [
        { legId: 's1', label: 'QB Pass Yds Over 262.5', archetype: 'QB_PASS_YDS_OVER', teamSide: 'HOME', americanOdds: -110 },
        { legId: 's2', label: 'WR1 Rec Yds Over 78.5', archetype: 'WR1_REC_YDS_OVER', teamSide: 'HOME', americanOdds: -110 },
        { legId: 's3', label: 'Opp WR1 Alt Rec Yds 80+', archetype: 'OPP_WR1_REC_YDS_OVER', teamSide: 'AWAY', americanOdds: 145 },
      ],
      quotedSgpAmericanOdds: 425,
    });
    const mc3 = simulateStudentT4CopulaMonteCarlo(
      mri3Quoted425.legs.map((l) => l.shinFairProb),
      ensurePositiveDefiniteCorrelation(mri3Quoted425.correlationMatrixPsd).cholesky,
      60000,
    );
    approxEqual(mri3Quoted425.studentT4CopulaProb, mc3, 0.0045, '3-leg Student-t4 QMC vs 60k MC');
    check(
      mri3Quoted425.hiddenCorrelationHoldPct >= 15 && mri3Quoted425.hiddenCorrelationHoldPct <= 30,
      `+425 3-leg SGP hold in 15-30% band (${mri3Quoted425.hiddenCorrelationHoldPct}%)`,
    );
    scipyVectors.push({
      name: '3_leg_sgp_quoted_plus425',
      marginals: mri3Quoted425.legs.map((l) => l.shinFairProb),
      psdMatrix: mri3Quoted425.correlationMatrixPsd.map((r) => [...r]),
      tsGaussianProb: mri3Quoted425.gaussianCopulaProb,
      tsStudentT4Prob: mri3Quoted425.studentT4CopulaProb,
      tsMonteCarloT4Prob: mc3,
      hiddenHoldPct: mri3Quoted425.hiddenCorrelationHoldPct,
    });

    // Scenario C: 3-leg Cannibalistic Negative Trap (Game Under + QB Pass Yds Over + RB1 Inside-5 Rush TD)
    const mri3Trap = evaluateParlayMri({
      legs: [
        { legId: 't1', label: 'Game Total Under 44.5', archetype: 'GAME_TOTAL_UNDER', teamSide: 'GAME', americanOdds: -110 },
        { legId: 't2', label: 'QB Pass Yds Over 259.5', archetype: 'QB_PASS_YDS_OVER', teamSide: 'HOME', americanOdds: -110 },
        { legId: 't3', label: 'RB1 Inside-5 Rush TD', archetype: 'RB1_RUSH_TD_INSIDE_5', teamSide: 'HOME', americanOdds: 135 },
      ],
      quotedSgpAmericanOdds: 575,
    });
    check(
      mri3Trap.studentT4CopulaProb < mri3Trap.naiveIndependentProb,
      'Negative correlation slashes true joint probability below naive product',
    );
    check(
      mri3Trap.hiddenCorrelationHoldPct > 25,
      `Cannibalistic SGP trap exposes severe hold (${mri3Trap.hiddenCorrelationHoldPct}%)`,
    );
    scipyVectors.push({
      name: '3_leg_cannibalistic_trap',
      marginals: mri3Trap.legs.map((l) => l.shinFairProb),
      psdMatrix: mri3Trap.correlationMatrixPsd.map((r) => [...r]),
      tsGaussianProb: mri3Trap.gaussianCopulaProb,
      tsStudentT4Prob: mri3Trap.studentT4CopulaProb,
      tsMonteCarloT4Prob: simulateStudentT4CopulaMonteCarlo(
        mri3Trap.legs.map((l) => l.shinFairProb),
        ensurePositiveDefiniteCorrelation(mri3Trap.correlationMatrixPsd).cholesky,
        60000,
      ),
      hiddenHoldPct: mri3Trap.hiddenCorrelationHoldPct,
    });

    // Scenario D: 4-leg Passing Stack shaded to +350 by sportsbook
    const mri4Stack = evaluateParlayMri({
      legs: [
        { legId: 'q1', label: 'QB Pass Yds Over 255.5', archetype: 'QB_PASS_YDS_OVER', teamSide: 'HOME', americanOdds: -110 },
        { legId: 'q2', label: 'WR1 Rec Yds Over 76.5', archetype: 'WR1_REC_YDS_OVER', teamSide: 'HOME', americanOdds: -110 },
        { legId: 'q3', label: 'QB Pass TDs Over 1.5', archetype: 'QB_PASS_TDS_OVER', teamSide: 'HOME', americanOdds: -115 },
        { legId: 'q4', label: 'Team Total Over 24.5', archetype: 'TEAM_TOTAL_OVER', teamSide: 'HOME', americanOdds: -110 },
      ],
      quotedSgpAmericanOdds: 350,
    });
    check(
      mri4Stack.hiddenCorrelationHoldPct >= 15 && mri4Stack.hiddenCorrelationHoldPct <= 30,
      `4-leg shaded +350 stack hold in 15-30% band (${mri4Stack.hiddenCorrelationHoldPct}%)`,
    );
    scipyVectors.push({
      name: '4_leg_passing_stack_plus350',
      marginals: mri4Stack.legs.map((l) => l.shinFairProb),
      psdMatrix: mri4Stack.correlationMatrixPsd.map((r) => [...r]),
      tsGaussianProb: mri4Stack.gaussianCopulaProb,
      tsStudentT4Prob: mri4Stack.studentT4CopulaProb,
      tsMonteCarloT4Prob: simulateStudentT4CopulaMonteCarlo(
        mri4Stack.legs.map((l) => l.shinFairProb),
        ensurePositiveDefiniteCorrelation(mri4Stack.correlationMatrixPsd).cholesky,
        60000,
      ),
      hiddenHoldPct: mri4Stack.hiddenCorrelationHoldPct,
    });

    // Scenario E: 5-leg Full SGP Stress Test
    const mri5 = evaluateParlayMri({
      legs: [
        { legId: 'f1', label: 'Team Favorite Spread -3.5', archetype: 'TEAM_FAV_SPREAD', teamSide: 'HOME', americanOdds: -110 },
        { legId: 'f2', label: 'RB1 Rush Attempts Over 17.5', archetype: 'RB1_RUSH_ATT_OVER', teamSide: 'HOME', americanOdds: -115 },
        { legId: 'f3', label: 'Team Total Over 24.5', archetype: 'TEAM_TOTAL_OVER', teamSide: 'HOME', americanOdds: -110 },
        { legId: 'f4', label: 'QB Pass TDs Over 1.5', archetype: 'QB_PASS_TDS_OVER', teamSide: 'HOME', americanOdds: -120 },
        { legId: 'f5', label: 'Opp WR1 Rec Yds Over 68.5', archetype: 'OPP_WR1_REC_YDS_OVER', teamSide: 'AWAY', americanOdds: -110 },
      ],
      quotedSgpAmericanOdds: 850,
    });
    const mc5 = simulateStudentT4CopulaMonteCarlo(
      mri5.legs.map((l) => l.shinFairProb),
      ensurePositiveDefiniteCorrelation(mri5.correlationMatrixPsd).cholesky,
      60000,
    );
    approxEqual(mri5.studentT4CopulaProb, mc5, 0.005, '5-leg Student-t4 QMC vs 60k MC');
    scipyVectors.push({
      name: '5_leg_full_script_sgp',
      marginals: mri5.legs.map((l) => l.shinFairProb),
      psdMatrix: mri5.correlationMatrixPsd.map((r) => [...r]),
      tsGaussianProb: mri5.gaussianCopulaProb,
      tsStudentT4Prob: mri5.studentT4CopulaProb,
      tsMonteCarloT4Prob: mc5,
      hiddenHoldPct: mri5.hiddenCorrelationHoldPct,
    });

    assert.throws(
      () =>
        evaluateParlayMri({
          legs: [{ legId: 'only1', label: 'Leg 1', archetype: 'QB_PASS_YDS_OVER', americanOdds: -110 }],
          quotedSgpAmericanOdds: 100,
        }),
      RangeError,
    );
    passedTests += 1;
  }

  // -------------------------------------------------------------------------
  // TEST 4: Store-Credit Ledger Idempotency, <= 0.00u Minting & $35 Bridge
  // -------------------------------------------------------------------------
  {
    const repo = new InMemoryStoreCreditRepository();
    let stripeCreditCalls = 0;
    let stripeDebitCalls = 0;
    const posthogEvents: string[] = [];

    const service = new StoreCreditLedgerService({
      repo,
      stripeGateway: {
        async creditCustomerBalance() {
          stripeCreditCalls += 1;
          return { stripeTransactionId: `cbtxn_credit_${stripeCreditCalls}` };
        },
        async debitCustomerBalance() {
          stripeDebitCalls += 1;
          return { stripeTransactionId: `cbtxn_debit_${stripeDebitCalls}` };
        },
      },
      telemetry: {
        capturePostHogEvent(ev) {
          posthogEvents.push(ev.event);
        },
        captureSentryBreadcrumb() {
          // no-op
        },
      },
      nowFn: () => '2026-11-13T06:00:00.000Z',
    });

    const sundayPurchase: Door2PackPurchase = {
      purchaseId: 'pur_wk10_sun_001',
      customerId: 'cust_garrett_test_1',
      stripeCustomerId: 'cus_stripe_1',
      packId: 'wk10_sunday_360',
      packSku: 'SUNDAY_360_ALIGNED_39',
      weekNumber: 10,
      paidCashCents: 3900,
      redeemedCreditCents: 0,
      storeCreditAligned: true,
      purchasedAtIso: '2026-11-15T14:00:00.000Z',
    };

    const deferred = await service.settlePackPurchase(sundayPurchase, [
      { playId: 'p1', marketLabel: 'Spread A', status: 'WIN', riskUnits: 1, americanOdds: -110 },
      { playId: 'p2', marketLabel: 'Total B', status: 'PENDING', riskUnits: 1, americanOdds: -110 },
    ]);
    assert.strictEqual(deferred.status, 'DEFERRED_PENDING_PLAYS');
    assert.strictEqual(deferred.mintedCents, 0);

    const breakEvenPlays: OfficialGradedPlay[] = [
      { playId: 'p1', marketLabel: 'Play 1', status: 'WIN', riskUnits: 1, americanOdds: 100 },
      { playId: 'p2', marketLabel: 'Play 2', status: 'LOSS', riskUnits: 1, americanOdds: -110 },
      { playId: 'p3', marketLabel: 'Play 3', status: 'PUSH', riskUnits: 1, americanOdds: -110 },
    ];
    const minted = await service.settlePackPurchase(sundayPurchase, breakEvenPlays);
    assert.strictEqual(minted.status, 'MINTED_100_PCT_STORE_CREDIT');
    assert.strictEqual(minted.netUnits, 0);
    assert.strictEqual(minted.mintedCents, 3900);
    assert.strictEqual(minted.customerBalanceCents, 3900);
    assert.strictEqual(stripeCreditCalls, 1);

    const replay1 = await service.settlePackPurchase(sundayPurchase, breakEvenPlays);
    const replay2 = await service.settlePackPurchase(sundayPurchase, breakEvenPlays);
    assert.strictEqual(replay1.status, 'ALREADY_MINTED_IDEMPOTENT');
    assert.strictEqual(replay2.status, 'ALREADY_MINTED_IDEMPOTENT');
    assert.strictEqual(replay2.customerBalanceCents, 3900);
    assert.strictEqual(stripeCreditCalls, 1);

    const bridgeQuote39 = await service.quoteAllAccessUpgradeBridge({
      customerId: 'cust_garrett_test_1',
      activeFoundingMemberCount: 37,
    });
    assert.strictEqual(bridgeQuote39.eligibleForBridge, true);
    assert.strictEqual(bridgeQuote39.foundingSpotLocked, true);
    assert.strictEqual(bridgeQuote39.baseMonthlyCents, FOUNDING_ALL_ACCESS_MONTHLY_CENTS);
    assert.strictEqual(bridgeQuote39.bridgeCreditAppliedCents, ALL_ACCESS_UPGRADE_BRIDGE_CENTS);
    assert.strictEqual(bridgeQuote39.walletCreditConsumedCents, 3500);
    assert.strictEqual(bridgeQuote39.promotionalBridgeTopUpCents, 0);
    assert.strictEqual(bridgeQuote39.firstMonthNetChargeCents, 2499);

    const bridgeExec39 = await service.redeemAllAccessUpgradeBridge({
      customerId: 'cust_garrett_test_1',
      stripeCustomerId: 'cus_stripe_1',
      subscriptionCheckoutId: 'sub_chk_001',
      activeFoundingMemberCount: 37,
    });
    assert.strictEqual(bridgeExec39.remainingStoreCreditCents, 400);
    assert.strictEqual(stripeDebitCalls, 1);

    const bridgeReplay = await service.redeemAllAccessUpgradeBridge({
      customerId: 'cust_garrett_test_1',
      stripeCustomerId: 'cus_stripe_1',
      subscriptionCheckoutId: 'sub_chk_001',
      activeFoundingMemberCount: 37,
    });
    assert.strictEqual(bridgeReplay.alreadyRedeemed, true);
    assert.strictEqual(bridgeReplay.remainingStoreCreditCents, 400);
    assert.strictEqual(stripeDebitCalls, 1);

    const secondBridgeQuote = await service.quoteAllAccessUpgradeBridge({
      customerId: 'cust_garrett_test_1',
      activeFoundingMemberCount: 38,
    });
    assert.strictEqual(secondBridgeQuote.eligibleForBridge, false);

    const tnfPurchase: Door2PackPurchase = {
      purchaseId: 'pur_wk10_tnf_002',
      customerId: 'cust_tnf_2',
      stripeCustomerId: 'cus_stripe_2',
      packId: 'wk10_tnf_wsh_nyg',
      packSku: 'TNF_SHOWDOWN_ALIGNED_29',
      weekNumber: 10,
      paidCashCents: 2900,
      redeemedCreditCents: 0,
      storeCreditAligned: true,
      purchasedAtIso: '2026-11-12T23:00:00.000Z',
    };
    const tnfLoss = await service.settlePackPurchase(tnfPurchase, [
      { playId: 'tnf_1', marketLabel: 'Side 1', status: 'LOSS', riskUnits: 1, americanOdds: -110 },
    ]);
    assert.strictEqual(tnfLoss.mintedCents, 2900);

    const tnfBridge = await service.redeemAllAccessUpgradeBridge({
      customerId: 'cust_tnf_2',
      stripeCustomerId: 'cus_stripe_2',
      subscriptionCheckoutId: 'sub_chk_tnf_2',
      activeFoundingMemberCount: 45,
    });
    assert.strictEqual(tnfBridge.quote.walletCreditConsumedCents, 2900);
    assert.strictEqual(tnfBridge.quote.promotionalBridgeTopUpCents, 600);
    assert.strictEqual(tnfBridge.quote.firstMonthNetChargeCents, 2499);
    assert.strictEqual(tnfBridge.remainingStoreCreditCents, 0);

    const profEval = await service.settlePackPurchase(
      { ...tnfPurchase, purchaseId: 'pur_prof_3', customerId: 'cust_3' },
      [{ playId: 'win_1', marketLabel: 'Side', status: 'WIN', riskUnits: 1, americanOdds: -110 }],
    );
    assert.strictEqual(profEval.status, 'PROFITABLE_NO_CREDIT_DUE');
    assert.strictEqual(profEval.mintedCents, 0);

    const stdEval = await service.settlePackPurchase(
      {
        ...tnfPurchase,
        purchaseId: 'pur_std_4',
        customerId: 'cust_4',
        packSku: 'TNF_SHOWDOWN_STANDARD_19',
        paidCashCents: 1900,
        storeCreditAligned: false,
      },
      [{ playId: 'loss_1', marketLabel: 'Side', status: 'LOSS', riskUnits: 1, americanOdds: -110 }],
    );
    assert.strictEqual(stdEval.status, 'INELIGIBLE_STANDARD_TIER');
    assert.strictEqual(stdEval.mintedCents, 0);
    check(posthogEvents.includes('store_credit_alignment_minted'), 'PostHog mint event captured');
    check(posthogEvents.includes('all_access_bridge_35_redeemed'), 'PostHog bridge event captured');

    passedTests += 1;
  }

  // -------------------------------------------------------------------------
  // TEST 5: Compliance Scanner, Integer Conviction & SHA-256 Commitment Receipt
  // -------------------------------------------------------------------------
  {
    assert.strictEqual(formatIntegerConviction(78.4), '78/100');
    assert.throws(() => formatIntegerConviction(105), RangeError);

    const sampleMri = evaluateParlayMri({
      legs: [
        { legId: 'a', label: 'QB Pass Yds Over', archetype: 'QB_PASS_YDS_OVER', americanOdds: -110 },
        { legId: 'b', label: 'WR1 Rec Yds Over', archetype: 'WR1_REC_YDS_OVER', americanOdds: -110 },
      ],
      quotedSgpAmericanOdds: 170,
    });
    const cleanCheck = scanPublicUiCompliance(
      `${sampleMri.plainEnglishHeadline} ${sampleMri.plainEnglishExplanation} Founding rate $59.99/mo locked for first 100 members. Conviction: 81/100. Contractual 100% Store-Credit Alignment if graded official plays finish <= 0.00u.`,
    );
    assert.strictEqual(cleanCheck.passed, true, `Unexpected violations: ${JSON.stringify(cleanCheck.violations)}`);

    for (const forbidden of [
      'Powered by Sinkhorn scaling',
      'JEV ensemble score',
      'Romano CQR interval',
      'Residual tau_hat = 0.12',
      'Verified 62-23-1 record',
      'Sunday LOCK of the year',
      '100% guaranteed win tonight',
      'Risk-free parlay bet',
      '84% confidence rating',
    ]) {
      const scan = scanPublicUiCompliance(forbidden);
      check(scan.passed === false, `Expected scanner to flag forbidden copy: "${forbidden}"`);
    }

    const receipt = createPreKickoffCommitmentReceipt({
      schemaVersion: 'gse.commitment.v1',
      packId: 'wk10-tnf-wsh-nyg',
      week: 10,
      matchupCode: 'WSH@NYG',
      kickoffUtc: '2026-11-13T01:15:00Z',
      sealedBeforeKickoffUtc: '2026-11-13T00:30:00Z',
      integerConviction: '78/100',
      plays: [
        {
          playId: 'wk10-tnf-01',
          selection: 'WSH +2.5',
          americanOdds: -110,
          riskUnits: 1.0,
        },
      ],
      saltNonce: '9f4c2e1b8a7d6f05',
    });

    assert.strictEqual(receipt.commitmentSha256.length, 64);
    const verifiedOk = verifyPreKickoffCommitmentReceipt(
      receipt.canonicalJson,
      receipt.commitmentSha256,
    );
    assert.strictEqual(verifiedOk.verified, true);

    const tamperedJson = receipt.canonicalJson.replace('WSH +2.5', 'NYG -2.5');
    const verifiedTampered = verifyPreKickoffCommitmentReceipt(
      tamperedJson,
      receipt.commitmentSha256,
    );
    assert.strictEqual(verifiedTampered.verified, false);

    assert.throws(
      () =>
        createPreKickoffCommitmentReceipt({
          schemaVersion: 'gse.commitment.v1',
          packId: 'late-seal',
          week: 10,
          matchupCode: 'NE@DET',
          kickoffUtc: '2026-11-15T14:30:00Z',
          sealedBeforeKickoffUtc: '2026-11-15T14:31:00Z',
          integerConviction: '76/100',
          plays: [],
          saltNonce: 'abc12345',
        }),
      RangeError,
    );

    passedTests += 1;
  }

  return { passed: passedTests, assertions: assertionCount, scipyVectors };
}

if (require.main === module) {
  runAllSuiteTests()
    .then((summary) => {
      console.log(JSON.stringify(summary));
    })
    .catch((err) => {
      console.error('TEST_SUITE_FAILED:', err);
      process.exit(1);
    });
}
