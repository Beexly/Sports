import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "..", "..", "..");

type LaunchPage = {
  readonly route: string;
  readonly file: string;
  readonly requiredCopy: readonly string[];
};

const LAUNCH_PAGES: readonly LaunchPage[] = [
  {
    route: "/media-kit",
    file: "apps/web/app/media-kit/page.tsx",
    requiredCopy: [
      "Reach an audience built around evidence",
      "No fabricated audience numbers.",
      "No fabricated revenue",
      "SPONSORSHIP_PACKAGES",
      "SPONSOR_CANNOT_CONTROL",
    ],
  },
  {
    route: "/partners",
    file: "apps/web/app/partners/page.tsx",
    requiredCopy: [
      "Partnerships with editorial independence.",
      "Selection standards",
      "Disclosure policy",
      "Responsible gaming",
      "SPONSOR_CANNOT_CONTROL",
    ],
  },
  {
    route: "/newsletter",
    file: "apps/web/app/newsletter/page.tsx",
    requiredCopy: [
      "No email provider is wired here yet",
      "No-Bet Playbook",
      "Market Mirage Checklist",
      "Sports AI Builder Field Guide",
      "Fantasy Role Volatility Watchlist",
      "Draft-only concept",
      "source review, claim scan, and operator approval",
    ],
  },
  {
    route: "/content-lab",
    file: "apps/web/app/content-lab/page.tsx",
    requiredCopy: [
      "CONTENT_PILLARS",
      "The content system behind GSE and GSN.",
      "repo-backed trust surfaces",
      "without unsupported public claims",
    ],
  },
  {
    route: "/case-studies/aws-governed-sports-intelligence",
    file: "apps/web/app/case-studies/aws-governed-sports-intelligence/page.tsx",
    requiredCopy: [
      "AWS-governed sports intelligence, built locally before it is allowed to run.",
      "This page is a portfolio case study, not an AWS deployment claim.",
      "AWS_CASE_STUDY_PILLARS",
      "AWS_CASE_STUDY_LIVE_ACTION_LOCKS",
      "Live-action locks",
    ],
  },
  {
    route: "/podcast",
    file: "apps/web/app/podcast/page.tsx",
    requiredCopy: [
      "GSE Board Meeting, coming soon.",
      "No feed, sponsor inventory, or publishing integration is active yet.",
      "what shipped",
      "what broke",
      "what the model learned",
      "what GSE passed on",
      "partner/tool spotlight",
      "no auto-publishing path",
    ],
  },
  {
    route: "/pricing",
    file: "apps/web/app/pricing/page.tsx",
    requiredCopy: [
      "public record as settled history accumulates",
      "Public record & calibration status",
      "line-value tracker",
      "holds back a public win-rate until enough canonical settled history exists",
      "The Calibration Report stays gated",
    ],
  },
] as const;

const LIVE_PROVIDER_MARKERS = [
  "sendgrid",
  "mailchimp",
  "convertkit",
  "draftkings",
  "fanduel",
  "prizepicks",
  "underdog",
  "betmgm",
  "caesars",
] as const;

const UNSUPPORTED_LAUNCH_CLAIMS = [
  "verified win rate",
  "guaranteed ROI",
  "guaranteed profit",
  "active sponsors",
  "monthly visitors",
  "YouTube monetized",
  "proves your own edge",
  "CLV Ledger",
] as const;

function readRepoFile(file: string): string {
  return readFileSync(resolve(repoRoot, file), "utf8");
}

describe("launch-facing commercial page QA", () => {
  it("keeps every launch route navigable, canonical, and responsive at source level", () => {
    for (const page of LAUNCH_PAGES) {
      const src = readRepoFile(page.file);
      expect(src, `${page.route} metadata`).toContain("export const metadata");
      expect(src, `${page.route} canonical`).toContain(`canonical: "${page.route}"`);
      expect(src, `${page.route} nav`).toContain("<Nav />");
      expect(src, `${page.route} footer`).toContain("<Footer />");
      expect(src, `${page.route} main landmark`).toContain('id="main-content"');
      expect(src, `${page.route} mobile padding`).toContain("px-4");
      expect(src, `${page.route} tablet padding`).toContain("sm:px-6");
      expect(src, `${page.route} desktop padding`).toContain("lg:px-8");
      expect(src, `${page.route} constrained layout`).toMatch(/max-w-(?:4xl|5xl|6xl|7xl)/);
    }
  });

  it("keeps the exact commercial promise visible on each route", () => {
    for (const page of LAUNCH_PAGES) {
      const src = readRepoFile(page.file);
      for (const phrase of page.requiredCopy) {
        expect(src, `${page.route} required copy: ${phrase}`).toContain(phrase);
      }
    }
  });

  it("keeps newsletter, content-lab, podcast, and sponsor pages launch-safe", () => {
    const launchOnlyPages = LAUNCH_PAGES.filter((page) => page.route !== "/pricing");
    for (const page of launchOnlyPages) {
      const src = readRepoFile(page.file).toLowerCase();
      expect(src, `${page.route} does not call external providers`).not.toContain("fetch(");
      expect(src, `${page.route} does not read env secrets`).not.toContain("process.env");
      for (const marker of LIVE_PROVIDER_MARKERS) {
        expect(src, `${page.route} has no live provider marker ${marker}`).not.toContain(marker);
      }
    }
  });

  it("blocks unsupported public proof, traffic, sponsor, and ROI claims across launch pages", () => {
    for (const page of LAUNCH_PAGES) {
      const src = readRepoFile(page.file).toLowerCase();
      for (const claim of UNSUPPORTED_LAUNCH_CLAIMS) {
        expect(src, `${page.route} unsupported claim: ${claim}`).not.toContain(claim.toLowerCase());
      }
    }
  });

  it("keeps sponsor influence separated from editorial, model, no-bet, loss, and calibration surfaces", () => {
    const sponsorPages = ["/media-kit", "/partners"] as const;
    for (const route of sponsorPages) {
      const page = LAUNCH_PAGES.find((item) => item.route === route);
      expect(page, `${route} test fixture`).toBeDefined();
      if (!page) continue;

      const src = readRepoFile(page.file);
      for (const boundary of ["picks", "model outputs", "no-bet decisions", "loss autopsies", "calibration claims"]) {
        expect(src, `${route} sponsor boundary: ${boundary}`).toContain(boundary);
      }
    }
  });
});
