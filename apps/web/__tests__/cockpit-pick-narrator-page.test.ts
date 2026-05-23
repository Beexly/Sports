import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const ROUTE = resolve(repoRoot, "app/api/cockpit/pick-narrator/route.ts");
const PAGE = resolve(repoRoot, "app/cockpit/pick-narrator/page.tsx");
const FORM = resolve(repoRoot, "components/cockpit/pick-narrator-form.tsx");
const LAYOUT = resolve(repoRoot, "app/cockpit/layout.tsx");

describe("/api/cockpit/pick-narrator route", () => {
  const src = readFileSync(ROUTE, "utf8");

  it("dynamic + admin 403 + delegates to narratePick", () => {
    expect(src).toMatch(/dynamic\s*=\s*["']force-dynamic["']/);
    expect(src).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(src).toMatch(/403/);
    expect(src).toMatch(/narratePick/);
  });

  it("rate-limits with 10/min fail-closed", () => {
    expect(src).toMatch(/checkRateLimit/);
    expect(src).toMatch(/cockpit-pick-narrator/);
    expect(src).toMatch(/failureMode:\s*["']fail-closed["']/);
    expect(src).toMatch(/maxRequests:\s*10/);
  });

  it("validates body shape (looksLikeScoredPick) + returns 400 on bad input", () => {
    expect(src).toMatch(/looksLikeScoredPick/);
    expect(src).toMatch(/400/);
  });

  it("wraps narrator in try/catch with 500 envelope (no internal leak)", () => {
    expect(src).toMatch(/try\s*\{[\s\S]*narratePick[\s\S]*\}\s*catch/);
    expect(src).toMatch(/narrator-failed/);
    expect(src).toMatch(/500/);
  });

  it("Cache-Control: no-store + no DB writes + no publishedAt", () => {
    expect(src).toMatch(/Cache-Control[^"']*no-store/);
    expect(src).not.toMatch(/db\.\w+\.(create|update|delete|upsert)\b/);
    expect(src).not.toMatch(/publishedAt\s*[:=]\s*new\s+Date/);
  });

  it("only exports POST — no GET / PUT / PATCH / DELETE", () => {
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
    expect(src).not.toMatch(/export\s+async\s+function\s+(GET|PUT|PATCH|DELETE)/);
  });
});

describe("/cockpit/pick-narrator page", () => {
  const src = readFileSync(PAGE, "utf8");
  const form = readFileSync(FORM, "utf8");
  const layout = readFileSync(LAYOUT, "utf8");

  it("page declares metadata.robots.index = false and imports the form", () => {
    expect(src).toMatch(/robots:[\s\S]*index:\s*false/);
    expect(src).toMatch(/PickNarratorForm/);
  });

  it("form is 'use client' + POSTs to /api/cockpit/pick-narrator", () => {
    expect(form.trimStart()).toMatch(/^["']use client["']/);
    expect(form).toMatch(/fetch\(["']\/api\/cockpit\/pick-narrator["']/);
    expect(form).toMatch(/method:\s*["']POST["']/);
  });

  it("form validates JSON before submit + caps input length", () => {
    expect(form).toMatch(/JSON\.parse\(pickJson\)/);
    expect(form).toMatch(/MAX_INPUT_CHARS/);
  });

  it("form does not persist findings (no localStorage / sessionStorage)", () => {
    expect(form).not.toMatch(/localStorage|sessionStorage/);
    const fetchCount = (form.match(/fetch\(/g) ?? []).length;
    expect(fetchCount).toBe(1);
  });

  it("form exposes deterministic test ids", () => {
    expect(form).toMatch(/data-testid="pick-narrator-input"/);
    expect(form).toMatch(/data-testid="pick-narrator-submit"/);
    expect(form).toMatch(/data-testid="pick-narrator-result"/);
  });

  it("nav has /cockpit/pick-narrator entry", () => {
    expect(layout).toMatch(/href:\s*["']\/cockpit\/pick-narrator["']/);
    expect(layout).toMatch(/label:\s*["']Pick narrator["']/);
  });

  it("form emits no hype / automation language", () => {
    expect(form).not.toMatch(/auto[- ]bet|auto[- ]publish|guaranteed/i);
  });
});
