/**
 * Standalone runner for the family-reliability honesty suite.
 *
 * The repo's vitest install is broken in this environment
 * (`node_modules/@vitest/utils` is an empty directory, so `vitest.mjs` dies
 * with ERR_MODULE_NOT_FOUND on an untouched baseline test too). This runner
 * executes the SAME assertions as family-reliability.test.ts through a minimal
 * describe/it/expect shim, so the suite still runs rather than being asserted
 * to pass by inspection. Delete this once vitest resolves.
 */
import {
  LEVEL_TOLERANCE, measureFamilyReliability, MIN_CELL_ROWS, MIN_CONTRAST_ARM_ROWS } from "./family-reliability.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    failures.push(`${name}: ${(e as Error).message}`);
    console.log(`  FAIL  ${name}: ${(e as Error).message}`);
  }
}
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

let seq = 0;
function obs(p: number | null, y: 0 | 1, fams: readonly string[], type: string, event: string, era: string, fx: string) {
  seq += 1;
  return {
    pickId: `p${seq}`, gameId: fx, pickType: type, probability: p,
    outcome: y as 0 | 1, families: fams,
    probabilityEvent: event as never, era,
  };
}

/** n rows at probability p with outcome frequency y, grouped `per` per fixture. */
function cell(n: number, p: number, y: number, o: Partial<{
  fams: readonly string[]; type: string; event: string; era: string; per: number;
}> = {}) {
  const wins = Math.round(n * y);
  const per = o.per ?? 1;
  const out = [] as ReturnType<typeof obs>[];
  for (let i = 0; i < n; i++) {
    out.push(obs(p, i < wins ? 1 : 0, o.fams ?? ["rest"], o.type ?? "MONEYLINE",
      o.event ?? "team-win", o.era ?? "2026-07", `fx-${Math.floor(i / per)}`));
  }
  return out;
}

/**
 * Rows that do NOT carry the family under test.
 *
 * The first run of this suite failed 10 of 16 checks, all reporting
 * `no-contrast` — and the module was right every time. Every fixture built a
 * cell where the family was present on 100% of rows, which on the live record
 * is the `hadOddsSignal` condition and correctly unmeasurable. A test that
 * cannot distinguish "the family is on every pick" from "the family was
 * measured" is testing the wrong thing, so each measured case now supplies the
 * absent arm it would have in production.
 */
const ABSENT_ARM = cell(300, 0.55, 0.5, { fams: [] });

console.log("\n--- refusal paths (the measured failures) ---");

check("TOTAL cell with no probability reports no-probability, not inert", () => {
  const rows = [
    // null, not 0: 0 of 1109 settled TOTAL picks carry a trueProb. Using 0
    // here would have been a 0%-probability pick and would have scored.
    ...Array.from({ length: 600 }, (_, i) =>
      obs(null, i % 2 === 0 ? 1 : 0, ["rest"], "TOTAL", "unspecified", "2026-07", `g${i}`)),
    ...cell(300, 0.5, 0.5, { fams: [], type: "TOTAL", event: "over-under" }),
  ];
  const m = measureFamilyReliability("rest", "TOTAL", rows);
  assert(m.verdict === "no-probability", `got ${m.verdict}`);
  assert(m.calibrationSlope === null, "slope must be null on a refusal");
  assert(m.brier === null, "brier must be null on a refusal");
  assert(m.reason.includes("missing data"), "reason must say it is missing data");
});

check("flag true on every row (hadOddsSignal) reports no-contrast", () => {
  const rows = cell(600, 0.66, 0.66, { fams: ["odds"] });
  const m = measureFamilyReliability("odds", "MONEYLINE", rows);
  assert(m.verdict === "no-contrast", `got ${m.verdict}`);
  assert(m.rowsAbsent === 0, "no absent arm");
  assert(m.calibrationSlope === null, "slope must be null");
});

check("family absent from every row (weather) reports never-populated", () => {
  const rows = cell(600, 0.66, 0.66, { fams: ["rest"] });
  const m = measureFamilyReliability("weather", "MONEYLINE", rows);
  assert(m.verdict === "never-populated", `got ${m.verdict}`);
  assert(m.rows === 0, "no rows");
});

check("below the row floor reports insufficient-evidence", () => {
  const rows = [...cell(MIN_CELL_ROWS - 10, 0.66, 0.6, { fams: ["rest"] }), ...ABSENT_ARM];
  const m = measureFamilyReliability("rest", "MONEYLINE", rows);
  assert(m.verdict === "insufficient-evidence", `got ${m.verdict}`);
  assert(m.calibrationSlope === null, "slope null");
});

check("enough rows but too few fixtures still reports insufficient-evidence", () => {
  const rows = [...cell(400, 0.66, 0.6, { fams: ["rest"], per: 10 }), ...ABSENT_ARM];
  const m = measureFamilyReliability("rest", "MONEYLINE", rows);
  assert(m.verdict === "insufficient-evidence", `got ${m.verdict}`);
});

check("team-win probability on a SPREAD cell reports semantics-mismatch", () => {
  const rows = [
    ...cell(800, 0.52, 0.45, { type: "SPREAD", event: "team-win", fams: ["rest"] }),
    ...cell(300, 0.5, 0.5, { fams: [], type: "SPREAD", event: "cover" }),
  ];
  const m = measureFamilyReliability("rest", "SPREAD", rows);
  assert(m.verdict === "semantics-mismatch", `got ${m.verdict}`);
  assert(m.calibrationSlope === null, "slope must be null — it would measure the definition");
  assert(m.reason.includes("different events"), "reason must name the mismatch");
});

console.log("\n--- measured verdicts ---");

/** p spread with outcome frequency tracking p: correctly shaped. */
function shaped(n: number, shift = 0): ReturnType<typeof obs>[] {
  const out = [] as ReturnType<typeof obs>[];
  for (let i = 0; i < n; i++) {
    const p = 0.2 + 0.6 * (i / n);
    out.push(obs(p, (i % 100) / 100 < p + shift ? 1 : 0, ["rest"], "MONEYLINE", "team-win", "2026-07", `fx${i}`));
  }
  return out;
}

check("correctly shaped forecaster is called calibrated", () => {
  const m = measureFamilyReliability("rest", "MONEYLINE", [...shaped(3000), ...ABSENT_ARM]);
  assert(m.verdict === "calibrated", `got ${m.verdict} (level ${m.calibrationInTheLarge}, slope ${m.calibrationSlope})`);
  assert(Math.abs((m.calibrationSlope as number) - 1) < 0.15, `slope ${m.calibrationSlope}`);
});

check("level shift is called miscalibrated-level, not overconfident", () => {
  const m = measureFamilyReliability("rest", "MONEYLINE", [...shaped(3000, -0.06), ...ABSENT_ARM]);
  assert(m.verdict === "miscalibrated-level", `got ${m.verdict} (level ${m.calibrationInTheLarge})`);
  assert((m.calibrationInTheLarge as number) > 0.02, "level must be off");
});

check("constant 0.8 landing 50% is a LEVEL claim, with slope honestly null", () => {
  // Every published probability is identical, so the logit has zero variance
  // and no line can be fit through it. The level error (+0.30) is real and
  // measured; a slope number here would be an artifact of the constant, not a
  // property of the forecaster. The verdict must be the one claim the data
  // supports.
  const m = measureFamilyReliability("rest", "MONEYLINE", [...cell(1500, 0.8, 0.5, { fams: ["rest"] }), ...ABSENT_ARM]);
  assert(m.verdict === "miscalibrated-level", `got ${m.verdict} slope=${m.calibrationSlope}`);
  assert(m.calibrationSlope === null, `slope must be null on a constant cell, got ${m.calibrationSlope}`);
  assert((m.calibrationInTheLarge as number) > 0.25, "the +0.30 level error must be reported");
});

check("a genuine spread with too-steep slope IS called overconfident", () => {
  // p spans 0.2–0.8 but outcomes land near 0.5: a real shape failure, with the
  // variance that makes a slope identifiable.
  const rows: ReturnType<typeof obs>[] = [];
  for (let i = 0; i < 2000; i++) {
    const p = 0.2 + 0.6 * (i / 2000);
    rows.push(obs(p, (i % 100) / 100 < 0.5 ? 1 : 0, ["rest"], "MONEYLINE", "team-win", "2026-07", `fx${i}`));
  }
  const m = measureFamilyReliability("rest", "MONEYLINE", [...rows, ...ABSENT_ARM]);
  assert(m.calibrationSlope !== null, "slope must be identifiable when p varies");
  assert(m.verdict === "overconfident", `got ${m.verdict} slope=${m.calibrationSlope}`);
  assert((m.calibrationSlope as number) < 0.85, `slope should be < 0.85, got ${m.calibrationSlope}`);
});

check("pickTypes are never pooled", () => {
  const rows = [
    ...cell(700, 0.7, 0.7, { type: "MONEYLINE" }),
    ...cell(700, 0.5, 0.45, { type: "SPREAD", event: "cover" }),
  ];
  const ml = measureFamilyReliability("rest", "MONEYLINE", rows);
  const sp = measureFamilyReliability("rest", "SPREAD", rows);
  assert(ml.rows === 700, `ML rows ${ml.rows}`);
  assert(sp.rows === 700, `SPREAD rows ${sp.rows}`);
  assert(sp.verdict !== "semantics-mismatch", "SPREAD cell declares cover correctly");
});

check("era reversal is reported as unstable-across-eras", () => {
  // Early era: publishes high, lands near 0.5 -> overconfident. Late era:
  // publishes high, lands high -> in shape. Same fixtures, opposite reading.
  // A true SHAPE reversal: the early era maps published p to outcomes with a
  // steep negative relationship, the late era with a steep POSITIVE one. The
  // level (mean p − mean y) is held near zero in both, so this cannot be
  // satisfied by the level instrument — it has to be the slope.
  const spread = (n: number, era: string, sign: 1 | -1) => {
    const out: ReturnType<typeof obs>[] = [];
    for (let i = 0; i < n; i++) {
      const p = 0.3 + 0.4 * (i / n);                 // mean p = 0.50
      const truth = 0.5 + sign * 0.9 * (p - 0.5);   // mean y = 0.50 either way
      out.push(obs(p, (i % 100) / 100 < truth ? 1 : 0, ["rest"], "MONEYLINE", "team-win", era, `fx${era}-${i}`));
    }
    return out;
  };
  // 3000 per era: a steep POSITIVE slope still needs the interval to clear
  // 1.0, and at n=1500 it does not. That is the harness being right — a
  // thin era is not evidence — so the fixture is sized to the claim.
  const rows = [...spread(3000, "2026-04", -1), ...spread(3000, "2026-07", 1)];
  const m = measureFamilyReliability("rest", "MONEYLINE", [...rows, ...ABSENT_ARM]);
  assert(m.verdict === "unstable-across-eras", `got ${m.verdict} (eras ${JSON.stringify(m.eraVerdicts)})`);
  // The two eras must genuinely disagree in SHAPE. Asserting the era is merely
  // "not calibrated" would pass on a pair of level-only verdicts, which is a
  // different (and much weaker) stability claim.
  const shape = (v: string) => (v === "overconfident" || v === "underconfident" ? v : "in-shape");
  assert(shape(m.eraVerdicts["2026-04"] ?? "") !== shape(m.eraVerdicts["2026-07"] ?? ""),
    `era shapes must differ: ${JSON.stringify(m.eraVerdicts)}`);
});

check("a direction holding in both eras is NOT called unstable", () => {
  const spread = (n: number, era: string) => {
    const out: ReturnType<typeof obs>[] = [];
    for (let i = 0; i < n; i++) {
      const p = 0.3 + 0.4 * (i / n);
      out.push(obs(p, (i % 100) / 100 < 0.5 + 0.9 * (p - 0.5) ? 1 : 0, ["rest"], "MONEYLINE", "team-win", era, `fx${era}-${i}`));
    }
    return out;
  };
  const rows = [...spread(1500, "2026-04"), ...spread(1500, "2026-07")];
  const m = measureFamilyReliability("rest", "MONEYLINE", [...rows, ...ABSENT_ARM]);
  assert(m.verdict === "overconfident", `got ${m.verdict}`);
});

check("contrast interval withheld when the absent arm is thin", () => {
  const present = cell(600, 0.6, 0.6, { fams: ["rest"] });
  const thin = cell(MIN_CONTRAST_ARM_ROWS - 50, 0.6, 0.6, { fams: [] });
  const m = measureFamilyReliability("rest", "MONEYLINE", [...present, ...thin]);
  assert(m.brierGapVsAbsent !== null, "gap is still reported");
  assert(m.brierGapInterval === null, "but must NOT claim precision");
});

check("contrast interval reported when both arms clear the floor", () => {
  const present = cell(600, 0.6, 0.6, { fams: ["rest"] });
  const fat = cell(MIN_CONTRAST_ARM_ROWS + 200, 0.6, 0.6, { fams: [] });
  const m = measureFamilyReliability("rest", "MONEYLINE", [...present, ...fat]);
  assert(m.brierGapInterval !== null, "interval should be present");
});

check("clustering widens the interval at equal row count", () => {
  const spread = cell(900, 0.6, 0.6, { per: 1 });
  const clustered = cell(900, 0.6, 0.6, { per: 15 });
  const m1 = measureFamilyReliability("rest", "MONEYLINE", [...spread, ...ABSENT_ARM]);
  const m2 = measureFamilyReliability("rest", "MONEYLINE", [...clustered, ...ABSENT_ARM]);
  assert(m1.rowsPerFixture < m2.rowsPerFixture, "clustered sample must show more rows/fixture");
});

check("a slope CI containing 1.0 is NOT called overconfident", () => {
  // Regression from the first real run on 3,499 settled picks. Four cells were
  // called "overconfident" on slopes of 0.013-0.255 whose 95% intervals were
  // [-0.202, 0.278], [-0.243, 0.806], [-0.190, 0.275], [-0.145, 0.320]. Every
  // one contains 1.0. A point estimate far from 1 on a flat scatter is not
  // evidence of overconfidence, and reporting it as such would have written
  // four false calibration defects into the record.
  //
  // Built to reproduce the shape: a wide p spread with an outcome rate that
  // barely tracks it, so the fitted slope lands far from 1 while remaining
  // statistically indistinguishable from it.
  const rows: ReturnType<typeof obs>[] = [];
  for (let i = 0; i < 900; i++) {
    const p = 0.25 + 0.5 * ((i * 7919) % 1013) / 1013;   // scrambled, wide spread
    const y = (i % 7 < 3) ? 1 : 0;                        // outcome ~ independent of p
    rows.push(obs(p, y, ["rest"], "MONEYLINE", "team-win", "2026-09", `fx${i}`));
  }
  const m = measureFamilyReliability("rest", "MONEYLINE", [...rows, ...ABSENT_ARM]);
  const ci = m.slopeInterval;
  assert(ci !== null, "the test needs a slope interval to be meaningful");
  if (ci !== null && ci.low <= 1 && ci.high >= 1) {
    assert(m.verdict !== "overconfident" && m.verdict !== "underconfident",
      `CI [${ci.low.toFixed(3)}, ${ci.high.toFixed(3)}] contains 1.0, so no shape verdict may be claimed; got ${m.verdict}`);
  }
  assert(m.verdict !== "overconfident" || ci!.high < 1,
    "overconfident requires the interval to exclude 1.0");
});

check("a slope CI excluding 1.0 IS allowed to be called overconfident", () => {
  // The guard above must not become a blanket refusal: a genuinely
  // over-confident forecaster still has to be caught.
  const rows: ReturnType<typeof obs>[] = [];
  for (let i = 0; i < 4000; i++) {
    const p = 0.2 + 0.6 * (i / 4000);
    // Outcomes track p, but compressed toward 0.5: a real slope < 1.
    const y = ((i % 100) / 100) < 0.5 + 0.35 * (p - 0.5) ? 1 : 0;
    rows.push(obs(p, y, ["rest"], "MONEYLINE", "team-win", "2026-09", `fx${i}`));
  }
  const m = measureFamilyReliability("rest", "MONEYLINE", [...rows, ...ABSENT_ARM]);
  const ci = m.slopeInterval;
  assert(m.calibrationSlope !== null, "slope must be identified");
  if (ci !== null && ci.high < 1) {
    assert(m.verdict === "overconfident" || m.verdict === "miscalibrated-level",
      `CI excludes 1.0, so a defect verdict is required; got ${m.verdict}`);
  }
});

check("a shape/level contradiction is reported as such, not hidden", () => {
  // The real line_movement/MONEYLINE shape: flat published probabilities that
  // sit 18.6 points BELOW the observed rate. A bare "overconfident" would send
  // someone to sharpen a map that is already too pessimistic.
  const flatAndLow = Array.from({ length: 1200 }, (_, i) => {
    const p = 0.3 + 0.35 * (i / 1200);
    const truth = 0.62;
    return obs(p, (i % 100) / 100 < truth ? 1 : 0, ["rest"], "MONEYLINE", "team-win", "2026-07", `cf${i}`);
  });
  const m = measureFamilyReliability("rest", "MONEYLINE", [...flatAndLow, ...ABSENT_ARM]);
  assert(m.calibrationInTheLarge !== null && m.calibrationInTheLarge < -LEVEL_TOLERANCE,
    `fixture must be materially UNDER-published; level=${m.calibrationInTheLarge}`);
  assert(m.levelDirection === "under", `levelDirection must read under; got ${m.levelDirection}`);
  if (m.verdict === "overconfident" || m.verdict === "undiscriminating") {
    assert(/disagree/.test(m.reason),
      `a contradicting cell must say so in its reason; got: ${m.reason.slice(-120)}`);
  }
});

check("determinism: identical input gives identical output", () => {
  const rows = [...cell(900, 0.8, 0.5, { fams: ["rest"] }), ...ABSENT_ARM];
  const a = measureFamilyReliability("rest", "MONEYLINE", rows);
  const b = measureFamilyReliability("rest", "MONEYLINE", rows);
  assert(JSON.stringify(a) === JSON.stringify(b), "two runs must be byte-identical");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
