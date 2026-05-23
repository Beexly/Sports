import type { Metadata } from "next";
import { BriefPreviewForm } from "@/components/cockpit/brief-preview-form";

export const metadata: Metadata = {
  title: "Brief preview · Cockpit",
  robots: { index: false, follow: false, nocache: true },
};

export default function CockpitBriefPreviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Brief preview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Compose a daily brief from operator-supplied picks. Calls
          composeBriefAsync; result is DRAFT-only and not persisted. Future
          cycles add composers for the empty section arrays (promotions,
          whatChanged, contentIdeas, manualReview).
        </p>
      </header>

      <BriefPreviewForm />
    </div>
  );
}
