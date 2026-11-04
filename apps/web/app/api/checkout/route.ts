import { NextRequest, NextResponse } from "next/server";
import { GET as packageCheckoutGet, POST as packageCheckoutPost } from "../packages/checkout/route";
import { POST as subscriptionCheckoutPost } from "../subscriptions/checkout/route";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier");
  if (tier) {
    return subscriptionCheckoutPost(req);
  }
  return packageCheckoutGet(req);
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const clone = req.clone();
    try {
      const body = await clone.json();
      if (body && body.tier) {
        return subscriptionCheckoutPost(req);
      }
    } catch {
      // Continue to package checkout
    }
  }
  return packageCheckoutPost(req);
}
