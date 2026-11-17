import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { PUBLIC_RECORD_LINE } from "@/lib/ledger/public-record";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, If-None-Match",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "public, max-age=3600, must-revalidate",
};

export function buildGseAgentCard() {
  return {
    name: "Galaxy Sports Edge",
    description:
      `Global multi-sport quantitative slate intelligence (NFL live; NCAAF, NBA, NCAAB, MLB, NHL, MLS, and international soccer expanding), player prop distributions, Daily Fantasy Sports cash and tournament builders, correlated same-game parlay evaluations, and cryptographic Proof-of-Record verification operated by Galaxy Sports Network LLC. Settled record status: ${PUBLIC_RECORD_LINE}. Sports wagering carries real risk; 21+ (18+ where applicable); call 1-800-GAMBLER.`,
    version: "4.0.0",
    provider: {
      organization: "Galaxy Sports Network LLC",
      url: "https://www.galaxysportsedge.com",
    },
    documentationUrl: "https://www.galaxysportsedge.com/llms-full.txt",
    iconUrl: "https://www.galaxysportsedge.com/favicon.ico",
    supportedInterfaces: [
      {
        url: "https://www.galaxysportsedge.com/api/agent/a2a",
        protocolBinding: "HTTP+JSON",
        protocolVersion: "1.0",
      },
      {
        url: "https://www.galaxysportsedge.com/api/agent/a2a",
        protocolBinding: "JSONRPC",
        protocolVersion: "1.0",
      },
    ],
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extendedAgentCard: false,
    },
    defaultInputModes: ["application/json", "text/plain"],
    defaultOutputModes: ["application/json", "text/markdown", "text/html"],
    skills: [
      {
        id: "multisport-slate-signals",
        name: "Multi-Sport Quantitative Slate Signals and Matchup Board",
        description:
          "Read calibrated game projections, matchup edges, and market-vs-model pricing signals across NFL slates and expanding global leagues (NBA, MLB, NHL, NCAAF, NCAAB, MLS, Soccer).",
        tags: ["nfl", "nba", "mlb", "soccer", "sports-analytics", "projections"],
        examples: [
          "Summarize active NFL Week slate matchups and public methodology on Galaxy Sports Edge.",
        ],
        inputModes: ["text/plain", "application/json"],
        outputModes: ["text/markdown", "application/json"],
      },
      {
        id: "player-props-and-usage-lab",
        name: "Player Lab, Usage Reallocation, and Prop Distributions",
        description:
          "Inspect player usage shares, injury-adjusted yardage/stat distributions, and anytime touchdown evaluations at https://www.galaxysportsedge.com/props.",
        tags: ["player-props", "usage", "touchdowns", "distributions"],
        examples: [
          "Where can I inspect NFL player prop projections and anytime touchdown notes on Galaxy Sports Edge?",
        ],
        inputModes: ["text/plain", "application/json"],
        outputModes: ["text/markdown", "application/json"],
      },
      {
        id: "dfs-cash-and-tournament-builders",
        name: "Daily Fantasy Sports Cash, GPP, and Showdown Workspace",
        description:
          "Access DraftKings Main Slate, Late Slate, and Single-Game Showdown 1.5x Captain lineup construction tools at https://www.galaxysportsedge.com/fantasy/dfs.",
        tags: ["dfs", "draftkings", "showdown", "fantasy-sports"],
        examples: [
          "Show Galaxy Sports Edge DFS Showdown and Main Slate builder options.",
        ],
        inputModes: ["text/plain", "application/json"],
        outputModes: ["text/markdown", "application/json"],
      },
      {
        id: "tamper-evident-accountability-ledger",
        name: "Public Settlement Ledger, Loss Room, and Hash Proof",
        description:
          "Verify settled picks, operator loss autopsies, Honest Band calibration rules, and cryptographic hash fingerprints at https://www.galaxysportsedge.com/accountability.",
        tags: ["accountability", "clv", "calibration", "audit-ledger"],
        examples: [
          "Verify Galaxy Sports Edge public settlement rules and Loss Room post-mortems.",
        ],
        inputModes: ["text/plain", "application/json"],
        outputModes: ["text/markdown", "application/json"],
      },
    ],
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const card = buildGseAgentCard();
  const body = JSON.stringify(card, null, 2);
  const etag = `"gse-a2a-${crypto.createHash("sha256").update(body).digest("hex").slice(0, 16)}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ...CORS_HEADERS, ETag: etag },
    });
  }
  return new NextResponse(body, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      ETag: etag,
    },
  });
}
