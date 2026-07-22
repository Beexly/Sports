import { describe, expect, it } from "vitest";
import { parseSource } from "../src/symbols.js";

const SAMPLE = `import { auth } from "./auth";
import type { Foo } from "../types";

export interface LogInput {
  seat: string;
}

export async function logHandoff(input: LogInput) {
  assertValidSeat(input.seat, "seat");
  return input;
}

class Internal {
  run() {
    return 1;
  }
}

export const CONST_A = 1;

export type Alias = string;

export enum Kind {
  A,
  B,
}
`;

describe("parseSource", () => {
  const { symbols, imports } = parseSource("sample.ts", SAMPLE);

  it("extracts import specifiers", () => {
    expect(imports.map((i) => i.specifier)).toEqual(["./auth", "../types"]);
  });

  it("extracts an exported interface", () => {
    const s = symbols.find((s) => s.symbolName === "LogInput");
    expect(s).toBeDefined();
    expect(s?.kind).toBe("interface");
    expect(s?.exported).toBe(true);
  });

  it("extracts an exported function with correct line span", () => {
    const s = symbols.find((s) => s.symbolName === "logHandoff");
    expect(s).toBeDefined();
    expect(s?.kind).toBe("function");
    expect(s?.exported).toBe(true);
    expect(s?.startLine).toBe(8);
    expect(s?.endLine).toBe(11);
  });

  it("extracts a non-exported class and flags exported=false", () => {
    const s = symbols.find((s) => s.symbolName === "Internal");
    expect(s).toBeDefined();
    expect(s?.kind).toBe("class");
    expect(s?.exported).toBe(false);
  });

  it("extracts class methods qualified by class name", () => {
    const s = symbols.find((s) => s.symbolName === "Internal.run");
    expect(s).toBeDefined();
    expect(s?.kind).toBe("method");
  });

  it("extracts exported const, type alias, and enum", () => {
    expect(symbols.find((s) => s.symbolName === "CONST_A")?.kind).toBe("const");
    expect(symbols.find((s) => s.symbolName === "Alias")?.kind).toBe("type");
    expect(symbols.find((s) => s.symbolName === "Kind")?.kind).toBe("enum");
  });
});
