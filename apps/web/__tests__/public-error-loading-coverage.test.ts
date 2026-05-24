import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const routes = ["picks", "dashboard", "performance", "pricing", "methodology", "observatory", "vault", "about", "press", "contact", "blog"];
const appDir = path.resolve(__dirname, "../app");

describe("public route error and loading coverage", () => {
  for (const route of routes) {
    it(`${route}/error.tsx exists`, () => {
      expect(fs.existsSync(path.join(appDir, route, "error.tsx"))).toBe(true);
    });

    it(`${route}/loading.tsx exists`, () => {
      expect(fs.existsSync(path.join(appDir, route, "loading.tsx"))).toBe(true);
    });
  }

  for (const route of routes) {
    it(`${route}/error.tsx contains "use client" and reset prop`, () => {
      const src = fs.readFileSync(path.join(appDir, route, "error.tsx"), "utf8");
      expect(src).toContain('"use client"');
      expect(src).toContain("reset");
    });

    it(`${route}/error.tsx does not leak error.message or error.stack`, () => {
      const src = fs.readFileSync(path.join(appDir, route, "error.tsx"), "utf8");
      expect(src).not.toContain("error.message");
      expect(src).not.toContain("error.stack");
    });
  }
});
