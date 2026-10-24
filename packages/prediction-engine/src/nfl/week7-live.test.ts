import { describe, expect, it } from "vitest";
import { footballguysWeekly, fantasyProsWeekly } from "./public-boards";
import { espnStatus, rotowireHeadlines, sleeperBoard, snapShock, thursdayActual, week7Slate } from "./week7-live";

describe("week 7 wires", () => {
  it("has the Thursday result and the bye list", () => {
    const slate = week7Slate();
    const thursday = slate.games.find((g) => g.home === "CHI" && g.away === "NE");
    expect(thursday).toMatchObject({ state: "post", home_score: "30", away_score: "24" });
    expect(slate.byes).toEqual(expect.arrayContaining(["BUF", "LAC", "WSH", "JAX"]));
  });

  it("prices Lamar three different ways while he is questionable", () => {
    expect(espnStatus("Lamar Jackson")).toMatchObject({ team: "BAL", status: "Questionable" });
    const sleeper = sleeperBoard("QB").find((p) => p.name === "Lamar Jackson");
    const fp = fantasyProsWeekly("QB").find((p) => p.name === "Lamar Jackson");
    const fbg = footballguysWeekly("QB").find((p) => p.name === "Lamar Jackson");
    expect(sleeper!.pts_ppr).toBeGreaterThan(18);
    expect(Number(fp!.pts)).toBeGreaterThan(15);
    expect(fbg!.pts).toBeLessThan(12);
  });

  it("separates a snap crash from a player who is coming back", () => {
    expect(espnStatus("Terry McLaurin")).toMatchObject({ status: "Out" });
    expect(snapShock("Terry McLaurin")!.delta).toBeLessThan(-0.5);
    expect(espnStatus("Romeo Doubs")).toMatchObject({ team: "NE", status: "Injured Reserve" });
    expect(snapShock("Cam Skattebo")!.delta).toBeLessThan(-0.4);
    expect(rotowireHeadlines().some((title) => title.startsWith("Cam Skattebo:"))).toBe(true);
  });

  it("does not treat Thursday's projection as the result", () => {
    const projected = sleeperBoard("QB").find((p) => p.name === "Drake Maye");
    const actual = thursdayActual("Drake Maye");
    expect(projected!.pts_ppr).toBeLessThan(25);
    expect(actual!.pts_ppr).toBeGreaterThan(projected!.pts_ppr);
    expect(actual!.pass_yd).toBeGreaterThan(300);
  });
});
