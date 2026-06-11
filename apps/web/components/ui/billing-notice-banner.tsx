import type { BillingNotice } from "@/lib/billing/notice";
import { ManageSubscriptionButton } from "@/components/ui/manage-subscription-button";

function formatDeadline(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BillingNoticeBanner({ notice }: { notice: BillingNotice }): JSX.Element {
  const tierLabel = notice.tier === "ELITE" ? "Elite" : "Pro";

  let headline: string;
  let detail: string;

  switch (notice.kind) {
    case "PAST_DUE_IN_GRACE":
      headline = "Payment issue — your card needs attention";
      detail = notice.graceEndsAt
        ? `Your last ${tierLabel} payment didn't go through. You keep full access while we retry, until ${formatDeadline(notice.graceEndsAt)}. Update your card to keep your membership uninterrupted.`
        : `Your last ${tierLabel} payment didn't go through. Update your card to keep your membership uninterrupted.`;
      break;
    case "PAST_DUE_EXPIRED":
      headline = `Your ${tierLabel} access is paused`;
      detail =
        "We couldn't collect payment and the grace window has ended. Update your card to restore full access — your history and settings are untouched.";
      break;
    case "INCOMPLETE":
      headline = "Finish setting up your payment";
      detail = `Your ${tierLabel} payment needs one more verification step (your bank may require it). Open billing to complete it.`;
      break;
  }

  return (
    <div
      data-testid="billing-notice-banner"
      role="alert"
      className="mb-6 rounded-2xl border border-amber-700/60 bg-amber-950/40 p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-amber-200">{headline}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-amber-100/80">{detail}</p>
        </div>
        <div className="w-full sm:w-48">
          <ManageSubscriptionButton />
        </div>
      </div>
    </div>
  );
}
