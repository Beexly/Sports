import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(resolve(__dirname, "..", "app", "partners", "page.tsx"), "utf8");

describe("/partners page", () => {
  it("renders partner standards", () => {
    expect(src).toContain("Partnerships with editorial independence.");
    expect(src).toContain("Selection standards");
  });

  it("includes disclosure and responsible gaming language", () => {
    expect(src).toContain("disclosed");
    expect(src).toContain("Disclosure policy");
    expect(src).toContain("Responsible gaming");
    expect(src).toContain("responsible-gaming text");
  });

  it("states sponsor cannot control picks, model, no-bet, loss autopsy, or calibration", () => {
    expect(src).toContain("SPONSOR_CANNOT_CONTROL");
    for (const phrase of ["picks", "model outputs", "no-bet decisions", "loss autopsies", "calibration claims"]) {
      expect(src).toContain(phrase);
    }
  });
});
