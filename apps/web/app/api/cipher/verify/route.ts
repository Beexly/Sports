/**
 * The Glass Box Cipher — answer verification.  POST /api/cipher/verify
 *
 * Body: { week: number, answer: string }
 *
 * Verifies a submitted answer against the chapter's stored SHA-256 hash, fully
 * server-side — the plaintext solution never reaches the client and the bundle
 * never contains it. Brute force is throttled by a per-IP token bucket.
 *
 * REWARD IS FOUNDER-GATED. A correct solve does NOT comp a membership. It hands
 * out the next pre-provisioned, single-use code from CIPHER_REWARD_CODES (a
 * comma-separated env list of Stripe coupon/promo codes the founder created in
 * advance). With no pool configured, it returns a manual-claim reference and
 * logs the win for human fulfillment. Nothing is charged or granted here.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getChapterByWeek, getCipherStatus, normalizeAnswer } from "@/lib/cipher/cipher";
import { consumePublicFormRateLimit } from "@/lib/api/public-form-rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Durable rate limit (Postgres when Neon live) — multi-instance serverless cannot bypass.
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 8;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "anon";
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function hashEquals(aHex: string, bHex: string): boolean {
  if (aHex.length !== bHex.length) return false;
  try {
    return timingSafeEqual(Buffer.from(aHex, "hex"), Buffer.from(bHex, "hex"));
  } catch {
    return false;
  }
}

// ── Founder-gated reward issuance ─────────────────────────────────────────
// Pool is consumed in-order from the env list.
// Rate limit is durable (Postgres). Reward cursor remains process-local by design:
// founder pre-provisions codes; multi-instance may re-issue a code under race —
// treat CIPHER_REWARD_CODES as single-use Stripe coupons (Stripe enforces once).
// This route never creates or grants memberships.
const rewardPool = (process.env.CIPHER_REWARD_CODES ?? "")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);
let rewardCursor = 0;

function issueReward(week: number): { kind: "code" | "claim"; value: string } {
  if (rewardCursor < rewardPool.length) {
    const code = rewardPool[rewardCursor++]!;
    return { kind: "code", value: code };
  }
  // No pre-provisioned codes left/configured → manual claim reference.
  const claim = `CIPHER-W${week}-${sha256(`${week}:${Date.now()}`).slice(0, 8).toUpperCase()}`;
  return { kind: "claim", value: claim };
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = await consumePublicFormRateLimit("cipher-verify", ip, MAX_ATTEMPTS, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. The box rests. Try again shortly." },
      {
        status: limit.status,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  const week = typeof (body as { week?: unknown })?.week === "number" ? (body as { week: number }).week : NaN;
  const answerRaw = typeof (body as { answer?: unknown })?.answer === "string" ? (body as { answer: string }).answer : "";

  const chapter = getChapterByWeek(week);
  if (!chapter) {
    return NextResponse.json({ ok: false, error: "No such chapter." }, { status: 404 });
  }

  // Only a LIVE chapter accepts answers.
  const status = getCipherStatus();
  if (status.chapter.week !== chapter.week || status.state !== "live") {
    return NextResponse.json(
      { ok: false, error: "This transmission is sealed. Only the live chapter accepts answers." },
      { status: 409 },
    );
  }

  const normalized = normalizeAnswer(answerRaw);
  if (normalized.length === 0) {
    return NextResponse.json({ ok: false, error: "Empty answer." }, { status: 400 });
  }

  const correct = hashEquals(sha256(normalized), chapter.answerHash);
  if (!correct) {
    return NextResponse.json({ ok: false, correct: false, message: "Not it. Look deeper." });
  }

  const reward = issueReward(chapter.week);
  // Win log for human fulfillment / auditing. No PII, no grant performed here.
  console.info(`[cipher] week ${chapter.week} solved · reward ${reward.kind}:${reward.value} · ip ${ip}`);

  return NextResponse.json({
    ok: true,
    correct: true,
    week: chapter.week,
    codename: chapter.codename,
    reward,
    message:
      reward.kind === "code"
        ? "Solved. Your code is below — redeem it at checkout for a week of Elite."
        : "Solved. Save this claim reference — present it to support to redeem your free Elite week.",
  });
}
