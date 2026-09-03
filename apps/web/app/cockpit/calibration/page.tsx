import Link from "next/link";
import { db, isStubMode } from "@sports/db";
import {
  getReadinessGates,
  buildCalibrator,
  DEFAULT_MIN_CALIBRATION_SAMPLE,
  convictionTier,
  CONVICTION_MIN_PROBABILITY,
  CONVICTION_MIN_CLV_BEAT_RATE,
  CONVICTION_MIN_CLV_SAMPLE,
} from "@sports/prediction-engine";
import { loadConfidenceTail, type ConfidenceTailSummary } from "@/lib/calibration/confidence-tail";
import { loadMarketCoverage, MARKET_KEYS, type MarketCoverageReport } from "@/lib/board/market-coverage";

/**
 * Cockpit calibration — live data binding, rebuilt. Preserves the
 * source-level invariants that public-safety tests enforce.
 *
 * Markers:
 *   - data-testid="internal-only-banner"
 *   - "Internal calibration only. No auto-publish. No auto-send. No automated betting."
 *   - data-testid="calibration-history" with Games/Predictions rows
 *   - data-testid="calibration-readiness" + data-testid="calibration-blocked-reasons"
 *   - "ALWAYS BLOCKED (constant gate)" enumerated
 *   - never writes a published timestamp
 *
 * The confidence-bucket table is the actual calibration readout: settled,
 * non-bootstrap picks grouped by confidence band vs realized win rate.
 * Read-only — proposals route through the guarded API, never this page.
 */
export const dynamic = "force-dynamic";

type SettledRow = { confidence: number; result: "WIN" | "LOSS" | "PUSH" | "VOID" };

const BUCKETS = [
  { label: "50–59", min: 50, max: 59 },
  { label: "60–69", min: 60, max: 69 },
  { label: "70–79", min: 70, max: 79 },
  { label: "80–89", min: 80, max: 89 },
  { label: "90–100", min: 90, max: 100 },
] as const;

// Market closing-line calibration — the bar our pick model must beat. A
// point-in-time snapshot computed read-only via scripts/run-historical-
// calibration.mjs (de-vig proportional) over completed NFL seasons; the season
// window makes it stable (those games are settled). Re-run to refresh. This is
// NOT our model's calibration — our model has no settled picks to score yet.
const MARKET_BASELINE = {
  brier: 0.2111,
  ece: 0.018,
  games: 5281,
  homeWinRate: 55.8,
  window: "NFL · 1999–2025 seasons",
  computedOn: "2026-06-15",
} as const;

export default async function CockpitCalibrationPage() {
  const gates = getReadinessGates();

  // Defensive counts — page renders zeros in stub mode / DB outage.
  const [
    gamesTotal,
    gamesCompleted,
    picksTotal,
    picksResolved,
    settledRows,
    eligibleRows,
    clvAgg,
    clvBeatCount,
    confidenceTail,
    marketCoverage,
  ] = await Promise.all([
      db.game.count().catch(() => 0),
      db.game.count({ where: { status: "FINAL" } }).catch(() => 0),
      db.pick.count().catch(() => 0),
      db.pick.count({ where: { result: { not: "PENDING" } } }).catch(() => 0),
      db.pick
        .findMany({
          where: { result: { in: ["WIN", "LOSS", "PUSH"] }, isBootstrap: false },
          select: { confidence: true, result: true },
          orderBy: { settledAt: "desc" },
          take: 2000,
        })
        .catch(() => [] as SettledRow[]),
      // Activation readiness counts ONLY learning-eligible snapshots — the same gate
      // the calibration report uses. Picks settled while OUTCOME_LEARNING_ENABLED was
      // off stay eligibleForLearning=false and must NOT count toward the 100 floor.
      db.pick
        .findMany({
          where: {
            result: { in: ["WIN", "LOSS"] },
            isBootstrap: false,
            signalSnapshot: { is: { eligibleForLearning: true } },
          },
          select: { confidence: true, result: true },
          orderBy: { settledAt: "desc" },
          take: 2000,
        })
        .catch(() => [] as SettledRow[]),
      db.pick
        .aggregate({
          where: { clvValue: { not: null } },
          _avg: { clvValue: true },
          _count: { clvValue: true },
        })
        .catch(() => null),
      // Graded picks that actually BEAT the close. The conviction bar is a beat-RATE,
      // which is not the same statistic as the average CLV value shown below — a
      // positive average can hide a sub-50% beat rate. Counted separately on purpose.
      db.pick.count({ where: { clvValue: { gt: 0 } } }).catch(() => 0),
      // The same two monitors /api/ops/public-surface-truth and launch:ready
      // report, so the cockpit shows them without an API call. Read-only. In
      // stub/demo mode the stub client mixes sample picks with stub games, so
      // both render as "unavailable" rather than a fabricated table, exactly
      // as the truth surface does.
      isStubMode()
        ? Promise.resolve<ConfidenceTailSummary | null>(null)
        : loadConfidenceTail(db as never).catch((): ConfidenceTailSummary | null => null),
      isStubMode()
        ? Promise.resolve<MarketCoverageReport | null>(null)
        : loadMarketCoverage(db as never).catch((): MarketCoverageReport | null => null),
    ]);
  const picksPending = picksTotal - picksResolved;

  const bucketStats = BUCKETS.map((b) => {
    const rows = (settledRows as SettledRow[]).filter(
      (r) => r.confidence >= b.min && r.confidence <= b.max && r.result !== "PUSH",
    );
    const wins = rows.filter((r) => r.result === "WIN").length;
    return {
      ...b,
      n: rows.length,
      winRate: rows.length > 0 ? (wins / rows.length) * 100 : null,
    };
  });
  const eligibleSettled = (settledRows as SettledRow[]).length;

  // Path-to-70 activation readiness: drive the (self-suppressing) calibrator over
  // LEARNING-ELIGIBLE settled picks only — matching the gate that admits data into
  // calibration. The ECE figures below are IN-SAMPLE/indicative; a held-out
  // validation is required before the audited MODEL_VERSION activation (see runbook).
  const calibrationSamples = (eligibleRows as SettledRow[])
    .filter((r) => r.result === "WIN" || r.result === "LOSS")
    .map((r) => ({ p: r.confidence / 100, y: (r.result === "WIN" ? 1 : 0) as 0 | 1 }));
  const calibrator = buildCalibrator(calibrationSamples);
  const sampleFloor = DEFAULT_MIN_CALIBRATION_SAMPLE;
  const sampleProgressPct = Math.min(
    100,
    Math.round((calibrator.sampleSize / sampleFloor) * 100),
  );

  // ─── Conviction tier — DRY RUN (display-only) ────────────────────────────────
  // Runs the real `convictionTier()` selector over real observed aggregates so the
  // blocking requirement is visible instead of described. Nothing here scores,
  // publishes, or writes: the result is rendered and discarded.
  //
  // WIRING HAZARD (why the `calibrated` flag is checked, not just the range):
  // `calibrator.apply()` returns the RAW confidence as a 0–1 probability with
  // `calibrated: false` whenever the calibrator is inactive. That value is inside
  // [0,1], so convictionTier()'s out-of-range guard would NOT reject it, and an
  // uncalibrated heuristic score could earn CONVICTION. Any future wiring MUST gate
  // on `calibrated === true` and pass an explicit non-probability otherwise.
  const clvGraded = clvAgg?._count.clvValue ?? 0;
  const clvBeatRate = clvGraded > 0 ? clvBeatCount / clvGraded : null;

  // Best-case probe: the strongest confidence we actually carry. If even this fails
  // the bar, nothing on the slate qualifies.
  const settledConfidences = (settledRows as SettledRow[]).map((r) => r.confidence);
  const topConfidence = settledConfidences.length > 0 ? Math.max(...settledConfidences) : 0;
  const appliedProbe = calibrator.apply(topConfidence);
  const convictionProbe = convictionTier({
    calibratedProbability: appliedProbe.calibrated ? appliedProbe.probability : Number.NaN,
    // The edge engine is not evaluated on this surface; PASS is the conservative default.
    edgeDecision: "PASS",
    clvBeatCloseRate: clvBeatRate,
    clvSampleSize: clvGraded,
  });

  const convictionBars = [
    {
      bar: "Calibrated win probability",
      requirement: `≥ ${(CONVICTION_MIN_PROBABILITY * 100).toFixed(0)}% and ≥ the pick's price break-even`,
      current: appliedProbe.calibrated
        ? `${(appliedProbe.probability * 100).toFixed(1)}% (calibrated)`
        : `not calibrated — ${calibrator.inactiveReason || "awaiting eligible sample"}`,
      met: appliedProbe.calibrated && appliedProbe.probability >= CONVICTION_MIN_PROBABILITY,
    },
    {
      bar: "Independent edge decision",
      requirement: "SPEAK (Poisson + Kalshi agree)",
      current: "not evaluated on this surface — treated as PASS (conservative)",
      met: false,
    },
    {
      bar: "Closing-line-value beat-rate",
      requirement: `≥ ${(CONVICTION_MIN_CLV_BEAT_RATE * 100).toFixed(0)}% of graded picks beat the close`,
      current:
        clvBeatRate === null
          ? "no graded CLV yet"
          : `${(clvBeatRate * 100).toFixed(1)}% (${clvBeatCount} of ${clvGraded})`,
      met: clvBeatRate !== null && clvBeatRate >= CONVICTION_MIN_CLV_BEAT_RATE,
    },
    {
      bar: "Closing-line-value sample",
      requirement: `≥ ${CONVICTION_MIN_CLV_SAMPLE} graded picks`,
      current: `${clvGraded} graded`,
      met: clvGraded >= CONVICTION_MIN_CLV_SAMPLE,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-ion-white">Calibration</h1>
      <p
        data-testid="internal-only-banner"
        className="rounded-lg border border-caution bg-caution/30 px-4 py-2 text-xs text-caution"
      >
        Internal calibration only. No auto-publish. No auto-send. No automated betting.
      </p>

      <section className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Market baseline — the bar to beat
        </h2>
        <p className="mb-3 text-[11px] leading-relaxed text-ion-2">
          The betting market&apos;s closing line, scored against real outcomes. It&apos;s
          well-calibrated, so this is the bar our own model has to beat — it is{" "}
          <strong className="text-ion-1">not</strong> our model&apos;s calibration (that needs
          settled picks, which don&apos;t exist yet).
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <BaselineStat label="Brier" value={MARKET_BASELINE.brier.toFixed(4)} sub="lower better · 0.25 = coin flip" />
          <BaselineStat label="Calib. error" value={MARKET_BASELINE.ece.toFixed(4)} sub="0 = perfect" />
          <BaselineStat label="Games scored" value={MARKET_BASELINE.games.toLocaleString()} sub="settled · both closes" />
          <BaselineStat label="Home-win rate" value={`${MARKET_BASELINE.homeWinRate}%`} sub="base rate" />
        </div>
        <p className="mt-3 text-[10px] text-ion-3">
          {MARKET_BASELINE.window} · de-vig proportional · computed {MARKET_BASELINE.computedOn} via{" "}
          <span className="font-mono">scripts/run-historical-calibration.mjs</span> (read-only) — re-run to refresh.
        </p>
      </section>

      <section data-testid="calibration-history" className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Game / prediction history
        </h2>
        <ul className="grid grid-cols-2 gap-1 text-ion-1 sm:grid-cols-3">
          <li>Games (total): {gamesTotal}</li>
          <li>Games (completed): {gamesCompleted}</li>
          <li>Predictions (total): {picksTotal}</li>
          <li>Predictions (resolved): {picksResolved}</li>
          <li>Predictions (pending): {picksPending}</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Confidence vs realized win rate
          <span className="ml-2 normal-case tracking-normal text-ion-3">
            (settled · non-bootstrap · pushes excluded · last {eligibleSettled})
          </span>
        </h2>
        {eligibleSettled === 0 ? (
          <p className="text-ion-3">
            No eligible settled picks yet — the table fills as non-bootstrap picks settle.
          </p>
        ) : (
          <>
          <table aria-label="Confidence band vs realized win rate" className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-ion-3">
                <th scope="col" className="py-1 pr-4 font-medium">Confidence band</th>
                <th scope="col" className="py-1 pr-4 font-medium">Settled (n)</th>
                <th scope="col" className="py-1 pr-4 font-medium">Realized win rate</th>
                <th scope="col" className="py-1 font-medium">Read</th>
              </tr>
            </thead>
            <tbody className="text-ion-1">
              {bucketStats.map((b) => {
                const mid = (b.min + Math.min(b.max, 100)) / 2;
                const drift = b.winRate === null ? null : b.winRate - mid;
                return (
                  <tr key={b.label} className="border-t border-titanium/40">
                    <td className="py-1.5 pr-4 font-mono">{b.label}</td>
                    <td className="py-1.5 pr-4">{b.n}</td>
                    <td className="py-1.5 pr-4">{b.winRate === null ? "—" : `${b.winRate.toFixed(1)}%`}</td>
                    <td className="py-1.5 text-ion-3">
                      {drift === null
                        ? "insufficient sample"
                        : Math.abs(drift) <= 5
                          ? "within band"
                          : drift > 0
                            ? `running hot +${drift.toFixed(1)}`
                            : `running cold ${drift.toFixed(1)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-4 flex flex-col gap-2 border-t border-titanium/40 pt-3">
            {bucketStats.map((b) => {
              const mid = (b.min + Math.min(b.max, 100)) / 2;
              const drift = b.winRate === null ? null : b.winRate - mid;
              const withinBand = drift !== null && Math.abs(drift) <= 5;
              return (
                <div key={b.label} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 font-mono text-[10px] text-ion-3">{b.label}</span>
                  <div
                    className="relative h-2.5 flex-1 overflow-hidden rounded-sm bg-eclipse/40"
                    role="img"
                    aria-label={
                      b.winRate === null
                        ? `Confidence band ${b.label}: insufficient sample`
                        : `Confidence band ${b.label}: realized win rate ${b.winRate.toFixed(1)} percent, band midpoint ${mid} percent`
                    }
                  >
                    {b.winRate === null ? null : (
                      <span
                        className={`absolute inset-y-0 left-0 rounded-sm ${withinBand ? "bg-orbital-cyan/70" : "bg-caution/70"}`}
                        style={{ width: `${Math.min(100, Math.max(0, b.winRate))}%` }}
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 w-px bg-ion-1/60"
                      style={{ left: `${Math.min(100, Math.max(0, mid))}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono text-[10px] text-ion-2">
                    {b.winRate === null ? "—" : `${b.winRate.toFixed(0)}%`}
                  </span>
                </div>
              );
            })}
          </div>
          </>
        )}
      </section>

      <section
        data-testid="confidence-tail"
        className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-4 text-xs"
      >
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
          High-confidence tail — does ≥{confidenceTail?.floor ?? 80} earn it?
        </h2>
        {confidenceTail === null ? (
          <p className="text-ion-3">Tail monitor unavailable (database read failed).</p>
        ) : (
          <>
            <p
              className={`mb-3 text-[11px] leading-relaxed ${
                confidenceTail.verdict === "inverted" || confidenceTail.verdict === "overconfident"
                  ? "text-caution"
                  : "text-ion-2"
              }`}
            >
              <span className="mr-2 font-mono uppercase">{confidenceTail.verdict}</span>
              {confidenceTail.operatorHint}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <BaselineStat label="Graded (n)" value={String(confidenceTail.n)} sub={`≥${confidenceTail.floor} confidence · WIN/LOSS`} />
              <BaselineStat
                label="Realized"
                value={confidenceTail.winRate === null ? "—" : `${(confidenceTail.winRate * 100).toFixed(1)}%`}
                sub="won"
              />
              <BaselineStat
                label="Claimed"
                value={confidenceTail.claimedRate === null ? "—" : `${(confidenceTail.claimedRate * 100).toFixed(1)}%`}
                sub="mean stated confidence"
              />
              <BaselineStat
                label="Brier (tail)"
                value={confidenceTail.brier === null ? "—" : confidenceTail.brier.toFixed(4)}
                sub="lower better · 0.25 = coin flip"
              />
            </div>
            {confidenceTail.byVersion.length > 0 ? (
              <table aria-label="High-confidence tail by model version" className="mt-3 w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-ion-3">
                    <th scope="col" className="py-1 pr-4 font-medium">Model version</th>
                    <th scope="col" className="py-1 pr-4 font-medium">Graded (n)</th>
                    <th scope="col" className="py-1 pr-4 font-medium">Wins</th>
                    <th scope="col" className="py-1 font-medium">Win rate</th>
                  </tr>
                </thead>
                <tbody className="text-ion-1">
                  {confidenceTail.byVersion.map((v) => (
                    <tr key={v.modelVersion} className="border-t border-titanium/40">
                      <td className="py-1.5 pr-4 font-mono">{v.modelVersion}</td>
                      <td className="py-1.5 pr-4">{v.n}</td>
                      <td className="py-1.5 pr-4">{v.wins}</td>
                      <td className="py-1.5">{v.winRate === null ? "—" : `${(v.winRate * 100).toFixed(1)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            <p className="mt-3 text-[10px] text-ion-3">
              Same read as <span className="font-mono">/api/ops/public-surface-truth</span> · <span className="font-mono">confidenceTail</span> and{" "}
              <span className="font-mono">npm run launch:ready</span>. Measured only; nothing here changes a pick.
            </p>
          </>
        )}
      </section>

      <section
        data-testid="market-coverage"
        className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-4 text-xs"
      >
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Market coverage — next {marketCoverage?.windowHours ?? 72}h
        </h2>
        {marketCoverage === null ? (
          <p className="text-ion-3">Coverage monitor unavailable (database read failed).</p>
        ) : marketCoverage.sports.length === 0 ? (
          <p className="text-ion-3">No games scheduled in the window.</p>
        ) : (
          <>
            <table aria-label="Published pending picks per sport and market" className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-ion-3">
                  <th scope="col" className="py-1 pr-4 font-medium">Sport</th>
                  <th scope="col" className="py-1 pr-4 font-medium">Games</th>
                  {MARKET_KEYS.map((m) => (
                    <th key={m} scope="col" className="py-1 pr-4 font-medium">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-ion-1">
                {marketCoverage.sports.map((s) => (
                  <tr key={s.sportKey} className="border-t border-titanium/40">
                    <td className="py-1.5 pr-4 font-mono">{s.sportKey}</td>
                    <td className="py-1.5 pr-4">{s.games}</td>
                    {MARKET_KEYS.map((m) => (
                      <td
                        key={m}
                        className={`py-1.5 pr-4 ${s.status[m] === "none" ? "text-caution" : ""}`}
                      >
                        {s.picks[m]}
                        {s.status[m] === "none" ? " · none" : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {marketCoverage.degraded.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1 text-[11px] text-caution">
                {marketCoverage.degraded.map((d) => (
                  <li key={`${d.sportKey}-${d.market}`}>
                    <span className="font-mono">{d.sportKey} · {d.market}</span>: {d.hint}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[11px] text-ion-2">Every scheduled sport has picks in every market.</p>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Path to a proven 70% tier — activation readiness
        </h2>
        <p className="mb-3 text-[11px] leading-relaxed text-ion-2">
          Calibration converts the confidence score into a win probability, but only once there are
          enough <strong className="text-ion-1">learning-eligible</strong> settled picks to fit on and
          the fit actually improves calibration. Until then, confidence is shown uncalibrated. See{" "}
          <span className="font-mono">docs/path-to-70.md</span>.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <BaselineStat
            label="Eligible sample"
            value={`${calibrator.sampleSize} / ${sampleFloor}`}
            sub={`${sampleProgressPct}% to floor · learning-gate admitted`}
          />
          <BaselineStat
            label="Calibrator"
            value={calibrator.isActive ? "fit ready" : "inactive"}
            sub={calibrator.isActive ? "needs held-out check" : "awaiting sample"}
          />
          <BaselineStat
            label="ECE raw (in-sample)"
            value={calibrator.sampleSize > 0 ? calibrator.rawEce.toFixed(4) : "—"}
            sub="indicative only"
          />
          <BaselineStat
            label="ECE fit (in-sample)"
            value={calibrator.sampleSize > 0 ? calibrator.calibratedEce.toFixed(4) : "—"}
            sub="not a green light"
          />
        </div>
        <p className="mt-3 text-[10px] text-ion-3">
          {calibrator.isActive
            ? "Sample floor cleared and the in-sample fit improves — run a held-out/offline validation, then do the audited MODEL_VERSION activation. The ECE above is in-sample and is not, by itself, sufficient."
            : `Inactive: ${calibrator.inactiveReason || "awaiting eligible sample"}. Activation is a deliberate, audited MODEL_VERSION step — never an automatic env flip.`}
        </p>
        <p className="mt-3 text-[11px] leading-relaxed text-ion-2">
          The conviction (&ldquo;70%&rdquo;) tier then requires a calibrated win probability of at least
          65% <em>and</em> at or above the pick&apos;s price-specific break-even (a −200 favorite needs
          ~66.7%), an independent SPEAK edge, and a closing-line-value beat-rate of at least 50% over a
          minimum of 20 graded picks.
        </p>
      </section>

      <section
        data-testid="conviction-dry-run"
        className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-4 text-xs"
      >
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Conviction tier — dry run
        </h2>
        <p className="mb-3 text-[11px] leading-relaxed text-ion-2">
          The conviction selector, run over today&apos;s real numbers so the blocker is{" "}
          <strong className="text-ion-1">visible, not described</strong>. This is display-only: it
          scores nothing, publishes nothing, and writes nothing. A pick reaches CONVICTION only when
          all four bars below are met at once.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-ion-3">
                <th className="py-1 pr-3 font-medium">Bar</th>
                <th className="py-1 pr-3 font-medium">Requirement</th>
                <th className="py-1 pr-3 font-medium">Today</th>
                <th className="py-1 font-medium">Met</th>
              </tr>
            </thead>
            <tbody>
              {convictionBars.map((b) => (
                <tr key={b.bar} className="border-t border-titanium/20 align-top">
                  <td className="py-1.5 pr-3 text-ion-1">{b.bar}</td>
                  <td className="py-1.5 pr-3 text-ion-2">{b.requirement}</td>
                  <td className="py-1.5 pr-3 font-mono text-ion-2">{b.current}</td>
                  <td className="py-1.5 font-mono text-ion-1">{b.met ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-ion-1">
          Best-case probe (strongest settled confidence{" "}
          <span className="font-mono">{topConfidence}</span>) →{" "}
          <span className="font-mono font-semibold text-ion-white">{convictionProbe.tier}</span>
        </p>
        {convictionProbe.reasons.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-[10px] text-ion-3">
            {convictionProbe.reasons.map((r) => (
              <li key={r}>— {r}</li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[10px] leading-relaxed text-caution">
          Wiring note: <span className="font-mono">calibrator.apply()</span> returns the raw
          confidence as a 0–1 value with <span className="font-mono">calibrated: false</span> while
          the calibrator is inactive. That value is inside [0,1], so the selector&apos;s
          out-of-range guard does not reject it. Any future wiring must gate on the{" "}
          <span className="font-mono">calibrated</span> flag — as this dry run does — or an
          uncalibrated heuristic score could reach CONVICTION.
        </p>
      </section>

      <section className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Closing-line value
        </h2>
        {!clvAgg || !clvAgg._count.clvValue ? (
          <p className="text-ion-3">No graded CLV yet — fills as locks are graded against closes.</p>
        ) : (
          <p className="text-ion-1">
            {clvAgg._count.clvValue} graded picks · average CLV{" "}
            <span className="font-mono">{(clvAgg._avg.clvValue ?? 0).toFixed(2)}</span> (positive = beat the close)
          </p>
        )}
      </section>

      <section data-testid="calibration-readiness" className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Readiness
        </h2>
        <ul className="space-y-1 text-ion-1">
          <li>canExposePerformanceStats: {String(gates.canExposePerformanceStats)}</li>
          <li>canLearnFromOutcomes: {String(gates.canLearnFromOutcomes)}</li>
        </ul>
        <h3 className="mt-3 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Blocked reasons
        </h3>
        <ul data-testid="calibration-blocked-reasons" className="space-y-1 text-ion-2">
          <li>autoPublish — ALWAYS BLOCKED (constant gate)</li>
          <li>autoSend — ALWAYS BLOCKED (constant gate)</li>
          <li>automatedBetting — ALWAYS BLOCKED (constant gate)</li>
        </ul>
      </section>

      <Link href="/cockpit" className="w-fit rounded-lg border border-titanium/40 px-3 py-2 text-xs text-ion-1 hover:bg-carbon/60">
        ← Back to Jarvis
      </Link>
    </div>
  );
}

function BaselineStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-titanium/40 bg-obsidian/40 p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ion-3">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-ion-white">{value}</p>
      <p className="mt-0.5 text-[10px] text-ion-3">{sub}</p>
    </div>
  );
}
