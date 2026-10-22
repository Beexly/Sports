import { beforeAll, describe, expect, it } from "vitest";
import { evaluateXSituationalRecordById, X_SITUATIONAL_80_RECORD_CATALOG } from "../nfl/x-situational-80-rules.js";

// Catalog-integrity gate: runs before the 80 named record assertions and fails the
// whole file if the catalog is not exactly the 80 real IDs. Kept as a hook (not a
// separate `it`) so the file's reported total is exactly 80 named record cases.
beforeAll(() => {
  expect(X_SITUATIONAL_80_RECORD_CATALOG.length).toBe(80);
  expect(new Set(X_SITUATIONAL_80_RECORD_CATALOG.map((r) => r.id)).size).toBe(80);
  const expected = [
    ...Array.from({ length: 10 }, (_, i) => `1.${i + 1}`),
    ...Array.from({ length: 12 }, (_, i) => `2.${i + 1}`),
    ...Array.from({ length: 12 }, (_, i) => `3.${i + 1}`),
    ...Array.from({ length: 8 }, (_, i) => `4.${i + 1}`),
    ...Array.from({ length: 10 }, (_, i) => `5.${i + 1}`),
    ...Array.from({ length: 10 }, (_, i) => `6.${i + 1}`),
    ...Array.from({ length: 8 }, (_, i) => `7.${i + 1}`),
    ...Array.from({ length: 10 }, (_, i) => `8.${i + 1}`),
  ];
  expect(X_SITUATIONAL_80_RECORD_CATALOG.map((r) => r.id)).toEqual(expected);
});

describe("X situational 80 records — one named assertion per record", () => {
  it("Record 1.1 — @EaglesXsandOs", () => {
    const r = evaluateXSituationalRecordById("1.1");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 1.2 — @ScottKacsmar", () => {
    const r = evaluateXSituationalRecordById("1.2");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 1.3 — @zxcvbnmwill", () => {
    const r = evaluateXSituationalRecordById("1.3");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 1.4 — @galenhall", () => {
    const r = evaluateXSituationalRecordById("1.4");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 1.5 — @ArkansasQuant", () => {
    const r = evaluateXSituationalRecordById("1.5");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 1.6 — @BenjaminSolak", () => {
    const r = evaluateXSituationalRecordById("1.6");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 1.7 — @Timo_NFL", () => {
    const r = evaluateXSituationalRecordById("1.7");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 1.8 — @bburkeESPN", () => {
    const r = evaluateXSituationalRecordById("1.8");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 1.9 — @tejfbanalytics", () => {
    const r = evaluateXSituationalRecordById("1.9");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 1.10 — @nfl4thbot", () => {
    const r = evaluateXSituationalRecordById("1.10");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 2.1 — @dwainmcfarland", () => {
    const r = evaluateXSituationalRecordById("2.1");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 2.2 — @LateRoundQB", () => {
    const r = evaluateXSituationalRecordById("2.2");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 2.3 — @grok", () => {
    const r = evaluateXSituationalRecordById("2.3");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 2.4 — @PurpyNFL", () => {
    const r = evaluateXSituationalRecordById("2.4");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 2.5 — @PurpyNFL", () => {
    const r = evaluateXSituationalRecordById("2.5");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 2.6 — @bjT98504", () => {
    const r = evaluateXSituationalRecordById("2.6");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 2.7 — @Moneylinehacks", () => {
    const r = evaluateXSituationalRecordById("2.7");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 2.8 — @LinkofSunshine", () => {
    const r = evaluateXSituationalRecordById("2.8");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 2.9 — @hawkblogger", () => {
    const r = evaluateXSituationalRecordById("2.9");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 2.10 — @NFLSnapIQ", () => {
    const r = evaluateXSituationalRecordById("2.10");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 2.11 — @BAI8app", () => {
    const r = evaluateXSituationalRecordById("2.11");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 2.12 — @RoyRobi73192051", () => {
    const r = evaluateXSituationalRecordById("2.12");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 3.1 — @SharpFootball", () => {
    const r = evaluateXSituationalRecordById("3.1");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 3.2 — @GridironInfo_", () => {
    const r = evaluateXSituationalRecordById("3.2");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 3.3 — @SharpFootball", () => {
    const r = evaluateXSituationalRecordById("3.3");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 3.4 — @TheJetPress", () => {
    const r = evaluateXSituationalRecordById("3.4");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 3.5 — @dmlr53", () => {
    const r = evaluateXSituationalRecordById("3.5");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 3.6 — @officialctpod", () => {
    const r = evaluateXSituationalRecordById("3.6");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 3.7 — @thatcaden_", () => {
    const r = evaluateXSituationalRecordById("3.7");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 3.8 — @GridironInfo_", () => {
    const r = evaluateXSituationalRecordById("3.8");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 3.9 — @YUNOsports_NFL", () => {
    const r = evaluateXSituationalRecordById("3.9");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 3.10 — @RedlineFootball", () => {
    const r = evaluateXSituationalRecordById("3.10");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 3.11 — @goblue_mike", () => {
    const r = evaluateXSituationalRecordById("3.11");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 3.12 — @LordReebs", () => {
    const r = evaluateXSituationalRecordById("3.12");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 4.1 — @RyanPaganetti", () => {
    const r = evaluateXSituationalRecordById("4.1");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 4.2 — @BenjaminSolak", () => {
    const r = evaluateXSituationalRecordById("4.2");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 4.3 — @billbarnwell", () => {
    const r = evaluateXSituationalRecordById("4.3");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 4.4 — @NextGenStats", () => {
    const r = evaluateXSituationalRecordById("4.4");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 4.5 — @BenjaminSolak", () => {
    const r = evaluateXSituationalRecordById("4.5");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 4.6 — @MikeReiss", () => {
    const r = evaluateXSituationalRecordById("4.6");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 4.7 — @Timo_NFL", () => {
    const r = evaluateXSituationalRecordById("4.7");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 4.8 — @nfl4thbot", () => {
    const r = evaluateXSituationalRecordById("4.8");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 5.1 — @SharpFootball", () => {
    const r = evaluateXSituationalRecordById("5.1");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 5.2 — @Michael_Nania", () => {
    const r = evaluateXSituationalRecordById("5.2");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 5.3 — @Bumi_mind", () => {
    const r = evaluateXSituationalRecordById("5.3");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 5.4 — @sambruchhaus", () => {
    const r = evaluateXSituationalRecordById("5.4");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 5.5 — @JonnyPage9", () => {
    const r = evaluateXSituationalRecordById("5.5");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 5.6 — @RyanPaganetti", () => {
    const r = evaluateXSituationalRecordById("5.6");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 5.7 — @HoodBall_15", () => {
    const r = evaluateXSituationalRecordById("5.7");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 5.8 — @Kovb41", () => {
    const r = evaluateXSituationalRecordById("5.8");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 5.9 — @popofansports", () => {
    const r = evaluateXSituationalRecordById("5.9");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 5.10 — @CaseL731", () => {
    const r = evaluateXSituationalRecordById("5.10");
    expect(r.sign).toBeGreaterThan(0);
  });
  it("Record 6.1 — @SalVetriDFS", () => {
    const r = evaluateXSituationalRecordById("6.1");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 6.2 — @KyleM_FF", () => {
    const r = evaluateXSituationalRecordById("6.2");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 6.3 — @weatherqb", () => {
    const r = evaluateXSituationalRecordById("6.3");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 6.4 — @weatherqb", () => {
    const r = evaluateXSituationalRecordById("6.4");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 6.5 — @AlexCaruso", () => {
    const r = evaluateXSituationalRecordById("6.5");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 6.6 — @SharpFootball", () => {
    const r = evaluateXSituationalRecordById("6.6");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 6.7 — @JusttheFoosball", () => {
    const r = evaluateXSituationalRecordById("6.7");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 6.8 — @CynicalPublius", () => {
    const r = evaluateXSituationalRecordById("6.8");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 6.9 — @TheNumbersDesk", () => {
    const r = evaluateXSituationalRecordById("6.9");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 6.10 — @trenchpower2025", () => {
    const r = evaluateXSituationalRecordById("6.10");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 7.1 — @AdamKoffler", () => {
    const r = evaluateXSituationalRecordById("7.1");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 7.2 — @MrMathBet", () => {
    const r = evaluateXSituationalRecordById("7.2");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 7.3 — @offshoreinsider", () => {
    const r = evaluateXSituationalRecordById("7.3");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 7.4 — @SBD", () => {
    const r = evaluateXSituationalRecordById("7.4");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 7.5 — @BTBSportsIntel", () => {
    const r = evaluateXSituationalRecordById("7.5");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 7.6 — @kukluxkraut", () => {
    const r = evaluateXSituationalRecordById("7.6");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 7.7 — @fredwinss_", () => {
    const r = evaluateXSituationalRecordById("7.7");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 7.8 — @QcrackinBookies", () => {
    const r = evaluateXSituationalRecordById("7.8");
    expect(r.sign).toBeLessThan(0);
  });
  it("Record 8.1 — @statsowar", () => {
    const r = evaluateXSituationalRecordById("8.1");
    expect(r.gateStatus).toBe("rejected");
    expect(r.sign).toBe(-1);
  });
  it("Record 8.2 — @ArifHasanNFL", () => {
    const r = evaluateXSituationalRecordById("8.2");
    expect(r.gateStatus).toBe("rejected");
    expect(r.sign).toBe(-1);
  });
  it("Record 8.3 — @ARKNDJL", () => {
    const r = evaluateXSituationalRecordById("8.3");
    expect(r.gateStatus).toBe("rejected");
    expect(r.sign).toBe(-1);
  });
  it("Record 8.4 — @AccidentalZen", () => {
    const r = evaluateXSituationalRecordById("8.4");
    expect(r.gateStatus).toBe("rejected");
    expect(r.sign).toBe(-1);
  });
  it("Record 8.5 — @EaglesXsandOs", () => {
    const r = evaluateXSituationalRecordById("8.5");
    expect(r.gateStatus).toBe("rejected");
    expect(r.sign).toBe(-1);
  });
  it("Record 8.6 — @ScottKacsmar", () => {
    const r = evaluateXSituationalRecordById("8.6");
    expect(r.gateStatus).toBe("rejected");
    expect(r.sign).toBe(-1);
  });
  it("Record 8.7 — @KenIngalls", () => {
    const r = evaluateXSituationalRecordById("8.7");
    expect(r.gateStatus).toBe("rejected");
    expect(r.sign).toBe(-1);
  });
  it("Record 8.8 — @LordBenne", () => {
    const r = evaluateXSituationalRecordById("8.8");
    expect(r.gateStatus).toBe("rejected");
    expect(r.sign).toBe(-1);
  });
  it("Record 8.9 — @Saint_FinX", () => {
    const r = evaluateXSituationalRecordById("8.9");
    expect(r.gateStatus).toBe("rejected");
    expect(r.sign).toBe(-1);
  });
  it("Record 8.10 — @PukaJimmer", () => {
    const r = evaluateXSituationalRecordById("8.10");
    expect(r.gateStatus).toBe("rejected");
    expect(r.sign).toBe(-1);
  });
});
