import { NextResponse } from "next/server";
import {
  GET as GET_CHAT,
  POST as POST_CHAT,
} from "./chat/completions/route";

export const dynamic = "force-dynamic";

// Guarded via verifyApiKey / OPENROUTER_PROVIDER_API_KEY in chat/completions/route.ts
export async function GET(req: Request): Promise<NextResponse> {
  return GET_CHAT(req);
}

export async function POST(req: Request): Promise<NextResponse | Response> {
  return POST_CHAT(req);
}
