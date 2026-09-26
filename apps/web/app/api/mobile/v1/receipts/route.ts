import { NextResponse } from "next/server";
import { createVerify, X509Certificate } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { resolveMobileViewer } from "@/lib/mobile/bearer-auth";

/**
 * POST /api/mobile/v1/receipts — verify a StoreKit 2 transaction and grant.
 *
 * This is the other half of the client fix in `apps/mobile/src/lib/purchases.ts`.
 * The client now refuses to finish a transaction until this route acknowledges,
 * so that a lost response is recoverable through StoreKit's own re-delivery.
 * Without this route, every purchase would sit at `pending` forever.
 *
 * ── WHAT IS VERIFIED, AND WHY EACH CHECK EXISTS ──────────────────────────────
 *
 *  1. **The JWS signature, chained to Apple's root CA.** A StoreKit 2 `JWSRepresentation`
 *     is a JWS whose `x5c` header carries the certificate chain. Trusting the
 *     payload WITHOUT verifying the chain means anyone who can POST JSON can
 *     grant themselves Elite. This is the difference between "the app told us
 *     they paid" and "Apple says they paid", and only one of those is a receipt.
 *
 *  2. **`bundleId` matches ours.** A valid Apple signature on a transaction for
 *     a DIFFERENT app is not a receipt for this app. Without this check, a
 *     developer with any paid app could grant entitlements here.
 *
 *  3. **`appAccountToken` matches the authenticated user.** This is what binds a
 *     purchase to an account rather than to a device. It is also why the client
 *     sets it even when signed out: the token rides on the transaction, so a
 *     purchase made anonymously is still attributable after sign-in.
 *
 *  4. **Not revoked, and not expired.** `revocationDate` is a refund or a
 *     chargeback. `expiresDate` is a lapsed subscription. A route that grants on
 *     signature alone would keep serving a customer who has been refunded.
 *
 *  5. **Idempotency on `transactionId`.** StoreKit re-delivers unfinished
 *     transactions, and the client intentionally re-submits everything on every
 *     launch. So this route WILL be called repeatedly with the same
 *     transaction, and each call must be a no-op after the first.
 *
 * ── WHAT IT DOES NOT DO ─────────────────────────────────────────────────────
 *
 * It does not call the App Store Server API. That would add a second network hop
 * and a key to this path; the signed JWS carries everything needed, and the
 * StoreKit 2 design exists precisely so the server can verify offline.
 *
 * It does not trust `productId` alone to set a tier — the product id is mapped
 * through an explicit table, so an unknown product is refused rather than
 * defaulting to something generous.
 */

export const dynamic = "force-dynamic";

/**
 * Product id → tier. An explicit map, because the failure mode of a computed
 * mapping is that a new product id silently grants whatever it happens to parse
 * to.
 */
const PRODUCT_TIERS: Record<string, "PRO" | "ELITE" | "FANTASY"> = {
  "com.galaxysportsedge.app.pro.monthly": "PRO",
  "com.galaxysportsedge.app.pro.yearly": "PRO",
  "com.galaxysportsedge.app.elite.monthly": "ELITE",
  "com.galaxysportsedge.app.elite.yearly": "ELITE",
  "com.galaxysportsedge.app.fantasy.monthly": "FANTASY",
  "com.galaxysportsedge.app.fantasy.yearly": "FANTASY",
};

const EXPECTED_BUNDLE_ID = process.env["IOS_BUNDLE_ID"] ?? "com.galaxysportsedge.app";

interface JwsPayload {
  transactionId?: unknown;
  originalTransactionId?: unknown;
  productId?: unknown;
  bundleId?: unknown;
  appAccountToken?: unknown;
  purchaseDate?: unknown;
  expiresDate?: unknown;
  revocationDate?: unknown;
  type?: unknown;
  environment?: unknown;
  inAppOwnershipType?: unknown;
}

interface DecodedJws {
  header: { alg?: string; x5c?: string[] };
  payload: JwsPayload;
  signingInput: string;
  signature: Buffer;
}

function decodeJws(jws: string): DecodedJws | null {
  const parts = jws.split(".");
  // A StoreKit 2 representation is compact JWS: header.payload.signature.
  // Anything else (including the older base64 receipt blob) is refused here
  // rather than guessed at.
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

  try {
    const header = JSON.parse(Buffer.from(headerPart, "base64url").toString()) as DecodedJws["header"];
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString()) as JwsPayload;
    return {
      header,
      payload,
      signingInput: `${headerPart}.${payloadPart}`,
      signature: Buffer.from(signaturePart, "base64url"),
    };
  } catch {
    return null;
  }
}

/**
 * Verify the JWS signature against Apple's certificate chain.
 *
 * Returns a discriminated result rather than a boolean so the caller can tell
 * "this receipt is a forgery" (400, and worth logging) apart from "this server
 * is not configured to verify" (503, and an operator problem, not a customer
 * one). Collapsing those two would make a misconfiguration look like fraud.
 *
 * FAILS CLOSED. With no `APPLE_ROOT_CA_PEM` configured, verification is refused.
 * The alternative — granting on an unverified signature — would mean a deploy
 * that forgot the variable silently became a free-subscription endpoint.
 */
function verifyChain(decoded: DecodedJws): { ok: true } | { ok: false; reason: string; config: boolean } {
  const rootPem = process.env["APPLE_ROOT_CA_PEM"];
  if (!rootPem) {
    return {
      ok: false,
      reason:
        "APPLE_ROOT_CA_PEM is not configured, so StoreKit receipts cannot be verified. " +
        "Refusing rather than granting on an unverified signature.",
      config: true,
    };
  }

  const x5c = decoded.header.x5c;
  if (!Array.isArray(x5c) || x5c.length < 2) {
    return { ok: false, reason: "JWS header carries no certificate chain", config: false };
  }

  const algorithm = decoded.header.alg;
  if (algorithm !== "ES256") {
    // StoreKit signs with ES256. Accepting an algorithm named by the attacker is
    // the classic JWT confusion bug, so this is allowlisted rather than read.
    return { ok: false, reason: `Unexpected JWS algorithm ${String(algorithm)}`, config: false };
  }

  try {
    const leaf = new X509Certificate(Buffer.from(x5c[0] as string, "base64"));
    const root = new X509Certificate(rootPem);

    // The leaf must be issued by a certificate in the chain that itself chains
    // to the configured root.
    if (!leaf.verify(root.publicKey)) {
      // Try the intermediate before refusing: Apple's chain is leaf -> intermediate -> root.
      const intermediate = new X509Certificate(Buffer.from(x5c[1] as string, "base64"));
      if (!intermediate.verify(root.publicKey) || !leaf.verify(intermediate.publicKey)) {
        return { ok: false, reason: "Certificate chain does not verify to the root", config: false };
      }
    }

    const verifier = createVerify("SHA256");
    verifier.update(decoded.signingInput);
    verifier.end();
    if (!verifier.verify(leaf.publicKey, decoded.signature)) {
      return { ok: false, reason: "JWS signature does not match the leaf certificate", config: false };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: `Certificate verification failed: ${error instanceof Error ? error.message : String(error)}`,
      config: false,
    };
  }
}

interface ReceiptBody {
  productId?: unknown;
  purchaseToken?: unknown;
  transactionId?: unknown;
  appAccountToken?: unknown;
  transactionDate?: unknown;
  countryCode?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  // Two auth paths: a bearer token from the app, or a browser session. The app
  // uses the bearer; the cookie path exists so a future web checkout can share
  // the same verification rather than growing a second one.
  const cookieSession = await auth();
  const bearer = cookieSession?.user?.id ? null : await resolveMobileViewer(request);
  const userId = cookieSession?.user?.id ?? (bearer && !bearer.accountMissing ? bearer.userId : null);

  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in required." }, { status: 401 });
  }

  const limit = consumeRateLimit("mobile-receipts", userId, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const input = body as ReceiptBody;
  if (typeof input.purchaseToken !== "string" || input.purchaseToken.length < 16) {
    return NextResponse.json(
      { success: false, error: "purchaseToken (the StoreKit JWS) is required." },
      { status: 400 },
    );
  }

  const decoded = decodeJws(input.purchaseToken);
  if (!decoded) {
    return NextResponse.json(
      { success: false, error: "That receipt could not be read.", code: "malformed_receipt" },
      { status: 400 },
    );
  }

  const verified = verifyChain(decoded);
  if (!verified.ok) {
    if (verified.config) {
      // An operator problem, not a customer one, and it must not grant.
      return NextResponse.json(
        { success: false, error: "Purchase verification is not available yet.", code: "verification_unconfigured" },
        { status: 503 },
      );
    }
    // A signature failure is worth an operator's attention: it means either a
    // forged receipt or a broken client. Neither should be silent.
    return NextResponse.json(
      { success: false, error: "That receipt could not be verified.", code: "invalid_signature" },
      { status: 400 },
    );
  }

  const payload = decoded.payload;

  // ── Bind the receipt to this app ──────────────────────────────────────────
  if (payload.bundleId !== EXPECTED_BUNDLE_ID) {
    return NextResponse.json(
      { success: false, error: "That receipt is for a different app.", code: "bundle_mismatch" },
      { status: 400 },
    );
  }

  // ── Bind the receipt to this ACCOUNT ──────────────────────────────────────
  // The client sets appAccountToken to the user id. A mismatch means the receipt
  // belongs to someone else, which is either a bug or an attempt to credit a
  // purchase to the wrong account.
  const tokenAccount = typeof payload.appAccountToken === "string" ? payload.appAccountToken : null;
  if (tokenAccount !== userId) {
    return NextResponse.json(
      {
        success: false,
        error: "That purchase is registered to a different account. Sign in with the account that bought it.",
        code: "account_mismatch",
      },
      { status: 409 },
    );
  }

  // ── Revocation and expiry ─────────────────────────────────────────────────
  if (typeof payload.revocationDate === "number") {
    return NextResponse.json(
      { success: false, error: "That purchase was refunded.", code: "revoked" },
      { status: 409 },
    );
  }
  const expiresDate = typeof payload.expiresDate === "number" ? payload.expiresDate : null;
  if (expiresDate !== null && expiresDate < Date.now()) {
    return NextResponse.json(
      { success: false, error: "That subscription has expired.", code: "expired" },
      { status: 409 },
    );
  }

  // ── Map the product to a tier, or refuse ─────────────────────────────────
  const productId = typeof payload.productId === "string" ? payload.productId : null;
  const tier = productId ? PRODUCT_TIERS[productId] : undefined;
  if (!productId || !tier) {
    return NextResponse.json(
      { success: false, error: "That product is not one we sell.", code: "unknown_product" },
      { status: 400 },
    );
  }

  const transactionId =
    typeof payload.transactionId === "string" ? payload.transactionId : null;
  if (!transactionId) {
    return NextResponse.json(
      { success: false, error: "That receipt has no transaction id.", code: "missing_transaction" },
      { status: 400 },
    );
  }

  // ── Idempotency ───────────────────────────────────────────────────────────
  // StoreKit re-delivers unfinished transactions and the client re-submits
  // everything on every launch, so this route WILL be called repeatedly with the
  // same transaction. Every call after the first must be a no-op.
  try {
    const existing = await db.processedReceipt.findUnique({ where: { transactionId } });
    if (existing) {
      return NextResponse.json({
        success: true,
        data: { alreadyProcessed: true, tier: existing.tier, transactionId },
      });
    }

    await db.$transaction(async (tx) => {
      await tx.processedReceipt.create({
        data: {
          transactionId,
          userId,
          productId,
          tier,
          environment: typeof payload.environment === "string" ? payload.environment : "Unknown",
          originalTransactionId:
            typeof payload.originalTransactionId === "string" ? payload.originalTransactionId : null,
          purchasedAt: typeof payload.purchaseDate === "number" ? new Date(payload.purchaseDate) : new Date(),
          expiresAt: expiresDate !== null ? new Date(expiresDate) : null,
        },
      });

      await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          tier,
          status: "active",
          currentPeriodEnd: expiresDate !== null ? new Date(expiresDate) : null,
        },
        update: {
          tier,
          status: "active",
          currentPeriodEnd: expiresDate !== null ? new Date(expiresDate) : null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: { alreadyProcessed: false, tier, transactionId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/does not exist|P2021/i.test(message)) {
      // Table absent. The client leaves the transaction unfinished and StoreKit
      // re-delivers it, so this is recoverable — which is the entire point of the
      // client-side fix.
      return NextResponse.json(
        { success: false, error: "Purchase verification is not available yet.", code: "table_absent" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Could not record the purchase. Nothing was changed." },
      { status: 503 },
    );
  }
}
