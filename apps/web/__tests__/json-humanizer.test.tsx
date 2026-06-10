import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  JsonHumanizer,
  type JsonFieldSchema,
} from "@/components/ui/json-humanizer";
import CockpitBriefPage from "@/app/cockpit/brief/page";

/**
 * JsonHumanizer — the raw-JSON → human-readable table/card.
 * Ported from canonical (Sports-canonical-2026-06-03); the kit-reuse
 * assertions are adapted because this clone inlines the card/eyebrow/pill
 * markup instead of importing the shared kit components.
 *
 * Proves the product contract:
 *   - renders a plain title + a "used for" line
 *   - renders each field with its schema EXPLANATION ("what it means")
 *   - the raw JSON is present ONLY as a secondary copy/download action, never a
 *     primary CTA and never a <pre> dump
 *   - honest empty state for empty/null payloads
 *   - never fabricates a value (renders exactly what it is handed)
 *   - design tokens only; no banned legacy classes / phrases
 *   - the wired surface (/cockpit/brief) renders the humanizer, not raw JSON
 */

afterEach(() => cleanup());

const COUNTS = { cleared: 12, blocked: 3, total: 15 };

const SCHEMA: ReadonlyArray<JsonFieldSchema> = [
  { key: "cleared", label: "Cleared", description: "Sources we may ingest." },
  { key: "blocked", label: "Refused", description: "Sources we refuse to touch." },
  { key: "total", label: "Total declared", description: "Cleared plus refused." },
];

describe("JsonHumanizer — title, used-for, and schema explanations", () => {
  it("renders a plain title and the 'used for' line", () => {
    render(
      <JsonHumanizer
        data={COUNTS}
        title="Registry at a glance"
        usedFor="A fast integrity check on the source registry."
        schema={SCHEMA}
      />,
    );
    expect(screen.getByText("Registry at a glance")).toBeInTheDocument();
    expect(screen.getByText(/Used for:/)).toBeInTheDocument();
    expect(
      screen.getByText(/A fast integrity check on the source registry\./),
    ).toBeInTheDocument();
  });

  it("renders each field with its human label, real value, and schema explanation", () => {
    render(<JsonHumanizer data={COUNTS} title="Counts" schema={SCHEMA} />);

    const table = screen.getByTestId("json-humanizer-object-table");
    // The "What it means" column exists because the schema carries descriptions.
    expect(within(table).getByText("What it means")).toBeInTheDocument();

    // Labels (humanized), real values, and per-field explanations all render.
    expect(within(table).getByText("Cleared")).toBeInTheDocument();
    expect(within(table).getByText("12")).toBeInTheDocument();
    expect(within(table).getByText("Sources we may ingest.")).toBeInTheDocument();

    expect(within(table).getByText("Refused")).toBeInTheDocument();
    expect(within(table).getByText("3")).toBeInTheDocument();
    expect(
      within(table).getByText("Sources we refuse to touch."),
    ).toBeInTheDocument();

    expect(within(table).getByText("Total declared")).toBeInTheDocument();
    expect(within(table).getByText("15")).toBeInTheDocument();
  });

  it("humanizes unknown keys instead of inventing an explanation for them", () => {
    render(
      <JsonHumanizer
        data={{ rateLimitPerMin: 60 }}
        title="Limits"
        schema={[]}
      />,
    );
    // camelCase → "Rate Limit Per Min", value preserved, no fabricated copy.
    expect(screen.getByText("Rate Limit Per Min")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    // With no descriptions in the schema, the explanation column is suppressed.
    expect(screen.queryByText("What it means")).not.toBeInTheDocument();
  });
});

describe("JsonHumanizer — raw JSON is a SECONDARY action only", () => {
  it("exposes copy + download as secondary buttons, not a primary CTA", () => {
    render(<JsonHumanizer data={COUNTS} title="Counts" schema={SCHEMA} />);

    const copy = screen.getByTestId("json-copy-raw");
    const download = screen.getByTestId("json-download-raw");
    expect(copy).toBeInTheDocument();
    expect(download).toBeInTheDocument();

    // Demoted: neutral surface pill, NOT the plasma-glow primary CTA.
    expect(copy.className).not.toMatch(/btn-primary/);
    expect(copy.className).toMatch(/border-surface-line/);
    expect(copy.className).toMatch(/rounded-full/);
  });

  it("does NOT render a raw <pre> JSON dump into the DOM", () => {
    const { container } = render(
      <JsonHumanizer data={COUNTS} title="Counts" schema={SCHEMA} />,
    );
    // No <pre> wall — the readable table is the surface; raw is on-demand only.
    expect(container.querySelector("pre")).toBeNull();
    // The pretty-printed blob must not be sitting in the rendered text.
    expect(container.textContent ?? "").not.toContain('"cleared": 12');
  });

  it("copies the exact payload (not a fabricated one) to the clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<JsonHumanizer data={COUNTS} title="Counts" schema={SCHEMA} />);

    // Wrap the click + its awaited clipboard write so the "Copied" state update
    // is flushed inside act() (no React warning, mirrors real interaction).
    await act(async () => {
      fireEvent.click(screen.getByTestId("json-copy-raw"));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0]![0] as string;
    // Round-trips back to EXACTLY the input — no added/removed fields.
    expect(JSON.parse(copied)).toEqual(COUNTS);
  });
});

describe("JsonHumanizer — honest empty state (never fabricated)", () => {
  it("shows an honest empty message for an empty object", () => {
    render(<JsonHumanizer data={{}} title="Counts" schema={SCHEMA} />);
    const empty = screen.getByTestId("json-humanizer-empty");
    expect(empty).toBeInTheDocument();
    // No fabricated rows.
    expect(screen.queryByTestId("json-humanizer-object-table")).not.toBeInTheDocument();
  });

  it("shows an honest empty message for an empty array and for null", () => {
    const { rerender } = render(
      <JsonHumanizer data={[]} title="Rows" emptyLabel="No rows yet." />,
    );
    expect(screen.getByText("No rows yet.")).toBeInTheDocument();

    rerender(<JsonHumanizer data={null} title="Rows" emptyLabel="No rows yet." />);
    expect(screen.getByText("No rows yet.")).toBeInTheDocument();
  });
});

describe("JsonHumanizer — array + nested rendering", () => {
  it("renders an array of objects as a table with schema-ordered columns", () => {
    const rows = [
      { id: "nflverse", commercial: true },
      { id: "espn-hidden-api", commercial: false },
    ];
    render(
      <JsonHumanizer
        data={rows}
        title="Sources"
        schema={[{ key: "id", label: "Source" }]}
      />,
    );
    const table = screen.getByTestId("json-humanizer-array-table");
    expect(within(table).getByText("Source")).toBeInTheDocument();
    expect(within(table).getByText("nflverse")).toBeInTheDocument();
    expect(within(table).getByText("espn-hidden-api")).toBeInTheDocument();
    // Booleans humanized (yes/no), not raw "true"/"false".
    expect(within(table).getAllByText("yes").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("no").length).toBeGreaterThan(0);
  });

  it("renders an array of primitives as an ordered list", () => {
    render(<JsonHumanizer data={["alpha", "beta"]} title="Tags" />);
    const list = screen.getByTestId("json-humanizer-primitive-list");
    expect(within(list).getByText("alpha")).toBeInTheDocument();
    expect(within(list).getByText("beta")).toBeInTheDocument();
  });

  it("renders a nested array value as a compact chip set inside a row", () => {
    render(
      <JsonHumanizer
        data={{ datasets: ["pbp", "rosters", "snaps"] }}
        title="Source"
      />,
    );
    expect(screen.getByText("pbp")).toBeInTheDocument();
    expect(screen.getByText("rosters")).toBeInTheDocument();
    expect(screen.getByText("snaps")).toBeInTheDocument();
  });
});

// ── wired surface: /cockpit/brief renders the humanizer, not raw JSON ────────

describe("/cockpit/brief — humanized brief surface (newly wired)", () => {
  it("renders the composed brief through JsonHumanizer with raw demoted", () => {
    const { container } = render(<CockpitBriefPage />);

    // The humanized card is the surface.
    expect(screen.getByTestId("cockpit-brief-humanized")).toBeInTheDocument();
    expect(screen.getByText("Today's brief at a glance")).toBeInTheDocument();

    // Real composed fields render with their schema explanations.
    const table = screen.getByTestId("json-humanizer-object-table");
    expect(within(table).getByText("Brief date")).toBeInTheDocument();
    expect(within(table).getByText("Status")).toBeInTheDocument();
    expect(
      within(table).getByText("Lifecycle state — DRAFT briefs are internal-only."),
    ).toBeInTheDocument();
    expect(within(table).getByText("DRAFT")).toBeInTheDocument();

    // Raw JSON is demoted to the secondary copy/download actions only.
    expect(screen.getByTestId("json-copy-raw")).toBeInTheDocument();
    expect(screen.getByTestId("json-download-raw")).toBeInTheDocument();
    expect(container.querySelector("pre")).toBeNull();
    expect(container.textContent ?? "").not.toContain('"status":');
  });

  it("page source mounts the humanizer and no longer fronts the raw endpoint", () => {
    const src = readFileSync(
      resolve(__dirname, "..", "app/cockpit/brief/page.tsx"),
      "utf8",
    );
    expect(src).toMatch(/JsonHumanizer/);
    expect(src).toMatch(/composeDailyBrief/);
    // The old stub pointed the operator at the raw JSON API as the only way
    // to see the brief. That affordance must not return.
    expect(src).not.toContain("/api/cockpit/brief");
    expect(src).not.toMatch(/<pre[\s>]/);
  });
});

// ── source-level guards: tokens, no banned phrases ──────────────────────────

describe("JsonHumanizer — design tokens and copy hygiene (source scan)", () => {
  const repoRoot = resolve(__dirname, "..");
  const humanizerSrc = readFileSync(
    resolve(repoRoot, "components/ui/json-humanizer.tsx"),
    "utf8",
  );
  const actionsSrc = readFileSync(
    resolve(repoRoot, "components/ui/json-raw-actions.tsx"),
    "utf8",
  );

  it("uses approved design tokens only (no legacy ink/text-white/surface-card)", () => {
    for (const src of [humanizerSrc, actionsSrc]) {
      expect(src).not.toMatch(/\bink-/);
      expect(src).not.toMatch(/text-white\b/);
      expect(src).not.toMatch(/surface-card\b/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{6}/);
    }
  });

  it("keeps the canonical kit markup (card surface, eyebrow, secondary pill) inlined", () => {
    // Deploy-clone delta: the shared kit components are not present here, so
    // the humanizer inlines the exact same token classes instead.
    expect(humanizerSrc).toMatch(/bg-surface-raised/);
    expect(humanizerSrc).toMatch(/text-orbital-cyan/);
    expect(humanizerSrc).toMatch(/JsonRawActions/);
    expect(actionsSrc).toMatch(/rounded-full border border-surface-line/);
  });

  it("does NOT render a pretty-printed JSON dump inside a <pre> (humanized, not dumped)", () => {
    // The canonical help-coverage scanner flags JSON.stringify(x, null, 2)
    // inside a <pre>. The humanizer must never trip it: raw is on-demand only.
    const prettyDumpInPre = (src: string) =>
      /JSON\.stringify\([^)]*,\s*null,\s*2\s*\)/.test(src) && /<pre[\s>]/.test(src);
    expect(prettyDumpInPre(humanizerSrc)).toBe(false);
    expect(prettyDumpInPre(actionsSrc)).toBe(false);
  });

  it("avoids hype phrasing in component copy", () => {
    // Betting-hype phrases, not technical English (a "key/value block" comment
    // and a "clipboard blocked" comment are both legitimate and allowed).
    const banned = [
      /guarantee/i,
      /lock\s+in/i,
      /\bsure thing\b/i,
      /can't lose/i,
      /\bbankroll\b/i,
    ];
    for (const src of [humanizerSrc, actionsSrc]) {
      for (const re of banned) expect(src).not.toMatch(re);
    }
  });
});
