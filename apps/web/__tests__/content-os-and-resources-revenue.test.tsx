import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "fs";
import path from "path";

// Mock Nav and Footer to isolate testing to page content
vi.mock("@/components/ui/nav", () => ({
  Nav: () => <nav data-testid="nav-mock">Nav</nav>,
}));
vi.mock("@/components/ui/footer", () => ({
  Footer: () => <footer data-testid="footer-mock">Footer</footer>,
}));

import ResourcesCardSuppliesPage, {
  CARD_SUPPLY_ITEMS,
  CATEGORIES,
  metadata,
} from "@/app/resources/card-supplies/page";

describe("Resources Card Supplies & Operator Revenue Surface", () => {
  it("renders page with metadata title <= 60 characters", () => {
    expect(metadata.title).toBeDefined();
    const titleString = String(metadata.title);
    expect(titleString.length).toBeLessThanOrEqual(60);
  });

  it("renders the one-sentence answer paragraph at the top per §1E / W-72", () => {
    const { getByText } = render(<ResourcesCardSuppliesPage />);
    const answerParagraph = getByText(
      /A curated reference guide of tournament-grade grading supplies, vault cases, live breaking studio gear, and quantitative study tools used by Galaxy Sports Edge operators\./i,
    );
    expect(answerParagraph).toBeInTheDocument();
  });

  it("renders the explicit, prominent #affiliate disclosure banner per Rule R4 / §4.3", () => {
    const { getByText } = render(<ResourcesCardSuppliesPage />);
    const expectedDisclosure =
      "Disclosure (#affiliate): As an Amazon Associate (tag: galaxysportse-20), Galaxy Sports Edge earns from qualifying purchases at no additional cost to you.";
    expect(getByText(expectedDisclosure)).toBeInTheDocument();
  });

  it("renders exactly 22 curated Amazon Associates items across 4 categories with tag=galaxysportse-20", () => {
    expect(CARD_SUPPLY_ITEMS.length).toBe(22);
    expect(CATEGORIES.length).toBe(4);

    const { container } = render(<ResourcesCardSuppliesPage />);

    // Find all amazon outbound links
    const amazonLinks = Array.from(
      container.querySelectorAll('a[href*="amazon.com"]'),
    ) as HTMLAnchorElement[];

    expect(amazonLinks.length).toBe(22);

    amazonLinks.forEach((link) => {
      expect(link.href).toContain("tag=galaxysportse-20");
      expect(link.getAttribute("rel")).toContain("sponsored");
      expect(link.getAttribute("target")).toBe("_blank");
    });

    // Check all 22 specific item names exist
    const expectedItems = [
      // Grading & Submission Protection
      "Semi-Rigid Card Holders",
      "Penny Sleeves",
      "35pt Magnetic One-Touch",
      "Microfiber Grading Cloth",
      "Centering Loupe",
      "Archival Team Bags",
      // Storage & Vault Cases
      "Waterproof Slab Case",
      "3-Row Monster Box",
      "Top Loaders 3x4",
      "Card Dividers",
      "Silica Gel Desiccant Packs",
      "Thermal Label Printer",
      // Breaking & Studio Desk
      "Overhead 4K Document Camera Mount",
      "LED Key Light Panel",
      "Anti-Static Playmat",
      "Acrylic Card Stands",
      "Bubble Mailers #000",
      "Painters Tape",
      // Football Film & Quantitative Study
      "Grid Notebook",
      "Dual-Monitor Arm",
      "Mechanical Keypad",
      "Noise-Canceling Studio Headphones",
    ];

    expectedItems.forEach((itemName) => {
      expect(screen.getByText(itemName)).toBeInTheDocument();
    });
  });

  it("renders >= 2 internal links to /packages and /fantasy/dfs", () => {
    const { container } = render(<ResourcesCardSuppliesPage />);

    const packagesLinks = container.querySelectorAll('a[href="/packages"]');
    const dfsLinks = container.querySelectorAll('a[href="/fantasy/dfs"]');

    expect(packagesLinks.length).toBeGreaterThanOrEqual(1);
    expect(dfsLinks.length).toBeGreaterThanOrEqual(1);
    expect(packagesLinks.length + dfsLinks.length).toBeGreaterThanOrEqual(2);
  });

  it("contains zero banned slogans and zero Telegram mentions", () => {
    const { container } = render(<ResourcesCardSuppliesPage />);
    const pageText = container.textContent || "";

    // Banned slogan check
    expect(pageText.toUpperCase()).not.toContain("WE DETECT. YOU DECIDE.");
    // Telegram check
    expect(pageText.toLowerCase()).not.toContain("telegram");
  });
});

describe("Content OS Daily Packet API Route", () => {
  it("GET() returns 200, packet_id: PKT-2026-10-29, ROUNDUP (Host: Nova), and attribution kit", async () => {
    vi.resetModules();
    const route = await import("@/app/api/content-os/packet/route");
    const response = await route.GET();

    expect(response.status).toBe(200);

    const data = await response.json();

    // Required fields
    expect(data.packet_id).toBe("PKT-2026-10-29");
    expect(data.packet_version).toBe(1);
    expect(data.date).toBe("2026-10-29");

    // Standing creators
    expect(data.standing_creators).toContain("ROUNDUP (Host: Nova)");
    expect(data.standing_creators).toContain("BOARD");
    expect(data.standing_creators).toContain("FILMROOM");
    expect(data.standing_creators).toContain("EXPLAINER");
    expect(data.standing_creators).toContain("DEBATE (Bull vs Bear)");
    expect(data.standing_creators).toContain("VOICE (LiveKit/Bolna)");

    // Attribution Partner Kit §3.2
    expect(data.attribution_partner_kit).toBeDefined();
    expect(data.attribution_partner_kit.credit_line).toContain(
      "via @GalaxySportsHQ · Galaxy Sports Edge engine — board of 2026-10-29 · galaxysportsedge.com",
    );
    expect(data.attribution_partner_kit.canonical_url).toBe(
      "https://www.galaxysportsedge.com/packages",
    );
    expect(data.attribution_partner_kit.resources_url).toBe(
      "https://www.galaxysportsedge.com/resources/card-supplies",
    );

    // Board with PLAY and PASS calls, plain-English reasoning and price_check
    expect(Array.isArray(data.board)).toBe(true);
    expect(data.board.length).toBeGreaterThan(0);

    const firstGame = data.board[0];
    expect(firstGame.matchup).toBeDefined();
    expect(firstGame.reasoning).toBeDefined();
    expect(firstGame.price_check).toBeDefined();

    const allCalls = data.board.flatMap((g: { calls: Array<{ decision: string; reasoning: string; price_check: string }> }) => g.calls);
    const playCalls = allCalls.filter((c: { decision: string }) => c.decision === "PLAY");
    const passCalls = allCalls.filter((c: { decision: string }) => c.decision === "PASS");

    expect(playCalls.length).toBeGreaterThan(0);
    expect(passCalls.length).toBeGreaterThan(0);

    allCalls.forEach((call: { decision: string; reasoning: string; price_check: string }) => {
      expect(["PLAY", "PASS"]).toContain(call.decision);
      expect(call.reasoning).toBeTruthy();
      expect(call.price_check).toBeTruthy();
    });

    // Visual Packs (W-16) & Approval Digest (W-38)
    expect(Array.isArray(data.visual_packs)).toBe(true);
    expect(data.visual_packs.length).toBeGreaterThan(0);
    expect(data.visual_packs[0].printed_line).toBeDefined();
    expect(data.visual_packs[0].record_line).toBeDefined();

    expect(data.approval_digest).toBeDefined();
    expect(data.approval_digest.gate_status).toBe("PASS");
    expect(typeof data.approval_digest.total_calls).toBe("number");
    expect(typeof data.approval_digest.play_count).toBe("number");
    expect(typeof data.approval_digest.pass_count).toBe("number");
  });
});

describe("llms.txt Discoverability Block (W-72)", () => {
  it("public/llms.txt lists all canonical live sections and summary", () => {
    const candidatePaths = [
      path.join(process.cwd(), "public", "llms.txt"),
      path.join(process.cwd(), "apps", "web", "public", "llms.txt"),
      "C:\\Users\\Garrett\\Sports\\apps\\web\\public\\llms.txt",
    ];

    let content = "";
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        content = fs.readFileSync(p, "utf-8");
        break;
      }
    }

    expect(content).toBeTruthy();
    expect(content).toContain("Galaxy Sports Edge");
    expect(content).toContain("/packages");
    expect(content).toContain("/fantasy/dfs");
    expect(content).toContain("/resources/card-supplies");
    expect(content).toContain("/api/content-os/packet");
  });
});
