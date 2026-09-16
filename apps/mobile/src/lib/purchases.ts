import type { ApiResult } from "../api/contracts";

/**
 * Purchase settlement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  THE BUG THIS FILE EXISTS TO FIX
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The first version of the paywall called `finishTransaction` inside
 * `onPurchaseSuccess`. `finishTransaction` tells StoreKit the app has handled
 * the transaction, so **StoreKit will never re-deliver it**. If the server call
 * that followed failed, or the app was backgrounded, or the process was killed,
 * the outcome was:
 *
 *     the customer had been charged,
 *     the app had told StoreKit "handled",
 *     and the server had no record, so the customer saw the free tier.
 *
 * That is the most expensive bug class in subscription software and it is
 * unrecoverable by construction, because the platform's own durable retry had
 * been switched off.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  THE RULE
 * ══════════════════════════════════════════════════════════════════════════
 *
 *   **A transaction is finished ONLY after the server has acknowledged it.**
 *
 * StoreKit already has a durable re-delivery queue for unfinished transactions,
 * and it survives app termination and reinstall. Building a second one on the
 * client would be a mistake: two queues for one fact is how a purchase gets
 * recorded twice.
 *
 * Two supporting rules, both from `research/round-02-repositories.md` §1:
 *
 *   · `appAccountToken` is set to the app's user id at purchase time, so a
 *     purchase made while signed out is still reconcilable to an account later.
 *   · `andDangerouslyFinishTransactionAutomatically` is set to FALSE. The name
 *     is expo-iap's own, and it is accurate: with it on, the platform finishes
 *     the transaction before the app has recorded anything, which is the same
 *     bug with a different spelling.
 */

/** What the server must accept for a purchase to count. */
export interface ReceiptSubmission {
  /** The StoreKit product id. */
  productId: string;
  /** Unified purchase token (the iOS JWS) — the server's receipt input. */
  purchaseToken: string;
  /** The transaction id, used as the server-side idempotency key. */
  transactionId: string;
  /** The account the purchase is attributed to. */
  appAccountToken: string | null;
  /** ISO timestamp from StoreKit. */
  transactionDate: string;
  /** Storefront, when known. Used by the server for tax and region checks. */
  countryCode: string | null;
}

export interface PurchaseDeps {
  submit: (submission: ReceiptSubmission) => Promise<ApiResult<unknown>>;
  finish: (purchaseId: string) => Promise<void>;
  onOutcome?: (outcome: SettlementOutcome) => void;
}

export type SettlementOutcome =
  /** Server acknowledged; transaction finished. The only terminal success. */
  | { kind: "settled"; transactionId: string }
  /**
   * The server could not be reached. The transaction is deliberately LEFT
   * UNFINISHED so StoreKit re-delivers it. Not an error the user should see.
   */
  | { kind: "pending"; transactionId: string; reason: string }
  /**
   * The server rejected the receipt definitively. Finishing is correct here:
   * it will never succeed, and leaving it unfinished means StoreKit asks
   * forever.
   */
  | { kind: "rejected"; transactionId: string; reason: string }
  /** Signed out: no account to attribute the purchase to. Left unfinished. */
  | { kind: "unattributed"; transactionId: string };

/**
 * Settle one purchase.
 *
 * Returns an outcome rather than throwing, because every branch here is a
 * legitimate state and the caller renders each differently. The three that are
 * NOT success all leave the transaction unfinished, which is what makes a later
 * launch able to recover.
 */
export async function settlePurchase(
  deps: PurchaseDeps,
  submission: ReceiptSubmission,
): Promise<SettlementOutcome> {
  const emit = (outcome: SettlementOutcome): SettlementOutcome => {
    deps.onOutcome?.(outcome);
    return outcome;
  };

  if (!submission.appAccountToken) {
    // Without an account there is nothing to credit and nothing to reconcile
    // against. Leave it unfinished: a sign-in and a relaunch will pick it up
    // via `reconcile`, which is exactly what appAccountToken makes possible.
    return emit({ kind: "unattributed", transactionId: submission.transactionId });
  }

  const result = await deps.submit(submission);

  if (result.ok) {
    await deps.finish(submission.transactionId);
    return emit({ kind: "settled", transactionId: submission.transactionId });
  }

  // A definitive rejection is the ONE case where finishing is correct: the
  // receipt will never be accepted, and an unfinished transaction means StoreKit
  // re-delivers it on every launch forever.
  if (result.kind === "auth" || result.kind === "malformed" || result.kind === "not_found") {
    await deps.finish(submission.transactionId);
    return emit({
      kind: "rejected",
      transactionId: submission.transactionId,
      reason: result.detail,
    });
  }

  // Network, timeout, rate limit, or a 5xx: all transient, all recoverable by
  // StoreKit's own queue. Status 429
  // NOTE this is the branch that used to be unrecoverable.
  return emit({
    kind: "pending",
    transactionId: submission.transactionId,
    reason: result.message,
  });
}

/**
 * Reconcile unfinished purchases on launch or foreground.
 *
 * `getAvailablePurchases()` returns everything StoreKit still considers
 * un-finished, plus active subscriptions. Posting them all is safe because the
 * server treats the transaction id as an idempotency key — so the sweep can run
 * on every foreground without a "have I done this" check, which is the property
 * that makes it reliable.
 *
 * Returns a count for the caller to log. A non-zero `pending` is normal and is
 * not surfaced to the user.
 */
export async function reconcile(
  deps: PurchaseDeps & { list: () => Promise<ReceiptSubmission[]> },
): Promise<{ settled: number; pending: number; rejected: number; unattributed: number }> {
  const submissions = await deps.list().catch(() => [] as ReceiptSubmission[]);
  const tally = { settled: 0, pending: 0, rejected: 0, unattributed: 0 };

  for (const submission of submissions) {
    const outcome = await settlePurchase(deps, submission);
    tally[outcome.kind] += 1;
  }

  return tally;
}

/* ══════════════════════════════════════════════════════════════════════════
   PURCHASE → SUBMISSION
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The fields this module needs from an expo-iap `Purchase`.
 *
 * Declared structurally rather than imported, so this file has no dependency on
 * expo-iap and stays in the pure-logic set that can be tested under plain Node.
 * `PurchaseIOS` satisfies it.
 */
export interface PurchaseLike {
  productId: string;
  /** The unified token — the iOS JWS. This is what the server verifies. */
  purchaseToken?: string | null;
  /** StoreKit's transaction id. Used as the server-side idempotency key. */
  id: string;
  appAccountToken?: string | null;
  transactionDate: number;
  countryCodeIOS?: string | null;
}

/**
 * Convert a StoreKit purchase into a server submission.
 *
 * Throws when the JWS is absent. A purchase with no `purchaseToken` cannot be
 * verified by the server, and submitting a receipt-shaped object with an empty
 * token would produce a server-side rejection that looks like fraud rather than
 * like a client bug.
 */
export function toSubmission(purchase: PurchaseLike): ReceiptSubmission {
  const token = purchase.purchaseToken;
  if (typeof token !== "string" || token.length === 0) {
    throw new Error(
      `toSubmission: transaction ${purchase.id} has no purchaseToken. The server ` +
        "cannot verify a purchase without the JWS, so this is refused rather than " +
        "submitted as an empty receipt.",
    );
  }
  return {
    productId: purchase.productId,
    purchaseToken: token,
    transactionId: purchase.id,
    appAccountToken: purchase.appAccountToken ?? null,
    // StoreKit's own timestamp, in ms since epoch.
    transactionDate: new Date(purchase.transactionDate).toISOString(),
    countryCode: purchase.countryCodeIOS ?? null,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   PURCHASE REQUEST OPTIONS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The options the paywall MUST pass to `requestPurchase`.
 *
 * Exported as a function rather than inlined at the call site, because both
 * fields are load-bearing for the fix above and one of them is named "dangerous"
 * by its own author. A call site that forgets either one silently reintroduces
 * the bug.
 */
export function iosPurchaseOptions(sku: string, userId: string | null): {
  sku: string;
  appAccountToken: string | null;
  andDangerouslyFinishTransactionAutomatically: false;
} {
  return {
    sku,
    // The account the purchase belongs to. Null when signed out — the purchase
    // still completes, and `reconcile` picks it up after sign-in, because the
    // token rides on the transaction itself.
    appAccountToken: userId,
    // Leaving this ON would let the platform finish the transaction before the
    // app has told the server anything, which is the original bug wearing the
    // library's own warning label. There is no circumstance in which this app
    // wants it on.
    andDangerouslyFinishTransactionAutomatically: false,
  };
}

/**
 * Whether a settled purchase should update the UI immediately.
 *
 * `pending` must NOT look like success, and it must not look like failure
 * either: the user has been charged and should be told the access is coming,
 * not that something went wrong.
 */
export function userFacingPurchaseMessage(outcome: SettlementOutcome): {
  tone: "ok" | "waiting" | "problem";
  message: string;
} {
  switch (outcome.kind) {
    case "settled":
      return { tone: "ok", message: "Purchase complete. Your entitlements refresh on the next load." };
    case "pending":
      return {
        tone: "waiting",
        message:
          "Your purchase went through and we could not reach our server to record it. " +
          "It will finish automatically. You do not need to buy it again.",
      };
    case "unattributed":
      return {
        tone: "waiting",
        message:
          "Your purchase went through. Sign in and it will be applied to your account " +
          "automatically.",
      };
    case "rejected":
      return { tone: "problem", message: "The App Store could not confirm that purchase." };
  }
}
