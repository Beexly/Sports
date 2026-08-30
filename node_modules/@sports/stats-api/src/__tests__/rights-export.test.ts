import { describe, expect, it } from "vitest";
import { classifyExport, requireSpdx } from "../rights-export.js";

describe("export path classifier", () => {
  it("blocks dark surfaces", () => {
    const c = classifyExport({
      bulkRowCount: 10,
      includesRawSourceRows: false,
      licenseSpdx: "CC-BY-4.0",
      surface: "dark",
    });
    expect(c.class).toBe("BLOCKED");
  });

  it("classifies bulk ODbL as derivative DB", () => {
    const c = classifyExport({
      bulkRowCount: 50_000,
      includesRawSourceRows: true,
      licenseSpdx: "ODbL-1.0",
      surface: "public_api",
    });
    expect(c.class).toBe("DERIVATIVE_DB");
  });

  it("classifies CC-BY metrics as RESULT", () => {
    const c = classifyExport({
      bulkRowCount: 100,
      includesRawSourceRows: false,
      licenseSpdx: "CC-BY-4.0",
      surface: "public_api",
    });
    expect(c.class).toBe("RESULT");
    expect(c.attributionRequired).toBe(true);
  });

  it("requireSpdx refuse-default", () => {
    expect(requireSpdx({}).ok).toBe(false);
    expect(requireSpdx({ licenseSpdx: "MIT" }).ok).toBe(true);
  });
});
