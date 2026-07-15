import { describe, it, expect } from "vitest";
import {
  deriveClosingSnapshotFromOdds,
  gradePickClv,
  type ClosingOddsRow,
  type ClosingSnapshot,
} from "../clv-capture.js";

const COMMENCE = new Date("2026-04-15T18:00:00Z");
const t = (iso: string) => new Date(iso);

function row(partial: Partial<ClosingOddsRow> & { market: string; fetchedAt: Date }): ClosingOddsRow {
  return {
    spread: null,
    total: null,
    homePrice: null,
    awayPrice: null,
    ...partial,
  };
}

describe("deriveClosingSnapshotFromOdds", () => {
  it("returns an all-null snapshot when no odds exist before kickoff", () => {
    const snap = deriveClosingSnapshotFromOdds(
      [row({ market: "H2H", fetchedAt: t("2026-04-15T19:00:00Z"), homePrice: -150, awayPrice: 130 })],
      COMMENCE,
    );
    expect(snap.capturedAt).toBeNull();
    expect(snap.mlHomePrice).toBeNull();
    expect(snap.bookmakerCount).toBe(0);
  });

  it("uses the latest pre-kickoff batch and keeps an executable closing offer", () => {
    const rows: ClosingOddsRow[] = [
      // older batch — should be ignored
      row({ market: "H2H", fetchedAt: t("2026-04-15T10:00:00Z"), homePrice: -120, awayPrice: 100 }),
      // closing batch (latest <= commence)
      row({ market: "H2H", fetchedAt: t("2026-04-15T17:55:00Z"), homePrice: -160, awayPrice: 140 }),
      row({ market: "H2H", fetchedAt: t("2026-04-15T17:55:00Z"), homePrice: -150, awayPrice: 130 }),
      row({ market: "SPREADS", fetchedAt: t("2026-04-15T17:55:00Z"), spread: -3.5 }),
      row({ market: "SPREADS", fetchedAt: t("2026-04-15T17:55:00Z"), spread: -2.5 }),
      row({ market: "TOTALS", fetchedAt: t("2026-04-15T17:55:00Z"), total: 48.5 }),
      // post-kickoff — ignored
      row({ market: "H2H", fetchedAt: t("2026-04-15T18:30:00Z"), homePrice: -200, awayPrice: 170 }),
    ];
    const snap = deriveClosingSnapshotFromOdds(rows, COMMENCE);
    expect(snap.capturedAt?.toISOString()).toBe("2026-04-15T17:55:00.000Z");
    expect(snap.mlHomePrice).toBe(-160);
    expect(snap.mlAwayPrice).toBe(130);
    expect(snap.spreadHome).toBe(-3.5);
    expect(snap.total).toBeCloseTo(48.5, 6);
  });

  it("quarantines non-tradable points instead of fabricating a close", () => {
    const snap = deriveClosingSnapshotFromOdds([
      row({ market: "SPREADS", fetchedAt: t("2026-04-15T17:55:00Z"), spread: -3.2 }),
      row({ market: "TOTALS", fetchedAt: t("2026-04-15T17:55:00Z"), total: 8.954545454545455 }),
    ], COMMENCE, "americanfootball_nfl");
    expect(snap.spreadHome).toBeNull();
    expect(snap.total).toBeNull();
  });

  it("treats a snapshot exactly at commence time as eligible (<=)", () => {
    const snap = deriveClosingSnapshotFromOdds(
      [row({ market: "H2H", fetchedAt: COMMENCE, homePrice: -110, awayPrice: -110 })],
      COMMENCE,
    );
    expect(snap.capturedAt?.getTime()).toBe(COMMENCE.getTime());
    expect(snap.mlHomePrice).toBe(-110);
  });

  it("never invents a cross-pick'em moneyline close", () => {
    const snap = deriveClosingSnapshotFromOdds(
      [
        row({ market: "H2H", fetchedAt: t("2026-04-15T17:55:00Z"), homePrice: -102, awayPrice: -118 }),
        row({ market: "H2H", fetchedAt: t("2026-04-15T17:55:00Z"), homePrice: 105, awayPrice: -125 }),
      ],
      COMMENCE,
    );

    expect([-102, 105]).toContain(snap.mlHomePrice);
    expect(Math.abs(snap.mlHomePrice!)).toBeGreaterThanOrEqual(100);
  });
});

describe("gradePickClv", () => {
  const close: ClosingSnapshot = {
    spreadHome: -4.0,
    total: 47.0,
    mlHomePrice: -200, // closed shorter than we locked
    mlAwayPrice: 170,
    capturedAt: COMMENCE,
    bookmakerCount: 6,
  };

  it("moneyline HOME: locking a longer price than the close BEATS the close", () => {
    // Locked -150 (implied .60), close -200 (implied .667) → we got the longer price.
    const g = gradePickClv({
      pickType: "MONEYLINE",
      selection: "Chiefs ML (-150)",
      homeTeamName: "Chiefs",
      lockLine: null,
      lockPrice: -150,
      close,
    });
    expect(g).not.toBeNull();
    expect(g!.kind).toBe("PROBABILITY");
    expect(g!.verdict).toBe("BEAT_CLOSE");
    expect(g!.value).toBeGreaterThan(0);
    expect(g!.closePrice).toBe(-200);
  });

  it("moneyline AWAY: uses the away closing price and can lose to the close", () => {
    // Locked +150 (implied .40), close +170 (implied .370) → close drifted longer
    // than our price → we locked the shorter (worse) price → lost to the close.
    const g = gradePickClv({
      pickType: "MONEYLINE",
      selection: "Eagles ML (+150)",
      homeTeamName: "Chiefs",
      lockLine: null,
      lockPrice: 150,
      close,
    });
    expect(g!.verdict).toBe("LOST_TO_CLOSE");
    expect(g!.value).toBeLessThan(0);
    expect(g!.closePrice).toBe(170);
  });

  it("spread HOME: laying fewer points than the close beats it", () => {
    // Locked home -3 (lockLine -3), close -4 → we laid fewer points → +1 → beat.
    const g = gradePickClv({
      pickType: "SPREAD",
      selection: "Chiefs -3.0",
      homeTeamName: "Chiefs",
      lockLine: -3.0,
      lockPrice: null,
      close,
    });
    expect(g!.kind).toBe("POINTS");
    expect(g!.value).toBeCloseTo(1.0, 6);
    expect(g!.verdict).toBe("BEAT_CLOSE");
    expect(g!.closeLine).toBe(-4.0);
  });

  it("spread AWAY: the mirror image of the home line", () => {
    // Away pick, lockLine (home perspective) -3, close -4 → away beat by close-pick = -4-(-3) = -1 → lost.
    const g = gradePickClv({
      pickType: "SPREAD",
      selection: "Eagles +3.0",
      homeTeamName: "Chiefs",
      lockLine: -3.0,
      lockPrice: null,
      close,
    });
    expect(g!.value).toBeCloseTo(-1.0, 6);
    expect(g!.verdict).toBe("LOST_TO_CLOSE");
  });

  it("total OVER: locking a lower number than the close beats it", () => {
    // Locked OVER 45, close 47 → over needed fewer points at our number → close-pick = +2 → beat.
    const g = gradePickClv({
      pickType: "TOTAL",
      selection: "OVER 45.0",
      homeTeamName: "Chiefs",
      lockLine: 45.0,
      lockPrice: null,
      close,
    });
    expect(g!.value).toBeCloseTo(2.0, 6);
    expect(g!.verdict).toBe("BEAT_CLOSE");
    expect(g!.closeLine).toBe(47.0);
  });

  it("returns null when the close has no number for that market", () => {
    const noMl: ClosingSnapshot = { ...close, mlHomePrice: null, mlAwayPrice: null };
    const g = gradePickClv({
      pickType: "MONEYLINE",
      selection: "Chiefs ML (-150)",
      homeTeamName: "Chiefs",
      lockLine: null,
      lockPrice: -150,
      close: noMl,
    });
    expect(g).toBeNull();
  });

  it("returns null when the lock price/line was never captured", () => {
    const g = gradePickClv({
      pickType: "MONEYLINE",
      selection: "Chiefs ML (-150)",
      homeTeamName: "Chiefs",
      lockLine: null,
      lockPrice: null,
      close,
    });
    expect(g).toBeNull();
  });
});
